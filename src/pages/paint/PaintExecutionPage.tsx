import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle,
  AlertTriangle,
  Play,
  ArrowLeft,
  Clock,
  Paintbrush,
  Loader2,
  Circle,
  CheckCircle2,
  SkipForward,
  CircleDot,
} from 'lucide-react'
import { paintApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/components/ui/toast'
import type { PaintSchedule, PaintExecution, Equipment, PaintChecklistStep, PaintStepExecution } from '@/types'

export default function PaintExecutionPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const scheduleId = searchParams.get('schedule')
  const { user } = useAuthStore()
  const { addToast } = useToast()

  // Multilingual helpers
  const getEquipmentName = (eq: Equipment | undefined) => {
    if (!eq) return '-'
    if (i18n.language === 'vi') return eq.equipment_name_vi || eq.equipment_name
    return eq.equipment_name_ko || eq.equipment_name
  }

  const getStepName = (step: PaintChecklistStep | undefined) => {
    if (!step) return '-'
    if (i18n.language === 'vi') return step.name_vi || step.name
    return step.name_ko || step.name
  }

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [schedule, setSchedule] = useState<PaintSchedule | null>(null)
  const [execution, setExecution] = useState<PaintExecution | null>(null)
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState<number>(8)

  // Checklist state
  const [checklistSteps, setChecklistSteps] = useState<PaintChecklistStep[]>([])
  const [stepExecutions, setStepExecutions] = useState<PaintStepExecution[]>([])
  const [stepNotes, setStepNotes] = useState<Record<number, string>>({})

  // Helper function to parse date with robust timezone handling
  const parseDateTime = (dateStr: string): Date => {
    if (dateStr.includes('Z') || dateStr.includes('+') || (dateStr.includes('-') && dateStr.lastIndexOf('-') > 9)) {
      return new Date(dateStr)
    }
    const cleanedStr = dateStr.replace(' ', 'T').slice(0, 16)
    const [datePart, timePart] = cleanedStr.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hour, minute] = (timePart || '00:00').split(':').map(Number)
    return new Date(year, month - 1, day, hour, minute)
  }

  // Calculate elapsed minutes with proper timezone handling
  const getElapsedMinutes = (startedAt: string): number => {
    const startTime = parseDateTime(startedAt)
    const elapsed = Math.floor((Date.now() - startTime.getTime()) / 60000)
    return elapsed >= 0 ? elapsed : 0
  }

  // Calculate progress percentage
  const getProgressPercent = (): number => {
    if (stepExecutions.length === 0) return 0
    const completed = stepExecutions.filter(se => se.status === 'completed' || se.status === 'skipped').length
    return Math.round((completed / 6) * 100)
  }

  // Get completed steps count
  const getCompletedCount = (): number => {
    return stepExecutions.filter(se => se.status === 'completed' || se.status === 'skipped').length
  }

  // Get current active step
  const getCurrentStepOrder = (): number => {
    // Find first step that is not completed/skipped
    const pendingStep = stepExecutions
      .sort((a, b) => a.step_order - b.step_order)
      .find(se => se.status === 'pending' || se.status === 'in_progress')
    return pendingStep?.step_order || 0
  }

  const fetchData = useCallback(async () => {
    if (!scheduleId) return
    setLoading(true)
    try {
      // Fetch checklist steps (master data)
      const { data: stepsData } = await paintApi.getChecklistSteps()
      if (stepsData) {
        setChecklistSteps(stepsData)
      }

      // Fetch schedule with step executions
      const { data: scheduleData } = await paintApi.getScheduleWithSteps(scheduleId)
      if (scheduleData) {
        setSchedule(scheduleData)
        if (scheduleData.step_executions) {
          setStepExecutions(scheduleData.step_executions)
        }

        // Check if execution already exists
        const { data: existingExecution } = await paintApi.getExecutionBySchedule(scheduleId)
        if (existingExecution) {
          const exec = existingExecution as PaintExecution
          setExecution(exec)
          if (exec.notes) setNotes(exec.notes)
          if (exec.rating) setRating(exec.rating)
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }, [scheduleId])

  useEffect(() => {
    if (scheduleId) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [scheduleId, fetchData])

  const handleStartPaint = async () => {
    if (!scheduleId || !user) return
    setSaving(true)
    try {
      // Start execution
      const { data, error } = await paintApi.startExecution(scheduleId, user.id)
      if (error) {
        addToast({ type: 'error', title: t('common.error'), message: error })
        return
      }
      if (data) {
        setExecution(data as PaintExecution)

        // Initialize step executions
        await paintApi.initializeStepExecutions(scheduleId)

        // Refresh data
        await fetchData()

        addToast({ type: 'success', title: t('paint.startPaint'), message: t('common.success') })
      }
    } catch (error) {
      console.error('Failed to start Paint:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleStartStep = async (stepOrder: number) => {
    if (!scheduleId || !user) return
    setSaving(true)
    try {
      const { error } = await paintApi.startStep(scheduleId, stepOrder, user.id)
      if (error) {
        addToast({ type: 'error', title: t('common.error'), message: error })
        return
      }
      await fetchData()
      addToast({ type: 'success', title: t('paint.startStep'), message: t('common.success') })
    } catch (error) {
      console.error('Failed to start step:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCompleteStep = async (stepExecution: PaintStepExecution) => {
    if (!stepExecution) return
    setSaving(true)
    try {
      const stepNote = stepNotes[stepExecution.step_order] || ''
      const { error } = await paintApi.completeStep(stepExecution.id, stepNote)
      if (error) {
        addToast({ type: 'error', title: t('common.error'), message: error })
        return
      }

      // Clear step notes
      setStepNotes(prev => ({ ...prev, [stepExecution.step_order]: '' }))

      await fetchData()
      addToast({ type: 'success', title: t('paint.completeStep'), message: t('common.success') })

      // Check if all steps are completed (step 6 completed)
      if (stepExecution.step_order === 6) {
        // All steps done, schedule should be completed automatically
        addToast({ type: 'success', title: t('paint.completePaint'), message: t('paint.allStepsCompleted') })
        setTimeout(() => navigate('/paint'), 1500)
      }
    } catch (error) {
      console.error('Failed to complete step:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSkipStep = async (stepOrder: number) => {
    if (!scheduleId) return
    setSaving(true)
    try {
      const stepNote = stepNotes[stepOrder] || ''
      const { error } = await paintApi.skipStep(scheduleId, stepOrder, stepNote)
      if (error) {
        addToast({ type: 'error', title: t('common.error'), message: error })
        return
      }

      // Clear step notes
      setStepNotes(prev => ({ ...prev, [stepOrder]: '' }))

      await fetchData()
      addToast({ type: 'success', title: t('paint.skipStep'), message: t('common.success') })
    } catch (error) {
      console.error('Failed to skip step:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCompletePaint = async () => {
    if (!execution) return

    setSaving(true)
    try {
      const { data, error } = await paintApi.completeExecution(execution.id, {
        notes,
        rating,
      })

      if (error) {
        addToast({ type: 'error', title: t('common.error'), message: error })
        return
      }

      if (data) {
        addToast({ type: 'success', title: t('paint.completePaint'), message: t('common.success') })
        navigate('/paint')
      }
    } catch (error) {
      console.error('Failed to complete Paint:', error)
      addToast({ type: 'error', title: t('common.error'), message: t('common.error') })
    } finally {
      setSaving(false)
    }
  }

  // Get step status icon
  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'in_progress':
        return <CircleDot className="h-5 w-5 text-blue-500 animate-pulse" />
      case 'skipped':
        return <SkipForward className="h-5 w-5 text-gray-400" />
      default:
        return <Circle className="h-5 w-5 text-gray-300" />
    }
  }

  // Get step status badge
  const getStepStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">{t('paint.stepCompleted')}</Badge>
      case 'in_progress':
        return <Badge variant="warning">{t('paint.stepInProgress')}</Badge>
      case 'skipped':
        return <Badge variant="secondary">{t('paint.stepSkipped')}</Badge>
      default:
        return <Badge variant="outline">{t('paint.stepPending')}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!scheduleId) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Paintbrush className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">{t('paint.selectScheduleToStart')}</p>
        <p className="mt-2 text-muted-foreground">{t('paint.selectScheduleToStartDesc')}</p>
        <div className="mt-6 flex gap-4">
          <Button variant="outline" onClick={() => navigate('/paint/schedules')}>
            {t('paint.schedules')}
          </Button>
          <Button onClick={() => navigate('/paint')}>
            {t('paint.dashboard')}
          </Button>
        </div>
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertTriangle className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">{t('paint.scheduleNotFound')}</p>
        <Button className="mt-4" onClick={() => navigate('/paint')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('paint.dashboard')}
        </Button>
      </div>
    )
  }

  // Check if schedule is overdue
  const today = new Date().toISOString().split('T')[0]
  const isOverdue = schedule.scheduled_date < today &&
                    (schedule.status === 'scheduled' || schedule.status === 'in_progress')

  const progressPercent = getProgressPercent()
  const completedCount = getCompletedCount()
  const currentStepOrder = getCurrentStepOrder()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t('paint.execution')}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {schedule.equipment?.equipment_code} - {getEquipmentName(schedule.equipment)}
            </p>
          </div>
        </div>
        <Badge
          variant={
            isOverdue
              ? 'destructive'
              : schedule.status === 'in_progress'
              ? 'warning'
              : schedule.status === 'completed'
              ? 'success'
              : 'outline'
          }
          className="text-base"
        >
          {isOverdue
            ? t('paint.statusOverdue')
            : schedule.status === 'completed'
            ? t('paint.statusCompleted')
            : schedule.status === 'in_progress'
            ? t('paint.statusInProgress')
            : t('paint.statusScheduled')}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Paint Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paintbrush className="h-5 w-5" />
                {t('paint.paintInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('equipment.equipmentCode')}:</span>
                  <span className="ml-2 font-medium">{schedule.equipment?.equipment_code}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('equipment.equipmentName')}:</span>
                  <span className="ml-2 font-medium">{getEquipmentName(schedule.equipment)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('paint.scheduledDate')}:</span>
                  <span className="ml-2 font-medium">{schedule.scheduled_date}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('paint.assignedTechnician')}:</span>
                  <span className="ml-2 font-medium">{schedule.assigned_technician?.name || user?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('paint.priority')}:</span>
                  <Badge
                    variant={
                      schedule.priority === 'high'
                        ? 'destructive'
                        : schedule.priority === 'medium'
                        ? 'warning'
                        : 'secondary'
                    }
                    className="ml-2"
                  >
                    {t(`paint.priority${schedule.priority.charAt(0).toUpperCase() + schedule.priority.slice(1)}`)}
                  </Badge>
                </div>
                {schedule.template && (
                  <div>
                    <span className="text-muted-foreground">{t('paint.template')}:</span>
                    <span className="ml-2 font-medium">
                      {i18n.language === 'vi'
                        ? schedule.template.name_vi || schedule.template.name
                        : schedule.template.name_ko || schedule.template.name}
                    </span>
                  </div>
                )}
              </div>

              {schedule.notes && (
                <div className="pt-2 border-t">
                  <span className="text-sm text-muted-foreground">{t('paint.paintNotes')}:</span>
                  <p className="mt-1 text-sm">{schedule.notes}</p>
                </div>
              )}

              {/* Start Button - only show if not started */}
              {!execution && schedule.status === 'scheduled' && (
                <Button className="w-full" size="lg" onClick={handleStartPaint} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-5 w-5" />
                  )}
                  {t('paint.startPaint')}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Checklist Section */}
          {(execution || schedule.status === 'in_progress') && stepExecutions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    {t('paint.checklist')}
                  </span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {t('paint.progressPercent', { percent: progressPercent })} ({completedCount}/6)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <Progress value={progressPercent} className="h-3" />
                </div>

                {/* Step List */}
                <div className="space-y-3">
                  {stepExecutions
                    .sort((a, b) => a.step_order - b.step_order)
                    .map((stepExec) => {
                      const stepData = checklistSteps.find(s => s.id === stepExec.step_id)
                      const isCurrentStep = stepExec.step_order === currentStepOrder
                      const canStart = stepExec.status === 'pending' &&
                        (stepExec.step_order === 1 ||
                         stepExecutions.find(se => se.step_order === stepExec.step_order - 1)?.status === 'completed' ||
                         stepExecutions.find(se => se.step_order === stepExec.step_order - 1)?.status === 'skipped')

                      return (
                        <div
                          key={stepExec.id}
                          className={`rounded-lg border p-4 ${
                            isCurrentStep ? 'border-primary bg-primary/5' : ''
                          } ${stepExec.status === 'completed' ? 'bg-green-50 dark:bg-green-950/20' : ''}
                          ${stepExec.status === 'skipped' ? 'bg-gray-50 dark:bg-gray-900/20' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              {getStepIcon(stepExec.status)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">
                                    {stepExec.step_order}. {getStepName(stepData)}
                                  </span>
                                  {getStepStatusBadge(stepExec.status)}
                                </div>
                                {stepData?.estimated_duration_hours && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {t('paint.estimatedDuration')}: {stepData.estimated_duration_hours}h
                                  </p>
                                )}
                                {stepExec.started_at && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {t('paint.startedAt')}: {new Date(stepExec.started_at).toLocaleString()}
                                  </p>
                                )}
                                {stepExec.completed_at && (
                                  <p className="text-xs text-muted-foreground">
                                    {t('paint.completedAt')}: {new Date(stepExec.completed_at).toLocaleString()}
                                  </p>
                                )}
                                {stepExec.notes && (
                                  <p className="text-sm mt-2 p-2 bg-muted rounded">
                                    {stepExec.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action buttons for current step */}
                          {(stepExec.status === 'pending' || stepExec.status === 'in_progress') && (
                            <div className="mt-4 space-y-3">
                              {/* Notes input */}
                              <div>
                                <Input
                                  placeholder={t('paint.stepNotesPlaceholder')}
                                  value={stepNotes[stepExec.step_order] || ''}
                                  onChange={(e) => setStepNotes(prev => ({
                                    ...prev,
                                    [stepExec.step_order]: e.target.value
                                  }))}
                                />
                              </div>
                              <div className="flex gap-2">
                                {stepExec.status === 'pending' && canStart && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStartStep(stepExec.step_order)}
                                    disabled={saving}
                                  >
                                    {saving ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <Play className="mr-2 h-4 w-4" />
                                    )}
                                    {t('paint.startStep')}
                                  </Button>
                                )}
                                {stepExec.status === 'in_progress' && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleCompleteStep(stepExec)}
                                    disabled={saving}
                                  >
                                    {saving ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                    )}
                                    {t('paint.completeStep')}
                                  </Button>
                                )}
                                {(stepExec.status === 'pending' || stepExec.status === 'in_progress') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSkipStep(stepExec.step_order)}
                                    disabled={saving}
                                  >
                                    <SkipForward className="mr-2 h-4 w-4" />
                                    {t('paint.skipStep')}
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes & Rating - Only show when all steps completed */}
          {execution && schedule.status === 'completed' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('paint.workDetails')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('paint.paintNotes')}</Label>
                  <textarea
                    className="w-full rounded-md border p-3 text-sm bg-background"
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('paint.paintNotesPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('paint.rating')} (1-10)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={rating}
                      onChange={(e) => setRating(Number(e.target.value))}
                      className="w-24"
                    />
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <Button
                          key={num}
                          variant={rating === num ? 'default' : 'outline'}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setRating(num)}
                        >
                          {num}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Execution Timer */}
          {execution && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" />
                  {t('paint.duration')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">
                  {execution.started_at
                    ? `${getElapsedMinutes(execution.started_at)} ${t('paint.minutes')}`
                    : '-'}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('paint.startedAt')}: {execution.started_at ? new Date(execution.started_at).toLocaleTimeString() : '-'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Progress Summary Card */}
          {stepExecutions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle className="h-5 w-5" />
                  {t('paint.stepProgress')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-primary">{progressPercent}%</p>
                    <p className="text-sm text-muted-foreground">
                      {completedCount}/6 {t('paint.stepsCompleted')}
                    </p>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                  {currentStepOrder > 0 && currentStepOrder <= 6 && (
                    <p className="text-sm text-center">
                      {t('paint.currentStep')}: {t(`paint.step${currentStepOrder}`)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Paintbrush className="h-5 w-5" />
                {t('equipment.status')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('paint.currentStatus')}:</span>
                  <Badge
                    variant={
                      isOverdue
                        ? 'destructive'
                        : schedule.status === 'completed'
                        ? 'success'
                        : schedule.status === 'in_progress'
                        ? 'warning'
                        : 'outline'
                    }
                  >
                    {isOverdue
                      ? t('paint.statusOverdue')
                      : schedule.status === 'completed'
                      ? t('paint.statusCompleted')
                      : schedule.status === 'in_progress'
                      ? t('paint.statusInProgress')
                      : t('paint.statusScheduled')}
                  </Badge>
                </div>
                {execution && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('paint.executionStatus')}:</span>
                    <Badge variant={execution.status === 'completed' ? 'success' : 'warning'}>
                      {execution.status === 'completed'
                        ? t('paint.statusCompleted')
                        : t('paint.statusInProgress')}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons - Manual complete (fallback) */}
          {execution && execution.status !== 'completed' && progressPercent === 100 && (
            <div className="space-y-2">
              <Button
                className="w-full"
                size="lg"
                onClick={handleCompletePaint}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                {t('paint.completePaint')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
