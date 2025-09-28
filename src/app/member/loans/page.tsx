'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Pagination,
} from '@mui/material'
import {
  AccountBalance as LoanIcon,
  Visibility as ViewIcon,
  Payment as PaymentIcon,
  Schedule as ScheduleIcon,
  Assessment as StatsIcon,
  CheckCircle as PaidIcon,
  Warning as OverdueIcon,
  Pending as PendingIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  CalendarMonth as CalendarIcon,
  AccountBalanceWallet as WalletIcon,
  Info as InfoIcon,
  Launch as LaunchIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'

interface LoanApplication {
  id: string
  applicationNumber: string
  loanType: string
  requestedAmount: number
  approvedAmount?: number
  status: string
  submittedAt: string
  approvedAt?: string
  interestRate?: number
  termMonths: number
  loanAccount?: {
    id: string
    accountNumber: string
    currentBalance: number
    monthlyPayment: number
    nextPaymentDate: string
    totalPaid: number
  }
}

interface Payment {
  id: string
  amount: number
  principalAmount: number
  interestAmount: number
  status: string
  scheduledDate: string
  paidDate?: string
}

export default function LoansPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loans, setLoans] = useState<LoanApplication[]>([])
  const [selectedLoan, setSelectedLoan] = useState<LoanApplication | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [tabValue, setTabValue] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLoans, setTotalLoans] = useState(0)
  const loansPerPage = 6

  useEffect(() => {
    if (session?.user) {
      fetchLoans()
    }
  }, [session, currentPage])

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value)
  }

  const fetchLoans = async () => {
    try {
      const response = await fetch(`/api/member/loans?page=${currentPage}&limit=${loansPerPage}`)
      if (response.ok) {
        const data = await response.json()
        setLoans(Array.isArray(data.loans) ? data.loans : Array.isArray(data) ? data : [])
        setTotalPages(data.totalPages || 1)
        setTotalLoans(data.totalCount || data.length || 0)
      } else {
        console.error('Failed to fetch loans:', response.status)
        setLoans([])
      }
    } catch (error) {
      console.error('Error fetching loans:', error)
      setLoans([])
    } finally {
      setLoading(false)
    }
  }

  const fetchLoanDetails = async (loanId: string) => {
    try {
      const [paymentsResponse] = await Promise.all([
        fetch(`/api/member/loans/${loanId}/payments`)
      ])

      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json()
        setPayments(paymentsData)
      }
    } catch (error) {
      console.error('Error fetching loan details:', error)
    }
  }

  const handleViewLoan = (loan: LoanApplication) => {
    setSelectedLoan(loan)
    if (loan.loanAccount) {
      fetchLoanDetails(loan.id)
    }
    setDialogOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'approved':
        return 'success'
      case 'pending':
      case 'under_review':
      case 'submitted':
        return 'warning'
      case 'rejected':
      case 'defaulted':
        return 'error'
      case 'paid_off':
      case 'closed':
        return 'info'
      default:
        return 'default'
    }
  }

  const getLoanTypeColor = (loanType: string) => {
    switch (loanType) {
      case 'PERSONAL':
        return 'primary'
      case 'BUSINESS':
        return 'success'
      case 'MORTGAGE':
        return 'info'
      case 'AUTO':
        return 'warning'
      case 'STUDENT':
        return 'secondary'
      case 'PAYDAY':
        return 'error'
      default:
        return 'default'
    }
  }

  const getPaymentStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <PaidIcon color="success" />
      case 'overdue':
        return <OverdueIcon color="error" />
      default:
        return <PendingIcon color="warning" />
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
    return new Date(dateString).toLocaleDateString()
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

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs />
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          <LoanIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          My Loans
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          View and manage your loan applications and active loans
        </Typography>
      </Box>

      {loans.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <LoanIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No loans found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              You haven't applied for any loans yet. Start by creating a new loan application.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              size="large"
              onClick={() => router.push('/member/loan-application')}
            >
              Apply for a Loan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box>
          {/* Quick Stats */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'primary.50' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Total Applications
                      </Typography>
                      <Typography variant="h4" color="primary">
                        {loans.length}
                      </Typography>
                    </Box>
                    <StatsIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.7 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'success.50' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Active Loans
                      </Typography>
                      <Typography variant="h4" color="success.main">
                        {loans.filter(l => l.status === 'APPROVED' && l.loanAccount).length}
                      </Typography>
                    </Box>
                    <PaidIcon sx={{ fontSize: 48, color: 'success.main', opacity: 0.7 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'warning.50' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Under Review
                      </Typography>
                      <Typography variant="h4" color="warning.main">
                        {loans.filter(l => ['SUBMITTED', 'UNDER_REVIEW'].includes(l.status)).length}
                      </Typography>
                    </Box>
                    <PendingIcon sx={{ fontSize: 48, color: 'warning.main', opacity: 0.7 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'info.50' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Total Approved
                      </Typography>
                      <Typography variant="h4" color="info.main">
                        {formatCurrency(loans.filter(l => l.approvedAmount).reduce((sum, l) => sum + (l.approvedAmount || 0), 0))}
                      </Typography>
                    </Box>
                    <TrendingUpIcon sx={{ fontSize: 48, color: 'info.main', opacity: 0.7 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Apply for New Loan Button */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Your Loan Applications
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/member/loan-application')}
            >
              Apply for New Loan
            </Button>
          </Box>

          {/* Loan Cards */}
          <Grid container spacing={3}>
            {loans.map((loan) => (
              <Grid item xs={12} md={6} lg={4} key={loan.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s ease-in-out'
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                          {loan.applicationNumber}
                        </Typography>
                        <Chip
                          label={`${loan.loanType} Loan`}
                          color={getLoanTypeColor(loan.loanType) as any}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                      <Chip
                        label={loan.status.replace('_', ' ')}
                        color={getStatusColor(loan.status) as any}
                        size="small"
                        variant={loan.status === 'APPROVED' ? 'filled' : 'outlined'}
                      />
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Requested
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {formatCurrency(loan.requestedAmount)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          {loan.approvedAmount ? 'Approved' : 'Awaiting Approval'}
                        </Typography>
                        <Typography variant="h6" color={loan.approvedAmount ? 'success.main' : 'text.secondary'}>
                          {loan.approvedAmount ? formatCurrency(loan.approvedAmount) : 'Pending'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Applied
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {formatDate(loan.submittedAt)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Term
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {loan.termMonths} months
                        </Typography>
                      </Grid>
                    </Grid>

                    {loan.loanAccount && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                        <Typography variant="body2" color="success.main" fontWeight="medium" gutterBottom>
                          <WalletIcon sx={{ fontSize: 16, mr: 0.5 }} />
                          Active Loan Account
                        </Typography>
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Balance
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {formatCurrency(loan.loanAccount.currentBalance)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Next Payment
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {formatDate(loan.loanAccount.nextPaymentDate)}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                  </CardContent>

                  <Box sx={{ p: 2, pt: 0 }}>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Button
                          fullWidth
                          variant="outlined"
                          size="small"
                          startIcon={<ViewIcon />}
                          onClick={() => handleViewLoan(loan)}
                        >
                          View Details
                        </Button>
                      </Grid>
                      <Grid item xs={6}>
                        {loan.loanAccount ? (
                          <Button
                            fullWidth
                            variant="contained"
                            size="small"
                            startIcon={<PaymentIcon />}
                            onClick={() => router.push('/member/payments')}
                          >
                            Make Payment
                          </Button>
                        ) : (
                          <Button
                            fullWidth
                            variant="text"
                            size="small"
                            startIcon={<InfoIcon />}
                            disabled
                          >
                            {loan.status === 'SUBMITTED' ? 'Under Review' : 'Pending'}
                          </Button>
                        )}
                      </Grid>
                    </Grid>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
                size="large"
              />
            </Box>
          )}

          {totalLoans > 0 && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Showing page {currentPage} of {totalPages} ({totalLoans} total applications)
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Loan Details Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <LoanIcon sx={{ mr: 1 }} />
            Loan Details - {selectedLoan?.applicationNumber}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedLoan && (
            <Box>
              <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                <Tab label="Overview" />
                <Tab label="Payment Schedule" />
                <Tab label="Documents" />
              </Tabs>

              {tabValue === 0 && (
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            <StatsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Loan Information
                          </Typography>
                          <List dense>
                            <ListItem>
                              <ListItemText
                                primary="Loan Type"
                                secondary={
                                  <Chip
                                    label={selectedLoan.loanType}
                                    color={getLoanTypeColor(selectedLoan.loanType) as any}
                                    size="small"
                                    variant="filled"
                                    sx={{ mt: 0.5 }}
                                  />
                                }
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemText
                                primary="Requested Amount"
                                secondary={formatCurrency(selectedLoan.requestedAmount)}
                              />
                            </ListItem>
                            {selectedLoan.approvedAmount && (
                              <ListItem>
                                <ListItemText
                                  primary="Approved Amount"
                                  secondary={formatCurrency(selectedLoan.approvedAmount)}
                                />
                              </ListItem>
                            )}
                            <ListItem>
                              <ListItemText
                                primary="Term"
                                secondary={`${selectedLoan.termMonths} months`}
                              />
                            </ListItem>
                            {selectedLoan.interestRate && (
                              <ListItem>
                                <ListItemText
                                  primary="Interest Rate"
                                  secondary={`${selectedLoan.interestRate}%`}
                                />
                              </ListItem>
                            )}
                          </List>
                        </CardContent>
                      </Card>
                    </Grid>

                    {selectedLoan.loanAccount && (
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              <PaymentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                              Account Details
                            </Typography>
                            <List dense>
                              <ListItem>
                                <ListItemText
                                  primary="Account Number"
                                  secondary={selectedLoan.loanAccount.accountNumber}
                                />
                              </ListItem>
                              <ListItem>
                                <ListItemText
                                  primary="Current Balance"
                                  secondary={formatCurrency(selectedLoan.loanAccount.currentBalance)}
                                />
                              </ListItem>
                              <ListItem>
                                <ListItemText
                                  primary="Monthly Payment"
                                  secondary={formatCurrency(selectedLoan.loanAccount.monthlyPayment)}
                                />
                              </ListItem>
                              <ListItem>
                                <ListItemText
                                  primary="Next Payment Due"
                                  secondary={formatDate(selectedLoan.loanAccount.nextPaymentDate)}
                                />
                              </ListItem>
                              <ListItem>
                                <ListItemText
                                  primary="Total Paid"
                                  secondary={formatCurrency(selectedLoan.loanAccount.totalPaid)}
                                />
                              </ListItem>
                            </List>
                          </CardContent>
                        </Card>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}

              {tabValue === 1 && (
                <Box sx={{ mt: 2 }}>
                  {selectedLoan.loanAccount ? (
                    payments.length > 0 ? (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Status</TableCell>
                              <TableCell>Due Date</TableCell>
                              <TableCell>Amount</TableCell>
                              <TableCell>Principal</TableCell>
                              <TableCell>Interest</TableCell>
                              <TableCell>Paid Date</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {payments.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    {getPaymentStatusIcon(payment.status)}
                                    <Typography variant="body2" sx={{ ml: 1 }}>
                                      {payment.status}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>{formatDate(payment.scheduledDate)}</TableCell>
                                <TableCell>{formatCurrency(payment.amount)}</TableCell>
                                <TableCell>{formatCurrency(payment.principalAmount)}</TableCell>
                                <TableCell>{formatCurrency(payment.interestAmount)}</TableCell>
                                <TableCell>
                                  {payment.paidDate ? formatDate(payment.paidDate) : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Typography color="text.secondary">
                        No payment history available
                      </Typography>
                    )
                  ) : (
                    <Typography color="text.secondary">
                      Payment schedule not available - loan not yet disbursed
                    </Typography>
                  )}
                </Box>
              )}

              {tabValue === 2 && (
                <Box sx={{ mt: 2 }}>
                  <Typography color="text.secondary">
                    Document management feature coming soon
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
          {selectedLoan?.loanAccount && (
            <Button
              variant="contained"
              startIcon={<LaunchIcon />}
              onClick={() => {
                setDialogOpen(false)
                router.push('/member/payments')
              }}
            >
              Go to Payments
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}