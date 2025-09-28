import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    let stats = {}

    switch (userRole) {
      case 'MEMBER':
        stats = await getMemberStats(session.user.id)
        break
      case 'LOANS_OFFICER':
        stats = await getOfficerStats(session.user.id)
        break
      case 'TREASURER':
        stats = await getTreasurerStats()
        break
      default:
        stats = {}
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

async function getMemberStats(userId: string) {
  try {
    // Get member's loan applications
    const loanApplications = await prisma.loanApplication.findMany({
      where: { borrowerId: userId },
      include: {
        loanAccount: {
          include: {
            payments: true
          }
        }
      }
    })

    // Count total loans
    const totalLoans = loanApplications.length

    // Count active loans
    const activeLoans = loanApplications.filter(
      app => app.loanAccount && app.loanAccount.isActive
    ).length

    // Count total payments made
    let totalPayments = 0
    loanApplications.forEach(app => {
      if (app.loanAccount) {
        totalPayments += app.loanAccount.payments.length
      }
    })

    return {
      totalLoans,
      activeLoans,
      totalPayments
    }
  } catch (error) {
    console.error('Error getting member stats:', error)
    return {}
  }
}

async function getOfficerStats(userId: string) {
  try {
    const currentMonth = new Date()
    currentMonth.setDate(1) // First day of current month

    // Get applications assigned to this officer
    const assignedApplications = await prisma.loanApplication.findMany({
      where: { assignedOfficerId: userId },
      include: {
        loanAccount: true
      }
    })

    // Pending applications
    const pendingApplications = assignedApplications.filter(
      app => app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW'
    ).length

    // Approved applications this month
    const approvedApplications = assignedApplications.filter(
      app => app.status === 'APPROVED' &&
      app.approvedAt &&
      new Date(app.approvedAt) >= currentMonth
    ).length

    // Rejected applications this month
    const rejectedApplications = assignedApplications.filter(
      app => app.status === 'REJECTED' &&
      app.rejectedAt &&
      new Date(app.rejectedAt) >= currentMonth
    ).length

    // Total disbursed amount
    const totalDisbursed = assignedApplications
      .filter(app => app.loanAccount)
      .reduce((sum, app) => sum + (app.loanAccount?.principalAmount || 0), 0)

    return {
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      totalDisbursed
    }
  } catch (error) {
    console.error('Error getting officer stats:', error)
    return {}
  }
}

async function getTreasurerStats() {
  try {
    const currentMonth = new Date()
    currentMonth.setDate(1) // First day of current month

    // Get all active loan accounts
    const activeLoanAccounts = await prisma.loanAccount.findMany({
      where: { isActive: true },
      include: {
        payments: {
          where: {
            paidDate: {
              gte: currentMonth
            }
          }
        }
      }
    })

    // Total portfolio value (outstanding loans)
    const totalDisbursed = activeLoanAccounts.reduce(
      (sum, account) => sum + account.currentBalance, 0
    )

    // Active loans count
    const activeLoans = activeLoanAccounts.length

    // Collections this month
    let totalCollected = 0
    activeLoanAccounts.forEach(account => {
      totalCollected += account.payments.reduce(
        (sum, payment) => sum + payment.amount, 0
      )
    })

    return {
      totalDisbursed,
      activeLoans,
      totalCollected
    }
  } catch (error) {
    console.error('Error getting treasurer stats:', error)
    return {}
  }
}