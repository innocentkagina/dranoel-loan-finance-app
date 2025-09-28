import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LoanStatus, PaymentStatus, LoanType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only staff can access analytics
    if (!['LOAN_OFFICER', 'UNDERWRITER', 'ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '30' // days
    const days = parseInt(timeframe)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Loan Status Distribution
    const loanStatusDistribution = await prisma.loanApplication.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    })

    // Loan Type Distribution
    const loanTypeDistribution = await prisma.loanApplication.groupBy({
      by: ['loanType'],
      _count: {
        loanType: true,
      },
      _sum: {
        requestedAmount: true,
        approvedAmount: true,
      },
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    })

    // Monthly Application Trends
    const monthlyTrends = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(*) as applications,
        SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
        AVG("requestedAmount") as avg_amount
      FROM "loan_applications"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month DESC
      LIMIT 12
    ` as Array<{
      month: Date
      applications: bigint
      approved: bigint
      rejected: bigint
      avg_amount: number
    }>

    // Payment Performance
    const paymentPerformance = await prisma.payment.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
      _sum: {
        amount: true,
      },
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    })

    // Top Performing Loan Officers
    const topLoanOfficers = await prisma.loanApplication.groupBy({
      by: ['assignedOfficerId'],
      _count: {
        assignedOfficerId: true,
      },
      _sum: {
        approvedAmount: true,
      },
      where: {
        assignedOfficerId: {
          not: null,
        },
        status: LoanStatus.APPROVED,
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: {
        _count: {
          assignedOfficerId: 'desc',
        },
      },
      take: 10,
    })

    // Get loan officer names
    const officerIds = topLoanOfficers
      .map(officer => officer.assignedOfficerId)
      .filter(id => id !== null) as string[]

    const officers = await prisma.user.findMany({
      where: {
        id: {
          in: officerIds,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    })

    const topLoanOfficersWithNames = topLoanOfficers.map(officer => {
      const officerInfo = officers.find(o => o.id === officer.assignedOfficerId)
      return {
        ...officer,
        name: officerInfo ? `${officerInfo.firstName} ${officerInfo.lastName}` : 'Unknown',
      }
    })

    // Portfolio Health Metrics
    const portfolioHealth = await prisma.$queryRaw`
      SELECT
        COUNT(*) as total_loans,
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_loans,
        SUM(CASE WHEN status = 'DEFAULTED' THEN 1 ELSE 0 END) as defaulted_loans,
        SUM("currentBalance") as total_outstanding,
        SUM("totalPaid") as total_collected,
        AVG("interestRate") as avg_interest_rate
      FROM "loan_accounts"
      WHERE "createdAt" >= ${startDate}
    ` as Array<{
      total_loans: bigint
      active_loans: bigint
      defaulted_loans: bigint
      total_outstanding: number
      total_collected: number
      avg_interest_rate: number
    }>

    // Default Rate by Credit Score Range
    const defaultRateByCredit = await prisma.$queryRaw`
      SELECT
        CASE
          WHEN u."creditScore" >= 750 THEN 'Excellent (750+)'
          WHEN u."creditScore" >= 700 THEN 'Good (700-749)'
          WHEN u."creditScore" >= 650 THEN 'Fair (650-699)'
          WHEN u."creditScore" >= 600 THEN 'Poor (600-649)'
          ELSE 'Bad (<600)'
        END as credit_range,
        COUNT(la.*) as total_applications,
        SUM(CASE WHEN la.status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN la.status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
        ROUND(
          (SUM(CASE WHEN la.status = 'APPROVED' THEN 1 ELSE 0 END)::decimal / COUNT(la.*)) * 100,
          2
        ) as approval_rate
      FROM "loan_applications" la
      JOIN "users" u ON la."borrowerId" = u.id
      WHERE la."createdAt" >= ${startDate}
        AND u."creditScore" IS NOT NULL
      GROUP BY credit_range
      ORDER BY MIN(u."creditScore") DESC
    ` as Array<{
      credit_range: string
      total_applications: bigint
      approved: bigint
      rejected: bigint
      approval_rate: number
    }>

    // Convert BigInt to Number for JSON serialization
    const formatBigIntData = (data: any[]) => {
      return data.map(item => ({
        ...item,
        ...Object.keys(item).reduce((acc, key) => {
          if (typeof item[key] === 'bigint') {
            acc[key] = Number(item[key])
          }
          return acc
        }, {} as any),
      }))
    }

    const analytics = {
      timeframe: `${days} days`,
      loanStatusDistribution: loanStatusDistribution.map(item => ({
        status: item.status,
        count: item._count.status,
      })),
      loanTypeDistribution: loanTypeDistribution.map(item => ({
        type: item.loanType,
        count: item._count.loanType,
        totalRequested: item._sum.requestedAmount || 0,
        totalApproved: item._sum.approvedAmount || 0,
      })),
      monthlyTrends: formatBigIntData(monthlyTrends),
      paymentPerformance: paymentPerformance.map(item => ({
        status: item.status,
        count: item._count.status,
        totalAmount: item._sum.amount || 0,
      })),
      topLoanOfficers: topLoanOfficersWithNames.map(officer => ({
        name: officer.name,
        applicationsProcessed: officer._count.assignedOfficerId,
        totalApproved: officer._sum.approvedAmount || 0,
      })),
      portfolioHealth: formatBigIntData(portfolioHealth)[0] || {},
      defaultRateByCredit: formatBigIntData(defaultRateByCredit),
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}