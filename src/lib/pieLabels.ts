import type { EquipmentStatus } from '@/types'

// Match the pie's 360-degree layout and reserve separate vertical label slots.
export function layoutStatusLabels(data: { status: string; value: number }[]) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const padding = data.length > 1 ? 2 : 0
  let angle = 0
  const labels = data.map(item => {
    const sweep = total ? item.value / total * (360 - data.length * padding) : 0
    const middle = (angle + sweep / 2) * Math.PI / 180
    angle += sweep + padding
    return { status: item.status as EquipmentStatus, side: Math.cos(middle) >= 0 ? 1 : -1, y: -90 * Math.sin(middle) }
  })
  for (const side of [-1, 1]) {
    const column = labels.filter(label => label.side === side).sort((a, b) => a.y - b.y)
    column.forEach((label, i) => { label.y = Math.max(-90, label.y, i ? column[i - 1].y + 36 : -90) })
    for (let i = column.length - 1; i >= 0; i--) {
      column[i].y = Math.min(column[i].y, i === column.length - 1 ? 90 : column[i + 1].y - 36)
    }
  }
  return labels
}
