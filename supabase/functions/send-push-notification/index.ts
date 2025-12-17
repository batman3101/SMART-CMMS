/**
 * Supabase Edge Function: send-push-notification
 * FCM v1 API를 통해 푸시 알림을 전송하는 서버사이드 함수
 *
 * 환경 변수 필요:
 * - FIREBASE_PROJECT_ID: Firebase 프로젝트 ID
 * - FIREBASE_CLIENT_EMAIL: Firebase 서비스 계정 이메일
 * - FIREBASE_PRIVATE_KEY: Firebase 서비스 계정 비공개 키
 * - SUPABASE_URL: Supabase 프로젝트 URL
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase 서비스 롤 키
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create } from 'https://deno.land/x/djwt@v2.8/mod.ts'

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

/**
 * Firebase 서비스 계정으로 OAuth 2.0 액세스 토큰 획득
 */
async function getAccessToken(): Promise<string> {
  const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL')
  const privateKey = Deno.env.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n')

  if (!clientEmail || !privateKey) {
    throw new Error('Firebase 서비스 계정 환경 변수가 설정되지 않았습니다.')
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  }

  // PEM 형식의 비공개 키 파싱
  const pemHeader = '-----BEGIN PRIVATE KEY-----'
  const pemFooter = '-----END PRIVATE KEY-----'
  const pemContents = privateKey.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '')
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const jwt = await create({ alg: 'RS256', typ: 'JWT' }, payload, cryptoKey)

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!tokenResponse.ok) {
    throw new Error(`OAuth 토큰 요청 실패: ${await tokenResponse.text()}`)
  }

  const { access_token } = await tokenResponse.json()
  return access_token
}

/**
 * FCM v1 API를 통해 푸시 알림 전송
 */
async function sendFCMNotification(
  tokens: string[],
  notification: PushNotificationRequest['notification'],
  data: PushNotificationRequest['data'],
  options: PushNotificationRequest['options']
): Promise<{ success: number; failure: number; errors: string[] }> {
  const projectId = Deno.env.get('FIREBASE_PROJECT_ID')

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID 환경 변수가 설정되지 않았습니다.')
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

  // OAuth 2.0 액세스 토큰 획득
  const accessToken = await getAccessToken()
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`

  // 각 토큰에 대해 개별 전송 (FCM v1 API는 개별 전송만 지원)
  for (const token of tokens) {
    const message = {
      message: {
        token,
        notification: {
          title: notification.title,
          body: notification.body,
          ...(notification.image && { image: notification.image }),
        },
        webpush: {
          notification: {
            icon: '/A symbol BLUE-02.png',
            badge: '/A symbol BLUE-02.png',
            tag: data?.tag || `notification-${Date.now()}`,
          },
          fcm_options: {
            link: data?.url || '/',
          },
        },
        data: data ? Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v || '')])
        ) : undefined,
        android: {
          priority: options?.priority === 'normal' ? 'normal' : 'high',
          ...(options?.collapse_key && { collapse_key: options.collapse_key }),
        },
      },
    }

    try {
      const response = await fetch(fcmUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(message),
      })

      const result = await response.json()

      if (response.ok && result.name) {
        results.success++
      } else {
        results.failure++
        results.errors.push(`Token error: ${result.error?.message || 'Unknown error'}`)
      }
    } catch (error) {
      results.failure++
      results.errors.push(`Send error: ${error.message}`)
    }
  }

  console.log(`[FCM v1] 전송 결과 - 성공: ${results.success}, 실패: ${results.failure}`)
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
