import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SortableTableHead } from '@/components/ui/sortable-table-head'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import {
  Loader2,
  TrendingUp,
  Clock,
  Activity,
  Wrench,
  AlertTriangle,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { equipmentApi, statisticsApi } from '@/lib/api'
import { useTableSort } from '@/hooks'
import type {
  EquipmentFailureRank,
  RepairTypeDistribution,
  TechnicianPerformance,
  EquipmentType,
} from '@/types'

interface BuildingFailureStat {
  building: string
  failure_count: number
  total_downtime_minutes: number
}

interface FilteredKPIs {
  mtbf: number
  mttr: number
  availability: number
  emergencyRatio: number
  totalRepairs: number
}

export default function AnalyticsPage() {
  const { t } = useTranslation()

  const [isLoading, setIsLoading] = useState(true)
  const [kpis, setKpis] = useState<FilteredKPIs | null>(null)
  const [failureRank, setFailureRank] = useState<EquipmentFailureRank[]>([])
  const [repairTypes, setRepairTypes] = useState<RepairTypeDistribution[]>([])
  const [monthlyTrend, setMonthlyTrend] = useState<{ monthIndex: number; count: number }[]>([])
  const [techPerformance, setTechPerformance] = useState<TechnicianPerformance[]>([])
  const [buildingStats, setBuildingStats] = useState<BuildingFailureStat[]>([])
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])

  // Filter states
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [building, setBuilding] = useState('')
  const [equipmentTypeId, setEquipmentTypeId] = useState('')

  // Set default date range (last 30 days)
  useEffect(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    setEndDate(end.toISOString().split('T')[0])
    setStartDate(start.toISOString().split('T')[0])
  }, [])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const filter = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        building: building || undefined,
        equipmentTypeId: equipmentTypeId || undefined,
      }

      const [
        kpisRes,
        failureRes,
        repairTypesRes,
        monthlyRes,
        techRes,
        buildingRes,
        typesRes,
      ] = await Promise.all([
        statisticsApi.getFilteredKPIs(filter),
        statisticsApi.getFilteredEquipmentFailureRank(filter, 10),
        statisticsApi.getFilteredRepairTypeDistribution(filter),
        statisticsApi.getFilteredMonthlyRepairTrend(filter),
        statisticsApi.getFilteredTechnicianPerformance(filter),
        statisticsApi.getFilteredBuildingFailureStats(filter),
        equipmentApi.getEquipmentTypes(),
      ])

      if (kpisRes.data) setKpis(kpisRes.data)
      if (failureRes.data) setFailureRank(failureRes.data)
      if (repairTypesRes.data) setRepairTypes(repairTypesRes.data)
      if (monthlyRes.data) setMonthlyTrend(monthlyRes.data)
      if (techRes.data) setTechPerformance(techRes.data)
      if (buildingRes.data) setBuildingStats(buildingRes.data)
      if (typesRes.data) setEquipmentTypes(typesRes.data)
    } catch (error) {
      console.error('Failed to fetch analytics data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [startDate, endDate, building, equipmentTypeId])

  useEffect(() => {
    if (startDate && endDate) {
      fetchData()
    }
  }, [fetchData, startDate, endDate])

  const handleResetFilters = () => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    setEndDate(end.toISOString().split('T')[0])
    setStartDate(start.toISOString().split('T')[0])
    setBuilding('')
    setEquipmentTypeId('')
  }

  // Month label helper
  const getMonthLabel = (monthIndex: number): string => {
    return `${monthIndex}${t('common.month')}`
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

  const repairTypeColors: Record<string, string> = {
    PM: '#3B82F6',
    BR: '#F59E0B',
    PD: '#10B981',
    QA: '#8B5CF6',
    EM: '#EF4444',
  }

  const pieData = repairTypes.map((rt) => ({
    name: getRepairTypeLabel(rt.code),
    value: rt.count,
    color: repairTypeColors[rt.code] || '#6B7280',
  }))

  // Sorting for technician performance table
  const filteredTechPerformance = techPerformance.filter((tech) => tech.completed_count > 0)
  const { sortedData: sortedTechPerformance, requestSort, getSortDirection } = useTableSort<TechnicianPerformance>(
    filteredTechPerformance,
    { key: 'completed_count', direction: 'desc' }
  )

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">{t('analytics.title')}</h1>
        <Button variant="outline" onClick={fetchData} size="sm" className="h-9 px-3">
          <RefreshCw className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{t('common.refresh')}</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-6">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-end gap-3 sm:gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                {t('report.startDate')}
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-[150px] h-9 sm:h-10 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                {t('report.endDate')}
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-[150px] h-9 sm:h-10 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                {t('equipment.building')}
              </label>
              <Select
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                className="w-full sm:w-[150px] h-9 sm:h-10 text-sm"
              >
                <option value="">{t('equipment.buildingAll')}</option>
                <option value="A동">A동</option>
                <option value="B동">B동</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                {t('equipment.equipmentType')}
              </label>
              <Select
                value={equipmentTypeId}
                onChange={(e) => setEquipmentTypeId(e.target.value)}
                className="w-full sm:w-[180px] h-9 sm:h-10 text-sm"
              >
                <option value="">{t('common.all')}</option>
                {equipmentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="outline" onClick={handleResetFilters} size="sm" className="h-9 sm:h-10 col-span-2 sm:col-span-1">
              <Filter className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t('common.reset')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-purple-100">
                <Wrench className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">{t('analytics.totalRepairs')}</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600">
                  {kpis?.totalRepairs || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-yellow-100">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">{t('analytics.mttr')}</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600">{kpis?.mttr || 0}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-green-100">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">{t('analytics.availabilityRate')}</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{kpis?.availability || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">{t('analytics.emergencyRatio')}</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">{kpis?.emergencyRatio || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-blue-100">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">{t('analytics.mtbf')}</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{kpis?.mtbf || 0}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        {/* Failure by Equipment */}
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2">
            <CardTitle className="text-sm sm:text-base">{t('analytics.failureByEquipment')}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={failureRank} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="equipment_code" type="category" width={60} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'failure_count'
                      ? `${value} ${t('analytics.failures')}`
                      : `${value} ${t('analytics.minutes')}`,
                    name === 'failure_count'
                      ? t('analytics.failureCount')
                      : t('analytics.downtime'),
                  ]}
                />
                <Bar
                  dataKey="failure_count"
                  fill="#EF4444"
                  radius={[0, 4, 4, 0]}
                  name="failure_count"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Repair Type Distribution */}
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2">
            <CardTitle className="text-sm sm:text-base">{t('analytics.repairTypeDistribution')}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ strokeWidth: 1 }}
                  fontSize={10}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        {/* Monthly Trend */}
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2">
            <CardTitle className="text-sm sm:text-base">{t('analytics.monthlyTrend')}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyTrend.map(item => ({
                ...item,
                month: getMonthLabel(item.monthIndex)
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Building Failure Stats */}
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2">
            <CardTitle className="text-sm sm:text-base">{t('analytics.buildingFailureStats')}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={buildingStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="building" tick={{ fontSize: 10 }} />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  tick={{ fontSize: 10 }}
                  stroke="#3B82F6"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  stroke="#F59E0B"
                  tickFormatter={(value) => `${Math.round(value / 60)}h`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'failure_count'
                      ? `${value} ${t('analytics.failures')}`
                      : `${Math.round(value / 60)}h`,
                    name === 'failure_count' ? t('analytics.failureCount') : t('analytics.totalDowntime'),
                  ]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="failure_count"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                  name="failure_count"
                />
                <Bar
                  yAxisId="right"
                  dataKey="total_downtime_minutes"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                  name="total_downtime_minutes"
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 sm:mt-4 flex flex-wrap justify-center gap-3 sm:gap-6">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-blue-500" />
                <span className="text-xs sm:text-sm text-muted-foreground">{t('analytics.failureCount')}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-yellow-500" />
                <span className="text-xs sm:text-sm text-muted-foreground">{t('analytics.downtime')} ({t('analytics.hours')})</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Technician Performance */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-sm sm:text-base">{t('analytics.technicianPerformance')}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {/* 모바일 카드 뷰 */}
          <div className="md:hidden space-y-3">
            {sortedTechPerformance.map((tech) => (
              <Card key={tech.technician_id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{tech.technician_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {tech.completed_count}{t('analytics.cases')}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span>{t('analytics.avgRepairTime')}: </span>
                      <span className="font-medium">{tech.avg_repair_time}{t('analytics.minutes')}</span>
                    </div>
                    <div>
                      <span className="text-yellow-500 text-sm">
                        {'★'.repeat(Math.round(tech.avg_rating / 2))}
                      </span>
                      <span className="text-gray-300 text-sm">
                        {'★'.repeat(5 - Math.round(tech.avg_rating / 2))}
                      </span>
                      <span className="ml-1">({tech.avg_rating})</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {sortedTechPerformance.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t('common.noData')}
              </div>
            )}
          </div>

          {/* 데스크톱 테이블 뷰 */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    sortKey="technician_name"
                    sortDirection={getSortDirection('technician_name')}
                    onSort={requestSort}
                  >
                    {t('analytics.technician')}
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="completed_count"
                    sortDirection={getSortDirection('completed_count')}
                    onSort={requestSort}
                    className="text-center"
                  >
                    {t('analytics.completedCount')}
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="avg_repair_time"
                    sortDirection={getSortDirection('avg_repair_time')}
                    onSort={requestSort}
                    className="text-center"
                  >
                    {t('analytics.avgRepairTime')}
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="avg_rating"
                    sortDirection={getSortDirection('avg_rating')}
                    onSort={requestSort}
                    className="text-center"
                  >
                    {t('analytics.avgRating')}
                  </SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTechPerformance.map((tech) => (
                  <TableRow key={tech.technician_id}>
                    <TableCell className="font-medium">{tech.technician_name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {tech.completed_count}
                        {t('analytics.cases')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {tech.avg_repair_time}
                      {t('analytics.minutes')}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-yellow-500">
                        {'★'.repeat(Math.round(tech.avg_rating / 2))}
                      </span>
                      <span className="text-gray-300">
                        {'★'.repeat(5 - Math.round(tech.avg_rating / 2))}
                      </span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        ({tech.avg_rating})
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {sortedTechPerformance.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      {t('common.noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
