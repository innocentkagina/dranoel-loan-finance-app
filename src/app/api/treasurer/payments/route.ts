import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'TREASURER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all payments with related data
    const payments = await prisma.payment.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        loanAccount: {
          include: {
            application: {
              select: {
                loanType: true,
                applicationNumber: true
              }
            }
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // Pending first
        { createdAt: 'desc' }
      ],
      take: 100
    })

    // Transform payments to match frontend interface
    const transformedPayments = payments.map(payment => {
      // Calculate due date (simplified - would be more complex in real system)
      const dueDate = payment.scheduledDate || new Date(payment.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)

      return {
        id: payment.id,
        memberName: `${payment.user.firstName} ${payment.user.lastName}`,
        memberId: payment.user.id,
        loanType: payment.loanAccount.application.loanType,
        loanNumber: payment.loanAccount.application.applicationNumber,
        amount: payment.amount,
        principalAmount: payment.principalAmount,
        interestAmount: payment.interestAmount,
        dueDate: dueDate.toISOString(),
        requestDate: payment.createdAt.toISOString(),
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        transactionId: payment.transactionId,
        notes: payment.notes
      }
    })

    // Calculate summary statistics
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const summary = {
      totalPending: transformedPayments.filter(p => p.status === 'PENDING').length,
      totalApproved: transformedPayments.filter(p =>
        (p.status === 'PAID' || p.status === 'APPROVED') &&
        new Date(p.requestDate) >= currentMonth
      ).length,
      totalRejected: transformedPayments.filter(p =>
        p.status === 'REJECTED' &&
        new Date(p.requestDate) >= currentMonth
      ).length,
      totalAmount: transformedPayments
        .filter(p => p.status === 'PAID' && new Date(p.requestDate) >= today)
        .reduce((sum, p) => sum + p.amount, 0),
      overdueCount: transformedPayments.filter(p =>
        p.status === 'PENDING' && new Date(p.dueDate) < new Date()
      ).length
    }

    return NextResponse.json({
      payments: transformedPayments,
      summary
    })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}