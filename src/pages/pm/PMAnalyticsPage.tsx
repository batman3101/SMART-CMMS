import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
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
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { pmApi, equipmentApi } from '@/lib/api'
import type { EquipmentType } from '@/types'

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

  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState('')
  const [analyticsData, setAnalyticsData] = useState<PMAnalyticsData | null>(null)
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, equipmentTypeFilter, equipmentTypes])

  const fetchData = async () => {
    const { data } = await equipmentApi.getEquipmentTypes()
    if (data) setEquipmentTypes(data)
  }

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      // Fetch compliance stats and dashboard stats
      const [complianceRes, dashboardRes] = await Promise.all([
        pmApi.getComplianceStats(),
        pmApi.getDashboardStats(),
      ])

      // Generate mock analytics data
      const now = new Date()
      const months = []
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthName = date.toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : 'vi-VN', {
          month: 'short',
        })
        months.push({
          month: monthName,
          completed: Math.floor(Math.random() * 30) + 20,
          scheduled: Math.floor(Math.random() * 10) + 30,
          compliance: Math.floor(Math.random() * 20) + 75,
        })
      }

      const byEquipmentType = equipmentTypes.slice(0, 5).map((type) => ({
        name: type.name,
        completed: Math.floor(Math.random() * 20) + 10,
        overdue: Math.floor(Math.random() * 5),
      }))

      const byTechnician = [
        { name: 'Nguyễn Văn A', completed: 25, avgRating: 4.5 },
        { name: 'Trần Thị B', completed: 22, avgRating: 4.8 },
        { name: 'Lê Văn C', completed: 18, avgRating: 4.2 },
        { name: 'Phạm Thị D', completed: 15, avgRating: 4.6 },
        { name: 'Hoàng Văn E', completed: 12, avgRating: 4.3 },
      ]

      const statusDistribution = [
        { name: t('pm.statusCompleted'), value: dashboardRes.data?.completed_this_month || 45, color: '#10B981' },
        { name: t('pm.statusScheduled'), value: 15, color: '#3B82F6' },
        { name: t('pm.statusInProgress'), value: 5, color: '#F59E0B' },
        { name: t('pm.statusOverdue'), value: dashboardRes.data?.overdue_count || 3, color: '#EF4444' },
      ]

      // Calculate overall compliance from the array
      const overallCompliance = complianceRes.data && complianceRes.data.length > 0
        ? Math.round(complianceRes.data.reduce((sum, stat) => sum + stat.compliance_rate, 0) / complianceRes.data.length)
        : 85

      setAnalyticsData({
        complianceRate: overallCompliance,
        complianceChange: 2.5,
        totalScheduled: dashboardRes.data?.total_scheduled || 68,
        totalCompleted: dashboardRes.data?.completed_this_month || 45,
        totalOverdue: dashboardRes.data?.overdue_count || 3,
        avgCompletionTime: 45,
        monthlyTrend: months,
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('pm.analytics')}</h1>
        <div className="flex gap-2">
          <Select
            className="w-[150px]"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="week">{t('analytics.thisWeek')}</option>
            <option value="month">{t('analytics.thisMonth')}</option>
            <option value="quarter">{t('analytics.thisQuarter')}</option>
            <option value="year">{t('analytics.thisYear')}</option>
          </Select>
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
                <p className="text-sm text-muted-foreground">{t('pm.completedThisMonth')}</p>
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
            <CardTitle className="text-lg">{t('pm.monthlyTrend')}</CardTitle>
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
            <CardTitle className="text-lg">{t('pm.statusDistribution')}</CardTitle>
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
            <CardTitle className="text-lg">{t('pm.byEquipmentType')}</CardTitle>
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
                />
                <Bar
                  dataKey="overdue"
                  name={t('pm.statusOverdue')}
                  fill="#EF4444"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Technician Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('pm.technicianPerformance')}</CardTitle>
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
          <CardTitle className="text-lg">{t('pm.complianceSummary')}</CardTitle>
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
