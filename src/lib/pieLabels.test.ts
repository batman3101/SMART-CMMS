import { describe, expect, it } from 'vitest'
import { layoutStatusLabels } from './pieLabels'

describe('status pie label spacing', () => {
  it('separates tiny adjacent sectors without dropping any labels', () => {
    const labels = layoutStatusLabels([
      { status: 'normal', value: 813 }, { status: 'pm', value: 6 },
      { status: 'repair', value: 4 }, { status: 'paint', value: 6 },
      { status: 'emergency', value: 1 }, { status: 'standby', value: 1 },
    ])
    expect(labels).toHaveLength(6)
    for (const side of [-1, 1]) {
      const column = labels.filter(label => label.side === side).sort((a, b) => a.y - b.y)
      column.forEach((label, index) => {
        expect(Math.abs(label.y)).toBeLessThanOrEqual(90)
        if (index) expect(label.y - column[index - 1].y).toBeGreaterThanOrEqual(36)
      })
    }
  })
  it('handles empty and single-status charts', () => {
    expect(layoutStatusLabels([])).toEqual([])
    const [label] = layoutStatusLabels([{ status: 'normal', value: 829 }])
    expect(label.side).toBe(-1)
    expect(Math.abs(label.y)).toBeLessThan(1)
  })
})
