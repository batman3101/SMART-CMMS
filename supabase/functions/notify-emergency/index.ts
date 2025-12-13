/**
 * Supabase Edge Function: notify-emergency
 * 긴급 수리 발생 시 푸시 알림 전송
 *
 * 트리거: maintenance_records 테이블에 repair_type = 'EM' 레코드 삽입 시
 * 또는 클라이언트에서 직접 호출
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  createSupabaseClient,
  getTokensByCondition,
  sendFCM,
  saveInAppNotification,
  corsHeaders,
  jsonResponse,
  errorResponse,
} from '../_shared/fcm.ts'

interface EmergencyRequest {
  equipment_code: string
  equipment_name?: string
  maintenance_id?: string
  symptom?: string
  building?: string
  // 알림 대상 (선택)
  target_roles?: number[] // 기본: [1, 2, 3] - Admin, Supervisor, Technician
  target_departments?: string[]
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createSupabaseClient()
    const request: EmergencyRequest = await req.json()

    // 필수 필드 검증
    if (!request.equipment_code) {
      return errorResponse('equipment_code는 필수입니다.', 400)
    }

    console.log(`[Emergency] 긴급 수리 알림 - 설비: ${request.equipment_code}`)

    // 알림 대상 토큰 조회 (기본: Admin, Supervisor, Technician)
    const tokens = await getTokensByCondition(supabase, {
      roles: request.target_roles || [1, 2, 3],
      departments: request.target_departments,
      notification_type: 'emergency',
    })

    // 알림 메시지 구성
    const title = '긴급수리 발생'
    const body = request.symptom
      ? `[${request.equipment_code}] ${request.symptom}`
      : `${request.equipment_code} 설비에서 긴급수리가 요청되었습니다.`

    // FCM 푸시 전송
    const result = await sendFCM(tokens, {
      notification: { title, body },
      data: {
        type: 'emergency',
        equipment_code: request.equipment_code,
        equipment_name: request.equipment_name || '',
        maintenance_id: request.maintenance_id || '',
        building: request.building || '',
        url: '/maintenance/monitor',
        tag: `emergency-${request.equipment_code}-${Date.now()}`,
      },
      options: {
        priority: 'high',
        collapse_key: `emergency-${request.equipment_code}`,
      },
    })

    // 인앱 알림 저장 (대상 사용자들에게)
    const { data: targetUsers } = await supabase
      .from('users')
      .select('id')
      .in('role', request.target_roles || [1, 2, 3])
      .eq('is_active', true)

    if (targetUsers && targetUsers.length > 0) {
      await saveInAppNotification(
        supabase,
        targetUsers.map((u) => u.id),
        {
          type: 'emergency',
          title,
          message: body,
          data: {
            equipment_code: request.equipment_code,
            maintenance_id: request.maintenance_id,
          },
        }
      )
    }

    return jsonResponse({
      success: true,
      sent: result.success,
      failed: result.failure,
      message: `긴급 수리 알림 전송 완료: ${request.equipment_code}`,
    })
  } catch (error) {
    console.error('[Emergency] 오류:', error)
    return errorResponse(error.message)
  }
})
