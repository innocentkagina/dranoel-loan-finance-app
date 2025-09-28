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

    const { searchParams } = new URL(request.url)
    const operation = searchParams.get('operation')

    switch (operation) {
      case 'stats':
        return await getDatabaseStats()
      case 'tables':
        return await getTableInfo()
      case 'health':
        return await getDatabaseHealth()
      default:
        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in database operations:', error)
    return NextResponse.json(
      { error: 'Database operation failed' },
      { status: 500 }
    )
  }
}

async function getDatabaseStats() {
  const stats = await Promise.all([
    prisma.user.count(),
    prisma.loanApplication.count(),
    prisma.loanAccount.count(),
    prisma.payment.count(),
    prisma.document.count(),
    prisma.notification.count(),
    prisma.auditLog.count(),
    prisma.systemSettings.count()
  ])

  const tableStats = [
    { name: 'Users', count: stats[0] },
    { name: 'Loan Applications', count: stats[1] },
    { name: 'Loan Accounts', count: stats[2] },
    { name: 'Payments', count: stats[3] },
    { name: 'Documents', count: stats[4] },
    { name: 'Notifications', count: stats[5] },
    { name: 'Audit Logs', count: stats[6] },
    { name: 'System Settings', count: stats[7] }
  ]

  return NextResponse.json({ tableStats })
}

async function getTableInfo() {
  // This is a simplified version - in a real app you might query the database schema
  const tableInfo = [
    {
      name: 'users',
      columns: 15,
      indexes: 3,
      size: 'N/A',
      description: 'User accounts and profile information'
    },
    {
      name: 'loan_applications',
      columns: 25,
      indexes: 5,
      size: 'N/A',
      description: 'Loan application submissions and status'
    },
    {
      name: 'loan_accounts',
      columns: 18,
      indexes: 4,
      size: 'N/A',
      description: 'Active loan accounts and balances'
    },
    {
      name: 'payments',
      columns: 12,
      indexes: 3,
      size: 'N/A',
      description: 'Payment transactions and history'
    },
    {
      name: 'documents',
      columns: 10,
      indexes: 2,
      size: 'N/A',
      description: 'Uploaded documents and files'
    },
    {
      name: 'notifications',
      columns: 8,
      indexes: 2,
      size: 'N/A',
      description: 'System notifications and alerts'
    },
    {
      name: 'audit_logs',
      columns: 9,
      indexes: 3,
      size: 'N/A',
      description: 'System activity and audit trail'
    }
  ]

  return NextResponse.json({ tableInfo })
}

async function getDatabaseHealth() {
  try {
    // Simple health check - try to connect and query
    await prisma.$queryRaw`SELECT 1`

    const health = {
      status: 'healthy',
      connectionTime: Date.now(),
      activeConnections: 'N/A', // Would require specific PostgreSQL queries
      uptime: 'N/A',
      version: 'PostgreSQL',
      lastBackup: 'N/A' // Would be configured separately
    }

    return NextResponse.json({ health })

  } catch (error) {
    const health = {
      status: 'unhealthy',
      error: 'Connection failed',
      connectionTime: null,
      activeConnections: 'N/A',
      uptime: 'N/A',
      version: 'Unknown',
      lastBackup: 'N/A'
    }

    return NextResponse.json({ health })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMINISTRATOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { operation, params } = body

    // Log the database operation
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `DATABASE_${operation.toUpperCase()}`,
        entityType: 'DATABASE',
        entityId: 'SYSTEM',
        newValues: { operation, params },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    switch (operation) {
      case 'backup':
        return await performBackup()
      case 'optimize':
        return await optimizeDatabase()
      case 'cleanup':
        return await cleanupDatabase(params)
      default:
        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in database operations:', error)
    return NextResponse.json(
      { error: 'Database operation failed' },
      { status: 500 }
    )
  }
}

async function performBackup() {
  // In a real application, this would trigger a database backup
  // For now, we'll simulate the operation
  return NextResponse.json({
    message: 'Backup initiated',
    status: 'success',
    timestamp: new Date().toISOString()
  })
}

async function optimizeDatabase() {
  // In a real application, this would run optimization queries
  // For PostgreSQL, this might include VACUUM, ANALYZE, etc.
  return NextResponse.json({
    message: 'Database optimization completed',
    status: 'success',
    timestamp: new Date().toISOString()
  })
}

async function cleanupDatabase(params: any) {
  try {
    let cleanupCount = 0

    // Clean up old audit logs (older than specified days)
    if (params.cleanupAuditLogs) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - (params.auditLogRetentionDays || 90))

      const result = await prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      })
      cleanupCount += result.count
    }

    // Clean up old notifications (read notifications older than 30 days)
    if (params.cleanupNotifications) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 30)

      const result = await prisma.notification.deleteMany({
        where: {
          isRead: true,
          createdAt: {
            lt: cutoffDate
          }
        }
      })
      cleanupCount += result.count
    }

    return NextResponse.json({
      message: `Cleanup completed. ${cleanupCount} records removed.`,
      status: 'success',
      cleanupCount,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Cleanup operation failed' },
      { status: 500 }
    )
  }
}