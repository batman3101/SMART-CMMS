/**
 * Unified API Layer
 * Direct Supabase database access
 */

import { supabase } from './supabase'
import type {
  Equipment,
  EquipmentType,
  EquipmentStatus,
  RepairType,
  MaintenanceRecord,
  User,
  PMSchedule,
  PMScheduleStatus,
  PMTemplate,
  AIInsight,
  DashboardStats,
  EquipmentFailureRank,
  RepairTypeDistribution,
  TechnicianPerformance,
} from '@/types'

// Type for joined equipment data from Supabase
interface EquipmentJoin {
  equipment_code?: string
  equipment_name?: string
}

// Type for joined repair type data from Supabase
interface RepairTypeJoin {
  id?: string
  code?: string
  name?: string
  color?: string
}

// Type for joined technician data from Supabase
interface TechnicianJoin {
  id?: string
  name?: string
}

// Type guard for EquipmentStatus
function isEquipmentStatus(status: string): status is EquipmentStatus {
  return ['normal', 'pm', 'repair', 'emergency', 'standby'].includes(status)
}

// Type guard for PMScheduleStatus (reserved for future use)
function _isPMScheduleStatus(status: string): status is PMScheduleStatus {
  return ['scheduled', 'in_progress', 'completed', 'overdue', 'cancelled'].includes(status)
}
void _isPMScheduleStatus // Prevent unused variable warning

// Supabase client getter
const getSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase client is not initialized')
  }
  return supabase
}

// Get Supabase project URL for Edge Functions
const getEdgeFunctionUrl = (functionName: string) => {
  const url = import.meta.env.VITE_SUPABASE_URL
  if (!url) return null
  return `${url}/functions/v1/${functionName}`
}

