/**
 * Supabase Edge Function: notify-pm-schedule
 * PM 일정 알림 전송 (예정일 전 알림)
 *
 * 트리거: Supabase Cron Job으로 매일 실행
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

interface PMScheduleRequest {
  // 특정 일정만 알림 (선택)
  schedule_id?: string

  // 또는 기간별 일정 조회
  days_before?: number // 며칠 전 일정 알림 (기본: 0 = 당일)

  // 알림 대상 (선택)
  notify_assigned_only?: boolean // 담당자에게만 알림 (기본: true)
}

interface PMSchedule {
  id: string
  equipment_id: string
  scheduled_date: string
  assigned_technician_id: string | null
  priority: string
  pm_templates: {
    name: string
    name_ko: string
    name_vi: string
  }
  equipments: {
    equipment_code: string
    equipment_name: string
    equipment_name_ko: string
    building: string
  }
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createSupabaseClient()
    const request: PMScheduleRequest = await req.json().catch(() => ({}))

    const daysBefore = request.days_before ?? 0
    const notifyAssignedOnly = request.notify_assigned_only ?? true

    console.log(`[PM Schedule] 알림 전송 시작 - ${daysBefore}일 전 일정`)

    // 대상 날짜 계산
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + daysBefore)
    const targetDateStr = targetDate.toISOString().split('T')[0]

    // PM 일정 조회
    let query = supabase
      .from('pm_schedules')
      .select(`
        id,
        equipment_id,
        scheduled_date,
        assigned_technician_id,
        priority,
        pm_templates (
          name,
          name_ko,
          name_vi
        ),
        equipments (
          equipment_code,
          equipment_name,
          equipment_name_ko,
          building
        )
      `)
      .eq('status', 'scheduled')

    // 특정 일정 또는 날짜 필터
    if (request.schedule_id) {
      query = query.eq('id', request.schedule_id)
    } else {
      query = query.eq('scheduled_date', targetDateStr)
    }

    const { data: schedules, error } = await query

    if (error) {
      throw new Error(`PM 일정 조회 실패: ${error.message}`)
    }

    if (!schedules || schedules.length === 0) {
      return jsonResponse({
        success: true,
        message: '알림할 PM 일정이 없습니다.',
        sent: 0,
      })
    }

    console.log(`[PM Schedule] ${schedules.length}개 일정 발견`)

    let totalSuccess = 0
    let totalFailure = 0

    // 각 일정에 대해 알림 전송
    for (const schedule of schedules as PMSchedule[]) {
      const equipment = schedule.equipments
      const template = schedule.pm_templates

      if (!equipment || !template) continue

      // 알림 대상 결정
      let targetUserIds: string[] = []

      if (notifyAssignedOnly && schedule.assigned_technician_id) {
        // 담당자에게만 알림
        targetUserIds = [schedule.assigned_technician_id]
      } else {
        // 관련 역할 모두에게 알림
        const { data: users } = await supabase
          .from('users')
          .select('id')
          .in('role', [1, 2, 3])
          .eq('is_active', true)

        targetUserIds = users?.map((u) => u.id) || []
      }

      if (targetUserIds.length === 0) continue

      // 토큰 조회
      const tokens = await getTokensByCondition(supabase, {
        user_ids: targetUserIds,
        notification_type: 'pm_schedule',
      })

      // 알림 메시지 구성
      const daysText =
        daysBefore === 0
          ? '오늘'
          : daysBefore === 1
          ? '내일'
          : `${daysBefore}일 후`

      const title = `PM 일정 알림 (${daysText})`
      const body = `[${equipment.equipment_code}] ${template.name_ko || template.name} 정기점검 예정`

      // FCM 전송
      const result = await sendFCM(tokens, {
        notification: { title, body },
        data: {
          type: 'pm_schedule',
          equipment_code: equipment.equipment_code,
          equipment_name: equipment.equipment_name_ko || equipment.equipment_name,
          schedule_id: schedule.id,
          scheduled_date: schedule.scheduled_date,
          priority: schedule.priority,
          url: `/pm/schedules/${schedule.id}`,
          tag: `pm-${schedule.id}`,
        },
        options: {
          priority: schedule.priority === 'high' ? 'high' : 'normal',
          collapse_key: `pm-${schedule.id}`,
        },
      })

      totalSuccess += result.success
      totalFailure += result.failure

      // 인앱 알림 저장
      await saveInAppNotification(supabase, targetUserIds, {
        type: 'pm_schedule',
        title,
        message: body,
        data: {
          equipment_code: equipment.equipment_code,
          schedule_id: schedule.id,
          scheduled_date: schedule.scheduled_date,
        },
      })

      // PM 일정에 알림 전송 기록 업데이트
      const notificationField =
        daysBefore === 3
          ? 'notified_3days'
          : daysBefore === 1
          ? 'notified_1day'
          : 'notified_today'

      await supabase
        .from('pm_schedules')
        .update({ [notificationField]: true })
        .eq('id', schedule.id)
    }

    return jsonResponse({
      success: true,
      message: `PM 일정 알림 전송 완료`,
      schedules_count: schedules.length,
      sent: totalSuccess,
      failed: totalFailure,
    })
  } catch (error) {
    console.error('[PM Schedule] 오류:', error)
    return errorResponse(error.message)
  }
})
