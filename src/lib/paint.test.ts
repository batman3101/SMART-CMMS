import { describe, it, expect } from 'vitest'
import { isPaintScheduleOverdue, paintStartedAt, PAINT_EXPECTED_HOURS, type PaintOverdueInput } from './paint'

const TZ = 'Asia/Ho_Chi_Minh'
// 기준 시각: 2026-06-25 11:00 UTC = 2026-06-25 18:00 (베트남) → 오늘(VN) = 2026-06-25
const NOW = new Date('2026-06-25T11:00:00Z')

/** NOW 기준 hoursAgo 시간 전 ISO instant */
const startedHoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString()

const sched = (over: Partial<PaintOverdueInput>): PaintOverdueInput => ({
  status: 'in_progress',
  scheduled_date: '2026-06-23',
  ...over,
})

describe('isPaintScheduleOverdue', () => {
  it('완료/취소/일시정지는 예정일이 지나도 지연 아님', () => {
    expect(isPaintScheduleOverdue(sched({ status: 'completed' }), NOW, TZ)).toBe(false)
    expect(isPaintScheduleOverdue(sched({ status: 'cancelled' }), NOW, TZ)).toBe(false)
    expect(isPaintScheduleOverdue(sched({ status: 'paused' }), NOW, TZ)).toBe(false)
  })

  it('예정일이 미래면 지연 아님', () => {
    expect(isPaintScheduleOverdue(sched({ status: 'scheduled', scheduled_date: '2026-06-26' }), NOW, TZ)).toBe(false)
  })

  it('예정일이 오늘이면 지연 아님(아직 안 지남)', () => {
    expect(isPaintScheduleOverdue(sched({ status: 'in_progress', scheduled_date: '2026-06-25', started_at: startedHoursAgo(100) }), NOW, TZ)).toBe(false)
  })

  it('예정일 경과 + 미착수(scheduled)는 지연', () => {
    expect(isPaintScheduleOverdue(sched({ status: 'scheduled', scheduled_date: '2026-06-23' }), NOW, TZ)).toBe(true)
  })

  it('진행중 + 예정일 경과 + 시작 후 76h 이내면 진행중(지연 아님)', () => {
    expect(isPaintScheduleOverdue(sched({ started_at: startedHoursAgo(50) }), NOW, TZ)).toBe(false)
    expect(isPaintScheduleOverdue(sched({ started_at: startedHoursAgo(75.9) }), NOW, TZ)).toBe(false)
  })

  it('진행중 + 예정일 경과 + 시작 후 76h 초과면 지연', () => {
    expect(isPaintScheduleOverdue(sched({ started_at: startedHoursAgo(80) }), NOW, TZ)).toBe(true)
  })

  it('정확히 76h는 아직 지연 아님(초과만 지연)', () => {
    expect(isPaintScheduleOverdue(sched({ started_at: startedHoursAgo(PAINT_EXPECTED_HOURS) }), NOW, TZ)).toBe(false)
  })

  it('진행중인데 시작시각 불명이면 보수적으로 지연 처리', () => {
    expect(isPaintScheduleOverdue(sched({ started_at: null, paint_executions: [] }), NOW, TZ)).toBe(true)
  })

  it('임베드된 paint_executions에서 시작시각을 읽는다', () => {
    const s = sched({ started_at: undefined, paint_executions: [{ started_at: startedHoursAgo(50) }] })
    expect(paintStartedAt(s)).toBe(startedHoursAgo(50))
    expect(isPaintScheduleOverdue(s, NOW, TZ)).toBe(false)
  })

  it('실제 사례: CNC-111(예정 06-23, 06-22 13:57 시작, ~69h 경과) → 진행중', () => {
    const s = sched({ scheduled_date: '2026-06-23', started_at: '2026-06-22T13:57:57Z' })
    expect(isPaintScheduleOverdue(s, NOW, TZ)).toBe(false)
  })
})
