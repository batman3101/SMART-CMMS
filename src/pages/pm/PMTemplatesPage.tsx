import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { mockPMApi } from '@/mock/api'
import { mockEquipmentTypes } from '@/mock/data'
import type { PMTemplate, PMIntervalType } from '@/types'

interface ChecklistItem {
  id: string
  description: string
  is_required: boolean
}

export default function PMTemplatesPage() {
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<PMTemplate[]>([])
  const [search, setSearch] = useState('')
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState('')

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<PMTemplate | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<PMTemplate | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    equipment_type_id: '',
    interval_type: 'monthly' as PMIntervalType,
    interval_value: 1,
    estimated_duration: 60,
    is_active: true,
  })
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [newItemDescription, setNewItemDescription] = useState('')

  useEffect(() => {
    fetchTemplates()
  }, [equipmentTypeFilter])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const filter = equipmentTypeFilter ? { equipment_type_id: equipmentTypeFilter } : {}
      const { data } = await mockPMApi.getTemplates(filter)
      if (data) setTemplates(data)
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
    const type = mockEquipmentTypes.find((t) => t.id === id)
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
        await mockPMApi.updateTemplate(editingTemplate.id, templateData)
      } else {
        await mockPMApi.createTemplate(templateData as Omit<PMTemplate, 'id' | 'created_at' | 'updated_at'>)
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
      await mockPMApi.deleteTemplate(templateToDelete.id)
      setIsDeleteDialogOpen(false)
      setTemplateToDelete(null)
      fetchTemplates()
    } catch (error) {
      console.error('Failed to delete template:', error)
    }
  }

  const toggleTemplateActive = async (template: PMTemplate) => {
    try {
      await mockPMApi.updateTemplate(template.id, {
        is_active: !template.is_active,
      })
      fetchTemplates()
    } catch (error) {
      console.error('Failed to toggle template:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('pm.templates')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('pm.templateCount')}: {filteredTemplates.length}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchTemplates}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            {t('pm.createTemplate')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[200px] flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('common.search')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select
              className="w-[200px]"
              value={equipmentTypeFilter}
              onChange={(e) => setEquipmentTypeFilter(e.target.value)}
            >
              <option value="">{t('pm.filterByEquipmentType')}</option>
              {mockEquipmentTypes.map((type) => (
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
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('pm.templateName')}</TableHead>
                  <TableHead>{t('equipment.equipmentType')}</TableHead>
                  <TableHead>{t('pm.pmInterval')}</TableHead>
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
                        <p className="font-medium">{template.name}</p>
                        {template.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {template.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getEquipmentTypeName(template.equipment_type_id)}</TableCell>
                    <TableCell>
                      {getIntervalLabel(template.interval_type, template.interval_value)}
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
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      {t('common.noSearchResults')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? t('pm.editTemplate') : t('pm.createTemplate')}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? t('pm.editTemplateDesc')
                : t('pm.createTemplateDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('pm.templateName')} *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('pm.templateNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('equipment.equipmentType')} *</label>
                <Select
                  value={formData.equipment_type_id}
                  onChange={(e) =>
                    setFormData({ ...formData, equipment_type_id: e.target.value })
                  }
                >
                  <option value="">{t('pm.selectEquipmentType')}</option>
                  {mockEquipmentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('pm.templateDescription')}</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('pm.templateDescriptionPlaceholder')}
                rows={2}
              />
            </div>

            {/* Interval Settings */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('pm.intervalType')} *</label>
                <Select
                  value={formData.interval_type}
                  onChange={(e) =>
                    setFormData({ ...formData, interval_type: e.target.value as PMIntervalType })
                  }
                >
                  <option value="daily">{t('pm.intervalDaily')}</option>
                  <option value="weekly">{t('pm.intervalWeekly')}</option>
                  <option value="monthly">{t('pm.intervalMonthly')}</option>
                  <option value="quarterly">{t('pm.intervalQuarterly')}</option>
                  <option value="yearly">{t('pm.intervalYearly')}</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('pm.intervalValue')} *</label>
                <Input
                  type="number"
                  min={1}
                  value={formData.interval_value}
                  onChange={(e) =>
                    setFormData({ ...formData, interval_value: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('pm.estimatedDuration')} ({t('pm.minutes')})</label>
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
                />
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-3">
              <label className="text-sm font-medium">{t('pm.checklist')}</label>
              <div className="flex gap-2">
                <Input
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder={t('pm.checklistItemPlaceholder')}
                  onKeyPress={(e) => e.key === 'Enter' && addChecklistItem()}
                />
                <Button type="button" onClick={addChecklistItem}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {checklistItems.length > 0 && (
                <div className="rounded-lg border">
                  {checklistItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 ${
                        index !== checklistItems.length - 1 ? 'border-b' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">{index + 1}.</span>
                        <span className="text-sm">{item.description}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleItemRequired(item.id)}
                          title={item.is_required ? t('pm.required') : t('pm.optional')}
                        >
                          {item.is_required ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeChecklistItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {t('pm.checklistRequiredHint')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name || !formData.equipment_type_id}
            >
              {editingTemplate ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pm.deleteTemplate')}</DialogTitle>
            <DialogDescription>
              {t('pm.deleteTemplateConfirm', { name: templateToDelete?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
