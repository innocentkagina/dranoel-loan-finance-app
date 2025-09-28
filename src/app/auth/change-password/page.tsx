'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  CircularProgress
} from '@mui/material'
import { Lock as LockIcon } from '@mui/icons-material'

export default function ChangePasswordPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Redirect if user doesn't need to change password
  if (status === 'authenticated' && !session?.user?.mustChangePassword) {
    // Redirect to appropriate dashboard based on role
    switch (session?.user?.role) {
      case 'MEMBER':
        router.push('/member/dashboard')
        break
      case 'LOANS_OFFICER':
        router.push('/officer/dashboard')
        break
      case 'TREASURER':
        router.push('/treasurer/dashboard')
        break
      case 'ADMINISTRATOR':
        router.push('/administrator')
        break
      default:
        router.push('/')
    }
    return null
  }

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long')
      return
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from current password')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      if (response.ok) {
        setSuccess('Password changed successfully! Redirecting...')

        // Update the session to reflect the password change
        await update({
          ...session,
          user: {
            ...session?.user,
            mustChangePassword: false
          }
        })

        // Redirect after 2 seconds
        setTimeout(() => {
          // Redirect based on user role
          switch (session?.user?.role) {
            case 'MEMBER':
              router.push('/member/dashboard')
              break
            case 'ADMINISTRATOR':
              router.push('/administrator')
              break
            case 'LOANS_OFFICER':
              router.push('/officer/dashboard')
              break
            case 'TREASURER':
              router.push('/treasurer/dashboard')
              break
            default:
              router.push('/')
          }
        }, 2000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to change password')
      }
    } catch (error) {
      console.error('Error changing password:', error)
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <LockIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Change Password Required
          </Typography>
          <Typography variant="body1" color="text.secondary">
            You must change your password before accessing the system.
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

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            margin="normal"
            required
            disabled={loading}
          />

          <TextField
            fullWidth
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            margin="normal"
            required
            disabled={loading}
            helperText="Must be at least 8 characters long"
          />

          <TextField
            fullWidth
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            margin="normal"
            required
            disabled={loading}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Change Password'}
          </Button>
        </form>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Button
            color="secondary"
            onClick={async () => {
              try {
                await fetch('/api/auth/logout', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' }
                })
              } catch (error) {
                console.error('Failed to log logout audit:', error)
              }
              signOut()
            }}
            disabled={loading}
          >
            Sign Out Instead
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}