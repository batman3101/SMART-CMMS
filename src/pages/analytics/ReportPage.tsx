import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'

interface ReportTemplate {
  id: string
  name: string
  description: string
  type: 'daily' | 'weekly' | 'monthly' | 'custom'
  icon: typeof FileText
}

interface GeneratedReport {
  id: string
  name: string
  type: string
  period: string
  created_at: string
  status: 'completed' | 'generating' | 'failed'
  file_size: string
}

export default function ReportPage() {
  const { t } = useTranslation()
  const { addToast } = useToast()

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([])

  // Initialize dates
  useEffect(() => {
    const today = new Date()
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)

    setEndDate(today.toISOString().split('T')[0])
    setStartDate(monthAgo.toISOString().split('T')[0])

    // Load mock generated reports
    setGeneratedReports([
      {
        id: '1',
        name: t('report.monthlyReport') + '_2025_01.pdf',
        type: 'monthly',
        period: '2025-01-01 ~ 2025-01-31',
        created_at: '2025-01-31 14:30',
        status: 'completed',
        file_size: '2.4 MB',
      },
      {
        id: '2',
        name: t('report.weeklyReport') + '_2025_W04.pdf',
        type: 'weekly',
        period: '2025-01-20 ~ 2025-01-26',
        created_at: '2025-01-27 09:15',
        status: 'completed',
        file_size: '1.8 MB',
      },
      {
        id: '3',
        name: t('report.dailyReport') + '_2025-01-25.pdf',
        type: 'daily',
        period: '2025-01-25',
        created_at: '2025-01-25 18:00',
        status: 'completed',
        file_size: '0.9 MB',
      },
    ])
  }, [t])

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

    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const template = reportTemplates.find((t) => t.id === selectedTemplate)
    const newReport: GeneratedReport = {
      id: `report-${Date.now()}`,
      name: `${template?.name}_${new Date().toISOString().split('T')[0]}.pdf`,
      type: selectedTemplate,
      period: `${startDate} ~ ${endDate}`,
      created_at: new Date().toLocaleString(),
      status: 'completed',
      file_size: `${(Math.random() * 3 + 0.5).toFixed(1)} MB`,
    }

    setGeneratedReports([newReport, ...generatedReports])
    setIsGenerating(false)
    setSelectedTemplate(null)
  }

  const handleDownload = (report: GeneratedReport) => {
    // Mock download - create a simple text file
    const content = `${report.name}\n${t('report.period')}: ${report.period}\n${t('report.createdAt')}: ${report.created_at}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = report.name.replace('.pdf', '.txt')
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleSendEmail = (report: GeneratedReport) => {
    addToast({ type: 'success', title: t('report.emailSent'), message: report.name })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('nav.report')}</h1>

      {/* Date Range Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('report.selectPeriod')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>{t('report.startDate')}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[180px]"
              />
            </div>
            <span className="pb-2">~</span>
            <div className="space-y-2">
              <Label>{t('report.endDate')}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[180px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Templates */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">{t('report.selectTemplate')}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      selectedTemplate === template.id
                        ? 'bg-primary text-white'
                        : 'bg-primary/10'
                    }`}
                  >
                    <template.icon
                      className={`h-5 w-5 ${
                        selectedTemplate === template.id ? 'text-white' : 'text-primary'
                      }`}
                    />
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleGenerateReport}
          disabled={!selectedTemplate || isGenerating}
          className="min-w-[200px]"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {t('report.generating')}
            </>
          ) : (
            <>
              <FileText className="mr-2 h-5 w-5" />
              {t('report.generate')}
            </>
          )}
        </Button>
      </div>

      {/* Generated Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('report.recentReports')}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownload(report)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSendEmail(report)}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Report Contents Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {t('report.includesContent')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border p-4">
              <h4 className="mb-2 font-medium">{t('report.summarySection')}</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>- {t('report.kpiSummary')}</li>
                <li>- {t('report.equipmentStatus')}</li>
                <li>- {t('report.repairOverview')}</li>
              </ul>
            </div>
            <div className="rounded-lg border p-4">
              <h4 className="mb-2 font-medium">{t('report.detailSection')}</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>- {t('report.repairHistory')}</li>
                <li>- {t('report.failureAnalysis')}</li>
                <li>- {t('report.partUsage')}</li>
              </ul>
            </div>
            <div className="rounded-lg border p-4">
              <h4 className="mb-2 font-medium">{t('report.analysisSection')}</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
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
