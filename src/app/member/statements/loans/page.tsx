'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  LinearProgress,
  Pagination,
} from '@mui/material'
import {
  CreditCard as LoanIcon,
  TrendingDown as DebtIcon,
  Schedule as ScheduleIcon,
  CalendarMonth as CalendarIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import PDFButton from '@/components/PDFButton'
import { LoanStatementData } from '@/lib/pdf-generators'

interface LoanTransaction {
  id: string
  date: string
  description: string
  type: 'DISBURSEMENT' | 'PAYMENT' | 'INTEREST' | 'PENALTY' | 'INSURANCE'
  amount: number
  principal: number
  interest: number
  balance: number
  reference: string
}

interface LoanAccount {
  loanNumber: string
  loanType: string
  principalAmount: number
  currentBalance: number
  interestRate: number
  termMonths: number
  startDate: string
  maturityDate: string
  monthlyPayment: number
  totalPaid: number
  totalInterestPaid: number
  status: 'ACTIVE' | 'COMPLETED' | 'OVERDUE' | 'DEFAULT' | 'PAID_OFF' | 'CLOSED'
}

export default function LoanStatementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [period, setPeriod] = useState('6months')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<LoanTransaction[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loanData, setLoanData] = useState<LoanAccount | null>(null)

  useEffect(() => {
    if (session?.user) {
      fetchTransactions()
    }
  }, [session, period, currentPage])

  const fetchTransactions = async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      params.append('period', period)
      params.append('page', currentPage.toString())
      params.append('limit', '20')

      const response = await fetch(`/api/member/statements/loans?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch loan statements')
      }

      const data = await response.json()

      setLoanData(data.loanData)
      setTransactions(data.transactions || [])
      setTotalPages(data.pagination.pages || 1)
    } catch (error) {
      console.error('Error fetching loan statements:', error)
      setLoanData(null)
      setTransactions([])
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getNextPaymentDate = (startDate: string, termMonths: number) => {
    const start = new Date(startDate)
    const now = new Date()
    const monthsPassed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())

    if (monthsPassed >= termMonths) {
      return start.toISOString().split('T')[0] // Return start date if loan is completed
    }

    const nextPayment = new Date(start)
    nextPayment.setMonth(start.getMonth() + monthsPassed + 1)
    return nextPayment.toISOString().split('T')[0]
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'DISBURSEMENT':
        return 'info'
      case 'PAYMENT':
        return 'success'
      case 'INTEREST':
        return 'primary'
      case 'PENALTY':
        return 'error'
      case 'INSURANCE':
        return 'warning'
      default:
        return 'default'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success'
      case 'COMPLETED':
        return 'info'
      case 'OVERDUE':
        return 'warning'
      case 'DEFAULT':
        return 'error'
      default:
        return 'default'
    }
  }

  const getLoanTypeColor = (loanType: string) => {
    switch (loanType) {
      case 'PERSONAL':
        return 'primary'
      case 'BUSINESS':
        return 'success'
      case 'MORTGAGE':
        return 'info'
      case 'AUTO':
        return 'warning'
      case 'STUDENT':
        return 'secondary'
      case 'PAYDAY':
        return 'error'
      default:
        return 'default'
    }
  }

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod)
    setCurrentPage(1)
  }

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value)
  }

  // Prepare data for PDF generation
  const preparePDFData = (): LoanStatementData | null => {
    if (!loanData || !session?.user) return null

    return {
      borrower: {
        name: `${session.user.firstName} ${session.user.lastName}`,
        email: session.user.email || '',
        phone: session.user.phone || 'N/A',
        address: session.user.address || 'Address on file',
        memberId: session.user.id
      },
      loan: {
        accountNumber: loanData.accountNumber,
        loanType: loanData.loanType,
        principalAmount: loanData.principalAmount,
        currentBalance: loanData.currentBalance,
        interestRate: loanData.interestRate,
        termMonths: loanData.termMonths,
        monthlyPayment: loanData.monthlyPayment,
        startDate: loanData.startDate,
        maturityDate: loanData.maturityDate,
        nextPaymentDate: loanData.nextPaymentDate || loanData.maturityDate,
        status: loanData.status
      },
      payments: transactions.map(txn => ({
        date: txn.date,
        amount: txn.amount,
        principalAmount: txn.principal,
        interestAmount: txn.interest,
        balance: txn.balance,
        status: 'PAID'
      })),
      summary: {
        totalPaid: loanData.totalPaid || 0,
        totalInterestPaid: loanData.totalInterestPaid || 0,
        principalPaid: loanData.principalPaid || 0,
        remainingBalance: loanData.currentBalance,
        paymentsRemaining: Math.max(0, loanData.termMonths - Math.round((loanData.totalPaid || 0) / loanData.monthlyPayment))
      }
    }
  }

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  if (!loanData && !loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Breadcrumbs />
        <Typography variant="h6" color="text.secondary" sx={{ mt: 4 }}>
          No loan data available. You don't have any active loans.
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs />
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          <LoanIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Loan Statement
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          View your loan account details and payment history
        </Typography>
      </Box>

      {/* Loan Account Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <DebtIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Outstanding Balance</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {formatCurrency(loanData?.currentBalance || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                of {formatCurrency(loanData?.principalAmount || 0)} original
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ScheduleIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Monthly Payment</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {formatCurrency(loanData?.monthlyPayment || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Rate: {loanData?.interestRate || 0}% per annum
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CalendarIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Payments Made</Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                {Math.round(loanData?.termMonths || 0 * (loanData?.totalPaid || 0 / loanData?.principalAmount || 0))} / {loanData?.termMonths || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {loanData?.termMonths || 0 - Math.round(loanData?.termMonths || 0 * (loanData?.totalPaid || 0 / loanData?.principalAmount || 0))} remaining
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BankIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Paid</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {formatCurrency(loanData?.totalPaid || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Interest: {formatCurrency(loanData?.totalInterestPaid || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Loan Information */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Loan Account Information
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Loan Number
                </Typography>
                <Typography variant="h6">
                  {loanData?.loanNumber || 'N/A'}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Loan Type
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {loanData?.loanType ? (
                    <Chip
                      label={loanData.loanType}
                      color={getLoanTypeColor(loanData.loanType) as any}
                      size="small"
                      variant="filled"
                    />
                  ) : (
                    <Typography variant="body1">N/A</Typography>
                  )}
                </Box>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Disbursement Date
                </Typography>
                <Typography variant="body1">
                  {formatDate(loanData?.startDate || '')}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Maturity Date
                </Typography>
                <Typography variant="body1">
                  {formatDate(loanData?.maturityDate || '')}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Next Payment Due
                </Typography>
                <Typography variant="body1">
                  {loanData?.status || 'ACTIVE' === 'ACTIVE' ? formatDate(getNextPaymentDate(loanData?.startDate || '', loanData?.termMonths || 0)) : 'N/A'}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Loan Status
                </Typography>
                <Chip
                  label={loanData?.status || 'ACTIVE'}
                  color={getStatusColor(loanData?.status || 'ACTIVE') as any}
                  size="small"
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Statement Controls */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Period</InputLabel>
                <Select
                  value={period}
                  label="Period"
                  onChange={(e) => handlePeriodChange(e.target.value)}
                >
                  <MenuItem value="3months">Last 3 Months</MenuItem>
                  <MenuItem value="6months">Last 6 Months</MenuItem>
                  <MenuItem value="1year">Last Year</MenuItem>
                  <MenuItem value="all">All Time</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <PDFButton
                data={preparePDFData()}
                type="loan-statement"
                title="Loan Statement"
                filename={`loan_statement_${loanData?.accountNumber}_${new Date().toISOString().split('T')[0]}.pdf`}
                variant="contained"
                size="small"
                showDropdown={true}
                enablePrint={true}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Loan Transactions Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Loan Transaction History
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="right">Principal</TableCell>
                  <TableCell align="right">Interest</TableCell>
                  <TableCell align="right">Balance</TableCell>
                  <TableCell>Reference</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(transaction.date)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {transaction.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.type}
                        color={getTransactionColor(transaction.type) as any}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(transaction.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {transaction.principal > 0 ? formatCurrency(transaction.principal) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {transaction.interest > 0 ? formatCurrency(transaction.interest) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(transaction.balance)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        {transaction.reference}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}