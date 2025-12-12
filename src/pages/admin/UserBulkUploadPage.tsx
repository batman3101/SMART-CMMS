import { useState, useRef } from 'react'
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
  ArrowLeft,
} from 'lucide-react'
import { usersApi } from '@/lib/api'
import { useTableSort } from '@/hooks'
import { Link } from 'react-router-dom'
import type { UserRole, DepartmentCode, PositionCode } from '@/types'
import { DEPARTMENTS, POSITIONS, POSITION_ROLE_MAP } from '@/types'

interface UploadRow {
  rowNumber: number
  email: string
  password: string
  name: string
  department: string
  position: string
  role: UserRole
  status: 'valid' | 'error' | 'warning'
  errors: string[]
}

interface UploadResult {
  success: number
  failed: number
  errors: Array<{ email: string; error: string }>
}

// Position code mapping
const POSITION_CODE_MAP: Record<string, PositionCode> = {
  'system_admin': POSITIONS.SYSTEM_ADMIN,
  'facility_manager': POSITIONS.FACILITY_MANAGER,
  'repair_staff': POSITIONS.REPAIR_STAFF,
  'viewer': POSITIONS.VIEWER,
  // Korean aliases
  '시스템관리자': POSITIONS.SYSTEM_ADMIN,
  '설비관리자': POSITIONS.FACILITY_MANAGER,
  '수리직원': POSITIONS.REPAIR_STAFF,
  '뷰어': POSITIONS.VIEWER,
}

// Department code mapping
const DEPARTMENT_CODE_MAP: Record<string, DepartmentCode> = {
  'general_management': DEPARTMENTS.GENERAL_MANAGEMENT,
  'facility_management': DEPARTMENTS.FACILITY_MANAGEMENT,
  // Korean aliases
  '종합관리실': DEPARTMENTS.GENERAL_MANAGEMENT,
  '설비관리팀': DEPARTMENTS.FACILITY_MANAGEMENT,
}

