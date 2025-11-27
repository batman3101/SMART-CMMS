// Mock Maintenance API
// When connecting to Supabase, replace with real API calls

import {
  mockMaintenanceRecords,
  mockRepairTypes,
  getMaintenanceRecordById,
  getMaintenanceRecordsByEquipment,
  getMaintenanceRecordsByTechnician,
  getMaintenanceRecordsByDateRange,
  getInProgressRecords,
  getTodayRecords,
} from '../data'
import { getEquipmentById } from '../data/equipments'
import { mockUsers } from '../data/users'
import type {
  MaintenanceRecord,
  RepairType,
  MaintenanceFilter,
  MaintenanceStartForm,
  MaintenanceCompleteForm,
  EquipmentStatus,
} from '@/types'
import { generateRecordNo } from '@/lib/utils'

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const mockMaintenanceApi = {
  async getMaintenanceRecords(filter?: MaintenanceFilter): Promise<{
    data: MaintenanceRecord[]
    error: string | null
  }> {
    await delay(300)

    let filtered = [...mockMaintenanceRecords]

    if (filter?.start_date && filter?.end_date) {
      filtered = getMaintenanceRecordsByDateRange(filter.start_date, filter.end_date)
    }

    if (filter?.equipment_id) {
      filtered = filtered.filter((r) => r.equipment_id === filter.equipment_id)
    }

    if (filter?.repair_type_id) {
      filtered = filtered.filter((r) => r.repair_type_id === filter.repair_type_id)
    }

    if (filter?.technician_id) {
      filtered = filtered.filter((r) => r.technician_id === filter.technician_id)
    }

    if (filter?.status) {
      filtered = filtered.filter((r) => r.status === filter.status)
    }

    return { data: filtered, error: null }
  },

  async getMaintenanceRecordById(id: string): Promise<{
    data: MaintenanceRecord | null
    error: string | null
  }> {
    await delay(200)
    const record = getMaintenanceRecordById(id)
    return {
      data: record || null,
      error: record ? null : '수리 기록을 찾을 수 없습니다.',
    }
  },

  async getRepairTypes(): Promise<{
    data: RepairType[]
    error: string | null
  }> {
    await delay(200)
    return { data: mockRepairTypes, error: null }
  },

  async getInProgressRecords(): Promise<{
    data: MaintenanceRecord[]
    error: string | null
  }> {
    await delay(200)
    return { data: getInProgressRecords(), error: null }
  },

  async getTodayRecords(): Promise<{
    data: MaintenanceRecord[]
    error: string | null
  }> {
    await delay(200)
    return { data: getTodayRecords(), error: null }
  },

  async getRecordsByEquipment(equipmentId: string): Promise<{
    data: MaintenanceRecord[]
    error: string | null
  }> {
    await delay(200)
    return { data: getMaintenanceRecordsByEquipment(equipmentId), error: null }
  },

  async getRecordsByTechnician(technicianId: string): Promise<{
    data: MaintenanceRecord[]
    error: string | null
  }> {
    await delay(200)
    return { data: getMaintenanceRecordsByTechnician(technicianId), error: null }
  },

  async startMaintenance(
    form: MaintenanceStartForm,
    technicianId: string
  ): Promise<{ data: MaintenanceRecord | null; error: string | null }> {
    await delay(300)

    const equipment = getEquipmentById(form.equipment_id)
    if (!equipment) {
      return { data: null, error: '설비를 찾을 수 없습니다.' }
    }

    const repairType = mockRepairTypes.find((rt) => rt.id === form.repair_type_id)
    if (!repairType) {
      return { data: null, error: '수리 유형을 찾을 수 없습니다.' }
    }

    const technician = mockUsers.find((u) => u.id === technicianId)
    if (!technician) {
      return { data: null, error: '담당자를 찾을 수 없습니다.' }
    }

    // Determine equipment status based on repair type
    let newStatus: EquipmentStatus = 'repair'
    if (repairType.code === 'PM') newStatus = 'pm'
    if (repairType.code === 'EM') newStatus = 'emergency'

    const newRecord: MaintenanceRecord = {
      id: `mr-${Date.now()}`,
      record_no: generateRecordNo(),
      date: form.date,
      equipment_id: form.equipment_id,
      equipment: { ...equipment, status: newStatus },
      repair_type_id: form.repair_type_id,
      repair_type: repairType,
      technician_id: technicianId,
      technician,
      symptom: form.symptom || null,
      repair_content: null,
      start_time: form.start_time,
      end_time: null,
      duration_minutes: null,
      rating: null,
      status: 'in_progress',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // In production, also update equipment status
    return { data: newRecord, error: null }
  },

  async completeMaintenance(
    id: string,
    form: MaintenanceCompleteForm
  ): Promise<{ data: MaintenanceRecord | null; error: string | null }> {
    await delay(300)

    const record = getMaintenanceRecordById(id)
    if (!record) {
      return { data: null, error: '수리 기록을 찾을 수 없습니다.' }
    }

    if (record.status === 'completed') {
      return { data: null, error: '이미 완료된 수리입니다.' }
    }

    const startTime = new Date(record.start_time)
    const endTime = new Date(form.end_time)
    const durationMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / (1000 * 60)
    )

    const updatedRecord: MaintenanceRecord = {
      ...record,
      repair_content: form.repair_content || null,
      end_time: form.end_time,
      duration_minutes: durationMinutes,
      rating: form.rating,
      status: 'completed',
      updated_at: new Date().toISOString(),
    }

    // In production, also update equipment status back to 'normal'
    return { data: updatedRecord, error: null }
  },

  async updateMaintenanceRecord(
    id: string,
    updates: Partial<MaintenanceRecord>
  ): Promise<{ data: MaintenanceRecord | null; error: string | null }> {
    await delay(300)

    const record = getMaintenanceRecordById(id)
    if (!record) {
      return { data: null, error: '수리 기록을 찾을 수 없습니다.' }
    }

    const updatedRecord: MaintenanceRecord = {
      ...record,
      ...updates,
      updated_at: new Date().toISOString(),
    }

    return { data: updatedRecord, error: null }
  },

  async deleteMaintenanceRecord(id: string): Promise<{ error: string | null }> {
    await delay(300)

    const record = getMaintenanceRecordById(id)
    if (!record) {
      return { error: '수리 기록을 찾을 수 없습니다.' }
    }

    // In mock, we don't actually delete
    return { error: null }
  },
}
