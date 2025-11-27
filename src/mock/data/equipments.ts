import type { Equipment, EquipmentStatus } from '@/types'
import { mockEquipmentTypes } from './equipmentTypes'

// Generate CNC equipments (800 units)
const generateCNCEquipments = (): Equipment[] => {
  const cncType = mockEquipmentTypes.find((t) => t.code === 'CNC')!
  const statuses: EquipmentStatus[] = ['normal', 'pm', 'repair', 'emergency', 'standby']
  const statusWeights = [0.85, 0.05, 0.06, 0.01, 0.03] // 85% normal, etc.

  const buildings = ['A동', 'B동']

  return Array.from({ length: 800 }, (_, i) => {
    const num = (i + 1).toString().padStart(3, '0')
    const random = Math.random()
    let status: EquipmentStatus = 'normal'
    let cumulative = 0
    for (let j = 0; j < statuses.length; j++) {
      cumulative += statusWeights[j]
      if (random <= cumulative) {
        status = statuses[j]
        break
      }
    }

    return {
      id: `cnc-${num}`,
      equipment_code: `CNC-${num}`,
      equipment_name: `CNC 밀링 머신 #${i + 1}`,
      equipment_type_id: cncType.id,
      equipment_type: cncType,
      status,
      install_date: `202${Math.floor(Math.random() * 4)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      manufacturer: ['FANUC', 'Mazak', 'DMG MORI', 'Haas'][Math.floor(Math.random() * 4)],
      building: buildings[i < 400 ? 0 : 1],
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: new Date().toISOString(),
    }
  })
}

// Generate other equipments
const generateOtherEquipments = (): Equipment[] => {
  const equipments: Equipment[] = []

  // 초음파 클리닝 (3대)
  const clType = mockEquipmentTypes.find((t) => t.code === 'CL')!
  for (let i = 1; i <= 3; i++) {
    equipments.push({
      id: `cl-${String(i).padStart(3, '0')}`,
      equipment_code: `CL-${String(i).padStart(3, '0')}`,
      equipment_name: `초음파 클리닝 #${i}`,
      equipment_type_id: clType.id,
      equipment_type: clType,
      status: 'normal',
      install_date: '2023-06-15',
      manufacturer: 'Ultrasonic Co.',
      building: 'A동',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: new Date().toISOString(),
    })
  }

  // 디버링 설비 (5대)
  const dbrType = mockEquipmentTypes.find((t) => t.code === 'DBR')!
  for (let i = 1; i <= 5; i++) {
    equipments.push({
      id: `dbr-${String(i).padStart(3, '0')}`,
      equipment_code: `DBR-${String(i).padStart(3, '0')}`,
      equipment_name: `디버링 설비 #${i}`,
      equipment_type_id: dbrType.id,
      equipment_type: dbrType,
      status: i === 2 ? 'repair' : 'normal',
      install_date: '2023-08-20',
      manufacturer: 'Deburring Tech',
      building: 'B동',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: new Date().toISOString(),
    })
  }

  // TRI 검사 설비 (2개)
  const triType = mockEquipmentTypes.find((t) => t.code === 'TRI')!
  for (let i = 1; i <= 2; i++) {
    equipments.push({
      id: `tri-${String(i).padStart(3, '0')}`,
      equipment_code: `TRI-${String(i).padStart(3, '0')}`,
      equipment_name: `TRI 검사 설비 #${i}`,
      equipment_type_id: triType.id,
      equipment_type: triType,
      status: 'normal',
      install_date: '2023-05-10',
      manufacturer: 'Inspection Systems',
      building: 'B동',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: new Date().toISOString(),
    })
  }

  return equipments
}

export const mockEquipments: Equipment[] = [
  ...generateCNCEquipments(),
  ...generateOtherEquipments(),
]

// Helper functions
export const getEquipmentsByType = (typeCode: string) =>
  mockEquipments.filter((eq) => eq.equipment_type?.code === typeCode)

export const getEquipmentsByStatus = (status: EquipmentStatus) =>
  mockEquipments.filter((eq) => eq.status === status)

export const getEquipmentsByBuilding = (building: string) =>
  mockEquipments.filter((eq) => eq.building === building)

export const getEquipmentById = (id: string) =>
  mockEquipments.find((eq) => eq.id === id)

export const getEquipmentByCode = (equipmentCode: string) =>
  mockEquipments.find((eq) => eq.equipment_code === equipmentCode)
