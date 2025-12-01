import { useEffect, useCallback, useRef } from 'react'

interface DataSyncOptions {
  /** 페이지 포커스 시 자동 새로고침 */
  refetchOnFocus?: boolean
  /** 네트워크 재연결 시 자동 새로고침 */
  refetchOnReconnect?: boolean
  /** 자동 새로고침 간격 (ms) - 0이면 비활성화 */
  refetchInterval?: number
  /** 데이터가 stale로 간주되는 시간 (ms) */
  staleTime?: number
  /** 활성화 여부 */
  enabled?: boolean
}

const DEFAULT_OPTIONS: DataSyncOptions = {
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchInterval: 0,
  staleTime: 30000, // 30초
  enabled: true,
}

/**
 * 데이터 동기화 및 캐시 무효화 훅
 * 브라우저 포커스, 네트워크 재연결, 주기적 갱신을 처리합니다.
 */
export function useDataSync(
  fetchFn: () => Promise<void>,
  options: DataSyncOptions = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const lastFetchRef = useRef<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // stale 여부 확인
  const isStale = useCallback(() => {
    return Date.now() - lastFetchRef.current > (opts.staleTime || 30000)
  }, [opts.staleTime])

  // 조건부 fetch (stale일 때만)
  const conditionalFetch = useCallback(async () => {
    if (isStale()) {
      console.log('[DataSync] Data is stale, refetching...')
      await fetchFn()
      lastFetchRef.current = Date.now()
    }
  }, [fetchFn, isStale])

  // 강제 fetch
  const forceFetch = useCallback(async () => {
    console.log('[DataSync] Force refetching...')
    await fetchFn()
    lastFetchRef.current = Date.now()
  }, [fetchFn])

  // 페이지 포커스 핸들러
  useEffect(() => {
    if (!opts.enabled || !opts.refetchOnFocus) return

    const handleFocus = () => {
      console.log('[DataSync] Window focused')
      conditionalFetch()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[DataSync] Page became visible')
        conditionalFetch()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [opts.enabled, opts.refetchOnFocus, conditionalFetch])

  // 네트워크 재연결 핸들러
  useEffect(() => {
    if (!opts.enabled || !opts.refetchOnReconnect) return

    const handleOnline = () => {
      console.log('[DataSync] Network reconnected')
      forceFetch()
    }

    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [opts.enabled, opts.refetchOnReconnect, forceFetch])

  // 주기적 갱신
  useEffect(() => {
    if (!opts.enabled || !opts.refetchInterval || opts.refetchInterval <= 0) return

    intervalRef.current = setInterval(() => {
      console.log('[DataSync] Interval refetch')
      conditionalFetch()
    }, opts.refetchInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [opts.enabled, opts.refetchInterval, conditionalFetch])

  // 초기 fetch
  useEffect(() => {
    if (opts.enabled) {
      forceFetch()
    }
  }, [opts.enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    refetch: forceFetch,
    isStale,
  }
}

/**
 * 브라우저 탭 활성화 감지 훅
 */
export function usePageVisibility() {
  const isVisible = useRef(true)

  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisible.current = document.visibilityState === 'visible'
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return { isVisible: () => isVisible.current }
}

/**
 * 온라인 상태 감지 훅
 */
export function useOnlineStatus() {
  const isOnline = useRef(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => {
      isOnline.current = true
    }

    const handleOffline = () => {
      isOnline.current = false
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline: () => isOnline.current }
}

/**
 * 로컬 스토리지 캐시 관리 유틸리티
 */
export const cacheManager = {
  /** 캐시 키에 타임스탬프 저장 */
  setTimestamp: (key: string) => {
    localStorage.setItem(`${key}_timestamp`, Date.now().toString())
  },

  /** 캐시가 유효한지 확인 */
  isValid: (key: string, maxAge: number) => {
    const timestamp = localStorage.getItem(`${key}_timestamp`)
    if (!timestamp) return false
    return Date.now() - parseInt(timestamp, 10) < maxAge
  },

  /** 캐시 무효화 */
  invalidate: (key: string) => {
    localStorage.removeItem(`${key}_timestamp`)
    localStorage.removeItem(key)
  },

  /** 모든 데이터 캐시 무효화 */
  invalidateAll: () => {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.includes('_timestamp') || key?.startsWith('amms-')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  },

  /** 데이터 저장 (타임스탬프 포함) */
  set: <T>(key: string, data: T) => {
    localStorage.setItem(key, JSON.stringify(data))
    cacheManager.setTimestamp(key)
  },

  /** 데이터 가져오기 (만료 확인) */
  get: <T>(key: string, maxAge: number): T | null => {
    if (!cacheManager.isValid(key, maxAge)) {
      cacheManager.invalidate(key)
      return null
    }
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  },
}

export default useDataSync
