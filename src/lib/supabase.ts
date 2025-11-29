import { createClient, SupabaseClient } from '@supabase/supabase-js'

// URL 유효성 검사 헬퍼
const isValidUrl = (url: string) => {
  try {
    new URL(url)
    return url.startsWith('http://') || url.startsWith('https://')
  } catch {
    return false
  }
}

// ========================================
// SMART-CMMS Main Database
// ========================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// 메인 Supabase 클라이언트 (URL이 유효할 때만 생성)
export const supabase: SupabaseClient | null = isValidUrl(supabaseUrl) && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// 메인 Supabase 연결 여부 확인
export const isMainSupabaseConnected = () => supabase !== null

// ========================================
// Parts Management App Database (External - Read Only)
// ========================================
const partsSupabaseUrl = import.meta.env.VITE_PARTS_SUPABASE_URL || ''
const partsSupabaseAnonKey = import.meta.env.VITE_PARTS_SUPABASE_ANON_KEY || ''

// 부품 관리 앱 연결 (읽기 전용)
export const partsSupabase = isValidUrl(partsSupabaseUrl) && partsSupabaseAnonKey
  ? createClient(partsSupabaseUrl, partsSupabaseAnonKey)
  : null

// 부품 Supabase 연결 여부 확인
export const isPartsSupabaseConnected = () => partsSupabase !== null

// Parts database helpers (Read Only)
export async function fetchParts(filter?: {
  search?: string
  category?: string
  limit?: number
  offset?: number
}) {
  if (!partsSupabase) {
    return { data: null, error: 'Parts database not connected' }
  }

  let query = partsSupabase
    .from('parts')
    .select('*', { count: 'exact' })

  if (filter?.search) {
    query = query.or(`part_name.ilike.%${filter.search}%,part_code.ilike.%${filter.search}%`)
  }

  if (filter?.category) {
    query = query.eq('category', filter.category)
  }

  if (filter?.limit) {
    query = query.limit(filter.limit)
  }

  if (filter?.offset) {
    query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1)
  }

  query = query.order('part_name')

  const { data, error, count } = await query
  return { data, error, count }
}

// 부품 목록과 재고 정보 함께 조회
export async function fetchPartsWithInventory(filter?: {
  search?: string
  category?: string
  limit?: number
  offset?: number
}) {
  if (!partsSupabase) {
    return { data: null, error: 'Parts database not connected', count: 0 }
  }

  // 먼저 parts 조회
  let query = partsSupabase
    .from('parts')
    .select('*', { count: 'exact' })

  if (filter?.search) {
    query = query.or(`part_name.ilike.%${filter.search}%,part_code.ilike.%${filter.search}%`)
  }

  if (filter?.category) {
    query = query.eq('category', filter.category)
  }

  if (filter?.limit) {
    query = query.limit(filter.limit)
  }

  if (filter?.offset) {
    query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1)
  }

  query = query.order('part_name')

  const { data: partsData, error: partsError, count } = await query

  if (partsError || !partsData) {
    return { data: null, error: partsError, count: 0 }
  }

  // parts의 part_id들로 inventory 조회
  const partIds = partsData.map((p: { part_id: string }) => p.part_id).filter(Boolean)

  if (partIds.length === 0) {
    return { data: partsData, error: null, count }
  }

  const { data: inventoryData } = await partsSupabase
    .from('inventory')
    .select('*')
    .in('part_id', partIds)

  // inventory 데이터를 part_id로 맵핑
  const inventoryMap = new Map()
  if (inventoryData) {
    inventoryData.forEach((inv: { part_id: string; current_quantity?: number }) => {
      inventoryMap.set(inv.part_id, inv)
    })
  }

  // parts에 inventory 정보 병합
  const mergedData = partsData.map((part: { part_id: string }) => {
    const inv = inventoryMap.get(part.part_id)
    return {
      ...part,
      current_stock: inv?.current_quantity ?? 0,
      inventory: inv || null
    }
  })

  return { data: mergedData, error: null, count }
}

