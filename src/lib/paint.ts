/**
 * 도색(Paint) 일정의 '지연(overdue)' 판정 — 단일 진실 공급원.
 *
 * 대시보드 '지연 중' 카운트, '지연된 도색' 목록, 도색 캘린더 색상/배지,
 * 도색 일정 목록의 '지연' 배지가 모두 이 로직을 사용해야 한다.
 *
 * 규칙 (예상 소요시간 76시간 기준):
 * - 완료/취소/일시정지: 지연 아님
 * - 예정일이 아직 안 지남(scheduled_date >= 오늘): 지연 아님
 * - 예정일 경과 + 미착수(scheduled): 지연 (착수 지연)
 * - 예정일 경과 + 진행중(in_progress): 시작 후 76시간을 초과했을 때만 지연
 *   (시작 후 76시간 이내면 정상 '진행중'으로 본다)
 *
 * 의존성 주의: 이 모듈은 스토어/dateUtils를 import하지 않는다(순환 의존 방지, 테스트 용이).
 * 타임존은 인자로 받으며 기본값은 공장 타임존(베트남)이다.
 */

import type { PaintSchedule } from '@/types'

/** 도색 작업의 예상 소요시간(시간). 진행중 작업이 이 시간을 넘기면 '지연'으로 전환된다. */
export const PAINT_EXPECTED_HOURS = 76

/** 공장(베트남) 기본 타임존. 화면 표시 전반이 이 타임존을 사용한다. */
const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh'

/** 주어진 시각을 특정 타임존 기준 'YYYY-MM-DD' 문자열로 반환. */
function dateStringInTimezone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** overdue 판정에 필요한 최소 형태 (스케줄 + 임베드된 실행 시작시각). */
export type PaintOverdueInput = {
  status: PaintSchedule['status']
  scheduled_date: string
  /** 평탄화된 시작시각(있으면 우선 사용). */
  started_at?: string | null
  /** PostgREST 임베드: paint_executions(started_at). */
  paint_executions?: ({ started_at?: string | null } | null)[] | null
}

/** 스케줄의 실제 시작 시각(ISO instant). 미시작이면 null. */
export function paintStartedAt(schedule: PaintOverdueInput): string | null {
  if (schedule.started_at) return schedule.started_at
  const starts = (schedule.paint_executions ?? [])
    .map((e) => e?.started_at)
    .filter((s): s is string => !!s)
  if (starts.length === 0) return null
  // 가장 이른 시작 시각을 작업 시작으로 본다.
  return starts.reduce((a, b) => (a < b ? a : b))
}

/**
 * 도색 스케줄이 '지연'인지 판정한다.
 * @param now 기준 시각 (테스트 주입용, 기본 현재)
 * @param timezone 기준 타임존 (기본 공장 타임존)
 */
export function isPaintScheduleOverdue(
  schedule: PaintOverdueInput,
  now: Date = new Date(),
  timezone: string = DEFAULT_TIMEZONE
): boolean {
  const { status } = schedule
  // 진행 가능한 상태(미착수/진행중)만 지연 후보. 완료/취소/일시정지는 제외.
  if (status !== 'scheduled' && status !== 'in_progress') return false

  const today = dateStringInTimezone(now, timezone) // 'YYYY-MM-DD'

  // 예정일이 아직 안 지났으면 지연 아님.
  if (schedule.scheduled_date >= today) return false

  if (status === 'in_progress') {
    const startedAt = paintStartedAt(schedule)
    // 진행중인데 시작시각을 알 수 없으면 보수적으로 지연 처리(예정일은 이미 경과).
    if (!startedAt) return true
    const hoursSinceStart = (now.getTime() - new Date(startedAt).getTime()) / 3_600_000
    return hoursSinceStart > PAINT_EXPECTED_HOURS
  }

  // scheduled(미착수) + 예정일 경과 → 착수 지연.
  return true
}
