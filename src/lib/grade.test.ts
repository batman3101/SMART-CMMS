import { describe, it, expect } from 'vitest'
import {
  computeItemGrade,
  computeOverallGrade,
  computeChecksheetGrade,
  worseGrade,
  gradeRank,
  hasMeasurement,
  type GradeCriteriaSpec,
  type ChecksheetEntry,
} from './grade'
import type { EquipmentGradeCriteria, GradeComparison } from '@/types'

// --- helpers ---------------------------------------------------------------

function spec(
  comparison: GradeComparison,
  thresholds: Partial<GradeCriteriaSpec> = {}
): GradeCriteriaSpec {
  return {
    comparison,
    threshold_a_plus: null,
    threshold_a: null,
    threshold_b: null,
    threshold_c: null,
    range_min: null,
    range_max: null,
    ...thresholds,
  }
}

let idSeq = 0
function criteria(over: Partial<EquipmentGradeCriteria>): EquipmentGradeCriteria {
  return {
    id: `c${idSeq++}`,
    item_no: 0,
    ref_no: null,
    category_ko: null, category_vi: null,
    item_ko: null, item_vi: null,
    position_ko: null, position_vi: null,
    condition_ko: null, condition_vi: null,
    device_ko: null, device_vi: null,
    unit: null,
    comparison: 'lower_is_better',
    threshold_a_plus: null, threshold_a: null, threshold_b: null, threshold_c: null,
    range_min: null, range_max: null,
    raw_a_plus: null, raw_a: null, raw_b: null, raw_c: null, raw_d: null,
    included_in_grade: true,
    display_order: 0,
    is_active: true,
    ...over,
  }
}

// Runout spindle: ≤3 A+, ≤6 A, ≤8 B, ≤10 C, >10 D
const LOWER = spec('lower_is_better', {
  threshold_a_plus: 3, threshold_a: 6, threshold_b: 8, threshold_c: 10,
})
// Clamping force: ≥2.7 A+, ≥2.2 A, ≥2.0 B, ≥1.8 C, <1.8 D
const HIGHER = spec('higher_is_better', {
  threshold_a_plus: 2.7, threshold_a: 2.2, threshold_b: 2.0, threshold_c: 1.8,
})
// Balancer: 9 A+, 8 A, 7 B, 6 C, <6 D
const LEVEL = spec('level_count', {
  threshold_a_plus: 9, threshold_a: 8, threshold_b: 7, threshold_c: 6,
})
// Air pressure: in [2,10] passes (A+), else D
const RANGE = spec('range', { range_min: 2, range_max: 10 })
const PASSFAIL = spec('pass_fail')

// --- gradeRank / worseGrade ------------------------------------------------

describe('gradeRank / worseGrade', () => {
  it('orders A+ best to D worst', () => {
    expect(gradeRank('A+')).toBe(0)
    expect(gradeRank('A')).toBe(1)
    expect(gradeRank('B')).toBe(2)
    expect(gradeRank('C')).toBe(3)
    expect(gradeRank('D')).toBe(4)
  })

  it('worseGrade returns the lower grade', () => {
    expect(worseGrade('A+', 'C')).toBe('C')
    expect(worseGrade('D', 'A')).toBe('D')
    expect(worseGrade('B', 'B')).toBe('B')
  })
})

// --- lower_is_better -------------------------------------------------------

describe('computeItemGrade: lower_is_better', () => {
  it.each([
    [3, 'A+'], [1, 'A+'],            // at/under tightest bound
    [3.5, 'A'], [6, 'A'],
    [7, 'B'], [8, 'B'],
    [9, 'C'], [10, 'C'],
    [10.1, 'D'], [50, 'D'],
  ])('value %p -> %s', (value, expected) => {
    expect(computeItemGrade(LOWER, { measured_value: value })).toBe(expected)
  })
})

// --- higher_is_better ------------------------------------------------------

describe('computeItemGrade: higher_is_better', () => {
  it.each([
    [2.7, 'A+'], [3.0, 'A+'],
    [2.2, 'A'], [2.5, 'A'],
    [2.0, 'B'], [2.1, 'B'],
    [1.8, 'C'], [1.9, 'C'],
    [1.79, 'D'], [0, 'D'],
  ])('value %p -> %s', (value, expected) => {
    expect(computeItemGrade(HIGHER, { measured_value: value })).toBe(expected)
  })
})

