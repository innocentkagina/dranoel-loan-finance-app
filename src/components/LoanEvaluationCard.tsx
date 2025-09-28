'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  Chip,
  CircularProgress,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  IconButton,
  Collapse,
} from '@mui/material'
import {
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as SavingsIcon,
  Assessment as AssessmentIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  MonetizationOn as MoneyIcon,
  Percent as PercentIcon,
} from '@mui/icons-material'

interface LoanEvaluationResult {
  isEligible: boolean
  riskScore: number
  recommendedAmount: number
  recommendedInterestRate: number
  savingsImpact: {
    savingsRatio: number
    savingsBonus: number
    minimumSavingsRequired: number
    meetsSavingsRequirement: boolean
  }
  factors: {
    income: { score: number; weight: number; description: string }
    creditScore: { score: number; weight: number; description: string }
    savings: { score: number; weight: number; description: string }
    employment: { score: number; weight: number; description: string }
    debtRatio: { score: number; weight: number; description: string }
    loanType: { score: number; weight: number; description: string }
  }
  recommendations: string[]
  warnings: string[]
}

interface UserContext {
  userId: string
  userName: string
  email: string
  savingsAccount: {
    accountNumber: string
    balance: number
    interestRate: number
    accountAge: number
  } | null
  existingLoans: number
  totalMonthlyDebt: number
}

interface LoanEvaluationCardProps {
  requestedAmount: number
  loanType: string
  termMonths: number
  monthlyIncome?: number
  employmentStatus?: string
  onEvaluationComplete?: (result: LoanEvaluationResult) => void
}

