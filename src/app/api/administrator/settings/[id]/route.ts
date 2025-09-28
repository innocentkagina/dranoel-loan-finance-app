import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMINISTRATOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { value, description } = body

    if (value === undefined) {
      return NextResponse.json(
        { error: 'Value is required' },
        { status: 400 }
      )
    }

    // Get current setting for audit trail
    const currentSetting = await prisma.systemSettings.findUnique({
      where: { id: params.id }
    })

    if (!currentSetting) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 })
    }

    // Update setting
    const updatedSetting = await prisma.systemSettings.update({
      where: { id: params.id },
      data: {
        value,
        description: description !== undefined ? description : currentSetting.description
      }
    })

    // Log this action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_SETTING',
        entityType: 'SYSTEM_SETTINGS',
        entityId: params.id,
        oldValues: {
          key: currentSetting.key,
          value: currentSetting.value,
          description: currentSetting.description
        },
        newValues: {
          key: updatedSetting.key,
          value: updatedSetting.value,
          description: updatedSetting.description
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      setting: {
        id: updatedSetting.id,
        key: updatedSetting.key,
        value: updatedSetting.value,
        description: updatedSetting.description || '',
        updatedAt: updatedSetting.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Error updating setting:', error)
    return NextResponse.json(
      { error: 'Failed to update setting' },
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

    if (!session?.user || session.user.role !== 'ADMINISTRATOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get setting data for audit trail
    const setting = await prisma.systemSettings.findUnique({
      where: { id: params.id }
    })

    if (!setting) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 })
    }

    // Delete setting
    await prisma.systemSettings.delete({
      where: { id: params.id }
    })

    // Log this action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_SETTING',
        entityType: 'SYSTEM_SETTINGS',
        entityId: params.id,
        oldValues: {
          key: setting.key,
          value: setting.value,
          description: setting.description
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({ message: 'Setting deleted successfully' })

  } catch (error) {
    console.error('Error deleting setting:', error)
    return NextResponse.json(
      { error: 'Failed to delete setting' },
      { status: 500 }
    )
  }
}