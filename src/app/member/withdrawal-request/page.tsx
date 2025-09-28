'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
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
  CircularProgress,
  Grid,
  Divider,
} from '@mui/material'
import {
  MoneyOff as WithdrawalIcon,
  AccountBalanceWallet as WalletIcon,
  Phone as PhoneIcon,
  CreditCard as CreditCardIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'

const withdrawalMethods = [
  {
    value: 'MTN_MOBILE_MONEY',
    label: 'MTN Mobile Money',
    icon: <PhoneIcon />,
    color: '#FFCC00'
  },
  {
    value: 'AIRTEL_MONEY',
    label: 'Airtel Money',
    icon: <PhoneIcon />,
    color: '#FF0000'
  },
  {
    value: 'BANK_TRANSFER',
    label: 'Bank Transfer',
    icon: <BankIcon />,
    color: '#1976d2'
  },
  {
    value: 'CASH_PICKUP',
    label: 'Cash Pickup at Branch',
    icon: <WalletIcon />,
    color: '#4CAF50'
  },
]

export default function WithdrawalRequestPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [formData, setFormData] = useState({
    amount: '',
    withdrawalMethod: '',
    phoneNumber: '',
    bankAccount: '',
    bankName: '',
    accountHolderName: '',
    reason: '',
    preferredBranch: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [savingsBalance, setSavingsBalance] = useState(0)
  const [balanceLoading, setBalanceLoading] = useState(true)

  useEffect(() => {
    if (session?.user) {
      fetchSavingsBalance()
    }
  }, [session])

  const fetchSavingsBalance = async () => {
    setBalanceLoading(true)
    try {
      const response = await fetch('/api/statements/savings?limit=1')
      if (response.ok) {
        const data = await response.json()
        setSavingsBalance(data.accountData?.currentBalance || 0)
      }
    } catch (error) {
      console.error('Error fetching savings balance:', error)
      setSavingsBalance(0)
    } finally {
      setBalanceLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError('')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid withdrawal amount')
      return
    }

    if (parseFloat(formData.amount) > savingsBalance) {
      setError('Withdrawal amount cannot exceed available balance')
      return
    }

    if (!formData.withdrawalMethod) {
      setError('Please select a withdrawal method')
      return
    }

    // Validate method-specific fields
    if (['MTN_MOBILE_MONEY', 'AIRTEL_MONEY'].includes(formData.withdrawalMethod) && !formData.phoneNumber) {
      setError('Please enter your phone number')
      return
    }

    if (formData.withdrawalMethod === 'BANK_TRANSFER') {
      if (!formData.bankAccount || !formData.bankName || !formData.accountHolderName) {
        setError('Please fill in all bank details')
        return
      }
    }

    if (formData.withdrawalMethod === 'CASH_PICKUP' && !formData.preferredBranch) {
      setError('Please select your preferred branch for cash pickup')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/member/withdrawal-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to submit withdrawal request')
        return
      }

      setSuccess(`Withdrawal request submitted successfully! Reference: ${data.referenceNumber}`)

      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          amount: '',
          withdrawalMethod: '',
          phoneNumber: '',
          bankAccount: '',
          bankName: '',
          accountHolderName: '',
          reason: '',
          preferredBranch: ''
        })
        setSuccess('')
        // Refresh savings balance
        fetchSavingsBalance()
      }, 3000)

    } catch (error) {
      console.error('Withdrawal request error:', error)
      setError('Failed to submit withdrawal request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getMethodDetails = () => {
    const method = withdrawalMethods.find(m => m.value === formData.withdrawalMethod)
    if (!method) return null

    switch (formData.withdrawalMethod) {
      case 'MTN_MOBILE_MONEY':
      case 'AIRTEL_MONEY':
        return (
          <TextField
            fullWidth
            label="Phone Number"
            value={formData.phoneNumber}
            onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
            placeholder="+256700123456"
            required
            margin="normal"
            InputProps={{
              startAdornment: <PhoneIcon sx={{ mr: 1, color: method.color }} />
            }}
          />
        )

      case 'BANK_TRANSFER':
        return (
          <Box>
            <TextField
              fullWidth
              label="Bank Name"
              value={formData.bankName}
              onChange={(e) => handleInputChange('bankName', e.target.value)}
              required
              margin="normal"
            />
            <TextField
              fullWidth
              label="Account Holder Name"
              value={formData.accountHolderName}
              onChange={(e) => handleInputChange('accountHolderName', e.target.value)}
              required
              margin="normal"
            />
            <TextField
              fullWidth
              label="Account Number"
              value={formData.bankAccount}
              onChange={(e) => handleInputChange('bankAccount', e.target.value)}
              required
              margin="normal"
              InputProps={{
                startAdornment: <BankIcon sx={{ mr: 1, color: method.color }} />
              }}
            />
          </Box>
        )

      case 'CASH_PICKUP':
        return (
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Preferred Branch</InputLabel>
            <Select
              value={formData.preferredBranch}
              label="Preferred Branch"
              onChange={(e) => handleInputChange('preferredBranch', e.target.value)}
            >
              <MenuItem value="kampala-main">Kampala Main Branch</MenuItem>
              <MenuItem value="entebbe-road">Entebbe Road Branch</MenuItem>
              <MenuItem value="jinja-road">Jinja Road Branch</MenuItem>
              <MenuItem value="ntinda">Ntinda Branch</MenuItem>
            </Select>
          </FormControl>
        )

      default:
        return null
    }
  }

  if (status === 'loading') {
    return <CircularProgress />
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs />
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          <WithdrawalIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Withdrawal Request
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Request a withdrawal from your savings account
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Account Balance Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Available Balance
              </Typography>
              {balanceLoading ? (
                <CircularProgress size={24} sx={{ my: 2 }} />
              ) : (
                <Typography variant="h4" color="success.main" gutterBottom>
                  {formatCurrency(savingsBalance)}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                Savings Account Balance
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Withdrawal Form */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Withdrawal Details
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  type="number"
                  label="Withdrawal Amount"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  required
                  margin="normal"
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>UGX</Typography>
                  }}
                  helperText={`Maximum: ${formatCurrency(savingsBalance)}`}
                />

                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Withdrawal Method</InputLabel>
                  <Select
                    value={formData.withdrawalMethod}
                    label="Withdrawal Method"
                    onChange={(e) => handleInputChange('withdrawalMethod', e.target.value)}
                  >
                    {withdrawalMethods.map((method) => (
                      <MenuItem key={method.value} value={method.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {method.icon}
                          <Typography>{method.label}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {getMethodDetails()}

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Reason for Withdrawal (Optional)"
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  margin="normal"
                  placeholder="Please specify the reason for this withdrawal..."
                />

                <Divider sx={{ my: 3 }} />

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={() => router.back()}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || !formData.amount || !formData.withdrawalMethod}
                    startIcon={loading ? <CircularProgress size={20} /> : <WithdrawalIcon />}
                  >
                    {loading ? 'Processing...' : 'Submit Request'}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}