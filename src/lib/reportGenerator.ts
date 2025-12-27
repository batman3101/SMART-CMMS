import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { maintenanceApi, equipmentApi, statisticsApi } from './api'
import type { Equipment, MaintenanceRecord, TechnicianPerformance, EquipmentFailureRank } from '@/types'
import { addKoreanFontToDocument, getKoreanFontName } from './pdfFonts'

// Report types
export type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom'

export interface ReportSections {
  summary: boolean
  equipmentStatus: boolean
  repairHistory: boolean
  failureRanking: boolean
  technicianPerformance: boolean
}

export interface ReportData {
  type: ReportType
  startDate: string
  endDate: string
  language: 'ko' | 'vi'
  sections?: ReportSections
  equipmentIds?: string[]
}

export interface ReportResult {
  blob: Blob
  filename: string
}

// Labels for Korean and Vietnamese
const labels = {
  ko: {
    title: 'SMART CMMS 유지보수 리포트',
    dailyReport: '일간 리포트',
    weeklyReport: '주간 리포트',
    monthlyReport: '월간 리포트',
    customReport: '사용자 정의 리포트',
    period: '기간',
    generatedAt: '생성일시',
    summary: '요약',
    totalEquipment: '총 설비 수',
    totalRepairs: '총 수리 건수',
    avgRepairTime: '평균 수리 시간',
    emergencyRatio: '긴급 수리 비율',
    equipmentStatus: '설비 현황',
    statusNormal: '정상',
    statusRepair: '수리중',
    statusPM: 'PM중',
    statusStandby: '대기',
    repairHistory: '수리 이력',
    date: '날짜',
    equipmentCode: '설비코드',
    equipmentName: '설비명',
    repairType: '수리유형',
    technician: '담당자',
    duration: '소요시간(분)',
    topFailures: '고장 빈도 TOP 5',
    rank: '순위',
    failureCount: '고장횟수',
    downtime: '다운타임(분)',
    technicianPerformance: '담당자별 실적',
    completedCount: '완료건수',
    avgTime: '평균시간(분)',
    rating: '평점',
    minutes: '분',
    page: '페이지',
    noData: '데이터 없음',
  },
  vi: {
    title: 'Bao cao Bao tri SMART CMMS',
    dailyReport: 'Bao cao Hang ngay',
    weeklyReport: 'Bao cao Hang tuan',
    monthlyReport: 'Bao cao Hang thang',
    customReport: 'Bao cao Tuy chinh',
    period: 'Thoi gian',
    generatedAt: 'Ngay tao',
    summary: 'Tong quan',
    totalEquipment: 'Tong so thiet bi',
    totalRepairs: 'Tong so sua chua',
    avgRepairTime: 'Thoi gian sua TB',
    emergencyRatio: 'Ty le khan cap',
    equipmentStatus: 'Trang thai thiet bi',
    statusNormal: 'Binh thuong',
    statusRepair: 'Dang sua',
    statusPM: 'Dang PM',
    statusStandby: 'Cho',
    repairHistory: 'Lich su sua chua',
    date: 'Ngay',
    equipmentCode: 'Ma thiet bi',
    equipmentName: 'Ten thiet bi',
    repairType: 'Loai sua',
    technician: 'Ky thuat vien',
    duration: 'Thoi gian(phut)',
    topFailures: 'TOP 5 Hong hoc',
    rank: 'Thu hang',
    failureCount: 'So lan hong',
    downtime: 'Downtime(phut)',
    technicianPerformance: 'Hieu suat ky thuat vien',
    completedCount: 'So hoan thanh',
    avgTime: 'TB thoi gian(phut)',
    rating: 'Danh gia',
    minutes: 'phut',
    page: 'Trang',
    noData: 'Khong co du lieu',
  },
}

// Repair type mapping
const repairTypeLabels: Record<string, { ko: string; vi: string }> = {
  PM: { ko: '예방정비', vi: 'Bao tri' },
  BR: { ko: '고장수리', vi: 'Hong hoc' },
  PD: { ko: '예측정비', vi: 'Du doan' },
  QA: { ko: '품질관련', vi: 'Chat luong' },
  EM: { ko: '긴급수리', vi: 'Khan cap' },
}

