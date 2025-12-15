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
  Calendar,
  Wrench,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { pmApi } from '@/lib/api'
import type { PMSchedule, PMScheduleStatus, PMPriority } from '@/types'

export default function PMScheduleDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState<PMSchedule | null>(null)

  useEffect(() => {
    if (id) {
      fetchSchedule()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchSchedule = async () => {
    if (!id) return
    setLoading(true)
    try {
      const { data } = await pmApi.getScheduleById(id)
      if (data) {
        setSchedule(data)
      }
    } catch (error) {
      console.error('Failed to fetch schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: PMScheduleStatus) => {
    const variants: Record<PMScheduleStatus, 'default' | 'warning' | 'success' | 'destructive' | 'secondary'> = {
      scheduled: 'default',
      in_progress: 'warning',
      completed: 'success',
      overdue: 'destructive',
      cancelled: 'secondary',
    }
    const labels: Record<PMScheduleStatus, string> = {
      scheduled: t('pm.statusScheduled'),
      in_progress: t('pm.statusInProgress'),
      completed: t('pm.statusCompleted'),
      overdue: t('pm.statusOverdue'),
      cancelled: t('pm.statusCancelled'),
    }
    return <Badge variant={variants[status]}>{labels[status]}</Badge>
  }

  const getPriorityBadge = (priority: PMPriority) => {
    const variants: Record<PMPriority, 'destructive' | 'warning' | 'secondary'> = {
      high: 'destructive',
      medium: 'warning',
      low: 'secondary',
    }
    const labels: Record<PMPriority, string> = {
      high: t('pm.priorityHigh'),
      medium: t('pm.priorityMedium'),
      low: t('pm.priorityLow'),
    }
    return <Badge variant={variants[priority]}>{labels[priority]}</Badge>
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
        <p className="text-lg font-medium">{t('pm.scheduleNotFound')}</p>
        <Button className="mt-4" onClick={() => navigate('/pm/schedules')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('pm.schedules')}
        </Button>
      </div>
    )
  }

  const canStart = schedule.status === 'scheduled' || schedule.status === 'overdue'
  const canEdit = schedule.status === 'scheduled'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/pm/schedules')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t('pm.scheduleDetail')}</h1>
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
                {t('pm.scheduleInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('pm.scheduledDate')}</p>
                  <p className="font-medium">{schedule.scheduled_date}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('pm.template')}</p>
                  <p className="font-medium">{schedule.template?.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('pm.estimatedDuration')}</p>
                  <p className="font-medium">{schedule.template?.estimated_duration} {t('pm.minutes')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('pm.assignedTechnician')}</p>
                  <p className="font-medium">{schedule.assigned_technician?.name || '-'}</p>
                </div>
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

          {/* Checklist Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                {t('pm.checklist')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {schedule.template?.checklist_items.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('pm.noChecklistItems')}</p>
              ) : (
                <div className="space-y-2">
                  {schedule.template?.checklist_items.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm">{item.description}</p>
                        {item.is_required && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {t('pm.required')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                  onClick={() => navigate(`/pm/execution?schedule=${schedule.id}`)}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {t('pm.startPM')}
                </Button>
              )}
              {canEdit && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/pm/schedules/${schedule.id}/edit`)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  {t('pm.editSchedule')}
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/pm/schedules')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('pm.schedules')}
              </Button>
            </CardContent>
          </Card>

          {/* Required Parts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wrench className="h-5 w-5" />
                {t('pm.requiredParts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {schedule.template?.required_parts.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('maintenance.noUsedParts')}</p>
              ) : (
                <div className="space-y-2">
                  {schedule.template?.required_parts.map((part, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-2 rounded border p-2"
                    >
                      <div className="flex-1 min-w-0">
                        {part.part_code && (
                          <p className="font-mono text-xs text-muted-foreground">{part.part_code}</p>
                        )}
                        <p className="text-sm truncate">{part.part_name}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0">{part.quantity}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
