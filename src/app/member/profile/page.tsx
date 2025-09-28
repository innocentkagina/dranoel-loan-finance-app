'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Alert,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Home as AddressIcon,
  Work as WorkIcon,
  AccountBalance as BankIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Badge as RoleIcon,
  CalendarMonth as DateIcon,
  CreditCard as CreditIcon,
  AttachMoney as MoneyIcon,
  Assignment as LoanIcon,
  Receipt as PaymentIcon,
  TrendingUp as StatsIcon,
  Security as SecurityIcon,
  Notifications as NotificationIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'

interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  address?: string
  dateOfBirth?: string
  nationalId?: string
  role: string
  employmentStatus?: string
  monthlyIncome?: number
  creditScore?: number
  isActive: boolean
  lastLogin?: string
  createdAt: string
}

interface ProfileStats {
  totalLoans?: number
  activeLoans?: number
  totalPayments?: number
  pendingApplications?: number
  approvedApplications?: number
  rejectedApplications?: number
  totalDisbursed?: number
  totalCollected?: number
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<ProfileStats>({})
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<UserProfile>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user) {
      fetchProfile()
      fetchStats()
    }
  }, [session])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (!response.ok) throw new Error('Failed to fetch profile')

      const data = await response.json()
      setProfile(data)
      setEditData(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/profile/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      })

      if (!response.ok) throw new Error('Failed to update profile')

      const updatedProfile = await response.json()
      setProfile(updatedProfile)
      setEditMode(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      setError('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditData(profile || {})
    setEditMode(false)
    setError(null)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'MEMBER':
        return 'primary'
      case 'LOANS_OFFICER':
        return 'success'
      case 'TREASURER':
        return 'warning'
      case 'ADMINISTRATOR':
        return 'error'
      default:
        return 'default'
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'MEMBER':
        return 'Member'
      case 'LOANS_OFFICER':
        return 'Loans Officer'
      case 'TREASURER':
        return 'Treasurer'
      case 'ADMINISTRATOR':
        return 'Administrator'
      default:
        return role
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
      month: 'long',
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

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  if (!profile) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Breadcrumbs />
        <Typography variant="h6" color="error" sx={{ mt: 4 }}>
          Failed to load profile data
        </Typography>
      </Box>
    )
  }

  const renderMemberStats = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <LoanIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Total Loans</Typography>
            </Box>
            <Typography variant="h4" color="primary">
              {stats.totalLoans || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {stats.activeLoans || 0} active
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <PaymentIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="h6">Payments Made</Typography>
            </Box>
            <Typography variant="h4" color="success.main">
              {stats.totalPayments || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              On time payments
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <CreditIcon color="info" sx={{ mr: 1 }} />
              <Typography variant="h6">Credit Score</Typography>
            </Box>
            <Typography variant="h4" color="info.main">
              {profile.creditScore || 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {profile.creditScore ? (profile.creditScore >= 700 ? 'Excellent' : profile.creditScore >= 600 ? 'Good' : 'Fair') : 'Not available'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <MoneyIcon color="warning" sx={{ mr: 1 }} />
              <Typography variant="h6">Monthly Income</Typography>
            </Box>
            <Typography variant="h4" color="warning.main">
              {profile.monthlyIncome ? formatCurrency(profile.monthlyIncome) : 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Verified income
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )

  const renderOfficerStats = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <LoanIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Applications Pending</Typography>
            </Box>
            <Typography variant="h4" color="primary">
              {stats.pendingApplications || 0}
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
              <StatsIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="h6">Approved</Typography>
            </Box>
            <Typography variant="h4" color="success.main">
              {stats.approvedApplications || 0}
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
              <MoneyIcon color="info" sx={{ mr: 1 }} />
              <Typography variant="h6">Total Disbursed</Typography>
            </Box>
            <Typography variant="h4" color="info.main">
              {stats.totalDisbursed ? formatCurrency(stats.totalDisbursed) : formatCurrency(0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Lifetime total
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <PaymentIcon color="warning" sx={{ mr: 1 }} />
              <Typography variant="h6">Rejected</Typography>
            </Box>
            <Typography variant="h4" color="warning.main">
              {stats.rejectedApplications || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This month
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )

  const renderTreasurerStats = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <BankIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Total Portfolio</Typography>
            </Box>
            <Typography variant="h4" color="primary">
              {stats.totalDisbursed ? formatCurrency(stats.totalDisbursed) : formatCurrency(0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Outstanding loans
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <PaymentIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="h6">Collections</Typography>
            </Box>
            <Typography variant="h4" color="success.main">
              {stats.totalCollected ? formatCurrency(stats.totalCollected) : formatCurrency(0)}
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
              <LoanIcon color="info" sx={{ mr: 1 }} />
              <Typography variant="h6">Active Loans</Typography>
            </Box>
            <Typography variant="h4" color="info.main">
              {stats.activeLoans || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Currently active
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <StatsIcon color="warning" sx={{ mr: 1 }} />
              <Typography variant="h6">Collection Rate</Typography>
            </Box>
            <Typography variant="h4" color="warning.main">
              95%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Payment efficiency
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs />

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          <PersonIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          My Profile
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Manage your account information and settings
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Role-specific Statistics */}
      <Box sx={{ mb: 4 }}>
        {profile.role === 'MEMBER' && renderMemberStats()}
        {profile.role === 'LOANS_OFFICER' && renderOfficerStats()}
        {profile.role === 'TREASURER' && renderTreasurerStats()}
      </Box>

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Profile Information</Typography>
                {!editMode ? (
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => setEditMode(true)}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CancelIcon />}
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </Box>
                )}
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={editMode ? (editData.firstName || '') : profile.firstName}
                    onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                    disabled={!editMode}
                    variant={editMode ? 'outlined' : 'filled'}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={editMode ? (editData.lastName || '') : profile.lastName}
                    onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                    disabled={!editMode}
                    variant={editMode ? 'outlined' : 'filled'}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={profile.email}
                    disabled
                    variant="filled"
                    helperText="Email cannot be changed"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={editMode ? (editData.phone || '') : (profile.phone || '')}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    disabled={!editMode}
                    variant={editMode ? 'outlined' : 'filled'}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Address"
                    value={editMode ? (editData.address || '') : (profile.address || '')}
                    onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                    disabled={!editMode}
                    variant={editMode ? 'outlined' : 'filled'}
                    multiline
                    rows={2}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Date of Birth"
                    type="date"
                    value={editMode ? (editData.dateOfBirth ? editData.dateOfBirth.split('T')[0] : '') : (profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '')}
                    onChange={(e) => setEditData({ ...editData, dateOfBirth: e.target.value })}
                    disabled={!editMode}
                    variant={editMode ? 'outlined' : 'filled'}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="National ID"
                    value={editMode ? (editData.nationalId || '') : (profile.nationalId || '')}
                    onChange={(e) => setEditData({ ...editData, nationalId: e.target.value })}
                    disabled={!editMode}
                    variant={editMode ? 'outlined' : 'filled'}
                  />
                </Grid>
                {profile.role === 'MEMBER' && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Employment Status"
                        value={editMode ? (editData.employmentStatus || '') : (profile.employmentStatus || '')}
                        onChange={(e) => setEditData({ ...editData, employmentStatus: e.target.value })}
                        disabled={!editMode}
                        variant={editMode ? 'outlined' : 'filled'}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Monthly Income (UGX)"
                        type="number"
                        value={editMode ? (editData.monthlyIncome || '') : (profile.monthlyIncome || '')}
                        onChange={(e) => setEditData({ ...editData, monthlyIncome: parseFloat(e.target.value) })}
                        disabled={!editMode}
                        variant={editMode ? 'outlined' : 'filled'}
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Account Summary */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: 'secondary.main',
                    fontSize: '2rem',
                    fontWeight: 600,
                    mr: 2
                  }}
                >
                  {profile.firstName[0]}{profile.lastName[0]}
                </Avatar>
                <Box>
                  <Typography variant="h6">{profile.firstName} {profile.lastName}</Typography>
                  <Chip
                    icon={<RoleIcon />}
                    label={getRoleDisplayName(profile.role)}
                    color={getRoleColor(profile.role) as any}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <EmailIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Email"
                    secondary={profile.email}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PhoneIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Phone"
                    secondary={profile.phone || 'Not provided'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <DateIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Member Since"
                    secondary={formatDate(profile.createdAt)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <SecurityIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Account Status"
                    secondary={
                      <Chip
                        label={profile.isActive ? 'Active' : 'Inactive'}
                        color={profile.isActive ? 'success' : 'error'}
                        size="small"
                      />
                    }
                  />
                </ListItem>
                {profile.lastLogin && (
                  <ListItem>
                    <ListItemIcon>
                      <DateIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Last Login"
                      secondary={formatDate(profile.lastLogin)}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}