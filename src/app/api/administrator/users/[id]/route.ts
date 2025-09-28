import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserStatus } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMINISTRATOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        loanApplications: {
          select: {
            id: true,
            applicationNumber: true,
            loanType: true,
            requestedAmount: true,
            status: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            paymentMethod: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        _count: {
          select: {
            loanApplications: true,
            payments: true,
            notifications: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Log this action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'VIEW_USER_DETAILS',
        entityType: 'USER',
        entityId: id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({ user })

  } catch (error) {
    console.error('Error fetching user details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMINISTRATOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      firstName,
      lastName,
      phone,
      address,
      role,
      status,
      isActive,
      mustChangePassword,
      employmentStatus,
      monthlyIncome,
      creditScore,
      action // Special action field for approve/reject
    } = body

    // Get current user data for audit trail
    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: {
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        employmentStatus: true,
        monthlyIncome: true,
        creditScore: true
      }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {
      firstName,
      lastName,
      phone,
      address,
      employmentStatus,
      monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : null,
      creditScore: creditScore ? parseInt(creditScore) : null
    }

    // Handle special actions
    if (action === 'approve') {
      if (!role) {
        return NextResponse.json({ error: 'Role is required when approving user' }, { status: 400 })
      }
      updateData.role = role
      updateData.status = UserStatus.ACTIVE
      updateData.isActive = true
      updateData.approvedAt = new Date()
      updateData.approvedBy = session.user.id
    } else if (action === 'reject') {
      updateData.status = UserStatus.INACTIVE
      updateData.isActive = false
    } else {
      // Regular update
      if (role !== undefined) updateData.role = role === '' ? null : role
      if (status !== undefined) updateData.status = status
      if (isActive !== undefined) updateData.isActive = isActive
      if (mustChangePassword !== undefined) updateData.mustChangePassword = mustChangePassword
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        role: true,
        status: true,
        isActive: true,
        mustChangePassword: true,
        approvedAt: true,
        approvedBy: true,
        employmentStatus: true,
        monthlyIncome: true,
        creditScore: true,
        updatedAt: true
      }
    })

    // Log this action with specific audit action based on the action type
    let auditAction = 'UPDATE_USER'
    if (action === 'approve') {
      auditAction = 'APPROVE_USER'
    } else if (action === 'reject') {
      auditAction = 'REJECT_USER'
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: auditAction,
        entityType: 'USER',
        entityId: id,
        oldValues: currentUser,
        newValues: {
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          phone: updatedUser.phone,
          address: updatedUser.address,
          role: updatedUser.role,
          status: updatedUser.status,
          isActive: updatedUser.isActive,
          mustChangePassword: updatedUser.mustChangePassword,
          employmentStatus: updatedUser.employmentStatus,
          monthlyIncome: updatedUser.monthlyIncome,
          creditScore: updatedUser.creditScore,
          email: updatedUser.email
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({ user: updatedUser })

  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMINISTRATOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    // Prevent admin from deleting themselves
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Get user data for audit trail
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        role: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has active loans
    const activeLoans = await prisma.loanAccount.count({
      where: {
        application: {
          borrowerId: id
        },
        isActive: true
      }
    })

    if (activeLoans > 0) {
      return NextResponse.json(
        { error: 'Cannot delete user with active loans' },
        { status: 400 }
      )
    }

    // Instead of hard delete, deactivate the user
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    })

    // Log this action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DEACTIVATE_USER',
        entityType: 'USER',
        entityId: id,
        oldValues: user,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({ message: 'User deactivated successfully' })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}