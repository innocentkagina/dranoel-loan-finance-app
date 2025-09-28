import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LoanStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow treasurers and admins
    if (!['TREASURER', 'ADMINISTRATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get statistics
    const [
      totalApprovedCount,
      totalDisbursedCount,
      pendingDisbursementCount,
      totalDisbursedAmountResult,
      avgDisbursedAmountResult
    ] = await Promise.all([
      // Total approved loans
      prisma.loanApplication.count({
        where: { status: LoanStatus.APPROVED }
      }),

      // Total disbursed loans (have loan accounts)
      prisma.loanApplication.count({
        where: {
          status: LoanStatus.APPROVED,
          loanAccount: {
            isNot: null
          }
        }
      }),

      // Pending disbursement (approved but no loan account)
      prisma.loanApplication.count({
        where: {
          status: LoanStatus.APPROVED,
          loanAccount: null
        }
      }),

      // Total disbursed amount
      prisma.loanAccount.aggregate({
        _sum: {
          principalAmount: true
        }
      }),

      // Average disbursed amount
      prisma.loanAccount.aggregate({
        _avg: {
          principalAmount: true
        }
      })
    ])

    const stats = {
      totalApproved: totalApprovedCount,
      totalDisbursed: totalDisbursedCount,
      pendingDisbursement: pendingDisbursementCount,
      totalDisbursedAmount: totalDisbursedAmountResult._sum.principalAmount || 0,
      averageAmount: avgDisbursedAmountResult._avg.principalAmount || 0
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Error fetching disbursement stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}