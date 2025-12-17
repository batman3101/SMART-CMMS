import type { MaintenanceRecord, MaintenancePart, MaintenanceImage } from '@/types'
import { mockEquipments } from './equipments'
import { mockRepairTypes } from './repairTypes'
import { mockUsers } from './users'

// Generate maintenance records
const generateMaintenanceRecords = (): MaintenanceRecord[] => {
  const records: MaintenanceRecord[] = []
  const technicians = mockUsers.filter((u) => u.role === 3 && u.is_active)

  // 최근 30일간의 수리 기록 생성
  const now = new Date()

  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const date = new Date(now)
    date.setDate(date.getDate() - dayOffset)
    const dateStr = date.toISOString().split('T')[0]

    // 하루에 15-25건의 수리
    const dailyCount = Math.floor(Math.random() * 11) + 15

    for (let i = 0; i < dailyCount; i++) {
      const recordId = `mr-${dateStr.replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`
      const equipment = mockEquipments[Math.floor(Math.random() * 100)] // 처음 100대 중에서 선택
      const repairType = mockRepairTypes[Math.floor(Math.random() * mockRepairTypes.length)]
      const technician = technicians[Math.floor(Math.random() * technicians.length)]

      const startHour = Math.floor(Math.random() * 10) + 8 // 08:00 ~ 17:00
      const startMinute = Math.floor(Math.random() * 60)
      const durationMinutes = Math.floor(Math.random() * 180) + 30 // 30분 ~ 210분

      const startTime = new Date(date)
      startTime.setHours(startHour, startMinute, 0, 0)

      const isCompleted = dayOffset > 0 || (dayOffset === 0 && Math.random() > 0.3)

      let endTime: Date | null = null
      if (isCompleted) {
        endTime = new Date(startTime)
        endTime.setMinutes(endTime.getMinutes() + durationMinutes)
      }

      records.push({
        id: recordId,
        record_no: `MR${dateStr.replace(/-/g, '').slice(2)}-${String(Math.random().toString(36).substring(2, 6)).toUpperCase()}`,
        date: dateStr,
        equipment_id: equipment.id,
        equipment,
        repair_type_id: repairType.id,
        repair_type: repairType,
        technician_id: technician.id,
        technician,
        symptom: getRandomSymptom(repairType.code),
        repair_content: isCompleted ? getRandomRepairContent(repairType.code) : null,
        start_time: startTime.toISOString(),
        end_time: endTime?.toISOString() || null,
        duration_minutes: isCompleted ? durationMinutes : null,
        rating: isCompleted ? Math.floor(Math.random() * 4) + 7 : null, // 7-10점
        status: isCompleted ? 'completed' : 'in_progress',
        used_parts: null,
        created_at: startTime.toISOString(),
        updated_at: (endTime || startTime).toISOString(),
      })
    }
  }

  return records.sort((a, b) =>
    new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  )
}

function getRandomSymptom(repairTypeCode: string): string {
  const symptoms: Record<string, string[]> = {
    PM: [
      '정기 점검 예정',
      '월간 PM 일정',
      '스핀들 정기 점검',
      '윤활유 교체 예정',
      '필터 교체 예정',
    ],
    BR: [
      '스핀들 이상 소음 발생',
      '축 이동 불량',
      '알람 발생 - E1234',
      '가공 정밀도 저하',
      '쿨런트 누유 발생',
      '전원 차단 현상',
      '서보 모터 에러',
    ],
    PD: [
      '진동 수치 상승 감지',
      '온도 상승 추세 확인',
      '마모도 분석 결과 교체 필요',
      '베어링 수명 예측',
    ],
    QA: [
      '가공 치수 불량',
      '표면 조도 불량',
      '버 발생 과다',
      'NC 프로그램 수정 필요',
    ],
    EM: [
      '긴급! 설비 정지',
      '긴급! 화재 경보',
      '긴급! 누유 발생',
      '긴급! 충돌 사고',
    ],
  }

  const list = symptoms[repairTypeCode] || symptoms.BR
  return list[Math.floor(Math.random() * list.length)]
}

function getRandomRepairContent(repairTypeCode: string): string {
  const contents: Record<string, string[]> = {
    PM: [
      '정기 점검 완료. 이상 없음.',
      '윤활유 교체 완료 (5L)',
      '필터 청소 및 교체 완료',
      '볼트 체결 상태 확인 및 조임',
      '전장부 점검 완료',
    ],
    BR: [
      '베어링 교체 완료',
      '센서 교체 후 정상 작동 확인',
      '케이블 재결선 후 정상화',
      '모터 드라이버 교체',
      '파라미터 재설정으로 해결',
      '쿨런트 호스 교체',
    ],
    PD: [
      '예측 분석에 따른 부품 사전 교체 완료',
      '진동 원인 파악 및 조치 완료',
      '예방적 부품 교체 시행',
    ],
    QA: [
      'NC 프로그램 수정 완료',
      '공구 교체 후 재가공 확인',
      '원점 재설정 완료',
      '치구 정렬 조정',
    ],
    EM: [
      '긴급 조치 완료. 정상 가동 재개.',
      '안전 점검 후 재가동',
      '응급 수리 완료. 추후 정밀 점검 필요.',
    ],
  }

  const list = contents[repairTypeCode] || contents.BR
  return list[Math.floor(Math.random() * list.length)]
}

export const mockMaintenanceRecords: MaintenanceRecord[] = generateMaintenanceRecords()

// Parts data
export const mockMaintenanceParts: MaintenancePart[] = [
  { id: '1', maintenance_id: mockMaintenanceRecords[0]?.id || '', part_code: 'BRG-6205', quantity: 2 },
  { id: '2', maintenance_id: mockMaintenanceRecords[0]?.id || '', part_code: 'OIL-SP100', quantity: 1 },
  { id: '3', maintenance_id: mockMaintenanceRecords[1]?.id || '', part_code: 'FLT-AIR01', quantity: 1 },
]

// Images data
export const mockMaintenanceImages: MaintenanceImage[] = []

// Helper functions
export const getMaintenanceRecordById = (id: string) =>
  mockMaintenanceRecords.find((r) => r.id === id)

export const getMaintenanceRecordsByEquipment = (equipmentId: string) =>
  mockMaintenanceRecords.filter((r) => r.equipment_id === equipmentId)

export const getMaintenanceRecordsByTechnician = (technicianId: string) =>
  mockMaintenanceRecords.filter((r) => r.technician_id === technicianId)

export const getMaintenanceRecordsByDateRange = (startDate: string, endDate: string) =>
  mockMaintenanceRecords.filter((r) => r.date >= startDate && r.date <= endDate)

export const getInProgressRecords = () =>
  mockMaintenanceRecords.filter((r) => r.status === 'in_progress')

export const getTodayRecords = () => {
  const today = new Date().toISOString().split('T')[0]
  return mockMaintenanceRecords.filter((r) => r.date === today)
}
