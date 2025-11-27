import { create } from 'zustand'
import type { Equipment, EquipmentType, EquipmentFilter } from '@/types'

interface EquipmentState {
  equipments: Equipment[]
  equipmentTypes: EquipmentType[]
  selectedEquipment: Equipment | null
  filter: EquipmentFilter
  isLoading: boolean
  error: string | null

  setEquipments: (equipments: Equipment[]) => void
  setEquipmentTypes: (types: EquipmentType[]) => void
  setSelectedEquipment: (equipment: Equipment | null) => void
  setFilter: (filter: Partial<EquipmentFilter>) => void
  resetFilter: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  addEquipment: (equipment: Equipment) => void
  updateEquipment: (id: string, updates: Partial<Equipment>) => void
  deleteEquipment: (id: string) => void
}

const initialFilter: EquipmentFilter = {}

export const useEquipmentStore = create<EquipmentState>((set) => ({
  equipments: [],
  equipmentTypes: [],
  selectedEquipment: null,
  filter: initialFilter,
  isLoading: false,
  error: null,

  setEquipments: (equipments) => set({ equipments }),
  setEquipmentTypes: (equipmentTypes) => set({ equipmentTypes }),
  setSelectedEquipment: (selectedEquipment) => set({ selectedEquipment }),
  setFilter: (filter) =>
    set((state) => ({ filter: { ...state.filter, ...filter } })),
  resetFilter: () => set({ filter: initialFilter }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  addEquipment: (equipment) =>
    set((state) => ({ equipments: [...state.equipments, equipment] })),
  updateEquipment: (id, updates) =>
    set((state) => ({
      equipments: state.equipments.map((eq) =>
        eq.id === id ? { ...eq, ...updates } : eq
      ),
    })),
  deleteEquipment: (id) =>
    set((state) => ({
      equipments: state.equipments.filter((eq) => eq.id !== id),
    })),
}))
