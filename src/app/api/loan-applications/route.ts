import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient, LoanType, LoanStatus } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const where: any = {}

    // Filter by role
    if (session.user.role === 'MEMBER') {
      where.borrowerId = session.user.id
    }

    if (status) {
      where.status = status as LoanStatus
    }

    if (type) {
      where.loanType = type as LoanType
    }

    const [applications, total] = await Promise.all([
      prisma.loanApplication.findMany({
        where,
        include: {
          borrower: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              creditScore: true,
            },
          },
          assignedOfficer: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          documents: {
            select: {
              id: true,
              type: true,
              fileName: true,
              isVerified: true,
            },
          },
          _count: {
            select: {
              documents: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.loanApplication.count({ where }),
    ])

    return NextResponse.json({
      applications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching loan applications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      dateOfBirth,
      nationalId,
      employmentStatus,
      employerName,
      jobTitle,
      monthlyIncome,
      employmentLength,
      loanType,
      requestedAmount,
      purpose,
      termMonths,
      assets,
      liabilities,
      monthlyExpenses,
      creditScore,
      collateralValue,
      downPayment,
      evaluationData, // New field for savings-integrated evaluation
    } = body

    // Generate application number
    const applicationNumber = `LN${Date.now()}${Math.floor(Math.random() * 1000)}`

    // Create loan application
    const application = await prisma.loanApplication.create({
      data: {
        applicationNumber,
        borrowerId: session.user.id,
        loanType,
        requestedAmount: parseFloat(requestedAmount),
        termMonths: parseInt(termMonths),
        purpose,
        status: 'SUBMITTED',

        // Personal Information
        personalInfo: {
          firstName,
          lastName,
          email,
          phone,
          address,
          dateOfBirth,
          nationalId,
        },

        // Employment Information
        employmentInfo: {
          employmentStatus,
          employerName,
          jobTitle,
          monthlyIncome: parseFloat(monthlyIncome || '0'),
          employmentLength: parseFloat(employmentLength || '0'),
        },

        // Financial Information
        financialInfo: {
          assets: parseFloat(assets || '0'),
          liabilities: parseFloat(liabilities || '0'),
          monthlyExpenses: parseFloat(monthlyExpenses || '0'),
          creditScore: parseInt(creditScore || '0'),
          // Include savings evaluation data if provided
          ...(evaluationData && {
            savingsEvaluation: {
              riskScore: evaluationData.riskScore,
              recommendedAmount: evaluationData.recommendedAmount,
              recommendedInterestRate: evaluationData.recommendedInterestRate,
              savingsRatio: evaluationData.savingsRatio,
              meetsSavingsRequirement: evaluationData.meetsSavingsRequirement,
              evaluatedAt: new Date().toISOString()
            }
          })
        },

        collateralValue: collateralValue ? parseFloat(collateralValue) : null,
        downPayment: downPayment ? parseFloat(downPayment) : null,

        submittedAt: new Date(),
      },
    })

    // Create a notification for the user
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: 'APPLICATION_SUBMITTED',
        title: 'Loan Application Submitted',
        message: `Your ${loanType.toLowerCase()} loan application for ${parseFloat(requestedAmount).toLocaleString('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0, maximumFractionDigits: 0 })} has been submitted successfully. Application number: ${applicationNumber}`,
        metadata: {
          applicationId: application.id,
          applicationNumber,
          amount: parseFloat(requestedAmount),
          loanType,
        },
      },
    })

    // Create notifications for loans officers (if any exist)
    const loansOfficers = await prisma.user.findMany({
      where: { role: 'LOANS_OFFICER', isActive: true },
      select: { id: true },
    })

    for (const officer of loansOfficers) {
      await prisma.notification.create({
        data: {
          userId: officer.id,
          senderId: session.user.id,
          type: 'APPLICATION_SUBMITTED',
          title: 'New Loan Application',
          message: `A new ${loanType.toLowerCase()} loan application has been submitted for ${parseFloat(requestedAmount).toLocaleString('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0, maximumFractionDigits: 0 })}. Application: ${applicationNumber}`,
          metadata: {
            applicationId: application.id,
            applicationNumber,
            amount: parseFloat(requestedAmount),
            loanType,
            borrowerId: session.user.id,
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        applicationNumber,
        status: application.status,
      },
    })
  } catch (error) {
    console.error('Error creating loan application:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}