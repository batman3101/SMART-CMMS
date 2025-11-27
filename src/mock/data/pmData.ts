import type {
  PMTemplate,
  PMSchedule,
  PMExecution,
  PMDashboardStats,
  PMComplianceStats,
} from '@/types'
import { mockEquipmentTypes } from './equipmentTypes'
import { mockEquipments } from './equipments'
import { mockUsers } from './users'

// Helper function to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9)

// Helper function to get date string
const getDateString = (daysOffset: number = 0) => {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  return date.toISOString().split('T')[0]
}

// ========================================
// PM Templates
// ========================================
export const mockPMTemplates: PMTemplate[] = [
  {
    id: 'tpl-1',
    name: 'CNC 밀링 머신 월간 PM',
    name_ko: 'CNC 밀링 머신 월간 PM',
    name_vi: 'PM hàng tháng máy phay CNC',
    description: 'CNC 밀링 머신 월간 정기 점검',
    equipment_type_id: '1',
    equipment_type: mockEquipmentTypes.find(t => t.id === '1'),
    interval_type: 'monthly',
    interval_value: 1,
    estimated_duration: 60,
    checklist_items: [
      { id: 'ci-1-1', order: 1, description: '스핀들 베어링 상태 점검', description_ko: '스핀들 베어링 상태 점검', description_vi: 'Kiểm tra trạng thái ổ trục chính', is_required: true },
      { id: 'ci-1-2', order: 2, description: '쿨런트 레벨 및 상태 확인', description_ko: '쿨런트 레벨 및 상태 확인', description_vi: 'Kiểm tra mức và trạng thái dung dịch làm mát', is_required: true },
      { id: 'ci-1-3', order: 3, description: '가이드웨이 윤활 상태 점검', description_ko: '가이드웨이 윤활 상태 점검', description_vi: 'Kiểm tra bôi trơn đường dẫn', is_required: true },
      { id: 'ci-1-4', order: 4, description: 'ATC 동작 테스트', description_ko: 'ATC 동작 테스트', description_vi: 'Kiểm tra hoạt động ATC', is_required: true },
      { id: 'ci-1-5', order: 5, description: '칩 컨베이어 동작 확인', description_ko: '칩 컨베이어 동작 확인', description_vi: 'Kiểm tra hoạt động băng tải phoi', is_required: false },
      { id: 'ci-1-6', order: 6, description: '축 원점 정밀도 측정', description_ko: '축 원점 정밀도 측정', description_vi: 'Đo độ chính xác điểm gốc trục', is_required: true },
    ],
    required_parts: [
      { part_code: 'OIL-001', part_name: '윤활유', quantity: 1 },
      { part_code: 'FLT-001', part_name: '에어 필터', quantity: 1 },
    ],
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'tpl-2',
    name: 'CNC 밀링 머신 분기 PM',
    name_ko: 'CNC 밀링 머신 분기 PM',
    name_vi: 'PM hàng quý máy phay CNC',
    description: 'CNC 밀링 머신 분기별 정밀 점검',
    equipment_type_id: '1',
    equipment_type: mockEquipmentTypes.find(t => t.id === '1'),
    interval_type: 'quarterly',
    interval_value: 1,
    estimated_duration: 180,
    checklist_items: [
      { id: 'ci-2-1', order: 1, description: '스핀들 베어링 상세 점검', description_ko: '스핀들 베어링 상세 점검', description_vi: 'Kiểm tra chi tiết ổ trục chính', is_required: true },
      { id: 'ci-2-2', order: 2, description: '볼스크류 백래시 측정', description_ko: '볼스크류 백래시 측정', description_vi: 'Đo độ rơ vít me bi', is_required: true },
      { id: 'ci-2-3', order: 3, description: '서보 모터 상태 점검', description_ko: '서보 모터 상태 점검', description_vi: 'Kiểm tra trạng thái động cơ servo', is_required: true },
      { id: 'ci-2-4', order: 4, description: '유압 시스템 점검', description_ko: '유압 시스템 점검', description_vi: 'Kiểm tra hệ thống thủy lực', is_required: true },
      { id: 'ci-2-5', order: 5, description: '전체 윤활유 교환', description_ko: '전체 윤활유 교환', description_vi: 'Thay dầu bôi trơn toàn bộ', is_required: true },
      { id: 'ci-2-6', order: 6, description: '정밀도 테스트 (원형도, 직진도)', description_ko: '정밀도 테스트 (원형도, 직진도)', description_vi: 'Kiểm tra độ chính xác (độ tròn, độ thẳng)', is_required: true },
    ],
    required_parts: [
      { part_code: 'OIL-002', part_name: '유압유', quantity: 5 },
      { part_code: 'OIL-001', part_name: '윤활유', quantity: 2 },
      { part_code: 'FLT-002', part_name: '오일 필터', quantity: 1 },
    ],
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'tpl-3',
    name: '초음파 클리닝 주간 PM',
    name_ko: '초음파 클리닝 주간 PM',
    name_vi: 'PM hàng tuần máy làm sạch siêu âm',
    description: '초음파 클리닝 설비 주간 점검',
    equipment_type_id: '2',
    equipment_type: mockEquipmentTypes.find(t => t.id === '2'),
    interval_type: 'weekly',
    interval_value: 1,
    estimated_duration: 30,
    checklist_items: [
      { id: 'ci-3-1', order: 1, description: '세척액 농도 측정', description_ko: '세척액 농도 측정', description_vi: 'Đo nồng độ dung dịch tẩy rửa', is_required: true },
      { id: 'ci-3-2', order: 2, description: '초음파 출력 확인', description_ko: '초음파 출력 확인', description_vi: 'Kiểm tra công suất siêu âm', is_required: true },
      { id: 'ci-3-3', order: 3, description: '온도 조절 장치 점검', description_ko: '온도 조절 장치 점검', description_vi: 'Kiểm tra thiết bị điều chỉnh nhiệt độ', is_required: true },
      { id: 'ci-3-4', order: 4, description: '필터 상태 확인', description_ko: '필터 상태 확인', description_vi: 'Kiểm tra trạng thái bộ lọc', is_required: false },
    ],
    required_parts: [],
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'tpl-4',
    name: '콤프레셔 월간 PM',
    name_ko: '콤프레셔 월간 PM',
    name_vi: 'PM hàng tháng máy nén khí',
    description: '콤프레셔 월간 정기 점검',
    equipment_type_id: '6',
    equipment_type: mockEquipmentTypes.find(t => t.id === '6'),
    interval_type: 'monthly',
    interval_value: 1,
    estimated_duration: 45,
    checklist_items: [
      { id: 'ci-4-1', order: 1, description: '압력 게이지 확인', description_ko: '압력 게이지 확인', description_vi: 'Kiểm tra đồng hồ áp suất', is_required: true },
      { id: 'ci-4-2', order: 2, description: '에어 누출 점검', description_ko: '에어 누출 점검', description_vi: 'Kiểm tra rò rỉ khí', is_required: true },
      { id: 'ci-4-3', order: 3, description: '드레인 밸브 작동 확인', description_ko: '드레인 밸브 작동 확인', description_vi: 'Kiểm tra hoạt động van xả', is_required: true },
      { id: 'ci-4-4', order: 4, description: '벨트 장력 및 마모 상태', description_ko: '벨트 장력 및 마모 상태', description_vi: 'Kiểm tra độ căng và mài mòn dây đai', is_required: true },
    ],
    required_parts: [
      { part_code: 'FLT-003', part_name: '에어 드라이어 필터', quantity: 1 },
    ],
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'tpl-5',
    name: '디버링 설비 월간 PM',
    name_ko: '디버링 설비 월간 PM',
    name_vi: 'PM hàng tháng thiết bị mài ba via',
    description: '디버링 설비 월간 정기 점검',
    equipment_type_id: '3',
    equipment_type: mockEquipmentTypes.find(t => t.id === '3'),
    interval_type: 'monthly',
    interval_value: 1,
    estimated_duration: 40,
    checklist_items: [
      { id: 'ci-5-1', order: 1, description: '브러시 마모 상태 점검', description_ko: '브러시 마모 상태 점검', description_vi: 'Kiểm tra tình trạng mài mòn bàn chải', is_required: true },
      { id: 'ci-5-2', order: 2, description: '모터 베어링 점검', description_ko: '모터 베어링 점검', description_vi: 'Kiểm tra ổ bi động cơ', is_required: true },
      { id: 'ci-5-3', order: 3, description: '컨베이어 벨트 상태 확인', description_ko: '컨베이어 벨트 상태 확인', description_vi: 'Kiểm tra trạng thái băng tải', is_required: true },
      { id: 'ci-5-4', order: 4, description: '집진기 필터 점검', description_ko: '집진기 필터 점검', description_vi: 'Kiểm tra bộ lọc máy hút bụi', is_required: false },
    ],
    required_parts: [],
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

// ========================================
// PM Schedules (Generated from templates)
// ========================================
const generatePMSchedules = (): PMSchedule[] => {
  const schedules: PMSchedule[] = []
  const technicians = mockUsers.filter(u => u.role === 3)
  const cncEquipments = mockEquipments.filter(e => e.equipment_type_id === '1').slice(0, 20)
  const clEquipments = mockEquipments.filter(e => e.equipment_type_id === '2').slice(0, 3)

  // Past completed schedules
  for (let i = 0; i < 15; i++) {
    const equipment = cncEquipments[i % cncEquipments.length]
    const technician = technicians[i % technicians.length]
    schedules.push({
      id: `sch-past-${i + 1}`,
      template_id: 'tpl-1',
      template: mockPMTemplates.find(t => t.id === 'tpl-1'),
      equipment_id: equipment.id,
      equipment,
      scheduled_date: getDateString(-30 - i * 2),
      assigned_technician_id: technician.id,
      assigned_technician: technician,
      status: 'completed',
      priority: 'medium',
      notification_sent_3days: true,
      notification_sent_1day: true,
      notification_sent_today: true,
      created_at: getDateString(-60) + 'T00:00:00Z',
      updated_at: getDateString(-30 - i * 2) + 'T10:00:00Z',
    })
  }

  // Overdue schedules
  for (let i = 0; i < 3; i++) {
    const equipment = cncEquipments[i + 10]
    schedules.push({
      id: `sch-overdue-${i + 1}`,
      template_id: 'tpl-1',
      template: mockPMTemplates.find(t => t.id === 'tpl-1'),
      equipment_id: equipment.id,
      equipment,
      scheduled_date: getDateString(-5 - i),
      assigned_technician_id: technicians[i].id,
      assigned_technician: technicians[i],
      status: 'overdue',
      priority: 'high',
      notification_sent_3days: true,
      notification_sent_1day: true,
      notification_sent_today: true,
      created_at: getDateString(-30) + 'T00:00:00Z',
      updated_at: getDateString(-5 - i) + 'T00:00:00Z',
    })
  }

  // Today's schedules
  for (let i = 0; i < 4; i++) {
    const equipment = cncEquipments[i]
    const technician = technicians[i % technicians.length]
    schedules.push({
      id: `sch-today-${i + 1}`,
      template_id: 'tpl-1',
      template: mockPMTemplates.find(t => t.id === 'tpl-1'),
      equipment_id: equipment.id,
      equipment,
      scheduled_date: getDateString(0),
      assigned_technician_id: technician.id,
      assigned_technician: technician,
      status: i === 0 ? 'in_progress' : 'scheduled',
      priority: 'medium',
      notification_sent_3days: true,
      notification_sent_1day: true,
      notification_sent_today: true,
      created_at: getDateString(-30) + 'T00:00:00Z',
      updated_at: getDateString(0) + 'T00:00:00Z',
    })
  }

  // Upcoming schedules (this week)
  for (let i = 1; i <= 7; i++) {
    const equipment = cncEquipments[(i + 3) % cncEquipments.length]
    const technician = technicians[i % technicians.length]
    schedules.push({
      id: `sch-week-${i}`,
      template_id: 'tpl-1',
      template: mockPMTemplates.find(t => t.id === 'tpl-1'),
      equipment_id: equipment.id,
      equipment,
      scheduled_date: getDateString(i),
      assigned_technician_id: technician.id,
      assigned_technician: technician,
      status: 'scheduled',
      priority: i <= 2 ? 'high' : 'medium',
      notification_sent_3days: i <= 3,
      notification_sent_1day: i <= 1,
      notification_sent_today: false,
      created_at: getDateString(-30) + 'T00:00:00Z',
      updated_at: getDateString(-30) + 'T00:00:00Z',
    })
  }

  // Upcoming schedules (next 2-4 weeks)
  for (let i = 8; i <= 30; i++) {
    const equipment = cncEquipments[i % cncEquipments.length]
    const technician = technicians[i % technicians.length]
    schedules.push({
      id: `sch-future-${i}`,
      template_id: i % 3 === 0 ? 'tpl-2' : 'tpl-1',
      template: mockPMTemplates.find(t => t.id === (i % 3 === 0 ? 'tpl-2' : 'tpl-1')),
      equipment_id: equipment.id,
      equipment,
      scheduled_date: getDateString(i),
      assigned_technician_id: technician.id,
      assigned_technician: technician,
      status: 'scheduled',
      priority: 'low',
      notification_sent_3days: false,
      notification_sent_1day: false,
      notification_sent_today: false,
      created_at: getDateString(-30) + 'T00:00:00Z',
      updated_at: getDateString(-30) + 'T00:00:00Z',
    })
  }

  // Weekly PM schedules for cleaning equipment
  for (let i = 0; i < 4; i++) {
    const equipment = clEquipments[i % clEquipments.length]
    const technician = technicians[(i + 2) % technicians.length]
    schedules.push({
      id: `sch-cl-${i + 1}`,
      template_id: 'tpl-3',
      template: mockPMTemplates.find(t => t.id === 'tpl-3'),
      equipment_id: equipment.id,
      equipment,
      scheduled_date: getDateString(i * 7 + 1),
      assigned_technician_id: technician.id,
      assigned_technician: technician,
      status: 'scheduled',
      priority: 'medium',
      notification_sent_3days: false,
      notification_sent_1day: false,
      notification_sent_today: false,
      created_at: getDateString(-14) + 'T00:00:00Z',
      updated_at: getDateString(-14) + 'T00:00:00Z',
    })
  }

  return schedules
}

export const mockPMSchedules: PMSchedule[] = generatePMSchedules()

// ========================================
// PM Executions
// ========================================
const generatePMExecutions = (): PMExecution[] => {
  const executions: PMExecution[] = []
  const completedSchedules = mockPMSchedules.filter(s => s.status === 'completed')

  completedSchedules.forEach((schedule, index) => {
    const template = schedule.template || mockPMTemplates.find(t => t.id === schedule.template_id)
    const checklistResults = template?.checklist_items.map(item => ({
      item_id: item.id,
      is_checked: true,
      has_issue: index % 5 === 0 && item.order === 1, // Some have issues
    })) || []

    executions.push({
      id: `exec-${index + 1}`,
      schedule_id: schedule.id,
      schedule,
      equipment_id: schedule.equipment_id,
      equipment: schedule.equipment,
      technician_id: schedule.assigned_technician_id || '3',
      technician: schedule.assigned_technician,
      started_at: schedule.scheduled_date + 'T08:00:00Z',
      completed_at: schedule.scheduled_date + 'T09:30:00Z',
      duration_minutes: 90,
      checklist_results: checklistResults,
      used_parts: template?.required_parts.map(p => ({ ...p })) || [],
      findings: index % 5 === 0 ? '스핀들 베어링에서 미세 진동 감지. 다음 PM 시 교체 권장' : undefined,
      findings_severity: index % 5 === 0 ? 'minor' : 'none',
      rating: 8 + Math.floor(Math.random() * 3),
      status: 'completed',
      created_at: schedule.scheduled_date + 'T08:00:00Z',
      updated_at: schedule.scheduled_date + 'T09:30:00Z',
    })
  })

  // In-progress execution
  const inProgressSchedule = mockPMSchedules.find(s => s.status === 'in_progress')
  if (inProgressSchedule) {
    executions.push({
      id: 'exec-in-progress',
      schedule_id: inProgressSchedule.id,
      schedule: inProgressSchedule,
      equipment_id: inProgressSchedule.equipment_id,
      equipment: inProgressSchedule.equipment,
      technician_id: inProgressSchedule.assigned_technician_id || '3',
      technician: inProgressSchedule.assigned_technician,
      started_at: new Date().toISOString(),
      checklist_results: [
        { item_id: 'ci-1-1', is_checked: true, has_issue: false },
        { item_id: 'ci-1-2', is_checked: true, has_issue: false },
        { item_id: 'ci-1-3', is_checked: false, has_issue: false },
      ],
      used_parts: [],
      status: 'in_progress',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  return executions
}

export const mockPMExecutions: PMExecution[] = generatePMExecutions()

// ========================================
// Dashboard Stats
// ========================================
export const getPMDashboardStats = (): PMDashboardStats => {
  const now = new Date()
  const thisMonth = now.toISOString().slice(0, 7)
  const weekEnd = new Date(now)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const scheduled = mockPMSchedules.filter(s => s.status === 'scheduled').length
  const inProgress = mockPMSchedules.filter(s => s.status === 'in_progress').length
  const completedThisMonth = mockPMSchedules.filter(
    s => s.status === 'completed' && s.scheduled_date.startsWith(thisMonth)
  ).length
  const overdue = mockPMSchedules.filter(s => s.status === 'overdue').length
  const upcomingWeek = mockPMSchedules.filter(
    s => s.status === 'scheduled' &&
         s.scheduled_date >= getDateString(0) &&
         s.scheduled_date <= getDateString(7)
  ).length

  const totalScheduledThisMonth = mockPMSchedules.filter(
    s => s.scheduled_date.startsWith(thisMonth)
  ).length
  const complianceRate = totalScheduledThisMonth > 0
    ? Math.round((completedThisMonth / totalScheduledThisMonth) * 100)
    : 100

  return {
    total_scheduled: scheduled + inProgress,
    completed_this_month: completedThisMonth,
    overdue_count: overdue,
    upcoming_week: upcomingWeek,
    compliance_rate: complianceRate,
  }
}

// ========================================
// Compliance Stats (Monthly)
// ========================================
export const getPMComplianceStats = (months: number = 6): PMComplianceStats[] => {
  const stats: PMComplianceStats[] = []
  const now = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const period = date.toISOString().slice(0, 7)

    const monthSchedules = mockPMSchedules.filter(s => s.scheduled_date.startsWith(period))
    const completed = monthSchedules.filter(s => s.status === 'completed').length
    const overdue = monthSchedules.filter(s => s.status === 'overdue').length
    const cancelled = monthSchedules.filter(s => s.status === 'cancelled').length
    const total = monthSchedules.length

    stats.push({
      period,
      scheduled_count: total,
      completed_count: completed,
      overdue_count: overdue,
      cancelled_count: cancelled,
      compliance_rate: total > 0 ? Math.round((completed / total) * 100) : 100,
    })
  }

  return stats
}

// ========================================
// Helper functions for mutations
// ========================================
export const updatePMSchedule = (id: string, updates: Partial<PMSchedule>): PMSchedule | null => {
  const index = mockPMSchedules.findIndex(s => s.id === id)
  if (index === -1) return null

  mockPMSchedules[index] = {
    ...mockPMSchedules[index],
    ...updates,
    updated_at: new Date().toISOString(),
  }
  return mockPMSchedules[index]
}

export const createPMSchedule = (schedule: Omit<PMSchedule, 'id' | 'created_at' | 'updated_at'>): PMSchedule => {
  const newSchedule: PMSchedule = {
    ...schedule,
    id: `sch-${generateId()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  mockPMSchedules.push(newSchedule)
  return newSchedule
}

export const deletePMSchedule = (id: string): boolean => {
  const index = mockPMSchedules.findIndex(s => s.id === id)
  if (index === -1) return false
  mockPMSchedules.splice(index, 1)
  return true
}

export const createPMExecution = (execution: Omit<PMExecution, 'id' | 'created_at' | 'updated_at'>): PMExecution => {
  const newExecution: PMExecution = {
    ...execution,
    id: `exec-${generateId()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  mockPMExecutions.push(newExecution)

  // Update schedule status
  const schedule = mockPMSchedules.find(s => s.id === execution.schedule_id)
  if (schedule) {
    schedule.status = execution.status === 'completed' ? 'completed' : 'in_progress'
    schedule.updated_at = new Date().toISOString()
  }

  return newExecution
}

export const updatePMExecution = (id: string, updates: Partial<PMExecution>): PMExecution | null => {
  const index = mockPMExecutions.findIndex(e => e.id === id)
  if (index === -1) return null

  mockPMExecutions[index] = {
    ...mockPMExecutions[index],
    ...updates,
    updated_at: new Date().toISOString(),
  }

  // Update schedule status if execution is completed
  if (updates.status === 'completed') {
    const schedule = mockPMSchedules.find(s => s.id === mockPMExecutions[index].schedule_id)
    if (schedule) {
      schedule.status = 'completed'
      schedule.updated_at = new Date().toISOString()
    }
  }

  return mockPMExecutions[index]
}

// ========================================
// Template mutations
// ========================================
export const mockPMTemplatesData = [...mockPMTemplates]

export const createPMTemplate = (template: Omit<PMTemplate, 'id' | 'created_at' | 'updated_at'>): PMTemplate => {
  const newTemplate: PMTemplate = {
    ...template,
    id: `tpl-${generateId()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  mockPMTemplatesData.push(newTemplate)
  return newTemplate
}

export const updatePMTemplate = (id: string, updates: Partial<PMTemplate>): PMTemplate | null => {
  const index = mockPMTemplatesData.findIndex(t => t.id === id)
  if (index === -1) return null

  mockPMTemplatesData[index] = {
    ...mockPMTemplatesData[index],
    ...updates,
    updated_at: new Date().toISOString(),
  }
  return mockPMTemplatesData[index]
}

export const deletePMTemplate = (id: string): boolean => {
  const index = mockPMTemplatesData.findIndex(t => t.id === id)
  if (index === -1) return false
  mockPMTemplatesData.splice(index, 1)
  return true
}
