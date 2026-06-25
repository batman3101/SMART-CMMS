/**
 * Equipment grade computation (설비 등급 산정).
 *
 * Single source of truth for the threshold -> grade logic, per the ALMUS CNC
 * classification standard. The database stores per-item measurements and a cached
 * overall grade; this module decides each item's grade and the overall grade so
 * the UI can preview live and so the rules are unit-tested in one place.
 *
 * Overall rule: a machine is only as good as its weakest *included* measurement,
 * so the overall grade is the WORST item grade among included, measured items.
 */

import type { GradeLetter, GradeComparison, EquipmentGradeCriteria } from '@/types'

// Best -> worst. Index doubles as the rank (0 = best).
export const GRADE_ORDER: readonly GradeLetter[] = ['A+', 'A', 'B', 'C', 'D'] as const

export function gradeRank(grade: GradeLetter): number {
  return GRADE_ORDER.indexOf(grade)
}

/** The worse (lower) of two grades. */
export function worseGrade(a: GradeLetter, b: GradeLetter): GradeLetter {
  return gradeRank(a) >= gradeRank(b) ? a : b
}

/** Just the fields needed to grade a single measurement. */
export type GradeCriteriaSpec = Pick<
  EquipmentGradeCriteria,
  | 'comparison'
  | 'threshold_a_plus'
  | 'threshold_a'
  | 'threshold_b'
  | 'threshold_c'
  | 'range_min'
  | 'range_max'
>

/** A measurement entry (only the relevant field is used per comparison type). */
export interface GradeMeasurement {
  measured_value?: number | null
  measured_bool?: boolean | null
  measured_text?: string | null
}

const GRADE_LEVELS: readonly GradeLetter[] = ['A+', 'A', 'B', 'C'] as const

/** Whether a measurement carries the input this criteria needs to be graded. */
export function hasMeasurement(comparison: GradeComparison, m: GradeMeasurement): boolean {
  if (comparison === 'pass_fail') {
    return m.measured_bool === true || m.measured_bool === false
  }
  return typeof m.measured_value === 'number' && Number.isFinite(m.measured_value)
}

/**
 * Grade a single measurement. Returns null when the item has not been measured
 * (so an unmeasured item neither helps nor hurts the overall grade).
 */
export function computeItemGrade(
  criteria: GradeCriteriaSpec,
  m: GradeMeasurement
): GradeLetter | null {
  const { comparison } = criteria

  if (comparison === 'pass_fail') {
    if (m.measured_bool === true) return 'A+'   // pass: non-limiting (go/no-go item)
    if (m.measured_bool === false) return 'D'   // fail
    return null
  }

  const value = m.measured_value
  if (typeof value !== 'number' || !Number.isFinite(value)) return null

  if (comparison === 'range') {
    const min = criteria.range_min
    const max = criteria.range_max
    const aboveMin = min == null || value >= min
    const belowMax = max == null || value <= max
    return aboveMin && belowMax ? 'A+' : 'D'    // in range: non-limiting; out of range: D
  }

  const thresholds: (number | null)[] = [
    criteria.threshold_a_plus,
    criteria.threshold_a,
    criteria.threshold_b,
    criteria.threshold_c,
  ]

  const passes = (t: number): boolean =>
    comparison === 'lower_is_better' ? value <= t : value >= t // higher_is_better & level_count

  for (let i = 0; i < GRADE_LEVELS.length; i++) {
    const t = thresholds[i]
    if (t != null && passes(t)) return GRADE_LEVELS[i]
  }
  return 'D'
}

/**
 * Overall equipment grade = worst grade among the supplied item grades.
 * Returns null when there are no graded items (i.e. unevaluated equipment).
 */
export function computeOverallGrade(itemGrades: (GradeLetter | null | undefined)[]): GradeLetter | null {
  let worst: GradeLetter | null = null
  for (const g of itemGrades) {
    if (!g) continue
    worst = worst == null ? g : worseGrade(worst, g)
  }
  return worst
}

/** Row pairing a criteria with its current measurement (for checksheet computation). */
export interface ChecksheetEntry {
  criteria: EquipmentGradeCriteria
  measurement: GradeMeasurement
}

/**
 * Compute the overall grade from a full checksheet: grade each *active* item, then
 * take the worst among items flagged `included_in_grade`. Excluded items are still
 * graded (for display) but never affect the overall result.
 */
export function computeChecksheetGrade(entries: ChecksheetEntry[]): {
  overall: GradeLetter | null
  itemGrades: Record<string, GradeLetter | null>
  measuredCount: number
  includedTotal: number
  total: number
} {
  const itemGrades: Record<string, GradeLetter | null> = {}
  const includedGrades: (GradeLetter | null)[] = []
  let measuredCount = 0
  let includedTotal = 0
  let total = 0 // all active items shown on the checksheet (incl. grade-excluded ones)

  for (const { criteria, measurement } of entries) {
    if (!criteria.is_active) continue
    total++
    const grade = computeItemGrade(criteria, measurement)
    itemGrades[criteria.id] = grade
    if (grade != null) measuredCount++
    if (criteria.included_in_grade) {
      includedTotal++
      includedGrades.push(grade)
    }
  }

  return {
    overall: computeOverallGrade(includedGrades),
    itemGrades,
    measuredCount,
    includedTotal,
    total,
  }
}

/** Tailwind classes for a grade badge (A+ best/green … D worst/red). null = unevaluated. */
export function gradeBadgeClass(grade: GradeLetter | null | undefined): string {
  switch (grade) {
    case 'A+':
      return 'bg-emerald-500 text-white border-transparent'
    case 'A':
      return 'bg-green-500 text-white border-transparent'
    case 'B':
      return 'bg-blue-500 text-white border-transparent'
    case 'C':
      return 'bg-amber-500 text-white border-transparent'
    case 'D':
      return 'bg-red-500 text-white border-transparent'
    default:
      return 'bg-muted text-muted-foreground border-transparent'
  }
}
