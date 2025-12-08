import { useEffect, useRef, useCallback } from 'react'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

interface RealtimeConfig<T extends AnyRecord = AnyRecord> {
  table: string
  schema?: string
  event?: PostgresChangeEvent
  filter?: string
  onInsert?: (payload: T) => void
  onUpdate?: (payload: T, oldRecord?: T) => void
  onDelete?: (payload: T) => void
  onChange?: (payload: RealtimePostgresChangesPayload<T>) => void
  enabled?: boolean
}

/**
 * Supabase Realtime 구독 훅
 * 테이블의 실시간 변경사항을 구독하고 콜백을 실행합니다.
 */
export function useRealtimeSubscription<T extends AnyRecord = AnyRecord>(
  config: RealtimeConfig<T>
) {
  const {
    table,
    schema = 'public',
    event = '*',
    filter,
    onInsert,
    onUpdate,
    onDelete,
    onChange,
    enabled = true,
  } = config

  const channelRef = useRef<RealtimeChannel | null>(null)

  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<T>) => {
      console.log(`[Realtime] ${table} - ${payload.eventType}:`, payload)

      // 공통 onChange 콜백
      onChange?.(payload)

      // 이벤트별 콜백
      switch (payload.eventType) {
        case 'INSERT':
          onInsert?.(payload.new as T)
          break
        case 'UPDATE':
          onUpdate?.(payload.new as T, payload.old as T)
          break
        case 'DELETE':
          onDelete?.(payload.old as T)
          break
      }
    },
    [table, onChange, onInsert, onUpdate, onDelete]
  )

  useEffect(() => {
    if (!supabase || !enabled) return

    // 기존 채널이 있으면 정리
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // 새 채널 생성
    const channelName = `realtime:${schema}:${table}:${Date.now()}`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channelConfig: any = {
      event,
      schema,
      table,
    }

    if (filter) {
      channelConfig.filter = filter
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        channelConfig,
        handleChange
      )
      .subscribe((status) => {
        console.log(`[Realtime] ${table} subscription status:`, status)
      })

    channelRef.current = channel

    // Cleanup
    return () => {
      if (channelRef.current && supabase) {
        console.log(`[Realtime] Unsubscribing from ${table}`)
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [table, schema, event, filter, enabled, handleChange])

  // 수동으로 구독 해제하는 함수
  const unsubscribe = useCallback(() => {
    if (supabase && channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [])

  return { unsubscribe }
}

/**
 * 여러 테이블을 한번에 구독하는 훅
 */
export function useMultiTableRealtime(
  configs: RealtimeConfig<AnyRecord>[],
  enabled = true
) {
  const channelsRef = useRef<RealtimeChannel[]>([])

  useEffect(() => {
    if (!supabase || !enabled) return

    // supabase is guaranteed non-null after the above check
    const client = supabase

    // 기존 채널들 정리
    channelsRef.current.forEach((channel) => {
      client.removeChannel(channel)
    })
    channelsRef.current = []

    // 각 테이블에 대해 채널 생성
    configs.forEach((config) => {
      const {
        table,
        schema = 'public',
        event = '*',
        filter,
        onInsert,
        onUpdate,
        onDelete,
        onChange,
      } = config

      const channelName = `realtime:${schema}:${table}:${Date.now()}`

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const channelConfig: any = {
        event,
        schema,
        table,
      }

      if (filter) {
        channelConfig.filter = filter
      }

      const channel = client
        .channel(channelName)
        .on('postgres_changes', channelConfig, (payload) => {
          console.log(`[Realtime] ${table} - ${payload.eventType}:`, payload)

          onChange?.(payload as RealtimePostgresChangesPayload<AnyRecord>)

          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(payload.new as AnyRecord)
              break
            case 'UPDATE':
              onUpdate?.(
                payload.new as AnyRecord,
                payload.old as AnyRecord
              )
              break
            case 'DELETE':
              onDelete?.(payload.old as AnyRecord)
              break
          }
        })
        .subscribe((status) => {
          console.log(`[Realtime] ${table} subscription status:`, status)
        })

      channelsRef.current.push(channel)
    })

    // Cleanup
    return () => {
      const client = supabase
      if (client) {
        channelsRef.current.forEach((channel) => {
          client.removeChannel(channel)
        })
      }
      channelsRef.current = []
    }
  }, [configs, enabled])

  const unsubscribeAll = useCallback(() => {
    const client = supabase
    if (client) {
      channelsRef.current.forEach((channel) => {
        client.removeChannel(channel)
      })
      channelsRef.current = []
    }
  }, [])

  return { unsubscribeAll }
}

export default useRealtimeSubscription
