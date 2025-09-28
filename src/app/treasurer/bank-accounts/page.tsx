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
  IconButton,
  Tooltip,
  Tab,
  Tabs,
  Badge,
} from '@mui/material'
import {
  AccountBalance as BankIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Schedule as PendingIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'

interface BankAccount {
  id: string
  bankName: string
  accountNumber: string
  accountType: string
  accountHolderName: string
  status: string
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
  savingsAccount?: {
    accountNumber: string
    balance: number
    status: string
  }
}

export default function TreasurerBankAccountsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [tabValue, setTabValue] = useState(0)
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null)
  const [approvalDialog, setApprovalDialog] = useState(false)
  const [rejectionDialog, setRejectionDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (session?.user?.role === 'TREASURER') {
      fetchBankAccounts()
    }
  }, [session, tabValue])

  const fetchBankAccounts = async () => {
    try {
      const statusParam = tabValue === 0 ? 'PENDING' : tabValue === 1 ? 'APPROVED' : 'REJECTED'
      const response = await fetch(`/api/treasurer/bank-accounts?status=${statusParam}`)

      if (response.ok) {
        const data = await response.json()
        setBankAccounts(data.bankAccounts)
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedAccount) return

    setProcessing(true)
    try {
      const response = await fetch(`/api/treasurer/bank-accounts/${selectedAccount.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'approve' })
      })

      if (response.ok) {
        await fetchBankAccounts()
        setApprovalDialog(false)
        setSelectedAccount(null)
      } else {
        const error = await response.json()
        console.error('Approval failed:', error)
      }
    } catch (error) {
      console.error('Error approving bank account:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedAccount || !rejectionReason) return

    setProcessing(true)
    try {
      const response = await fetch(`/api/treasurer/bank-accounts/${selectedAccount.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reject',
          rejectionReason
        })
      })

      if (response.ok) {
        await fetchBankAccounts()
        setRejectionDialog(false)
        setSelectedAccount(null)
        setRejectionReason('')
      } else {
        const error = await response.json()
        console.error('Rejection failed:', error)
      }
    } catch (error) {
      console.error('Error rejecting bank account:', error)
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

  const getTabLabel = (status: string, count: number) => {
    return (
      <Badge badgeContent={count} color={status === 'PENDING' ? 'warning' : 'default'}>
        {status}
      </Badge>
    )
  }

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    )
  }

  if (!session || session.user.role !== 'TREASURER') {
    router.push('/auth/signin')
    return null
  }

  const pendingCount = bankAccounts.filter(acc => acc.status === 'PENDING').length

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs />

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          <BankIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Bank Account Management
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Review and approve member bank account linking requests
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: 'warning.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Pending Approval
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {bankAccounts.filter(acc => acc.status === 'PENDING').length}
                  </Typography>
                </Box>
                <PendingIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: 'success.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Approved
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {bankAccounts.filter(acc => acc.status === 'APPROVED').length}
                  </Typography>
                </Box>
                <ApproveIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: 'error.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Rejected
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {bankAccounts.filter(acc => acc.status === 'REJECTED').length}
                  </Typography>
                </Box>
                <RejectIcon sx={{ fontSize: 40, color: 'error.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab
              label={
                <Badge badgeContent={bankAccounts.filter(acc => acc.status === 'PENDING').length} color="warning">
                  Pending
                </Badge>
              }
            />
            <Tab label="Approved" />
            <Tab label="Rejected" />
          </Tabs>
        </Box>

        <CardContent>
          {bankAccounts.length === 0 ? (
            <Alert severity="info">
              No bank accounts found for this status.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Member</TableCell>
                    <TableCell>Bank Details</TableCell>
                    <TableCell>Account Holder</TableCell>
                    <TableCell>Savings Account</TableCell>
                    <TableCell>Submitted</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bankAccounts.map((account) => (
                    <TableRow key={account.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {account.user.firstName} {account.user.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              <EmailIcon sx={{ fontSize: 12, mr: 0.5 }} />
                              {account.user.email}
                            </Typography>
                            {account.user.phone && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                <PhoneIcon sx={{ fontSize: 12, mr: 0.5 }} />
                                {account.user.phone}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {account.bankName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {account.accountNumber}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {account.accountType}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {account.accountHolderName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {account.savingsAccount ? (
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {account.savingsAccount.accountNumber}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Balance: {formatCurrency(account.savingsAccount.balance)}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            No savings account
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(account.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={account.status}
                          size="small"
                          color={getStatusColor(account.status)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => setSelectedAccount(account)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          {account.status === 'PENDING' && (
                            <>
                              <Tooltip title="Approve">
                                <IconButton
                                  color="success"
                                  size="small"
                                  onClick={() => {
                                    setSelectedAccount(account)
                                    setApprovalDialog(true)
                                  }}
                                >
                                  <ApproveIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton
                                  color="error"
                                  size="small"
                                  onClick={() => {
                                    setSelectedAccount(account)
                                    setRejectionDialog(true)
                                  }}
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
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)}>
        <DialogTitle>Approve Bank Account</DialogTitle>
        <DialogContent>
          {selectedAccount && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Are you sure you want to approve this bank account?
              </Typography>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" fontWeight="medium">
                  Member: {selectedAccount.user.firstName} {selectedAccount.user.lastName}
                </Typography>
                <Typography variant="body2">
                  Bank: {selectedAccount.bankName}
                </Typography>
                <Typography variant="body2">
                  Account: {selectedAccount.accountNumber}
                </Typography>
                <Typography variant="body2">
                  Holder: {selectedAccount.accountHolderName}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(false)} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            variant="contained"
            color="success"
            disabled={processing}
          >
            {processing ? 'Approving...' : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialog} onClose={() => setRejectionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Bank Account</DialogTitle>
        <DialogContent>
          {selectedAccount && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Please provide a reason for rejecting this bank account:
              </Typography>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                <Typography variant="body2" fontWeight="medium">
                  Member: {selectedAccount.user.firstName} {selectedAccount.user.lastName}
                </Typography>
                <Typography variant="body2">
                  Bank: {selectedAccount.bankName}
                </Typography>
                <Typography variant="body2">
                  Account: {selectedAccount.accountNumber}
                </Typography>
              </Box>
              <TextField
                fullWidth
                label="Rejection Reason"
                multiline
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please explain why this bank account cannot be approved..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectionDialog(false)} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={handleReject}
            variant="contained"
            color="error"
            disabled={processing || !rejectionReason}
          >
            {processing ? 'Rejecting...' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}