/**
 * Parts Service
 * 외부 부품관리 앱의 Supabase 데이터베이스에서 부품 정보를 조회하는 서비스
 * 읽기 전용 - 부품 재고 관리(입출고)는 부품관리 앱에서 수행
 */

import { partsSupabase, isPartsSupabaseConnected } from '@/lib/supabase'
import type { Part, PartSearchFilter } from '@/types'

// Mock 데이터 (Supabase 연결 전 개발/테스트용)
const mockParts: Part[] = [
  { id: '1', code: 'BRG-001', name: '베어링 6205', name_ko: '베어링 6205', name_vi: 'Vòng bi 6205', category: '베어링', unit: 'EA', current_stock: 50 },
  { id: '2', code: 'BRG-002', name: '베어링 6206', name_ko: '베어링 6206', name_vi: 'Vòng bi 6206', category: '베어링', unit: 'EA', current_stock: 30 },
  { id: '3', code: 'BRG-003', name: '베어링 6207', name_ko: '베어링 6207', name_vi: 'Vòng bi 6207', category: '베어링', unit: 'EA', current_stock: 25 },
  { id: '4', code: 'BLT-001', name: '타이밍 벨트 HTD-5M', name_ko: '타이밍 벨트 HTD-5M', name_vi: 'Dây đai định thời HTD-5M', category: '벨트', unit: 'EA', current_stock: 15 },
  { id: '5', code: 'BLT-002', name: 'V벨트 A-68', name_ko: 'V벨트 A-68', name_vi: 'Dây đai V A-68', category: '벨트', unit: 'EA', current_stock: 20 },
  { id: '6', code: 'OIL-001', name: '유압 오일 ISO VG 32', name_ko: '유압 오일 ISO VG 32', name_vi: 'Dầu thủy lực ISO VG 32', category: '윤활유', unit: 'L', current_stock: 200 },
  { id: '7', code: 'OIL-002', name: '절삭유 수용성', name_ko: '절삭유 수용성', name_vi: 'Dầu cắt gọt hòa tan nước', category: '윤활유', unit: 'L', current_stock: 100 },
  { id: '8', code: 'FLT-001', name: '오일 필터 HF-100', name_ko: '오일 필터 HF-100', name_vi: 'Lọc dầu HF-100', category: '필터', unit: 'EA', current_stock: 40 },
  { id: '9', code: 'FLT-002', name: '에어 필터 AF-200', name_ko: '에어 필터 AF-200', name_vi: 'Lọc khí AF-200', category: '필터', unit: 'EA', current_stock: 35 },
  { id: '10', code: 'SEN-001', name: '근접 센서 PR18-5DN', name_ko: '근접 센서 PR18-5DN', name_vi: 'Cảm biến tiệm cận PR18-5DN', category: '센서', unit: 'EA', current_stock: 10 },
  { id: '11', code: 'SEN-002', name: '온도 센서 PT100', name_ko: '온도 센서 PT100', name_vi: 'Cảm biến nhiệt độ PT100', category: '센서', unit: 'EA', current_stock: 8 },
  { id: '12', code: 'MOT-001', name: '서보 모터 1KW', name_ko: '서보 모터 1KW', name_vi: 'Động cơ servo 1KW', category: '모터', unit: 'EA', current_stock: 3 },
  { id: '13', code: 'MOT-002', name: '스핀들 모터 5.5KW', name_ko: '스핀들 모터 5.5KW', name_vi: 'Động cơ trục chính 5.5KW', category: '모터', unit: 'EA', current_stock: 2 },
  { id: '14', code: 'PMP-001', name: '쿨런트 펌프 25L/min', name_ko: '쿨런트 펌프 25L/min', name_vi: 'Bơm dung dịch làm mát 25L/min', category: '펌프', unit: 'EA', current_stock: 5 },
  { id: '15', code: 'VAL-001', name: '솔레노이드 밸브 24V', name_ko: '솔레노이드 밸브 24V', name_vi: 'Van điện từ 24V', category: '밸브', unit: 'EA', current_stock: 12 },
  { id: '16', code: 'CYL-001', name: '에어 실린더 SC40x100', name_ko: '에어 실린더 SC40x100', name_vi: 'Xi lanh khí SC40x100', category: '실린더', unit: 'EA', current_stock: 6 },
  { id: '17', code: 'SPR-001', name: '복귀 스프링 SWC-10', name_ko: '복귀 스프링 SWC-10', name_vi: 'Lò xo hồi SWC-10', category: '스프링', unit: 'EA', current_stock: 100 },
  { id: '18', code: 'SEL-001', name: '오일 씰 35x52x7', name_ko: '오일 씰 35x52x7', name_vi: 'Phớt dầu 35x52x7', category: '씰/패킹', unit: 'EA', current_stock: 80 },
  { id: '19', code: 'SEL-002', name: 'O링 P-20', name_ko: 'O링 P-20', name_vi: 'Vòng O P-20', category: '씰/패킹', unit: 'EA', current_stock: 200 },
  { id: '20', code: 'TOL-001', name: '엔드밀 φ10 4날', name_ko: '엔드밀 φ10 4날', name_vi: 'Dao phay ngón φ10 4 me', category: '공구', unit: 'EA', current_stock: 50 },
]

