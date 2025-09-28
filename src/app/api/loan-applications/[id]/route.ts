import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LoanStatus, NotificationType } from '@prisma/client'
import { getDefaultInterestRate } from '@/lib/interest-rates'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const application = await prisma.loanApplication.findUnique({
      where: { id: params.id },
      include: {
        borrower: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            dateOfBirth: true,
            employmentStatus: true,
            monthlyIncome: true,
            creditScore: true,
          },
        },
        assignedOfficer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        documents: true,
        collaterals: true,
        creditReports: true,
        loanAccount: {
          include: {
            payments: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
            schedules: {
              orderBy: { installmentNumber: 'asc' },
            },
          },
        },
      },
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Check access permissions
    if (
      session.user.role === 'MEMBER' &&
      application.borrowerId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(application)
  } catch (error) {
    console.error('Error fetching loan application:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, ...updateData } = body

    const application = await prisma.loanApplication.findUnique({
      where: { id },
      include: { borrower: true },
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    let updatedApplication

    if (action === 'submit') {
      // Submit application for review
      updatedApplication = await prisma.loanApplication.update({
        where: { id },
        data: {
          status: LoanStatus.SUBMITTED,
          submittedAt: new Date(),
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'SUBMIT_LOAN_APPLICATION',
          entityType: 'LOAN_APPLICATION',
          entityId: id,
          oldValues: { status: application.status },
          newValues: { status: LoanStatus.SUBMITTED, applicationNumber: application.applicationNumber },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      })

      // Create notification
      await prisma.notification.create({
        data: {
          userId: application.borrowerId,
          type: NotificationType.APPLICATION_SUBMITTED,
          title: 'Application Submitted',
          message: `Your loan application ${application.applicationNumber} has been submitted for review.`,
          metadata: { applicationId: application.id },
        },
      })
    } else if (action === 'approve') {
      // Approve application (loan officers/underwriters only)
      if (!['LOANS_OFFICER', 'UNDERWRITER', 'ADMIN'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { approvedAmount, interestRate, monthlyPayment } = updateData

      // Use default interest rate if not provided
      const finalInterestRate = interestRate ?
        parseFloat(interestRate) :
        await getDefaultInterestRate(application.loanType)

      updatedApplication = await prisma.loanApplication.update({
        where: { id },
        data: {
          status: LoanStatus.APPROVED,
          approvedAmount: parseFloat(approvedAmount),
          interestRate: finalInterestRate,
          monthlyPayment: parseFloat(monthlyPayment),
          approvedAt: new Date(),
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'APPROVE_LOAN_APPLICATION',
          entityType: 'LOAN_APPLICATION',
          entityId: id,
          oldValues: {
            status: application.status,
            approvedAmount: application.approvedAmount,
            interestRate: application.interestRate
          },
          newValues: {
            status: LoanStatus.APPROVED,
            approvedAmount: parseFloat(approvedAmount),
            interestRate: finalInterestRate,
            monthlyPayment: parseFloat(monthlyPayment),
            applicationNumber: application.applicationNumber,
            borrowerEmail: application.borrower.email
          },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      })

      // Create notification for borrower
      await prisma.notification.create({
        data: {
          userId: application.borrowerId,
          type: NotificationType.APPLICATION_APPROVED,
          title: 'Application Approved',
          message: `Congratulations! Your loan application ${application.applicationNumber} has been approved.`,
          metadata: { applicationId: application.id },
        },
      })

      // Create notifications for treasurers (pending disbursement)
      const treasurers = await prisma.user.findMany({
        where: { role: 'TREASURER', isActive: true },
        select: { id: true },
      })

      for (const treasurer of treasurers) {
        await prisma.notification.create({
          data: {
            userId: treasurer.id,
            senderId: session.user.id,
            type: NotificationType.APPLICATION_APPROVED,
            title: 'Loan Ready for Disbursement',
            message: `Loan application ${application.applicationNumber} has been approved and is ready for disbursement. Amount: ${formatCurrency(parseFloat(approvedAmount))}`,
            metadata: {
              applicationId: application.id,
              applicationNumber: application.applicationNumber,
              approvedAmount: parseFloat(approvedAmount),
              borrowerEmail: application.borrower.email,
              requiresDisbursement: true
            },
          },
        })
      }

      // Create notifications for administrators (oversight)
      const administrators = await prisma.user.findMany({
        where: { role: 'ADMINISTRATOR', isActive: true },
        select: { id: true },
      })

      for (const admin of administrators) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            senderId: session.user.id,
            type: NotificationType.APPLICATION_APPROVED,
            title: 'Loan Application Approved',
            message: `Loan application ${application.applicationNumber} has been approved. Amount: ${formatCurrency(parseFloat(approvedAmount))}`,
            metadata: {
              applicationId: application.id,
              applicationNumber: application.applicationNumber,
              approvedAmount: parseFloat(approvedAmount),
              borrowerEmail: application.borrower.email,
              approvedBy: session.user.email
            },
          },
        })
      }
    } else if (action === 'reject') {
      // Reject application
      if (!['LOANS_OFFICER', 'UNDERWRITER', 'ADMIN'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { rejectionReason } = updateData

      updatedApplication = await prisma.loanApplication.update({
        where: { id },
        data: {
          status: LoanStatus.REJECTED,
          rejectionReason,
          rejectedAt: new Date(),
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'REJECT_LOAN_APPLICATION',
          entityType: 'LOAN_APPLICATION',
          entityId: id,
          oldValues: {
            status: application.status,
            rejectionReason: application.rejectionReason
          },
          newValues: {
            status: LoanStatus.REJECTED,
            rejectionReason,
            applicationNumber: application.applicationNumber,
            borrowerEmail: application.borrower.email
          },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      })

      // Create notification
      await prisma.notification.create({
        data: {
          userId: application.borrowerId,
          type: NotificationType.APPLICATION_REJECTED,
          title: 'Application Rejected',
          message: `Your loan application ${application.applicationNumber} has been rejected.`,
          metadata: { applicationId: application.id },
        },
      })
    } else if (action === 'assign') {
      // Assign to loan officer
      if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { assignedOfficerId } = updateData

      updatedApplication = await prisma.loanApplication.update({
        where: { id },
        data: {
          assignedOfficerId,
          status: LoanStatus.UNDER_REVIEW,
          reviewStartedAt: new Date(),
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'ASSIGN_LOAN_APPLICATION',
          entityType: 'LOAN_APPLICATION',
          entityId: id,
          oldValues: {
            status: application.status,
            assignedOfficerId: application.assignedOfficerId
          },
          newValues: {
            status: LoanStatus.UNDER_REVIEW,
            assignedOfficerId,
            applicationNumber: application.applicationNumber,
            borrowerEmail: application.borrower.email
          },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      })
    } else {
      // General update
      if (
        session.user.role === 'MEMBER' &&
        application.borrowerId !== session.user.id
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      updatedApplication = await prisma.loanApplication.update({
        where: { id },
        data: updateData,
      })
    }

    return NextResponse.json(updatedApplication)
  } catch (error) {
    console.error('Error updating loan application:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const application = await prisma.loanApplication.findUnique({
      where: { id: params.id },
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Only allow deletion of draft applications by the borrower or admin
    if (
      application.status !== LoanStatus.DRAFT ||
      (session.user.role === 'MEMBER' && application.borrowerId !== session.user.id) ||
      !['MEMBER', 'ADMIN'].includes(session.user.role)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.loanApplication.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Application deleted successfully' })
  } catch (error) {
    console.error('Error deleting loan application:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function for currency formatting
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}