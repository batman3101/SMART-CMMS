/**
 * 날짜/시간 유틸리티 함수
 * 설정된 타임존을 기반으로 날짜를 처리
 */

import { useSettingsStore } from '@/stores/settingsStore'

/**
 * 현재 설정된 타임존 가져오기
 */
export function getConfiguredTimezone(): string {
  return useSettingsStore.getState().settings.timezone
}

/**
 * 타임존을 적용한 현재 날짜/시간 가져오기
 */
export function getCurrentDateInTimezone(timezone?: string): Date {
  const tz = timezone || getConfiguredTimezone()
  const now = new Date()

  // 타임존에 맞는 날짜 문자열 생성
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(now)
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0'

  return new Date(
    parseInt(getPart('year')),
    parseInt(getPart('month')) - 1,
    parseInt(getPart('day')),
    parseInt(getPart('hour')),
    parseInt(getPart('minute')),
    parseInt(getPart('second'))
  )
}

/**
 * 타임존 기준 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
export function getTodayInTimezone(timezone?: string): string {
  const tz = timezone || getConfiguredTimezone()
  const now = new Date()

  return now.toLocaleDateString('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * Date 객체를 타임존 기준 YYYY-MM-DD 문자열로 변환
 */
export function formatDateInTimezone(date: Date, timezone?: string): string {
  const tz = timezone || getConfiguredTimezone()

  return date.toLocaleDateString('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * Date 객체를 로컬(브라우저) 타임존 기준 YYYY-MM-DD 문자열로 변환
 * (타임존 설정 없이 순수 로컬 시간 사용)
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * YYYY-MM-DD 문자열을 로컬 Date 객체로 파싱 (타임존 오프셋 문제 방지)
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * 날짜를 사용자 친화적 형식으로 표시 (타임존 적용)
 */
export function formatDisplayDate(
  date: Date | string,
  locale: string = 'ko-KR',
  timezone?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const tz = timezone || getConfiguredTimezone()
  const dateObj = typeof date === 'string' ? new Date(date) : date

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }

  return dateObj.toLocaleDateString(locale, { ...defaultOptions, ...options })
}

/**
 * 날짜+시간을 사용자 친화적 형식으로 표시 (타임존 적용)
 */
export function formatDisplayDateTime(
  date: Date | string,
  locale: string = 'ko-KR',
  timezone?: string
): string {
  const tz = timezone || getConfiguredTimezone()
  const dateObj = typeof date === 'string' ? new Date(date) : date

  return dateObj.toLocaleString(locale, {
    timeZone: tz,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 시간만 표시 (타임존 적용)
 */
export function formatDisplayTime(
  date: Date | string,
  locale: string = 'ko-KR',
  timezone?: string
): string {
  const tz = timezone || getConfiguredTimezone()
  const dateObj = typeof date === 'string' ? new Date(date) : date

  return dateObj.toLocaleTimeString(locale, {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 설정된 타임존 기준으로 오늘로부터 N일 오프셋된 날짜를 YYYY-MM-DD 형식으로 반환
 * (양수: 미래, 음수: 과거)
 */
export function getRelativeDateInTimezone(daysOffset: number, timezone?: string): string {
  const tz = timezone || getConfiguredTimezone()
  const now = new Date()

  // 타임존 기준 현재 날짜 부품 추출
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(now)
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0'

  // 타임존 기준 오늘 Date 생성 후 오프셋 적용
  const localDate = new Date(
    parseInt(getPart('year')),
    parseInt(getPart('month')) - 1,
    parseInt(getPart('day'))
  )
  localDate.setDate(localDate.getDate() + daysOffset)

  const y = localDate.getFullYear()
  const m = String(localDate.getMonth() + 1).padStart(2, '0')
  const d = String(localDate.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 설정된 타임존 기준 이번 달 시작일 (YYYY-MM-01) 반환
 */
export function getMonthStartInTimezone(timezone?: string): string {
  const tz = timezone || getConfiguredTimezone()
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
  })
  const parts = formatter.formatToParts(now)
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '01'
  return `${getPart('year')}-${getPart('month')}-01`
}

/**
 * 설정된 타임존 기준 이번 달 마지막일 (YYYY-MM-DD) 반환
 */
export function getMonthEndInTimezone(timezone?: string): string {
  const tz = timezone || getConfiguredTimezone()
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
  })
  const parts = formatter.formatToParts(now)
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '01'

  const year = parseInt(getPart('year'))
  const month = parseInt(getPart('month'))
  const lastDay = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

/**
 * 현재 시각을 설정된 타임존 기준 YYYY-MM-DD 형식으로 반환
 */
export function getNowDateString(timezone?: string): string {
  return getTodayInTimezone(timezone)
}

/**
 * 현재 시각을 설정된 타임존 기준 YYYY-MM-DDTHH:mm 형식으로 반환
 * (datetime-local input 및 DB 저장용)
 */
export function getNowDateTimeString(timezone?: string): string {
  const tz = timezone || getConfiguredTimezone()
  const now = new Date()

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(now)
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00'

  const year = getPart('year')
  const month = getPart('month')
  const day = getPart('day')
  let hour = getPart('hour')
  const minute = getPart('minute')

  // 24:xx → 00:xx 보정
  if (hour === '24') hour = '00'

  return `${year}-${month}-${day}T${hour}:${minute}`
}

/**
 * 현재 시각을 DB 저장용 UTC instant(ISO 8601, 'Z')로 반환.
 *
 * start_time/end_time 등 timestamptz 컬럼에는 반드시 이 "진짜 instant"를 저장해야 한다.
 * getNowDateTimeString()이 만드는 오프셋 없는 벽시계 문자열(예: "2026-06-25T16:08")을
 * timestamptz에 넣으면 Postgres가 UTC로 해석해 저장하고, 화면에서 다시 설정 타임존
 * (베트남, +7)으로 변환되면서 7시간 밀린 야간 시간으로 표시되는 버그가 발생한다.
 * 벽시계 문자열은 datetime-local 입력 표시 용도로만 사용한다.
 */
export function getNowInstantISO(): string {
  return new Date().toISOString()
}

/**
 * 특정 시점에 주어진 타임존이 UTC보다 앞서는 오프셋(ms)을 반환한다.
 * (예: 베트남 Asia/Ho_Chi_Minh → +7h → 25200000)
 */
function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const map: Record<string, number> = {}
  for (const p of formatter.formatToParts(date)) {
    if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10)
  }
  const asUtc = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second)
  return asUtc - date.getTime()
}

/**
 * 저장된 instant(timestamptz, ISO)를 설정 타임존 기준 datetime-local 입력용
 * 'YYYY-MM-DDTHH:mm' 문자열로 변환한다. (수정 폼에서 기존 시각을 채울 때 사용)
 */
export function instantToInputString(iso: string, timezone?: string): string {
  const tz = timezone || getConfiguredTimezone()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(new Date(iso))
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00'

  let hour = getPart('hour')
  if (hour === '24') hour = '00'

  return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${hour}:${getPart('minute')}`
}

/**
 * datetime-local 입력값('YYYY-MM-DDTHH:mm', 설정 타임존 벽시계)을
 * DB 저장용 UTC instant(ISO)로 변환한다.
 *
 * 벽시계 문자열을 그대로 timestamptz에 저장하면 UTC로 해석돼 표시 시 +7시간 밀린다.
 * (베트남은 DST가 없어 오프셋이 일정하지만, 오프셋을 동적 계산해 일반적으로 처리한다)
 */
export function inputStringToInstantISO(input: string, timezone?: string): string {
  const tz = timezone || getConfiguredTimezone()
  const [datePart, timePart] = input.replace(' ', 'T').split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = (timePart || '00:00').split(':').map(Number)

  // 입력 구성요소를 UTC로 가정한 임시 instant
  const guessUtcMs = Date.UTC(year, month - 1, day, hour, minute)
  // 해당 시점 tz 오프셋(ms)을 빼서 실제 instant 산출
  const offsetMs = getTimezoneOffsetMs(new Date(guessUtcMs), tz)
  return new Date(guessUtcMs - offsetMs).toISOString()
}

/**
 * 현재 시각을 설정된 타임존 기준 표시용 문자열로 반환
 * (예: "2026-02-06 오전 11:32")
 */
export function getNowDisplayString(locale: string = 'ko-KR', timezone?: string): string {
  const tz = timezone || getConfiguredTimezone()
  const now = new Date()

  return now.toLocaleString(locale, {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
