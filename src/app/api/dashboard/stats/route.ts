import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LoanStatus, PaymentStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let stats

    if (session.user.role === 'MEMBER') {
      // Stats for borrower
      const [
        totalLoans,
        activeLoans,
        totalPaidResult,
        totalDueResult,
        pendingApplications,
        overduePayments,
      ] = await Promise.all([
        // Total loans
        prisma.loanAccount.count({
          where: {
            application: {
              borrowerId: session.user.id,
            },
          },
        }),

        // Active loans
        prisma.loanAccount.count({
          where: {
            application: {
              borrowerId: session.user.id,
            },
            status: LoanStatus.ACTIVE,
            isActive: true,
          },
        }),

        // Total paid amount
        prisma.payment.aggregate({
          where: {
            userId: session.user.id,
            status: PaymentStatus.PAID,
          },
          _sum: {
            amount: true,
          },
        }),

        // Total due amount (current balance)
        prisma.loanAccount.aggregate({
          where: {
            application: {
              borrowerId: session.user.id,
            },
            status: LoanStatus.ACTIVE,
            isActive: true,
          },
          _sum: {
            currentBalance: true,
          },
        }),

        // Pending applications
        prisma.loanApplication.count({
          where: {
            borrowerId: session.user.id,
            status: {
              in: [LoanStatus.DRAFT, LoanStatus.SUBMITTED, LoanStatus.UNDER_REVIEW],
            },
          },
        }),

        // Overdue payments
        prisma.payment.count({
          where: {
            userId: session.user.id,
            status: {
              in: [PaymentStatus.LATE, PaymentStatus.MISSED],
            },
          },
        }),
      ])

      stats = {
        totalLoans,
        activeLoans,
        totalPaid: totalPaidResult._sum.amount || 0,
        totalDue: totalDueResult._sum.currentBalance || 0,
        pendingApplications,
        overduePayments,
      }
    } else {
      // Stats for loan officers, underwriters, admin
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)

      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)

      const [
        pendingApplications,
        underReviewApplications,
        approvedTodayApplications,
        rejectedTodayApplications,
        totalMembers,
        totalRequestsThisMonth,
        totalAmountRequestedResult,
        totalAmountApprovedResult,
        approvedApplicationsTotal,
        totalApplicationsProcessed,
      ] = await Promise.all([
        // Pending applications (SUBMITTED status)
        prisma.loanApplication.count({
          where: {
            status: LoanStatus.SUBMITTED,
          },
        }),

        // Under review applications
        prisma.loanApplication.count({
          where: {
            status: LoanStatus.UNDER_REVIEW,
          },
        }),

        // Approved today
        prisma.loanApplication.count({
          where: {
            status: LoanStatus.APPROVED,
            approvedAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),

        // Rejected today
        prisma.loanApplication.count({
          where: {
            status: LoanStatus.REJECTED,
            rejectedAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),

        // Total members (users with MEMBER role)
        prisma.user.count({
          where: {
            role: 'MEMBER',
            isActive: true,
          },
        }),

        // Total requests this month
        prisma.loanApplication.count({
          where: {
            createdAt: {
              gte: thisMonth,
            },
          },
        }),

        // Total amount requested (all applications)
        prisma.loanApplication.aggregate({
          _sum: {
            requestedAmount: true,
          },
        }),

        // Total amount approved (approved applications)
        prisma.loanApplication.aggregate({
          where: {
            status: LoanStatus.APPROVED,
          },
          _sum: {
            approvedAmount: true,
          },
        }),

        // Total approved applications (for approval rate)
        prisma.loanApplication.count({
          where: {
            status: LoanStatus.APPROVED,
          },
        }),

        // Total processed applications (approved + rejected)
        prisma.loanApplication.count({
          where: {
            status: {
              in: [LoanStatus.APPROVED, LoanStatus.REJECTED],
            },
          },
        }),
      ])

      // Calculate approval rate
      const approvalRate = totalApplicationsProcessed > 0
        ? Math.round((approvedApplicationsTotal / totalApplicationsProcessed) * 100)
        : 0

      // Calculate average processing time (simplified - could be enhanced)
      const avgProcessingTime = '2.3 days' // TODO: Calculate from real data

      stats = {
        pendingRequests: pendingApplications,
        underReviewRequests: underReviewApplications,
        approvedToday: approvedTodayApplications,
        rejectedToday: rejectedTodayApplications,
        totalMembers,
        avgProcessingTime,
        approvalRate: `${approvalRate}%`,
        totalRequestsThisMonth,
        totalAmountRequested: totalAmountRequestedResult._sum.requestedAmount || 0,
        totalAmountApproved: totalAmountApprovedResult._sum.approvedAmount || 0,
      }
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}