// ========================================
// Equipment API
// ========================================
export const equipmentApi = {
  async getEquipments(): Promise<{ data: Equipment[] | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('equipments')
      .select(`
        *,
        equipment_type:equipment_types(*)
      `)
      .eq('is_active', true)
      .order('equipment_code')

    return { data, error: error?.message || null }
  },

  async getEquipmentById(id: string): Promise<{ data: Equipment | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('equipments')
      .select(`
        *,
        equipment_type:equipment_types(*)
      `)
      .eq('id', id)
      .single()

    return { data, error: error?.message || null }
  },

  async getEquipmentTypes(): Promise<{ data: EquipmentType[] | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('equipment_types')
      .select('*')
      .eq('is_active', true)
      .order('code')

    return { data, error: error?.message || null }
  },

  async updateEquipmentStatus(id: string, status: string): Promise<{ data: Equipment | null; error: string | null }> {
    if (!isEquipmentStatus(status)) {
      return { data: null, error: 'Invalid equipment status' }
    }

    const { data, error } = await getSupabase()
      .from('equipments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    return { data, error: error?.message || null }
  },

  async createEquipment(equipment: Partial<Equipment>): Promise<{ data: Equipment | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('equipments')
      .insert(equipment)
      .select()
      .single()

    return { data, error: error?.message || null }
  },

  async updateEquipment(id: string, updates: Partial<Equipment>): Promise<{ data: Equipment | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('equipments')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    return { data, error: error?.message || null }
  },

  async deleteEquipment(id: string): Promise<{ error: string | null }> {
    const { error } = await getSupabase()
      .from('equipments')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    return { error: error?.message || null }
  },

  async bulkCreateEquipments(equipments: Partial<Equipment>[]): Promise<{ data: Equipment[] | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('equipments')
      .insert(equipments.map(eq => ({ ...eq, is_active: true })))
      .select()

    return { data, error: error?.message || null }
  },

  // Equipment Types CRUD
  async getAllEquipmentTypes(includeInactive: boolean = false): Promise<{ data: EquipmentType[] | null; error: string | null }> {
    let query = getSupabase()
      .from('equipment_types')
      .select('*')
      .order('code')

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    return { data, error: error?.message || null }
  },

  async createEquipmentType(equipmentType: Partial<EquipmentType>): Promise<{ data: EquipmentType | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('equipment_types')
      .insert(equipmentType)
      .select()
      .single()

    return { data, error: error?.message || null }
  },

  async updateEquipmentType(id: string, updates: Partial<EquipmentType>): Promise<{ data: EquipmentType | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('equipment_types')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    return { data, error: error?.message || null }
  },

  async deleteEquipmentType(id: string): Promise<{ error: string | null }> {
    const { error } = await getSupabase()
      .from('equipment_types')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    return { error: error?.message || null }
  },
}

// ========================================
// Repair Types API
// ========================================
export const repairTypesApi = {
  async getAll(includeInactive: boolean = false): Promise<{ data: RepairType[] | null; error: string | null }> {
    let query = getSupabase()
      .from('repair_types')
      .select('*')
      .order('priority')

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    return { data, error: error?.message || null }
  },

  async getActive(): Promise<{ data: RepairType[] | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('repair_types')
      .select('*')
      .eq('is_active', true)
      .order('priority')

    return { data, error: error?.message || null }
  },

  async create(repairType: Partial<RepairType>): Promise<{ data: RepairType | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('repair_types')
      .insert(repairType)
      .select()
      .single()

    return { data, error: error?.message || null }
  },

  async update(id: string, updates: Partial<RepairType>): Promise<{ data: RepairType | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('repair_types')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    return { data, error: error?.message || null }
  },

  async delete(id: string): Promise<{ error: string | null }> {
    const { error } = await getSupabase()
      .from('repair_types')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    return { error: error?.message || null }
  },
}

// ========================================
// Maintenance API
// ========================================
export const maintenanceApi = {
  async getRecords(filter?: {
    startDate?: string
    endDate?: string
    repairTypeId?: string
    technicianId?: string
    status?: string
    equipmentId?: string
  }): Promise<{ data: MaintenanceRecord[] | null; error: string | null }> {
    let query = getSupabase()
      .from('maintenance_records')
      .select(`
        *,
        equipment:equipments(*,equipment_type:equipment_types(*)),
        repair_type:repair_types(*),
        technician:users(*)
      `)
      .order('date', { ascending: false })

    if (filter?.startDate) {
      query = query.gte('date', filter.startDate)
    }
    if (filter?.endDate) {
      query = query.lte('date', filter.endDate)
    }
    if (filter?.repairTypeId) {
      query = query.eq('repair_type_id', filter.repairTypeId)
    }
    if (filter?.technicianId) {
      query = query.eq('technician_id', filter.technicianId)
    }
    if (filter?.status) {
      query = query.eq('status', filter.status)
    }
    if (filter?.equipmentId) {
      query = query.eq('equipment_id', filter.equipmentId)
    }

    const { data, error } = await query

    return { data, error: error?.message || null }
  },

  async getInProgressRecords(): Promise<{ data: MaintenanceRecord[] | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('maintenance_records')
      .select(`
        *,
        equipment:equipments(*,equipment_type:equipment_types(*)),
        repair_type:repair_types(*),
        technician:users(*)
      `)
      .eq('status', 'in_progress')
      .order('start_time', { ascending: false })

    return { data, error: error?.message || null }
  },

  async getTodayRecords(): Promise<{ data: MaintenanceRecord[] | null; error: string | null }> {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await getSupabase()
      .from('maintenance_records')
      .select(`
        *,
        equipment:equipments(*,equipment_type:equipment_types(*)),
        repair_type:repair_types(*),
        technician:users(*)
      `)
      .eq('date', today)
      .order('start_time', { ascending: false })

    return { data, error: error?.message || null }
  },

  async getTodayCompletedRecords(): Promise<{ data: MaintenanceRecord[] | null; error: string | null }> {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await getSupabase()
      .from('maintenance_records')
      .select(`
        *,
        equipment:equipments(*,equipment_type:equipment_types(*)),
        repair_type:repair_types(*),
        technician:users(*)
      `)
      .eq('status', 'completed')
      .eq('date', today)
      .order('end_time', { ascending: false })

    return { data, error: error?.message || null }
  },

  async getRepairTypes(): Promise<{ data: RepairType[] | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('repair_types')
      .select('*')
      .eq('is_active', true)
      .order('priority')

    return { data, error: error?.message || null }
  },

  async createRecord(record: {
    date: string
    equipment_id: string
    repair_type_id: string
    technician_id: string
    symptom?: string
    start_time: string
  }): Promise<{ data: MaintenanceRecord | null; error: string | null }> {
    // Generate record_no
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    const record_no = `MR${today}-${randomSuffix}`

    const { data, error } = await getSupabase()
      .from('maintenance_records')
      .insert({
        ...record,
        record_no,
        status: 'in_progress',
      })
      .select(`
        *,
        equipment:equipments(*,equipment_type:equipment_types(*)),
        repair_type:repair_types(*),
        technician:users(*)
      `)
      .single()

    return { data, error: error?.message || null }
  },

  async completeRecord(
    id: string,
    updates: {
      end_time: string
      repair_content: string
      rating: number
      duration_minutes: number
    }
  ): Promise<{ data: MaintenanceRecord | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('maintenance_records')
      .update({
        ...updates,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        equipment:equipments(*,equipment_type:equipment_types(*)),
        repair_type:repair_types(*),
        technician:users(*)
      `)
      .single()

    return { data, error: error?.message || null }
  },
}

// ========================================
// Users API
// ========================================
export const usersApi = {
  async getUsers(): Promise<{ data: User[] | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .eq('is_active', true)
      .order('name')

    return { data, error: error?.message || null }
  },

  async getTechnicians(): Promise<{ data: User[] | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .eq('is_active', true)
      .in('role', [2, 3]) // Supervisor and Technician
      .order('name')

    return { data, error: error?.message || null }
  },

  async getUserById(id: string): Promise<{ data: User | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    return { data, error: error?.message || null }
  },

  async createUser(user: Partial<User> & { email: string; password: string }): Promise<{ data: User | null; error: string | null }> {
    try {
      const { email, password, ...userData } = user
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'create_user',
          email,
          password,
          userData,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to create user' }
      }
      return { data: result.user, error: null }
    } catch (error) {
      return { data: null, error: String(error) }
    }
  },

  async updateUser(id: string, updates: Partial<User> & { password?: string }): Promise<{ data: User | null; error: string | null }> {
    try {
      const { password, ...userData } = updates
      const supabase = getSupabase()

      // Get auth_user_id for password change
      let authUserId = null
      if (password) {
        const { data: userRecord } = await supabase
          .from('users')
          .select('auth_user_id')
          .eq('id', id)
          .single()
        authUserId = userRecord?.auth_user_id
      }

      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'update_user',
          userId: id,
          authUserId,
          password,
          userData,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to update user' }
      }
      return { data: result.user, error: null }
    } catch (error) {
      return { data: null, error: String(error) }
    }
  },

  async deleteUser(id: string): Promise<{ error: string | null }> {
    try {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'delete_user',
          userId: id,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        return { error: result.error || 'Failed to delete user' }
      }
      return { error: null }
    } catch (error) {
      return { error: String(error) }
    }
  },

  async deactivateUser(id: string): Promise<{ error: string | null }> {
    const { error } = await getSupabase()
      .from('users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    return { error: error?.message || null }
  },

  async activateUser(id: string): Promise<{ error: string | null }> {
    const { error } = await getSupabase()
      .from('users')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', id)

    return { error: error?.message || null }
  },

  async changePassword(authUserId: string, newPassword: string): Promise<{ error: string | null }> {
    try {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'change_password',
          authUserId,
          password: newPassword,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        return { error: result.error || 'Failed to change password' }
      }
      return { error: null }
    } catch (error) {
      return { error: String(error) }
    }
  },

  async getRolePermissions(): Promise<{ data: { role: number; permissions: { page_key: string; page_name: string; can_access: boolean }[] }[] | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('role_permissions')
      .select('*')
      .order('role')
      .order('page_key')

    if (error || !data) {
      return { data: null, error: error?.message || null }
    }

    // 역할별로 그룹화
    const roleMap: Record<number, { page_key: string; page_name: string; can_access: boolean }[]> = {}

    data.forEach((item: { role: number; page_key: string; page_name: string; can_access: boolean }) => {
      if (!roleMap[item.role]) {
        roleMap[item.role] = []
      }
      roleMap[item.role].push({
        page_key: item.page_key,
        page_name: item.page_name,
        can_access: item.can_access,
      })
    })

    const result = Object.entries(roleMap).map(([role, permissions]) => ({
      role: parseInt(role),
      permissions,
    }))

    return { data: result, error: null }
  },

  async updateRolePermission(role: number, pageKey: string, canAccess: boolean): Promise<{ data: unknown | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('role_permissions')
      .update({ can_access: canAccess, updated_at: new Date().toISOString() })
      .eq('role', role)
      .eq('page_key', pageKey)
      .select()
      .single()

    return { data, error: error?.message || null }
  },
}

// ========================================
// Statistics API
// ========================================
export const statisticsApi = {
  async getDashboardStats(): Promise<{ data: DashboardStats | null; error: string | null }> {
    // Get equipment counts
    const { data: equipments } = await getSupabase()
      .from('equipments')
      .select('status')
      .eq('is_active', true)

    // Get today's records
    const today = new Date().toISOString().split('T')[0]
    const { data: todayRecords } = await getSupabase()
      .from('maintenance_records')
      .select('status, repair_type:repair_types(code)')
      .eq('date', today)

    const stats: DashboardStats = {
      total_equipment: equipments?.length || 0,
      running_equipment: equipments?.filter(e => e.status === 'normal').length || 0,
      repair_equipment: equipments?.filter(e => ['repair', 'pm'].includes(e.status)).length || 0,
      standby_equipment: equipments?.filter(e => e.status === 'standby').length || 0,
      today_repairs: todayRecords?.length || 0,
      completed_repairs: todayRecords?.filter(r => r.status === 'completed').length || 0,
      emergency_count: todayRecords?.filter(r => (r.repair_type as RepairTypeJoin)?.code === 'EM').length || 0,
    }

    return { data: stats, error: null }
  },

  async getEquipmentFailureRank(limit?: number): Promise<{ data: EquipmentFailureRank[] | null; error: string | null }> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data, error } = await getSupabase()
      .from('maintenance_records')
      .select(`
        equipment_id,
        duration_minutes,
        equipment:equipments(equipment_code, equipment_name)
      `)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])

    if (error || !data) {
      return { data: null, error: error?.message || null }
    }

    // Aggregate by equipment
    const counts: Record<string, EquipmentFailureRank> = {}
    data.forEach(record => {
      const eqId = record.equipment_id
      const eq = record.equipment as EquipmentJoin | null
      if (!counts[eqId]) {
        counts[eqId] = {
          equipment_id: eqId,
          equipment_code: eq?.equipment_code || '',
          equipment_name: eq?.equipment_name || '',
          failure_count: 0,
          total_downtime_minutes: 0,
        }
      }
      counts[eqId].failure_count++
      counts[eqId].total_downtime_minutes += record.duration_minutes || 0
    })

    const ranked = Object.values(counts)
      .sort((a, b) => b.failure_count - a.failure_count)
      .slice(0, limit || 10)

    return { data: ranked, error: null }
  },

  async getEquipmentStatusDistribution(): Promise<{ data: { status: string; value: number; color: string }[] | null; error: string | null }> {
    const { data: equipments } = await getSupabase()
      .from('equipments')
      .select('status')
      .eq('is_active', true)

    if (!equipments) {
      return { data: null, error: 'Failed to fetch equipment data' }
    }

    const statusColors: Record<string, string> = {
      normal: '#10B981',
      pm: '#3B82F6',
      repair: '#F59E0B',
      emergency: '#EF4444',
      standby: '#9CA3AF',
    }

    const statusCounts: Record<string, number> = {}
    equipments.forEach(eq => {
      statusCounts[eq.status] = (statusCounts[eq.status] || 0) + 1
    })

    const distribution = Object.entries(statusCounts).map(([status, value]) => ({
      status,
      value,
      color: statusColors[status] || '#9CA3AF',
    }))

    return { data: distribution, error: null }
  },

  async getRepairTypeDistribution(
    filterType?: 'today' | '7days' | '30days' | 'custom',
    startDate?: string,
    endDate?: string
  ): Promise<{ data: RepairTypeDistribution[] | null; error: string | null }> {
    // Calculate date range
    const today = new Date()
    let queryStartDate = startDate
    let queryEndDate = endDate

    if (filterType) {
      switch (filterType) {
        case 'today':
          queryStartDate = today.toISOString().split('T')[0]
          queryEndDate = today.toISOString().split('T')[0]
          break
        case '7days': {
          const sevenDaysAgo = new Date(today)
          sevenDaysAgo.setDate(today.getDate() - 7)
          queryStartDate = sevenDaysAgo.toISOString().split('T')[0]
          queryEndDate = today.toISOString().split('T')[0]
          break
        }
        case '30days': {
          const thirtyDaysAgo = new Date(today)
          thirtyDaysAgo.setDate(today.getDate() - 30)
          queryStartDate = thirtyDaysAgo.toISOString().split('T')[0]
          queryEndDate = today.toISOString().split('T')[0]
          break
        }
      }
    }

    let query = getSupabase()
      .from('maintenance_records')
      .select('repair_type:repair_types(id, code, name, color)')

    if (queryStartDate) {
      query = query.gte('date', queryStartDate)
    }
    if (queryEndDate) {
      query = query.lte('date', queryEndDate)
    }

    const { data, error } = await query

    if (error || !data) {
      return { data: null, error: error?.message || null }
    }

    // Aggregate by repair type
    const typeCounts: Record<string, RepairTypeDistribution> = {}
    data.forEach(record => {
      const rt = record.repair_type as RepairTypeJoin | null
      if (rt?.id && rt?.code) {
        if (!typeCounts[rt.code]) {
          typeCounts[rt.code] = {
            repair_type_id: rt.id,
            code: rt.code,
            name: rt.name || rt.code,
            count: 0,
          }
        }
        typeCounts[rt.code].count++
      }
    })

    return { data: Object.values(typeCounts), error: null }
  },

  async getWeeklyRepairTrend(): Promise<{ data: { dayIndex: number; count: number }[] | null; error: string | null }> {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data, error } = await getSupabase()
      .from('maintenance_records')
      .select('date')
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])

    if (error || !data) {
      return { data: null, error: error?.message || null }
    }

    // Aggregate by day of week
    const dayCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    data.forEach(record => {
      const dayOfWeek = new Date(record.date).getDay()
      dayCounts[dayOfWeek]++
    })

    const trend = Object.entries(dayCounts).map(([dayIndex, count]) => ({
      dayIndex: parseInt(dayIndex),
      count,
    }))

    return { data: trend, error: null }
  },

  async getTechnicianPerformance(): Promise<{ data: TechnicianPerformance[] | null; error: string | null }> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data, error } = await getSupabase()
      .from('maintenance_records')
      .select('technician_id, duration_minutes, rating, technician:users(id, name)')
      .eq('status', 'completed')
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])

    if (error || !data) {
      return { data: null, error: error?.message || null }
    }

    // Aggregate by technician
    const techStats: Record<string, {
      technician_id: string
      technician_name: string
      completed_count: number
      total_repair_time: number
      total_rating: number
      rating_count: number
    }> = {}

    data.forEach(record => {
      const tech = record.technician as TechnicianJoin | null
      if (!tech?.id) return

      if (!techStats[tech.id]) {
        techStats[tech.id] = {
          technician_id: tech.id,
          technician_name: tech.name || '',
          completed_count: 0,
          total_repair_time: 0,
          total_rating: 0,
          rating_count: 0,
        }
      }
      techStats[tech.id].completed_count++
      techStats[tech.id].total_repair_time += record.duration_minutes || 0
      if (record.rating) {
        techStats[tech.id].total_rating += record.rating
        techStats[tech.id].rating_count++
      }
    })

    const performance: TechnicianPerformance[] = Object.values(techStats).map(stat => ({
      technician_id: stat.technician_id,
      technician_name: stat.technician_name,
      completed_count: stat.completed_count,
      avg_repair_time: stat.completed_count > 0 ? stat.total_repair_time / stat.completed_count : 0,
      avg_rating: stat.rating_count > 0 ? stat.total_rating / stat.rating_count : 0,
    }))

    return { data: performance.sort((a, b) => b.completed_count - a.completed_count), error: null }
  },

  async getKPIs(): Promise<{ data: { mtbf: number; mttr: number; availability: number } | null; error: string | null }> {
    // Calculate KPIs from maintenance records
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: records } = await getSupabase()
      .from('maintenance_records')
      .select('duration_minutes, date')
      .eq('status', 'completed')
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])

    const { data: equipments } = await getSupabase()
      .from('equipments')
      .select('id')
      .eq('is_active', true)

    const totalEquipment = equipments?.length || 1
    const totalRecords = records?.length || 0
    const totalDowntime = records?.reduce((sum, r) => sum + (r.duration_minutes || 0), 0) || 0

    // Calculate MTBF (hours): Total operating hours / Number of failures
    const totalHours = 30 * 24 * totalEquipment // 30 days * 24 hours * equipment count
    const mtbf = totalRecords > 0 ? (totalHours - totalDowntime / 60) / totalRecords : totalHours

    // Calculate MTTR (hours): Total repair time / Number of repairs
    const mttr = totalRecords > 0 ? (totalDowntime / 60) / totalRecords : 0

    // Calculate Availability: (Total time - Downtime) / Total time * 100
    const availability = totalHours > 0 ? ((totalHours - totalDowntime / 60) / totalHours) * 100 : 100

    return {
      data: {
        mtbf: Math.round(mtbf * 10) / 10,
        mttr: Math.round(mttr * 10) / 10,
        availability: Math.round(availability * 10) / 10,
      },
      error: null,
    }
  },

  // Filtered Statistics APIs for Analytics Page
  async getFilteredKPIs(filter?: {
    startDate?: string
    endDate?: string
    building?: string
    equipmentTypeId?: string
  }): Promise<{
    data: {
      mtbf: number
      mttr: number
      availability: number
      emergencyRatio: number
      totalRepairs: number
    } | null
    error: string | null
  }> {
    let query = getSupabase()
      .from('maintenance_records')
      .select(`
        duration_minutes,
        repair_type:repair_types(code),
        equipment:equipments(building, equipment_type_id)
      `)
      .eq('status', 'completed')

    if (filter?.startDate) {
      query = query.gte('date', filter.startDate)
    }
    if (filter?.endDate) {
      query = query.lte('date', filter.endDate)
    }

    const { data: records, error } = await query

    if (error) {
      return { data: null, error: error.message }
    }

    // Filter by building and equipment type in memory
    let filteredRecords = records || []
    if (filter?.building) {
      filteredRecords = filteredRecords.filter(r => {
        const eq = r.equipment as { building?: string } | null
        return eq?.building === filter.building
      })
    }
    if (filter?.equipmentTypeId) {
      filteredRecords = filteredRecords.filter(r => {
        const eq = r.equipment as { equipment_type_id?: string } | null
        return eq?.equipment_type_id === filter.equipmentTypeId
      })
    }

    const totalRecords = filteredRecords.length
    const totalDowntime = filteredRecords.reduce((sum, r) => sum + (r.duration_minutes || 0), 0)
    const emergencyCount = filteredRecords.filter(r => {
      const rt = r.repair_type as { code?: string } | null
      return rt?.code === 'EM'
    }).length

    // Calculate days in range
    const startDate = filter?.startDate ? new Date(filter.startDate) : new Date()
    const endDate = filter?.endDate ? new Date(filter.endDate) : new Date()
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))

    const { data: equipments } = await getSupabase()
      .from('equipments')
      .select('id')
      .eq('is_active', true)

    const totalEquipment = equipments?.length || 1
    const totalHours = days * 24 * totalEquipment

    const mtbf = totalRecords > 0 ? (totalHours - totalDowntime / 60) / totalRecords : totalHours
    const mttr = totalRecords > 0 ? (totalDowntime / 60) / totalRecords : 0
    const availability = totalHours > 0 ? ((totalHours - totalDowntime / 60) / totalHours) * 100 : 100
    const emergencyRatio = totalRecords > 0 ? (emergencyCount / totalRecords) * 100 : 0

    return {
      data: {
        mtbf: Math.round(mtbf * 10) / 10,
        mttr: Math.round(mttr * 10) / 10,
        availability: Math.round(availability * 10) / 10,
        emergencyRatio: Math.round(emergencyRatio * 10) / 10,
        totalRepairs: totalRecords,
      },
      error: null,
    }
  },

  async getFilteredEquipmentFailureRank(
    filter?: {
      startDate?: string
      endDate?: string
      building?: string
      equipmentTypeId?: string
    },
    limit?: number
  ): Promise<{ data: EquipmentFailureRank[] | null; error: string | null }> {
    let query = getSupabase()
      .from('maintenance_records')
      .select(`
        equipment_id,
        duration_minutes,
        equipment:equipments(equipment_code, equipment_name, building, equipment_type_id)
      `)

    if (filter?.startDate) {
      query = query.gte('date', filter.startDate)
    }
    if (filter?.endDate) {
      query = query.lte('date', filter.endDate)
    }

    const { data, error } = await query

    if (error || !data) {
      return { data: null, error: error?.message || null }
    }

    // Filter by building and equipment type
    let filteredData = data
    if (filter?.building) {
      filteredData = filteredData.filter(r => {
        const eq = r.equipment as { building?: string } | null
        return eq?.building === filter.building
      })
    }
    if (filter?.equipmentTypeId) {
      filteredData = filteredData.filter(r => {
        const eq = r.equipment as { equipment_type_id?: string } | null
        return eq?.equipment_type_id === filter.equipmentTypeId
      })
    }

    // Aggregate by equipment
    const counts: Record<string, EquipmentFailureRank> = {}
    filteredData.forEach(record => {
      const eqId = record.equipment_id
      const eq = record.equipment as EquipmentJoin | null
      if (!counts[eqId]) {
        counts[eqId] = {
          equipment_id: eqId,
          equipment_code: eq?.equipment_code || '',
          equipment_name: eq?.equipment_name || '',
          failure_count: 0,
          total_downtime_minutes: 0,
        }
      }
      counts[eqId].failure_count++
      counts[eqId].total_downtime_minutes += record.duration_minutes || 0
    })

    const ranked = Object.values(counts)
      .sort((a, b) => b.failure_count - a.failure_count)
      .slice(0, limit || 10)

    return { data: ranked, error: null }
  },

  async getFilteredRepairTypeDistribution(filter?: {
    startDate?: string
    endDate?: string
    building?: string
    equipmentTypeId?: string
  }): Promise<{ data: RepairTypeDistribution[] | null; error: string | null }> {
    let query = getSupabase()
      .from('maintenance_records')
      .select(`
        repair_type:repair_types(id, code, name),
        equipment:equipments(building, equipment_type_id)
      `)

    if (filter?.startDate) {
      query = query.gte('date', filter.startDate)
    }
    if (filter?.endDate) {
      query = query.lte('date', filter.endDate)
    }

    const { data, error } = await query

    if (error || !data) {
      return { data: null, error: error?.message || null }
    }

    // Filter by building and equipment type
    let filteredData = data
    if (filter?.building) {
      filteredData = filteredData.filter(r => {
        const eq = r.equipment as { building?: string } | null
        return eq?.building === filter.building
      })
    }
    if (filter?.equipmentTypeId) {
      filteredData = filteredData.filter(r => {
        const eq = r.equipment as { equipment_type_id?: string } | null
        return eq?.equipment_type_id === filter.equipmentTypeId
      })
    }

    // Aggregate by repair type
    const typeCounts: Record<string, RepairTypeDistribution> = {}
    filteredData.forEach(record => {
      const rt = record.repair_type as RepairTypeJoin | null
      if (rt?.id && rt?.code) {
        if (!typeCounts[rt.code]) {
          typeCounts[rt.code] = {
            repair_type_id: rt.id,
            code: rt.code,
            name: rt.name || rt.code,
            count: 0,
          }
        }
        typeCounts[rt.code].count++
      }
    })

    return { data: Object.values(typeCounts), error: null }
  },

  async getFilteredMonthlyRepairTrend(filter?: {
    startDate?: string
    endDate?: string
    building?: string
    equipmentTypeId?: string
  }): Promise<{ data: { monthIndex: number; count: number }[] | null; error: string | null }> {
    let query = getSupabase()
      .from('maintenance_records')
      .select(`
        date,
        equipment:equipments(building, equipment_type_id)
      `)

    if (filter?.startDate) {
      query = query.gte('date', filter.startDate)
    }
    if (filter?.endDate) {
      query = query.lte('date', filter.endDate)
    }

    const { data, error } = await query

    if (error || !data) {
      return { data: null, error: error?.message || null }
    }

    // Filter by building and equipment type
    let filteredData = data
    if (filter?.building) {
      filteredData = filteredData.filter(r => {
        const eq = r.equipment as { building?: string } | null
        return eq?.building === filter.building
      })
    }
    if (filter?.equipmentTypeId) {
      filteredData = filteredData.filter(r => {
        const eq = r.equipment as { equipment_type_id?: string } | null
        return eq?.equipment_type_id === filter.equipmentTypeId
      })
    }

    // Aggregate by month
    const monthCounts: Record<number, number> = {}
    filteredData.forEach(record => {
      const month = new Date(record.date).getMonth() + 1
      monthCounts[month] = (monthCounts[month] || 0) + 1
    })

    const trend = Object.entries(monthCounts)
      .map(([monthIndex, count]) => ({
        monthIndex: parseInt(monthIndex),
        count,
      }))
      .sort((a, b) => a.monthIndex - b.monthIndex)

    return { data: trend, error: null }
  },

  async getFilteredBuildingFailureStats(filter?: {
    startDate?: string
    endDate?: string
    equipmentTypeId?: string
  }): Promise<{ data: { building: string; failure_count: number; total_downtime_minutes: number }[] | null; error: string | null }> {
    let query = getSupabase()
      .from('maintenance_records')
      .select(`
        duration_minutes,
        equipment:equipments(building, equipment_type_id)
      `)

    if (filter?.startDate) {
      query = query.gte('date', filter.startDate)
    }
    if (filter?.endDate) {
      query = query.lte('date', filter.endDate)
    }

    const { data, error } = await query

    if (error || !data) {
      return { data: null, error: error?.message || null }
    }

    // Filter by equipment type
    let filteredData = data
    if (filter?.equipmentTypeId) {
      filteredData = filteredData.filter(r => {
        const eq = r.equipment as { equipment_type_id?: string } | null
        return eq?.equipment_type_id === filter.equipmentTypeId
      })
    }

    // Aggregate by building
    const buildingStats: Record<string, { building: string; failure_count: number; total_downtime_minutes: number }> = {}
    filteredData.forEach(record => {
      const eq = record.equipment as { building?: string } | null
      const building = eq?.building || 'Unknown'
      if (!buildingStats[building]) {
        buildingStats[building] = { building, failure_count: 0, total_downtime_minutes: 0 }
      }
      buildingStats[building].failure_count++
      buildingStats[building].total_downtime_minutes += record.duration_minutes || 0
    })

    return { data: Object.values(buildingStats), error: null }
  },

  async getFilteredTechnicianPerformance(filter?: {
    startDate?: string
    endDate?: string
    building?: string
    equipmentTypeId?: string
  }): Promise<{ data: TechnicianPerformance[] | null; error: string | null }> {
    let query = getSupabase()
      .from('maintenance_records')
      .select(`
        technician_id,
        duration_minutes,
        rating,
        technician:users(id, name),
        equipment:equipments(building, equipment_type_id)
      `)
      .eq('status', 'completed')

    if (filter?.startDate) {
      query = query.gte('date', filter.startDate)
    }
    if (filter?.endDate) {
      query = query.lte('date', filter.endDate)
    }

    const { data, error } = await query

    if (error || !data) {
      return { data: null, error: error?.message || null }
    }

    // Filter by building and equipment type
    let filteredData = data
    if (filter?.building) {
      filteredData = filteredData.filter(r => {
        const eq = r.equipment as { building?: string } | null
        return eq?.building === filter.building
      })
    }
    if (filter?.equipmentTypeId) {
      filteredData = filteredData.filter(r => {
        const eq = r.equipment as { equipment_type_id?: string } | null
        return eq?.equipment_type_id === filter.equipmentTypeId
      })
    }

    // Aggregate by technician
    const techStats: Record<string, {
      technician_id: string
      technician_name: string
      completed_count: number
      total_repair_time: number
      total_rating: number
      rating_count: number
    }> = {}

    filteredData.forEach(record => {
      const tech = record.technician as TechnicianJoin | null
      if (!tech?.id) return

      if (!techStats[tech.id]) {
        techStats[tech.id] = {
          technician_id: tech.id,
          technician_name: tech.name || '',
          completed_count: 0,
          total_repair_time: 0,
          total_rating: 0,
          rating_count: 0,
        }
      }
      techStats[tech.id].completed_count++
      techStats[tech.id].total_repair_time += record.duration_minutes || 0
      if (record.rating) {
        techStats[tech.id].total_rating += record.rating
        techStats[tech.id].rating_count++
      }
    })

    const performance: TechnicianPerformance[] = Object.values(techStats).map(stat => ({
      technician_id: stat.technician_id,
      technician_name: stat.technician_name,
      completed_count: stat.completed_count,
      avg_repair_time: stat.completed_count > 0 ? Math.round(stat.total_repair_time / stat.completed_count) : 0,
      avg_rating: stat.rating_count > 0 ? Math.round((stat.total_rating / stat.rating_count) * 10) / 10 : 0,
    }))

    return { data: performance.sort((a, b) => b.completed_count - a.completed_count), error: null }
  },
}

// ========================================
// PM API
// ========================================
export const pmApi = {
  async getSchedules(filter?: {
    status?: string
    equipmentTypeId?: string
    technicianId?: string
    startDate?: string
    endDate?: string
  }): Promise<{ data: PMSchedule[] | null; error: string | null }> {
    let query = getSupabase()
      .from('pm_schedules')
      .select(`
        *,
        equipment:equipments(*,equipment_type:equipment_types(*)),
        template:pm_templates(*),
        assigned_technician:users(*)
      `)
      .order('scheduled_date', { ascending: true })

    if (filter?.status) {
      query = query.eq('status', filter.status)
    }
    if (filter?.technicianId) {
      query = query.eq('assigned_technician_id', filter.technicianId)
    }
    if (filter?.startDate) {
      query = query.gte('scheduled_date', filter.startDate)
    }
    if (filter?.endDate) {
      query = query.lte('scheduled_date', filter.endDate)
    }

    const { data, error } = await query

    return { data, error: error?.message || null }
  },

  async getTemplates(): Promise<{ data: PMTemplate[] | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('pm_templates')
      .select(`
        *,
        equipment_type:equipment_types(*)
      `)
      .eq('is_active', true)
      .order('name')

    return { data, error: error?.message || null }
  },

  async getTodaySchedules(): Promise<{ data: PMSchedule[] | null; error: string | null }> {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await getSupabase()
      .from('pm_schedules')
      .select(`
        *,
        equipment:equipments(*,equipment_type:equipment_types(*)),
        template:pm_templates(*),
        assigned_technician:users(*)
      `)
      .eq('scheduled_date', today)
      .order('priority')

    return { data, error: error?.message || null }
  },

  async getOverdueSchedules(): Promise<{ data: PMSchedule[] | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('pm_schedules')
      .select(`
        *,
        equipment:equipments(*,equipment_type:equipment_types(*)),
        template:pm_templates(*),
        assigned_technician:users(*)
      `)
      .eq('status', 'overdue')
      .order('scheduled_date')

    return { data, error: error?.message || null }
  },

  async getUpcomingSchedules(days: number = 7): Promise<{ data: PMSchedule[] | null; error: string | null }> {
    const today = new Date().toISOString().split('T')[0]
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + days)
    const endDateStr = endDate.toISOString().split('T')[0]

    const { data, error } = await getSupabase()
      .from('pm_schedules')
      .select(`
        *,
        equipment:equipments(*,equipment_type:equipment_types(*)),
        template:pm_templates(*),
        assigned_technician:users(*)
      `)
      .gte('scheduled_date', today)
      .lte('scheduled_date', endDateStr)
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_date')

    return { data, error: error?.message || null }
  },

  async getSchedulesByMonth(yearMonth: string): Promise<{ data: PMSchedule[] | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('pm_schedules')
      .select(`
        *,
        equipment:equipments(*,equipment_type:equipment_types(*)),
        template:pm_templates(*),
        assigned_technician:users(*)
      `)
      .like('scheduled_date', `${yearMonth}%`)
      .order('scheduled_date')

    return { data, error: error?.message || null }
  },

  async getScheduleById(id: string): Promise<{ data: PMSchedule | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('pm_schedules')
      .select(`
        *,
        equipment:equipments(*,equipment_type:equipment_types(*)),
        template:pm_templates(*),
        assigned_technician:users(*)
      `)
      .eq('id', id)
      .single()

    return { data, error: error?.message || null }
  },

  async createSchedule(form: {
    template_id: string
    equipment_id: string
    scheduled_date: string
    assigned_technician_id?: string
    priority?: 'high' | 'medium' | 'low'
    notes?: string
  }): Promise<{ data: PMSchedule | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('pm_schedules')
      .insert({
        ...form,
        status: 'scheduled',
      })
      .select(`
        *,
        equipment:equipments(*,equipment_type:equipment_types(*)),
        template:pm_templates(*),
        assigned_technician:users(*)
      `)
      .single()

    return { data, error: error?.message || null }
  },

  async getComplianceStats(months?: number): Promise<{ data: { period: string; scheduled_count: number; completed_count: number; overdue_count: number; cancelled_count: number; compliance_rate: number }[] | null; error: string | null }> {
    const monthsToFetch = months || 6
    const results: { period: string; scheduled_count: number; completed_count: number; overdue_count: number; cancelled_count: number; compliance_rate: number }[] = []

    for (let i = 0; i < monthsToFetch; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      const { data: schedules } = await getSupabase()
        .from('pm_schedules')
        .select('status')
        .like('scheduled_date', `${yearMonth}%`)

      const scheduled_count = schedules?.filter(s => s.status === 'scheduled' || s.status === 'in_progress').length || 0
      const completed_count = schedules?.filter(s => s.status === 'completed').length || 0
      const overdue_count = schedules?.filter(s => s.status === 'overdue').length || 0
      const cancelled_count = schedules?.filter(s => s.status === 'cancelled').length || 0
      const total = completed_count + overdue_count
      const compliance_rate = total > 0 ? Math.round((completed_count / total) * 100) : 100

      results.push({ period: yearMonth, scheduled_count, completed_count, overdue_count, cancelled_count, compliance_rate })
    }

    return { data: results.reverse(), error: null }
  },

  // PM Template CRUD
  async createTemplate(template: Partial<PMTemplate>): Promise<{ data: PMTemplate | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('pm_templates')
      .insert({ ...template, is_active: true })
      .select(`*, equipment_type:equipment_types(*)`)
      .single()

    return { data, error: error?.message || null }
  },

  async updateTemplate(id: string, updates: Partial<PMTemplate>): Promise<{ data: PMTemplate | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('pm_templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`*, equipment_type:equipment_types(*)`)
      .single()

    return { data, error: error?.message || null }
  },

  async deleteTemplate(id: string): Promise<{ error: string | null }> {
    const { error } = await getSupabase()
      .from('pm_templates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    return { error: error?.message || null }
  },

  // PM Execution functions
  async getExecutionBySchedule(scheduleId: string): Promise<{ data: unknown | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('pm_executions')
      .select(`
        *,
        schedule:pm_schedules(*),
        equipment:equipments(*),
        technician:users(*)
      `)
      .eq('schedule_id', scheduleId)
      .maybeSingle()

    return { data, error: error?.message || null }
  },

  async startExecution(scheduleId: string, technicianId: string): Promise<{ data: unknown | null; error: string | null }> {
    // Get schedule info
    const { data: schedule } = await getSupabase()
      .from('pm_schedules')
      .select('equipment_id')
      .eq('id', scheduleId)
      .single()

    if (!schedule) {
      return { data: null, error: 'Schedule not found' }
    }

    // Update schedule status
    await getSupabase()
      .from('pm_schedules')
      .update({ status: 'in_progress', assigned_technician_id: technicianId })
      .eq('id', scheduleId)

    // Create execution
    const { data, error } = await getSupabase()
      .from('pm_executions')
      .insert({
        schedule_id: scheduleId,
        equipment_id: schedule.equipment_id,
        technician_id: technicianId,
        started_at: new Date().toISOString(),
        status: 'in_progress',
        checklist_results: [],
        used_parts: [],
      })
      .select(`
        *,
        schedule:pm_schedules(*),
        equipment:equipments(*),
        technician:users(*)
      `)
      .single()

    return { data, error: error?.message || null }
  },

  async updateExecution(id: string, updates: Record<string, unknown>): Promise<{ data: unknown | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('pm_executions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    return { data, error: error?.message || null }
  },

  async completeExecution(id: string, completionData: {
    checklist_results: unknown[]
    used_parts: unknown[]
    findings?: string
    findings_severity?: string
    rating?: number
    notes?: string
  }): Promise<{ data: unknown | null; error: string | null }> {
    // Get execution to find schedule
    const { data: execution } = await getSupabase()
      .from('pm_executions')
      .select('schedule_id, started_at')
      .eq('id', id)
      .single()

    const completedAt = new Date().toISOString()
    const durationMinutes = execution?.started_at
      ? Math.round((new Date(completedAt).getTime() - new Date(execution.started_at).getTime()) / (1000 * 60))
      : 0

    const { data, error } = await getSupabase()
      .from('pm_executions')
      .update({
        ...completionData,
        completed_at: completedAt,
        duration_minutes: durationMinutes,
        status: 'completed',
      })
      .eq('id', id)
      .select()
      .single()

    // Update schedule status
    if (execution?.schedule_id) {
      await getSupabase()
        .from('pm_schedules')
        .update({ status: 'completed' })
        .eq('id', execution.schedule_id)
    }

    return { data, error: error?.message || null }
  },

  async getDashboardStats(): Promise<{ data: { total_scheduled: number; completed_this_month: number; overdue_count: number; upcoming_week: number; compliance_rate: number } | null; error: string | null }> {
    const today = new Date().toISOString().split('T')[0]
    const weekLater = new Date()
    weekLater.setDate(weekLater.getDate() + 7)
    const monthStart = today.slice(0, 8) + '01'

    const { data: schedules } = await getSupabase()
      .from('pm_schedules')
      .select('status, scheduled_date')

    const upcomingScheduled = schedules?.filter(s =>
      s.scheduled_date >= today &&
      s.scheduled_date <= weekLater.toISOString().split('T')[0] &&
      (s.status === 'scheduled' || s.status === 'in_progress')
    ).length || 0

    const completedThisMonth = schedules?.filter(s =>
      s.scheduled_date >= monthStart &&
      s.status === 'completed'
    ).length || 0

    const overdueCount = schedules?.filter(s => s.status === 'overdue').length || 0
    const totalScheduled = schedules?.filter(s => s.status === 'scheduled' || s.status === 'in_progress').length || 0

    // Calculate compliance rate
    const totalEvaluated = completedThisMonth + overdueCount
    const complianceRate = totalEvaluated > 0 ? Math.round((completedThisMonth / totalEvaluated) * 100) : 100

    const stats = {
      total_scheduled: totalScheduled,
      completed_this_month: completedThisMonth,
      overdue_count: overdueCount,
      upcoming_week: upcomingScheduled,
      compliance_rate: complianceRate,
    }

    return { data: stats, error: null }
  },

  // PM Analytics - Monthly Trend
  async getMonthlyTrend(months: number = 6): Promise<{ data: { month: string; completed: number; scheduled: number; compliance: number }[] | null; error: string | null }> {
    const results: { month: string; completed: number; scheduled: number; compliance: number }[] = []

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleDateString('ko-KR', { month: 'short' })

      const { data: schedules } = await getSupabase()
        .from('pm_schedules')
        .select('status')
        .like('scheduled_date', `${yearMonth}%`)

      const scheduled = schedules?.length || 0
      const completed = schedules?.filter(s => s.status === 'completed').length || 0
      const compliance = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0

      results.push({ month: monthName, completed, scheduled, compliance })
    }

    return { data: results, error: null }
  },

  // PM Analytics - By Equipment Type
  async getByEquipmentType(): Promise<{ data: { name: string; completed: number; overdue: number }[] | null; error: string | null }> {
    const { data: schedules } = await getSupabase()
      .from('pm_schedules')
      .select(`
        status,
        equipment_id,
        equipments!inner(equipment_type_id, equipment_types!inner(id, name))
      `)

    if (!schedules) return { data: [], error: null }

    // Group by equipment type
    const typeMap: Record<string, { name: string; completed: number; overdue: number }> = {}

    ;(schedules as Record<string, unknown>[]).forEach((s) => {
      const equipment = s.equipments as Record<string, unknown> | null
      const equipmentType = equipment?.equipment_types as Record<string, unknown> | null
      const typeName = (equipmentType?.name as string) || 'Unknown'
      const status = s.status as string

      if (!typeMap[typeName]) {
        typeMap[typeName] = { name: typeName, completed: 0, overdue: 0 }
      }
      if (status === 'completed') typeMap[typeName].completed++
      if (status === 'overdue') typeMap[typeName].overdue++
    })

    return { data: Object.values(typeMap), error: null }
  },

  // PM Analytics - By Technician
  async getByTechnician(): Promise<{ data: { name: string; completed: number; avgRating: number }[] | null; error: string | null }> {
    const { data: executions } = await getSupabase()
      .from('pm_executions')
      .select(`
        status,
        rating,
        technician_id,
        users!inner(id, name)
      `)
      .eq('status', 'completed')

    if (!executions) return { data: [], error: null }

    // Group by technician
    const techMap: Record<string, { name: string; completed: number; totalRating: number; count: number }> = {}

    ;(executions as Record<string, unknown>[]).forEach((e) => {
      const user = e.users as Record<string, unknown> | null
      const techName = (user?.name as string) || 'Unknown'
      const rating = e.rating as number | null

      if (!techMap[techName]) {
        techMap[techName] = { name: techName, completed: 0, totalRating: 0, count: 0 }
      }
      techMap[techName].completed++
      if (rating) {
        techMap[techName].totalRating += rating
        techMap[techName].count++
      }
    })

    const result = Object.values(techMap).map(t => ({
      name: t.name,
      completed: t.completed,
      avgRating: t.count > 0 ? Math.round((t.totalRating / t.count) * 10) / 10 : 0,
    })).sort((a, b) => b.completed - a.completed).slice(0, 5)

    return { data: result, error: null }
  },

  // PM Analytics - Status Distribution
  async getStatusDistribution(): Promise<{ data: { status: string; count: number }[] | null; error: string | null }> {
    const { data: schedules } = await getSupabase()
      .from('pm_schedules')
      .select('status')

    if (!schedules) return { data: [], error: null }

    const statusCount: Record<string, number> = {}
    schedules.forEach((s: { status: string }) => {
      statusCount[s.status] = (statusCount[s.status] || 0) + 1
    })

    return {
      data: Object.entries(statusCount).map(([status, count]) => ({ status, count })),
      error: null
    }
  },

  // PM Analytics - Average Completion Time
  async getAvgCompletionTime(): Promise<{ data: number | null; error: string | null }> {
    const { data: executions } = await getSupabase()
      .from('pm_executions')
      .select('duration_minutes')
      .eq('status', 'completed')
      .not('duration_minutes', 'is', null)

    if (!executions || executions.length === 0) return { data: 0, error: null }

    const total = executions.reduce((sum: number, e: { duration_minutes: number }) => sum + e.duration_minutes, 0)
    return { data: Math.round(total / executions.length), error: null }
  },
}

// ========================================
// Notifications API
// ========================================
export const notificationsApi = {
  async getNotifications(userId?: string): Promise<{ data: unknown[] | null; error: string | null }> {
    let query = getSupabase()
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query
    return { data, error: error?.message || null }
  },

  async markAsRead(id: string): Promise<{ error: string | null }> {
    const { error } = await getSupabase()
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id)

    return { error: error?.message || null }
  },

  async markAllAsRead(userId: string): Promise<{ error: string | null }> {
    const { error } = await getSupabase()
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false)

    return { error: error?.message || null }
  },

  async deleteNotification(id: string): Promise<{ error: string | null }> {
    const { error } = await getSupabase()
      .from('notifications')
      .delete()
      .eq('id', id)

    return { error: error?.message || null }
  },

  async clearRead(userId: string): Promise<{ error: string | null }> {
    const { error } = await getSupabase()
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('is_read', true)

    return { error: error?.message || null }
  },
}

// ========================================
// AI API
// ========================================
export const aiApi = {
  async getInsights(): Promise<{ data: AIInsight[] | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('ai_insights')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(20)

    return { data, error: error?.message || null }
  },

  async getInsightSummary(): Promise<{
    data: {
      total_insights: number
      high_priority: number
      anomalies: number
      predictions: number
      last_updated: string
    } | null
    error: string | null
  }> {
    const { data: insights, error } = await getSupabase()
      .from('ai_insights')
      .select('*')
      .order('generated_at', { ascending: false })

    if (error || !insights) {
      return { data: null, error: error?.message || null }
    }

    const summary = {
      total_insights: insights.length,
      high_priority: insights.filter(i => i.severity === 'critical' || (i.data as { urgency?: string })?.urgency === 'high').length,
      anomalies: insights.filter(i => i.insight_type === 'anomaly').length,
      predictions: insights.filter(i => i.insight_type === 'prediction').length,
      last_updated: insights[0]?.generated_at || new Date().toISOString(),
    }

    return { data: summary, error: null }
  },

  async refreshInsights(): Promise<{ data: AIInsight[] | null; error: string | null }> {
    const edgeFunctionUrl = getEdgeFunctionUrl('ai-generate-insights')
    if (!edgeFunctionUrl) {
      return { data: null, error: 'Edge function URL not configured' }
    }

    try {
      const { data: { session } } = await getSupabase().auth.getSession()

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: null, error: errorData.error || 'Failed to refresh insights' }
      }

      const result = await response.json()
      return { data: result.insights, error: null }
    } catch (error) {
      return { data: null, error: (error as Error).message }
    }
  },

  async chat(message: string, language: string = 'ko'): Promise<{ data: { response: string } | null; error: string | null }> {
    const edgeFunctionUrl = getEdgeFunctionUrl('ai-chat')
    if (!edgeFunctionUrl) {
      return { data: null, error: 'Edge function URL not configured' }
    }

    try {
      const { data: { session } } = await getSupabase().auth.getSession()

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ message, language }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { data: { response: errorData.response || errorData.error }, error: errorData.error }
      }

      const result = await response.json()
      return { data: { response: result.response }, error: null }
    } catch (error) {
      return { data: null, error: (error as Error).message }
    }
  },
}

// ========================================
// Reports API
// ========================================
export const reportsApi = {
  async getReports(filter?: {
    type?: string
    startDate?: string
    endDate?: string
    limit?: number
  }): Promise<{ data: unknown[] | null; error: string | null }> {
    let query = getSupabase()
      .from('generated_reports')
      .select(`
        *,
        generated_by_user:users(id, name, email)
      `)
      .order('created_at', { ascending: false })

    if (filter?.type) {
      query = query.eq('type', filter.type)
    }
    if (filter?.startDate) {
      query = query.gte('period_start', filter.startDate)
    }
    if (filter?.endDate) {
      query = query.lte('period_end', filter.endDate)
    }
    if (filter?.limit) {
      query = query.limit(filter.limit)
    }

    const { data, error } = await query
    return { data, error: error?.message || null }
  },

  async getReportById(id: string): Promise<{ data: unknown | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('generated_reports')
      .select(`
        *,
        generated_by_user:users(id, name, email)
      `)
      .eq('id', id)
      .single()

    return { data, error: error?.message || null }
  },

  async createReport(report: {
    name: string
    type: 'daily' | 'weekly' | 'monthly' | 'custom'
    period_start: string
    period_end: string
    generated_by: string
    file_url?: string
    file_size?: number
    status?: 'generating' | 'completed' | 'failed'
    report_data?: Record<string, unknown>
  }): Promise<{ data: unknown | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('generated_reports')
      .insert(report)
      .select()
      .single()

    return { data, error: error?.message || null }
  },

  async updateReport(id: string, updates: {
    file_url?: string
    file_size?: number
    status?: 'generating' | 'completed' | 'failed'
    report_data?: Record<string, unknown>
  }): Promise<{ data: unknown | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('generated_reports')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    return { data, error: error?.message || null }
  },

  async deleteReport(id: string): Promise<{ error: string | null }> {
    const { error } = await getSupabase()
      .from('generated_reports')
      .delete()
      .eq('id', id)

    return { error: error?.message || null }
  },
}

// ========================================
// AI Chat History API
// ========================================
export const chatHistoryApi = {
  async getChatHistory(userId: string, sessionId?: string): Promise<{ data: unknown[] | null; error: string | null }> {
    let query = getSupabase()
      .from('ai_chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    const { data, error } = await query
    return { data, error: error?.message || null }
  },

  async getChatSessions(userId: string): Promise<{ data: unknown[] | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('ai_chat_history')
      .select('session_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error || !data) {
      return { data: null, error: error?.message || null }
    }

    // Get unique sessions with their first message time
    const sessions = [...new Set(data.map(d => d.session_id))].map(sessionId => {
      const firstMessage = data.find(d => d.session_id === sessionId)
      return { session_id: sessionId, created_at: firstMessage?.created_at }
    })

    return { data: sessions, error: null }
  },

  async addMessage(message: {
    user_id: string
    session_id: string
    role: 'user' | 'assistant'
    content: string
    language?: string
    metadata?: Record<string, unknown>
  }): Promise<{ data: unknown | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('ai_chat_history')
      .insert(message)
      .select()
      .single()

    return { data, error: error?.message || null }
  },

  async deleteSession(userId: string, sessionId: string): Promise<{ error: string | null }> {
    const { error } = await getSupabase()
      .from('ai_chat_history')
      .delete()
      .eq('user_id', userId)
      .eq('session_id', sessionId)

    return { error: error?.message || null }
  },

  async clearAllHistory(userId: string): Promise<{ error: string | null }> {
    const { error } = await getSupabase()
      .from('ai_chat_history')
      .delete()
      .eq('user_id', userId)

    return { error: error?.message || null }
  },
}

// ========================================
// Settings API
// ========================================
export const settingsApi = {
  async getAll(): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('settings')
      .select('*')

    if (error) {
      return { data: null, error: error.message }
    }

    // Convert array to object keyed by setting key
    const settingsObject: Record<string, unknown> = {}
    if (data) {
      data.forEach((setting: { key: string; value: unknown }) => {
        settingsObject[setting.key] = setting.value
      })
    }

    return { data: settingsObject, error: null }
  },

  async get(key: string): Promise<{ data: unknown | null; error: string | null }> {
    const { data, error } = await getSupabase()
      .from('settings')
      .select('*')
      .eq('key', key)
      .maybeSingle()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data?.value || null, error: null }
  },

  async set(key: string, value: unknown, description?: string, updatedBy?: string): Promise<{ error: string | null }> {
    const { error } = await getSupabase()
      .from('settings')
      .upsert({
        key,
        value,
        description,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key',
      })

    return { error: error?.message || null }
  },

  async setMultiple(settings: { key: string; value: unknown; description?: string }[], updatedBy?: string): Promise<{ error: string | null }> {
    const settingsToUpsert = settings.map(s => ({
      key: s.key,
      value: s.value,
      description: s.description,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await getSupabase()
      .from('settings')
      .upsert(settingsToUpsert, {
        onConflict: 'key',
      })

    return { error: error?.message || null }
  },

  async delete(key: string): Promise<{ error: string | null }> {
    const { error } = await getSupabase()
      .from('settings')
      .delete()
      .eq('key', key)

    return { error: error?.message || null }
  },
}

// ========================================
// Export all APIs
// ========================================
export const api = {
  equipment: equipmentApi,
  maintenance: maintenanceApi,
  users: usersApi,
  statistics: statisticsApi,
  pm: pmApi,
  notifications: notificationsApi,
  ai: aiApi,
  reports: reportsApi,
  chatHistory: chatHistoryApi,
  settings: settingsApi,
}

export default api
