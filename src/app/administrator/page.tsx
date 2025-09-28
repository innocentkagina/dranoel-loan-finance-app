'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Paper,
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
  AccountBalance as BankIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Assessment as ReportIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'

interface AdminStats {
  totalUsers: number
  totalLoans: number
  totalPayments: number
  systemHealth: string
  recentActivity: number
}

export default function AdministratorPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user) {
      fetchAdminStats()
    }
  }, [session])

  const fetchAdminStats = async () => {
    try {
      const response = await fetch('/api/administrator/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return <Box sx={{ p: 3 }}>Loading...</Box>
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  if (session.user.role !== 'ADMINISTRATOR') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. Administrator privileges required.
        </Alert>
      </Box>
    )
  }

  const user = session.user

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs />

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AdminIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          Administrator Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          System administration and management
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: 'primary.main',
                    fontSize: '2rem',
                    mr: 2
                  }}
                >
                  {user.firstName[0]}{user.lastName[0]}
                </Avatar>
                <Box>
                  <Typography variant="h5">
                    {user.firstName} {user.lastName}
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
                    secondary={user.id}
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <EmailIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Email"
                    secondary={user.email}
                  />
                </ListItem>

                {user.phone && (
                  <ListItem>
                    <ListItemIcon>
                      <PhoneIcon color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Phone"
                      secondary={user.phone}
                    />
                  </ListItem>
                )}

                {user.address && (
                  <ListItem>
                    <ListItemIcon>
                      <LocationIcon color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Address"
                      secondary={user.address}
                    />
                  </ListItem>
                )}

                <ListItem>
                  <ListItemIcon>
                    <ScheduleIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Member Since"
                    secondary={new Date(user.createdAt).toLocaleDateString()}
                  />
                </ListItem>

                {user.lastLogin && (
                  <ListItem>
                    <ListItemIcon>
                      <BadgeIcon color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Last Login"
                      secondary={new Date(user.lastLogin).toLocaleDateString()}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Profile Actions
              </Typography>
              <Button
                variant="outlined"
                fullWidth
                sx={{ mb: 1 }}
                onClick={() => router.push('/administrator/profile')}
              >
                View Full Profile
              </Button>
              <Button
                variant="outlined"
                fullWidth
                sx={{ mb: 1 }}
                onClick={() => router.push('/administrator/profile')}
              >
                Basic Profile
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* System Overview */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Overview
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <PeopleIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h4" color="primary">
                      {stats?.totalUsers || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Users
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <BankIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant="h4" color="success.main">
                      {stats?.totalLoans || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Loans
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <TrendingUpIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                    <Typography variant="h4" color="info.main">
                      {stats?.totalPayments || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Payments Today
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <ReportIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h4" color="warning.main">
                      {stats?.recentActivity || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Recent Activity
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Divider sx={{ mb: 3 }} />

              <Typography variant="h6" gutterBottom>
                Administrator Tools
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<PeopleIcon />}
                    onClick={() => router.push('/administrator/users')}
                    sx={{ mb: 2 }}
                  >
                    User Management
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<AssignmentIcon />}
                    onClick={() => router.push('/administrator/users')}
                    sx={{ mb: 2 }}
                  >
                    Role Assignment
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<BankIcon />}
                    onClick={() => router.push('/administrator/database')}
                    sx={{ mb: 2 }}
                  >
                    Database Operations
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<ReportIcon />}
                    onClick={() => router.push('/administrator/audit')}
                    sx={{ mb: 2 }}
                  >
                    Audit Trail
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<TrendingUpIcon />}
                    onClick={() => router.push('/administrator/reports')}
                    sx={{ mb: 2 }}
                  >
                    System Reports
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<AnalyticsIcon />}
                    onClick={() => router.push('/administrator/analytics')}
                    sx={{ mb: 2 }}
                  >
                    Analytics Dashboard
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<SecurityIcon />}
                    onClick={() => router.push('/administrator/settings')}
                    sx={{ mb: 2 }}
                  >
                    System Settings
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Chip
                  label={stats?.systemHealth || 'Unknown'}
                  color={stats?.systemHealth === 'Healthy' ? 'success' : 'warning'}
                  sx={{ mr: 2 }}
                />
                <Typography variant="body2" color="text.secondary">
                  Last updated: {new Date().toLocaleString()}
                </Typography>
              </Box>

              <Alert severity="info" sx={{ mb: 2 }}>
                All critical systems are operating normally. No maintenance required.
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}