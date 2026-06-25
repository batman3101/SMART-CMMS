import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SortableTableHead } from '@/components/ui/sortable-table-head'
import { Progress } from '@/components/ui/progress'
import {
  Search,
  RefreshCw,
  Plus,
  Play,
  Eye,
  Edit,
  Filter,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { getTodayInTimezone } from '@/lib/dateUtils'
import { paintApi, equipmentApi, usersApi } from '@/lib/api'
import { useTableSort } from '@/hooks'
import { useAuthStore } from '@/stores/authStore'
import type { PaintSchedule, PaintScheduleFilter, PaintScheduleStatus, PaintPriority, Equipment, EquipmentType, PaintTemplate, PaintStepExecution, User } from '@/types'

const PAGE_SIZE = 15

export default function PaintScheduleListPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { currentFactory } = useAuthStore()

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

  const getTemplateName = (template: PaintTemplate | undefined) => {
    if (!template) return '-'
    if (i18n.language === 'vi') return template.name_vi || template.name
    return template.name_ko || template.name
  }

  const [searchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState<PaintSchedule[]>([])
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])
  const [technicians, setTechnicians] = useState<User[]>([])
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; schedule: PaintSchedule | null }>({ open: false, schedule: null })
  const [editModal, setEditModal] = useState<{ open: boolean; schedule: PaintSchedule | null }>({ open: false, schedule: null })
  const [editForm, setEditForm] = useState({
    scheduled_date: '',
    assigned_technician_id: '',
    priority: 'medium' as PaintPriority,
    notes: '',
    current_step: 0,
    status: 'scheduled' as PaintScheduleStatus,
    equipment_id: '',
    equipment_code: '',
    completed_date: '',
  })
  const [editLoading, setEditLoading] = useState(false)
  // 수정 모달의 단계 체크리스트(건너뛴 단계 완료 처리용)
  const [stepExecs, setStepExecs] = useState<PaintStepExecution[]>([])
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({})
  // ?edit=<scheduleId> 진입(상세 페이지 수정 버튼) 시 모달 1회 자동 오픈용
  const editParamHandledRef = useRef(false)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PaintScheduleStatus | 'overdue' | ''>(
    (searchParams.get('status') as PaintScheduleStatus | 'overdue') || ''
  )
  const [priorityFilter, setPriorityFilter] = useState<PaintPriority | ''>('')
  const [technicianFilter, setTechnicianFilter] = useState('')
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState('')

  const { sortedData, requestSort, getSortDirection } = useTableSort<PaintSchedule>(
    schedules,
    { key: 'scheduled_date', direction: 'asc' }
  )

  useEffect(() => {
    const loadInitialData = async () => {
      const [typesRes, techRes, eqRes] = await Promise.all([
        equipmentApi.getEquipmentTypes(),
        usersApi.getTechnicians(),
        equipmentApi.getEquipments({ raw: true }),
      ])
      if (typesRes.data) setEquipmentTypes(typesRes.data)
      if (techRes.data) setTechnicians(techRes.data)
      if (eqRes.data) setEquipments(eqRes.data)
    }
    loadInitialData()
  }, [currentFactory])

  useEffect(() => {
    fetchSchedules()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter, technicianFilter, equipmentTypeFilter, currentFactory])

  const fetchSchedules = async () => {
    setLoading(true)
    try {
      // Special handling for 'overdue' status filter
      if (statusFilter === 'overdue') {
        const { data } = await paintApi.getOverdueSchedules()
        if (data) {
          let filtered = data
          if (priorityFilter) filtered = filtered.filter(s => s.priority === priorityFilter)
          if (technicianFilter) filtered = filtered.filter(s => s.assigned_technician_id === technicianFilter)
          if (equipmentTypeFilter) filtered = filtered.filter(s => s.equipment?.equipment_type_id === equipmentTypeFilter)
          setSchedules(filtered)
        }
      } else {
        const filter: PaintScheduleFilter = {}
        if (statusFilter) filter.status = statusFilter
        if (priorityFilter) filter.priority = priorityFilter
        if (technicianFilter) filter.technician_id = technicianFilter
        if (equipmentTypeFilter) filter.equipment_type_id = equipmentTypeFilter

        const { data } = await paintApi.getSchedules(filter)
        if (data) setSchedules(data)
      }
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
        (schedule.template && getTemplateName(schedule.template).toLowerCase().includes(searchLower))
      )
    }
    return true
  })

  const totalPages = Math.ceil(filteredSchedules.length / PAGE_SIZE)
  const paginatedSchedules = filteredSchedules.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  // Helper to check if a schedule is overdue
  const isOverdue = (schedule: PaintSchedule): boolean => {
    const today = getTodayInTimezone()
    return schedule.scheduled_date < today &&
           (schedule.status === 'scheduled' || schedule.status === 'in_progress')
  }

  const getStatusBadge = (schedule: PaintSchedule) => {
    const displayStatus = isOverdue(schedule) ? 'overdue' : schedule.status

    const variants: Record<string, string> = {
      scheduled: 'outline',
      in_progress: 'warning',
      completed: 'success',
      overdue: 'destructive',
      cancelled: 'secondary',
    }
    const labels: Record<string, string> = {
      scheduled: t('paint.statusScheduled'),
      in_progress: t('paint.statusInProgress'),
      completed: t('paint.statusCompleted'),
      overdue: t('paint.statusOverdue'),
      cancelled: t('paint.statusCancelled'),
    }
    return <Badge variant={variants[displayStatus] as 'default' | 'info' | 'success' | 'destructive' | 'secondary'}>{labels[displayStatus]}</Badge>
  }

  const getPriorityBadge = (priority: PaintPriority) => {
    const variants: Record<PaintPriority, string> = {
      high: 'destructive',
      medium: 'warning',
      low: 'secondary',
    }
    const labels: Record<PaintPriority, string> = {
      high: t('paint.priorityHigh'),
      medium: t('paint.priorityMedium'),
      low: t('paint.priorityLow'),
    }
    return <Badge variant={variants[priority] as 'destructive' | 'warning' | 'secondary'}>{labels[priority]}</Badge>
  }

  // Helper to get step progress percentage
  const getStepProgress = (schedule: PaintSchedule): number => {
    if (schedule.status === 'completed') return 100
    if (schedule.status === 'scheduled' || schedule.status === 'cancelled') return 0
    const currentStep = schedule.current_step || 0
    return Math.round((currentStep / 6) * 100)
  }

  // Helper to render progress indicator
  const renderProgress = (schedule: PaintSchedule) => {
    if (schedule.status === 'scheduled' || schedule.status === 'cancelled') {
      return <span className="text-muted-foreground text-xs">-</span>
    }
    const percent = getStepProgress(schedule)
    const currentStep = schedule.current_step || 0
    return (
      <div className="min-w-[80px]">
        <div className="flex items-center gap-2">
          <Progress value={percent} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {currentStep}/6
          </span>
        </div>
      </div>
    )
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

    const { success, error } = await paintApi.deleteSchedule(deleteConfirm.schedule.id)
    setDeleteConfirm({ open: false, schedule: null })

    if (success) {
      addToast({ type: 'success', title: t('paint.deleteSchedule'), message: t('common.success') })
      fetchSchedules()
    } else {
      addToast({ type: 'error', title: t('paint.deleteSchedule'), message: error || t('common.error') })
    }
  }

  const openEditModal = (schedule: PaintSchedule) => {
    setEditForm({
      scheduled_date: schedule.scheduled_date,
      assigned_technician_id: schedule.assigned_technician_id || '',
      priority: schedule.priority,
      notes: schedule.notes || '',
      current_step: schedule.current_step || 0,
      status: schedule.status,
      equipment_id: schedule.equipment_id,
      equipment_code: schedule.equipment?.equipment_code || '',
      completed_date: '', // 모달 오픈 시 비동기 로드
    })
    setStepExecs([])
    setCheckedSteps({})
    setEditModal({ open: true, schedule })
  }

  const closeEditModal = () => {
    setEditModal({ open: false, schedule: null })
    setStepExecs([])
    setCheckedSteps({})
    setEditForm({
      scheduled_date: '',
      assigned_technician_id: '',
      priority: 'medium',
      notes: '',
      current_step: 0,
      status: 'scheduled',
      equipment_id: '',
      equipment_code: '',
      completed_date: '',
    })
  }

  // 모달 오픈 시: 단계 실행 목록 + (완료 일정이면) 완료일 비동기 로드
  useEffect(() => {
    if (!editModal.open || !editModal.schedule) return
    const sched = editModal.schedule
    let cancelled = false
    ;(async () => {
      const stepRes = await paintApi.getStepExecutions(sched.id)
      if (cancelled) return
      const steps = stepRes.data ?? []
      setStepExecs(steps)
      // checkedSteps는 사용자 토글만 추적(비동기 로드가 클릭을 덮어쓰는 레이스 방지).
      // 이미 완료된 단계의 체크 표시는 렌더 시 se.status에서 직접 파생한다.

      if (sched.status === 'completed') {
        const cRes = await paintApi.getScheduleCompletedAt(sched.id)
        if (cancelled) return
        const dateStr = cRes.data
          ? new Date(cRes.data).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
          : ''
        setEditForm((prev) => ({ ...prev, completed_date: dateStr }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [editModal.open, editModal.schedule])

  // 단계명(다국어)
  const getStepName = (se: PaintStepExecution) => {
    const s = se.step
    if (!s) return `${t('paint.step')} ${se.step_order}`
    return i18n.language === 'vi' ? s.name_vi || s.name : s.name_ko || s.name
  }

  // 입력한 설비 코드 → 설비 resolve (정확 일치, 대소문자 무시). 미일치면 저장 비활성화.
  const handleEditEquipmentCode = (code: string) => {
    const match = equipments.find(
      (eq) => eq.equipment_code.toLowerCase() === code.trim().toLowerCase()
    )
    setEditForm((prev) => ({ ...prev, equipment_code: code, equipment_id: match?.id || '' }))
  }
  const selectedEditEquipment = equipments.find((eq) => eq.id === editForm.equipment_id)
  const editEquipmentValid = !!editForm.equipment_id

  // 상세 페이지의 "수정" 버튼(?edit=<id>)으로 진입하면 해당 일정의 수정 모달을 1회 자동 오픈
  useEffect(() => {
    const editId = searchParams.get('edit')
    if (editId && schedules.length > 0 && !editParamHandledRef.current) {
      const target = schedules.find((s) => s.id === editId)
      if (target) {
        openEditModal(target)
        editParamHandledRef.current = true
      }
    }
  }, [schedules, searchParams])

  const handleEdit = async () => {
    if (!editModal.schedule) return
    if (!editForm.equipment_id) return // 유효한 설비가 선택되지 않으면 저장 불가

    setEditLoading(true)

    // Determine status based on current_step
    let newStatus = editForm.status
    if (editForm.current_step === 0 && editForm.status === 'in_progress') {
      newStatus = 'scheduled'
    } else if (editForm.current_step > 0 && editForm.current_step < 6 && editForm.status === 'scheduled') {
      newStatus = 'in_progress'
    } else if (editForm.current_step === 6) {
      newStatus = 'completed'
    }

    const { success, error } = await paintApi.updateSchedule(editModal.schedule.id, {
      scheduled_date: editForm.scheduled_date,
      assigned_technician_id: editForm.assigned_technician_id || undefined,
      priority: editForm.priority,
      notes: editForm.notes,
      current_step: editForm.current_step,
      status: newStatus,
      equipment_id: editForm.equipment_id,
    })
    if (success) {
      // 완료일 정정 (완료 일정만, 단계 유지 시)
      if (editModal.schedule.status === 'completed' && editForm.completed_date && newStatus === 'completed') {
        await paintApi.updateScheduleCompletedAt(
          editModal.schedule.id,
          `${editForm.completed_date}T12:00:00+07:00`
        )
      }
      // 건너뛴/미완료 단계 완료 처리
      const toComplete = stepExecs
        .filter((se) => checkedSteps[se.id] && se.status !== 'completed')
        .map((se) => se.id)
      if (toComplete.length > 0) {
        await paintApi.markStepsCompleted(toComplete)
      }
    }

    setEditLoading(false)

    if (success) {
      addToast({ type: 'success', title: t('paint.editSchedule'), message: t('common.success') })
      closeEditModal()
      fetchSchedules()
    } else {
      addToast({ type: 'error', title: t('paint.editSchedule'), message: error || t('common.error') })
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{t('paint.schedules')}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t('paint.scheduleCount')}: {filteredSchedules.length}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchSchedules} className="h-9 px-3">
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </Button>
          <Button size="sm" onClick={() => navigate('/paint/schedules/new')} className="h-9 px-3">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('paint.createSchedule')}</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-6">
          <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-4">
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
            <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-4">
              <Select
                className="h-9 text-sm sm:w-[140px]"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as PaintScheduleStatus | 'overdue' | '')
                  setCurrentPage(1)
                }}
              >
                <option value="">{t('paint.filterByStatus')}</option>
                <option value="scheduled">{t('paint.statusScheduled')}</option>
                <option value="in_progress">{t('paint.statusInProgress')}</option>
                <option value="completed">{t('paint.statusCompleted')}</option>
                <option value="overdue">{t('paint.statusOverdue')}</option>
                <option value="cancelled">{t('paint.statusCancelled')}</option>
              </Select>
              <Select
                className="h-9 text-sm sm:w-[130px]"
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value as PaintPriority | '')
                  setCurrentPage(1)
                }}
              >
                <option value="">{t('paint.filterByPriority')}</option>
                <option value="high">{t('paint.priorityHigh')}</option>
                <option value="medium">{t('paint.priorityMedium')}</option>
                <option value="low">{t('paint.priorityLow')}</option>
              </Select>
              <Select
                className="h-9 text-sm sm:w-[130px]"
                value={technicianFilter}
                onChange={(e) => {
                  setTechnicianFilter(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="">{t('paint.filterByTechnician')}</option>
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
                <option value="">{t('paint.filterByEquipmentType')}</option>
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

      {/* Mobile card view */}
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
                      {getStatusBadge(schedule)}
                      {getPriorityBadge(schedule.priority)}
                    </div>
                  </div>
                  <p className="font-medium text-sm mb-1">
                    {schedule.equipment?.equipment_code} - {getEquipmentName(schedule.equipment)}
                  </p>
                  {schedule.template && (
                    <p className="text-xs text-muted-foreground truncate mb-2">
                      {getTemplateName(schedule.template)}
                    </p>
                  )}
                  {/* Progress indicator for mobile */}
                  {(schedule.status === 'in_progress' || schedule.status === 'completed') && (
                    <div className="mb-2">
                      {renderProgress(schedule)}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {schedule.assigned_technician?.name || '-'}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant={schedule.status === 'scheduled' || isOverdue(schedule) ? 'default' : 'ghost'}
                        onClick={() => navigate(`/paint/execution?schedule=${schedule.id}`)}
                        disabled={schedule.status === 'completed' || schedule.status === 'cancelled'}
                        className={`h-8 w-8 p-0 ${schedule.status === 'in_progress' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/paint/schedules/${schedule.id}`)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditModal(schedule)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {schedule.status !== 'completed' && schedule.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteConfirm({ open: true, schedule })}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

      {/* Desktop table */}
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
                    {t('paint.scheduledDate')}
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
                    sortKey="assigned_technician.name"
                    sortDirection={getSortDirection('assigned_technician.name')}
                    onSort={requestSort}
                    className="w-[120px]"
                  >
                    {t('paint.assignedTechnician')}
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="priority"
                    sortDirection={getSortDirection('priority')}
                    onSort={requestSort}
                    className="w-[100px]"
                  >
                    {t('paint.priority')}
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="status"
                    sortDirection={getSortDirection('status')}
                    onSort={requestSort}
                    className="w-[100px]"
                  >
                    {t('equipment.status')}
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="current_step"
                    sortDirection={getSortDirection('current_step')}
                    onSort={requestSort}
                    className="w-[120px]"
                  >
                    {t('paint.stepProgress')}
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
                    <TableCell>{schedule.assigned_technician?.name || '-'}</TableCell>
                    <TableCell>{getPriorityBadge(schedule.priority)}</TableCell>
                    <TableCell>{getStatusBadge(schedule)}</TableCell>
                    <TableCell>{renderProgress(schedule)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="icon"
                          variant={schedule.status === 'scheduled' || isOverdue(schedule) ? 'default' : 'ghost'}
                          onClick={() => navigate(`/paint/execution?schedule=${schedule.id}`)}
                          title={t('paint.startPaint')}
                          disabled={schedule.status === 'completed' || schedule.status === 'cancelled'}
                          className={schedule.status === 'in_progress' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => navigate(`/paint/schedules/${schedule.id}`)}
                          title={t('paint.viewDetail')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditModal(schedule)}
                          title={t('paint.editSchedule')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {schedule.status !== 'completed' && schedule.status !== 'cancelled' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteConfirm({ open: true, schedule })}
                            title={t('paint.deleteSchedule')}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
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
              <h3 className="text-base sm:text-lg font-semibold mb-2">{t('paint.deleteSchedule')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('paint.deleteScheduleConfirm')}
              </p>
              {deleteConfirm.schedule && (
                <div className="bg-muted p-3 rounded-md mb-4 text-xs sm:text-sm space-y-1">
                  <p><strong>{t('equipment.equipmentCode')}:</strong> {deleteConfirm.schedule.equipment?.equipment_code}</p>
                  <p><strong>{t('paint.scheduledDate')}:</strong> {deleteConfirm.schedule.scheduled_date}</p>
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

      {/* Edit Modal */}
      {editModal.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <Card className="w-full sm:max-w-lg mx-0 sm:mx-4 rounded-b-none sm:rounded-b-lg max-h-[90vh] flex flex-col overflow-hidden">
            <CardContent className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold mb-4">{t('paint.editSchedule')}</h3>

              <div className="space-y-4">
                {/* 설비 선택기 (검색형 datalist) — 잘못 입력된 설비 번호 정정 */}
                <div className="space-y-2">
                  <Label htmlFor="edit-equipment">{t('paint.selectEquipment')}</Label>
                  <Input
                    id="edit-equipment"
                    list="paint-edit-equipment-codes"
                    value={editForm.equipment_code}
                    onChange={(e) => handleEditEquipmentCode(e.target.value)}
                    placeholder={t('paint.equipmentCodePlaceholder')}
                    autoComplete="off"
                    className={editForm.equipment_code && !editEquipmentValid ? 'border-destructive focus-visible:ring-destructive' : ''}
                  />
                  <datalist id="paint-edit-equipment-codes">
                    {equipments.map((eq) => (
                      <option key={eq.id} value={eq.equipment_code}>
                        {getEquipmentName(eq)}
                      </option>
                    ))}
                  </datalist>
                  {editEquipmentValid ? (
                    <p className="text-xs text-muted-foreground">{getEquipmentName(selectedEditEquipment)}</p>
                  ) : editForm.equipment_code ? (
                    <p className="text-xs text-destructive">{t('paint.invalidEquipmentCode')}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-scheduled-date">{t('paint.scheduledDate')}</Label>
                  <Input
                    id="edit-scheduled-date"
                    type="date"
                    value={editForm.scheduled_date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
                  />
                </div>

                {/* 완료일 — 완료 일정에서만 표시 (실행 기록 completed_at 정정) */}
                {editModal.schedule?.status === 'completed' && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-completed-date">{t('paint.completedDate')}</Label>
                    <Input
                      id="edit-completed-date"
                      type="date"
                      value={editForm.completed_date}
                      onChange={(e) => setEditForm(prev => ({ ...prev, completed_date: e.target.value }))}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="edit-technician">{t('paint.assignedTechnician')}</Label>
                  <Select
                    id="edit-technician"
                    value={editForm.assigned_technician_id}
                    onChange={(e) => setEditForm(prev => ({ ...prev, assigned_technician_id: e.target.value }))}
                  >
                    <option value="">{t('paint.filterByTechnician')}</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-priority">{t('paint.priority')}</Label>
                  <Select
                    id="edit-priority"
                    value={editForm.priority}
                    onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value as PaintPriority }))}
                  >
                    <option value="low">{t('paint.priorityLow')}</option>
                    <option value="medium">{t('paint.priorityMedium')}</option>
                    <option value="high">{t('paint.priorityHigh')}</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-step">{t('paint.currentStep')}</Label>
                  <Select
                    id="edit-step"
                    value={String(editForm.current_step)}
                    onChange={(e) => setEditForm(prev => ({ ...prev, current_step: Number(e.target.value) }))}
                  >
                    <option value="0">{t('paint.notStarted')}</option>
                    <option value="1">1. {t('paint.step1')}</option>
                    <option value="2">2. {t('paint.step2')}</option>
                    <option value="3">3. {t('paint.step3')}</option>
                    <option value="4">4. {t('paint.step4')}</option>
                    <option value="5">5. {t('paint.step5')}</option>
                    <option value="6">6. {t('paint.step6')} ({t('paint.stepCompleted')})</option>
                  </Select>
                </div>

                {/* 단계별 완료 체크 — 건너뛴/미완료 단계를 체크하여 완료 처리 */}
                {stepExecs.length > 0 && (
                  <div className="space-y-2">
                    <Label>{t('paint.markStepsComplete')}</Label>
                    <div className="space-y-2 rounded-md border p-3">
                      {stepExecs.map((se) => {
                        const done = se.status === 'completed'
                        return (
                          <label key={se.id} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={done || !!checkedSteps[se.id]}
                              disabled={done}
                              onCheckedChange={(v) =>
                                setCheckedSteps((prev) => ({ ...prev, [se.id]: v === true }))
                              }
                            />
                            <span className={done ? 'text-muted-foreground' : ''}>
                              {se.step_order}. {getStepName(se)}
                            </span>
                            {se.status === 'skipped' && (
                              <span className="text-xs text-amber-600">({t('paint.stepSkipped')})</span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="edit-notes">{t('paint.paintNotes')}</Label>
                  <textarea
                    id="edit-notes"
                    className="w-full rounded-md border p-3 text-sm bg-background"
                    rows={3}
                    value={editForm.notes}
                    onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder={t('paint.paintNotes') + '...'}
                  />
                </div>
              </div>

            </CardContent>
            <div className="shrink-0 border-t bg-background p-4 sm:p-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={closeEditModal} disabled={editLoading} className="w-full sm:w-auto">
                {t('common.cancel')}
              </Button>
              <Button onClick={handleEdit} disabled={editLoading || !editEquipmentValid} className="w-full sm:w-auto">
                {editLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {t('common.save')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
