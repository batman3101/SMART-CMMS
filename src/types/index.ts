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

// ========================================
// PM (Preventive Maintenance) Types
// ========================================

// PM 주기 타입
export type PMIntervalType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

// PM 일정 상태
export type PMScheduleStatus = 'scheduled' | 'in_progress' | 'completed' | 'overdue' | 'cancelled'

// PM 우선순위
export type PMPriority = 'low' | 'medium' | 'high'

// PM 체크리스트 항목
export interface PMChecklistItem {
  id: string
  order: number
  description: string
  description_ko?: string
  description_vi?: string
  is_required: boolean
}

// PM 체크리스트 수행 결과
export interface PMChecklistResult {
  item_id: string
  is_checked: boolean
  notes?: string
  has_issue: boolean
}

// PM 필요 부품
export interface PMRequiredPart {
  part_code: string
  part_name: string
  quantity: number
}

// PM 템플릿
export interface PMTemplate {
  id: string
  name: string
  name_ko?: string
  name_vi?: string
  description?: string
  equipment_type_id: string
  equipment_type?: EquipmentType
  interval_type: PMIntervalType
  interval_value: number              // 주기 값 (예: 3개월마다 = monthly, 3)
  estimated_duration: number          // 예상 소요시간 (분)
  checklist_items: PMChecklistItem[]
  required_parts: PMRequiredPart[]
  is_active: boolean
  created_at: string
  updated_at: string
}

// PM 일정
export interface PMSchedule {
  id: string
  template_id: string
  template?: PMTemplate
  equipment_id: string
  equipment?: Equipment
  scheduled_date: string              // 예정일 (YYYY-MM-DD)
  assigned_technician_id?: string
  assigned_technician?: User
  status: PMScheduleStatus
  priority: PMPriority
  notes?: string
  notification_sent_3days: boolean
  notification_sent_1day: boolean
  notification_sent_today: boolean
  created_at: string
  updated_at: string
}

// PM 실행 기록
export interface PMExecution {
  id: string
  schedule_id: string
  schedule?: PMSchedule
  equipment_id: string
  equipment?: Equipment
  technician_id: string
  technician?: User
  started_at: string
  completed_at?: string
  duration_minutes?: number
  checklist_results: PMChecklistResult[]
  used_parts: PMUsedPart[]
  findings?: string                   // 발견 사항
  findings_severity?: 'none' | 'minor' | 'major' | 'critical'
  created_repair_id?: string          // 이상 발견 시 생성된 수리 ID
  rating?: number
  notes?: string
  status: 'in_progress' | 'completed'
  created_at: string
  updated_at: string
}

// PM 사용 부품
export interface PMUsedPart {
  part_code: string
  part_name: string
  quantity: number
}

// PM 대시보드 통계
export interface PMDashboardStats {
  total_scheduled: number             // 총 예정된 PM
  completed_this_month: number        // 이번 달 완료
  overdue_count: number               // 지연 중
  upcoming_week: number               // 이번 주 예정
  compliance_rate: number             // 준수율 (%)
}

// PM 준수율 통계
export interface PMComplianceStats {
  period: string
  scheduled_count: number
  completed_count: number
  overdue_count: number
  cancelled_count: number
  compliance_rate: number
}

// PM 알림
export interface PMNotification {
  id: string
  schedule_id: string
  schedule?: PMSchedule
  notification_type: 'reminder_3days' | 'reminder_1day' | 'reminder_today' | 'overdue'
  sent_at: string
  recipient_id: string
  is_read: boolean
}

// PM 필터
export interface PMScheduleFilter {
  start_date?: string
  end_date?: string
  equipment_id?: string
  equipment_type_id?: string
  technician_id?: string
  status?: PMScheduleStatus
  priority?: PMPriority
}

// PM 일정 생성 폼
export interface PMScheduleCreateForm {
  template_id: string
  equipment_id: string
  scheduled_date: string
  assigned_technician_id?: string
  priority?: PMPriority
  notes?: string
}

// PM 자동 생성 설정
export interface PMAutoGenerateConfig {
  template_id: string
  equipment_ids: string[]             // 적용할 설비 목록
  start_date: string                  // 시작일
  months_ahead: number                // 몇 개월 앞까지 생성 (기본 6개월)
}
