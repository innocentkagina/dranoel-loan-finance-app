import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Get total count of loan applications
    const totalCount = await prisma.loanApplication.count({
      where: {
        borrowerId: session.user.id
      }
    })

    // Get loan applications for the user with pagination
    const loanApplications = await prisma.loanApplication.findMany({
      where: {
        borrowerId: session.user.id
      },
      include: {
        borrower: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        loanAccount: {
          select: {
            id: true,
            accountNumber: true,
            currentBalance: true,
            monthlyPayment: true,
            nextPaymentDate: true,
            interestRate: true,
            status: true,
            totalPaid: true,
            principalPaid: true,
            totalInterestPaid: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    // Create audit log for viewing loans
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'VIEW_LOANS',
        entityType: 'LOAN_APPLICATION',
        entityId: 'ALL',
        newValues: { page, limit, totalCount },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      loans: loanApplications,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      limit
    })

  } catch (error) {
    console.error('Error fetching loan applications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch loan applications' },
      { status: 500 }
    )
  }
}