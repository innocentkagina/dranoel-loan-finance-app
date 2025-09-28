import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SavingsAccountStatus, NotificationType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's savings account
    const savingsAccount = await prisma.savingsAccount.findUnique({
      where: { userId: session.user.id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            bankAccount: {
              select: {
                bankName: true,
                accountNumber: true
              }
            }
          }
        },
        linkedBankAccounts: {
          where: { isActive: true },
          select: {
            id: true,
            bankName: true,
            accountNumber: true,
            status: true
          }
        }
      }
    })

    return NextResponse.json(savingsAccount)

  } catch (error) {
    console.error('Error fetching savings account:', error)
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

    // Check if user already has a savings account
    const existingAccount = await prisma.savingsAccount.findUnique({
      where: { userId: session.user.id }
    })

    if (existingAccount) {
      return NextResponse.json(
        { error: 'User already has a savings account' },
        { status: 400 }
      )
    }

    // Generate account number
    const accountNumber = `SAV-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`

    // Create savings account with default settings
    const savingsAccount = await prisma.savingsAccount.create({
      data: {
        accountNumber,
        userId: session.user.id,
        balance: 0,
        interestRate: 2.5, // Default 2.5% annual interest
        minimumBalance: 1000, // Default minimum balance
        status: SavingsAccountStatus.ACTIVE,
        dailyWithdrawLimit: 500000, // UGX 500,000
        monthlyWithdrawLimit: 2000000, // UGX 2,000,000
        maxBalance: 50000000, // UGX 50,000,000
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_SAVINGS_ACCOUNT',
        entityType: 'SAVINGS_ACCOUNT',
        entityId: savingsAccount.id,
        newValues: {
          accountNumber: savingsAccount.accountNumber,
          initialBalance: 0,
          interestRate: savingsAccount.interestRate
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    // Create notification
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: NotificationType.GENERAL,
        title: 'Savings Account Created',
        message: `Your savings account ${accountNumber} has been successfully created.`,
        metadata: {
          savingsAccountId: savingsAccount.id,
          accountNumber: savingsAccount.accountNumber
        }
      }
    })

    return NextResponse.json({
      success: true,
      savingsAccount,
      message: 'Savings account created successfully'
    })

  } catch (error) {
    console.error('Error creating savings account:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}