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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Stack,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material'
import {
  Settings as SettingsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Security as SecurityIcon,
  Business as BusinessIcon,
  Notifications as NotificationsIcon,
  Payment as PaymentIcon
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'

interface SystemSetting {
  id: string
  key: string
  value: string
  description?: string
  category: string
  dataType: 'string' | 'number' | 'boolean' | 'json'
  isEditable: boolean
  updatedAt: string
}

const SETTING_CATEGORIES = [
  { value: 'GENERAL', label: 'General Settings' },
  { value: 'SECURITY', label: 'Security Settings' },
  { value: 'NOTIFICATIONS', label: 'Notification Settings' },
  { value: 'LOAN', label: 'Loan Settings' },
  { value: 'PAYMENT', label: 'Payment Settings' },
  { value: 'SYSTEM', label: 'System Settings' }
]

export default function SystemSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)
  const [editingSettings, setEditingSettings] = useState<{ [key: string]: any }>({})
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('GENERAL')

  const [newSetting, setNewSetting] = useState({
    key: '',
    value: '',
    description: '',
    category: 'GENERAL',
    dataType: 'string' as const
  })

  // Mock data for demonstration
  const mockSettings: SystemSetting[] = [
    {
      id: '1',
      key: 'SYSTEM_NAME',
      value: 'Dranoel Financial Services',
      description: 'The name of the financial institution',
      category: 'GENERAL',
      dataType: 'string',
      isEditable: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      key: 'MAX_LOGIN_ATTEMPTS',
      value: '5',
      description: 'Maximum number of failed login attempts before account lockout',
      category: 'SECURITY',
      dataType: 'number',
      isEditable: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: '3',
      key: 'SESSION_TIMEOUT',
      value: '30',
      description: 'Session timeout in minutes',
      category: 'SECURITY',
      dataType: 'number',
      isEditable: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: '4',
      key: 'EMAIL_NOTIFICATIONS',
      value: 'true',
      description: 'Enable email notifications for loan status updates',
      category: 'NOTIFICATIONS',
      dataType: 'boolean',
      isEditable: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: '5',
      key: 'MAX_LOAN_AMOUNT',
      value: '1000000',
      description: 'Maximum loan amount allowed',
      category: 'LOAN',
      dataType: 'number',
      isEditable: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: '6',
      key: 'INTEREST_RATES',
      value: '{"PERSONAL": 8.5, "BUSINESS": 7.2, "MORTGAGE": 4.8}',
      description: 'Default interest rates by loan type',
      category: 'LOAN',
      dataType: 'json',
      isEditable: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: '7',
      key: 'PAYMENT_GRACE_PERIOD',
      value: '7',
      description: 'Grace period in days for late payments',
      category: 'PAYMENT',
      dataType: 'number',
      isEditable: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: '8',
      key: 'BACKUP_RETENTION',
      value: '30',
      description: 'Number of days to retain database backups',
      category: 'SYSTEM',
      dataType: 'number',
      isEditable: false,
      updatedAt: new Date().toISOString()
    }
  ]

  useEffect(() => {
    if (session?.user?.role === 'ADMINISTRATOR') {
      fetchSettings()
    }
  }, [session])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/administrator/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      } else {
        console.error('Failed to fetch settings')
        // Fallback to mock data if API fails
        setSettings(mockSettings)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      // Fallback to mock data if API fails
      setSettings(mockSettings)
    } finally {
      setLoading(false)
    }
  }

  const getSettingsByCategory = (category: string) => {
    return settings.filter(setting => setting.category === category)
  }

  const getCurrentCategory = () => {
    return SETTING_CATEGORIES[activeTab]?.value || 'GENERAL'
  }

  const handleEditStart = (setting: SystemSetting) => {
    setEditingSettings({
      ...editingSettings,
      [setting.id]: setting.value
    })
  }

  const handleEditCancel = (settingId: string) => {
    const newEditingSettings = { ...editingSettings }
    delete newEditingSettings[settingId]
    setEditingSettings(newEditingSettings)
  }

  const handleEditSave = async (setting: SystemSetting) => {
    const newValue = editingSettings[setting.id]

    try {
      const response = await fetch(`/api/administrator/settings/${setting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newValue })
      })

      if (response.ok) {
        // Update local state
        setSettings(prev => prev.map(s =>
          s.id === setting.id ? { ...s, value: newValue, updatedAt: new Date().toISOString() } : s
        ))

        // Remove from editing state
        handleEditCancel(setting.id)

        alert('Setting updated successfully')
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to update setting')
      }
    } catch (error) {
      console.error('Error updating setting:', error)
      alert('Failed to update setting')
    }
  }

  const handleCreateSetting = async () => {
    try {
      const response = await fetch('/api/administrator/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newSetting.key,
          value: newSetting.value,
          description: newSetting.description
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(prev => [...prev, data.setting])
        setCreateDialogOpen(false)
        setNewSetting({
          key: '',
          value: '',
          description: '',
          category: 'GENERAL',
          dataType: 'string'
        })

        alert('Setting created successfully')
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to create setting')
      }
    } catch (error) {
      console.error('Error creating setting:', error)
      alert('Failed to create setting')
    }
  }

  const renderSettingValue = (setting: SystemSetting) => {
    if (editingSettings[setting.id] !== undefined) {
      if (setting.dataType === 'boolean') {
        return (
          <FormControlLabel
            control={
              <Switch
                checked={editingSettings[setting.id] === 'true'}
                onChange={(e) => setEditingSettings({
                  ...editingSettings,
                  [setting.id]: e.target.checked ? 'true' : 'false'
                })}
              />
            }
            label=""
          />
        )
      } else if (setting.dataType === 'json') {
        return (
          <TextField
            multiline
            rows={3}
            value={editingSettings[setting.id]}
            onChange={(e) => setEditingSettings({
              ...editingSettings,
              [setting.id]: e.target.value
            })}
            size="small"
            fullWidth
          />
        )
      } else {
        return (
          <TextField
            value={editingSettings[setting.id]}
            onChange={(e) => setEditingSettings({
              ...editingSettings,
              [setting.id]: e.target.value
            })}
            type={setting.dataType === 'number' ? 'number' : 'text'}
            size="small"
            fullWidth
          />
        )
      }
    }

    // Display value
    if (setting.dataType === 'boolean') {
      return (
        <Chip
          label={setting.value === 'true' ? 'Enabled' : 'Disabled'}
          color={setting.value === 'true' ? 'success' : 'default'}
          size="small"
        />
      )
    } else if (setting.dataType === 'json') {
      return (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {setting.value}
        </Typography>
      )
    } else {
      return (
        <Typography variant="body2">
          {setting.value}
        </Typography>
      )
    }
  }

  if (status === 'loading' || loading) {
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
          <SettingsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          System Settings
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Configure system-wide settings and parameters
        </Typography>
      </Box>

      {/* Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Settings Configuration
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Add Setting
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Settings by Category */}
      <Card>
        <CardContent>
          <Tabs
            value={activeTab}
            onChange={(_, newTab) => setActiveTab(newTab)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {SETTING_CATEGORIES.map((category) => (
              <Tab
                key={category.value}
                label={category.label}
                icon={
                  category.value === 'SECURITY' ? <SecurityIcon /> :
                  category.value === 'NOTIFICATIONS' ? <NotificationsIcon /> :
                  category.value === 'LOAN' ? <BusinessIcon /> :
                  category.value === 'PAYMENT' ? <PaymentIcon /> :
                  <SettingsIcon />
                }
              />
            ))}
          </Tabs>

          <Box sx={{ mt: 3 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Setting Key</TableCell>
                    <TableCell>Value</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Last Updated</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getSettingsByCategory(getCurrentCategory()).map((setting) => (
                    <TableRow key={setting.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium" sx={{ fontFamily: 'monospace' }}>
                          {setting.key}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {renderSettingValue(setting)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {setting.description || 'No description'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={setting.dataType} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(setting.updatedAt).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {setting.isEditable && (
                          <Stack direction="row" spacing={1} justifyContent="center">
                            {editingSettings[setting.id] !== undefined ? (
                              <>
                                <Button
                                  size="small"
                                  startIcon={<SaveIcon />}
                                  onClick={() => handleEditSave(setting)}
                                  color="primary"
                                >
                                  Save
                                </Button>
                                <Button
                                  size="small"
                                  startIcon={<CancelIcon />}
                                  onClick={() => handleEditCancel(setting.id)}
                                  color="secondary"
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="small"
                                startIcon={<EditIcon />}
                                onClick={() => handleEditStart(setting)}
                              >
                                Edit
                              </Button>
                            )}
                          </Stack>
                        )}
                        {!setting.isEditable && (
                          <Chip label="Read Only" size="small" color="default" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {getSettingsByCategory(getCurrentCategory()).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary">
                          No settings found for this category
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Create Setting Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Setting</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Setting Key"
                  value={newSetting.key}
                  onChange={(e) => setNewSetting({...newSetting, key: e.target.value.toUpperCase().replace(/\s+/g, '_')})}
                  placeholder="e.g., MAX_FILE_SIZE"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={newSetting.category}
                    label="Category"
                    onChange={(e) => setNewSetting({...newSetting, category: e.target.value})}
                  >
                    {SETTING_CATEGORIES.map((cat) => (
                      <MenuItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Data Type</InputLabel>
                  <Select
                    value={newSetting.dataType}
                    label="Data Type"
                    onChange={(e) => setNewSetting({...newSetting, dataType: e.target.value as any})}
                  >
                    <MenuItem value="string">String</MenuItem>
                    <MenuItem value="number">Number</MenuItem>
                    <MenuItem value="boolean">Boolean</MenuItem>
                    <MenuItem value="json">JSON</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Value"
                  value={newSetting.value}
                  onChange={(e) => setNewSetting({...newSetting, value: e.target.value})}
                  type={newSetting.dataType === 'number' ? 'number' : 'text'}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={newSetting.description}
                  onChange={(e) => setNewSetting({...newSetting, description: e.target.value})}
                  placeholder="Describe what this setting controls..."
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateSetting} variant="contained">Create Setting</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}