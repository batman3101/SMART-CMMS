import { useState, useEffect, useMemo } from 'react'
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
import { mockEquipmentApi } from '@/mock/api'
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
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
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
          mockEquipmentApi.getEquipments(),
          mockEquipmentApi.getEquipmentTypes(),
        ])
        if (equipRes.data) setEquipments(equipRes.data)
        if (typesRes.data) setEquipmentTypes(typesRes.data)
      } catch (error) {
        console.error('Failed to fetch equipment data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // 필터링된 데이터
  const filteredEquipments = useMemo(() => {
    return equipments.filter((eq) => {
      const matchSearch =
        !search ||
        eq.equipment_code.toLowerCase().includes(search.toLowerCase()) ||
        eq.equipment_name.toLowerCase().includes(search.toLowerCase())

      const matchType = !typeFilter || eq.equipment_type_id === typeFilter
      const matchStatus = !statusFilter || eq.status === statusFilter
      const matchBuilding = !buildingFilter || eq.building === buildingFilter

      return matchSearch && matchType && matchStatus && matchBuilding
    })
  }, [equipments, search, typeFilter, statusFilter, buildingFilter])

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
      const { data } = await mockEquipmentApi.getEquipments()
      if (data) setEquipments(data)
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('equipment.list')}</h1>
          <p className="text-sm text-muted-foreground">
            총 {filteredEquipments.length}대의 설비
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('table')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'card' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('card')}
          >
            <Grid className="h-4 w-4" />
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
              className="w-[150px]"
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
              className="w-[150px]"
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
            <Button variant="outline" onClick={handleResetFilters}>
              <Filter className="mr-2 h-4 w-4" />
              필터 초기화
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Equipment List */}
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
                    <TableCell>{equipment.equipment_name}</TableCell>
                    <TableCell>{equipment.equipment_type?.name || '-'}</TableCell>
                    <TableCell>{equipment.building}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[equipment.status] as any}>
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
                      검색 결과가 없습니다.
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
                    <Badge variant={statusColors[equipment.status] as any}>
                      {getStatusLabel(equipment.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-2 text-sm text-muted-foreground">{equipment.equipment_name}</p>
                  <div className="flex justify-between text-sm">
                    <span>{equipment.equipment_type?.name || '-'}</span>
                    <span>{equipment.building}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                이전
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
                다음
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Equipment Detail Modal */}
      {selectedEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>설비 상세 정보</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedEquipment(null)}>
                ✕
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">설비 코드</p>
                  <p className="font-medium">{selectedEquipment.equipment_code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">설비명</p>
                  <p className="font-medium">{selectedEquipment.equipment_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">설비 유형</p>
                  <p className="font-medium">{selectedEquipment.equipment_type?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('equipment.building')}</p>
                  <p className="font-medium">{selectedEquipment.building}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">상태</p>
                  <Badge variant={statusColors[selectedEquipment.status] as any}>
                    {getStatusLabel(selectedEquipment.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">설치일</p>
                  <p className="font-medium">
                    {selectedEquipment.install_date
                      ? new Date(selectedEquipment.install_date).toLocaleDateString('ko-KR')
                      : '-'}
                  </p>
                </div>
              </div>

              {selectedEquipment.manufacturer && (
                <div>
                  <p className="text-sm text-muted-foreground">제조사</p>
                  <p className="font-medium">{selectedEquipment.manufacturer}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button className="flex-1">
                  <Wrench className="mr-2 h-4 w-4" />
                  수리 시작
                </Button>
                <Button variant="outline" className="flex-1">
                  수리 이력 보기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
