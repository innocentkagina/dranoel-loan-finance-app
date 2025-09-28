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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Pagination,
  Badge,
} from '@mui/material'
import {
  Savings as SavingsIcon,
  MoneyOff as WithdrawalIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  AccountBalance as BankIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Search as SearchIcon,
  Receipt as ReceiptIcon,
  Warning as WarningIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'

interface DepositTransaction {
  id: string
  memberName: string
  memberId: string
  accountType: 'SAVINGS' | 'SHARES'
  amount: number
  depositMethod: string
  depositDate: string
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED'
  description: string
  reference: string
  notes?: string
}

interface WithdrawalRequest {
  id: string
  memberName: string
  memberId: string
  accountType: 'SAVINGS' | 'SHARES'
  requestedAmount: number
  availableBalance: number
  requestDate: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISBURSED'
  reason: string
  urgency: 'LOW' | 'MEDIUM' | 'HIGH'
  notes?: string
}

interface AccountBalance {
  memberId: string
  memberName: string
  savingsBalance: number
  sharesBalance: number
  totalBalance: number
  lastActivity: string
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
}

interface TransactionSummary {
  totalDeposits: number
  totalWithdrawals: number
  pendingDeposits: number
  pendingWithdrawals: number
  totalSavings: number
  totalShares: number
  netFlow: number
}

export default function DepositsWithdrawalsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deposits, setDeposits] = useState<DepositTransaction[]>([])
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [balances, setBalances] = useState<AccountBalance[]>([])
  const [summary, setSummary] = useState<TransactionSummary>({
    totalDeposits: 0,
    totalWithdrawals: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    totalSavings: 0,
    totalShares: 0,
    netFlow: 0
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [processDialog, setProcessDialog] = useState<{
    open: boolean
    transaction: DepositTransaction | WithdrawalRequest | null
    action: 'APPROVE' | 'REJECT' | 'CONFIRM' | null
    type: 'DEPOSIT' | 'WITHDRAWAL' | null
  }>({ open: false, transaction: null, action: null, type: null })
  const [comment, setComment] = useState('')
  const [newDepositDialog, setNewDepositDialog] = useState(false)
  const [newDeposit, setNewDeposit] = useState({
    memberId: '',
    accountType: 'SAVINGS',
    amount: '',
    depositMethod: 'CASH',
    description: '',
    reference: ''
  })

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

    fetchData()
  }, [session, status, router])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch deposits
      const depositsResponse = await fetch('/api/treasurer/deposits')
      if (depositsResponse.ok) {
        const depositsData = await depositsResponse.json()
        setDeposits(depositsData)
      }

      // Fetch withdrawals
      const withdrawalsResponse = await fetch('/api/treasurer/withdrawals')
      if (withdrawalsResponse.ok) {
        const withdrawalsData = await withdrawalsResponse.json()
        setWithdrawals(withdrawalsData)
      }

      // Fetch account balances
      const balancesResponse = await fetch('/api/treasurer/account-balances')
      if (balancesResponse.ok) {
        const balancesData = await balancesResponse.json()
        setBalances(balancesData)
      }

      // Fetch summary
      const summaryResponse = await fetch('/api/treasurer/deposits-summary')
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json()
        setSummary(summaryData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProcessTransaction = async () => {
    if (!processDialog.transaction || !processDialog.action || !processDialog.type) return

    try {
      const endpoint = processDialog.type === 'DEPOSIT' ? '/api/treasurer/process-deposit' : '/api/treasurer/process-withdrawal'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: processDialog.transaction.id,
          action: processDialog.action,
          comment: comment
        })
      })

      if (response.ok) {
        fetchData()
        setProcessDialog({ open: false, transaction: null, action: null, type: null })
        setComment('')
      }
    } catch (error) {
      console.error('Error processing transaction:', error)
    }
  }

  const handleAddDeposit = async () => {
    try {
      const response = await fetch('/api/treasurer/add-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDeposit)
      })

      if (response.ok) {
        fetchData()
        setNewDepositDialog(false)
        setNewDeposit({
          memberId: '',
          accountType: 'SAVINGS',
          amount: '',
          depositMethod: 'CASH',
          description: '',
          reference: ''
        })
      }
    } catch (error) {
      console.error('Error adding deposit:', error)
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
      case 'CONFIRMED':
      case 'APPROVED':
      case 'DISBURSED':
        return 'success'
      case 'PENDING':
        return 'warning'
      case 'REJECTED':
        return 'error'
      default:
        return 'default'
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'HIGH':
        return 'error'
      case 'MEDIUM':
        return 'warning'
      case 'LOW':
        return 'success'
      default:
        return 'default'
    }
  }

  const filterData = (data: any[]) => {
    return data.filter(item =>
      item.memberName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.memberId?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const getPaginatedData = (data: any[]) => {
    const filtered = filterData(data)
    const startIndex = (currentPage - 1) * itemsPerPage
    return {
      data: filtered.slice(startIndex, startIndex + itemsPerPage),
      totalPages: Math.ceil(filtered.length / itemsPerPage)
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
            Deposits & Withdrawals
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage member deposits, withdrawals, and account balances
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setNewDepositDialog(true)}
          >
            Add Deposit
          </Button>
          <Button
            variant="contained"
            startIcon={<ReceiptIcon />}
            onClick={() => router.push('/treasurer/reports')}
          >
            Generate Report
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Savings</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {formatCurrency(summary.totalSavings)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Member savings accounts
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BankIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Shares</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {formatCurrency(summary.totalShares)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Member share accounts
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SavingsIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Pending Deposits</Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                {summary.pendingDeposits}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Awaiting confirmation
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <WithdrawalIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Pending Withdrawals</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {summary.pendingWithdrawals}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Awaiting approval
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search by member name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab
              label={
                <Badge badgeContent={summary.pendingDeposits} color="info">
                  <Box sx={{ mr: summary.pendingDeposits > 0 ? 2 : 0 }}>Deposits</Box>
                </Badge>
              }
            />
            <Tab
              label={
                <Badge badgeContent={summary.pendingWithdrawals} color="warning">
                  <Box sx={{ mr: summary.pendingWithdrawals > 0 ? 2 : 0 }}>Withdrawals</Box>
                </Badge>
              }
            />
            <Tab label="Account Balances" />
          </Tabs>
        </Box>

        <CardContent>
          {/* Deposits Tab */}
          {activeTab === 0 && (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Member</TableCell>
                    <TableCell>Account Type</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Reference</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getPaginatedData(deposits).data.map((deposit) => (
                    <TableRow key={deposit.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {deposit.memberName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {deposit.memberId}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={deposit.accountType}
                          color={deposit.accountType === 'SAVINGS' ? 'success' : 'primary'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="medium">
                          {formatCurrency(deposit.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>{deposit.depositMethod}</TableCell>
                      <TableCell>{formatDate(deposit.depositDate)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {deposit.reference}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={deposit.status}
                          color={getStatusColor(deposit.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Tooltip title="View Details">
                            <IconButton size="small">
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          {deposit.status === 'PENDING' && (
                            <>
                              <Tooltip title="Confirm">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => setProcessDialog({
                                    open: true,
                                    transaction: deposit,
                                    action: 'CONFIRM',
                                    type: 'DEPOSIT'
                                  })}
                                >
                                  <ApproveIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => setProcessDialog({
                                    open: true,
                                    transaction: deposit,
                                    action: 'REJECT',
                                    type: 'DEPOSIT'
                                  })}
                                >
                                  <RejectIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Withdrawals Tab */}
          {activeTab === 1 && (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Member</TableCell>
                    <TableCell>Account Type</TableCell>
                    <TableCell align="right">Requested Amount</TableCell>
                    <TableCell align="right">Available Balance</TableCell>
                    <TableCell>Request Date</TableCell>
                    <TableCell>Urgency</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getPaginatedData(withdrawals).data.map((withdrawal) => (
                    <TableRow key={withdrawal.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {withdrawal.memberName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {withdrawal.memberId}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={withdrawal.accountType}
                          color={withdrawal.accountType === 'SAVINGS' ? 'success' : 'primary'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="medium">
                          {formatCurrency(withdrawal.requestedAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          color={withdrawal.requestedAmount > withdrawal.availableBalance ? 'error.main' : 'text.primary'}
                        >
                          {formatCurrency(withdrawal.availableBalance)}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDate(withdrawal.requestDate)}</TableCell>
                      <TableCell>
                        <Chip
                          label={withdrawal.urgency}
                          color={getUrgencyColor(withdrawal.urgency) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={withdrawal.status}
                          color={getStatusColor(withdrawal.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Tooltip title="View Details">
                            <IconButton size="small">
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          {withdrawal.status === 'PENDING' && (
                            <>
                              <Tooltip title="Approve">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => setProcessDialog({
                                    open: true,
                                    transaction: withdrawal,
                                    action: 'APPROVE',
                                    type: 'WITHDRAWAL'
                                  })}
                                  disabled={withdrawal.requestedAmount > withdrawal.availableBalance}
                                >
                                  <ApproveIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => setProcessDialog({
                                    open: true,
                                    transaction: withdrawal,
                                    action: 'REJECT',
                                    type: 'WITHDRAWAL'
                                  })}
                                >
                                  <RejectIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {withdrawal.requestedAmount > withdrawal.availableBalance && (
                            <Tooltip title="Insufficient Balance">
                              <WarningIcon color="error" />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Account Balances Tab */}
          {activeTab === 2 && (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Member</TableCell>
                    <TableCell align="right">Savings Balance</TableCell>
                    <TableCell align="right">Shares Balance</TableCell>
                    <TableCell align="right">Total Balance</TableCell>
                    <TableCell>Last Activity</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getPaginatedData(balances).data.map((balance) => (
                    <TableRow key={balance.memberId} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {balance.memberName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {balance.memberId}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(balance.savingsBalance)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(balance.sharesBalance)}
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="medium">
                          {formatCurrency(balance.totalBalance)}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDate(balance.lastActivity)}</TableCell>
                      <TableCell>
                        <Chip
                          label={balance.status}
                          color={balance.status === 'ACTIVE' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Pagination */}
          {getPaginatedData(activeTab === 0 ? deposits : activeTab === 1 ? withdrawals : balances).totalPages > 1 && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={getPaginatedData(activeTab === 0 ? deposits : activeTab === 1 ? withdrawals : balances).totalPages}
                page={currentPage}
                onChange={(e, page) => setCurrentPage(page)}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Process Transaction Dialog */}
      <Dialog open={processDialog.open} onClose={() => setProcessDialog({ open: false, transaction: null, action: null, type: null })}>
        <DialogTitle>
          {processDialog.action} {processDialog.type}
        </DialogTitle>
        <DialogContent>
          {processDialog.transaction && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2"><strong>Member:</strong> {processDialog.transaction.memberName}</Typography>
              <Typography variant="body2">
                <strong>Amount:</strong> {formatCurrency('amount' in processDialog.transaction ? processDialog.transaction.amount : processDialog.transaction.requestedAmount)}
              </Typography>
              {'accountType' in processDialog.transaction && (
                <Typography variant="body2"><strong>Account Type:</strong> {processDialog.transaction.accountType}</Typography>
              )}
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProcessDialog({ open: false, transaction: null, action: null, type: null })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={processDialog.action === 'APPROVE' || processDialog.action === 'CONFIRM' ? 'success' : 'error'}
            onClick={handleProcessTransaction}
          >
            {processDialog.action}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Deposit Dialog */}
      <Dialog open={newDepositDialog} onClose={() => setNewDepositDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Deposit</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Member ID"
                value={newDeposit.memberId}
                onChange={(e) => setNewDeposit({ ...newDeposit, memberId: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Account Type</InputLabel>
                <Select
                  value={newDeposit.accountType}
                  label="Account Type"
                  onChange={(e) => setNewDeposit({ ...newDeposit, accountType: e.target.value })}
                >
                  <MenuItem value="SAVINGS">Savings</MenuItem>
                  <MenuItem value="SHARES">Shares</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount (UGX)"
                type="number"
                value={newDeposit.amount}
                onChange={(e) => setNewDeposit({ ...newDeposit, amount: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Deposit Method</InputLabel>
                <Select
                  value={newDeposit.depositMethod}
                  label="Deposit Method"
                  onChange={(e) => setNewDeposit({ ...newDeposit, depositMethod: e.target.value })}
                >
                  <MenuItem value="CASH">Cash</MenuItem>
                  <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                  <MenuItem value="MOBILE_MONEY">Mobile Money</MenuItem>
                  <MenuItem value="CHECK">Check</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={newDeposit.description}
                onChange={(e) => setNewDeposit({ ...newDeposit, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reference Number"
                value={newDeposit.reference}
                onChange={(e) => setNewDeposit({ ...newDeposit, reference: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewDepositDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddDeposit}>
            Add Deposit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}