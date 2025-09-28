'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Grid,
  LinearProgress,
  Alert,
  Divider,
} from '@mui/material'
import {
  AccountBalance as SavingsIcon,
  TrendingUp as GrowthIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  AccountBalanceWallet as WalletIcon,
  Schedule as TimeIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'

interface SavingsData {
  accountNumber: string
  balance: number
  interestRate: number
  totalInterestEarned: number
  accountAge: number
  linkedBankAccounts: number
  monthlyGrowth: number
  lastTransactionDate: string | null
}

interface SavingsOverviewCardProps {
  compact?: boolean
  showActions?: boolean
}

export default function SavingsOverviewCard({ compact = false, showActions = true }: SavingsOverviewCardProps) {
  const router = useRouter()
  const [savingsData, setSavingsData] = useState<SavingsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSavingsData()
  }, [])

  const fetchSavingsData = async () => {
    try {
      const response = await fetch('/api/member/dashboard-stats')
      if (response.ok) {
        const data = await response.json()
        setSavingsData(data.savings)
      }
    } catch (error) {
      console.error('Error fetching savings data:', error)
    } finally {
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
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
            Loading savings information...
          </Typography>
        </CardContent>
      </Card>
    )
  }

  if (!savingsData) {
    return (
      <Card sx={{ bgcolor: 'primary.50' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SavingsIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6" color="primary.main">
              Savings Account
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Start building your savings to improve your loan eligibility and earn interest.
          </Typography>
          {showActions && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => router.push('/member/savings')}
            >
              Create Savings Account
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <SavingsIcon color="primary" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Savings Balance
                </Typography>
                <Typography variant="h6" color="primary.main">
                  {formatCurrency(savingsData.balance)}
                </Typography>
              </Box>
            </Box>
            {showActions && (
              <Button
                size="small"
                startIcon={<ViewIcon />}
                onClick={() => router.push('/member/savings')}
              >
                View
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SavingsIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6">
              Savings Account
            </Typography>
          </Box>
          <Chip
            label={savingsData.accountNumber}
            size="small"
            variant="outlined"
            color="primary"
          />
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.50', borderRadius: 1 }}>
              <WalletIcon color="success" />
              <Typography variant="h6" color="success.main">
                {formatCurrency(savingsData.balance)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Current Balance
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'info.50', borderRadius: 1 }}>
              <GrowthIcon color="info" />
              <Typography variant="h6" color="info.main">
                {formatCurrency(savingsData.totalInterestEarned)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total Interest
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Interest Rate
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {savingsData.interestRate}% per annum
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" color="text.secondary">
              Monthly Growth
            </Typography>
            <Typography
              variant="body1"
              fontWeight="medium"
              color={savingsData.monthlyGrowth >= 0 ? 'success.main' : 'error.main'}
            >
              {savingsData.monthlyGrowth >= 0 ? '+' : ''}
              {formatCurrency(savingsData.monthlyGrowth)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TimeIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              Account age: {savingsData.accountAge} months
            </Typography>
          </Box>
          {savingsData.linkedBankAccounts > 0 && (
            <Chip
              label={`${savingsData.linkedBankAccounts} bank account${savingsData.linkedBankAccounts > 1 ? 's' : ''} linked`}
              size="small"
              color="success"
              variant="outlined"
            />
          )}
        </Box>

        {savingsData.lastTransactionDate && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            Last transaction: {formatDate(savingsData.lastTransactionDate)}
          </Typography>
        )}

        {showActions && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<ViewIcon />}
              onClick={() => router.push('/member/savings')}
              fullWidth
            >
              Manage Savings
            </Button>
          </Box>
        )}

        {/* Loan Eligibility Indicator */}
        <Divider sx={{ my: 2 }} />
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="caption">
            Your savings balance improves your loan eligibility and can reduce interest rates.
            {savingsData.balance > 1000000 && (
              ' You qualify for preferential loan terms!'
            )}
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  )
}