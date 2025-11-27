/**
 * Push Notification Service
 * 웹 푸시 + Firebase FCM 모바일 푸시 통합 서비스
 *
 * 지원 기능:
 * 1. 웹 브라우저 푸시 알림 (Web Push API)
 * 2. 모바일 앱 푸시 알림 (Firebase Cloud Messaging)
 * 3. Supabase Realtime 실시간 알림 수신
 */

import { useNotificationStore, NotificationType } from '@/stores/notificationStore'
import {
  initializeFirebase,
  initializeMessaging,
  getFCMToken,
  onForegroundMessage,
  isFirebaseConfigured,
} from '@/config/firebase'
import type { MessagePayload } from 'firebase/messaging'

class PushNotificationService {
  private isInitialized = false
  private fcmToken: string | null = null
  private unsubscribeForeground: (() => void) | null = null

  /**
   * 서비스 초기화 (웹 푸시 + FCM)
   */
  async initialize(): Promise<boolean> {
    try {
      // Web Push Service Worker 등록
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js')
        console.log('[PushNotificationService] Web Push Service Worker 등록됨:', registration.scope)
      }

      // Firebase FCM 초기화 (설정이 있는 경우에만)
      if (isFirebaseConfigured()) {
        await this.initializeFCM()
      } else {
        console.log('[PushNotificationService] Firebase 미설정 - 웹 푸시만 사용 가능')
      }

      this.isInitialized = true
      return true
    } catch (error) {
      console.error('[PushNotificationService] 초기화 실패:', error)
      return false
    }
  }

  /**
   * Firebase FCM 초기화
   */
  private async initializeFCM(): Promise<void> {
    try {
      initializeFirebase()
      initializeMessaging()

      // 포그라운드 메시지 리스너 설정
      this.unsubscribeForeground = onForegroundMessage(this.handleFCMMessage.bind(this))

      console.log('[PushNotificationService] Firebase FCM 초기화됨')
    } catch (error) {
      console.error('[PushNotificationService] FCM 초기화 실패:', error)
    }
  }

  /**
   * FCM 포그라운드 메시지 처리
   */
  private handleFCMMessage(payload: MessagePayload): void {
    console.log('[PushNotificationService] FCM 메시지 수신:', payload)

    const notification = payload.notification
    const data = payload.data

    if (notification) {
      // 포그라운드에서는 웹 푸시로 알림 표시
      this.showNotification(notification.title || 'AMMS 알림', {
        body: notification.body,
        data: data,
      })
    }

    // 앱 내 알림 스토어에도 추가
    if (data) {
      const store = useNotificationStore.getState()
      store.addNotification({
        type: (data.type as NotificationType) || 'info',
        title: notification?.title || data.title || 'AMMS 알림',
        message: notification?.body || data.body || '',
        equipment_code: data.equipment_code,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toISOString().split('T')[0],
        read: false,
      })
    }
  }

  /**
   * 브라우저 알림 지원 여부 확인
   */
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator
  }

  /**
   * Firebase FCM 지원 여부 확인
   */
  isFCMSupported(): boolean {
    return isFirebaseConfigured()
  }

  /**
   * 현재 알림 권한 상태 확인
   */
  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied'
    }
    return Notification.permission
  }

  /**
   * 푸시 알림 권한 요청 및 FCM 토큰 발급
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('[PushNotificationService] 이 브라우저는 알림을 지원하지 않습니다.')
      return 'denied'
    }

    const permission = await Notification.requestPermission()
    console.log('[PushNotificationService] 알림 권한:', permission)

    if (permission === 'granted') {
      useNotificationStore.getState().setIsSubscribed(true)
      useNotificationStore.getState().setPushSettings({ enabled: true })

      // FCM 토큰 발급 (Firebase 설정이 있는 경우)
      if (isFirebaseConfigured()) {
        await this.registerFCMToken()
      }
    }

    return permission
  }

  /**
   * FCM 토큰 등록
   */
  async registerFCMToken(): Promise<string | null> {
    try {
      const token = await getFCMToken()

      if (token) {
        this.fcmToken = token
        useNotificationStore.getState().setFcmToken(token)

        // TODO: 서버에 FCM 토큰 등록
        // await this.sendTokenToServer(token)

        console.log('[PushNotificationService] FCM 토큰 등록됨')
        return token
      }

      return null
    } catch (error) {
      console.error('[PushNotificationService] FCM 토큰 등록 실패:', error)
      return null
    }
  }

  /**
   * 서버에 FCM 토큰 전송 (Supabase 연동 시 사용)
   */
  async sendTokenToServer(token: string, userId?: string): Promise<void> {
    console.log('[PushNotificationService] 서버에 FCM 토큰 전송 (Supabase 연동 필요)')

    // Supabase 연동 시 아래 코드 활성화
    /*
    await supabase
      .from('push_tokens')
      .upsert({
        user_id: userId,
        token: token,
        platform: 'web',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    */
  }

  /**
   * 푸시 알림 구독 해제
   */
  async unsubscribe(): Promise<void> {
    // 포그라운드 리스너 해제
    if (this.unsubscribeForeground) {
      this.unsubscribeForeground()
      this.unsubscribeForeground = null
    }

    // FCM 토큰 삭제
    this.fcmToken = null
    useNotificationStore.getState().setFcmToken(null)
    useNotificationStore.getState().setIsSubscribed(false)
    useNotificationStore.getState().setPushSettings({ enabled: false })

    // TODO: 서버에서 FCM 토큰 삭제
    // await this.removeTokenFromServer()

    console.log('[PushNotificationService] 알림 구독 해제됨')
  }

  /**
   * 브라우저 알림 표시
   */
  showNotification(
    title: string,
    options?: {
      body?: string
      icon?: string
      badge?: string
      tag?: string
      data?: Record<string, string | undefined>
      requireInteraction?: boolean
      actions?: NotificationAction[]
    }
  ): void {
    const settings = useNotificationStore.getState().pushSettings

    if (!settings.enabled || Notification.permission !== 'granted') {
      console.log('[PushNotificationService] 알림이 비활성화되어 있거나 권한이 없습니다.')
      return
    }

    try {
      const notification = new Notification(title, {
        icon: options?.icon || '/icon-192x192.png',
        badge: options?.badge || '/icon-72x72.png',
        body: options?.body,
        tag: options?.tag,
        data: options?.data,
        requireInteraction: options?.requireInteraction || false,
      })

      // 알림 클릭 시 처리
      notification.onclick = () => {
        window.focus()
        notification.close()

        // 데이터에 따라 페이지 이동
        if (options?.data?.url) {
          window.location.href = options.data.url
        }
      }
    } catch (error) {
      console.error('[PushNotificationService] 알림 표시 실패:', error)
    }
  }

  /**
   * 긴급수리 알림 표시
   */
  showEmergencyNotification(equipmentCode: string, message?: string): void {
    const settings = useNotificationStore.getState().pushSettings
    if (!settings.emergency) return

    this.showNotification('긴급수리 발생', {
      body: message || `${equipmentCode} 설비에서 긴급수리가 요청되었습니다.`,
      tag: `emergency-${equipmentCode}-${Date.now()}`,
      requireInteraction: true,
      data: { url: '/maintenance/monitoring', type: 'emergency' },
    })
  }

  /**
   * 장시간 수리 경고 알림 표시
   */
  showLongRepairNotification(equipmentCode: string, duration: number): void {
    const settings = useNotificationStore.getState().pushSettings
    if (!settings.long_repair) return

    this.showNotification('장시간 수리 경고', {
      body: `${equipmentCode} 수리가 ${Math.floor(duration / 60)}시간을 초과했습니다.`,
      tag: `long-repair-${equipmentCode}`,
      data: { url: '/maintenance/monitoring', type: 'long_repair' },
    })
  }

  /**
   * 수리 완료 알림 표시
   */
  showCompletedNotification(equipmentCode: string, rating?: number): void {
    const settings = useNotificationStore.getState().pushSettings
    if (!settings.completed) return

    this.showNotification('수리 완료', {
      body: `${equipmentCode} 설비 수리가 완료되었습니다.${rating ? ` 평점: ${rating}/10` : ''}`,
      tag: `completed-${equipmentCode}-${Date.now()}`,
      data: { url: '/maintenance/history', type: 'completed' },
    })
  }

  /**
   * PM 일정 알림 표시
   */
  showPMScheduleNotification(equipmentCode: string, scheduledDate: string): void {
    const settings = useNotificationStore.getState().pushSettings
    if (!settings.pm_schedule) return

    this.showNotification('PM 일정 알림', {
      body: `${equipmentCode} 설비의 정기 점검 일정이 ${scheduledDate}입니다.`,
      tag: `pm-${equipmentCode}`,
      data: { url: '/maintenance', type: 'pm_schedule' },
    })
  }

  /**
   * 현재 FCM 토큰 반환
   */
  getFCMToken(): string | null {
    return this.fcmToken
  }

  /**
   * 초기화 상태 확인
   */
  isReady(): boolean {
    return this.isInitialized
  }
}

