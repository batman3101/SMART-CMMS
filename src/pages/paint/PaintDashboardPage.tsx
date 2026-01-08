import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Paintbrush,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  Play,
  Eye,
  RefreshCw,
  ListTodo,
} from 'lucide-react'
import { paintApi } from '@/lib/api'
import type { PaintSchedule, PaintDashboardStats, Equipment, PaintTemplate } from '@/types'

export default function PaintDashboardPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  // Multilingual helpers
  const getEquipmentName = (eq: Equipment | undefined) => {
    if (!eq) return '-'
    if (i18n.language === 'vi') return eq.equipment_name_vi || eq.equipment_name
    return eq.equipment_name_ko || eq.equipment_name
  }

  const getTemplateName = (template: PaintTemplate | undefined) => {
    if (!template) return '-'
    if (i18n.language === 'vi') return template.name_vi || template.name
    return template.name_ko || template.name
  }

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<PaintDashboardStats | null>(null)
  const [todaySchedules, setTodaySchedules] = useState<PaintSchedule[]>([])
  const [upcomingSchedules, setUpcomingSchedules] = useState<PaintSchedule[]>([])
  const [overdueSchedules, setOverdueSchedules] = useState<PaintSchedule[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [statsRes, todayRes, upcomingRes, overdueRes] = await Promise.all([
        paintApi.getDashboardStats(),
        paintApi.getTodaySchedules(),
        paintApi.getUpcomingSchedules(7),
        paintApi.getOverdueSchedules(),
      ])

      if (statsRes.data) setStats(statsRes.data)
      if (todayRes.data) setTodaySchedules(todayRes.data)
      if (upcomingRes.data) setUpcomingSchedules(upcomingRes.data.filter(s => s.scheduled_date !== new Date().toISOString().split('T')[0]))
      if (overdueRes.data) setOverdueSchedules(overdueRes.data)
    } catch (error) {
      console.error('Failed to fetch Paint data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline">{t('paint.statusScheduled')}</Badge>
      case 'in_progress':
        return <Badge variant="warning">{t('paint.statusInProgress')}</Badge>
      case 'completed':
        return <Badge variant="success">{t('paint.statusCompleted')}</Badge>
      case 'overdue':
        return <Badge variant="destructive">{t('paint.statusOverdue')}</Badge>
      case 'cancelled':
        return <Badge variant="secondary">{t('paint.statusCancelled')}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">{t('paint.priorityHigh')}</Badge>
      case 'medium':
        return <Badge variant="warning">{t('paint.priorityMedium')}</Badge>
      case 'low':
        return <Badge variant="secondary">{t('paint.priorityLow')}</Badge>
      default:
        return <Badge variant="outline">{priority}</Badge>
    }
  }

  const handleStartPaint = (scheduleId: string) => {
    navigate(`/paint/execution?schedule=${scheduleId}`)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('paint.dashboard')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('paint.totalScheduled')}</p>
                <p className="text-3xl font-bold">{stats?.total_scheduled || 0}</p>
              </div>
              <Paintbrush className="h-10 w-10 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('paint.completedThisMonth')}</p>
                <p className="text-3xl font-bold text-green-600">{stats?.completed_this_month || 0}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('paint.overdueCount')}</p>
                <p className="text-3xl font-bold text-red-600">{stats?.overdue_count || 0}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-red-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('paint.upcomingWeek')}</p>
                <p className="text-3xl font-bold text-blue-600">{stats?.upcoming_week || 0}</p>
              </div>
              <Clock className="h-10 w-10 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('paint.complianceRate')}</p>
                <p className="text-3xl font-bold text-primary">{stats?.compliance_rate || 0}%</p>
              </div>
              <TrendingUp className="h-10 w-10 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Paint */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">{t('paint.todayPaint')}</CardTitle>
            <Badge variant="outline">{todaySchedules.length}</Badge>
          </CardHeader>
          <CardContent>
            {todaySchedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Paintbrush className="mb-2 h-12 w-12 opacity-50" />
                <p>{t('paint.noPaintToday')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaySchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {schedule.equipment?.equipment_code}
                        </span>
                        {getStatusBadge(schedule.status)}
                        {getPriorityBadge(schedule.priority)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getEquipmentName(schedule.equipment)}
                      </p>
                      {schedule.template && (
                        <p className="text-xs text-muted-foreground">
                          {getTemplateName(schedule.template)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {schedule.status === 'scheduled' && (
                        <Button
                          size="sm"
                          onClick={() => handleStartPaint(schedule.id)}
                        >
                          <Play className="mr-1 h-4 w-4" />
                          {t('paint.startPaint')}
                        </Button>
                      )}
                      {schedule.status === 'in_progress' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                          onClick={() => handleStartPaint(schedule.id)}
                        >
                          {t('paint.completePaint')}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Paint */}
        <Card className={overdueSchedules.length > 0 ? 'border-red-300' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg text-red-600">{t('paint.overduePaint')}</CardTitle>
            <Badge variant="destructive">{overdueSchedules.length}</Badge>
          </CardHeader>
          <CardContent>
            {overdueSchedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle className="mb-2 h-12 w-12 text-green-500 opacity-50" />
                <p>{t('paint.noOverduePaint')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {overdueSchedules.slice(0, 5).map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {schedule.equipment?.equipment_code}
                        </span>
                        <Badge variant="destructive">{t('paint.statusOverdue')}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getEquipmentName(schedule.equipment)}
                      </p>
                      <p className="text-xs text-red-600">
                        {t('paint.scheduledDate')}: {schedule.scheduled_date}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleStartPaint(schedule.id)}
                    >
                      <Play className="mr-1 h-4 w-4" />
                      {t('paint.startPaint')}
                    </Button>
                  </div>
                ))}
                {overdueSchedules.length > 5 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/paint/schedules?status=overdue')}
                  >
                    {t('dashboard.viewAll')} ({overdueSchedules.length})
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Paint This Week */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">{t('paint.upcomingPaint')}</CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline">{upcomingSchedules.length}</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/paint/schedules')}
              >
                <ListTodo className="mr-2 h-4 w-4" />
                {t('paint.listView')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingSchedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Paintbrush className="mb-2 h-12 w-12 opacity-50" />
                <p>{t('paint.noUpcomingPaint')}</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {upcomingSchedules.slice(0, 9).map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {schedule.equipment?.equipment_code}
                        </span>
                        {getPriorityBadge(schedule.priority)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {getEquipmentName(schedule.equipment)}
                      </p>
                      <p className="text-xs text-primary">
                        {schedule.scheduled_date}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => navigate(`/paint/schedules?id=${schedule.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
