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
    const { paymentId, action, comment } = body

    if (!paymentId || !action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 })
    }

    // Get the payment with related loan account
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        loanAccount: true,
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (payment.status !== 'PENDING') {
      return NextResponse.json({ error: 'Payment has already been processed' }, { status: 400 })
    }

    // Begin transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update payment status
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: action === 'APPROVE' ? 'PAID' : 'REJECTED',
          paidDate: action === 'APPROVE' ? new Date() : null,
          notes: comment || null
        }
      })

      if (action === 'APPROVE') {
        // Update loan account balance
        await tx.loanAccount.update({
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
            },
            // Update next payment date (simplified calculation)
            nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        })

        // Create notification for member
        await tx.notification.create({
          data: {
            userId: payment.userId,
            senderId: session.user.id,
            type: 'PAYMENT_RECEIVED',
            title: 'Payment Processed Successfully',
            message: `Your payment of ${payment.amount.toLocaleString('en-UG', {
              style: 'currency',
              currency: 'UGX',
              minimumFractionDigits: 0
            })} has been processed and applied to your loan account.`,
            metadata: {
              paymentId: payment.id,
              amount: payment.amount,
              loanAccountId: payment.loanAccountId
            }
          }
        })
      } else {
        // Create rejection notification
        await tx.notification.create({
          data: {
            userId: payment.userId,
            senderId: session.user.id,
            type: 'GENERAL',
            title: 'Payment Rejected',
            message: `Your payment of ${payment.amount.toLocaleString('en-UG', {
              style: 'currency',
              currency: 'UGX',
              minimumFractionDigits: 0
            })} has been rejected. ${comment || 'Please contact customer service for more information.'}`,
            metadata: {
              paymentId: payment.id,
              amount: payment.amount,
              rejectionReason: comment
            }
          }
        })
      }

      // Create audit log for payment approval/rejection
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: action === 'APPROVE' ? 'APPROVE_PAYMENT' : 'REJECT_PAYMENT',
          entityType: 'PAYMENT',
          entityId: paymentId,
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
            paymentMethod: payment.paymentMethod,
            memberName: `${payment.user?.firstName} ${payment.user?.lastName}`
          },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      })

      return updatedPayment
    })

    return NextResponse.json({
      success: true,
      message: `Payment ${action.toLowerCase()}d successfully`,
      payment: result
    })
  } catch (error) {
    console.error('Error processing payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}