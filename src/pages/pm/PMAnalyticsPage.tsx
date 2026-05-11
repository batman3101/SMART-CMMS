import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/authStore'
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Clock,
  Calendar,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { pmApi, equipmentApi } from '@/lib/api'
import { getCurrentDateInTimezone } from '@/lib/dateUtils'
import type { EquipmentType, Equipment } from '@/types'

type PeriodType = 'week' | 'month' | 'quarter' | 'year' | 'custom'

const PERIOD_I18N_KEYS: Record<PeriodType, string> = {
  week: 'analytics.thisWeek',
  month: 'analytics.thisMonth',
  quarter: 'analytics.thisQuarter',
  year: 'analytics.thisYear',
  custom: 'dashboard.customPeriod',
}

// 카드/차트 안에 표시할 보조 기간 라벨
function getPeriodDisplayLabel(period: PeriodType, range: { startDate: string; endDate: string }, t: (key: string) => string): string {
  return `${t(PERIOD_I18N_KEYS[period])} · ${range.startDate} ~ ${range.endDate}`
}

// period state → startDate/endDate (YYYY-MM-DD, 베트남 timezone 기준 현재일 사용)
function resolvePeriodRange(
  period: PeriodType,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string } {
  const now = getCurrentDateInTimezone()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  switch (period) {
    case 'week': {
      const day = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - ((day + 6) % 7))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { startDate: fmt(monday), endDate: fmt(sunday) }
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { startDate: fmt(start), endDate: fmt(end) }
    }
    case 'quarter': {
      const qStartMonth = Math.floor(now.getMonth() / 3) * 3
      const start = new Date(now.getFullYear(), qStartMonth, 1)
      const end = new Date(now.getFullYear(), qStartMonth + 3, 0)
      return { startDate: fmt(start), endDate: fmt(end) }
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1)
      const end = new Date(now.getFullYear(), 11, 31)
      return { startDate: fmt(start), endDate: fmt(end) }
    }
    case 'custom':
      return {
        startDate: customStart || fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
        endDate: customEnd || fmt(now),
      }
  }
}

interface PMAnalyticsData {
  complianceRate: number
  complianceChange: number
  totalScheduled: number
  totalCompleted: number
  totalOverdue: number
  avgCompletionTime: number
  monthlyTrend: { month: string; completed: number; scheduled: number; compliance: number }[]
  byEquipmentType: { name: string; completed: number; overdue: number }[]
  byTechnician: { name: string; completed: number; avgRating: number }[]
  statusDistribution: { name: string; value: number; color: string }[]
}

