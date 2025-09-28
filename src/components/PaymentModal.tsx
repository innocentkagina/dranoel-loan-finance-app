'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  IconButton,
} from '@mui/material'
import {
  Payment as PaymentIcon,
  Phone as PhoneIcon,
  CreditCard as CreditCardIcon,
  AccountBalance as BankIcon,
  CloudUpload as UploadIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  loanAccount?: {
    id: string
    accountNumber: string
    currentBalance: number
    monthlyPayment: number
    nextPaymentDate: string
  }
  onPaymentSuccess?: () => void
}

const paymentMethods = [
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
    value: 'VISA_CARD',
    label: 'Visa Card',
    icon: <CreditCardIcon />,
    color: '#1565c0'
  },
  {
    value: 'MASTERCARD',
    label: 'Mastercard',
    icon: <CreditCardIcon />,
    color: '#f57c00'
  },
]

export default function PaymentModal({ open, onClose, loanAccount, onPaymentSuccess }: PaymentModalProps) {
  const [formData, setFormData] = useState({
    amount: loanAccount?.monthlyPayment || 0,
    paymentMethod: '',
    phoneNumber: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
    bankAccount: '',
    notes: ''
  })
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError('')
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Only images (JPG, PNG, GIF) and PDF files are allowed.')
        return
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        setError('File size too large. Maximum size is 5MB.')
        return
      }

      setReceiptFile(file)
      setError('')
    }
  }

  const handleRemoveFile = () => {
    setReceiptFile(null)
  }

  const getPaymentMethodDetails = () => {
    const method = paymentMethods.find(m => m.value === formData.paymentMethod)
    if (!method) return null

    switch (formData.paymentMethod) {
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

      case 'VISA_CARD':
      case 'MASTERCARD':
        return (
          <Box>
            <TextField
              fullWidth
              label="Card Number"
              value={formData.cardNumber}
              onChange={(e) => handleInputChange('cardNumber', e.target.value)}
              placeholder="1234 5678 9012 3456"
              required
              margin="normal"
              InputProps={{
                startAdornment: <CreditCardIcon sx={{ mr: 1, color: method.color }} />
              }}
            />
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <TextField
                label="Expiry (MM/YY)"
                value={formData.cardExpiry}
                onChange={(e) => handleInputChange('cardExpiry', e.target.value)}
                placeholder="12/25"
                required
                sx={{ flex: 1 }}
              />
              <TextField
                label="CVV"
                value={formData.cardCvv}
                onChange={(e) => handleInputChange('cardCvv', e.target.value)}
                placeholder="123"
                required
                sx={{ flex: 1 }}
              />
            </Box>
          </Box>
        )

      case 'BANK_TRANSFER':
        return (
          <TextField
            fullWidth
            label="Bank Account Number"
            value={formData.bankAccount}
            onChange={(e) => handleInputChange('bankAccount', e.target.value)}
            placeholder="1234567890"
            required
            margin="normal"
            InputProps={{
              startAdornment: <BankIcon sx={{ mr: 1, color: method.color }} />
            }}
          />
        )

      default:
        return null
    }
  }

  const handleSubmit = async () => {
    if (!loanAccount) {
      setError('No loan account selected')
      return
    }

    if (!formData.amount || formData.amount <= 0) {
      setError('Please enter a valid payment amount')
      return
    }

    if (!formData.paymentMethod) {
      setError('Please select a payment method')
      return
    }

    // Validate payment method specific fields
    if (['MTN_MOBILE_MONEY', 'AIRTEL_MONEY'].includes(formData.paymentMethod) && !formData.phoneNumber) {
      setError('Please enter your phone number')
      return
    }

    if (['VISA_CARD', 'MASTERCARD'].includes(formData.paymentMethod)) {
      if (!formData.cardNumber || !formData.cardExpiry || !formData.cardCvv) {
        setError('Please fill in all card details')
        return
      }
    }

    if (formData.paymentMethod === 'BANK_TRANSFER' && !formData.bankAccount) {
      setError('Please enter your bank account number')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Use FormData for file uploads
      const formPayload = new FormData()
      formPayload.append('loanAccountId', loanAccount.id)
      formPayload.append('amount', formData.amount.toString())
      formPayload.append('paymentMethod', formData.paymentMethod)

      if (formData.phoneNumber) {
        formPayload.append('phoneNumber', formData.phoneNumber)
      }

      if (formData.cardNumber) {
        formPayload.append('cardNumber', `****-****-****-${formData.cardNumber.slice(-4)}`)
      }

      if (formData.bankAccount) {
        formPayload.append('bankAccount', formData.bankAccount)
      }

      const notes = formData.notes || `Payment via ${paymentMethods.find(m => m.value === formData.paymentMethod)?.label}`
      formPayload.append('notes', notes)

      // Add receipt file if provided
      if (receiptFile) {
        formPayload.append('receipt', receiptFile)
      }

      const response = await fetch('/api/member/payments', {
        method: 'POST',
        body: formPayload, // Don't set Content-Type header for FormData
      })

      if (response.ok) {
        setSuccess('Payment submitted successfully!')
        onPaymentSuccess?.()
        setTimeout(() => {
          onClose()
          setSuccess('')
          setFormData({
            amount: loanAccount?.monthlyPayment || 0,
            paymentMethod: '',
            phoneNumber: '',
            cardNumber: '',
            cardExpiry: '',
            cardCvv: '',
            bankAccount: '',
            notes: ''
          })
          setReceiptFile(null)
        }, 2000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to process payment')
      }
    } catch (error) {
      console.error('Payment error:', error)
      setError('Failed to process payment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
      setError('')
      setSuccess('')
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        pb: 1
      }}>
        <PaymentIcon color="primary" />
        <Typography variant="h6">Make Payment</Typography>
      </DialogTitle>

      <DialogContent>
        {loanAccount && (
          <Card sx={{ mb: 3, bgcolor: 'primary.50' }}>
            <CardContent>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Loan Account: {loanAccount.accountNumber}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Current Balance:
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {formatCurrency(loanAccount.currentBalance)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Monthly Payment:
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {formatCurrency(loanAccount.monthlyPayment)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Next Payment Due:
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {new Date(loanAccount.nextPaymentDate).toLocaleDateString()}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

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

        <TextField
          fullWidth
          type="number"
          label="Payment Amount"
          value={formData.amount}
          onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
          required
          margin="normal"
          InputProps={{
            startAdornment: <Typography sx={{ mr: 1 }}>UGX</Typography>
          }}
        />

        <FormControl fullWidth margin="normal" required>
          <InputLabel>Payment Method</InputLabel>
          <Select
            value={formData.paymentMethod}
            label="Payment Method"
            onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
          >
            {paymentMethods.map((method) => (
              <MenuItem key={method.value} value={method.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {method.icon}
                  <Typography>{method.label}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {getPaymentMethodDetails()}

        <TextField
          fullWidth
          multiline
          rows={2}
          label="Notes (Optional)"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          margin="normal"
          placeholder="Additional notes for this payment..."
        />

        {/* Receipt Upload */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Payment Receipt (Optional)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload a receipt or proof of payment (Images or PDF, max 5MB)
          </Typography>

          {!receiptFile ? (
            <Box
              sx={{
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                backgroundColor: 'action.hover',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'primary.50'
                }
              }}
              component="label"
            >
              <input
                type="file"
                hidden
                accept="image/*,.pdf"
                onChange={handleFileChange}
              />
              <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body1" color="text.secondary">
                Click to upload receipt
              </Typography>
              <Typography variant="caption" color="text.secondary">
                JPG, PNG, GIF or PDF (max 5MB)
              </Typography>
            </Box>
          ) : (
            <Card variant="outlined">
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AttachFileIcon color="primary" />
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {receiptFile.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(receiptFile.size / (1024 * 1024)).toFixed(2)} MB
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton onClick={handleRemoveFile} color="error" size="small">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 3 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          color="inherit"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.paymentMethod || !formData.amount}
          startIcon={loading ? <CircularProgress size={20} /> : <PaymentIcon />}
        >
          {loading ? 'Processing...' : `Pay ${formatCurrency(formData.amount)}`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}