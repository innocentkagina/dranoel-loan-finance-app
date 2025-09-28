import { PDFTemplate, PDFConfig, PDFHeader, PDFFooter } from './pdf-templates'

// Utility functions
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
  }).format(amount)
}

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-UG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export const formatDateTime = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-UG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Standard Dranoel header and footer
const getDranoelHeader = (subtitle?: string): PDFHeader => ({
  title: 'Dranoel Consults Limited',
  subtitle: subtitle || 'Licensed Financial Services Provider',
  address: [
    'Plot 123, Financial District',
    'Kampala, Uganda'
  ],
  phone: '+256 700 123 456',
  email: 'info@dranoel.com',
  website: 'www.dranoel.com'
})

const getDranoelFooter = (confidential: boolean = false): PDFFooter => ({
  showPageNumbers: true,
  showDate: true,
  confidential
})

// Loan Statement PDF Generator
export interface LoanStatementData {
  borrower: {
    name: string
    email: string
    phone: string
    address: string
    memberId: string
  }
  loan: {
    accountNumber: string
    loanType: string
    principalAmount: number
    currentBalance: number
    interestRate: number
    termMonths: number
    monthlyPayment: number
    startDate: string
    maturityDate: string
    nextPaymentDate: string
    status: string
  }
  payments: Array<{
    date: string
    amount: number
    principalAmount: number
    interestAmount: number
    balance: number
    status: string
  }>
  summary: {
    totalPaid: number
    totalInterestPaid: number
    principalPaid: number
    remainingBalance: number
    paymentsRemaining: number
  }
}

export function generateLoanStatementPDF(data: LoanStatementData): void {
  const config: PDFConfig = {
    title: 'Loan Statement',
    subtitle: `Account: ${data.loan.accountNumber}`,
    filename: `loan_statement_${data.loan.accountNumber}_${new Date().toISOString().split('T')[0]}.pdf`,
    subject: 'Loan Account Statement',
    author: 'Dranoel Consults Limited',
    keywords: ['loan', 'statement', 'account', 'dranoel']
  }

  const pdf = new PDFTemplate(config)

  // Add header
  pdf.addHeader(getDranoelHeader('Loan Account Statement'))

  // Add title
  pdf.addTitle(
    'Loan Account Statement',
    `Statement Period: ${formatDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))} to ${formatDate(new Date())}`
  )

  // Borrower Information
  pdf.addSectionHeader('Borrower Information')
  pdf.addKeyValuePairs({
    'Full Name': data.borrower.name,
    'Member ID': data.borrower.memberId,
    'Email Address': data.borrower.email,
    'Phone Number': data.borrower.phone,
    'Address': data.borrower.address
  })

  // Loan Details
  pdf.addSectionHeader('Loan Details')
  pdf.addKeyValuePairs({
    'Loan Account Number': data.loan.accountNumber,
    'Loan Type': data.loan.loanType,
    'Original Principal': formatCurrency(data.loan.principalAmount),
    'Interest Rate': `${data.loan.interestRate}% per annum`,
    'Loan Term': `${data.loan.termMonths} months`,
    'Monthly Payment': formatCurrency(data.loan.monthlyPayment),
    'Start Date': formatDate(data.loan.startDate),
    'Maturity Date': formatDate(data.loan.maturityDate),
    'Next Payment Due': formatDate(data.loan.nextPaymentDate),
    'Current Status': data.loan.status
  })

  // Loan Summary Stats
  pdf.addStatsCards([
    { label: 'Current Balance', value: formatCurrency(data.summary.remainingBalance), color: 'primary' },
    { label: 'Total Paid', value: formatCurrency(data.summary.totalPaid), color: 'success' },
    { label: 'Interest Paid', value: formatCurrency(data.summary.totalInterestPaid), color: 'warning' },
    { label: 'Payments Remaining', value: data.summary.paymentsRemaining, color: 'info' }
  ])

  // Payment History Table
  if (data.payments.length > 0) {
    const paymentHeaders = ['Date', 'Amount Paid', 'Principal', 'Interest', 'Balance', 'Status']
    const paymentRows = data.payments.map(payment => [
      formatDate(payment.date),
      formatCurrency(payment.amount),
      formatCurrency(payment.principalAmount),
      formatCurrency(payment.interestAmount),
      formatCurrency(payment.balance),
      payment.status
    ])

    pdf.addTable(paymentHeaders, paymentRows, {
      title: 'Payment History',
      alternateRows: true,
      headerColor: [248, 250, 252]
    })
  }

  // Summary Box
  pdf.addSummaryBox('Account Summary', [
    { label: 'Original Loan Amount', value: formatCurrency(data.loan.principalAmount) },
    { label: 'Total Amount Paid', value: formatCurrency(data.summary.totalPaid) },
    { label: 'Principal Paid', value: formatCurrency(data.summary.principalPaid) },
    { label: 'Interest Paid', value: formatCurrency(data.summary.totalInterestPaid) },
    { label: 'Current Balance', value: formatCurrency(data.summary.remainingBalance) }
  ])

  // Add footer and save
  pdf.addFooter(getDranoelFooter(true))
  pdf.save(config.filename)
}

