import { useEffect, useState, useCallback } from 'react'
import { requestNotificationPermission, onForegroundMessage } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { supabase } from '@/lib/supabase'

interface UseFcmReturn {
  fcmToken: string | null
  notificationPermission: NotificationPermission
  isLoading: boolean
  error: string | null
  requestPermission: () => Promise<string | null>
  unsubscribe: () => Promise<void>
}

// 디바이스 정보 수집
function getDeviceInfo() {
  const ua = navigator.userAgent
  const platform = navigator.platform
  const language = navigator.language

  return {
    userAgent: ua,
    platform,
    language,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    timestamp: new Date().toISOString(),
  }
}

export function useFirebaseMessaging(): UseFcmReturn {
  const [fcmToken, setFcmToken] = useState<string | null>(null)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuthStore()
  const { addNotification, setFcmToken: storeFcmToken, setIsSubscribed } = useNotificationStore()

  // FCM 토큰을 Supabase에 저장
  const saveFcmToken = useCallback(async (userId: string, token: string) => {
    if (!supabase) {
      console.warn('Supabase가 연결되지 않았습니다. 로컬 스토리지에만 저장합니다.')
      localStorage.setItem('fcm_token', token)
      return { success: true, local: true }
    }

    try {
      // 기존 토큰 확인 (동일 사용자, 동일 토큰)
      const { data: existingToken } = await supabase
        .from('user_fcm_tokens')
        .select('id, is_active')
        .eq('user_id', userId)
        .eq('fcm_token', token)
        .single()

      if (existingToken) {
        // 이미 존재하면 활성화 및 업데이트
        const { error: updateError } = await supabase
          .from('user_fcm_tokens')
          .update({
            is_active: true,
            device_info: getDeviceInfo(),
            last_used_at: new Date().toISOString(),
          })
          .eq('id', existingToken.id)

        if (updateError) throw updateError
      } else {
        // 새 토큰 삽입
        const { error: insertError } = await supabase
          .from('user_fcm_tokens')
          .insert({
            user_id: userId,
            fcm_token: token,
            device_type: 'web',
            device_info: getDeviceInfo(),
            is_active: true,
          })

        if (insertError) throw insertError
      }

      // 로컬 스토리지에도 백업 저장
      localStorage.setItem('fcm_token', token)
      console.log('FCM 토큰 저장 완료:', token.substring(0, 20) + '...')
      return { success: true, local: false }
    } catch (err) {
      console.error('FCM 토큰 저장 실패:', err)
      // Supabase 실패 시 로컬에만 저장
      localStorage.setItem('fcm_token', token)
      return { success: false, error: err }
    }
  }, [])

  // FCM 토큰 비활성화 (구독 취소)
  const deactivateFcmToken = useCallback(async (token: string) => {
    if (!supabase) return

    try {
      await supabase
        .from('user_fcm_tokens')
        .update({ is_active: false })
        .eq('fcm_token', token)

      console.log('FCM 토큰 비활성화 완료')
    } catch (err) {
      console.error('FCM 토큰 비활성화 실패:', err)
    }
  }, [])

  // 알림 권한 요청 및 토큰 발급
  const requestPermission = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const token = await requestNotificationPermission()

      if (token) {
        setFcmToken(token)
        storeFcmToken(token)
        setNotificationPermission('granted')
        setIsSubscribed(true)

        // Supabase에 토큰 저장
        if (user?.id) {
          const result = await saveFcmToken(user.id, token)
          if (!result.success) {
            setError('토큰 저장에 실패했습니다. 다시 시도해주세요.')
          }
        }

        return token
      } else {
        setNotificationPermission(Notification.permission)
        setIsSubscribed(false)
        if (Notification.permission === 'denied') {
          setError('알림 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.')
        }
        return null
      }
    } catch (err) {
      console.error('알림 권한 요청 실패:', err)
      setError('알림 설정 중 오류가 발생했습니다.')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, saveFcmToken, storeFcmToken, setIsSubscribed])

  // 구독 취소
  const unsubscribe = useCallback(async () => {
    if (fcmToken) {
      await deactivateFcmToken(fcmToken)
      setFcmToken(null)
      storeFcmToken(null)
      setIsSubscribed(false)
      localStorage.removeItem('fcm_token')
    }
  }, [fcmToken, deactivateFcmToken, storeFcmToken, setIsSubscribed])

  // 초기 권한 상태 확인
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission)

      // 이미 권한이 있고 저장된 토큰이 있으면 복원
      if (Notification.permission === 'granted') {
        const savedToken = localStorage.getItem('fcm_token')
        if (savedToken) {
          setFcmToken(savedToken)
        }
      }
    }
  }, [])

  // 포그라운드 메시지 처리
  useEffect(() => {
    if (notificationPermission !== 'granted') return

    onForegroundMessage((payload) => {
      console.log('포그라운드 메시지:', payload)

      // 알림 스토어에 추가
      if (payload.notification) {
        const notificationType = payload.data?.type || 'info'
        const now = new Date()

        addNotification({
          type: notificationType,
          title: payload.notification.title || 'SMART CMMS 알림',
          message: payload.notification.body || '',
          equipment_code: payload.data?.equipment_code,
          time: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          date: now.toLocaleDateString('ko-KR'),
          read: false,
        })

        // 브라우저 알림 표시
        if (document.visibilityState !== 'visible') {
          new Notification(payload.notification.title || '새 알림', {
            body: payload.notification.body,
            icon: '/A symbol BLUE-02.png',
            badge: '/A symbol BLUE-02.png',
            tag: payload.data?.tag || `notification-${Date.now()}`,
          })
        }
      }
    })
  }, [notificationPermission, addNotification])

  return {
    fcmToken,
    notificationPermission,
    isLoading,
    error,
    requestPermission,
    unsubscribe,
  }
}
