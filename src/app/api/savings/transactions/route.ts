import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TransactionType, NotificationType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type') as TransactionType | null
    const skip = (page - 1) * limit

    // Get user's savings account
    const savingsAccount = await prisma.savingsAccount.findUnique({
      where: { userId: session.user.id }
    })

    if (!savingsAccount) {
      return NextResponse.json(
        { error: 'Savings account not found' },
        { status: 404 }
      )
    }

    // Build where clause
    const where: any = {
      savingsAccountId: savingsAccount.id
    }

    if (type) {
      where.type = type
    }

    // Get transactions with pagination
    const [transactions, total] = await Promise.all([
      prisma.savingsTransaction.findMany({
        where,
        include: {
          bankAccount: {
            select: {
              bankName: true,
              accountNumber: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.savingsTransaction.count({ where })
    ])

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching savings transactions:', error)
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
    const { type, amount, description, bankAccountId, referenceNumber } = body

    // Validate transaction type
    if (!Object.values(TransactionType).includes(type)) {
      return NextResponse.json(
        { error: 'Invalid transaction type' },
        { status: 400 }
      )
    }

    // Validate amount
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    // Get user's savings account
    const savingsAccount = await prisma.savingsAccount.findUnique({
      where: { userId: session.user.id }
    })

    if (!savingsAccount) {
      return NextResponse.json(
        { error: 'Savings account not found' },
        { status: 404 }
      )
    }

    // Check account status
    if (savingsAccount.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Savings account is not active' },
        { status: 400 }
      )
    }

    let newBalance = savingsAccount.balance
    let bankAccount = null

    // Validate bank account if provided
    if (bankAccountId) {
      bankAccount = await prisma.bankAccount.findFirst({
        where: {
          id: bankAccountId,
          userId: session.user.id,
          status: 'APPROVED',
          isActive: true
        }
      })

      if (!bankAccount) {
        return NextResponse.json(
          { error: 'Invalid or unapproved bank account' },
          { status: 400 }
        )
      }
    }

    // Validate transaction based on type
    if (type === TransactionType.DEPOSIT) {
      newBalance += amount

      // Check maximum balance limit
      if (savingsAccount.maxBalance && newBalance > savingsAccount.maxBalance) {
        return NextResponse.json(
          { error: `Deposit exceeds maximum balance limit of ${formatCurrency(savingsAccount.maxBalance)}` },
          { status: 400 }
        )
      }
    } else if (type === TransactionType.WITHDRAWAL) {
      newBalance -= amount

      // Check minimum balance
      if (newBalance < savingsAccount.minimumBalance) {
        return NextResponse.json(
          { error: `Withdrawal would bring balance below minimum of ${formatCurrency(savingsAccount.minimumBalance)}` },
          { status: 400 }
        )
      }

      // Check daily withdrawal limit (implement this logic if needed)
      // Check monthly withdrawal limit (implement this logic if needed)
    }

    // Create transaction and update balance in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the transaction record
      const transaction = await tx.savingsTransaction.create({
        data: {
          savingsAccountId: savingsAccount.id,
          userId: session.user.id,
          bankAccountId: bankAccountId || null,
          type,
          amount,
          balanceAfter: newBalance,
          description: description || null,
          referenceNumber: referenceNumber || null,
          isProcessed: true,
          processedAt: new Date()
        },
        include: {
          bankAccount: {
            select: {
              bankName: true,
              accountNumber: true
            }
          }
        }
      })

      // Update savings account balance
      await tx.savingsAccount.update({
        where: { id: savingsAccount.id },
        data: { balance: newBalance }
      })

      return transaction
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `SAVINGS_${type}`,
        entityType: 'SAVINGS_TRANSACTION',
        entityId: result.id,
        oldValues: {
          balance: savingsAccount.balance
        },
        newValues: {
          transactionType: type,
          amount,
          newBalance,
          description,
          referenceNumber,
          bankAccountId
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    // Create notification
    const notificationType = type === TransactionType.DEPOSIT
      ? NotificationType.SAVINGS_DEPOSIT
      : NotificationType.SAVINGS_WITHDRAWAL

    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: notificationType,
        title: `Savings ${type === TransactionType.DEPOSIT ? 'Deposit' : 'Withdrawal'}`,
        message: `${type === TransactionType.DEPOSIT ? 'Deposit' : 'Withdrawal'} of ${formatCurrency(amount)} ${type === TransactionType.DEPOSIT ? 'to' : 'from'} your savings account has been processed. New balance: ${formatCurrency(newBalance)}`,
        metadata: {
          transactionId: result.id,
          amount,
          newBalance,
          type
        }
      }
    })

    return NextResponse.json({
      success: true,
      transaction: result,
      newBalance,
      message: `${type} processed successfully`
    })

  } catch (error) {
    console.error('Error processing savings transaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function for currency formatting
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}