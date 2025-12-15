import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
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
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  Copy,
  CheckCircle,
  XCircle,
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { pmApi, equipmentApi } from '@/lib/api'
import type { EquipmentType } from '@/types'
import { useToast } from '@/components/ui/toast'
import {
  downloadPMTemplateExcel,
  uploadPMTemplateExcel,
  exportPMTemplatesToExcel,
  type ParsedTemplate,
  type ValidationError,
  type ExcelLanguage,
} from '@/lib/pmTemplateExcel'
import type { PMTemplate, PMIntervalType } from '@/types'

interface ChecklistItem {
  id: string
  description: string
  is_required: boolean
}

export default function PMTemplatesPage() {
  const { t, i18n } = useTranslation()
  const { addToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<PMTemplate[]>([])
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])
  const [search, setSearch] = useState('')
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState('')

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<PMTemplate | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<PMTemplate | null>(null)

  // Bulk upload states
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false)
  const [uploadProcessing, setUploadProcessing] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    templates: ParsedTemplate[]
    errors: ValidationError[]
  } | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<ExcelLanguage>(
    (i18n.language?.startsWith('vi') ? 'vi' : 'ko') as ExcelLanguage
  )

  // 현재 UI 언어에 맞는 템플릿명 반환
  const getLocalizedTemplateName = (template: PMTemplate) => {
    const lang = i18n.language
    if (lang?.startsWith('vi')) {
      return template.name_vi || template.name
    }
    return template.name_ko || template.name
  }

  // 현재 UI 언어에 맞는 템플릿 설명 반환
  const getLocalizedDescription = (template: PMTemplate) => {
    const lang = i18n.language
    if (lang?.startsWith('vi')) {
      return template.description || ''
    }
    return template.description || ''
  }

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    equipment_type_id: '',
    interval_type: 'monthly' as PMIntervalType,
    interval_value: 1,
    inspection_area: '',
    estimated_duration: 60,
    is_active: true,
  })
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [newItemDescription, setNewItemDescription] = useState('')

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipmentTypeFilter])

  const fetchData = async () => {
    const { data } = await equipmentApi.getEquipmentTypes()
    if (data) setEquipmentTypes(data)
  }

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const { data } = await pmApi.getTemplates()
      if (data) {
        const filtered = equipmentTypeFilter
          ? data.filter(t => t.equipment_type_id === equipmentTypeFilter)
          : data
        setTemplates(filtered)
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = templates.filter((template) => {
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        template.name.toLowerCase().includes(searchLower) ||
        template.description?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const getIntervalLabel = (type: PMIntervalType, value: number) => {
    const labels: Record<PMIntervalType, string> = {
      daily: t('pm.intervalDaily'),
      weekly: t('pm.intervalWeekly'),
      monthly: t('pm.intervalMonthly'),
      quarterly: t('pm.intervalQuarterly'),
      yearly: t('pm.intervalYearly'),
    }
    return `${value} ${labels[type]}`
  }

  const getEquipmentTypeName = (id: string) => {
    const type = equipmentTypes.find((t) => t.id === id)
    return type?.name || '-'
  }

  const openCreateDialog = () => {
    setEditingTemplate(null)
    setFormData({
      name: '',
      description: '',
      equipment_type_id: '',
      interval_type: 'monthly',
      interval_value: 1,
      inspection_area: '',
      estimated_duration: 60,
      is_active: true,
    })
    setChecklistItems([])
    setIsDialogOpen(true)
  }

  const openEditDialog = (template: PMTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      description: template.description || '',
      equipment_type_id: template.equipment_type_id,
      interval_type: template.interval_type,
      interval_value: template.interval_value,
      inspection_area: template.inspection_area || '',
      estimated_duration: template.estimated_duration,
      is_active: template.is_active,
    })
    setChecklistItems(
      template.checklist_items.map((item, idx) => ({
        id: `item-${idx}`,
        description: item.description,
        is_required: item.is_required,
      }))
    )
    setIsDialogOpen(true)
  }

  const openDuplicateDialog = (template: PMTemplate) => {
    setEditingTemplate(null)
    setFormData({
      name: `${template.name} (Copy)`,
      description: template.description || '',
      equipment_type_id: template.equipment_type_id,
      interval_type: template.interval_type,
      interval_value: template.interval_value,
      inspection_area: template.inspection_area || '',
      estimated_duration: template.estimated_duration,
      is_active: true,
    })
    setChecklistItems(
      template.checklist_items.map((item, idx) => ({
        id: `item-${idx}`,
        description: item.description,
        is_required: item.is_required,
      }))
    )
    setIsDialogOpen(true)
  }

  const addChecklistItem = () => {
    if (!newItemDescription.trim()) return
    setChecklistItems([
      ...checklistItems,
      {
        id: `item-${Date.now()}`,
        description: newItemDescription.trim(),
        is_required: true,
      },
    ])
    setNewItemDescription('')
  }

  const removeChecklistItem = (id: string) => {
    setChecklistItems(checklistItems.filter((item) => item.id !== id))
  }

  const toggleItemRequired = (id: string) => {
    setChecklistItems(
      checklistItems.map((item) =>
        item.id === id ? { ...item, is_required: !item.is_required } : item
      )
    )
  }

  const handleSave = async () => {
    try {
      const templateData = {
        ...formData,
        checklist_items: checklistItems.map((item, index) => ({
          id: item.id,
          order: index + 1,
          description: item.description,
          is_required: item.is_required,
        })),
        required_parts: [],
      }

      if (editingTemplate) {
        await pmApi.updateTemplate(editingTemplate.id, templateData)
      } else {
        await pmApi.createTemplate(templateData)
      }

      setIsDialogOpen(false)
      fetchTemplates()
    } catch (error) {
      console.error('Failed to save template:', error)
    }
  }

  const handleDelete = async () => {
    if (!templateToDelete) return
    try {
      await pmApi.deleteTemplate(templateToDelete.id)
      setIsDeleteDialogOpen(false)
      setTemplateToDelete(null)
      fetchTemplates()
    } catch (error) {
      console.error('Failed to delete template:', error)
    }
  }

  const toggleTemplateActive = async (template: PMTemplate) => {
    try {
      await pmApi.updateTemplate(template.id, {
        is_active: !template.is_active,
      })
      fetchTemplates()
    } catch (error) {
      console.error('Failed to toggle template:', error)
    }
  }

  // Excel 양식 다운로드
  const handleDownloadTemplate = async () => {
    try {
      await downloadPMTemplateExcel(equipmentTypes, selectedLanguage)
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

  // 기존 템플릿 내보내기
  const handleExportTemplates = async () => {
    try {
      await exportPMTemplatesToExcel(templates, equipmentTypes, selectedLanguage)
      addToast({
        type: 'success',
        title: t('common.success'),
        message: t('pm.excelExportSuccess'),
      })
    } catch (error) {
      console.error('Failed to export templates:', error)
      addToast({
        type: 'error',
        title: t('common.error'),
        message: t('pm.excelExportFailed'),
      })
    }
  }

  // Excel 파일 선택
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadProcessing(true)
    setUploadResult(null)

    try {
      const result = await uploadPMTemplateExcel(file, equipmentTypes, selectedLanguage)
      setUploadResult({
        templates: result.templates,
        errors: result.errors,
      })

      if (result.errors.length === 0 && result.templates.length > 0) {
        addToast({
          type: 'success',
          title: t('pm.excelValidationSuccess'),
          message: t('pm.excelValidationSuccessDesc', { count: result.templates.length }),
        })
      }
    } catch (error) {
      console.error('Failed to process file:', error)
      addToast({
        type: 'error',
        title: t('common.error'),
        message: t('pm.excelProcessFailed'),
      })
    } finally {
      setUploadProcessing(false)
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 일괄 등록 실행
  const handleBulkUpload = async () => {
    if (!uploadResult || uploadResult.templates.length === 0) return

    setUploadProcessing(true)
    try {
      let successCount = 0
      let failCount = 0

      for (const template of uploadResult.templates) {
        try {
          await pmApi.createTemplate({
            name: template.name,
            name_ko: template.name_ko,
            name_vi: template.name_vi,
            description: template.description,
            equipment_type_id: template.equipment_type_id,
            interval_type: template.interval_type,
            interval_value: template.interval_value,
            inspection_area: template.inspection_area,
            estimated_duration: template.estimated_duration,
            checklist_items: template.checklist_items.map((item, idx) => ({
              id: `item-${Date.now()}-${idx}`,
              order: item.order,
              description: item.description,
              description_ko: item.description_ko,
              description_vi: item.description_vi,
              is_required: item.is_required,
            })),
            required_parts: template.required_parts,
            is_active: true,
          })
          successCount++
        } catch (error) {
          console.error('Failed to create template:', template.name, error)
          failCount++
        }
      }

      if (successCount > 0) {
        addToast({
          type: 'success',
          title: t('pm.bulkUploadComplete'),
          message: t('pm.bulkUploadCompleteDesc', { success: successCount, fail: failCount }),
        })
        fetchTemplates()
      }

      if (failCount === 0) {
        setIsBulkUploadDialogOpen(false)
        setUploadResult(null)
      }
    } catch (error) {
      console.error('Bulk upload failed:', error)
      addToast({
        type: 'error',
        title: t('common.error'),
        message: t('pm.bulkUploadFailed'),
      })
    } finally {
      setUploadProcessing(false)
    }
  }

  // 일괄 업로드 다이얼로그 닫기
  const closeBulkUploadDialog = () => {
    setIsBulkUploadDialogOpen(false)
    setUploadResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{t('pm.templates')}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t('pm.templateCount')}: {filteredTemplates.length}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchTemplates} className="h-9 px-3">
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsBulkUploadDialogOpen(true)} className="h-9 px-3">
            <Upload className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('pm.bulkUpload')}</span>
          </Button>
          <Button size="sm" onClick={openCreateDialog} className="h-9 px-3">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('pm.createTemplate')}</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('common.search')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 sm:h-10"
                />
              </div>
            </div>
            <Select
              className="w-full sm:w-[200px] h-9 sm:h-10"
              value={equipmentTypeFilter}
              onChange={(e) => setEquipmentTypeFilter(e.target.value)}
            >
              <option value="">{t('pm.filterByEquipmentType')}</option>
              {equipmentTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-3 sm:p-6">
          {loading ? (
            <div className="flex h-48 sm:h-64 items-center justify-center">
              <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* 모바일 카드 뷰 */}
              <div className="md:hidden space-y-3">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{getLocalizedTemplateName(template)}</p>
                          {getLocalizedDescription(template) && (
                            <p className="text-xs text-muted-foreground truncate">
                              {getLocalizedDescription(template)}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={template.is_active ? 'success' : 'secondary'}
                          className="cursor-pointer text-xs shrink-0"
                          onClick={() => toggleTemplateActive(template)}
                        >
                          {template.is_active ? t('common.active') : t('common.inactive')}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                        <div>
                          <span className="text-muted-foreground/70">{t('equipment.equipmentType')}: </span>
                          <span>{getEquipmentTypeName(template.equipment_type_id)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground/70">{t('pm.pmInterval')}: </span>
                          <span>{getIntervalLabel(template.interval_type, template.interval_value)}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground/70">{t('pm.inspectionArea')}: </span>
                          <span>{template.inspection_area || '-'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground/70">{t('pm.checklistItems')}: </span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{template.checklist_items.length}</Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground/70">{t('pm.estimatedDuration')}: </span>
                          <span>{template.estimated_duration} {t('pm.minutes')}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-1 border-t pt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(template)}
                          className="h-8 px-2"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" />
                          <span className="text-xs">{t('common.edit')}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDuplicateDialog(template)}
                          className="h-8 px-2"
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          <span className="text-xs">{t('common.duplicate')}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setTemplateToDelete(template)
                            setIsDeleteDialogOpen(true)
                          }}
                          className="h-8 px-2"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredTemplates.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {t('common.noSearchResults')}
                  </div>
                )}
              </div>

              {/* 데스크톱 테이블 뷰 */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('pm.templateName')}</TableHead>
                      <TableHead>{t('equipment.equipmentType')}</TableHead>
                      <TableHead>{t('pm.pmInterval')}</TableHead>
                      <TableHead>{t('pm.inspectionArea')}</TableHead>
                      <TableHead className="text-center">{t('pm.checklistItems')}</TableHead>
                      <TableHead>{t('pm.estimatedDuration')}</TableHead>
                      <TableHead className="text-center">{t('equipment.status')}</TableHead>
                      <TableHead className="w-[150px] text-center">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{getLocalizedTemplateName(template)}</p>
                            {getLocalizedDescription(template) && (
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {getLocalizedDescription(template)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getEquipmentTypeName(template.equipment_type_id)}</TableCell>
                        <TableCell>
                          {getIntervalLabel(template.interval_type, template.interval_value)}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate" title={template.inspection_area || '-'}>
                          {template.inspection_area || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{template.checklist_items.length}</Badge>
                        </TableCell>
                        <TableCell>{template.estimated_duration} {t('pm.minutes')}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={template.is_active ? 'success' : 'secondary'}
                            className="cursor-pointer"
                            onClick={() => toggleTemplateActive(template)}
                          >
                            {template.is_active ? t('common.active') : t('common.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditDialog(template)}
                              title={t('common.edit')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openDuplicateDialog(template)}
                              title={t('common.duplicate')}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setTemplateToDelete(template)
                                setIsDeleteDialogOpen(true)
                              }}
                              title={t('common.delete')}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredTemplates.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                          {t('common.noSearchResults')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editingTemplate ? t('pm.editTemplate') : t('pm.createTemplate')}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {editingTemplate
                ? t('pm.editTemplateDesc')
                : t('pm.createTemplateDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            {/* Basic Info */}
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium">{t('pm.templateName')} *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('pm.templateNamePlaceholder')}
                  className="h-9 sm:h-10"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium">{t('equipment.equipmentType')} *</label>
                <Select
                  value={formData.equipment_type_id}
                  onChange={(e) =>
                    setFormData({ ...formData, equipment_type_id: e.target.value })
                  }
                  className="h-9 sm:h-10"
                >
                  <option value="">{t('pm.selectEquipmentType')}</option>
                  {equipmentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium">{t('pm.templateDescription')}</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('pm.templateDescriptionPlaceholder')}
                rows={2}
                className="text-sm"
              />
            </div>

            {/* Interval Settings */}
            <div className="grid gap-3 sm:gap-4 grid-cols-3">
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium">{t('pm.intervalType')} *</label>
                <Select
                  value={formData.interval_type}
                  onChange={(e) =>
                    setFormData({ ...formData, interval_type: e.target.value as PMIntervalType })
                  }
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                >
                  <option value="daily">{t('pm.intervalDaily')}</option>
                  <option value="weekly">{t('pm.intervalWeekly')}</option>
                  <option value="monthly">{t('pm.intervalMonthly')}</option>
                  <option value="quarterly">{t('pm.intervalQuarterly')}</option>
                  <option value="yearly">{t('pm.intervalYearly')}</option>
                </Select>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium">{t('pm.intervalValue')} *</label>
                <Input
                  type="number"
                  min={1}
                  value={formData.interval_value}
                  onChange={(e) =>
                    setFormData({ ...formData, interval_value: parseInt(e.target.value) || 1 })
                  }
                  className="h-9 sm:h-10"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium truncate">{t('pm.estimatedDuration')}</label>
                <Input
                  type="number"
                  min={1}
                  value={formData.estimated_duration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estimated_duration: parseInt(e.target.value) || 60,
                    })
                  }
                  className="h-9 sm:h-10"
                />
              </div>
            </div>

            {/* Inspection Area */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium">{t('pm.inspectionArea')}</label>
              <Input
                value={formData.inspection_area}
                onChange={(e) => setFormData({ ...formData, inspection_area: e.target.value })}
                placeholder={t('pm.inspectionAreaPlaceholder')}
                className="h-9 sm:h-10"
              />
            </div>

            {/* Checklist */}
            <div className="space-y-2 sm:space-y-3">
              <label className="text-xs sm:text-sm font-medium">{t('pm.checklist')}</label>
              <div className="flex gap-2">
                <Input
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder={t('pm.checklistItemPlaceholder')}
                  onKeyPress={(e) => e.key === 'Enter' && addChecklistItem()}
                  className="h-9 sm:h-10 text-sm"
                />
                <Button type="button" onClick={addChecklistItem} className="h-9 sm:h-10 px-3">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {checklistItems.length > 0 && (
                <div className="rounded-lg border">
                  {checklistItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-2 sm:p-3 ${
                        index !== checklistItems.length - 1 ? 'border-b' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <span className="text-xs sm:text-sm text-muted-foreground shrink-0">{index + 1}.</span>
                        <span className="text-xs sm:text-sm truncate">{item.description}</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleItemRequired(item.id)}
                          title={item.is_required ? t('pm.required') : t('pm.optional')}
                          className="h-7 w-7 sm:h-8 sm:w-8"
                        >
                          {item.is_required ? (
                            <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeChecklistItem(item.id)}
                          className="h-7 w-7 sm:h-8 sm:w-8"
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {t('pm.checklistRequiredHint')}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="h-9 sm:h-10">
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name || !formData.equipment_type_id}
              className="h-9 sm:h-10"
            >
              {editingTemplate ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">{t('pm.deleteTemplate')}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t('pm.deleteTemplateConfirm', { name: templateToDelete?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="h-9 sm:h-10">
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="h-9 sm:h-10">
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={isBulkUploadDialogOpen} onOpenChange={closeBulkUploadDialog}>
        <DialogContent className="w-full max-w-3xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5" />
              {t('pm.bulkUpload')}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t('pm.bulkUploadDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-6 py-3 sm:py-4">
            {/* Language Selection */}
            <div className="space-y-2 sm:space-y-3">
              <h3 className="text-sm sm:font-medium">{t('pm.selectLanguage')}</h3>
              <div className="flex gap-2">
                <Button
                  variant={selectedLanguage === 'ko' ? 'default' : 'outline'}
                  onClick={() => setSelectedLanguage('ko')}
                  className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                >
                  🇰🇷 한국어
                </Button>
                <Button
                  variant={selectedLanguage === 'vi' ? 'default' : 'outline'}
                  onClick={() => setSelectedLanguage('vi')}
                  className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                >
                  🇻🇳 Tiếng Việt
                </Button>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t('pm.selectLanguageHint')}
              </p>
            </div>

            {/* Step 1: Download Template */}
            <div className="space-y-2 sm:space-y-3">
              <h3 className="text-sm sm:font-medium flex items-center gap-2">
                <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-primary text-[10px] sm:text-xs text-primary-foreground">1</span>
                {t('pm.downloadExcelTemplate')}
              </h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={handleDownloadTemplate} className="h-9 sm:h-10 text-xs sm:text-sm">
                  <Download className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {t('pm.downloadTemplate')} ({selectedLanguage === 'ko' ? '한국어' : 'Tiếng Việt'})
                </Button>
                {templates.length > 0 && (
                  <Button variant="outline" onClick={handleExportTemplates} className="h-9 sm:h-10 text-xs sm:text-sm">
                    <Download className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {t('pm.exportExisting')} ({templates.length})
                  </Button>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t('pm.downloadTemplateHint')}
              </p>
            </div>

            {/* Step 2: Upload File */}
            <div className="space-y-2 sm:space-y-3">
              <h3 className="text-sm sm:font-medium flex items-center gap-2">
                <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-primary text-[10px] sm:text-xs text-primary-foreground">2</span>
                {t('pm.uploadExcelFile')}
              </h3>
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="excel-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadProcessing}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                >
                  {uploadProcessing ? (
                    <Loader2 className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                  {t('pm.selectFile')}
                </Button>
              </div>
            </div>

            {/* Step 3: Validation Results */}
            {uploadResult && (
              <div className="space-y-2 sm:space-y-3">
                <h3 className="text-sm sm:font-medium flex items-center gap-2">
                  <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-primary text-[10px] sm:text-xs text-primary-foreground">3</span>
                  {t('pm.validationResults')}
                </h3>

                {/* Errors */}
                {uploadResult.errors.length > 0 && (
                  <div className="rounded-lg border border-destructive bg-destructive/10 p-3 sm:p-4">
                    <div className="flex items-center gap-2 text-destructive mb-2">
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="font-medium text-xs sm:text-sm">
                        {t('pm.validationErrors', { count: uploadResult.errors.length })}
                      </span>
                    </div>
                    <div className="max-h-32 sm:max-h-40 overflow-y-auto space-y-1">
                      {uploadResult.errors.map((error, idx) => (
                        <div key={idx} className="text-xs sm:text-sm">
                          <span className="text-muted-foreground">[{error.sheet}]</span>{' '}
                          {error.row > 0 && <span className="text-muted-foreground">{t('pm.row')} {error.row}</span>}{' '}
                          {error.column !== '-' && <span className="text-muted-foreground">{t('pm.column')} {error.column}:</span>}{' '}
                          <span className="text-destructive">{error.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Success Preview */}
                {uploadResult.templates.length > 0 && (
                  <div className="rounded-lg border border-green-500 bg-green-50 dark:bg-green-950/20 p-3 sm:p-4">
                    <div className="flex items-center gap-2 text-green-600 mb-2">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="font-medium text-xs sm:text-sm">
                        {t('pm.validTemplates', { count: uploadResult.templates.length })}
                      </span>
                    </div>
                    {/* 모바일 카드 뷰 */}
                    <div className="sm:hidden max-h-40 overflow-y-auto space-y-2">
                      {uploadResult.templates.map((template, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-800 rounded p-2 text-xs">
                          <div className="font-medium truncate">{template.name}</div>
                          <div className="text-muted-foreground">{template.equipment_type_code}</div>
                          <div className="flex gap-3 mt-1">
                            <span>{t('pm.checklistItems')}: {template.checklist_items.length}</span>
                            <span>{t('pm.requiredParts')}: {template.required_parts.length}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* 데스크톱 테이블 */}
                    <div className="hidden sm:block max-h-40 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1">{t('pm.templateName')}</th>
                            <th className="text-left py-1">{t('equipment.equipmentType')}</th>
                            <th className="text-center py-1">{t('pm.checklistItems')}</th>
                            <th className="text-center py-1">{t('pm.requiredParts')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadResult.templates.map((template, idx) => (
                            <tr key={idx} className="border-b last:border-0">
                              <td className="py-1">{template.name}</td>
                              <td className="py-1">{template.equipment_type_code}</td>
                              <td className="text-center py-1">{template.checklist_items.length}</td>
                              <td className="text-center py-1">{template.required_parts.length}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeBulkUploadDialog} className="h-9 sm:h-10">
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleBulkUpload}
              disabled={
                uploadProcessing ||
                !uploadResult ||
                uploadResult.templates.length === 0 ||
                uploadResult.errors.length > 0
              }
              className="h-9 sm:h-10 text-xs sm:text-sm"
            >
              {uploadProcessing ? (
                <Loader2 className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
              ) : (
                <Upload className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              )}
              {t('pm.uploadAndCreate', { count: uploadResult?.templates.length || 0 })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
