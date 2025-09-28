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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Stack,
  LinearProgress,
  FormControl,
  FormControlLabel,
  Checkbox,
  TextField,
  Divider
} from '@mui/material'
import {
  Storage as DatabaseIcon,
  Backup as BackupIcon,
  Speed as OptimizeIcon,
  CleaningServices as CleanupIcon,
  LocalHospital as HealthIcon,
  TableChart as TableIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'

interface DatabaseStats {
  tableStats: Array<{
    name: string
    count: number
  }>
}

interface TableInfo {
  tableInfo: Array<{
    name: string
    columns: number
    indexes: number
    size: string
    description: string
  }>
}

interface DatabaseHealth {
  health: {
    status: string
    connectionTime: number | null
    activeConnections: string
    uptime: string
    version: string
    lastBackup: string
    error?: string
  }
}

export default function DatabaseOperationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null)
  const [health, setHealth] = useState<DatabaseHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [operationLoading, setOperationLoading] = useState(false)
  const [operationResult, setOperationResult] = useState<string | null>(null)

  // Dialog states
  const [backupDialogOpen, setBackupDialogOpen] = useState(false)
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false)
  const [optimizeDialogOpen, setOptimizeDialogOpen] = useState(false)

  // Cleanup options
  const [cleanupOptions, setCleanupOptions] = useState({
    cleanupAuditLogs: true,
    auditLogRetentionDays: 90,
    cleanupNotifications: true
  })

  useEffect(() => {
    if (session?.user?.role === 'ADMINISTRATOR') {
      fetchDatabaseData()
    }
  }, [session])

  const fetchDatabaseData = async () => {
    setLoading(true)
    try {
      const [statsRes, tablesRes, healthRes] = await Promise.all([
        fetch('/api/administrator/database?operation=stats'),
        fetch('/api/administrator/database?operation=tables'),
        fetch('/api/administrator/database?operation=health')
      ])

      if (statsRes.ok) {
        setStats(await statsRes.json())
      }
      if (tablesRes.ok) {
        setTableInfo(await tablesRes.json())
      }
      if (healthRes.ok) {
        setHealth(await healthRes.json())
      }
    } catch (error) {
      console.error('Error fetching database data:', error)
    } finally {
      setLoading(false)
    }
  }

  const performDatabaseOperation = async (operation: string, params: any = {}) => {
    setOperationLoading(true)
    setOperationResult(null)

    try {
      const response = await fetch('/api/administrator/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, params })
      })

      const result = await response.json()

      if (response.ok) {
        setOperationResult(`✅ ${result.message}`)
        // Refresh data after successful operation
        setTimeout(() => {
          fetchDatabaseData()
        }, 1000)
      } else {
        setOperationResult(`❌ ${result.error}`)
      }
    } catch (error) {
      console.error('Error performing database operation:', error)
      setOperationResult('❌ Operation failed')
    } finally {
      setOperationLoading(false)
    }
  }

  const handleBackup = () => {
    setBackupDialogOpen(false)
    performDatabaseOperation('backup')
  }

  const handleOptimize = () => {
    setOptimizeDialogOpen(false)
    performDatabaseOperation('optimize')
  }

  const handleCleanup = () => {
    setCleanupDialogOpen(false)
    performDatabaseOperation('cleanup', cleanupOptions)
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
          <DatabaseIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          Database Operations
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Monitor and manage database health and operations
        </Typography>
      </Box>

      {operationLoading && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Operation in Progress</Typography>
            <LinearProgress />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Please wait while the database operation completes...
            </Typography>
          </CardContent>
        </Card>
      )}

      {operationResult && (
        <Alert
          severity={operationResult.startsWith('✅') ? 'success' : 'error'}
          sx={{ mb: 3 }}
          onClose={() => setOperationResult(null)}
        >
          {operationResult}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Database Health */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HealthIcon />
                Database Health
              </Typography>

              {loading ? (
                <Typography>Loading...</Typography>
              ) : health ? (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Chip
                      label={health.health.status.toUpperCase()}
                      color={health.health.status === 'healthy' ? 'success' : 'error'}
                      icon={health.health.status === 'healthy' ? <HealthIcon /> : <WarningIcon />}
                    />
                    <Button
                      size="small"
                      startIcon={<RefreshIcon />}
                      onClick={fetchDatabaseData}
                    >
                      Refresh
                    </Button>
                  </Box>

                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Version:</strong> {health.health.version}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Connection Time:</strong> {
                      health.health.connectionTime ?
                      new Date(health.health.connectionTime).toLocaleString() :
                      'Unknown'
                    }
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Active Connections:</strong> {health.health.activeConnections}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Last Backup:</strong> {health.health.lastBackup}
                  </Typography>

                  {health.health.error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {health.health.error}
                    </Alert>
                  )}
                </Box>
              ) : (
                <Typography color="error">Failed to load health data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Operations */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Operations
              </Typography>

              <Stack spacing={2}>
                <Button
                  variant="contained"
                  startIcon={<BackupIcon />}
                  onClick={() => setBackupDialogOpen(true)}
                  fullWidth
                  disabled={operationLoading}
                >
                  Backup Database
                </Button>

                <Button
                  variant="contained"
                  color="info"
                  startIcon={<OptimizeIcon />}
                  onClick={() => setOptimizeDialogOpen(true)}
                  fullWidth
                  disabled={operationLoading}
                >
                  Optimize Database
                </Button>

                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<CleanupIcon />}
                  onClick={() => setCleanupDialogOpen(true)}
                  fullWidth
                  disabled={operationLoading}
                >
                  Cleanup Database
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Table Statistics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Table Statistics
              </Typography>

              {loading ? (
                <Typography>Loading...</Typography>
              ) : stats ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Table</TableCell>
                        <TableCell align="right">Records</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.tableStats.map((table) => (
                        <TableRow key={table.name}>
                          <TableCell>{table.name}</TableCell>
                          <TableCell align="right">
                            {table.count.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="error">Failed to load statistics</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Table Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TableIcon />
                Table Information
              </Typography>

              {loading ? (
                <Typography>Loading...</Typography>
              ) : tableInfo ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Table</TableCell>
                        <TableCell align="center">Columns</TableCell>
                        <TableCell align="center">Indexes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tableInfo.tableInfo.map((table) => (
                        <TableRow key={table.name}>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {table.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {table.description}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">{table.columns}</TableCell>
                          <TableCell align="center">{table.indexes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="error">Failed to load table information</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Backup Dialog */}
      <Dialog open={backupDialogOpen} onClose={() => setBackupDialogOpen(false)}>
        <DialogTitle>Database Backup</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            This will create a backup of the entire database. The backup process may take several minutes depending on the database size.
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            During the backup process, database performance may be temporarily affected.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBackupDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleBackup} variant="contained" disabled={operationLoading}>
            Start Backup
          </Button>
        </DialogActions>
      </Dialog>

      {/* Optimize Dialog */}
      <Dialog open={optimizeDialogOpen} onClose={() => setOptimizeDialogOpen(false)}>
        <DialogTitle>Database Optimization</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            This will optimize the database by rebuilding indexes, updating statistics, and reclaiming unused space.
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Optimization may temporarily affect database performance. Consider running during off-peak hours.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOptimizeDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleOptimize} variant="contained" color="info" disabled={operationLoading}>
            Start Optimization
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cleanup Dialog */}
      <Dialog open={cleanupDialogOpen} onClose={() => setCleanupDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Database Cleanup</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Select the cleanup operations to perform:
          </Typography>

          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={cleanupOptions.cleanupAuditLogs}
                  onChange={(e) => setCleanupOptions({
                    ...cleanupOptions,
                    cleanupAuditLogs: e.target.checked
                  })}
                />
              }
              label="Cleanup old audit logs"
            />

            {cleanupOptions.cleanupAuditLogs && (
              <TextField
                size="small"
                label="Retention days"
                type="number"
                value={cleanupOptions.auditLogRetentionDays}
                onChange={(e) => setCleanupOptions({
                  ...cleanupOptions,
                  auditLogRetentionDays: parseInt(e.target.value) || 90
                })}
                sx={{ ml: 4, mt: 1, width: 120 }}
              />
            )}
          </Box>

          <Box sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={cleanupOptions.cleanupNotifications}
                  onChange={(e) => setCleanupOptions({
                    ...cleanupOptions,
                    cleanupNotifications: e.target.checked
                  })}
                />
              }
              label="Cleanup old read notifications (30+ days)"
            />
          </Box>

          <Alert severity="warning" sx={{ mt: 2 }}>
            This operation will permanently delete selected data. This action cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCleanupDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCleanup} variant="contained" color="warning" disabled={operationLoading}>
            Start Cleanup
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}