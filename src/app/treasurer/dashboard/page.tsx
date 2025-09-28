'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import {
  AccountBalance as BankIcon,
  Payment as PaymentIcon,
  TrendingUp as StatsIcon,
  Receipt as ReceiptIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Pending as PendingIcon,
  MoneyOff as WithdrawalIcon,
  Add as AddIcon,
  Savings as SavingsIcon,
  Assessment as ReportIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  MonetizationOn as DisburseIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'

interface DashboardStats {
  totalPortfolio: number
  totalCollections: number
  pendingPayments: number
  overduePayments: number
  totalMembers: number
  activeLoans: number
  savingsBalance: number
  sharesBalance: number
  pendingDisbursements: number
}

interface PendingTransaction {
  id: string
  type: 'PAYMENT' | 'WITHDRAWAL' | 'DEPOSIT'
  memberName: string
  memberId: string
  amount: number
  description: string
  requestDate: string
  status: 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED'
}

interface ReconciliationItem {
  id: string
  accountType: 'LOAN' | 'SAVINGS' | 'SHARES'
  memberName: string
  memberId: string
  bookBalance: number
  actualBalance: number
  difference: number
  lastReconciled: string
  status: 'RECONCILED' | 'DISCREPANCY' | 'PENDING'
}

export default function TreasurerDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalPortfolio: 0,
    totalCollections: 0,
    pendingPayments: 0,
    overduePayments: 0,
    totalMembers: 0,
    activeLoans: 0,
    savingsBalance: 0,
    sharesBalance: 0,
    pendingDisbursements: 0,
  })
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([])
  const [reconciliationItems, setReconciliationItems] = useState<ReconciliationItem[]>([])
  const [processDialog, setProcessDialog] = useState<{
    open: boolean
    transaction: PendingTransaction | null
    action: 'APPROVE' | 'REJECT' | null
  }>({ open: false, transaction: null, action: null })
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (status === 'loading') return // Don't redirect while session is loading

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (session.user.role !== 'TREASURER') {
      router.push('/')
      return
    }

    fetchDashboardData()
  }, [session, status, router])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch dashboard statistics
      const statsResponse = await fetch('/api/treasurer/dashboard-stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      // Fetch pending transactions
      const transactionsResponse = await fetch('/api/treasurer/pending-transactions')
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json()
        setPendingTransactions(transactionsData)
      }

      // Fetch reconciliation items
      const reconciliationResponse = await fetch('/api/treasurer/reconciliation')
      if (reconciliationResponse.ok) {
        const reconciliationData = await reconciliationResponse.json()
        setReconciliationItems(reconciliationData)
      }

      // Fetch disbursement stats
      const disbursementResponse = await fetch('/api/treasurer/disbursement-stats')
      if (disbursementResponse.ok) {
        const disbursementData = await disbursementResponse.json()
        setStats(prev => ({
          ...prev,
          pendingDisbursements: disbursementData.pendingDisbursement || 0
        }))
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProcessTransaction = async () => {
    if (!processDialog.transaction || !processDialog.action) return

    try {
      const response = await fetch(`/api/treasurer/process-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: processDialog.transaction.id,
          action: processDialog.action,
          comment: comment
        })
      })

      if (response.ok) {
        // Refresh data
        fetchDashboardData()
        setProcessDialog({ open: false, transaction: null, action: null })
        setComment('')
      }
    } catch (error) {
      console.error('Error processing transaction:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'RECONCILED':
        return 'success'
      case 'PENDING':
        return 'warning'
      case 'REJECTED':
      case 'DISCREPANCY':
        return 'error'
      case 'PROCESSING':
        return 'info'
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

  if (!session || session.user.role !== 'TREASURER') {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error">
          Access denied. This page is only accessible to Treasurer users.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs />

      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            <BankIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
            Treasurer Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Financial management and account reconciliation
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchDashboardData}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<ReportIcon />}
            onClick={() => router.push('/treasurer/reports')}
          >
            Generate Report
          </Button>
        </Box>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BankIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Portfolio</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {formatCurrency(stats.totalPortfolio)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stats.activeLoans} active loans
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PaymentIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Collections</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {formatCurrency(stats.totalCollections)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This month
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SavingsIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Savings Balance</Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                {formatCurrency(stats.savingsBalance)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total member savings
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <WarningIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Pending Items</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {pendingTransactions.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Require attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabbed Content */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Pending Transactions" />
            <Tab label="Account Reconciliation" />
            <Tab label="Quick Actions" />
          </Tabs>
        </Box>

        {/* Pending Transactions Tab */}
        {activeTab === 0 && (
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Pending Transactions</Typography>
              <Chip
                label={`${pendingTransactions.length} pending`}
                color="warning"
                size="small"
              />
            </Box>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Member</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Request Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingTransactions.map((transaction) => (
                    <TableRow key={transaction.id} hover>
                      <TableCell>
                        <Chip
                          label={transaction.type}
                          color={transaction.type === 'PAYMENT' ? 'success' : transaction.type === 'WITHDRAWAL' ? 'error' : 'info'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{transaction.memberName}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="medium">
                          {formatCurrency(transaction.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDate(transaction.requestDate)}</TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.status}
                          color={getStatusColor(transaction.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Approve">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => setProcessDialog({
                                open: true,
                                transaction,
                                action: 'APPROVE'
                              })}
                            >
                              <CheckIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setProcessDialog({
                                open: true,
                                transaction,
                                action: 'REJECT'
                              })}
                            >
                              <WarningIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pendingTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary" sx={{ py: 2 }}>
                          No pending transactions
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* Account Reconciliation Tab */}
        {activeTab === 1 && (
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Account Reconciliation</Typography>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchDashboardData}
              >
                Run Reconciliation
              </Button>
            </Box>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Account Type</TableCell>
                    <TableCell>Member</TableCell>
                    <TableCell align="right">Book Balance</TableCell>
                    <TableCell align="right">Actual Balance</TableCell>
                    <TableCell align="right">Difference</TableCell>
                    <TableCell>Last Reconciled</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reconciliationItems.map((item) => (
                    <TableRow
                      key={item.id}
                      hover
                      sx={{
                        backgroundColor: item.difference !== 0 ? 'error.lighter' : 'inherit'
                      }}
                    >
                      <TableCell>
                        <Chip
                          label={item.accountType}
                          color={item.accountType === 'LOAN' ? 'primary' : item.accountType === 'SAVINGS' ? 'success' : 'info'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{item.memberName}</TableCell>
                      <TableCell align="right">{formatCurrency(item.bookBalance)}</TableCell>
                      <TableCell align="right">{formatCurrency(item.actualBalance)}</TableCell>
                      <TableCell align="right">
                        <Typography
                          color={item.difference === 0 ? 'text.primary' : 'error.main'}
                          fontWeight={item.difference !== 0 ? 'bold' : 'normal'}
                        >
                          {formatCurrency(item.difference)}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDate(item.lastReconciled)}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.status}
                          color={getStatusColor(item.status) as any}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {reconciliationItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary" sx={{ py: 2 }}>
                          No reconciliation data available
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* Quick Actions Tab */}
        {activeTab === 2 && (
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3 }}>Quick Actions</Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ position: 'relative' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <DisburseIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6">Loan Disbursements</Typography>
                      {stats.pendingDisbursements > 0 && (
                        <Chip
                          label={stats.pendingDisbursements}
                          color="warning"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {stats.pendingDisbursements > 0
                        ? `${stats.pendingDisbursements} approved loan${stats.pendingDisbursements > 1 ? 's' : ''} ready for disbursement`
                        : 'Manage approved loan disbursements'}
                    </Typography>
                    <Button
                      variant="contained"
                      fullWidth
                      color={stats.pendingDisbursements > 0 ? "warning" : "primary"}
                      onClick={() => router.push('/treasurer/disbursements')}
                      startIcon={<DisburseIcon />}
                    >
                      {stats.pendingDisbursements > 0 ? 'Process Disbursements' : 'View Disbursements'}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <PaymentIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6">Payment Processing</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Process member loan payments and manage payment schedules
                    </Typography>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => router.push('/treasurer/payments')}
                    >
                      Manage Payments
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <WithdrawalIcon color="warning" sx={{ mr: 1 }} />
                      <Typography variant="h6">Withdrawal Requests</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Review and approve member withdrawal requests
                    </Typography>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => router.push('/treasurer/withdrawals')}
                    >
                      Process Withdrawals
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <SavingsIcon color="success" sx={{ mr: 1 }} />
                      <Typography variant="h6">Deposits & Savings</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Manage member deposits and savings accounts
                    </Typography>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => router.push('/treasurer/deposits')}
                    >
                      Manage Deposits
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <ReportIcon color="info" sx={{ mr: 1 }} />
                      <Typography variant="h6">Financial Reports</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Generate comprehensive financial and audit reports
                    </Typography>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => router.push('/treasurer/reports')}
                    >
                      View Reports
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        )}
      </Card>

      {/* Process Transaction Dialog */}
      <Dialog open={processDialog.open} onClose={() => setProcessDialog({ open: false, transaction: null, action: null })}>
        <DialogTitle>
          {processDialog.action === 'APPROVE' ? 'Approve' : 'Reject'} Transaction
        </DialogTitle>
        <DialogContent>
          {processDialog.transaction && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2"><strong>Type:</strong> {processDialog.transaction.type}</Typography>
              <Typography variant="body2"><strong>Member:</strong> {processDialog.transaction.memberName}</Typography>
              <Typography variant="body2"><strong>Amount:</strong> {formatCurrency(processDialog.transaction.amount)}</Typography>
              <Typography variant="body2"><strong>Description:</strong> {processDialog.transaction.description}</Typography>
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Comment (Optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProcessDialog({ open: false, transaction: null, action: null })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={processDialog.action === 'APPROVE' ? 'success' : 'error'}
            onClick={handleProcessTransaction}
          >
            {processDialog.action === 'APPROVE' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}