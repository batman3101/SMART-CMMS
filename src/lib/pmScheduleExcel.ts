import ExcelJS from 'exceljs'
import type { PMTemplate, PMPriority, Equipment } from '@/types'

export type ExcelLanguage = 'ko' | 'vi'

// 우선순위 한글 매핑
const PRIORITY_KO: Record<string, PMPriority> = {
  '높음': 'high',
  '중간': 'medium',
  '낮음': 'low',
}

// 우선순위 베트남어 매핑
const PRIORITY_VI: Record<string, PMPriority> = {
  'Cao': 'high',
  'Trung bình': 'medium',
  'Thấp': 'low',
}

const PRIORITY_TO_KO: Record<PMPriority, string> = {
  high: '높음',
  medium: '중간',
  low: '낮음',
}

const PRIORITY_TO_VI: Record<PMPriority, string> = {
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
}

// 언어별 레이블
const LABELS = {
  ko: {
    // Sheet names
    sheetSchedules: '일정',
    sheetTemplateRef: '템플릿 코드표',
    sheetEquipmentRef: '설비 코드표',
    sheetTechnicianRef: '담당자 목록',
    // Schedule sheet headers
    templateName: '템플릿명 *',
    equipmentCode: '설비코드 *',
    scheduledDate: '예정일 *',
    priority: '우선순위',
    technicianName: '담당자',
    notes: '메모',
    // Hints
    priorityHint: '※ 우선순위: 높음, 중간, 낮음 중 선택',
    dateHint: '※ 날짜형식: YYYY-MM-DD',
    // Reference sheet headers
    templateNameRef: '템플릿명',
    equipmentType: '설비유형',
    equipmentCodeRef: '설비코드',
    equipmentName: '설비명',
    technicianNameRef: '담당자명',
    // Example data
    exampleTemplateName: 'CNC 밀링 머신 월간 PM (예시)',
    exampleEquipmentCode: 'CNC-001',
    exampleTechnicianName: '김철수',
    examplePriority: '중간',
  },
  vi: {
    // Sheet names
    sheetSchedules: 'Lịch PM',
    sheetTemplateRef: 'Bảng mã mẫu',
    sheetEquipmentRef: 'Bảng mã thiết bị',
    sheetTechnicianRef: 'Danh sách KTV',
    // Schedule sheet headers
    templateName: 'Tên mẫu *',
    equipmentCode: 'Mã thiết bị *',
    scheduledDate: 'Ngày dự kiến *',
    priority: 'Ưu tiên',
    technicianName: 'KTV phụ trách',
    notes: 'Ghi chú',
    // Hints
    priorityHint: '※ Ưu tiên: Cao, Trung bình, Thấp',
    dateHint: '※ Định dạng ngày: YYYY-MM-DD',
    // Reference sheet headers
    templateNameRef: 'Tên mẫu',
    equipmentType: 'Loại thiết bị',
    equipmentCodeRef: 'Mã thiết bị',
    equipmentName: 'Tên thiết bị',
    technicianNameRef: 'Tên KTV',
    // Example data
    exampleTemplateName: 'PM hàng tháng máy CNC phay (Ví dụ)',
    exampleEquipmentCode: 'CNC-001',
    exampleTechnicianName: 'Nguyễn Văn A',
    examplePriority: 'Trung bình',
  },
}

export interface ScheduleValidationError {
  row: number
  column: string
  message: string
}

export interface ParsedSchedule {
  template_id: string
  template_name: string
  equipment_id: string
  equipment_code: string
  scheduled_date: string
  priority: PMPriority
  assigned_technician_id?: string
  assigned_technician_name?: string
  notes?: string
}

export interface ScheduleUploadResult {
  success: boolean
  schedules: ParsedSchedule[]
  errors: ScheduleValidationError[]
}

export interface TechnicianInfo {
  id: string
  name: string
}

/**
 * PM 일정 Excel 양식 다운로드
 */
