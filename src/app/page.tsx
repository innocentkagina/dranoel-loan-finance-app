'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Container,
} from '@mui/material'
import {
  AccountBalance as LoanIcon,
  Payment as PaymentIcon,
  Assignment as ApplicationIcon,
  Security as SecurityIcon,
} from '@mui/icons-material'
import Link from 'next/link'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session?.user) {
      // Redirect based on user role
      switch (session.user.role) {
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
          // Stay on home page for unknown roles
          return
      }
    }
  }, [session, router])

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Typography>Loading...</Typography>
      </Box>
    )
  }

  if (session) {
    return null // Will redirect to dashboard
  }

  const features = [
    {
      icon: <LoanIcon sx={{ fontSize: 40 }} />,
      title: 'Loan Management',
      description: 'Comprehensive loan application, approval, and tracking system',
    },
    {
      icon: <PaymentIcon sx={{ fontSize: 40 }} />,
      title: 'Payment Processing',
      description: 'Secure payment tracking and automated payment schedules',
    },
    {
      icon: <ApplicationIcon sx={{ fontSize: 40 }} />,
      title: 'Application Workflow',
      description: 'Streamlined application process with real-time status updates',
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 40 }} />,
      title: 'Secure & Compliant',
      description: 'Bank-level security with full compliance and audit trails',
    },
  ]

  return (
    <Container maxWidth="lg">
      <Box sx={{ textAlign: 'center', mt: 8, mb: 6 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          Welcome to <span style={{ color: '#F97316' }}>Dranoel</span>
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          Your Complete Financial Loan Management Solution
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph sx={{ maxWidth: 600, mx: 'auto' }}>
          Streamline your loan processes with our comprehensive platform designed for
          borrowers, loan officers, and financial institutions.
        </Typography>

        <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            component={Link}
            href="/auth/signin"
            sx={{ minWidth: 150 }}
          >
            Sign In
          </Button>
          <Button
            variant="outlined"
            size="large"
            component={Link}
            href="/auth/signup"
            sx={{ minWidth: 150 }}
          >
            Get Started
          </Button>
        </Box>
      </Box>

      <Grid container spacing={4} sx={{ mt: 4 }}>
        {features.map((feature, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card sx={{ height: '100%', textAlign: 'center', p: 2 }}>
              <CardContent>
                <Box sx={{ color: 'primary.main', mb: 2 }}>
                  {feature.icon}
                </Box>
                <Typography variant="h6" component="h3" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 8, mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Ready to get started?
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Join thousands of users who trust Dranoel for their loan management needs.
        </Typography>
        <Button
          variant="contained"
          size="large"
          component={Link}
          href="/auth/signup"
          sx={{ mt: 2 }}
        >
          Create Your Account
        </Button>
      </Box>
    </Container>
  )
}
