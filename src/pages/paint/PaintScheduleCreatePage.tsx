import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  ArrowLeft,
  Save,
  Loader2,
  Paintbrush,
  Server,
} from 'lucide-react'
import { getTodayInTimezone } from '@/lib/dateUtils'
import { paintApi, equipmentApi, usersApi } from '@/lib/api'
import type { Equipment, User, PaintPriority, PaintScheduleCreateForm } from '@/types'
import { useToast } from '@/components/ui/toast'

export default function PaintScheduleCreatePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { addToast } = useToast()

  // Multilingual helpers
  const getEquipmentName = (eq: Equipment | undefined) => {
    if (!eq) return '-'
    if (i18n.language === 'vi') return eq.equipment_name_vi || eq.equipment_name
    return eq.equipment_name_ko || eq.equipment_name
  }

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [allEquipments, setAllEquipments] = useState<Equipment[]>([])
  const [technicians, setTechnicians] = useState<User[]>([])

  // Form state
  const [equipmentId, setEquipmentId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [technicianId, setTechnicianId] = useState('')
  const [priority, setPriority] = useState<PaintPriority>('medium')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchData()
    setScheduledDate(getTodayInTimezone())
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [equipmentsRes, techniciansRes] = await Promise.all([
        equipmentApi.getEquipments(),
        usersApi.getTechnicians(),
      ])
      if (equipmentsRes.data) setAllEquipments(equipmentsRes.data)
      if (techniciansRes.data) setTechnicians(techniciansRes.data)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!equipmentId) newErrors.equipmentId = t('paint.selectEquipment') || 'Equipment is required'
    if (!scheduledDate) newErrors.scheduledDate = t('paint.scheduledDate') || 'Date is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const form: PaintScheduleCreateForm = {
        equipment_id: equipmentId,
        scheduled_date: scheduledDate,
        assigned_technician_id: technicianId || undefined,
        priority,
        notes: notes || undefined,
      }
      const { data, error } = await paintApi.createSchedule(form)
      if (error) {
        addToast({ type: 'error', title: t('common.error'), message: error })
        return
      }
      if (data) {
        addToast({ type: 'success', title: t('common.success'), message: t('paint.scheduleCreated') })
        navigate('/paint/schedules')
      }
    } catch (error) {
      console.error('Failed to create schedule:', error)
      addToast({ type: 'error', title: t('common.error'), message: t('common.error') })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const selectedEquipment = allEquipments.find(e => e.id === equipmentId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/paint/schedules')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('paint.createSchedule')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('paint.createScheduleDesc')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paintbrush className="h-5 w-5" />
              {t('paint.scheduleInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Equipment Selection */}
            <div className="space-y-2">
              <Label htmlFor="equipment">{t('equipment.equipmentName')} *</Label>
              <Select
                id="equipment"
                value={equipmentId}
                onChange={(e) => setEquipmentId(e.target.value)}
                className={errors.equipmentId ? 'border-red-500' : ''}
              >
                <option value="">{t('paint.selectEquipment')}</option>
                {allEquipments.map((equipment) => (
                  <option key={equipment.id} value={equipment.id}>
                    {equipment.equipment_code} - {getEquipmentName(equipment)}
                  </option>
                ))}
              </Select>
              {errors.equipmentId && <p className="text-sm text-red-500">{errors.equipmentId}</p>}
            </div>

            {/* Scheduled Date */}
            <div className="space-y-2">
              <Label htmlFor="scheduledDate">{t('paint.scheduledDate')} *</Label>
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
              <Label htmlFor="priority">{t('paint.priority')}</Label>
              <Select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as PaintPriority)}
              >
                <option value="low">{t('paint.priorityLow')}</option>
                <option value="medium">{t('paint.priorityMedium')}</option>
                <option value="high">{t('paint.priorityHigh')}</option>
              </Select>
            </div>

            {/* Technician */}
            <div className="space-y-2">
              <Label htmlFor="technician">{t('paint.assignedTechnician')}</Label>
              <Select
                id="technician"
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
              >
                <option value="">{t('paint.filterByTechnician')}</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">{t('paint.paintNotes')}</Label>
              <textarea
                id="notes"
                className="w-full rounded-md border p-3 text-sm bg-background"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('paint.paintNotesPlaceholder')}
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => navigate('/paint/schedules')} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSubmit} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t('common.save')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Equipment Preview */}
        {selectedEquipment && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Server className="h-5 w-5" />
                {t('equipment.info')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">{t('equipment.equipmentCode')}</p>
                <p className="font-medium">{selectedEquipment.equipment_code}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('equipment.equipmentName')}</p>
                <p className="font-medium">{getEquipmentName(selectedEquipment)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('equipment.building')}</p>
                <p className="font-medium">{selectedEquipment.building || '-'}</p>
              </div>
              {selectedEquipment.equipment_type && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('equipment.equipmentType')}</p>
                  <p className="font-medium">
                    {i18n.language === 'vi'
                      ? selectedEquipment.equipment_type.name_vi || selectedEquipment.equipment_type.name
                      : selectedEquipment.equipment_type.name_ko || selectedEquipment.equipment_type.name}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
