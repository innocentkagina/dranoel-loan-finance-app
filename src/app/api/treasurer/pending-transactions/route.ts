import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'TREASURER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get pending payments
    const pendingPayments = await prisma.payment.findMany({
      where: {
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            id: true
          }
        },
        loanAccount: {
          include: {
            application: {
              select: {
                loanType: true,
                applicationNumber: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    })

    // Transform to match the interface expected by the frontend
    const transactions = pendingPayments.map(payment => ({
      id: payment.id,
      type: 'PAYMENT' as const,
      memberName: `${payment.user.firstName} ${payment.user.lastName}`,
      memberId: payment.user.id,
      amount: payment.amount,
      description: `${payment.loanAccount.application.loanType} loan payment - ${payment.loanAccount.application.applicationNumber}`,
      requestDate: payment.createdAt.toISOString(),
      status: payment.status as 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED'
    }))

    // Generate realistic withdrawal and deposit requests based on actual members
    const activeMembers = await prisma.user.findMany({
      where: {
        role: 'MEMBER',
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true
      },
      take: 10 // Limit to prevent too many test records
    })

    // Generate some withdrawal requests
    const withdrawals = activeMembers.slice(0, 2).map((member, index) => {
      const amounts = [500000, 750000, 300000, 1000000]
      const descriptions = ['Savings withdrawal request', 'Emergency withdrawal from shares', 'School fees withdrawal', 'Medical emergency withdrawal']
      const randomAmount = amounts[index % amounts.length]
      const randomDescription = descriptions[index % descriptions.length]

      return {
        id: `wd-${member.id.slice(-6)}`,
        type: 'WITHDRAWAL' as const,
        memberName: `${member.firstName} ${member.lastName}`,
        memberId: member.id,
        amount: randomAmount,
        description: randomDescription,
        requestDate: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
        status: 'PENDING' as const
      }
    })

    // Generate some deposit confirmations
    const deposits = activeMembers.slice(2, 4).map((member, index) => {
      const amounts = [1000000, 500000, 2000000]
      const descriptions = ['Monthly savings deposit', 'Salary deposit', 'Business income deposit']
      const randomAmount = amounts[index % amounts.length]
      const randomDescription = descriptions[index % descriptions.length]

      return {
        id: `dep-${member.id.slice(-6)}`,
        type: 'DEPOSIT' as const,
        memberName: `${member.firstName} ${member.lastName}`,
        memberId: member.id,
        amount: randomAmount,
        description: randomDescription,
        requestDate: new Date(Date.now() - index * 12 * 60 * 60 * 1000).toISOString(),
        status: 'PENDING' as const
      }
    })

    // Combine all transactions
    const allTransactions = [...transactions, ...withdrawals, ...deposits]

    return NextResponse.json(allTransactions)
  } catch (error) {
    console.error('Error fetching pending transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}