'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Pagination,
} from '@mui/material'
import {
  AccountBalance as LoanIcon,
  Payment as PaymentIcon,
  Assignment as ApplicationIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  WavingHand as WaveIcon,
  Schedule as ScheduleIcon,
  History as HistoryIcon,
  CheckCircle as CheckIcon,
  ErrorOutline as ErrorIcon,
  HourglassEmpty as PendingIcon,
  Launch as LaunchIcon,
  Timeline as TimelineIcon,
  AccountBalanceWallet as WalletIcon,
  Savings as SavingsIcon,
} from '@mui/icons-material'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import LoanApplicationModal from '@/components/LoanApplicationModal'
import Breadcrumbs from '@/components/Breadcrumbs'

interface DashboardStats {
  totalLoans: number
  activeLoans: number
  totalPaid: number
  totalDue: number
  pendingApplications: number
  overduePayments: number
}

interface RecentActivity {
  id: string
  type: 'loan' | 'payment' | 'application'
  title: string
  amount?: number
  status: string
  date: string
}


export default function MemberDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [loanModalOpen, setLoanModalOpen] = useState(false)
  const [activityPage, setActivityPage] = useState(1)
  const [totalActivityCount, setTotalActivityCount] = useState(0)
  const activityPerPage = 5

  useEffect(() => {
    if (session?.user) {
      fetchDashboardData()
    }
  }, [session, activityPage])

  const handleActivityPageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setActivityPage(value)
  }

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, activityResponse] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch(`/api/dashboard/activity?page=${activityPage}&limit=${activityPerPage}`),
      ])

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      if (activityResponse.ok) {
        const activityData = await activityResponse.json()
        setRecentActivity(activityData.activities || activityData || [])
        setTotalActivityCount(activityData.totalCount || activityData.length || 0)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'paid':
      case 'approved':
        return 'success'
      case 'pending':
      case 'under_review':
        return 'warning'
      case 'overdue':
      case 'rejected':
      case 'defaulted':
        return 'error'
      default:
        return 'default'
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


  if (status === 'loading' || loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    )
  }

  if (!session) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6">Please sign in to view your dashboard</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs />
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          <WaveIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Member Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Welcome back, {session.user.firstName}! Here's your loan portfolio overview
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            '&:hover': { transform: 'translateY(-2px)', transition: 'all 0.2s ease', boxShadow: 4 }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <LoanIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Active Loans</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {stats?.activeLoans || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                of {stats?.totalLoans || 0} total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            '&:hover': { transform: 'translateY(-2px)', transition: 'all 0.2s ease', boxShadow: 4 }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PaymentIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Paid</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {formatCurrency(stats?.totalPaid || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lifetime payments
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            '&:hover': { transform: 'translateY(-2px)', transition: 'all 0.2s ease', boxShadow: 4 }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Outstanding</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {formatCurrency(stats?.totalDue || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Current balance
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            '&:hover': { transform: 'translateY(-2px)', transition: 'all 0.2s ease', boxShadow: 4 }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <WarningIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6">Overdue</Typography>
              </Box>
              <Typography variant="h4" color="error.main">
                {stats?.overduePayments || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stats?.overduePayments && stats.overduePayments > 0 ? 'Need attention' : 'All up to date!'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<ApplicationIcon />}
              onClick={() => setLoanModalOpen(true)}
            >
              New Loan Application
            </Button>
            <Button
              variant="outlined"
              startIcon={<PaymentIcon />}
              component={Link}
              href="/payments"
            >
              Make Payment
            </Button>
            <Button
              variant="outlined"
              startIcon={<LoanIcon />}
              component={Link}
              href="/member/loans"
            >
              View Loans
            </Button>
            <Button
              variant="outlined"
              startIcon={<SavingsIcon />}
              component={Link}
              href="/member/savings"
            >
              View Savings
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <HistoryIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              Recent Activity
            </Typography>
          </Box>
          {recentActivity.length > 0 ? (
            <Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Activity</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentActivity.map((activity) => {
                      const getActivityIcon = (type: string) => {
                        switch (type) {
                          case 'loan':
                            return <LoanIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                          case 'payment':
                            return <PaymentIcon sx={{ color: 'success.main', fontSize: 18 }} />
                          case 'application':
                            return <ApplicationIcon sx={{ color: 'info.main', fontSize: 18 }} />
                          default:
                            return <TimelineIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                        }
                      }

                      return (
                        <TableRow key={activity.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              {getActivityIcon(activity.type)}
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {activity.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {activity.type === 'payment' && 'Payment Transaction'}
                                  {activity.type === 'loan' && 'Loan Account'}
                                  {activity.type === 'application' && 'Loan Application'}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(activity.date).toLocaleDateString('en-UG', {
                                month: 'short',
                                day: 'numeric',
                                year: '2-digit'
                              })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(activity.date).toLocaleTimeString('en-UG', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {activity.amount ? (
                              <Typography variant="body2" fontWeight="medium">
                                {formatCurrency(activity.amount)}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                -
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={activity.status.replace('_', ' ')}
                              color={getStatusColor(activity.status) as any}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {totalActivityCount > activityPerPage && (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    count={Math.ceil(totalActivityCount / activityPerPage)}
                    page={activityPage}
                    onChange={handleActivityPageChange}
                    color="primary"
                    size="small"
                  />
                </Box>
              )}

              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button
                  variant="text"
                  size="small"
                  startIcon={<LaunchIcon />}
                  component={Link}
                  href="/member/loans"
                >
                  View All Activities
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <TimelineIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="body1" color="text.secondary" gutterBottom>
                No Recent Activity
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your loan activities will appear here
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Loan Application Modal */}
      <LoanApplicationModal
        open={loanModalOpen}
        onClose={() => setLoanModalOpen(false)}
        onSuccess={() => {
          // Refresh dashboard data after successful submission
          fetchDashboardData()
          console.log('Loan application submitted successfully!')
        }}
      />
    </Box>
  )
}