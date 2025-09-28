'use client'

import { SessionProvider, useSession, signOut } from 'next-auth/react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AppBar, Toolbar, Typography, Box, Container, Button, Menu, MenuItem, Avatar, IconButton, Badge, List, ListItem, ListItemText, ListItemIcon, Divider, Chip } from '@mui/material'
import { AccountCircle, ExitToApp, Notifications, NotificationsNone, Circle, CheckCircle, MarkEmailRead, Logout, AccountBalance as LoanIcon, Payment as PaymentIcon, Assignment as ApplicationIcon, Receipt as StatementIcon, MoneyOff as WithdrawalIcon, Savings as SavingsIcon, MoreVert as ServicesIcon, Dashboard as DashboardIcon, People as PeopleIcon, Gavel as ApprovalIcon, Assessment as StatisticsIcon, Person as PersonIcon, Email as EmailIcon, Badge as RoleIcon, AccountBalance as BankIcon, Security as SecurityIcon, MonetizationOn as MonetizationOnIcon } from '@mui/icons-material'
import { useState, useEffect } from 'react'
import LoanApplicationModal from '../components/LoanApplicationModal'
import Logo from '../components/Logo'
import Footer from '../components/Footer'
import GlobalLoader from '../components/GlobalLoader'
import { LoadingProvider, useLoading } from '../contexts/LoadingContext'
import { useRouterLoading } from '../hooks/useRouterLoading'
import Link from 'next/link'

const theme = createTheme({
  palette: {
    primary: {
      main: '#0F172A', // Deep slate blue
      light: '#334155',
      dark: '#020617',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#F97316', // Vibrant orange
      light: '#FB923C',
      dark: '#C2410C',
      contrastText: '#ffffff',
    },
    success: {
      main: '#10B981', // Emerald green
      light: '#34D399',
      dark: '#047857',
    },
    warning: {
      main: '#F59E0B', // Amber
      light: '#FBBF24',
      dark: '#D97706',
    },
    error: {
      main: '#EF4444', // Red
      light: '#F87171',
      dark: '#DC2626',
    },
    background: {
      default: '#FAFAFA', // Light gray background
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',
      secondary: '#64748B',
    },
    grey: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
    },
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    h1: {
      fontWeight: 700,
      color: '#0F172A',
    },
    h2: {
      fontWeight: 600,
      color: '#0F172A',
    },
    h3: {
      fontWeight: 600,
      color: '#0F172A',
    },
    h4: {
      fontWeight: 600,
      color: '#0F172A',
    },
    h5: {
      fontWeight: 500,
      color: '#0F172A',
    },
    h6: {
      fontWeight: 500,
      color: '#0F172A',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
        contained: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#0F172A',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
})

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  sender?: {
    firstName: string
    lastName: string
    email: string
  }
}

