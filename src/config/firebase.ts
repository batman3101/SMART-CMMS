/**
 * Firebase Configuration
 * 모바일 앱 푸시 알림을 위한 Firebase Cloud Messaging 설정
 *
 * 사용 전 .env 파일에 Firebase 설정 추가 필요:
 * VITE_FIREBASE_API_KEY=your_api_key
 * VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
 * VITE_FIREBASE_PROJECT_ID=your_project_id
 * VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
 * VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
 * VITE_FIREBASE_APP_ID=your_app_id
 * VITE_FIREBASE_VAPID_KEY=your_vapid_key
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { getMessaging, Messaging, getToken, onMessage, MessagePayload } from 'firebase/messaging'

// Firebase 설정
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

// VAPID Key for Web Push
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''

let app: FirebaseApp | null = null
let messaging: Messaging | null = null

/**
 * Firebase 초기화
 */
export const initializeFirebase = (): FirebaseApp | null => {
  // 설정 확인
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn('[Firebase] Firebase 설정이 없습니다. .env 파일을 확인하세요.')
    return null
  }

  try {
    // 이미 초기화된 앱이 있는지 확인
    if (getApps().length > 0) {
      app = getApp()
      return app
    }

    if (!app) {
      app = initializeApp(firebaseConfig)
      console.log('[Firebase] Firebase 초기화됨')
    }
    return app
  } catch (error) {
    console.error('[Firebase] 초기화 실패:', error)
    return null
  }
}

/**
 * Firebase Messaging 초기화
 */
export const initializeMessaging = (): Messaging | null => {
  try {
    if (!app) {
      initializeFirebase()
    }

    if (!app) {
      return null
    }

    if (!messaging) {
      messaging = getMessaging(app)
      console.log('[Firebase] Messaging 초기화됨')
    }
    return messaging
  } catch (error) {
    console.error('[Firebase] Messaging 초기화 실패:', error)
    return null
  }
}

/**
 * FCM 토큰 발급
 * 모바일 앱 푸시 알림에 사용
 */
export const getFCMToken = async (): Promise<string | null> => {
  try {
    const msg = initializeMessaging()
    if (!msg) {
      console.warn('[Firebase] Messaging이 초기화되지 않았습니다.')
      return null
    }

    if (!VAPID_KEY) {
      console.warn('[Firebase] VAPID_KEY가 설정되지 않았습니다.')
      return null
    }

    // Service Worker 등록
    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')

    const token = await getToken(msg, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    })

    if (token) {
      console.log('[Firebase] FCM 토큰 발급됨:', token.substring(0, 20) + '...')
      return token
    } else {
      console.warn('[Firebase] FCM 토큰 발급 실패: 알림 권한이 없습니다.')
      return null
    }
  } catch (error) {
    console.error('[Firebase] FCM 토큰 발급 실패:', error)
    return null
  }
}

/**
 * 포그라운드 메시지 리스너 설정
 */
export const onForegroundMessage = (callback: (payload: MessagePayload) => void) => {
  const msg = initializeMessaging()
  if (!msg) {
    console.warn('[Firebase] Messaging이 초기화되지 않았습니다.')
    return () => {}
  }

  return onMessage(msg, (payload) => {
    console.log('[Firebase] 포그라운드 메시지 수신:', payload)
    callback(payload)
  })
}

/**
 * Firebase가 설정되어 있는지 확인
 */
export const isFirebaseConfigured = (): boolean => {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId && VAPID_KEY)
}

export { app, messaging }
