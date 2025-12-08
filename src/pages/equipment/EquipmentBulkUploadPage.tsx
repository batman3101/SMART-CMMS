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
import type { EquipmentType, Equipment } from '@/types'

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
  const { t } = useTranslation()
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
    // CSV 템플릿 생성 (실제로는 XLSX 라이브러리 사용)
    const headers = [
      '설비코드',
      '설비명',
      '설비유형코드',
      '동',
      '설치일',
      '제조사',
    ]
    const sampleData = [
      ['CNC-801', 'CNC 밀링 머신 #801', 'CNC', 'A동', '2024-01-15', 'FANUC'],
      ['CNC-802', 'CNC 밀링 머신 #802', 'CNC', 'B동', '2024-01-15', 'Mazak'],
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
      const equipments: Omit<Equipment, 'id' | 'created_at' | 'updated_at'>[] = validRows.map(
        (row) => {
          const equipmentType = equipmentTypes.find((t) => t.code === row.equipment_type_code)
          return {
            equipment_code: row.equipment_code,
            equipment_name: row.equipment_name,
            equipment_type_id: equipmentType?.id || '',
            equipment_type: equipmentType,
            status: 'normal' as const,
            install_date: row.install_date || null,
            manufacturer: row.manufacturer || null,
            building: row.building,
            is_active: true,
          }
        }
      )

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('equipment.bulkUpload')}</h1>
        {uploadedData.length > 0 && (
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.reset')}
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 템플릿 다운로드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              {t('equipment.downloadTemplate')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('equipment.templateDescription')}
            </p>
            <div className="rounded-lg bg-muted p-4">
              <p className="mb-2 text-sm font-medium">{t('equipment.requiredFields')}</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• {t('equipment.requiredFieldCode')}</li>
                <li>• {t('equipment.requiredFieldName')}</li>
                <li>• {t('equipment.requiredFieldType')}</li>
                <li>• {t('equipment.requiredFieldBuilding')}</li>
              </ul>
            </div>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              {t('equipment.templateDownload')}
            </Button>
          </CardContent>
        </Card>

        {/* 파일 업로드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t('common.upload')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary hover:bg-muted/50"
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
              <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              {fileName ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{fileName}</p>
                  {isValidating ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('common.validating')}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-4">
                      <Badge variant="success">{t('common.validCount', { count: validCount })}</Badge>
                      {errorCount > 0 && <Badge variant="destructive">{t('common.errorCount', { count: errorCount })}</Badge>}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
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
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {uploadResult.failed === 0 ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              )}
              <div>
                <h3 className="mb-2 text-lg font-semibold">{t('equipment.uploadComplete')}</h3>
                <p className="text-muted-foreground">
                  {t('equipment.uploadResult', { success: uploadResult.success, failed: uploadResult.failed })}
                </p>
                {uploadResult.errors.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-red-500">
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

      {/* 미리보기 테이블 */}
      {uploadedData.length > 0 && !uploadResult && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('equipment.uploadPreview')}</CardTitle>
            <Button onClick={handleUpload} disabled={validCount === 0 || isUploading}>
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
          <CardContent>
            <div className="max-h-[400px] overflow-auto">
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
        <CardHeader>
          <CardTitle>{t('equipment.typeReference')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {equipmentTypes.map((type) => (
              <div key={type.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{type.code}</p>
                  <p className="text-sm text-muted-foreground">{type.name}</p>
                </div>
                <Badge variant={type.category === 'MAIN' ? 'default' : 'secondary'}>
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
