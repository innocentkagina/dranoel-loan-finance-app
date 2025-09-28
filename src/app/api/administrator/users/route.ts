import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMINISTRATOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''
    const isActive = searchParams.get('isActive')

    const skip = (page - 1) * limit

    // Build filter conditions
    const conditions: any[] = []

    // Search filter
    if (search) {
      conditions.push({
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      })
    }

    // Role filter - handle null values properly
    if (role) {
      if (role === 'NO_ROLE') {
        conditions.push({ role: null })
      } else {
        conditions.push({ role: role as any })
      }
    }

    // Status filter
    if (status) {
      conditions.push({ status: status as any })
    }

    // Active/Inactive filter
    if (isActive !== null && isActive !== '') {
      conditions.push({ isActive: isActive === 'true' })
    }

    const where = conditions.length > 0 ? { AND: conditions } : {}

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          isActive: true,
          mustChangePassword: true,
          approvedAt: true,
          approvedBy: true,
          createdAt: true,
          lastLogin: true,
          _count: {
            select: {
              loanApplications: true,
              payments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ])

    // Log this action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'VIEW_USERS',
        entityType: 'USER',
        entityId: 'ALL',
        newValues: { page, limit, search, role },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
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
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      address,
      role = 'MEMBER',
      dateOfBirth,
      nationalId,
      employmentStatus,
      monthlyIncome,
      creditScore
    } = body

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user following the new workflow (PENDING status, no role initially)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        address,
        role: null, // No role assigned initially
        status: 'PENDING', // Requires admin approval
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        nationalId,
        employmentStatus,
        monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : null,
        creditScore: creditScore ? parseInt(creditScore) : null,
        isActive: false, // Not active until approved
        mustChangePassword: true // Must change password on first login
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true
      }
    })

    // Log this action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_USER',
        entityType: 'USER',
        entityId: user.id,
        newValues: { email, firstName, lastName, status: 'PENDING' },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({ user }, { status: 201 })

  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}