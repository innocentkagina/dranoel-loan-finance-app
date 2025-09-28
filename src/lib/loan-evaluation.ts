import { LoanType } from '@prisma/client'

export interface LoanEvaluationCriteria {
  requestedAmount: number
  monthlyIncome: number
  creditScore: number
  loanType: LoanType
  termMonths: number
  savingsBalance: number
  totalInterestEarned: number
  savingsAccountAge: number // in months
  employmentStatus: string
  existingLoanCount: number
  totalActiveDebt: number
}

export interface LoanEvaluationResult {
  isEligible: boolean
  riskScore: number // 1-100 (lower is better)
  recommendedAmount: number
  recommendedInterestRate: number
  savingsImpact: {
    savingsRatio: number // savings as percentage of requested amount
    savingsBonus: number // additional points for good savings
    minimumSavingsRequired: number
    meetsSavingsRequirement: boolean
  }
  factors: {
    income: { score: number; weight: number; description: string }
    creditScore: { score: number; weight: number; description: string }
    savings: { score: number; weight: number; description: string }
    employment: { score: number; weight: number; description: string }
    debtRatio: { score: number; weight: number; description: string }
    loanType: { score: number; weight: number; description: string }
  }
  recommendations: string[]
  warnings: string[]
}

export function evaluateLoanApplication(criteria: LoanEvaluationCriteria): LoanEvaluationResult {
  const {
    requestedAmount,
    monthlyIncome,
    creditScore,
    loanType,
    termMonths,
    savingsBalance,
    totalInterestEarned,
    savingsAccountAge,
    employmentStatus,
    existingLoanCount,
    totalActiveDebt
  } = criteria

  // Calculate various ratios and metrics
  const monthlyPaymentEstimate = calculateMonthlyPayment(requestedAmount, getBaseLoanRate(loanType), termMonths)
  const debtToIncomeRatio = ((totalActiveDebt + monthlyPaymentEstimate) / monthlyIncome) * 100
  const savingsRatio = (savingsBalance / requestedAmount) * 100
  const minimumSavingsRequired = getMinimumSavingsRequirement(loanType, requestedAmount)

  // Evaluate each factor
  const factors = {
    income: evaluateIncome(monthlyIncome, monthlyPaymentEstimate),
    creditScore: evaluateCreditScore(creditScore),
    savings: evaluateSavings(savingsBalance, requestedAmount, totalInterestEarned, savingsAccountAge),
    employment: evaluateEmployment(employmentStatus),
    debtRatio: evaluateDebtRatio(debtToIncomeRatio),
    loanType: evaluateLoanType(loanType, requestedAmount)
  }

  // Calculate weighted risk score
  const totalWeight = Object.values(factors).reduce((sum, factor) => sum + factor.weight, 0)
  const weightedScore = Object.values(factors).reduce((sum, factor) => sum + (factor.score * factor.weight), 0)
  const riskScore = Math.round(100 - (weightedScore / totalWeight))

  // Determine eligibility
  const isEligible = riskScore <= 70 && // Risk score threshold
                    debtToIncomeRatio <= 40 && // Debt-to-income ratio
                    savingsBalance >= minimumSavingsRequired && // Minimum savings
                    creditScore >= getMinimumCreditScore(loanType)

  // Calculate recommendations
  const recommendedAmount = calculateRecommendedAmount(requestedAmount, riskScore, savingsRatio)
  const baseRate = getBaseLoanRate(loanType)
  const savingsDiscount = calculateSavingsDiscount(savingsRatio, totalInterestEarned, savingsAccountAge)
  const riskAdjustment = calculateRiskAdjustment(riskScore)
  const recommendedInterestRate = Math.max(baseRate + riskAdjustment - savingsDiscount, baseRate * 0.7) // Min 70% of base rate

  // Generate recommendations and warnings
  const recommendations = generateRecommendations(criteria, factors, riskScore)
  const warnings = generateWarnings(criteria, factors, riskScore)

  return {
    isEligible,
    riskScore,
    recommendedAmount,
    recommendedInterestRate: Math.round(recommendedInterestRate * 100) / 100,
    savingsImpact: {
      savingsRatio,
      savingsBonus: factors.savings.score - 50, // Bonus points above neutral (50)
      minimumSavingsRequired,
      meetsSavingsRequirement: savingsBalance >= minimumSavingsRequired
    },
    factors,
    recommendations,
    warnings
  }
}

