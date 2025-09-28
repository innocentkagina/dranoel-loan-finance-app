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
  FormControl,
  InputLabel,
  Select,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material'
import {
  Assignment as ApplicationIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  MoreVert as MoreIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import { LoanRequestsService, type LoanRequest } from '@/lib/loanRequestsService'


export default function LoanRequestsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([])
  const [totalRequests, setTotalRequests] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedRequest, setSelectedRequest] = useState<LoanRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [actionDialog, setActionDialog] = useState<{ open: boolean; type: 'APPROVE' | 'REJECT' | null; request: LoanRequest | null }>({ open: false, type: null, request: null })
  const [actionComment, setActionComment] = useState('')

  useEffect(() => {
    if (session?.user && session.user.role === 'LOANS_OFFICER') {
      fetchLoanRequests()
    }
  }, [session, currentPage, statusFilter, typeFilter, searchQuery])

  // Subscribe to data changes for immediate updates
  useEffect(() => {
    if (session?.user && session.user.role === 'LOANS_OFFICER') {
      const unsubscribe = LoanRequestsService.onDataChange(() => {
        fetchLoanRequests()
      })

      return unsubscribe
    }
  }, [session])

  const fetchLoanRequests = async () => {
    setLoading(true)
    try {
      const response = await LoanRequestsService.getLoanRequests({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        loanType: typeFilter === 'ALL' ? undefined : typeFilter,
        search: searchQuery || undefined,
        page: currentPage,
        limit: 10
      })

      setLoanRequests(response.requests)
      setTotalRequests(response.total)
      setTotalPages(response.pages)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching loan requests:', error)
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
      // Refresh the loan requests data to get updated information
      await fetchLoanRequests()
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
          <ApplicationIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Loan Applications
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Review, approve or reject member loan applications
        </Typography>
      </Box>

      {/* Filters and Search */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                placeholder="Search members, numbers, purpose..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="ALL">All Status</MenuItem>
                  <MenuItem value="DRAFT">Draft</MenuItem>
                  <MenuItem value="SUBMITTED">Submitted</MenuItem>
                  <MenuItem value="UNDER_REVIEW">Under Review</MenuItem>
                  <MenuItem value="APPROVED">Approved</MenuItem>
                  <MenuItem value="REJECTED">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Loan Type</InputLabel>
                <Select
                  value={typeFilter}
                  label="Loan Type"
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <MenuItem value="ALL">All Types</MenuItem>
                  <MenuItem value="PERSONAL">Personal</MenuItem>
                  <MenuItem value="BUSINESS">Business</MenuItem>
                  <MenuItem value="MORTGAGE">Mortgage</MenuItem>
                  <MenuItem value="AUTO">Auto</MenuItem>
                  <MenuItem value="STUDENT">Student</MenuItem>
                  <MenuItem value="PAYDAY">Payday</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => {
                  setStatusFilter('ALL')
                  setTypeFilter('ALL')
                  setSearchQuery('')
                }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Loan Requests Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Loan Applications ({totalRequests})
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell>Loan Type</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Purpose</TableCell>
                  <TableCell align="center">Credit Score</TableCell>
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
                        <Avatar sx={{ width: 36, height: 36 }}>
                          {request.memberName.split(' ').map(n => n[0]).join('')}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {request.memberName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {request.membershipNumber}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Income: {formatCurrency(request.monthlyIncome)}/mo
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Chip
                          label={request.loanType}
                          color={getLoanTypeColor(request.loanType) as any}
                          size="small"
                          variant="filled"
                        />
                        <Typography variant="caption" color="text.secondary">
                          {request.employmentStatus}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(request.requestedAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 180 }} noWrap>
                        {request.purpose}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={request.creditScore}
                        color={request.creditScore && request.creditScore > 700 ? 'success' : 'warning'}
                        size="small"
                        variant="outlined"
                      />
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
                        label={request.status.replace('_', ' ')}
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

          {loanRequests.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                No loan applications found matching your criteria.
              </Typography>
            </Box>
          )}

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