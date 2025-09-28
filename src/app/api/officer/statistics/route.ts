import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LoanStatus, PaymentStatus, LoanType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'LOANS_OFFICER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '12months'
    const loanType = searchParams.get('loanType') || 'ALL'

    // Calculate date range
    let dateFrom: Date
    const dateTo = new Date()

    switch (period) {
      case '3months':
        dateFrom = new Date(dateTo.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '6months':
        dateFrom = new Date(dateTo.getTime() - 180 * 24 * 60 * 60 * 1000)
        break
      case '12months':
        dateFrom = new Date(dateTo.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      case '2years':
        dateFrom = new Date(dateTo.getTime() - 730 * 24 * 60 * 60 * 1000)
        break
      default:
        dateFrom = new Date(2020, 0, 1) // All time
    }

    // Build loan type filter
    const loanTypeFilter = loanType === 'ALL' ? {} : { loanType: loanType as LoanType }

    // 1. Loan Applications Overview
    const [
      totalApplications,
      approvedApplications,
      rejectedApplications,
      pendingApplications,
      underReviewApplications,
    ] = await Promise.all([
      prisma.loanApplication.count({
        where: {
          ...loanTypeFilter,
          createdAt: { gte: dateFrom, lte: dateTo },
        },
      }),
      prisma.loanApplication.count({
        where: {
          ...loanTypeFilter,
          status: LoanStatus.APPROVED,
          createdAt: { gte: dateFrom, lte: dateTo },
        },
      }),
      prisma.loanApplication.count({
        where: {
          ...loanTypeFilter,
          status: LoanStatus.REJECTED,
          createdAt: { gte: dateFrom, lte: dateTo },
        },
      }),
      prisma.loanApplication.count({
        where: {
          ...loanTypeFilter,
          status: { in: [LoanStatus.SUBMITTED, LoanStatus.DRAFT] },
          createdAt: { gte: dateFrom, lte: dateTo },
        },
      }),
      prisma.loanApplication.count({
        where: {
          ...loanTypeFilter,
          status: LoanStatus.UNDER_REVIEW,
          createdAt: { gte: dateFrom, lte: dateTo },
        },
      }),
    ])

    // 2. Loan Amounts Analytics
    const loanAmountsData = await prisma.loanApplication.aggregate({
      where: {
        ...loanTypeFilter,
        status: LoanStatus.APPROVED,
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      _sum: {
        approvedAmount: true,
        requestedAmount: true,
      },
      _avg: {
        approvedAmount: true,
        requestedAmount: true,
      },
    })

    // 3. Monthly Trends
    const monthlyTrends = await prisma.loanApplication.findMany({
      where: {
        ...loanTypeFilter,
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      select: {
        createdAt: true,
        status: true,
        approvedAmount: true,
        requestedAmount: true,
      },
    })

    // Group by month
    const monthlyData: { [key: string]: any } = {}
    monthlyTrends.forEach((app) => {
      const monthKey = `${app.createdAt.getFullYear()}-${String(app.createdAt.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          applications: 0,
          approved: 0,
          rejected: 0,
          pending: 0,
          totalApproved: 0,
          totalRequested: 0,
        }
      }

      monthlyData[monthKey].applications++

      if (app.status === LoanStatus.APPROVED) {
        monthlyData[monthKey].approved++
        monthlyData[monthKey].totalApproved += app.approvedAmount || 0
      } else if (app.status === LoanStatus.REJECTED) {
        monthlyData[monthKey].rejected++
      } else {
        monthlyData[monthKey].pending++
      }

      monthlyData[monthKey].totalRequested += app.requestedAmount || 0
    })

    const monthlyTrendsList = Object.values(monthlyData).sort((a: any, b: any) => a.month.localeCompare(b.month))

    // 4. Loan Type Distribution
    const loanTypeStats = await prisma.loanApplication.groupBy({
      by: ['loanType'],
      where: {
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      _count: {
        id: true,
      },
      _sum: {
        approvedAmount: true,
        requestedAmount: true,
      },
    })

    // 5. Payment Statistics
    const paymentStats = await Promise.all([
      prisma.payment.aggregate({
        where: {
          createdAt: { gte: dateFrom, lte: dateTo },
          status: PaymentStatus.PAID,
        },
        _sum: {
          amount: true,
          principalAmount: true,
          interestAmount: true,
        },
        _count: {
          id: true,
        },
      }),
      prisma.payment.count({
        where: {
          createdAt: { gte: dateFrom, lte: dateTo },
          status: PaymentStatus.LATE,
        },
      }),
      prisma.payment.count({
        where: {
          createdAt: { gte: dateFrom, lte: dateTo },
          status: PaymentStatus.PENDING,
        },
      }),
    ])

    // 6. Active Loan Accounts Summary
    const activeLoanAccounts = await prisma.loanAccount.aggregate({
      where: {
        status: LoanStatus.ACTIVE,
      },
      _sum: {
        principalAmount: true,
        currentBalance: true,
        totalPaid: true,
      },
      _count: {
        id: true,
      },
    })

    // 7. Top Performing Metrics
    const topBorrowers = await prisma.loanAccount.findMany({
      where: {
        status: LoanStatus.ACTIVE,
      },
      include: {
        application: {
          include: {
            borrower: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        principalAmount: 'desc',
      },
      take: 5,
    })

    // Calculate approval rate
    const approvalRate = totalApplications > 0 ? (approvedApplications / totalApplications) * 100 : 0

    // Calculate average processing time (mock data for now)
    const avgProcessingTime = 3.2 // days

    const statistics = {
      overview: {
        totalApplications,
        approvedApplications,
        rejectedApplications,
        pendingApplications,
        underReviewApplications,
        approvalRate: Math.round(approvalRate * 100) / 100,
        avgProcessingTime,
      },
      amounts: {
        totalApprovedAmount: loanAmountsData._sum.approvedAmount || 0,
        totalRequestedAmount: loanAmountsData._sum.requestedAmount || 0,
        avgApprovedAmount: loanAmountsData._avg.approvedAmount || 0,
        avgRequestedAmount: loanAmountsData._avg.requestedAmount || 0,
      },
      monthlyTrends: monthlyTrendsList,
      loanTypes: loanTypeStats.map((stat) => ({
        type: stat.loanType,
        count: stat._count.id,
        totalApproved: stat._sum.approvedAmount || 0,
        totalRequested: stat._sum.requestedAmount || 0,
      })),
      payments: {
        totalPaid: paymentStats[0]._sum.amount || 0,
        totalPrincipal: paymentStats[0]._sum.principalAmount || 0,
        totalInterest: paymentStats[0]._sum.interestAmount || 0,
        totalPayments: paymentStats[0]._count.id || 0,
        latePayments: paymentStats[1],
        pendingPayments: paymentStats[2],
      },
      activeLoans: {
        count: activeLoanAccounts._count.id || 0,
        totalPrincipal: activeLoanAccounts._sum.principalAmount || 0,
        totalOutstanding: activeLoanAccounts._sum.currentBalance || 0,
        totalRepaid: activeLoanAccounts._sum.totalPaid || 0,
      },
      topBorrowers: topBorrowers.map((account) => ({
        name: `${account.application.borrower.firstName} ${account.application.borrower.lastName}`,
        email: account.application.borrower.email,
        loanAmount: account.principalAmount,
        currentBalance: account.currentBalance,
        repaidAmount: account.totalPaid,
      })),
    }

    return NextResponse.json(statistics)

  } catch (error) {
    console.error('Error fetching loan statistics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}