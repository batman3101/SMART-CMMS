import ExcelJS from 'exceljs'
import type { PMTemplate, PMIntervalType, PMChecklistItem, PMRequiredPart, EquipmentType } from '@/types'

export type ExcelLanguage = 'ko' | 'vi'

/**
 * ExcelJS 셀 값을 문자열로 안전하게 추출
 * Rich Text, 객체 등 다양한 형태를 처리
 */
function getCellValueAsString(cellValue: ExcelJS.CellValue): string {
  if (cellValue === null || cellValue === undefined) {
    return ''
  }

  // Rich Text 객체인 경우
  if (typeof cellValue === 'object' && 'richText' in cellValue) {
    const richText = cellValue as ExcelJS.CellRichTextValue
    return richText.richText.map(rt => rt.text).join('')
  }

  // 일반 객체인 경우 (Date 등)
  if (typeof cellValue === 'object') {
    if (cellValue instanceof Date) {
      return cellValue.toISOString()
    }
    // 다른 객체는 text 속성이 있으면 추출
    if ('text' in cellValue && typeof (cellValue as { text: unknown }).text === 'string') {
      return (cellValue as { text: string }).text
    }
    // result 속성 (formula 결과)
    if ('result' in cellValue) {
      return getCellValueAsString((cellValue as { result: ExcelJS.CellValue }).result)
    }
    return ''
  }

  // 문자열, 숫자, boolean 등
  return String(cellValue)
}

// 주기 유형 한글 매핑
const INTERVAL_TYPE_KO: Record<string, PMIntervalType> = {
  '일간': 'daily',
  '주간': 'weekly',
  '월간': 'monthly',
  '분기': 'quarterly',
  '연간': 'yearly',
}

// 주기 유형 베트남어 매핑
const INTERVAL_TYPE_VI: Record<string, PMIntervalType> = {
  'Hàng ngày': 'daily',
  'Hàng tuần': 'weekly',
  'Hàng tháng': 'monthly',
  'Hàng quý': 'quarterly',
  'Hàng năm': 'yearly',
}

const INTERVAL_TYPE_TO_KO: Record<PMIntervalType, string> = {
  daily: '일간',
  weekly: '주간',
  monthly: '월간',
  quarterly: '분기',
  yearly: '연간',
}

const INTERVAL_TYPE_TO_VI: Record<PMIntervalType, string> = {
  daily: 'Hàng ngày',
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
  quarterly: 'Hàng quý',
  yearly: 'Hàng năm',
}

