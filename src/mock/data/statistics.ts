import type { DashboardStats, EquipmentFailureRank, RepairTypeDistribution, MonthlyRepairTrend, TechnicianPerformance } from '@/types'
import { mockEquipments } from './equipments'
import { mockMaintenanceRecords } from './maintenanceRecords'
import { mockRepairTypes } from './repairTypes'
import { mockUsers } from './users'

// Dashboard stats
export const getDashboardStats = (): DashboardStats => {
  const today = new Date().toISOString().split('T')[0]
  const todayRecords = mockMaintenanceRecords.filter((r) => r.date === today)

  return {
    total_equipment: mockEquipments.length,
    running_equipment: mockEquipments.filter((e) => e.status === 'normal').length,
    repair_equipment: mockEquipments.filter((e) =>
      ['repair', 'pm', 'emergency'].includes(e.status)
    ).length,
    standby_equipment: mockEquipments.filter((e) => e.status === 'standby').length,
    today_repairs: todayRecords.length,
    completed_repairs: todayRecords.filter((r) => r.status === 'completed').length,
    emergency_count: mockEquipments.filter((e) => e.status === 'emergency').length,
  }
}

// Equipment status distribution
export const getEquipmentStatusDistribution = () => {
  const statusCounts = mockEquipments.reduce(
    (acc, eq) => {
      acc[eq.status] = (acc[eq.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return [
    { name: '정상', value: statusCounts.normal || 0, color: '#10B981' },
    { name: 'PM 중', value: statusCounts.pm || 0, color: '#3B82F6' },
    { name: '수리 중', value: statusCounts.repair || 0, color: '#F59E0B' },
    { name: '긴급수리', value: statusCounts.emergency || 0, color: '#EF4444' },
    { name: '대기', value: statusCounts.standby || 0, color: '#9CA3AF' },
  ]
}

// Equipment failure ranking
export const getEquipmentFailureRank = (limit: number = 10): EquipmentFailureRank[] => {
  const failureData = mockMaintenanceRecords
    .filter((r) => r.repair_type?.code === 'BR' || r.repair_type?.code === 'EM')
    .reduce(
      (acc, r) => {
        if (!acc[r.equipment_id]) {
          acc[r.equipment_id] = { count: 0, downtime: 0 }
        }
        acc[r.equipment_id].count += 1
        acc[r.equipment_id].downtime += r.duration_minutes || 0
        return acc
      },
      {} as Record<string, { count: number; downtime: number }>
    )

  return Object.entries(failureData)
    .map(([equipment_id, data]) => {
      const equipment = mockEquipments.find((e) => e.id === equipment_id)
      return {
        equipment_id,
        equipment_code: equipment?.equipment_code || '',
        equipment_name: equipment?.equipment_name || '',
        failure_count: data.count,
        total_downtime_minutes: data.downtime,
      }
    })
    .sort((a, b) => b.failure_count - a.failure_count)
    .slice(0, limit)
}

// Repair type distribution
export const getRepairTypeDistribution = (): RepairTypeDistribution[] => {
  const typeCounts = mockMaintenanceRecords.reduce(
    (acc, r) => {
      if (r.repair_type_id) {
        acc[r.repair_type_id] = (acc[r.repair_type_id] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>
  )

  const total = Object.values(typeCounts).reduce((sum, count) => sum + count, 0)

  return mockRepairTypes.map((rt) => ({
    repair_type_id: rt.id,
    code: rt.code,
    name: rt.name,
    count: typeCounts[rt.id] || 0,
    percentage: total > 0 ? ((typeCounts[rt.id] || 0) / total) * 100 : 0,
  }))
}

// Monthly repair trend (last 6 months)
export const getMonthlyRepairTrend = (): MonthlyRepairTrend[] => {
  const trends: MonthlyRepairTrend[] = []
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthLabel = `${date.getMonth() + 1}월`

    const count = mockMaintenanceRecords.filter((r) => r.date.startsWith(month)).length

    trends.push({ month: monthLabel, count })
  }

  return trends
}

// Weekly repair trend (last 7 days)
export const getWeeklyRepairTrend = () => {
  const trends: { day: string; count: number }[] = []
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const now = new Date()

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const dayName = dayNames[date.getDay()]

    const count = mockMaintenanceRecords.filter((r) => r.date === dateStr).length
    trends.push({ day: dayName, count })
  }

  return trends
}

// Technician performance
export const getTechnicianPerformance = (): TechnicianPerformance[] => {
  const technicians = mockUsers.filter((u) => u.role === 3 && u.is_active)

  return technicians.map((tech) => {
    const techRecords = mockMaintenanceRecords.filter(
      (r) => r.technician_id === tech.id && r.status === 'completed'
    )

    const totalDuration = techRecords.reduce(
      (sum, r) => sum + (r.duration_minutes || 0),
      0
    )
    const totalRating = techRecords.reduce((sum, r) => sum + (r.rating || 0), 0)

    return {
      technician_id: tech.id,
      technician_name: tech.name_ko,
      completed_count: techRecords.length,
      avg_repair_time:
        techRecords.length > 0 ? Math.round(totalDuration / techRecords.length) : 0,
      avg_rating:
        techRecords.length > 0
          ? Math.round((totalRating / techRecords.length) * 10) / 10
          : 0,
    }
  })
}

// MTBF calculation (Mean Time Between Failures) - hours
export const getMTBF = (): number => {
  const failureRecords = mockMaintenanceRecords.filter(
    (r) => r.repair_type?.code === 'BR' || r.repair_type?.code === 'EM'
  )

  if (failureRecords.length < 2) return 0

  // 30일 기준, 설비당 평균 고장 간격
  const totalEquipment = mockEquipments.length
  const totalHours = 30 * 24 // 30일
  const avgFailuresPerEquipment = failureRecords.length / totalEquipment

  return avgFailuresPerEquipment > 0
    ? Math.round(totalHours / avgFailuresPerEquipment)
    : totalHours
}

// MTTR calculation (Mean Time To Repair) - hours
export const getMTTR = (): number => {
  const completedRecords = mockMaintenanceRecords.filter(
    (r) => r.status === 'completed' && r.duration_minutes
  )

  if (completedRecords.length === 0) return 0

  const totalMinutes = completedRecords.reduce(
    (sum, r) => sum + (r.duration_minutes || 0),
    0
  )

  return Math.round((totalMinutes / completedRecords.length / 60) * 10) / 10 // hours
}

// Equipment availability rate
export const getAvailabilityRate = (): number => {
  const normalCount = mockEquipments.filter((e) => e.status === 'normal').length
  return Math.round((normalCount / mockEquipments.length) * 1000) / 10 // percentage
}

// Hourly failure pattern
export const getHourlyFailurePattern = () => {
  const hourCounts: Record<number, number> = {}

  mockMaintenanceRecords
    .filter((r) => r.repair_type?.code === 'BR' || r.repair_type?.code === 'EM')
    .forEach((r) => {
      const hour = new Date(r.start_time).getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })

  return Array.from({ length: 24 }, (_, hour) => ({
    hour: `${hour}시`,
    count: hourCounts[hour] || 0,
  }))
}

// Part usage statistics
export const getPartUsageStats = () => {
  // Mock part usage data
  return [
    { part_code: 'BRG-6205', part_name: '베어링 6205', usage_count: 45 },
    { part_code: 'OIL-SP100', part_name: '스핀들 오일', usage_count: 38 },
    { part_code: 'FLT-AIR01', part_name: '에어 필터', usage_count: 32 },
    { part_code: 'BLT-V01', part_name: 'V벨트', usage_count: 28 },
    { part_code: 'SNS-PRX01', part_name: '근접 센서', usage_count: 22 },
    { part_code: 'SL-HYD01', part_name: '유압 씰', usage_count: 18 },
    { part_code: 'CBL-SRV01', part_name: '서보 케이블', usage_count: 15 },
    { part_code: 'FLT-OIL01', part_name: '오일 필터', usage_count: 12 },
  ]
}

// Building-wise failure statistics
export const getBuildingFailureStats = () => {
  const buildingData: Record<string, { count: number; downtime: number }> = {}

  mockMaintenanceRecords
    .filter((r) => r.repair_type?.code === 'BR' || r.repair_type?.code === 'EM')
    .forEach((r) => {
      const building = r.equipment?.building || 'Unknown'
      if (!buildingData[building]) {
        buildingData[building] = { count: 0, downtime: 0 }
      }
      buildingData[building].count += 1
      buildingData[building].downtime += r.duration_minutes || 0
    })

  return Object.entries(buildingData)
    .map(([building, data]) => ({
      building,
      failure_count: data.count,
      total_downtime_minutes: data.downtime,
    }))
    .sort((a, b) => b.failure_count - a.failure_count)
}

// Emergency repair ratio
export const getEmergencyRepairRatio = (): number => {
  const totalRepairs = mockMaintenanceRecords.length
  const emergencyRepairs = mockMaintenanceRecords.filter(
    (r) => r.repair_type?.code === 'EM'
  ).length

  return totalRepairs > 0
    ? Math.round((emergencyRepairs / totalRepairs) * 1000) / 10
    : 0
}

// Filtered statistics interface
export interface StatisticsFilter {
  startDate?: string
  endDate?: string
  building?: string
  equipmentTypeId?: string
}

// Get filtered maintenance records
const getFilteredRecords = (filter?: StatisticsFilter) => {
  let records = [...mockMaintenanceRecords]

  if (filter?.startDate) {
    records = records.filter((r) => r.date >= filter.startDate!)
  }
  if (filter?.endDate) {
    records = records.filter((r) => r.date <= filter.endDate!)
  }
  if (filter?.building) {
    records = records.filter((r) => r.equipment?.building === filter.building)
  }
  if (filter?.equipmentTypeId) {
    records = records.filter(
      (r) => r.equipment?.equipment_type_id === filter.equipmentTypeId
    )
  }

  return records
}

// Filtered KPIs
export const getFilteredKPIs = (filter?: StatisticsFilter) => {
  const records = getFilteredRecords(filter)
  const completedRecords = records.filter(
    (r) => r.status === 'completed' && r.duration_minutes
  )
  const failureRecords = records.filter(
    (r) => r.repair_type?.code === 'BR' || r.repair_type?.code === 'EM'
  )
  const emergencyRecords = records.filter((r) => r.repair_type?.code === 'EM')

  // MTTR
  const totalMinutes = completedRecords.reduce(
    (sum, r) => sum + (r.duration_minutes || 0),
    0
  )
  const mttr =
    completedRecords.length > 0
      ? Math.round((totalMinutes / completedRecords.length / 60) * 10) / 10
      : 0

  // MTBF (simplified)
  const totalHours = 30 * 24
  const avgFailuresPerEquipment = failureRecords.length / mockEquipments.length
  const mtbf =
    avgFailuresPerEquipment > 0
      ? Math.round(totalHours / avgFailuresPerEquipment)
      : totalHours

  // Availability
  const normalCount = mockEquipments.filter((e) => e.status === 'normal').length
  const availability = Math.round((normalCount / mockEquipments.length) * 1000) / 10

  // Emergency ratio
  const emergencyRatio =
    records.length > 0
      ? Math.round((emergencyRecords.length / records.length) * 1000) / 10
      : 0

  // Total repairs
  const totalRepairs = records.length

  return {
    mtbf,
    mttr,
    availability,
    emergencyRatio,
    totalRepairs,
  }
}

// Filtered equipment failure ranking
export const getFilteredEquipmentFailureRank = (
  filter?: StatisticsFilter,
  limit: number = 10
) => {
  const records = getFilteredRecords(filter)
  const failureData = records
    .filter((r) => r.repair_type?.code === 'BR' || r.repair_type?.code === 'EM')
    .reduce(
      (acc, r) => {
        if (!acc[r.equipment_id]) {
          acc[r.equipment_id] = { count: 0, downtime: 0 }
        }
        acc[r.equipment_id].count += 1
        acc[r.equipment_id].downtime += r.duration_minutes || 0
        return acc
      },
      {} as Record<string, { count: number; downtime: number }>
    )

  return Object.entries(failureData)
    .map(([equipment_id, data]) => {
      const equipment = mockEquipments.find((e) => e.id === equipment_id)
      return {
        equipment_id,
        equipment_code: equipment?.equipment_code || '',
        equipment_name: equipment?.equipment_name || '',
        failure_count: data.count,
        total_downtime_minutes: data.downtime,
      }
    })
    .sort((a, b) => b.failure_count - a.failure_count)
    .slice(0, limit)
}

// Filtered repair type distribution
export const getFilteredRepairTypeDistribution = (filter?: StatisticsFilter) => {
  const records = getFilteredRecords(filter)
  const typeCounts = records.reduce(
    (acc, r) => {
      if (r.repair_type_id) {
        acc[r.repair_type_id] = (acc[r.repair_type_id] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>
  )

  const total = Object.values(typeCounts).reduce((sum, count) => sum + count, 0)

  return mockRepairTypes.map((rt) => ({
    repair_type_id: rt.id,
    code: rt.code,
    name: rt.name,
    count: typeCounts[rt.id] || 0,
    percentage: total > 0 ? ((typeCounts[rt.id] || 0) / total) * 100 : 0,
  }))
}

// Filtered monthly trend
export const getFilteredMonthlyRepairTrend = (filter?: StatisticsFilter) => {
  const records = getFilteredRecords(filter)
  const trends: { month: string; count: number }[] = []
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthLabel = `${date.getMonth() + 1}월`

    const count = records.filter((r) => r.date.startsWith(month)).length

    trends.push({ month: monthLabel, count })
  }

  return trends
}

// Filtered building failure stats
export const getFilteredBuildingFailureStats = (filter?: StatisticsFilter) => {
  const records = getFilteredRecords(filter)
  const buildingData: Record<string, { count: number; downtime: number }> = {}

  records
    .filter((r) => r.repair_type?.code === 'BR' || r.repair_type?.code === 'EM')
    .forEach((r) => {
      const building = r.equipment?.building || 'Unknown'
      if (!buildingData[building]) {
        buildingData[building] = { count: 0, downtime: 0 }
      }
      buildingData[building].count += 1
      buildingData[building].downtime += r.duration_minutes || 0
    })

  return Object.entries(buildingData)
    .map(([building, data]) => ({
      building,
      failure_count: data.count,
      total_downtime_minutes: data.downtime,
    }))
    .sort((a, b) => b.failure_count - a.failure_count)
}

// Filtered technician performance
export const getFilteredTechnicianPerformance = (filter?: StatisticsFilter) => {
  const records = getFilteredRecords(filter)
  const technicians = mockUsers.filter((u) => u.role === 3 && u.is_active)

  return technicians.map((tech) => {
    const techRecords = records.filter(
      (r) => r.technician_id === tech.id && r.status === 'completed'
    )

    const totalDuration = techRecords.reduce(
      (sum, r) => sum + (r.duration_minutes || 0),
      0
    )
    const totalRating = techRecords.reduce((sum, r) => sum + (r.rating || 0), 0)

    return {
      technician_id: tech.id,
      technician_name: tech.name_ko,
      completed_count: techRecords.length,
      avg_repair_time:
        techRecords.length > 0 ? Math.round(totalDuration / techRecords.length) : 0,
      avg_rating:
        techRecords.length > 0
          ? Math.round((totalRating / techRecords.length) * 10) / 10
          : 0,
    }
  })
}
