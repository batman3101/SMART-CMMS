import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  X,
  Save,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Settings2,
} from 'lucide-react'
import { mockEquipmentApi } from '@/mock/api'
import { useTableSort } from '@/hooks/useTableSort'
import type { Equipment, EquipmentType, EquipmentStatus } from '@/types'

const ITEMS_PER_PAGE = 15

const statusColors: Record<EquipmentStatus, string> = {
  normal: 'success',
  pm: 'info',
  repair: 'warning',
  emergency: 'destructive',
  standby: 'secondary',
}

const statusOptions: { value: EquipmentStatus; label: string }[] = [
  { value: 'normal', label: '정상' },
  { value: 'pm', label: 'PM 중' },
  { value: 'repair', label: '수리 중' },
  { value: 'emergency', label: '긴급수리' },
  { value: 'standby', label: '대기' },
]

interface EquipmentFormData {
  equipment_code: string
  equipment_name: string
  equipment_type_id: string
  status: EquipmentStatus
  install_date: string
  manufacturer: string
  building: string
}

const defaultFormData: EquipmentFormData = {
  equipment_code: '',
  equipment_name: '',
  equipment_type_id: '',
  status: 'normal',
  install_date: '',
  manufacturer: '',
  building: '',
}

export default function EquipmentMasterPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('equipments')
  const [loading, setLoading] = useState(true)
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])

  // 필터 상태
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1)

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null)
  const [formData, setFormData] = useState<EquipmentFormData>(defaultFormData)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // 동 목록
  const buildings = useMemo(() => {
    const uniqueBuildings = [...new Set(equipments.map((eq) => eq.building))]
    return uniqueBuildings.sort()
  }, [equipments])

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
        console.error('Failed to fetch data:', error)
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
      return matchSearch && matchType
    })
  }, [equipments, search, typeFilter])

  // 설비 테이블 정렬
  const {
    sortedData: sortedEquipments,
    requestSort: requestEquipmentSort,
    getSortDirection: getEquipmentSortDirection,
  } = useTableSort<Equipment>(
    filteredEquipments,
    { key: 'equipment_code', direction: 'asc' },
    (item, key) => {
      if (key === 'equipment_type.name') {
        return item.equipment_type?.name || ''
      }
      return item[key as keyof Equipment]
    }
  )

  // 설비 유형별 수를 포함한 데이터
  const equipmentTypesWithCount = useMemo(() => {
    return equipmentTypes.map((type) => ({
      ...type,
      equipment_count: equipments.filter((e) => e.equipment_type_id === type.id).length,
    }))
  }, [equipmentTypes, equipments])

  // 설비 유형 테이블 정렬
  const {
    sortedData: sortedEquipmentTypes,
    requestSort: requestTypeSort,
    getSortDirection: getTypeSortDirection,
  } = useTableSort(
    equipmentTypesWithCount,
    { key: 'code', direction: 'asc' },
    (item, key) => item[key as keyof typeof item]
  )

  // 페이지네이션된 데이터
  const paginatedEquipments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return sortedEquipments.slice(start, start + ITEMS_PER_PAGE)
  }, [sortedEquipments, currentPage])

  const totalPages = Math.ceil(sortedEquipments.length / ITEMS_PER_PAGE)

  // 새 설비 추가 모달 열기
  const handleAddNew = () => {
    setEditingEquipment(null)
    setFormData(defaultFormData)
    setFormErrors({})
    setIsModalOpen(true)
  }

  // 설비 수정 모달 열기
  const handleEdit = (equipment: Equipment) => {
    setEditingEquipment(equipment)
    setFormData({
      equipment_code: equipment.equipment_code,
      equipment_name: equipment.equipment_name,
      equipment_type_id: equipment.equipment_type_id,
      status: equipment.status,
      install_date: equipment.install_date || '',
      manufacturer: equipment.manufacturer || '',
      building: equipment.building,
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  // 삭제 확인 모달 열기
  const handleDeleteClick = (equipment: Equipment) => {
    setEditingEquipment(equipment)
    setIsDeleteModalOpen(true)
  }

  // 폼 유효성 검사
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.equipment_code.trim()) {
      errors.equipment_code = '설비 코드를 입력해주세요.'
    }
    if (!formData.equipment_name.trim()) {
      errors.equipment_name = '설비명을 입력해주세요.'
    }
    if (!formData.equipment_type_id) {
      errors.equipment_type_id = '설비 유형을 선택해주세요.'
    }
    if (!formData.building.trim()) {
      errors.building = '동을 선택해주세요.'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // 저장
  const handleSave = async () => {
    if (!validateForm()) return

    setSaving(true)
    try {
      if (editingEquipment) {
        // 수정
        const { data, error } = await mockEquipmentApi.updateEquipment(editingEquipment.id, {
          ...formData,
          equipment_type: equipmentTypes.find((t) => t.id === formData.equipment_type_id),
        })
        if (error) {
          setFormErrors({ submit: error })
          return
        }
        if (data) {
          setEquipments((prev) => prev.map((eq) => (eq.id === data.id ? data : eq)))
        }
      } else {
        // 생성
        const { data, error } = await mockEquipmentApi.createEquipment({
          ...formData,
          equipment_type: equipmentTypes.find((t) => t.id === formData.equipment_type_id),
          is_active: true,
        })
        if (error) {
          setFormErrors({ submit: error })
          return
        }
        if (data) {
          setEquipments((prev) => [data, ...prev])
        }
      }
      setIsModalOpen(false)
    } catch (error) {
      console.error('Failed to save:', error)
      setFormErrors({ submit: '저장 중 오류가 발생했습니다.' })
    } finally {
      setSaving(false)
    }
  }

  // 삭제
  const handleDelete = async () => {
    if (!editingEquipment) return

    setSaving(true)
    try {
      const { error } = await mockEquipmentApi.deleteEquipment(editingEquipment.id)
      if (error) {
        console.error('Delete error:', error)
        return
      }
      setEquipments((prev) => prev.filter((eq) => eq.id !== editingEquipment.id))
      setIsDeleteModalOpen(false)
    } catch (error) {
      console.error('Failed to delete:', error)
    } finally {
      setSaving(false)
    }
  }

  // 새로고침
  const handleRefresh = async () => {
    setLoading(true)
    try {
      const { data } = await mockEquipmentApi.getEquipments()
      if (data) setEquipments(data)
    } finally {
      setLoading(false)
    }
  }

  const getStatusLabel = (status: EquipmentStatus) => {
    return statusOptions.find((o) => o.value === status)?.label || status
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
        <h1 className="text-2xl font-bold">{t('nav.equipmentMaster')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            {t('equipment.register')}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="equipments">설비 관리</TabsTrigger>
          <TabsTrigger value="types">설비 유형 관리</TabsTrigger>
        </TabsList>

        <TabsContent value="equipments" className="space-y-4">
          {/* 필터 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="min-w-[200px] flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="설비 코드 또는 설비명 검색"
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
                  className="w-[180px]"
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                >
                  <option value="">설비 유형 전체</option>
                  {equipmentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 테이블 */}
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      sortKey="equipment_code"
                      sortDirection={getEquipmentSortDirection('equipment_code')}
                      onSort={requestEquipmentSort}
                      className="w-[120px]"
                    >
                      설비 코드
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="equipment_name"
                      sortDirection={getEquipmentSortDirection('equipment_name')}
                      onSort={requestEquipmentSort}
                    >
                      설비명
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="equipment_type.name"
                      sortDirection={getEquipmentSortDirection('equipment_type.name')}
                      onSort={requestEquipmentSort}
                      className="w-[120px]"
                    >
                      설비 유형
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="building"
                      sortDirection={getEquipmentSortDirection('building')}
                      onSort={requestEquipmentSort}
                      className="w-[80px]"
                    >
                      동
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="status"
                      sortDirection={getEquipmentSortDirection('status')}
                      onSort={requestEquipmentSort}
                      className="w-[100px]"
                    >
                      상태
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="manufacturer"
                      sortDirection={getEquipmentSortDirection('manufacturer')}
                      onSort={requestEquipmentSort}
                      className="w-[100px]"
                    >
                      제조사
                    </SortableTableHead>
                    <TableHead className="w-[100px] text-center">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEquipments.map((equipment) => (
                    <TableRow key={equipment.id}>
                      <TableCell className="font-medium">{equipment.equipment_code}</TableCell>
                      <TableCell>{equipment.equipment_name}</TableCell>
                      <TableCell>{equipment.equipment_type?.name || '-'}</TableCell>
                      <TableCell>{equipment.building}</TableCell>
                      <TableCell>
                        <Badge variant={statusColors[equipment.status] as any}>
                          {getStatusLabel(equipment.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{equipment.manufacturer || '-'}</TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(equipment)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClick(equipment)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedEquipments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
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
                    {Math.min(currentPage * ITEMS_PER_PAGE, sortedEquipments.length)} /{' '}
                    {sortedEquipments.length}
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
                    <span className="flex items-center px-3 text-sm">
                      {currentPage} / {totalPages}
                    </span>
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
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                설비 유형 목록
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      sortKey="code"
                      sortDirection={getTypeSortDirection('code')}
                      onSort={requestTypeSort}
                      className="w-[100px]"
                    >
                      코드
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="name"
                      sortDirection={getTypeSortDirection('name')}
                      onSort={requestTypeSort}
                    >
                      유형명
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="category"
                      sortDirection={getTypeSortDirection('category')}
                      onSort={requestTypeSort}
                      className="w-[100px]"
                    >
                      카테고리
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="is_active"
                      sortDirection={getTypeSortDirection('is_active')}
                      onSort={requestTypeSort}
                      className="w-[100px]"
                    >
                      상태
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="equipment_count"
                      sortDirection={getTypeSortDirection('equipment_count')}
                      onSort={requestTypeSort}
                      className="w-[100px]"
                    >
                      설비 수
                    </SortableTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEquipmentTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.code}</TableCell>
                      <TableCell>{type.name}</TableCell>
                      <TableCell>
                        <Badge variant={type.category === 'MAIN' ? 'default' : 'secondary'}>
                          {type.category === 'MAIN' ? '주설비' : '부대설비'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={type.is_active ? 'success' : 'secondary'}>
                          {type.is_active ? '활성' : '비활성'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{type.equipment_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="mt-4 text-sm text-muted-foreground">
                * 설비 유형 추가/수정은 시스템 관리자에게 문의하세요.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 등록/수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingEquipment ? '설비 수정' : '설비 등록'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="equipment_code">
                    설비 코드 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="equipment_code"
                    value={formData.equipment_code}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, equipment_code: e.target.value }))
                    }
                    placeholder="예: CNC-801"
                    disabled={!!editingEquipment}
                  />
                  {formErrors.equipment_code && (
                    <p className="text-sm text-destructive">{formErrors.equipment_code}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipment_name">
                    설비명 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="equipment_name"
                    value={formData.equipment_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, equipment_name: e.target.value }))
                    }
                    placeholder="예: CNC 밀링 머신 #801"
                  />
                  {formErrors.equipment_name && (
                    <p className="text-sm text-destructive">{formErrors.equipment_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipment_type_id">
                    설비 유형 <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    id="equipment_type_id"
                    value={formData.equipment_type_id}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, equipment_type_id: e.target.value }))
                    }
                  >
                    <option value="">선택하세요</option>
                    {equipmentTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </Select>
                  {formErrors.equipment_type_id && (
                    <p className="text-sm text-destructive">{formErrors.equipment_type_id}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">상태</Label>
                  <Select
                    id="status"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as EquipmentStatus,
                      }))
                    }
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="building">
                    동 <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    id="building"
                    value={formData.building}
                    onChange={(e) => setFormData((prev) => ({ ...prev, building: e.target.value }))}
                  >
                    <option value="">선택하세요</option>
                    {buildings.map((building) => (
                      <option key={building} value={building}>
                        {building}
                      </option>
                    ))}
                  </Select>
                  {formErrors.building && <p className="text-sm text-destructive">{formErrors.building}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="install_date">설치일</Label>
                  <Input
                    id="install_date"
                    type="date"
                    value={formData.install_date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, install_date: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manufacturer">제조사</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, manufacturer: e.target.value }))
                    }
                    placeholder="예: FANUC"
                  />
                </div>

              </div>

              {formErrors.submit && (
                <p className="text-sm text-destructive">{formErrors.submit}</p>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      저장
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {isDeleteModalOpen && editingEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>설비 삭제</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                <strong>{editingEquipment.equipment_code}</strong> ({editingEquipment.equipment_name}
                ) 설비를 삭제하시겠습니까?
              </p>
              <p className="text-sm text-muted-foreground">
                이 작업은 되돌릴 수 없습니다. 해당 설비와 관련된 수리 이력은 유지됩니다.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                  취소
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      삭제 중...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      삭제
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