// 부품 카테고리 목록
const mockCategories = [
  '베어링', '벨트', '윤활유', '필터', '센서', '모터', '펌프', '밸브', '실린더', '스프링', '씰/패킹', '공구'
]

/**
 * 부품 검색
 * @param filter 검색 필터 (keyword, category, limit)
 * @returns 부품 목록
 */
export async function searchParts(filter: PartSearchFilter = {}): Promise<{
  data: Part[] | null
  error: string | null
}> {
  const { keyword, category, limit = 20 } = filter

  // Supabase 연결이 안 된 경우 Mock 데이터 사용
  if (!isPartsSupabaseConnected() || !partsSupabase) {
    let results = [...mockParts]

    if (keyword) {
      const lowerKeyword = keyword.toLowerCase()
      results = results.filter(
        (p) =>
          p.code.toLowerCase().includes(lowerKeyword) ||
          p.name.toLowerCase().includes(lowerKeyword) ||
          p.name_ko?.toLowerCase().includes(lowerKeyword) ||
          p.name_vi?.toLowerCase().includes(lowerKeyword)
      )
    }

    if (category) {
      results = results.filter((p) => p.category === category)
    }

    return { data: results.slice(0, limit), error: null }
  }

  // Supabase 쿼리
  try {
    let query = partsSupabase
      .from('parts') // 실제 테이블명에 맞게 수정 필요
      .select('id, code, name, name_ko, name_vi, category, unit, current_stock')

    if (keyword) {
      // 부품 코드 또는 이름으로 검색
      query = query.or(`code.ilike.%${keyword}%,name.ilike.%${keyword}%,name_ko.ilike.%${keyword}%,name_vi.ilike.%${keyword}%`)
    }

    if (category) {
      query = query.eq('category', category)
    }

    query = query.limit(limit).order('code')

    const { data, error } = await query

    if (error) {
      console.error('Parts search error:', error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Parts service error:', err)
    return { data: null, error: 'Failed to fetch parts' }
  }
}

/**
 * 부품 코드로 조회
 * @param code 부품 코드
 * @returns 부품 정보
 */
export async function getPartByCode(code: string): Promise<{
  data: Part | null
  error: string | null
}> {
  if (!isPartsSupabaseConnected() || !partsSupabase) {
    const part = mockParts.find((p) => p.code === code)
    return { data: part || null, error: part ? null : 'Part not found' }
  }

  try {
    const { data, error } = await partsSupabase
      .from('parts')
      .select('id, code, name, name_ko, name_vi, category, unit, current_stock')
      .eq('code', code)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Get part error:', err)
    return { data: null, error: 'Failed to fetch part' }
  }
}

/**
 * 부품 ID로 조회
 * @param id 부품 ID
 * @returns 부품 정보
 */
export async function getPartById(id: string): Promise<{
  data: Part | null
  error: string | null
}> {
  if (!isPartsSupabaseConnected() || !partsSupabase) {
    const part = mockParts.find((p) => p.id === id)
    return { data: part || null, error: part ? null : 'Part not found' }
  }

  try {
    const { data, error } = await partsSupabase
      .from('parts')
      .select('id, code, name, name_ko, name_vi, category, unit, current_stock')
      .eq('id', id)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Get part error:', err)
    return { data: null, error: 'Failed to fetch part' }
  }
}

/**
 * 부품 카테고리 목록 조회
 * @returns 카테고리 목록
 */
export async function getPartCategories(): Promise<{
  data: string[] | null
  error: string | null
}> {
  if (!isPartsSupabaseConnected() || !partsSupabase) {
    return { data: mockCategories, error: null }
  }

  try {
    const { data, error } = await partsSupabase
      .from('parts')
      .select('category')
      .not('category', 'is', null)

    if (error) {
      return { data: null, error: error.message }
    }

    // 중복 제거
    const categories = [...new Set(data?.map((d) => d.category) || [])]
    return { data: categories.sort(), error: null }
  } catch (err) {
    console.error('Get categories error:', err)
    return { data: null, error: 'Failed to fetch categories' }
  }
}

/**
 * Supabase 연결 상태 확인
 */
export function getConnectionStatus(): {
  connected: boolean
  message: string
} {
  if (isPartsSupabaseConnected()) {
    return { connected: true, message: 'Connected to Parts Database' }
  }
  return { connected: false, message: 'Using Mock Data (Parts DB not configured)' }
}
