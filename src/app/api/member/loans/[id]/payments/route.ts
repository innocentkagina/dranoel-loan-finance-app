import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // First, verify the loan application belongs to the user
    const loanApplication = await prisma.loanApplication.findFirst({
      where: {
        id,
        borrowerId: session.user.id
      },
      include: {
        loanAccount: {
          select: {
            id: true
          }
        }
      }
    })

    if (!loanApplication) {
      return NextResponse.json({ error: 'Loan application not found' }, { status: 404 })
    }

    if (!loanApplication.loanAccount) {
      return NextResponse.json({ error: 'Loan account not found' }, { status: 404 })
    }

    // Get payments for this loan account
    const payments = await prisma.payment.findMany({
      where: {
        loanAccountId: loanApplication.loanAccount.id
      },
      orderBy: {
        scheduledDate: 'asc'
      }
    })

    // Create audit log for viewing loan payments
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'VIEW_LOAN_PAYMENTS',
        entityType: 'PAYMENT',
        entityId: loanApplication.loanAccount.id,
        newValues: {
          loanApplicationId: id,
          paymentCount: payments.length
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json(payments)

  } catch (error) {
    console.error('Error fetching loan payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch loan payments' },
      { status: 500 }
    )
  }
}