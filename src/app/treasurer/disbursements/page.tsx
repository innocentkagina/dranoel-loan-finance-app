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
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material'
import {
  AccountBalance as BankIcon,
  CheckCircle as ApproveIcon,
  Visibility as ViewIcon,
  MonetizationOn as DisburseIcon,
  Person as PersonIcon,
  Assignment as ApplicationIcon,
  Payment as PaymentIcon,
  Schedule as ScheduleIcon,
  AttachMoney as AmountIcon,
  Notes as NotesIcon,
  AccountBalanceWallet as WalletIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'

interface ApprovedLoan {
  id: string
  applicationNumber: string
  borrowerName: string
  borrowerEmail: string
  borrowerId: string
  loanType: string
  approvedAmount: number
  requestedAmount: number
  interestRate: number
  termMonths: number
  monthlyPayment: number
  approvedAt: string
  purpose: string
  status: string
  isDisbursed: boolean
  loanAccount?: {
    id: string
    accountNumber: string
    createdAt: string
  }
}

interface DisbursementStats {
  totalApproved: number
  totalDisbursed: number
  pendingDisbursement: number
  totalDisbursedAmount: number
  averageAmount: number
}

export default function TreasurerDisbursementsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [approvedLoans, setApprovedLoans] = useState<ApprovedLoan[]>([])
  const [stats, setStats] = useState<DisbursementStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLoan, setSelectedLoan] = useState<ApprovedLoan | null>(null)
  const [disbursementDialog, setDisbursementDialog] = useState(false)
  const [disbursementForm, setDisbursementForm] = useState({
    amount: '',
    method: 'BANK_TRANSFER',
    notes: ''
  })
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (session?.user?.role === 'TREASURER') {
      fetchData()
    }
  }, [session])

  const fetchData = async () => {
    try {
      const [loansResponse, statsResponse] = await Promise.all([
        fetch('/api/treasurer/approved-loans'),
        fetch('/api/treasurer/disbursement-stats')
      ])

      if (loansResponse.ok) {
        const loansData = await loansResponse.json()
        setApprovedLoans(loansData)
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDisburseLoan = (loan: ApprovedLoan) => {
    setSelectedLoan(loan)
    setDisbursementForm({
      amount: loan.approvedAmount.toString(),
      method: 'BANK_TRANSFER',
      notes: ''
    })
    setDisbursementDialog(true)
  }

  const handleDisbursementSubmit = async () => {
    if (!selectedLoan) return

    setProcessing(true)
    try {
      const response = await fetch(`/api/loan-applications/${selectedLoan.id}/disburse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          disbursementAmount: parseFloat(disbursementForm.amount),
          disbursementMethod: disbursementForm.method,
          notes: disbursementForm.notes
        }),
      })

      if (response.ok) {
        // Refresh data
        await fetchData()
        setDisbursementDialog(false)
        setSelectedLoan(null)
      } else {
        const error = await response.json()
        console.error('Disbursement failed:', error)
      }
    } catch (error) {
      console.error('Error disbursing loan:', error)
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
      day: 'numeric'
    })
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

  const pendingLoans = approvedLoans.filter(loan => !loan.isDisbursed)
  const disbursedLoans = approvedLoans.filter(loan => loan.isDisbursed)

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs />

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          <DisburseIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Loan Disbursements
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Manage and process approved loan disbursements
        </Typography>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ bgcolor: 'primary.50' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total Approved
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {stats.totalApproved}
                    </Typography>
                  </Box>
                  <ApplicationIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ bgcolor: 'warning.50' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Pending Disbursement
                    </Typography>
                    <Typography variant="h4" color="warning.main">
                      {stats.pendingDisbursement}
                    </Typography>
                  </Box>
                  <ScheduleIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ bgcolor: 'success.50' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Disbursed
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {stats.totalDisbursed}
                    </Typography>
                  </Box>
                  <ApproveIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ bgcolor: 'info.50' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total Amount
                    </Typography>
                    <Typography variant="h6" color="info.main">
                      {formatCurrency(stats.totalDisbursedAmount)}
                    </Typography>
                  </Box>
                  <AmountIcon sx={{ fontSize: 40, color: 'info.main', opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ bgcolor: 'secondary.50' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Average Amount
                    </Typography>
                    <Typography variant="h6" color="secondary.main">
                      {formatCurrency(stats.averageAmount)}
                    </Typography>
                  </Box>
                  <WalletIcon sx={{ fontSize: 40, color: 'secondary.main', opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Pending Disbursements */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Badge badgeContent={pendingLoans.length} color="warning">
              <ScheduleIcon sx={{ mr: 1, color: 'warning.main' }} />
            </Badge>
            <Typography variant="h6">
              Pending Disbursements
            </Typography>
          </Box>

          {pendingLoans.length === 0 ? (
            <Alert severity="success">
              No pending disbursements. All approved loans have been disbursed.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Application</TableCell>
                    <TableCell>Borrower</TableCell>
                    <TableCell>Loan Type</TableCell>
                    <TableCell align="right">Approved Amount</TableCell>
                    <TableCell align="right">Monthly Payment</TableCell>
                    <TableCell>Approved Date</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingLoans.map((loan) => (
                    <TableRow key={loan.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {loan.applicationNumber}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {loan.purpose}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {loan.borrowerName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {loan.borrowerEmail}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={loan.loanType}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(loan.approvedAmount)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {loan.termMonths} months @ {loan.interestRate}%
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(loan.monthlyPayment)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(loan.approvedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Disburse Loan">
                          <IconButton
                            color="primary"
                            onClick={() => handleDisburseLoan(loan)}
                            size="small"
                          >
                            <DisburseIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Already Disbursed Loans */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Badge badgeContent={disbursedLoans.length} color="success">
              <ApproveIcon sx={{ mr: 1, color: 'success.main' }} />
            </Badge>
            <Typography variant="h6">
              Already Disbursed Loans
            </Typography>
          </Box>

          {disbursedLoans.length === 0 ? (
            <Alert severity="info">
              No loans have been disbursed yet.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Application</TableCell>
                    <TableCell>Borrower</TableCell>
                    <TableCell>Loan Type</TableCell>
                    <TableCell align="right">Disbursed Amount</TableCell>
                    <TableCell align="right">Monthly Payment</TableCell>
                    <TableCell>Account Number</TableCell>
                    <TableCell>Disbursed Date</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {disbursedLoans.map((loan) => (
                    <TableRow key={loan.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {loan.applicationNumber}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {loan.purpose}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {loan.borrowerName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {loan.borrowerEmail}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={loan.loanType}
                          size="small"
                          variant="outlined"
                          color="success"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(loan.approvedAmount)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {loan.termMonths} months @ {loan.interestRate}%
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(loan.monthlyPayment)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {loan.loanAccount?.accountNumber}
                          </Typography>
                          <Chip
                            label="ACTIVE"
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {loan.loanAccount?.createdAt ? formatDate(loan.loanAccount.createdAt) : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Loan Account">
                          <IconButton
                            color="primary"
                            onClick={() => router.push(`/treasurer/loans/${loan.loanAccount?.id}`)}
                            size="small"
                          >
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
        </CardContent>
      </Card>

      {/* Disbursement Dialog */}
      <Dialog
        open={disbursementDialog}
        onClose={() => setDisbursementDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DisburseIcon sx={{ mr: 1 }} />
            Disburse Loan - {selectedLoan?.applicationNumber}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedLoan && (
            <Box sx={{ mt: 2 }}>
              {/* Loan Summary */}
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Loan Summary
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Borrower
                      </Typography>
                      <Typography variant="body1">
                        {selectedLoan.borrowerName}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Loan Type
                      </Typography>
                      <Typography variant="body1">
                        {selectedLoan.loanType}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Approved Amount
                      </Typography>
                      <Typography variant="body1" color="primary.main" fontWeight="medium">
                        {formatCurrency(selectedLoan.approvedAmount)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Monthly Payment
                      </Typography>
                      <Typography variant="body1">
                        {formatCurrency(selectedLoan.monthlyPayment)}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Disbursement Form */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Disbursement Amount"
                    type="number"
                    value={disbursementForm.amount}
                    onChange={(e) => setDisbursementForm(prev => ({
                      ...prev,
                      amount: e.target.value
                    }))}
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>UGX</Typography>,
                    }}
                    helperText={`Maximum: ${formatCurrency(selectedLoan.approvedAmount)}`}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Disbursement Method</InputLabel>
                    <Select
                      value={disbursementForm.method}
                      label="Disbursement Method"
                      onChange={(e) => setDisbursementForm(prev => ({
                        ...prev,
                        method: e.target.value
                      }))}
                    >
                      <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                      <MenuItem value="MOBILE_MONEY">Mobile Money</MenuItem>
                      <MenuItem value="CASH">Cash</MenuItem>
                      <MenuItem value="CHECK">Check</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Disbursement Notes"
                    multiline
                    rows={3}
                    value={disbursementForm.notes}
                    onChange={(e) => setDisbursementForm(prev => ({
                      ...prev,
                      notes: e.target.value
                    }))}
                    placeholder="Add any notes about the disbursement..."
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDisbursementDialog(false)}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDisbursementSubmit}
            variant="contained"
            disabled={processing || !disbursementForm.amount}
            startIcon={processing ? undefined : <DisburseIcon />}
          >
            {processing ? 'Processing...' : 'Disburse Loan'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}