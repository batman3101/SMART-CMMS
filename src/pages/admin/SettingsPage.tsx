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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('admin.settings')}</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general">
            <Settings className="mr-2 h-4 w-4" />
            {t('settings.general')}
          </TabsTrigger>
          <TabsTrigger value="equipmentTypes">
            <Cog className="mr-2 h-4 w-4" />
            {t('settings.equipmentTypes')}
          </TabsTrigger>
          <TabsTrigger value="repairTypes">
            <Palette className="mr-2 h-4 w-4" />
            {t('settings.repairTypes')}
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={isSaving}>
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {t('settings.general')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('settings.systemName')}</Label>
                  <Input
                    value={settings.system_name}
                    onChange={(e) => setSettings({ ...settings, system_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {t('settings.defaultLanguage')}
                  </Label>
                  <Select
                    value={settings.default_language}
                    onChange={(e) => setSettings({ ...settings, default_language: e.target.value })}
                  >
                    <option value="ko">한국어</option>
                    <option value="vi">Tiếng Việt</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('settings.timezone')}
                  </Label>
                  <Select
                    value={settings.timezone}
                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t('settings.notifications')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('settings.emergencyAlert')}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.emergencyAlertDesc')}</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emergency_alert}
                  onChange={(e) => setSettings({ ...settings, emergency_alert: e.target.checked })}
                  className="h-4 w-4"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('settings.longRepairWarning')}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.longRepairWarningDesc')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={settings.long_repair_threshold_hours}
                    onChange={(e) => setSettings({ ...settings, long_repair_threshold_hours: parseInt(e.target.value) || 0 })}
                    className="w-20"
                    min={1}
                  />
                  <span className="text-sm text-muted-foreground">{t('settings.hours')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                {t('settings.aiSettings')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('settings.enableAI')}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.enableAIDesc')}</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.ai_enabled}
                  onChange={(e) => setSettings({ ...settings, ai_enabled: e.target.checked })}
                  className="h-4 w-4"
                />
              </div>

              {settings.ai_enabled && (
                <>
                  <div className="space-y-2">
                    <Label>{t('settings.geminiApiKey')}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder={t('settings.enterApiKey')}
                        value={settings.ai_api_key}
                        onChange={(e) => setSettings({ ...settings, ai_api_key: e.target.value })}
                      />
                      {!settings.ai_api_key && (
                        <Badge variant="warning" className="flex items-center gap-1 whitespace-nowrap">
                          <AlertTriangle className="h-3 w-3" />
                          {t('settings.notConfigured')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.refreshInterval')}</Label>
                    <Select
                      value={settings.ai_refresh_interval.toString()}
                      onChange={(e) => setSettings({ ...settings, ai_refresh_interval: parseInt(e.target.value) })}
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                {t('settings.backup')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('settings.autoBackup')}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.autoBackupDesc')}</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.backup_enabled}
                  onChange={(e) => setSettings({ ...settings, backup_enabled: e.target.checked })}
                  className="h-4 w-4"
                />
              </div>

              {settings.backup_enabled && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('settings.backupSchedule')}</Label>
                    <Select
                      value={settings.backup_schedule}
                      onChange={(e) => setSettings({ ...settings, backup_schedule: e.target.value })}
                    >
                      <option value="daily">{t('settings.daily')}</option>
                      <option value="weekly">{t('settings.weekly')}</option>
                      <option value="monthly">{t('settings.monthly')}</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.retentionDays')}</Label>
                    <Select
                      value={settings.backup_retention_days.toString()}
                      onChange={(e) => setSettings({ ...settings, backup_retention_days: parseInt(e.target.value) })}
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

              <Button variant="outline" onClick={handleBackupNow}>
                <Database className="mr-2 h-4 w-4" />
                {t('settings.backupNow')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Equipment Types Tab */}
        <TabsContent value="equipmentTypes" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Cog className="h-5 w-5" />
                {t('settings.equipmentTypes')}
              </CardTitle>
              <Button
                onClick={() => {
                  setEditingEquipmentType(null)
                  setEquipmentTypeForm(defaultEquipmentTypeForm)
                  setShowEquipmentTypeForm(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('settings.addEquipmentType')}
              </Button>
            </CardHeader>
            <CardContent>
              {/* Equipment Type Form */}
              {showEquipmentTypeForm && (
                <Card className="mb-6 border-primary">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg">
                      {editingEquipmentType ? t('settings.editEquipmentType') : t('settings.addEquipmentType')}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowEquipmentTypeForm(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t('settings.code')} *</Label>
                        <Input
                          value={equipmentTypeForm.code}
                          onChange={(e) => setEquipmentTypeForm({ ...equipmentTypeForm, code: e.target.value.toUpperCase() })}
                          placeholder="CNC"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('settings.category')} *</Label>
                        <Select
                          value={equipmentTypeForm.category}
                          onChange={(e) => setEquipmentTypeForm({ ...equipmentTypeForm, category: e.target.value as 'MAIN' | 'SUB' })}
                        >
                          <option value="MAIN">{t('settings.categoryMain')}</option>
                          <option value="SUB">{t('settings.categorySub')}</option>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('settings.name')} *</Label>
                        <Input
                          value={equipmentTypeForm.name}
                          onChange={(e) => setEquipmentTypeForm({ ...equipmentTypeForm, name: e.target.value })}
                          placeholder="CNC Milling Machine"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('settings.nameKo')}</Label>
                        <Input
                          value={equipmentTypeForm.name_ko}
                          onChange={(e) => setEquipmentTypeForm({ ...equipmentTypeForm, name_ko: e.target.value })}
                          placeholder="CNC 밀링 머신"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('settings.nameVi')}</Label>
                        <Input
                          value={equipmentTypeForm.name_vi}
                          onChange={(e) => setEquipmentTypeForm({ ...equipmentTypeForm, name_vi: e.target.value })}
                          placeholder="Máy phay CNC"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('settings.description')}</Label>
                        <Input
                          value={equipmentTypeForm.description}
                          onChange={(e) => setEquipmentTypeForm({ ...equipmentTypeForm, description: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowEquipmentTypeForm(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button onClick={handleSaveEquipmentType} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('common.save')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Equipment Types Table */}
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
                        <div className="flex justify-end gap-2">
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Repair Types Tab */}
        <TabsContent value="repairTypes" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                {t('settings.repairTypes')}
              </CardTitle>
              <Button
                onClick={() => {
                  setEditingRepairType(null)
                  setRepairTypeForm(defaultRepairTypeForm)
                  setShowRepairTypeForm(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('settings.addRepairType')}
              </Button>
            </CardHeader>
            <CardContent>
              {/* Repair Type Form */}
              {showRepairTypeForm && (
                <Card className="mb-6 border-primary">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg">
                      {editingRepairType ? t('settings.editRepairType') : t('settings.addRepairType')}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowRepairTypeForm(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t('settings.code')} *</Label>
                        <Input
                          value={repairTypeForm.code}
                          onChange={(e) => setRepairTypeForm({ ...repairTypeForm, code: e.target.value.toUpperCase() })}
                          placeholder="PM"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('settings.color')}</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={repairTypeForm.color}
                            onChange={(e) => setRepairTypeForm({ ...repairTypeForm, color: e.target.value })}
                            className="h-9 w-14 p-1"
                          />
                          <Input
                            value={repairTypeForm.color}
                            onChange={(e) => setRepairTypeForm({ ...repairTypeForm, color: e.target.value })}
                            placeholder="#3B82F6"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('settings.name')} *</Label>
                        <Input
                          value={repairTypeForm.name}
                          onChange={(e) => setRepairTypeForm({ ...repairTypeForm, name: e.target.value })}
                          placeholder="Preventive Maintenance"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('settings.priority')}</Label>
                        <Select
                          value={repairTypeForm.priority.toString()}
                          onChange={(e) => setRepairTypeForm({ ...repairTypeForm, priority: parseInt(e.target.value) })}
                        >
                          <option value="1">1 - {t('settings.priorityHighest')}</option>
                          <option value="2">2 - {t('settings.priorityHigh')}</option>
                          <option value="3">3 - {t('settings.priorityMedium')}</option>
                          <option value="4">4 - {t('settings.priorityLow')}</option>
                          <option value="5">5 - {t('settings.priorityLowest')}</option>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('settings.nameKo')}</Label>
                        <Input
                          value={repairTypeForm.name_ko}
                          onChange={(e) => setRepairTypeForm({ ...repairTypeForm, name_ko: e.target.value })}
                          placeholder="정기 유지보수"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('settings.nameVi')}</Label>
                        <Input
                          value={repairTypeForm.name_vi}
                          onChange={(e) => setRepairTypeForm({ ...repairTypeForm, name_vi: e.target.value })}
                          placeholder="Bảo trì định kỳ"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>{t('settings.description')}</Label>
                        <Input
                          value={repairTypeForm.description}
                          onChange={(e) => setRepairTypeForm({ ...repairTypeForm, description: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowRepairTypeForm(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button onClick={handleSaveRepairType} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('common.save')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Repair Types Table */}
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
                        <div className="flex justify-end gap-2">
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settings.confirmDeleteTitle')}</DialogTitle>
            <DialogDescription>
              {deleteTarget && (
                <>
                  <span className="font-semibold text-foreground">{deleteTarget.name}</span>
                  {' '}{t('settings.confirmDeleteMessage')}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
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
