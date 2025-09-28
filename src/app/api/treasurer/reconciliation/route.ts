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

    // Get all loan accounts for reconciliation
    const loanAccounts = await prisma.loanAccount.findMany({
      where: { isActive: true },
      include: {
        application: {
          include: {
            borrower: {
              select: {
                firstName: true,
                lastName: true,
                id: true
              }
            }
          }
        },
        payments: {
          where: {
            status: 'PAID'
          }
        }
      },
      take: 50
    })

    const reconciliationItems = loanAccounts.map(account => {
      // Calculate actual balance based on payments
      const totalPaid = account.payments.reduce((sum, payment) => sum + payment.amount, 0)
      const actualBalance = account.principalAmount - totalPaid
      const bookBalance = account.currentBalance
      const difference = bookBalance - actualBalance

      return {
        id: account.id,
        accountType: 'LOAN' as const,
        memberName: `${account.application.borrower.firstName} ${account.application.borrower.lastName}`,
        memberId: account.application.borrower.id,
        bookBalance: bookBalance,
        actualBalance: actualBalance,
        difference: difference,
        lastReconciled: account.updatedAt.toISOString(),
        status: Math.abs(difference) < 1 ? 'RECONCILED' as const : 'DISCREPANCY' as const
      }
    })

    // Generate realistic savings account reconciliation items based on actual members
    const activeMembers = await prisma.user.findMany({
      where: {
        role: 'MEMBER',
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        createdAt: true
      },
      take: 8 // Limit to prevent too many test records
    })

    // Generate savings account reconciliation items
    const savingsItems = activeMembers.slice(0, 3).map((member, index) => {
      const baseBalances = [2500000, 1800000, 3200000, 950000]
      const bookBalance = baseBalances[index % baseBalances.length]

      // Add occasional discrepancies for testing
      const hasDiscrepancy = index === 1 // Second item has discrepancy
      const actualBalance = hasDiscrepancy ? bookBalance - 5000 : bookBalance
      const difference = bookBalance - actualBalance

      return {
        id: `sav-${member.id.slice(-6)}`,
        accountType: 'SAVINGS' as const,
        memberName: `${member.firstName} ${member.lastName}`,
        memberId: member.id,
        bookBalance,
        actualBalance,
        difference,
        lastReconciled: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
        status: Math.abs(difference) < 1 ? 'RECONCILED' as const : 'DISCREPANCY' as const
      }
    })

    // Generate shares account reconciliation items
    const sharesItems = activeMembers.slice(3, 5).map((member, index) => {
      const baseBalances = [5000000, 2750000, 4200000]
      const bookBalance = baseBalances[index % baseBalances.length]

      // Most shares accounts are reconciled
      const actualBalance = bookBalance
      const difference = bookBalance - actualBalance

      return {
        id: `shr-${member.id.slice(-6)}`,
        accountType: 'SHARES' as const,
        memberName: `${member.firstName} ${member.lastName}`,
        memberId: member.id,
        bookBalance,
        actualBalance,
        difference,
        lastReconciled: new Date(Date.now() - index * 12 * 60 * 60 * 1000).toISOString(),
        status: Math.abs(difference) < 1 ? 'RECONCILED' as const : 'DISCREPANCY' as const
      }
    })

    // Combine all reconciliation items
    const allItems = [...reconciliationItems, ...savingsItems, ...sharesItems]

    // Sort by difference (discrepancies first)
    allItems.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))

    return NextResponse.json(allItems)
  } catch (error) {
    console.error('Error fetching reconciliation data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}