// 언어별 레이블
const LABELS = {
  ko: {
    // Sheet names
    sheetTemplate: '템플릿',
    sheetChecklist: '체크리스트',
    sheetParts: '필요부품',
    sheetReference: '설비유형 코드표',
    // Template sheet
    templateName: '템플릿명 *',
    description: '설명',
    equipmentTypeCode: '설비유형코드 *',
    intervalType: '주기유형 *',
    intervalValue: '주기값 *',
    estimatedDuration: '예상소요시간(분)',
    intervalHint: '※ 주기유형: 일간/주간/월간/분기/연간 중 선택',
    // Checklist sheet
    order: '순서',
    inspectionArea: '점검 부위',
    checklistItem: '체크항목 *',
    isRequired: '필수여부',
    requiredHint: '※ 필수여부: Y(필수) 또는 N(선택)',
    // Parts sheet
    partCode: '부품코드 *',
    partName: '부품명 *',
    quantity: '수량 *',
    // Reference sheet
    equipmentTypeCodeRef: '설비유형코드',
    equipmentTypeName: '설비유형명',
    // Example data
    exampleTemplateName: 'CNC 밀링 머신 월간 PM (예시)',
    exampleDescription: 'CNC 밀링 머신 월간 정기 점검',
    exampleChecklist1: '스핀들 윤활유 점검',
    exampleChecklist2: '에어 필터 청소',
    exampleChecklist3: '쿨런트 레벨 확인',
  },
  vi: {
    // Sheet names
    sheetTemplate: 'Mẫu',
    sheetChecklist: 'Danh sách kiểm tra',
    sheetParts: 'Phụ tùng cần thiết',
    sheetReference: 'Bảng mã loại thiết bị',
    // Template sheet
    templateName: 'Tên mẫu *',
    description: 'Mô tả',
    equipmentTypeCode: 'Mã loại thiết bị *',
    intervalType: 'Loại chu kỳ *',
    intervalValue: 'Giá trị chu kỳ *',
    estimatedDuration: 'Thời gian dự kiến (phút)',
    intervalHint: '※ Loại chu kỳ: Hàng ngày/Hàng tuần/Hàng tháng/Hàng quý/Hàng năm',
    // Checklist sheet
    order: 'Thứ tự',
    inspectionArea: 'Khu vực kiểm tra',
    checklistItem: 'Mục kiểm tra *',
    isRequired: 'Bắt buộc',
    requiredHint: '※ Bắt buộc: Y(Có) hoặc N(Không)',
    // Parts sheet
    partCode: 'Mã phụ tùng *',
    partName: 'Tên phụ tùng *',
    quantity: 'Số lượng *',
    // Reference sheet
    equipmentTypeCodeRef: 'Mã loại thiết bị',
    equipmentTypeName: 'Tên loại thiết bị',
    // Example data
    exampleTemplateName: 'PM hàng tháng máy CNC phay (Ví dụ)',
    exampleDescription: 'Kiểm tra định kỳ hàng tháng máy CNC phay',
    exampleChecklist1: 'Kiểm tra dầu bôi trơn trục chính',
    exampleChecklist2: 'Vệ sinh bộ lọc khí',
    exampleChecklist3: 'Kiểm tra mức dung dịch làm mát',
  },
}

export interface ValidationError {
  sheet: string
  row: number
  column: string
  message: string
}

export interface ParsedTemplate {
  name: string
  name_ko?: string
  name_vi?: string
  description: string
  description_ko?: string
  description_vi?: string
  equipment_type_id: string
  equipment_type_code: string
  interval_type: PMIntervalType
  interval_value: number
  estimated_duration: number
  checklist_items: (Omit<PMChecklistItem, 'id'> & {
    description_ko?: string
    description_vi?: string
  })[]
  required_parts: PMRequiredPart[]
}

export interface UploadResult {
  success: boolean
  templates: ParsedTemplate[]
  errors: ValidationError[]
}

/**
 * PM 템플릿 Excel 양식 다운로드
 */
