'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts'
import Breadcrumbs from '@/components/Breadcrumbs'

interface AnalyticsData {
  timeframe: string
  loanStatusDistribution: Array<{ status: string; count: number }>
  loanTypeDistribution: Array<{
    type: string
    count: number
    totalRequested: number
    totalApproved: number
  }>
  monthlyTrends: Array<{
    month: string
    applications: number
    approved: number
    rejected: number
    avg_amount: number
  }>
  paymentPerformance: Array<{ status: string; count: number; totalAmount: number }>
  topLoanOfficers: Array<{
    name: string
    applicationsProcessed: number
    totalApproved: number
  }>
  portfolioHealth: {
    total_loans: number
    active_loans: number
    defaulted_loans: number
    total_outstanding: number
    total_collected: number
    avg_interest_rate: number
  }
  defaultRateByCredit: Array<{
    credit_range: string
    total_applications: number
    approved: number
    rejected: number
    approval_rate: number
  }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [timeframe, setTimeframe] = useState('30')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user) {
      fetchAnalytics()
    }
  }, [session, timeframe])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/administrator/analytics?timeframe=${timeframe}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'active':
      case 'paid':
        return 'success'
      case 'pending':
      case 'submitted':
      case 'under_review':
        return 'warning'
      case 'rejected':
      case 'defaulted':
      case 'late':
        return 'error'
      default:
        return 'default'
    }
  }

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    )
  }

  if (!session || !['LOAN_OFFICER', 'UNDERWRITER', 'ADMIN', 'MANAGER'].includes(session.user.role)) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6">Access denied. Analytics are only available to staff.</Typography>
      </Box>
    )
  }

  if (!analytics) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6">No analytics data available</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Loan Analytics Dashboard
        </Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Timeframe</InputLabel>
          <Select
            value={timeframe}
            label="Timeframe"
            onChange={(e) => setTimeframe(e.target.value)}
          >
            <MenuItem value="7">Last 7 days</MenuItem>
            <MenuItem value="30">Last 30 days</MenuItem>
            <MenuItem value="90">Last 90 days</MenuItem>
            <MenuItem value="365">Last year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Portfolio Health Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {analytics.portfolioHealth.total_loans || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Loans
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {analytics.portfolioHealth.active_loans || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Loans
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error.main">
                {analytics.portfolioHealth.defaulted_loans || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Defaulted
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {formatCurrency(analytics.portfolioHealth.total_outstanding || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Outstanding
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {formatCurrency(analytics.portfolioHealth.total_collected || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Collected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main">
                {(analytics.portfolioHealth.avg_interest_rate || 0).toFixed(2)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Interest
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Loan Status Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Loan Status Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.loanStatusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="status"
                  >
                    {analytics.loanStatusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Loan Type Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Loan Type Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.loanTypeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Trends */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monthly Application Trends
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analytics.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="applications" stroke="#8884d8" />
                  <Line type="monotone" dataKey="approved" stroke="#82ca9d" />
                  <Line type="monotone" dataKey="rejected" stroke="#ffc658" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Loan Officers */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Performing Loan Officers
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell align="right">Applications</TableCell>
                      <TableCell align="right">Total Approved</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.topLoanOfficers.map((officer, index) => (
                      <TableRow key={index}>
                        <TableCell>{officer.name}</TableCell>
                        <TableCell align="right">{officer.applicationsProcessed}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(officer.totalApproved)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Approval Rate by Credit Score */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Approval Rate by Credit Score
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Credit Range</TableCell>
                      <TableCell align="right">Applications</TableCell>
                      <TableCell align="right">Approval Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.defaultRateByCredit.map((range, index) => (
                      <TableRow key={index}>
                        <TableCell>{range.credit_range}</TableCell>
                        <TableCell align="right">{range.total_applications}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${range.approval_rate}%`}
                            color={range.approval_rate > 70 ? 'success' : range.approval_rate > 40 ? 'warning' : 'error'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}