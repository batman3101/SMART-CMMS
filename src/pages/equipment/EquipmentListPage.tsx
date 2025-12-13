import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
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
  Filter,
  Grid,
  List,
  Loader2,
  RefreshCw,
  Eye,
  Wrench,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { equipmentApi } from '@/lib/api'
import { useTableSort } from '@/hooks/useTableSort'
import type { Equipment, EquipmentStatus, EquipmentType } from '@/types'

const statusColors: Record<EquipmentStatus, string> = {
  normal: 'success',
  pm: 'info',
  repair: 'warning',
  emergency: 'destructive',
  standby: 'secondary',
}

const ITEMS_PER_PAGE = 20

export default function EquipmentListPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')

  // Helper functions for multilingual display
  const getEquipmentName = useCallback((eq: Equipment) => {
    if (i18n.language === 'vi') return eq.equipment_name_vi || eq.equipment_name
    return eq.equipment_name_ko || eq.equipment_name
  }, [i18n.language])

  const getEquipmentTypeName = (type: EquipmentType | undefined) => {
    if (!type) return '-'
    if (i18n.language === 'vi') return type.name_vi || type.name
    return type.name_ko || type.name
  }

  const getBuilding = (eq: Equipment) => {
    if (i18n.language === 'vi') return eq.building_vi || eq.building
    return eq.building
  }

  const getLocale = () => {
    return i18n.language === 'vi' ? 'vi-VN' : 'ko-KR'
  }
  const [loading, setLoading] = useState(true)
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])

  // 필터 상태
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | ''>('')
  const [buildingFilter, setBuildingFilter] = useState('')

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1)

  // 선택된 설비
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)

  // 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [equipRes, typesRes] = await Promise.all([
          equipmentApi.getEquipments(),
          equipmentApi.getEquipmentTypes(),
        ])
        if (equipRes.error) {
          addToast({ type: 'error', title: t('common.error'), message: t('equipment.fetchError') })
          console.error('Equipment fetch error:', equipRes.error)
        }
        if (typesRes.error) {
          console.error('Equipment types fetch error:', typesRes.error)
        }
        if (equipRes.data) setEquipments(equipRes.data)
        if (typesRes.data) setEquipmentTypes(typesRes.data)
      } catch (error) {
        console.error('Failed to fetch equipment data:', error)
        addToast({
          type: 'error',
          title: t('common.error'),
          message: error instanceof Error ? error.message : t('equipment.fetchError')
        })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 필터링된 데이터
  const filteredEquipments = useMemo(() => {
    return equipments.filter((eq) => {
      const eqName = getEquipmentName(eq)
      const matchSearch =
        !search ||
        eq.equipment_code.toLowerCase().includes(search.toLowerCase()) ||
        eqName.toLowerCase().includes(search.toLowerCase())

      const matchType = !typeFilter || eq.equipment_type_id === typeFilter
      const matchStatus = !statusFilter || eq.status === statusFilter
      const matchBuilding = !buildingFilter || eq.building === buildingFilter

      return matchSearch && matchType && matchStatus && matchBuilding
    })
  }, [equipments, search, typeFilter, statusFilter, buildingFilter, getEquipmentName])

  // 정렬
  const { sortedData, requestSort, getSortDirection } = useTableSort<Equipment>(
    filteredEquipments,
    { key: 'equipment_code', direction: 'asc' },
    (item, key) => {
      if (key === 'equipment_type.name') {
        return item.equipment_type?.name || ''
      }
      return item[key as keyof Equipment]
    }
  )

  // 페이지네이션된 데이터
  const paginatedEquipments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return sortedData.slice(start, start + ITEMS_PER_PAGE)
  }, [sortedData, currentPage])

  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE)

  // 동 목록 (고유값)
  const buildings = useMemo(() => {
    const uniqueBuildings = [...new Set(equipments.map((eq) => eq.building))]
    return uniqueBuildings.sort()
  }, [equipments])

  const getStatusLabel = (status: EquipmentStatus) => {
    const labels: Record<EquipmentStatus, string> = {
      normal: t('equipment.statusNormal'),
      pm: t('equipment.statusPM'),
      repair: t('equipment.statusRepair'),
      emergency: t('equipment.statusEmergency'),
      standby: t('equipment.statusStandby'),
    }
    return labels[status]
  }

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const { data, error } = await equipmentApi.getEquipments()
      if (error) {
        addToast({ type: 'error', title: t('common.error'), message: t('equipment.fetchError') })
        console.error('Refresh error:', error)
        return
      }
      if (data) setEquipments(data)
      addToast({ type: 'success', title: t('common.success'), message: t('common.refreshSuccess') })
    } catch (error) {
      console.error('Failed to refresh:', error)
      addToast({
        type: 'error',
        title: t('common.error'),
        message: error instanceof Error ? error.message : t('equipment.fetchError')
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResetFilters = () => {
    setSearch('')
    setTypeFilter('')
    setStatusFilter('')
    setBuildingFilter('')
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* 헤더 - 모바일에서 세로 스택 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{t('equipment.list')}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t('equipment.totalCount', { count: filteredEquipments.length })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} className="flex-1 sm:flex-none">
            <RefreshCw className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('table')}
            className="hidden md:flex"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'card' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('card')}
            className="hidden md:flex"
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters - 모바일: 세로 스택, 데스크톱: 가로 정렬 */}
      <Card>
        <CardContent className="p-3 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            {/* 검색 - 모바일에서 전체 너비 */}
            <div className="w-full sm:min-w-[200px] sm:flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('common.search')}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-9 h-9 sm:h-10"
                />
              </div>
            </div>
            {/* 필터 그리드 - 모바일: 2열, 데스크톱: 인라인 */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-4">
              <Select
                className="w-full sm:w-[130px] h-9 sm:h-10 text-sm"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="">{t('equipment.equipmentType')}</option>
                {equipmentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </Select>
              <Select
                className="w-full sm:w-[120px] h-9 sm:h-10 text-sm"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as EquipmentStatus | '')
                  setCurrentPage(1)
                }}
              >
                <option value="">{t('equipment.status')}</option>
                <option value="normal">{t('equipment.statusNormal')}</option>
                <option value="pm">{t('equipment.statusPM')}</option>
                <option value="repair">{t('equipment.statusRepair')}</option>
                <option value="emergency">{t('equipment.statusEmergency')}</option>
                <option value="standby">{t('equipment.statusStandby')}</option>
              </Select>
              <Select
                className="w-full sm:w-[120px] h-9 sm:h-10 text-sm"
                value={buildingFilter}
                onChange={(e) => {
                  setBuildingFilter(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="">{t('equipment.buildingAll')}</option>
                {buildings.map((building) => (
                  <option key={building} value={building}>
                    {building}
                  </option>
                ))}
              </Select>
              <Button variant="outline" onClick={handleResetFilters} size="sm" className="h-9 sm:h-10">
                <Filter className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="text-xs sm:text-sm">{t('common.resetFilter')}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment List - 모바일: 카드뷰 강제, 데스크톱: 선택 가능 */}
      {/* 모바일에서는 항상 카드뷰 */}
      <div className="md:hidden">
        <div className="grid grid-cols-1 gap-3">
          {paginatedEquipments.map((equipment) => (
            <Card
              key={equipment.id}
              className="cursor-pointer transition-shadow active:bg-muted/50"
              onClick={() => setSelectedEquipment(equipment)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{equipment.equipment_code}</span>
                      <Badge
                        variant={statusColors[equipment.status] as 'success' | 'info' | 'warning' | 'destructive' | 'secondary'}
                        className="text-xs"
                      >
                        {getStatusLabel(equipment.status)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">{getEquipmentName(equipment)}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                      <span>{getEquipmentTypeName(equipment.equipment_type)}</span>
                      <span>•</span>
                      <span>{getBuilding(equipment)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedEquipment(equipment)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {paginatedEquipments.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                {t('common.noSearchResults')}
              </CardContent>
            </Card>
          )}
        </div>
        {/* 모바일 페이지네이션 */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="h-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="h-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* 데스크톱: 테이블/카드 선택 가능 */}
      <div className="hidden md:block">
        {viewMode === 'table' ? (
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      sortKey="equipment_code"
                      sortDirection={getSortDirection('equipment_code')}
                      onSort={requestSort}
                    >
                      {t('equipment.equipmentNo')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="equipment_name"
                      sortDirection={getSortDirection('equipment_name')}
                      onSort={requestSort}
                    >
                      {t('equipment.equipmentName')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="equipment_type.name"
                      sortDirection={getSortDirection('equipment_type.name')}
                      onSort={requestSort}
                    >
                      {t('equipment.equipmentType')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="building"
                      sortDirection={getSortDirection('building')}
                      onSort={requestSort}
                    >
                      {t('equipment.building')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="status"
                      sortDirection={getSortDirection('status')}
                      onSort={requestSort}
                    >
                      {t('equipment.status')}
                    </SortableTableHead>
                    <TableHead className="text-center">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEquipments.map((equipment) => (
                    <TableRow key={equipment.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{equipment.equipment_code}</TableCell>
                      <TableCell>{getEquipmentName(equipment)}</TableCell>
                      <TableCell>{getEquipmentTypeName(equipment.equipment_type)}</TableCell>
                      <TableCell>{getBuilding(equipment)}</TableCell>
                      <TableCell>
                        <Badge variant={statusColors[equipment.status] as 'success' | 'info' | 'warning' | 'destructive' | 'secondary'}>
                          {getStatusLabel(equipment.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEquipment(equipment)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Wrench className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedEquipments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
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
                    {Math.min(currentPage * ITEMS_PER_PAGE, sortedData.length)} /{' '}
                    {sortedData.length}
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
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedEquipments.map((equipment) => (
                <Card
                  key={equipment.id}
                  className="cursor-pointer transition-shadow hover:shadow-lg"
                  onClick={() => setSelectedEquipment(equipment)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{equipment.equipment_code}</CardTitle>
                      <Badge variant={statusColors[equipment.status] as 'success' | 'info' | 'warning' | 'destructive' | 'secondary'}>
                        {getStatusLabel(equipment.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-2 text-sm text-muted-foreground">{getEquipmentName(equipment)}</p>
                    <div className="flex justify-between text-sm">
                      <span>{getEquipmentTypeName(equipment.equipment_type)}</span>
                      <span>{getBuilding(equipment)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 페이지네이션 */}
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
      </div>

      {/* Equipment Detail Modal - 모바일 전체화면 */}
      {selectedEquipment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <Card className="w-full max-h-[90vh] overflow-auto rounded-t-xl sm:rounded-xl sm:max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-background border-b p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">{t('equipment.detail')}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedEquipment(null)} className="h-8 w-8 p-0">
                ✕
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('equipment.equipmentCode')}</p>
                  <p className="font-medium text-sm sm:text-base">{selectedEquipment.equipment_code}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('equipment.equipmentName')}</p>
                  <p className="font-medium text-sm sm:text-base truncate">{getEquipmentName(selectedEquipment)}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('equipment.equipmentType')}</p>
                  <p className="font-medium text-sm sm:text-base">{getEquipmentTypeName(selectedEquipment.equipment_type)}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('equipment.building')}</p>
                  <p className="font-medium text-sm sm:text-base">{getBuilding(selectedEquipment)}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('equipment.status')}</p>
                  <Badge variant={statusColors[selectedEquipment.status] as 'success' | 'info' | 'warning' | 'destructive' | 'secondary'}>
                    {getStatusLabel(selectedEquipment.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('equipment.installDate')}</p>
                  <p className="font-medium text-sm sm:text-base">
                    {selectedEquipment.install_date
                      ? new Date(selectedEquipment.install_date).toLocaleDateString(getLocale())
                      : '-'}
                  </p>
                </div>
              </div>

              {selectedEquipment.manufacturer && (
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('equipment.manufacturer')}</p>
                  <p className="font-medium text-sm sm:text-base">{selectedEquipment.manufacturer}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button
                  className="flex-1"
                  onClick={() => {
                    const equipmentId = selectedEquipment.id
                    setSelectedEquipment(null)
                    navigate('/maintenance', {
                      state: { equipmentId }
                    })
                  }}
                >
                  <Wrench className="mr-2 h-4 w-4" />
                  {t('equipment.startRepair')}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const equipmentId = selectedEquipment.id
                    setSelectedEquipment(null)
                    navigate('/maintenance/history', {
                      state: { equipmentId }
                    })
                  }}
                >
                  {t('equipment.viewHistory')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