export async function downloadPMScheduleExcel(
  templates: PMTemplate[],
  equipments: Equipment[],
  technicians: TechnicianInfo[],
  language: ExcelLanguage = 'ko'
): Promise<void> {
  const L = LABELS[language]
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'AMMS'
  workbook.created = new Date()

  // ============================================
  // Sheet 1: 일정 입력
  // ============================================
  const scheduleSheet = workbook.addWorksheet(L.sheetSchedules, {
    properties: { tabColor: { argb: '3B82F6' } }
  })

  scheduleSheet.columns = [
    { header: L.templateName, key: 'template_name', width: 40 },
    { header: L.equipmentCode, key: 'equipment_code', width: 18 },
    { header: L.scheduledDate, key: 'scheduled_date', width: 18 },
    { header: L.priority, key: 'priority', width: 15 },
    { header: L.technicianName, key: 'technician_name', width: 20 },
    { header: L.notes, key: 'notes', width: 40 },
  ]

  // 헤더 스타일링
  scheduleSheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '3B82F6' }
    }
    cell.font = { bold: true, color: { argb: 'FFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  })
  scheduleSheet.getRow(1).height = 30

  // 예시 데이터
  const today = new Date().toISOString().split('T')[0]
  const exampleTemplate = templates[0]
  const exampleEquipment = equipments[0]
  const exampleTechnician = technicians[0]

  scheduleSheet.addRow({
    template_name: exampleTemplate?.name || L.exampleTemplateName,
    equipment_code: exampleEquipment?.equipment_code || L.exampleEquipmentCode,
    scheduled_date: today,
    priority: L.examplePriority,
    technician_name: exampleTechnician?.name || L.exampleTechnicianName,
    notes: '',
  })

  // 힌트 행 추가
  const hintRow1 = scheduleSheet.addRow({ template_name: L.priorityHint })
  hintRow1.getCell(1).font = { italic: true, color: { argb: '9CA3AF' } }

  const hintRow2 = scheduleSheet.addRow({ template_name: L.dateHint })
  hintRow2.getCell(1).font = { italic: true, color: { argb: '9CA3AF' } }

  // ============================================
  // Sheet 2: 템플릿 코드표 (참조용)
  // ============================================
  const templateRefSheet = workbook.addWorksheet(L.sheetTemplateRef, {
    properties: { tabColor: { argb: '10B981' } }
  })

  templateRefSheet.columns = [
    { header: L.templateNameRef, key: 'name', width: 45 },
    { header: L.equipmentType, key: 'equipment_type', width: 25 },
  ]

  templateRefSheet.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '10B981' } }
    cell.font = { bold: true, color: { argb: 'FFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  templates.forEach((template) => {
    templateRefSheet.addRow({
      name: template.name,
      equipment_type: template.equipment_type?.name || template.equipment_type_id,
    })
  })

  // ============================================
  // Sheet 3: 설비 코드표 (참조용)
  // ============================================
  const equipmentRefSheet = workbook.addWorksheet(L.sheetEquipmentRef, {
    properties: { tabColor: { argb: 'F59E0B' } }
  })

  equipmentRefSheet.columns = [
    { header: L.equipmentCodeRef, key: 'code', width: 18 },
    { header: L.equipmentName, key: 'name', width: 35 },
    { header: L.equipmentType, key: 'type', width: 25 },
  ]

  equipmentRefSheet.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F59E0B' } }
    cell.font = { bold: true, color: { argb: 'FFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  equipments.forEach((equipment) => {
    equipmentRefSheet.addRow({
      code: equipment.equipment_code,
      name: equipment.equipment_name,
      type: equipment.equipment_type?.name || '',
    })
  })

  // ============================================
  // Sheet 4: 담당자 목록 (참조용)
  // ============================================
  const technicianRefSheet = workbook.addWorksheet(L.sheetTechnicianRef, {
    properties: { tabColor: { argb: '9CA3AF' } }
  })

  technicianRefSheet.columns = [
    { header: L.technicianNameRef, key: 'name', width: 30 },
  ]

  technicianRefSheet.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '6B7280' } }
    cell.font = { bold: true, color: { argb: 'FFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  technicians.forEach((tech) => {
    technicianRefSheet.addRow({ name: tech.name })
  })

  // 파일 다운로드
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `PM_Schedule_Template_${language.toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`
  link.click()
  window.URL.revokeObjectURL(url)
}

