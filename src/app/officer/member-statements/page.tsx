'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Avatar,
  LinearProgress,
  Pagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Divider,
} from '@mui/material'
import {
  People as PeopleIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  AccountBalance as BankIcon,
  Receipt as StatementIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Savings as SavingsIcon,
  CreditCard as LoanIcon,
  AccountBalanceWallet as ShareIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'

interface Member {
  id: string
  membershipNumber: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  joinDate: string
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  savingsBalance: number
  loanBalance: number
  shareValue: number
  lastActivity: string
}

interface MemberStatement {
  member: Member
  savings: {
    currentBalance: number
    totalDeposits: number
    totalWithdrawals: number
    interestEarned: number
    recentTransactions: Array<{
      date: string
      description: string
      type: string
      amount: number
      balance: number
    }>
  }
  loans: {
    activeLoans: number
    totalBorrowed: number
    totalRepaid: number
    currentBalance: number
    recentPayments: Array<{
      date: string
      amount: number
      principal: number
      interest: number
      balance: number
    }>
  }
  shares: {
    totalShares: number
    shareValue: number
    totalValue: number
    dividendEarned: number
    recentDividends: Array<{
      date: string
      shares: number
      amount: number
    }>
  }
}

export default function MemberStatementsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<Member[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [memberStatement, setMemberStatement] = useState<MemberStatement | null>(null)
  const [statementDialog, setStatementDialog] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    if (session?.user && session.user.role === 'LOANS_OFFICER') {
      fetchMembers()
    }
  }, [session, currentPage, searchQuery, statusFilter])

  const fetchMembers = async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      if (searchQuery) params.append('search', searchQuery)
      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter)
      params.append('page', currentPage.toString())
      params.append('limit', '10')

      const response = await fetch(`/api/officer/members?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch members')
      }

      const data = await response.json()

      setMembers(data.members)
      setTotalPages(data.pagination.pages)
    } catch (error) {
      console.error('Error fetching members:', error)
      setMembers([])
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  const fetchMemberStatement = async (member: Member) => {
    try {
      const response = await fetch(`/api/officer/members/${member.id}/statement`)

      if (!response.ok) {
        throw new Error('Failed to fetch member statement')
      }

      const statement = await response.json()
      setMemberStatement(statement)
    } catch (error) {
      console.error('Error fetching member statement:', error)
      // Fallback to basic member data if API fails
      const fallbackStatement: MemberStatement = {
        member,
        savings: {
          currentBalance: member.savingsBalance,
          totalDeposits: 0,
          totalWithdrawals: 0,
          interestEarned: 0,
          recentTransactions: []
        },
        loans: {
          activeLoans: member.loanBalance > 0 ? 1 : 0,
          totalBorrowed: 0,
          totalRepaid: 0,
          currentBalance: member.loanBalance,
          recentPayments: []
        },
        shares: {
          totalShares: Math.floor(member.shareValue / 25000),
          shareValue: 25000,
          totalValue: member.shareValue,
          dividendEarned: 0,
          recentDividends: []
        }
      }
      setMemberStatement(fallbackStatement)
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
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success'
      case 'INACTIVE':
        return 'warning'
      case 'SUSPENDED':
        return 'error'
      default:
        return 'default'
    }
  }

  const handleViewStatement = async (member: Member) => {
    setSelectedMember(member)
    await fetchMemberStatement(member)
    setStatementDialog(true)
    setActiveTab(0)
  }

  const handleCloseStatement = () => {
    setStatementDialog(false)
    setSelectedMember(null)
    setMemberStatement(null)
    setActiveTab(0)
  }

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value)
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    )
  }

  if (!session || session.user.role !== 'LOANS_OFFICER') {
    router.push('/auth/signin')
    return null
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs />
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          <PeopleIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Member Statements
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          View comprehensive financial statements for all members
        </Typography>
      </Box>

      {/* Filters and Search */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={8} md={6}>
              <TextField
                fullWidth
                placeholder="Search by name, membership number, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="ALL">All Members</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="INACTIVE">Inactive</MenuItem>
                  <MenuItem value="SUSPENDED">Suspended</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={12} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setStatusFilter('ALL')
                  setSearchQuery('')
                }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Members ({members.length})
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Join Date</TableCell>
                  <TableCell align="right">Savings Balance</TableCell>
                  <TableCell align="right">Loan Balance</TableCell>
                  <TableCell align="right">Share Value</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 36, height: 36 }}>
                          {member.firstName[0]}{member.lastName[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {member.firstName} {member.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {member.membershipNumber}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {member.email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {member.phoneNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(member.joinDate)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium" color="success.main">
                        {formatCurrency(member.savingsBalance)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight="medium"
                        color={member.loanBalance > 0 ? 'warning.main' : 'text.secondary'}
                      >
                        {member.loanBalance > 0 ? formatCurrency(member.loanBalance) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium" color="info.main">
                        {formatCurrency(member.shareValue)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={member.status}
                        color={getStatusColor(member.status) as any}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={() => handleViewStatement(member)}
                      >
                        View Statement
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {members.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                No members found matching your criteria.
              </Typography>
            </Box>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Member Statement Dialog */}
      <Dialog
        open={statementDialog}
        onClose={handleCloseStatement}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar>
                {selectedMember?.firstName[0]}{selectedMember?.lastName[0]}
              </Avatar>
              <Box>
                <Typography variant="h6">
                  {selectedMember?.firstName} {selectedMember?.lastName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedMember?.membershipNumber}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button startIcon={<PrintIcon />} size="small">
                Print
              </Button>
              <Button startIcon={<DownloadIcon />} size="small" variant="contained">
                Download PDF
              </Button>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {memberStatement && (
            <>
              <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
                <Tab icon={<SavingsIcon />} label="Savings" />
                <Tab icon={<LoanIcon />} label="Loans" />
                <Tab icon={<ShareIcon />} label="Shares" />
              </Tabs>

              {activeTab === 0 && (
                <Box>
                  <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" color="primary">
                            Current Balance
                          </Typography>
                          <Typography variant="h4">
                            {formatCurrency(memberStatement.savings.currentBalance)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" color="success.main">
                            Total Deposits
                          </Typography>
                          <Typography variant="h4">
                            {formatCurrency(memberStatement.savings.totalDeposits)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" color="warning.main">
                            Total Withdrawals
                          </Typography>
                          <Typography variant="h4">
                            {formatCurrency(memberStatement.savings.totalWithdrawals)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" color="info.main">
                            Interest Earned
                          </Typography>
                          <Typography variant="h4">
                            {formatCurrency(memberStatement.savings.interestEarned)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  <Typography variant="h6" sx={{ mb: 2 }}>Recent Transactions</Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell align="right">Balance</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {memberStatement.savings.recentTransactions.map((transaction, index) => (
                          <TableRow key={index}>
                            <TableCell>{formatDate(transaction.date)}</TableCell>
                            <TableCell>{transaction.description}</TableCell>
                            <TableCell>
                              <Chip label={transaction.type} size="small" />
                            </TableCell>
                            <TableCell align="right">
                              <Typography
                                color={transaction.amount > 0 ? 'success.main' : 'error.main'}
                                fontWeight="medium"
                              >
                                {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'medium' }}>
                              {formatCurrency(transaction.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {activeTab === 1 && (
                <Box>
                  <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" color="primary">
                            Active Loans
                          </Typography>
                          <Typography variant="h4">
                            {memberStatement.loans.activeLoans}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" color="info.main">
                            Total Borrowed
                          </Typography>
                          <Typography variant="h4">
                            {formatCurrency(memberStatement.loans.totalBorrowed)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" color="success.main">
                            Total Repaid
                          </Typography>
                          <Typography variant="h4">
                            {formatCurrency(memberStatement.loans.totalRepaid)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" color="warning.main">
                            Current Balance
                          </Typography>
                          <Typography variant="h4">
                            {formatCurrency(memberStatement.loans.currentBalance)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  {memberStatement.loans.recentPayments.length > 0 && (
                    <>
                      <Typography variant="h6" sx={{ mb: 2 }}>Recent Payments</Typography>
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell align="right">Payment Amount</TableCell>
                              <TableCell align="right">Principal</TableCell>
                              <TableCell align="right">Interest</TableCell>
                              <TableCell align="right">Remaining Balance</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {memberStatement.loans.recentPayments.map((payment, index) => (
                              <TableRow key={index}>
                                <TableCell>{formatDate(payment.date)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'medium' }}>
                                  {formatCurrency(payment.amount)}
                                </TableCell>
                                <TableCell align="right">
                                  {formatCurrency(payment.principal)}
                                </TableCell>
                                <TableCell align="right">
                                  {formatCurrency(payment.interest)}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'medium' }}>
                                  {formatCurrency(payment.balance)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}
                </Box>
              )}

              {activeTab === 2 && (
                <Box>
                  <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" color="primary">
                            Total Shares
                          </Typography>
                          <Typography variant="h4">
                            {memberStatement.shares.totalShares}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" color="info.main">
                            Share Value
                          </Typography>
                          <Typography variant="h4">
                            {formatCurrency(memberStatement.shares.shareValue)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" color="success.main">
                            Total Value
                          </Typography>
                          <Typography variant="h4">
                            {formatCurrency(memberStatement.shares.totalValue)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" color="warning.main">
                            Dividend Earned
                          </Typography>
                          <Typography variant="h4">
                            {formatCurrency(memberStatement.shares.dividendEarned)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  <Typography variant="h6" sx={{ mb: 2 }}>Recent Dividends</Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell align="right">Shares</TableCell>
                          <TableCell align="right">Dividend Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {memberStatement.shares.recentDividends.map((dividend, index) => (
                          <TableRow key={index}>
                            <TableCell>{formatDate(dividend.date)}</TableCell>
                            <TableCell align="right">{dividend.shares}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'medium' }}>
                              {formatCurrency(dividend.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStatement}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}