export default function PMAnalyticsPage() {
  const { t, i18n } = useTranslation()
  const { currentFactory } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodType>('month')
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState('')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // 카드/차트 컨테이너에 표시할 보조 기간 라벨
  const periodLabel = useMemo(() => {
    const range = resolvePeriodRange(period, customStart, customEnd)
    return getPeriodDisplayLabel(period, range, t)
  }, [period, customStart, customEnd, t])

  // 동적 카드 제목 ("이번 달 완료" 하드코딩 → 선택된 기간에 따라)
  const completedCardTitle = useMemo(() => {
    return `${t(PERIOD_I18N_KEYS[period])} ${t('pm.completed')}`
  }, [period, t])
  const [analyticsData, setAnalyticsData] = useState<PMAnalyticsData | null>(null)
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])
  const [allEquipments, setAllEquipments] = useState<Equipment[]>([])

  // 설비 유형 필터가 적용되면 해당 type의 equipment_id 목록을 도출.
  // 미적용 시 undefined → API가 전체 설비를 대상으로 동작.
  const filteredEquipmentIds = useMemo<string[] | undefined>(() => {
    if (!equipmentTypeFilter) return undefined
    return allEquipments
      .filter(e => e.equipment_type_id === equipmentTypeFilter)
      .map(e => e.id)
  }, [equipmentTypeFilter, allEquipments])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // 'custom'은 사용자가 적용 버튼을 눌렀을 때만 fetch (start/end 둘 다 있을 때)
    if (period === 'custom' && (!customStart || !customEnd)) return
    fetchAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customStart, customEnd, equipmentTypeFilter, filteredEquipmentIds, equipmentTypes, i18n.language, currentFactory])

  const fetchData = async () => {
    const [typesRes, equipsRes] = await Promise.all([
      equipmentApi.getEquipmentTypes(),
      equipmentApi.getEquipments(),
    ])
    if (typesRes.data) setEquipmentTypes(typesRes.data)
    if (equipsRes.data) setAllEquipments(equipsRes.data)
  }

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const baseRange = resolvePeriodRange(period, customStart, customEnd)
      const range = { ...baseRange, equipmentIds: filteredEquipmentIds }
      // 월별 추이는 자체 시간축이라 기간 필터를 적용하지 않고 항상 최근 6개월 유지
      const [
        complianceRes,
        dashboardRes,
        monthlyTrendRes,
        byEquipmentTypeRes,
        byTechnicianRes,
        statusDistributionRes,
        avgCompletionTimeRes,
      ] = await Promise.all([
        pmApi.getComplianceStats(),
        pmApi.getDashboardStats(range),
        pmApi.getMonthlyTrend(6, filteredEquipmentIds),
        pmApi.getByEquipmentType(i18n.language, range),
        pmApi.getByTechnician(range),
        pmApi.getStatusDistribution(range),
        pmApi.getAvgCompletionTime(range),
      ])

      // Format monthly trend data with localized month names
      const monthlyTrend = (monthlyTrendRes.data || []).map((item) => {
        // item.month is in YYYY-MM format (e.g., "2024-12")
        const date = new Date(item.month + '-01')
        const monthName = date.toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : 'vi-VN', {
          month: 'short',
        })
        return {
          month: monthName,
          completed: item.completed,
          scheduled: item.scheduled,
          compliance: item.compliance,
        }
      })

      // Format equipment type data
      const byEquipmentType = byEquipmentTypeRes.data || []

      // Format technician data
      const byTechnician = byTechnicianRes.data || []

      // Format status distribution with colors and translations
      const statusColorMap: Record<string, { color: string; label: string }> = {
        completed: { color: '#10B981', label: t('pm.statusCompleted') },
        scheduled: { color: '#3B82F6', label: t('pm.statusScheduled') },
        in_progress: { color: '#F59E0B', label: t('pm.statusInProgress') },
        overdue: { color: '#EF4444', label: t('pm.statusOverdue') },
      }

      const statusDistribution = (statusDistributionRes.data || []).map((item) => ({
        name: statusColorMap[item.status]?.label || item.status,
        value: item.count,
        color: statusColorMap[item.status]?.color || '#9CA3AF',
      }))

      // PM 준수율: 선택된 기간 기준 (getDashboardStats가 이미 기간 적용된 compliance_rate 반환)
      // 이전엔 6개월 평균이라 기간 필터와 일치하지 않아 사용자가 혼란.
      const periodCompliance = dashboardRes.data?.compliance_rate ?? 0

      // 전월 대비 변화율: getComplianceStats가 오래된 → 최근 순으로 정렬해 반환
      // 마지막 요소가 이번 달, 그 직전이 전월. 둘의 compliance_rate 차이.
      const sortedCompliance = complianceRes.data || []
      const thisMonthRate = sortedCompliance[sortedCompliance.length - 1]?.compliance_rate ?? 0
      const lastMonthRate = sortedCompliance[sortedCompliance.length - 2]?.compliance_rate ?? 0
      const monthOverMonthChange = Math.round((thisMonthRate - lastMonthRate) * 10) / 10

      setAnalyticsData({
        complianceRate: periodCompliance,
        complianceChange: monthOverMonthChange,
        totalScheduled: dashboardRes.data?.total_scheduled || 0,
        totalCompleted: dashboardRes.data?.completed_this_month || 0,
        totalOverdue: dashboardRes.data?.overdue_count || 0,
        avgCompletionTime: avgCompletionTimeRes.data || 0,
        monthlyTrend,
        byEquipmentType,
        byTechnician,
        statusDistribution,
      })
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">{t('common.noData')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{t('pm.analytics')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            className="w-[150px]"
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodType)}
          >
            <option value="week">{t('analytics.thisWeek')}</option>
            <option value="month">{t('analytics.thisMonth')}</option>
            <option value="quarter">{t('analytics.thisQuarter')}</option>
            <option value="year">{t('analytics.thisYear')}</option>
            <option value="custom">{t('dashboard.customPeriod')}</option>
          </Select>
          {period === 'custom' && (
            <div className="flex items-center gap-1">
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-9 w-[140px] text-sm"
              />
              <span className="text-muted-foreground text-sm">~</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-9 w-[140px] text-sm"
              />
            </div>
          )}
          <Select
            className="w-[180px]"
            value={equipmentTypeFilter}
            onChange={(e) => setEquipmentTypeFilter(e.target.value)}
          >
            <option value="">{t('pm.allEquipmentTypes')}</option>
            {equipmentTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </Select>
          <Button variant="outline" size="sm" onClick={fetchAnalytics}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* 선택된 기간 — KPI/차트가 공유하는 prominent 안내 배지 */}
      <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-primary border border-primary/20">
        <Calendar className="h-5 w-5" />
        <span className="font-semibold text-base">{periodLabel}</span>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('pm.complianceRate')}</p>
                <p className="text-3xl font-bold text-primary">
                  {analyticsData.complianceRate}%
                </p>
                <div className="flex items-center gap-1 text-sm">
                  {analyticsData.complianceChange >= 0 ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-green-600">+{analyticsData.complianceChange}%</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      <span className="text-red-600">{analyticsData.complianceChange}%</span>
                    </>
                  )}
                  <span className="text-muted-foreground">{t('pm.vsLastMonth')}</span>
                </div>
              </div>
              <TrendingUp className="h-10 w-10 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{completedCardTitle}</p>
                <p className="text-3xl font-bold text-green-600">
                  {analyticsData.totalCompleted}
                </p>
                <p className="text-sm text-muted-foreground">
                  / {analyticsData.totalScheduled} {t('pm.scheduled')}
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('pm.overdueCount')}</p>
                <p className="text-3xl font-bold text-red-600">{analyticsData.totalOverdue}</p>
                <p className="text-sm text-muted-foreground">{t('pm.requiresAttention')}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-red-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('pm.avgCompletionTime')}</p>
                <p className="text-3xl font-bold">{analyticsData.avgCompletionTime}</p>
                <p className="text-sm text-muted-foreground">{t('pm.minutes')}</p>
              </div>
              <Clock className="h-10 w-10 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <CardTitle className="text-lg">{t('pm.monthlyTrend')}</CardTitle>
              <span className="text-xs text-muted-foreground">{t('analytics.last6Months')}</span>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="completed"
                  name={t('pm.completed')}
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="scheduled"
                  name={t('pm.scheduled')}
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="compliance"
                  name={t('pm.complianceRate')}
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <CardTitle className="text-lg">{t('pm.statusDistribution')}</CardTitle>
              <span className="text-xs text-muted-foreground">{periodLabel}</span>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {analyticsData.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By Equipment Type */}
        <Card>
          <CardHeader>
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <CardTitle className="text-lg">{t('pm.byEquipmentType')}</CardTitle>
              <span className="text-xs text-muted-foreground">{periodLabel}</span>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.byEquipmentType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="completed"
                  name={t('pm.completed')}
                  fill="#10B981"
                  radius={[0, 4, 4, 0]}
                >
                  <LabelList
                    dataKey="completed"
                    position="insideRight"
                    fill="#ffffff"
                    fontSize={12}
                    fontWeight={700}
                    formatter={(value: number) => value > 0 ? value : ''}
                  />
                </Bar>
                <Bar
                  dataKey="overdue"
                  name={t('pm.statusOverdue')}
                  fill="#EF4444"
                  radius={[0, 4, 4, 0]}
                >
                  <LabelList
                    dataKey="overdue"
                    position="insideRight"
                    fill="#ffffff"
                    fontSize={12}
                    fontWeight={700}
                    formatter={(value: number) => value > 0 ? value : ''}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Technician Performance */}
        <Card>
          <CardHeader>
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <CardTitle className="text-lg">{t('pm.technicianPerformance')}</CardTitle>
              <span className="text-xs text-muted-foreground">{periodLabel}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.byTechnician.map((tech, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{tech.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {tech.completed} {t('pm.completedPMs')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`text-lg ${
                            star <= Math.round(tech.avgRating)
                              ? 'text-yellow-500'
                              : 'text-gray-300'
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('pm.avgRating')}: {tech.avgRating.toFixed(1)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <CardTitle className="text-lg">{t('pm.complianceSummary')}</CardTitle>
            <span className="text-xs text-muted-foreground">{periodLabel}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4 text-center">
              <Calendar className="mx-auto mb-2 h-8 w-8 text-blue-500" />
              <p className="text-2xl font-bold">{analyticsData.totalScheduled}</p>
              <p className="text-sm text-muted-foreground">{t('pm.totalScheduled')}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500" />
              <p className="text-2xl font-bold text-green-600">{analyticsData.totalCompleted}</p>
              <p className="text-sm text-muted-foreground">{t('pm.completedOnTime')}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-red-500" />
              <p className="text-2xl font-bold text-red-600">{analyticsData.totalOverdue}</p>
              <p className="text-sm text-muted-foreground">{t('pm.missedDeadlines')}</p>
            </div>
          </div>
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t('pm.overallCompliance')}</span>
              <span className="text-sm font-medium">{analyticsData.complianceRate}%</span>
            </div>
            <div className="h-4 w-full rounded-full bg-gray-200">
              <div
                className="h-4 rounded-full bg-gradient-to-r from-green-500 to-green-600"
                style={{ width: `${analyticsData.complianceRate}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('pm.complianceTarget')}: 90%
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
