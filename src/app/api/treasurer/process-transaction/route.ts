import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'TREASURER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { transactionId, action, comment } = body

    if (!transactionId || !action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 })
    }

    // For now, we'll handle payment processing
    // In a real system, you'd need to determine transaction type and handle accordingly
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: transactionId }
      })

      if (payment) {
        // Update payment status
        const updatedPayment = await prisma.payment.update({
          where: { id: transactionId },
          data: {
            status: action === 'APPROVE' ? 'PAID' : 'REJECTED',
            paidDate: action === 'APPROVE' ? new Date() : null,
            notes: comment || null
          }
        })

        // Create audit log for payment approval/rejection
        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: action === 'APPROVE' ? 'APPROVE_PAYMENT' : 'REJECT_PAYMENT',
            entityType: 'PAYMENT',
            entityId: transactionId,
            oldValues: {
              status: payment.status,
              paidDate: payment.paidDate,
              notes: payment.notes
            },
            newValues: {
              status: action === 'APPROVE' ? 'PAID' : 'REJECTED',
              paidDate: action === 'APPROVE' ? new Date() : null,
              notes: comment || null,
              amount: payment.amount,
              paymentMethod: payment.paymentMethod
            },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown'
          }
        })

        // If approved, update loan account balance
        if (action === 'APPROVE') {
          await prisma.loanAccount.update({
            where: { id: payment.loanAccountId },
            data: {
              currentBalance: {
                decrement: payment.principalAmount
              },
              totalPaid: {
                increment: payment.amount
              },
              principalPaid: {
                increment: payment.principalAmount
              },
              totalInterestPaid: {
                increment: payment.interestAmount
              }
            }
          })

          // Create notification for member
          await prisma.notification.create({
            data: {
              userId: payment.userId,
              senderId: session.user.id,
              type: 'PAYMENT_RECEIVED',
              title: 'Payment Processed',
              message: `Your payment of ${payment.amount.toLocaleString('en-UG', {
                style: 'currency',
                currency: 'UGX'
              })} has been processed successfully.`,
              metadata: {
                paymentId: payment.id,
                amount: payment.amount
              }
            }
          })
        }

        return NextResponse.json({
          success: true,
          message: `Payment ${action.toLowerCase()}d successfully`
        })
      } else {
        // Handle other transaction types (withdrawals, deposits) here
        // Create audit log for generic transaction approval/rejection
        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: action === 'APPROVE' ? 'APPROVE_TRANSACTION' : 'REJECT_TRANSACTION',
            entityType: 'TRANSACTION',
            entityId: transactionId,
            newValues: {
              action: action,
              comment: comment || null,
              transactionId: transactionId
            },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown'
          }
        })

        // For now, just return success - in a real system this would update savings/shares accounts
        return NextResponse.json({
          success: true,
          message: `Transaction ${action.toLowerCase()}d successfully`
        })
      }
    } catch (error) {
      console.error('Error processing transaction:', error)
      return NextResponse.json({ error: 'Failed to process transaction' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in process-transaction endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}