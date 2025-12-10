import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { settingsApi } from '@/lib/api'

export interface AppSettings {
  // 시스템 설정
  timezone: string
  language: string
  dateFormat: string
  timeFormat: string

  // 정비 설정
  longRepairThreshold: number
  pmReminderDays: number
  autoCloseCompletedPM: boolean

  // 알림 설정
  enableEmailNotifications: boolean
  enablePushNotifications: boolean
  notifyOnEmergency: boolean
  notifyOnLongRepair: boolean
  notifyOnPMDue: boolean

  // 기타
  itemsPerPage: number
  dashboardRefreshInterval: number
}

const defaultSettings: AppSettings = {
  timezone: 'Asia/Seoul',
  language: 'ko',
  dateFormat: 'yyyy-MM-dd',
  timeFormat: 'HH:mm',
  longRepairThreshold: 120,
  pmReminderDays: 3,
  autoCloseCompletedPM: false,
  enableEmailNotifications: true,
  enablePushNotifications: true,
  notifyOnEmergency: true,
  notifyOnLongRepair: true,
  notifyOnPMDue: true,
  itemsPerPage: 20,
  dashboardRefreshInterval: 30,
}

interface SettingsState {
  settings: AppSettings
  loading: boolean
  lastFetched: number | null

  // Actions
  fetchSettings: () => Promise<void>
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  getTimezone: () => string
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      loading: false,
      lastFetched: null,

      fetchSettings: async () => {
        set({ loading: true })
        try {
          const { data, error } = await settingsApi.getAll()
          if (!error && data) {
            const newSettings = { ...defaultSettings }

            // DB에서 가져온 설정값을 매핑 (실제 DB 키 사용)
            if (data.timezone) newSettings.timezone = String(data.timezone)
            if (data.default_language) newSettings.language = String(data.default_language)
            if (data.date_format) newSettings.dateFormat = String(data.date_format)
            if (data.time_format) newSettings.timeFormat = String(data.time_format)
            // long_repair_threshold_hours는 시간 단위, longRepairThreshold는 분 단위
            if (data.long_repair_threshold_hours) newSettings.longRepairThreshold = Number(data.long_repair_threshold_hours) * 60
            if (data.pm_reminder_days) newSettings.pmReminderDays = Number(data.pm_reminder_days)
            if (data.auto_close_completed_pm !== undefined) newSettings.autoCloseCompletedPM = Boolean(data.auto_close_completed_pm)
            if (data.enable_email_notifications !== undefined) newSettings.enableEmailNotifications = Boolean(data.enable_email_notifications)
            if (data.enable_push_notifications !== undefined) newSettings.enablePushNotifications = Boolean(data.enable_push_notifications)
            if (data.emergency_alert !== undefined) newSettings.notifyOnEmergency = Boolean(data.emergency_alert)
            if (data.long_repair_warning !== undefined) newSettings.notifyOnLongRepair = Boolean(data.long_repair_warning)
            if (data.notify_on_pm_due !== undefined) newSettings.notifyOnPMDue = Boolean(data.notify_on_pm_due)
            if (data.items_per_page) newSettings.itemsPerPage = Number(data.items_per_page)
            if (data.ai_refresh_interval) newSettings.dashboardRefreshInterval = Number(data.ai_refresh_interval) * 60

            set({
              settings: newSettings,
              lastFetched: Date.now()
            })

            console.log('[Settings] Loaded from DB:', newSettings)
          }
        } catch (error) {
          console.error('Failed to fetch settings:', error)
        } finally {
          set({ loading: false })
        }
      },

      updateSetting: (key, value) => {
        set((state) => ({
          settings: { ...state.settings, [key]: value }
        }))
      },

      getTimezone: () => {
        return get().settings.timezone
      },
    }),
    {
      name: 'amms-settings',
      partialize: (state) => ({
        settings: state.settings,
        lastFetched: state.lastFetched,
      }),
    }
  )
)

export default useSettingsStore
