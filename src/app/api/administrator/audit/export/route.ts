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
    const action = searchParams.get('action') || ''
    const entityType = searchParams.get('entityType') || ''
    const userId = searchParams.get('userId') || ''
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const format = searchParams.get('format') || 'csv'

    const where: any = {
      AND: []
    }

    if (action) {
      where.AND.push({ action: { contains: action, mode: 'insensitive' } })
    }

    if (entityType) {
      where.AND.push({ entityType })
    }

    if (userId) {
      where.AND.push({ userId })
    }

    if (startDate && endDate) {
      where.AND.push({
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    }

    if (where.AND.length === 0) {
      delete where.AND
    }

    // Fetch all matching audit logs (no pagination for export)
    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000, // Limit to 10k records to prevent memory issues
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    })

    // Log the export action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'EXPORT_AUDIT_LOGS',
        entityType: 'AUDIT_LOG',
        entityId: 'ALL',
        newValues: {
          format,
          recordCount: auditLogs.length,
          filters: { action, entityType, userId, startDate, endDate }
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    if (format === 'csv') {
      // Generate CSV content
      const csvHeaders = [
        'Date/Time',
        'User',
        'Email',
        'Role',
        'Action',
        'Entity Type',
        'Entity ID',
        'Old Values',
        'New Values',
        'IP Address',
        'User Agent'
      ]

      const csvRows = auditLogs.map(log => [
        new Date(log.createdAt).toLocaleString(),
        log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
        log.user?.email || 'N/A',
        log.user?.role || 'N/A',
        log.action,
        log.entityType,
        log.entityId,
        log.oldValues ? JSON.stringify(log.oldValues).replace(/"/g, '""') : '',
        log.newValues ? JSON.stringify(log.newValues).replace(/"/g, '""') : '',
        log.ipAddress || '',
        log.userAgent || ''
      ])

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } else if (format === 'json') {
      // Return JSON format
      const jsonContent = JSON.stringify(auditLogs, null, 2)

      return new NextResponse(jsonContent, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`
        }
      })
    } else {
      return NextResponse.json({ error: 'Unsupported export format' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error exporting audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to export audit logs' },
      { status: 500 }
    )
  }
}