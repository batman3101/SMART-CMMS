// Mock Equipments API
// When connecting to Supabase, replace with real API calls

import {
  mockEquipments,
  mockEquipmentTypes,
  getEquipmentById,
  getEquipmentByCode,
  getEquipmentsByStatus,
  getEquipmentsByBuilding,
} from '../data'
import type { Equipment, EquipmentType, EquipmentStatus, EquipmentFilter } from '@/types'

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const mockEquipmentApi = {
  async getEquipments(filter?: EquipmentFilter): Promise<{
    data: Equipment[]
    error: string | null
  }> {
    await delay(300)

    let filtered = [...mockEquipments]

    if (filter?.type_id) {
      filtered = filtered.filter((eq) => eq.equipment_type_id === filter.type_id)
    }

    if (filter?.status) {
      filtered = filtered.filter((eq) => eq.status === filter.status)
    }

    if (filter?.building) {
      filtered = filtered.filter((eq) => eq.building === filter.building)
    }

    if (filter?.search) {
      const searchLower = filter.search.toLowerCase()
      filtered = filtered.filter(
        (eq) =>
          eq.equipment_code.toLowerCase().includes(searchLower) ||
          eq.equipment_name.toLowerCase().includes(searchLower)
      )
    }

    return { data: filtered, error: null }
  },

  async getEquipmentById(id: string): Promise<{
    data: Equipment | null
    error: string | null
  }> {
    await delay(200)
    const equipment = getEquipmentById(id)
    return {
      data: equipment || null,
      error: equipment ? null : '설비를 찾을 수 없습니다.',
    }
  },

  async getEquipmentByCode(equipmentCode: string): Promise<{
    data: Equipment | null
    error: string | null
  }> {
    await delay(200)
    const equipment = getEquipmentByCode(equipmentCode)
    return {
      data: equipment || null,
      error: equipment ? null : '설비를 찾을 수 없습니다.',
    }
  },

  async getEquipmentTypes(): Promise<{
    data: EquipmentType[]
    error: string | null
  }> {
    await delay(200)
    return { data: mockEquipmentTypes, error: null }
  },

  async getEquipmentsByStatus(status: EquipmentStatus): Promise<{
    data: Equipment[]
    error: string | null
  }> {
    await delay(200)
    return { data: getEquipmentsByStatus(status), error: null }
  },

  async getEquipmentsByBuilding(building: string): Promise<{
    data: Equipment[]
    error: string | null
  }> {
    await delay(200)
    return { data: getEquipmentsByBuilding(building), error: null }
  },

  async createEquipment(
    equipment: Omit<Equipment, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{ data: Equipment | null; error: string | null }> {
    await delay(300)

    // Check if equipment_code already exists
    if (getEquipmentByCode(equipment.equipment_code)) {
      return { data: null, error: '이미 존재하는 설비번호입니다.' }
    }

    const newEquipment: Equipment = {
      ...equipment,
      id: `eq-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // In mock, we don't actually add to the array (it would reset on reload)
    return { data: newEquipment, error: null }
  },

  async updateEquipment(
    id: string,
    updates: Partial<Equipment>
  ): Promise<{ data: Equipment | null; error: string | null }> {
    await delay(300)

    const equipment = getEquipmentById(id)
    if (!equipment) {
      return { data: null, error: '설비를 찾을 수 없습니다.' }
    }

    const updatedEquipment: Equipment = {
      ...equipment,
      ...updates,
      updated_at: new Date().toISOString(),
    }

    return { data: updatedEquipment, error: null }
  },

  async updateEquipmentStatus(
    id: string,
    status: EquipmentStatus
  ): Promise<{ data: Equipment | null; error: string | null }> {
    await delay(200)
    return this.updateEquipment(id, { status })
  },

  async deleteEquipment(
    id: string
  ): Promise<{ error: string | null }> {
    await delay(300)

    const equipment = getEquipmentById(id)
    if (!equipment) {
      return { error: '설비를 찾을 수 없습니다.' }
    }

    // In mock, we don't actually delete
    return { error: null }
  },

  async bulkCreateEquipments(
    equipments: Omit<Equipment, 'id' | 'created_at' | 'updated_at'>[]
  ): Promise<{
    data: { success: number; failed: number; errors: string[] }
    error: string | null
  }> {
    await delay(500)

    const errors: string[] = []
    let success = 0
    let failed = 0

    for (const eq of equipments) {
      if (getEquipmentByCode(eq.equipment_code)) {
        errors.push(`${eq.equipment_code}: 이미 존재하는 설비번호`)
        failed++
      } else {
        success++
      }
    }

    return { data: { success, failed, errors }, error: null }
  },

  async getBuildings(): Promise<{ data: string[]; error: string | null }> {
    await delay(200)
    const buildings = [...new Set(mockEquipments.map((eq) => eq.building).filter(Boolean))] as string[]
    return { data: buildings.sort(), error: null }
  },
}
