import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LoanType } from '@prisma/client'
import { evaluateLoanApplication, LoanEvaluationCriteria } from '@/lib/loan-evaluation'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      requestedAmount,
      loanType,
      termMonths,
      monthlyIncome,
      employmentStatus,
      borrowerId
    } = body

    // Validate required fields
    if (!requestedAmount || !loanType || !termMonths) {
      return NextResponse.json(
        { error: 'Missing required fields: requestedAmount, loanType, termMonths' },
        { status: 400 }
      )
    }

    // Determine which user to evaluate (for officers/admins evaluating others)
    const targetUserId = borrowerId || session.user.id

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        savingsAccount: {
          include: {
            transactions: {
              where: {
                type: 'INTEREST_CREDIT'
              }
            }
          }
        },
        loanApplications: {
          where: {
            status: { in: ['ACTIVE', 'APPROVED'] }
          },
          include: {
            loanAccount: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Calculate savings metrics
    const savingsBalance = user.savingsAccount?.balance || 0
    const totalInterestEarned = user.savingsAccount?.totalInterestEarned || 0
    const savingsAccountAge = user.savingsAccount?.openedAt
      ? Math.floor((new Date().getTime() - new Date(user.savingsAccount.openedAt).getTime()) / (1000 * 60 * 60 * 24 * 30))
      : 0

    // Calculate existing debt
    const activeLoans = user.loanApplications.filter(app =>
      app.loanAccount && app.loanAccount.isActive
    )
    const totalActiveDebt = activeLoans.reduce((sum, loan) =>
      sum + (loan.loanAccount?.monthlyPayment || 0), 0
    )

    // Prepare evaluation criteria
    const evaluationCriteria: LoanEvaluationCriteria = {
      requestedAmount: parseFloat(requestedAmount),
      monthlyIncome: monthlyIncome || user.monthlyIncome || 0,
      creditScore: user.creditScore || 600, // Default if not available
      loanType: loanType as LoanType,
      termMonths: parseInt(termMonths),
      savingsBalance,
      totalInterestEarned,
      savingsAccountAge,
      employmentStatus: employmentStatus || user.employmentStatus || 'UNKNOWN',
      existingLoanCount: activeLoans.length,
      totalActiveDebt
    }

    // Perform evaluation
    const evaluationResult = evaluateLoanApplication(evaluationCriteria)

    // Create audit log for evaluation
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'EVALUATE_LOAN_APPLICATION',
        entityType: 'LOAN_EVALUATION',
        entityId: targetUserId,
        newValues: {
          requestedAmount: evaluationCriteria.requestedAmount,
          loanType: evaluationCriteria.loanType,
          termMonths: evaluationCriteria.termMonths,
          riskScore: evaluationResult.riskScore,
          isEligible: evaluationResult.isEligible,
          recommendedAmount: evaluationResult.recommendedAmount,
          recommendedInterestRate: evaluationResult.recommendedInterestRate,
          savingsBalance: evaluationCriteria.savingsBalance,
          savingsRatio: evaluationResult.savingsImpact.savingsRatio,
          evaluatedBy: session.user.email,
          targetUserEmail: user.email
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    // Return evaluation result with additional context
    return NextResponse.json({
      success: true,
      evaluation: evaluationResult,
      userContext: {
        userId: targetUserId,
        userName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        savingsAccount: user.savingsAccount ? {
          accountNumber: user.savingsAccount.accountNumber,
          balance: user.savingsAccount.balance,
          interestRate: user.savingsAccount.interestRate,
          accountAge: savingsAccountAge
        } : null,
        existingLoans: activeLoans.length,
        totalMonthlyDebt: totalActiveDebt
      },
      evaluationCriteria
    })

  } catch (error) {
    console.error('Error evaluating loan application:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}