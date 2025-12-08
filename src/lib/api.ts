/**
 * Unified API Layer
 * Automatically switches between Supabase (real) and Mock data based on connection status
 */

import { supabase, isMainSupabaseConnected } from './supabase'
import {
  mockEquipmentApi,
  mockMaintenanceApi,
  mockUsersApi,
  mockStatisticsApi,
  mockPMApi,
  mockAIApi as mockAI,
} from '@/mock/api'
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

// Type guard for PMScheduleStatus
function isPMScheduleStatus(status: string): status is PMScheduleStatus {
  return ['scheduled', 'in_progress', 'completed', 'overdue', 'cancelled'].includes(status)
}

/**
 * Check if we should use Supabase
 * Returns true only if:
 * 1. Supabase is connected (isMainSupabaseConnected())
 * 2. Supabase client is not null
 * When this returns true, supabase is guaranteed to be non-null
 */
const shouldUseSupabase = (): boolean => isMainSupabaseConnected() && supabase !== null

/**
 * Get non-null Supabase client
 * Call only after shouldUseSupabase() returns true
 */
const getSupabase = () => supabase!

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
    if (!shouldUseSupabase()) {
      return mockEquipmentApi.getEquipments()
    }

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
    if (!shouldUseSupabase()) {
      return mockEquipmentApi.getEquipmentById(id)
    }

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
    if (!shouldUseSupabase()) {
      return mockEquipmentApi.getEquipmentTypes()
    }

    const { data, error } = await getSupabase()
      .from('equipment_types')
      .select('*')
      .eq('is_active', true)
      .order('code')

    return { data, error: error?.message || null }
  },

  async updateEquipmentStatus(id: string, status: string): Promise<{ data: Equipment | null; error: string | null }> {
    if (!shouldUseSupabase()) {
      if (!isEquipmentStatus(status)) {
        return { data: null, error: 'Invalid equipment status' }
      }
      return mockEquipmentApi.updateEquipmentStatus(id, status)
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
    if (!shouldUseSupabase()) {
      return { data: null, error: 'Mock API does not support create' }
    }

    const { data, error } = await getSupabase()
      .from('equipments')
      .insert(equipment)
      .select()
      .single()

    return { data, error: error?.message || null }
  },

  async updateEquipment(id: string, updates: Partial<Equipment>): Promise<{ data: Equipment | null; error: string | null }> {
    if (!shouldUseSupabase()) {
      return { data: null, error: 'Mock API does not support update' }
    }

    const { data, error } = await getSupabase()
      .from('equipments')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    return { data, error: error?.message || null }
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
    if (!shouldUseSupabase()) {
      const status = filter?.status
      return mockMaintenanceApi.getMaintenanceRecords({
        start_date: filter?.startDate,
        end_date: filter?.endDate,
        repair_type_id: filter?.repairTypeId,
        technician_id: filter?.technicianId,
        status: status === 'in_progress' || status === 'completed' ? status : undefined,
        equipment_id: filter?.equipmentId,
      })
    }

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
    if (!shouldUseSupabase()) {
      return mockMaintenanceApi.getInProgressRecords()
    }

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
    if (!shouldUseSupabase()) {
      return mockMaintenanceApi.getTodayRecords()
    }

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
    if (!shouldUseSupabase()) {
      const result = await mockMaintenanceApi.getTodayRecords()
      return {
        data: result.data?.filter(r => r.status === 'completed') || null,
        error: result.error
      }
    }

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
    if (!shouldUseSupabase()) {
      return mockMaintenanceApi.getRepairTypes()
    }

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
    if (!shouldUseSupabase()) {
      return mockMaintenanceApi.startMaintenance(
        {
          date: record.date,
          equipment_id: record.equipment_id,
          repair_type_id: record.repair_type_id,
          symptom: record.symptom,
          start_time: record.start_time,
        },
        record.technician_id
      )
    }

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
    if (!shouldUseSupabase()) {
      return mockMaintenanceApi.completeMaintenance(id, {
        end_time: updates.end_time,
        repair_content: updates.repair_content,
        rating: updates.rating,
      })
    }

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
    if (!shouldUseSupabase()) {
      return mockUsersApi.getUsers()
    }

    const { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .eq('is_active', true)
      .order('name')

    return { data, error: error?.message || null }
  },

  async getTechnicians(): Promise<{ data: User[] | null; error: string | null }> {
    if (!shouldUseSupabase()) {
      return mockUsersApi.getTechnicians()
    }

    const { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .eq('is_active', true)
      .in('role', [2, 3]) // Supervisor and Technician
      .order('name')

    return { data, error: error?.message || null }
  },

  async getUserById(id: string): Promise<{ data: User | null; error: string | null }> {
    if (!shouldUseSupabase()) {
      return mockUsersApi.getUserById(id)
    }

    const { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    return { data, error: error?.message || null }
  },
}

// ========================================
// Statistics API
// ========================================
export const statisticsApi = {
  async getDashboardStats(): Promise<{ data: DashboardStats | null; error: string | null }> {
    if (!shouldUseSupabase()) {
      return mockStatisticsApi.getDashboardStats()
    }

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
    if (!shouldUseSupabase()) {
      return mockStatisticsApi.getEquipmentFailureRank(limit)
    }

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
    if (!shouldUseSupabase()) {
      return mockStatisticsApi.getEquipmentStatusDistribution()
    }

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
    if (!shouldUseSupabase()) {
      return mockStatisticsApi.getRepairTypeDistribution(filterType, startDate, endDate)
    }

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
    if (!shouldUseSupabase()) {
      return mockStatisticsApi.getWeeklyRepairTrend()
    }

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
    if (!shouldUseSupabase()) {
      return mockStatisticsApi.getTechnicianPerformance()
    }

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
    if (!shouldUseSupabase()) {
      return mockStatisticsApi.getKPIs()
    }

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
    if (!shouldUseSupabase()) {
      const status = filter?.status
      return mockPMApi.getSchedules({
        status: status && isPMScheduleStatus(status) ? status : undefined,
        equipment_type_id: filter?.equipmentTypeId,
        technician_id: filter?.technicianId,
        start_date: filter?.startDate,
        end_date: filter?.endDate,
      })
    }

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
    if (!shouldUseSupabase()) {
      return mockPMApi.getTemplates()
    }

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
    if (!shouldUseSupabase()) {
      return mockPMApi.getTodaySchedules()
    }

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
    if (!shouldUseSupabase()) {
      return mockPMApi.getOverdueSchedules()
    }

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
    if (!shouldUseSupabase()) {
      return mockPMApi.getUpcomingSchedules(days)
    }

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

  async getDashboardStats(): Promise<{ data: { total_scheduled: number; completed_this_month: number; overdue_count: number; upcoming_week: number; compliance_rate: number } | null; error: string | null }> {
    if (!shouldUseSupabase()) {
      return mockPMApi.getDashboardStats()
    }

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
}

// ========================================
// AI API
// ========================================
export const aiApi = {
  async getInsights(): Promise<{ data: AIInsight[] | null; error: string | null }> {
    if (!shouldUseSupabase()) {
      return mockAI.getInsights()
    }

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
    if (!shouldUseSupabase()) {
      return mockAI.getInsightSummary()
    }

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
    if (!shouldUseSupabase()) {
      return mockAI.refreshInsights()
    }

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
    if (!shouldUseSupabase()) {
      return mockAI.chat(message)
    }

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
// Export all APIs
// ========================================
export const api = {
  equipment: equipmentApi,
  maintenance: maintenanceApi,
  users: usersApi,
  statistics: statisticsApi,
  pm: pmApi,
  ai: aiApi,
}

export default api
