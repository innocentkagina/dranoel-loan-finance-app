import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      amount,
      withdrawalMethod,
      phoneNumber,
      bankAccount,
      bankName,
      accountHolderName,
      reason,
      preferredBranch
    } = body

    // Validate required fields
    if (!amount || !withdrawalMethod) {
      return NextResponse.json(
        { error: 'Amount and withdrawal method are required' },
        { status: 400 }
      )
    }

    // Validate method-specific fields
    if (['MTN_MOBILE_MONEY', 'AIRTEL_MONEY'].includes(withdrawalMethod) && !phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required for mobile money withdrawals' },
        { status: 400 }
      )
    }

    if (withdrawalMethod === 'BANK_TRANSFER') {
      if (!bankAccount || !bankName || !accountHolderName) {
        return NextResponse.json(
          { error: 'All bank details are required for bank transfers' },
          { status: 400 }
        )
      }
    }

    if (withdrawalMethod === 'CASH_PICKUP' && !preferredBranch) {
      return NextResponse.json(
        { error: 'Preferred branch is required for cash pickup' },
        { status: 400 }
      )
    }

    // Get user's current savings balance
    const userPayments = await prisma.payment.findMany({
      where: {
        userId: session.user.id,
        status: 'PAID',
      },
    })

    const totalPayments = userPayments.reduce((sum, payment) => sum + payment.amount, 0)
    const currentSavingsBalance = Math.round(totalPayments * 0.1) // 10% of payments as savings

    // Validate withdrawal amount
    if (parseFloat(amount) > currentSavingsBalance) {
      return NextResponse.json(
        { error: 'Insufficient funds' },
        { status: 400 }
      )
    }

    // Create withdrawal request record (you would need to create a WithdrawalRequest model)
    // For now, we'll just simulate the creation and return success
    const withdrawalRequest = {
      id: `WR-${Date.now()}`,
      userId: session.user.id,
      amount: parseFloat(amount),
      withdrawalMethod,
      phoneNumber,
      bankAccount,
      bankName,
      accountHolderName,
      reason,
      preferredBranch,
      status: 'PENDING',
      requestDate: new Date().toISOString(),
      referenceNumber: `WD${Date.now().toString().slice(-6)}`,
    }

    // In a real application, you would save this to the database
    // await prisma.withdrawalRequest.create({ data: withdrawalRequest })

    return NextResponse.json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      referenceNumber: withdrawalRequest.referenceNumber,
    })

  } catch (error) {
    console.error('Error processing withdrawal request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}