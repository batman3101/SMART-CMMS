import { useEffect, useCallback, useRef } from 'react'
import { useMultiTableRealtime } from './useRealtimeSubscription'
import { useEquipmentStore } from '@/stores/equipmentStore'
import { useMaintenanceStore } from '@/stores/maintenanceStore'
import { useNotificationStore, NotificationType } from '@/stores/notificationStore'
import { useAuthStore } from '@/stores/authStore'
import { equipmentApi, maintenanceApi } from '@/lib/api'
import type { Equipment, MaintenanceRecord } from '@/types'
import { getConfiguredTimezone, formatDateInTimezone } from '@/lib/dateUtils'

// 데이터가 stale로 간주되는 시간 (10초로 단축 - 더 빠른 새로고침)
const STALE_TIME = 10000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

/**
 * DB의 알림 타입을 앱의 NotificationType으로 변환
 */
function mapNotificationType(dbType: string): NotificationType {
  const typeMap: Record<string, NotificationType> = {
    emergency: 'emergency',
    long_repair: 'long_repair',
    completed: 'completed',
    info: 'info',
    pm_schedule: 'pm_schedule',
    // 추가 매핑 (DB에서 다른 타입이 올 경우)
    warning: 'info',
    error: 'emergency',
    success: 'completed',
  }
  return typeMap[dbType] || 'info'
}

/**
 * 앱 전체 실시간 동기화 훅 (#4: 단일 sync 모듈)
 * MainLayout이나 App 컴포넌트에서 한 번 호출.
 *
 * 기능:
 * - Supabase Realtime 구독 (중앙 테이블 레지스트리)
 * - 페이지 포커스 시 자동 새로고침
 * - 네트워크 재연결 시 자동 새로고침
 * - stale 데이터 자동 갱신
 *
 * equipment/maintenance 캐시 스토어를 갱신하며, 장비 변경은 effective status가
 * 유지되도록 enriched 리로드로 처리한다.
 */
export function useAppRealtime(enabled = true) {
  const { user, currentFactory, refreshUser } = useAuthStore()
  const { setEquipments } = useEquipmentStore()
  const { updateRecord, setRecords, deleteRecord } = useMaintenanceStore()
  const { addNotification } = useNotificationStore()
  const lastFetchRef = useRef<number>(0)

  // stale 여부 확인
  const isStale = useCallback(() => {
    return Date.now() - lastFetchRef.current > STALE_TIME
  }, [])

  // 초기 데이터 로드 (equipment는 기본 effective status로 enriched)
  const loadAllData = useCallback(async () => {
    console.log('[DataSync] Loading all data...')
    const [equipmentsResult, recordsResult] = await Promise.all([
      equipmentApi.getEquipments(),
      maintenanceApi.getRecords(),
    ])
    if (equipmentsResult.data) {
      setEquipments(equipmentsResult.data as Equipment[])
    }
    if (recordsResult.data) {
      setRecords(recordsResult.data as MaintenanceRecord[])
    }
    lastFetchRef.current = Date.now()
    console.log('[DataSync] Data loaded successfully')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setEquipments, setRecords, currentFactory])

  // 조건부 fetch (stale일 때만)
  const conditionalFetch = useCallback(async () => {
    if (isStale()) {
      console.log('[DataSync] Data is stale, refreshing...')
      await loadAllData()
    }
  }, [isStale, loadAllData])

  // 초기 로드
  useEffect(() => {
    if (enabled) {
      loadAllData()
    }
  }, [enabled, loadAllData])

  // 페이지 포커스 및 가시성 변경 시 새로고침
  useEffect(() => {
    if (!enabled) return

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
  }, [enabled, conditionalFetch])

  // 네트워크 재연결 시 새로고침
  useEffect(() => {
    if (!enabled) return

    const handleOnline = () => {
      console.log('[DataSync] Network reconnected, refreshing data...')
      loadAllData()
    }

    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [enabled, loadAllData])

  // 여러 테이블 구독 (중앙 레지스트리)
  useMultiTableRealtime(
    [
      {
        table: 'equipments',
        filter: currentFactory ? `factory_id=eq.${currentFactory}` : undefined,
        onInsert: () => {
          console.log('[Realtime] Equipment inserted')
          loadAllData() // 관계 데이터 포함하여 리로드
        },
        onUpdate: () => {
          // effective status가 유지되도록 enriched 리로드 (raw granular 갱신 금지)
          console.log('[Realtime] Equipment updated')
          loadAllData()
        },
        onDelete: () => {
          console.log('[Realtime] Equipment deleted')
          loadAllData()
        },
      },
      {
        table: 'maintenance_records',
        filter: currentFactory ? `factory_id=eq.${currentFactory}` : undefined,
        onInsert: () => {
          console.log('[Realtime] Maintenance inserted')
          loadAllData() // 관계 데이터 포함하여 리로드
        },
        onUpdate: (data: AnyRecord) => {
          console.log('[Realtime] Maintenance updated:', data)
          updateRecord(data.id, data as Partial<MaintenanceRecord>)
        },
        onDelete: (data: AnyRecord) => {
          console.log('[Realtime] Maintenance deleted:', data)
          deleteRecord(data.id)
        },
      },
      {
        table: 'notifications',
        filter: user?.id ? `user_id=eq.${user.id}` : undefined,
        onInsert: (data: AnyRecord) => {
          console.log('[Realtime] Notification received:', data)

          const now = new Date(data.created_at)
          addNotification({
            type: mapNotificationType(data.type),
            title: data.title,
            message: data.message,
            time: now.toLocaleTimeString('ko-KR', { timeZone: getConfiguredTimezone(), hour: '2-digit', minute: '2-digit' }),
            date: formatDateInTimezone(now),
            read: data.is_read,
          })
        },
      },
      // 사용자 프로필 변경 감지 (현재 로그인한 사용자)
      {
        table: 'users',
        filter: user?.id ? `id=eq.${user.id}` : undefined,
        onUpdate: () => {
          console.log('[Realtime] User profile updated, refreshing...')
          refreshUser()
        },
      },
      // PM 스케줄 변경 감지
      {
        table: 'pm_schedules',
        filter: currentFactory ? `factory_id=eq.${currentFactory}` : undefined,
        onInsert: () => {
          console.log('[Realtime] PM schedule created')
        },
        onUpdate: () => {
          console.log('[Realtime] PM schedule updated')
        },
        onDelete: () => {
          console.log('[Realtime] PM schedule deleted')
        },
      },
      // PM 실행 변경 감지
      {
        table: 'pm_executions',
        filter: currentFactory ? `factory_id=eq.${currentFactory}` : undefined,
        onInsert: () => {
          console.log('[Realtime] PM execution created')
        },
        onUpdate: () => {
          console.log('[Realtime] PM execution updated')
        },
      },
      // 설정 변경 감지
      {
        table: 'settings',
        filter: currentFactory ? `factory_id=eq.${currentFactory}` : undefined,
        onUpdate: () => {
          console.log('[Realtime] Settings updated')
        },
      },
    ],
    enabled
  )

  return { refresh: loadAllData }
}

export default useAppRealtime
