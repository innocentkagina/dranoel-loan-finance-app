export interface LoanCalculationInput {
  principal: number
  annualInterestRate: number
  termMonths: number
}

export interface LoanCalculationResult {
  monthlyPayment: number
  totalPayment: number
  totalInterest: number
  paymentSchedule: PaymentScheduleItem[]
}

export interface PaymentScheduleItem {
  installmentNumber: number
  dueDate: Date
  principalAmount: number
  interestAmount: number
  totalAmount: number
  remainingBalance: number
}

export function calculateLoanPayment({
  principal,
  annualInterestRate,
  termMonths,
}: LoanCalculationInput): LoanCalculationResult {
  const monthlyInterestRate = annualInterestRate / 100 / 12

  // Calculate monthly payment using the formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
  const monthlyPayment = monthlyInterestRate > 0
    ? (principal * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, termMonths))) /
      (Math.pow(1 + monthlyInterestRate, termMonths) - 1)
    : principal / termMonths

  const totalPayment = monthlyPayment * termMonths
  const totalInterest = totalPayment - principal

  // Generate payment schedule
  const paymentSchedule: PaymentScheduleItem[] = []
  let remainingBalance = principal
  const startDate = new Date()

  for (let i = 1; i <= termMonths; i++) {
    const interestAmount = remainingBalance * monthlyInterestRate
    const principalAmount = monthlyPayment - interestAmount
    remainingBalance = Math.max(0, remainingBalance - principalAmount)

    const dueDate = new Date(startDate)
    dueDate.setMonth(startDate.getMonth() + i)

    paymentSchedule.push({
      installmentNumber: i,
      dueDate,
      principalAmount: Math.round(principalAmount * 100) / 100,
      interestAmount: Math.round(interestAmount * 100) / 100,
      totalAmount: Math.round(monthlyPayment * 100) / 100,
      remainingBalance: Math.round(remainingBalance * 100) / 100,
    })
  }

  return {
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalPayment: Math.round(totalPayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    paymentSchedule,
  }
}

export function calculateInterestRate(
  loanType: string,
  creditScore: number,
  interestRates: Array<{
    loanType: string
    minCreditScore: number
    maxCreditScore: number
    rate: number
  }>
): number | null {
  const applicableRate = interestRates.find(
    (rate) =>
      rate.loanType === loanType &&
      creditScore >= rate.minCreditScore &&
      creditScore <= rate.maxCreditScore
  )

  return applicableRate ? applicableRate.rate : null
}

export function calculateDebtToIncomeRatio(
  monthlyDebt: number,
  monthlyIncome: number
): number {
  if (monthlyIncome <= 0) return 0
  return (monthlyDebt / monthlyIncome) * 100
}

export function calculateLoanToValueRatio(
  loanAmount: number,
  collateralValue: number
): number {
  if (collateralValue <= 0) return 0
  return (loanAmount / collateralValue) * 100
}

export function calculatePaymentToIncomeRatio(
  monthlyPayment: number,
  monthlyIncome: number
): number {
  if (monthlyIncome <= 0) return 0
  return (monthlyPayment / monthlyIncome) * 100
}

export function assessLoanEligibility(input: {
  creditScore: number
  monthlyIncome: number
  monthlyDebt: number
  requestedAmount: number
  collateralValue?: number
  loanType: string
}): {
  isEligible: boolean
  reasons: string[]
  recommendations: string[]
} {
  const reasons: string[] = []
  const recommendations: string[] = []
  let isEligible = true

  // Credit score check
  if (input.creditScore < 580) {
    isEligible = false
    reasons.push('Credit score is below minimum requirement (580)')
    recommendations.push('Work on improving your credit score by paying bills on time and reducing debt')
  }

  // Debt-to-income ratio check
  const dtiRatio = calculateDebtToIncomeRatio(input.monthlyDebt, input.monthlyIncome)
  if (dtiRatio > 43) {
    isEligible = false
    reasons.push(`Debt-to-income ratio (${dtiRatio.toFixed(1)}%) exceeds maximum allowed (43%)`)
    recommendations.push('Reduce existing debt or increase income to improve debt-to-income ratio')
  }

  // Income verification
  if (input.monthlyIncome < 1000) {
    isEligible = false
    reasons.push('Monthly income is too low')
    recommendations.push('Provide additional income sources or consider a co-signer')
  }

  // Loan amount limits by type
  const loanLimits: Record<string, number> = {
    PERSONAL: 50000,
    MORTGAGE: 1000000,
    AUTO: 100000,
    BUSINESS: 500000,
    STUDENT: 200000,
  }

  const maxAmount = loanLimits[input.loanType] || 50000
  if (input.requestedAmount > maxAmount) {
    isEligible = false
    reasons.push(`Requested amount exceeds maximum for ${input.loanType} loans (${maxAmount.toLocaleString('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0, maximumFractionDigits: 0 })})`)
    recommendations.push(`Consider reducing the loan amount to within the limit`)
  }

  // Loan-to-value ratio for secured loans
  if (input.collateralValue && input.collateralValue > 0) {
    const ltvRatio = calculateLoanToValueRatio(input.requestedAmount, input.collateralValue)
    if (ltvRatio > 80) {
      isEligible = false
      reasons.push(`Loan-to-value ratio (${ltvRatio.toFixed(1)}%) exceeds maximum allowed (80%)`)
      recommendations.push('Increase down payment or provide additional collateral')
    }
  }

  return {
    isEligible,
    reasons,
    recommendations,
  }
}