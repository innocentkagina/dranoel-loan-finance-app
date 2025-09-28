import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get loan accounts for the user
    const loanAccounts = await prisma.loanAccount.findMany({
      where: {
        application: {
          borrowerId: session.user.id
        }
      },
      include: {
        application: {
          select: {
            loanType: true,
            borrower: {
              select: {
                firstName: true,
                lastName: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(loanAccounts)

  } catch (error) {
    console.error('Error fetching loan accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch loan accounts' },
      { status: 500 }
    )
  }
}