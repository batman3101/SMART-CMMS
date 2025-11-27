import { create } from 'zustand'
import type { MaintenanceRecord, RepairType, MaintenanceFilter } from '@/types'

interface MaintenanceState {
  records: MaintenanceRecord[]
  repairTypes: RepairType[]
  selectedRecord: MaintenanceRecord | null
  filter: MaintenanceFilter
  isLoading: boolean
  error: string | null

  setRecords: (records: MaintenanceRecord[]) => void
  setRepairTypes: (types: RepairType[]) => void
  setSelectedRecord: (record: MaintenanceRecord | null) => void
  setFilter: (filter: Partial<MaintenanceFilter>) => void
  resetFilter: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  addRecord: (record: MaintenanceRecord) => void
  updateRecord: (id: string, updates: Partial<MaintenanceRecord>) => void
  deleteRecord: (id: string) => void
}

const initialFilter: MaintenanceFilter = {}

export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  records: [],
  repairTypes: [],
  selectedRecord: null,
  filter: initialFilter,
  isLoading: false,
  error: null,

  setRecords: (records) => set({ records }),
  setRepairTypes: (repairTypes) => set({ repairTypes }),
  setSelectedRecord: (selectedRecord) => set({ selectedRecord }),
  setFilter: (filter) =>
    set((state) => ({ filter: { ...state.filter, ...filter } })),
  resetFilter: () => set({ filter: initialFilter }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  addRecord: (record) =>
    set((state) => ({ records: [record, ...state.records] })),
  updateRecord: (id, updates) =>
    set((state) => ({
      records: state.records.map((rec) =>
        rec.id === id ? { ...rec, ...updates } : rec
      ),
    })),
  deleteRecord: (id) =>
    set((state) => ({
      records: state.records.filter((rec) => rec.id !== id),
    })),
}))