// Financial Report PDF Generator
export interface FinancialReportData {
  reportPeriod: {
    startDate: string
    endDate: string
  }
  portfolio: {
    totalValue: number
    activeLoans: number
    totalDisbursed: number
    totalCollected: number
    averageLoanSize: number
  }
  performance: {
    disbursementGrowth: number
    collectionRate: number
    defaultRate: number
    portfolioGrowth: number
  }
  loanDistribution: Array<{
    type: string
    count: number
    value: number
    percentage: number
  }>
  riskMetrics: {
    par30: number
    par90: number
    writeOffs: number
    provisioning: number
  }
}

export function generateFinancialReportPDF(data: FinancialReportData): void {
  const config: PDFConfig = {
    title: 'Financial Performance Report',
    subtitle: `Period: ${formatDate(data.reportPeriod.startDate)} - ${formatDate(data.reportPeriod.endDate)}`,
    filename: `financial_report_${data.reportPeriod.startDate}_${data.reportPeriod.endDate}.pdf`,
    subject: 'Financial Performance Report',
    author: 'Dranoel Consults Limited',
    keywords: ['financial', 'report', 'performance', 'portfolio']
  }

  const pdf = new PDFTemplate(config, 'landscape') // Use landscape for better table display

  pdf.addHeader(getDranoelHeader('Financial Performance Report'))

  pdf.addTitle(
    'Financial Performance Report',
    `Reporting Period: ${formatDate(data.reportPeriod.startDate)} to ${formatDate(data.reportPeriod.endDate)}`
  )

  // Portfolio Overview
  pdf.addStatsCards([
    { label: 'Total Portfolio Value', value: formatCurrency(data.portfolio.totalValue) },
    { label: 'Active Loans', value: data.portfolio.activeLoans },
    { label: 'Total Disbursed', value: formatCurrency(data.portfolio.totalDisbursed) },
    { label: 'Total Collected', value: formatCurrency(data.portfolio.totalCollected) },
    { label: 'Average Loan Size', value: formatCurrency(data.portfolio.averageLoanSize) }
  ])

  // Performance Metrics
  pdf.addSectionHeader('Performance Metrics')
  pdf.addKeyValuePairs({
    'Disbursement Growth': `${data.performance.disbursementGrowth.toFixed(1)}%`,
    'Collection Rate': `${data.performance.collectionRate.toFixed(1)}%`,
    'Default Rate': `${data.performance.defaultRate.toFixed(1)}%`,
    'Portfolio Growth': `${data.performance.portfolioGrowth.toFixed(1)}%`
  })

  // Loan Distribution
  const distributionHeaders = ['Loan Type', 'Count', 'Value', 'Percentage']
  const distributionRows = data.loanDistribution.map(item => [
    item.type,
    item.count.toString(),
    formatCurrency(item.value),
    `${item.percentage.toFixed(1)}%`
  ])

  pdf.addTable(distributionHeaders, distributionRows, {
    title: 'Loan Type Distribution',
    alternateRows: true
  })

  // Risk Metrics
  pdf.addSummaryBox('Risk Analysis', [
    { label: 'Portfolio at Risk (30 days)', value: `${data.riskMetrics.par30.toFixed(1)}%` },
    { label: 'Portfolio at Risk (90 days)', value: `${data.riskMetrics.par90.toFixed(1)}%` },
    { label: 'Write-offs', value: formatCurrency(data.riskMetrics.writeOffs) },
    { label: 'Loan Loss Provisioning', value: formatCurrency(data.riskMetrics.provisioning) }
  ])

  pdf.addFooter(getDranoelFooter(true))
  pdf.save(config.filename)
}

// Member Statement PDF Generator
export interface MemberStatementData {
  member: {
    name: string
    memberId: string
    email: string
    phone: string
    joinDate: string
    status: string
  }
  accounts: {
    savings: {
      balance: number
      interestEarned: number
      transactions: Array<{
        date: string
        description: string
        debit: number
        credit: number
        balance: number
      }>
    }
    shares: {
      balance: number
      shares: number
      dividends: number
    }
    loans: Array<{
      accountNumber: string
      type: string
      balance: number
      nextPayment: number
      dueDate: string
    }>
  }
}