// --- level_count -----------------------------------------------------------

describe('computeItemGrade: level_count', () => {
  it.each([
    [9, 'A+'], [10, 'A+'],
    [8, 'A'], [7, 'B'], [6, 'C'],
    [5, 'D'], [0, 'D'],
  ])('levels %p -> %s', (value, expected) => {
    expect(computeItemGrade(LEVEL, { measured_value: value })).toBe(expected)
  })
})

// --- range -----------------------------------------------------------------

describe('computeItemGrade: range', () => {
  it.each([
    [2, 'A+'], [6, 'A+'], [10, 'A+'],   // in range -> non-limiting
    [1.9, 'D'], [10.1, 'D'], [0, 'D'],  // out of range -> D
  ])('value %p -> %s', (value, expected) => {
    expect(computeItemGrade(RANGE, { measured_value: value })).toBe(expected)
  })
})

// --- pass_fail -------------------------------------------------------------

describe('computeItemGrade: pass_fail', () => {
  it('OK (true) -> A+, NG (false) -> D', () => {
    expect(computeItemGrade(PASSFAIL, { measured_bool: true })).toBe('A+')
    expect(computeItemGrade(PASSFAIL, { measured_bool: false })).toBe('D')
  })
  it('unmeasured -> null', () => {
    expect(computeItemGrade(PASSFAIL, {})).toBeNull()
    expect(computeItemGrade(PASSFAIL, { measured_bool: null })).toBeNull()
  })
})

// --- unmeasured numeric ----------------------------------------------------

describe('computeItemGrade: unmeasured / invalid', () => {
  it('returns null when numeric value is missing', () => {
    expect(computeItemGrade(LOWER, {})).toBeNull()
    expect(computeItemGrade(LOWER, { measured_value: null })).toBeNull()
    expect(computeItemGrade(LOWER, { measured_value: NaN })).toBeNull()
  })
})

// --- hasMeasurement --------------------------------------------------------

describe('hasMeasurement', () => {
  it('numeric types need a finite value', () => {
    expect(hasMeasurement('lower_is_better', { measured_value: 5 })).toBe(true)
    expect(hasMeasurement('lower_is_better', { measured_value: null })).toBe(false)
    expect(hasMeasurement('range', { measured_value: 3 })).toBe(true)
  })
  it('pass_fail needs a boolean', () => {
    expect(hasMeasurement('pass_fail', { measured_bool: false })).toBe(true)
    expect(hasMeasurement('pass_fail', {})).toBe(false)
  })
})

// --- computeOverallGrade ---------------------------------------------------

describe('computeOverallGrade', () => {
  it('returns the worst grade', () => {
    expect(computeOverallGrade(['A+', 'A', 'C', 'B'])).toBe('C')
    expect(computeOverallGrade(['A+', 'A+'])).toBe('A+')
    expect(computeOverallGrade(['D', 'A+'])).toBe('D')
  })
  it('ignores nulls and returns null when nothing graded', () => {
    expect(computeOverallGrade([null, 'B', undefined])).toBe('B')
    expect(computeOverallGrade([null, undefined])).toBeNull()
    expect(computeOverallGrade([])).toBeNull()
  })
})

// --- computeOverallGrade: explicit rule scenarios --------------------------

describe('computeOverallGrade: worst-grade-wins rules', () => {
  it('rule 1a: all items A+ → overall A+', () => {
    expect(computeOverallGrade(['A+', 'A+', 'A+'])).toBe('A+')
  })

  it('rule 1b: all items A → overall A', () => {
    expect(computeOverallGrade(['A', 'A', 'A'])).toBe('A')
  })

  it('rule 2: all items A but one item B → overall B', () => {
    expect(computeOverallGrade(['A', 'A', 'B', 'A'])).toBe('B')
  })

  it('rule 3a: mix {A+, A, A, B} → overall B', () => {
    expect(computeOverallGrade(['A+', 'A', 'A', 'B'])).toBe('B')
  })

  it('rule 3b: mix {A, A, C} → overall C', () => {
    expect(computeOverallGrade(['A', 'A', 'C'])).toBe('C')
  })
})

// --- computeChecksheetGrade: excluded items must not affect overall --------

