import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SortableTableHead } from '@/components/ui/sortable-table-head'
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { equipmentApi } from '@/lib/api'
import { useTableSort } from '@/hooks'
import type { EquipmentType } from '@/types'

interface UploadRow {
  rowNumber: number
  equipment_code: string
  equipment_name: string
  equipment_type_code: string
  building: string
  install_date: string
  manufacturer: string
  status: 'valid' | 'error' | 'warning'
  errors: string[]
}

interface UploadResult {
  success: number
  failed: number
  errors: string[]
}

export default function EquipmentBulkUploadPage() {
  const { t, i18n } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])
  const [uploadedData, setUploadedData] = useState<UploadRow[]>([])
  const [fileName, setFileName] = useState<string>('')
  const [isValidating, setIsValidating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)

  // 설비 유형 로드
  useEffect(() => {
    const fetchTypes = async () => {
      const { data } = await equipmentApi.getEquipmentTypes()
      if (data) setEquipmentTypes(data)
    }
    fetchTypes()
  }, [])

  // 엑셀 템플릿 다운로드
  const handleDownloadTemplate = () => {
    // CSV 템플릿 생성 (언어별 헤더)
    const isVietnamese = i18n.language === 'vi'
    const headers = isVietnamese
      ? ['Mã thiết bị', 'Tên thiết bị', 'Mã loại', 'Tòa nhà', 'Ngày lắp đặt', 'Nhà sản xuất']
      : ['설비코드', '설비명', '설비유형코드', '동', '설치일', '제조사']

    const sampleData = isVietnamese
      ? [
          ['CNC-001', 'Máy phay CNC #001', 'CNC', 'Tòa A', '2024-01-15', 'FANUC'],
          ['CNC-002', 'Máy phay CNC #002', 'CNC', 'Tòa B', '2024-01-15', 'Mazak'],
        ]
      : [
          ['CNC-001', 'CNC 밀링 머신 #001', 'CNC', 'A동', '2024-01-15', 'FANUC'],
          ['CNC-002', 'CNC 밀링 머신 #002', 'CNC', 'B동', '2024-01-15', 'Mazak'],
        ]

    const csvContent = [
      headers.join(','),
      ...sampleData.map((row) => row.join(',')),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'equipment_template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  // 파일 선택 처리
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setUploadResult(null)
    setIsValidating(true)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      parseCSV(text)
      setIsValidating(false)
    }
    reader.readAsText(file, 'UTF-8')
  }

  // CSV 파싱 및 검증
  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n').filter((line) => line.trim())
    if (lines.length < 2) {
      setUploadedData([])
      return
    }

    const dataRows = lines.slice(1) // 헤더 제외
    const parsedData: UploadRow[] = dataRows.map((line, index) => {
      const values = line.split(',').map((v) => v.trim().replace(/"/g, ''))
      const errors: string[] = []

      // 필수 필드 검증
      if (!values[0]) errors.push('설비코드 필수')
      if (!values[1]) errors.push('설비명 필수')
      if (!values[2]) errors.push('설비유형코드 필수')
      if (!values[3]) errors.push('동 필수')

      // 설비유형 코드 검증
      const typeCode = values[2]
      const validType = equipmentTypes.find((t) => t.code === typeCode)
      if (typeCode && !validType) {
        errors.push(`유효하지 않은 설비유형: ${typeCode}`)
      }

      // 날짜 형식 검증
      if (values[4] && !/^\d{4}-\d{2}-\d{2}$/.test(values[4])) {
        errors.push('설치일 형식 오류 (YYYY-MM-DD)')
      }

      return {
        rowNumber: index + 2, // 1-based, 헤더 제외
        equipment_code: values[0] || '',
        equipment_name: values[1] || '',
        equipment_type_code: values[2] || '',
        building: values[3] || '',
        install_date: values[4] || '',
        manufacturer: values[5] || '',
        status: errors.length > 0 ? 'error' : 'valid',
        errors,
      }
    })

    setUploadedData(parsedData)
  }

  // 드래그 앤 드롭 처리
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
      const input = fileInputRef.current
      if (input) {
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        input.files = dataTransfer.files
        handleFileSelect({ target: input } as React.ChangeEvent<HTMLInputElement>)
      }
    }
  }

  // 업로드 실행
  const handleUpload = async () => {
    const validRows = uploadedData.filter((row) => row.status === 'valid')
    if (validRows.length === 0) return

    setIsUploading(true)
    try {
      // DB에 저장할 데이터만 포함 (equipment_type 객체 제외)
      const equipments = validRows.map((row) => {
        const equipmentType = equipmentTypes.find((t) => t.code === row.equipment_type_code)
        return {
          equipment_code: row.equipment_code,
          equipment_name: row.equipment_name,
          equipment_type_id: equipmentType?.id || '',
          status: 'normal' as const,
          install_date: row.install_date || null,
          manufacturer: row.manufacturer || null,
          building: row.building,
          is_active: true,
        }
      })

      const { data, error } = await equipmentApi.bulkCreateEquipments(equipments)
      if (data) {
        setUploadResult({
          success: data.length,
          failed: 0,
          errors: [],
        })
      } else if (error) {
        setUploadResult({
          success: 0,
          failed: equipments.length,
          errors: [error],
        })
      }
    } catch (error) {
      console.error('Upload failed:', error)
      setUploadResult({
        success: 0,
        failed: validRows.length,
        errors: [t('equipment.uploadError')],
      })
    } finally {
      setIsUploading(false)
    }
  }

  // 초기화
  const handleReset = () => {
    setUploadedData([])
    setFileName('')
    setUploadResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const validCount = uploadedData.filter((r) => r.status === 'valid').length
  const errorCount = uploadedData.filter((r) => r.status === 'error').length

  // Sorting for preview table
  const { sortedData, requestSort, getSortDirection } = useTableSort<UploadRow>(
    uploadedData,
    { key: 'rowNumber', direction: 'asc' }
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">{t('equipment.bulkUpload')}</h1>
        {uploadedData.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleReset} className="self-start sm:self-auto h-9">
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('common.reset')}</span>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* 템플릿 다운로드 */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5" />
              {t('equipment.downloadTemplate')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t('equipment.templateDescription')}
            </p>
            <div className="rounded-lg bg-muted p-3 sm:p-4">
              <p className="mb-2 text-xs sm:text-sm font-medium">{t('equipment.requiredFields')}</p>
              <ul className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                <li>• {t('equipment.requiredFieldCode')}</li>
                <li>• {t('equipment.requiredFieldName')}</li>
                <li>• {t('equipment.requiredFieldType')}</li>
                <li>• {t('equipment.requiredFieldBuilding')}</li>
              </ul>
            </div>
            <Button variant="outline" onClick={handleDownloadTemplate} className="h-9 sm:h-10 text-sm">
              <Download className="mr-2 h-4 w-4" />
              {t('equipment.templateDownload')}
            </Button>
          </CardContent>
        </Card>

        {/* 파일 업로드 */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
              {t('common.upload')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div
              className="cursor-pointer rounded-lg border-2 border-dashed p-4 sm:p-8 text-center transition-colors hover:border-primary hover:bg-muted/50 active:bg-muted/50"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="mx-auto mb-3 sm:mb-4 h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
              {fileName ? (
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm font-medium truncate">{fileName}</p>
                  {isValidating ? (
                    <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('common.validating')}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
                      <Badge variant="success" className="text-xs">{t('common.validCount', { count: validCount })}</Badge>
                      {errorCount > 0 && <Badge variant="destructive" className="text-xs">{t('common.errorCount', { count: errorCount })}</Badge>}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t('equipment.uploadArea')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 업로드 결과 */}
      {uploadResult && (
        <Card className={uploadResult.failed > 0 ? 'border-yellow-500' : 'border-green-500'}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              {uploadResult.failed === 0 ? (
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <h3 className="mb-1 sm:mb-2 text-base sm:text-lg font-semibold">{t('equipment.uploadComplete')}</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {t('equipment.uploadResult', { success: uploadResult.success, failed: uploadResult.failed })}
                </p>
                {uploadResult.errors.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs sm:text-sm text-red-500">
                    {uploadResult.errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 미리보기 */}
      {uploadedData.length > 0 && !uploadResult && (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">{t('equipment.uploadPreview')}</CardTitle>
            <Button onClick={handleUpload} disabled={validCount === 0 || isUploading} className="h-9 sm:h-10 text-sm">
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.uploading')}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('equipment.uploadCount', { count: validCount })}
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            {/* 모바일 카드 뷰 */}
            <div className="md:hidden space-y-3 max-h-[400px] overflow-auto">
              {sortedData.map((row) => (
                <div
                  key={row.rowNumber}
                  className={`rounded-lg border p-3 ${row.status === 'error' ? 'border-red-300 bg-red-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {row.status === 'valid' ? (
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className="font-semibold text-sm">{row.equipment_code}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">#{row.rowNumber}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-1">{row.equipment_name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{row.equipment_type_code}</span>
                    <span>{row.building}</span>
                    {row.manufacturer && <span>{row.manufacturer}</span>}
                  </div>
                  {row.errors.length > 0 && (
                    <p className="text-xs text-red-500 mt-2">{row.errors.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>

            {/* 데스크톱 테이블 */}
            <div className="hidden md:block max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      sortKey="rowNumber"
                      sortDirection={getSortDirection('rowNumber')}
                      onSort={requestSort}
                      className="w-[60px]"
                    >
                      {t('common.row')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="status"
                      sortDirection={getSortDirection('status')}
                      onSort={requestSort}
                      className="w-[60px]"
                    >
                      {t('equipment.status')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="equipment_code"
                      sortDirection={getSortDirection('equipment_code')}
                      onSort={requestSort}
                    >
                      {t('equipment.equipmentCode')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="equipment_name"
                      sortDirection={getSortDirection('equipment_name')}
                      onSort={requestSort}
                    >
                      {t('equipment.equipmentName')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="equipment_type_code"
                      sortDirection={getSortDirection('equipment_type_code')}
                      onSort={requestSort}
                    >
                      {t('equipment.equipmentType')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="building"
                      sortDirection={getSortDirection('building')}
                      onSort={requestSort}
                    >
                      {t('equipment.building')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="manufacturer"
                      sortDirection={getSortDirection('manufacturer')}
                      onSort={requestSort}
                    >
                      {t('equipment.manufacturer')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="errors"
                      sortDirection={getSortDirection('errors')}
                      onSort={requestSort}
                    >
                      {t('common.error')}
                    </SortableTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((row) => (
                    <TableRow
                      key={row.rowNumber}
                      className={row.status === 'error' ? 'bg-red-50' : ''}
                    >
                      <TableCell>{row.rowNumber}</TableCell>
                      <TableCell>
                        {row.status === 'valid' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{row.equipment_code}</TableCell>
                      <TableCell>{row.equipment_name}</TableCell>
                      <TableCell>{row.equipment_type_code}</TableCell>
                      <TableCell>{row.building}</TableCell>
                      <TableCell>{row.manufacturer || '-'}</TableCell>
                      <TableCell>
                        {row.errors.length > 0 && (
                          <span className="text-sm text-red-500">{row.errors.join(', ')}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 설비 유형 참조 */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">{t('equipment.typeReference')}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {equipmentTypes.map((type) => (
              <div key={type.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border p-2 sm:p-3 gap-1 sm:gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{type.code}</p>
                  <p className="text-xs text-muted-foreground truncate">{type.name}</p>
                </div>
                <Badge variant={type.category === 'MAIN' ? 'default' : 'secondary'} className="text-xs self-start sm:self-auto flex-shrink-0">
                  {type.category === 'MAIN' ? t('equipment.categoryMainShort') : t('equipment.categorySubShort')}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
