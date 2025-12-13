/**
 * Server Push Notification Service
 * Supabase Edge Function을 통한 서버 사이드 푸시 알림 서비스
 *
 * 사용법:
 * import { serverPushService } from '@/services/serverPushService'
 *
 * // 긴급 수리 알림
 * await serverPushService.notifyEmergency({
 *   equipment_code: 'CNC-001',
 *   symptom: '스핀들 이상 소음'
 * })
 *
 * // PM 일정 알림
 * await serverPushService.notifyPMSchedule({
 *   schedule_id: 'uuid-here'
 * })
 *
 * // 사용자 지정 알림
 * await serverPushService.sendPush({
 *   user_ids: ['user-uuid'],
 *   notification: { title: '알림', body: '내용' },
 *   data: { type: 'info' }
 * })
 */

import { supabase, isMainSupabaseConnected } from '@/lib/supabase'
import type { NotificationType } from '@/stores/notificationStore'

// 푸시 알림 요청 타입
export interface PushNotificationRequest {
  // 대상 지정 (토큰 직접 지정)
  token?: string
  tokens?: string[]

  // 대상 지정 (조건)
  user_ids?: string[]
  roles?: number[]
  departments?: string[]
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

  // 옵션
  options?: {
    priority?: 'high' | 'normal'
    ttl?: number
    collapse_key?: string
  }
}

// 긴급 수리 알림 요청
export interface EmergencyNotificationRequest {
  equipment_code: string
  equipment_name?: string
  maintenance_id?: string
  symptom?: string
  building?: string
  target_roles?: number[]
  target_departments?: string[]
}

// PM 일정 알림 요청
export interface PMScheduleNotificationRequest {
  schedule_id?: string
  days_before?: number
  notify_assigned_only?: boolean
}

// 응답 타입
export interface PushNotificationResponse {
  success: boolean
  sent?: number
  failed?: number
  total?: number
  message?: string
  error?: string
  errors?: string[]
}

/**
 * 서버 푸시 알림 서비스 클래스
 */
class ServerPushService {
  private isEnabled: boolean = false

  constructor() {
    this.isEnabled = isMainSupabaseConnected()
  }

  /**
   * Edge Function 호출
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async invokeFunction<T>(
    functionName: string,
    body: any
  ): Promise<T> {
    if (!this.isEnabled || !supabase) {
      console.warn('[ServerPush] Supabase가 연결되지 않았습니다.')
      return { success: false, error: 'Supabase not connected' } as T
    }

    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
      })

      if (error) {
        console.error(`[ServerPush] ${functionName} 호출 실패:`, error)
        return { success: false, error: error.message } as T
      }

      return data as T
    } catch (err) {
      console.error(`[ServerPush] ${functionName} 오류:`, err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      } as T
    }
  }

  /**
   * 일반 푸시 알림 전송
   */
  async sendPush(request: PushNotificationRequest): Promise<PushNotificationResponse> {
    console.log('[ServerPush] 푸시 알림 전송:', request.notification.title)
    return this.invokeFunction<PushNotificationResponse>(
      'send-push-notification',
      request
    )
  }

  /**
   * 긴급 수리 알림 전송
   */
  async notifyEmergency(
    request: EmergencyNotificationRequest
  ): Promise<PushNotificationResponse> {
    console.log('[ServerPush] 긴급 수리 알림:', request.equipment_code)
    return this.invokeFunction<PushNotificationResponse>(
      'notify-emergency',
      request
    )
  }

  /**
   * PM 일정 알림 전송
   */
  async notifyPMSchedule(
    request: PMScheduleNotificationRequest = {}
  ): Promise<PushNotificationResponse> {
    console.log('[ServerPush] PM 일정 알림:', request)
    return this.invokeFunction<PushNotificationResponse>(
      'notify-pm-schedule',
      request
    )
  }

