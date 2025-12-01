// Buffer polyfill for ExcelJS
import { Buffer } from 'buffer'
;(window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ToastProvider } from './components/ui/toast'
import './index.css'
import './i18n'

// Firebase Messaging Service Worker 등록
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('[Main] Firebase SW 등록 성공:', registration.scope)
    })
    .catch((error) => {
      console.error('[Main] Firebase SW 등록 실패:', error)
    })
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
