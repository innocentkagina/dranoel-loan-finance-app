import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LoanStatus, NotificationType } from '@prisma/client'
import { getDefaultInterestRate } from '@/lib/interest-rates'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow loans officers, treasurers, and admins to disburse loans
    if (!['LOANS_OFFICER', 'TREASURER', 'ADMINISTRATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { disbursementAmount, disbursementMethod, notes } = body

    // Get the loan application
    const application = await prisma.loanApplication.findUnique({
      where: { id },
      include: {
        borrower: true,
        loanAccount: true
      }
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Loan application not found' },
        { status: 404 }
      )
    }

    // Check if application is approved
    if (application.status !== LoanStatus.APPROVED) {
      return NextResponse.json(
        { error: 'Loan application must be approved before disbursement' },
        { status: 400 }
      )
    }

    // Check if already disbursed
    if (application.loanAccount) {
      return NextResponse.json(
        { error: 'Loan has already been disbursed' },
        { status: 400 }
      )
    }

    // Validate disbursement amount
    const finalDisbursementAmount = disbursementAmount || application.approvedAmount
    if (finalDisbursementAmount > application.approvedAmount) {
      return NextResponse.json(
        { error: 'Disbursement amount cannot exceed approved amount' },
        { status: 400 }
      )
    }

    // Generate account number
    const accountNumber = `ACC-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`

    // Use default interest rate if not set
    const finalInterestRate = application.interestRate || await getDefaultInterestRate(application.loanType)

    // Calculate monthly payment if not already calculated
    const monthlyPayment = application.monthlyPayment || calculateMonthlyPayment(
      finalDisbursementAmount,
      finalInterestRate,
      application.termMonths
    )

    // Create loan account
    const loanAccount = await prisma.loanAccount.create({
      data: {
        accountNumber,
        applicationId: application.id,
        principalAmount: finalDisbursementAmount,
        currentBalance: finalDisbursementAmount,
        interestRate: finalInterestRate,
        termMonths: application.termMonths,
        monthlyPayment,
        startDate: new Date(),
        maturityDate: calculateMaturityDate(new Date(), application.termMonths),
        nextPaymentDate: calculateNextPaymentDate(new Date()),
        status: LoanStatus.ACTIVE,
        isActive: true,
        totalPaid: 0,
        totalInterestPaid: 0,
        principalPaid: 0
      }
    })

    // Update loan application with disbursement info
    await prisma.loanApplication.update({
      where: { id },
      data: {
        disbursedAt: new Date()
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DISBURSE_LOAN',
        entityType: 'LOAN_ACCOUNT',
        entityId: loanAccount.id,
        oldValues: {
          applicationStatus: application.status,
          loanAccountExists: false
        },
        newValues: {
          applicationStatus: LoanStatus.APPROVED,
          loanAccountId: loanAccount.id,
          accountNumber: loanAccount.accountNumber,
          disbursedAmount: finalDisbursementAmount,
          disbursementMethod: disbursementMethod || 'BANK_TRANSFER',
          applicationNumber: application.applicationNumber,
          borrowerEmail: application.borrower.email,
          disbursedAt: new Date().toISOString()
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    // Create notification for borrower
    await prisma.notification.create({
      data: {
        userId: application.borrowerId,
        type: NotificationType.LOAN_DISBURSED,
        title: 'Loan Disbursed',
        message: `Your loan of ${formatCurrency(finalDisbursementAmount)} has been disbursed. Account number: ${accountNumber}`,
        metadata: {
          loanAccountId: loanAccount.id,
          accountNumber: loanAccount.accountNumber,
          disbursedAmount: finalDisbursementAmount,
          applicationId: application.id
        }
      }
    })

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
          type: NotificationType.LOAN_DISBURSED,
          title: 'Loan Disbursed',
          message: `Loan ${application.applicationNumber} has been disbursed by ${session.user.role.toLowerCase()}. Amount: ${formatCurrency(finalDisbursementAmount)}`,
          metadata: {
            loanAccountId: loanAccount.id,
            accountNumber: loanAccount.accountNumber,
            disbursedAmount: finalDisbursementAmount,
            applicationId: application.id,
            applicationNumber: application.applicationNumber,
            borrowerEmail: application.borrower.email,
            disbursedBy: session.user.email
          }
        }
      })
    }

    // Create notifications for other treasurers (awareness)
    const otherTreasurers = await prisma.user.findMany({
      where: {
        role: 'TREASURER',
        isActive: true,
        NOT: { id: session.user.id } // Exclude the current user
      },
      select: { id: true },
    })

    for (const treasurer of otherTreasurers) {
      await prisma.notification.create({
        data: {
          userId: treasurer.id,
          senderId: session.user.id,
          type: NotificationType.LOAN_DISBURSED,
          title: 'Loan Disbursed by Colleague',
          message: `Loan ${application.applicationNumber} has been disbursed. Amount: ${formatCurrency(finalDisbursementAmount)}`,
          metadata: {
            loanAccountId: loanAccount.id,
            accountNumber: loanAccount.accountNumber,
            disbursedAmount: finalDisbursementAmount,
            applicationId: application.id,
            applicationNumber: application.applicationNumber,
            borrowerEmail: application.borrower.email
          }
        }
      })
    }

    // Create notification for the loan officer who approved the loan (if different from current user)
    if (application.assignedOfficerId && application.assignedOfficerId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: application.assignedOfficerId,
          senderId: session.user.id,
          type: NotificationType.LOAN_DISBURSED,
          title: 'Your Approved Loan Disbursed',
          message: `The loan you approved (${application.applicationNumber}) has been disbursed. Amount: ${formatCurrency(finalDisbursementAmount)}`,
          metadata: {
            loanAccountId: loanAccount.id,
            accountNumber: loanAccount.accountNumber,
            disbursedAmount: finalDisbursementAmount,
            applicationId: application.id,
            applicationNumber: application.applicationNumber,
            borrowerEmail: application.borrower.email
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      loanAccount,
      message: 'Loan disbursed successfully'
    })

  } catch (error) {
    console.error('Error disbursing loan:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions
function calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  const monthlyRate = annualRate / 100 / 12
  if (monthlyRate === 0) return principal / termMonths

  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
                  (Math.pow(1 + monthlyRate, termMonths) - 1)
  return Math.round(payment * 100) / 100
}

function calculateMaturityDate(startDate: Date, termMonths: number): Date {
  const maturityDate = new Date(startDate)
  maturityDate.setMonth(maturityDate.getMonth() + termMonths)
  return maturityDate
}

function calculateNextPaymentDate(startDate: Date): Date {
  const nextPayment = new Date(startDate)
  nextPayment.setMonth(nextPayment.getMonth() + 1)
  return nextPayment
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}