  /**
   * 장시간 수리 알림 전송
   */
  async notifyLongRepair(params: {
    equipment_code: string
    equipment_name?: string
    maintenance_id: string
    duration_minutes: number
    technician_id?: string
  }): Promise<PushNotificationResponse> {
    const hours = Math.floor(params.duration_minutes / 60)
    const minutes = params.duration_minutes % 60

    return this.sendPush({
      // 담당자와 관리자에게 알림
      user_ids: params.technician_id ? [params.technician_id] : undefined,
      roles: [1, 2], // Admin, Supervisor

      notification: {
        title: '장시간 수리 경고',
        body: `[${params.equipment_code}] 수리가 ${hours}시간 ${minutes}분을 초과했습니다.`,
      },
      data: {
        type: 'long_repair',
        equipment_code: params.equipment_code,
        maintenance_id: params.maintenance_id,
        url: '/maintenance/monitor',
        tag: `long-repair-${params.maintenance_id}`,
      },
      options: {
        priority: 'high',
        collapse_key: `long-repair-${params.maintenance_id}`,
      },
    })
  }

  /**
   * 수리 완료 알림 전송
   */
  async notifyRepairCompleted(params: {
    equipment_code: string
    equipment_name?: string
    maintenance_id: string
    technician_name?: string
    rating?: number
    notify_user_ids?: string[]
  }): Promise<PushNotificationResponse> {
    const ratingText = params.rating ? ` (평점: ${params.rating}/10)` : ''

    return this.sendPush({
      user_ids: params.notify_user_ids,
      roles: params.notify_user_ids ? undefined : [1, 2], // 대상 지정 없으면 Admin, Supervisor에게

      notification: {
        title: '수리 완료',
        body: `[${params.equipment_code}] 설비 수리가 완료되었습니다.${ratingText}`,
      },
      data: {
        type: 'completed',
        equipment_code: params.equipment_code,
        maintenance_id: params.maintenance_id,
        url: '/maintenance/history',
        tag: `completed-${params.maintenance_id}`,
      },
      options: {
        priority: 'normal',
      },
    })
  }

  /**
   * 설비 상태 변경 알림 전송
   */
  async notifyEquipmentStatusChange(params: {
    equipment_code: string
    equipment_name?: string
    old_status: string
    new_status: string
    building?: string
  }): Promise<PushNotificationResponse> {
    const statusNames: Record<string, string> = {
      normal: '정상',
      pm: 'PM',
      repair: '수리중',
      emergency: '긴급',
      standby: '대기',
    }

    return this.sendPush({
      roles: [1, 2], // Admin, Supervisor

      notification: {
        title: '설비 상태 변경',
        body: `[${params.equipment_code}] ${statusNames[params.old_status] || params.old_status} → ${statusNames[params.new_status] || params.new_status}`,
      },
      data: {
        type: 'info',
        equipment_code: params.equipment_code,
        url: '/equipment/list',
        tag: `status-${params.equipment_code}`,
      },
      options: {
        priority: params.new_status === 'emergency' ? 'high' : 'normal',
        collapse_key: `status-${params.equipment_code}`,
      },
    })
  }

  /**
   * 특정 사용자에게 알림 전송
   */
  async notifyUser(params: {
    user_id: string
    title: string
    body: string
    type?: NotificationType
    url?: string
  }): Promise<PushNotificationResponse> {
    return this.sendPush({
      user_ids: [params.user_id],
      notification: {
        title: params.title,
        body: params.body,
      },
      data: {
        type: params.type || 'info',
        url: params.url || '/',
      },
    })
  }

  /**
   * 전체 사용자에게 브로드캐스트 알림
   */
  async broadcast(params: {
    title: string
    body: string
    type?: NotificationType
    url?: string
  }): Promise<PushNotificationResponse> {
    return this.sendPush({
      broadcast: true,
      notification: {
        title: params.title,
        body: params.body,
      },
      data: {
        type: params.type || 'info',
        url: params.url || '/',
      },
    })
  }

  /**
   * 서비스 활성화 상태 확인
   */
  isReady(): boolean {
    return this.isEnabled
  }
}

// 싱글톤 인스턴스
export const serverPushService = new ServerPushService()

export default serverPushService
