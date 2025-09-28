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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const period = searchParams.get('period') || 'all'

    // Get user's loan accounts first
    const loanAccounts = await prisma.loanAccount.findMany({
      where: {
        application: {
          borrowerId: session.user.id,
        },
      },
      select: {
        id: true,
        accountNumber: true,
        application: {
          select: {
            loanType: true,
            requestedAmount: true,
            approvedAmount: true,
            disbursedAt: true,
          },
        },
      },
    })

    if (loanAccounts.length === 0) {
      return NextResponse.json({
        loanData: null,
        transactions: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          pages: 0,
        },
      })
    }

    // For simplicity, we'll use the first active loan account
    const primaryLoanAccount = loanAccounts[0]

    // Get detailed loan account info
    const loanAccountDetails = await prisma.loanAccount.findUnique({
      where: { id: primaryLoanAccount.id },
      include: {
        application: {
          select: {
            loanType: true,
            requestedAmount: true,
            approvedAmount: true,
            disbursedAt: true,
            applicationNumber: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        },
      },
    })

    if (!loanAccountDetails) {
      return NextResponse.json({ error: 'Loan account not found' }, { status: 404 })
    }

    // Calculate date filter
    let dateFilter: Date | undefined
    if (period !== 'all') {
      const now = new Date()
      switch (period) {
        case '3months':
          dateFilter = new Date(now.setMonth(now.getMonth() - 3))
          break
        case '6months':
          dateFilter = new Date(now.setMonth(now.getMonth() - 6))
          break
        case '1year':
          dateFilter = new Date(now.setFullYear(now.getFullYear() - 1))
          break
      }
    }

    // Get payments with date filter
    const whereClause: any = {
      loanAccountId: primaryLoanAccount.id,
    }

    if (dateFilter) {
      whereClause.createdAt = {
        gte: dateFilter,
      }
    }

    const [payments, totalPayments] = await Promise.all([
      prisma.payment.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where: whereClause }),
    ])

    // Transform loan account data
    const loanData = {
      loanNumber: loanAccountDetails.accountNumber,
      loanType: mapLoanType(loanAccountDetails.application.loanType),
      principalAmount: loanAccountDetails.principalAmount,
      currentBalance: loanAccountDetails.currentBalance,
      interestRate: loanAccountDetails.interestRate,
      termMonths: loanAccountDetails.termMonths,
      startDate: loanAccountDetails.startDate.toISOString().split('T')[0],
      maturityDate: loanAccountDetails.maturityDate.toISOString().split('T')[0],
      monthlyPayment: loanAccountDetails.monthlyPayment,
      totalPaid: loanAccountDetails.totalPaid,
      totalInterestPaid: loanAccountDetails.totalInterestPaid,
      status: loanAccountDetails.status,
    }

    // Transform payments to loan transactions
    let runningBalance = loanAccountDetails.currentBalance
    const transactions = payments.map((payment, index) => {
      // For historical transactions, we need to calculate what the balance was
      if (index === 0) {
        runningBalance = loanAccountDetails.currentBalance
      } else {
        runningBalance += payment.amount // Add back the payment to get previous balance
      }

      return {
        id: payment.id,
        date: payment.createdAt.toISOString().split('T')[0],
        description: getTransactionDescription(payment),
        type: getTransactionType(payment),
        amount: payment.amount,
        principal: payment.principalAmount,
        interest: payment.interestAmount,
        balance: runningBalance,
        reference: payment.transactionId || `PMT-${payment.id.slice(-6).toUpperCase()}`,
      }
    })

    // Add disbursement transaction if this is the first page and we're showing all periods
    if (page === 1 && period === 'all' && loanAccountDetails.application.disbursedAt) {
      const disbursementTransaction = {
        id: `disbursement-${loanAccountDetails.id}`,
        date: loanAccountDetails.application.disbursedAt.toISOString().split('T')[0],
        description: 'Loan Disbursement',
        type: 'DISBURSEMENT' as const,
        amount: loanAccountDetails.principalAmount,
        principal: loanAccountDetails.principalAmount,
        interest: 0,
        balance: loanAccountDetails.principalAmount,
        reference: `DISB-${loanAccountDetails.application.applicationNumber}`,
      }

      transactions.push(disbursementTransaction)
    }

    // Sort transactions by date (newest first)
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      loanData,
      transactions,
      pagination: {
        page,
        limit,
        total: totalPayments + (page === 1 && period === 'all' ? 1 : 0), // Add 1 for disbursement
        pages: Math.ceil((totalPayments + (page === 1 && period === 'all' ? 1 : 0)) / limit),
      },
    })

  } catch (error) {
    console.error('Error fetching loan statements:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function mapLoanType(dbType: string): string {
  const typeMap: { [key: string]: string } = {
    'PERSONAL': 'Personal Loan',
    'BUSINESS': 'Business Loan',
    'STUDENT': 'Education Loan',
    'MORTGAGE': 'Mortgage Loan',
    'AUTO': 'Auto Loan',
    'PAYDAY': 'Emergency Loan',
  }
  return typeMap[dbType] || dbType
}

function getTransactionDescription(payment: any): string {
  if (payment.status === 'PAID') {
    return 'Monthly Loan Payment'
  } else if (payment.status === 'LATE') {
    return 'Late Payment'
  } else if (payment.status === 'MISSED') {
    return 'Missed Payment Recovered'
  }
  return 'Loan Payment'
}

function getTransactionType(payment: any): 'DISBURSEMENT' | 'PAYMENT' | 'INTEREST' | 'PENALTY' | 'INSURANCE' {
  if (payment.status === 'LATE' && payment.notes?.includes('penalty')) {
    return 'PENALTY'
  }
  if (payment.notes?.includes('insurance')) {
    return 'INSURANCE'
  }
  return 'PAYMENT'
}