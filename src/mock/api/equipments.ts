// Equipment API - Uses Supabase when connected, falls back to mock data
import { supabase, isMainSupabaseConnected } from '@/lib/supabase'
import {
  mockEquipments,
  mockEquipmentTypes,
  getEquipmentById as getMockEquipmentById,
  getEquipmentByCode as getMockEquipmentByCode,
  getEquipmentsByStatus as getMockEquipmentsByStatus,
  getEquipmentsByBuilding as getMockEquipmentsByBuilding,
} from '../data'
import type { Equipment, EquipmentType, EquipmentStatus, EquipmentFilter } from '@/types'

// Simulate API delay for mock
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Check if Supabase should be used (includes null check)
 * When this returns true, supabase is guaranteed to be non-null
 */
const shouldUseSupabase = (): boolean => isMainSupabaseConnected() && supabase !== null

/**
 * Get non-null Supabase client
 * Call only after shouldUseSupabase() returns true
 */
const getSupabase = () => supabase!

export const mockEquipmentApi = {
  async getEquipments(filter?: EquipmentFilter): Promise<{
    data: Equipment[]
    error: string | null
  }> {
    if (shouldUseSupabase()) {
      let query = getSupabase()
        .from('equipments')
        .select(`
          *,
          equipment_type:equipment_types(*)
        `)
        .eq('is_active', true)
        .order('equipment_code')

      if (filter?.type_id) {
        query = query.eq('equipment_type_id', filter.type_id)
      }
      if (filter?.status) {
        query = query.eq('status', filter.status)
      }
      if (filter?.building) {
        query = query.eq('building', filter.building)
      }
      if (filter?.search) {
        query = query.or(`equipment_code.ilike.%${filter.search}%,equipment_name.ilike.%${filter.search}%`)
      }

      const { data, error } = await query
      return { data: data || [], error: error?.message || null }
    }

    // Mock fallback
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
    if (shouldUseSupabase()) {
      const { data, error } = await getSupabase()
        .from('equipments')
        .select(`
          *,
          equipment_type:equipment_types(*)
        `)
        .eq('id', id)
        .single()

      return { data, error: error?.message || null }
    }

    await delay(200)
    const equipment = getMockEquipmentById(id)
    return {
      data: equipment || null,
      error: equipment ? null : '설비를 찾을 수 없습니다.',
    }
  },

  async getEquipmentByCode(equipmentCode: string): Promise<{
    data: Equipment | null
    error: string | null
  }> {
    if (shouldUseSupabase()) {
      const { data, error } = await getSupabase()
        .from('equipments')
        .select(`
          *,
          equipment_type:equipment_types(*)
        `)
        .eq('equipment_code', equipmentCode)
        .single()

      return { data, error: error?.message || null }
    }

    await delay(200)
    const equipment = getMockEquipmentByCode(equipmentCode)
    return {
      data: equipment || null,
      error: equipment ? null : '설비를 찾을 수 없습니다.',
    }
  },

  async getEquipmentTypes(): Promise<{
    data: EquipmentType[]
    error: string | null
  }> {
    if (shouldUseSupabase()) {
      const { data, error } = await getSupabase()
        .from('equipment_types')
        .select('*')
        .eq('is_active', true)
        .order('code')

      return { data: data || [], error: error?.message || null }
    }

    await delay(200)
    return { data: mockEquipmentTypes, error: null }
  },

  async getEquipmentsByStatus(status: EquipmentStatus): Promise<{
    data: Equipment[]
    error: string | null
  }> {
    if (shouldUseSupabase()) {
      const { data, error } = await getSupabase()
        .from('equipments')
        .select(`
          *,
          equipment_type:equipment_types(*)
        `)
        .eq('is_active', true)
        .eq('status', status)
        .order('equipment_code')

      return { data: data || [], error: error?.message || null }
    }

    await delay(200)
    return { data: getMockEquipmentsByStatus(status), error: null }
  },

  async getEquipmentsByBuilding(building: string): Promise<{
    data: Equipment[]
    error: string | null
  }> {
    if (shouldUseSupabase()) {
      const { data, error } = await getSupabase()
        .from('equipments')
        .select(`
          *,
          equipment_type:equipment_types(*)
        `)
        .eq('is_active', true)
        .eq('building', building)
        .order('equipment_code')

      return { data: data || [], error: error?.message || null }
    }

    await delay(200)
    return { data: getMockEquipmentsByBuilding(building), error: null }
  },

  async createEquipment(
    equipment: Omit<Equipment, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{ data: Equipment | null; error: string | null }> {
    if (shouldUseSupabase()) {
      // Remove equipment_type object as database only has equipment_type_id column
      const { equipment_type, ...insertData } = equipment

      const { data, error } = await getSupabase()
        .from('equipments')
        .insert(insertData)
        .select(`
          *,
          equipment_type:equipment_types(*)
        `)
        .single()

      return { data, error: error?.message || null }
    }

    await delay(300)
    // Check if equipment_code already exists in mock
    if (getMockEquipmentByCode(equipment.equipment_code)) {
      return { data: null, error: '이미 존재하는 설비번호입니다.' }
    }

    const newEquipment: Equipment = {
      ...equipment,
      id: `eq-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return { data: newEquipment, error: null }
  },

  async updateEquipment(
    id: string,
    updates: Partial<Equipment>
  ): Promise<{ data: Equipment | null; error: string | null }> {
    if (shouldUseSupabase()) {
      // Remove equipment_type object as database only has equipment_type_id column
      const { equipment_type, ...updateData } = updates

      const { data, error } = await getSupabase()
        .from('equipments')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(`
          *,
          equipment_type:equipment_types(*)
        `)
        .single()

      return { data, error: error?.message || null }
    }

    await delay(300)
    const equipment = getMockEquipmentById(id)
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
    return this.updateEquipment(id, { status })
  },

  async deleteEquipment(id: string): Promise<{ error: string | null }> {
    if (shouldUseSupabase()) {
      const { error } = await getSupabase()
        .from('equipments')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)

      return { error: error?.message || null }
    }

    await delay(300)
    const equipment = getMockEquipmentById(id)
    if (!equipment) {
      return { error: '설비를 찾을 수 없습니다.' }
    }
    return { error: null }
  },

  async bulkCreateEquipments(
    equipments: Omit<Equipment, 'id' | 'created_at' | 'updated_at'>[]
  ): Promise<{
    data: { success: number; failed: number; errors: string[] }
    error: string | null
  }> {
    if (shouldUseSupabase()) {
      const errors: string[] = []
      let success = 0
      let failed = 0

      for (const eq of equipments) {
        const { error } = await getSupabase()
          .from('equipments')
          .insert(eq)

        if (error) {
          errors.push(`${eq.equipment_code}: ${error.message}`)
          failed++
        } else {
          success++
        }
      }

      return { data: { success, failed, errors }, error: null }
    }

    await delay(500)
    const errors: string[] = []
    let success = 0
    let failed = 0

    for (const eq of equipments) {
      if (getMockEquipmentByCode(eq.equipment_code)) {
        errors.push(`${eq.equipment_code}: 이미 존재하는 설비번호`)
        failed++
      } else {
        success++
      }
    }

    return { data: { success, failed, errors }, error: null }
  },

  async getBuildings(): Promise<{ data: string[]; error: string | null }> {
    if (shouldUseSupabase()) {
      const { data, error } = await getSupabase()
        .from('equipments')
        .select('building')
        .eq('is_active', true)
        .not('building', 'is', null)

      if (error) {
        return { data: [], error: error.message }
      }

      const buildings = [...new Set(data?.map(e => e.building).filter(Boolean))] as string[]
      return { data: buildings.sort(), error: null }
    }

    await delay(200)
    const buildings = [...new Set(mockEquipments.map((eq) => eq.building).filter(Boolean))] as string[]
    return { data: buildings.sort(), error: null }
  },

  // Equipment Type CRUD
  async createEquipmentType(
    type: Omit<EquipmentType, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{ data: EquipmentType | null; error: string | null }> {
    if (shouldUseSupabase()) {
      const { data, error } = await getSupabase()
        .from('equipment_types')
        .insert(type)
        .select()
        .single()

      return { data, error: error?.message || null }
    }

    await delay(300)
    const newType: EquipmentType = {
      ...type,
      id: `et-${Date.now()}`,
    }
    return { data: newType, error: null }
  },

  async updateEquipmentType(
    id: string,
    updates: Partial<EquipmentType>
  ): Promise<{ data: EquipmentType | null; error: string | null }> {
    if (shouldUseSupabase()) {
      const { data, error } = await getSupabase()
        .from('equipment_types')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      return { data, error: error?.message || null }
    }

    await delay(300)
    const type = mockEquipmentTypes.find(t => t.id === id)
    if (!type) {
      return { data: null, error: '설비 유형을 찾을 수 없습니다.' }
    }
    return { data: { ...type, ...updates }, error: null }
  },

  async deleteEquipmentType(id: string): Promise<{ error: string | null }> {
    if (shouldUseSupabase()) {
      const { error } = await getSupabase()
        .from('equipment_types')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)

      return { error: error?.message || null }
    }

    await delay(300)
    return { error: null }
  },
}
