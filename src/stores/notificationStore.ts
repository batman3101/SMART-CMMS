import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { notificationsApi } from '@/lib/api'
import { isMainSupabaseConnected } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

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
  data?: Record<string, unknown>  // 번역 파라미터용 추가 데이터
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
  removeNotification: (id: string) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  clearReadNotifications: () => Promise<void>
  clearAllNotifications: () => void

  // Push settings
  setPushSettings: (settings: Partial<PushSettings>) => void
  setFcmToken: (token: string | null) => void
  setIsSubscribed: (subscribed: boolean) => void

  // For Supabase Realtime integration
  setNotifications: (notifications: Notification[]) => void
  fetchNotifications: () => Promise<void>

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
      notifications: isMainSupabaseConnected() ? [] : sampleNotifications,
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

      removeNotification: async (id) => {
        // DB에서 삭제
        if (isMainSupabaseConnected()) {
          await notificationsApi.deleteNotification(id)
        }
        // 로컬 상태 업데이트
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }))
      },

      markAsRead: async (id) => {
        // DB에서 읽음 처리
        if (isMainSupabaseConnected()) {
          await notificationsApi.markAsRead(id)
        }
        // 로컬 상태 업데이트
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }))
      },

      markAllAsRead: async () => {
        // DB에서 전체 읽음 처리
        if (isMainSupabaseConnected() && supabase) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            // 현재 사용자의 모든 알림을 읽음 처리
            const { data: userData } = await supabase
              .from('users')
              .select('id')
              .eq('auth_user_id', user.id)
              .single()
            if (userData) {
              await notificationsApi.markAllAsRead(userData.id)
            }
          }
        }
        // 로컬 상태 업데이트
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }))
      },

      clearReadNotifications: async () => {
        // DB에서 읽은 알림 삭제
        if (isMainSupabaseConnected() && supabase) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: userData } = await supabase
              .from('users')
              .select('id')
              .eq('auth_user_id', user.id)
              .single()
            if (userData) {
              await notificationsApi.clearRead(userData.id)
            }
          }
        }
        // 로컬 상태 업데이트
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

      fetchNotifications: async () => {
        if (!isMainSupabaseConnected()) return

        const { data } = await notificationsApi.getNotifications()
        if (data && data.length > 0) {
          const notifications: Notification[] = (data as Record<string, unknown>[]).map((n) => {
            const notificationData = n.data as Record<string, unknown> || {}
            return {
              id: n.id as string,
              type: (n.type as NotificationType) || 'info',
              title: n.title as string,
              message: n.message as string,
              equipment_code: notificationData.equipment_code as string || undefined,
              time: new Date(n.created_at as string).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
              date: (n.created_at as string).split('T')[0],
              read: n.is_read as boolean,
              created_at: n.created_at as string,
              data: notificationData,
            }
          })
          set({ notifications })
        }
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
