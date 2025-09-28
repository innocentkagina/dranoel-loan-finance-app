import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PaymentStatus, NotificationType } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: {
        loanAccount: {
          include: {
            application: {
              select: {
                applicationNumber: true,
                loanType: true,
                borrowerId: true,
              },
            },
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Check access permissions
    if (
      session.user.role === 'MEMBER' &&
      payment.loanAccount.application.borrowerId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Error fetching payment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, ...updateData } = body

    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: {
        loanAccount: {
          include: {
            application: {
              select: {
                borrowerId: true,
                applicationNumber: true,
              },
            },
          },
        },
      },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    let updatedPayment

    if (action === 'confirm') {
      // Confirm payment (loan officers/admin only)
      if (!['LOAN_OFFICER', 'ADMIN', 'MANAGER'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      updatedPayment = await prisma.$transaction(async (tx) => {
        // Update payment status
        const payment = await tx.payment.update({
          where: { id: params.id },
          data: {
            status: PaymentStatus.PAID,
            paidDate: new Date(),
          },
        })

        // Update loan account balances
        const loanAccount = await tx.loanAccount.findUnique({
          where: { id: payment.loanAccountId },
        })

        if (loanAccount) {
          await tx.loanAccount.update({
            where: { id: payment.loanAccountId },
            data: {
              currentBalance: loanAccount.currentBalance - payment.principalAmount,
              totalPaid: loanAccount.totalPaid + payment.amount,
              totalInterestPaid: loanAccount.totalInterestPaid + payment.interestAmount,
              principalPaid: loanAccount.principalPaid + payment.principalAmount,
            },
          })

          // Update next payment date
          const nextPaymentDate = new Date(loanAccount.nextPaymentDate || new Date())
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1)

          await tx.loanAccount.update({
            where: { id: payment.loanAccountId },
            data: { nextPaymentDate },
          })
        }

        return payment
      })

      // Create notification
      await prisma.notification.create({
        data: {
          userId: payment.loanAccount.application.borrowerId,
          type: NotificationType.PAYMENT_RECEIVED,
          title: 'Payment Confirmed',
          message: `Your payment of $${payment.amount} for loan ${payment.loanAccount.application.applicationNumber} has been confirmed.`,
          metadata: { paymentId: payment.id },
        },
      })
    } else if (action === 'mark_late') {
      // Mark payment as late
      if (!['LOAN_OFFICER', 'ADMIN', 'MANAGER'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      updatedPayment = await prisma.payment.update({
        where: { id: params.id },
        data: {
          status: PaymentStatus.LATE,
        },
      })

      // Create notification
      await prisma.notification.create({
        data: {
          userId: payment.loanAccount.application.borrowerId,
          type: NotificationType.PAYMENT_OVERDUE,
          title: 'Payment Overdue',
          message: `Your payment of $${payment.amount} for loan ${payment.loanAccount.application.applicationNumber} is overdue.`,
          metadata: { paymentId: payment.id },
        },
      })
    } else {
      // General update
      if (
        session.user.role === 'MEMBER' &&
        payment.loanAccount.application.borrowerId !== session.user.id
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      updatedPayment = await prisma.payment.update({
        where: { id: params.id },
        data: updateData,
      })
    }

    return NextResponse.json(updatedPayment)
  } catch (error) {
    console.error('Error updating payment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: {
        loanAccount: {
          include: {
            application: {
              select: { borrowerId: true },
            },
          },
        },
      },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Only allow deletion of pending payments
    if (payment.status !== PaymentStatus.PENDING) {
      return NextResponse.json(
        { error: 'Cannot delete processed payments' },
        { status: 400 }
      )
    }

    // Check permissions
    if (
      session.user.role === 'MEMBER' &&
      payment.loanAccount.application.borrowerId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.payment.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Payment deleted successfully' })
  } catch (error) {
    console.error('Error deleting payment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}