/**
 * 기존 일정을 Excel로 내보내기
 */
export async function exportPMSchedulesToExcel(
  schedules: ParsedSchedule[],
  language: ExcelLanguage = 'ko'
): Promise<void> {
  const L = LABELS[language]
  const PRIORITY_MAP = language === 'ko' ? PRIORITY_TO_KO : PRIORITY_TO_VI

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'AMMS'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(L.sheetSchedules)
  sheet.columns = [
    { header: L.templateName, key: 'template_name', width: 40 },
    { header: L.equipmentCode, key: 'equipment_code', width: 18 },
    { header: L.scheduledDate, key: 'scheduled_date', width: 18 },
    { header: L.priority, key: 'priority', width: 15 },
    { header: L.technicianName, key: 'technician_name', width: 20 },
    { header: L.notes, key: 'notes', width: 40 },
  ]

  // 헤더 스타일링
  sheet.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '3B82F6' } }
    cell.font = { bold: true, color: { argb: 'FFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  schedules.forEach((schedule) => {
    sheet.addRow({
      template_name: schedule.template_name,
      equipment_code: schedule.equipment_code,
      scheduled_date: schedule.scheduled_date,
      priority: PRIORITY_MAP[schedule.priority] || schedule.priority,
      technician_name: schedule.assigned_technician_name || '',
      notes: schedule.notes || '',
    })
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `PM_Schedules_Export_${new Date().toISOString().split('T')[0]}.xlsx`
  link.click()
  window.URL.revokeObjectURL(url)
}

/**
 * PM 일정 Excel 파일 업로드 및 검증
 */
export async function uploadPMScheduleExcel(
  file: File,
  templates: PMTemplate[],
  equipments: Equipment[],
  technicians: TechnicianInfo[],
  language: ExcelLanguage = 'ko'
): Promise<ScheduleUploadResult> {
  const L = LABELS[language]
  const PRIORITY_MAP = language === 'ko' ? PRIORITY_KO : PRIORITY_VI
  const errors: ScheduleValidationError[] = []
  const schedules: ParsedSchedule[] = []

  try {
    const workbook = new ExcelJS.Workbook()
    const arrayBuffer = await file.arrayBuffer()
    await workbook.xlsx.load(arrayBuffer)

    // 템플릿명 -> 템플릿 매핑
    const templateMap = new Map<string, PMTemplate>()
    templates.forEach((template) => {
      templateMap.set(template.name.toLowerCase(), template)
      if (template.name_ko) templateMap.set(template.name_ko.toLowerCase(), template)
      if (template.name_vi) templateMap.set(template.name_vi.toLowerCase(), template)
    })

    // 설비코드 -> 설비 매핑
    const equipmentMap = new Map<string, Equipment>()
    equipments.forEach((equipment) => {
      equipmentMap.set(equipment.equipment_code.toUpperCase(), equipment)
    })

    // 담당자명 -> 담당자 매핑
    const technicianMap = new Map<string, TechnicianInfo>()
    technicians.forEach((tech) => {
      technicianMap.set(tech.name.toLowerCase(), tech)
    })

    // 일정 시트 파싱
    const scheduleSheet = workbook.getWorksheet(L.sheetSchedules) || workbook.getWorksheet(1)
    if (!scheduleSheet) {
      errors.push({
        row: 0,
        column: '-',
        message: language === 'ko'
          ? '일정 시트를 찾을 수 없습니다'
          : 'Không tìm thấy sheet lịch PM'
      })
      return { success: false, schedules: [], errors }
    }

    scheduleSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return // 헤더 건너뛰기

      const templateName = String(row.getCell(1).value || '').trim()
      const equipmentCode = String(row.getCell(2).value || '').trim().toUpperCase()
      let scheduledDate = ''

      // 날짜 처리
      const dateCell = row.getCell(3).value
      if (dateCell instanceof Date) {
        scheduledDate = dateCell.toISOString().split('T')[0]
      } else if (typeof dateCell === 'string') {
        scheduledDate = dateCell.trim()
      } else if (typeof dateCell === 'number') {
        // Excel serial date number
        const date = new Date((dateCell - 25569) * 86400 * 1000)
        scheduledDate = date.toISOString().split('T')[0]
      }

      const priorityStr = String(row.getCell(4).value || '').trim()
      const technicianName = String(row.getCell(5).value || '').trim()
      const notes = String(row.getCell(6).value || '').trim()

      // 빈 행 또는 힌트 행 건너뛰기
      if (!templateName || templateName.startsWith('※')) return
      if (!equipmentCode) return

      // 템플릿 검증
      const template = templateMap.get(templateName.toLowerCase())
      if (!template) {
        errors.push({
          row: rowNumber,
          column: 'A',
          message: language === 'ko'
            ? `유효하지 않은 템플릿명: ${templateName}`
            : `Tên mẫu không hợp lệ: ${templateName}`
        })
        return
      }

      // 설비 검증
      const equipment = equipmentMap.get(equipmentCode)
      if (!equipment) {
        errors.push({
          row: rowNumber,
          column: 'B',
          message: language === 'ko'
            ? `유효하지 않은 설비코드: ${equipmentCode}`
            : `Mã thiết bị không hợp lệ: ${equipmentCode}`
        })
        return
      }

      // 템플릿과 설비 유형 일치 검증
      if (template.equipment_type_id !== equipment.equipment_type_id) {
        errors.push({
          row: rowNumber,
          column: 'B',
          message: language === 'ko'
            ? `템플릿 설비유형과 불일치: ${equipmentCode}`
            : `Loại thiết bị không khớp với mẫu: ${equipmentCode}`
        })
        return
      }

      // 날짜 검증
      if (!scheduledDate || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
        errors.push({
          row: rowNumber,
          column: 'C',
          message: language === 'ko'
            ? `유효하지 않은 날짜형식: ${scheduledDate}`
            : `Định dạng ngày không hợp lệ: ${scheduledDate}`
        })
        return
      }

      // 우선순위 파싱
      let priority: PMPriority = 'medium'
      if (priorityStr) {
        const parsedPriority = PRIORITY_MAP[priorityStr]
        if (parsedPriority) {
          priority = parsedPriority
        } else {
          // 영어 값도 지원
          const priorityLower = priorityStr.toLowerCase()
          if (priorityLower === 'high') priority = 'high'
          else if (priorityLower === 'low') priority = 'low'
          else priority = 'medium'
        }
      }

      // 담당자 찾기 (선택사항)
      let technician: TechnicianInfo | undefined
      if (technicianName) {
        technician = technicianMap.get(technicianName.toLowerCase())
        // 담당자를 못 찾아도 경고만 하고 진행
      }

      schedules.push({
        template_id: template.id,
        template_name: template.name,
        equipment_id: equipment.id,
        equipment_code: equipment.equipment_code,
        scheduled_date: scheduledDate,
        priority,
        assigned_technician_id: technician?.id,
        assigned_technician_name: technician?.name,
        notes: notes || undefined,
      })
    })

    return {
      success: errors.length === 0,
      schedules,
      errors,
    }
  } catch (error) {
    console.error('Excel parsing error:', error)
    errors.push({
      row: 0,
      column: '-',
      message: language === 'ko'
        ? `파일 처리 오류: ${error instanceof Error ? error.message : 'Unknown error'}`
        : `Lỗi xử lý file: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
    return { success: false, schedules: [], errors }
  }
}
