/**
 * FCM 공유 유틸리티
 * Edge Function 간 공유되는 FCM 관련 함수들
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 알림 유형
export type NotificationType = 'emergency' | 'long_repair' | 'completed' | 'info' | 'pm_schedule'

// FCM 메시지 타입
export interface FCMMessage {
  notification: {
    title: string
    body: string
    image?: string
  }
  data?: Record<string, string>
  options?: {
    priority?: 'high' | 'normal'
    ttl?: number
    collapse_key?: string
  }
}

// FCM 전송 결과
export interface FCMResult {
  success: number
  failure: number
  errors: string[]
}

/**
 * Supabase 클라이언트 생성 (서비스 롤)
 */
export function createSupabaseClient(): SupabaseClient {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase 환경 변수가 설정되지 않았습니다.')
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

/**
 * 사용자 조건으로 FCM 토큰 조회
 */
export async function getTokensByCondition(
  supabase: SupabaseClient,
  options: {
    user_ids?: string[]
    roles?: number[]
    departments?: string[]
    notification_type?: NotificationType
  }
): Promise<string[]> {
  // 기본 쿼리: 활성 토큰 + 푸시 설정 확인
  let query = supabase
    .from('user_fcm_tokens')
    .select(`
      fcm_token,
      user_id,
      users!inner (
        id,
        role,
        department
      ),
      user_push_settings (
        enabled,
        emergency,
        long_repair,
        completed,
        pm_schedule
      )
    `)
    .eq('is_active', true)

  // 사용자 ID 필터
  if (options.user_ids && options.user_ids.length > 0) {
    query = query.in('user_id', options.user_ids)
  }

  // 역할 필터
  if (options.roles && options.roles.length > 0) {
    query = query.in('users.role', options.roles)
  }

  // 부서 필터
  if (options.departments && options.departments.length > 0) {
    query = query.in('users.department', options.departments)
  }

  const { data, error } = await query

  if (error) {
    console.error('[FCM] 토큰 조회 실패:', error)
    return []
  }

  // 알림 유형에 따른 필터링
  const filteredData = data?.filter((row) => {
    const settings = row.user_push_settings?.[0]

    // 설정이 없으면 기본적으로 허용
    if (!settings) return true

    // 전체 비활성화 체크
    if (!settings.enabled) return false

    // 알림 유형별 체크
    if (options.notification_type) {
      switch (options.notification_type) {
        case 'emergency':
          return settings.emergency !== false
        case 'long_repair':
          return settings.long_repair !== false
        case 'completed':
          return settings.completed !== false
        case 'pm_schedule':
          return settings.pm_schedule !== false
        default:
          return true
      }
    }

    return true
  })

  // 중복 제거
  const tokens = [...new Set(filteredData?.map((row) => row.fcm_token) || [])]
  console.log(`[FCM] 조회된 토큰 수: ${tokens.length}`)

  return tokens
}

/**
 * FCM으로 푸시 알림 전송
 */
export async function sendFCM(
  tokens: string[],
  message: FCMMessage
): Promise<FCMResult> {
  const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')

  if (!FCM_SERVER_KEY) {
    throw new Error('FCM_SERVER_KEY 환경 변수가 설정되지 않았습니다.')
  }

  const result: FCMResult = {
    success: 0,
    failure: 0,
    errors: [],
  }

  if (tokens.length === 0) {
    return result
  }

  // 1000개씩 분할하여 전송 (FCM 제한)
  const chunks: string[][] = []
  for (let i = 0; i < tokens.length; i += 1000) {
    chunks.push(tokens.slice(i, i + 1000))
  }

  for (const chunk of chunks) {
    const payload = {
      registration_ids: chunk,
      notification: {
        title: message.notification.title,
        body: message.notification.body,
        icon: '/A symbol BLUE-02.png',
        badge: '/A symbol BLUE-02.png',
        click_action: message.data?.url || '/',
        ...(message.notification.image && { image: message.notification.image }),
      },
      data: message.data || {},
      priority: message.options?.priority || 'high',
      ...(message.options?.ttl && { time_to_live: message.options.ttl }),
      ...(message.options?.collapse_key && { collapse_key: message.options.collapse_key }),
    }

    try {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          Authorization: `key=${FCM_SERVER_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`FCM API 오류: ${response.status} - ${errorText}`)
      }

      const fcmResponse = await response.json()
      result.success += fcmResponse.success || 0
      result.failure += fcmResponse.failure || 0

      if (fcmResponse.results) {
        fcmResponse.results.forEach((r: { error?: string }, i: number) => {
          if (r.error) {
            result.errors.push(`Token ${i}: ${r.error}`)
          }
        })
      }
    } catch (error) {
      console.error('[FCM] 전송 실패:', error)
      result.failure += chunk.length
      result.errors.push(error.message)
    }
  }

  console.log(`[FCM] 전송 완료 - 성공: ${result.success}, 실패: ${result.failure}`)
  return result
}

/**
 * 인앱 알림 저장
 */
export async function saveInAppNotification(
  supabase: SupabaseClient,
  user_ids: string[],
  notification: {
    type: NotificationType
    title: string
    message: string
    data?: Record<string, unknown>
  }
): Promise<void> {
  if (user_ids.length === 0) return

  const notifications = user_ids.map((user_id) => ({
    user_id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data || {},
    is_read: false,
  }))

  const { error } = await supabase.from('user_notifications').insert(notifications)

  if (error) {
    console.error('[DB] 인앱 알림 저장 실패:', error)
  }
}

/**
 * CORS 헤더
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * JSON 응답 헬퍼
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * 에러 응답 헬퍼
 */
export function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ success: false, error: message }, status)
}
