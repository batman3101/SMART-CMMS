import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { Loader2, Pencil, Check, X } from 'lucide-react'
import { gradeApi } from '@/lib/api'
import type { EquipmentGradeCriteria } from '@/types'

interface ThresholdDraft {
  threshold_a_plus: string
  threshold_a: string
  threshold_b: string
  threshold_c: string
  range_min: string
  range_max: string
}

const numOrNull = (s: string): number | null => {
  const t = s.trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

const toStr = (n: number | null): string => (n == null ? '' : String(n))

/**
 * 등급 평가 기준 관리 (Grade criteria management).
 * Managers/admins register & adjust the company-wide checksheet: toggle whether
 * each item is active and whether it counts toward the grade, and edit thresholds.
 */
export default function GradeCriteriaPage() {
  const { t, i18n } = useTranslation()
  const { addToast } = useToast()

  const [criteria, setCriteria] = useState<EquipmentGradeCriteria[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ThresholdDraft | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const loc = useCallback(
    (ko?: string | null, vi?: string | null) =>
      (i18n.language === 'vi' ? vi || ko : ko || vi) || '',
    [i18n.language]
  )

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await gradeApi.getCriteria(true)
    if (error) {
      addToast({ type: 'error', title: t('common.error'), message: t('grade.loadError') })
    }
    setCriteria(data ?? [])
    setLoading(false)
  }, [addToast, t])

  useEffect(() => {
    void load()
  }, [load])

  const groups = useMemo(() => {
    const map = new Map<string, EquipmentGradeCriteria[]>()
    for (const c of criteria) {
      const key = loc(c.category_ko, c.category_vi) || '—'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(c)
    }
    return Array.from(map.entries())
  }, [criteria, loc])

  // Persist a single field change (active / included) immediately with optimistic UI.
  const patchCriteria = async (c: EquipmentGradeCriteria, updates: Partial<EquipmentGradeCriteria>) => {
    setCriteria((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...updates } : x)))
    const { error } = await gradeApi.updateCriteria(c.id, updates)
    if (error) {
      addToast({ type: 'error', title: t('common.error'), message: t('grade.saveError') })
      void load() // revert to server truth
    }
  }

  const startEdit = (c: EquipmentGradeCriteria) => {
    setEditingId(c.id)
    setDraft({
      threshold_a_plus: toStr(c.threshold_a_plus),
      threshold_a: toStr(c.threshold_a),
      threshold_b: toStr(c.threshold_b),
      threshold_c: toStr(c.threshold_c),
      range_min: toStr(c.range_min),
      range_max: toStr(c.range_max),
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft(null)
  }

  const saveEdit = async (c: EquipmentGradeCriteria) => {
    if (!draft) return
    setSavingId(c.id)
    const updates: Partial<EquipmentGradeCriteria> = {
      threshold_a_plus: numOrNull(draft.threshold_a_plus),
      threshold_a: numOrNull(draft.threshold_a),
      threshold_b: numOrNull(draft.threshold_b),
      threshold_c: numOrNull(draft.threshold_c),
      range_min: numOrNull(draft.range_min),
      range_max: numOrNull(draft.range_max),
    }
    const { error } = await gradeApi.updateCriteria(c.id, updates)
    setSavingId(null)
    if (error) {
      addToast({ type: 'error', title: t('common.error'), message: t('grade.saveError') })
      return
    }
    setCriteria((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...updates } : x)))
    addToast({ type: 'success', title: t('common.success'), message: t('grade.criteriaSaved') })
    cancelEdit()
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">{t('grade.criteriaTitle')}</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{t('grade.criteriaDesc')}</p>
      </div>

      {groups.map(([category, rows]) => (
        <Card key={category}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rows.map((c) => {
              const isEditing = editingId === c.id
              const isNumeric = c.comparison !== 'pass_fail'
              const isRange = c.comparison === 'range'
              const sub = [loc(c.position_ko, c.position_vi), loc(c.condition_ko, c.condition_vi)]
                .filter(Boolean)
                .join(' · ')
              return (
                <div key={c.id} className="rounded-lg border p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{loc(c.item_ko, c.item_vi)}</span>
                        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {t(`grade.comparisonTypes.${c.comparison}`)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {loc(c.device_ko, c.device_vi)}
                        {c.unit ? ` · ${c.unit}` : ''}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-4">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Switch
                          checked={c.included_in_grade}
                          onCheckedChange={(v) => patchCriteria(c, { included_in_grade: v })}
                        />
                        {t('grade.includedInGrade')}
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Switch
                          checked={c.is_active}
                          onCheckedChange={(v) => patchCriteria(c, { is_active: v })}
                        />
                        {t('grade.active')}
                      </label>
                      {!isEditing && isNumeric && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => startEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Threshold display / editor */}
                  {isNumeric && (
                    <div className="mt-2 border-t pt-2">
                      {isEditing && draft ? (
                        <div className="flex flex-wrap items-end gap-2">
                          {isRange ? (
                            <>
                              <ThresholdField
                                label={t('grade.rangeMin')}
                                value={draft.range_min}
                                onChange={(v) => setDraft({ ...draft, range_min: v })}
                              />
                              <ThresholdField
                                label={t('grade.rangeMax')}
                                value={draft.range_max}
                                onChange={(v) => setDraft({ ...draft, range_max: v })}
                              />
                            </>
                          ) : (
                            <>
                              <ThresholdField label="A+" value={draft.threshold_a_plus} onChange={(v) => setDraft({ ...draft, threshold_a_plus: v })} />
                              <ThresholdField label="A" value={draft.threshold_a} onChange={(v) => setDraft({ ...draft, threshold_a: v })} />
                              <ThresholdField label="B" value={draft.threshold_b} onChange={(v) => setDraft({ ...draft, threshold_b: v })} />
                              <ThresholdField label="C" value={draft.threshold_c} onChange={(v) => setDraft({ ...draft, threshold_c: v })} />
                            </>
                          )}
                          <div className="flex gap-1">
                            <Button size="sm" onClick={() => saveEdit(c)} disabled={savingId === c.id}>
                              {savingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit} disabled={savingId === c.id}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">{t('grade.standard')}:</span>{' '}
                          {isRange
                            ? `${c.raw_a_plus ?? ''}`
                            : `A+ ${c.raw_a_plus ?? '-'} / A ${c.raw_a ?? '-'} / B ${c.raw_b ?? '-'} / C ${c.raw_c ?? '-'} / D ${c.raw_d ?? '-'}`}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}

      {criteria.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{t('grade.noCriteria')}</CardContent>
        </Card>
      )}
    </div>
  )
}

function ThresholdField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      <Input
        type="number"
        step="any"
        inputMode="decimal"
        className="h-8 w-20 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
