import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import {
  Plus,
  X,
  Loader2,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
} from 'lucide-react'
import { equipmentApi, maintenanceApi, usersApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { searchPartsByCode, getPartWithInventory, isPartsSupabaseConnected } from '@/lib/supabase'
import type { Equipment, RepairType, User, EquipmentType } from '@/types'

interface PartUsage {
  code: string
  name: string
  qty: number
  currentStock?: number
  isLoading?: boolean
}

interface PartSearchResult {
  id: string
  part_code: string
  part_name: string
  category?: string
}

export default function MaintenanceInputPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()

  // Get equipmentId from navigation state
  const passedEquipmentId = (location.state as { equipmentId?: string })?.equipmentId
  const { addToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])
  const [repairTypes, setRepairTypes] = useState<RepairType[]>([])
  const [technicians, setTechnicians] = useState<User[]>([])

  // 검색/필터
  const [equipmentSearch, setEquipmentSearch] = useState('')
  const [filteredEquipments, setFilteredEquipments] = useState<Equipment[]>([])
  const [showEquipmentList, setShowEquipmentList] = useState(false)

  // 폼 데이터
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    equipment_id: '',
    equipment_type_id: '',
    repair_type_id: searchParams.get('type') || '',
    technician_id: user?.id || '',
    start_time: new Date().toISOString().slice(0, 16),
    symptom: '',
  })

  // 선택된 설비
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)

  // 사용 부품
  const [parts, setParts] = useState<PartUsage[]>([])

  // 부품 검색 관련
  const [partSearchResults, setPartSearchResults] = useState<PartSearchResult[]>([])
  const [activePartIndex, setActivePartIndex] = useState<number | null>(null)
  const [partSearchLoading, setPartSearchLoading] = useState(false)
  const partsConnected = isPartsSupabaseConnected()

  // Multilingual helpers
  const getEquipmentName = (eq: Equipment) => {
    if (i18n.language === 'vi') return eq.equipment_name_vi || eq.equipment_name
    return eq.equipment_name_ko || eq.equipment_name
  }

  const getEquipmentTypeName = (type: EquipmentType | undefined) => {
    if (!type) return '-'
    if (i18n.language === 'vi') return type.name_vi || type.name
    return type.name_ko || type.name
  }

  // 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [equipRes, typesRes, repairRes, techRes] = await Promise.all([
          equipmentApi.getEquipments(),
          equipmentApi.getEquipmentTypes(),
          maintenanceApi.getRepairTypes(),
          usersApi.getTechnicians(),
        ])

        if (equipRes.data) setEquipments(equipRes.data)
        if (typesRes.data) setEquipmentTypes(typesRes.data)
        if (repairRes.data) setRepairTypes(repairRes.data)
        if (techRes.data) setTechnicians(techRes.data)

        // URL 파라미터로 수리 유형이 설정된 경우
        const typeParam = searchParams.get('type')
        if (typeParam && repairRes.data) {
          const matchedType = repairRes.data.find((rt) => rt.code === typeParam)
          if (matchedType) {
            setFormData((prev) => ({ ...prev, repair_type_id: matchedType.id }))
          }
        }

        // 전달된 설비 ID로 설비 자동 선택
        if (passedEquipmentId && equipRes.data) {
          const equipment = equipRes.data.find((eq) => eq.id === passedEquipmentId)
          if (equipment) {
            setSelectedEquipment(equipment)
            setFormData((prev) => ({
              ...prev,
              equipment_id: equipment.id,
              equipment_type_id: equipment.equipment_type_id,
            }))
            setEquipmentSearch(equipment.equipment_code)
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [searchParams, passedEquipmentId])

  // 설비 검색
  useEffect(() => {
    if (equipmentSearch.length >= 2) {
      const filtered = equipments.filter(
        (eq) =>
          eq.equipment_code.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
          getEquipmentName(eq).toLowerCase().includes(equipmentSearch.toLowerCase())
      )
      setFilteredEquipments(filtered.slice(0, 10))
      setShowEquipmentList(true)
    } else {
      setFilteredEquipments([])
      setShowEquipmentList(false)
    }
  }, [equipmentSearch, equipments])

  // 설비 유형 변경 시 필터링
  useEffect(() => {
    if (formData.equipment_type_id) {
      const filtered = equipments.filter(
        (eq) => eq.equipment_type_id === formData.equipment_type_id
      )
      setFilteredEquipments(filtered.slice(0, 10))
    }
  }, [formData.equipment_type_id, equipments])

  const handleEquipmentSelect = (equipment: Equipment) => {
    setSelectedEquipment(equipment)
    setFormData((prev) => ({
      ...prev,
      equipment_id: equipment.id,
      equipment_type_id: equipment.equipment_type_id,
    }))
    setEquipmentSearch(equipment.equipment_code)
    setShowEquipmentList(false)
  }

  const addPart = () => {
    setParts([...parts, { code: '', name: '', qty: 1, currentStock: undefined, isLoading: false }])
  }

  const updatePart = (index: number, field: keyof PartUsage, value: string | number | boolean | undefined) => {
    const newParts = [...parts]
    newParts[index] = { ...newParts[index], [field]: value }
    setParts(newParts)
  }

  const removePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index))
    if (activePartIndex === index) {
      setActivePartIndex(null)
      setPartSearchResults([])
    }
  }

  // 부품 코드 검색
  const handlePartCodeSearch = useCallback(async (index: number, searchTerm: string) => {
    updatePart(index, 'code', searchTerm)

    if (!partsConnected || searchTerm.length < 2) {
      setPartSearchResults([])
      setActivePartIndex(null)
      return
    }

    setActivePartIndex(index)
    setPartSearchLoading(true)

    const { data } = await searchPartsByCode(searchTerm, 10)
    if (data) {
      setPartSearchResults(data as PartSearchResult[])
    } else {
      setPartSearchResults([])
    }
    setPartSearchLoading(false)
  }, [partsConnected])

  // 부품 선택
  const handlePartSelect = async (index: number, part: PartSearchResult) => {
    const newParts = [...parts]
    newParts[index] = {
      ...newParts[index],
      code: part.part_code,
      name: part.part_name,
      isLoading: true,
    }
    setParts(newParts)
    setPartSearchResults([])
    setActivePartIndex(null)

    // 재고 정보 조회
    const { data } = await getPartWithInventory(part.part_code)
    if (data) {
      const finalParts = [...parts]
      finalParts[index] = {
        ...finalParts[index],
        code: part.part_code,
        name: part.part_name,
        currentStock: data.current_stock,
        isLoading: false,
      }
      setParts(finalParts)
    } else {
      updatePart(index, 'isLoading', false)
    }
  }

  // 부품 코드 입력 완료 시 자동으로 부품명과 재고 조회
  const handlePartCodeBlur = async (index: number) => {
    const partCode = parts[index].code
    if (!partsConnected || !partCode || parts[index].name) return

    updatePart(index, 'isLoading', true)
    const { data } = await getPartWithInventory(partCode)

    if (data) {
      const newParts = [...parts]
      newParts[index] = {
        ...newParts[index],
        name: data.part_name || '',
        currentStock: data.current_stock,
        isLoading: false,
      }
      setParts(newParts)
    } else {
      updatePart(index, 'isLoading', false)
    }
    setPartSearchResults([])
    setActivePartIndex(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.equipment_id || !formData.repair_type_id) {
      addToast({ type: 'warning', title: t('maintenance.validation'), message: '설비와 수리 유형을 선택해주세요.' })
      return
    }

    setSubmitting(true)
    try {
      const { data, error } = await maintenanceApi.createRecord({
        date: formData.date,
        equipment_id: formData.equipment_id,
        repair_type_id: formData.repair_type_id,
        technician_id: formData.technician_id || user?.id || '',
        start_time: formData.start_time,
        symptom: formData.symptom || undefined,
      })

      if (error) {
        addToast({ type: 'error', title: t('common.error'), message: error })
        return
      }

      if (data) {
        addToast({ type: 'success', title: t('maintenance.repairStarted'), message: '수리가 시작되었습니다.' })
        navigate('/maintenance/monitor')
      }
    } catch (error) {
      console.error('Failed to start maintenance:', error)
      addToast({ type: 'error', title: t('common.error'), message: '수리 시작에 실패했습니다.' })
    } finally {
      setSubmitting(false)
    }
  }

  const selectedRepairType = repairTypes.find((rt) => rt.id === formData.repair_type_id)
  const isEmergency = selectedRepairType?.code === 'EM'

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">
          {isEmergency ? (
            <span className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              {t('maintenance.emergencyRepairStart')}
            </span>
          ) : (
            t('maintenance.startRepair')
          )}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 메인 폼 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('maintenance.input')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="date">{t('maintenance.date')}</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="technician">{t('maintenance.technician')}</Label>
                    <Select
                      id="technician"
                      value={formData.technician_id}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, technician_id: e.target.value }))
                      }
                    >
                      <option value="">{t('maintenance.technicianSelect')}</option>
                      {technicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name} ({tech.department})
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="equipmentType">{t('equipment.equipmentType')}</Label>
                    <Select
                      id="equipmentType"
                      value={formData.equipment_type_id}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          equipment_type_id: e.target.value,
                          equipment_id: '',
                        }))
                        setSelectedEquipment(null)
                        setEquipmentSearch('')
                      }}
                    >
                      <option value="">{t('maintenance.equipmentTypeSelect')}</option>
                      {equipmentTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {getEquipmentTypeName(type)}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="equipment">{t('equipment.equipmentNo')}</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="equipment"
                        placeholder={t('maintenance.equipmentSearch')}
                        value={equipmentSearch}
                        onChange={(e) => setEquipmentSearch(e.target.value)}
                        onFocus={() => equipmentSearch.length >= 2 && setShowEquipmentList(true)}
                        className="pl-9"
                      />
                      {showEquipmentList && filteredEquipments.length > 0 && (
                        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-lg">
                          {filteredEquipments.map((eq) => (
                            <div
                              key={eq.id}
                              className="cursor-pointer px-3 py-2 hover:bg-muted"
                              onClick={() => handleEquipmentSelect(eq)}
                            >
                              <p className="font-medium">{eq.equipment_code}</p>
                              <p className="text-sm text-muted-foreground">{getEquipmentName(eq)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="repairType">{t('maintenance.repairType')}</Label>
                    <Select
                      id="repairType"
                      value={formData.repair_type_id}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, repair_type_id: e.target.value }))
                      }
                      className={isEmergency ? 'border-red-500' : ''}
                    >
                      <option value="">{t('maintenance.repairTypeSelect')}</option>
                      {repairTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name} ({type.code})
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startTime">{t('maintenance.startTime')}</Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={formData.start_time}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, start_time: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="symptom">{t('maintenance.symptom')}</Label>
                  <textarea
                    id="symptom"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder={t('maintenance.symptomPlaceholder')}
                    value={formData.symptom}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, symptom: e.target.value }))
                    }
                  />
                </div>

                {/* Parts Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label>{t('maintenance.usedParts')}</Label>
                      {partsConnected && (
                        <Badge variant="outline" className="text-xs">
                          <Package className="mr-1 h-3 w-3" />
                          {t('maintenance.partsDbConnected')}
                        </Badge>
                      )}
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addPart}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('maintenance.addPart')}
                    </Button>
                  </div>
                  {parts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t('maintenance.noUsedParts')}
                    </p>
                  ) : (
                    parts.map((part, index) => (
                      <div key={index} className="flex items-end gap-2 rounded-lg border p-3">
                        {/* 부품코드 검색 */}
                        <div className="w-40 space-y-2">
                          <Label className="text-xs">{t('parts.partCode')}</Label>
                          <div className="relative">
                            <Input
                              placeholder={t('parts.partCodeSearch')}
                              value={part.code}
                              onChange={(e) => handlePartCodeSearch(index, e.target.value)}
                              onBlur={() => setTimeout(() => handlePartCodeBlur(index), 200)}
                              className="pr-8"
                            />
                            {part.isLoading && (
                              <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                            )}
                            {/* 검색 결과 드롭다운 */}
                            {activePartIndex === index && partSearchResults.length > 0 && (
                              <div className="absolute z-20 mt-1 max-h-48 w-72 overflow-auto rounded-md border bg-popover shadow-lg">
                                {partSearchLoading ? (
                                  <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  </div>
                                ) : (
                                  partSearchResults.map((result) => (
                                    <div
                                      key={result.id}
                                      className="cursor-pointer px-3 py-2 hover:bg-muted"
                                      onMouseDown={() => handlePartSelect(index, result)}
                                    >
                                      <p className="font-mono text-sm font-medium">{result.part_code}</p>
                                      <p className="text-xs text-muted-foreground truncate">{result.part_name}</p>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* 부품명 (자동 완성) */}
                        <div className="flex-1 space-y-2">
                          <Label className="text-xs">{t('parts.partName')}</Label>
                          <Input
                            placeholder={t('parts.partName')}
                            value={part.name}
                            onChange={(e) => updatePart(index, 'name', e.target.value)}
                            readOnly={partsConnected && !!part.code}
                            className={partsConnected && part.code ? 'bg-muted' : ''}
                          />
                        </div>
                        {/* 수량 */}
                        <div className="w-20 space-y-2">
                          <Label className="text-xs">{t('parts.quantity')}</Label>
                          <Input
                            type="number"
                            min={1}
                            value={part.qty}
                            onChange={(e) => updatePart(index, 'qty', parseInt(e.target.value) || 1)}
                          />
                        </div>
                        {/* 현재 재고 */}
                        {partsConnected && (
                          <div className="w-24 space-y-2">
                            <Label className="text-xs text-muted-foreground">{t('parts.currentStock')}</Label>
                            <div className="flex h-9 items-center justify-center rounded-md border bg-muted px-2 text-sm">
                              {part.isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : part.currentStock !== undefined ? (
                                <span className={part.currentStock <= part.qty ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                                  {part.currentStock}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removePart(index)}
                          className="shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || !formData.equipment_id || !formData.repair_type_id}
                    className={isEmergency ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('common.processing')}
                      </>
                    ) : (
                      <>
                        <Clock className="mr-2 h-4 w-4" />
                        {t('maintenance.startRepair')}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* 사이드바: 선택된 설비 정보 */}
        <div className="space-y-4">
          {selectedEquipment ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('maintenance.selectedEquipment')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xl">{selectedEquipment.equipment_code}</span>
                  <Badge
                    variant={
                      selectedEquipment.status === 'normal'
                        ? 'success'
                        : selectedEquipment.status === 'emergency'
                          ? 'destructive'
                          : 'warning'
                    }
                  >
                    {selectedEquipment.status}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('equipment.equipmentName')}</span>
                    <span>{getEquipmentName(selectedEquipment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('equipment.equipmentType')}</span>
                    <span>{getEquipmentTypeName(selectedEquipment.equipment_type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('equipment.building')}</span>
                    <span>{selectedEquipment.building}</span>
                  </div>
                  {selectedEquipment.manufacturer && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('equipment.manufacturer')}</span>
                      <span>{selectedEquipment.manufacturer}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">{t('maintenance.equipmentSearchGuide')}</p>
              </CardContent>
            </Card>
          )}

          {/* 선택된 수리 유형 정보 */}
          {selectedRepairType && (
            <Card className={isEmergency ? 'border-red-500' : ''}>
              <CardHeader>
                <CardTitle className="text-lg">{t('maintenance.repairTypeLabel')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: selectedRepairType.color }}
                  >
                    {selectedRepairType.code}
                  </div>
                  <div>
                    <p className="font-medium">{selectedRepairType.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('pm.priority')}: {selectedRepairType.priority}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 빠른 가이드 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('maintenance.startGuide')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-green-500" />
                  <span>{t('maintenance.guideStep1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-green-500" />
                  <span>{t('maintenance.guideStep2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-green-500" />
                  <span>{t('maintenance.guideStep3')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-green-500" />
                  <span>{t('maintenance.guideStep4')}</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
