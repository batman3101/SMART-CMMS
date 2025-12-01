import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SortableTableHead } from '@/components/ui/sortable-table-head'
import {
  Search,
  Download,
  Loader2,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  Star,
} from 'lucide-react'
import { mockMaintenanceApi, mockUsersApi } from '@/mock/api'
import { useTableSort } from '@/hooks'
import type { MaintenanceRecord, RepairType, User } from '@/types'

const ITEMS_PER_PAGE = 15

export default function MaintenanceHistoryPage() {
  const { t } = useTranslation()
  const location = useLocation()

  // Get equipmentId from navigation state
  const passedEquipmentId = (location.state as { equipmentId?: string })?.equipmentId

  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [repairTypes, setRepairTypes] = useState<RepairType[]>([])
  const [technicians, setTechnicians] = useState<User[]>([])

  // 필터 상태
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [repairTypeFilter, setRepairTypeFilter] = useState('')
  const [technicianFilter, setTechnicianFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'in_progress' | 'completed' | ''>('')
  const [search, setSearch] = useState('')
  const [equipmentIdFilter, setEquipmentIdFilter] = useState<string>('')

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1)

  // 선택된 레코드
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null)

  // 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [recordsRes, repairTypesRes, techRes] = await Promise.all([
          mockMaintenanceApi.getMaintenanceRecords(),
          mockMaintenanceApi.getRepairTypes(),
          mockUsersApi.getTechnicians(),
        ])

        if (recordsRes.data) {
          setRecords(recordsRes.data)
        }

        // 전달된 설비 ID로 필터 설정
        if (passedEquipmentId) {
          setEquipmentIdFilter(passedEquipmentId)
        }
        if (repairTypesRes.data) setRepairTypes(repairTypesRes.data)
        if (techRes.data) setTechnicians(techRes.data)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [passedEquipmentId])

  // 필터링된 데이터
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      // 설비 ID 필터 (전달된 설비 ID로 필터링)
      if (equipmentIdFilter && record.equipment_id !== equipmentIdFilter) return false

      // 날짜 필터
      if (startDate && record.date < startDate) return false
      if (endDate && record.date > endDate) return false

      // 수리 유형 필터
      if (repairTypeFilter && record.repair_type_id !== repairTypeFilter) return false

      // 담당자 필터
      if (technicianFilter && record.technician_id !== technicianFilter) return false

      // 상태 필터
      if (statusFilter && record.status !== statusFilter) return false

      // 검색
      if (search) {
        const searchLower = search.toLowerCase()
        const matchRecord = record.record_no.toLowerCase().includes(searchLower)
        const matchEquipment = record.equipment?.equipment_code
          .toLowerCase()
          .includes(searchLower)
        const matchTech = record.technician?.name.toLowerCase().includes(searchLower)

        if (!matchRecord && !matchEquipment && !matchTech) return false
      }

      return true
    })
  }, [records, equipmentIdFilter, startDate, endDate, repairTypeFilter, technicianFilter, statusFilter, search])

  // Sorting
  const { sortedData, requestSort, getSortDirection } = useTableSort<MaintenanceRecord>(
    filteredRecords,
    { key: 'date', direction: 'desc' },
    (item, key) => {
      if (key === 'equipment_code') return item.equipment?.equipment_code || ''
      if (key === 'repair_type_name') return item.repair_type?.code ? getRepairTypeLabel(item.repair_type.code) : ''
      if (key === 'technician_name') return item.technician?.name || ''
      return item[key as keyof MaintenanceRecord]
    }
  )

  // 페이지네이션된 데이터
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return sortedData.slice(start, start + ITEMS_PER_PAGE)
  }, [sortedData, currentPage])

  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE)

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const { data } = await mockMaintenanceApi.getMaintenanceRecords()
      if (data) setRecords(data)
    } finally {
      setLoading(false)
    }
  }

  const handleResetFilters = () => {
    setStartDate('')
    setEndDate('')
    setRepairTypeFilter('')
    setTechnicianFilter('')
    setStatusFilter('')
    setSearch('')
    setEquipmentIdFilter('')
    setCurrentPage(1)
  }

  const handleExport = () => {
    // CSV 내보내기 기능 (실제로는 더 복잡한 처리 필요)
    const headers = ['기록번호', '설비코드', '수리유형', '담당자', '시작시간', '종료시간', '소요시간', '상태', '평점']
    const csvContent = [
      headers.join(','),
      ...filteredRecords.map((r) =>
        [
          r.record_no,
          r.equipment?.equipment_code || '',
          r.repair_type?.code ? getRepairTypeLabel(r.repair_type.code) : '',
          r.technician?.name || '',
          r.start_time,
          r.end_time || '',
          r.duration_minutes || '',
          r.status,
          r.rating || '',
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `maintenance_history_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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

  const formatTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString)
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR')
  }

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
        <div>
          <h1 className="text-2xl font-bold">{t('maintenance.history')}</h1>
          <p className="text-sm text-muted-foreground">{t('maintenance.historyCount', { count: filteredRecords.length })}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            {t('common.export')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex gap-2">
              <Input
                type="date"
                className="w-[150px]"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setCurrentPage(1)
                }}
              />
              <span className="self-center">~</span>
              <Input
                type="date"
                className="w-[150px]"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
            <Select
              className="w-[150px]"
              value={repairTypeFilter}
              onChange={(e) => {
                setRepairTypeFilter(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">{t('maintenance.repairType')}</option>
              {repairTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </Select>
            <Select
              className="w-[150px]"
              value={technicianFilter}
              onChange={(e) => {
                setTechnicianFilter(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">{t('maintenance.technician')}</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name}
                </option>
              ))}
            </Select>
            <Select
              className="w-[150px]"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'in_progress' | 'completed' | '')
                setCurrentPage(1)
              }}
            >
              <option value="">{t('equipment.status')}</option>
              <option value="in_progress">{t('maintenance.statusInProgress')}</option>
              <option value="completed">{t('maintenance.statusCompleted')}</option>
            </Select>
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
            <Button variant="outline" onClick={handleResetFilters}>
              <Filter className="mr-2 h-4 w-4" />
              {t('common.reset')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  sortKey="record_no"
                  sortDirection={getSortDirection('record_no')}
                  onSort={requestSort}
                >
                  {t('maintenance.recordNo')}
                </SortableTableHead>
                <SortableTableHead
                  sortKey="date"
                  sortDirection={getSortDirection('date')}
                  onSort={requestSort}
                >
                  {t('maintenance.date')}
                </SortableTableHead>
                <SortableTableHead
                  sortKey="equipment_code"
                  sortDirection={getSortDirection('equipment_code')}
                  onSort={requestSort}
                >
                  {t('equipment.equipmentNo')}
                </SortableTableHead>
                <SortableTableHead
                  sortKey="repair_type_name"
                  sortDirection={getSortDirection('repair_type_name')}
                  onSort={requestSort}
                >
                  {t('maintenance.repairType')}
                </SortableTableHead>
                <SortableTableHead
                  sortKey="technician_name"
                  sortDirection={getSortDirection('technician_name')}
                  onSort={requestSort}
                >
                  {t('maintenance.technician')}
                </SortableTableHead>
                <SortableTableHead
                  sortKey="start_time"
                  sortDirection={getSortDirection('start_time')}
                  onSort={requestSort}
                >
                  {t('maintenance.startTime')}
                </SortableTableHead>
                <SortableTableHead
                  sortKey="end_time"
                  sortDirection={getSortDirection('end_time')}
                  onSort={requestSort}
                >
                  {t('maintenance.endTime')}
                </SortableTableHead>
                <SortableTableHead
                  sortKey="duration_minutes"
                  sortDirection={getSortDirection('duration_minutes')}
                  onSort={requestSort}
                >
                  {t('maintenance.duration')}
                </SortableTableHead>
                <SortableTableHead
                  sortKey="status"
                  sortDirection={getSortDirection('status')}
                  onSort={requestSort}
                >
                  {t('equipment.status')}
                </SortableTableHead>
                <SortableTableHead
                  sortKey="rating"
                  sortDirection={getSortDirection('rating')}
                  onSort={requestSort}
                >
                  {t('maintenance.rating')}
                </SortableTableHead>
                <SortableTableHead
                  sortKey=""
                  sortDirection={null}
                  onSort={() => {}}
                  className="text-center"
                >
                  {t('common.detail')}
                </SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRecords.map((record) => (
                <TableRow key={record.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{record.record_no}</TableCell>
                  <TableCell>{formatDate(record.date)}</TableCell>
                  <TableCell>{record.equipment?.equipment_code || '-'}</TableCell>
                  <TableCell>
                    <Badge
                      style={{
                        backgroundColor: record.repair_type?.color || '#gray',
                        color: 'white',
                      }}
                    >
                      {record.repair_type?.code ? getRepairTypeLabel(record.repair_type.code) : '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>{record.technician?.name || '-'}</TableCell>
                  <TableCell>{formatTime(record.start_time)}</TableCell>
                  <TableCell>{record.end_time ? formatTime(record.end_time) : '-'}</TableCell>
                  <TableCell>
                    {record.duration_minutes ? `${record.duration_minutes}분` : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={record.status === 'completed' ? 'success' : 'warning'}>
                      {record.status === 'completed'
                        ? t('maintenance.statusCompleted')
                        : t('maintenance.statusInProgress')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {record.rating ? (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{record.rating}</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedRecord(record)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                    {t('common.noSearchResults')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredRecords.length)} /{' '}
                {filteredRecords.length}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 상세 정보 모달 */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('maintenance.repairDetail')}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedRecord(null)}>
                ✕
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('maintenance.recordNo')}</p>
                  <p className="font-medium">{selectedRecord.record_no}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('maintenance.date')}</p>
                  <p className="font-medium">{formatDate(selectedRecord.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('maintenance.equipmentInfo')}</p>
                  <p className="font-medium">
                    {selectedRecord.equipment?.equipment_code} -{' '}
                    {selectedRecord.equipment?.equipment_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('maintenance.repairType')}</p>
                  <Badge
                    style={{
                      backgroundColor: selectedRecord.repair_type?.color || '#gray',
                      color: 'white',
                    }}
                  >
                    {selectedRecord.repair_type?.code ? getRepairTypeLabel(selectedRecord.repair_type.code) : ''}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('maintenance.technician')}</p>
                  <p className="font-medium">{selectedRecord.technician?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('equipment.status')}</p>
                  <Badge variant={selectedRecord.status === 'completed' ? 'success' : 'warning'}>
                    {selectedRecord.status === 'completed' ? t('maintenance.statusCompleted') : t('maintenance.statusInProgress')}
                  </Badge>
                </div>
              </div>

              {/* 시간 정보 */}
              <div className="rounded-lg bg-muted p-4">
                <h4 className="mb-2 font-medium">{t('maintenance.timeInfo')}</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('maintenance.startTime')}</p>
                    <p className="font-medium">{formatTime(selectedRecord.start_time)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('maintenance.endTime')}</p>
                    <p className="font-medium">
                      {selectedRecord.end_time ? formatTime(selectedRecord.end_time) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('maintenance.duration')}</p>
                    <p className="font-medium">
                      {selectedRecord.duration_minutes
                        ? `${selectedRecord.duration_minutes}${t('analytics.minutes')}`
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 증상 및 수리 내용 */}
              {selectedRecord.symptom && (
                <div>
                  <h4 className="mb-2 font-medium">{t('maintenance.symptom')}</h4>
                  <p className="rounded-lg border p-3 text-sm">{selectedRecord.symptom}</p>
                </div>
              )}

              {selectedRecord.repair_content && (
                <div>
                  <h4 className="mb-2 font-medium">{t('maintenance.repairContent')}</h4>
                  <p className="rounded-lg border p-3 text-sm">{selectedRecord.repair_content}</p>
                </div>
              )}

              {/* 평점 */}
              {selectedRecord.rating && (
                <div>
                  <h4 className="mb-2 font-medium">{t('maintenance.rating')}</h4>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 10 }, (_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < selectedRecord.rating!
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="ml-2 font-bold">{selectedRecord.rating}/10</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
