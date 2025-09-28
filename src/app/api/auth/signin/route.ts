import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        {
          error: 'MISSING_CREDENTIALS',
          message: 'Email and password are required'
        },
        { status: 400 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        isActive: true,
        mustChangePassword: true
      }
    })

    if (!user) {
      return NextResponse.json(
        {
          error: 'USER_NOT_FOUND',
          message: 'No account found with this email address'
        },
        { status: 404 }
      )
    }

    // Check password first
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          error: 'INVALID_CREDENTIALS',
          message: 'Incorrect email or password'
        },
        { status: 401 }
      )
    }

    // Check account status
    if (!user.isActive) {
      return NextResponse.json(
        {
          error: 'ACCOUNT_INACTIVE',
          message: 'Your account has been deactivated. Please contact support for assistance.'
        },
        { status: 403 }
      )
    }

    if (user.status === UserStatus.PENDING) {
      return NextResponse.json(
        {
          error: 'ACCOUNT_PENDING_APPROVAL',
          message: 'Your account is pending administrator approval. You will receive an email notification once your account is approved.'
        },
        { status: 403 }
      )
    }

    if (user.status === UserStatus.SUSPENDED) {
      return NextResponse.json(
        {
          error: 'ACCOUNT_SUSPENDED',
          message: 'Your account has been suspended. Please contact support to resolve this issue.'
        },
        { status: 403 }
      )
    }

    if (user.status === UserStatus.INACTIVE) {
      return NextResponse.json(
        {
          error: 'ACCOUNT_INACTIVE',
          message: 'Your account is currently inactive. Please contact support for assistance.'
        },
        { status: 403 }
      )
    }

    if (!user.role) {
      return NextResponse.json(
        {
          error: 'NO_ROLE_ASSIGNED',
          message: 'Your account does not have a role assigned. Please contact an administrator.'
        },
        { status: 403 }
      )
    }

    // If we reach here, the user is valid for login
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        mustChangePassword: user.mustChangePassword
      }
    })

  } catch (error) {
    console.error('Sign-in check error:', error)
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred. Please try again later.'
      },
      { status: 500 }
    )
  }
}