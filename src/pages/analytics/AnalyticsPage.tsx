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
import { mockStatisticsApi, mockEquipmentApi } from '@/mock/api'
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
        mockStatisticsApi.getFilteredKPIs(filter),
        mockStatisticsApi.getFilteredEquipmentFailureRank(filter, 10),
        mockStatisticsApi.getFilteredRepairTypeDistribution(filter),
        mockStatisticsApi.getFilteredMonthlyRepairTrend(filter),
        mockStatisticsApi.getFilteredTechnicianPerformance(filter),
        mockStatisticsApi.getFilteredBuildingFailureStats(filter),
        mockEquipmentApi.getEquipmentTypes(),
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('analytics.title')}</h1>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-muted-foreground">
                {t('report.startDate')}
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[150px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-muted-foreground">
                {t('report.endDate')}
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[150px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-muted-foreground">
                {t('equipment.building')}
              </label>
              <Select
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                className="w-[150px]"
              >
                <option value="">{t('equipment.buildingAll')}</option>
                <option value="A동">A동</option>
                <option value="B동">B동</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-muted-foreground">
                {t('equipment.equipmentType')}
              </label>
              <Select
                value={equipmentTypeId}
                onChange={(e) => setEquipmentTypeId(e.target.value)}
                className="w-[180px]"
              >
                <option value="">{t('common.all')}</option>
                {equipmentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="outline" onClick={handleResetFilters}>
              <Filter className="mr-2 h-4 w-4" />
              {t('common.reset')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <Wrench className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('analytics.totalRepairs')}</p>
                <p className="text-2xl font-bold text-purple-600">
                  {kpis?.totalRepairs || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('analytics.mttr')}</p>
                <p className="text-2xl font-bold text-yellow-600">{kpis?.mttr || 0}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('analytics.availabilityRate')}</p>
                <p className="text-2xl font-bold text-green-600">{kpis?.availability || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('analytics.emergencyRatio')}</p>
                <p className="text-2xl font-bold text-red-600">{kpis?.emergencyRatio || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('analytics.mtbf')}</p>
                <p className="text-2xl font-bold text-blue-600">{kpis?.mtbf || 0}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Failure by Equipment */}
        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.failureByEquipment')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={failureRank} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="equipment_code" type="category" width={80} fontSize={12} />
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
          <CardHeader>
            <CardTitle>{t('analytics.repairTypeDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.monthlyTrend')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend.map(item => ({
                ...item,
                month: getMonthLabel(item.monthIndex)
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Building Failure Stats */}
        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.buildingFailureStats')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={buildingStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="building" />
                <YAxis />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'failure_count'
                      ? `${value} ${t('analytics.failures')}`
                      : `${Math.round(value / 60)}h`,
                    name === 'failure_count' ? t('analytics.failureCount') : t('analytics.totalDowntime'),
                  ]}
                />
                <Bar
                  dataKey="failure_count"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                  name="failure_count"
                />
                <Bar
                  dataKey="total_downtime_minutes"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                  name="total_downtime_minutes"
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 flex justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-sm text-muted-foreground">{t('analytics.failureCount')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <span className="text-sm text-muted-foreground">{t('analytics.downtime')} ({t('analytics.minutes')})</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Technician Performance */}
      <Card>
        <CardHeader>
          <CardTitle>{t('analytics.technicianPerformance')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
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
