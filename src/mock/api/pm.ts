// Mock PM (Preventive Maintenance) API
// When connecting to Supabase, replace with real API calls

import {
  mockPMSchedules,
  mockPMExecutions,
  mockPMTemplatesData,
  getPMDashboardStats,
  getPMComplianceStats,
  updatePMSchedule,
  createPMSchedule,
  deletePMSchedule,
  createPMExecution,
  updatePMExecution,
  createPMTemplate,
  updatePMTemplate,
  deletePMTemplate,
} from '../data/pmData'
import { mockEquipments } from '../data/equipments'
import { mockEquipmentTypes } from '../data/equipmentTypes'
import { mockUsers } from '../data/users'
import type {
  PMTemplate,
  PMSchedule,
  PMExecution,
  PMScheduleFilter,
  PMScheduleCreateForm,
  PMAutoGenerateConfig,
  PMDashboardStats,
  PMComplianceStats,
} from '@/types'

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Helper function to add months
const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

// Helper function to add days/weeks/etc based on interval
const getNextDate = (currentDate: Date, intervalType: string, intervalValue: number): Date => {
  const result = new Date(currentDate)
  switch (intervalType) {
    case 'daily':
      result.setDate(result.getDate() + intervalValue)
      break
    case 'weekly':
      result.setDate(result.getDate() + intervalValue * 7)
      break
    case 'monthly':
      result.setMonth(result.getMonth() + intervalValue)
      break
    case 'quarterly':
      result.setMonth(result.getMonth() + intervalValue * 3)
      break
    case 'yearly':
      result.setFullYear(result.getFullYear() + intervalValue)
      break
  }
  return result
}