function evaluateIncome(monthlyIncome: number, monthlyPayment: number): { score: number; weight: number; description: string } {
  const incomeToPaymentRatio = monthlyIncome / monthlyPayment
  let score = 0
  let description = ''

  if (incomeToPaymentRatio >= 5) {
    score = 90
    description = 'Excellent income relative to payment'
  } else if (incomeToPaymentRatio >= 4) {
    score = 80
    description = 'Very good income relative to payment'
  } else if (incomeToPaymentRatio >= 3) {
    score = 70
    description = 'Good income relative to payment'
  } else if (incomeToPaymentRatio >= 2.5) {
    score = 60
    description = 'Adequate income relative to payment'
  } else {
    score = 30
    description = 'Low income relative to payment requirement'
  }

  return { score, weight: 25, description }
}

function evaluateCreditScore(creditScore: number): { score: number; weight: number; description: string } {
  let score = 0
  let description = ''

  if (creditScore >= 800) {
    score = 95
    description = 'Excellent credit history'
  } else if (creditScore >= 750) {
    score = 85
    description = 'Very good credit history'
  } else if (creditScore >= 700) {
    score = 75
    description = 'Good credit history'
  } else if (creditScore >= 650) {
    score = 60
    description = 'Fair credit history'
  } else if (creditScore >= 600) {
    score = 40
    description = 'Poor credit history'
  } else {
    score = 20
    description = 'Very poor credit history'
  }

  return { score, weight: 20, description }
}

function evaluateSavings(
  savingsBalance: number,
  requestedAmount: number,
  totalInterestEarned: number,
  savingsAccountAge: number
): { score: number; weight: number; description: string } {
  const savingsRatio = (savingsBalance / requestedAmount) * 100
  let score = 50 // Base score
  let description = ''

  // Savings ratio impact (0-40 points)
  if (savingsRatio >= 50) {
    score += 40
    description = 'Excellent savings coverage'
  } else if (savingsRatio >= 30) {
    score += 30
    description = 'Very good savings coverage'
  } else if (savingsRatio >= 20) {
    score += 20
    description = 'Good savings coverage'
  } else if (savingsRatio >= 10) {
    score += 10
    description = 'Adequate savings coverage'
  } else if (savingsRatio >= 5) {
    score += 5
    description = 'Minimal savings coverage'
  } else {
    score -= 10
    description = 'Insufficient savings coverage'
  }

  // Interest earned bonus (0-10 points) - shows savings discipline
  if (totalInterestEarned > 0) {
    const interestRatio = (totalInterestEarned / savingsBalance) * 100
    if (interestRatio >= 2) {
      score += 10
      description += ' with excellent savings growth'
    } else if (interestRatio >= 1) {
      score += 5
      description += ' with good savings growth'
    }
  }

  // Account age bonus (0-10 points) - shows financial stability
  if (savingsAccountAge >= 24) {
    score += 10
    description += ' and long-term financial commitment'
  } else if (savingsAccountAge >= 12) {
    score += 5
    description += ' and established savings habit'
  }

  return { score: Math.min(100, Math.max(0, score)), weight: 25, description }
}

