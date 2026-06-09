import { useEffect, useCallback } from 'react'
import { useEquipmentStore } from '@/stores/equipmentStore'
import { equipmentApi } from '@/lib/api'
import type { Equipment } from '@/types'

/**
 * #3: deep equipment read.
 *
 * The equipmentStore is the single in-memory cache (kept fresh by the realtime
 * sync in MainLayout). This hook is the small read interface pages consume so
 * they stop dual-sourcing their own copy and automatically reflect live updates.
 * The returned list carries effective status (api default), so every consumer
 * agrees on equipment state.
 */
export function useEquipmentData(options?: { autoLoad?: boolean }) {
  const equipments = useEquipmentStore((s) => s.equipments)
  const isLoading = useEquipmentStore((s) => s.isLoading)
  const error = useEquipmentStore((s) => s.error)
  const setEquipments = useEquipmentStore((s) => s.setEquipments)
  const setLoading = useEquipmentStore((s) => s.setLoading)
  const setError = useEquipmentStore((s) => s.setError)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data, error } = await equipmentApi.getEquipments()
    setError(error)
    if (data) setEquipments(data as Equipment[])
    setLoading(false)
    return { data, error }
  }, [setEquipments, setLoading, setError])

  useEffect(() => {
    if (options?.autoLoad === false) return
    // Cold-start load if the shared cache is empty; realtime keeps it fresh after.
    if (equipments.length === 0) {
      void refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { equipments, isLoading, error, refresh }
}
