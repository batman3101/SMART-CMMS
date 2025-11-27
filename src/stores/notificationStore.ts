import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type NotificationType = 'emergency' | 'long_repair' | 'completed' | 'info' | 'pm_schedule'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  equipment_code?: string
  time: string
  date: string
  read: boolean
  created_at: string
}

export interface PushSettings {
  enabled: boolean
  emergency: boolean
  long_repair: boolean
  completed: boolean
  pm_schedule: boolean
}

interface NotificationState {
  notifications: Notification[]
  pushSettings: PushSettings
  fcmToken: string | null
  isSubscribed: boolean

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'created_at'>) => void
  removeNotification: (id: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearReadNotifications: () => void
  clearAllNotifications: () => void

  // Push settings
  setPushSettings: (settings: Partial<PushSettings>) => void
  setFcmToken: (token: string | null) => void
  setIsSubscribed: (subscribed: boolean) => void

  // For Supabase Realtime integration
  setNotifications: (notifications: Notification[]) => void

  // Computed
  getUnreadCount: () => number
}

// 샘플 알림 데이터 (개발용)
const sampleNotifications: Notification[] = [
  {
    id: '1',
    type: 'emergency',
    title: '긴급수리 발생',
    message: 'CNC-045 설비에서 긴급수리가 요청되었습니다. 즉시 확인이 필요합니다.',
    equipment_code: 'CNC-045',
    time: '14:35',
    date: new Date().toISOString().split('T')[0],
    read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    type: 'long_repair',
    title: '장시간 수리 경고',
    message: 'CNC-032 수리가 2시간을 초과했습니다. 진행 상황을 확인해주세요.',
    equipment_code: 'CNC-032',
    time: '14:20',
    date: new Date().toISOString().split('T')[0],
    read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    type: 'completed',
    title: '수리 완료',
    message: 'CNC-061 설비 수리가 완료되었습니다. 평점: 9/10',
    equipment_code: 'CNC-061',
    time: '14:05',
    date: new Date().toISOString().split('T')[0],
    read: false,
    created_at: new Date().toISOString(),
  },
]

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: sampleNotifications,
      pushSettings: {
        enabled: false,
        emergency: true,
        long_repair: true,
        completed: true,
        pm_schedule: true,
      },
      fcmToken: null,
      isSubscribed: false,

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
        }
        set((state) => ({
          notifications: [newNotification, ...state.notifications],
        }))
      },

      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }))
      },

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }))
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }))
      },

      clearReadNotifications: () => {
        set((state) => ({
          notifications: state.notifications.filter((n) => !n.read),
        }))
      },

      clearAllNotifications: () => {
        set({ notifications: [] })
      },

      setPushSettings: (settings) => {
        set((state) => ({
          pushSettings: { ...state.pushSettings, ...settings },
        }))
      },

      setFcmToken: (token) => {
        set({ fcmToken: token })
      },

      setIsSubscribed: (subscribed) => {
        set({ isSubscribed: subscribed })
      },

      setNotifications: (notifications) => {
        set({ notifications })
      },

      getUnreadCount: () => {
        return get().notifications.filter((n) => !n.read).length
      },
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({
        pushSettings: state.pushSettings,
        fcmToken: state.fcmToken,
        isSubscribed: state.isSubscribed,
      }),
    }
  )
)
