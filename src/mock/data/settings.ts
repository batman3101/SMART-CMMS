import type { Setting } from '@/types'

export const mockSettings: Setting[] = [
  {
    id: '1',
    key: 'system_name',
    value: { name: 'AMMS', full_name: 'ALMUS Maintenance Management System' },
    description: '시스템 이름',
    updated_at: '2024-01-01T00:00:00Z',
    updated_by: '1',
  },
  {
    id: '2',
    key: 'default_language',
    value: { language: 'ko' },
    description: '기본 언어 설정',
    updated_at: '2024-01-01T00:00:00Z',
    updated_by: '1',
  },
  {
    id: '3',
    key: 'timezone',
    value: { timezone: 'Asia/Ho_Chi_Minh', offset: '+07:00' },
    description: '타임존 설정',
    updated_at: '2024-01-01T00:00:00Z',
    updated_by: '1',
  },
  {
    id: '4',
    key: 'notification',
    value: {
      emergency_alert: true,
      long_repair_warning: true,
      long_repair_threshold_hours: 2,
      pm_reminder_days: [7, 3, 1],
    },
    description: '알림 설정',
    updated_at: '2024-01-01T00:00:00Z',
    updated_by: '1',
  },
  {
    id: '5',
    key: 'ai_config',
    value: {
      enabled: true,
      refresh_interval_hours: 2,
      api_key_configured: false,
    },
    description: 'AI 설정',
    updated_at: '2024-01-01T00:00:00Z',
    updated_by: '1',
  },
  {
    id: '6',
    key: 'backup',
    value: {
      auto_backup: true,
      backup_schedule: 'daily',
      retention_days: 30,
    },
    description: '백업 설정',
    updated_at: '2024-01-01T00:00:00Z',
    updated_by: '1',
  },
]

export const getSettingByKey = (key: string) =>
  mockSettings.find((s) => s.key === key)

export const getSettingValue = <T>(key: string, defaultValue: T): T => {
  const setting = mockSettings.find((s) => s.key === key)
  return setting ? (setting.value as T) : defaultValue
}
