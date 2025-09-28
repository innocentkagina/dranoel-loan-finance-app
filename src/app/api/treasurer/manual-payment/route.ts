import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'TREASURER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { memberId, loanId, amount, paymentMethod } = body

    // Validate input
    if (!memberId || !loanId || !amount || !paymentMethod) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const paymentAmount = parseFloat(amount)
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 })
    }

    // Verify member and loan account exist
    const member = await prisma.user.findUnique({
      where: { id: memberId, role: 'MEMBER' }
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const loanAccount = await prisma.loanAccount.findUnique({
      where: {
        id: loanId,
        application: {
          borrowerId: memberId
        }
      },
      include: {
        application: true
      }
    })

    if (!loanAccount) {
      return NextResponse.json({ error: 'Loan account not found or does not belong to this member' }, { status: 404 })
    }

    // Calculate principal and interest breakdown (simplified)
    // In a real system, this would be more sophisticated based on amortization schedule
    const monthlyPayment = loanAccount.monthlyPayment
    const interestRate = loanAccount.interestRate / 100 / 12 // Monthly interest rate
    const currentBalance = loanAccount.currentBalance

    const interestAmount = currentBalance * interestRate
    const principalAmount = Math.min(paymentAmount - interestAmount, currentBalance)

    // Ensure we don't have negative values
    const finalInterestAmount = Math.max(0, Math.min(interestAmount, paymentAmount))
    const finalPrincipalAmount = Math.max(0, paymentAmount - finalInterestAmount)

    // Create the payment record
    const result = await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.payment.create({
        data: {
          loanAccountId: loanId,
          userId: memberId,
          amount: paymentAmount,
          principalAmount: finalPrincipalAmount,
          interestAmount: finalInterestAmount,
          paymentMethod: paymentMethod,
          status: 'PAID', // Manual payments are automatically approved
          paidDate: new Date(),
          notes: `Manual payment recorded by treasurer ${session.user.firstName} ${session.user.lastName}`
        }
      })

      // Update loan account
      const newBalance = Math.max(0, currentBalance - finalPrincipalAmount)
      await tx.loanAccount.update({
        where: { id: loanId },
        data: {
          currentBalance: newBalance,
          totalPaid: {
            increment: paymentAmount
          },
          principalPaid: {
            increment: finalPrincipalAmount
          },
          totalInterestPaid: {
            increment: finalInterestAmount
          },
          nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next month
          // Mark as paid off if balance reaches zero
          status: newBalance === 0 ? 'PAID_OFF' : 'ACTIVE'
        }
      })

      // Create notification for member
      await tx.notification.create({
        data: {
          userId: memberId,
          senderId: session.user.id,
          type: 'PAYMENT_RECEIVED',
          title: 'Manual Payment Recorded',
          message: `A manual payment of ${paymentAmount.toLocaleString('en-UG', {
            style: 'currency',
            currency: 'UGX',
            minimumFractionDigits: 0
          })} has been recorded for your ${loanAccount.application.loanType} loan. Your current balance is ${newBalance.toLocaleString('en-UG', {
            style: 'currency',
            currency: 'UGX',
            minimumFractionDigits: 0
          })}.`,
          metadata: {
            paymentId: payment.id,
            amount: paymentAmount,
            loanAccountId: loanId,
            paymentMethod: paymentMethod,
            recordedBy: session.user.id
          }
        }
      })

      return payment
    })

    return NextResponse.json({
      success: true,
      message: 'Manual payment recorded successfully',
      payment: {
        id: result.id,
        amount: result.amount,
        principalAmount: result.principalAmount,
        interestAmount: result.interestAmount,
        paymentMethod: result.paymentMethod,
        paidDate: result.paidDate
      }
    })
  } catch (error) {
    console.error('Error recording manual payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}