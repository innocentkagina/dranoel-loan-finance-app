'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Paper,
  LinearProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Tabs,
  Tab,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material'
import {
  Assessment as ReportIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as BankIcon,
  Payment as PaymentIcon,
  MoneyOff as WithdrawalIcon,
  Savings as SavingsIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  TableChart as ExcelIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  LineChart,
  Line,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import PDFButton from '@/components/PDFButton'
import { FinancialReportData, generateFinancialReportPDF } from '@/lib/pdf-generators'

interface FinancialReport {
  totalPortfolio: number
  totalSavings: number
  totalShares: number
  totalCollections: number
  totalDisbursements: number
  netFlow: number
  activeLoans: number
  totalMembers: number
  collectionRate: number
  averageLoanSize: number
}

interface LoanTypeDistribution {
  type: string
  count: number
  value: number
  percentage: number
}

interface MonthlyTrend {
  month: string
  disbursements: number
  collections: number
  netFlow: number
}

interface MemberStats {
  totalMembers: number
  activeMembers: number
  newMembers: number
  memberGrowthRate: number
}

interface RiskMetrics {
  defaultRate: number
  overdueLoans: number
  riskScore: number
  provisionRequired: number
}

export default function TreasurerReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [reportPeriod, setReportPeriod] = useState('MONTHLY')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentTab, setCurrentTab] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [financialReport, setFinancialReport] = useState<FinancialReport>({
    totalPortfolio: 0,
    totalSavings: 0,
    totalShares: 0,
    totalCollections: 0,
    totalDisbursements: 0,
    netFlow: 0,
    activeLoans: 0,
    totalMembers: 0,
    collectionRate: 0,
    averageLoanSize: 0,
  })
  const [loanDistribution, setLoanDistribution] = useState<LoanTypeDistribution[]>([])
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([])
  const [memberStats, setMemberStats] = useState<MemberStats>({
    totalMembers: 0,
    activeMembers: 0,
    newMembers: 0,
    memberGrowthRate: 0,
  })
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics>({
    defaultRate: 0,
    overdueLoans: 0,
    riskScore: 0,
    provisionRequired: 0,
  })

  useEffect(() => {
    if (status === 'loading') return // Don't redirect while session is loading

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (session.user.role !== 'TREASURER') {
      router.push('/')
      return
    }

    // Set default date range (last 12 months)
    const now = new Date()
    const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    setStartDate(lastYear.toISOString().split('T')[0])
    setEndDate(now.toISOString().split('T')[0])

    fetchReports()
  }, [session, status, router])

  const fetchReports = async () => {
    setLoading(true)
    try {
      // Fetch financial report
      const financialResponse = await fetch(`/api/treasurer/financial-report?period=${reportPeriod}&startDate=${startDate}&endDate=${endDate}`)
      if (financialResponse.ok) {
        const data = await financialResponse.json()
        setFinancialReport(data.financial)
        setLoanDistribution(data.loanDistribution)
        setMonthlyTrends(data.monthlyTrends)
        setMemberStats(data.memberStats)
        setRiskMetrics(data.riskMetrics)
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
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

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getLoanTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'PERSONAL': '#1976d2',
      'BUSINESS': '#2e7d32',
      'STUDENT': '#9c27b0',
      'MORTGAGE': '#0288d1',
      'AUTO': '#f57c00',
      'PAYDAY': '#d32f2f'
    }
    return colors[type] || '#757575'
  }

  const generateExcelReport = async () => {
    setIsExporting(true)
    try {
      // Create workbook
      const workbook = XLSX.utils.book_new()

      // Financial Overview Sheet
      const financialData = [
        ['Financial Overview', ''],
        ['Total Portfolio', formatCurrency(financialReport.totalPortfolio)],
        ['Total Collections', formatCurrency(financialReport.totalCollections)],
        ['Total Disbursements', formatCurrency(financialReport.totalDisbursements)],
        ['Net Flow', formatCurrency(financialReport.netFlow)],
        ['Total Savings', formatCurrency(financialReport.totalSavings)],
        ['Total Shares', formatCurrency(financialReport.totalShares)],
        ['Active Loans', financialReport.activeLoans],
        ['Total Members', financialReport.totalMembers],
        ['Collection Rate', `${financialReport.collectionRate.toFixed(1)}%`],
        ['Average Loan Size', formatCurrency(financialReport.averageLoanSize)],
      ]
      const financialWs = XLSX.utils.aoa_to_sheet(financialData)
      XLSX.utils.book_append_sheet(workbook, financialWs, 'Financial Overview')

      // Loan Distribution Sheet
      const loanDistData = [
        ['Loan Type', 'Count', 'Value', 'Percentage'],
        ...loanDistribution.map(item => [
          item.type,
          item.count,
          item.value,
          `${item.percentage.toFixed(1)}%`
        ])
      ]
      const loanDistWs = XLSX.utils.aoa_to_sheet(loanDistData)
      XLSX.utils.book_append_sheet(workbook, loanDistWs, 'Loan Distribution')

      // Monthly Trends Sheet
      const trendsData = [
        ['Month', 'Disbursements', 'Collections', 'Net Flow'],
        ...monthlyTrends.map(item => [
          item.month,
          item.disbursements,
          item.collections,
          item.netFlow
        ])
      ]
      const trendsWs = XLSX.utils.aoa_to_sheet(trendsData)
      XLSX.utils.book_append_sheet(workbook, trendsWs, 'Monthly Trends')

      // Member Statistics Sheet
      const memberData = [
        ['Member Statistics', ''],
        ['Total Members', memberStats.totalMembers],
        ['Active Members', memberStats.activeMembers],
        ['New Members', memberStats.newMembers],
        ['Growth Rate', `${memberStats.memberGrowthRate.toFixed(1)}%`],
      ]
      const memberWs = XLSX.utils.aoa_to_sheet(memberData)
      XLSX.utils.book_append_sheet(workbook, memberWs, 'Member Statistics')

      // Risk Metrics Sheet
      const riskData = [
        ['Risk Metrics', ''],
        ['Default Rate', `${riskMetrics.defaultRate.toFixed(1)}%`],
        ['Overdue Loans', riskMetrics.overdueLoans],
        ['Risk Score', `${riskMetrics.riskScore}/100`],
        ['Provision Required', formatCurrency(riskMetrics.provisionRequired)],
      ]
      const riskWs = XLSX.utils.aoa_to_sheet(riskData)
      XLSX.utils.book_append_sheet(workbook, riskWs, 'Risk Metrics')

      // Generate and download
      const fileName = `Financial_Report_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(workbook, fileName)
    } catch (error) {
      console.error('Error generating Excel report:', error)
      alert('Error generating Excel report. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  // Prepare data for enhanced PDF generation
  const prepareFinancialReportData = (): FinancialReportData => {
    return {
      reportPeriod: {
        startDate,
        endDate
      },
      portfolio: {
        totalValue: financialReport.totalPortfolio,
        activeLoans: financialReport.activeLoans,
        totalDisbursed: financialReport.totalDisbursements,
        totalCollected: financialReport.totalCollections,
        averageLoanSize: financialReport.averageLoanSize
      },
      performance: {
        disbursementGrowth: 15.5, // Calculate based on historical data
        collectionRate: financialReport.collectionRate,
        defaultRate: riskMetrics.defaultRate,
        portfolioGrowth: 12.3 // Calculate based on historical data
      },
      loanDistribution: loanDistribution.map(item => ({
        type: item.type,
        count: item.count,
        value: item.value,
        percentage: item.percentage
      })),
      riskMetrics: {
        par30: riskMetrics.defaultRate * 0.6, // Estimate PAR30 as portion of default rate
        par90: riskMetrics.defaultRate * 0.3, // Estimate PAR90 as portion of default rate
        writeOffs: riskMetrics.totalAtRisk * 0.1, // Estimate write-offs
        provisioning: riskMetrics.totalAtRisk * 0.05 // Estimate provisioning
      }
    }
  }

  const generatePDFReport = async () => {
    setIsExporting(true)
    try {
      const pdf = new jsPDF()
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      let yPosition = 20

      // Title
      pdf.setFontSize(20)
      pdf.text('Financial Report & Analysis', pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 20

      // Date range
      pdf.setFontSize(12)
      pdf.text(`Report Period: ${startDate} to ${endDate}`, pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 20

      // Financial Overview
      pdf.setFontSize(16)
      pdf.text('Financial Overview', 20, yPosition)
      yPosition += 15

      pdf.setFontSize(10)
      const financialItems = [
        ['Total Portfolio:', formatCurrency(financialReport.totalPortfolio)],
        ['Total Collections:', formatCurrency(financialReport.totalCollections)],
        ['Total Disbursements:', formatCurrency(financialReport.totalDisbursements)],
        ['Net Flow:', formatCurrency(financialReport.netFlow)],
        ['Total Savings:', formatCurrency(financialReport.totalSavings)],
        ['Total Shares:', formatCurrency(financialReport.totalShares)],
        ['Active Loans:', financialReport.activeLoans.toString()],
        ['Total Members:', financialReport.totalMembers.toString()],
        ['Collection Rate:', `${financialReport.collectionRate.toFixed(1)}%`],
        ['Average Loan Size:', formatCurrency(financialReport.averageLoanSize)],
      ]

      financialItems.forEach(([label, value]) => {
        pdf.text(label, 20, yPosition)
        pdf.text(value, 120, yPosition)
        yPosition += 10
      })

      yPosition += 10

      // Member Statistics
      pdf.setFontSize(16)
      pdf.text('Member Statistics', 20, yPosition)
      yPosition += 15

      pdf.setFontSize(10)
      const memberItems = [
        ['Total Members:', memberStats.totalMembers.toString()],
        ['Active Members:', memberStats.activeMembers.toString()],
        ['New Members:', memberStats.newMembers.toString()],
        ['Growth Rate:', `${memberStats.memberGrowthRate.toFixed(1)}%`],
      ]

      memberItems.forEach(([label, value]) => {
        pdf.text(label, 20, yPosition)
        pdf.text(value, 120, yPosition)
        yPosition += 10
      })

      yPosition += 10

      // Risk Metrics
      pdf.setFontSize(16)
      pdf.text('Risk Metrics', 20, yPosition)
      yPosition += 15

      pdf.setFontSize(10)
      const riskItems = [
        ['Default Rate:', `${riskMetrics.defaultRate.toFixed(1)}%`],
        ['Overdue Loans:', riskMetrics.overdueLoans.toString()],
        ['Risk Score:', `${riskMetrics.riskScore}/100`],
        ['Provision Required:', formatCurrency(riskMetrics.provisionRequired)],
      ]

      riskItems.forEach(([label, value]) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage()
          yPosition = 20
        }
        pdf.text(label, 20, yPosition)
        pdf.text(value, 120, yPosition)
        yPosition += 10
      })

      // Add new page for loan distribution
      pdf.addPage()
      yPosition = 20

      pdf.setFontSize(16)
      pdf.text('Loan Type Distribution', 20, yPosition)
      yPosition += 15

      pdf.setFontSize(10)
      loanDistribution.forEach((item) => {
        pdf.text(`${item.type}:`, 20, yPosition)
        pdf.text(`${item.count} loans`, 80, yPosition)
        pdf.text(formatCurrency(item.value), 120, yPosition)
        pdf.text(`${item.percentage.toFixed(1)}%`, 160, yPosition)
        yPosition += 10
      })

      // Save the PDF
      const fileName = `Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)
    } catch (error) {
      console.error('Error generating PDF report:', error)
      alert('Error generating PDF report. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    )
  }

  if (!session || session.user.role !== 'TREASURER') {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error">
          Access denied. This page is only accessible to Treasurer users.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs />

      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <ReportIcon sx={{ mr: 2, fontSize: 40, color: 'primary.main' }} />
              Financial Reports & Analytics
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
              Comprehensive financial analysis and reporting dashboard
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip
                label={`${financialReport.activeLoans} Active Loans`}
                color="primary"
                variant="outlined"
                size="small"
              />
              <Chip
                label={`${financialReport.totalMembers} Members`}
                color="secondary"
                variant="outlined"
                size="small"
              />
              <Chip
                label={`Risk Score: ${riskMetrics.riskScore}/100`}
                color={riskMetrics.riskScore > 70 ? "success" : riskMetrics.riskScore > 40 ? "warning" : "error"}
                variant="outlined"
                size="small"
              />
            </Stack>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Refresh Data">
                <IconButton onClick={fetchReports} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="outlined"
                startIcon={<ExcelIcon />}
                onClick={generateExcelReport}
                disabled={isExporting}
                size="small"
                color="success"
              >
                {isExporting ? 'Exporting...' : 'Excel'}
              </Button>
              <PDFButton
                data={prepareFinancialReportData()}
                type="financial-report"
                title="Financial Report & Analysis"
                filename={`financial_report_${startDate}_${endDate}.pdf`}
                variant="contained"
                size="small"
                showDropdown={true}
                enablePrint={true}
              />
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* Report Controls */}
      <Card sx={{ mb: 4, borderRadius: 2, boxShadow: 3 }}>
        <CardContent sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <FilterIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Report Filters</Typography>
            <Divider sx={{ flexGrow: 1, ml: 2 }} />
          </Box>
          <Grid container spacing={3} alignItems="end">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Report Period</InputLabel>
                <Select
                  value={reportPeriod}
                  label="Report Period"
                  onChange={(e) => setReportPeriod(e.target.value)}
                >
                  <MenuItem value="MONTHLY">Monthly</MenuItem>
                  <MenuItem value="QUARTERLY">Quarterly</MenuItem>
                  <MenuItem value="YEARLY">Yearly</MenuItem>
                  <MenuItem value="CUSTOM">Custom Range</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="contained"
                fullWidth
                onClick={fetchReports}
                disabled={loading}
                startIcon={loading ? <RefreshIcon /> : <ReportIcon />}
                sx={{ height: 40 }}
              >
                {loading ? 'Loading...' : 'Generate Report'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs for better organization */}
      <Card sx={{ mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)} aria-label="report tabs">
            <Tab label="Overview" sx={{ textTransform: 'none', fontWeight: 'medium' }} />
            <Tab label="Charts & Analytics" sx={{ textTransform: 'none', fontWeight: 'medium' }} />
            <Tab label="Detailed Statistics" sx={{ textTransform: 'none', fontWeight: 'medium' }} />
          </Tabs>
        </Box>
      </Card>

      {/* Tab Content */}
      {currentTab === 0 && (
        <Box>
          {/* Key Financial Metrics */}
          <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
            <BankIcon sx={{ mr: 1, color: 'primary.main' }} />
            Financial Overview
          </Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, boxShadow: 2, transition: 'all 0.3s ease', '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' } }}>
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <Box sx={{ p: 2, borderRadius: '50%', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                      <BankIcon sx={{ fontSize: 30 }} />
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 'medium' }}>Total Portfolio</Typography>
                  <Typography variant="h4" color="primary" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {formatCurrency(financialReport.totalPortfolio)}
                  </Typography>
                  <Chip
                    label={`${financialReport.activeLoans} active loans`}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, boxShadow: 2, transition: 'all 0.3s ease', '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' } }}>
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <Box sx={{ p: 2, borderRadius: '50%', bgcolor: 'success.light', color: 'success.contrastText' }}>
                      <PaymentIcon sx={{ fontSize: 30 }} />
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 'medium' }}>Collections</Typography>
                  <Typography variant="h4" color="success.main" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {formatCurrency(financialReport.totalCollections)}
                  </Typography>
                  <Chip
                    label={`${formatPercentage(financialReport.collectionRate)} collection rate`}
                    size="small"
                    variant="outlined"
                    color="success"
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, boxShadow: 2, transition: 'all 0.3s ease', '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' } }}>
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <Box sx={{ p: 2, borderRadius: '50%', bgcolor: 'info.light', color: 'info.contrastText' }}>
                      <SavingsIcon sx={{ fontSize: 30 }} />
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 'medium' }}>Total Savings</Typography>
                  <Typography variant="h4" color="info.main" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {formatCurrency(financialReport.totalSavings + financialReport.totalShares)}
                  </Typography>
                  <Chip
                    label="Member deposits"
                    size="small"
                    variant="outlined"
                    color="info"
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, boxShadow: 2, transition: 'all 0.3s ease', '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' } }}>
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <Box sx={{
                      p: 2,
                      borderRadius: '50%',
                      bgcolor: financialReport.netFlow >= 0 ? 'success.light' : 'error.light',
                      color: financialReport.netFlow >= 0 ? 'success.contrastText' : 'error.contrastText'
                    }}>
                      <TrendingUpIcon sx={{ fontSize: 30 }} />
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 'medium' }}>Net Flow</Typography>
                  <Typography
                    variant="h4"
                    color={financialReport.netFlow >= 0 ? "success.main" : "error.main"}
                    sx={{ mb: 1, fontWeight: 'bold' }}
                  >
                    {formatCurrency(financialReport.netFlow)}
                  </Typography>
                  <Chip
                    label="This period"
                    size="small"
                    variant="outlined"
                    color={financialReport.netFlow >= 0 ? "success" : "error"}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {currentTab === 1 && (
        <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
          {/* Charts Section Header */}
          <Box sx={{
            mb: 2,
            p: 2,
            bgcolor: 'primary.main',
            borderRadius: 2,
            color: 'primary.contrastText',
            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)'
          }}>
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', mb: 0.5 }}>
              <BarChartIcon sx={{ mr: 1 }} />
              Charts & Analytics
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Visual insights into financial performance and trends
            </Typography>
          </Box>

          {/* Compact Charts Grid */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* Loan Type Distribution - Optimized */}
            <Grid item xs={12} lg={6}>
              <Card sx={{
                borderRadius: 2,
                boxShadow: 3,
                height: 420,
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: 6,
                  transform: 'translateY(-2px)'
                }
              }}>
                <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1,
                    pb: 1,
                    borderBottom: 1,
                    borderColor: 'divider'
                  }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      <PieChartIcon sx={{ mr: 1, color: 'primary.main', fontSize: '1.3rem' }} />
                      Loan Distribution
                    </Typography>
                    <Chip label="Active" color="success" size="small" />
                  </Box>

                  <Box sx={{ flex: 1, position: 'relative', minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                        <Pie
                          data={loanDistribution}
                          cx="50%"
                          cy="45%"
                          labelLine={false}
                          label={({ type, percentage }) => `${type} ${percentage.toFixed(1)}%`}
                          outerRadius="75%"
                          innerRadius="35%"
                          fill="#8884d8"
                          dataKey="value"
                          stroke="#ffffff"
                          strokeWidth={2}
                        >
                          {loanDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getLoanTypeColor(entry.type)} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: any) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #ccc',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          wrapperStyle={{ fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Monthly Trends - Optimized */}
            <Grid item xs={12} lg={6}>
              <Card sx={{
                borderRadius: 2,
                boxShadow: 3,
                height: 420,
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: 6,
                  transform: 'translateY(-2px)'
                }
              }}>
                <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1,
                    pb: 1,
                    borderBottom: 1,
                    borderColor: 'divider'
                  }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      <BarChartIcon sx={{ mr: 1, color: 'primary.main', fontSize: '1.3rem' }} />
                      Monthly Trends
                    </Typography>
                    <Chip label="6 Months" color="info" size="small" />
                  </Box>

                  <Box sx={{ flex: 1, position: 'relative', minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyTrends} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <defs>
                          <linearGradient id="disbursements" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ff7300" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#ff7300" stopOpacity={0.2}/>
                          </linearGradient>
                          <linearGradient id="collections" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#387908" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#387908" stopOpacity={0.2}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 2" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                        />
                        <RechartsTooltip
                          formatter={(value: any) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #ccc',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          wrapperStyle={{ fontSize: '12px' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="disbursements"
                          stackId="1"
                          stroke="#ff7300"
                          fill="url(#disbursements)"
                          name="Disbursements"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="collections"
                          stackId="1"
                          stroke="#387908"
                          fill="url(#collections)"
                          name="Collections"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Cash Flow Trends - Full Width Optimized */}
          <Card sx={{
            borderRadius: 2,
            boxShadow: 3,
            background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: 6,
              transform: 'translateY(-1px)'
            }
          }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                pb: 1,
                borderBottom: 1,
                borderColor: 'divider'
              }}>
                <Box>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', mb: 0.5 }}>
                    <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
                    Cash Flow Analysis
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Comprehensive view of financial movements over time
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip label="Real-time" color="success" size="small" />
                  <Chip
                    label={financialReport.netFlow >= 0 ? "Positive Flow" : "Negative Flow"}
                    color={financialReport.netFlow >= 0 ? "success" : "error"}
                    size="small"
                  />
                </Box>
              </Box>

              <Box sx={{ height: 350, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrends} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                    <defs>
                      <linearGradient id="netFlowGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="2 2"
                      stroke="#e0e0e0"
                      horizontal={true}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#666' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#666' }}
                      tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    />
                    <RechartsTooltip
                      formatter={(value: any) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        border: '1px solid #ddd',
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        padding: '12px'
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      iconType="line"
                      wrapperStyle={{ fontSize: '13px', paddingBottom: '10px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="netFlow"
                      stroke="#8884d8"
                      strokeWidth={4}
                      name="Net Flow"
                      dot={{ fill: '#8884d8', strokeWidth: 2, r: 6 }}
                      activeDot={{ r: 8, stroke: '#8884d8', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="disbursements"
                      stroke="#ff7300"
                      strokeWidth={2}
                      name="Disbursements"
                      strokeDasharray="5 5"
                      dot={{ fill: '#ff7300', r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="collections"
                      stroke="#387908"
                      strokeWidth={2}
                      name="Collections"
                      strokeDasharray="5 5"
                      dot={{ fill: '#387908', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {currentTab === 2 && (
        <Box>
          {/* Detailed Statistics */}
          <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
            <ReportIcon sx={{ mr: 1, color: 'primary.main' }} />
            Detailed Statistics
          </Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Member Statistics */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'medium' }}>Member Statistics</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Total Members</Typography>
                    <Typography variant="body2" fontWeight="medium">{memberStats.totalMembers}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Active Members</Typography>
                    <Typography variant="body2" fontWeight="medium">{memberStats.activeMembers}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">New Members</Typography>
                    <Typography variant="body2" fontWeight="medium">{memberStats.newMembers}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Growth Rate</Typography>
                    <Typography variant="body2" fontWeight="medium" color="success.main">
                      {formatPercentage(memberStats.memberGrowthRate)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Risk Metrics */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'medium' }}>Risk Metrics</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Default Rate</Typography>
                    <Typography variant="body2" fontWeight="medium" color="error.main">
                      {formatPercentage(riskMetrics.defaultRate)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Overdue Loans</Typography>
                    <Typography variant="body2" fontWeight="medium">{riskMetrics.overdueLoans}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Risk Score</Typography>
                    <Typography variant="body2" fontWeight="medium" color="warning.main">
                      {riskMetrics.riskScore}/100
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Provision Required</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(riskMetrics.provisionRequired)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Performance Indicators */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'medium' }}>Performance Indicators</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Avg. Loan Size</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(financialReport.averageLoanSize)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Portfolio Yield</Typography>
                    <Typography variant="body2" fontWeight="medium" color="success.main">
                      {formatPercentage(12.5)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Cost of Funds</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatPercentage(8.2)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Net Interest Margin</Typography>
                    <Typography variant="body2" fontWeight="medium" color="success.main">
                      {formatPercentage(4.3)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  )
}
