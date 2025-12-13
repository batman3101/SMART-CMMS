import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import {
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Lightbulb,
  Target,
  Zap,
  Loader2,
  CheckCircle,
  Clock,
  Filter,
} from 'lucide-react'
import { aiApi } from '@/lib/api'
import type { AIInsight } from '@/types'

const severityColors = {
  high: 'destructive',
  medium: 'warning',
  low: 'success',
} as const

const getInsightIcon = (type: string) => {
  switch (type) {
    case 'anomaly':
      return AlertTriangle
    case 'prediction':
      return Target
    case 'recommendation':
      return Lightbulb
    case 'trend':
      return TrendingUp
    default:
      return Zap
  }
}

const getInsightTypeLabel = (type: string, t: (key: string) => string) => {
  switch (type) {
    case 'anomaly':
      return t('ai.typeAnomaly')
    case 'prediction':
      return t('ai.typePrediction')
    case 'recommendation':
      return t('ai.typeRecommendation')
    case 'trend':
      return t('ai.typeTrend')
    default:
      return type
  }
}

export default function AIInsightPage() {
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [summary, setSummary] = useState<{
    total_insights: number
    high_priority: number
    anomalies: number
    predictions: number
    last_updated: string
  } | null>(null)

  // 필터
  const [typeFilter, setTypeFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')

  // 데이터 로드
  const fetchData = async () => {
    setLoading(true)
    try {
      const [insightsRes, summaryRes] = await Promise.all([
        aiApi.getInsights(),
        aiApi.getInsightSummary(),
      ])

      if (insightsRes.data) setInsights(insightsRes.data)
      if (summaryRes.data) setSummary(summaryRes.data)
    } catch (error) {
      console.error('Failed to fetch insights:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 인사이트 갱신
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const { data } = await aiApi.refreshInsights()
      if (data) {
        setInsights(data)
        // summary도 새로고침
        const summaryRes = await aiApi.getInsightSummary()
        if (summaryRes.data) setSummary(summaryRes.data)
      }
    } catch (error) {
      console.error('Failed to refresh insights:', error)
    } finally {
      setRefreshing(false)
    }
  }

  // 필터링
  const filteredInsights = insights.filter((insight) => {
    if (typeFilter && insight.insight_type !== typeFilter) return false
    if (severityFilter) {
      const data = insight.data as { urgency?: string }
      if (data?.urgency !== severityFilter) return false
    }
    return true
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">{t('ai.autoInsight')}</h1>
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
          <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
            {t('ai.lastUpdated')}: {summary?.last_updated ? formatDate(summary.last_updated) : '-'}
          </p>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} size="sm" className="h-9 px-3">
            <RefreshCw className={`h-4 w-4 sm:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('ai.refresh')}</span>
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-blue-100 shrink-0">
              <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="mb-1 sm:mb-2 text-base sm:text-lg font-semibold">{t('ai.insightSummary')}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t('ai.insightSummaryDesc', { total: summary?.total_insights || 0 })}
                {summary?.high_priority
                  ? ` ${t('ai.highPriority')} ${summary.high_priority},`
                  : ''}{' '}
                {summary?.predictions ? `${t('ai.prediction')} ${summary.predictions}` : ''}
                {summary?.anomalies ? `, ${t('ai.anomalyDetection')} ${summary.anomalies}` : ''}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-blue-100">
                <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">{t('ai.totalInsights')}</p>
                <p className="text-lg sm:text-xl font-bold">{summary?.total_insights || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">{t('ai.highPriority')}</p>
                <p className="text-lg sm:text-xl font-bold text-red-600">{summary?.high_priority || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-yellow-100">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">{t('ai.anomalyDetection')}</p>
                <p className="text-lg sm:text-xl font-bold">{summary?.anomalies || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-green-100">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">{t('ai.prediction')}</p>
                <p className="text-lg sm:text-xl font-bold">{summary?.predictions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-6">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4">
            <Select
              className="w-full sm:w-[150px] h-9 sm:h-10 text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">{t('ai.filterAll')}</option>
              <option value="anomaly">{t('ai.filterAnomaly')}</option>
              <option value="prediction">{t('ai.filterPrediction')}</option>
              <option value="recommendation">{t('ai.filterRecommendation')}</option>
              <option value="trend">{t('ai.filterTrend')}</option>
            </Select>
            <Select
              className="w-full sm:w-[150px] h-9 sm:h-10 text-sm"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="">{t('ai.urgencyAll')}</option>
              <option value="high">{t('ai.urgencyHigh')}</option>
              <option value="medium">{t('ai.urgencyMedium')}</option>
              <option value="low">{t('ai.urgencyLow')}</option>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setTypeFilter('')
                setSeverityFilter('')
              }}
              className="col-span-2 sm:col-span-1 h-9 sm:h-10 text-sm"
            >
              <Filter className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t('ai.resetFilter')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Insights List */}
      <div className="grid gap-3 sm:gap-4">
        {filteredInsights.length === 0 ? (
          <Card>
            <CardContent className="py-6 sm:py-8 text-center">
              <CheckCircle className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-green-500" />
              <p className="mt-2 text-sm sm:text-base text-muted-foreground">{t('ai.noInsights')}</p>
            </CardContent>
          </Card>
        ) : (
          filteredInsights.map((insight) => {
            const Icon = getInsightIcon(insight.insight_type)
            const data = insight.data as { urgency?: string; equipment_code?: string }
            const severity = data?.urgency || 'medium'

            return (
              <Card key={insight.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div
                      className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full shrink-0 ${
                        severity === 'high'
                          ? 'bg-red-100'
                          : severity === 'medium'
                            ? 'bg-yellow-100'
                            : 'bg-green-100'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 sm:h-5 sm:w-5 ${
                          severity === 'high'
                            ? 'text-red-600'
                            : severity === 'medium'
                              ? 'text-yellow-600'
                              : 'text-green-600'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-1.5 sm:mb-2 flex flex-wrap items-center gap-1 sm:gap-2">
                        <h3 className="font-semibold text-sm sm:text-base">{insight.title}</h3>
                        <Badge variant="outline" className="text-[10px] sm:text-xs">{getInsightTypeLabel(insight.insight_type, t)}</Badge>
                        <Badge
                          variant={severityColors[severity as keyof typeof severityColors] || 'secondary'}
                          className="text-[10px] sm:text-xs"
                        >
                          {severity === 'high'
                            ? t('ai.urgencyHigh')
                            : severity === 'medium'
                              ? t('ai.urgencyMedium')
                              : t('ai.urgencyLow')}
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">{insight.description}</p>
                      {data?.equipment_code && (
                        <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm">
                          <span className="text-muted-foreground">{t('maintenance.relatedEquipment')}: </span>
                          <span className="font-medium">{data.equipment_code}</span>
                        </p>
                      )}
                      <div className="mt-1.5 sm:mt-2 flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(insight.generated_at)}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="hidden sm:flex h-8 sm:h-9 text-xs sm:text-sm">
                      {t('ai.viewDetail')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
