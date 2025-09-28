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

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        payments: {
          where: { status: 'PAID' },
          select: { amount: true, createdAt: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Calculate share value from payments (simplified)
    const totalPayments = user.payments.reduce((sum, payment) => sum + payment.amount, 0)
    const shareValue = 25000 // Fixed share value in UGX
    const totalShares = Math.floor(totalPayments * 0.05 / shareValue) // 5% of payments converted to shares
    const totalValue = totalShares * shareValue
    const dividendRate = 12.0 // 12% annual dividend
    const annualDividend = Math.round(totalValue * (dividendRate / 100))

    // Generate membership number
    const membershipNumber = `MBR-${user.id.slice(-6).toUpperCase()}-2023`

    const shareData = {
      membershipNumber,
      memberName: `${user.firstName} ${user.lastName}`,
      shareValue,
      totalShares,
      totalValue,
      availableShares: totalShares,
      pledgedShares: 0,
      dividendRate,
      lastDividendDate: '2024-06-30',
      nextDividendDate: '2024-12-30',
      joinDate: user.createdAt.toISOString().split('T')[0],
      status: 'ACTIVE',
    }

    // Generate share transactions
    const shareTransactions = []

    // Add dividend transactions
    if (totalShares > 0) {
      shareTransactions.push({
        id: `dividend-2024-06`,
        date: '2024-06-30',
        description: 'Semi-Annual Dividend Payment',
        type: 'DIVIDEND' as const,
        shares: totalShares,
        amount: Math.round(annualDividend / 2), // Half-year dividend
        shareValue,
        balance: totalShares,
        reference: 'DIV-2024-H1',
      })

      shareTransactions.push({
        id: `dividend-2023-12`,
        date: '2023-12-30',
        description: 'Semi-Annual Dividend Payment',
        type: 'DIVIDEND' as const,
        shares: totalShares,
        amount: Math.round(annualDividend / 2),
        shareValue,
        balance: totalShares,
        reference: 'DIV-2023-H2',
      })
    }

    // Add share purchases from recent payments
    user.payments.slice(0, Math.min(5, limit - shareTransactions.length)).forEach((payment, index) => {
      const sharesPurchased = Math.floor(payment.amount * 0.05 / shareValue)
      if (sharesPurchased > 0) {
        shareTransactions.push({
          id: `purchase-${payment.createdAt.getTime()}-${index}`,
          date: payment.createdAt.toISOString().split('T')[0],
          description: 'Share Purchase - Auto-investment',
          type: 'PURCHASE' as const,
          shares: sharesPurchased,
          amount: sharesPurchased * shareValue,
          shareValue,
          balance: totalShares - (index * 2), // Simulated running balance
          reference: `AUTO-${payment.createdAt.getFullYear()}-${String(payment.createdAt.getMonth() + 1).padStart(2, '0')}`,
        })
      }
    })

    // Sort transactions by date (newest first)
    shareTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      shareData,
      transactions: shareTransactions,
      pagination: {
        page,
        limit,
        total: shareTransactions.length,
        pages: Math.ceil(shareTransactions.length / limit),
      },
    })

  } catch (error) {
    console.error('Error fetching shares statements:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}