import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LoanStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow treasurers and admins
    if (!['TREASURER', 'ADMINISTRATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all approved loan applications
    const approvedLoans = await prisma.loanApplication.findMany({
      where: {
        status: LoanStatus.APPROVED
      },
      include: {
        borrower: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        loanAccount: {
          select: {
            id: true,
            accountNumber: true,
            createdAt: true,
            status: true,
            isActive: true
          }
        }
      },
      orderBy: {
        approvedAt: 'desc'
      }
    })

    // Format the data for the frontend
    const formattedLoans = approvedLoans.map(loan => ({
      id: loan.id,
      applicationNumber: loan.applicationNumber,
      borrowerName: `${loan.borrower.firstName} ${loan.borrower.lastName}`,
      borrowerEmail: loan.borrower.email,
      borrowerId: loan.borrower.id,
      loanType: loan.loanType,
      approvedAmount: loan.approvedAmount || 0,
      requestedAmount: loan.requestedAmount,
      interestRate: loan.interestRate || 0,
      termMonths: loan.termMonths,
      monthlyPayment: loan.monthlyPayment || 0,
      approvedAt: loan.approvedAt?.toISOString() || '',
      purpose: loan.purpose || '',
      status: loan.status,
      isDisbursed: !!loan.loanAccount,
      loanAccount: loan.loanAccount ? {
        id: loan.loanAccount.id,
        accountNumber: loan.loanAccount.accountNumber,
        createdAt: loan.loanAccount.createdAt?.toISOString() || ''
      } : null
    }))

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'VIEW_APPROVED_LOANS',
        entityType: 'LOAN_APPLICATION',
        entityId: 'ALL',
        newValues: {
          totalLoans: formattedLoans.length,
          pendingDisbursement: formattedLoans.filter(l => !l.isDisbursed).length,
          disbursed: formattedLoans.filter(l => l.isDisbursed).length
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json(formattedLoans)

  } catch (error) {
    console.error('Error fetching approved loans:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}