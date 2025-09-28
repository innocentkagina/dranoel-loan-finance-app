'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Avatar,
  Stack
} from '@mui/material'
import {
  People as PeopleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Download as ExportIcon,
  Refresh as RefreshIcon,
  Check as ApproveIcon,
  Close as RejectIcon
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  role: string | null
  status: string
  isActive: boolean
  mustChangePassword: boolean
  approvedAt?: string
  approvedBy?: string
  createdAt: string
  lastLogin?: string
  _count: {
    loanApplications: number
    payments: number
  }
}

interface CreateUserForm {
  email: string
  password: string
  firstName: string
  lastName: string
  phone: string
  address: string
  role: string
  dateOfBirth: string
  nationalId: string
  employmentStatus: string
  monthlyIncome: string
  creditScore: string
}

export default function UserManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState('MEMBER')
  const [activeTab, setActiveTab] = useState(0)

  const [createForm, setCreateForm] = useState<CreateUserForm>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    role: 'MEMBER',
    dateOfBirth: '',
    nationalId: '',
    employmentStatus: '',
    monthlyIncome: '',
    creditScore: ''
  })

  useEffect(() => {
    if (session?.user?.role === 'ADMINISTRATOR') {
      fetchUsers()
    }
  }, [session, page, search, roleFilter, statusFilter, activeFilter])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search,
        role: roleFilter,
        status: statusFilter,
        isActive: activeFilter
      })

      const response = await fetch(`/api/administrator/users?${params}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
        setTotalPages(data.pagination.pages)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async () => {
    try {
      const response = await fetch('/api/administrator/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      })

      if (response.ok) {
        setCreateDialogOpen(false)
        setCreateForm({
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          phone: '',
          address: '',
          role: 'MEMBER',
          dateOfBirth: '',
          nationalId: '',
          employmentStatus: '',
          monthlyIncome: '',
          creditScore: ''
        })
        fetchUsers()
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to create user')
      }
    } catch (error) {
      console.error('Error creating user:', error)
      alert('Failed to create user')
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/administrator/users/${selectedUser.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setDeleteDialogOpen(false)
        setSelectedUser(null)
        fetchUsers()
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user')
    }
  }

  const handleApproveUser = async () => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/administrator/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          role: selectedRole
        })
      })

      if (response.ok) {
        setApproveDialogOpen(false)
        setSelectedUser(null)
        setSelectedRole('MEMBER')
        fetchUsers()
        alert('User approved successfully')
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to approve user')
      }
    } catch (error) {
      console.error('Error approving user:', error)
      alert('Failed to approve user')
    }
  }

  const handleRejectUser = async () => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/administrator/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject'
        })
      })

      if (response.ok) {
        setSelectedUser(null)
        fetchUsers()
        alert('User rejected successfully')
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to reject user')
      }
    } catch (error) {
      console.error('Error rejecting user:', error)
      alert('Failed to reject user')
    }
  }

  const getRoleChip = (role: string | null) => {
    if (!role) {
      return (
        <Chip
          label="No Role"
          color="default"
          size="small"
          variant="outlined"
        />
      )
    }

    const colors: { [key: string]: 'primary' | 'secondary' | 'success' | 'warning' | 'error' } = {
      ADMINISTRATOR: 'error',
      LOANS_OFFICER: 'warning',
      TREASURER: 'info',
      MEMBER: 'primary'
    }

    return (
      <Chip
        label={role.replace('_', ' ')}
        color={colors[role] || 'default'}
        size="small"
      />
    )
  }

  const getStatusChip = (status: string) => {
    const colors: { [key: string]: 'primary' | 'secondary' | 'success' | 'warning' | 'error' } = {
      PENDING: 'warning',
      ACTIVE: 'success',
      INACTIVE: 'error',
      SUSPENDED: 'secondary'
    }

    return (
      <Chip
        label={status.replace('_', ' ')}
        color={colors[status] || 'default'}
        size="small"
      />
    )
  }

  if (status === 'loading') {
    return <Box sx={{ p: 3 }}>Loading...</Box>
  }

  if (!session || session.user.role !== 'ADMINISTRATOR') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. Administrator privileges required.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs />

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PeopleIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          User Management
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Manage system users and their roles
        </Typography>
      </Box>

      {/* Filters and Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Search users"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, email..."
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select
                  value={roleFilter}
                  label="Role"
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <MenuItem value="">All Roles</MenuItem>
                  <MenuItem value="NO_ROLE">No Role</MenuItem>
                  <MenuItem value="ADMINISTRATOR">Administrator</MenuItem>
                  <MenuItem value="LOANS_OFFICER">Loans Officer</MenuItem>
                  <MenuItem value="TREASURER">Treasurer</MenuItem>
                  <MenuItem value="MEMBER">Member</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="PENDING">Pending</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="INACTIVE">Inactive</MenuItem>
                  <MenuItem value="SUSPENDED">Suspended</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Account</InputLabel>
                <Select
                  value={activeFilter}
                  label="Account"
                  onChange={(e) => setActiveFilter(e.target.value)}
                >
                  <MenuItem value="">All Accounts</MenuItem>
                  <MenuItem value="true">Active Only</MenuItem>
                  <MenuItem value="false">Inactive Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Create User
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchUsers}
                >
                  Refresh
                </Button>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => {
                    setSearch('')
                    setRoleFilter('')
                    setStatusFilter('')
                    setActiveFilter('')
                    setPage(1)
                  }}
                >
                  Clear Filters
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Account Status</TableCell>
                  <TableCell>Loans</TableCell>
                  <TableCell>Payments</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">Loading...</TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">No users found</TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {user.firstName[0]}{user.lastName[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {user.firstName} {user.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {user.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{getRoleChip(user.role)}</TableCell>
                      <TableCell>{getStatusChip(user.status)}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.isActive ? 'Active' : 'Inactive'}
                          color={user.isActive ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{user._count.loanApplications}</TableCell>
                      <TableCell>{user._count.payments}</TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {user.lastLogin
                          ? new Date(user.lastLogin).toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          {user.status === 'PENDING' ? (
                            <>
                              <Tooltip title="Approve User">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => {
                                    setSelectedUser(user)
                                    setApproveDialogOpen(true)
                                  }}
                                >
                                  <ApproveIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject User">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setSelectedUser(user)
                                    handleRejectUser()
                                  }}
                                >
                                  <RejectIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          ) : (
                            <>
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedUser(user)
                                    setViewDialogOpen(true)
                                  }}
                                >
                                  <ViewIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit User">
                                <IconButton
                                  size="small"
                                  onClick={() => router.push(`/administrator/users/${user.id}/edit`)}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete User">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setSelectedUser(user)
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Tabs value={activeTab} onChange={(_, newTab) => setActiveTab(newTab)}>
              <Tab label="Basic Info" />
              <Tab label="Personal Details" />
              <Tab label="Financial Info" />
            </Tabs>

            <Box sx={{ mt: 3 }}>
              {activeTab === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      required
                      value={createForm.firstName}
                      onChange={(e) => setCreateForm({...createForm, firstName: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      required
                      value={createForm.lastName}
                      onChange={(e) => setCreateForm({...createForm, lastName: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      required
                      value={createForm.email}
                      onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Password"
                      type="password"
                      required
                      value={createForm.password}
                      onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({...createForm, phone: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Alert severity="info" sx={{ display: 'flex', alignItems: 'center' }}>
                      Role will be assigned during the approval process
                    </Alert>
                  </Grid>
                </Grid>
              )}

              {activeTab === 1 && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Address"
                      multiline
                      rows={3}
                      value={createForm.address}
                      onChange={(e) => setCreateForm({...createForm, address: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Date of Birth"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={createForm.dateOfBirth}
                      onChange={(e) => setCreateForm({...createForm, dateOfBirth: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="National ID"
                      value={createForm.nationalId}
                      onChange={(e) => setCreateForm({...createForm, nationalId: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Employment Status"
                      value={createForm.employmentStatus}
                      onChange={(e) => setCreateForm({...createForm, employmentStatus: e.target.value})}
                    />
                  </Grid>
                </Grid>
              )}

              {activeTab === 2 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Monthly Income"
                      type="number"
                      value={createForm.monthlyIncome}
                      onChange={(e) => setCreateForm({...createForm, monthlyIncome: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Credit Score"
                      type="number"
                      value={createForm.creditScore}
                      onChange={(e) => setCreateForm({...createForm, creditScore: e.target.value})}
                    />
                  </Grid>
                </Grid>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateUser} variant="contained">Create User</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deactivate {selectedUser?.firstName} {selectedUser?.lastName}?
            This action will deactivate the user account.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>

      {/* View User Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>User Details</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Personal Information
                  </Typography>
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">Name</Typography>
                      <Typography variant="body2">{selectedUser.firstName} {selectedUser.lastName}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">Email</Typography>
                      <Typography variant="body2">{selectedUser.email}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">Phone</Typography>
                      <Typography variant="body2">{selectedUser.phone || 'Not provided'}</Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Account Information
                  </Typography>
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">Role</Typography>
                      {getRoleChip(selectedUser.role)}
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">Status</Typography>
                      {getStatusChip(selectedUser.status)}
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">Account Status</Typography>
                      <Chip
                        label={selectedUser.isActive ? 'Active' : 'Inactive'}
                        color={selectedUser.isActive ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">Must Change Password</Typography>
                      <Chip
                        label={selectedUser.mustChangePassword ? 'Yes' : 'No'}
                        color={selectedUser.mustChangePassword ? 'warning' : 'success'}
                        size="small"
                      />
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Activity Statistics
                  </Typography>
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">Loan Applications</Typography>
                      <Typography variant="body2">{selectedUser._count.loanApplications}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">Payments</Typography>
                      <Typography variant="body2">{selectedUser._count.payments}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">Created</Typography>
                      <Typography variant="body2">{new Date(selectedUser.createdAt).toLocaleString()}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">Last Login</Typography>
                      <Typography variant="body2">
                        {selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : 'Never'}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Approval Information
                  </Typography>
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">Approved At</Typography>
                      <Typography variant="body2">
                        {selectedUser.approvedAt ? new Date(selectedUser.approvedAt).toLocaleString() : 'Not approved'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">Approved By</Typography>
                      <Typography variant="body2">{selectedUser.approvedBy || 'Not approved'}</Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Approve User Dialog */}
      <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)}>
        <DialogTitle>Approve User</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Approve {selectedUser?.firstName} {selectedUser?.lastName} and assign a role?
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Assign Role</InputLabel>
            <Select
              value={selectedRole}
              label="Assign Role"
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <MenuItem value="MEMBER">Member</MenuItem>
              <MenuItem value="LOANS_OFFICER">Loans Officer</MenuItem>
              <MenuItem value="TREASURER">Treasurer</MenuItem>
              <MenuItem value="ADMINISTRATOR">Administrator</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleApproveUser} color="success" variant="contained">
            Approve User
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}