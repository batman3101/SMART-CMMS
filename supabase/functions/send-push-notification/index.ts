/**
 * Supabase Edge Function: send-push-notification
 * FCM을 통해 푸시 알림을 전송하는 서버사이드 함수
 *
 * 환경 변수 필요:
 * - FCM_SERVER_KEY: Firebase Cloud Messaging 서버 키
 * - SUPABASE_URL: Supabase 프로젝트 URL
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase 서비스 롤 키
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS 헤더
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 알림 유형 정의
type NotificationType = 'emergency' | 'long_repair' | 'completed' | 'info' | 'pm_schedule'

// 요청 본문 타입
interface PushNotificationRequest {
  // 개별 토큰으로 전송
  token?: string
  tokens?: string[]

  // 사용자 조건으로 전송
  user_ids?: string[]
  roles?: number[]
  departments?: string[]

  // 전체 사용자에게 전송
  broadcast?: boolean

  // 알림 내용
  notification: {
    title: string
    body: string
    image?: string
  }

  // 추가 데이터
  data?: {
    type?: NotificationType
    equipment_code?: string
    maintenance_id?: string
    pm_schedule_id?: string
    url?: string
    tag?: string
    [key: string]: string | undefined
  }

  // 알림 옵션
  options?: {
    priority?: 'high' | 'normal'
    ttl?: number // Time to live in seconds
    collapse_key?: string
  }
}

// FCM 응답 타입
interface FCMResponse {
  success: number
  failure: number
  results?: Array<{
    message_id?: string
    error?: string
  }>
}

/**
 * FCM HTTP v1 API를 통해 푸시 알림 전송
 */
