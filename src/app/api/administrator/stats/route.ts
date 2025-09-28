import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMINISTRATOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get system statistics
    const [
      totalUsers,
      totalLoans,
      totalPayments,
      recentActivity,
      systemHealth
    ] = await Promise.all([
      prisma.user.count(),
      prisma.loanAccount.count({
        where: { isActive: true }
      }),
      prisma.payment.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      }),
      // Simple system health check - could be expanded
      'Healthy'
    ])

    return NextResponse.json({
      totalUsers,
      totalLoans,
      totalPayments,
      recentActivity,
      systemHealth
    })

  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}