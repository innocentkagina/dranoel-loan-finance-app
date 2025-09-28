import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAllDefaultInterestRates, updateDefaultInterestRate } from '@/lib/interest-rates'
import { LoanType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMINISTRATOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rates = await getAllDefaultInterestRates()

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'VIEW_INTEREST_RATES',
        entityType: 'SYSTEM_SETTINGS',
        entityId: 'INTEREST_RATES',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({ rates })

  } catch (error) {
    console.error('Error fetching interest rates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch interest rates' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMINISTRATOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { loanType, rate } = body

    if (!loanType || rate === undefined || rate < 0) {
      return NextResponse.json(
        { error: 'Valid loan type and rate are required' },
        { status: 400 }
      )
    }

    // Validate loan type
    if (!Object.values(LoanType).includes(loanType)) {
      return NextResponse.json(
        { error: 'Invalid loan type' },
        { status: 400 }
      )
    }

    const oldRates = await getAllDefaultInterestRates()
    await updateDefaultInterestRate(loanType, parseFloat(rate))
    const newRates = await getAllDefaultInterestRates()

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_INTEREST_RATE',
        entityType: 'SYSTEM_SETTINGS',
        entityId: `LOAN_DEFAULT_INTEREST_RATE_${loanType}`,
        oldValues: { [loanType]: oldRates[loanType as keyof typeof oldRates] },
        newValues: { [loanType]: parseFloat(rate) },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      success: true,
      rates: newRates,
      message: `Interest rate for ${loanType} loans updated successfully`
    })

  } catch (error) {
    console.error('Error updating interest rate:', error)
    return NextResponse.json(
      { error: 'Failed to update interest rate' },
      { status: 500 }
    )
  }
}