// Factory types
export type FactoryId = 'ALT' | 'ALV'

export interface Factory {
  id: FactoryId
  name_ko: string
  name_vi: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export const FACTORIES: Record<FactoryId, { name_ko: string; name_vi: string }> = {
  ALT: { name_ko: '1공장', name_vi: 'Nhà máy 1' },
  ALV: { name_ko: '2공장', name_vi: 'Nhà máy 2' },
}

// User types
export type UserRole = 1 | 2 | 3 | 4
// 1: 시스템 관리자 (System Admin)
// 2: 설비 관리자 (Facility Manager)
// 3: 수리 직원 (Repair Staff)
// 4: 뷰어 (Viewer)

// 부서 (Department)
export const DEPARTMENTS = {
  GENERAL_MANAGEMENT: 'general_management',  // 종합 관리실
  FACILITY_MANAGEMENT: 'facility_management', // 설비 관리팀
} as const

export type DepartmentCode = typeof DEPARTMENTS[keyof typeof DEPARTMENTS]

// 직책 (Position) - 권한과 연동
export const POSITIONS = {
  SYSTEM_ADMIN: 'system_admin',       // 시스템 관리자 (Role 1)
  FACILITY_MANAGER: 'facility_manager', // 설비 관리자 (Role 2)
  REPAIR_STAFF: 'repair_staff',       // 수리 직원 (Role 3)
  VIEWER: 'viewer',                   // 뷰어 (Role 4)
} as const

export type PositionCode = typeof POSITIONS[keyof typeof POSITIONS]

// 직책과 권한 매핑
export const POSITION_ROLE_MAP: Record<PositionCode, UserRole> = {
  [POSITIONS.SYSTEM_ADMIN]: 1,
  [POSITIONS.FACILITY_MANAGER]: 2,
  [POSITIONS.REPAIR_STAFF]: 3,
  [POSITIONS.VIEWER]: 4,
}

// 권한과 직책 역매핑
export const ROLE_POSITION_MAP: Record<UserRole, PositionCode> = {
  1: POSITIONS.SYSTEM_ADMIN,
  2: POSITIONS.FACILITY_MANAGER,
  3: POSITIONS.REPAIR_STAFF,
  4: POSITIONS.VIEWER,
}

export interface User {
  id: string
  email: string
  name: string
  department: DepartmentCode | string
  position: PositionCode | string
  role: UserRole
  factory_id: string
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
export type EquipmentStatus = 'normal' | 'pm' | 'paint' | 'repair' | 'emergency' | 'standby'

export interface EquipmentType {
  id: string
  code: string
  name: string
  name_ko?: string
  name_vi?: string
  category: EquipmentCategory
  description?: string
  is_active: boolean
}

export interface Equipment {
  id: string
  equipment_code: string
  equipment_name: string
  equipment_name_ko?: string
  equipment_name_vi?: string
  equipment_type_id: string
  equipment_type?: EquipmentType
  factory_id?: string
  status: EquipmentStatus
  install_date: string | null
  manufacturer: string | null
  building: string
  building_vi?: string
  grade?: GradeLetter | null              // 자동 산정된 종합 등급 (등급 미평가 시 null)
  grade_evaluated_at?: string | null      // 마지막 등급 평가 시각
  is_active: boolean
  created_at: string
  updated_at: string
}

// ========================================
// Equipment Grade (설비 등급) Types
// ========================================

// 등급 (A+ 최상 → D 최하)
export type GradeLetter = 'A+' | 'A' | 'B' | 'C' | 'D'

// 평가 항목별 비교 방식
// - lower_is_better : 측정값이 작을수록 좋음 (예: 런아웃 ≤3μm → A+)
// - higher_is_better: 측정값이 클수록 좋음 (예: 클램핑력 ≥2.7KN → A+)
// - level_count     : 단계 수가 많을수록 좋음 (밸런서 9단계 → A+)
// - range           : 허용 범위 내이면 통과(등급 영향 없음), 벗어나면 D
// - pass_fail       : OK이면 통과(등급 영향 없음), NG이면 D
export type GradeComparison =
  | 'lower_is_better'
  | 'higher_is_better'
  | 'level_count'
  | 'range'
  | 'pass_fail'

// 등급 평가 기준 (체크시트 항목 마스터)
export interface EquipmentGradeCriteria {
  id: string
  item_no: number
  ref_no: number | null
  category_ko: string | null
  category_vi: string | null
  item_ko: string | null
  item_vi: string | null
  position_ko: string | null
  position_vi: string | null
  condition_ko: string | null
  condition_vi: string | null
  device_ko: string | null
  device_vi: string | null
  unit: string | null
  comparison: GradeComparison
  threshold_a_plus: number | null
  threshold_a: number | null
  threshold_b: number | null
  threshold_c: number | null
  range_min: number | null
  range_max: number | null
  raw_a_plus: string | null
  raw_a: string | null
  raw_b: string | null
  raw_c: string | null
  raw_d: string | null
  included_in_grade: boolean
  display_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

// 설비별 등급 측정 기록 (상시 재평가/수정 가능)
export interface EquipmentGradeCheck {
  id: string
  equipment_id: string
  criteria_id: string
  factory_id: string
  measured_value: number | null
  measured_bool: boolean | null
  measured_text: string | null
  item_grade: GradeLetter | null
  checked_by: string | null
  checked_at: string | null
  notes: string | null
  created_at?: string
  updated_at?: string
}

// 체크시트 한 행: 기준 + (있다면) 현재 측정 기록
export interface GradeChecksheetRow {
  criteria: EquipmentGradeCriteria
  check: EquipmentGradeCheck | null
}

// 체크시트 저장 시 항목별 입력값
export interface GradeCheckInput {
  criteria_id: string
  measured_value?: number | null
  measured_bool?: boolean | null
  measured_text?: string | null
  notes?: string | null
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
  description?: string
  is_active: boolean
}

// Maintenance types
export type MaintenanceStatus = 'in_progress' | 'completed'

export interface MaintenanceUsedPart {
  part_code: string
  part_name: string
  quantity: number
}

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
  used_parts: MaintenanceUsedPart[] | null
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
export type AIInsightType = 'anomaly' | 'predictive' | 'efficiency' | 'trend' | 'parts' | 'recommendation'
export type AIInsightSeverity = 'info' | 'warning' | 'critical'

export interface AIInsight {
  id: string
  insight_type: AIInsightType | string
  title: string
  description: string
  content?: string
  data: Record<string, unknown> | null
  severity?: AIInsightSeverity
  is_read?: boolean
  generated_at: string
  expires_at?: string
  created_at?: string
}

// AI Chat History types
export interface AIChatMessage {
  id: string
  user_id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  language?: string
  metadata?: Record<string, unknown>
  created_at: string
}

// Generated Report types
export type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom'
export type ReportStatus = 'generating' | 'completed' | 'failed'

export interface GeneratedReport {
  id: string
  name: string
  type: ReportType
  period_start: string
  period_end: string
  generated_by?: string
  generated_by_user?: User
  file_url?: string
  file_size?: number
  status: ReportStatus
  report_data?: Record<string, unknown>
  created_at: string
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
  inspection_area?: string            // 점검 부위 (Inspection Area/Part)
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

// ========================================
// Paint (설비 도색 관리)
// ========================================

// 도색 일정 상태
export type PaintScheduleStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'paused'

// 도색 단계 상태
export type PaintStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'

// 도색 우선순위
export type PaintPriority = 'low' | 'medium' | 'high'

// 도색 체크리스트 단계 (마스터 데이터)
export interface PaintChecklistStep {
  id: string
  step_order: number
  name: string
  name_ko: string
  name_vi: string
  description?: string
  estimated_duration_hours: number
  is_active: boolean
  created_at: string
}

// 도색 단계별 실행 기록
export interface PaintStepExecution {
  id: string
  schedule_id: string
  step_id: string
  step?: PaintChecklistStep
  step_order: number
  status: PaintStepStatus
  technician_id?: string
  technician?: User
  started_at?: string
  completed_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

// 도색 템플릿
export interface PaintTemplate {
  id: string
  name: string
  name_ko?: string
  name_vi?: string
  description?: string
  equipment_type_id: string
  equipment_type?: EquipmentType
  interval_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  interval_value: number
  estimated_duration: number          // 예상 소요시간 (분)
  is_active: boolean
  created_at: string
  updated_at: string
}

// 도색 일정
export interface PaintSchedule {
  id: string
  template_id?: string
  template?: PaintTemplate
  equipment_id: string
  equipment?: Equipment
  scheduled_date: string              // YYYY-MM-DD
  expected_end_date?: string          // 예상 완료일
  current_step: number                // 현재 단계 (0 = 미시작, 1-6 = 현재 단계)
  assigned_technician_id?: string
  assigned_technician?: User
  status: PaintScheduleStatus
  priority: PaintPriority
  notes?: string
  step_executions?: PaintStepExecution[]  // 단계별 실행 기록
  paint_executions?: { started_at?: string | null }[]  // 실행 시작시각 임베드 (지연 판정용)
  created_at: string
  updated_at: string
}

// 도색 실행 기록
export interface PaintExecution {
  id: string
  schedule_id: string
  schedule?: PaintSchedule
  equipment_id: string
  equipment?: Equipment
  technician_id: string
  technician?: User
  started_at: string
  completed_at?: string
  duration_minutes?: number
  notes?: string
  rating?: number                     // 1-10
  status: 'in_progress' | 'completed'
  created_at?: string
}

// 도색 대시보드 통계
export interface PaintDashboardStats {
  total_scheduled: number
  completed_this_month: number
  overdue_count: number
  upcoming_week: number
  compliance_rate: number
}

// 도색 일정 필터
export interface PaintScheduleFilter {
  start_date?: string
  end_date?: string
  equipment_id?: string
  equipment_type_id?: string
  technician_id?: string
  status?: PaintScheduleStatus
  priority?: PaintPriority
}

// 도색 일정 생성 폼
export interface PaintScheduleCreateForm {
  template_id?: string
  equipment_id: string
  scheduled_date: string
  assigned_technician_id?: string
  priority?: PaintPriority
  notes?: string
}

// ========================================
// Parts (External Database - Read Only)
// ========================================

// 부품 정보 (외부 부품관리 앱에서 가져옴)
export interface Part {
  id: string
  code: string                        // 부품 코드
  name: string                        // 부품명
  name_ko?: string                    // 한국어 이름
  name_vi?: string                    // 베트남어 이름
  category?: string                   // 부품 카테고리
  unit?: string                       // 단위
  current_stock?: number              // 현재 재고 (참고용)
}

// 수리 시 사용된 부품
export interface UsedPart {
  part_id: string
  part_code: string
  part_name: string
  quantity: number
}

// 부품 검색 필터
export interface PartSearchFilter {
  keyword?: string
  category?: string
  limit?: number
}