describe('computeChecksheetGrade: excluded item does not affect overall', () => {
  it('excluded item graded D among included A items → overall stays A', () => {
    // included items: two A-grade measurements
    // excluded item: graded D (must not drag overall down)
    const entries: ChecksheetEntry[] = [
      {
        criteria: criteria({ comparison: 'higher_is_better', threshold_a_plus: 2.7, threshold_a: 2.2, threshold_b: 2.0, threshold_c: 1.8, included_in_grade: true }),
        measurement: { measured_value: 2.3 }, // A
      },
      {
        criteria: criteria({ comparison: 'higher_is_better', threshold_a_plus: 2.7, threshold_a: 2.2, threshold_b: 2.0, threshold_c: 1.8, included_in_grade: true }),
        measurement: { measured_value: 2.4 }, // A
      },
      {
        criteria: criteria({ comparison: 'lower_is_better', threshold_a_plus: 3, threshold_a: 6, threshold_b: 8, threshold_c: 10, included_in_grade: false }),
        measurement: { measured_value: 99 }, // D — but excluded
      },
    ]
    const res = computeChecksheetGrade(entries)
    expect(res.overall).toBe('A')          // excluded D must not pull overall down
    expect(res.includedTotal).toBe(2)
    expect(res.measuredCount).toBe(3)      // all three were measured (D item counted for display)
  })

  it('all included items A+ with excluded item B → overall A+', () => {
    const entries: ChecksheetEntry[] = [
      {
        criteria: criteria({ comparison: 'lower_is_better', threshold_a_plus: 3, threshold_a: 6, threshold_b: 8, threshold_c: 10, included_in_grade: true }),
        measurement: { measured_value: 2 }, // A+
      },
      {
        criteria: criteria({ comparison: 'lower_is_better', threshold_a_plus: 3, threshold_a: 6, threshold_b: 8, threshold_c: 10, included_in_grade: true }),
        measurement: { measured_value: 1 }, // A+
      },
      {
        criteria: criteria({ comparison: 'lower_is_better', threshold_a_plus: 3, threshold_a: 6, threshold_b: 8, threshold_c: 10, included_in_grade: false }),
        measurement: { measured_value: 7 }, // B — but excluded
      },
    ]
    const res = computeChecksheetGrade(entries)
    expect(res.overall).toBe('A+')
    expect(res.includedTotal).toBe(2)
  })

  it('all included A, one included B → overall B (worst included wins)', () => {
    const entries: ChecksheetEntry[] = [
      {
        criteria: criteria({ comparison: 'lower_is_better', threshold_a_plus: 3, threshold_a: 6, threshold_b: 8, threshold_c: 10, included_in_grade: true }),
        measurement: { measured_value: 4 }, // A
      },
      {
        criteria: criteria({ comparison: 'lower_is_better', threshold_a_plus: 3, threshold_a: 6, threshold_b: 8, threshold_c: 10, included_in_grade: true }),
        measurement: { measured_value: 5 }, // A
      },
      {
        criteria: criteria({ comparison: 'lower_is_better', threshold_a_plus: 3, threshold_a: 6, threshold_b: 8, threshold_c: 10, included_in_grade: true }),
        measurement: { measured_value: 7 }, // B
      },
    ]
    const res = computeChecksheetGrade(entries)
    expect(res.overall).toBe('B')
    expect(res.includedTotal).toBe(3)
  })

  it('included mix {A+, A, A, C} → overall C', () => {
    const entries: ChecksheetEntry[] = [
      {
        criteria: criteria({ comparison: 'lower_is_better', threshold_a_plus: 3, threshold_a: 6, threshold_b: 8, threshold_c: 10, included_in_grade: true }),
        measurement: { measured_value: 2 }, // A+
      },
      {
        criteria: criteria({ comparison: 'lower_is_better', threshold_a_plus: 3, threshold_a: 6, threshold_b: 8, threshold_c: 10, included_in_grade: true }),
        measurement: { measured_value: 5 }, // A
      },
      {
        criteria: criteria({ comparison: 'lower_is_better', threshold_a_plus: 3, threshold_a: 6, threshold_b: 8, threshold_c: 10, included_in_grade: true }),
        measurement: { measured_value: 4 }, // A
      },
      {
        criteria: criteria({ comparison: 'lower_is_better', threshold_a_plus: 3, threshold_a: 6, threshold_b: 8, threshold_c: 10, included_in_grade: true }),
        measurement: { measured_value: 9 }, // C
      },
    ]
    expect(computeChecksheetGrade(entries).overall).toBe('C')
  })
})

