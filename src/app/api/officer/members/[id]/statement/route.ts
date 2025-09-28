import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only loan officers can access this endpoint
    if (session.user.role !== 'LOANS_OFFICER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const member = await prisma.user.findUnique({
      where: {
        id: params.id,
        role: 'MEMBER',
      },
      include: {
        loanApplications: {
          include: {
            loanAccount: {
              include: {
                payments: {
                  orderBy: { createdAt: 'desc' },
                  take: 10, // Recent payments
                },
                schedules: {
                  orderBy: { installmentNumber: 'asc' },
                },
              },
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 15, // Recent transactions
          include: {
            loanAccount: {
              select: {
                accountNumber: true,
              },
            },
          },
        },
      },
    })

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Calculate loan-related statistics
    const activeLoanAccounts = member.loanApplications
      .map(app => app.loanAccount)
      .filter(account => account && account.isActive)

    const loanStats = {
      activeLoans: activeLoanAccounts.length,
      totalBorrowed: activeLoanAccounts.reduce((total, account) =>
        total + account!.principalAmount, 0),
      totalRepaid: activeLoanAccounts.reduce((total, account) =>
        total + account!.totalPaid, 0),
      currentBalance: activeLoanAccounts.reduce((total, account) =>
        total + account!.currentBalance, 0),
    }

    // Calculate savings-related statistics (simplified)
    const totalPayments = member.payments.reduce((total, payment) =>
      payment.status === 'PAID' ? total + payment.amount : total, 0)

    // In a real app, these would come from separate savings/shares tables
    const savingsBalance = Math.max(0, totalPayments * 0.15) // 15% of payments as savings
    const savingsStats = {
      currentBalance: Math.round(savingsBalance),
      totalDeposits: Math.round(savingsBalance * 1.5), // Simulated
      totalWithdrawals: Math.round(savingsBalance * 0.5), // Simulated
      interestEarned: Math.round(savingsBalance * 0.085), // 8.5% interest
      recentTransactions: member.payments.slice(0, 5).map(payment => ({
        date: payment.createdAt.toISOString().split('T')[0],
        description: `Payment - ${payment.loanAccount?.accountNumber || 'Loan'}`,
        type: 'DEPOSIT',
        amount: Math.round(payment.amount * 0.1), // 10% goes to savings
        balance: Math.round(savingsBalance),
      })),
    }

    // Calculate shares statistics (simplified)
    const shareValue = 25000 // Fixed share value in UGX
    const totalShares = Math.floor(savingsBalance / shareValue)
    const sharesStats = {
      totalShares,
      shareValue,
      totalValue: totalShares * shareValue,
      dividendEarned: Math.round(totalShares * shareValue * 0.12), // 12% dividend
      recentDividends: totalShares > 0 ? [{
        date: '2024-06-30',
        shares: totalShares,
        amount: Math.round(totalShares * shareValue * 0.06), // 6% semi-annual dividend
      }] : [],
    }

    // Recent loan payments
    const recentLoanPayments = activeLoanAccounts
      .flatMap(account => account!.payments)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(payment => ({
        date: payment.createdAt.toISOString().split('T')[0],
        amount: payment.amount,
        principal: payment.principalAmount,
        interest: payment.interestAmount,
        balance: payment.amount, // Simplified
      }))

    const memberStatement = {
      member: {
        id: member.id,
        membershipNumber: `MBR-${member.id.slice(-6).toUpperCase()}-2024`,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phoneNumber: member.phone || 'Not provided',
        joinDate: member.createdAt.toISOString().split('T')[0],
        status: member.isActive ? 'ACTIVE' : 'INACTIVE',
        savingsBalance: savingsStats.currentBalance,
        loanBalance: Math.round(loanStats.currentBalance),
        shareValue: sharesStats.totalValue,
        lastActivity: member.lastLogin?.toISOString().split('T')[0] || member.createdAt.toISOString().split('T')[0],
      },
      savings: savingsStats,
      loans: {
        ...loanStats,
        totalBorrowed: Math.round(loanStats.totalBorrowed),
        totalRepaid: Math.round(loanStats.totalRepaid),
        currentBalance: Math.round(loanStats.currentBalance),
        recentPayments: recentLoanPayments,
      },
      shares: sharesStats,
    }

    return NextResponse.json(memberStatement)

  } catch (error) {
    console.error('Error fetching member statement:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}