export const mockPMApi = {
  // ========================================
  // PM Templates
  // ========================================
  async getTemplates(filter?: { equipment_type_id?: string }): Promise<{ data: PMTemplate[]; error: string | null }> {
    await delay(300)
    let templates = mockPMTemplatesData
    if (filter?.equipment_type_id) {
      templates = templates.filter(t => t.equipment_type_id === filter.equipment_type_id)
    }
    return { data: templates, error: null }
  },

  async getTemplateById(id: string): Promise<{ data: PMTemplate | null; error: string | null }> {
    await delay(200)
    const template = mockPMTemplatesData.find(t => t.id === id)
    return {
      data: template || null,
      error: template ? null : 'PM 템플릿을 찾을 수 없습니다.',
    }
  },

  async getTemplatesByEquipmentType(equipmentTypeId: string): Promise<{
    data: PMTemplate[]
    error: string | null
  }> {
    await delay(200)
    const templates = mockPMTemplatesData.filter(t => t.equipment_type_id === equipmentTypeId && t.is_active)
    return { data: templates, error: null }
  },

  async createTemplate(
    template: Omit<PMTemplate, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{ data: PMTemplate | null; error: string | null }> {
    await delay(300)

    // Validate equipment type
    const equipmentType = mockEquipmentTypes.find(t => t.id === template.equipment_type_id)
    if (!equipmentType) {
      return { data: null, error: '설비 유형을 찾을 수 없습니다.' }
    }

    const newTemplate = createPMTemplate({
      ...template,
      equipment_type: equipmentType,
    })
    return { data: newTemplate, error: null }
  },

  async updateTemplate(
    id: string,
    updates: Partial<PMTemplate>
  ): Promise<{ data: PMTemplate | null; error: string | null }> {
    await delay(300)
    const updated = updatePMTemplate(id, updates)
    return {
      data: updated,
      error: updated ? null : 'PM 템플릿을 찾을 수 없습니다.',
    }
  },

  async deleteTemplate(id: string): Promise<{ error: string | null }> {
    await delay(300)

    // Check if template has any schedules
    const hasSchedules = mockPMSchedules.some(s => s.template_id === id)
    if (hasSchedules) {
      return { error: '이 템플릿을 사용하는 일정이 있어 삭제할 수 없습니다.' }
    }

    const success = deletePMTemplate(id)
    return { error: success ? null : 'PM 템플릿을 찾을 수 없습니다.' }
  },

  // ========================================
  // PM Schedules
  // ========================================
  async getSchedules(filter?: PMScheduleFilter): Promise<{
    data: PMSchedule[]
    error: string | null
  }> {
    await delay(300)

    let filtered = [...mockPMSchedules]

    if (filter?.start_date) {
      filtered = filtered.filter(s => s.scheduled_date >= filter.start_date!)
    }

    if (filter?.end_date) {
      filtered = filtered.filter(s => s.scheduled_date <= filter.end_date!)
    }

    if (filter?.equipment_id) {
      filtered = filtered.filter(s => s.equipment_id === filter.equipment_id)
    }

    if (filter?.equipment_type_id) {
      filtered = filtered.filter(s => s.equipment?.equipment_type_id === filter.equipment_type_id)
    }

    if (filter?.technician_id) {
      filtered = filtered.filter(s => s.assigned_technician_id === filter.technician_id)
    }

    if (filter?.status) {
      filtered = filtered.filter(s => s.status === filter.status)
    }

    if (filter?.priority) {
      filtered = filtered.filter(s => s.priority === filter.priority)
    }

    // Sort by scheduled_date ascending
    filtered.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))

    return { data: filtered, error: null }
  },

  async getScheduleById(id: string): Promise<{
    data: PMSchedule | null
    error: string | null
  }> {
    await delay(200)
    const schedule = mockPMSchedules.find(s => s.id === id)
    return {
      data: schedule || null,
      error: schedule ? null : 'PM 일정을 찾을 수 없습니다.',
    }
  },

  async getUpcomingSchedules(days: number = 7): Promise<{
    data: PMSchedule[]
    error: string | null
  }> {
    await delay(200)
    const today = new Date().toISOString().split('T')[0]
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + days)
    const endDateStr = endDate.toISOString().split('T')[0]

    const upcoming = mockPMSchedules.filter(
      s => s.scheduled_date >= today &&
           s.scheduled_date <= endDateStr &&
           (s.status === 'scheduled' || s.status === 'in_progress')
    ).sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))

    return { data: upcoming, error: null }
  },

  async getOverdueSchedules(): Promise<{
    data: PMSchedule[]
    error: string | null
  }> {
    await delay(200)
    const overdue = mockPMSchedules.filter(s => s.status === 'overdue')
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
    return { data: overdue, error: null }
  },

  async getTodaySchedules(): Promise<{
    data: PMSchedule[]
    error: string | null
  }> {
    await delay(200)
    const today = new Date().toISOString().split('T')[0]
    const todaySchedules = mockPMSchedules.filter(
      s => s.scheduled_date === today &&
           (s.status === 'scheduled' || s.status === 'in_progress')
    )
    return { data: todaySchedules, error: null }
  },

  async createSchedule(form: PMScheduleCreateForm): Promise<{
    data: PMSchedule | null
    error: string | null
  }> {
    await delay(300)

    const template = mockPMTemplatesData.find(t => t.id === form.template_id)
    if (!template) {
      return { data: null, error: 'PM 템플릿을 찾을 수 없습니다.' }
    }

    const equipment = mockEquipments.find(e => e.id === form.equipment_id)
    if (!equipment) {
      return { data: null, error: '설비를 찾을 수 없습니다.' }
    }

    const technician = form.assigned_technician_id
      ? mockUsers.find(u => u.id === form.assigned_technician_id)
      : undefined

    const newSchedule = createPMSchedule({
      template_id: form.template_id,
      template,
      equipment_id: form.equipment_id,
      equipment,
      scheduled_date: form.scheduled_date,
      assigned_technician_id: form.assigned_technician_id,
      assigned_technician: technician,
      status: 'scheduled',
      priority: form.priority || 'medium',
      notes: form.notes,
      notification_sent_3days: false,
      notification_sent_1day: false,
      notification_sent_today: false,
    })

    return { data: newSchedule, error: null }
  },

  async updateSchedule(
    id: string,
    updates: Partial<PMSchedule>
  ): Promise<{ data: PMSchedule | null; error: string | null }> {
    await delay(300)

    // If updating technician, get technician data
    if (updates.assigned_technician_id) {
      const technician = mockUsers.find(u => u.id === updates.assigned_technician_id)
      if (technician) {
        updates.assigned_technician = technician
      }
    }

    const updated = updatePMSchedule(id, updates)
    return {
      data: updated,
      error: updated ? null : 'PM 일정을 찾을 수 없습니다.',
    }
  },

  async deleteSchedule(id: string): Promise<{ error: string | null }> {
    await delay(300)

    const schedule = mockPMSchedules.find(s => s.id === id)
    if (!schedule) {
      return { error: 'PM 일정을 찾을 수 없습니다.' }
    }

    if (schedule.status === 'in_progress') {
      return { error: '진행 중인 PM은 삭제할 수 없습니다.' }
    }

    if (schedule.status === 'completed') {
      return { error: '완료된 PM은 삭제할 수 없습니다.' }
    }

    const success = deletePMSchedule(id)
    return { error: success ? null : 'PM 일정 삭제에 실패했습니다.' }
  },

  async cancelSchedule(id: string): Promise<{
    data: PMSchedule | null
    error: string | null
  }> {
    await delay(300)

    const schedule = mockPMSchedules.find(s => s.id === id)
    if (!schedule) {
      return { data: null, error: 'PM 일정을 찾을 수 없습니다.' }
    }

    if (schedule.status === 'in_progress') {
      return { data: null, error: '진행 중인 PM은 취소할 수 없습니다.' }
    }

    if (schedule.status === 'completed') {
      return { data: null, error: '완료된 PM은 취소할 수 없습니다.' }
    }

    const updated = updatePMSchedule(id, { status: 'cancelled' })
    return { data: updated, error: null }
  },

  async autoGenerateSchedules(config: PMAutoGenerateConfig): Promise<{
    data: PMSchedule[]
    error: string | null
  }> {
    await delay(500)

    const template = mockPMTemplatesData.find(t => t.id === config.template_id)
    if (!template) {
      return { data: [], error: 'PM 템플릿을 찾을 수 없습니다.' }
    }

    const newSchedules: PMSchedule[] = []
    const startDate = new Date(config.start_date)
    const monthsAhead = config.months_ahead || 6

    for (const equipmentId of config.equipment_ids) {
      const equipment = mockEquipments.find(e => e.id === equipmentId)
      if (!equipment) continue

      let currentDate = new Date(startDate)
      const endDate = addMonths(startDate, monthsAhead)

      while (currentDate <= endDate) {
        // Check if schedule already exists for this date and equipment
        const exists = mockPMSchedules.some(
          s => s.equipment_id === equipmentId &&
               s.template_id === template.id &&
               s.scheduled_date === currentDate.toISOString().split('T')[0]
        )

        if (!exists) {
          const schedule = createPMSchedule({
            template_id: template.id,
            template,
            equipment_id: equipmentId,
            equipment,
            scheduled_date: currentDate.toISOString().split('T')[0],
            status: 'scheduled',
            priority: 'medium',
            notification_sent_3days: false,
            notification_sent_1day: false,
            notification_sent_today: false,
          })
          newSchedules.push(schedule)
        }

        currentDate = getNextDate(currentDate, template.interval_type, template.interval_value)
      }
    }

    return { data: newSchedules, error: null }
  },

  // ========================================
  // PM Executions
  // ========================================
  async getExecutions(scheduleId?: string): Promise<{
    data: PMExecution[]
    error: string | null
  }> {
    await delay(300)

    let filtered = [...mockPMExecutions]

    if (scheduleId) {
      filtered = filtered.filter(e => e.schedule_id === scheduleId)
    }

    return { data: filtered, error: null }
  },

  async getExecutionById(id: string): Promise<{
    data: PMExecution | null
    error: string | null
  }> {
    await delay(200)
    const execution = mockPMExecutions.find(e => e.id === id)
    return {
      data: execution || null,
      error: execution ? null : 'PM 실행 기록을 찾을 수 없습니다.',
    }
  },

  async getExecutionBySchedule(scheduleId: string): Promise<{
    data: PMExecution | null
    error: string | null
  }> {
    await delay(200)
    const execution = mockPMExecutions.find(e => e.schedule_id === scheduleId)
    return { data: execution || null, error: null }
  },

  async startExecution(scheduleId: string, technicianId: string): Promise<{
    data: PMExecution | null
    error: string | null
  }> {
    await delay(300)

    const schedule = mockPMSchedules.find(s => s.id === scheduleId)
    if (!schedule) {
      return { data: null, error: 'PM 일정을 찾을 수 없습니다.' }
    }

    if (schedule.status === 'in_progress') {
      return { data: null, error: '이미 진행 중인 PM입니다.' }
    }

    if (schedule.status === 'completed') {
      return { data: null, error: '이미 완료된 PM입니다.' }
    }

    // Use existing assigned technician if set, otherwise use current user
    const executingTechnicianId = schedule.assigned_technician_id || technicianId
    const technician = mockUsers.find(u => u.id === executingTechnicianId)
    if (!technician) {
      return { data: null, error: '담당자를 찾을 수 없습니다.' }
    }

    // Update schedule status (preserve assigned_technician_id if already set)
    updatePMSchedule(scheduleId, {
      status: 'in_progress',
      assigned_technician_id: executingTechnicianId,
      assigned_technician: technician,
    })

    const execution = createPMExecution({
      schedule_id: scheduleId,
      schedule,
      equipment_id: schedule.equipment_id,
      equipment: schedule.equipment,
      technician_id: executingTechnicianId,
      technician,
      started_at: new Date().toISOString(),
      checklist_results: [],
      used_parts: [],
      status: 'in_progress',
    })

    return { data: execution, error: null }
  },

  async updateExecution(
    id: string,
    updates: Partial<PMExecution>
  ): Promise<{ data: PMExecution | null; error: string | null }> {
    await delay(300)
    const updated = updatePMExecution(id, updates)
    return {
      data: updated,
      error: updated ? null : 'PM 실행 기록을 찾을 수 없습니다.',
    }
  },

  async completeExecution(
    id: string,
    data: {
      checklist_results: PMExecution['checklist_results']
      used_parts: PMExecution['used_parts']
      findings?: string
      findings_severity?: PMExecution['findings_severity']
      rating?: number
      notes?: string
    }
  ): Promise<{ data: PMExecution | null; error: string | null }> {
    await delay(300)

    const execution = mockPMExecutions.find(e => e.id === id)
    if (!execution) {
      return { data: null, error: 'PM 실행 기록을 찾을 수 없습니다.' }
    }

    if (execution.status === 'completed') {
      return { data: null, error: '이미 완료된 PM입니다.' }
    }

    const completedAt = new Date().toISOString()
    const startedAt = new Date(execution.started_at)
    const durationMinutes = Math.round(
      (new Date(completedAt).getTime() - startedAt.getTime()) / (1000 * 60)
    )

    const updated = updatePMExecution(id, {
      ...data,
      completed_at: completedAt,
      duration_minutes: durationMinutes,
      status: 'completed',
    })

    // Update schedule status
    if (execution.schedule_id) {
      updatePMSchedule(execution.schedule_id, { status: 'completed' })
    }

    return { data: updated, error: null }
  },

  // ========================================
  // Dashboard & Statistics
  // ========================================
  async getDashboardStats(): Promise<{
    data: PMDashboardStats
    error: string | null
  }> {
    await delay(200)
    return { data: getPMDashboardStats(), error: null }
  },

  async getComplianceStats(months?: number): Promise<{
    data: PMComplianceStats[]
    error: string | null
  }> {
    await delay(300)
    return { data: getPMComplianceStats(months), error: null }
  },

  async getSchedulesByMonth(yearMonth: string): Promise<{
    data: PMSchedule[]
    error: string | null
  }> {
    await delay(300)
    const schedules = mockPMSchedules.filter(s => s.scheduled_date.startsWith(yearMonth))
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
    return { data: schedules, error: null }
  },

  // ========================================
  // Notifications (for checking pending notifications)
  // ========================================
  async checkAndSendNotifications(): Promise<{
    data: { sent: number; schedules: PMSchedule[] }
    error: string | null
  }> {
    await delay(200)

    const today = new Date().toISOString().split('T')[0]
    const threeDaysLater = new Date()
    threeDaysLater.setDate(threeDaysLater.getDate() + 3)
    const threeDaysStr = threeDaysLater.toISOString().split('T')[0]

    const oneDayLater = new Date()
    oneDayLater.setDate(oneDayLater.getDate() + 1)
    const oneDayStr = oneDayLater.toISOString().split('T')[0]

    const notified: PMSchedule[] = []

    mockPMSchedules.forEach(schedule => {
      if (schedule.status !== 'scheduled') return

      // 3 days before
      if (schedule.scheduled_date === threeDaysStr && !schedule.notification_sent_3days) {
        schedule.notification_sent_3days = true
        notified.push(schedule)
      }

      // 1 day before
      if (schedule.scheduled_date === oneDayStr && !schedule.notification_sent_1day) {
        schedule.notification_sent_1day = true
        notified.push(schedule)
      }

      // Today
      if (schedule.scheduled_date === today && !schedule.notification_sent_today) {
        schedule.notification_sent_today = true
        notified.push(schedule)
      }
    })

    return { data: { sent: notified.length, schedules: notified }, error: null }
  },
}