export default function LoanEvaluationCard({
  requestedAmount,
  loanType,
  termMonths,
  monthlyIncome,
  employmentStatus,
  onEvaluationComplete
}: LoanEvaluationCardProps) {
  const [evaluation, setEvaluation] = useState<LoanEvaluationResult | null>(null)
  const [userContext, setUserContext] = useState<UserContext | null>(null)
  const [loading, setLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [autoEvaluated, setAutoEvaluated] = useState(false)

  useEffect(() => {
    if (requestedAmount && loanType && termMonths && !autoEvaluated) {
      handleEvaluate()
      setAutoEvaluated(true)
    }
  }, [requestedAmount, loanType, termMonths, autoEvaluated])

  const handleEvaluate = async () => {
    if (!requestedAmount || !loanType || !termMonths) return

    setLoading(true)
    try {
      const response = await fetch('/api/loan-applications/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestedAmount,
          loanType,
          termMonths,
          monthlyIncome,
          employmentStatus
        })
      })

      if (response.ok) {
        const data = await response.json()
        setEvaluation(data.evaluation)
        setUserContext(data.userContext)
        onEvaluationComplete?.(data.evaluation)
      } else {
        console.error('Evaluation failed')
      }
    } catch (error) {
      console.error('Error evaluating loan:', error)
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

  const getRiskColor = (score: number) => {
    if (score <= 30) return 'success'
    if (score <= 60) return 'warning'
    return 'error'
  }

  const getRiskLabel = (score: number) => {
    if (score <= 30) return 'Low Risk'
    if (score <= 60) return 'Medium Risk'
    return 'High Risk'
  }

  const getFactorIcon = (factorName: string) => {
    switch (factorName) {
      case 'savings': return <SavingsIcon />
      case 'income': return <MoneyIcon />
      case 'creditScore': return <AssessmentIcon />
      case 'employment': return <InfoIcon />
      default: return <InfoIcon />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Evaluating your loan application...
          </Typography>
        </CardContent>
      </Card>
    )
  }

  if (!evaluation) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AssessmentIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Loan Evaluation</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Get an instant evaluation of your loan application including savings impact.
          </Typography>
          <Button
            variant="contained"
            onClick={handleEvaluate}
            disabled={!requestedAmount || !loanType || !termMonths}
          >
            Evaluate Application
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AssessmentIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Loan Evaluation Result</Typography>
          </Box>
          <IconButton
            onClick={() => setShowDetails(!showDetails)}
            size="small"
          >
            {showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        {/* Eligibility Status */}
        <Alert
          severity={evaluation.isEligible ? 'success' : 'warning'}
          sx={{ mb: 3 }}
          icon={evaluation.isEligible ? <CheckIcon /> : <WarningIcon />}
        >
          <Typography variant="body1" fontWeight="medium">
            {evaluation.isEligible
              ? 'Congratulations! You are eligible for this loan.'
              : 'Your application needs attention before approval.'}
          </Typography>
        </Alert>

        {/* Key Metrics */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">Risk Score</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                <Chip
                  label={`${evaluation.riskScore}/100`}
                  color={getRiskColor(evaluation.riskScore)}
                  variant="outlined"
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {getRiskLabel(evaluation.riskScore)}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">Recommended Amount</Typography>
              <Typography variant="h6" color="primary.main" sx={{ mt: 1 }}>
                {formatCurrency(evaluation.recommendedAmount)}
              </Typography>
              {evaluation.recommendedAmount !== requestedAmount && (
                <Typography variant="caption" color="text.secondary">
                  Requested: {formatCurrency(requestedAmount)}
                </Typography>
              )}
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">Interest Rate</Typography>
              <Typography variant="h6" color="secondary.main" sx={{ mt: 1 }}>
                {evaluation.recommendedInterestRate}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Per annum
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">Savings Impact</Typography>
              <Typography variant="h6" color="success.main" sx={{ mt: 1 }}>
                {evaluation.savingsImpact.savingsRatio.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Savings Coverage
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Savings Impact Section */}
        {userContext?.savingsAccount && (
          <Card variant="outlined" sx={{ mb: 3, bgcolor: 'primary.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SavingsIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary.main">
                  Savings Account Impact
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Current Savings Balance
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(userContext.savingsAccount.balance)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Savings Coverage Ratio
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {evaluation.savingsImpact.savingsRatio.toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {evaluation.savingsImpact.meetsSavingsRequirement ? (
                      <CheckIcon color="success" sx={{ mr: 1 }} />
                    ) : (
                      <WarningIcon color="warning" sx={{ mr: 1 }} />
                    )}
                    <Typography variant="body2">
                      {evaluation.savingsImpact.meetsSavingsRequirement
                        ? 'Meets minimum savings requirement'
                        : `Minimum required: ${formatCurrency(evaluation.savingsImpact.minimumSavingsRequired)}`}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Detailed Analysis */}
        <Collapse in={showDetails}>
          <Divider sx={{ my: 2 }} />

          {/* Evaluation Factors */}
          <Typography variant="h6" gutterBottom>
            Evaluation Factors
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {Object.entries(evaluation.factors).map(([key, factor]) => (
              <Grid item xs={12} sm={6} key={key}>
                <Box sx={{ display: 'flex', alignItems: 'center', p: 2, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                  {getFactorIcon(key)}
                  <Box sx={{ ml: 2, flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight="medium" textTransform="capitalize">
                      {key === 'creditScore' ? 'Credit Score' : key === 'debtRatio' ? 'Debt Ratio' : key}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {factor.description}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={factor.score}
                        sx={{ flexGrow: 1, mr: 1 }}
                        color={factor.score >= 70 ? 'success' : factor.score >= 50 ? 'warning' : 'error'}
                      />
                      <Typography variant="caption">
                        {factor.score}/100
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* Recommendations */}
          {evaluation.recommendations.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recommendations
              </Typography>
              <List dense>
                {evaluation.recommendations.map((recommendation, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <TrendingUpIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={recommendation} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Warnings */}
          {evaluation.warnings.length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Important Considerations
              </Typography>
              <List dense>
                {evaluation.warnings.map((warning, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <WarningIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText primary={warning} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Collapse>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button
            variant="outlined"
            onClick={handleEvaluate}
            startIcon={<AssessmentIcon />}
          >
            Re-evaluate
          </Button>
          {!userContext?.savingsAccount && (
            <Button
              variant="contained"
              color="secondary"
              href="/member/savings"
              startIcon={<SavingsIcon />}
            >
              Create Savings Account
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}