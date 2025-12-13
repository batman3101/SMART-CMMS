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
import { statisticsApi, maintenanceApi } from '@/lib/api'
import type {
  DashboardStats,
  EquipmentFailureRank,
  RepairTypeDistribution,
  TechnicianPerformance,
  MaintenanceRecord,
} from '@/types'

export default function DashboardPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  // Multilingual helper for equipment failure rank
  const getEquipmentNameFromRank = (item: EquipmentFailureRank) => {
    if (i18n.language === 'vi') return (item as unknown as { equipment_name_vi?: string }).equipment_name_vi || item.equipment_name
    return (item as unknown as { equipment_name_ko?: string }).equipment_name_ko || item.equipment_name
  }

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
      const { data } = await statisticsApi.getRepairTypeDistribution(filter, startDate, endDate)
      if (data) setRepairTypeData(data)
    } catch (error) {
      console.error('Failed to fetch repair type data:', error)
    }
  }

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // 1단계: 핵심 데이터 먼저 로드 (stats, inProgress, kpis)
      const [statsRes, inProgressRes, kpisRes] = await Promise.all([
        statisticsApi.getDashboardStats(),
        maintenanceApi.getInProgressRecords(),
        statisticsApi.getKPIs(),
      ])

      if (statsRes.data) setStats(statsRes.data)
      if (inProgressRes.data) setInProgressRecords(inProgressRes.data)
      if (kpisRes.data) setKpis(kpisRes.data)

      // 핵심 데이터 로드 후 로딩 해제 (UI 빠르게 표시)
      setLoading(false)

      // 2단계: 차트 및 보조 데이터 백그라운드 로드
      const [statusRes, repairTypeRes, weeklyRes, failureRes, techRes] = await Promise.all([
        statisticsApi.getEquipmentStatusDistribution(),
        statisticsApi.getRepairTypeDistribution('7days'),
        statisticsApi.getWeeklyRepairTrend(),
        statisticsApi.getEquipmentFailureRank(5),
        statisticsApi.getTechnicianPerformance(),
      ])

      if (statusRes.data) setStatusDistribution(statusRes.data)
      if (repairTypeRes.data) setRepairTypeData(repairTypeRes.data)
      if (weeklyRes.data) setWeeklyTrend(weeklyRes.data)
      if (failureRes.data) setFailureRank(failureRes.data)
      if (techRes.data) setTechPerformance(techRes.data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
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
    <div className="space-y-4 md:space-y-6">
      {/* 헤더: 모바일에서 세로 스택 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl md:text-2xl font-bold">{t('dashboard.title')}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={fetchDashboardData}>
            <RefreshCw className="mr-1 md:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </Button>
          <Button size="sm" onClick={() => navigate('/maintenance')}>
            <Plus className="mr-1 md:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('dashboard.startRepair')}</span>
            <span className="sm:hidden">{t('dashboard.repair')}</span>
          </Button>
          <Button variant="destructive" size="sm" onClick={() => navigate('/maintenance?type=EM')}>
            <AlertTriangle className="mr-1 md:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('dashboard.emergencyRepair')}</span>
            <span className="sm:hidden">{t('dashboard.emergency')}</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards - 모바일: 2열, 태블릿: 2열, 데스크톱: 4열 */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-2 p-3 sm:gap-4 sm:p-6">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
              <Server className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{t('dashboard.totalEquipment')}</p>
              <p className="text-xl sm:text-2xl font-bold">{stats?.total_equipment || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-2 p-3 sm:gap-4 sm:p-6">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
              <PlayCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{t('dashboard.runningEquipment')}</p>
              <p className="text-xl sm:text-2xl font-bold">{stats?.running_equipment || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-2 p-3 sm:gap-4 sm:p-6">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100">
              <Wrench className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{t('dashboard.repairEquipment')}</p>
              <p className="text-xl sm:text-2xl font-bold">{stats?.repair_equipment || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-2 p-3 sm:gap-4 sm:p-6">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{t('dashboard.emergencyAlert')}</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600">{stats?.emergency_count || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards - 모바일: 1열, 태블릿: 3열 */}
      {kpis && (
        <div className="grid gap-3 grid-cols-3 md:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-6">
              <p className="text-xs sm:text-sm text-muted-foreground">{t('analytics.mtbf')}</p>
              <p className="text-xl sm:text-3xl font-bold text-blue-600">{kpis.mtbf.toFixed(1)}h</p>
              <p className="hidden sm:block text-xs text-muted-foreground">Mean Time Between Failures</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-6">
              <p className="text-xs sm:text-sm text-muted-foreground">{t('analytics.mttr')}</p>
              <p className="text-xl sm:text-3xl font-bold text-yellow-600">{kpis.mttr.toFixed(1)}h</p>
              <p className="hidden sm:block text-xs text-muted-foreground">Mean Time To Repair</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-6">
              <p className="text-xs sm:text-sm text-muted-foreground">{t('analytics.availabilityRate')}</p>
              <p className="text-xl sm:text-3xl font-bold text-green-600">{kpis.availability.toFixed(1)}%</p>
              <p className="hidden sm:block text-xs text-muted-foreground">Equipment Availability Rate</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row - 모바일: 1열, 데스크톱: 2열 */}
      <div className="grid gap-3 md:gap-4 md:grid-cols-2">
        {/* Equipment Status Pie Chart */}
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2">
            <CardTitle className="text-base sm:text-lg">{t('dashboard.equipmentStatus')}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <ResponsiveContainer width="100%" height={220} className="sm:!h-[300px]">
              <PieChart>
                <Pie
                  data={statusDistribution.map(item => ({
                    ...item,
                    name: getStatusLabel(item.status)
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={{ strokeWidth: 1 }}
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
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 pb-2 sm:pb-2">
            <CardTitle className="text-base sm:text-lg">{t('dashboard.repairByType')}</CardTitle>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDateFilterDropdown(!showDateFilterDropdown)}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-8"
              >
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="truncate max-w-[120px] sm:max-w-none">{getDateFilterLabel(repairDateFilter)}</span>
                <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              {showDateFilterDropdown && (
                <div className="absolute right-0 top-full z-50 mt-1 w-56 sm:w-64 rounded-md border bg-popover p-2 shadow-lg">
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
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <ResponsiveContainer width="100%" height={220} className="sm:!h-[300px]">
              <BarChart data={repairTypeData.map(item => ({
                ...item,
                name: getRepairTypeLabel(item.code)
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  interval={0}
                  tick={{ fontSize: 10 }}
                  tickMargin={5}
                />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Trend and Recent Repairs - 모바일: 1열, 데스크톱: 2열 */}
      <div className="grid gap-3 md:gap-4 md:grid-cols-2">
        {/* Weekly Trend */}
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2">
            <CardTitle className="text-base sm:text-lg">{t('dashboard.repairTrend')}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <ResponsiveContainer width="100%" height={200} className="sm:!h-[250px]">
              <LineChart data={weeklyTrend.map(item => ({
                ...item,
                day: getDayLabel(item.dayIndex)
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
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
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 pb-2 sm:pb-2">
            <CardTitle className="text-base sm:text-lg">{t('dashboard.recentRepairs')}</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/maintenance/history')} className="w-fit">
              {t('dashboard.viewAll')}
            </Button>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="space-y-2 sm:space-y-3">
              {inProgressRecords.slice(0, 5).map((record) => (
                <div
                  key={record.id}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border p-2 sm:p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">{record.equipment?.equipment_code}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {record.repair_type?.code ? getRepairTypeLabel(record.repair_type.code) : ''} - {record.technician?.name}
                    </p>
                  </div>
                  <Badge
                    variant={record.status === 'completed' ? 'success' : 'warning'}
                    className="flex items-center gap-1 w-fit text-xs"
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

      {/* Technician Performance & Equipment Failure Rank - 모바일: 1열 */}
      <div className="grid gap-3 md:gap-4 md:grid-cols-2">
        {/* Technician Performance */}
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2">
            <CardTitle className="text-base sm:text-lg">{t('dashboard.technicianPerformance')}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[400px] sm:min-w-0">
                <thead>
                  <tr className="border-b text-left text-xs sm:text-sm text-muted-foreground">
                    <th className="pb-2 sm:pb-3 pl-4 sm:pl-0">{t('analytics.technician')}</th>
                    <th className="pb-2 sm:pb-3 text-center">{t('analytics.completedCount')}</th>
                    <th className="pb-2 sm:pb-3 text-center">{t('analytics.avgRepairTime')}</th>
                    <th className="pb-2 sm:pb-3 text-center pr-4 sm:pr-0">{t('analytics.avgRating')}</th>
                  </tr>
                </thead>
                <tbody>
                  {techPerformance.slice(0, 5).map((tech) => (
                    <tr key={tech.technician_id} className="border-b">
                      <td className="py-2 sm:py-3 pl-4 sm:pl-0">
                        <p className="font-medium text-xs sm:text-sm">{tech.technician_name}</p>
                      </td>
                      <td className="py-2 sm:py-3 text-center text-xs sm:text-sm">{tech.completed_count}{t('analytics.cases')}</td>
                      <td className="py-2 sm:py-3 text-center text-xs sm:text-sm">{tech.avg_repair_time.toFixed(0)}{t('analytics.minutes')}</td>
                      <td className="py-2 sm:py-3 text-center text-xs sm:text-sm pr-4 sm:pr-0">
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
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2">
            <CardTitle className="text-base sm:text-lg">{t('dashboard.failureTopEquipment')}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="space-y-2 sm:space-y-3">
              {failureRank.map((item, index) => (
                <div key={item.equipment_code} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <span
                      className={`flex h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        index < 3 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{item.equipment_code}</p>
                      <p className="text-xs text-muted-foreground truncate">{getEquipmentNameFromRank(item)}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-red-600 text-sm sm:text-base">{item.failure_count}{t('dashboard.times')}</p>
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
