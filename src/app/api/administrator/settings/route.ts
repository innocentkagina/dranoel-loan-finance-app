import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMINISTRATOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const where = category ? { key: { contains: category } } : {}

    const settings = await prisma.systemSettings.findMany({
      where,
      orderBy: { key: 'asc' }
    })

    // Transform the settings to match the frontend interface
    const transformedSettings = settings.map(setting => ({
      id: setting.id,
      key: setting.key,
      value: setting.value,
      description: setting.description || '',
      category: getCategoryFromKey(setting.key),
      dataType: getDataTypeFromValue(setting.value),
      isEditable: true,
      updatedAt: setting.updatedAt.toISOString()
    }))

    // Log this action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'VIEW_SETTINGS',
        entityType: 'SYSTEM_SETTINGS',
        entityId: 'ALL',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({ settings: transformedSettings })

  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMINISTRATOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { key, value, description } = body

    if (!key || !value) {
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      )
    }

    // Check if setting already exists
    const existingSetting = await prisma.systemSettings.findUnique({
      where: { key }
    })

    if (existingSetting) {
      return NextResponse.json(
        { error: 'Setting with this key already exists' },
        { status: 400 }
      )
    }

    // Create new setting
    const setting = await prisma.systemSettings.create({
      data: {
        key,
        value,
        description
      }
    })

    // Log this action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_SETTING',
        entityType: 'SYSTEM_SETTINGS',
        entityId: setting.id,
        newValues: { key, value, description },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      setting: {
        id: setting.id,
        key: setting.key,
        value: setting.value,
        description: setting.description || '',
        category: getCategoryFromKey(setting.key),
        dataType: getDataTypeFromValue(setting.value),
        isEditable: true,
        updatedAt: setting.updatedAt.toISOString()
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating setting:', error)
    return NextResponse.json(
      { error: 'Failed to create setting' },
      { status: 500 }
    )
  }
}

// Helper function to determine category from key
function getCategoryFromKey(key: string): string {
  const keyUpper = key.toUpperCase()

  if (keyUpper.includes('SECURITY') || keyUpper.includes('LOGIN') || keyUpper.includes('SESSION') || keyUpper.includes('PASSWORD')) {
    return 'SECURITY'
  } else if (keyUpper.includes('EMAIL') || keyUpper.includes('NOTIFICATION') || keyUpper.includes('SMS')) {
    return 'NOTIFICATIONS'
  } else if (keyUpper.includes('LOAN') || keyUpper.includes('INTEREST') || keyUpper.includes('CREDIT')) {
    return 'LOAN'
  } else if (keyUpper.includes('PAYMENT') || keyUpper.includes('GRACE')) {
    return 'PAYMENT'
  } else if (keyUpper.includes('BACKUP') || keyUpper.includes('DATABASE') || keyUpper.includes('SYSTEM')) {
    return 'SYSTEM'
  } else {
    return 'GENERAL'
  }
}

// Helper function to determine data type from value
function getDataTypeFromValue(value: string): 'string' | 'number' | 'boolean' | 'json' {
  if (value === 'true' || value === 'false') {
    return 'boolean'
  } else if (!isNaN(Number(value))) {
    return 'number'
  } else if (value.startsWith('{') || value.startsWith('[')) {
    return 'json'
  } else {
    return 'string'
  }
}