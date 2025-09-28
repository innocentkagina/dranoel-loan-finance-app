import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only loan officers and admin can view member statements
    if (!['LOANS_OFFICER', 'ADMINISTRATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const where: any = {
      role: 'MEMBER', // Only show members
    }

    if (status && status !== 'ALL') {
      if (status === 'ACTIVE') {
        where.isActive = true
      } else if (status === 'INACTIVE') {
        where.isActive = false
      }
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [members, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          createdAt: true,
          isActive: true,
          lastLogin: true,
          loanApplications: {
            select: {
              loanAccount: {
                select: {
                  currentBalance: true,
                  totalPaid: true,
                  isActive: true,
                },
              },
            },
          },
          payments: {
            select: {
              amount: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    // Transform data to include calculated balances
    const transformedMembers = members.map((member) => {
      // Calculate loan balance from active loan accounts
      const loanBalance = member.loanApplications.reduce((total, app) => {
        if (app.loanAccount && app.loanAccount.isActive) {
          return total + app.loanAccount.currentBalance
        }
        return total
      }, 0)

      // Calculate total savings from payments (simplified - in real app would be separate savings table)
      const totalPaid = member.loanApplications.reduce((total, app) => {
        if (app.loanAccount) {
          return total + app.loanAccount.totalPaid
        }
        return total
      }, 0)

      // For demonstration, we'll use a percentage of total paid as "savings balance"
      const savingsBalance = Math.max(0, totalPaid * 0.1) // 10% of total paid as savings

      // Mock share value (in real app, this would come from a shares table)
      const shareValue = Math.max(0, totalPaid * 0.05) // 5% of total paid as share value

      // Generate membership number
      const membershipNumber = `MBR-${member.id.slice(-6).toUpperCase()}-2024`

      return {
        id: member.id,
        membershipNumber,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phoneNumber: member.phone || 'Not provided',
        joinDate: member.createdAt.toISOString().split('T')[0],
        status: member.isActive ? 'ACTIVE' : 'INACTIVE',
        savingsBalance: Math.round(savingsBalance),
        loanBalance: Math.round(loanBalance),
        shareValue: Math.round(shareValue),
        lastActivity: member.lastLogin?.toISOString().split('T')[0] || member.createdAt.toISOString().split('T')[0],
      }
    })

    return NextResponse.json({
      members: transformedMembers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })

  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}