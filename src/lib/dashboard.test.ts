import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], factory: 'ALT' }))
vi.mock('./supabase', () => ({
  supabase: {
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        then: (resolve: (value: unknown) => unknown) => resolve({ data: db.rows, error: null }),
      }
      return query
    },
  },
}))
vi.mock('@/stores/authStore', () => ({ useAuthStore: { getState: () => ({ currentFactory: db.factory }) } }))
import { equipmentApi, statisticsApi } from './api'
import type { Equipment, EquipmentStatus } from '@/types'

const equipments = (statuses: EquipmentStatus[]) => statuses.map((status, index) => ({ id: String(index), status }) as Equipment)

describe('dashboard equipment counts', () => {
  beforeEach(() => { vi.restoreAllMocks(); db.rows = [] })

  it('counts the screenshot scenario from effective equipment states, including PM and paint', async () => {
    vi.spyOn(equipmentApi, 'getEquipments').mockResolvedValue({
      data: equipments([...Array(813).fill('normal'), ...Array(6).fill('paint'), ...Array(6).fill('pm'), ...Array(4).fill('repair')]), error: null,
    })
    const { data } = await statisticsApi.getDashboardStats()
    expect(data).toMatchObject({ total_equipment: 829, running_equipment: 813, repair_equipment: 4, paint_equipment: 6, pm_equipment: 6 })
    expect(data?.status_distribution.reduce((sum, row) => sum + row.value, 0)).toBe(829)
    expect(equipmentApi.getEquipments).toHaveBeenCalledTimes(1)
  })

  it('excludes standby and emergency from running and does not subtract duplicate repair records', async () => {
    vi.spyOn(equipmentApi, 'getEquipments').mockResolvedValue({ data: equipments(['normal', 'standby', 'emergency', 'repair', 'pm', 'paint']), error: null })
    db.rows = Array.from({ length: 10 }, () => ({ status: 'in_progress', repair_type: { code: 'EM' } }))
    const { data } = await statisticsApi.getDashboardStats()
    expect(data).toMatchObject({ total_equipment: 6, running_equipment: 1, repair_equipment: 2, standby_equipment: 1, pm_equipment: 1, paint_equipment: 1, emergency_count: 10 })
  })

  it('returns zero counts for an empty factory', async () => {
    vi.spyOn(equipmentApi, 'getEquipments').mockResolvedValue({ data: [], error: null })
    const { data } = await statisticsApi.getDashboardStats()
    expect(data).toMatchObject({ total_equipment: 0, running_equipment: 0, repair_equipment: 0, pm_equipment: 0, paint_equipment: 0, status_distribution: [] })
  })

  it('propagates an equipment read failure instead of publishing zero counts', async () => {
    vi.spyOn(equipmentApi, 'getEquipments').mockResolvedValue({ data: null, error: 'read failed' })
    expect(await statisticsApi.getDashboardStats()).toEqual({ data: null, error: 'read failed' })
  })
})
