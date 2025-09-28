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
    const limit = parseInt(searchParams.get('limit') || '10')

    let recentActivity = []

    if (session.user.role === 'MEMBER') {
      // Get recent activity for borrower
      const [recentApplications, recentPayments, recentLoans] = await Promise.all([
        // Recent loan applications
        prisma.loanApplication.findMany({
          where: {
            borrowerId: session.user.id,
          },
          select: {
            id: true,
            applicationNumber: true,
            requestedAmount: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: Math.ceil(limit / 3),
        }),

        // Recent payments
        prisma.payment.findMany({
          where: {
            userId: session.user.id,
          },
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
            loanAccount: {
              select: {
                accountNumber: true,
                application: {
                  select: {
                    applicationNumber: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: Math.ceil(limit / 3),
        }),

        // Recent loan accounts
        prisma.loanAccount.findMany({
          where: {
            application: {
              borrowerId: session.user.id,
            },
          },
          select: {
            id: true,
            accountNumber: true,
            principalAmount: true,
            status: true,
            createdAt: true,
            application: {
              select: {
                applicationNumber: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: Math.ceil(limit / 3),
        }),
      ])

      // Combine and format activity
      const activities = [
        ...recentApplications.map((app) => ({
          id: app.id,
          type: 'application' as const,
          title: `Loan Application ${app.applicationNumber}`,
          amount: app.requestedAmount,
          status: app.status.replace('_', ' ').toLowerCase(),
          date: app.updatedAt.toISOString(),
        })),
        ...recentPayments.map((payment) => ({
          id: payment.id,
          type: 'payment' as const,
          title: `Payment for ${payment.loanAccount.application.applicationNumber}`,
          amount: payment.amount,
          status: payment.status.replace('_', ' ').toLowerCase(),
          date: payment.createdAt.toISOString(),
        })),
        ...recentLoans.map((loan) => ({
          id: loan.id,
          type: 'loan' as const,
          title: `Loan Account ${loan.accountNumber}`,
          amount: loan.principalAmount,
          status: loan.status.replace('_', ' ').toLowerCase(),
          date: loan.createdAt.toISOString(),
        })),
      ]

      recentActivity = activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit)
    } else {
      // Get recent activity for staff (all applications, payments, etc.)
      const [recentApplications, recentPayments] = await Promise.all([
        // Recent loan applications
        prisma.loanApplication.findMany({
          select: {
            id: true,
            applicationNumber: true,
            requestedAmount: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            borrower: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: Math.ceil(limit / 2),
        }),

        // Recent payments
        prisma.payment.findMany({
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            loanAccount: {
              select: {
                accountNumber: true,
                application: {
                  select: {
                    applicationNumber: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: Math.ceil(limit / 2),
        }),
      ])

      // Combine and format activity
      const activities = [
        ...recentApplications.map((app) => ({
          id: app.id,
          type: 'application' as const,
          title: `${app.borrower.firstName} ${app.borrower.lastName} - ${app.applicationNumber}`,
          amount: app.requestedAmount,
          status: app.status.replace('_', ' ').toLowerCase(),
          date: app.updatedAt.toISOString(),
        })),
        ...recentPayments.map((payment) => ({
          id: payment.id,
          type: 'payment' as const,
          title: `${payment.user.firstName} ${payment.user.lastName} - Payment`,
          amount: payment.amount,
          status: payment.status.replace('_', ' ').toLowerCase(),
          date: payment.createdAt.toISOString(),
        })),
      ]

      recentActivity = activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit)
    }

    return NextResponse.json(recentActivity)
  } catch (error) {
    console.error('Error fetching dashboard activity:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}