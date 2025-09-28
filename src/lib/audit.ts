import { prisma } from './prisma'

export interface AuditLogOptions {
  userId?: string
  action: string
  entityType: string
  entityId: string
  oldValues?: any
  newValues?: any
  ipAddress?: string
  userAgent?: string
  description?: string
}

export class AuditLogger {
  static async log(options: AuditLogOptions): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: options.userId || null,
          action: options.action,
          entityType: options.entityType,
          entityId: options.entityId,
          oldValues: options.oldValues || null,
          newValues: options.newValues || null,
          ipAddress: options.ipAddress || 'unknown',
          userAgent: options.userAgent || 'unknown'
        }
      })
    } catch (error) {
      console.error('Failed to create audit log:', error)
      // Don't throw error to avoid breaking the main operation
    }
  }

  // Convenience methods for common actions
  static async logUserAction(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    request?: Request,
    oldValues?: any,
    newValues?: any
  ): Promise<void> {
    await this.log({
      userId,
      action,
      entityType,
      entityId,
      oldValues,
      newValues,
      ipAddress: request?.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request?.headers.get('user-agent') || 'unknown'
    })
  }

  static async logLogin(userId: string, request?: Request, success: boolean = true): Promise<void> {
    await this.log({
      userId,
      action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE',
      entityType: 'AUTH',
      entityId: userId,
      ipAddress: request?.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request?.headers.get('user-agent') || 'unknown'
    })
  }

  static async logLogout(userId: string, request?: Request): Promise<void> {
    await this.log({
      userId,
      action: 'LOGOUT',
      entityType: 'AUTH',
      entityId: userId,
      ipAddress: request?.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request?.headers.get('user-agent') || 'unknown'
    })
  }

  static async logLoanApplication(
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'APPROVE' | 'REJECT' | 'SUBMIT',
    applicationId: string,
    request?: Request,
    oldValues?: any,
    newValues?: any
  ): Promise<void> {
    await this.log({
      userId,
      action: `LOAN_APPLICATION_${action}`,
      entityType: 'LOAN_APPLICATION',
      entityId: applicationId,
      oldValues,
      newValues,
      ipAddress: request?.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request?.headers.get('user-agent') || 'unknown'
    })
  }

  static async logPayment(
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'PROCESS' | 'CANCEL',
    paymentId: string,
    request?: Request,
    oldValues?: any,
    newValues?: any
  ): Promise<void> {
    await this.log({
      userId,
      action: `PAYMENT_${action}`,
      entityType: 'PAYMENT',
      entityId: paymentId,
      oldValues,
      newValues,
      ipAddress: request?.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request?.headers.get('user-agent') || 'unknown'
    })
  }

  static async logUserManagement(
    adminId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ACTIVATE' | 'DEACTIVATE' | 'ROLE_CHANGE',
    targetUserId: string,
    request?: Request,
    oldValues?: any,
    newValues?: any
  ): Promise<void> {
    await this.log({
      userId: adminId,
      action: `USER_${action}`,
      entityType: 'USER',
      entityId: targetUserId,
      oldValues,
      newValues,
      ipAddress: request?.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request?.headers.get('user-agent') || 'unknown'
    })
  }

  static async logDatabaseOperation(
    adminId: string,
    operation: 'BACKUP' | 'RESTORE' | 'OPTIMIZE' | 'CLEANUP' | 'MAINTENANCE',
    request?: Request,
    details?: any
  ): Promise<void> {
    await this.log({
      userId: adminId,
      action: `DATABASE_${operation}`,
      entityType: 'DATABASE',
      entityId: 'SYSTEM',
      newValues: details,
      ipAddress: request?.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request?.headers.get('user-agent') || 'unknown'
    })
  }

  static async logDocumentAction(
    userId: string,
    action: 'UPLOAD' | 'DOWNLOAD' | 'DELETE' | 'VERIFY',
    documentId: string,
    request?: Request,
    details?: any
  ): Promise<void> {
    await this.log({
      userId,
      action: `DOCUMENT_${action}`,
      entityType: 'DOCUMENT',
      entityId: documentId,
      newValues: details,
      ipAddress: request?.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request?.headers.get('user-agent') || 'unknown'
    })
  }

  static async logSystemSettings(
    adminId: string,
    action: 'UPDATE' | 'CREATE' | 'DELETE',
    settingKey: string,
    request?: Request,
    oldValues?: any,
    newValues?: any
  ): Promise<void> {
    await this.log({
      userId: adminId,
      action: `SETTINGS_${action}`,
      entityType: 'SYSTEM_SETTINGS',
      entityId: settingKey,
      oldValues,
      newValues,
      ipAddress: request?.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request?.headers.get('user-agent') || 'unknown'
    })
  }

  // Query methods for retrieving audit logs
  static async getRecentActivity(limit: number = 10): Promise<any[]> {
    return await prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
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
  }

  static async getUserActivity(userId: string, limit: number = 20): Promise<any[]> {
    return await prisma.auditLog.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' }
    })
  }

  static async getEntityHistory(entityType: string, entityId: string): Promise<any[]> {
    return await prisma.auditLog.findMany({
      where: {
        entityType,
        entityId
      },
      orderBy: { createdAt: 'desc' },
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
  }

  static async getSecurityEvents(startDate?: Date, endDate?: Date): Promise<any[]> {
    const where: any = {
      action: {
        in: ['LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'PASSWORD_CHANGE', 'ROLE_CHANGE']
      }
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate
      }
    }

    return await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
  }

  static async getFailedLoginAttempts(hours: number = 24): Promise<any[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)

    return await prisma.auditLog.findMany({
      where: {
        action: 'LOGIN_FAILURE',
        createdAt: {
          gte: since
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  // Analytics methods
  static async getActivityStats(days: number = 30): Promise<any> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [
      totalLogs,
      userActions,
      systemActions,
      securityEvents
    ] = await Promise.all([
      prisma.auditLog.count({
        where: { createdAt: { gte: since } }
      }),
      prisma.auditLog.count({
        where: {
          createdAt: { gte: since },
          action: { not: { startsWith: 'SYSTEM_' } }
        }
      }),
      prisma.auditLog.count({
        where: {
          createdAt: { gte: since },
          action: { startsWith: 'SYSTEM_' }
        }
      }),
      prisma.auditLog.count({
        where: {
          createdAt: { gte: since },
          action: { in: ['LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT'] }
        }
      })
    ])

    return {
      totalLogs,
      userActions,
      systemActions,
      securityEvents,
      period: `${days} days`
    }
  }
}

// Export a default instance for easy use
export const auditLogger = AuditLogger