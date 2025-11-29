import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Save,
  Loader2,
  Calendar,
  Wrench,
  User,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import { mockPMApi } from '@/mock/api'
import { mockEquipments } from '@/mock/data'
import { mockTechnicians } from '@/mock/data/users'
import { useToast } from '@/components/ui/toast'
import {
  downloadPMScheduleExcel,
  uploadPMScheduleExcel,
  type ParsedSchedule,
  type ScheduleValidationError,
  type ExcelLanguage,
} from '@/lib/pmScheduleExcel'
import type { PMTemplate, PMPriority, PMScheduleCreateForm } from '@/types'

type CreateMode = 'single' | 'bulk'

export default function PMScheduleCreatePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [templates, setTemplates] = useState<PMTemplate[]>([])
  const [createMode, setCreateMode] = useState<CreateMode>('single')

  // Single create form state
  const [templateId, setTemplateId] = useState('')
  const [equipmentId, setEquipmentId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [technicianId, setTechnicianId] = useState('')
  const [priority, setPriority] = useState<PMPriority>('medium')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Bulk upload dialog state
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<ExcelLanguage>(
    (i18n.language?.startsWith('vi') ? 'vi' : 'ko') as ExcelLanguage
  )
  const [uploadProcessing, setUploadProcessing] = useState(false)
  const [parsedSchedules, setParsedSchedules] = useState<ParsedSchedule[]>([])
  const [validationErrors, setValidationErrors] = useState<ScheduleValidationError[]>([])

  useEffect(() => {
    fetchTemplates()
    setScheduledDate(new Date().toISOString().split('T')[0])
  }, [])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const { data } = await mockPMApi.getTemplates()
      if (data) setTemplates(data)
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedTemplate = templates.find(t => t.id === templateId)
  const filteredEquipments = selectedTemplate
    ? mockEquipments.filter(e => e.equipment_type_id === selectedTemplate.equipment_type_id)
    : mockEquipments

  // Single create validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!templateId) newErrors.templateId = t('pm.selectTemplate') || 'Template is required'
    if (!equipmentId) newErrors.equipmentId = t('pm.selectEquipments') || 'Equipment is required'
    if (!scheduledDate) newErrors.scheduledDate = t('pm.scheduledDate') || 'Date is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Single create submit
  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const form: PMScheduleCreateForm = {
        template_id: templateId,
        equipment_id: equipmentId,
        scheduled_date: scheduledDate,
        assigned_technician_id: technicianId || undefined,
        priority,
        notes: notes || undefined,
      }
      const { data, error } = await mockPMApi.createSchedule(form)
      if (error) {
        addToast({ type: 'error', title: t('common.error'), message: error })
        return
      }
      if (data) {
        addToast({ type: 'success', title: t('common.success'), message: t('pm.scheduleCreated') })
        navigate('/pm/schedules')
      }
    } catch (error) {
      console.error('Failed to create schedule:', error)
      addToast({ type: 'error', title: t('common.error'), message: t('common.error') })
    } finally {
      setSaving(false)
    }
  }

  // Bulk upload - Download template
  const handleDownloadTemplate = async () => {
    try {
      if (templates.length === 0) {
        addToast({
          type: 'warning',
          title: t('common.warning'),
          message: t('pm.noTemplatesAvailable'),
        })
        return
      }

      const technicians = mockTechnicians.map(tech => ({ id: tech.id, name: tech.name }))
      await downloadPMScheduleExcel(templates, mockEquipments, technicians, selectedLanguage)
      addToast({
        type: 'success',
        title: t('common.success'),
        message: t('pm.excelTemplateDownloaded'),
      })
    } catch (error) {
      console.error('Failed to download template:', error)
      addToast({
        type: 'error',
        title: t('common.error'),
        message: t('pm.excelDownloadFailed'),
      })
    }
  }

  // Bulk upload - File selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadProcessing(true)
    setParsedSchedules([])
    setValidationErrors([])

    try {
      const technicians = mockTechnicians.map(tech => ({ id: tech.id, name: tech.name }))
      const result = await uploadPMScheduleExcel(file, templates, mockEquipments, technicians, selectedLanguage)

      setParsedSchedules(result.schedules)
      setValidationErrors(result.errors)

      if (result.success && result.schedules.length > 0) {
        addToast({
          type: 'success',
          title: t('pm.excelValidationSuccess'),
          message: t('pm.scheduleExcelValidationSuccess', { count: result.schedules.length }),
        })
      }
    } catch (error) {
      console.error('Failed to parse file:', error)
      addToast({
        type: 'error',
        title: t('common.error'),
        message: t('pm.excelProcessFailed'),
      })
    } finally {
      setUploadProcessing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Bulk upload - Submit all
  const handleBulkSubmit = async () => {
    if (parsedSchedules.length === 0) return

    setSaving(true)
    let successCount = 0
    let failCount = 0

    try {
      for (const schedule of parsedSchedules) {
        const form: PMScheduleCreateForm = {
          template_id: schedule.template_id,
          equipment_id: schedule.equipment_id,
          scheduled_date: schedule.scheduled_date,
          assigned_technician_id: schedule.assigned_technician_id,
          priority: schedule.priority,
          notes: schedule.notes,
        }
        const { error } = await mockPMApi.createSchedule(form)
        if (error) {
          failCount++
        } else {
          successCount++
        }
      }

      addToast({
        type: successCount > 0 ? 'success' : 'error',
        title: t('pm.bulkUploadComplete'),
        message: t('pm.scheduleBulkUploadComplete', { success: successCount, fail: failCount }),
      })

      if (successCount > 0) {
        closeBulkUploadDialog()
        navigate('/pm/schedules')
      }
    } catch (error) {
      console.error('Failed to create schedules:', error)
      addToast({
        type: 'error',
        title: t('common.error'),
        message: t('pm.bulkUploadFailed'),
      })
    } finally {
      setSaving(false)
    }
  }

  // Close bulk upload dialog
  const closeBulkUploadDialog = () => {
    setIsBulkUploadDialogOpen(false)
    setParsedSchedules([])
    setValidationErrors([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getPriorityBadge = (p: PMPriority) => {
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
    return <Badge variant={variants[p]}>{labels[p]}</Badge>
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/pm/schedules')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('pm.createSchedule')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('pm.createScheduleDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={createMode === 'single' ? 'default' : 'outline'}
          onClick={() => setCreateMode('single')}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {t('pm.singleCreate')}
        </Button>
        <Button
          variant={createMode === 'bulk' ? 'default' : 'outline'}
          onClick={() => {
            setCreateMode('bulk')
            setIsBulkUploadDialogOpen(true)
          }}
        >
          <Upload className="mr-2 h-4 w-4" />
          {t('pm.bulkUpload')}
        </Button>
      </div>

      {/* Single Create Mode */}
      {createMode === 'single' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t('pm.scheduleInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template Selection */}
              <div className="space-y-2">
                <Label htmlFor="template">{t('pm.template')} *</Label>
                <Select
                  id="template"
                  value={templateId}
                  onChange={(e) => {
                    setTemplateId(e.target.value)
                    setEquipmentId('')
                  }}
                  className={errors.templateId ? 'border-red-500' : ''}
                >
                  <option value="">{t('pm.selectTemplate')}</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
                {errors.templateId && <p className="text-sm text-red-500">{errors.templateId}</p>}
              </div>

              {/* Equipment Selection */}
              <div className="space-y-2">
                <Label htmlFor="equipment">{t('equipment.equipmentName')} *</Label>
                <Select
                  id="equipment"
                  value={equipmentId}
                  onChange={(e) => setEquipmentId(e.target.value)}
                  className={errors.equipmentId ? 'border-red-500' : ''}
                  disabled={!templateId}
                >
                  <option value="">{t('pm.selectEquipments')}</option>
                  {filteredEquipments.map((equipment) => (
                    <option key={equipment.id} value={equipment.id}>
                      {equipment.equipment_code} - {equipment.equipment_name}
                    </option>
                  ))}
                </Select>
                {errors.equipmentId && <p className="text-sm text-red-500">{errors.equipmentId}</p>}
              </div>

              {/* Scheduled Date */}
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">{t('pm.scheduledDate')} *</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className={errors.scheduledDate ? 'border-red-500' : ''}
                />
                {errors.scheduledDate && <p className="text-sm text-red-500">{errors.scheduledDate}</p>}
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">{t('pm.priority')}</Label>
                <Select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PMPriority)}
                >
                  <option value="low">{t('pm.priorityLow')}</option>
                  <option value="medium">{t('pm.priorityMedium')}</option>
                  <option value="high">{t('pm.priorityHigh')}</option>
                </Select>
              </div>

              {/* Technician */}
              <div className="space-y-2">
                <Label htmlFor="technician">{t('pm.assignedTechnician')}</Label>
                <Select
                  id="technician"
                  value={technicianId}
                  onChange={(e) => setTechnicianId(e.target.value)}
                >
                  <option value="">{t('pm.filterByTechnician')}</option>
                  {mockTechnicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">{t('pm.pmNotes')}</Label>
                <textarea
                  id="notes"
                  className="w-full rounded-md border p-3 text-sm"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('pm.pmNotes') + '...'}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => navigate('/pm/schedules')} disabled={saving}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSubmit} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {t('common.save')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <div className="space-y-6">
            {selectedTemplate && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Wrench className="h-5 w-5" />
                    {t('pm.templateInfo')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pm.templateName')}</p>
                    <p className="font-medium">{selectedTemplate.name}</p>
                  </div>
                  {selectedTemplate.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('pm.templateDescription')}</p>
                      <p className="text-sm">{selectedTemplate.description}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pm.estimatedDuration')}</p>
                    <p className="font-medium">{selectedTemplate.estimated_duration} {t('pm.minutes')}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {equipmentId && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5" />
                    {t('equipment.info')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const equipment = mockEquipments.find(e => e.id === equipmentId)
                    if (!equipment) return null
                    return (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">{t('equipment.equipmentCode')}</p>
                          <p className="font-medium">{equipment.equipment_code}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{t('equipment.equipmentName')}</p>
                          <p className="font-medium">{equipment.equipment_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{t('equipment.building')}</p>
                          <p className="font-medium">{equipment.building}</p>
                        </div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Bulk Upload Dialog */}
      <Dialog open={isBulkUploadDialogOpen} onOpenChange={closeBulkUploadDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              {t('pm.bulkUpload')}
            </DialogTitle>
            <DialogDescription>
              {t('pm.scheduleBulkUploadDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Language Selection */}
            <div className="space-y-3">
              <h3 className="font-medium">{t('pm.selectLanguage')}</h3>
              <div className="flex gap-2">
                <Button
                  variant={selectedLanguage === 'ko' ? 'default' : 'outline'}
                  onClick={() => setSelectedLanguage('ko')}
                  className="flex-1"
                >
                  <span className="mr-2">KR</span> 한국어
                </Button>
                <Button
                  variant={selectedLanguage === 'vi' ? 'default' : 'outline'}
                  onClick={() => setSelectedLanguage('vi')}
                  className="flex-1"
                >
                  <span className="mr-2">VN</span> Tiếng Việt
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('pm.selectLanguageHint')}
              </p>
            </div>

            {/* Step 1: Download Template */}
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">1</span>
                {t('pm.downloadExcelTemplate')}
              </h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('pm.downloadTemplate')} ({selectedLanguage === 'ko' ? '한국어' : 'Tiếng Việt'})
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('pm.scheduleDownloadTemplateHint')}
              </p>
            </div>

            {/* Step 2: Upload File */}
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">2</span>
                {t('pm.uploadExcelFile')}
              </h3>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".xlsx,.xls"
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadProcessing}
              >
                {uploadProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {t('pm.selectFile')}
              </Button>
            </div>

            {/* Step 3: Validation Results */}
            {(parsedSchedules.length > 0 || validationErrors.length > 0) && (
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">3</span>
                  {t('pm.validationResults')}
                </h3>

                {/* Errors */}
                {validationErrors.length > 0 && (
                  <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                    <div className="flex items-center gap-2 text-destructive mb-2">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-medium">
                        {t('pm.validationErrors', { count: validationErrors.length })}
                      </span>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {validationErrors.slice(0, 10).map((error, idx) => (
                        <div key={idx} className="text-sm">
                          <span className="text-muted-foreground">{t('pm.row')} {error.row}</span>{' '}
                          {error.column !== '-' && <span className="text-muted-foreground">{t('pm.column')} {error.column}:</span>}{' '}
                          <span className="text-destructive">{error.message}</span>
                        </div>
                      ))}
                      {validationErrors.length > 10 && (
                        <p className="text-sm text-muted-foreground">
                          ... {t('pm.andMoreErrors', { count: validationErrors.length - 10 })}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Success Preview */}
                {parsedSchedules.length > 0 && (
                  <div className="rounded-lg border border-green-500 bg-green-50 dark:bg-green-950/20 p-4">
                    <div className="flex items-center gap-2 text-green-600 mb-2">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">
                        {t('pm.validSchedules', { count: parsedSchedules.length })}
                      </span>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('pm.template')}</TableHead>
                            <TableHead>{t('equipment.equipmentCode')}</TableHead>
                            <TableHead>{t('pm.scheduledDate')}</TableHead>
                            <TableHead>{t('pm.priority')}</TableHead>
                            <TableHead>{t('pm.assignedTechnician')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedSchedules.slice(0, 10).map((schedule, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{schedule.template_name}</TableCell>
                              <TableCell>{schedule.equipment_code}</TableCell>
                              <TableCell>{schedule.scheduled_date}</TableCell>
                              <TableCell>{getPriorityBadge(schedule.priority)}</TableCell>
                              <TableCell>{schedule.assigned_technician_name || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {parsedSchedules.length > 10 && (
                        <p className="mt-2 text-center text-sm text-muted-foreground">
                          ... {t('pm.andMoreSchedules', { count: parsedSchedules.length - 10 })}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeBulkUploadDialog}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleBulkSubmit}
              disabled={saving || parsedSchedules.length === 0 || validationErrors.length > 0}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {t('pm.uploadAndCreateSchedules', { count: parsedSchedules.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
