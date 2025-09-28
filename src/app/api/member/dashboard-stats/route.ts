import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'MEMBER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const userId = session.user.id

    // Get loan statistics
    const [
      totalLoans,
      activeLoans,
      pendingApplications,
      totalPaidAmount,
      totalDueAmount,
      overduePayments,
      savingsAccount,
      recentTransactions
    ] = await Promise.all([
      // Total loan applications
      prisma.loanApplication.count({
        where: { borrowerId: userId }
      }),

      // Active loans
      prisma.loanAccount.count({
        where: {
          application: { borrowerId: userId },
          isActive: true
        }
      }),

      // Pending applications
      prisma.loanApplication.count({
        where: {
          borrowerId: userId,
          status: { in: ['SUBMITTED', 'UNDER_REVIEW'] }
        }
      }),

      // Total paid amount
      prisma.payment.aggregate({
        where: {
          userId: userId,
          status: 'PAID'
        },
        _sum: { amount: true }
      }),

      // Total due amount (from active loan accounts)
      prisma.loanAccount.aggregate({
        where: {
          application: { borrowerId: userId },
          isActive: true
        },
        _sum: { currentBalance: true }
      }),

      // Overdue payments count
      prisma.payment.count({
        where: {
          userId: userId,
          status: 'LATE',
          scheduledDate: { lt: new Date() }
        }
      }),

      // Savings account information
      prisma.savingsAccount.findUnique({
        where: { userId },
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 5
          },
          linkedBankAccounts: {
            where: { status: 'APPROVED' }
          }
        }
      }),

      // Recent savings transactions
      prisma.savingsTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          bankAccount: {
            select: { bankName: true, accountNumber: true }
          }
        }
      })
    ])

    // Calculate savings growth (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const savingsGrowth = savingsAccount ? await prisma.savingsTransaction.aggregate({
      where: {
        savingsAccountId: savingsAccount.id,
        createdAt: { gte: thirtyDaysAgo },
        type: { in: ['DEPOSIT', 'INTEREST_CREDIT'] }
      },
      _sum: { amount: true }
    }) : null

    const savingsWithdrawals = savingsAccount ? await prisma.savingsTransaction.aggregate({
      where: {
        savingsAccountId: savingsAccount.id,
        createdAt: { gte: thirtyDaysAgo },
        type: 'WITHDRAWAL'
      },
      _sum: { amount: true }
    }) : null

    const netSavingsGrowth = (savingsGrowth?._sum?.amount || 0) - (savingsWithdrawals?._sum?.amount || 0)

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'VIEW_MEMBER_DASHBOARD',
        entityType: 'DASHBOARD',
        entityId: 'MEMBER_STATS',
        newValues: {
          totalLoans,
          activeLoans,
          pendingApplications,
          hasSavingsAccount: !!savingsAccount,
          savingsBalance: savingsAccount?.balance || 0
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      // Loan stats
      totalLoans,
      activeLoans,
      totalPaid: totalPaidAmount._sum.amount || 0,
      totalDue: totalDueAmount._sum.currentBalance || 0,
      pendingApplications,
      overduePayments,

      // Savings stats
      savings: savingsAccount ? {
        accountNumber: savingsAccount.accountNumber,
        balance: savingsAccount.balance,
        interestRate: savingsAccount.interestRate,
        totalInterestEarned: savingsAccount.totalInterestEarned,
        accountAge: Math.floor((new Date().getTime() - new Date(savingsAccount.openedAt).getTime()) / (1000 * 60 * 60 * 24 * 30)), // in months
        linkedBankAccounts: savingsAccount.linkedBankAccounts.length,
        monthlyGrowth: netSavingsGrowth,
        lastTransactionDate: savingsAccount.transactions[0]?.createdAt || null
      } : null,

      // Recent activities
      recentSavingsTransactions: recentTransactions.map(transaction => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        createdAt: transaction.createdAt,
        bankAccount: transaction.bankAccount
      }))
    })

  } catch (error) {
    console.error('Error fetching member dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}