'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Avatar,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText
} from '@mui/material'
import {
  Timeline as AuditIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Download as ExportIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Payment as PaymentIcon,
  AccountBalance as LoanIcon
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'

interface AuditLog {
  id: string
  userId?: string
  action: string
  entityType: string
  entityId: string
  oldValues?: any
  newValues?: any
  ipAddress?: string
  userAgent?: string
  createdAt: string
  user?: {
    firstName: string
    lastName: string
    email: string
    role: string
  }
}

export default function AuditTrailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [actionFilter, setActionFilter] = useState('')
  const [entityTypeFilter, setEntityTypeFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null)

  useEffect(() => {
    if (session?.user?.role === 'ADMINISTRATOR') {
      fetchAuditLogs()
    }
  }, [session, page, actionFilter, entityTypeFilter, userFilter, startDate, endDate])

  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        action: actionFilter,
        entityType: entityTypeFilter,
        userId: userFilter,
        startDate,
        endDate
      })

      const response = await fetch(`/api/administrator/audit?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAuditLogs(data.auditLogs)
        setTotalPages(data.pagination.pages)
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    setExportLoading(true)
    try {
      const params = new URLSearchParams({
        format,
        action: actionFilter,
        entityType: entityTypeFilter,
        userId: userFilter,
        startDate,
        endDate
      })

      const response = await fetch(`/api/administrator/audit/export?${params}`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        console.error('Export failed')
        alert('Failed to export audit logs')
      }
    } catch (error) {
      console.error('Error exporting audit logs:', error)
      alert('Error exporting audit logs')
    } finally {
      setExportLoading(false)
    }
  }

  const getActionChip = (action: string) => {
    const colors: { [key: string]: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' } = {
      CREATE: 'success',
      UPDATE: 'info',
      DELETE: 'error',
      LOGIN: 'primary',
      LOGOUT: 'secondary',
      VIEW: 'default',
      APPROVE: 'success',
      REJECT: 'error'
    }

    const actionType = action.split('_')[0]
    return (
      <Chip
        label={action.replace(/_/g, ' ')}
        color={colors[actionType] || 'default'}
        size="small"
      />
    )
  }

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'USER':
        return <PersonIcon sx={{ fontSize: 20 }} />
      case 'LOAN_APPLICATION':
      case 'LOAN_ACCOUNT':
        return <LoanIcon sx={{ fontSize: 20 }} />
      case 'PAYMENT':
        return <PaymentIcon sx={{ fontSize: 20 }} />
      case 'AUDIT_LOG':
        return <SecurityIcon sx={{ fontSize: 20 }} />
      default:
        return <BusinessIcon sx={{ fontSize: 20 }} />
    }
  }

  const formatJsonValue = (value: any) => {
    if (!value) return 'N/A'
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  const renderChanges = (oldValues: any, newValues: any) => {
    if (!oldValues && !newValues) return null

    const oldObj = oldValues || {}
    const newObj = newValues || {}
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)])

    return (
      <Box>
        {Array.from(allKeys).map((key) => {
          const oldVal = oldObj[key]
          const newVal = newObj[key]
          const hasChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal)

          return (
            <Box key={key} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </Typography>
              <Grid container spacing={2}>
                {oldValues && (
                  <Grid item xs={12} md={6}>
                    <Paper sx={{
                      p: 1,
                      bgcolor: hasChanged ? 'error.lighter' : 'grey.50',
                      border: hasChanged ? 1 : 0,
                      borderColor: hasChanged ? 'error.main' : 'transparent'
                    }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Previous Value
                      </Typography>
                      <Typography variant="body2" sx={{
                        fontFamily: 'monospace',
                        color: hasChanged ? 'error.dark' : 'text.primary',
                        textDecoration: hasChanged ? 'line-through' : 'none'
                      }}>
                        {formatJsonValue(oldVal)}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
                <Grid item xs={12} md={oldValues ? 6 : 12}>
                  <Paper sx={{
                    p: 1,
                    bgcolor: hasChanged ? 'success.lighter' : 'grey.50',
                    border: hasChanged ? 1 : 0,
                    borderColor: hasChanged ? 'success.main' : 'transparent'
                  }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {oldValues ? 'New Value' : 'Value'}
                    </Typography>
                    <Typography variant="body2" sx={{
                      fontFamily: 'monospace',
                      color: hasChanged ? 'success.dark' : 'text.primary',
                      fontWeight: hasChanged ? 'bold' : 'normal'
                    }}>
                      {formatJsonValue(newVal)}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )
        })}
      </Box>
    )
  }

  if (status === 'loading') {
    return <Box sx={{ p: 3 }}>Loading...</Box>
  }

  if (!session || session.user.role !== 'ADMINISTRATOR') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. Administrator privileges required.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs />

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AuditIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          Audit Trail
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Monitor system activities and user actions
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Action</InputLabel>
                <Select
                  value={actionFilter}
                  label="Action"
                  onChange={(e) => setActionFilter(e.target.value)}
                >
                  <MenuItem value="">All Actions</MenuItem>
                  <MenuItem value="CREATE">Create</MenuItem>
                  <MenuItem value="UPDATE">Update</MenuItem>
                  <MenuItem value="DELETE">Delete</MenuItem>
                  <MenuItem value="VIEW">View</MenuItem>
                  <MenuItem value="LOGIN">Login</MenuItem>
                  <MenuItem value="LOGOUT">Logout</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Entity Type</InputLabel>
                <Select
                  value={entityTypeFilter}
                  label="Entity Type"
                  onChange={(e) => setEntityTypeFilter(e.target.value)}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="USER">User</MenuItem>
                  <MenuItem value="LOAN_APPLICATION">Loan Application</MenuItem>
                  <MenuItem value="LOAN_ACCOUNT">Loan Account</MenuItem>
                  <MenuItem value="PAYMENT">Payment</MenuItem>
                  <MenuItem value="AUDIT_LOG">Audit Log</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Start Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="End Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchAuditLogs}
                >
                  Refresh
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ExportIcon />}
                  onClick={(e) => setExportMenuAnchor(e.currentTarget)}
                  disabled={exportLoading}
                >
                  {exportLoading ? 'Exporting...' : 'Export'}
                </Button>
                <Menu
                  anchorEl={exportMenuAnchor}
                  open={Boolean(exportMenuAnchor)}
                  onClose={() => setExportMenuAnchor(null)}
                >
                  <MenuItem onClick={() => { handleExport('csv'); setExportMenuAnchor(null) }}>
                    <ListItemIcon>
                      <ExportIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Export as CSV</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => { handleExport('json'); setExportMenuAnchor(null) }}>
                    <ListItemIcon>
                      <ExportIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Export as JSON</ListItemText>
                  </MenuItem>
                </Menu>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Entity</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell align="center">Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">Loading...</TableCell>
                  </TableRow>
                ) : auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">No audit logs found</TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(log.createdAt).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {log.newValues?.email || log.userId ? (
                            <>
                              <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                                {log.newValues?.email ? log.newValues.email[0].toUpperCase() : 'U'}
                              </Avatar>
                              <Box>
                                <Typography variant="body2">
                                  {log.newValues?.email || `User ${log.userId?.substring(0, 8)}`}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {log.newValues?.role || 'Unknown'}
                                </Typography>
                              </Box>
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              System
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {getActionChip(log.action)}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getEntityIcon(log.entityType)}
                          <Box>
                            <Typography variant="body2">
                              {log.entityType.replace('_', ' ')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {log.entityId.substring(0, 8)}...
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {log.ipAddress || 'Unknown'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedLog(log)
                              setDetailsOpen(true)
                            }}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Audit Log Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Audit Log Details
        </DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Timestamp</Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Action</Typography>
                  <Box sx={{ mb: 2 }}>
                    {getActionChip(selectedLog.action)}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Entity Type</Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {selectedLog.entityType.replace('_', ' ')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Entity ID</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2 }}>
                    {selectedLog.entityId}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>IP Address</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2 }}>
                    {selectedLog.ipAddress || 'Unknown'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>User Agent</Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem', mb: 2 }}>
                    {selectedLog.userAgent || 'Unknown'}
                  </Typography>
                </Grid>
              </Grid>

              {selectedLog.newValues?.email && (
                <Accordion sx={{ mt: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">User Information</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2">
                      <strong>Email:</strong> {selectedLog.newValues.email}<br />
                      <strong>Role:</strong> {selectedLog.newValues.role || 'Unknown'}<br />
                      <strong>User ID:</strong> {selectedLog.userId}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              )}

              {(selectedLog.oldValues || selectedLog.newValues) && (
                <Accordion sx={{ mt: 1 }} defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">
                      {selectedLog.oldValues ? 'Changes Made' : 'Values'}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {renderChanges(selectedLog.oldValues, selectedLog.newValues)}
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}