import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Server,
  PlayCircle,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Plus,
  RefreshCw,
  Loader2,
  Calendar,
  ChevronDown,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { mockStatisticsApi, mockMaintenanceApi } from '@/mock/api'
import type {
  DashboardStats,
  EquipmentFailureRank,
  RepairTypeDistribution,
  TechnicianPerformance,
  MaintenanceRecord,
} from '@/types'

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statusDistribution, setStatusDistribution] = useState<
    { status: string; value: number; color: string }[]
  >([])
  const [repairTypeData, setRepairTypeData] = useState<RepairTypeDistribution[]>([])
  const [weeklyTrend, setWeeklyTrend] = useState<{ dayIndex: number; count: number }[]>([])
  const [failureRank, setFailureRank] = useState<EquipmentFailureRank[]>([])
  const [techPerformance, setTechPerformance] = useState<TechnicianPerformance[]>([])
  const [inProgressRecords, setInProgressRecords] = useState<MaintenanceRecord[]>([])
  const [kpis, setKpis] = useState<{ mtbf: number; mttr: number; availability: number } | null>(
    null
  )

  // Status translation helper
  const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      normal: t('equipment.statusNormal'),
      pm: t('equipment.statusPM'),
      repair: t('equipment.statusRepair'),
      emergency: t('equipment.statusEmergency'),
      standby: t('equipment.statusStandby'),
    }
    return statusMap[status] || status
  }

  // Weekday translation helper
  const getDayLabel = (dayIndex: number): string => {
    const dayKeys = [
      'common.weekdaySun',
      'common.weekdayMon',
      'common.weekdayTue',
      'common.weekdayWed',
      'common.weekdayThu',
      'common.weekdayFri',
      'common.weekdaySat',
    ]
    return t(dayKeys[dayIndex])
  }

  // Repair type translation helper
  const getRepairTypeLabel = (code: string): string => {
    const codeMap: Record<string, string> = {
      PM: t('maintenance.typePM'),
      BR: t('maintenance.typeBR'),
      PD: t('maintenance.typePD'),
      QA: t('maintenance.typeQA'),
      EM: t('maintenance.typeEM'),
    }
    return codeMap[code] || code
  }

  // 수리 유형별 현황 기간 필터
  type DateFilterType = 'today' | '7days' | '30days' | 'custom'
  const [repairDateFilter, setRepairDateFilter] = useState<DateFilterType>('7days')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showDateFilterDropdown, setShowDateFilterDropdown] = useState(false)

  // 기간 필터 라벨
  const getDateFilterLabel = (filter: DateFilterType) => {
    switch (filter) {
      case 'today':
        return t('dashboard.today')
      case '7days':
        return t('dashboard.last7Days')
      case '30days':
        return t('dashboard.last30Days')
      case 'custom':
        return customStartDate && customEndDate
          ? `${customStartDate} ~ ${customEndDate}`
          : t('dashboard.customPeriod')
    }
  }

  // 기간 필터 변경 핸들러
  const handleDateFilterChange = (filter: DateFilterType) => {
    setRepairDateFilter(filter)
    if (filter !== 'custom') {
      setShowDateFilterDropdown(false)
      // 필터 변경 시 데이터 다시 로드
      fetchRepairTypeData(filter)
    }
  }

  // 커스텀 기간 적용
  const applyCustomDateRange = () => {
    if (customStartDate && customEndDate) {
      setShowDateFilterDropdown(false)
      fetchRepairTypeData('custom', customStartDate, customEndDate)
    }
  }

  // 수리 유형별 데이터 로드 (기간 필터 적용)
  const fetchRepairTypeData = async (
    filter: DateFilterType,
    startDate?: string,
    endDate?: string
  ) => {
    try {
      const { data } = await mockStatisticsApi.getRepairTypeDistribution(filter, startDate, endDate)
      if (data) setRepairTypeData(data)
    } catch (error) {
      console.error('Failed to fetch repair type data:', error)
    }
  }

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // 모든 데이터를 병렬로 가져오기
      const [
        statsRes,
        statusRes,
        repairTypeRes,
        weeklyRes,
        failureRes,
        techRes,
        inProgressRes,
        kpisRes,
      ] = await Promise.all([
        mockStatisticsApi.getDashboardStats(),
        mockStatisticsApi.getEquipmentStatusDistribution(),
        mockStatisticsApi.getRepairTypeDistribution('7days'),
        mockStatisticsApi.getWeeklyRepairTrend(),
        mockStatisticsApi.getEquipmentFailureRank(5),
        mockStatisticsApi.getTechnicianPerformance(),
        mockMaintenanceApi.getInProgressRecords(),
        mockStatisticsApi.getKPIs(),
      ])

      if (statsRes.data) setStats(statsRes.data)
      if (statusRes.data) setStatusDistribution(statusRes.data)
      if (repairTypeRes.data) setRepairTypeData(repairTypeRes.data)
      if (weeklyRes.data) setWeeklyTrend(weeklyRes.data)
      if (failureRes.data) setFailureRank(failureRes.data)
      if (techRes.data) setTechPerformance(techRes.data)
      if (inProgressRes.data) setInProgressRecords(inProgressRes.data)
      if (kpisRes.data) setKpis(kpisRes.data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchDashboardData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
          <Button onClick={() => navigate('/maintenance')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard.startRepair')}
          </Button>
          <Button variant="destructive" onClick={() => navigate('/maintenance?type=EM')}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            {t('dashboard.emergencyRepair')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Server className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.totalEquipment')}</p>
              <p className="text-2xl font-bold">{stats?.total_equipment || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <PlayCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.runningEquipment')}</p>
              <p className="text-2xl font-bold">{stats?.running_equipment || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <Wrench className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.repairEquipment')}</p>
              <p className="text-2xl font-bold">{stats?.repair_equipment || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.emergencyAlert')}</p>
              <p className="text-2xl font-bold text-red-600">{stats?.emergency_count || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{t('analytics.mtbf')}</p>
              <p className="text-3xl font-bold text-blue-600">{kpis.mtbf.toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">Mean Time Between Failures</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{t('analytics.mttr')}</p>
              <p className="text-3xl font-bold text-yellow-600">{kpis.mttr.toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">Mean Time To Repair</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{t('analytics.availabilityRate')}</p>
              <p className="text-3xl font-bold text-green-600">{kpis.availability.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Equipment Availability Rate</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Equipment Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.equipmentStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution.map(item => ({
                    ...item,
                    name: getStatusLabel(item.status)
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Repair Type Bar Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('dashboard.repairByType')}</CardTitle>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDateFilterDropdown(!showDateFilterDropdown)}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                {getDateFilterLabel(repairDateFilter)}
                <ChevronDown className="h-4 w-4" />
              </Button>
              {showDateFilterDropdown && (
                <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-md border bg-popover p-2 shadow-lg">
                  <div className="space-y-1">
                    <button
                      className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-muted ${
                        repairDateFilter === 'today' ? 'bg-muted font-medium' : ''
                      }`}
                      onClick={() => handleDateFilterChange('today')}
                    >
                      {t('dashboard.today')}
                    </button>
                    <button
                      className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-muted ${
                        repairDateFilter === '7days' ? 'bg-muted font-medium' : ''
                      }`}
                      onClick={() => handleDateFilterChange('7days')}
                    >
                      {t('dashboard.last7Days')}
                    </button>
                    <button
                      className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-muted ${
                        repairDateFilter === '30days' ? 'bg-muted font-medium' : ''
                      }`}
                      onClick={() => handleDateFilterChange('30days')}
                    >
                      {t('dashboard.last30Days')}
                    </button>
                    <div className="border-t pt-2">
                      <p className="mb-2 px-3 text-xs font-medium text-muted-foreground">
                        {t('dashboard.customPeriod')}
                      </p>
                      <div className="space-y-2 px-3">
                        <Input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="h-8 text-sm"
                        />
                        <Input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="h-8 text-sm"
                        />
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={applyCustomDateRange}
                          disabled={!customStartDate || !customEndDate}
                        >
                          {t('dashboard.apply')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={repairTypeData.map(item => ({
                ...item,
                name: getRepairTypeLabel(item.code)
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  interval={0}
                  tick={{ fontSize: 11 }}
                  tickMargin={5}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Trend and Recent Repairs */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Weekly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.repairTrend')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weeklyTrend.map(item => ({
                ...item,
                day: getDayLabel(item.dayIndex)
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 현재 진행 중인 수리 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('dashboard.recentRepairs')}</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/maintenance/history')}>
              {t('dashboard.viewAll')}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inProgressRecords.slice(0, 5).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{record.equipment?.equipment_code}</p>
                    <p className="text-sm text-muted-foreground">
                      {record.repair_type?.code ? getRepairTypeLabel(record.repair_type.code) : ''} - {record.technician?.name}
                    </p>
                  </div>
                  <Badge
                    variant={record.status === 'completed' ? 'success' : 'warning'}
                    className="flex items-center gap-1"
                  >
                    {record.status === 'completed' ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <Wrench className="h-3 w-3" />
                    )}
                    {record.status === 'completed'
                      ? t('maintenance.statusCompleted')
                      : t('maintenance.statusInProgress')}
                  </Badge>
                </div>
              ))}
              {inProgressRecords.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {t('dashboard.noInProgressRepairs')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Technician Performance & Equipment Failure Rank */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Technician Performance */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.technicianPerformance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3">{t('analytics.technician')}</th>
                    <th className="pb-3 text-center">{t('analytics.completedCount')}</th>
                    <th className="pb-3 text-center">{t('analytics.avgRepairTime')}</th>
                    <th className="pb-3 text-center">{t('analytics.avgRating')}</th>
                  </tr>
                </thead>
                <tbody>
                  {techPerformance.slice(0, 5).map((tech) => (
                    <tr key={tech.technician_id} className="border-b">
                      <td className="py-3">
                        <p className="font-medium">{tech.technician_name}</p>
                      </td>
                      <td className="py-3 text-center">{tech.completed_count}{t('analytics.cases')}</td>
                      <td className="py-3 text-center">{tech.avg_repair_time.toFixed(0)}{t('analytics.minutes')}</td>
                      <td className="py-3 text-center">
                        <span className="text-yellow-500">★</span> {tech.avg_rating.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Equipment Failure Rank */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.failureTopEquipment')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {failureRank.map((item, index) => (
                <div key={item.equipment_code} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        index < 3 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium">{item.equipment_code}</p>
                      <p className="text-xs text-muted-foreground">{item.equipment_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">{item.failure_count}{t('dashboard.times')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('dashboard.totalMinutes', { minutes: item.total_downtime_minutes })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
