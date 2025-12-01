import { useEffect, useCallback, useRef } from 'react'
import { useRealtimeSubscription, useMultiTableRealtime } from './useRealtimeSubscription'
import { useEquipmentStore } from '@/stores/equipmentStore'
import { useMaintenanceStore } from '@/stores/maintenanceStore'
import { useNotificationStore, NotificationType } from '@/stores/notificationStore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import type { Equipment, MaintenanceRecord } from '@/types'

// 데이터가 stale로 간주되는 시간 (30초)
const STALE_TIME = 30000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

/**
 * 장비 테이블 실시간 동기화 훅
 */
export function useEquipmentRealtime(enabled = true) {
  const { addEquipment, updateEquipment, deleteEquipment, setEquipments } = useEquipmentStore()

  // 초기 데이터 로드
  const loadEquipments = useCallback(async () => {
    if (!supabase) return

    const { data, error } = await supabase
      .from('equipments')
      .select(`
        *,
        type:equipment_types(*)
      `)
      .eq('is_active', true)
      .order('equipment_no')

    if (!error && data) {
      setEquipments(data as Equipment[])
    }
  }, [setEquipments])

  useEffect(() => {
    if (enabled) {
      loadEquipments()
    }
  }, [enabled, loadEquipments])

  // Realtime 구독
  useRealtimeSubscription({
    table: 'equipments',
    enabled,
    onInsert: (newEquipment: AnyRecord) => {
      console.log('[Realtime] Equipment inserted:', newEquipment)
      addEquipment(newEquipment as Equipment)
    },
    onUpdate: (updatedEquipment: AnyRecord) => {
      console.log('[Realtime] Equipment updated:', updatedEquipment)
      updateEquipment(updatedEquipment.id, updatedEquipment as Partial<Equipment>)
    },
    onDelete: (deletedEquipment: AnyRecord) => {
      console.log('[Realtime] Equipment deleted:', deletedEquipment)
      deleteEquipment(deletedEquipment.id)
    },
  })

  return { refresh: loadEquipments }
}

/**
 * 정비 기록 테이블 실시간 동기화 훅
 */
export function useMaintenanceRealtime(enabled = true) {
  const { updateRecord, deleteRecord, setRecords } = useMaintenanceStore()

  // 초기 데이터 로드
  const loadRecords = useCallback(async () => {
    if (!supabase) return

    const { data, error } = await supabase
      .from('maintenance_records')
      .select(`
        *,
        equipment:equipments(*),
        repair_type:repair_types(*),
        technician:users(*)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && data) {
      setRecords(data as MaintenanceRecord[])
    }
  }, [setRecords])

  useEffect(() => {
    if (enabled) {
      loadRecords()
    }
  }, [enabled, loadRecords])

  // Realtime 구독
  useRealtimeSubscription({
    table: 'maintenance_records',
    enabled,
    onInsert: () => {
      console.log('[Realtime] Maintenance record inserted')
      // 관계 데이터를 위해 전체 리로드
      loadRecords()
    },
    onUpdate: (updatedRecord: AnyRecord) => {
      console.log('[Realtime] Maintenance record updated:', updatedRecord)
      updateRecord(updatedRecord.id, updatedRecord as Partial<MaintenanceRecord>)
    },
    onDelete: (deletedRecord: AnyRecord) => {
      console.log('[Realtime] Maintenance record deleted:', deletedRecord)
      deleteRecord(deletedRecord.id)
    },
  })

  return { refresh: loadRecords }
}

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
 * 알림 실시간 동기화 훅
 */
export function useNotificationRealtime(enabled = true) {
  const { user } = useAuthStore()
  const { addNotification } = useNotificationStore()

  // 사용자별 알림 필터
  const filter = user?.id ? `user_id=eq.${user.id}` : undefined

  useRealtimeSubscription({
    table: 'notifications',
    filter,
    enabled: enabled && !!user?.id,
    onInsert: (newNotification: AnyRecord) => {
      console.log('[Realtime] New notification:', newNotification)

      const now = new Date(newNotification.created_at)
      addNotification({
        type: mapNotificationType(newNotification.type),
        title: newNotification.title,
        message: newNotification.message,
        time: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString('ko-KR'),
        read: newNotification.is_read,
      })
    },
  })
}

/**
 * 앱 전체 실시간 동기화 훅
 * MainLayout이나 App 컴포넌트에서 한 번 호출
 *
 * 기능:
 * - Supabase Realtime 구독
 * - 페이지 포커스 시 자동 새로고침
 * - 네트워크 재연결 시 자동 새로고침
 * - stale 데이터 자동 갱신
 */
export function useAppRealtime(enabled = true) {
  const { user } = useAuthStore()
  const { updateEquipment, setEquipments } = useEquipmentStore()
  const { updateRecord, setRecords, deleteRecord } = useMaintenanceStore()
  const { addNotification } = useNotificationStore()
  const lastFetchRef = useRef<number>(0)

  // stale 여부 확인
  const isStale = useCallback(() => {
    return Date.now() - lastFetchRef.current > STALE_TIME
  }, [])

  // 초기 데이터 로드
  const loadAllData = useCallback(async () => {
    if (!supabase) return

    console.log('[DataSync] Loading all data...')

    // 병렬로 데이터 로드
    const [equipmentsResult, recordsResult] = await Promise.all([
      supabase
        .from('equipments')
        .select(`*, type:equipment_types(*)`)
        .eq('is_active', true)
        .order('equipment_no'),
      supabase
        .from('maintenance_records')
        .select(`*, equipment:equipments(*), repair_type:repair_types(*), technician:users(*)`)
        .order('created_at', { ascending: false })
        .limit(100),
    ])

    if (!equipmentsResult.error && equipmentsResult.data) {
      setEquipments(equipmentsResult.data as Equipment[])
    }

    if (!recordsResult.error && recordsResult.data) {
      setRecords(recordsResult.data as MaintenanceRecord[])
    }

    lastFetchRef.current = Date.now()
    console.log('[DataSync] Data loaded successfully')
  }, [setEquipments, setRecords])

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

  // 여러 테이블 구독
  useMultiTableRealtime(
    [
      {
        table: 'equipments',
        onInsert: () => {
          console.log('[Realtime] Equipment inserted')
          loadAllData() // 관계 데이터 포함하여 리로드
        },
        onUpdate: (data: AnyRecord) => {
          console.log('[Realtime] Equipment updated:', data)
          updateEquipment(data.id, data as Partial<Equipment>)
        },
        onDelete: () => {
          console.log('[Realtime] Equipment deleted')
          loadAllData()
        },
      },
      {
        table: 'maintenance_records',
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
            time: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
            date: now.toLocaleDateString('ko-KR'),
            read: data.is_read,
          })
        },
      },
    ],
    enabled
  )

  return { refresh: loadAllData }
}

export default useAppRealtime
