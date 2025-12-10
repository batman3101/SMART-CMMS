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
