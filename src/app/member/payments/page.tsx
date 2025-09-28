'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tabs,
  Tab,
  Divider,
  Pagination,
} from '@mui/material'
import {
  Payment as PaymentIcon,
  AccountBalance as BankIcon,
  CreditCard as CardIcon,
  Receipt as ReceiptIcon,
  History as HistoryIcon,
  Schedule as ScheduleIcon,
  CheckCircle as PaidIcon,
  Warning as OverdueIcon,
  Pending as PendingIcon,
  AttachMoney as MoneyIcon,
  Phone as PhoneIcon,
  Smartphone as SmartphoneIcon,
  AccountBalanceWallet as WalletIcon,
  CreditCardOutlined as DebitCardIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import PaymentModal from '@/components/PaymentModal'

interface LoanAccount {
  id: string
  accountNumber: string
  application: {
    loanType: string
    borrower: {
      firstName: string
      lastName: string
    }
  }
  currentBalance: number
  monthlyPayment: number
  nextPaymentDate: string
  interestRate: number
}

interface Payment {
  id: string
  amount: number
  principalAmount: number
  interestAmount: number
  status: string
  paymentMethod: string
  scheduledDate: string
  paidDate?: string
  transactionId?: string
}

interface PaymentSchedule {
  id: string
  installmentNumber: number
  dueDate: string
  principalAmount: number
  interestAmount: number
  totalAmount: number
  isPaid: boolean
  paidDate?: string
}

export default function PaymentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loanAccounts, setLoanAccounts] = useState<LoanAccount[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule[]>([])
  const [selectedLoan, setSelectedLoan] = useState<string>('')
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('MTN_MOBILE_MONEY')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [tabValue, setTabValue] = useState(0)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<LoanAccount | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalPayments, setTotalPayments] = useState(0)

  useEffect(() => {
    if (session?.user) {
      fetchData()
    }
  }, [session, currentPage])

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value)
  }

  const fetchData = async () => {
    try {
      const [loansResponse, paymentsResponse] = await Promise.all([
        fetch('/api/loan-accounts'),
        fetch(`/api/member/payments?page=${currentPage}&limit=10`)
      ])

      if (loansResponse.ok) {
        const loansData = await loansResponse.json()
        setLoanAccounts(Array.isArray(loansData) ? loansData : [])
        if (loansData.length > 0) {
          setSelectedLoan(loansData[0].id)
          setPaymentAmount(loansData[0].monthlyPayment.toString())
        }
      } else {
        console.error('Failed to fetch loan accounts:', loansResponse.status)
        setLoanAccounts([])
      }

      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json()
        // Handle paginated response - extract payments array
        setPayments(paymentsData.payments || paymentsData || [])
        setTotalPages(paymentsData.totalPages || 1)
        setTotalPayments(paymentsData.totalCount || paymentsData.length || 0)
      } else {
        console.error('Failed to fetch payments:', paymentsResponse.status)
        setPayments([])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoanAccounts([])
      setPayments([])
    } finally {
      setLoading(false)
    }
  }

  const fetchPaymentSchedule = async (loanAccountId: string) => {
    try {
      const response = await fetch(`/api/loan-accounts/${loanAccountId}/schedule`)
      if (response.ok) {
        const data = await response.json()
        setPaymentSchedule(data)
      }
    } catch (error) {
      console.error('Error fetching payment schedule:', error)
    }
  }

  const handleLoanChange = (loanId: string) => {
    setSelectedLoan(loanId)
    const loan = loanAccounts.find(l => l.id === loanId)
    if (loan) {
      setPaymentAmount(loan.monthlyPayment.toString())
    }
  }

  const handleOpenPaymentModal = (loan?: LoanAccount) => {
    const loanToUse = loan || selectedLoanAccount
    if (loanToUse) {
      setSelectedLoanForPayment(loanToUse)
      setPaymentModalOpen(true)
    }
  }

  const handlePaymentSuccess = () => {
    fetchData()
    setPaymentModalOpen(false)
  }

  const handleMakePayment = async () => {
    if (!selectedLoan || !paymentAmount) return

    // Build payment data based on payment method
    const paymentData: any = {
      loanAccountId: selectedLoan,
      amount: parseFloat(paymentAmount),
      paymentMethod: paymentMethod
    }

    // Add method-specific data
    if (paymentMethod === 'MTN_MOBILE_MONEY' || paymentMethod === 'AIRTEL_MONEY') {
      if (!phoneNumber) {
        alert('Please enter your phone number')
        return
      }
      paymentData.phoneNumber = phoneNumber
    } else if (paymentMethod === 'VISA_CARD' || paymentMethod === 'MASTERCARD') {
      if (!cardNumber || !cardName || !expiryDate || !cvv) {
        alert('Please fill in all card details')
        return
      }
      paymentData.cardDetails = {
        cardNumber: cardNumber.replace(/\s/g, ''), // Remove spaces
        cardName,
        expiryDate,
        cvv
      }
    } else if (paymentMethod === 'BANK_TRANSFER') {
      if (!bankAccount) {
        alert('Please enter your bank account number')
        return
      }
      paymentData.bankAccount = bankAccount
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/member/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      })

      if (response.ok) {
        await fetchData()
        setDialogOpen(true)

        // Reset form fields
        setPhoneNumber('')
        setCardNumber('')
        setCardName('')
        setExpiryDate('')
        setCvv('')
        setBankAccount('')
      } else {
        const errorData = await response.json()
        alert(`Payment failed: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error making payment:', error)
      alert('Payment failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'success'
      case 'pending':
        return 'warning'
      case 'overdue':
      case 'late':
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
      case 'late':
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

  const selectedLoanAccount = loanAccounts.find(l => l.id === selectedLoan)

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs />
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          <PaymentIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Payments
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Make payments and view your payment history
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Active Loans & Quick Payment */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <MoneyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Active Loans
              </Typography>

              {loanAccounts.length === 0 ? (
                <Alert severity="info">
                  No active loans found. You need an active loan to make payments.
                </Alert>
              ) : (
                <Grid container spacing={3}>
                  {loanAccounts.map((loan) => (
                    <Grid item xs={12} md={6} key={loan.id}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Box>
                              <Typography variant="subtitle1" fontWeight="medium">
                                {loan.accountNumber}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {loan.application.loanType} Loan
                              </Typography>
                            </Box>
                            <Chip
                              label="Active"
                              color="success"
                              size="small"
                            />
                          </Box>

                          <Divider sx={{ my: 2 }} />

                          <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="text.secondary">
                                Balance
                              </Typography>
                              <Typography variant="h6" color="primary">
                                {formatCurrency(loan.currentBalance)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="text.secondary">
                                Monthly Payment
                              </Typography>
                              <Typography variant="h6">
                                {formatCurrency(loan.monthlyPayment)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="text.secondary">
                                Next Due
                              </Typography>
                              <Typography variant="body2" fontWeight="medium">
                                {formatDate(loan.nextPaymentDate)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="text.secondary">
                                Interest Rate
                              </Typography>
                              <Typography variant="body2" fontWeight="medium">
                                {loan.interestRate}% APR
                              </Typography>
                            </Grid>
                          </Grid>

                          <Button
                            fullWidth
                            variant="contained"
                            startIcon={<PaymentIcon />}
                            onClick={() => handleOpenPaymentModal(loan)}
                          >
                            Make Payment
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>


        {/* Payment History */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Payment History
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<PaymentIcon />}
                  onClick={() => handleOpenPaymentModal()}
                  disabled={!selectedLoanAccount}
                >
                  Make Payment
                </Button>
              </Box>

              {payments.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <ReceiptIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No Payment History
                  </Typography>
                  <Typography color="text.secondary">
                    Your payment history will appear here once you make your first payment.
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Status</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell align="right">Principal</TableCell>
                        <TableCell align="right">Interest</TableCell>
                        <TableCell>Method</TableCell>
                        <TableCell>Transaction ID</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Array.isArray(payments) && payments.map((payment) => (
                        <TableRow key={payment.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getPaymentStatusIcon(payment.status)}
                              <Chip
                                label={payment.status.toLowerCase().replace('_', ' ')}
                                color={getStatusColor(payment.status) as any}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {payment.paidDate
                                ? formatDate(payment.paidDate)
                                : formatDate(payment.scheduledDate)
                              }
                            </Typography>
                            {payment.paidDate && payment.paidDate !== payment.scheduledDate && (
                              <Typography variant="caption" color="text.secondary">
                                Due: {formatDate(payment.scheduledDate)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="medium">
                              {formatCurrency(payment.amount)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {formatCurrency(payment.principalAmount)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {formatCurrency(payment.interestAmount)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {payment.paymentMethod === 'MTN_MOBILE_MONEY' && <PhoneIcon sx={{ color: '#FFCC00', fontSize: 16 }} />}
                              {payment.paymentMethod === 'AIRTEL_MONEY' && <PhoneIcon sx={{ color: '#FF0000', fontSize: 16 }} />}
                              {payment.paymentMethod.includes('CARD') && <CardIcon sx={{ fontSize: 16 }} />}
                              {payment.paymentMethod === 'BANK_TRANSFER' && <BankIcon sx={{ fontSize: 16 }} />}
                              <Typography variant="body2">
                                {payment.paymentMethod.replace('_', ' ')}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                              {payment.transactionId || '-'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}

              {totalPayments > 0 && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    Showing page {currentPage} of {totalPages} ({totalPayments} total payments)
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Payment Modal */}
      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        loanAccount={selectedLoanForPayment ? {
          id: selectedLoanForPayment.id,
          accountNumber: selectedLoanForPayment.accountNumber,
          currentBalance: selectedLoanForPayment.currentBalance,
          monthlyPayment: selectedLoanForPayment.monthlyPayment,
          nextPaymentDate: selectedLoanForPayment.nextPaymentDate
        } : undefined}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Payment Success Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PaidIcon color="success" sx={{ mr: 1 }} />
            Payment Submitted
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Your payment has been successfully submitted and is being processed.
            You will receive a confirmation email shortly.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}