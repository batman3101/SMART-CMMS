import { createClient } from '@supabase/supabase-js'

// ========================================
// SMART-CMMS Main Database
// ========================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ========================================
// Parts Management App Database (External - Read Only)
// ========================================
const partsSupabaseUrl = import.meta.env.VITE_PARTS_SUPABASE_URL || ''
const partsSupabaseAnonKey = import.meta.env.VITE_PARTS_SUPABASE_ANON_KEY || ''

// 부품 관리 앱 연결 (읽기 전용)
export const partsSupabase = partsSupabaseUrl && partsSupabaseAnonKey
  ? createClient(partsSupabaseUrl, partsSupabaseAnonKey)
  : null

// 부품 Supabase 연결 여부 확인
export const isPartsSupabaseConnected = () => partsSupabase !== null

// Auth helpers
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Database helpers
export async function fetchEquipments() {
  const { data, error } = await supabase
    .from('equipments')
    .select(`
      *,
      type:equipment_types(*)
    `)
    .eq('is_active', true)
    .order('equipment_no')
  return { data, error }
}

export async function fetchEquipmentTypes() {
  const { data, error } = await supabase
    .from('equipment_types')
    .select('*')
    .eq('is_active', true)
    .order('code')
  return { data, error }
}

export async function fetchRepairTypes() {
  const { data, error } = await supabase
    .from('repair_types')
    .select('*')
    .eq('is_active', true)
    .order('priority')
  return { data, error }
}

export async function fetchMaintenanceRecords(filter?: {
  start_date?: string
  end_date?: string
  equipment_id?: string
  repair_type_id?: string
  technician_id?: string
  status?: string
}) {
  let query = supabase
    .from('maintenance_records')
    .select(`
      *,
      equipment:equipments(*),
      repair_type:repair_types(*),
      technician:users(*)
    `)
    .order('created_at', { ascending: false })

  if (filter?.start_date) {
    query = query.gte('date', filter.start_date)
  }
  if (filter?.end_date) {
    query = query.lte('date', filter.end_date)
  }
  if (filter?.equipment_id) {
    query = query.eq('equipment_id', filter.equipment_id)
  }
  if (filter?.repair_type_id) {
    query = query.eq('repair_type_id', filter.repair_type_id)
  }
  if (filter?.technician_id) {
    query = query.eq('technician_id', filter.technician_id)
  }
  if (filter?.status) {
    query = query.eq('status', filter.status)
  }

  const { data, error } = await query
  return { data, error }
}

export async function createMaintenanceRecord(record: {
  date: string
  equipment_id: string
  repair_type_id: string
  technician_id: string
  symptom?: string
  start_time: string
}) {
  const { data, error } = await supabase
    .from('maintenance_records')
    .insert({
      ...record,
      status: 'in_progress',
    })
    .select()
    .single()
  return { data, error }
}

export async function updateMaintenanceRecord(
  id: string,
  updates: {
    end_time?: string
    repair_content?: string
    rating?: number
    status?: string
    duration_minutes?: number
  }
) {
  const { data, error } = await supabase
    .from('maintenance_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function updateEquipmentStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('equipments')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function fetchUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name_ko')
  return { data, error }
}

export async function fetchDashboardStats() {
  const { data: equipments } = await supabase
    .from('equipments')
    .select('status')
    .eq('is_active', true)

  const today = new Date().toISOString().split('T')[0]
  const { data: todayRecords } = await supabase
    .from('maintenance_records')
    .select('status')
    .eq('date', today)

  const stats = {
    total_equipment: equipments?.length || 0,
    running_equipment: equipments?.filter(e => e.status === 'normal').length || 0,
    repair_equipment: equipments?.filter(e => ['repair', 'pm', 'emergency'].includes(e.status)).length || 0,
    standby_equipment: equipments?.filter(e => e.status === 'standby').length || 0,
    today_repairs: todayRecords?.length || 0,
    completed_repairs: todayRecords?.filter(r => r.status === 'completed').length || 0,
    emergency_count: equipments?.filter(e => e.status === 'emergency').length || 0,
  }

  return { data: stats, error: null }
}
