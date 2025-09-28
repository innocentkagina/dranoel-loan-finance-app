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

    // Calculate current month start
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)

    // Get all active loan accounts for portfolio calculation
    const activeLoanAccounts = await prisma.loanAccount.findMany({
      where: { isActive: true },
      include: {
        payments: {
          where: {
            paidDate: {
              gte: currentMonth
            },
            status: 'PAID'
          }
        }
      }
    })

    // Calculate total portfolio (current outstanding balance)
    const totalPortfolio = activeLoanAccounts.reduce((sum, account) => {
      return sum + account.currentBalance
    }, 0)

    // Calculate total collections this month
    const totalCollections = activeLoanAccounts.reduce((sum, account) => {
      return sum + account.payments.reduce((paymentSum, payment) => {
        return paymentSum + payment.amount
      }, 0)
    }, 0)

    // Get pending payments (overdue)
    const today = new Date()
    const pendingPayments = await prisma.loanAccount.count({
      where: {
        isActive: true,
        nextPaymentDate: {
          lt: today
        }
      }
    })

    // Get overdue payments (more than 30 days overdue)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const overduePayments = await prisma.loanAccount.count({
      where: {
        isActive: true,
        nextPaymentDate: {
          lt: thirtyDaysAgo
        }
      }
    })

    // Get total members
    const totalMembers = await prisma.user.count({
      where: { role: 'MEMBER', isActive: true }
    })

    // Active loans count
    const activeLoans = activeLoanAccounts.length

    // Get real savings statistics
    const [
      totalSavingsAccounts,
      totalSavingsBalance,
      totalInterestPaid,
      pendingBankAccounts,
      activeSavingsMembers,
      recentSavingsTransactions
    ] = await Promise.all([
      // Total savings accounts
      prisma.savingsAccount.count({
        where: { isActive: true }
      }),

      // Total savings balance across all accounts
      prisma.savingsAccount.aggregate({
        where: { isActive: true },
        _sum: { balance: true }
      }),

      // Total interest earned by all members
      prisma.savingsAccount.aggregate({
        where: { isActive: true },
        _sum: { totalInterestEarned: true }
      }),

      // Pending bank account approvals
      prisma.bankAccount.count({
        where: { status: 'PENDING' }
      }),

      // Members with active savings accounts
      prisma.user.count({
        where: {
          role: 'MEMBER',
          isActive: true,
          savingsAccount: {
            isNot: null,
            status: 'ACTIVE'
          }
        }
      }),

      // Recent savings activity (last 30 days)
      prisma.savingsTransaction.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      })
    ])

    const savingsBalance = totalSavingsBalance._sum.balance || 0
    const sharesBalance = totalMembers * 250000 // Shares still estimated

    // Calculate savings penetration rate
    const savingsPenetrationRate = totalMembers > 0 ? (activeSavingsMembers / totalMembers) * 100 : 0

    const stats = {
      totalPortfolio,
      totalCollections,
      pendingPayments,
      overduePayments,
      totalMembers,
      activeLoans,
      savingsBalance,
      sharesBalance,
      // Additional savings metrics
      totalSavingsAccounts,
      totalInterestPaid: totalInterestPaid._sum.totalInterestEarned || 0,
      pendingBankAccounts,
      activeSavingsMembers,
      savingsPenetrationRate: Math.round(savingsPenetrationRate * 100) / 100,
      recentSavingsActivity: recentSavingsTransactions,
      pendingDisbursements: await prisma.loanApplication.count({
        where: {
          status: 'APPROVED',
          loanAccount: null
        }
      })
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching treasurer dashboard stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}