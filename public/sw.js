/**
 * Service Worker for Push Notifications
 * 웹 푸시 알림 처리
 */

// Service Worker 설치
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install')
  self.skipWaiting()
})

// Service Worker 활성화
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate')
  event.waitUntil(clients.claim())
})

// 푸시 알림 수신
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push Received')

  let data = {
    title: 'AMMS 알림',
    body: '새로운 알림이 있습니다.',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    data: {},
  }

  if (event.data) {
    try {
      const payload = event.data.json()
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        data: payload.data || {},
      }
    } catch (e) {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [100, 50, 100],
    data: data.data,
    actions: getNotificationActions(data.data?.type),
    requireInteraction: data.data?.type === 'emergency',
    tag: data.data?.tag || `notification-${Date.now()}`,
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click:', event.action)

  event.notification.close()

  const urlToOpen = getUrlFromNotification(event.notification.data, event.action)

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 이미 열린 창이 있으면 포커스
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(urlToOpen)
          return
        }
      }
      // 없으면 새 창 열기
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// 알림 닫기 처리
self.addEventListener('notificationclose', (event) => {
  console.log('[ServiceWorker] Notification closed')
})

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

/**
 * 알림 데이터에서 이동할 URL 결정
 */
function getUrlFromNotification(data, action) {
  if (action === 'dismiss') {
    return '/'
  }

  if (data?.url) {
    return data.url
  }

  switch (data?.type) {
    case 'emergency':
    case 'long_repair':
      return '/maintenance/monitoring'
    case 'completed':
      return '/maintenance/history'
    case 'pm_schedule':
      return '/maintenance'
    default:
      return '/maintenance/notifications'
  }
}
