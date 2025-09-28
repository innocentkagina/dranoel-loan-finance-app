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

    // Since we don't have a dedicated savings table, we'll calculate savings from loan payments
    // In a real application, this would come from a dedicated savings account table

    // Get user's payments to calculate savings
    const payments = await prisma.payment.findMany({
      where: {
        userId: session.user.id,
        status: 'PAID',
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate total savings (simplified - using 10% of total payments as savings)
    const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const savingsBalance = Math.round(totalPayments * 0.1)
    const totalDeposits = Math.round(savingsBalance * 1.5) // Simulated
    const totalWithdrawals = Math.round(savingsBalance * 0.5) // Simulated
    const interestEarned = Math.round(savingsBalance * 0.085) // 8.5% interest
    const accountNumber = `SAV-${session.user.id.slice(-6).toUpperCase()}-2024`

    // Create account data
    const accountData = {
      accountNumber,
      accountType: 'Regular Savings',
      currentBalance: savingsBalance,
      availableBalance: savingsBalance,
      minimumBalance: 50000,
      interestRate: 8.5,
      openingDate: '2023-01-15', // Default opening date
      status: 'ACTIVE',
      totalDeposits,
      totalWithdrawals,
      interestEarned,
      lastTransactionDate: payments[0]?.createdAt.toISOString().split('T')[0] || '2024-01-01',
    }

    // Create savings transactions from loan payments (10% portion)
    const savingsTransactions = payments.slice(0, limit).map((payment, index) => ({
      id: `savings-${payment.id}`,
      date: payment.createdAt.toISOString().split('T')[0],
      description: 'Auto-transfer from loan payment',
      type: 'DEPOSIT' as const,
      amount: Math.round(payment.amount * 0.1), // 10% goes to savings
      balance: Math.round(savingsBalance - (index * payment.amount * 0.05)), // Simulated running balance
      reference: `AUTO-${payment.transactionId?.slice(-6) || payment.id.slice(-6).toUpperCase()}`,
      channel: 'AUTO_TRANSFER',
    }))

    // Add some interest transactions
    if (savingsTransactions.length > 0) {
      savingsTransactions.splice(2, 0, {
        id: `interest-${Date.now()}`,
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
        description: 'Monthly Interest Credit',
        type: 'INTEREST' as const,
        amount: Math.round(savingsBalance * 0.00708), // Monthly interest
        balance: savingsBalance,
        reference: `INT-${new Date().getMonth() + 1}${new Date().getFullYear()}`,
        channel: 'SYSTEM',
      })
    }

    return NextResponse.json({
      accountData,
      transactions: savingsTransactions,
      pagination: {
        page,
        limit,
        total: payments.length + 1, // +1 for interest
        pages: Math.ceil((payments.length + 1) / limit),
      },
    })

  } catch (error) {
    console.error('Error fetching savings statements:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}