function evaluateEmployment(employmentStatus: string): { score: number; weight: number; description: string } {
  let score = 0
  let description = ''

  switch (employmentStatus?.toUpperCase()) {
    case 'EMPLOYED':
    case 'FULL_TIME':
      score = 85
      description = 'Stable employment status'
      break
    case 'SELF_EMPLOYED':
    case 'FREELANCER':
      score = 70
      description = 'Self-employed with variable income'
      break
    case 'PART_TIME':
      score = 60
      description = 'Part-time employment'
      break
    case 'CONTRACT':
      score = 65
      description = 'Contract-based employment'
      break
    case 'RETIRED':
      score = 75
      description = 'Retired with pension income'
      break
    default:
      score = 30
      description = 'Unclear or unstable employment'
  }

  return { score, weight: 15, description }
}

function evaluateDebtRatio(debtToIncomeRatio: number): { score: number; weight: number; description: string } {
  let score = 0
  let description = ''

  if (debtToIncomeRatio <= 20) {
    score = 90
    description = 'Excellent debt-to-income ratio'
  } else if (debtToIncomeRatio <= 30) {
    score = 75
    description = 'Good debt-to-income ratio'
  } else if (debtToIncomeRatio <= 40) {
    score = 60
    description = 'Acceptable debt-to-income ratio'
  } else if (debtToIncomeRatio <= 50) {
    score = 40
    description = 'High debt-to-income ratio'
  } else {
    score = 20
    description = 'Very high debt-to-income ratio'
  }

  return { score, weight: 10, description }
}

function evaluateLoanType(loanType: LoanType, requestedAmount: number): { score: number; weight: number; description: string } {
  let score = 70 // Base score
  let description = ''

  // Adjust based on loan type risk
  switch (loanType) {
    case LoanType.MORTGAGE:
      score = 85
      description = 'Low-risk secured loan type'
      break
    case LoanType.AUTO:
      score = 80
      description = 'Low-risk asset-backed loan'
      break
    case LoanType.BUSINESS:
      score = 60
      description = 'Medium-risk business loan'
      break
    case LoanType.PERSONAL:
      score = 65
      description = 'Medium-risk personal loan'
      break
    case LoanType.STUDENT:
      score = 75
      description = 'Education investment loan'
      break
    case LoanType.PAYDAY:
      score = 30
      description = 'High-risk short-term loan'
      break
  }

  // Adjust for loan amount
  if (requestedAmount > 50000000) { // > 50M UGX
    score -= 10
    description += ' (large amount)'
  } else if (requestedAmount > 20000000) { // > 20M UGX
    score -= 5
    description += ' (substantial amount)'
  }

  return { score, weight: 5, description }
}

function getMinimumSavingsRequirement(loanType: LoanType, requestedAmount: number): number {
  const baseRequirements = {
    [LoanType.MORTGAGE]: 0.20, // 20% of loan amount
    [LoanType.AUTO]: 0.10, // 10% of loan amount
    [LoanType.BUSINESS]: 0.15, // 15% of loan amount
    [LoanType.PERSONAL]: 0.05, // 5% of loan amount
    [LoanType.STUDENT]: 0.03, // 3% of loan amount
    [LoanType.PAYDAY]: 0.02, // 2% of loan amount
  }

  return requestedAmount * (baseRequirements[loanType] || 0.05)
}

function getMinimumCreditScore(loanType: LoanType): number {
  const minimumScores = {
    [LoanType.MORTGAGE]: 650,
    [LoanType.AUTO]: 600,
    [LoanType.BUSINESS]: 650,
    [LoanType.PERSONAL]: 580,
    [LoanType.STUDENT]: 550,
    [LoanType.PAYDAY]: 500,
  }

  return minimumScores[loanType] || 580
}

function getBaseLoanRate(loanType: LoanType): number {
  const baseRates = {
    [LoanType.MORTGAGE]: 12.0,
    [LoanType.AUTO]: 15.0,
    [LoanType.BUSINESS]: 18.0,
    [LoanType.PERSONAL]: 20.0,
    [LoanType.STUDENT]: 10.0,
    [LoanType.PAYDAY]: 30.0,
  }

  return baseRates[loanType] || 20.0
}

