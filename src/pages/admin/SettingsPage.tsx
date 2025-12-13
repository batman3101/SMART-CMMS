import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import {
  Settings,
  Bell,
  Bot,
  Database,
  Palette,
  Save,
  Loader2,
  Globe,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  X,
  Cog,
} from 'lucide-react'
import { equipmentApi, repairTypesApi, settingsApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { EquipmentType, RepairType } from '@/types'

interface SettingsData {
  system_name: string
  default_language: string
  timezone: string
  emergency_alert: boolean
  long_repair_warning: boolean
  long_repair_threshold_hours: number
  ai_enabled: boolean
  ai_api_key: string
  ai_refresh_interval: number
  backup_enabled: boolean
  backup_schedule: string
  backup_retention_days: number
}

interface EquipmentTypeFormData {
  code: string
  name: string
  name_ko: string
  name_vi: string
  category: 'MAIN' | 'SUB'
  description: string
}

interface RepairTypeFormData {
  code: string
  name: string
  name_ko: string
  name_vi: string
  color: string
  priority: number
  description: string
}

const defaultEquipmentTypeForm: EquipmentTypeFormData = {
  code: '',
  name: '',
  name_ko: '',
  name_vi: '',
  category: 'MAIN',
  description: '',
}

const defaultRepairTypeForm: RepairTypeFormData = {
  code: '',
  name: '',
  name_ko: '',
  name_vi: '',
  color: '#6B7280',
  priority: 3,
  description: '',
}

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { addToast } = useToast()
  const { user } = useAuthStore()

  const [activeTab, setActiveTab] = useState('general')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Master data states
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])
  const [repairTypes, setRepairTypes] = useState<RepairType[]>([])

  // Form states
  const [showEquipmentTypeForm, setShowEquipmentTypeForm] = useState(false)
  const [showRepairTypeForm, setShowRepairTypeForm] = useState(false)
  const [editingEquipmentType, setEditingEquipmentType] = useState<EquipmentType | null>(null)
  const [editingRepairType, setEditingRepairType] = useState<RepairType | null>(null)
  const [equipmentTypeForm, setEquipmentTypeForm] = useState<EquipmentTypeFormData>(defaultEquipmentTypeForm)
  const [repairTypeForm, setRepairTypeForm] = useState<RepairTypeFormData>(defaultRepairTypeForm)

  // Delete confirmation dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'equipment' | 'repair'; id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [settings, setSettings] = useState<SettingsData>({
    system_name: 'AMMS',
    default_language: 'ko',
    timezone: 'Asia/Ho_Chi_Minh',
    emergency_alert: true,
    long_repair_warning: true,
    long_repair_threshold_hours: 2,
    ai_enabled: true,
    ai_api_key: '',
    ai_refresh_interval: 2,
    backup_enabled: true,
    backup_schedule: 'daily',
    backup_retention_days: 30,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [eqTypesRes, repTypesRes, settingsRes] = await Promise.all([
        equipmentApi.getAllEquipmentTypes(),
        repairTypesApi.getAll(),
        settingsApi.getAll(),
      ])

      if (eqTypesRes.data) setEquipmentTypes(eqTypesRes.data)
      if (repTypesRes.data) setRepairTypes(repTypesRes.data)

      // Load settings from Supabase
      if (settingsRes.data) {
        const savedSettings = settingsRes.data as Record<string, unknown>
        setSettings(prev => ({
          ...prev,
          system_name: (savedSettings.system_name as string) || prev.system_name,
          default_language: (savedSettings.default_language as string) || prev.default_language,
          timezone: (savedSettings.timezone as string) || prev.timezone,
          emergency_alert: savedSettings.emergency_alert !== undefined ? (savedSettings.emergency_alert as boolean) : prev.emergency_alert,
          long_repair_warning: savedSettings.long_repair_warning !== undefined ? (savedSettings.long_repair_warning as boolean) : prev.long_repair_warning,
          long_repair_threshold_hours: (savedSettings.long_repair_threshold_hours as number) || prev.long_repair_threshold_hours,
          ai_enabled: savedSettings.ai_enabled !== undefined ? (savedSettings.ai_enabled as boolean) : prev.ai_enabled,
          ai_api_key: (savedSettings.ai_api_key as string) || prev.ai_api_key,
          ai_refresh_interval: (savedSettings.ai_refresh_interval as number) || prev.ai_refresh_interval,
          backup_enabled: savedSettings.backup_enabled !== undefined ? (savedSettings.backup_enabled as boolean) : prev.backup_enabled,
          backup_schedule: (savedSettings.backup_schedule as string) || prev.backup_schedule,
          backup_retention_days: (savedSettings.backup_retention_days as number) || prev.backup_retention_days,
        }))
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      addToast({ type: 'error', title: t('common.error'), message: t('common.loadFailed') })
    }
    setIsLoading(false)
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    setSaveSuccess(false)

    try {
      // Save all settings to Supabase
      const settingsToSave = [
        { key: 'system_name', value: settings.system_name, description: 'System display name' },
        { key: 'default_language', value: settings.default_language, description: 'Default language (ko/vi)' },
        { key: 'timezone', value: settings.timezone, description: 'Timezone setting' },
        { key: 'emergency_alert', value: settings.emergency_alert, description: 'Emergency alert enabled' },
        { key: 'long_repair_warning', value: settings.long_repair_warning, description: 'Long repair warning enabled' },
        { key: 'long_repair_threshold_hours', value: settings.long_repair_threshold_hours, description: 'Long repair warning threshold (hours)' },
        { key: 'ai_enabled', value: settings.ai_enabled, description: 'AI features enabled' },
        { key: 'ai_api_key', value: settings.ai_api_key, description: 'AI API key' },
        { key: 'ai_refresh_interval', value: settings.ai_refresh_interval, description: 'AI refresh interval (hours)' },
        { key: 'backup_enabled', value: settings.backup_enabled, description: 'Auto backup enabled' },
        { key: 'backup_schedule', value: settings.backup_schedule, description: 'Backup schedule (daily/weekly/monthly)' },
        { key: 'backup_retention_days', value: settings.backup_retention_days, description: 'Backup retention days' },
      ]

      const { error } = await settingsApi.setMultiple(settingsToSave, user?.id)

      if (error) {
        throw new Error(error)
      }

      // Update app language if changed
      if (settings.default_language !== i18n.language) {
        i18n.changeLanguage(settings.default_language)
      }

      setSaveSuccess(true)
      addToast({ type: 'success', title: t('common.success'), message: t('settings.saved') })
    } catch (error) {
      console.error('Failed to save settings:', error)
      addToast({ type: 'error', title: t('common.error'), message: String(error) })
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  }

  // Equipment Type handlers
  const handleEditEquipmentType = (type: EquipmentType) => {
    setEditingEquipmentType(type)
    setEquipmentTypeForm({
      code: type.code,
      name: type.name,
      name_ko: type.name_ko || '',
      name_vi: type.name_vi || '',
      category: type.category as 'MAIN' | 'SUB',
      description: type.description || '',
    })
    setShowEquipmentTypeForm(true)
  }

  const handleSaveEquipmentType = async () => {
    if (!equipmentTypeForm.code || !equipmentTypeForm.name) {
      addToast({ type: 'error', title: t('common.error'), message: t('settings.fillRequired') })
      return
    }

    setIsSaving(true)
    try {
      if (editingEquipmentType) {
        const { error } = await equipmentApi.updateEquipmentType(editingEquipmentType.id, {
          ...equipmentTypeForm,
          is_active: true,
        })
        if (error) throw new Error(error)
        addToast({ type: 'success', title: t('common.success'), message: t('settings.equipmentTypeUpdated') })
      } else {
        const { error } = await equipmentApi.createEquipmentType({
          ...equipmentTypeForm,
          is_active: true,
        })
        if (error) throw new Error(error)
        addToast({ type: 'success', title: t('common.success'), message: t('settings.equipmentTypeCreated') })
      }
      await fetchData()
      setShowEquipmentTypeForm(false)
      setEditingEquipmentType(null)
      setEquipmentTypeForm(defaultEquipmentTypeForm)
    } catch (error) {
      addToast({ type: 'error', title: t('common.error'), message: String(error) })
    }
    setIsSaving(false)
  }

  const handleDeleteEquipmentType = (type: EquipmentType) => {
    setDeleteTarget({ type: 'equipment', id: type.id, name: type.name_ko || type.name })
    setShowDeleteDialog(true)
  }

  // Repair Type handlers
  const handleEditRepairType = (type: RepairType) => {
    setEditingRepairType(type)
    setRepairTypeForm({
      code: type.code,
      name: type.name,
      name_ko: type.name_ko || '',
      name_vi: type.name_vi || '',
      color: type.color || '#6B7280',
      priority: type.priority,
      description: type.description || '',
    })
    setShowRepairTypeForm(true)
  }

  const handleSaveRepairType = async () => {
    if (!repairTypeForm.code || !repairTypeForm.name) {
      addToast({ type: 'error', title: t('common.error'), message: t('settings.fillRequired') })
      return
    }

    setIsSaving(true)
    try {
      if (editingRepairType) {
        const { error } = await repairTypesApi.update(editingRepairType.id, {
          ...repairTypeForm,
          is_active: true,
        })
        if (error) throw new Error(error)
        addToast({ type: 'success', title: t('common.success'), message: t('settings.repairTypeUpdated') })
      } else {
        const { error } = await repairTypesApi.create({
          ...repairTypeForm,
          is_active: true,
        })
        if (error) throw new Error(error)
        addToast({ type: 'success', title: t('common.success'), message: t('settings.repairTypeCreated') })
      }
      await fetchData()
      setShowRepairTypeForm(false)
      setEditingRepairType(null)
      setRepairTypeForm(defaultRepairTypeForm)
    } catch (error) {
      addToast({ type: 'error', title: t('common.error'), message: String(error) })
    }
    setIsSaving(false)
  }

  const handleDeleteRepairType = (type: RepairType) => {
    setDeleteTarget({ type: 'repair', id: type.id, name: type.name_ko || type.name })
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)
    try {
      if (deleteTarget.type === 'equipment') {
        const { error } = await equipmentApi.deleteEquipmentType(deleteTarget.id)
        if (error) throw new Error(error)
        addToast({ type: 'success', title: t('common.success'), message: t('settings.equipmentTypeDeleted') })
      } else {
        const { error } = await repairTypesApi.delete(deleteTarget.id)
        if (error) throw new Error(error)
        addToast({ type: 'success', title: t('common.success'), message: t('settings.repairTypeDeleted') })
      }
      await fetchData()
      setShowDeleteDialog(false)
      setDeleteTarget(null)
    } catch (error) {
      addToast({ type: 'error', title: t('common.error'), message: String(error) })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBackupNow = async () => {
    addToast({ type: 'info', title: t('settings.backup'), message: t('settings.backupStarted') })
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">{t('admin.settings')}</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="general" className="text-xs sm:text-sm">
            <Settings className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('settings.general')}</span>
            <span className="sm:hidden">{t('settings.general').substring(0, 4)}</span>
          </TabsTrigger>
          <TabsTrigger value="equipmentTypes" className="text-xs sm:text-sm">
            <Cog className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('settings.equipmentTypes')}</span>
            <span className="sm:hidden">{t('equipment.equipment')}</span>
          </TabsTrigger>
          <TabsTrigger value="repairTypes" className="text-xs sm:text-sm">
            <Palette className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('settings.repairTypes')}</span>
            <span className="sm:hidden">{t('maintenance.repairType')}</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-4 sm:space-y-6">
          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={isSaving} size="sm" className="h-9 text-sm">
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : saveSuccess ? (
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saveSuccess ? t('common.success') : t('common.save')}
            </Button>
          </div>

          {/* General Settings */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                {t('settings.general')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-sm">{t('settings.systemName')}</Label>
                  <Input
                    value={settings.system_name}
                    onChange={(e) => setSettings({ ...settings, system_name: e.target.value })}
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {t('settings.defaultLanguage')}
                  </Label>
                  <Select
                    value={settings.default_language}
                    onChange={(e) => setSettings({ ...settings, default_language: e.target.value })}
                    className="h-9 sm:h-10 text-sm"
                  >
                    <option value="ko">한국어</option>
                    <option value="vi">Tiếng Việt</option>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {t('settings.timezone')}
                  </Label>
                  <Select
                    value={settings.timezone}
                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                    className="h-9 sm:h-10 text-sm"
                  >
                    <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
                    <option value="Asia/Seoul">Asia/Seoul (GMT+9)</option>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                {t('settings.notifications')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
              <div className="flex items-start sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm sm:text-base">{t('settings.emergencyAlert')}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('settings.emergencyAlertDesc')}</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emergency_alert}
                  onChange={(e) => setSettings({ ...settings, emergency_alert: e.target.checked })}
                  className="h-4 w-4 shrink-0"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm sm:text-base">{t('settings.longRepairWarning')}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('settings.longRepairWarningDesc')}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    type="number"
                    value={settings.long_repair_threshold_hours}
                    onChange={(e) => setSettings({ ...settings, long_repair_threshold_hours: parseInt(e.target.value) || 0 })}
                    className="w-16 sm:w-20 h-9 text-sm"
                    min={1}
                  />
                  <span className="text-xs sm:text-sm text-muted-foreground">{t('settings.hours')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Settings */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
                {t('settings.aiSettings')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
              <div className="flex items-start sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm sm:text-base">{t('settings.enableAI')}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('settings.enableAIDesc')}</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.ai_enabled}
                  onChange={(e) => setSettings({ ...settings, ai_enabled: e.target.checked })}
                  className="h-4 w-4 shrink-0"
                />
              </div>

              {settings.ai_enabled && (
                <>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-sm">{t('settings.geminiApiKey')}</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        type="password"
                        placeholder={t('settings.enterApiKey')}
                        value={settings.ai_api_key}
                        onChange={(e) => setSettings({ ...settings, ai_api_key: e.target.value })}
                        className="h-9 sm:h-10 text-sm flex-1"
                      />
                      {!settings.ai_api_key && (
                        <Badge variant="warning" className="flex items-center gap-1 whitespace-nowrap text-xs w-fit">
                          <AlertTriangle className="h-3 w-3" />
                          {t('settings.notConfigured')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-sm">{t('settings.refreshInterval')}</Label>
                    <Select
                      value={settings.ai_refresh_interval.toString()}
                      onChange={(e) => setSettings({ ...settings, ai_refresh_interval: parseInt(e.target.value) })}
                      className="h-9 sm:h-10 text-sm w-full sm:w-auto"
                    >
                      <option value="1">1 {t('settings.hours')}</option>
                      <option value="2">2 {t('settings.hours')}</option>
                      <option value="4">4 {t('settings.hours')}</option>
                      <option value="6">6 {t('settings.hours')}</option>
                      <option value="12">12 {t('settings.hours')}</option>
                      <option value="24">24 {t('settings.hours')}</option>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Backup Settings */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Database className="h-4 w-4 sm:h-5 sm:w-5" />
                {t('settings.backup')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
              <div className="flex items-start sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm sm:text-base">{t('settings.autoBackup')}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('settings.autoBackupDesc')}</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.backup_enabled}
                  onChange={(e) => setSettings({ ...settings, backup_enabled: e.target.checked })}
                  className="h-4 w-4 shrink-0"
                />
              </div>

              {settings.backup_enabled && (
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-sm">{t('settings.backupSchedule')}</Label>
                    <Select
                      value={settings.backup_schedule}
                      onChange={(e) => setSettings({ ...settings, backup_schedule: e.target.value })}
                      className="h-9 sm:h-10 text-sm"
                    >
                      <option value="daily">{t('settings.daily')}</option>
                      <option value="weekly">{t('settings.weekly')}</option>
                      <option value="monthly">{t('settings.monthly')}</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-sm">{t('settings.retentionDays')}</Label>
                    <Select
                      value={settings.backup_retention_days.toString()}
                      onChange={(e) => setSettings({ ...settings, backup_retention_days: parseInt(e.target.value) })}
                      className="h-9 sm:h-10 text-sm"
                    >
                      <option value="7">7 {t('settings.days')}</option>
                      <option value="14">14 {t('settings.days')}</option>
                      <option value="30">30 {t('settings.days')}</option>
                      <option value="60">60 {t('settings.days')}</option>
                      <option value="90">90 {t('settings.days')}</option>
                    </Select>
                  </div>
                </div>
              )}

              <Button variant="outline" onClick={handleBackupNow} size="sm" className="h-9 text-sm">
                <Database className="mr-2 h-4 w-4" />
                {t('settings.backupNow')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Equipment Types Tab */}
        <TabsContent value="equipmentTypes" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Cog className="h-4 w-4 sm:h-5 sm:w-5" />
                {t('settings.equipmentTypes')}
              </CardTitle>
              <Button
                onClick={() => {
                  setEditingEquipmentType(null)
                  setEquipmentTypeForm(defaultEquipmentTypeForm)
                  setShowEquipmentTypeForm(true)
                }}
                size="sm"
                className="h-9 text-sm w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('settings.addEquipmentType')}
              </Button>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {/* Equipment Type Form */}
              {showEquipmentTypeForm && (
                <Card className="mb-4 sm:mb-6 border-primary">
                  <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-4 pb-2">
                    <CardTitle className="text-sm sm:text-lg">
                      {editingEquipmentType ? t('settings.editEquipmentType') : t('settings.addEquipmentType')}
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowEquipmentTypeForm(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 pt-0">
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-sm">{t('settings.code')} *</Label>
                        <Input
                          value={equipmentTypeForm.code}
                          onChange={(e) => setEquipmentTypeForm({ ...equipmentTypeForm, code: e.target.value.toUpperCase() })}
                          placeholder="CNC"
                          className="h-9 sm:h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-sm">{t('settings.category')} *</Label>
                        <Select
                          value={equipmentTypeForm.category}
                          onChange={(e) => setEquipmentTypeForm({ ...equipmentTypeForm, category: e.target.value as 'MAIN' | 'SUB' })}
                          className="h-9 sm:h-10 text-sm"
                        >
                          <option value="MAIN">{t('settings.categoryMain')}</option>
                          <option value="SUB">{t('settings.categorySub')}</option>
                        </Select>
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-sm">{t('settings.name')} *</Label>
                        <Input
                          value={equipmentTypeForm.name}
                          onChange={(e) => setEquipmentTypeForm({ ...equipmentTypeForm, name: e.target.value })}
                          placeholder="CNC Milling Machine"
                          className="h-9 sm:h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-sm">{t('settings.nameKo')}</Label>
                        <Input
                          value={equipmentTypeForm.name_ko}
                          onChange={(e) => setEquipmentTypeForm({ ...equipmentTypeForm, name_ko: e.target.value })}
                          placeholder="CNC 밀링 머신"
                          className="h-9 sm:h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-sm">{t('settings.nameVi')}</Label>
                        <Input
                          value={equipmentTypeForm.name_vi}
                          onChange={(e) => setEquipmentTypeForm({ ...equipmentTypeForm, name_vi: e.target.value })}
                          placeholder="Máy phay CNC"
                          className="h-9 sm:h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-sm">{t('settings.description')}</Label>
                        <Input
                          value={equipmentTypeForm.description}
                          onChange={(e) => setEquipmentTypeForm({ ...equipmentTypeForm, description: e.target.value })}
                          className="h-9 sm:h-10 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" size="sm" className="h-9 text-sm" onClick={() => setShowEquipmentTypeForm(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button size="sm" className="h-9 text-sm" onClick={handleSaveEquipmentType} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('common.save')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Equipment Types Table - Desktop */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('settings.code')}</TableHead>
                      <TableHead>{t('settings.name')}</TableHead>
                      <TableHead>{t('settings.nameKo')}</TableHead>
                      <TableHead>{t('settings.nameVi')}</TableHead>
                      <TableHead>{t('settings.category')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipmentTypes.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell className="font-medium">{type.code}</TableCell>
                        <TableCell>{type.name}</TableCell>
                        <TableCell>{type.name_ko || '-'}</TableCell>
                        <TableCell>{type.name_vi || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={type.category === 'MAIN' ? 'default' : 'secondary'}>
                            {type.category === 'MAIN' ? t('settings.categoryMain') : t('settings.categorySub')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={type.is_active ? 'success' : 'secondary'}>
                            {type.is_active ? t('admin.active') : t('admin.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEditEquipmentType(type)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteEquipmentType(type)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {equipmentTypes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          {t('common.noData')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Equipment Types - Mobile Card View */}
              <div className="md:hidden space-y-3">
                {equipmentTypes.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground text-sm">
                    {t('common.noData')}
                  </div>
                ) : (
                  equipmentTypes.map((type) => (
                    <Card key={type.id} className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">{type.code}</p>
                            <p className="text-xs text-muted-foreground truncate">{type.name}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditEquipmentType(type)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDeleteEquipmentType(type)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                          <div>
                            <span className="text-muted-foreground">{t('settings.nameKo')}: </span>
                            <span>{type.name_ko || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('settings.nameVi')}: </span>
                            <span>{type.name_vi || '-'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={type.category === 'MAIN' ? 'default' : 'secondary'} className="text-xs">
                            {type.category === 'MAIN' ? t('settings.categoryMain') : t('settings.categorySub')}
                          </Badge>
                          <Badge variant={type.is_active ? 'success' : 'secondary'} className="text-xs">
                            {type.is_active ? t('admin.active') : t('admin.inactive')}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Repair Types Tab */}
        <TabsContent value="repairTypes" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Palette className="h-4 w-4 sm:h-5 sm:w-5" />
                {t('settings.repairTypes')}
              </CardTitle>
              <Button
                onClick={() => {
                  setEditingRepairType(null)
                  setRepairTypeForm(defaultRepairTypeForm)
                  setShowRepairTypeForm(true)
                }}
                size="sm"
                className="h-9 text-sm w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('settings.addRepairType')}
              </Button>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {/* Repair Type Form */}
              {showRepairTypeForm && (
                <Card className="mb-4 sm:mb-6 border-primary">
                  <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-4 pb-2">
                    <CardTitle className="text-sm sm:text-lg">
                      {editingRepairType ? t('settings.editRepairType') : t('settings.addRepairType')}
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowRepairTypeForm(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 pt-0">
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-sm">{t('settings.code')} *</Label>
                        <Input
                          value={repairTypeForm.code}
                          onChange={(e) => setRepairTypeForm({ ...repairTypeForm, code: e.target.value.toUpperCase() })}
                          placeholder="PM"
                          className="h-9 sm:h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-sm">{t('settings.color')}</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={repairTypeForm.color}
                            onChange={(e) => setRepairTypeForm({ ...repairTypeForm, color: e.target.value })}
                            className="h-9 w-12 sm:w-14 p-1"
                          />
                          <Input
                            value={repairTypeForm.color}
                            onChange={(e) => setRepairTypeForm({ ...repairTypeForm, color: e.target.value })}
                            placeholder="#3B82F6"
                            className="h-9 sm:h-10 text-sm flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-sm">{t('settings.name')} *</Label>
                        <Input
                          value={repairTypeForm.name}
                          onChange={(e) => setRepairTypeForm({ ...repairTypeForm, name: e.target.value })}
                          placeholder="Preventive Maintenance"
                          className="h-9 sm:h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-sm">{t('settings.priority')}</Label>
                        <Select
                          value={repairTypeForm.priority.toString()}
                          onChange={(e) => setRepairTypeForm({ ...repairTypeForm, priority: parseInt(e.target.value) })}
                          className="h-9 sm:h-10 text-sm"
                        >
                          <option value="1">1 - {t('settings.priorityHighest')}</option>
                          <option value="2">2 - {t('settings.priorityHigh')}</option>
                          <option value="3">3 - {t('settings.priorityMedium')}</option>
                          <option value="4">4 - {t('settings.priorityLow')}</option>
                          <option value="5">5 - {t('settings.priorityLowest')}</option>
                        </Select>
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-sm">{t('settings.nameKo')}</Label>
                        <Input
                          value={repairTypeForm.name_ko}
                          onChange={(e) => setRepairTypeForm({ ...repairTypeForm, name_ko: e.target.value })}
                          placeholder="정기 유지보수"
                          className="h-9 sm:h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-sm">{t('settings.nameVi')}</Label>
                        <Input
                          value={repairTypeForm.name_vi}
                          onChange={(e) => setRepairTypeForm({ ...repairTypeForm, name_vi: e.target.value })}
                          placeholder="Bảo trì định kỳ"
                          className="h-9 sm:h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2 col-span-1 sm:col-span-2">
                        <Label className="text-sm">{t('settings.description')}</Label>
                        <Input
                          value={repairTypeForm.description}
                          onChange={(e) => setRepairTypeForm({ ...repairTypeForm, description: e.target.value })}
                          className="h-9 sm:h-10 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" size="sm" className="h-9 text-sm" onClick={() => setShowRepairTypeForm(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button size="sm" className="h-9 text-sm" onClick={handleSaveRepairType} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('common.save')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Repair Types Table - Desktop */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('settings.color')}</TableHead>
                      <TableHead>{t('settings.code')}</TableHead>
                      <TableHead>{t('settings.name')}</TableHead>
                      <TableHead>{t('settings.nameKo')}</TableHead>
                      <TableHead>{t('settings.nameVi')}</TableHead>
                      <TableHead>{t('settings.priority')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repairTypes.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell>
                          <div
                            className="h-6 w-6 rounded"
                            style={{ backgroundColor: type.color || '#6B7280' }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{type.code}</TableCell>
                        <TableCell>{type.name}</TableCell>
                        <TableCell>{type.name_ko || '-'}</TableCell>
                        <TableCell>{type.name_vi || '-'}</TableCell>
                        <TableCell>{type.priority}</TableCell>
                        <TableCell>
                          <Badge variant={type.is_active ? 'success' : 'secondary'}>
                            {type.is_active ? t('admin.active') : t('admin.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEditRepairType(type)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteRepairType(type)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {repairTypes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          {t('common.noData')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Repair Types - Mobile Card View */}
              <div className="md:hidden space-y-3">
                {repairTypes.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground text-sm">
                    {t('common.noData')}
                  </div>
                ) : (
                  repairTypes.map((type) => (
                    <Card key={type.id} className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div
                              className="h-5 w-5 rounded shrink-0"
                              style={{ backgroundColor: type.color || '#6B7280' }}
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-sm">{type.code}</p>
                              <p className="text-xs text-muted-foreground truncate">{type.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditRepairType(type)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDeleteRepairType(type)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                          <div>
                            <span className="text-muted-foreground">{t('settings.nameKo')}: </span>
                            <span>{type.name_ko || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('settings.nameVi')}: </span>
                            <span>{type.name_vi || '-'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {t('settings.priority')} {type.priority}
                          </Badge>
                          <Badge variant={type.is_active ? 'success' : 'secondary'} className="text-xs">
                            {type.is_active ? t('admin.active') : t('admin.inactive')}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">{t('settings.confirmDeleteTitle')}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {deleteTarget && (
                <>
                  <span className="font-semibold text-foreground">{deleteTarget.name}</span>
                  {' '}{t('settings.confirmDeleteMessage')}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-col-reverse sm:flex-row">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-sm w-full sm:w-auto"
              onClick={() => {
                setShowDeleteDialog(false)
                setDeleteTarget(null)
              }}
              disabled={isDeleting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-9 text-sm w-full sm:w-auto"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