export const pushNotificationService = new PushNotificationService()

/**
 * Supabase Realtime 연동 핸들러
 * Supabase 연결 후 사용
 */
export const createSupabaseNotificationHandler = (/* supabase: SupabaseClient */) => {
  const store = useNotificationStore.getState()

  return {
    /**
     * Supabase Realtime 채널 구독
     */
    subscribe: () => {
      console.log('[SupabaseNotification] Realtime 구독 준비됨 (Supabase 연동 필요)')

      // Supabase 연동 시 아래 코드 활성화
      /*
      const channel = supabase
        .channel('maintenance-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'maintenance_records',
          },
          (payload) => {
            handleMaintenanceChange(payload)
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
      */
    },

    /**
     * 수리 이벤트 처리
     */
    handleMaintenanceChange: (payload: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE'
      new: Record<string, unknown>
      old: Record<string, unknown>
    }) => {
      const { eventType, new: newRecord, old: oldRecord } = payload

      // 새 긴급수리 등록
      if (eventType === 'INSERT' && newRecord.repair_type === 'EM') {
        // 앱 내 알림 추가
        store.addNotification({
          type: 'emergency',
          title: '긴급수리 발생',
          message: `${newRecord.equipment_code} 설비에서 긴급수리가 요청되었습니다.`,
          equipment_code: newRecord.equipment_code as string,
          time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          date: new Date().toISOString().split('T')[0],
          read: false,
        })

        // 브라우저 푸시 알림
        pushNotificationService.showEmergencyNotification(newRecord.equipment_code as string)

        // TODO: 서버를 통해 모바일 FCM 푸시 전송
        // await sendFCMPushToServer('emergency', newRecord)
      }

      // 수리 완료
      if (eventType === 'UPDATE' && oldRecord?.status !== 'completed' && newRecord.status === 'completed') {
        store.addNotification({
          type: 'completed',
          title: '수리 완료',
          message: `${newRecord.equipment_code} 설비 수리가 완료되었습니다.`,
          equipment_code: newRecord.equipment_code as string,
          time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          date: new Date().toISOString().split('T')[0],
          read: false,
        })

        pushNotificationService.showCompletedNotification(
          newRecord.equipment_code as string,
          newRecord.rating as number | undefined
        )
      }
    },

    /**
     * 장시간 수리 체크 (주기적 실행)
     */
    checkLongRepairs: async (thresholdMinutes: number = 120) => {
      console.log('[SupabaseNotification] 장시간 수리 체크 (Supabase 연동 필요)')

      // Supabase 연동 시 아래 코드 활성화
      /*
      const thresholdTime = new Date(Date.now() - thresholdMinutes * 60 * 1000).toISOString()

      const { data: longRepairs } = await supabase
        .from('maintenance_records')
        .select('*, equipment:equipment_id(equipment_code)')
        .eq('status', 'in_progress')
        .lt('start_time', thresholdTime)

      const notifiedIds = new Set(
        store.notifications
          .filter(n => n.type === 'long_repair')
          .map(n => n.equipment_code)
      )

      longRepairs?.forEach((repair) => {
        if (!notifiedIds.has(repair.equipment.equipment_code)) {
          const duration = Date.now() - new Date(repair.start_time).getTime()

          store.addNotification({
            type: 'long_repair',
            title: '장시간 수리 경고',
            message: `${repair.equipment.equipment_code} 수리가 ${Math.floor(duration / 60000)}분을 초과했습니다.`,
            equipment_code: repair.equipment.equipment_code,
            time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toISOString().split('T')[0],
            read: false,
          })

          pushNotificationService.showLongRepairNotification(
            repair.equipment.equipment_code,
            duration / 60000
          )
        }
      })
      */
    },
  }
}

/**
 * 서버를 통한 FCM 푸시 알림 전송 (Supabase Edge Functions 사용)
 * Supabase 연동 시 사용
 */
export const sendFCMPushToServer = async (
  type: NotificationType,
  data: Record<string, unknown>
  /* supabase: SupabaseClient */
): Promise<void> => {
  console.log('[FCM Push] 서버를 통한 푸시 전송 준비됨 (Supabase 연동 필요)')

  // Supabase Edge Functions 연동 시 아래 코드 활성화
  /*
  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        type,
        data,
        // 알림을 받을 사용자 조건 (예: 특정 부서, 역할 등)
        recipients: {
          department: data.department,
          role: ['admin', 'maintenance'],
        },
      },
    })

    if (error) throw error
    console.log('[FCM Push] 푸시 알림 전송 성공')
  } catch (error) {
    console.error('[FCM Push] 푸시 알림 전송 실패:', error)
  }
  */
}

export default pushNotificationService