export async function downloadPMTemplateExcel(
  equipmentTypes: EquipmentType[],
  language: ExcelLanguage = 'ko'
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'AMMS'
  workbook.created = new Date()

  const L = LABELS[language]
  const intervalTypes = language === 'ko'
    ? ['일간', '주간', '월간', '분기', '연간']
    : ['Hàng ngày', 'Hàng tuần', 'Hàng tháng', 'Hàng quý', 'Hàng năm']

  // ============================================
  // Sheet 1: 템플릿 기본정보
  // ============================================
  const templateSheet = workbook.addWorksheet(L.sheetTemplate, {
    properties: { tabColor: { argb: '3B82F6' } }
  })

  templateSheet.columns = [
    { header: L.templateName, key: 'name', width: 35 },
    { header: L.description, key: 'description', width: 45 },
    { header: L.equipmentTypeCode, key: 'equipment_type_code', width: 22 },
    { header: L.intervalType, key: 'interval_type', width: 18 },
    { header: L.intervalValue, key: 'interval_value', width: 14 },
    { header: L.estimatedDuration, key: 'estimated_duration', width: 20 },
  ]

  // 헤더 스타일링
  templateSheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '3B82F6' }
    }
    cell.font = { bold: true, color: { argb: 'FFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  })

  // 예시 데이터
  templateSheet.addRow({
    name: L.exampleTemplateName,
    description: L.exampleDescription,
    equipment_type_code: 'CNC',
    interval_type: intervalTypes[2], // monthly
    interval_value: 1,
    estimated_duration: 60,
  })

  // 주기유형 안내를 위한 행 추가
  const hintRow = templateSheet.addRow({
    name: L.intervalHint,
    description: '',
    equipment_type_code: '',
    interval_type: '',
    interval_value: '',
    estimated_duration: '',
  })
  hintRow.getCell(1).font = { italic: true, color: { argb: '9CA3AF' } }

  // ============================================
  // Sheet 2: 체크리스트
  // ============================================
  const checklistSheet = workbook.addWorksheet(L.sheetChecklist, {
    properties: { tabColor: { argb: '10B981' } }
  })

  checklistSheet.columns = [
    { header: L.templateName, key: 'template_name', width: 35 },
    { header: L.order, key: 'order', width: 10 },
    { header: L.inspectionArea, key: 'inspection_area', width: 25 },
    { header: L.checklistItem, key: 'description', width: 55 },
    { header: L.isRequired, key: 'is_required', width: 14 },
  ]

  checklistSheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '10B981' }
    }
    cell.font = { bold: true, color: { argb: 'FFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  })

  // 예시 데이터
  checklistSheet.addRow({
    template_name: L.exampleTemplateName,
    order: 1,
    inspection_area: language === 'ko' ? '스핀들' : 'Trục chính',
    description: L.exampleChecklist1,
    is_required: 'Y',
  })
  checklistSheet.addRow({
    template_name: L.exampleTemplateName,
    order: 2,
    inspection_area: language === 'ko' ? '에어 시스템' : 'Hệ thống khí',
    description: L.exampleChecklist2,
    is_required: 'Y',
  })
  checklistSheet.addRow({
    template_name: L.exampleTemplateName,
    order: 3,
    inspection_area: language === 'ko' ? '쿨런트 시스템' : 'Hệ thống làm mát',
    description: L.exampleChecklist3,
    is_required: 'N',
  })

  // 필수여부 안내를 위한 행 추가
  const checklistHintRow = checklistSheet.addRow({
    template_name: L.requiredHint,
    order: '',
    inspection_area: '',
    description: '',
    is_required: '',
  })
  checklistHintRow.getCell(1).font = { italic: true, color: { argb: '9CA3AF' } }

  // ============================================
  // Sheet 3: 필요부품
  // ============================================
  const partsSheet = workbook.addWorksheet(L.sheetParts, {
    properties: { tabColor: { argb: 'F59E0B' } }
  })

  partsSheet.columns = [
    { header: L.templateName, key: 'template_name', width: 35 },
    { header: L.partCode, key: 'part_code', width: 20 },
    { header: L.partName, key: 'part_name', width: 45 },
    { header: L.quantity, key: 'quantity', width: 12 },
  ]

  partsSheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F59E0B' }
    }
    cell.font = { bold: true, color: { argb: 'FFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  })

  // 예시 데이터
  partsSheet.addRow({
    template_name: L.exampleTemplateName,
    part_code: 'MT115',
    part_name: 'AIR FINN',
    quantity: 1,
  })

  // ============================================
  // Sheet 4: 설비유형 코드표 (참조용)
  // ============================================
  const refSheet = workbook.addWorksheet(L.sheetReference, {
    properties: { tabColor: { argb: '9CA3AF' } }
  })

  refSheet.columns = [
    { header: L.equipmentTypeCodeRef, key: 'code', width: 20 },
    { header: L.equipmentTypeName, key: 'name', width: 35 },
  ]

  refSheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '6B7280' }
    }
    cell.font = { bold: true, color: { argb: 'FFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  equipmentTypes.forEach((type) => {
    refSheet.addRow({ code: type.code, name: type.name })
  })

  // 파일 다운로드
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const langSuffix = language === 'ko' ? 'KO' : 'VI'
  link.download = `PM_Template_${langSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`
  link.click()
  window.URL.revokeObjectURL(url)
}

/**
 * PM 템플릿 Excel 파일 업로드 및 검증
 */