function calculateSavingsDiscount(savingsRatio: number, totalInterestEarned: number, savingsAccountAge: number): number {
  let discount = 0

  // Base savings discount (0-3%)
  if (savingsRatio >= 50) {
    discount += 3.0
  } else if (savingsRatio >= 30) {
    discount += 2.0
  } else if (savingsRatio >= 20) {
    discount += 1.5
  } else if (savingsRatio >= 10) {
    discount += 1.0
  } else if (savingsRatio >= 5) {
    discount += 0.5
  }

  // Interest earned bonus (0-0.5%)
  if (totalInterestEarned > 0) {
    discount += 0.5
  }

  // Account age bonus (0-0.5%)
  if (savingsAccountAge >= 24) {
    discount += 0.5
  } else if (savingsAccountAge >= 12) {
    discount += 0.25
  }

  return discount
}

function calculateRiskAdjustment(riskScore: number): number {
  if (riskScore <= 20) return -1.0  // Excellent risk - discount
  if (riskScore <= 40) return 0     // Good risk - no adjustment
  if (riskScore <= 60) return 1.0   // Medium risk - slight increase
  if (riskScore <= 80) return 2.5   // High risk - increase
  return 5.0                        // Very high risk - significant increase
}

function calculateRecommendedAmount(requestedAmount: number, riskScore: number, savingsRatio: number): number {
  let multiplier = 1.0

  // Adjust based on risk score
  if (riskScore > 70) {
    multiplier = 0.7 // High risk - reduce to 70%
  } else if (riskScore > 50) {
    multiplier = 0.85 // Medium risk - reduce to 85%
  } else if (savingsRatio >= 30) {
    multiplier = 1.1 // Low risk with good savings - can increase by 10%
  }

  return Math.round(requestedAmount * multiplier)
}

function calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  const monthlyRate = annualRate / 100 / 12
  if (monthlyRate === 0) return principal / termMonths

  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
                  (Math.pow(1 + monthlyRate, termMonths) - 1)
  return Math.round(payment * 100) / 100
}

function generateRecommendations(criteria: LoanEvaluationCriteria, factors: any, riskScore: number): string[] {
  const recommendations: string[] = []

  if (criteria.savingsBalance < getMinimumSavingsRequirement(criteria.loanType, criteria.requestedAmount)) {
    const required = getMinimumSavingsRequirement(criteria.loanType, criteria.requestedAmount)
    recommendations.push(`Build your savings to at least UGX ${required.toLocaleString()} before applying for this loan amount`)
  }

  if (factors.creditScore.score < 60) {
    recommendations.push('Improve your credit score by paying bills on time and reducing existing debt')
  }

  if (factors.income.score < 60) {
    recommendations.push('Consider applying for a smaller loan amount that better fits your income')
  }

  if (criteria.savingsBalance > 0 && (criteria.savingsBalance / criteria.requestedAmount) < 0.1) {
    recommendations.push('Increase your savings balance to get better interest rates and loan terms')
  }

  if (criteria.totalInterestEarned === 0 && criteria.savingsBalance > 0) {
    recommendations.push('Keep your savings active to earn interest and demonstrate financial discipline')
  }

  return recommendations
}

function generateWarnings(criteria: LoanEvaluationCriteria, factors: any, riskScore: number): string[] {
  const warnings: string[] = []

  if (riskScore > 70) {
    warnings.push('High risk profile - loan approval may be difficult')
  }

  const debtRatio = ((criteria.totalActiveDebt + calculateMonthlyPayment(criteria.requestedAmount, getBaseLoanRate(criteria.loanType), criteria.termMonths)) / criteria.monthlyIncome) * 100

  if (debtRatio > 40) {
    warnings.push('Debt-to-income ratio exceeds recommended 40% threshold')
  }

  if (criteria.creditScore < getMinimumCreditScore(criteria.loanType)) {
    warnings.push('Credit score below minimum requirement for this loan type')
  }

  if (criteria.existingLoanCount >= 3) {
    warnings.push('Multiple existing loans may affect approval')
  }

  return warnings
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}