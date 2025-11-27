// Mock AI API
// When connecting to Supabase/Gemini, replace with real API calls

import { mockAIInsights, mockAIChatResponses, getRecentInsights } from '../data'
import type { AIInsight } from '@/types'

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const mockAIApi = {
  async getInsights(): Promise<{
    data: AIInsight[]
    error: string | null
  }> {
    await delay(300)
    return { data: mockAIInsights, error: null }
  },

  async getRecentInsights(limit?: number): Promise<{
    data: AIInsight[]
    error: string | null
  }> {
    await delay(200)
    return { data: getRecentInsights(limit), error: null }
  },

  async getInsightsByType(type: string): Promise<{
    data: AIInsight[]
    error: string | null
  }> {
    await delay(200)
    const filtered = mockAIInsights.filter((i) => i.insight_type === type)
    return { data: filtered, error: null }
  },

  async refreshInsights(): Promise<{
    data: AIInsight[]
    error: string | null
  }> {
    await delay(1000) // Simulate AI processing time

    // In mock, just return updated timestamps
    const refreshedInsights = mockAIInsights.map((insight) => ({
      ...insight,
      generated_at: new Date().toISOString(),
    }))

    return { data: refreshedInsights, error: null }
  },

  async chat(message: string): Promise<{
    data: { response: string }
    error: string | null
  }> {
    await delay(800) // Simulate AI response time

    // Find matching response or return default
    const matchingKey = Object.keys(mockAIChatResponses).find((key) =>
      message.includes(key)
    )

    const response = matchingKey
      ? mockAIChatResponses[matchingKey]
      : `질문을 이해했습니다: "${message}"\n\n죄송합니다. 현재 해당 질문에 대한 분석 데이터가 충분하지 않습니다. 다음과 같은 질문을 시도해 보세요:\n\n- 이번 주 가장 많이 고장난 설비는?\n- PM 일정이 다가오는 설비 목록\n- 평균 수리 시간이 가장 긴 수리 유형은?`

    return { data: { response }, error: null }
  },

  async getInsightSummary(): Promise<{
    data: {
      total_insights: number
      high_priority: number
      anomalies: number
      predictions: number
      last_updated: string
    }
    error: string | null
  }> {
    await delay(200)

    const summary = {
      total_insights: mockAIInsights.length,
      high_priority: mockAIInsights.filter(
        (i) => (i.data as Record<string, unknown>)?.urgency === 'high'
      ).length,
      anomalies: mockAIInsights.filter((i) => i.insight_type === 'anomaly')
        .length,
      predictions: mockAIInsights.filter((i) => i.insight_type === 'prediction')
        .length,
      last_updated: mockAIInsights[0]?.generated_at || new Date().toISOString(),
    }

    return { data: summary, error: null }
  },
}
