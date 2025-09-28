import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BankAccountStatus, NotificationType } from '@prisma/client'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow treasurers and admins
    if (!['TREASURER', 'ADMINISTRATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, rejectionReason } = body

    // Get the bank account
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    if (!bankAccount) {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      )
    }

    // Check if account is in pending status
    if (bankAccount.status !== BankAccountStatus.PENDING) {
      return NextResponse.json(
        { error: 'Bank account is not pending approval' },
        { status: 400 }
      )
    }

    let updatedBankAccount
    let notificationTitle = ''
    let notificationMessage = ''

    if (action === 'approve') {
      updatedBankAccount = await prisma.bankAccount.update({
        where: { id },
        data: {
          status: BankAccountStatus.APPROVED,
          approvedAt: new Date(),
          approvedBy: session.user.id
        }
      })

      notificationTitle = 'Bank Account Approved'
      notificationMessage = `Your bank account (${bankAccount.bankName} - ${bankAccount.accountNumber}) has been approved and is now active.`

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'APPROVE_BANK_ACCOUNT',
          entityType: 'BANK_ACCOUNT',
          entityId: id,
          oldValues: {
            status: bankAccount.status
          },
          newValues: {
            status: BankAccountStatus.APPROVED,
            approvedBy: session.user.id,
            bankName: bankAccount.bankName,
            accountNumber: bankAccount.accountNumber,
            userEmail: bankAccount.user.email
          },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      })

      // Notify user of approval
      await prisma.notification.create({
        data: {
          userId: bankAccount.userId,
          senderId: session.user.id,
          type: NotificationType.BANK_ACCOUNT_APPROVED,
          title: notificationTitle,
          message: notificationMessage,
          metadata: {
            bankAccountId: bankAccount.id,
            bankName: bankAccount.bankName,
            accountNumber: bankAccount.accountNumber,
            approvedBy: session.user.email
          }
        }
      })

    } else if (action === 'reject') {
      if (!rejectionReason) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 }
        )
      }

      updatedBankAccount = await prisma.bankAccount.update({
        where: { id },
        data: {
          status: BankAccountStatus.REJECTED,
          rejectedAt: new Date(),
          rejectedBy: session.user.id,
          rejectionReason
        }
      })

      notificationTitle = 'Bank Account Rejected'
      notificationMessage = `Your bank account (${bankAccount.bankName} - ${bankAccount.accountNumber}) has been rejected. Reason: ${rejectionReason}`

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'REJECT_BANK_ACCOUNT',
          entityType: 'BANK_ACCOUNT',
          entityId: id,
          oldValues: {
            status: bankAccount.status
          },
          newValues: {
            status: BankAccountStatus.REJECTED,
            rejectedBy: session.user.id,
            rejectionReason,
            bankName: bankAccount.bankName,
            accountNumber: bankAccount.accountNumber,
            userEmail: bankAccount.user.email
          },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      })

      // Notify user of rejection
      await prisma.notification.create({
        data: {
          userId: bankAccount.userId,
          senderId: session.user.id,
          type: NotificationType.BANK_ACCOUNT_REJECTED,
          title: notificationTitle,
          message: notificationMessage,
          metadata: {
            bankAccountId: bankAccount.id,
            bankName: bankAccount.bankName,
            accountNumber: bankAccount.accountNumber,
            rejectionReason,
            rejectedBy: session.user.email
          }
        }
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "approve" or "reject"' },
        { status: 400 }
      )
    }

    // Notify other treasurers and administrators about the decision
    const stakeholders = await prisma.user.findMany({
      where: {
        role: { in: ['TREASURER', 'ADMINISTRATOR'] },
        isActive: true,
        NOT: { id: session.user.id }
      },
      select: { id: true }
    })

    for (const stakeholder of stakeholders) {
      await prisma.notification.create({
        data: {
          userId: stakeholder.id,
          senderId: session.user.id,
          type: NotificationType.GENERAL,
          title: `Bank Account ${action === 'approve' ? 'Approved' : 'Rejected'}`,
          message: `Bank account from ${bankAccount.user.firstName} ${bankAccount.user.lastName} (${bankAccount.bankName} - ${bankAccount.accountNumber}) has been ${action}d.`,
          metadata: {
            bankAccountId: bankAccount.id,
            userId: bankAccount.userId,
            userEmail: bankAccount.user.email,
            action,
            decidedBy: session.user.email
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      bankAccount: updatedBankAccount,
      message: `Bank account ${action}d successfully`
    })

  } catch (error) {
    console.error('Error updating bank account:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}