// Buffer polyfill for ExcelJS (방어적 처리)
import { Buffer } from 'buffer'
try {
  if (typeof window !== 'undefined' && !window.hasOwnProperty('Buffer')) {
    ;(window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer
  }
} catch (error) {
  console.warn('[Main] Buffer polyfill 설정 실패:', error)
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ToastProvider } from './components/ui/toast'
import './index.css'
import './i18n'

// iOS Safari 감지
const isIOSSafari = (): boolean => {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua)
  return isIOS && isSafari
}

// Firebase Messaging Service Worker 등록 (iOS Safari 제외)
if ('serviceWorker' in navigator && !isIOSSafari()) {
  navigator.serviceWorker
    .register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('[Main] Firebase SW 등록 성공:', registration.scope)
    })
    .catch((error) => {
      // Service Worker 등록 실패는 앱 작동에 영향을 주지 않음
      console.warn('[Main] Firebase SW 등록 실패 (Push 알림이 비활성화됩니다):', error)
    })
} else if (isIOSSafari()) {
  console.log('[Main] iOS Safari에서는 Firebase Service Worker를 건너뜁니다.')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
