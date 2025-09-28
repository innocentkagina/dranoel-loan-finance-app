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
  Fab,
  Tab,
  Tabs,
  Divider,
} from '@mui/material'
import {
  AccountBalance as SavingsIcon,
  Add as AddIcon,
  TrendingUp as GrowthIcon,
  AccountBalanceWallet as WalletIcon,
  History as HistoryIcon,
  AddCircle as DepositIcon,
  GetApp as WithdrawIcon,
  Link as LinkIcon,
  Visibility as ViewIcon,
  CheckCircle as ApprovedIcon,
  Schedule as PendingIcon,
  Cancel as RejectedIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'

interface SavingsAccount {
  id: string
  accountNumber: string
  balance: number
  interestRate: number
  minimumBalance: number
  status: string
  totalInterestEarned: number
  openedAt: string
  transactions: SavingsTransaction[]
  linkedBankAccounts: BankAccount[]
}

interface SavingsTransaction {
  id: string
  type: string
  amount: number
  balanceAfter: number
  description: string
  createdAt: string
  bankAccount?: {
    bankName: string
    accountNumber: string
  }
}

interface BankAccount {
  id: string
  bankName: string
  accountNumber: string
  status: string
}

export default function MemberSavingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [savingsAccount, setSavingsAccount] = useState<SavingsAccount | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [tabValue, setTabValue] = useState(0)
  const [createAccountDialog, setCreateAccountDialog] = useState(false)
  const [transactionDialog, setTransactionDialog] = useState(false)
  const [bankAccountDialog, setBankAccountDialog] = useState(false)
  const [transactionForm, setTransactionForm] = useState({
    type: 'DEPOSIT',
    amount: '',
    description: '',
    bankAccountId: ''
  })
  const [bankAccountForm, setBankAccountForm] = useState({
    bankName: '',
    accountNumber: '',
    accountType: 'SAVINGS',
    routingNumber: '',
    accountHolderName: ''
  })
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (session?.user?.role === 'MEMBER') {
      fetchSavingsData()
    }
  }, [session])

  const fetchSavingsData = async () => {
    try {
      const [savingsResponse, bankAccountsResponse] = await Promise.all([
        fetch('/api/savings/account'),
        fetch('/api/savings/bank-accounts')
      ])

      if (savingsResponse.ok) {
        const savingsData = await savingsResponse.json()
        setSavingsAccount(savingsData)
      }

      if (bankAccountsResponse.ok) {
        const bankAccountsData = await bankAccountsResponse.json()
        setBankAccounts(bankAccountsData)
      }
    } catch (error) {
      console.error('Error fetching savings data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async () => {
    setProcessing(true)
    try {
      const response = await fetch('/api/savings/account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        await fetchSavingsData()
        setCreateAccountDialog(false)
      } else {
        const error = await response.json()
        console.error('Account creation failed:', error)
      }
    } catch (error) {
      console.error('Error creating account:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleTransaction = async () => {
    if (!transactionForm.amount || !transactionForm.type) return

    setProcessing(true)
    try {
      const response = await fetch('/api/savings/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: transactionForm.type,
          amount: parseFloat(transactionForm.amount),
          description: transactionForm.description,
          bankAccountId: transactionForm.bankAccountId || null
        })
      })

      if (response.ok) {
        await fetchSavingsData()
        setTransactionDialog(false)
        setTransactionForm({
          type: 'DEPOSIT',
          amount: '',
          description: '',
          bankAccountId: ''
        })
      } else {
        const error = await response.json()
        console.error('Transaction failed:', error)
      }
    } catch (error) {
      console.error('Error processing transaction:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleAddBankAccount = async () => {
    if (!bankAccountForm.bankName || !bankAccountForm.accountNumber || !bankAccountForm.accountHolderName) return

    setProcessing(true)
    try {
      const response = await fetch('/api/savings/bank-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bankAccountForm)
      })

      if (response.ok) {
        await fetchSavingsData()
        setBankAccountDialog(false)
        setBankAccountForm({
          bankName: '',
          accountNumber: '',
          accountType: 'SAVINGS',
          routingNumber: '',
          accountHolderName: ''
        })
      } else {
        const error = await response.json()
        console.error('Bank account creation failed:', error)
      }
    } catch (error) {
      console.error('Error adding bank account:', error)
    } finally {
      setProcessing(false)
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'success'
      case 'PENDING': return 'warning'
      case 'REJECTED': return 'error'
      default: return 'default'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <ApprovedIcon />
      case 'PENDING': return <PendingIcon />
      case 'REJECTED': return <RejectedIcon />
      default: return null
    }
  }

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    )
  }

  if (!session || session.user.role !== 'MEMBER') {
    router.push('/auth/signin')
    return null
  }

  if (!savingsAccount) {
    return (
      <Box sx={{ p: 3 }}>
        <Breadcrumbs />

        <Box sx={{ textAlign: 'center', py: 8 }}>
          <SavingsIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Welcome to Your Savings
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
            Start your savings journey today! Create a savings account to earn interest,
            track your progress, and build towards your financial goals.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => setCreateAccountDialog(true)}
          >
            Create Savings Account
          </Button>
        </Box>

        {/* Create Account Dialog */}
        <Dialog open={createAccountDialog} onClose={() => setCreateAccountDialog(false)}>
          <DialogTitle>Create Savings Account</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Your savings account will be created with the following default settings:
            </Typography>
            <Box sx={{ pl: 2 }}>
              <Typography variant="body2">• Interest Rate: 2.5% per annum</Typography>
              <Typography variant="body2">• Minimum Balance: UGX 1,000</Typography>
              <Typography variant="body2">• Daily Withdrawal Limit: UGX 500,000</Typography>
              <Typography variant="body2">• Monthly Withdrawal Limit: UGX 2,000,000</Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateAccountDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateAccount}
              variant="contained"
              disabled={processing}
            >
              {processing ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs />

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          <SavingsIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          My Savings
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Manage your savings account and track your financial growth
        </Typography>
      </Box>

      {/* Account Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'primary.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Current Balance
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {formatCurrency(savingsAccount.balance)}
                  </Typography>
                </Box>
                <WalletIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'success.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Interest Earned
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {formatCurrency(savingsAccount.totalInterestEarned)}
                  </Typography>
                </Box>
                <GrowthIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'info.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Interest Rate
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {savingsAccount.interestRate}%
                  </Typography>
                </Box>
                <SavingsIcon sx={{ fontSize: 40, color: 'info.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'warning.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Account Number
                  </Typography>
                  <Typography variant="h6" color="warning.main">
                    {savingsAccount.accountNumber}
                  </Typography>
                </Box>
                <BankIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Recent Transactions" icon={<HistoryIcon />} />
            <Tab label="Linked Bank Accounts" icon={<BankIcon />} />
          </Tabs>
        </Box>

        <CardContent>
          {tabValue === 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Recent Transactions</Typography>
                <Box>
                  <Button
                    variant="contained"
                    startIcon={<DepositIcon />}
                    onClick={() => {
                      setTransactionForm({ ...transactionForm, type: 'DEPOSIT' })
                      setTransactionDialog(true)
                    }}
                    sx={{ mr: 1 }}
                  >
                    Deposit
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<WithdrawIcon />}
                    onClick={() => {
                      setTransactionForm({ ...transactionForm, type: 'WITHDRAWAL' })
                      setTransactionDialog(true)
                    }}
                  >
                    Withdraw
                  </Button>
                </Box>
              </Box>

              {savingsAccount.transactions.length === 0 ? (
                <Alert severity="info">
                  No transactions yet. Start by making your first deposit!
                </Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell align="right">Balance After</TableCell>
                        <TableCell>Source</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {savingsAccount.transactions.map((transaction) => (
                        <TableRow key={transaction.id} hover>
                          <TableCell>
                            {formatDate(transaction.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={transaction.type}
                              size="small"
                              color={transaction.type === 'DEPOSIT' ? 'success' : 'warning'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            {transaction.description || '-'}
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              color={transaction.type === 'DEPOSIT' ? 'success.main' : 'warning.main'}
                              fontWeight="medium"
                            >
                              {transaction.type === 'DEPOSIT' ? '+' : '-'}
                              {formatCurrency(transaction.amount)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(transaction.balanceAfter)}
                          </TableCell>
                          <TableCell>
                            {transaction.bankAccount
                              ? `${transaction.bankAccount.bankName} - ${transaction.bankAccount.accountNumber}`
                              : 'Direct'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {tabValue === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Linked Bank Accounts</Typography>
                <Button
                  variant="contained"
                  startIcon={<LinkIcon />}
                  onClick={() => setBankAccountDialog(true)}
                >
                  Link Bank Account
                </Button>
              </Box>

              {bankAccounts.length === 0 ? (
                <Alert severity="info">
                  No bank accounts linked yet. Link a bank account for easier transfers.
                </Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Bank Name</TableCell>
                        <TableCell>Account Number</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bankAccounts.map((account) => (
                        <TableRow key={account.id} hover>
                          <TableCell>{account.bankName}</TableCell>
                          <TableCell>{account.accountNumber}</TableCell>
                          <TableCell>
                            <Chip
                              icon={getStatusIcon(account.status)}
                              label={account.status}
                              size="small"
                              color={getStatusColor(account.status)}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="View Details">
                              <IconButton size="small">
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Transaction Dialog */}
      <Dialog open={transactionDialog} onClose={() => setTransactionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {transactionForm.type === 'DEPOSIT' ? 'Make Deposit' : 'Make Withdrawal'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={transactionForm.amount}
                onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>UGX</Typography>,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Source Bank Account (Optional)</InputLabel>
                <Select
                  value={transactionForm.bankAccountId}
                  label="Source Bank Account (Optional)"
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, bankAccountId: e.target.value }))}
                >
                  <MenuItem value="">Direct Transaction</MenuItem>
                  {bankAccounts
                    .filter(account => account.status === 'APPROVED')
                    .map((account) => (
                      <MenuItem key={account.id} value={account.id}>
                        {account.bankName} - {account.accountNumber}
                      </MenuItem>
                    ))
                  }
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description (Optional)"
                multiline
                rows={2}
                value={transactionForm.description}
                onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransactionDialog(false)} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={handleTransaction}
            variant="contained"
            disabled={processing || !transactionForm.amount}
          >
            {processing ? 'Processing...' : `${transactionForm.type === 'DEPOSIT' ? 'Deposit' : 'Withdraw'}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bank Account Dialog */}
      <Dialog open={bankAccountDialog} onClose={() => setBankAccountDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Link Bank Account</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bank Name"
                value={bankAccountForm.bankName}
                onChange={(e) => setBankAccountForm(prev => ({ ...prev, bankName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Account Number"
                value={bankAccountForm.accountNumber}
                onChange={(e) => setBankAccountForm(prev => ({ ...prev, accountNumber: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Account Type</InputLabel>
                <Select
                  value={bankAccountForm.accountType}
                  label="Account Type"
                  onChange={(e) => setBankAccountForm(prev => ({ ...prev, accountType: e.target.value }))}
                >
                  <MenuItem value="CHECKING">Checking</MenuItem>
                  <MenuItem value="SAVINGS">Savings</MenuItem>
                  <MenuItem value="CURRENT">Current</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Account Holder Name"
                value={bankAccountForm.accountHolderName}
                onChange={(e) => setBankAccountForm(prev => ({ ...prev, accountHolderName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Routing Number (Optional)"
                value={bankAccountForm.routingNumber}
                onChange={(e) => setBankAccountForm(prev => ({ ...prev, routingNumber: e.target.value }))}
              />
            </Grid>
          </Grid>
          <Alert severity="info" sx={{ mt: 2 }}>
            Your bank account will need to be approved by a treasurer before you can use it for transactions.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBankAccountDialog(false)} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={handleAddBankAccount}
            variant="contained"
            disabled={processing || !bankAccountForm.bankName || !bankAccountForm.accountNumber || !bankAccountForm.accountHolderName}
          >
            {processing ? 'Adding...' : 'Add Bank Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}