// User types
export type UserRole = 1 | 2 | 3 | 4 // 1: Admin, 2: Supervisor, 3: Technician, 4: Viewer

export interface User {
  id: string
  email: string
  name: string
  department: string
  position: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

// Role Permission types
export interface RolePermission {
  role: UserRole
  permissions: PagePermission[]
}

export interface PagePermission {
  page_key: string
  page_name: string
  can_access: boolean
}

// Equipment types
export type EquipmentCategory = 'MAIN' | 'SUB'
export type EquipmentStatus = 'normal' | 'pm' | 'repair' | 'emergency' | 'standby'

export interface EquipmentType {
  id: string
  code: string
  name: string
  name_ko?: string
  name_vi?: string
  category: EquipmentCategory
  is_active: boolean
}

export interface Equipment {
  id: string
  equipment_code: string
  equipment_name: string
  equipment_type_id: string
  equipment_type?: EquipmentType
  status: EquipmentStatus
  install_date: string | null
  manufacturer: string | null
  building: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Repair types
export interface RepairType {
  id: string
  code: string
  name: string
  name_ko?: string
  name_vi?: string
  color: string
  priority: number
  is_active: boolean
}

// Maintenance types
export type MaintenanceStatus = 'in_progress' | 'completed'

export interface MaintenanceRecord {
  id: string
  record_no: string
  date: string
  equipment_id: string
  equipment?: Equipment
  repair_type_id: string
  repair_type?: RepairType
  technician_id: string
  technician?: User
  symptom: string | null
  repair_content: string | null
  start_time: string
  end_time: string | null
  duration_minutes: number | null
  rating: number | null
  status: MaintenanceStatus
  created_at: string
  updated_at: string
}

export interface MaintenancePart {
  id: string
  maintenance_id: string
  part_code: string
  quantity: number
}

export interface MaintenanceImage {
  id: string
  maintenance_id: string
  image_url: string
  image_type: 'before' | 'after'
  created_at: string
}

// Settings types
export interface Setting {
  id: string
  key: string
  value: Record<string, unknown>
  description: string | null
  updated_at: string
  updated_by: string | null
}

// AI Insight types
export interface AIInsight {
  id: string
  insight_type: string
  title: string
  description: string
  data: Record<string, unknown> | null
  generated_at: string
}

// Activity Log types
export interface ActivityLog {
  id: string
  user_id: string
  user?: User
  action: string
  target_type: string
  target_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

// Dashboard statistics
export interface DashboardStats {
  total_equipment: number
  running_equipment: number
  repair_equipment: number
  standby_equipment: number
  today_repairs: number
  completed_repairs: number
  emergency_count: number
}

// Analytics types
export interface EquipmentFailureRank {
  equipment_id: string
  equipment_code: string
  equipment_name: string
  failure_count: number
  total_downtime_minutes: number
}

export interface RepairTypeDistribution {
  repair_type_id: string
  code: string
  name: string
  count: number
  percentage?: number
}

export interface MonthlyRepairTrend {
  month: string
  count: number
}

export interface TechnicianPerformance {
  technician_id: string
  technician_name: string
  completed_count: number
  avg_repair_time: number
  avg_rating: number
}

// Form types
export interface MaintenanceStartForm {
  date: string
  equipment_id: string
  repair_type_id: string
  symptom?: string
  start_time: string
  parts?: { part_code: string; quantity: number }[]
}

export interface MaintenanceCompleteForm {
  end_time: string
  repair_content?: string
  rating: number
  parts?: { part_code: string; quantity: number }[]
}

// Filter types
export interface EquipmentFilter {
  type_id?: string
  status?: EquipmentStatus
  building?: string
  search?: string
}

export interface MaintenanceFilter {
  start_date?: string
  end_date?: string
  equipment_id?: string
  repair_type_id?: string
  technician_id?: string
  status?: MaintenanceStatus
}
