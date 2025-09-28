'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Chip,
  Divider,
  Stack
} from '@mui/material'
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon
} from '@mui/icons-material'
import Breadcrumbs from '@/components/Breadcrumbs'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  address?: string
  role: string | null
  status: string
  isActive: boolean
  mustChangePassword: boolean
  employmentStatus?: string
  monthlyIncome?: number
  creditScore?: number
  dateOfBirth?: string
  nationalId?: string
  approvedAt?: string
  approvedBy?: string
  createdAt: string
  lastLogin?: string
}

export default function EditUserPage() {
  const { data: session, status } = useSession()
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState(0)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    role: '',
    status: '',
    isActive: false,
    mustChangePassword: false,
    employmentStatus: '',
    monthlyIncome: '',
    creditScore: ''
  })

  useEffect(() => {
    if (session?.user?.role === 'ADMINISTRATOR' && userId) {
      fetchUser()
    }
  }, [session, userId])

  const fetchUser = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/administrator/users/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setFormData({
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          phone: data.user.phone || '',
          address: data.user.address || '',
          role: data.user.role || '',
          status: data.user.status || '',
          isActive: data.user.isActive || false,
          mustChangePassword: data.user.mustChangePassword || false,
          employmentStatus: data.user.employmentStatus || '',
          monthlyIncome: data.user.monthlyIncome?.toString() || '',
          creditScore: data.user.creditScore?.toString() || ''
        })
      } else {
        setError('Failed to fetch user details')
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      setError('Failed to fetch user details')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const response = await fetch(`/api/administrator/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          address: formData.address,
          role: formData.role,
          status: formData.status,
          isActive: formData.isActive,
          mustChangePassword: formData.mustChangePassword,
          employmentStatus: formData.employmentStatus,
          monthlyIncome: formData.monthlyIncome ? parseFloat(formData.monthlyIncome) : null,
          creditScore: formData.creditScore ? parseInt(formData.creditScore) : null
        })
      })

      if (response.ok) {
        setSuccess('User updated successfully')
        setTimeout(() => {
          router.push('/administrator/users')
        }, 2000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update user')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      setError('Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.push('/administrator/users')
  }

  if (status === 'loading' || loading) {
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

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          User not found.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs />

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PersonIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          Edit User: {user.firstName} {user.lastName}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Update user information and settings
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Tabs value={activeTab} onChange={(_, newTab) => setActiveTab(newTab)}>
            <Tab label="Basic Information" />
            <Tab label="Account Settings" />
            <Tab label="Additional Details" />
          </Tabs>

          <Box sx={{ mt: 3 }}>
            {activeTab === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={user.email}
                    disabled
                    helperText="Email cannot be changed"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Address"
                    multiline
                    rows={3}
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </Grid>
              </Grid>
            )}

            {activeTab === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Role</InputLabel>
                    <Select
                      value={formData.role}
                      label="Role"
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                    >
                      <MenuItem value="">No Role</MenuItem>
                      <MenuItem value="MEMBER">Member</MenuItem>
                      <MenuItem value="LOANS_OFFICER">Loans Officer</MenuItem>
                      <MenuItem value="TREASURER">Treasurer</MenuItem>
                      <MenuItem value="ADMINISTRATOR">Administrator</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status}
                      label="Status"
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                    >
                      <MenuItem value="PENDING">Pending</MenuItem>
                      <MenuItem value="ACTIVE">Active</MenuItem>
                      <MenuItem value="INACTIVE">Inactive</MenuItem>
                      <MenuItem value="SUSPENDED">Suspended</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isActive}
                        onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                      />
                    }
                    label="Account Active"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.mustChangePassword}
                        onChange={(e) => setFormData({...formData, mustChangePassword: e.target.checked})}
                      />
                    }
                    label="Must Change Password on Next Login"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Account Information
                  </Typography>
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">Created:</Typography>
                      <Typography variant="body2">{new Date(user.createdAt).toLocaleString()}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">Last Login:</Typography>
                      <Typography variant="body2">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">Must Change Password:</Typography>
                      <Chip
                        label={user.mustChangePassword ? 'Yes' : 'No'}
                        color={user.mustChangePassword ? 'warning' : 'success'}
                        size="small"
                      />
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            )}

            {activeTab === 2 && (
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Employment Status"
                    value={formData.employmentStatus}
                    onChange={(e) => setFormData({...formData, employmentStatus: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Monthly Income"
                    type="number"
                    value={formData.monthlyIncome}
                    onChange={(e) => setFormData({...formData, monthlyIncome: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Credit Score"
                    type="number"
                    value={formData.creditScore}
                    onChange={(e) => setFormData({...formData, creditScore: e.target.value})}
                  />
                </Grid>
              </Grid>
            )}
          </Box>

          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}