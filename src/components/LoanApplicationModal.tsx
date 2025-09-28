'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Chip,
  Divider,
  LinearProgress,
  Tooltip,
  IconButton,
  Collapse,
  FormHelperText,
  InputAdornment,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  AppBar,
  Toolbar,
} from '@mui/material'
import {
  Assignment as ApplicationIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  AttachMoney as MoneyIcon,
  Upload as UploadIcon,
  Send as SendIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  Calculate as CalculateIcon,
  Help as HelpIcon,
  Security as SecurityIcon,
  Close as CloseIcon,
} from '@mui/icons-material'

const steps = [
  'Personal Information',
  'Employment Details',
  'Loan Details',
  'Financial Information',
  'Document Upload',
  'Review & Submit'
]

const loanTypes = [
  {
    value: 'PERSONAL',
    label: 'Personal Loan',
    description: 'For personal expenses, debt consolidation, or emergencies'
  },
  {
    value: 'BUSINESS',
    label: 'Business Loan',
    description: 'For starting or expanding your business'
  },
  {
    value: 'AUTO',
    label: 'Vehicle Loan',
    description: 'For purchasing a car, motorcycle, or other vehicle'
  },
  {
    value: 'MORTGAGE',
    label: 'Home Loan',
    description: 'For buying or refinancing residential property'
  },
  {
    value: 'STUDENT',
    label: 'Education Loan',
    description: 'For tuition, books, and educational expenses'
  },
]

