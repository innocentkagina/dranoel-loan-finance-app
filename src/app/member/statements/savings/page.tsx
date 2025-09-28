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
  Savings as SavingsIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalanceWallet as WalletIcon,
  CalendarMonth as CalendarIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import PDFButton from '@/components/PDFButton'
import { MemberStatementData } from '@/lib/pdf-generators'

interface SavingsTransaction {
  id: string
  date: string
  description: string
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'INTEREST' | 'FEES'
  amount: number
  balance: number
  reference: string
  channel?: string
}

export default function SavingsStatementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [period, setPeriod] = useState('3months')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [accountData, setAccountData] = useState<any>(null)

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

      const response = await fetch(`/api/member/statements/savings?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch savings statements')
      }

      const data = await response.json()

      setAccountData(data.accountData)
      setTransactions(data.transactions || [])
      setTotalPages(data.pagination.pages || 1)
    } catch (error) {
      console.error('Error fetching savings statements:', error)
      setAccountData(null)
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

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return 'success'
      case 'WITHDRAWAL':
        return 'error'
      case 'INTEREST':
        return 'info'
      case 'FEES':
        return 'warning'
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

  // Prepare data for enhanced PDF generation
  const prepareMemberStatementData = (): MemberStatementData | null => {
    if (!session?.user) return null

    const currentBalance = accountData?.currentBalance || 0
    const interestEarned = accountData?.interestEarned || 0

    return {
      member: {
        name: `${session.user.firstName} ${session.user.lastName}`,
        memberId: session.user.id,
        email: session.user.email || '',
        phone: session.user.phone || 'N/A',
        joinDate: session.user.createdAt || new Date().toISOString(),
        status: 'ACTIVE'
      },
      accounts: {
        savings: {
          balance: currentBalance,
          interestEarned: interestEarned,
          transactions: transactions.map(txn => ({
            date: txn.date,
            description: txn.description,
            debit: txn.type === 'WITHDRAWAL' || txn.type === 'FEES' ? txn.amount : 0,
            credit: txn.type === 'DEPOSIT' || txn.type === 'INTEREST' ? txn.amount : 0,
            balance: txn.balance
          }))
        },
        shares: {
          balance: 0, // Would come from shares data
          shares: 0,
          dividends: 0
        },
        loans: [] // Would come from active loans
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

  if (!accountData && !loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Breadcrumbs />
        <Typography variant="h6" color="text.secondary" sx={{ mt: 4 }}>
          No savings data available. Start making payments to build your savings.
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs />
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          <SavingsIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Savings Statement
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Detailed view of your savings account activity
        </Typography>
      </Box>

      {/* Account Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <WalletIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Current Balance</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {formatCurrency(accountData?.currentBalance || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Available: {formatCurrency(accountData?.availableBalance || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Deposits</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {formatCurrency(accountData?.totalDeposits || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lifetime deposits
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CalendarIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Interest Earned</Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                {formatCurrency(accountData?.interestEarned || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Rate: {accountData?.interestRate || 0}% per annum
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">Account Details</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Account: {accountData?.accountNumber || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Type: {accountData?.accountType || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Status: {accountData?.status || 'ACTIVE'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Period</InputLabel>
          <Select
            value={period}
            label="Period"
            onChange={(e) => handlePeriodChange(e.target.value)}
          >
            <MenuItem value="1month">Last Month</MenuItem>
            <MenuItem value="3months">Last 3 Months</MenuItem>
            <MenuItem value="6months">Last 6 Months</MenuItem>
            <MenuItem value="1year">Last Year</MenuItem>
            <MenuItem value="all">All Transactions</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <PDFButton
            data={prepareMemberStatementData()}
            type="member-statement"
            title="Savings Account Statement"
            filename={`savings_statement_${session?.user?.id}_${new Date().toISOString().split('T')[0]}.pdf`}
            variant="contained"
            size="small"
            showDropdown={true}
            enablePrint={true}
          />
        </Box>
      </Box>

      {/* Transactions Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Recent Transactions
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="right">Balance</TableCell>
                  <TableCell>Reference</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id} hover>
                    <TableCell>
                      {formatDate(transaction.date)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {transaction.description}
                      </Typography>
                      {transaction.channel && (
                        <Typography variant="caption" color="text.secondary">
                          via {transaction.channel.replace('_', ' ')}
                        </Typography>
                      )}
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
                      <Typography
                        color={transaction.amount > 0 ? 'success.main' : 'error.main'}
                        fontWeight="medium"
                      >
                        {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'medium' }}>
                      {formatCurrency(transaction.balance)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {transaction.reference}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {transactions.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                No transactions found for the selected period.
              </Typography>
            </Box>
          )}

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