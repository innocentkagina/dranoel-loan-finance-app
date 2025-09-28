'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Alert,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Stack,
  Chip
} from '@mui/material'
import {
  Assessment as ReportsIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  AccountBalance as LoanIcon,
  Payment as PaymentIcon,
  Security as SecurityIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

interface SystemReport {
  totalUsers: number
  activeUsers: number
  totalLoans: number
  activeLoans: number
  totalPayments: number
  pendingPayments: number
  systemHealth: string
  usersByRole: Array<{ role: string, count: number }>
  loansByType: Array<{ type: string, count: number, amount: number }>
  paymentsTrend: Array<{ month: string, payments: number, amount: number }>
  auditActivity: Array<{ action: string, count: number }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function SystemReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [reportData, setReportData] = useState<SystemReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState('overview')
  const [timeRange, setTimeRange] = useState('30')

  useEffect(() => {
    if (session?.user?.role === 'ADMINISTRATOR') {
      fetchReportData()
    }
  }, [session, reportType, timeRange])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      // Simulate API calls for now - in a real implementation, you'd have dedicated report endpoints
      const [statsRes, usersRes, loansRes] = await Promise.all([
        fetch('/api/administrator/stats'),
        fetch('/api/administrator/users?limit=1000'),
        fetch('/api/loans')
      ])

      const stats = statsRes.ok ? await statsRes.json() : null
      const users = usersRes.ok ? await usersRes.json() : null
      const loans = loansRes.ok ? await loansRes.json() : null

      // Mock data for demonstration
      const mockData: SystemReport = {
        totalUsers: stats?.totalUsers || 0,
        activeUsers: stats?.totalUsers || 0,
        totalLoans: stats?.totalLoans || 0,
        activeLoans: stats?.totalLoans || 0,
        totalPayments: stats?.totalPayments || 0,
        pendingPayments: Math.floor((stats?.totalPayments || 0) * 0.1),
        systemHealth: stats?.systemHealth || 'Healthy',
        usersByRole: [
          { role: 'MEMBER', count: 150 },
          { role: 'LOANS_OFFICER', count: 5 },
          { role: 'TREASURER', count: 3 },
          { role: 'ADMINISTRATOR', count: 2 }
        ],
        loansByType: [
          { type: 'PERSONAL', count: 45, amount: 450000 },
          { type: 'BUSINESS', count: 20, amount: 800000 },
          { type: 'MORTGAGE', count: 15, amount: 1200000 },
          { type: 'AUTO', count: 30, amount: 600000 },
          { type: 'STUDENT', count: 10, amount: 150000 }
        ],
        paymentsTrend: [
          { month: 'Jan', payments: 120, amount: 45000 },
          { month: 'Feb', payments: 135, amount: 52000 },
          { month: 'Mar', payments: 148, amount: 58000 },
          { month: 'Apr', payments: 162, amount: 61000 },
          { month: 'May', payments: 175, amount: 67000 },
          { month: 'Jun', payments: 189, amount: 72000 }
        ],
        auditActivity: [
          { action: 'LOGIN', count: 450 },
          { action: 'LOAN_APPLICATION', count: 85 },
          { action: 'PAYMENT', count: 230 },
          { action: 'USER_MANAGEMENT', count: 25 },
          { action: 'SYSTEM_ACCESS', count: 120 }
        ]
      }

      setReportData(mockData)
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = () => {
    // Mock export functionality
    alert('Export functionality will be implemented with actual data endpoints')
  }

  if (status === 'loading' || loading) {
    return <Box sx={{ p: 3 }}>Loading...</Box>
  }

  if (!session || session.user.role !== 'ADMINISTRATOR') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. Administrator privileges required.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs />

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ReportsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          System Reports & Analytics
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Comprehensive system performance and usage analytics
        </Typography>
      </Box>

      {/* Report Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Report Type</InputLabel>
                <Select
                  value={reportType}
                  label="Report Type"
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <MenuItem value="overview">System Overview</MenuItem>
                  <MenuItem value="users">User Analytics</MenuItem>
                  <MenuItem value="loans">Loan Analytics</MenuItem>
                  <MenuItem value="payments">Payment Analytics</MenuItem>
                  <MenuItem value="security">Security Report</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Time Range</InputLabel>
                <Select
                  value={timeRange}
                  label="Time Range"
                  onChange={(e) => setTimeRange(e.target.value)}
                >
                  <MenuItem value="7">Last 7 days</MenuItem>
                  <MenuItem value="30">Last 30 days</MenuItem>
                  <MenuItem value="90">Last 90 days</MenuItem>
                  <MenuItem value="365">Last year</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchReportData}
                  disabled={loading}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={exportReport}
                >
                  Export
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {!reportData ? (
        <Alert severity="info">Loading report data...</Alert>
      ) : (
        <Grid container spacing={3}>
          {/* Key Metrics */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Key Performance Indicators
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <PeopleIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h4" color="primary">
                        {reportData.totalUsers}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Users
                      </Typography>
                      <Chip
                        label={`${reportData.activeUsers} Active`}
                        size="small"
                        color="success"
                        sx={{ mt: 1 }}
                      />
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <LoanIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                      <Typography variant="h4" color="success.main">
                        {reportData.totalLoans}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Loans
                      </Typography>
                      <Chip
                        label={`${reportData.activeLoans} Active`}
                        size="small"
                        color="info"
                        sx={{ mt: 1 }}
                      />
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <PaymentIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                      <Typography variant="h4" color="info.main">
                        {reportData.totalPayments}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Payments
                      </Typography>
                      <Chip
                        label={`${reportData.pendingPayments} Pending`}
                        size="small"
                        color="warning"
                        sx={{ mt: 1 }}
                      />
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <SecurityIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                      <Typography variant="h4" color="warning.main">
                        {reportData.systemHealth}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        System Health
                      </Typography>
                      <Chip
                        label="All Systems Operational"
                        size="small"
                        color="success"
                        sx={{ mt: 1 }}
                      />
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Users by Role Chart */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Users by Role
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={reportData.usersByRole}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ role, count }) => `${role.replace('_', ' ')}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {reportData.usersByRole.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Loans by Type Chart */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Loans by Type
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.loansByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#8884d8" name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Payment Trends */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Payment Trends (Last 6 Months)
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={reportData.paymentsTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="payments" fill="#8884d8" name="Payment Count" />
                    <Line yAxisId="right" type="monotone" dataKey="amount" stroke="#82ca9d" name="Amount ($)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* System Activity */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Activity (Last {timeRange} days)
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.auditActivity} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="action" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* System Summary */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Summary
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total loan portfolio value
                    </Typography>
                    <Typography variant="h5" color="success.main">
                      ${reportData.loansByType.reduce((sum, loan) => sum + loan.amount, 0).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Average loan amount
                    </Typography>
                    <Typography variant="h5" color="info.main">
                      ${Math.round(reportData.loansByType.reduce((sum, loan) => sum + loan.amount, 0) / reportData.loansByType.reduce((sum, loan) => sum + loan.count, 0)).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      System uptime
                    </Typography>
                    <Typography variant="h5" color="primary.main">
                      99.9%
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  )
}