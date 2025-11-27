import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
} from 'lucide-react'
import { mockEquipmentApi, mockMaintenanceApi, mockUsersApi } from '@/mock/api'
import { useAuthStore } from '@/stores/authStore'
import type { Equipment, RepairType, User, EquipmentType } from '@/types'

interface PartUsage {
  code: string
  name: string
  qty: number
}

export default function MaintenanceInputPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()
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

  // 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [equipRes, typesRes, repairRes, techRes] = await Promise.all([
          mockEquipmentApi.getEquipments(),
          mockEquipmentApi.getEquipmentTypes(),
          mockMaintenanceApi.getRepairTypes(),
          mockUsersApi.getTechnicians(),
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
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [searchParams])

  // 설비 검색
  useEffect(() => {
    if (equipmentSearch.length >= 2) {
      const filtered = equipments.filter(
        (eq) =>
          eq.equipment_code.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
          eq.equipment_name.toLowerCase().includes(equipmentSearch.toLowerCase())
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
    setParts([...parts, { code: '', name: '', qty: 1 }])
  }

  const updatePart = (index: number, field: keyof PartUsage, value: string | number) => {
    const newParts = [...parts]
    newParts[index] = { ...newParts[index], [field]: value }
    setParts(newParts)
  }

  const removePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.equipment_id || !formData.repair_type_id) {
      addToast({ type: 'warning', title: t('maintenance.validation'), message: '설비와 수리 유형을 선택해주세요.' })
      return
    }

    setSubmitting(true)
    try {
      const { data, error } = await mockMaintenanceApi.startMaintenance(
        {
          date: formData.date,
          equipment_id: formData.equipment_id,
          repair_type_id: formData.repair_type_id,
          start_time: formData.start_time,
          symptom: formData.symptom || undefined,
        },
        formData.technician_id || user?.id || ''
      )

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
              긴급 수리 시작
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
                      <option value="">담당자 선택</option>
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
                      <option value="">설비유형 선택</option>
                      {equipmentTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
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
                        placeholder="설비번호 검색..."
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
                              <p className="text-sm text-muted-foreground">{eq.equipment_name}</p>
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
                      <option value="">수리유형 선택</option>
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
                    placeholder="증상을 입력하세요..."
                    value={formData.symptom}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, symptom: e.target.value }))
                    }
                  />
                </div>

                {/* Parts Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>{t('maintenance.usedParts')}</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addPart}>
                      <Plus className="mr-2 h-4 w-4" />
                      부품 추가
                    </Button>
                  </div>
                  {parts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      사용된 부품이 없습니다. 필요시 부품을 추가하세요.
                    </p>
                  ) : (
                    parts.map((part, index) => (
                      <div key={index} className="flex items-end gap-4">
                        <div className="flex-1 space-y-2">
                          <Label>부품코드</Label>
                          <Input
                            placeholder="부품코드 입력"
                            value={part.code}
                            onChange={(e) => updatePart(index, 'code', e.target.value)}
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label>부품명</Label>
                          <Input
                            placeholder="부품명"
                            value={part.name}
                            onChange={(e) => updatePart(index, 'name', e.target.value)}
                          />
                        </div>
                        <div className="w-24 space-y-2">
                          <Label>수량</Label>
                          <Input
                            type="number"
                            min={1}
                            value={part.qty}
                            onChange={(e) => updatePart(index, 'qty', parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removePart(index)}
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
                        처리중...
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
                <CardTitle className="text-lg">선택된 설비</CardTitle>
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
                    <span className="text-muted-foreground">설비명</span>
                    <span>{selectedEquipment.equipment_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">유형</span>
                    <span>{selectedEquipment.equipment_type?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">동</span>
                    <span>{selectedEquipment.building}</span>
                  </div>
                  {selectedEquipment.manufacturer && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">제조사</span>
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
                <p className="mt-2 text-sm text-muted-foreground">설비를 검색하여 선택하세요</p>
              </CardContent>
            </Card>
          )}

          {/* 선택된 수리 유형 정보 */}
          {selectedRepairType && (
            <Card className={isEmergency ? 'border-red-500' : ''}>
              <CardHeader>
                <CardTitle className="text-lg">수리 유형</CardTitle>
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
                      우선순위: {selectedRepairType.priority}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 빠른 가이드 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">수리 시작 가이드</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-green-500" />
                  <span>설비 유형 또는 설비번호로 검색</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-green-500" />
                  <span>수리 유형 선택 (PM/BR/PD/QA/EM)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-green-500" />
                  <span>증상 및 부품 사용 내역 입력</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-green-500" />
                  <span>수리 시작 버튼 클릭</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
