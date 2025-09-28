import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Users can only view their own profile unless they're staff
    if (
      session.user.id !== params.id &&
      !['LOAN_OFFICER', 'UNDERWRITER', 'ADMIN', 'MANAGER'].includes(session.user.role)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        dateOfBirth: true,
        ssn: session.user.role !== 'MEMBER' ? true : false, // Only show SSN to staff
        role: true,
        employmentStatus: true,
        monthlyIncome: true,
        creditScore: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            loanApplications: true,
            payments: true,
            notifications: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
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
    const { password, ...updateData } = body

    // Users can only update their own profile unless they're staff
    if (
      session.user.id !== params.id &&
      !['ADMIN', 'MANAGER'].includes(session.user.role)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prepare update data
    const dataToUpdate: any = {}

    // Regular users can only update certain fields
    if (session.user.id === params.id && session.user.role === 'MEMBER') {
      const allowedFields = [
        'firstName',
        'lastName',
        'phone',
        'address',
        'employmentStatus',
        'monthlyIncome',
      ]

      Object.keys(updateData).forEach((key) => {
        if (allowedFields.includes(key)) {
          dataToUpdate[key] = updateData[key]
        }
      })
    } else {
      // Staff can update more fields
      const allowedFields = [
        'firstName',
        'lastName',
        'phone',
        'address',
        'dateOfBirth',
        'role',
        'employmentStatus',
        'monthlyIncome',
        'creditScore',
        'isActive',
      ]

      Object.keys(updateData).forEach((key) => {
        if (allowedFields.includes(key)) {
          dataToUpdate[key] = updateData[key]
        }
      })
    }

    // Handle password update
    if (password) {
      if (session.user.id !== params.id && session.user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Cannot change another user\'s password' },
          { status: 403 }
        )
      }

      dataToUpdate.password = await bcrypt.hash(password, 12)
    }

    // Handle type conversions
    if (dataToUpdate.monthlyIncome) {
      dataToUpdate.monthlyIncome = parseFloat(dataToUpdate.monthlyIncome)
    }

    if (dataToUpdate.creditScore) {
      dataToUpdate.creditScore = parseInt(dataToUpdate.creditScore)
    }

    if (dataToUpdate.dateOfBirth) {
      dataToUpdate.dateOfBirth = new Date(dataToUpdate.dateOfBirth)
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        dateOfBirth: true,
        role: true,
        employmentStatus: true,
        monthlyIncome: true,
        creditScore: true,
        isActive: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user:', error)
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

    // Only admins can delete users
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            loanApplications: true,
            payments: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent deletion if user has active loans or applications
    if (user._count.loanApplications > 0 || user._count.payments > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete user with existing loan applications or payments. Deactivate instead.',
        },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}