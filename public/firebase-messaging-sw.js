/**
 * Firebase Messaging Service Worker
 * 백그라운드 푸시 알림 처리
 *
 * 주의: Firebase 설정을 여기에도 포함해야 합니다.
 * importScripts로 Firebase SDK를 로드합니다.
 */

// Firebase SDK 로드 (CDN)
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

// Firebase 설정 (환경변수 사용 불가, 하드코딩 또는 서버에서 가져오기)
// TODO: 실제 배포 시 Firebase Console에서 발급받은 값으로 교체
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
}

// Firebase 초기화 (설정이 있을 때만)
let messaging = null

try {
  if (firebaseConfig.apiKey !== 'YOUR_API_KEY') {
    firebase.initializeApp(firebaseConfig)
    messaging = firebase.messaging()
    console.log('[Firebase SW] 초기화됨')
  } else {
    console.log('[Firebase SW] Firebase 설정 필요 - firebase-messaging-sw.js 파일의 firebaseConfig 값을 업데이트하세요.')
  }
} catch (error) {
  console.error('[Firebase SW] 초기화 실패:', error)
}

// 백그라운드 메시지 처리
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[Firebase SW] 백그라운드 메시지 수신:', payload)

    const notificationTitle = payload.notification?.title || payload.data?.title || 'AMMS 알림'
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || '새로운 알림이 있습니다.',
      icon: payload.notification?.icon || '/icon-192x192.png',
      badge: '/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: payload.data || {},
      tag: payload.data?.tag || `firebase-${Date.now()}`,
      requireInteraction: payload.data?.type === 'emergency',
      actions: getNotificationActions(payload.data?.type),
    }

    return self.registration.showNotification(notificationTitle, notificationOptions)
  })
}

/**
 * 알림 유형에 따른 액션 버튼 반환
 */
function getNotificationActions(type) {
  switch (type) {
    case 'emergency':
      return [
        { action: 'view', title: '확인하기' },
        { action: 'dismiss', title: '나중에' },
      ]
    case 'long_repair':
      return [
        { action: 'view', title: '상태 확인' },
      ]
    case 'completed':
      return [
        { action: 'view', title: '상세 보기' },
      ]
    case 'pm_schedule':
      return [
        { action: 'view', title: '일정 확인' },
      ]
    default:
      return []
  }
}

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('[Firebase SW] 알림 클릭:', event.action)

  event.notification.close()

  const data = event.notification.data || {}
  let urlToOpen = '/'

  if (event.action === 'dismiss') {
    return
  }

  if (data.url) {
    urlToOpen = data.url
  } else {
    switch (data.type) {
      case 'emergency':
      case 'long_repair':
        urlToOpen = '/maintenance/monitoring'
        break
      case 'completed':
        urlToOpen = '/maintenance/history'
        break
      case 'pm_schedule':
        urlToOpen = '/maintenance'
        break
      default:
        urlToOpen = '/maintenance/notifications'
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(urlToOpen)
          return
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})