function NotificationsMenu() {
  const { data: session } = useSession()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchNotifications = async () => {
    if (!session?.user) return

    setLoading(true)
    try {
      const response = await fetch('/api/notifications?limit=10')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user) {
      fetchNotifications()
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [session])

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read' })
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH'
      })

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'APPLICATION_SUBMITTED':
      case 'APPLICATION_APPROVED':
      case 'APPLICATION_REJECTED':
        return <Circle color="primary" />
      case 'PAYMENT_DUE':
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_OVERDUE':
        return <Circle color="warning" />
      case 'LOAN_DISBURSED':
      case 'LOAN_COMPLETED':
        return <Circle color="success" />
      default:
        return <Circle color="info" />
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  if (!session?.user) return null

  return (
    <>
      <IconButton
        size="large"
        aria-label="notifications"
        aria-controls="notifications-menu"
        aria-haspopup="true"
        onClick={handleMenuOpen}
        color="inherit"
      >
        <Badge badgeContent={unreadCount} color="error">
          {unreadCount > 0 ? <Notifications /> : <NotificationsNone />}
        </Badge>
      </IconButton>

      <Menu
        id="notifications-menu"
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
        PaperProps={{
          sx: { width: 380, maxHeight: 480 }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notifications</Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<MarkEmailRead />}
              onClick={markAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />

        {loading ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="text.secondary">Loading...</Typography>
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="text.secondary">No notifications</Typography>
          </Box>
        ) : (
          <List sx={{ p: 0, maxHeight: 360, overflow: 'auto' }}>
            {notifications.map((notification) => (
              <ListItem
                key={notification.id}
                sx={{
                  backgroundColor: notification.isRead ? 'transparent' : 'action.hover',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'action.selected' }
                }}
                onClick={() => !notification.isRead && markAsRead(notification.id)}
              >
                <ListItemIcon>
                  {getNotificationIcon(notification.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="body2" fontWeight={notification.isRead ? 'normal' : 'bold'}>
                        {notification.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTimeAgo(notification.createdAt)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {notification.message}
                      </Typography>
                      {notification.sender && (
                        <Typography variant="caption" color="text.secondary">
                          From: {notification.sender.firstName} {notification.sender.lastName}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                {!notification.isRead && (
                  <Chip size="small" label="New" color="primary" />
                )}
              </ListItem>
            ))}
          </List>
        )}
      </Menu>
    </>
  )
}

function NavigationBar() {
  const { data: session } = useSession()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [servicesAnchorEl, setServicesAnchorEl] = useState<null | HTMLElement>(null)
  const [officerMenuAnchorEl, setOfficerMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [loanModalOpen, setLoanModalOpen] = useState(false)

  // Add router loading hook
  useRouterLoading()

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleServicesMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setServicesAnchorEl(event.currentTarget)
  }

  const handleServicesMenuClose = () => {
    setServicesAnchorEl(null)
  }

  const handleOfficerMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setOfficerMenuAnchorEl(event.currentTarget)
  }

  const handleOfficerMenuClose = () => {
    setOfficerMenuAnchorEl(null)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    handleMenuClose()

    try {
      // Log logout audit before signing out
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('Failed to log logout audit:', error)
    }

    // Sign out
    signOut({
      callbackUrl: '/',
      redirect: true
    }).catch((error) => {
      console.error('Logout error:', error)
      setIsLoggingOut(false)
    })
  }

  return (
    <AppBar position="static">
      <Toolbar>
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
          <Logo size="medium" variant="full" color="primary" />
        </Box>

        {session ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                Welcome, {session.user.firstName || session.user.name}
              </Typography>

              {/* Member Services Menu */}
              {session.user.role === 'MEMBER' && (
                <Button
                  variant="outlined"
                  startIcon={<ServicesIcon />}
                  aria-label="member services"
                  aria-controls="services-menu"
                  aria-haspopup="true"
                  onClick={handleServicesMenuOpen}
                  sx={{
                    display: { xs: 'none', md: 'flex' },
                    color: 'inherit',
                    borderColor: 'rgba(255,255,255,0.3)',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      borderColor: 'rgba(255,255,255,0.5)',
                      transform: 'translateY(-1px)',
                    },
                    '&:active': {
                      transform: 'translateY(0)',
                    },
                    transition: 'all 0.2s ease-in-out',
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    minWidth: 'auto',
                  }}
                >
                  Services
                </Button>
              )}

              {/* Treasurer Menu */}
              {session.user.role === 'TREASURER' && (
                <Button
                  variant="outlined"
                  startIcon={<BankIcon />}
                  aria-label="treasurer tools"
                  aria-controls="treasurer-menu"
                  aria-haspopup="true"
                  onClick={handleOfficerMenuOpen}
                  sx={{
                    display: { xs: 'none', md: 'flex' },
                    color: 'inherit',
                    borderColor: 'rgba(255,255,255,0.3)',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      borderColor: 'rgba(255,255,255,0.5)',
                      transform: 'translateY(-1px)',
                    },
                    '&:active': {
                      transform: 'translateY(0)',
                    },
                    transition: 'all 0.2s ease-in-out',
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    minWidth: 'auto',
                  }}
                >
                  Treasurer Tools
                </Button>
              )}

              {/* Loan Officer Menu */}
              {session.user.role === 'LOANS_OFFICER' && (
                <Button
                  variant="outlined"
                  startIcon={<ApprovalIcon />}
                  aria-label="officer tools"
                  aria-controls="officer-menu"
                  aria-haspopup="true"
                  onClick={handleOfficerMenuOpen}
                  sx={{
                    display: { xs: 'none', md: 'flex' },
                    color: 'inherit',
                    borderColor: 'rgba(255,255,255,0.3)',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      borderColor: 'rgba(255,255,255,0.5)',
                      transform: 'translateY(-1px)',
                    },
                    '&:active': {
                      transform: 'translateY(0)',
                    },
                    transition: 'all 0.2s ease-in-out',
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    minWidth: 'auto',
                  }}
                >
                  Officer Tools
                </Button>
              )}

              {/* Administrator Menu */}
              {session.user.role === 'ADMINISTRATOR' && (
                <Button
                  variant="outlined"
                  startIcon={<SecurityIcon />}
                  aria-label="admin tools"
                  aria-controls="admin-menu"
                  aria-haspopup="true"
                  onClick={handleOfficerMenuOpen}
                  sx={{
                    display: { xs: 'none', md: 'flex' },
                    color: 'inherit',
                    borderColor: 'rgba(255,255,255,0.3)',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      borderColor: 'rgba(255,255,255,0.5)',
                      transform: 'translateY(-1px)',
                    },
                    '&:active': {
                      transform: 'translateY(0)',
                    },
                    transition: 'all 0.2s ease-in-out',
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    minWidth: 'auto',
                  }}
                >
                  Admin Tools
                </Button>
              )}

              <NotificationsMenu />
              <IconButton
                size="large"
                edge="end"
                aria-label="account menu"
                aria-controls="account-menu"
                aria-haspopup="true"
                onClick={handleMenuOpen}
                color="inherit"
                sx={{
                  borderRadius: 2,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    transform: 'translateY(-1px)',
                  }
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: 'secondary.main',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                >
                  {(session.user.firstName?.[0] || session.user.name?.[0] || session.user.email?.[0] || 'U').toUpperCase()}
                </Avatar>
              </IconButton>
            </Box>
            <Menu
              id="account-menu"
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
              PaperProps={{
                sx: {
                  minWidth: 280,
                  borderRadius: 2,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                  border: '1px solid',
                  borderColor: 'divider',
                }
              }}
            >
              {/* Profile Header */}
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: 'secondary.main',
                      fontSize: '1.125rem',
                      fontWeight: 600,
                    }}
                  >
                    {(session.user.firstName?.[0] || session.user.name?.[0] || session.user.email?.[0] || 'U').toUpperCase()}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight="medium" sx={{ lineHeight: 1.2 }}>
                      {session.user.firstName && session.user.lastName
                        ? `${session.user.firstName} ${session.user.lastName}`
                        : session.user.name || 'User'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, lineHeight: 1.2 }}>
                      {session.user.email}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ mt: 1.5 }}>
                  <Chip
                    icon={<RoleIcon sx={{ fontSize: '0.875rem' }} />}
                    label={session.user.role?.replace('_', ' ') || 'Member'}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{
                      fontSize: '0.75rem',
                      height: 24,
                      '& .MuiChip-icon': { ml: 0.5 }
                    }}
                  />
                </Box>
              </Box>

              {/* Profile Information */}
              <Box sx={{ py: 1 }}>
                <MenuItem
                  component={Link}
                  href="/profile"
                  onClick={handleMenuClose}
                  sx={{
                    py: 1.5,
                    textDecoration: 'none',
                    color: 'inherit',
                    '&:hover': { backgroundColor: 'action.hover' }
                  }}
                >
                  <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">Profile</Typography>
                    <Typography variant="caption" color="text.secondary">
                      View and edit your profile
                    </Typography>
                  </Box>
                </MenuItem>

                <MenuItem
                  onClick={handleMenuClose}
                  sx={{
                    py: 1.5,
                    cursor: 'default',
                    '&:hover': { backgroundColor: 'transparent' }
                  }}
                >
                  <EmailIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">Account Details</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Member since {new Date(session.user.createdAt || Date.now()).getFullYear()}
                    </Typography>
                  </Box>
                </MenuItem>
              </Box>

              <Divider />

              {/* Logout */}
              <MenuItem
                onClick={handleLogout}
                disabled={isLoggingOut}
                sx={{
                  py: 1.5,
                  color: isLoggingOut ? 'text.disabled' : 'error.main',
                  '&:hover': {
                    backgroundColor: isLoggingOut ? 'transparent' : 'error.lighter',
                  }
                }}
              >
                {isLoggingOut ? (
                  <>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        mr: 2,
                        border: '2px solid',
                        borderColor: 'primary.main',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        '@keyframes spin': {
                          '0%': { transform: 'rotate(0deg)' },
                          '100%': { transform: 'rotate(360deg)' },
                        },
                      }}
                    />
                    <Box>
                      <Typography variant="body2" fontWeight="medium">Signing out...</Typography>
                      <Typography variant="caption" color="text.secondary">Please wait</Typography>
                    </Box>
                  </>
                ) : (
                  <>
                    <Logout sx={{ mr: 2 }} />
                    <Box>
                      <Typography variant="body2" fontWeight="medium">Sign Out</Typography>
                      <Typography variant="caption" color="text.secondary">End your session</Typography>
                    </Box>
                  </>
                )}
              </MenuItem>
            </Menu>

            {/* Member Services Menu */}
            {session.user.role === 'MEMBER' && (
              <Menu
                id="services-menu"
                anchorEl={servicesAnchorEl}
                open={Boolean(servicesAnchorEl)}
                onClose={handleServicesMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                PaperProps={{
                  sx: { minWidth: 200 }
                }}
              >
                <MenuItem
                  onClick={() => {
                    handleServicesMenuClose()
                    setLoanModalOpen(true)
                  }}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                >
                  <ApplicationIcon color="primary" />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">Apply for Loan</Typography>
                    <Typography variant="caption" color="text.secondary">Submit new loan request</Typography>
                  </Box>
                </MenuItem>

                <MenuItem
                  component={Link}
                  href="/withdrawal-request"
                  onClick={handleServicesMenuClose}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit' }}
                >
                  <WithdrawalIcon color="warning" />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">Request Withdrawal</Typography>
                    <Typography variant="caption" color="text.secondary">Withdraw from your savings</Typography>
                  </Box>
                </MenuItem>

                <MenuItem
                  component={Link}
                  href="/statements/savings"
                  onClick={handleServicesMenuClose}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit' }}
                >
                  <SavingsIcon color="success" />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">Savings Statement</Typography>
                    <Typography variant="caption" color="text.secondary">View savings account details</Typography>
                  </Box>
                </MenuItem>

                <MenuItem
                  component={Link}
                  href="/statements/shares"
                  onClick={handleServicesMenuClose}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit' }}
                >
                  <StatementIcon color="info" />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">Share Statement</Typography>
                    <Typography variant="caption" color="text.secondary">View share account details</Typography>
                  </Box>
                </MenuItem>

                <MenuItem
                  component={Link}
                  href="/statements/loans"
                  onClick={handleServicesMenuClose}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit' }}
                >
                  <LoanIcon color="primary" />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">Loan Statement</Typography>
                    <Typography variant="caption" color="text.secondary">View loan account details</Typography>
                  </Box>
                </MenuItem>
              </Menu>
            )}

            {/* Treasurer Menu */}
            {session.user.role === 'TREASURER' && (
              <Menu
                id="treasurer-menu"
                anchorEl={officerMenuAnchorEl}
                open={Boolean(officerMenuAnchorEl)}
                onClose={handleOfficerMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                PaperProps={{
                  sx: { minWidth: 240 }
                }}
              >
                <MenuItem
                  component={Link}
                  href="/treasurer/dashboard"
                  onClick={handleOfficerMenuClose}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit' }}
                >
                  <DashboardIcon color="primary" />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">Dashboard</Typography>
                    <Typography variant="caption" color="text.secondary">Treasurer overview</Typography>
                  </Box>
                </MenuItem>

                <MenuItem
                  component={Link}
                  href="/treasurer/payments"
                  onClick={handleOfficerMenuClose}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit' }}
                >
                  <PaymentIcon color="success" />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">Payment Processing</Typography>
                    <Typography variant="caption" color="text.secondary">Approve and process payments</Typography>
                  </Box>
                </MenuItem>

                <MenuItem
                  component={Link}
                  href="/treasurer/deposits"
                  onClick={handleOfficerMenuClose}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit' }}
                >
                  <SavingsIcon color="info" />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">Deposits & Withdrawals</Typography>
                    <Typography variant="caption" color="text.secondary">Manage member accounts</Typography>
                  </Box>
                </MenuItem>

                <MenuItem
                  component={Link}
                  href="/treasurer/disbursements"
                  onClick={handleOfficerMenuClose}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit' }}
                >
                  <MonetizationOnIcon color="secondary" />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">Loan Disbursements</Typography>
                    <Typography variant="caption" color="text.secondary">Disburse approved loans</Typography>
                  </Box>
                </MenuItem>

                <MenuItem
                  component={Link}
                  href="/treasurer/reports"
                  onClick={handleOfficerMenuClose}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit' }}
                >
                  <StatisticsIcon color="warning" />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">Reports & Analytics</Typography>
                    <Typography variant="caption" color="text.secondary">Financial reports and statistics</Typography>
                  </Box>
                </MenuItem>
              </Menu>
            )}

            {/* Administrator Menu */}
            {session.user.role === 'ADMINISTRATOR' && (
              <Menu
                id="admin-menu"
                anchorEl={officerMenuAnchorEl}
                open={Boolean(officerMenuAnchorEl)}
                onClose={handleOfficerMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                PaperProps={{
                  sx: { minWidth: 240 }
                }}
              >
                <MenuItem
                  component={Link}
                  href="/administrator"
                  onClick={handleOfficerMenuClose}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit' }}
                >
                  <DashboardIcon color="primary" />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">Dashboard</Typography>
                    <Typography variant="caption" color="text.secondary">Administrator overview</Typography>
                  </Box>
                </MenuItem>

                <MenuItem
                  component={Link}
                  href="/administrator/users"
                  onClick={handleOfficerMenuClose}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit' }}
                >
                  <PeopleIcon color="warning" />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">User Management</Typography>
                    <Typography variant="caption" color="text.secondary">Manage users and roles</Typography>
                  </Box>
                </MenuItem>

                <MenuItem
                  component={Link}
                  href="/administrator/audit"
                  onClick={handleOfficerMenuClose}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit' }}
                >
                  <StatisticsIcon color="info" />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">Audit Trail</Typography>
                    <Typography variant="caption" color="text.secondary">Monitor system activities</Typography>
                  </Box>
                </MenuItem>

                <MenuItem
                  component={Link}
                  href="/administrator/database"
                  onClick={handleOfficerMenuClose}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit' }}
                >
                  <BankIcon color="success" />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">Database Operations</Typography>
                    <Typography variant="caption" color="text.secondary">Manage database health</Typography>
                  </Box>
                </MenuItem>

                <MenuItem
                  component={Link}
                  href="/administrator/reports"
                  onClick={handleOfficerMenuClose}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit' }}
                >
                  <StatisticsIcon color="primary" />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">System Reports</Typography>
                    <Typography variant="caption" color="text.secondary">Analytics and reporting</Typography>
                  </Box>
                </MenuItem>

                <MenuItem
                  component={Link}
                  href="/administrator/settings"
                  onClick={handleOfficerMenuClose}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit' }}
                >
                  <SecurityIcon color="error" />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">System Settings</Typography>
                    <Typography variant="caption" color="text.secondary">Configure system parameters</Typography>
                  </Box>
                </MenuItem>
              </Menu>
            )}

            {/* Loan Officer Menu */}
            {session.user.role === 'LOANS_OFFICER' && (
              <Menu
                id="officer-menu"
                anchorEl={officerMenuAnchorEl}
                open={Boolean(officerMenuAnchorEl)}
                onClose={handleOfficerMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                PaperProps={{
                  sx: { minWidth: 220 }
                }}
              >
                <MenuItem
                  component={Link}
                  href="/officer/dashboard"
                  onClick={handleOfficerMenuClose}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit' }}
                >
                  <DashboardIcon color="primary" />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">Dashboard</Typography>
                    <Typography variant="caption" color="text.secondary">Officer overview</Typography>
                  </Box>
                </MenuItem>

                <MenuItem
                  component={Link}
                  href="/officer/loan-requests"
                  onClick={handleOfficerMenuClose}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit' }}
                >
                  <ApplicationIcon color="warning" />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">Loan Applications</Typography>
                    <Typography variant="caption" color="text.secondary">Review and approve loans</Typography>
                  </Box>
                </MenuItem>

                <MenuItem
                  component={Link}
                  href="/officer/member-statements"
                  onClick={handleOfficerMenuClose}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit' }}
                >
                  <PeopleIcon color="info" />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">Member Statements</Typography>
                    <Typography variant="caption" color="text.secondary">View all member accounts</Typography>
                  </Box>
                </MenuItem>

                <MenuItem
                  component={Link}
                  href="/officer/statistics"
                  onClick={handleOfficerMenuClose}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit' }}
                >
                  <StatisticsIcon color="success" />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">Statistics</Typography>
                    <Typography variant="caption" color="text.secondary">Loan analytics and charts</Typography>
                  </Box>
                </MenuItem>
              </Menu>
            )}

            {/* Loan Application Modal */}
            <LoanApplicationModal
              open={loanModalOpen}
              onClose={() => setLoanModalOpen(false)}
              onSuccess={() => {
                // Could show a success message or redirect
                console.log('Loan application submitted successfully!')
              }}
            />
          </>
        ) : (
          <Button color="inherit" href="/auth/signin">
            Sign In
          </Button>
        )}
      </Toolbar>
    </AppBar>
  )
}

function AppContent({ children }: { children: React.ReactNode }) {
  const { isLoading, loadingMessage } = useLoading()

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'grey.50' }}>
        <NavigationBar />
        <Container maxWidth={false} sx={{ py: 2, flex: 1 }}>
          {children}
        </Container>
        <Footer />
      </Box>
      <GlobalLoader show={isLoading} message={loadingMessage} />
    </>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoadingProvider>
          <AppContent>
            {children}
          </AppContent>
        </LoadingProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}