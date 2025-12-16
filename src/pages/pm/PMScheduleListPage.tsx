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
  Trash2,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { pmApi, equipmentApi, usersApi } from '@/lib/api'
import { useTableSort } from '@/hooks'
import type { PMSchedule, PMScheduleFilter, PMScheduleStatus, PMPriority, Equipment, EquipmentType, PMTemplate, User } from '@/types'

const PAGE_SIZE = 15

export default function PMScheduleListPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { addToast } = useToast()

  // Multilingual helpers
  const getEquipmentName = (eq: Equipment | undefined) => {
    if (!eq) return '-'
    if (i18n.language === 'vi') return eq.equipment_name_vi || eq.equipment_name
    return eq.equipment_name_ko || eq.equipment_name
  }

  const getEquipmentTypeName = (type: EquipmentType | undefined) => {
    if (!type) return '-'
    if (i18n.language === 'vi') return type.name_vi || type.name
    return type.name_ko || type.name
  }

  const getTemplateName = (template: PMTemplate | undefined) => {
    if (!template) return '-'
    if (i18n.language === 'vi') return template.name_vi || template.name
    return template.name_ko || template.name
  }
  const [searchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState<PMSchedule[]>([])
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])
  const [technicians, setTechnicians] = useState<User[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; schedule: PMSchedule | null }>({ open: false, schedule: null })

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
    // 초기 데이터 로드 (장비 유형, 기술자)
    const loadInitialData = async () => {
      const [typesRes, techRes] = await Promise.all([
        equipmentApi.getEquipmentTypes(),
        usersApi.getTechnicians(),
      ])
      if (typesRes.data) setEquipmentTypes(typesRes.data)
      if (techRes.data) setTechnicians(techRes.data)
    }
    loadInitialData()
  }, [])

  useEffect(() => {
    fetchSchedules()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter, technicianFilter, equipmentTypeFilter])

  const fetchSchedules = async () => {
    setLoading(true)
    try {
      const filter: PMScheduleFilter = {}
      if (statusFilter) filter.status = statusFilter
      if (priorityFilter) filter.priority = priorityFilter
      if (technicianFilter) filter.technician_id = technicianFilter
      if (equipmentTypeFilter) filter.equipment_type_id = equipmentTypeFilter

      const { data } = await pmApi.getSchedules(filter)
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
        getEquipmentName(schedule.equipment).toLowerCase().includes(searchLower) ||
        getTemplateName(schedule.template).toLowerCase().includes(searchLower)
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

  const handleDelete = async () => {
    if (!deleteConfirm.schedule) return

    const { success, error } = await pmApi.deleteSchedule(deleteConfirm.schedule.id)
    setDeleteConfirm({ open: false, schedule: null })

    if (success) {
      addToast({ type: 'success', title: t('pm.deleteSchedule'), message: t('common.success') })
      fetchSchedules()
    } else {
      addToast({ type: 'error', title: t('pm.deleteSchedule'), message: error || t('common.error') })
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{t('pm.schedules')}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t('pm.scheduleCount')}: {filteredSchedules.length}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchSchedules} className="h-9 px-3">
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/pm/calendar')} className="h-9 px-3">
            <Calendar className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('pm.calendarView')}</span>
          </Button>
          <Button size="sm" onClick={() => navigate('/pm/schedules/new')} className="h-9 px-3">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('pm.createSchedule')}</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-6">
          <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-4">
            {/* 검색 */}
            <div className="sm:min-w-[200px] sm:flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('common.search')}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>
            {/* 셀렉트 필터들 */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-4">
              <Select
                className="h-9 text-sm sm:w-[140px]"
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
                className="h-9 text-sm sm:w-[130px]"
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
                className="h-9 text-sm sm:w-[130px]"
                value={technicianFilter}
                onChange={(e) => {
                  setTechnicianFilter(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="">{t('pm.filterByTechnician')}</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name}
                  </option>
                ))}
              </Select>
              <Select
                className="h-9 text-sm sm:w-[130px]"
                value={equipmentTypeFilter}
                onChange={(e) => {
                  setEquipmentTypeFilter(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="">{t('pm.filterByEquipmentType')}</option>
                {equipmentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {getEquipmentTypeName(type)}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={handleResetFilters} className="h-9 w-full sm:w-auto">
              <Filter className="mr-2 h-4 w-4" />
              {t('common.resetFilter')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 모바일 카드 뷰 */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <Card>
            <CardContent className="flex h-40 items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : (
          <>
            {paginatedSchedules.map((schedule) => (
              <Card key={schedule.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{schedule.scheduled_date}</span>
                      {getStatusBadge(schedule.status)}
                      {getPriorityBadge(schedule.priority)}
                    </div>
                  </div>
                  <p className="font-medium text-sm mb-1">
                    {schedule.equipment?.equipment_code} - {getEquipmentName(schedule.equipment)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mb-2">
                    {getTemplateName(schedule.template)}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {schedule.assigned_technician?.name || '-'}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant={schedule.status === 'scheduled' || schedule.status === 'overdue' ? 'default' : 'ghost'}
                        onClick={() => navigate(`/pm/execution?schedule=${schedule.id}`)}
                        disabled={schedule.status === 'completed' || schedule.status === 'cancelled'}
                        className={`h-8 w-8 p-0 ${schedule.status === 'in_progress' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/pm/schedules/${schedule.id}`)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {schedule.status === 'scheduled' && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/pm/schedules/${schedule.id}/edit`)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteConfirm({ open: true, schedule })}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {paginatedSchedules.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  {t('common.noSearchResults')}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* 데스크톱 테이블 */}
      <Card className="hidden md:block">
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
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
                    <TableCell>{getEquipmentName(schedule.equipment)}</TableCell>
                    <TableCell>{getTemplateName(schedule.template)}</TableCell>
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
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => navigate(`/pm/schedules/${schedule.id}/edit`)}
                              title={t('pm.editSchedule')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteConfirm({ open: true, schedule })}
                              title={t('pm.deleteSchedule')}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
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
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
            {(currentPage - 1) * PAGE_SIZE + 1} -{' '}
            {Math.min(currentPage * PAGE_SIZE, filteredSchedules.length)} /{' '}
            {filteredSchedules.length}
          </p>
          <div className="flex justify-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">{t('common.previous')}</span>
            </Button>
            <span className="flex items-center px-2 text-xs sm:text-sm">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <span className="hidden sm:inline mr-1">{t('common.next')}</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <Card className="w-full sm:max-w-md mx-0 sm:mx-4 rounded-b-none sm:rounded-b-lg">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold mb-2">{t('pm.deleteSchedule')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('pm.deleteScheduleConfirm')}
              </p>
              {deleteConfirm.schedule && (
                <div className="bg-muted p-3 rounded-md mb-4 text-xs sm:text-sm space-y-1">
                  <p><strong>{t('equipment.equipmentCode')}:</strong> {deleteConfirm.schedule.equipment?.equipment_code}</p>
                  <p><strong>{t('pm.scheduledDate')}:</strong> {deleteConfirm.schedule.scheduled_date}</p>
                  <p><strong>{t('pm.template')}:</strong> {getTemplateName(deleteConfirm.schedule.template)}</p>
                </div>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setDeleteConfirm({ open: false, schedule: null })} className="w-full sm:w-auto">
                  {t('common.cancel')}
                </Button>
                <Button variant="destructive" onClick={handleDelete} className="w-full sm:w-auto">
                  {t('common.delete')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
