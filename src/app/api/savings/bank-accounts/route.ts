import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BankAccountStatus, NotificationType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's bank accounts
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { userId: session.user.id },
      include: {
        savingsAccount: {
          select: {
            accountNumber: true,
            balance: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(bankAccounts)

  } catch (error) {
    console.error('Error fetching bank accounts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      bankName,
      accountNumber,
      accountType,
      routingNumber,
      swiftCode,
      accountHolderName,
      verificationDocument
    } = body

    // Validate required fields
    if (!bankName || !accountNumber || !accountType || !accountHolderName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if account number already exists for this user
    const existingAccount = await prisma.bankAccount.findFirst({
      where: {
        userId: session.user.id,
        accountNumber,
        bankName
      }
    })

    if (existingAccount) {
      return NextResponse.json(
        { error: 'Bank account already exists' },
        { status: 400 }
      )
    }

    // Get user's savings account
    const savingsAccount = await prisma.savingsAccount.findUnique({
      where: { userId: session.user.id }
    })

    // Create bank account
    const bankAccount = await prisma.bankAccount.create({
      data: {
        userId: session.user.id,
        savingsAccountId: savingsAccount?.id || null,
        bankName,
        accountNumber,
        accountType,
        routingNumber: routingNumber || null,
        swiftCode: swiftCode || null,
        accountHolderName,
        verificationDocument: verificationDocument || null,
        status: BankAccountStatus.PENDING,
        isActive: true
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'ADD_BANK_ACCOUNT',
        entityType: 'BANK_ACCOUNT',
        entityId: bankAccount.id,
        newValues: {
          bankName,
          accountNumber,
          accountType,
          accountHolderName,
          status: BankAccountStatus.PENDING
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: NotificationType.GENERAL,
        title: 'Bank Account Submitted',
        message: `Your bank account (${bankName} - ${accountNumber}) has been submitted for approval by the treasurer.`,
        metadata: {
          bankAccountId: bankAccount.id,
          bankName,
          accountNumber
        }
      }
    })

    // Notify treasurers about new bank account pending approval
    const treasurers = await prisma.user.findMany({
      where: { role: 'TREASURER', isActive: true },
      select: { id: true }
    })

    for (const treasurer of treasurers) {
      await prisma.notification.create({
        data: {
          userId: treasurer.id,
          senderId: session.user.id,
          type: NotificationType.GENERAL,
          title: 'Bank Account Pending Approval',
          message: `A new bank account from ${session.user.firstName} ${session.user.lastName} (${bankName} - ${accountNumber}) requires approval.`,
          metadata: {
            bankAccountId: bankAccount.id,
            userId: session.user.id,
            userEmail: session.user.email,
            bankName,
            accountNumber,
            requiresApproval: true
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      bankAccount,
      message: 'Bank account submitted for approval'
    })

  } catch (error) {
    console.error('Error adding bank account:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}