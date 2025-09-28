import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        dateOfBirth: true,
        nationalId: true,
        role: true,
        employmentStatus: true,
        monthlyIncome: true,
        creditScore: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      firstName,
      lastName,
      phone,
      address,
      dateOfBirth,
      nationalId,
      employmentStatus,
      monthlyIncome,
    } = body

    // Basic validation
    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 })
    }

    const updateData: any = {
      firstName,
      lastName,
      phone: phone || null,
      address: address || null,
      nationalId: nationalId || null,
      employmentStatus: employmentStatus || null,
      updatedAt: new Date(),
    }

    // Only update dateOfBirth if provided
    if (dateOfBirth) {
      updateData.dateOfBirth = new Date(dateOfBirth)
    }

    // Only update monthlyIncome if provided and user is a member
    if (monthlyIncome !== undefined && session.user.role === 'MEMBER') {
      updateData.monthlyIncome = parseFloat(monthlyIncome)
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        dateOfBirth: true,
        nationalId: true,
        role: true,
        employmentStatus: true,
        monthlyIncome: true,
        creditScore: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}