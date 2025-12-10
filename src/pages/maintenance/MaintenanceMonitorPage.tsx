import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import {
  Clock,
  User,
  Wrench,
  CheckCircle,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Star,
  Timer,
} from 'lucide-react'
import { maintenanceApi, settingsApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import type { MaintenanceRecord, Equipment } from '@/types'

export default function MaintenanceMonitorPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { addToast } = useToast()

  // Permission check
  useEffect(() => {
    if (!hasPermission(user, 'maintenance:complete')) {
      addToast({
        type: 'error',
        title: t('common.error'),
        message: t('auth.noPermission')
      })
      navigate('/dashboard')
    }
  }, [user, navigate, addToast, t])

  const getLocale = () => {
    return i18n.language === 'vi' ? 'vi-VN' : 'ko-KR'
  }

  // Multilingual helpers
  const getEquipmentName = (eq: Equipment | undefined) => {
    if (!eq) return '-'
    if (i18n.language === 'vi') return eq.equipment_name_vi || eq.equipment_name
    return eq.equipment_name_ko || eq.equipment_name
  }

  const [loading, setLoading] = useState(true)
  const [inProgressRecords, setInProgressRecords] = useState<MaintenanceRecord[]>([])
  const [todayCompletedRecords, setTodayCompletedRecords] = useState<MaintenanceRecord[]>([])
  const [longRepairThresholdHours, setLongRepairThresholdHours] = useState(2) // 기본값 2시간

  // 완료 처리 모달
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null)
  const [completeForm, setCompleteForm] = useState({
    repair_content: '',
    end_time: new Date().toISOString().slice(0, 16),
    rating: 8,
  })
  const [submitting, setSubmitting] = useState(false)

  // 컴포넌트 마운트 상태 추적
  const isMountedRef = useRef(true)

  // 설정 로드
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data } = await settingsApi.get('long_repair_threshold_hours')
        if (data && typeof data === 'number') {
          setLongRepairThresholdHours(data)
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }
    loadSettings()
  }, [])

  // 데이터 로드 함수
  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return
    setLoading(true)
    try {
      const [inProgressRes, todayRes] = await Promise.all([
        maintenanceApi.getInProgressRecords(),
        maintenanceApi.getTodayRecords(),
      ])

      // 언마운트된 경우 상태 업데이트 중단
      if (!isMountedRef.current) return

      if (inProgressRes.data) setInProgressRecords(inProgressRes.data)
      if (todayRes.data) {
        // 완료된 것만 필터링
        setTodayCompletedRecords(todayRes.data.filter((r) => r.status === 'completed'))
      }
    } catch (error) {
      if (!isMountedRef.current) return
      console.error('Failed to fetch data:', error)
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    fetchData()

    // 30초마다 자동 새로고침
    const interval = setInterval(fetchData, 30000)

    return () => {
      isMountedRef.current = false
      clearInterval(interval)
    }
  }, [fetchData])

  // 경과 시간 계산
  const getElapsedTime = (startTime: string): { text: string; isLong: boolean } => {
    const start = new Date(startTime)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffMinutes < 60) {
      return { text: `${diffMinutes}${t('maintenance.minuteUnit')}`, isLong: false }
    }

    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    return {
      text: t('maintenance.hourMinuteFormat', { hours, minutes }),
      isLong: hours >= longRepairThresholdHours,
    }
  }

  // 완료 처리
  const handleComplete = (record: MaintenanceRecord) => {
    setSelectedRecord(record)
    setCompleteForm({
      repair_content: '',
      end_time: new Date().toISOString().slice(0, 16),
      rating: 8,
    })
    setShowCompleteModal(true)
  }

  const handleSubmitComplete = async () => {
    if (!selectedRecord) return

    setSubmitting(true)
    try {
      // Calculate duration
      const startTime = new Date(selectedRecord.start_time)
      const endTime = new Date(completeForm.end_time)
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

      const { data, error } = await maintenanceApi.completeRecord(selectedRecord.id, {
        repair_content: completeForm.repair_content,
        end_time: completeForm.end_time,
        rating: completeForm.rating,
        duration_minutes: durationMinutes,
      })

      if (error) {
        addToast({ type: 'error', title: t('common.error'), message: error })
        return
      }

      if (data) {
        addToast({ type: 'success', title: t('maintenance.repairCompleted'), message: t('maintenance.completedMessage') })
        setShowCompleteModal(false)
        fetchData()
      }
    } catch (error) {
      console.error('Failed to complete maintenance:', error)
      addToast({ type: 'error', title: t('common.error'), message: t('maintenance.failedMessage') })
    } finally {
      setSubmitting(false)
    }
  }

  // 장시간 수리 개수
  const longRepairCount = inProgressRecords.filter((r) => {
    const elapsed = getElapsedTime(r.start_time)
    return elapsed.isLong
  }).length

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
        <h1 className="text-2xl font-bold">{t('nav.maintenanceMonitor')}</h1>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <Wrench className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('maintenance.inProgressRepairs')}</p>
              <p className="text-2xl font-bold">{inProgressRecords.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Clock className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('maintenance.longRepairs')}</p>
              <p className="text-2xl font-bold text-red-600">{longRepairCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('maintenance.todayCompleted')}</p>
              <p className="text-2xl font-bold">{todayCompletedRecords.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* In Progress List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            {t('maintenance.inProgressRepairs')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inProgressRecords.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <p className="mt-2 text-muted-foreground">{t('maintenance.noInProgressRepairs')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {inProgressRecords.map((record) => {
                const elapsed = getElapsedTime(record.start_time)
                const isEmergency = record.repair_type?.code === 'EM'

                return (
                  <div
                    key={record.id}
                    className={`flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 ${
                      isEmergency ? 'border-red-300 bg-red-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          isEmergency ? 'bg-red-100' : 'bg-yellow-100'
                        }`}
                      >
                        {isEmergency ? (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        ) : (
                          <Wrench className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{record.equipment?.equipment_code}</p>
                        <p className="text-sm text-muted-foreground">
                          {getEquipmentName(record.equipment)}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge
                            style={{
                              backgroundColor: record.repair_type?.color || '#gray',
                              color: 'white',
                            }}
                          >
                            {record.repair_type?.code ? getRepairTypeLabel(record.repair_type.code) : ''}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {record.technician?.name}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">{t('maintenance.startTime')}</p>
                        <p className="font-medium">
                          {new Date(record.start_time).toLocaleTimeString(getLocale(), {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">{t('maintenance.elapsedTime')}</p>
                        <p className={`font-medium ${elapsed.isLong ? 'text-red-600' : ''}`}>
                          {elapsed.text}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => handleComplete(record)}>
                        {t('maintenance.completeProcess')}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 금일 완료 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            {t('maintenance.todayCompletedRepairs')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayCompletedRecords.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {t('maintenance.noTodayCompleted')}
            </div>
          ) : (
            <div className="space-y-3">
              {todayCompletedRecords.slice(0, 10).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">{record.equipment?.equipment_code}</p>
                      <p className="text-sm text-muted-foreground">
                        {record.repair_type?.code ? getRepairTypeLabel(record.repair_type.code) : ''} - {record.technician?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('maintenance.durationLabel')}: </span>
                      <span className="font-medium">{record.duration_minutes}{t('maintenance.minuteUnit')}</span>
                    </div>
                    {record.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{record.rating}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 완료 처리 모달 */}
      {showCompleteModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('maintenance.completeModal')}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowCompleteModal(false)}>
                ✕
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="font-medium">{selectedRecord.equipment?.equipment_code}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedRecord.repair_type?.code ? getRepairTypeLabel(selectedRecord.repair_type.code) : ''} - {selectedRecord.technician?.name}
                </p>
                <p className="mt-1 text-sm">
                  {t('maintenance.startLabel')}:{' '}
                  {new Date(selectedRecord.start_time).toLocaleTimeString(getLocale(), {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">{t('maintenance.endTime')}</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={completeForm.end_time}
                  onChange={(e) =>
                    setCompleteForm((prev) => ({ ...prev, end_time: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="repairContent">{t('maintenance.repairContent')}</Label>
                <textarea
                  id="repairContent"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder={t('maintenance.repairContentPlaceholder')}
                  value={completeForm.repair_content}
                  onChange={(e) =>
                    setCompleteForm((prev) => ({ ...prev, repair_content: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>{t('maintenance.ratingLabel')}</Label>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 10 }, (_, i) => (
                    <button
                      key={i + 1}
                      type="button"
                      className={`flex h-8 w-8 items-center justify-center rounded ${
                        completeForm.rating >= i + 1
                          ? 'bg-yellow-400 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                      onClick={() => setCompleteForm((prev) => ({ ...prev, rating: i + 1 }))}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCompleteModal(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSubmitComplete} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common.processing')}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {t('maintenance.completeProcess')}
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
