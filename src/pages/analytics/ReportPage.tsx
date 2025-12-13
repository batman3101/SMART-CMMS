import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  FileText,
  Download,
  Mail,
  Calendar,
  Loader2,
  FileSpreadsheet,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings2,
  Search,
  X,
  Monitor,
} from 'lucide-react'
import { generateReport, type ReportType, type ReportSections } from '@/lib/reportGenerator'
import { useAuthStore } from '@/stores/authStore'
import { equipmentApi } from '@/lib/api'
import type { Equipment } from '@/types'

interface ReportTemplate {
  id: ReportType
  name: string
  description: string
  type: ReportType
  icon: typeof FileText
}

interface GeneratedReport {
  id: string
  name: string
  type: ReportType
  period: string
  created_at: string
  status: 'completed' | 'generating' | 'failed'
  file_size: string
  blob?: Blob
}

export default function ReportPage() {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const { language } = useAuthStore()

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<ReportType | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([])

  // Custom report section options
  const [customSections, setCustomSections] = useState<ReportSections>({
    summary: true,
    equipmentStatus: true,
    repairHistory: true,
    failureRanking: true,
    technicianPerformance: true,
  })

  // Equipment selection for custom report
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([])
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState('')
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false)
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false)
  const equipmentDropdownRef = useRef<HTMLDivElement>(null)

  // Initialize dates
  useEffect(() => {
    const today = new Date()
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)

    setEndDate(today.toISOString().split('T')[0])
    setStartDate(monthAgo.toISOString().split('T')[0])
  }, [])

  // Load equipment list when custom report is selected
  useEffect(() => {
    if (selectedTemplate === 'custom' && equipmentList.length === 0) {
      setIsLoadingEquipment(true)
      equipmentApi.getEquipments()
        .then((res) => {
          setEquipmentList(res.data || [])
        })
        .catch(console.error)
        .finally(() => setIsLoadingEquipment(false))
    }
  }, [selectedTemplate, equipmentList.length])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (equipmentDropdownRef.current && !equipmentDropdownRef.current.contains(event.target as Node)) {
        setShowEquipmentDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filtered equipment list based on search query
  const filteredEquipmentList = useMemo(() => {
    if (!equipmentSearchQuery.trim()) return equipmentList
    const query = equipmentSearchQuery.toLowerCase()
    return equipmentList.filter((eq) =>
      eq.equipment_code?.toLowerCase().includes(query) ||
      eq.equipment_name?.toLowerCase().includes(query) ||
      eq.manufacturer?.toLowerCase().includes(query)
    )
  }, [equipmentList, equipmentSearchQuery])

  // Get selected equipment objects
  const selectedEquipments = useMemo(() => {
    return equipmentList.filter((eq) => selectedEquipmentIds.includes(eq.id))
  }, [equipmentList, selectedEquipmentIds])

  // Toggle equipment selection
  const toggleEquipmentSelection = (equipmentId: string) => {
    setSelectedEquipmentIds((prev) =>
      prev.includes(equipmentId)
        ? prev.filter((id) => id !== equipmentId)
        : [...prev, equipmentId]
    )
  }

  // Remove equipment from selection
  const removeEquipmentFromSelection = (equipmentId: string) => {
    setSelectedEquipmentIds((prev) => prev.filter((id) => id !== equipmentId))
  }

  // Clear all selected equipment
  const clearAllEquipmentSelection = () => {
    setSelectedEquipmentIds([])
  }

  const reportTemplates: ReportTemplate[] = [
    {
      id: 'daily',
      name: t('report.dailyReport'),
      description: t('report.dailyReportDesc'),
      type: 'daily',
      icon: FileText,
    },
    {
      id: 'weekly',
      name: t('report.weeklyReport'),
      description: t('report.weeklyReportDesc'),
      type: 'weekly',
      icon: FileText,
    },
    {
      id: 'monthly',
      name: t('report.monthlyReport'),
      description: t('report.monthlyReportDesc'),
      type: 'monthly',
      icon: FileText,
    },
    {
      id: 'custom',
      name: t('report.customReport'),
      description: t('report.customReportDesc'),
      type: 'custom',
      icon: FileSpreadsheet,
    },
  ]

  const handleGenerateReport = async () => {
    if (!selectedTemplate) return

    setIsGenerating(true)

    // Create placeholder report entry
    const template = reportTemplates.find((t) => t.id === selectedTemplate)
    const reportId = `report-${Date.now()}`
    const newReport: GeneratedReport = {
      id: reportId,
      name: `${template?.name}_${new Date().toISOString().split('T')[0]}.pdf`,
      type: selectedTemplate,
      period: `${startDate} ~ ${endDate}`,
      created_at: new Date().toLocaleString(),
      status: 'generating',
      file_size: '-',
    }

    setGeneratedReports([newReport, ...generatedReports])

    try {
      // Generate actual PDF report
      const lang = (language || 'ko') as 'ko' | 'vi'
      const result = await generateReport({
        type: selectedTemplate,
        startDate,
        endDate,
        language: lang,
        sections: selectedTemplate === 'custom' ? customSections : undefined,
        equipmentIds: selectedTemplate === 'custom' && selectedEquipmentIds.length > 0 ? selectedEquipmentIds : undefined,
      })

      // Update report with completed status
      const fileSize = (result.blob.size / (1024 * 1024)).toFixed(1)
      setGeneratedReports(prev =>
        prev.map(r =>
          r.id === reportId
            ? { ...r, status: 'completed', file_size: `${fileSize} MB`, blob: result.blob, name: result.filename }
            : r
        )
      )

      addToast({
        type: 'success',
        title: t('report.generated'),
        message: result.filename,
      })
    } catch (error) {
      console.error('Failed to generate report:', error)

      // Update report with failed status
      setGeneratedReports(prev =>
        prev.map(r =>
          r.id === reportId
            ? { ...r, status: 'failed' }
            : r
        )
      )

      addToast({
        type: 'error',
        title: t('common.error'),
        message: t('report.generateFailed'),
      })
    } finally {
      setIsGenerating(false)
      setSelectedTemplate(null)
    }
  }

  const handleDownload = (report: GeneratedReport) => {
    if (!report.blob) {
      addToast({
        type: 'error',
        title: t('common.error'),
        message: t('report.noFileAvailable'),
      })
      return
    }

    // Create download link for PDF
    const url = URL.createObjectURL(report.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = report.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleSendEmail = (report: GeneratedReport) => {
    // In production, this would send the report via email
    addToast({ type: 'success', title: t('report.emailSent'), message: report.name })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">{t('nav.report')}</h1>

      {/* Date Range Selection */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            {t('report.selectPeriod')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label className="text-sm">{t('report.startDate')}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-[180px] h-9 sm:h-10"
              />
            </div>
            <span className="hidden sm:block pb-2">~</span>
            <div className="space-y-2">
              <Label className="text-sm">{t('report.endDate')}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-[180px] h-9 sm:h-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Templates */}
      <div>
        <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold">{t('report.selectTemplate')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {reportTemplates.map((template) => (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedTemplate === template.id
                  ? 'border-2 border-primary ring-2 ring-primary/20'
                  : ''
              }`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <CardHeader className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                  <div
                    className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full ${
                      selectedTemplate === template.id
                        ? 'bg-primary text-white'
                        : 'bg-primary/10'
                    }`}
                  >
                    <template.icon
                      className={`h-4 w-4 sm:h-5 sm:w-5 ${
                        selectedTemplate === template.id ? 'text-white' : 'text-primary'
                      }`}
                    />
                  </div>
                  <CardTitle className="text-sm sm:text-lg text-center sm:text-left">{template.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">{template.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom Report Options - only show when custom is selected */}
      {selectedTemplate === 'custom' && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Settings2 className="h-4 w-4 sm:h-5 sm:w-5" />
              {t('report.customOptions')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="space-y-4">
              {/* Period Selection for Custom */}
              <div>
                <h4 className="mb-3 text-sm font-medium">{t('report.selectPeriod')}</h4>
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('report.startDate')}</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full sm:w-[180px] h-9"
                    />
                  </div>
                  <span className="hidden sm:block text-muted-foreground">~</span>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('report.endDate')}</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full sm:w-[180px] h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Equipment Selection */}
              <div>
                <h4 className="mb-3 text-sm font-medium flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  {t('report.selectEquipment')}
                </h4>
                <p className="text-xs text-muted-foreground mb-3">{t('report.selectEquipmentDesc')}</p>

                {/* Selected Equipment Tags */}
                {selectedEquipments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedEquipments.map((eq) => (
                      <Badge
                        key={eq.id}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        <span className="text-xs">{eq.equipment_code}</span>
                        <button
                          type="button"
                          onClick={() => removeEquipmentFromSelection(eq.id)}
                          className="ml-1 rounded-full p-0.5 hover:bg-muted"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllEquipmentSelection}
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                    >
                      {t('common.clearAll')}
                    </Button>
                  </div>
                )}

                {/* Equipment Search Input with Dropdown */}
                <div className="relative" ref={equipmentDropdownRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder={t('report.searchEquipmentPlaceholder')}
                      value={equipmentSearchQuery}
                      onChange={(e) => setEquipmentSearchQuery(e.target.value)}
                      onFocus={() => setShowEquipmentDropdown(true)}
                      className="pl-9 h-9"
                    />
                    {isLoadingEquipment && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {/* Dropdown List */}
                  {showEquipmentDropdown && (
                    <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border bg-background shadow-lg">
                      {filteredEquipmentList.length === 0 ? (
                        <div className="p-3 text-center text-sm text-muted-foreground">
                          {equipmentSearchQuery ? t('common.noSearchResults') : t('common.noData')}
                        </div>
                      ) : (
                        filteredEquipmentList.slice(0, 50).map((eq) => (
                          <div
                            key={eq.id}
                            onClick={() => toggleEquipmentSelection(eq.id)}
                            className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors hover:bg-muted/50 ${
                              selectedEquipmentIds.includes(eq.id) ? 'bg-primary/10' : ''
                            }`}
                          >
                            <Checkbox
                              checked={selectedEquipmentIds.includes(eq.id)}
                              onCheckedChange={() => toggleEquipmentSelection(eq.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{eq.equipment_code}</span>
                                <Badge variant="outline" className="text-xs">
                                  {eq.equipment_type?.category === 'MAIN' ? t('equipment.mainEquipment') : t('equipment.subEquipment')}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {eq.equipment_name} {eq.manufacturer && `(${eq.manufacturer})`}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                      {filteredEquipmentList.length > 50 && (
                        <div className="p-2 text-center text-xs text-muted-foreground border-t">
                          {t('common.showingFirst', { count: 50 })} - {t('common.refineSearch')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  {selectedEquipmentIds.length === 0
                    ? t('report.allEquipmentSelected')
                    : t('report.equipmentSelectedCount', { count: selectedEquipmentIds.length })}
                </p>
              </div>

              {/* Section Selection */}
              <div>
                <h4 className="mb-3 text-sm font-medium">{t('report.selectSections')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <label className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 cursor-pointer transition-colors">
                    <Checkbox
                      checked={customSections.summary}
                      onCheckedChange={(checked) =>
                        setCustomSections(prev => ({ ...prev, summary: checked as boolean }))
                      }
                    />
                    <div>
                      <p className="text-sm font-medium">{t('report.summarySection')}</p>
                      <p className="text-xs text-muted-foreground">{t('report.summarySectionDesc')}</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 cursor-pointer transition-colors">
                    <Checkbox
                      checked={customSections.equipmentStatus}
                      onCheckedChange={(checked) =>
                        setCustomSections(prev => ({ ...prev, equipmentStatus: checked as boolean }))
                      }
                    />
                    <div>
                      <p className="text-sm font-medium">{t('report.equipmentStatusSection')}</p>
                      <p className="text-xs text-muted-foreground">{t('report.equipmentStatusSectionDesc')}</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 cursor-pointer transition-colors">
                    <Checkbox
                      checked={customSections.repairHistory}
                      onCheckedChange={(checked) =>
                        setCustomSections(prev => ({ ...prev, repairHistory: checked as boolean }))
                      }
                    />
                    <div>
                      <p className="text-sm font-medium">{t('report.repairHistorySection')}</p>
                      <p className="text-xs text-muted-foreground">{t('report.repairHistorySectionDesc')}</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 cursor-pointer transition-colors">
                    <Checkbox
                      checked={customSections.failureRanking}
                      onCheckedChange={(checked) =>
                        setCustomSections(prev => ({ ...prev, failureRanking: checked as boolean }))
                      }
                    />
                    <div>
                      <p className="text-sm font-medium">{t('report.failureRankingSection')}</p>
                      <p className="text-xs text-muted-foreground">{t('report.failureRankingSectionDesc')}</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 cursor-pointer transition-colors">
                    <Checkbox
                      checked={customSections.technicianPerformance}
                      onCheckedChange={(checked) =>
                        setCustomSections(prev => ({ ...prev, technicianPerformance: checked as boolean }))
                      }
                    />
                    <div>
                      <p className="text-sm font-medium">{t('report.technicianSection')}</p>
                      <p className="text-xs text-muted-foreground">{t('report.technicianSectionDesc')}</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Quick select buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomSections({
                    summary: true,
                    equipmentStatus: true,
                    repairHistory: true,
                    failureRanking: true,
                    technicianPerformance: true,
                  })}
                >
                  {t('report.selectAll')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomSections({
                    summary: false,
                    equipmentStatus: false,
                    repairHistory: false,
                    failureRanking: false,
                    technicianPerformance: false,
                  })}
                >
                  {t('report.deselectAll')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleGenerateReport}
          disabled={!selectedTemplate || isGenerating || (selectedTemplate === 'custom' && !Object.values(customSections).some(v => v))}
          className="w-full sm:w-auto sm:min-w-[200px] h-10 sm:h-11"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
              {t('report.generating')}
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              {t('report.generate')}
            </>
          )}
        </Button>
      </div>

      {/* Generated Reports */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            {t('report.recentReports')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          {generatedReports.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t('report.noReportsYet')}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('report.reportName')}</TableHead>
                      <TableHead>{t('report.type')}</TableHead>
                      <TableHead>{t('report.period')}</TableHead>
                      <TableHead>{t('report.createdAt')}</TableHead>
                      <TableHead>{t('report.fileSize')}</TableHead>
                      <TableHead>{t('report.status')}</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatedReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-red-500" />
                            {report.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {report.type === 'daily' && t('report.dailyReport')}
                            {report.type === 'weekly' && t('report.weeklyReport')}
                            {report.type === 'monthly' && t('report.monthlyReport')}
                            {report.type === 'custom' && t('report.customReport')}
                          </Badge>
                        </TableCell>
                        <TableCell>{report.period}</TableCell>
                        <TableCell>{report.created_at}</TableCell>
                        <TableCell>{report.file_size}</TableCell>
                        <TableCell>
                          {report.status === 'completed' && (
                            <Badge variant="success" className="flex w-fit items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {t('report.completed')}
                            </Badge>
                          )}
                          {report.status === 'generating' && (
                            <Badge variant="secondary" className="flex w-fit items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              {t('report.generating')}
                            </Badge>
                          )}
                          {report.status === 'failed' && (
                            <Badge variant="destructive" className="flex w-fit items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {t('report.failed')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDownload(report)}
                              disabled={report.status !== 'completed'}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSendEmail(report)}
                              disabled={report.status !== 'completed'}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {generatedReports.map((report) => (
                  <Card key={report.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-red-500 shrink-0" />
                          <span className="text-sm font-medium truncate">{report.name}</span>
                        </div>
                        {report.status === 'completed' && (
                          <Badge variant="success" className="shrink-0 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t('report.completed')}
                          </Badge>
                        )}
                        {report.status === 'generating' && (
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            {t('report.generating')}
                          </Badge>
                        )}
                        {report.status === 'failed' && (
                          <Badge variant="destructive" className="shrink-0 text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {t('report.failed')}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>{t('report.period')}: {report.period}</p>
                        <p>{t('report.createdAt')}: {report.created_at}</p>
                        <p>{t('report.fileSize')}: {report.file_size}</p>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8"
                          onClick={() => handleDownload(report)}
                          disabled={report.status !== 'completed'}
                        >
                          <Download className="h-3.5 w-3.5 mr-1" />
                          {t('common.download')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8"
                          onClick={() => handleSendEmail(report)}
                          disabled={report.status !== 'completed'}
                        >
                          <Mail className="h-3.5 w-3.5 mr-1" />
                          {t('report.email')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Report Contents Preview */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
            {t('report.includesContent')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border p-3 sm:p-4">
              <h4 className="mb-2 font-medium text-sm sm:text-base">{t('report.summarySection')}</h4>
              <ul className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                <li>- {t('report.kpiSummary')}</li>
                <li>- {t('report.equipmentStatus')}</li>
                <li>- {t('report.repairOverview')}</li>
              </ul>
            </div>
            <div className="rounded-lg border p-3 sm:p-4">
              <h4 className="mb-2 font-medium text-sm sm:text-base">{t('report.detailSection')}</h4>
              <ul className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                <li>- {t('report.repairHistory')}</li>
                <li>- {t('report.failureAnalysis')}</li>
                <li>- {t('report.partUsage')}</li>
              </ul>
            </div>
            <div className="rounded-lg border p-3 sm:p-4 sm:col-span-2 lg:col-span-1">
              <h4 className="mb-2 font-medium text-sm sm:text-base">{t('report.analysisSection')}</h4>
              <ul className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                <li>- {t('report.trendAnalysis')}</li>
                <li>- {t('report.technicianPerformance')}</li>
                <li>- {t('report.recommendations')}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