export async function fetchPartCategories() {
  if (!partsSupabase) {
    return { data: null, error: 'Parts database not connected' }
  }

  const { data, error } = await partsSupabase
    .from('parts')
    .select('category')
    .not('category', 'is', null)

  if (data) {
    const uniqueCategories = [...new Set(data.map(item => item.category).filter(Boolean))]
    return { data: uniqueCategories, error: null }
  }

  return { data: null, error }
}

// 부품 코드로 부품 검색 (자동완성용)
export async function searchPartsByCode(searchTerm: string, limit: number = 10) {
  if (!partsSupabase) {
    return { data: null, error: 'Parts database not connected' }
  }

  const { data, error } = await partsSupabase
    .from('parts')
    .select('*')
    .or(`part_code.ilike.%${searchTerm}%,part_name.ilike.%${searchTerm}%`)
    .limit(limit)
    .order('part_code')

  return { data, error }
}

// 부품 코드로 정확한 부품 조회
export async function getPartByCode(partCode: string) {
  if (!partsSupabase) {
    return { data: null, error: 'Parts database not connected' }
  }

  const { data, error } = await partsSupabase
    .from('parts')
    .select('*')
    .eq('part_code', partCode)
    .single()

  return { data, error }
}

// 부품의 재고 수량 조회 (inventory 테이블, part_id로 조회)
export async function getPartInventory(partId: string) {
  if (!partsSupabase) {
    return { data: null, error: 'Parts database not connected' }
  }

  const { data, error } = await partsSupabase
    .from('inventory')
    .select('*')
    .eq('part_id', partId)
    .single()

  return { data, error }
}

// 부품 코드로 부품 정보와 재고 함께 조회
export async function getPartWithInventory(partCode: string) {
  if (!partsSupabase) {
    return { data: null, error: 'Parts database not connected' }
  }

  // 부품 정보 조회
  const { data: partData, error: partError } = await partsSupabase
    .from('parts')
    .select('*')
    .eq('part_code', partCode)
    .single()

  if (partError || !partData) {
    return { data: null, error: partError || 'Part not found' }
  }

  // 재고 정보 조회 (part_id로 연결)
  const { data: inventoryData } = await partsSupabase
    .from('inventory')
    .select('*')
    .eq('part_id', partData.part_id)
    .single()

  return {
    data: {
      ...partData,
      inventory: inventoryData || null,
      current_stock: inventoryData?.current_quantity ?? 0
    },
    error: null
  }
}

// Auth helpers
export async function signIn(email: string, password: string) {
  if (!supabase) {
    return { data: null, error: { message: 'Database not connected' } }
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export async function signOut() {
  if (!supabase) {
    return { error: { message: 'Database not connected' } }
  }
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getCurrentUser() {
  if (!supabase) {
    return null
  }
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Database helpers
export async function fetchEquipments() {
  if (!supabase) {
    return { data: null, error: 'Database not connected' }
  }
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
  if (!supabase) {
    return { data: null, error: 'Database not connected' }
  }
  const { data, error } = await supabase
    .from('equipment_types')
    .select('*')
    .eq('is_active', true)
    .order('code')
  return { data, error }
}

export async function fetchRepairTypes() {
  if (!supabase) {
    return { data: null, error: 'Database not connected' }
  }
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
  if (!supabase) {
    return { data: null, error: 'Database not connected' }
  }
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
  if (!supabase) {
    return { data: null, error: 'Database not connected' }
  }
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
  if (!supabase) {
    return { data: null, error: 'Database not connected' }
  }
  const { data, error } = await supabase
    .from('maintenance_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function updateEquipmentStatus(id: string, status: string) {
  if (!supabase) {
    return { data: null, error: 'Database not connected' }
  }
  const { data, error } = await supabase
    .from('equipments')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function fetchUsers() {
  if (!supabase) {
    return { data: null, error: 'Database not connected' }
  }
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name_ko')
  return { data, error }
}

export async function fetchDashboardStats() {
  if (!supabase) {
    return {
      data: {
        total_equipment: 0,
        running_equipment: 0,
        repair_equipment: 0,
        standby_equipment: 0,
        today_repairs: 0,
        completed_repairs: 0,
        emergency_count: 0,
      },
      error: 'Database not connected'
    }
  }
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
