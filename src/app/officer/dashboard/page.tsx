'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
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
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  LinearProgress,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  TextField,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  Assignment as ApplicationIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  MoreVert as MoreIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Schedule as PendingIcon,
  AccountBalance as LoanIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import { LoanRequestsService, type LoanRequest, type DashboardStats } from '@/lib/loanRequestsService'


export default function OfficerDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedRequest, setSelectedRequest] = useState<LoanRequest | null>(null)
  const [actionDialog, setActionDialog] = useState<{ open: boolean; type: 'APPROVE' | 'REJECT' | null; request: LoanRequest | null }>({ open: false, type: null, request: null })
  const [actionComment, setActionComment] = useState('')

  useEffect(() => {
    if (session?.user && session.user.role === 'LOANS_OFFICER') {
      fetchDashboardData()
    }
  }, [session, currentPage])

  // Refresh data every 30 seconds for real-time updates
  useEffect(() => {
    if (session?.user && session.user.role === 'LOANS_OFFICER') {
      const interval = setInterval(() => {
        fetchDashboardData()
      }, 30000) // 30 seconds

      // Subscribe to data changes for immediate updates
      const unsubscribe = LoanRequestsService.onDataChange(() => {
        fetchDashboardData()
      })

      return () => {
        clearInterval(interval)
        unsubscribe()
      }
    }
  }, [session])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch dashboard stats and recent requests in parallel
      const [statsResponse, requestsResponse] = await Promise.all([
        LoanRequestsService.getDashboardStats(),
        LoanRequestsService.getRecentLoanRequests(5)
      ])

      setDashboardStats(statsResponse)
      setLoanRequests(requestsResponse)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
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
      month: 'short',
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

  const getLoanTypeColor = (loanType: string) => {
    switch (loanType) {
      case 'Personal Loan':
        return 'primary'
      case 'Business Loan':
        return 'success'
      case 'Mortgage Loan':
        return 'info'
      case 'Auto Loan':
        return 'warning'
      case 'Education Loan':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, request: LoanRequest) => {
    setAnchorEl(event.currentTarget)
    setSelectedRequest(request)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedRequest(null)
  }

  const handleActionDialogOpen = (type: 'APPROVE' | 'REJECT', request: LoanRequest) => {
    setActionDialog({ open: true, type, request })
    handleMenuClose()
  }

  const handleActionDialogClose = () => {
    setActionDialog({ open: false, type: null, request: null })
    setActionComment('')
  }

  const handleActionConfirm = async () => {
    if (!actionDialog.request) return

    const newStatus = actionDialog.type === 'APPROVE' ? 'APPROVED' : 'REJECTED'

    try {
      await LoanRequestsService.updateLoanRequestStatus(actionDialog.request.id, newStatus, actionComment)
      // Refresh dashboard data to get updated stats
      await fetchDashboardData()
    } catch (error) {
      console.error('Error updating loan request status:', error)
    }

    handleActionDialogClose()
  }

  const handleViewDetails = (request: LoanRequest) => {
    router.push(`/officer/loan-requests/${request.id}`)
    handleMenuClose()
  }

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value)
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

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs />
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          <DashboardIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Loan Officer Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Manage loan applications and member services
        </Typography>
      </Box>

      {/* Dashboard Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PendingIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Pending Requests</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {dashboardStats?.pendingRequests || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Awaiting review
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ApplicationIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Under Review</Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                {dashboardStats?.underReviewRequests || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Members</Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                {dashboardStats?.totalMembers || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active members
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Approval Rate</Typography>
              </Box>
              <Typography variant="h4" color="primary.main">
                {dashboardStats?.approvalRate || '0%'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This month
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Loan Requests */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Recent Loan Applications
            </Typography>
            <Button
              variant="contained"
              startIcon={<ApplicationIcon />}
              onClick={() => router.push('/officer/loan-requests')}
            >
              View All Requests
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell>Loan Type</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Purpose</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Urgency</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loanRequests.map((request) => (
                  <TableRow key={request.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {request.memberName.split(' ').map(n => n[0]).join('')}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {request.memberName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {request.membershipNumber}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={request.loanType}
                        color={getLoanTypeColor(request.loanType) as any}
                        size="small"
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(request.requestedAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 150 }} noWrap>
                        {request.purpose}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(request.requestedDate)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={request.urgency}
                        color={getUrgencyColor(request.urgency) as any}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={request.status}
                        color={getStatusColor(request.status) as any}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, request)}
                      >
                        <MoreIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => selectedRequest && handleViewDetails(selectedRequest)}>
          <ViewIcon sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        {selectedRequest && (selectedRequest.status === 'PENDING' || selectedRequest.status === 'UNDER_REVIEW') && (
          <>
            <MenuItem onClick={() => selectedRequest && handleActionDialogOpen('APPROVE', selectedRequest)}>
              <ApproveIcon sx={{ mr: 1 }} />
              Approve Application
            </MenuItem>
            <MenuItem onClick={() => selectedRequest && handleActionDialogOpen('REJECT', selectedRequest)}>
              <RejectIcon sx={{ mr: 1 }} />
              Reject Application
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Action Confirmation Dialog */}
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
          {actionDialog.request && (
            <Box sx={{ mb: 3 }}>
              <Alert severity={actionDialog.type === 'APPROVE' ? 'success' : 'warning'} sx={{ mb: 2 }}>
                You are about to {actionDialog.type?.toLowerCase()} the loan application for{' '}
                <strong>{actionDialog.request.memberName}</strong> requesting{' '}
                <strong>{formatCurrency(actionDialog.request.requestedAmount)}</strong>.
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
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleActionDialogClose}>
            Cancel
          </Button>
          <Button
            onClick={handleActionConfirm}
            variant="contained"
            color={actionDialog.type === 'APPROVE' ? 'success' : 'error'}
            disabled={!actionComment.trim()}
          >
            {actionDialog.type === 'APPROVE' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}