'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { usePrintAndPdf } from '@/hooks/usePrintAndPdf'
import { LoanRequestsService } from '@/lib/loanRequestsService'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Avatar,
  LinearProgress,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
} from '@mui/material'
import {
  ArrowBack as BackIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  AccountBalance as BankIcon,
  Description as DocumentIcon,
  Assessment as AssessmentIcon,
  Schedule as ScheduleIcon,
  CreditCard as CreditIcon,
  Security as SecurityIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material'
import Breadcrumbs from '@/components/Breadcrumbs'

interface LoanRequestDetails {
  id: string
  applicationNumber: string
  memberName: string
  memberEmail: string
  memberPhone: string
  membershipNumber: string
  memberAddress: string
  dateOfBirth: string
  nationalId: string
  loanType: string
  requestedAmount: number
  purpose: string
  termMonths: number
  interestRate: number
  monthlyPayment: number
  employmentStatus: string
  employer: string
  jobTitle: string
  workAddress: string
  employmentDuration: string
  monthlyIncome: number
  otherIncome: number
  expenses: number
  assets: number
  liabilities: number
  creditScore: number
  existingLoans: number
  requestedDate: string
  submittedDate: string
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'
  urgency: 'HIGH' | 'MEDIUM' | 'LOW'
  documents: Array<{
    id: string
    type: string
    name: string
    uploadDate: string
    verified: boolean
  }>
  guarantors: Array<{
    name: string
    relationship: string
    phone: string
    income: number
  }>
  collateral?: {
    type: string
    description: string
    estimatedValue: number
  }
  officerNotes?: string
  creditHistory: Array<{
    date: string
    type: string
    amount: number
    status: string
  }>
}

export default function LoanRequestDetailsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const loanId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [loanRequest, setLoanRequest] = useState<LoanRequestDetails | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: 'APPROVE' | 'REJECT' | null
  }>({ open: false, type: null })
  const [actionComment, setActionComment] = useState('')
  const [processing, setProcessing] = useState(false)

  // Print and PDF functionality
  const { printRef, handlePrint, handleDownloadPdf } = usePrintAndPdf({
    title: `Loan Application - ${loanRequest?.memberName}`,
    filename: `loan_application_${loanRequest?.applicationNumber}_${new Date().toISOString().split('T')[0]}.pdf`
  })

  useEffect(() => {
    if (session?.user && session.user.role === 'LOANS_OFFICER' && loanId) {
      fetchLoanDetails()
    }
  }, [session, loanId])

  // Subscribe to data changes for immediate updates when loan status changes
  useEffect(() => {
    if (session?.user && session.user.role === 'LOANS_OFFICER') {
      const unsubscribe = LoanRequestsService.onDataChange(() => {
        // Only refresh if we have a current loan request
        if (loanRequest) {
          fetchLoanDetails()
        }
      })

      return unsubscribe
    }
  }, [session, loanRequest])

  const generateGuarantorsFromData = (apiResponse: any) => {
    // Generate basic guarantors based on loan amount
    if (apiResponse.requestedAmount > 5000000) {
      return [
        {
          name: 'Primary Guarantor',
          relationship: 'Family Member',
          phone: '+256701000000',
          income: Math.round((apiResponse.borrower?.monthlyIncome || 0) * 0.8)
        },
        {
          name: 'Secondary Guarantor',
          relationship: 'Colleague',
          phone: '+256702000000',
          income: Math.round((apiResponse.borrower?.monthlyIncome || 0) * 1.2)
        }
      ]
    }

    return [
      {
        name: 'Guarantor',
        relationship: 'Family Member',
        phone: '+256701000000',
        income: Math.round((apiResponse.borrower?.monthlyIncome || 0) * 0.9)
      }
    ]
  }

  const fetchLoanDetails = async () => {
    setLoading(true)

    try {
      // Get the current loan request from the service to get real status
      const currentLoanRequest = await LoanRequestsService.getLoanRequestById(loanId)

      if (!currentLoanRequest) {
        console.error('Loan request not found')
        setLoading(false)
        return
      }

      // Fetch detailed loan application data from API
      const response = await fetch(`/api/loan-applications/${loanId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch loan application details')
      }

      const apiResponse = await response.json()

      // Transform API response to match expected interface
      const loanDetails: LoanRequestDetails = {
        id: apiResponse.id,
        applicationNumber: apiResponse.applicationNumber,
        memberName: `${apiResponse.borrower.firstName} ${apiResponse.borrower.lastName}`,
        memberEmail: apiResponse.borrower.email,
        memberPhone: apiResponse.borrower.phone || '+256700000000',
        membershipNumber: `MBR-${apiResponse.borrower.id.slice(-6).toUpperCase()}-2023`,
        memberAddress: apiResponse.borrower.address || 'Address not provided',
        dateOfBirth: apiResponse.borrower.dateOfBirth?.split('T')[0] || '1990-01-01',
        nationalId: apiResponse.borrower.nationalId || 'Not provided',
        loanType: apiResponse.loanType,
        requestedAmount: apiResponse.requestedAmount,
        purpose: apiResponse.purpose,
        termMonths: apiResponse.termMonths || 12,
        interestRate: apiResponse.interestRate || 0,
        monthlyPayment: apiResponse.monthlyPayment || 0,
        employmentStatus: apiResponse.borrower.employmentStatus || 'Not specified',
        employer: apiResponse.employer || 'Not specified',
        jobTitle: apiResponse.jobTitle || 'Not specified',
        workAddress: apiResponse.workAddress || 'Not provided',
        employmentDuration: apiResponse.employmentDuration || 'Not specified',
        monthlyIncome: apiResponse.borrower.monthlyIncome || 0,
        otherIncome: apiResponse.otherIncome || 0,
        expenses: apiResponse.expenses || 0,
        assets: apiResponse.assets || 0,
        liabilities: apiResponse.liabilities || 0,
        creditScore: apiResponse.borrower.creditScore || 650,
        existingLoans: 0,
        requestedDate: apiResponse.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
        submittedDate: apiResponse.submittedAt?.split('T')[0] || apiResponse.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
        status: currentLoanRequest.status, // Use the real status from service
        urgency: currentLoanRequest.urgency,
        documents: apiResponse.documents?.map((doc: any, index: number) => ({
          id: doc.id || `doc-${index}`,
          type: doc.type || 'Document',
          name: doc.filename || `document_${index}.pdf`,
          uploadDate: doc.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
          verified: doc.verified || false
        })) || [],
        guarantors: generateGuarantorsFromData(apiResponse),
        collateral: apiResponse.collaterals?.[0] ? {
          type: apiResponse.collaterals[0].type || 'Property',
          description: apiResponse.collaterals[0].description || 'Collateral item',
          estimatedValue: apiResponse.collaterals[0].estimatedValue || 0
        } : null,
        officerNotes: apiResponse.officerNotes || null,
        creditHistory: apiResponse.creditReports?.map((report: any, index: number) => ({
          date: report.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
          type: report.reportType || 'Credit Check',
          amount: report.amount || 0,
          status: report.status || 'Current'
        })) || []
      }

      setLoanRequest(loanDetails)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching loan details:', error)
      setLoading(false)
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
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'warning'
      case 'UNDER_REVIEW':
        return 'info'
      case 'APPROVED':
        return 'success'
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  const handleActionDialogOpen = (type: 'APPROVE' | 'REJECT') => {
    setActionDialog({ open: true, type })
  }

  const handleActionDialogClose = () => {
    setActionDialog({ open: false, type: null })
    setActionComment('')
  }

  const handleActionConfirm = async () => {
    if (!loanRequest || !actionDialog.type) return

    setProcessing(true)

    try {
      const newStatus = actionDialog.type === 'APPROVE' ? 'APPROVED' : 'REJECTED'

      // Use the shared service to update the loan status
      await LoanRequestsService.updateLoanRequestStatus(loanRequest.id, newStatus, actionComment)

      // Update local state
      setLoanRequest(prev => prev ? { ...prev, status: newStatus as any } : null)

      console.log(`${actionDialog.type} loan ${loanRequest.id} with comment: ${actionComment}`)

      handleActionDialogClose()

      // Show success message or redirect
      router.push('/officer/loan-requests')

    } catch (error) {
      console.error('Error processing loan action:', error)
    } finally {
      setProcessing(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    )
  }

  if (!session || session.user.role !== 'LOANS_OFFICER') {
    router.push('/auth/signin')
    return null
  }

  if (!loanRequest) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6">Loan request not found</Typography>
        <Button
          startIcon={<BackIcon />}
          onClick={() => router.push('/officer/loan-requests')}
          sx={{ mt: 2 }}
        >
          Back to Loan Requests
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box className="no-print">
        <Breadcrumbs />
      </Box>

      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Button
            startIcon={<BackIcon />}
            onClick={() => router.push('/officer/loan-requests')}
            sx={{ mb: 2 }}
            className="no-print"
          >
            Back to Loan Requests
          </Button>
          <Typography variant="h4" gutterBottom>
            Loan Application Details
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Application #{loanRequest.applicationNumber}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }} className="no-print">
          <Button
            startIcon={<PrintIcon />}
            variant="outlined"
            size="small"
            onClick={handlePrint}
          >
            Print
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            variant="outlined"
            size="small"
            onClick={handleDownloadPdf}
          >
            Download PDF
          </Button>
          {(loanRequest.status === 'PENDING' || loanRequest.status === 'UNDER_REVIEW') && (
            <Box className="no-print" sx={{ display: 'flex', gap: 1 }}>
              <Button
                startIcon={<ApproveIcon />}
                variant="contained"
                color="success"
                size="small"
                onClick={() => handleActionDialogOpen('APPROVE')}
              >
                Approve
              </Button>
              <Button
                startIcon={<RejectIcon />}
                variant="contained"
                color="error"
                size="small"
                onClick={() => handleActionDialogOpen('REJECT')}
              >
                Reject
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {/* Printable Content Wrapper */}
      <div ref={printRef}>
        {/* Status and Member Info Header */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ width: 60, height: 60 }}>
                  {loanRequest.memberName.split(' ').map(n => n[0]).join('')}
                </Avatar>
                <Box>
                  <Typography variant="h5">{loanRequest.memberName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {loanRequest.membershipNumber}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <EmailIcon sx={{ fontSize: 16 }} />
                    <Typography variant="body2">{loanRequest.memberEmail}</Typography>
                    <PhoneIcon sx={{ fontSize: 16, ml: 2 }} />
                    <Typography variant="body2">{loanRequest.memberPhone}</Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'right' }}>
                <Chip
                  label={loanRequest.status}
                  color={getStatusColor(loanRequest.status) as any}
                  size="large"
                  sx={{ mb: 1 }}
                />
                <br />
                <Chip
                  label={`${loanRequest.urgency} PRIORITY`}
                  color={getUrgencyColor(loanRequest.urgency) as any}
                  size="small"
                  variant="outlined"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Submitted: {formatDate(loanRequest.submittedDate)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Loan Summary */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Loan Summary
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="h4" color="primary">
                  {formatCurrency(loanRequest.requestedAmount)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Requested Amount
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="h4" color="info.main">
                  {loanRequest.termMonths} months
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Loan Term
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="h4" color="warning.main">
                  {loanRequest.interestRate > 0 ? `${loanRequest.interestRate}%` : 'TBD'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Interest Rate (Annual)
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="h4" color="success.main">
                  {loanRequest.monthlyPayment > 0 ? formatCurrency(loanRequest.monthlyPayment) : 'TBD'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Monthly Payment
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Box>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
              Purpose of Loan
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {loanRequest.purpose}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Detailed Information Tabs */}
      <Card>
        <CardContent>
          <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
            <Tab icon={<PersonIcon />} label="Personal Info" />
            <Tab icon={<WorkIcon />} label="Employment" />
            <Tab icon={<BankIcon />} label="Financial" />
            <Tab icon={<DocumentIcon />} label="Documents" />
            <Tab icon={<SecurityIcon />} label="Guarantors" />
            <Tab icon={<CreditIcon />} label="Credit History" />
          </Tabs>

          {/* Personal Information Tab */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Personal Details</Typography>
                <List>
                  <ListItem>
                    <ListItemIcon><CalendarIcon /></ListItemIcon>
                    <ListItemText
                      primary="Date of Birth"
                      secondary={formatDate(loanRequest.dateOfBirth)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><PersonIcon /></ListItemIcon>
                    <ListItemText
                      primary="National ID"
                      secondary={loanRequest.nationalId}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><LocationIcon /></ListItemIcon>
                    <ListItemText
                      primary="Address"
                      secondary={loanRequest.memberAddress}
                    />
                  </ListItem>
                </List>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Application Info</Typography>
                <List>
                  <ListItem>
                    <ListItemIcon><ScheduleIcon /></ListItemIcon>
                    <ListItemText
                      primary="Application Date"
                      secondary={formatDate(loanRequest.requestedDate)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><AssessmentIcon /></ListItemIcon>
                    <ListItemText
                      primary="Credit Score"
                      secondary={
                        <Chip
                          label={loanRequest.creditScore}
                          color={loanRequest.creditScore > 700 ? 'success' : 'warning'}
                          size="small"
                        />
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CreditIcon /></ListItemIcon>
                    <ListItemText
                      primary="Existing Loans"
                      secondary={`${loanRequest.existingLoans} active loan(s)`}
                    />
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          )}

          {/* Employment Tab */}
          {activeTab === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Employment Information</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="medium">Current Employment</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          <strong>Status:</strong> {loanRequest.employmentStatus}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Employer:</strong> {loanRequest.employer}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Position:</strong> {loanRequest.jobTitle}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Duration:</strong> {loanRequest.employmentDuration}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Work Address:</strong> {loanRequest.workAddress}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="medium">Income Summary</Typography>
                        <Typography variant="h5" color="success.main" sx={{ mt: 1 }}>
                          {formatCurrency(loanRequest.monthlyIncome)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Primary Monthly Income
                        </Typography>
                        {loanRequest.otherIncome > 0 && (
                          <>
                            <Typography variant="body1" color="info.main" sx={{ mt: 2 }}>
                              {formatCurrency(loanRequest.otherIncome)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Other Income Sources
                            </Typography>
                          </>
                        )}
                        <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
                          {formatCurrency(loanRequest.monthlyIncome + loanRequest.otherIncome)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Monthly Income
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          )}

          {/* Financial Tab */}
          {activeTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Financial Overview</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                          Income & Expenses
                        </Typography>
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Total Monthly Income</Typography>
                            <Typography variant="body2" color="success.main" fontWeight="medium">
                              {formatCurrency(loanRequest.monthlyIncome + loanRequest.otherIncome)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Monthly Expenses</Typography>
                            <Typography variant="body2" color="error.main" fontWeight="medium">
                              {formatCurrency(loanRequest.expenses)}
                            </Typography>
                          </Box>
                          <Divider sx={{ my: 1 }} />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="subtitle2">Net Monthly Income</Typography>
                            <Typography variant="subtitle2" color="primary" fontWeight="bold">
                              {formatCurrency(loanRequest.monthlyIncome + loanRequest.otherIncome - loanRequest.expenses)}
                            </Typography>
                          </Box>
                        </Box>

                        <Typography variant="body2" color="text.secondary">
                          <strong>Debt-to-Income Ratio:</strong> {' '}
                          {loanRequest.monthlyPayment > 0 && (loanRequest.monthlyIncome + loanRequest.otherIncome) > 0
                            ? `${((loanRequest.monthlyPayment / (loanRequest.monthlyIncome + loanRequest.otherIncome)) * 100).toFixed(1)}%`
                            : 'To be calculated'
                          }
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                          Assets & Liabilities
                        </Typography>
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Total Assets</Typography>
                            <Typography variant="body2" color="success.main" fontWeight="medium">
                              {formatCurrency(loanRequest.assets)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Total Liabilities</Typography>
                            <Typography variant="body2" color="error.main" fontWeight="medium">
                              {formatCurrency(loanRequest.liabilities)}
                            </Typography>
                          </Box>
                          <Divider sx={{ my: 1 }} />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="subtitle2">Net Worth</Typography>
                            <Typography variant="subtitle2" color="primary" fontWeight="bold">
                              {formatCurrency(loanRequest.assets - loanRequest.liabilities)}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {loanRequest.collateral && (
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                            Collateral Information
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                              <Typography variant="body2" color="text.secondary">Type</Typography>
                              <Typography variant="body1">{loanRequest.collateral.type}</Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <Typography variant="body2" color="text.secondary">Description</Typography>
                              <Typography variant="body1">{loanRequest.collateral.description}</Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <Typography variant="body2" color="text.secondary">Estimated Value</Typography>
                              <Typography variant="body1" color="success.main" fontWeight="medium">
                                {formatCurrency(loanRequest.collateral.estimatedValue)}
                              </Typography>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </Grid>
              </Grid>
            </Grid>
          )}

          {/* Documents Tab */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>Submitted Documents</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Document Type</TableCell>
                      <TableCell>File Name</TableCell>
                      <TableCell>Upload Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loanRequest.documents.map((doc) => (
                      <TableRow key={doc.id} hover>
                        <TableCell>{doc.type}</TableCell>
                        <TableCell>{doc.name}</TableCell>
                        <TableCell>{formatDate(doc.uploadDate)}</TableCell>
                        <TableCell>
                          <Chip
                            label={doc.verified ? 'Verified' : 'Pending'}
                            color={doc.verified ? 'success' : 'warning'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Button startIcon={<ViewIcon />} size="small">
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Guarantors Tab */}
          {activeTab === 4 && (
            <Box>
              <Typography variant="h6" gutterBottom>Loan Guarantors</Typography>
              <Grid container spacing={3}>
                {loanRequest.guarantors.map((guarantor, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                          {guarantor.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          <strong>Relationship:</strong> {guarantor.relationship}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          <strong>Phone:</strong> {guarantor.phone}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Monthly Income:</strong> {formatCurrency(guarantor.income)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Credit History Tab */}
          {activeTab === 5 && (
            <Box>
              <Typography variant="h6" gutterBottom>Credit History</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Loan Type</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loanRequest.creditHistory.map((credit, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{formatDate(credit.date)}</TableCell>
                        <TableCell>{credit.type}</TableCell>
                        <TableCell align="right">{formatCurrency(credit.amount)}</TableCell>
                        <TableCell>
                          <Chip
                            label={credit.status}
                            color={credit.status === 'Paid Off' ? 'success' : credit.status === 'Current' ? 'info' : 'default'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </CardContent>
      </Card>

        {/* Officer Notes */}
        {loanRequest.officerNotes && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Officer Notes</Typography>
              <Alert severity="info">
                {loanRequest.officerNotes}
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
      {/* End of Printable Content */}

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onClose={handleActionDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {actionDialog.type === 'APPROVE' ? 'Approve' : 'Reject'} Loan Application
        </DialogTitle>
        <DialogContent>
          <Alert
            severity={actionDialog.type === 'APPROVE' ? 'success' : 'warning'}
            sx={{ mb: 2 }}
          >
            You are about to {actionDialog.type?.toLowerCase()} the loan application for{' '}
            <strong>{loanRequest.memberName}</strong> requesting{' '}
            <strong>{formatCurrency(loanRequest.requestedAmount)}</strong>.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={4}
            label={`${actionDialog.type === 'APPROVE' ? 'Approval' : 'Rejection'} Comments`}
            value={actionComment}
            onChange={(e) => setActionComment(e.target.value)}
            placeholder={`Provide reason for ${actionDialog.type?.toLowerCase()}ing this application...`}
            helperText="This comment will be visible to the member."
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleActionDialogClose} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={handleActionConfirm}
            variant="contained"
            color={actionDialog.type === 'APPROVE' ? 'success' : 'error'}
            disabled={!actionComment.trim() || processing}
          >
            {processing ? 'Processing...' : actionDialog.type === 'APPROVE' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}