// --- new Spindle vibration items (스핀들 진동) per the ALMUS standard ---------

describe('computeItemGrade: spindle vibration items (new)', () => {
  // item 25 — vibration @ Spindle, 3 KRPM: ≤1.5 A+, ≤2.0 A, ≤2.5 B, ≤3.5 C, >3.5 D (m/s²)
  const VIB_3KRPM = spec('lower_is_better', {
    threshold_a_plus: 1.5, threshold_a: 2.0, threshold_b: 2.5, threshold_c: 3.5,
  })
  // item 26 — vibration @ Spindle motor, 24 KRPM: ≤8.5 A+, ≤10 A, ≤12 B, ≤15 C, >15 D (m/s²)
  const VIB_24KRPM = spec('lower_is_better', {
    threshold_a_plus: 8.5, threshold_a: 10, threshold_b: 12, threshold_c: 15,
  })

  it.each([
    [1.5, 'A+'], [1.0, 'A+'],
    [2.0, 'A'], [1.8, 'A'],
    [2.5, 'B'], [2.3, 'B'],
    [3.5, 'C'], [3.0, 'C'],
    [3.6, 'D'], [10, 'D'],
  ])('3 KRPM value %p -> %s', (value, expected) => {
    expect(computeItemGrade(VIB_3KRPM, { measured_value: value })).toBe(expected)
  })

  it.each([
    [8.5, 'A+'], [5, 'A+'],
    [10, 'A'], [9, 'A'],
    [12, 'B'], [11, 'B'],
    [15, 'C'], [13, 'C'],
    [15.1, 'D'], [20, 'D'],
  ])('24 KRPM value %p -> %s', (value, expected) => {
    expect(computeItemGrade(VIB_24KRPM, { measured_value: value })).toBe(expected)
  })
})

// --- computeChecksheetGrade ------------------------------------------------

describe('computeChecksheetGrade', () => {
  it('takes the worst INCLUDED grade and ignores excluded items', () => {
    const entries: ChecksheetEntry[] = [
      // excluded leveling item graded D — must not affect overall
      { criteria: criteria({ comparison: 'lower_is_better', threshold_a_plus: 20, threshold_a: 30, threshold_b: 40, threshold_c: 50, included_in_grade: false }),
        measurement: { measured_value: 99 } },
      { criteria: criteria({ ...LOWER, included_in_grade: true }), measurement: { measured_value: 7 } },  // B
      { criteria: criteria({ ...HIGHER, included_in_grade: true }), measurement: { measured_value: 2.3 } }, // A
    ]
    const res = computeChecksheetGrade(entries)
    expect(res.overall).toBe('B')           // worst of included {B, A}
    expect(res.includedTotal).toBe(2)
    expect(res.measuredCount).toBe(3)        // all three measured (incl. excluded)
  })

  it('a failing included pass_fail drags the whole grade to D', () => {
    const entries: ChecksheetEntry[] = [
      { criteria: criteria({ ...LOWER }), measurement: { measured_value: 3 } },     // A+
      { criteria: criteria({ ...PASSFAIL }), measurement: { measured_bool: false } }, // D
    ]
    expect(computeChecksheetGrade(entries).overall).toBe('D')
  })

  it('skips inactive criteria entirely', () => {
    const entries: ChecksheetEntry[] = [
      { criteria: criteria({ ...LOWER, is_active: false }), measurement: { measured_value: 99 } },
      { criteria: criteria({ ...HIGHER }), measurement: { measured_value: 2.8 } }, // A+
    ]
    const res = computeChecksheetGrade(entries)
    expect(res.overall).toBe('A+')
    expect(res.includedTotal).toBe(1)
    expect(res.measuredCount).toBe(1)
  })

  it('returns null overall when no included item is measured yet', () => {
    const entries: ChecksheetEntry[] = [
      { criteria: criteria({ ...LOWER }), measurement: {} },
      { criteria: criteria({ ...HIGHER }), measurement: {} },
    ]
    expect(computeChecksheetGrade(entries).overall).toBeNull()
  })
})
