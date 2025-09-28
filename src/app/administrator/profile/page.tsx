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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Avatar,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab
} from '@mui/material'
import {
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  VpnKey as KeyIcon,
  Settings as SettingsIcon,
  Timeline as ActivityIcon
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'

interface AdminProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  address?: string
  role: string
  isActive: boolean
  createdAt: string
  lastLogin?: string
  totalLogins: number
  lastPasswordChange: string
}

interface RecentActivity {
  id: string
  action: string
  entityType: string
  createdAt: string
  ipAddress: string
}

export default function AdminProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: ''
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    if (session?.user?.role === 'ADMINISTRATOR') {
      fetchProfile()
      fetchRecentActivity()
    }
  }, [session])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data.user)
        setEditForm({
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          phone: data.user.phone || '',
          address: data.user.address || ''
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      const response = await fetch('/api/administrator/audit?limit=10')
      if (response.ok) {
        const data = await response.json()
        setRecentActivity(data.auditLogs.filter((log: any) => log.userId === session?.user?.id))
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    }
  }

  const handleSaveProfile = async () => {
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.user)
        setEditing(false)
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match')
      return
    }

    try {
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      })

      if (response.ok) {
        setChangePasswordOpen(false)
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
        alert('Password changed successfully')
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to change password')
      }
    } catch (error) {
      console.error('Error changing password:', error)
      alert('Failed to change password')
    }
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

  if (!profile) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load profile data.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs />

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AdminIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          Administrator Profile
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Manage your administrator account and security settings
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Profile Overview */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: 'error.main',
                    fontSize: '2rem',
                    mr: 2
                  }}
                >
                  {profile.firstName[0]}{profile.lastName[0]}
                </Avatar>
                <Box>
                  <Typography variant="h5">
                    {profile.firstName} {profile.lastName}
                  </Typography>
                  <Chip
                    label="ADMINISTRATOR"
                    color="error"
                    size="small"
                    icon={<SecurityIcon />}
                  />
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <PersonIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="User ID"
                    secondary={profile.id}
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <EmailIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Email"
                    secondary={profile.email}
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <ScheduleIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Member Since"
                    secondary={new Date(profile.createdAt).toLocaleDateString()}
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <BadgeIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Last Login"
                    secondary={profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : 'Never'}
                  />
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={() => setEditing(true)}
                  disabled={editing}
                  fullWidth
                >
                  Edit Profile
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<KeyIcon />}
                  onClick={() => setChangePasswordOpen(true)}
                  fullWidth
                >
                  Change Password
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Profile Details */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Tabs value={activeTab} onChange={(_, newTab) => setActiveTab(newTab)}>
                <Tab label="Personal Information" icon={<PersonIcon />} />
                <Tab label="Security Settings" icon={<SecurityIcon />} />
                <Tab label="Recent Activity" icon={<ActivityIcon />} />
              </Tabs>

              <Box sx={{ mt: 3 }}>
                {activeTab === 0 && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="First Name"
                        value={editing ? editForm.firstName : profile.firstName}
                        onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                        disabled={!editing}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Last Name"
                        value={editing ? editForm.lastName : profile.lastName}
                        onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                        disabled={!editing}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Email"
                        value={profile.email}
                        disabled
                        helperText="Email cannot be changed"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Phone"
                        value={editing ? editForm.phone : (profile.phone || '')}
                        onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                        disabled={!editing}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth disabled>
                        <InputLabel>Role</InputLabel>
                        <Select value={profile.role} label="Role">
                          <MenuItem value="ADMINISTRATOR">Administrator</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Address"
                        multiline
                        rows={3}
                        value={editing ? editForm.address : (profile.address || '')}
                        onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                        disabled={!editing}
                      />
                    </Grid>

                    {editing && (
                      <Grid item xs={12}>
                        <Stack direction="row" spacing={2} justifyContent="flex-end">
                          <Button
                            variant="outlined"
                            startIcon={<CancelIcon />}
                            onClick={() => {
                              setEditing(false)
                              setEditForm({
                                firstName: profile.firstName,
                                lastName: profile.lastName,
                                phone: profile.phone || '',
                                address: profile.address || ''
                              })
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleSaveProfile}
                          >
                            Save Changes
                          </Button>
                        </Stack>
                      </Grid>
                    )}
                  </Grid>
                )}

                {activeTab === 1 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Account Security
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle1" gutterBottom>
                              Account Status
                            </Typography>
                            <Chip
                              label={profile.isActive ? 'Active' : 'Inactive'}
                              color={profile.isActive ? 'success' : 'error'}
                              size="small"
                            />
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle1" gutterBottom>
                              Total Logins
                            </Typography>
                            <Typography variant="h4" color="primary">
                              {profile.totalLogins || 0}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle1" gutterBottom>
                              Password Security
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Last password change: {profile.lastPasswordChange ? new Date(profile.lastPasswordChange).toLocaleDateString() : 'Unknown'}
                            </Typography>
                            <Button
                              variant="contained"
                              startIcon={<KeyIcon />}
                              onClick={() => setChangePasswordOpen(true)}
                              sx={{ mt: 2 }}
                            >
                              Change Password
                            </Button>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {activeTab === 2 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Recent Activity
                    </Typography>

                    {recentActivity.length === 0 ? (
                      <Typography color="text.secondary">No recent activity found</Typography>
                    ) : (
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Action</TableCell>
                              <TableCell>Entity</TableCell>
                              <TableCell>Date</TableCell>
                              <TableCell>IP Address</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {recentActivity.map((activity) => (
                              <TableRow key={activity.id}>
                                <TableCell>
                                  <Chip label={activity.action.replace(/_/g, ' ')} size="small" />
                                </TableCell>
                                <TableCell>{activity.entityType}</TableCell>
                                <TableCell>
                                  {new Date(activity.createdAt).toLocaleString()}
                                </TableCell>
                                <TableCell sx={{ fontFamily: 'monospace' }}>
                                  {activity.ipAddress}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Current Password"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="New Password"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Confirm New Password"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangePasswordOpen(false)}>Cancel</Button>
          <Button onClick={handleChangePassword} variant="contained">
            Change Password
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}