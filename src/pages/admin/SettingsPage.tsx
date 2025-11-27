import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'
import type { RepairType } from '@/types'

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

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { addToast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [repairTypes, setRepairTypes] = useState<RepairType[]>([])

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

  const repairTypeColors: Record<string, string> = {
    PM: '#3B82F6',
    BR: '#F59E0B',
    PD: '#10B981',
    QA: '#8B5CF6',
    EM: '#EF4444',
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      // In real app, would fetch settings from API
      // For now, just simulate loading
      await new Promise((resolve) => setTimeout(resolve, 300))

      // We'll mock repair types here since we need them
      setRepairTypes([
        { id: '1', code: 'PM', name: t('maintenance.typePM'), name_ko: '정기 유지보수', name_vi: 'Bao tri dinh ky', color: '#3B82F6', priority: 1, is_active: true },
        { id: '2', code: 'BR', name: t('maintenance.typeBR'), name_ko: '고장수리', name_vi: 'Sua chua hong', color: '#F59E0B', priority: 2, is_active: true },
        { id: '3', code: 'PD', name: t('maintenance.typePD'), name_ko: '예지보전', name_vi: 'Bao tri du doan', color: '#10B981', priority: 3, is_active: true },
        { id: '4', code: 'QA', name: t('maintenance.typeQA'), name_ko: '제품불량', name_vi: 'Loi san pham', color: '#8B5CF6', priority: 4, is_active: true },
        { id: '5', code: 'EM', name: t('maintenance.typeEM'), name_ko: '긴급수리', name_vi: 'Sua chua khan cap', color: '#EF4444', priority: 5, is_active: true },
      ])

      setIsLoading(false)
    }

    fetchData()
  }, [t])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)

    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Change language if it was updated
    if (settings.default_language !== i18n.language) {
      i18n.changeLanguage(settings.default_language)
    }

    setIsSaving(false)
    setSaveSuccess(true)

    setTimeout(() => setSaveSuccess(false), 3000)
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
        <Button onClick={handleSave} disabled={isSaving}>
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

      <div className="grid gap-6">
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
                  onChange={(e) =>
                    setSettings({ ...settings, system_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  {t('settings.defaultLanguage')}
                </Label>
                <Select
                  value={settings.default_language}
                  onChange={(e) =>
                    setSettings({ ...settings, default_language: e.target.value })
                  }
                >
                  <option value="ko">한국어</option>
                  <option value="vi">Tieng Viet</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t('settings.timezone')}
                </Label>
                <Select
                  value={settings.timezone}
                  onChange={(e) =>
                    setSettings({ ...settings, timezone: e.target.value })
                  }
                >
                  <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
                  <option value="Asia/Seoul">Asia/Seoul (GMT+9)</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Repair Type Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              {t('settings.repairTypes')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {repairTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded"
                      style={{ backgroundColor: repairTypeColors[type.code] || '#6B7280' }}
                    />
                    <span className="font-medium">{type.code}</span>
                    <span className="text-muted-foreground">{type.name_ko}</span>
                  </div>
                  <Badge variant={type.is_active ? 'success' : 'secondary'}>
                    {type.is_active ? t('admin.active') : t('admin.inactive')}
                  </Badge>
                </div>
              ))}
            </div>
            <Button variant="outline" className="mt-4">
              {t('settings.addRepairType')}
            </Button>
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
                <p className="text-sm text-muted-foreground">
                  {t('settings.emergencyAlertDesc')}
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.emergency_alert}
                onChange={(e) =>
                  setSettings({ ...settings, emergency_alert: e.target.checked })
                }
                className="h-4 w-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('settings.longRepairWarning')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('settings.longRepairWarningDesc')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={settings.long_repair_threshold_hours}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      long_repair_threshold_hours: parseInt(e.target.value) || 0,
                    })
                  }
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
                <p className="text-sm text-muted-foreground">
                  {t('settings.enableAIDesc')}
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.ai_enabled}
                onChange={(e) =>
                  setSettings({ ...settings, ai_enabled: e.target.checked })
                }
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
                      onChange={(e) =>
                        setSettings({ ...settings, ai_api_key: e.target.value })
                      }
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
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        ai_refresh_interval: parseInt(e.target.value),
                      })
                    }
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
                <p className="text-sm text-muted-foreground">
                  {t('settings.autoBackupDesc')}
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.backup_enabled}
                onChange={(e) =>
                  setSettings({ ...settings, backup_enabled: e.target.checked })
                }
                className="h-4 w-4"
              />
            </div>

            {settings.backup_enabled && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('settings.backupSchedule')}</Label>
                  <Select
                    value={settings.backup_schedule}
                    onChange={(e) =>
                      setSettings({ ...settings, backup_schedule: e.target.value })
                    }
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
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        backup_retention_days: parseInt(e.target.value),
                      })
                    }
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
      </div>
    </div>
  )
}