export async function uploadPMTemplateExcel(
  file: File,
  equipmentTypes: EquipmentType[],
  language: ExcelLanguage = 'ko'
): Promise<UploadResult> {
  const errors: ValidationError[] = []
  const templates: ParsedTemplate[] = []

  const L = LABELS[language]
  const intervalTypeMap = language === 'ko' ? INTERVAL_TYPE_KO : INTERVAL_TYPE_VI

  try {
    const workbook = new ExcelJS.Workbook()
    const arrayBuffer = await file.arrayBuffer()
    await workbook.xlsx.load(arrayBuffer)

    // 설비유형 코드 -> ID 매핑
    const equipmentTypeMap = new Map<string, EquipmentType>()
    equipmentTypes.forEach((type) => {
      equipmentTypeMap.set(type.code.toUpperCase(), type)
    })

    // ============================================
    // Sheet 1: 템플릿 기본정보 파싱
    // ============================================
    const templateSheet = workbook.getWorksheet(L.sheetTemplate) || workbook.getWorksheet(1)
    if (!templateSheet) {
      errors.push({
        sheet: L.sheetTemplate,
        row: 0,
        column: '-',
        message: language === 'ko'
          ? `"${L.sheetTemplate}" 시트를 찾을 수 없습니다`
          : `Không tìm thấy sheet "${L.sheetTemplate}"`
      })
      return { success: false, templates: [], errors }
    }

    const templateMap = new Map<string, ParsedTemplate>()

    templateSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return // 헤더 건너뛰기

      const name = getCellValueAsString(row.getCell(1).value).trim()
      const description = getCellValueAsString(row.getCell(2).value).trim()
      const equipmentTypeCode = getCellValueAsString(row.getCell(3).value).trim().toUpperCase()
      const intervalTypeStr = getCellValueAsString(row.getCell(4).value).trim()
      const intervalValue = Number(row.getCell(5).value) || 0
      const estimatedDuration = Number(row.getCell(6).value) || 60

      // 빈 행 또는 힌트 행 건너뛰기
      if (!name || name.startsWith('※')) return
      if (!equipmentTypeCode) return

      // 중복 템플릿명 검사
      if (templateMap.has(name)) {
        errors.push({
          sheet: L.sheetTemplate,
          row: rowNumber,
          column: 'A',
          message: language === 'ko'
            ? `중복된 템플릿명: ${name}`
            : `Tên mẫu trùng lặp: ${name}`
        })
        return
      }

      // 설비유형 검증
      const equipmentType = equipmentTypeMap.get(equipmentTypeCode)
      if (!equipmentType) {
        errors.push({
          sheet: L.sheetTemplate,
          row: rowNumber,
          column: 'C',
          message: language === 'ko'
            ? `유효하지 않은 설비유형코드: ${equipmentTypeCode}`
            : `Mã loại thiết bị không hợp lệ: ${equipmentTypeCode}`
        })
        return
      }

      // 주기유형 검증
      const intervalType = intervalTypeMap[intervalTypeStr]
      if (!intervalType) {
        errors.push({
          sheet: L.sheetTemplate,
          row: rowNumber,
          column: 'D',
          message: language === 'ko'
            ? `유효하지 않은 주기유형: ${intervalTypeStr}`
            : `Loại chu kỳ không hợp lệ: ${intervalTypeStr}`
        })
        return
      }

      // 주기값 검증
      if (intervalValue < 1) {
        errors.push({
          sheet: L.sheetTemplate,
          row: rowNumber,
          column: 'E',
          message: language === 'ko'
            ? '주기값은 1 이상이어야 합니다'
            : 'Giá trị chu kỳ phải >= 1'
        })
        return
      }

      // 언어에 따라 name_ko 또는 name_vi 설정
      const template: ParsedTemplate = {
        name,
        name_ko: language === 'ko' ? name : undefined,
        name_vi: language === 'vi' ? name : undefined,
        description,
        description_ko: language === 'ko' ? description : undefined,
        description_vi: language === 'vi' ? description : undefined,
        equipment_type_id: equipmentType.id,
        equipment_type_code: equipmentTypeCode,
        interval_type: intervalType,
        interval_value: intervalValue,
        estimated_duration: estimatedDuration > 0 ? estimatedDuration : 60,
        checklist_items: [],
        required_parts: [],
      }

      templateMap.set(name, template)
    })

    // ============================================
    // Sheet 2: 체크리스트 파싱
    // ============================================
    const checklistSheet = workbook.getWorksheet(L.sheetChecklist) || workbook.getWorksheet(2)
    if (checklistSheet) {
      checklistSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return // 헤더 건너뛰기

        const templateName = getCellValueAsString(row.getCell(1).value).trim()
        const order = Number(row.getCell(2).value) || rowNumber - 1
        const inspectionArea = getCellValueAsString(row.getCell(3).value).trim()
        const description = getCellValueAsString(row.getCell(4).value).trim()
        const isRequiredStr = getCellValueAsString(row.getCell(5).value || 'Y').trim().toUpperCase()

        // 빈 행 또는 힌트 행 건너뛰기
        if (!templateName || templateName.startsWith('※')) return
        if (!description) return

        const template = templateMap.get(templateName)
        if (!template) {
          errors.push({
            sheet: L.sheetChecklist,
            row: rowNumber,
            column: 'A',
            message: language === 'ko'
              ? `"${L.sheetTemplate}" 시트에 없는 템플릿명: ${templateName}`
              : `Tên mẫu không có trong sheet "${L.sheetTemplate}": ${templateName}`
          })
          return
        }

        template.checklist_items.push({
          order,
          inspection_area: inspectionArea || undefined,
          description,
          description_ko: language === 'ko' ? description : undefined,
          description_vi: language === 'vi' ? description : undefined,
          is_required: isRequiredStr === 'Y' || isRequiredStr === 'YES' || isRequiredStr === '예' || isRequiredStr === 'CÓ',
        })
      })
    }

    // ============================================
    // Sheet 3: 필요부품 파싱
    // ============================================
    const partsSheet = workbook.getWorksheet(L.sheetParts) || workbook.getWorksheet(3)
    if (partsSheet) {
      partsSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return // 헤더 건너뛰기

        const templateName = getCellValueAsString(row.getCell(1).value).trim()
        const partCode = getCellValueAsString(row.getCell(2).value).trim()
        const partName = getCellValueAsString(row.getCell(3).value).trim()
        const quantity = Number(row.getCell(4).value) || 1

        // 빈 행 건너뛰기
        if (!templateName || !partCode) return

        const template = templateMap.get(templateName)
        if (!template) {
          errors.push({
            sheet: L.sheetParts,
            row: rowNumber,
            column: 'A',
            message: language === 'ko'
              ? `"${L.sheetTemplate}" 시트에 없는 템플릿명: ${templateName}`
              : `Tên mẫu không có trong sheet "${L.sheetTemplate}": ${templateName}`
          })
          return
        }

        if (!partName) {
          errors.push({
            sheet: L.sheetParts,
            row: rowNumber,
            column: 'C',
            message: language === 'ko'
              ? '부품명은 필수입니다'
              : 'Tên phụ tùng là bắt buộc'
          })
          return
        }

        template.required_parts.push({
          part_code: partCode,
          part_name: partName,
          quantity: quantity > 0 ? quantity : 1,
        })
      })
    }

    // 체크리스트 정렬
    templateMap.forEach((template) => {
      template.checklist_items.sort((a, b) => a.order - b.order)
    })

    // 결과 반환
    templates.push(...templateMap.values())

    return {
      success: errors.length === 0,
      templates,
      errors,
    }
  } catch (error) {
    console.error('Excel parsing error:', error)
    errors.push({
      sheet: '-',
      row: 0,
      column: '-',
      message: language === 'ko'
        ? `파일 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`
        : `Lỗi xử lý file: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
    return { success: false, templates: [], errors }
  }
}

/**
 * 기존 템플릿 데이터를 Excel로 내보내기
 */
export async function exportPMTemplatesToExcel(
  templates: PMTemplate[],
  equipmentTypes: EquipmentType[],
  language: ExcelLanguage = 'ko'
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'AMMS'
  workbook.created = new Date()

  const L = LABELS[language]
  const intervalTypeToStr = language === 'ko' ? INTERVAL_TYPE_TO_KO : INTERVAL_TYPE_TO_VI

  // 설비유형 ID -> 코드 매핑
  const equipmentTypeIdMap = new Map<string, string>()
  equipmentTypes.forEach((type) => {
    equipmentTypeIdMap.set(type.id, type.code)
  })

  // Sheet 1: 템플릿
  const templateSheet = workbook.addWorksheet(L.sheetTemplate)
  templateSheet.columns = [
    { header: L.templateName, key: 'name', width: 35 },
    { header: L.description, key: 'description', width: 45 },
    { header: L.equipmentTypeCode, key: 'equipment_type_code', width: 22 },
    { header: L.intervalType, key: 'interval_type', width: 18 },
    { header: L.intervalValue, key: 'interval_value', width: 14 },
    { header: L.estimatedDuration, key: 'estimated_duration', width: 20 },
  ]

  templateSheet.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '3B82F6' } }
    cell.font = { bold: true, color: { argb: 'FFFFFF' } }
  })

  templates.forEach((template) => {
    // 언어에 따라 적절한 이름 선택
    const displayName = language === 'vi'
      ? (template.name_vi || template.name)
      : (template.name_ko || template.name)
    const displayDesc = language === 'vi'
      ? (template.description || '')
      : (template.description || '')

    templateSheet.addRow({
      name: displayName,
      description: displayDesc,
      equipment_type_code: equipmentTypeIdMap.get(template.equipment_type_id) || '',
      interval_type: intervalTypeToStr[template.interval_type],
      interval_value: template.interval_value,
      estimated_duration: template.estimated_duration,
    })
  })

  // Sheet 2: 체크리스트
  const checklistSheet = workbook.addWorksheet(L.sheetChecklist)
  checklistSheet.columns = [
    { header: L.templateName, key: 'template_name', width: 35 },
    { header: L.order, key: 'order', width: 10 },
    { header: L.inspectionArea, key: 'inspection_area', width: 25 },
    { header: L.checklistItem, key: 'description', width: 55 },
    { header: L.isRequired, key: 'is_required', width: 14 },
  ]

  checklistSheet.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '10B981' } }
    cell.font = { bold: true, color: { argb: 'FFFFFF' } }
  })

  templates.forEach((template) => {
    const displayName = language === 'vi'
      ? (template.name_vi || template.name)
      : (template.name_ko || template.name)

    template.checklist_items.forEach((item) => {
      const displayItemDesc = language === 'vi'
        ? (item.description_vi || item.description)
        : (item.description_ko || item.description)

      checklistSheet.addRow({
        template_name: displayName,
        order: item.order,
        inspection_area: item.inspection_area || '',
        description: displayItemDesc,
        is_required: item.is_required ? 'Y' : 'N',
      })
    })
  })

  // Sheet 3: 필요부품
  const partsSheet = workbook.addWorksheet(L.sheetParts)
  partsSheet.columns = [
    { header: L.templateName, key: 'template_name', width: 35 },
    { header: L.partCode, key: 'part_code', width: 20 },
    { header: L.partName, key: 'part_name', width: 45 },
    { header: L.quantity, key: 'quantity', width: 12 },
  ]

  partsSheet.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F59E0B' } }
    cell.font = { bold: true, color: { argb: 'FFFFFF' } }
  })

  templates.forEach((template) => {
    const displayName = language === 'vi'
      ? (template.name_vi || template.name)
      : (template.name_ko || template.name)

    template.required_parts.forEach((part) => {
      partsSheet.addRow({
        template_name: displayName,
        part_code: part.part_code,
        part_name: part.part_name,
        quantity: part.quantity,
      })
    })
  })

  // 파일 다운로드
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const langSuffix = language === 'ko' ? 'KO' : 'VI'
  link.download = `PM_Template_Export_${langSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`
  link.click()
  window.URL.revokeObjectURL(url)
}
