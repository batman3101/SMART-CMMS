// Mock API Index - Export all mock APIs
// When connecting to Supabase, the unified API in @/lib/api will automatically
// use Supabase when connected, falling back to mock data when not connected

export { mockAuthApi } from './auth'
export { mockEquipmentApi } from './equipments'
export { mockMaintenanceApi } from './maintenance'
export { mockStatisticsApi } from './statistics'
export { mockUsersApi } from './users'
export { mockPMApi } from './pm'

// AI API now uses the unified API layer for Supabase/Gemini support
import { aiApi } from '@/lib/api'

export const mockAIApi = {
  getInsights: aiApi.getInsights,
  getInsightSummary: aiApi.getInsightSummary,
  refreshInsights: aiApi.refreshInsights,
  chat: aiApi.chat,
  getRecentInsights: async (limit?: number) => {
    const result = await aiApi.getInsights()
    return { data: result.data?.slice(0, limit || 5) || [], error: result.error }
  },
  getInsightsByType: async (type: string) => {
    const result = await aiApi.getInsights()
    return { data: result.data?.filter(i => i.insight_type === type) || [], error: result.error }
  },
}