export async function generateReport(data: ReportData): Promise<ReportResult> {
  const { type, startDate, endDate, language, sections, equipmentIds } = data
  const lang = labels[language] || labels.ko

  // Default all sections to true if not specified
  const includeSections: ReportSections = sections || {
    summary: true,
    equipmentStatus: true,
    repairHistory: true,
    failureRanking: true,
    technicianPerformance: true,
  }

  // Check if specific equipment is selected
  const hasEquipmentFilter = equipmentIds && equipmentIds.length > 0

  // Fetch real data from APIs
  const [
    equipmentsRes,
    maintenanceRes,
    failureRankRes,
    techPerformanceRes,
  ] = await Promise.all([
    equipmentApi.getEquipments(),
    maintenanceApi.getRecords({ startDate, endDate }),
    statisticsApi.getEquipmentFailureRank(10),
    statisticsApi.getTechnicianPerformance(),
  ])

  let equipments: Equipment[] = equipmentsRes.data || []
  let maintenanceRecords: MaintenanceRecord[] = maintenanceRes.data || []
  let failureRank: EquipmentFailureRank[] = failureRankRes.data || []
  const techPerformance: TechnicianPerformance[] = techPerformanceRes.data || []

  // Apply equipment filter if specific equipment is selected
  if (hasEquipmentFilter) {
    equipments = equipments.filter(eq => equipmentIds.includes(eq.id))
    maintenanceRecords = maintenanceRecords.filter(record => {
      const equipmentId = (record.equipment as { id?: string })?.id
      return equipmentId && equipmentIds.includes(equipmentId)
    })
    // Filter failure rank by equipment codes
    const selectedEquipmentCodes = equipments.map(eq => eq.equipment_code)
    failureRank = failureRank.filter(item =>
      item.equipment_code && selectedEquipmentCodes.includes(item.equipment_code)
    )
  }

  // Calculate summary stats
  const totalRepairs = maintenanceRecords.length
  const completedRepairs = maintenanceRecords.filter(r => r.status === 'completed')
  const totalDuration = completedRepairs.reduce((sum, r) => sum + (r.duration_minutes || 0), 0)
  const avgRepairTime = completedRepairs.length > 0 ? Math.round(totalDuration / completedRepairs.length) : 0
  const emergencyCount = maintenanceRecords.filter(r => {
    const rt = r.repair_type as { code?: string } | null
    return rt?.code === 'EM'
  }).length
  const emergencyRatio = totalRepairs > 0 ? emergencyCount / totalRepairs : 0

  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // Add Korean font support
  await addKoreanFontToDocument(doc)
  const fontName = getKoreanFontName()

  // Ensure font is set for all text operations
  doc.setFont(fontName)

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let yPosition = margin

  // Helper function to add new page if needed
  const checkNewPage = (requiredHeight: number): boolean => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      doc.addPage()
      yPosition = margin
      return true
    }
    return false
  }

  // Helper function to add page numbers
  const addPageNumbers = (): void => {
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFont(fontName)
      doc.setFontSize(9)
      doc.setTextColor(128, 128, 128)
      doc.text(`${lang.page} ${i} / ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' })
    }
  }

  // === HEADER ===
  doc.setFontSize(20)
  doc.setTextColor(41, 98, 255)
  doc.text('SMART CMMS', margin, yPosition)
  yPosition += 8

  doc.setFontSize(14)
  doc.setTextColor(60, 60, 60)
  const reportTitle = type === 'daily' ? lang.dailyReport :
                      type === 'weekly' ? lang.weeklyReport :
                      type === 'monthly' ? lang.monthlyReport : lang.customReport
  doc.text(reportTitle, margin, yPosition)
  yPosition += 8

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`${lang.period}: ${startDate} ~ ${endDate}`, margin, yPosition)
  yPosition += 5
  doc.text(`${lang.generatedAt}: ${new Date().toLocaleString()}`, margin, yPosition)
  yPosition += 10

  // Horizontal line
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 10

  // Track section number for proper numbering
  let sectionNumber = 0
  const boxWidth = (pageWidth - margin * 2 - 15) / 4

  // === SUMMARY SECTION ===
  if (includeSections.summary) {
    sectionNumber++
    doc.setFontSize(14)
    doc.setTextColor(41, 98, 255)
    doc.text(`${sectionNumber}. ${lang.summary}`, margin, yPosition)
    yPosition += 8

    // Summary boxes
    const boxHeight = 25
    const summaryData = [
      { label: lang.totalEquipment, value: String(equipments.length) },
      { label: lang.totalRepairs, value: String(totalRepairs) },
      { label: lang.avgRepairTime, value: `${avgRepairTime} ${lang.minutes}` },
      { label: lang.emergencyRatio, value: `${Math.round(emergencyRatio * 100)}%` },
    ]

    summaryData.forEach((item, index) => {
      const x = margin + (boxWidth + 5) * index
      doc.setFillColor(245, 247, 250)
      doc.roundedRect(x, yPosition, boxWidth, boxHeight, 3, 3, 'F')
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text(item.label, x + boxWidth / 2, yPosition + 8, { align: 'center' })
      doc.setFontSize(14)
      doc.setTextColor(41, 98, 255)
      doc.text(item.value, x + boxWidth / 2, yPosition + 18, { align: 'center' })
    })
    yPosition += boxHeight + 10
  }

  // === EQUIPMENT STATUS ===
  if (includeSections.equipmentStatus) {
    sectionNumber++
    doc.setFontSize(14)
    doc.setTextColor(41, 98, 255)
    doc.text(`${sectionNumber}. ${lang.equipmentStatus}`, margin, yPosition)
    yPosition += 8

    const statusCounts = {
      normal: equipments.filter((e: Equipment) => e.status === 'normal').length,
      repair: equipments.filter((e: Equipment) => e.status === 'repair').length,
      pm: equipments.filter((e: Equipment) => e.status === 'pm').length,
      standby: equipments.filter((e: Equipment) => e.status === 'standby').length,
    }

    const statusData = [
      { label: lang.statusNormal, value: statusCounts.normal, color: [16, 185, 129] as [number, number, number] },
      { label: lang.statusRepair, value: statusCounts.repair, color: [245, 158, 11] as [number, number, number] },
      { label: lang.statusPM, value: statusCounts.pm, color: [59, 130, 246] as [number, number, number] },
      { label: lang.statusStandby, value: statusCounts.standby, color: [156, 163, 175] as [number, number, number] },
    ]

    statusData.forEach((item, index) => {
      const x = margin + (boxWidth + 5) * index
      doc.setFillColor(item.color[0], item.color[1], item.color[2])
      doc.roundedRect(x, yPosition, boxWidth, 20, 3, 3, 'F')
      doc.setFontSize(10)
      doc.setTextColor(255, 255, 255)
      doc.text(item.label, x + boxWidth / 2, yPosition + 8, { align: 'center' })
      doc.setFontSize(14)
      doc.text(String(item.value), x + boxWidth / 2, yPosition + 16, { align: 'center' })
    })
    yPosition += 30
  }

  // === REPAIR HISTORY TABLE ===
  if (includeSections.repairHistory) {
    checkNewPage(60)
    sectionNumber++
    doc.setFontSize(14)
    doc.setTextColor(41, 98, 255)
    doc.text(`${sectionNumber}. ${lang.repairHistory}`, margin, yPosition)
    yPosition += 5

    if (maintenanceRecords.length > 0) {
      const repairTableData = maintenanceRecords.slice(0, 20).map((record: MaintenanceRecord) => {
        const rtCode = (record.repair_type as { code?: string })?.code || ''
        const rtLabel = repairTypeLabels[rtCode]?.[language] || rtCode
        return [
          record.date || '-',
          (record.equipment as { equipment_code?: string })?.equipment_code || '-',
          rtLabel,
          (record.technician as { name?: string })?.name || '-',
          String(record.duration_minutes || 0),
        ]
      })

      // Explicitly set font before autoTable
      doc.setFont(fontName)
      autoTable(doc, {
        startY: yPosition,
        head: [[lang.date, lang.equipmentCode, lang.repairType, lang.technician, lang.duration]],
        body: repairTableData,
        theme: 'striped',
        headStyles: { fillColor: [41, 98, 255], fontSize: 9, font: fontName, fontStyle: 'normal' },
        bodyStyles: { fontSize: 8, font: fontName, fontStyle: 'normal' },
        styles: { font: fontName, fontStyle: 'normal' },
        margin: { left: margin, right: margin },
      })

      yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
    } else {
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.setFont(fontName)
      doc.text(lang.noData, margin, yPosition + 10)
      yPosition += 20
    }
  }

  // === TOP FAILURE EQUIPMENT ===
  if (includeSections.failureRanking) {
    checkNewPage(60)
    sectionNumber++
    doc.setFontSize(14)
    doc.setTextColor(41, 98, 255)
    doc.text(`${sectionNumber}. ${lang.topFailures}`, margin, yPosition)
    yPosition += 5

    if (failureRank.length > 0) {
      const failureTableData = failureRank.slice(0, 5).map((item: EquipmentFailureRank, index: number) => [
        String(index + 1),
        item.equipment_code || '-',
        item.equipment_name || '-',
        String(item.failure_count || 0),
        String(item.total_downtime_minutes || 0),
      ])

      // Explicitly set font before autoTable
      doc.setFont(fontName)
      autoTable(doc, {
        startY: yPosition,
        head: [[lang.rank, lang.equipmentCode, lang.equipmentName, lang.failureCount, lang.downtime]],
        body: failureTableData,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68], fontSize: 9, font: fontName, fontStyle: 'normal' },
        bodyStyles: { fontSize: 8, font: fontName, fontStyle: 'normal' },
        styles: { font: fontName, fontStyle: 'normal' },
        margin: { left: margin, right: margin },
      })

      yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
    } else {
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.setFont(fontName)
      doc.text(lang.noData, margin, yPosition + 10)
      yPosition += 20
    }
  }

  // === TECHNICIAN PERFORMANCE ===
  if (includeSections.technicianPerformance) {
    checkNewPage(60)
    sectionNumber++
    doc.setFontSize(14)
    doc.setTextColor(41, 98, 255)
    doc.text(`${sectionNumber}. ${lang.technicianPerformance}`, margin, yPosition)
    yPosition += 5

    if (techPerformance.length > 0) {
      const techTableData = techPerformance.slice(0, 10).map((item: TechnicianPerformance) => [
        item.technician_name || '-',
        String(item.completed_count || 0),
        String(Math.round(item.avg_repair_time || 0)),
        item.avg_rating ? item.avg_rating.toFixed(1) : '-',
      ])

      // Explicitly set font before autoTable
      doc.setFont(fontName)
      autoTable(doc, {
        startY: yPosition,
        head: [[lang.technician, lang.completedCount, lang.avgTime, lang.rating]],
        body: techTableData,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129], fontSize: 9, font: fontName, fontStyle: 'normal' },
        bodyStyles: { fontSize: 8, font: fontName, fontStyle: 'normal' },
        styles: { font: fontName, fontStyle: 'normal' },
        margin: { left: margin, right: margin },
      })
    } else {
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.setFont(fontName)
      doc.text(lang.noData, margin, yPosition + 10)
    }
  }

  // Add page numbers
  addPageNumbers()

  // Generate filename
  const reportTypeName = type === 'daily' ? 'Daily' :
                         type === 'weekly' ? 'Weekly' :
                         type === 'monthly' ? 'Monthly' : 'Custom'
  const filename = `${reportTypeName}_Report_${new Date().toISOString().split('T')[0]}.pdf`

  // Convert to blob
  const blob = doc.output('blob')

  return { blob, filename }
}
