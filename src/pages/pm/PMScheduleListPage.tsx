import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SortableTableHead } from '@/components/ui/sortable-table-head'
import {
  Search,
  RefreshCw,
  Plus,
  Play,
  Eye,
  Edit,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { mockPMApi } from '@/mock/api'
import { mockEquipmentTypes } from '@/mock/data'
import { mockTechnicians } from '@/mock/data/users'
import { useTableSort } from '@/hooks'
import type { PMSchedule, PMScheduleFilter, PMScheduleStatus, PMPriority } from '@/types'

const PAGE_SIZE = 15

export default function PMScheduleListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState<PMSchedule[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PMScheduleStatus | ''>(
    (searchParams.get('status') as PMScheduleStatus) || ''
  )
  const [priorityFilter, setPriorityFilter] = useState<PMPriority | ''>('')
  const [technicianFilter, setTechnicianFilter] = useState('')
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState('')

  const { sortedData, requestSort, getSortDirection } = useTableSort<PMSchedule>(
    schedules,
    { key: 'scheduled_date', direction: 'asc' }
  )

  useEffect(() => {
    fetchSchedules()
  }, [statusFilter, priorityFilter, technicianFilter, equipmentTypeFilter])

  const fetchSchedules = async () => {
    setLoading(true)
    try {
      const filter: PMScheduleFilter = {}
      if (statusFilter) filter.status = statusFilter
      if (priorityFilter) filter.priority = priorityFilter
      if (technicianFilter) filter.technician_id = technicianFilter
      if (equipmentTypeFilter) filter.equipment_type_id = equipmentTypeFilter

      const { data } = await mockPMApi.getSchedules(filter)
      if (data) setSchedules(data)
    } catch (error) {
      console.error('Failed to fetch schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSchedules = sortedData.filter((schedule) => {
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        schedule.equipment?.equipment_code.toLowerCase().includes(searchLower) ||
        schedule.equipment?.equipment_name.toLowerCase().includes(searchLower) ||
        schedule.template?.name.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const totalPages = Math.ceil(filteredSchedules.length / PAGE_SIZE)
  const paginatedSchedules = filteredSchedules.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  const getStatusBadge = (status: PMScheduleStatus) => {
    const variants: Record<PMScheduleStatus, string> = {
      scheduled: 'outline',
      in_progress: 'warning',
      completed: 'success',
      overdue: 'destructive',
      cancelled: 'secondary',
    }
    const labels: Record<PMScheduleStatus, string> = {
      scheduled: t('pm.statusScheduled'),
      in_progress: t('pm.statusInProgress'),
      completed: t('pm.statusCompleted'),
      overdue: t('pm.statusOverdue'),
      cancelled: t('pm.statusCancelled'),
    }
    return <Badge variant={variants[status] as 'default' | 'info' | 'success' | 'destructive' | 'secondary'}>{labels[status]}</Badge>
  }

  const getPriorityBadge = (priority: PMPriority) => {
    const variants: Record<PMPriority, string> = {
      high: 'destructive',
      medium: 'warning',
      low: 'secondary',
    }
    const labels: Record<PMPriority, string> = {
      high: t('pm.priorityHigh'),
      medium: t('pm.priorityMedium'),
      low: t('pm.priorityLow'),
    }
    return <Badge variant={variants[priority] as 'destructive' | 'warning' | 'secondary'}>{labels[priority]}</Badge>
  }

  const handleResetFilters = () => {
    setSearch('')
    setStatusFilter('')
    setPriorityFilter('')
    setTechnicianFilter('')
    setEquipmentTypeFilter('')
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('pm.schedules')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('pm.scheduleCount')}: {filteredSchedules.length}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchSchedules}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/pm/calendar')}>
            <Calendar className="mr-2 h-4 w-4" />
            {t('pm.calendarView')}
          </Button>
          <Button size="sm" onClick={() => navigate('/pm/schedules/new')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('pm.createSchedule')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[200px] flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('common.search')}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-9"
                />
              </div>
            </div>
            <Select
              className="w-[150px]"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as PMScheduleStatus | '')
                setCurrentPage(1)
              }}
            >
              <option value="">{t('pm.filterByStatus')}</option>
              <option value="scheduled">{t('pm.statusScheduled')}</option>
              <option value="in_progress">{t('pm.statusInProgress')}</option>
              <option value="completed">{t('pm.statusCompleted')}</option>
              <option value="overdue">{t('pm.statusOverdue')}</option>
              <option value="cancelled">{t('pm.statusCancelled')}</option>
            </Select>
            <Select
              className="w-[150px]"
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value as PMPriority | '')
                setCurrentPage(1)
              }}
            >
              <option value="">{t('pm.filterByPriority')}</option>
              <option value="high">{t('pm.priorityHigh')}</option>
              <option value="medium">{t('pm.priorityMedium')}</option>
              <option value="low">{t('pm.priorityLow')}</option>
            </Select>
            <Select
              className="w-[150px]"
              value={technicianFilter}
              onChange={(e) => {
                setTechnicianFilter(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">{t('pm.filterByTechnician')}</option>
              {mockTechnicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name}
                </option>
              ))}
            </Select>
            <Select
              className="w-[150px]"
              value={equipmentTypeFilter}
              onChange={(e) => {
                setEquipmentTypeFilter(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">{t('pm.filterByEquipmentType')}</option>
              {mockEquipmentTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </Select>
            <Button variant="outline" onClick={handleResetFilters}>
              <Filter className="mr-2 h-4 w-4" />
              {t('common.resetFilter')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      sortKey="scheduled_date"
                      sortDirection={getSortDirection('scheduled_date')}
                      onSort={requestSort}
                      className="w-[120px]"
                    >
                      {t('pm.scheduledDate')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="equipment.equipment_code"
                      sortDirection={getSortDirection('equipment.equipment_code')}
                      onSort={requestSort}
                      className="w-[120px]"
                    >
                      {t('equipment.equipmentCode')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="equipment.equipment_name"
                      sortDirection={getSortDirection('equipment.equipment_name')}
                      onSort={requestSort}
                    >
                      {t('equipment.equipmentName')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="template.name"
                      sortDirection={getSortDirection('template.name')}
                      onSort={requestSort}
                    >
                      {t('pm.template')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="assigned_technician.name"
                      sortDirection={getSortDirection('assigned_technician.name')}
                      onSort={requestSort}
                      className="w-[120px]"
                    >
                      {t('pm.assignedTechnician')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="priority"
                      sortDirection={getSortDirection('priority')}
                      onSort={requestSort}
                      className="w-[100px]"
                    >
                      {t('pm.priority')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="status"
                      sortDirection={getSortDirection('status')}
                      onSort={requestSort}
                      className="w-[100px]"
                    >
                      {t('equipment.status')}
                    </SortableTableHead>
                    <TableHead className="w-[120px] text-center">
                      {t('common.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSchedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">{schedule.scheduled_date}</TableCell>
                      <TableCell>{schedule.equipment?.equipment_code}</TableCell>
                      <TableCell>{schedule.equipment?.equipment_name}</TableCell>
                      <TableCell>{schedule.template?.name}</TableCell>
                      <TableCell>{schedule.assigned_technician?.name || '-'}</TableCell>
                      <TableCell>{getPriorityBadge(schedule.priority)}</TableCell>
                      <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="icon"
                            variant={schedule.status === 'scheduled' || schedule.status === 'overdue' ? 'default' : 'ghost'}
                            onClick={() => navigate(`/pm/execution?schedule=${schedule.id}`)}
                            title={t('pm.startPM')}
                            disabled={schedule.status === 'completed' || schedule.status === 'cancelled'}
                            className={schedule.status === 'in_progress' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => navigate(`/pm/schedules/${schedule.id}`)}
                            title={t('pm.viewDetail')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {schedule.status === 'scheduled' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => navigate(`/pm/schedules/${schedule.id}/edit`)}
                              title={t('pm.editSchedule')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedSchedules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        {t('common.noSearchResults')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t('common.previous')}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    {t('common.next')}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
