import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { Loader2, Save, X } from 'lucide-react'
import { gradeApi } from '@/lib/api'
import { computeChecksheetGrade, type ChecksheetEntry, type GradeMeasurement } from '@/lib/grade'
import { useAuthStore } from '@/stores/authStore'
import { GradeBadge } from './GradeBadge'
import type { Equipment, EquipmentGradeCriteria, GradeCheckInput } from '@/types'

interface GradeChecksheetDialogProps {
  equipment: Equipment
  open: boolean
  onClose: () => void
  /** Called after a successful save (e.g. to refresh the equipment cache). */
  onSaved?: () => void
}

interface RowInput {
  valueStr: string       // numeric input held as a string for controlled editing
  bool: boolean | null   // pass_fail result (OK = true, NG = false)
  notes: string
}

const emptyRow: RowInput = { valueStr: '', bool: null, notes: '' }

export default function GradeChecksheetDialog({ equipment, open, onClose, onSaved }: GradeChecksheetDialogProps) {
  const { t, i18n } = useTranslation()
  const { addToast } = useToast()
  const role = useAuthStore((s) => s.user?.role ?? 4)
  const canEdit = role <= 3 // viewers (role 4) get a read-only checksheet

  const [criteria, setCriteria] = useState<EquipmentGradeCriteria[]>([])
  const [inputs, setInputs] = useState<Record<string, RowInput>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loc = useCallback(
    (ko?: string | null, vi?: string | null) =>
      (i18n.language === 'vi' ? vi || ko : ko || vi) || '',
    [i18n.language]
  )

  // Load criteria + this equipment's current measurements whenever opened.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const [critRes, checkRes] = await Promise.all([
        gradeApi.getCriteria(false),
        gradeApi.getChecks(equipment.id),
      ])
      if (cancelled) return
      if (critRes.error) {
        addToast({ type: 'error', title: t('common.error'), message: t('grade.loadError') })
      }
      const checkByCriteria = new Map((checkRes.data ?? []).map((c) => [c.criteria_id, c]))
      const init: Record<string, RowInput> = {}
      for (const c of critRes.data ?? []) {
        const chk = checkByCriteria.get(c.id)
        init[c.id] = {
          valueStr: chk?.measured_value != null ? String(chk.measured_value) : '',
          bool: chk?.measured_bool ?? null,
          notes: chk?.notes ?? '',
        }
      }
      setCriteria(critRes.data ?? [])
      setInputs(init)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, equipment.id])

  const measurementFor = useCallback(
    (c: EquipmentGradeCriteria): GradeMeasurement => {
      const r = inputs[c.id] ?? emptyRow
      const parsed = r.valueStr.trim() === '' ? null : Number(r.valueStr)
      return {
        measured_value: parsed != null && Number.isFinite(parsed) ? parsed : null,
        measured_bool: r.bool,
      }
    },
    [inputs]
  )

  // Live grade computation as the user types.
  const { overall, itemGrades, measuredCount, includedTotal } = useMemo(() => {
    const entries: ChecksheetEntry[] = criteria.map((c) => ({ criteria: c, measurement: measurementFor(c) }))
    return computeChecksheetGrade(entries)
  }, [criteria, measurementFor])

  // Group rows by category, preserving display order.
  const groups = useMemo(() => {
    const map = new Map<string, EquipmentGradeCriteria[]>()
    for (const c of criteria) {
      const key = loc(c.category_ko, c.category_vi) || '—'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(c)
    }
    return Array.from(map.entries())
  }, [criteria, loc])

  const setRow = (id: string, patch: Partial<RowInput>) => {
    setInputs((prev) => ({ ...prev, [id]: { ...(prev[id] ?? emptyRow), ...patch } }))
  }

  const handleSave = async () => {
    setSaving(true)
    const payload: GradeCheckInput[] = criteria.map((c) => {
      const m = measurementFor(c)
      return {
        criteria_id: c.id,
        measured_value: c.comparison === 'pass_fail' ? null : m.measured_value,
        measured_bool: c.comparison === 'pass_fail' ? m.measured_bool : null,
        measured_text:
          c.comparison === 'pass_fail' && m.measured_bool != null ? (m.measured_bool ? 'OK' : 'NG') : null,
        notes: inputs[c.id]?.notes?.trim() || null,
      }
    })

    const { error } = await gradeApi.saveChecksheet(equipment.id, payload)
    setSaving(false)
    if (error) {
      addToast({ type: 'error', title: t('common.error'), message: t('grade.saveError') })
      return
    }
    addToast({ type: 'success', title: t('common.success'), message: t('grade.saved') })
    onSaved?.()
    onClose()
  }

  // Compact "A+ … / A … / B … / C … / D …" standard reference for a row.
  const standardText = (c: EquipmentGradeCriteria) => {
    if (c.comparison === 'range' || c.comparison === 'pass_fail') {
      return [c.raw_a_plus, c.raw_d].filter(Boolean).join(' · ')
    }
    return (['A+', c.raw_a_plus, 'A', c.raw_a, 'B', c.raw_b, 'C', c.raw_c, 'D', c.raw_d] as (string | null)[])
      .reduce<string[]>((acc, cur, idx) => {
        if (idx % 2 === 0) acc.push(cur as string)
        else acc[acc.length - 1] = `${acc[acc.length - 1]} ${cur ?? ''}`.trim()
        return acc
      }, [])
      .join(' / ')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="flex w-full max-h-[95vh] flex-col overflow-hidden rounded-t-xl bg-background sm:max-h-[90vh] sm:max-w-4xl sm:rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b p-4 sm:p-5">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold sm:text-lg">
              {t('grade.checksheetTitle', { code: equipment.equipment_code })}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('grade.progress', { measured: measuredCount, total: includedTotal })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('grade.overall')}</span>
              <GradeBadge grade={overall} showUnratedText />
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : criteria.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t('grade.noCriteria')}</p>
          ) : (
            <div className="space-y-5">
              {groups.map(([category, rows]) => (
                <div key={category}>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">{category}</h3>
                  <div className="space-y-2">
                    {rows.map((c) => {
                      const r = inputs[c.id] ?? emptyRow
                      const itemGrade = itemGrades[c.id] ?? null
                      const subLabel = [loc(c.position_ko, c.position_vi), loc(c.condition_ko, c.condition_vi)]
                        .filter(Boolean)
                        .join(' · ')
                      return (
                        <div
                          key={c.id}
                          className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium">{loc(c.item_ko, c.item_vi)}</span>
                              {subLabel && <span className="text-xs text-muted-foreground">{subLabel}</span>}
                              {!c.included_in_grade && (
                                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  {t('grade.excluded')}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {loc(c.device_ko, c.device_vi)}
                              {c.unit ? ` · ${c.unit}` : ''} · {standardText(c)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 justify-self-start sm:justify-self-end">
                            {c.comparison === 'pass_fail' ? (
                              <Select
                                className="h-9 w-28 text-sm"
                                value={r.bool == null ? '' : r.bool ? 'ok' : 'ng'}
                                disabled={!canEdit}
                                onChange={(e) => {
                                  const v = e.target.value
                                  setRow(c.id, { bool: v === '' ? null : v === 'ok' })
                                }}
                              >
                                <option value="">{t('grade.selectResult')}</option>
                                <option value="ok">{t('grade.pass')}</option>
                                <option value="ng">{t('grade.fail')}</option>
                              </Select>
                            ) : (
                              <Input
                                type="number"
                                inputMode="decimal"
                                step="any"
                                className="h-9 w-28 text-sm"
                                placeholder={c.unit || t('grade.enterValue')}
                                value={r.valueStr}
                                disabled={!canEdit}
                                onChange={(e) => setRow(c.id, { valueStr: e.target.value })}
                              />
                            )}
                            <div className="w-12 text-center">
                              <GradeBadge grade={itemGrade} size="sm" />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t p-4 sm:p-5">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('grade.cancel')}
          </Button>
          {canEdit && (
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {saving ? t('grade.saving') : t('grade.save')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
