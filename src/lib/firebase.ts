import { initializeApp, FirebaseApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, Messaging, MessagePayload } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// iOS Safari 감지
const isIOSSafari = (): boolean => {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua)
  return isIOS && isSafari
}

// Push API 지원 확인
const isPushSupported = (): boolean => {
  if (typeof window === 'undefined') return false
  return 'PushManager' in window && 'serviceWorker' in navigator && 'Notification' in window
}

// Firebase 앱 초기화 (방어적 처리)
let app: FirebaseApp | null = null

try {
  app = initializeApp(firebaseConfig)
} catch (error) {
  console.error('Firebase 앱 초기화 실패:', error)
}

// Messaging 인스턴스 (브라우저 환경에서만, iOS Safari 제외)
let messaging: Messaging | null = null

// iOS Safari에서는 Push Notification이 PWA로 설치된 경우에만 제한적으로 지원됨
// 웹 브라우저에서는 지원되지 않으므로 초기화 스킵
if (app && typeof window !== 'undefined' && isPushSupported() && !isIOSSafari()) {
  try {
    messaging = getMessaging(app)
    console.log('[Firebase] Messaging 초기화 성공')
  } catch (error) {
    console.warn('[Firebase] Messaging 초기화 실패 (지원되지 않는 환경):', error)
    messaging = null
  }
} else if (isIOSSafari()) {
  console.log('[Firebase] iOS Safari에서는 Push Notification이 지원되지 않습니다.')
}

// FCM 토큰 요청
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    // 알림 권한 요청
    const permission = await Notification.requestPermission()

    if (permission !== 'granted') {
      console.log('알림 권한이 거부되었습니다.')
      return null
    }

    if (!messaging) {
      console.error('Messaging이 초기화되지 않았습니다.')
      return null
    }

    // FCM 토큰 발급
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    })

    console.log('FCM Token:', token)
    return token
  } catch (error) {
    console.error('FCM 토큰 발급 실패:', error)
    return null
  }
}

// 포그라운드 메시지 리스너
export function onForegroundMessage(callback: (payload: MessagePayload) => void) {
  if (!messaging) return

  return onMessage(messaging, (payload) => {
    console.log('포그라운드 메시지 수신:', payload)
    callback(payload)
  })
}

// Export MessagePayload type for consumers
export type { MessagePayload }

export { app, messaging }