export function generateMemberStatementPDF(data: MemberStatementData): void {
  const config: PDFConfig = {
    title: 'Member Account Statement',
    subtitle: `Member: ${data.member.name}`,
    filename: `member_statement_${data.member.memberId}_${new Date().toISOString().split('T')[0]}.pdf`,
    subject: 'Member Account Statement',
    author: 'Dranoel Consults Limited',
    keywords: ['member', 'statement', 'account', 'savings', 'loans']
  }

  const pdf = new PDFTemplate(config)

  pdf.addHeader(getDranoelHeader('Member Account Statement'))

  pdf.addTitle(
    'Member Account Statement',
    `As of ${formatDate(new Date())}`
  )

  // Member Information
  pdf.addSectionHeader('Member Information')
  pdf.addKeyValuePairs({
    'Full Name': data.member.name,
    'Member ID': data.member.memberId,
    'Email': data.member.email,
    'Phone': data.member.phone,
    'Member Since': formatDate(data.member.joinDate),
    'Status': data.member.status
  })

  // Account Balances Summary
  const totalSavings = data.accounts.savings.balance
  const totalShares = data.accounts.shares.balance
  const totalLoanBalance = data.accounts.loans.reduce((sum, loan) => sum + loan.balance, 0)
  const netWorth = totalSavings + totalShares - totalLoanBalance

  pdf.addStatsCards([
    { label: 'Savings Balance', value: formatCurrency(totalSavings) },
    { label: 'Share Capital', value: formatCurrency(totalShares) },
    { label: 'Outstanding Loans', value: formatCurrency(totalLoanBalance) },
    { label: 'Net Worth', value: formatCurrency(netWorth) }
  ])

  // Savings Account Details
  pdf.addSectionHeader('Savings Account')
  pdf.addKeyValuePairs({
    'Current Balance': formatCurrency(data.accounts.savings.balance),
    'Interest Earned (YTD)': formatCurrency(data.accounts.savings.interestEarned)
  })

  // Recent Savings Transactions
  if (data.accounts.savings.transactions.length > 0) {
    const transactionHeaders = ['Date', 'Description', 'Debit', 'Credit', 'Balance']
    const transactionRows = data.accounts.savings.transactions.slice(0, 10).map(txn => [
      formatDate(txn.date),
      txn.description,
      txn.debit > 0 ? formatCurrency(txn.debit) : '-',
      txn.credit > 0 ? formatCurrency(txn.credit) : '-',
      formatCurrency(txn.balance)
    ])

    pdf.addTable(transactionHeaders, transactionRows, {
      title: 'Recent Savings Transactions (Last 10)',
      alternateRows: true
    })
  }

  // Share Capital
  pdf.addSectionHeader('Share Capital')
  pdf.addKeyValuePairs({
    'Share Balance': formatCurrency(data.accounts.shares.balance),
    'Number of Shares': data.accounts.shares.shares.toString(),
    'Dividends Earned (YTD)': formatCurrency(data.accounts.shares.dividends)
  })

  // Loan Accounts
  if (data.accounts.loans.length > 0) {
    const loanHeaders = ['Account Number', 'Loan Type', 'Balance', 'Next Payment', 'Due Date']
    const loanRows = data.accounts.loans.map(loan => [
      loan.accountNumber,
      loan.type,
      formatCurrency(loan.balance),
      formatCurrency(loan.nextPayment),
      formatDate(loan.dueDate)
    ])

    pdf.addTable(loanHeaders, loanRows, {
      title: 'Active Loan Accounts',
      alternateRows: true
    })
  }

  pdf.addFooter(getDranoelFooter(true))
  pdf.save(config.filename)
}

// Payment Receipt Generator
export interface PaymentReceiptData {
  receiptNumber: string
  member: {
    name: string
    memberId: string
  }
  loan: {
    accountNumber: string
    type: string
  }
  payment: {
    amount: number
    principalAmount: number
    interestAmount: number
    date: string
    method: string
    transactionId: string
  }
  balances: {
    previousBalance: number
    currentBalance: number
  }
}

export function generatePaymentReceiptPDF(data: PaymentReceiptData): void {
  const config: PDFConfig = {
    title: 'Payment Receipt',
    filename: `payment_receipt_${data.receiptNumber}.pdf`,
    subject: 'Loan Payment Receipt',
    author: 'Dranoel Consults Limited'
  }

  const pdf = new PDFTemplate(config)

  pdf.addHeader(getDranoelHeader('Official Payment Receipt'))

  pdf.addTitle('Payment Receipt', `Receipt #: ${data.receiptNumber}`)

  pdf.addKeyValuePairs({
    'Member Name': data.member.name,
    'Member ID': data.member.memberId,
    'Loan Account': data.loan.accountNumber,
    'Loan Type': data.loan.type,
    'Payment Date': formatDateTime(data.payment.date),
    'Payment Method': data.payment.method,
    'Transaction ID': data.payment.transactionId
  })

  // Payment breakdown
  pdf.addSummaryBox('Payment Breakdown', [
    { label: 'Total Payment', value: formatCurrency(data.payment.amount) },
    { label: 'Principal Amount', value: formatCurrency(data.payment.principalAmount) },
    { label: 'Interest Amount', value: formatCurrency(data.payment.interestAmount) },
    { label: 'Previous Balance', value: formatCurrency(data.balances.previousBalance) },
    { label: 'New Balance', value: formatCurrency(data.balances.currentBalance) }
  ])

  pdf.addFooter({
    showPageNumbers: false,
    showDate: false,
    customText: 'Thank you for your payment. Keep this receipt for your records.',
    confidential: false
  })

  pdf.save(config.filename)
}