export default function UserBulkUploadPage() {
  const { t, i18n } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploadedData, setUploadedData] = useState<UploadRow[]>([])
  const [fileName, setFileName] = useState<string>('')
  const [isValidating, setIsValidating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)

  // CSV 템플릿 다운로드
  const handleDownloadTemplate = () => {
    const isVietnamese = i18n.language === 'vi'
    const headers = isVietnamese
      ? ['Email', 'Mat khau', 'Ho ten', 'Phong ban', 'Chuc vu']
      : ['이메일', '비밀번호', '이름', '부서', '직책']

    const sampleData = isVietnamese
      ? [
          ['user1@company.com', 'Password123!', 'Nguyen Van A', 'facility_management', 'repair_staff'],
          ['user2@company.com', 'Password123!', 'Tran Thi B', 'facility_management', 'viewer'],
        ]
      : [
          ['user1@company.com', 'Password123!', '홍길동', 'facility_management', 'repair_staff'],
          ['user2@company.com', 'Password123!', '김철수', 'facility_management', 'viewer'],
        ]

    const csvContent = [
      headers.join(','),
      ...sampleData.map((row) => row.join(',')),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'user_template.csv'
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

      const email = values[0] || ''
      const password = values[1] || ''
      const name = values[2] || ''
      const departmentInput = values[3]?.toLowerCase() || ''
      const positionInput = values[4]?.toLowerCase() || ''

      // 필수 필드 검증
      if (!email) errors.push(t('admin.emailRequired'))
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(t('admin.emailInvalid'))

      if (!password) errors.push(t('admin.passwordRequired'))
      else if (password.length < 6) errors.push(t('admin.passwordTooShort'))

      if (!name) errors.push(t('admin.nameRequired'))

      // 부서 검증
      const department = DEPARTMENT_CODE_MAP[departmentInput] || departmentInput
      const validDepartments = Object.values(DEPARTMENTS)
      if (!validDepartments.includes(department as DepartmentCode)) {
        errors.push(`${t('admin.invalidDepartment')}: ${departmentInput}`)
      }

      // 직책 검증
      const position = POSITION_CODE_MAP[positionInput] || positionInput
      const validPositions = Object.values(POSITIONS)
      if (!validPositions.includes(position as PositionCode)) {
        errors.push(`${t('admin.invalidPosition')}: ${positionInput}`)
      }

      // 직책에서 권한 결정
      const role = POSITION_ROLE_MAP[position as PositionCode] || 4

      return {
        rowNumber: index + 2,
        email,
        password,
        name,
        department: department || DEPARTMENTS.FACILITY_MANAGEMENT,
        position: position || POSITIONS.REPAIR_STAFF,
        role,
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
    if (file && file.name.endsWith('.csv')) {
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
      const users = validRows.map((row) => ({
        email: row.email,
        password: row.password,
        name: row.name,
        department: row.department as DepartmentCode,
        position: row.position as PositionCode,
        role: row.role,
        is_active: true,
      }))

      const { results, summary } = await usersApi.bulkCreateUsers(users)

      const failedResults = results
        .filter((r) => !r.success)
        .map((r) => ({ email: r.email, error: r.error || 'Unknown error' }))

      setUploadResult({
        success: summary.success,
        failed: summary.failed,
        errors: failedResults,
      })
    } catch (error) {
      console.error('Upload failed:', error)
      setUploadResult({
        success: 0,
        failed: validRows.length,
        errors: [{ email: '', error: String(error) }],
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

  // 부서/직책 표시 함수
  const getDepartmentLabel = (dept: string) => {
    const labels: Record<string, string> = {
      [DEPARTMENTS.GENERAL_MANAGEMENT]: t('admin.departmentGeneralManagement'),
      [DEPARTMENTS.FACILITY_MANAGEMENT]: t('admin.departmentFacilityManagement'),
    }
    return labels[dept] || dept
  }

  const getPositionLabel = (pos: string) => {
    const labels: Record<string, string> = {
      [POSITIONS.SYSTEM_ADMIN]: t('admin.positionSystemAdmin'),
      [POSITIONS.FACILITY_MANAGER]: t('admin.positionFacilityManager'),
      [POSITIONS.REPAIR_STAFF]: t('admin.positionRepairStaff'),
      [POSITIONS.VIEWER]: t('admin.positionViewer'),
    }
    return labels[pos] || pos
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/users">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back')}
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{t('admin.bulkUserUpload')}</h1>
        </div>
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
              {t('admin.downloadUserTemplate')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('admin.userTemplateDescription')}
            </p>
            <div className="rounded-lg bg-muted p-4">
              <p className="mb-2 text-sm font-medium">{t('admin.requiredUserFields')}</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• {t('auth.email')} (user@example.com)</li>
                <li>• {t('auth.password')} ({t('admin.minSixChars')})</li>
                <li>• {t('admin.name')}</li>
                <li>• {t('admin.department')} (general_management, facility_management)</li>
                <li>• {t('admin.position')} (system_admin, facility_manager, repair_staff, viewer)</li>
              </ul>
            </div>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              {t('admin.templateDownload')}
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
                accept=".csv"
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
                  {t('admin.uploadUserArea')}
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
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  {uploadResult.failed === 0
                    ? t('admin.uploadComplete')
                    : t('admin.uploadPartialComplete')}
                </h3>
                <div className="mt-2 flex gap-4">
                  <span className="text-green-600">
                    {t('common.successCount', { count: uploadResult.success })}
                  </span>
                  {uploadResult.failed > 0 && (
                    <span className="text-red-600">
                      {t('common.failedCount', { count: uploadResult.failed })}
                    </span>
                  )}
                </div>
                {uploadResult.errors.length > 0 && (
                  <div className="mt-4 rounded-lg bg-red-50 p-4 dark:bg-red-950">
                    <p className="mb-2 text-sm font-medium text-red-800 dark:text-red-200">
                      {t('admin.failedUsers')}:
                    </p>
                    <ul className="space-y-1 text-sm text-red-600 dark:text-red-300">
                      {uploadResult.errors.map((err, idx) => (
                        <li key={idx}>
                          {err.email ? `${err.email}: ` : ''}{err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 데이터 미리보기 */}
      {uploadedData.length > 0 && !uploadResult && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('admin.previewData')}</CardTitle>
            <Button
              onClick={handleUpload}
              disabled={validCount === 0 || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.uploading')}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('admin.uploadUsers', { count: validCount })}
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      sortKey="rowNumber"
                      sortDirection={getSortDirection('rowNumber')}
                      onSort={requestSort}
                      className="w-16"
                    >
                      #
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="status"
                      sortDirection={getSortDirection('status')}
                      onSort={requestSort}
                      className="w-20"
                    >
                      {t('common.status')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="email"
                      sortDirection={getSortDirection('email')}
                      onSort={requestSort}
                    >
                      {t('auth.email')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="name"
                      sortDirection={getSortDirection('name')}
                      onSort={requestSort}
                    >
                      {t('admin.name')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="department"
                      sortDirection={getSortDirection('department')}
                      onSort={requestSort}
                    >
                      {t('admin.department')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="position"
                      sortDirection={getSortDirection('position')}
                      onSort={requestSort}
                    >
                      {t('admin.position')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey=""
                      sortDirection={null}
                      onSort={() => {}}
                    >
                      {t('common.errors')}
                    </SortableTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((row) => (
                    <TableRow
                      key={row.rowNumber}
                      className={row.status === 'error' ? 'bg-red-50 dark:bg-red-950' : ''}
                    >
                      <TableCell>{row.rowNumber}</TableCell>
                      <TableCell>
                        {row.status === 'valid' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{getDepartmentLabel(row.department)}</TableCell>
                      <TableCell>{getPositionLabel(row.position)}</TableCell>
                      <TableCell>
                        {row.errors.length > 0 && (
                          <ul className="text-sm text-red-600">
                            {row.errors.map((err, idx) => (
                              <li key={idx}>• {err}</li>
                            ))}
                          </ul>
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
    </div>
  )
}
