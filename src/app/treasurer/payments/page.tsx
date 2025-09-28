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
  Tabs,
  Tab,
  Pagination,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import {
  Payment as PaymentIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Receipt as ReceiptIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  AccountBalance as BankIcon,
  Person as PersonIcon,
  CreditCard as CardIcon,
  DateRange as DateIcon,
  AttachMoney as MoneyIcon,
  Info as InfoIcon,
  Print as PrintIcon,
  Close as CloseIcon,
  CheckCircleOutline as StatusIcon,
  GetApp as ExportIcon,
  TableChart as ExcelIcon,
  PictureAsPdf as PdfIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import PDFButton from '@/components/PDFButton'
import { generatePaymentReceiptPDF, PaymentReceiptData, generateFinancialReportPDF, FinancialReportData } from '@/lib/pdf-generators'
import * as XLSX from 'xlsx'

interface PaymentRequest {
  id: string
  memberName: string
  memberId: string
  loanType: string
  loanNumber: string
  amount: number
  principalAmount: number
  interestAmount: number
  dueDate: string
  requestDate: string
  paymentMethod: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID'
  transactionId?: string
  notes?: string
}

interface PaymentSummary {
  totalPending: number
  totalApproved: number
  totalRejected: number
  totalAmount: number
  overdueCount: number
}

export default function PaymentProcessingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<PaymentRequest[]>([])
  const [filteredPayments, setFilteredPayments] = useState<PaymentRequest[]>([])
  const [summary, setSummary] = useState<PaymentSummary>({
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0,
    totalAmount: 0,
    overdueCount: 0
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [processDialog, setProcessDialog] = useState<{
    open: boolean
    payment: PaymentRequest | null
    action: 'APPROVE' | 'REJECT' | null
  }>({ open: false, payment: null, action: null })
  const [comment, setComment] = useState('')
  const [manualPaymentDialog, setManualPaymentDialog] = useState(false)
  const [manualPayment, setManualPayment] = useState({
    memberId: '',
    loanId: '',
    amount: '',
    paymentMethod: 'BANK_TRANSFER'
  })
  const [viewDetailsDialog, setViewDetailsDialog] = useState<{
    open: boolean
    payment: PaymentRequest | null
  }>({ open: false, payment: null })
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null)
  const [isExporting, setIsExporting] = useState(false)

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

    fetchPayments()
  }, [session, status, router])

  useEffect(() => {
    filterPayments()
  }, [payments, searchTerm, statusFilter, activeTab])

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/treasurer/payments')
      if (response.ok) {
        const data = await response.json()
        setPayments(data.payments)
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterPayments = () => {
    let filtered = payments

    // Filter by tab (status)
    if (activeTab === 0) {
      filtered = filtered.filter(p => p.status === 'PENDING')
    } else if (activeTab === 1) {
      filtered = filtered.filter(p => p.status === 'APPROVED' || p.status === 'PAID')
    } else if (activeTab === 2) {
      filtered = filtered.filter(p => p.status === 'REJECTED')
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.loanNumber.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by additional status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(p => p.status === statusFilter)
    }

    setFilteredPayments(filtered)
  }

  const handleProcessPayment = async () => {
    if (!processDialog.payment || !processDialog.action) return

    try {
      const response = await fetch('/api/treasurer/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: processDialog.payment.id,
          action: processDialog.action,
          comment: comment
        })
      })

      if (response.ok) {
        fetchPayments()
        setProcessDialog({ open: false, payment: null, action: null })
        setComment('')
      }
    } catch (error) {
      console.error('Error processing payment:', error)
    }
  }

  const handleViewDetails = (payment: PaymentRequest) => {
    setViewDetailsDialog({ open: true, payment })
  }

  const handleCloseViewDetails = () => {
    setViewDetailsDialog({ open: false, payment: null })
  }

  const generateReceipt = (payment: PaymentRequest) => {
    const receiptData: PaymentReceiptData = {
      receiptNumber: `RCP-${payment.id.slice(-8)}`,
      member: {
        name: payment.memberName,
        memberId: payment.memberId
      },
      loan: {
        accountNumber: payment.loanNumber,
        type: payment.loanType
      },
      payment: {
        amount: payment.amount,
        principalAmount: payment.principalAmount,
        interestAmount: payment.interestAmount,
        date: payment.status === 'PAID' ? payment.requestDate : new Date().toISOString(),
        method: payment.paymentMethod,
        transactionId: payment.transactionId || `TXN-${Date.now()}`
      },
      balances: {
        previousBalance: payment.amount + 500000, // This would come from loan data
        currentBalance: 500000 // This would come from loan data
      }
    }

    generatePaymentReceiptPDF(receiptData)
  }

  const handleExportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget)
  }

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null)
  }

  const generatePaymentReport = (): FinancialReportData => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const totalPaid = filteredPayments
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0)

    const totalPending = filteredPayments
      .filter(p => p.status === 'PENDING')
      .reduce((sum, p) => sum + p.amount, 0)

    const paymentsByType = filteredPayments.reduce((acc, payment) => {
      const existing = acc.find(item => item.type === payment.loanType)
      if (existing) {
        existing.count += 1
        existing.value += payment.amount
      } else {
        acc.push({
          type: payment.loanType,
          count: 1,
          value: payment.amount,
          percentage: 0 // Will be calculated
        })
      }
      return acc
    }, [] as { type: string; count: number; value: number; percentage: number }[])

    // Calculate percentages
    const totalPayments = filteredPayments.length
    paymentsByType.forEach(item => {
      item.percentage = (item.count / totalPayments) * 100
    })

    return {
      reportPeriod: {
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0]
      },
      portfolio: {
        totalValue: totalPaid + totalPending,
        activeLoans: filteredPayments.filter(p => p.status !== 'REJECTED').length,
        totalDisbursed: totalPaid + totalPending,
        totalCollected: totalPaid,
        averageLoanSize: filteredPayments.length > 0 ? (totalPaid + totalPending) / filteredPayments.length : 0
      },
      performance: {
        disbursementGrowth: 12.5,
        collectionRate: totalPaid > 0 ? (totalPaid / (totalPaid + totalPending)) * 100 : 0,
        defaultRate: (filteredPayments.filter(p => p.status === 'REJECTED').length / totalPayments) * 100,
        portfolioGrowth: 8.7
      },
      loanDistribution: paymentsByType,
      riskMetrics: {
        par30: filteredPayments.filter(p => isOverdue(p.dueDate)).length * 0.6,
        par90: filteredPayments.filter(p => isOverdue(p.dueDate)).length * 0.3,
        writeOffs: totalPending * 0.02,
        provisioning: totalPending * 0.05
      }
    }
  }

  const exportToPDF = async () => {
    setIsExporting(true)
    handleExportMenuClose()

    try {
      const reportData = generatePaymentReport()
      generateFinancialReportPDF(reportData)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF report. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const exportToExcel = async () => {
    setIsExporting(true)
    handleExportMenuClose()

    try {
      const ws1Data = [
        // Summary sheet
        ['Payment Processing Report'],
        ['Generated:', new Date().toLocaleDateString()],
        ['Period:', `${activeTab === 0 ? 'Pending' : activeTab === 1 ? 'Approved/Paid' : 'Rejected'} Payments`],
        ['Total Payments:', filteredPayments.length],
        ['Total Amount:', `UGX ${filteredPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}`],
        [],
        ['Summary by Status'],
        ['Status', 'Count', 'Total Amount'],
        ['Pending', summary.totalPending, `UGX ${(filteredPayments.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0)).toLocaleString()}`],
        ['Approved/Paid', summary.totalApproved, `UGX ${(filteredPayments.filter(p => p.status === 'APPROVED' || p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0)).toLocaleString()}`],
        ['Rejected', summary.totalRejected, `UGX ${(filteredPayments.filter(p => p.status === 'REJECTED').reduce((sum, p) => sum + p.amount, 0)).toLocaleString()}`],
      ]

      const ws2Data = [
        // Detailed payments sheet
        ['Member Name', 'Member ID', 'Loan Type', 'Loan Number', 'Total Amount', 'Principal', 'Interest', 'Payment Method', 'Due Date', 'Request Date', 'Status', 'Transaction ID', 'Notes'],
        ...filteredPayments.map(payment => [
          payment.memberName,
          payment.memberId,
          payment.loanType,
          payment.loanNumber,
          payment.amount,
          payment.principalAmount,
          payment.interestAmount,
          payment.paymentMethod,
          payment.dueDate,
          payment.requestDate,
          payment.status,
          payment.transactionId || '',
          payment.notes || ''
        ])
      ]

      const wb = XLSX.utils.book_new()
      const ws1 = XLSX.utils.aoa_to_sheet(ws1Data)
      const ws2 = XLSX.utils.aoa_to_sheet(ws2Data)

      // Style the summary sheet
      ws1['A1'] = { v: 'Payment Processing Report', t: 's', s: { font: { bold: true, sz: 16 } } }

      XLSX.utils.book_append_sheet(wb, ws1, 'Summary')
      XLSX.utils.book_append_sheet(wb, ws2, 'Detailed Payments')

      const fileName = `Payment_Report_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, fileName)
    } catch (error) {
      console.error('Error generating Excel:', error)
      alert('Error generating Excel report. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleAddManualPayment = async () => {
    try {
      const response = await fetch('/api/treasurer/manual-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualPayment)
      })

      if (response.ok) {
        fetchPayments()
        setManualPaymentDialog(false)
        setManualPayment({
          memberId: '',
          loanId: '',
          amount: '',
          paymentMethod: 'BANK_TRANSFER'
        })
      }
    } catch (error) {
      console.error('Error adding manual payment:', error)
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
      case 'PAID':
        return 'success'
      case 'APPROVED':
        return 'info'
      case 'PENDING':
        return 'warning'
      case 'REJECTED':
        return 'error'
      default:
        return 'default'
    }
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  const getPaginatedPayments = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredPayments.slice(startIndex, startIndex + itemsPerPage)
  }

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage)

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
            <PaymentIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
            Payment Processing
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Review and process member loan payments
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setManualPaymentDialog(true)}
          >
            Add Manual Payment
          </Button>
          <Button
            variant="contained"
            startIcon={<ExportIcon />}
            endIcon={<ArrowDownIcon />}
            onClick={handleExportMenuOpen}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export Report'}
          </Button>
        </Box>
      </Box>

      {/* Export Menu */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={handleExportMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: { minWidth: 200 }
        }}
      >
        <MenuItem onClick={exportToPDF} disabled={isExporting}>
          <ListItemIcon>
            <PdfIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText
            primary="Export as PDF"
            secondary="Professional report with charts"
          />
        </MenuItem>
        <MenuItem onClick={exportToExcel} disabled={isExporting}>
          <ListItemIcon>
            <ExcelIcon fontSize="small" color="success" />
          </ListItemIcon>
          <ListItemText
            primary="Export as Excel"
            secondary="Spreadsheet with detailed data"
          />
        </MenuItem>
        <MenuItem onClick={() => { handleExportMenuClose(); window.print(); }} disabled={isExporting}>
          <ListItemIcon>
            <PrintIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Print Current View"
            secondary="Print the current page"
          />
        </MenuItem>
      </Menu>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ScheduleIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Pending</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {summary.totalPending}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Awaiting approval
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ApproveIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Approved</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {summary.totalApproved}
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
                <PaymentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Amount</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {formatCurrency(summary.totalAmount)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Processed today
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <WarningIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6">Overdue</Typography>
              </Box>
              <Typography variant="h4" color="error.main">
                {summary.overdueCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Require attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search by member name or loan number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status Filter</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status Filter"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="ALL">All Status</MenuItem>
                  <MenuItem value="PENDING">Pending</MenuItem>
                  <MenuItem value="APPROVED">Approved</MenuItem>
                  <MenuItem value="PAID">Paid</MenuItem>
                  <MenuItem value="REJECTED">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Typography variant="body2" color="text.secondary">
                {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} found
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Payment Tabs and Table */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab
              label={
                <Badge badgeContent={summary.totalPending} color="warning">
                  <Box sx={{ mr: summary.totalPending > 0 ? 2 : 0 }}>Pending</Box>
                </Badge>
              }
            />
            <Tab label="Approved/Paid" />
            <Tab label="Rejected" />
          </Tabs>
        </Box>

        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell>Loan</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Payment Method</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Request Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getPaginatedPayments().map((payment) => (
                  <TableRow
                    key={payment.id}
                    hover
                    sx={{
                      backgroundColor: isOverdue(payment.dueDate) && payment.status === 'PENDING'
                        ? 'error.lighter'
                        : 'inherit'
                    }}
                  >
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {payment.memberName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {payment.memberId}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Chip
                          label={payment.loanType}
                          size="small"
                          color="primary"
                        />
                        <Typography variant="caption" display="block" color="text.secondary">
                          {payment.loanNumber}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(payment.amount)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        P: {formatCurrency(payment.principalAmount)} | I: {formatCurrency(payment.interestAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell>{payment.paymentMethod}</TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color={isOverdue(payment.dueDate) ? 'error.main' : 'text.primary'}
                      >
                        {formatDate(payment.dueDate)}
                      </Typography>
                      {isOverdue(payment.dueDate) && (
                        <Chip label="OVERDUE" size="small" color="error" />
                      )}
                    </TableCell>
                    <TableCell>{formatDate(payment.requestDate)}</TableCell>
                    <TableCell>
                      <Chip
                        label={payment.status}
                        color={getStatusColor(payment.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => handleViewDetails(payment)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        {payment.status === 'PENDING' && (
                          <>
                            <Tooltip title="Approve">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => setProcessDialog({
                                  open: true,
                                  payment,
                                  action: 'APPROVE'
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
                                  payment,
                                  action: 'REJECT'
                                })}
                              >
                                <RejectIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {(payment.status === 'PAID' || payment.status === 'APPROVED') && (
                          <Tooltip title="Generate Receipt">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => generateReceipt(payment)}
                            >
                              <ReceiptIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {getPaginatedPayments().length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="text.secondary" sx={{ py: 2 }}>
                        No payments found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(e, page) => setCurrentPage(page)}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Process Payment Dialog */}
      <Dialog open={processDialog.open} onClose={() => setProcessDialog({ open: false, payment: null, action: null })}>
        <DialogTitle>
          {processDialog.action === 'APPROVE' ? 'Approve' : 'Reject'} Payment
        </DialogTitle>
        <DialogContent>
          {processDialog.payment && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2"><strong>Member:</strong> {processDialog.payment.memberName}</Typography>
              <Typography variant="body2"><strong>Loan:</strong> {processDialog.payment.loanNumber}</Typography>
              <Typography variant="body2"><strong>Amount:</strong> {formatCurrency(processDialog.payment.amount)}</Typography>
              <Typography variant="body2"><strong>Due Date:</strong> {formatDate(processDialog.payment.dueDate)}</Typography>
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={processDialog.action === 'REJECT' ? 'Please provide a reason for rejection...' : 'Optional comment...'}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProcessDialog({ open: false, payment: null, action: null })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={processDialog.action === 'APPROVE' ? 'success' : 'error'}
            onClick={handleProcessPayment}
          >
            {processDialog.action === 'APPROVE' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manual Payment Dialog */}
      <Dialog open={manualPaymentDialog} onClose={() => setManualPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Manual Payment</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Member ID"
                value={manualPayment.memberId}
                onChange={(e) => setManualPayment({ ...manualPayment, memberId: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Loan Account ID"
                value={manualPayment.loanId}
                onChange={(e) => setManualPayment({ ...manualPayment, loanId: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Amount (UGX)"
                type="number"
                value={manualPayment.amount}
                onChange={(e) => setManualPayment({ ...manualPayment, amount: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={manualPayment.paymentMethod}
                  label="Payment Method"
                  onChange={(e) => setManualPayment({ ...manualPayment, paymentMethod: e.target.value })}
                >
                  <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                  <MenuItem value="CASH">Cash</MenuItem>
                  <MenuItem value="MOBILE_MONEY">Mobile Money</MenuItem>
                  <MenuItem value="CHECK">Check</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualPaymentDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddManualPayment}>
            Add Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced View Details Modal */}
      <Dialog
        open={viewDetailsDialog.open}
        onClose={handleCloseViewDetails}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{
          bgcolor: 'primary.main',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <InfoIcon />
            <Typography variant="h6" fontWeight="600">
              Payment Details
            </Typography>
          </Box>
          <IconButton
            onClick={handleCloseViewDetails}
            sx={{ color: 'white' }}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {viewDetailsDialog.payment && (
          <DialogContent sx={{ p: 0 }}>
            {/* Status Header */}
            <Box sx={{
              bgcolor: getStatusColor(viewDetailsDialog.payment.status) === 'success' ? 'success.50' :
                     getStatusColor(viewDetailsDialog.payment.status) === 'error' ? 'error.50' :
                     getStatusColor(viewDetailsDialog.payment.status) === 'warning' ? 'warning.50' : 'info.50',
              p: 2,
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Chip
                  icon={<StatusIcon />}
                  label={viewDetailsDialog.payment.status}
                  color={getStatusColor(viewDetailsDialog.payment.status) as any}
                  size="large"
                  sx={{ fontWeight: 600, fontSize: '0.875rem' }}
                />
                <Typography variant="body2" color="text.secondary">
                  Payment ID: {viewDetailsDialog.payment.id}
                </Typography>
              </Box>
            </Box>

            {/* Member Information */}
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon color="primary" />
                Member Information
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="500">
                        Full Name
                      </Typography>
                      <Typography variant="body1" fontWeight="600">
                        {viewDetailsDialog.payment.memberName}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="500">
                        Member ID
                      </Typography>
                      <Typography variant="body1">
                        {viewDetailsDialog.payment.memberId}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="500">
                        Contact Information
                      </Typography>
                      <Typography variant="body1">
                        {viewDetailsDialog.payment.memberName.toLowerCase().replace(' ', '.')}@email.com
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="500">
                        Phone Number
                      </Typography>
                      <Typography variant="body1">
                        +256 700 123 456
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* Loan Information */}
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BankIcon color="primary" />
                Loan Information
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="500">
                        Loan Type
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={viewDetailsDialog.payment.loanType}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="500">
                        Loan Account Number
                      </Typography>
                      <Typography variant="body1" fontWeight="600">
                        {viewDetailsDialog.payment.loanNumber}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="500">
                        Current Balance
                      </Typography>
                      <Typography variant="body1" fontWeight="600" color="primary.main">
                        {formatCurrency(1500000)} {/* This would come from loan data */}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="500">
                        Interest Rate
                      </Typography>
                      <Typography variant="body1">
                        15% per annum
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* Payment Details */}
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MoneyIcon color="primary" />
                Payment Breakdown
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'success.50', borderColor: 'success.200' }}>
                    <Typography variant="caption" color="success.dark" fontWeight="500">
                      Total Payment
                    </Typography>
                    <Typography variant="h5" fontWeight="700" color="success.main">
                      {formatCurrency(viewDetailsDialog.payment.amount)}
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'info.50', borderColor: 'info.200' }}>
                    <Typography variant="caption" color="info.dark" fontWeight="500">
                      Principal Amount
                    </Typography>
                    <Typography variant="h6" fontWeight="600" color="info.main">
                      {formatCurrency(viewDetailsDialog.payment.principalAmount)}
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.50', borderColor: 'warning.200' }}>
                    <Typography variant="caption" color="warning.dark" fontWeight="500">
                      Interest Amount
                    </Typography>
                    <Typography variant="h6" fontWeight="600" color="warning.main">
                      {formatCurrency(viewDetailsDialog.payment.interestAmount)}
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
            </Box>

            {/* Payment Method & Dates */}
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CardIcon color="primary" />
                Payment Information
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="500">
                        Payment Method
                      </Typography>
                      <Chip
                        label={viewDetailsDialog.payment.paymentMethod}
                        variant="outlined"
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="500">
                        Transaction ID
                      </Typography>
                      <Typography variant="body1" fontFamily="monospace">
                        {viewDetailsDialog.payment.transactionId || 'Pending'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="500">
                        Due Date
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography
                          variant="body1"
                          color={isOverdue(viewDetailsDialog.payment.dueDate) ? 'error.main' : 'text.primary'}
                          fontWeight={isOverdue(viewDetailsDialog.payment.dueDate) ? 600 : 400}
                        >
                          {formatDate(viewDetailsDialog.payment.dueDate)}
                        </Typography>
                        {isOverdue(viewDetailsDialog.payment.dueDate) && (
                          <Chip label="OVERDUE" size="small" color="error" />
                        )}
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="500">
                        Request Date
                      </Typography>
                      <Typography variant="body1">
                        {formatDate(viewDetailsDialog.payment.requestDate)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* Notes Section */}
            {viewDetailsDialog.payment.notes && (
              <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  Additional Notes
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                    {viewDetailsDialog.payment.notes}
                  </Typography>
                </Paper>
              </Box>
            )}
          </DialogContent>
        )}

        <DialogActions sx={{ p: 2, bgcolor: 'grey.50', gap: 1 }}>
          <Button onClick={handleCloseViewDetails} variant="outlined">
            Close
          </Button>
          {viewDetailsDialog.payment && (viewDetailsDialog.payment.status === 'PAID' || viewDetailsDialog.payment.status === 'APPROVED') && (
            <Button
              variant="contained"
              startIcon={<ReceiptIcon />}
              onClick={() => {
                generateReceipt(viewDetailsDialog.payment!)
                handleCloseViewDetails()
              }}
              color="primary"
            >
              Generate Receipt
            </Button>
          )}
          {viewDetailsDialog.payment && viewDetailsDialog.payment.status === 'PENDING' && (
            <>
              <Button
                variant="contained"
                startIcon={<ApproveIcon />}
                onClick={() => {
                  setProcessDialog({
                    open: true,
                    payment: viewDetailsDialog.payment!,
                    action: 'APPROVE'
                  })
                  handleCloseViewDetails()
                }}
                color="success"
              >
                Approve Payment
              </Button>
              <Button
                variant="outlined"
                startIcon={<RejectIcon />}
                onClick={() => {
                  setProcessDialog({
                    open: true,
                    payment: viewDetailsDialog.payment!,
                    action: 'REJECT'
                  })
                  handleCloseViewDetails()
                }}
                color="error"
              >
                Reject Payment
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}