interface LoanApplicationModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function LoanApplicationModal({ open, onClose, onSuccess }: LoanApplicationModalProps) {
  const { data: session } = useSession()
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [estimatedPayment, setEstimatedPayment] = useState<number | null>(null)
  const [showHelp, setShowHelp] = useState<Record<string, boolean>>({})
  const [formData, setFormData] = useState({
    // Personal Info
    firstName: session?.user?.firstName || '',
    lastName: session?.user?.lastName || '',
    email: session?.user?.email || '',
    phone: '',
    address: '',
    dateOfBirth: '',
    nationalId: '',

    // Employment
    employmentStatus: '',
    employerName: '',
    jobTitle: '',
    monthlyIncome: '',
    employmentLength: '',

    // Loan Details
    loanType: '',
    requestedAmount: '',
    purpose: '',
    termMonths: '',

    // Financial Info
    assets: '',
    liabilities: '',
    monthlyExpenses: '',
    creditScore: '',

    // Additional
    collateralValue: '',
    downPayment: '',
  })

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setActiveStep(0)
      setErrors({})
      setTouched({})
      setEstimatedPayment(null)
      setShowHelp({})
      setFormData({
        firstName: session?.user?.firstName || '',
        lastName: session?.user?.lastName || '',
        email: session?.user?.email || '',
        phone: '',
        address: '',
        dateOfBirth: '',
        nationalId: '',
        employmentStatus: '',
        employerName: '',
        jobTitle: '',
        monthlyIncome: '',
        employmentLength: '',
        loanType: '',
        requestedAmount: '',
        purpose: '',
        termMonths: '',
        assets: '',
        liabilities: '',
        monthlyExpenses: '',
        creditScore: '',
        collateralValue: '',
        downPayment: '',
      })
    }
  }, [open, session])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setTouched(prev => ({ ...prev, [field]: true }))

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Calculate estimated payment for loan details
    if ((field === 'requestedAmount' || field === 'termMonths') && formData.loanType) {
      calculateEstimatedPayment({ ...formData, [field]: value })
    }
  }

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    switch (step) {
      case 0: // Personal Information
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
        if (!formData.email.trim()) newErrors.email = 'Email is required'
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
        if (!formData.address.trim()) newErrors.address = 'Address is required'
        if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required'
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Please enter a valid email address'
        }
        break

      case 1: // Employment Details
        if (!formData.employmentStatus) newErrors.employmentStatus = 'Employment status is required'
        if (!formData.monthlyIncome) newErrors.monthlyIncome = 'Monthly income is required'
        else if (Number(formData.monthlyIncome) <= 0) newErrors.monthlyIncome = 'Monthly income must be greater than 0'
        break

      case 2: // Loan Details
        if (!formData.loanType) newErrors.loanType = 'Loan type is required'
        if (!formData.requestedAmount) newErrors.requestedAmount = 'Requested amount is required'
        else if (Number(formData.requestedAmount) <= 0) newErrors.requestedAmount = 'Amount must be greater than 0'
        if (!formData.termMonths) newErrors.termMonths = 'Loan term is required'
        else if (Number(formData.termMonths) <= 0) newErrors.termMonths = 'Term must be greater than 0'
        if (!formData.purpose.trim()) newErrors.purpose = 'Loan purpose is required'
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const calculateEstimatedPayment = (data: typeof formData) => {
    const amount = Number(data.requestedAmount)
    const months = Number(data.termMonths)

    if (amount > 0 && months > 0) {
      const interestRates = {
        PERSONAL: 0.12,
        MORTGAGE: 0.035,
        AUTO: 0.06,
        BUSINESS: 0.08,
        STUDENT: 0.055
      }

      const rate = interestRates[data.loanType as keyof typeof interestRates] || 0.08
      const monthlyRate = rate / 12
      const payment = amount * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)

      setEstimatedPayment(payment)
    } else {
      setEstimatedPayment(null)
    }
  }

  const toggleHelp = (field: string) => {
    setShowHelp(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const formatPhone = (value: string) => {
    return value.replace(/[^\d+\s()-]/g, '')
  }

  useEffect(() => {
    if (formData.requestedAmount && formData.termMonths && formData.loanType) {
      calculateEstimatedPayment(formData)
    }
  }, [formData.requestedAmount, formData.termMonths, formData.loanType])

  const handleNext = () => {
    if (validateStep(activeStep) && activeStep < steps.length - 1) {
      setActiveStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/loan-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onSuccess?.()
        onClose()
      }
    } catch (error) {
      console.error('Error submitting application:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Personal Information
        return (
          <Fade in timeout={500}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <PersonIcon color="primary" sx={{ mr: 2 }} />
                <Typography variant="h6">Personal Information</Typography>
                <Tooltip title="We need this information to verify your identity and process your application">
                  <IconButton size="small" onClick={() => toggleHelp('personal')}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Collapse in={showHelp.personal}>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Your personal information is encrypted and secure. We use this data only for loan processing and identity verification.
                  </Typography>
                </Alert>
              </Collapse>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    error={!!errors.firstName}
                    helperText={errors.firstName}
                    required
                    InputProps={{
                      endAdornment: touched.firstName && !errors.firstName && (
                        <InputAdornment position="end">
                          <CheckIcon color="success" fontSize="small" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    error={!!errors.lastName}
                    helperText={errors.lastName}
                    required
                    InputProps={{
                      endAdornment: touched.lastName && !errors.lastName && (
                        <InputAdornment position="end">
                          <CheckIcon color="success" fontSize="small" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    error={!!errors.email}
                    helperText={errors.email || "We'll send updates about your application here"}
                    required
                    InputProps={{
                      endAdornment: touched.email && !errors.email && formData.email && (
                        <InputAdornment position="end">
                          <CheckIcon color="success" fontSize="small" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', formatPhone(e.target.value))}
                    error={!!errors.phone}
                    helperText={errors.phone || 'Include country code (e.g., +1 123 456 7890)'}
                    required
                    placeholder="+1 123 456 7890"
                    InputProps={{
                      endAdornment: touched.phone && !errors.phone && formData.phone && (
                        <InputAdornment position="end">
                          <CheckIcon color="success" fontSize="small" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Address"
                    multiline
                    rows={2}
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    error={!!errors.address}
                    helperText={errors.address || 'Complete street address including city, state, and ZIP code'}
                    required
                    placeholder="123 Main Street, City, State 12345"
                    InputProps={{
                      endAdornment: touched.address && !errors.address && formData.address && (
                        <InputAdornment position="end">
                          <CheckIcon color="success" fontSize="small" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Date of Birth"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    error={!!errors.dateOfBirth}
                    helperText={errors.dateOfBirth || 'Must be 18 years or older to apply'}
                    required
                    InputProps={{
                      endAdornment: touched.dateOfBirth && !errors.dateOfBirth && formData.dateOfBirth && (
                        <InputAdornment position="end">
                          <CheckIcon color="success" fontSize="small" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="National ID (Optional)"
                    value={formData.nationalId}
                    onChange={(e) => handleInputChange('nationalId', e.target.value)}
                    error={!!errors.nationalId}
                    helperText={errors.nationalId || 'National ID, Tax ID, or government identification number'}
                    placeholder="Enter your national identification number"
                    InputProps={{
                      endAdornment: touched.nationalId && !errors.nationalId && formData.nationalId && (
                        <InputAdornment position="end">
                          <CheckIcon color="success" fontSize="small" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
              </Grid>
            </Box>
          </Fade>
        )

      case 1: // Employment Details
        return (
          <Fade in timeout={500}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <WorkIcon color="primary" sx={{ mr: 2 }} />
                <Typography variant="h6">Employment & Income Details</Typography>
                <Tooltip title="Employment information helps us assess your ability to repay the loan">
                  <IconButton size="small" onClick={() => toggleHelp('employment')}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Collapse in={showHelp.employment}>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    Your employment history and income information help us determine loan eligibility and terms.
                    Stable employment typically results in better loan conditions.
                  </Typography>
                </Alert>
              </Collapse>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required error={!!errors.employmentStatus}>
                    <InputLabel>Employment Status</InputLabel>
                    <Select
                      value={formData.employmentStatus}
                      onChange={(e) => handleInputChange('employmentStatus', e.target.value)}
                      label="Employment Status"
                    >
                      <MenuItem value="FULL_TIME">Full-Time Employee</MenuItem>
                      <MenuItem value="PART_TIME">Part-Time Employee</MenuItem>
                      <MenuItem value="SELF_EMPLOYED">Self-Employed/Business Owner</MenuItem>
                      <MenuItem value="CONTRACTOR">Freelancer/Contractor</MenuItem>
                      <MenuItem value="STUDENT">Student</MenuItem>
                      <MenuItem value="RETIRED">Retired</MenuItem>
                      <MenuItem value="UNEMPLOYED">Currently Unemployed</MenuItem>
                      <MenuItem value="OTHER">Other</MenuItem>
                    </Select>
                    {errors.employmentStatus && (
                      <FormHelperText>{errors.employmentStatus}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Monthly Income"
                    type="number"
                    value={formData.monthlyIncome}
                    onChange={(e) => handleInputChange('monthlyIncome', e.target.value)}
                    error={!!errors.monthlyIncome}
                    helperText={errors.monthlyIncome || 'Before taxes and deductions'}
                    required
                    InputProps={{
                      startAdornment: <InputAdornment position="start">UGX</InputAdornment>,
                      endAdornment: touched.monthlyIncome && !errors.monthlyIncome && formData.monthlyIncome && (
                        <InputAdornment position="end">
                          <CheckIcon color="success" fontSize="small" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Employer Name"
                    value={formData.employerName}
                    onChange={(e) => handleInputChange('employerName', e.target.value)}
                    helperText="Current or most recent employer"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Job Title"
                    value={formData.jobTitle}
                    onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                    helperText="Your current position or role"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Employment Length"
                    type="number"
                    value={formData.employmentLength}
                    onChange={(e) => handleInputChange('employmentLength', e.target.value)}
                    helperText="Years at current employer"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">years</InputAdornment>
                    }}
                  />
                </Grid>
              </Grid>
            </Box>
          </Fade>
        )

      case 2: // Loan Details
        return (
          <Fade in timeout={500}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <MoneyIcon color="primary" sx={{ mr: 2 }} />
                <Typography variant="h6">Loan Details</Typography>
                <Tooltip title="Choose the loan type and amount that best fits your needs">
                  <IconButton size="small" onClick={() => toggleHelp('loan')}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Collapse in={showHelp.loan}>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    Different loan types have different interest rates and terms. Choose the option that best matches your needs.
                    Your estimated monthly payment will appear below as you enter details.
                  </Typography>
                </Alert>
              </Collapse>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required error={!!errors.loanType}>
                    <InputLabel>Loan Type</InputLabel>
                    <Select
                      value={formData.loanType}
                      onChange={(e) => handleInputChange('loanType', e.target.value)}
                      label="Loan Type"
                    >
                      {loanTypes.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {type.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {type.description}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.loanType && (
                      <FormHelperText>{errors.loanType}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Requested Amount"
                    type="number"
                    value={formData.requestedAmount}
                    onChange={(e) => handleInputChange('requestedAmount', e.target.value)}
                    error={!!errors.requestedAmount}
                    helperText={errors.requestedAmount || 'Enter the total amount you need'}
                    required
                    InputProps={{
                      startAdornment: <InputAdornment position="start">UGX</InputAdornment>,
                      endAdornment: touched.requestedAmount && !errors.requestedAmount && formData.requestedAmount && (
                        <InputAdornment position="end">
                          <CheckIcon color="success" fontSize="small" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Loan Term"
                    type="number"
                    value={formData.termMonths}
                    onChange={(e) => handleInputChange('termMonths', e.target.value)}
                    error={!!errors.termMonths}
                    helperText={errors.termMonths || 'Repayment period in months'}
                    required
                    InputProps={{
                      endAdornment: <InputAdornment position="end">months</InputAdornment>
                    }}
                  />
                </Grid>
                {estimatedPayment && (
                  <Grid item xs={12} sm={6}>
                    <Card sx={{ bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                      <CardContent sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <CalculateIcon color="success" sx={{ mr: 1 }} />
                          <Typography variant="h6" color="success.main">
                            Estimated Payment
                          </Typography>
                        </Box>
                        <Typography variant="h4" color="success.main">
                          ${estimatedPayment.toLocaleString('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          This is an estimate. Final terms may vary based on creditworthiness.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Purpose of Loan"
                    multiline
                    rows={3}
                    value={formData.purpose}
                    onChange={(e) => handleInputChange('purpose', e.target.value)}
                    error={!!errors.purpose}
                    helperText={errors.purpose || 'Describe how you plan to use the loan funds'}
                    required
                    placeholder="e.g., Home improvement, debt consolidation, business expansion..."
                  />
                </Grid>
              </Grid>
            </Box>
          </Fade>
        )

      case 3: // Financial Information
        return (
          <Fade in timeout={500}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <MoneyIcon color="primary" sx={{ mr: 2 }} />
                <Typography variant="h6">Financial Information</Typography>
                <Tooltip title="Financial details help us assess your loan eligibility and determine the best terms">
                  <IconButton size="small" onClick={() => toggleHelp('financial')}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Collapse in={showHelp.financial}>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    This information helps us understand your overall financial picture. All fields are optional,
                    but providing accurate information can improve your loan terms.
                  </Typography>
                </Alert>
              </Collapse>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Monthly Expenses"
                    type="number"
                    value={formData.monthlyExpenses}
                    onChange={(e) => handleInputChange('monthlyExpenses', e.target.value)}
                    helperText="Rent, utilities, groceries, and other monthly costs"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">UGX</InputAdornment>,
                      endAdornment: touched.monthlyExpenses && formData.monthlyExpenses && (
                        <InputAdornment position="end">
                          <CheckIcon color="success" fontSize="small" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Total Assets"
                    type="number"
                    value={formData.assets}
                    onChange={(e) => handleInputChange('assets', e.target.value)}
                    helperText="Savings, investments, property value, etc."
                    InputProps={{
                      startAdornment: <InputAdornment position="start">UGX</InputAdornment>,
                      endAdornment: touched.assets && formData.assets && (
                        <InputAdornment position="end">
                          <CheckIcon color="success" fontSize="small" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Total Liabilities"
                    type="number"
                    value={formData.liabilities}
                    onChange={(e) => handleInputChange('liabilities', e.target.value)}
                    helperText="Credit card debt, existing loans, etc."
                    InputProps={{
                      startAdornment: <InputAdornment position="start">UGX</InputAdornment>,
                      endAdornment: touched.liabilities && formData.liabilities && (
                        <InputAdornment position="end">
                          <CheckIcon color="success" fontSize="small" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Credit Score (Optional)"
                    type="number"
                    value={formData.creditScore}
                    onChange={(e) => handleInputChange('creditScore', e.target.value)}
                    helperText="If you know your credit score (300-850)"
                    InputProps={{
                      endAdornment: touched.creditScore && formData.creditScore && (
                        <InputAdornment position="end">
                          <CheckIcon color="success" fontSize="small" />
                        </InputAdornment>
                      )
                    }}
                    inputProps={{
                      min: 300,
                      max: 850
                    }}
                  />
                </Grid>
                {(formData.loanType === 'MORTGAGE' || formData.loanType === 'AUTO') && (
                  <>
                    <Grid item xs={12}>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          <strong>Additional Information Required:</strong> Since this is a {formData.loanType === 'MORTGAGE' ? 'home' : 'vehicle'} loan,
                          we need information about your down payment and collateral.
                        </Typography>
                      </Alert>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Down Payment"
                        type="number"
                        value={formData.downPayment}
                        onChange={(e) => handleInputChange('downPayment', e.target.value)}
                        helperText={`Amount you plan to pay upfront for the ${formData.loanType === 'MORTGAGE' ? 'property' : 'vehicle'}`}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">UGX</InputAdornment>,
                          endAdornment: touched.downPayment && formData.downPayment && (
                            <InputAdornment position="end">
                              <CheckIcon color="success" fontSize="small" />
                            </InputAdornment>
                          )
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Collateral Value"
                        type="number"
                        value={formData.collateralValue}
                        onChange={(e) => handleInputChange('collateralValue', e.target.value)}
                        helperText={`Estimated value of the ${formData.loanType === 'MORTGAGE' ? 'property' : 'vehicle'}`}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">UGX</InputAdornment>,
                          endAdornment: touched.collateralValue && formData.collateralValue && (
                            <InputAdornment position="end">
                              <CheckIcon color="success" fontSize="small" />
                            </InputAdornment>
                          )
                        }}
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
          </Fade>
        )

      case 4: // Document Upload
        return (
          <Fade in timeout={500}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <UploadIcon color="primary" sx={{ mr: 2 }} />
                <Typography variant="h6">Document Upload</Typography>
                <Tooltip title="Documents help verify your identity and income for faster approval">
                  <IconButton size="small" onClick={() => toggleHelp('documents')}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Collapse in={showHelp.documents}>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Documents are optional at this stage. You can submit your application now and upload documents later,
                    or upload them now for faster processing. All documents are securely stored and encrypted.
                  </Typography>
                </Alert>
              </Collapse>

              <Alert severity="success" sx={{ mb: 3 }}>
                <Typography variant="body2" fontWeight="medium">
                  Good news! Document upload is optional. You can submit your application now and we'll contact you
                  if additional documents are needed.
                </Typography>
              </Alert>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined" sx={{ height: '100%', transition: 'all 0.2s', '&:hover': { boxShadow: 2 } }}>
                    <CardContent sx={{ textAlign: 'center', py: 3 }}>
                      <PersonIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        Identity Proof
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Driver's License, Passport, National ID, or any government-issued photo ID
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<UploadIcon />}
                        fullWidth
                        sx={{ mb: 1 }}
                      >
                        Upload Document
                      </Button>
                      <Chip label="Optional" size="small" color="success" variant="outlined" />
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined" sx={{ height: '100%', transition: 'all 0.2s', '&:hover': { boxShadow: 2 } }}>
                    <CardContent sx={{ textAlign: 'center', py: 3 }}>
                      <MoneyIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        Income Proof
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Recent pay stubs, tax returns, bank statements, or employment letter
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<UploadIcon />}
                        fullWidth
                        sx={{ mb: 1 }}
                      >
                        Upload Document
                      </Button>
                      <Chip label="Optional" size="small" color="success" variant="outlined" />
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card sx={{ bgcolor: 'grey.50', border: '1px dashed', borderColor: 'grey.300' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <HelpIcon color="info" sx={{ mr: 2 }} />
                        <Typography variant="h6" color="info.main">Need Help?</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Don't have these documents ready? No problem! You can submit your application now and upload
                        documents later through your dashboard. Our team will contact you if additional documentation
                        is required for your specific loan type.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </Fade>
        )

      case 5: // Review & Submit
        return (
          <Fade in timeout={500}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <CheckIcon color="primary" sx={{ mr: 2 }} />
                <Typography variant="h6">Review & Submit</Typography>
                <Tooltip title="Review your application details before submitting">
                  <IconButton size="small" onClick={() => toggleHelp('review')}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Collapse in={showHelp.review}>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    Please review all information carefully. You can go back to any step to make changes.
                    Once submitted, your application will be reviewed by our team within 24-48 hours.
                  </Typography>
                </Alert>
              </Collapse>

              <Alert severity="success" sx={{ mb: 3 }}>
                <Typography variant="body2" fontWeight="medium">
                  🎉 Great job! Your application is almost complete. Please review the details below.
                </Typography>
              </Alert>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <PersonIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6" color="primary">Personal Information</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Name:</Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {formData.firstName} {formData.lastName}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Email:</Typography>
                          <Typography variant="body2" fontWeight="medium">{formData.email}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Phone:</Typography>
                          <Typography variant="body2" fontWeight="medium">{formData.phone}</Typography>
                        </Box>
                        {formData.nationalId && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">National ID:</Typography>
                            <Typography variant="body2" fontWeight="medium">{formData.nationalId}</Typography>
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <MoneyIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6" color="primary">Loan Details</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Loan Type:</Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {loanTypes.find(t => t.value === formData.loanType)?.label}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Amount:</Typography>
                          <Typography variant="h6" color="primary">
                            {Number(formData.requestedAmount).toLocaleString('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Term:</Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {formData.termMonths} months
                          </Typography>
                        </Box>
                        {estimatedPayment && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="body2" color="text.secondary">Est. Payment:</Typography>
                            <Typography variant="body1" fontWeight="bold" color="success.main">
                              ${estimatedPayment.toLocaleString('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mo
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Card sx={{ mt: 3, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <InfoIcon color="primary" sx={{ mr: 2 }} />
                    <Typography variant="h6" color="primary">What happens next?</Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <CheckIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
                        <Typography variant="subtitle2" fontWeight="bold">1. Application Review</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Our team reviews your application within 24-48 hours
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <PersonIcon color="info" sx={{ fontSize: 48, mb: 1 }} />
                        <Typography variant="subtitle2" fontWeight="bold">2. Contact & Verification</Typography>
                        <Typography variant="body2" color="text.secondary">
                          We'll contact you if additional information is needed
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <MoneyIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
                        <Typography variant="subtitle2" fontWeight="bold">3. Loan Decision</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Receive your loan decision and terms via email
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Box>
          </Fade>
        )

      default:
        return null
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      scroll="body"
      PaperProps={{
        sx: {
          minHeight: '80vh',
          maxHeight: '95vh',
        }
      }}
    >
      <AppBar sx={{ position: 'relative', bgcolor: 'background.paper', color: 'text.primary' }} elevation={0}>
        <Toolbar>
          <ApplicationIcon sx={{ mr: 2 }} />
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Loan Application
          </Typography>
          <IconButton
            edge="end"
            color="inherit"
            onClick={handleClose}
            aria-label="close"
            disabled={loading}
          >
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 3 }}>
          {/* Progress Bar */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" color="primary">
                Step {activeStep + 1} of {steps.length}
              </Typography>
              <Chip
                label={`${Math.round(((activeStep + 1) / steps.length) * 100)}% Complete`}
                color="primary"
                variant="outlined"
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={((activeStep + 1) / steps.length) * 100}
              sx={{ height: 8, borderRadius: 4, mb: 2 }}
            />
          </Box>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }} alternativeLabel>
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel
                  StepIconProps={{
                    sx: {
                      '&.Mui-completed': {
                        color: 'success.main',
                      },
                      '&.Mui-active': {
                        color: 'primary.main',
                      }
                    }
                  }}
                >
                  <Typography variant={index <= activeStep ? 'body2' : 'caption'}>
                    {label}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box sx={{ minHeight: '400px', mb: 4 }}>
            {renderStepContent()}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, bgcolor: 'grey.50' }}>
        <Button
          onClick={handleBack}
          disabled={activeStep === 0}
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          sx={{ minWidth: 120 }}
        >
          {activeStep === 0 ? 'Start' : 'Back'}
        </Button>

        <Box sx={{ flex: 1 }} />

        {Object.keys(errors).length > 0 && (
          <Alert severity="warning" sx={{ py: 0, mr: 2 }}>
            <Typography variant="body2">
              Please correct the errors above to continue
            </Typography>
          </Alert>
        )}

        {activeStep === steps.length - 1 ? (
          <Button
            onClick={handleSubmit}
            variant="contained"
            endIcon={loading ? null : <SendIcon />}
            disabled={loading || Object.keys(errors).length > 0}
            sx={{
              minWidth: 160,
              bgcolor: 'success.main',
              '&:hover': { bgcolor: 'success.dark' }
            }}
          >
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinearProgress size={16} />
                <Typography>Submitting...</Typography>
              </Box>
            ) : (
              'Submit Application'
            )}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            sx={{ minWidth: 120 }}
          >
            Next Step
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}