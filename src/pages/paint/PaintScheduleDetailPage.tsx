import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Play,
  Edit,
  Trash2,
  Calendar,
  Wrench,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Clock,
  CircleCheck,
  CircleDashed,
  SkipForward,
} from 'lucide-react'
import { paintApi } from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import type {
  PaintSchedule,
  PaintScheduleStatus,
  PaintPriority,
  PaintStepStatus,
  PaintStepExecution,
  PaintChecklistStep,
} from '@/types'

export default function PaintScheduleDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { id } = useParams<{ id: string }>()

  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState<PaintSchedule | null>(null)
  const [checklistSteps, setChecklistSteps] = useState<PaintChecklistStep[]>([])
  const [stepExecutions, setStepExecutions] = useState<PaintStepExecution[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (id) {
      fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchData = async () => {
    if (!id) return
    setLoading(true)
    try {
      // Fetch schedule with step executions
      const { data: scheduleData } = await paintApi.getScheduleWithSteps(id)
      if (scheduleData) {
        setSchedule(scheduleData)
        setStepExecutions(scheduleData.step_executions || [])
      }

      // Fetch checklist steps master data
      const { data: stepsData } = await paintApi.getChecklistSteps()
      if (stepsData) {
        setChecklistSteps(stepsData)
      }
    } catch (error) {
      console.error('Failed to fetch schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    try {
      const { success, error } = await paintApi.deleteSchedule(id)
      if (success) {
        addToast({
          type: 'success',
          title: t('paint.deleteSchedule'),
          message: t('common.success'),
        })
        navigate('/paint/schedules')
      } else {
        addToast({
          type: 'error',
          title: t('common.error'),
          message: error || t('common.unknownError'),
        })
      }
    } catch (error) {
      console.error('Failed to delete schedule:', error)
      addToast({
        type: 'error',
        title: t('common.error'),
        message: t('common.unknownError'),
      })
    } finally {
      setDeleting(false)
      setDeleteConfirm(false)
    }
  }

  const getStatusBadge = (status: PaintScheduleStatus) => {
    const variants: Record<PaintScheduleStatus, 'default' | 'warning' | 'success' | 'destructive' | 'secondary'> = {
      scheduled: 'default',
      in_progress: 'warning',
      completed: 'success',
      cancelled: 'secondary',
      paused: 'secondary',
    }
    const labels: Record<PaintScheduleStatus, string> = {
      scheduled: t('paint.statusScheduled'),
      in_progress: t('paint.statusInProgress'),
      completed: t('paint.statusCompleted'),
      cancelled: t('paint.statusCancelled'),
      paused: t('paint.statusCancelled'),
    }
    return <Badge variant={variants[status]}>{labels[status]}</Badge>
  }

  const getPriorityBadge = (priority: PaintPriority) => {
    const variants: Record<PaintPriority, 'destructive' | 'warning' | 'secondary'> = {
      high: 'destructive',
      medium: 'warning',
      low: 'secondary',
    }
    const labels: Record<PaintPriority, string> = {
      high: t('paint.priorityHigh'),
      medium: t('paint.priorityMedium'),
      low: t('paint.priorityLow'),
    }
    return <Badge variant={variants[priority]}>{labels[priority]}</Badge>
  }

  const getStepStatusIcon = (status: PaintStepStatus) => {
    switch (status) {
      case 'completed':
        return <CircleCheck className="h-5 w-5 text-green-500" />
      case 'in_progress':
        return <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />
      case 'skipped':
        return <SkipForward className="h-5 w-5 text-gray-400" />
      default:
        return <CircleDashed className="h-5 w-5 text-gray-300" />
    }
  }

  const getStepStatusBadge = (status: PaintStepStatus) => {
    const variants: Record<PaintStepStatus, 'default' | 'warning' | 'success' | 'secondary'> = {
      pending: 'default',
      in_progress: 'warning',
      completed: 'success',
      skipped: 'secondary',
    }
    const labels: Record<PaintStepStatus, string> = {
      pending: t('paint.stepPending'),
      in_progress: t('paint.stepInProgress'),
      completed: t('paint.stepCompleted'),
      skipped: t('paint.stepSkipped'),
    }
    return <Badge variant={variants[status]} className="text-xs">{labels[status]}</Badge>
  }

  const getStepName = (step: PaintChecklistStep) => {
    const lang = i18n.language
    if (lang === 'vi' && step.name_vi) return step.name_vi
    if (lang === 'ko' && step.name_ko) return step.name_ko
    return step.name
  }

  const getStepExecution = (stepOrder: number): PaintStepExecution | undefined => {
    return stepExecutions.find(e => e.step_order === stepOrder)
  }

  const calculateProgress = () => {
    if (checklistSteps.length === 0) return 0
    const completedSteps = stepExecutions.filter(
      e => e.status === 'completed' || e.status === 'skipped'
    ).length
    return Math.round((completedSteps / checklistSteps.length) * 100)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertTriangle className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">{t('paint.scheduleNotFound')}</p>
        <Button className="mt-4" onClick={() => navigate('/paint/schedules')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('paint.schedules')}
        </Button>
      </div>
    )
  }

  const canStart = schedule.status === 'scheduled'
  const canContinue = schedule.status === 'in_progress'
  const canEdit = schedule.status === 'scheduled'
  const canDelete = schedule.status === 'scheduled'
  const progress = calculateProgress()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/paint/schedules')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t('paint.viewDetail')}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {schedule.equipment?.equipment_code} - {schedule.equipment?.equipment_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 pl-12 sm:pl-0">
          {getStatusBadge(schedule.status)}
          {getPriorityBadge(schedule.priority)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Schedule Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t('paint.scheduleInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('paint.scheduledDate')}</p>
                  <p className="font-medium">{schedule.scheduled_date}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('paint.expectedEndDate')}</p>
                  <p className="font-medium">{schedule.expected_end_date || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('paint.template')}</p>
                  <p className="font-medium">{schedule.template?.name || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('paint.assignedTechnician')}</p>
                  <p className="font-medium">{schedule.assigned_technician?.name || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('paint.currentStep')}</p>
                  <p className="font-medium">
                    {schedule.current_step === 0
                      ? t('paint.notStarted')
                      : t('paint.stepOf', { current: schedule.current_step, total: 6 })}
                  </p>
                </div>
                {schedule.notes && (
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-sm text-muted-foreground">{t('paint.notes')}</p>
                    <p className="font-medium whitespace-pre-wrap">{schedule.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Equipment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                {t('equipment.info')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('equipment.equipmentCode')}</p>
                  <p className="font-medium">{schedule.equipment?.equipment_code}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('equipment.equipmentName')}</p>
                  <p className="font-medium">{schedule.equipment?.equipment_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('equipment.building')}</p>
                  <p className="font-medium">{schedule.equipment?.building || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('equipment.status')}</p>
                  <p className="font-medium">{schedule.equipment?.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 6-Step Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  {t('paint.checklist')}
                </div>
                <span className="text-sm font-normal text-muted-foreground">
                  {t('paint.progressPercent', { percent: progress })}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                {checklistSteps.map((step) => {
                  const execution = getStepExecution(step.step_order)
                  const status: PaintStepStatus = execution?.status || 'pending'

                  return (
                    <div
                      key={step.id}
                      className={`flex items-start gap-3 rounded-lg border p-3 ${
                        status === 'in_progress' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' : ''
                      } ${status === 'completed' ? 'border-green-500/50 bg-green-50 dark:bg-green-950/20' : ''}`}
                    >
                      {getStepStatusIcon(status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {step.step_order}
                          </span>
                          <p className="text-sm font-medium">{getStepName(step)}</p>
                          {getStepStatusBadge(status)}
                        </div>
                        {execution?.started_at && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t('paint.startedAt')}: {new Date(execution.started_at).toLocaleString()}
                          </p>
                        )}
                        {execution?.completed_at && (
                          <p className="text-xs text-muted-foreground">
                            {t('common.completedAt')}: {new Date(execution.completed_at).toLocaleString()}
                          </p>
                        )}
                        {execution?.technician && (
                          <p className="text-xs text-muted-foreground">
                            {t('paint.assignedTechnician')}: {execution.technician.name}
                          </p>
                        )}
                        {execution?.notes && (
                          <p className="mt-1 text-xs text-muted-foreground italic">
                            {execution.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('common.actions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {canStart && (
                <Button
                  className="w-full"
                  onClick={() => navigate(`/paint/execution?schedule=${schedule.id}`)}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {t('paint.startPaint')}
                </Button>
              )}
              {canContinue && (
                <Button
                  className="w-full"
                  onClick={() => navigate(`/paint/execution?schedule=${schedule.id}`)}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {t('paint.continuePaint')}
                </Button>
              )}
              {canEdit && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/paint/schedules/${schedule.id}/edit`)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  {t('paint.editSchedule')}
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setDeleteConfirm(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('paint.deleteSchedule')}
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/paint/schedules')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('paint.schedules')}
              </Button>
            </CardContent>
          </Card>

          {/* Estimated Duration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                {t('paint.estimatedDuration')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {checklistSteps.map((step) => (
                  <div
                    key={step.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate">{step.step_order}. {getStepName(step)}</span>
                    <span className="text-muted-foreground shrink-0">
                      {step.estimated_duration_hours}h
                    </span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex items-center justify-between font-medium">
                  <span>{t('common.total')}</span>
                  <span>
                    {checklistSteps.reduce((sum, step) => sum + step.estimated_duration_hours, 0)}h
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <Card className="w-full sm:max-w-md mx-0 sm:mx-4 rounded-b-none sm:rounded-b-lg">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold mb-2">{t('paint.deleteSchedule')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('paint.deleteScheduleConfirm')}
              </p>
              {schedule && (
                <div className="bg-muted p-3 rounded-md mb-4 text-xs sm:text-sm space-y-1">
                  <p><strong>{t('equipment.equipmentCode')}:</strong> {schedule.equipment?.equipment_code}</p>
                  <p><strong>{t('paint.scheduledDate')}:</strong> {schedule.scheduled_date}</p>
                </div>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(false)}
                  disabled={deleting}
                  className="w-full sm:w-auto"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full sm:w-auto"
                >
                  {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
