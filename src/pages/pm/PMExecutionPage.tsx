import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  CheckCircle,
  AlertTriangle,
  Play,
  Save,
  ArrowLeft,
  Clock,
  Wrench,
  Loader2,
} from 'lucide-react'
import { pmApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/components/ui/toast'
import type { PMSchedule, PMExecution, PMChecklistResult } from '@/types'

export default function PMExecutionPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const scheduleId = searchParams.get('schedule')
  const { user } = useAuthStore()
  const { addToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [schedule, setSchedule] = useState<PMSchedule | null>(null)
  const [execution, setExecution] = useState<PMExecution | null>(null)
  const [checklistResults, setChecklistResults] = useState<PMChecklistResult[]>([])
  const [findings, setFindings] = useState('')
  const [findingsSeverity, setFindingsSeverity] = useState<'none' | 'minor' | 'major' | 'critical'>('none')
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState<number>(8)

  // Issue confirmation dialog state
  const [issueDialogOpen, setIssueDialogOpen] = useState(false)
  const [pendingIssueItem, setPendingIssueItem] = useState<{
    itemId: string
    description: string
    inspectionArea?: string
  } | null>(null)

  // Helper function to parse date with robust timezone handling
  const parseDateTime = (dateStr: string): Date => {
    // If has timezone info (Z or +/-), parse directly
    if (dateStr.includes('Z') || dateStr.includes('+') || (dateStr.includes('-') && dateStr.lastIndexOf('-') > 9)) {
      return new Date(dateStr)
    }
    // Parse as local time components
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

  useEffect(() => {
    if (scheduleId) {
      fetchData()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId])

  const fetchData = async () => {
    if (!scheduleId) return
    setLoading(true)
    try {
      const { data: scheduleData } = await pmApi.getScheduleById(scheduleId)
      if (scheduleData) {
        setSchedule(scheduleData)

        // Initialize checklist results from template
        if (scheduleData.template?.checklist_items) {
          setChecklistResults(
            scheduleData.template.checklist_items.map((item) => ({
              item_id: item.id,
              is_checked: false,
              has_issue: false,
            }))
          )
        }

        // Check if execution already exists
        const { data: existingExecution } = await pmApi.getExecutionBySchedule(scheduleId)
        if (existingExecution) {
          const exec = existingExecution as PMExecution
          setExecution(exec)
          // Only use saved checklist_results if it has items, otherwise keep template-initialized results
          if (exec.checklist_results && exec.checklist_results.length > 0) {
            setChecklistResults(exec.checklist_results)
          }
          if (exec.findings) setFindings(exec.findings)
          if (exec.findings_severity) setFindingsSeverity(exec.findings_severity)
          if (exec.notes) setNotes(exec.notes)
          if (exec.rating) setRating(exec.rating)
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartPM = async () => {
    if (!scheduleId || !user) return
    setSaving(true)
    try {
      const { data, error } = await pmApi.startExecution(scheduleId, user.id)
      if (error) {
        addToast({ type: 'error', title: t('common.error'), message: error })
        return
      }
      if (data) {
        setExecution(data as PMExecution)
        // Refresh schedule
        const { data: updatedSchedule } = await pmApi.getScheduleById(scheduleId)
        if (updatedSchedule) setSchedule(updatedSchedule)
      }
    } catch (error) {
      console.error('Failed to start PM:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleChecklistChange = (itemId: string, checked: boolean) => {
    setChecklistResults((prev) =>
      prev.map((result) =>
        result.item_id === itemId ? { ...result, is_checked: checked } : result
      )
    )
  }

  const handleIssueChange = (itemId: string, hasIssue: boolean, item?: { description: string; inspection_area?: string }) => {
    if (hasIssue && item) {
      // Open confirmation dialog before marking as issue
      setPendingIssueItem({
        itemId,
        description: item.description,
        inspectionArea: item.inspection_area,
      })
      setIssueDialogOpen(true)
    } else {
      // Uncheck issue - just update state
      setChecklistResults((prev) =>
        prev.map((result) =>
          result.item_id === itemId ? { ...result, has_issue: false } : result
        )
      )
    }
  }

  const confirmIssueAndCreateRepair = () => {
    if (!pendingIssueItem || !schedule) return

    // Mark the item as having an issue
    setChecklistResults((prev) =>
      prev.map((result) =>
        result.item_id === pendingIssueItem.itemId ? { ...result, has_issue: true } : result
      )
    )

    // Close dialog
    setIssueDialogOpen(false)

    // Build symptom from inspection area and description
    const symptom = pendingIssueItem.inspectionArea
      ? `[${pendingIssueItem.inspectionArea}] ${pendingIssueItem.description}`
      : pendingIssueItem.description

    // Navigate to maintenance input with PM context
    navigate(`/maintenance/input?from_pm=${schedule.id}&equipment=${schedule.equipment_id}&symptom=${encodeURIComponent(symptom)}`)
  }

  const cancelIssueDialog = () => {
    setIssueDialogOpen(false)
    setPendingIssueItem(null)
  }

  const handleSaveProgress = async () => {
    if (!execution) return
    setSaving(true)
    try {
      await pmApi.updateExecution(execution.id, {
        checklist_results: checklistResults,
        findings,
        findings_severity: findingsSeverity,
        notes,
      })
      addToast({ type: 'success', title: t('common.success'), message: t('pm.progressSaved') })
    } catch (error) {
      console.error('Failed to save progress:', error)
      addToast({ type: 'error', title: t('common.error'), message: t('common.error') })
    } finally {
      setSaving(false)
    }
  }

  const handleCompletePM = async () => {
    if (!execution) return

    // Check if all required items are checked
    const requiredItems = schedule?.template?.checklist_items.filter((item) => item.is_required) || []
    const uncheckedRequired = requiredItems.filter(
      (item) => !checklistResults.find((r) => r.item_id === item.id)?.is_checked
    )

    if (uncheckedRequired.length > 0) {
      addToast({
        type: 'warning',
        title: t('pm.checklist'),
        message: t('pm.requiredItemsNotChecked')
      })
      return
    }

    setSaving(true)
    try {
      const { data, error } = await pmApi.completeExecution(execution.id, {
        checklist_results: checklistResults,
        used_parts: schedule?.template?.required_parts || [],
        findings,
        findings_severity: findingsSeverity,
        rating,
        notes,
      })

      if (error) {
        addToast({ type: 'error', title: t('common.error'), message: error })
        return
      }

      if (data) {
        addToast({ type: 'success', title: t('pm.completePM'), message: t('common.success') })
        navigate('/pm')
      }
    } catch (error) {
      console.error('Failed to complete PM:', error)
      addToast({ type: 'error', title: t('common.error'), message: t('common.error') })
    } finally {
      setSaving(false)
    }
  }

  const hasIssues = checklistResults.some((r) => r.has_issue)
  const completedItems = checklistResults.filter((r) => r.is_checked).length
  const totalItems = checklistResults.length
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

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
        <Play className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">{t('pm.selectScheduleToStart')}</p>
        <p className="mt-2 text-muted-foreground">{t('pm.selectScheduleToStartDesc')}</p>
        <div className="mt-6 flex gap-4">
          <Button variant="outline" onClick={() => navigate('/pm/schedules')}>
            {t('pm.schedules')}
          </Button>
          <Button onClick={() => navigate('/pm/calendar')}>
            {t('pm.calendar')}
          </Button>
        </div>
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertTriangle className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">{t('pm.scheduleNotFound')}</p>
        <Button className="mt-4" onClick={() => navigate('/pm')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('pm.dashboard')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t('pm.execution')}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {schedule.equipment?.equipment_code} - {schedule.equipment?.equipment_name}
            </p>
          </div>
        </div>
        <Badge
          variant={
            schedule.status === 'in_progress'
              ? 'warning'
              : schedule.status === 'overdue'
              ? 'destructive'
              : 'outline'
          }
          className="text-base"
        >
          {schedule.status === 'in_progress'
            ? t('pm.statusInProgress')
            : schedule.status === 'overdue'
            ? t('pm.statusOverdue')
            : t('pm.statusScheduled')}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* PM Info */}
          <Card>
            <CardHeader>
              <CardTitle>{schedule.template?.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('pm.scheduledDate')}:</span>
                  <span className="ml-2 font-medium">{schedule.scheduled_date}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('pm.estimatedDuration')}:</span>
                  <span className="ml-2 font-medium">{schedule.template?.estimated_duration} {t('pm.minutes')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('pm.assignedTechnician')}:</span>
                  <span className="ml-2 font-medium">{schedule.assigned_technician?.name || user?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('pm.priority')}:</span>
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
                    {t(`pm.priority${schedule.priority.charAt(0).toUpperCase() + schedule.priority.slice(1)}`)}
                  </Badge>
                </div>
              </div>

              {/* Start Button */}
              {!execution && (
                <Button className="w-full" size="lg" onClick={handleStartPM} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-5 w-5" />
                  )}
                  {t('pm.startPM')}
                </Button>
              )}

              {/* Progress */}
              {execution && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{t('pm.checklistExecution')}</span>
                    <span className="font-medium">{progressPercent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Checklist */}
          {execution && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  {t('pm.checklist')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {schedule.template?.checklist_items.map((item, index) => {
                    const result = checklistResults.find((r) => r.item_id === item.id)
                    return (
                      <div
                        key={item.id}
                        className={`rounded-lg border p-4 ${
                          result?.has_issue ? 'border-red-300 bg-red-50' : ''
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                          <div
                            className="flex items-center gap-3 flex-1 cursor-pointer min-h-[44px]"
                            onClick={(e) => {
                              e.preventDefault()
                              handleChecklistChange(item.id, !result?.is_checked)
                            }}
                          >
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={result?.is_checked || false}
                                onCheckedChange={(checked: boolean | 'indeterminate') =>
                                  handleChecklistChange(item.id, checked === true)
                                }
                                className="h-5 w-5"
                              />
                            </div>
                            <span
                              className={`text-sm sm:text-base ${
                                result?.is_checked ? 'text-muted-foreground line-through' : ''
                              }`}
                            >
                              {index + 1}. {typeof item.description === 'object' ? JSON.stringify(item.description) : item.description}
                              {item.is_required && (
                                <span className="ml-1 text-destructive">*</span>
                              )}
                            </span>
                          </div>
                          <div
                            className="flex items-center gap-2 pl-8 sm:pl-0 min-h-[44px] cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault()
                              handleIssueChange(item.id, !result?.has_issue, {
                                description: typeof item.description === 'string' ? item.description : String(item.description),
                                inspection_area: item.inspection_area,
                              })
                            }}
                          >
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={result?.has_issue || false}
                                onCheckedChange={(checked: boolean | 'indeterminate') =>
                                  handleIssueChange(item.id, checked === true, {
                                    description: typeof item.description === 'string' ? item.description : String(item.description),
                                    inspection_area: item.inspection_area,
                                  })
                                }
                                className="h-5 w-5"
                              />
                            </div>
                            <Label className="text-sm text-muted-foreground cursor-pointer">
                              {t('pm.hasIssue')}
                            </Label>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Findings & Notes */}
          {execution && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  {t('pm.findings')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('pm.findings')}</Label>
                  <textarea
                    className="w-full rounded-md border p-3 text-sm"
                    rows={3}
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    placeholder={t('pm.findings') + '...'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('pm.findingsSeverity')}</Label>
                  <div className="flex gap-2">
                    {(['none', 'minor', 'major', 'critical'] as const).map((severity) => (
                      <Button
                        key={severity}
                        variant={findingsSeverity === severity ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFindingsSeverity(severity)}
                      >
                        {t(`pm.severity${severity.charAt(0).toUpperCase() + severity.slice(1)}`)}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('pm.pmNotes')}</Label>
                  <textarea
                    className="w-full rounded-md border p-3 text-sm"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('pm.rating')} (1-10)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-24"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
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

          {/* Execution Timer */}
          {execution && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" />
                  {t('pm.duration')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">
                  {execution.started_at
                    ? `${getElapsedMinutes(execution.started_at)} ${t('pm.minutes')}`
                    : '-'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('pm.estimatedDuration')}: {schedule.template?.estimated_duration} {t('pm.minutes')}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {execution && (
            <div className="space-y-2">
              <Button
                className="w-full"
                variant="outline"
                onClick={handleSaveProgress}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {t('common.save')}
              </Button>
              <Button
                className="w-full"
                onClick={handleCompletePM}
                disabled={saving || progressPercent < 100}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                {t('pm.completePM')}
              </Button>

              {hasIssues && (
                <Button
                  className="w-full"
                  variant="destructive"
                  onClick={() => {
                    // Navigate to maintenance input with PM context
                    navigate(`/maintenance?from_pm=${schedule.id}&equipment=${schedule.equipment_id}`)
                  }}
                >
                  <Wrench className="mr-2 h-4 w-4" />
                  {t('pm.createRepairFromPM')}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Issue Confirmation Dialog */}
      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t('pm.issueFound')}
            </DialogTitle>
            <DialogDescription>
              {t('pm.issueFoundDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              {pendingIssueItem?.inspectionArea && (
                <Badge variant="outline" className="mb-2">
                  {pendingIssueItem.inspectionArea}
                </Badge>
              )}
              <p className="text-sm">{pendingIssueItem?.description}</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={cancelIssueDialog}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmIssueAndCreateRepair}>
              <Wrench className="mr-2 h-4 w-4" />
              {t('pm.createRepairFromPM')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
