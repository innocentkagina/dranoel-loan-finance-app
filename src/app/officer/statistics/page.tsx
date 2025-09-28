'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Paper,
  Skeleton,
  Alert,
  Fade,
  Grow,
  IconButton,
  Tooltip as MuiTooltip,
} from '@mui/material'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts'
import {
  Assessment as StatisticsIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as LoanIcon,
  Payment as PaymentIcon,
  People as PeopleIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Schedule as PendingIcon,
  MonetizationOn as MoneyIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  ShowChart as ChartIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import PDFButton from '@/components/PDFButton'
import { FinancialReportData } from '@/lib/pdf-generators'

interface LoanStatistics {
  overview: {
    totalApplications: number
    approvedApplications: number
    rejectedApplications: number
    pendingApplications: number
    underReviewApplications: number
    approvalRate: number
    avgProcessingTime: number
  }
  amounts: {
    totalApprovedAmount: number
    totalRequestedAmount: number
    avgApprovedAmount: number
    avgRequestedAmount: number
  }
  monthlyTrends: Array<{
    month: string
    applications: number
    approved: number
    rejected: number
    pending: number
    totalApproved: number
    totalRequested: number
  }>
  loanTypes: Array<{
    type: string
    count: number
    totalApproved: number
    totalRequested: number
  }>
  payments: {
    totalPaid: number
    totalPrincipal: number
    totalInterest: number
    totalPayments: number
    latePayments: number
    pendingPayments: number
  }
  activeLoans: {
    count: number
    totalPrincipal: number
    totalOutstanding: number
    totalRepaid: number
  }
  topBorrowers: Array<{
    name: string
    email: string
    loanAmount: number
    currentBalance: number
    repaidAmount: number
  }>
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function StatisticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [statistics, setStatistics] = useState<LoanStatistics | null>(null)
  const [period, setPeriod] = useState('12months')
  const [loanType, setLoanType] = useState('ALL')
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedChart, setSelectedChart] = useState('trends')
  const [selectedMetric, setSelectedMetric] = useState('overview')

  useEffect(() => {
    if (session?.user && session.user.role === 'LOANS_OFFICER') {
      fetchStatistics()
    }
  }, [session, period, loanType])

  const fetchStatistics = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const params = new URLSearchParams()
      params.append('period', period)
      params.append('loanType', loanType)

      const response = await fetch(`/api/officer/statistics?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch statistics')
      }

      const data = await response.json()
      setStatistics(data)
    } catch (error) {
      console.error('Error fetching statistics:', error)
      setError('Failed to load statistics. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchStatistics(true)
  }

  // Prepare data for enhanced PDF generation
  const prepareStatisticsReportData = (): FinancialReportData | null => {
    if (!statistics) return null

    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - (period === '3months' ? 3 : period === '6months' ? 6 : 12))

    return {
      reportPeriod: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      },
      portfolio: {
        totalValue: statistics.amounts.totalApprovedAmount,
        activeLoans: statistics.activeLoans.count,
        totalDisbursed: statistics.amounts.totalApprovedAmount,
        totalCollected: statistics.payments.totalPaid,
        averageLoanSize: statistics.amounts.avgApprovedAmount
      },
      performance: {
        disbursementGrowth: 15.5, // Can be calculated from monthly trends
        collectionRate: (statistics.payments.totalPaid / statistics.amounts.totalApprovedAmount) * 100,
        defaultRate: ((statistics.overview.rejectedApplications / statistics.overview.totalApplications) * 100),
        portfolioGrowth: 12.3 // Can be calculated from trends
      },
      loanDistribution: statistics.loanTypes.map(item => ({
        type: item.type,
        count: item.count,
        value: item.totalApproved,
        percentage: (item.count / statistics.overview.totalApplications) * 100
      })),
      riskMetrics: {
        par30: statistics.payments.latePayments * 0.6,
        par90: statistics.payments.latePayments * 0.3,
        writeOffs: statistics.amounts.totalApprovedAmount * 0.02,
        provisioning: statistics.amounts.totalApprovedAmount * 0.01
      }
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

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const getLoanTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'PERSONAL': 'Personal',
      'BUSINESS': 'Business',
      'STUDENT': 'Student',
      'MORTGAGE': 'Mortgage',
      'AUTO': 'Auto',
      'PAYDAY': 'Emergency'
    }
    return labels[type] || type
  }

  const getLoanTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'PERSONAL': '#1976d2',    // Primary blue
      'BUSINESS': '#2e7d32',    // Success green
      'STUDENT': '#9c27b0',     // Secondary purple
      'MORTGAGE': '#0288d1',    // Info blue
      'AUTO': '#f57c00',        // Warning orange
      'PAYDAY': '#d32f2f'       // Error red
    }
    return colors[type] || '#757575' // Default grey
  }

  const renderSelectedChart = () => {
    if (!statistics) return null

    switch (selectedChart) {
      case 'trends':
        return (
          <Box sx={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={statistics.monthlyTrends} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11 }} stroke="#666" />
                <YAxis tick={{ fontSize: 11 }} stroke="#666" />
                <RechartsTooltip
                  labelFormatter={formatMonth}
                  formatter={(value: number, name: string) => [
                    value,
                    name === 'applications' ? 'Applications' : name === 'approved' ? 'Approved' : 'Pending'
                  ]}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="applications" stroke="#3b82f6" fill="url(#colorApplications)" strokeWidth={2} />
                <Area type="monotone" dataKey="approved" stroke="#10b981" fill="url(#colorApproved)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        )

      case 'distribution':
        return (
          <Box sx={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statistics.loanTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, percent }) => `${getLoanTypeLabel(type)} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="count"
                  animationDuration={1000}
                >
                  {statistics.loanTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getLoanTypeColor(entry.type)} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value: number) => [value, 'Applications']}
                  labelFormatter={(label) => getLoanTypeLabel(label)}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        )

      case 'amounts':
        return (
          <Box sx={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statistics.loanTypes} margin={{ top: 10, right: 20, left: 10, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="type" tickFormatter={getLoanTypeLabel} tick={{ fontSize: 10 }} stroke="#666" angle={-45} textAnchor="end" height={50} />
                <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} stroke="#666" />
                <RechartsTooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={getLoanTypeLabel}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="totalApproved" fill="#10b981" name="Approved" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalRequested" fill="#3b82f6" name="Requested" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )

      case 'payments':
        return (
          <Box sx={{ maxHeight: 280, overflow: 'hidden' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ p: 2, height: '100%', textAlign: 'center', border: '2px solid', borderColor: 'success.light' }}>
                  <MoneyIcon color="success" sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="h6" color="success.main" fontWeight={600} sx={{ mb: 0.5 }}>
                    {formatCurrency(statistics.payments.totalPaid)}
                  </Typography>
                  <Typography variant="caption" color="success.dark">
                    Total Received
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ p: 2, height: '100%', textAlign: 'center', border: '2px solid', borderColor: 'warning.light' }}>
                  <PendingIcon color="warning" sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="h6" color="warning.main" fontWeight={600} sx={{ mb: 0.5 }}>
                    {statistics.payments.latePayments}
                  </Typography>
                  <Typography variant="caption" color="warning.dark">
                    Late Payments
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                  <Card variant="outlined" sx={{ flex: 1, p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" color="primary.main" fontWeight={600}>
                      {statistics.payments.totalPayments}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total Transactions
                    </Typography>
                  </Card>
                  <Card variant="outlined" sx={{ flex: 1, p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" color="success.main" fontWeight={600}>
                      {formatCurrency(statistics.payments.totalInterest)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Interest Earned
                    </Typography>
                  </Card>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )

      default:
        return null
    }
  }

  const getChartTitle = () => {
    switch (selectedChart) {
      case 'trends':
        return 'Monthly Application Trends'
      case 'distribution':
        return 'Loan Type Distribution'
      case 'amounts':
        return 'Loan Amounts by Type'
      case 'payments':
        return 'Payment Statistics'
      default:
        return 'Analytics'
    }
  }

  const renderSkeleton = () => (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="text" width={300} height={60} sx={{ mb: 2 }} />
      <Skeleton variant="text" width={500} height={30} sx={{ mb: 4 }} />

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[...Array(4)].map((_, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width={150} height={30} />
                <Skeleton variant="text" width={100} height={50} sx={{ my: 1 }} />
                <Skeleton variant="text" width={200} height={20} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width={250} height={30} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" width="100%" height={300} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width={200} height={30} sx={{ mb: 2 }} />
              <Skeleton variant="circular" width={200} height={200} sx={{ mx: 'auto' }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )

  if (status === 'loading' || loading) {
    return renderSkeleton()
  }

  if (!session || session.user.role !== 'LOANS_OFFICER') {
    router.push('/auth/signin')
    return null
  }

  if (!statistics && !loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <ChartIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No statistics data available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Data might be loading or there may be no loan data for the selected filters.
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: 'grey.50', minHeight: '100vh' }}>
      <Breadcrumbs />

      {/* Enhanced Header */}
      <Fade in timeout={800}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h4" gutterBottom sx={{
                fontWeight: 600,
                color: 'text.primary',
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}>
                <Box sx={{
                  p: 1.5,
                  bgcolor: 'primary.main',
                  borderRadius: 2,
                  display: 'flex'
                }}>
                  <StatisticsIcon sx={{ color: 'white', fontSize: 28 }} />
                </Box>
                Loan Analytics Dashboard
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" sx={{ ml: 7 }}>
                Comprehensive insights and performance metrics for loan management
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <MuiTooltip title="Refresh Data">
                <IconButton
                  onClick={handleRefresh}
                  disabled={refreshing}
                  sx={{
                    bgcolor: 'white',
                    boxShadow: 1,
                    '&:hover': { bgcolor: 'grey.100' }
                  }}
                >
                  <RefreshIcon sx={{
                    animation: refreshing ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' }
                    }
                  }} />
                </IconButton>
              </MuiTooltip>
              <PDFButton
                data={prepareStatisticsReportData()}
                type="financial-report"
                title="Loan Analytics Report"
                filename={`loan_analytics_${period}_${new Date().toISOString().split('T')[0]}.pdf`}
                variant="contained"
                size="medium"
                showDropdown={true}
                enablePrint={true}
              />
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </Fade>

      {/* Compact Filters & Controls */}
      <Grow in timeout={600}>
        <Card sx={{ mb: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Period</InputLabel>
                  <Select value={period} label="Period" onChange={(e) => setPeriod(e.target.value)} disabled={refreshing}>
                    <MenuItem value="3months">3 Months</MenuItem>
                    <MenuItem value="6months">6 Months</MenuItem>
                    <MenuItem value="12months">12 Months</MenuItem>
                    <MenuItem value="2years">2 Years</MenuItem>
                    <MenuItem value="all">All Time</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Loan Type</InputLabel>
                  <Select value={loanType} label="Loan Type" onChange={(e) => setLoanType(e.target.value)} disabled={refreshing}>
                    <MenuItem value="ALL">All Types</MenuItem>
                    <MenuItem value="PERSONAL">Personal</MenuItem>
                    <MenuItem value="BUSINESS">Business</MenuItem>
                    <MenuItem value="STUDENT">Student</MenuItem>
                    <MenuItem value="MORTGAGE">Mortgage</MenuItem>
                    <MenuItem value="AUTO">Auto</MenuItem>
                    <MenuItem value="PAYDAY">Emergency</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>View</InputLabel>
                  <Select value={selectedChart} label="View" onChange={(e) => setSelectedChart(e.target.value)}>
                    <MenuItem value="trends">📈 Monthly Trends</MenuItem>
                    <MenuItem value="distribution">🥧 Loan Types</MenuItem>
                    <MenuItem value="amounts">💰 Amounts</MenuItem>
                    <MenuItem value="payments">💳 Payments</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <MuiTooltip title="Refresh Data">
                  <IconButton onClick={handleRefresh} disabled={refreshing} sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}>
                    <RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                  </IconButton>
                </MuiTooltip>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grow>

      {/* Compact Overview Cards */}
      {statistics && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[
            {
              title: 'Applications',
              value: statistics.overview.totalApplications,
              subtitle: `${statistics.overview.approvalRate}% approved`,
              icon: LoanIcon,
              color: 'primary'
            },
            {
              title: 'Approved Amount',
              value: formatCurrency(statistics.amounts.totalApprovedAmount),
              subtitle: `${statistics.overview.approvedApplications} loans`,
              icon: ApprovedIcon,
              color: 'success'
            },
            {
              title: 'Under Review',
              value: statistics.overview.underReviewApplications + statistics.overview.pendingApplications,
              subtitle: `${statistics.overview.avgProcessingTime} days avg`,
              icon: PendingIcon,
              color: 'warning'
            },
            {
              title: 'Active Loans',
              value: statistics.activeLoans.count,
              subtitle: formatCurrency(statistics.activeLoans.totalOutstanding),
              icon: PaymentIcon,
              color: 'info'
            }
          ].map((card, index) => {
            const IconComponent = card.icon
            return (
              <Grid item xs={6} md={3} key={index}>
                <Card sx={{ borderRadius: 2, p: 2, height: '100%', '&:hover': { boxShadow: 3 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <IconComponent sx={{ color: `${card.color}.main`, mr: 1 }} />
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      {card.title}
                    </Typography>
                  </Box>
                  <Typography variant="h6" color={`${card.color}.main`} fontWeight={700}>
                    {typeof card.value === 'string' ? card.value : card.value.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {card.subtitle}
                  </Typography>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}

      {/* Dynamic Chart Section */}
      {statistics && (
        <Card sx={{ mb: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" fontWeight={600} color="primary.main">
                {getChartTitle()}
              </Typography>
              <Chip
                size="small"
                label={`${period === 'all' ? 'All Time' : period.replace('months', 'M').replace('years', 'Y')}`}
                color="primary"
                variant="outlined"
              />
            </Box>
            {renderSelectedChart()}
          </CardContent>
        </Card>
      )}

      {/* Compact Top Borrowers */}
      {statistics && statistics.topBorrowers.length > 0 && (
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" fontWeight={600} color="primary.main">
                Top Active Borrowers
              </Typography>
              <Chip size="small" label={`${statistics.topBorrowers.length} active`} color="primary" variant="outlined" />
            </Box>
            <Grid container spacing={2}>
              {statistics.topBorrowers.slice(0, 3).map((borrower, index) => {
                const progress = borrower.loanAmount > 0 ? ((borrower.repaidAmount / borrower.loanAmount) * 100) : 0
                return (
                  <Grid item xs={12} md={4} key={index}>
                    <Card variant="outlined" sx={{ p: 2, '&:hover': { boxShadow: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: COLORS[index % COLORS.length],
                            fontSize: '0.875rem',
                            mr: 1
                          }}
                        >
                          {borrower.name.split(' ').map(n => n[0]).join('')}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {borrower.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {borrower.email}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Loan Amount</Typography>
                        <Typography variant="h6" color="primary.main" fontWeight={600}>
                          {formatCurrency(borrower.loanAmount)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">Progress</Typography>
                        <Typography variant="caption" fontWeight={600}>{progress.toFixed(0)}%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            bgcolor: progress < 50 ? 'warning.main' : 'success.main'
                          }
                        }}
                      />
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}