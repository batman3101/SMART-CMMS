import { useSyncExternalStore } from 'react'
import { subscribe, getSnapshot, type PWAInstallState } from '@/lib/pwaInstall'

/**
 * PWA 설치 상태 구독 훅.
 * 모듈(`@/lib/pwaInstall`)이 보관하는 설치 가능 여부/플랫폼/설치 상태를
 * useSyncExternalStore 로 안전하게 구독한다.
 */
export function usePWAInstall(): PWAInstallState {
  // 서버 스냅샷도 동일 함수 사용(SSR 미사용이지만 시그니처 충족)
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
