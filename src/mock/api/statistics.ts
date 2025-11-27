// Mock Statistics API
// When connecting to Supabase, replace with real API calls

import {
  getDashboardStats,
  getEquipmentStatusDistribution,
  getEquipmentFailureRank,
  getRepairTypeDistribution,
  getMonthlyRepairTrend,
  getWeeklyRepairTrend,
  getTechnicianPerformance,
  getMTBF,
  getMTTR,
  getAvailabilityRate,
  getHourlyFailurePattern,
  getPartUsageStats,
  getBuildingFailureStats,
  getEmergencyRepairRatio,
  getFilteredKPIs,
  getFilteredEquipmentFailureRank,
  getFilteredRepairTypeDistribution,
  getFilteredMonthlyRepairTrend,
  getFilteredBuildingFailureStats,
  getFilteredTechnicianPerformance,
  type StatisticsFilter,
} from '../data'
import type {
  DashboardStats,
  EquipmentFailureRank,
  RepairTypeDistribution,
  MonthlyRepairTrend,
  TechnicianPerformance,
} from '@/types'

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const mockStatisticsApi = {
  async getDashboardStats(): Promise<{
    data: DashboardStats
    error: string | null
  }> {
    await delay(300)
    return { data: getDashboardStats(), error: null }
  },

  async getEquipmentStatusDistribution(): Promise<{
    data: { name: string; value: number; color: string }[]
    error: string | null
  }> {
    await delay(200)
    return { data: getEquipmentStatusDistribution(), error: null }
  },

  async getEquipmentFailureRank(limit?: number): Promise<{
    data: EquipmentFailureRank[]
    error: string | null
  }> {
    await delay(200)
    return { data: getEquipmentFailureRank(limit), error: null }
  },

  async getRepairTypeDistribution(
    filterType?: 'today' | '7days' | '30days' | 'custom',
    startDate?: string,
    endDate?: string
  ): Promise<{
    data: RepairTypeDistribution[]
    error: string | null
  }> {
    await delay(200)

    // 필터가 지정된 경우 필터링된 데이터 반환
    if (filterType) {
      const filter: StatisticsFilter = {}
      const today = new Date()

      switch (filterType) {
        case 'today': {
          filter.startDate = today.toISOString().split('T')[0]
          filter.endDate = today.toISOString().split('T')[0]
          break
        }
        case '7days': {
          const sevenDaysAgo = new Date(today)
          sevenDaysAgo.setDate(today.getDate() - 7)
          filter.startDate = sevenDaysAgo.toISOString().split('T')[0]
          filter.endDate = today.toISOString().split('T')[0]
          break
        }
        case '30days': {
          const thirtyDaysAgo = new Date(today)
          thirtyDaysAgo.setDate(today.getDate() - 30)
          filter.startDate = thirtyDaysAgo.toISOString().split('T')[0]
          filter.endDate = today.toISOString().split('T')[0]
          break
        }
        case 'custom':
          if (startDate && endDate) {
            filter.startDate = startDate
            filter.endDate = endDate
          }
          break
      }

      return { data: getFilteredRepairTypeDistribution(filter), error: null }
    }

    return { data: getRepairTypeDistribution(), error: null }
  },

  async getMonthlyRepairTrend(): Promise<{
    data: MonthlyRepairTrend[]
    error: string | null
  }> {
    await delay(200)
    return { data: getMonthlyRepairTrend(), error: null }
  },

  async getWeeklyRepairTrend(): Promise<{
    data: { day: string; count: number }[]
    error: string | null
  }> {
    await delay(200)
    return { data: getWeeklyRepairTrend(), error: null }
  },

  async getTechnicianPerformance(): Promise<{
    data: TechnicianPerformance[]
    error: string | null
  }> {
    await delay(200)
    return { data: getTechnicianPerformance(), error: null }
  },

  async getKPIs(): Promise<{
    data: {
      mtbf: number // hours
      mttr: number // hours
      availability: number // percentage
    }
    error: string | null
  }> {
    await delay(200)
    return {
      data: {
        mtbf: getMTBF(),
        mttr: getMTTR(),
        availability: getAvailabilityRate(),
      },
      error: null,
    }
  },

  async getHourlyFailurePattern(): Promise<{
    data: { hour: string; count: number }[]
    error: string | null
  }> {
    await delay(200)
    return { data: getHourlyFailurePattern(), error: null }
  },

  async getPartUsageStats(): Promise<{
    data: { part_code: string; part_name: string; usage_count: number }[]
    error: string | null
  }> {
    await delay(200)
    return { data: getPartUsageStats(), error: null }
  },

  async getBuildingFailureStats(): Promise<{
    data: { building: string; failure_count: number; total_downtime_minutes: number }[]
    error: string | null
  }> {
    await delay(200)
    return { data: getBuildingFailureStats(), error: null }
  },

  async getEmergencyRepairRatio(): Promise<{
    data: number
    error: string | null
  }> {
    await delay(200)
    return { data: getEmergencyRepairRatio(), error: null }
  },

  // Filtered statistics APIs
  async getFilteredKPIs(filter?: StatisticsFilter): Promise<{
    data: {
      mtbf: number
      mttr: number
      availability: number
      emergencyRatio: number
      totalRepairs: number
    }
    error: string | null
  }> {
    await delay(200)
    return { data: getFilteredKPIs(filter), error: null }
  },

  async getFilteredEquipmentFailureRank(
    filter?: StatisticsFilter,
    limit?: number
  ): Promise<{
    data: EquipmentFailureRank[]
    error: string | null
  }> {
    await delay(200)
    return { data: getFilteredEquipmentFailureRank(filter, limit), error: null }
  },

  async getFilteredRepairTypeDistribution(filter?: StatisticsFilter): Promise<{
    data: RepairTypeDistribution[]
    error: string | null
  }> {
    await delay(200)
    return { data: getFilteredRepairTypeDistribution(filter), error: null }
  },

  async getFilteredMonthlyRepairTrend(filter?: StatisticsFilter): Promise<{
    data: MonthlyRepairTrend[]
    error: string | null
  }> {
    await delay(200)
    return { data: getFilteredMonthlyRepairTrend(filter), error: null }
  },

  async getFilteredBuildingFailureStats(filter?: StatisticsFilter): Promise<{
    data: { building: string; failure_count: number; total_downtime_minutes: number }[]
    error: string | null
  }> {
    await delay(200)
    return { data: getFilteredBuildingFailureStats(filter), error: null }
  },

  async getFilteredTechnicianPerformance(filter?: StatisticsFilter): Promise<{
    data: TechnicianPerformance[]
    error: string | null
  }> {
    await delay(200)
    return { data: getFilteredTechnicianPerformance(filter), error: null }
  },
}
