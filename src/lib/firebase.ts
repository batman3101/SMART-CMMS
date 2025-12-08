import { initializeApp } from 'firebase/app'
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

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig)

// Messaging 인스턴스 (브라우저 환경에서만)
let messaging: Messaging | null = null

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app)
  } catch (error) {
    console.error('Firebase Messaging 초기화 실패:', error)
  }
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
