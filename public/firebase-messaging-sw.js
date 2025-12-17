/**
 * Firebase Messaging Service Worker
 * 백그라운드 푸시 알림 처리
 *
 * 주의: Firebase 설정을 여기에도 포함해야 합니다.
 * importScripts로 Firebase SDK를 로드합니다.
 *
 * @version 2.2.0 - importScripts 순서 수정
 */

// Firebase SDK 로드 (CDN) - 반드시 맨 처음에 호출해야 함
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

// Firebase 설정 (환경변수 사용 불가, 하드코딩 필요)
const firebaseConfig = {
  apiKey: 'AIzaSyD-6M8rIr44f3YzoHepzuO7VFCL3j_oi9U',
  authDomain: 'almus-tech-cmms.firebaseapp.com',
  projectId: 'almus-tech-cmms',
  storageBucket: 'almus-tech-cmms.firebasestorage.app',
  messagingSenderId: '177755834626',
  appId: '1:177755834626:web:a854857228f62fc476da1b',
}

// Firebase 초기화
let messaging = null

try {
  firebase.initializeApp(firebaseConfig)
  messaging = firebase.messaging()
  console.log('[Firebase SW] 초기화됨')
} catch (error) {
  console.error('[Firebase SW] 초기화 실패:', error)
}

// Service Worker 즉시 활성화
self.addEventListener('install', () => {
  console.log('[Firebase SW] 설치됨 - 즉시 활성화')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[Firebase SW] 활성화됨')
  event.waitUntil(clients.claim())
})

// 백그라운드 메시지 처리
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[Firebase SW] 백그라운드 메시지 수신:', payload)

    const notificationTitle = payload.notification?.title || payload.data?.title || 'SMART CMMS 알림'
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || '새로운 알림이 있습니다.',
      icon: payload.notification?.icon || '/A symbol BLUE-02.png',
      badge: '/A symbol BLUE-02.png',
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
  console.log('[Firebase SW] 알림 클릭:', event.action, event.notification.data)

  event.notification.close()

  const data = event.notification.data || {}

  // 닫기 액션이면 아무것도 안함
  if (event.action === 'dismiss') {
    return
  }

  // 이동할 경로 결정
  let path = '/'
  if (data.url) {
    path = data.url
  } else if (data.click_action) {
    path = data.click_action
  } else {
    switch (data.type) {
      case 'emergency':
      case 'long_repair':
        path = '/maintenance/monitor'
        break
      case 'completed':
        path = '/maintenance/history'
        break
      case 'pm_schedule':
        path = '/pm'
        break
      default:
        path = '/maintenance/notifications'
    }
  }

  // 전체 URL 생성
  const urlToOpen = new URL(path, self.location.origin).href
  console.log('[Firebase SW] 이동할 URL:', urlToOpen)

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      console.log('[Firebase SW] 열린 창 수:', clientList.length)

      // 이미 열린 창이 있으면 해당 창으로 이동
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          console.log('[Firebase SW] 기존 창으로 이동:', client.url)
          // postMessage로 페이지에 네비게이션 요청
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: path,
          })
          return client.focus()
        }
      }

      // 열린 창이 없으면 새 창 열기
      console.log('[Firebase SW] 새 창 열기:', urlToOpen)
      return clients.openWindow(urlToOpen)
    }).catch((error) => {
      console.error('[Firebase SW] 알림 클릭 처리 오류:', error)
      // 에러 발생 시 새 창 열기 시도
      return clients.openWindow(urlToOpen)
    })
  )
})
