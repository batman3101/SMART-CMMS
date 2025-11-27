import type { RepairType } from '@/types'

export const mockRepairTypes: RepairType[] = [
  {
    id: '1',
    code: 'PM',
    name: '정기 유지보수',
    name_ko: '정기 유지보수',
    name_vi: 'Bảo trì định kỳ',
    color: '#3B82F6',
    priority: 3,
    is_active: true,
  },
  {
    id: '2',
    code: 'BR',
    name: '고장수리',
    name_ko: '고장수리',
    name_vi: 'Sửa chữa hỏng hóc',
    color: '#F59E0B',
    priority: 2,
    is_active: true,
  },
  {
    id: '3',
    code: 'PD',
    name: '예지보전',
    name_ko: '예지보전',
    name_vi: 'Bảo trì dự đoán',
    color: '#10B981',
    priority: 3,
    is_active: true,
  },
  {
    id: '4',
    code: 'QA',
    name: '제품불량',
    name_ko: '제품불량',
    name_vi: 'Lỗi sản phẩm',
    color: '#8B5CF6',
    priority: 2,
    is_active: true,
  },
  {
    id: '5',
    code: 'EM',
    name: '긴급수리',
    name_ko: '긴급수리',
    name_vi: 'Sửa chữa khẩn cấp',
    color: '#EF4444',
    priority: 1,
    is_active: true,
  },
]

export const getRepairTypeById = (id: string) =>
  mockRepairTypes.find((rt) => rt.id === id)

export const getRepairTypeByCode = (code: string) =>
  mockRepairTypes.find((rt) => rt.code === code)
