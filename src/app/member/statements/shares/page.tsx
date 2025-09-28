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
  Receipt as ShareIcon,
  TrendingUp as TrendingUpIcon,
  PieChart as PieChartIcon,
  CalendarMonth as CalendarIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import PDFButton from '@/components/PDFButton'
import { MemberStatementData } from '@/lib/pdf-generators'

interface ShareTransaction {
  id: string
  date: string
  description: string
  type: 'PURCHASE' | 'DIVIDEND' | 'BONUS' | 'TRANSFER'
  shares: number
  amount: number
  shareValue: number
  balance: number
  reference: string
}

export default function ShareStatementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [period, setPeriod] = useState('1year')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<ShareTransaction[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [shareData, setShareData] = useState<any>(null)

  useEffect(() => {
    if (session?.user) {
      fetchTransactions()
    }
  }, [session, period, currentPage])

  const fetchTransactions = async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      params.append('page', currentPage.toString())
      params.append('limit', '20')

      const response = await fetch(`/api/member/statements/shares?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch shares statements')
      }

      const data = await response.json()

      setShareData(data.shareData)
      setTransactions(data.transactions || [])
      setTotalPages(data.pagination.pages || 1)
    } catch (error) {
      console.error('Error fetching shares statements:', error)
      setShareData(null)
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
      case 'PURCHASE':
        return 'primary'
      case 'DIVIDEND':
        return 'success'
      case 'BONUS':
        return 'info'
      case 'TRANSFER':
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

    const totalShares = shareData?.totalShares || 0
    const shareValue = shareData?.shareValue || 0
    const totalDividends = shareData?.totalDividends || 0

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
          balance: 0, // Would come from savings data
          interestEarned: 0,
          transactions: []
        },
        shares: {
          balance: totalShares * shareValue,
          shares: totalShares,
          dividends: totalDividends
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

  if (!shareData && !loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Breadcrumbs />
        <Typography variant="h6" color="text.secondary" sx={{ mt: 4 }}>
          No shares data available. Start making payments to build your shares portfolio.
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs />
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          <ShareIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Share Statement
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          View your share portfolio and dividend history
        </Typography>
      </Box>

      {/* Share Portfolio Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PieChartIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Shares</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {shareData?.totalShares || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                @ {formatCurrency(shareData?.shareValue || 0)} per share
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Portfolio Value</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {formatCurrency(shareData?.totalValue || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Current market value
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CalendarIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Annual Dividend</Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                {formatCurrency(shareData?.totalValue * 0.12 || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Rate: {shareData?.dividendRate || 12}% per annum
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ShareIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Dividends</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {formatCurrency((shareData?.totalValue * 0.12 * 1.5) || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Earned since joining
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Member Information */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Membership Information
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Membership Number
                </Typography>
                <Typography variant="h6">
                  {shareData?.membershipNumber || 'N/A'}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Join Date
                </Typography>
                <Typography variant="body1">
                  {formatDate(shareData?.joinDate || new Date().toISOString().split('T')[0])}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Last Dividend Date
                </Typography>
                <Typography variant="body1">
                  {formatDate(shareData?.lastDividendDate || new Date().toISOString().split('T')[0])}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Member Status
                </Typography>
                <Chip
                  label="Active Member"
                  color="success"
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
                  <MenuItem value="6months">Last 6 Months</MenuItem>
                  <MenuItem value="1year">Last Year</MenuItem>
                  <MenuItem value="2years">Last 2 Years</MenuItem>
                  <MenuItem value="all">All Time</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <PDFButton
                data={prepareMemberStatementData()}
                type="member-statement"
                title="Share Account Statement"
                filename={`shares_statement_${session?.user?.id}_${new Date().toISOString().split('T')[0]}.pdf`}
                variant="contained"
                size="small"
                showDropdown={true}
                enablePrint={true}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Share Transactions Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Share Transaction History
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Shares</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="right">Total Shares</TableCell>
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
                      <Typography
                        variant="body2"
                        color={transaction.shares > 0 ? 'success.main' : 'text.primary'}
                        fontWeight="medium"
                      >
                        {transaction.shares > 0 ? `+${transaction.shares}` : transaction.shares || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {transaction.amount > 0 ? formatCurrency(transaction.amount) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {transaction.balance}
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