async function sendFCMNotification(
  tokens: string[],
  notification: PushNotificationRequest['notification'],
  data: PushNotificationRequest['data'],
  options: PushNotificationRequest['options']
): Promise<{ success: number; failure: number; errors: string[] }> {
  const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')

  if (!FCM_SERVER_KEY) {
    throw new Error('FCM_SERVER_KEY 환경 변수가 설정되지 않았습니다.')
  }

  const results = {
    success: 0,
    failure: 0,
    errors: [] as string[],
  }

  // 토큰이 없으면 바로 반환
  if (tokens.length === 0) {
    return results
  }

  // FCM 레거시 HTTP API 사용 (다중 토큰 지원)
  const fcmPayload = {
    registration_ids: tokens.slice(0, 1000), // FCM은 최대 1000개 토큰 지원
    notification: {
      title: notification.title,
      body: notification.body,
      icon: '/A symbol BLUE-02.png',
      badge: '/A symbol BLUE-02.png',
      click_action: data?.url || '/',
      ...(notification.image && { image: notification.image }),
    },
    data: {
      ...data,
      click_action: data?.url || '/',
    },
    priority: options?.priority || 'high',
    ...(options?.ttl && { time_to_live: options.ttl }),
    ...(options?.collapse_key && { collapse_key: options.collapse_key }),
  }

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        Authorization: `key=${FCM_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fcmPayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`FCM API 오류: ${response.status} - ${errorText}`)
    }

    const fcmResponse: FCMResponse = await response.json()
    results.success = fcmResponse.success
    results.failure = fcmResponse.failure

    // 실패한 토큰 기록
    if (fcmResponse.results) {
      fcmResponse.results.forEach((result, index) => {
        if (result.error) {
          results.errors.push(`Token ${index}: ${result.error}`)
        }
      })
    }

    console.log(`[FCM] 전송 결과 - 성공: ${results.success}, 실패: ${results.failure}`)
  } catch (error) {
    console.error('[FCM] 전송 실패:', error)
    results.failure = tokens.length
    results.errors.push(error.message)
  }

  return results
}

/**
 * Supabase에서 FCM 토큰 조회
 */
async function getTokensFromDatabase(
  supabase: ReturnType<typeof createClient>,
  options: {
    user_ids?: string[]
    roles?: number[]
    departments?: string[]
    broadcast?: boolean
  }
): Promise<string[]> {
  let query = supabase
    .from('user_fcm_tokens')
    .select('fcm_token, user_id, users!inner(role, department)')
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
    console.error('[DB] 토큰 조회 실패:', error)
    return []
  }

  // 중복 제거 후 토큰만 반환
  const tokens = [...new Set(data?.map((row) => row.fcm_token) || [])]
  console.log(`[DB] 조회된 토큰 수: ${tokens.length}`)

  return tokens
}

/**
 * 알림 로그 저장
 */
async function saveNotificationLog(
  supabase: ReturnType<typeof createClient>,
  request: PushNotificationRequest,
  result: { success: number; failure: number; errors: string[] }
): Promise<void> {
  try {
    await supabase.from('notification_logs').insert({
      type: request.data?.type || 'info',
      title: request.notification.title,
      body: request.notification.body,
      data: request.data,
      target_users: request.user_ids || [],
      target_roles: request.roles || [],
      target_departments: request.departments || [],
      is_broadcast: request.broadcast || false,
      success_count: result.success,
      failure_count: result.failure,
      errors: result.errors,
      sent_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[LOG] 알림 로그 저장 실패:', error)
  }
}

/**
 * 비활성 토큰 정리 (실패한 토큰 비활성화)
 */
async function cleanupInvalidTokens(
  supabase: ReturnType<typeof createClient>,
  tokens: string[],
  errors: string[]
): Promise<void> {
  // InvalidRegistration 또는 NotRegistered 오류가 있는 토큰 찾기
  const invalidTokenIndices: number[] = []
  errors.forEach((error, index) => {
    if (error.includes('InvalidRegistration') || error.includes('NotRegistered')) {
      const match = error.match(/Token (\d+):/)
      if (match) {
        invalidTokenIndices.push(parseInt(match[1]))
      }
    }
  })

  if (invalidTokenIndices.length === 0) return

  const invalidTokens = invalidTokenIndices.map((i) => tokens[i]).filter(Boolean)

  if (invalidTokens.length > 0) {
    try {
      await supabase
        .from('user_fcm_tokens')
        .update({ is_active: false })
        .in('fcm_token', invalidTokens)

      console.log(`[CLEANUP] ${invalidTokens.length}개 비활성 토큰 정리됨`)
    } catch (error) {
      console.error('[CLEANUP] 토큰 정리 실패:', error)
    }
  }
}

// 메인 핸들러
serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 환경 변수 확인
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase 환경 변수가 설정되지 않았습니다.')
    }

    // Supabase 클라이언트 생성 (서비스 롤 키 사용)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 요청 본문 파싱
    const request: PushNotificationRequest = await req.json()

    // 필수 필드 검증
    if (!request.notification?.title || !request.notification?.body) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'notification.title과 notification.body는 필수입니다.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 토큰 수집
    let tokens: string[] = []

    // 1. 직접 제공된 토큰
    if (request.token) {
      tokens.push(request.token)
    }
    if (request.tokens && request.tokens.length > 0) {
      tokens.push(...request.tokens)
    }

    // 2. 조건으로 토큰 조회
    if (
      request.user_ids ||
      request.roles ||
      request.departments ||
      request.broadcast
    ) {
      const dbTokens = await getTokensFromDatabase(supabase, {
        user_ids: request.user_ids,
        roles: request.roles,
        departments: request.departments,
        broadcast: request.broadcast,
      })
      tokens.push(...dbTokens)
    }

    // 중복 제거
    tokens = [...new Set(tokens)]

    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: '전송할 토큰이 없습니다.',
          sent: 0,
          failed: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`[PUSH] ${tokens.length}개 토큰에 알림 전송 시작`)

    // FCM 전송
    const result = await sendFCMNotification(
      tokens,
      request.notification,
      request.data,
      request.options
    )

    // 알림 로그 저장
    await saveNotificationLog(supabase, request, result)

    // 비활성 토큰 정리
    if (result.errors.length > 0) {
      await cleanupInvalidTokens(supabase, tokens, result.errors)
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: result.success,
        failed: result.failure,
        total: tokens.length,
        errors: result.errors.length > 0 ? result.errors : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('[ERROR]', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
