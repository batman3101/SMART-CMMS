import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ListTodo,
  Play,
} from 'lucide-react'
import { paintApi } from '@/lib/api'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAuthStore } from '@/stores/authStore'
import { getTodayInTimezone, formatDateInTimezone, parseLocalDate } from '@/lib/dateUtils'
import type { PaintSchedule } from '@/types'

interface CalendarDay {
  date: Date
  dateString: string
  isCurrentMonth: boolean
  isToday: boolean
  schedules: PaintSchedule[]
}

export default function PaintCalendarPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { settings } = useSettingsStore()
  const { currentFactory } = useAuthStore()
  const timezone = settings.timezone

  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [schedules, setSchedules] = useState<PaintSchedule[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    fetchSchedules()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, currentFactory])

  const fetchSchedules = async () => {
    setLoading(true)
    try {
      const yearMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
      const { data } = await paintApi.getSchedulesByMonth(yearMonth)
      if (data) setSchedules(data)
    } catch (error) {
      console.error('Failed to fetch schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  const calendarDays = useMemo((): CalendarDay[] => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days: CalendarDay[] = []
    const today = getTodayInTimezone(timezone)

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      const dateString = formatDateInTimezone(date, timezone)

      days.push({
        date,
        dateString,
        isCurrentMonth: date.getMonth() === month,
        isToday: dateString === today,
        schedules: schedules.filter((s) => s.scheduled_date === dateString),
      })
    }

    return days
  }, [currentDate, schedules, timezone])

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    setSelectedDate(null)
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    setSelectedDate(null)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(getTodayInTimezone(timezone))
  }

  const monthName = currentDate.toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : 'vi-VN', {
    year: 'numeric',
    month: 'long',
  })

  const weekDays = [
    t('common.weekdaySun'),
    t('common.weekdayMon'),
    t('common.weekdayTue'),
    t('common.weekdayWed'),
    t('common.weekdayThu'),
    t('common.weekdayFri'),
    t('common.weekdaySat'),
  ]

  const getStatusColor = (schedule: PaintSchedule) => {
    const today = getTodayInTimezone(timezone)
    const isOverdue = schedule.scheduled_date < today &&
                      (schedule.status === 'scheduled' || schedule.status === 'in_progress')

    if (isOverdue) return 'bg-red-100 text-red-800 border-red-300'

    switch (schedule.status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'paused':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const isOverdue = (schedule: PaintSchedule): boolean => {
    const today = getTodayInTimezone(timezone)
    return schedule.scheduled_date < today &&
           (schedule.status === 'scheduled' || schedule.status === 'in_progress')
  }

  const getProgressPercent = (schedule: PaintSchedule): number => {
    if (schedule.status === 'completed') return 100
    if (schedule.status === 'scheduled' || schedule.status === 'cancelled') return 0
    const currentStep = schedule.current_step || 0
    return Math.round((currentStep / 6) * 100)
  }

  const selectedDateSchedules = selectedDate
    ? schedules.filter((s) => s.scheduled_date === selectedDate)
    : []

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">{t('paint.calendar')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchSchedules} className="h-9 px-3">
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/paint/schedules')} className="h-9 px-3">
            <ListTodo className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('paint.listView')}</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6 pb-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="flex items-center gap-2 sm:gap-4">
              <CardTitle className="text-base sm:text-lg">{monthName}</CardTitle>
              <Button variant="outline" size="sm" onClick={goToToday} className="h-7 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm">
                {t('notification.today')}
              </Button>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            {loading ? (
              <div className="flex h-64 sm:h-96 items-center justify-center">
                <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {/* Week days header */}
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="py-1 sm:py-2 text-center text-xs sm:text-sm font-medium text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`min-h-[60px] sm:min-h-[100px] cursor-pointer rounded-md sm:rounded-lg border p-0.5 sm:p-1 transition-colors active:bg-muted/50 sm:hover:bg-muted/50 ${
                      !day.isCurrentMonth ? 'opacity-40' : ''
                    } ${day.isToday ? 'border-primary bg-primary/5' : ''} ${
                      selectedDate === day.dateString ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedDate(day.dateString)}
                  >
                    <div
                      className={`mb-0.5 sm:mb-1 text-xs sm:text-sm font-medium ${
                        day.isToday ? 'text-primary' : ''
                      }`}
                    >
                      {day.date.getDate()}
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                      {day.schedules.slice(0, window.innerWidth < 640 ? 2 : 3).map((schedule) => (
                        <div
                          key={schedule.id}
                          className={`truncate rounded px-0.5 sm:px-1 py-0.5 text-[10px] sm:text-xs ${getStatusColor(
                            schedule
                          )}`}
                          title={`${schedule.equipment?.equipment_code}`}
                        >
                          {schedule.equipment?.equipment_code}
                        </div>
                      ))}
                      {day.schedules.length > (window.innerWidth < 640 ? 2 : 3) && (
                        <div className="text-[10px] sm:text-xs text-muted-foreground">
                          +{day.schedules.length - (window.innerWidth < 640 ? 2 : 3)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Date Details */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">
              {selectedDate
                ? (() => {
                    const localDate = parseLocalDate(selectedDate)
                    return localDate.toLocaleDateString(
                      i18n.language === 'ko' ? 'ko-KR' : 'vi-VN',
                      { year: 'numeric', month: 'long', day: 'numeric' }
                    )
                  })()
                : t('paint.scheduledDate')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {!selectedDate ? (
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t('paint.selectScheduleToStartDesc')}
              </p>
            ) : selectedDateSchedules.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground">{t('paint.noPaintToday')}</p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {selectedDateSchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="rounded-lg border p-2 sm:p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm sm:text-base truncate">
                        {schedule.equipment?.equipment_code}
                      </span>
                      <Badge
                        variant={
                          isOverdue(schedule)
                            ? 'destructive'
                            : schedule.status === 'completed'
                            ? 'success'
                            : schedule.status === 'in_progress'
                            ? 'warning'
                            : 'outline'
                        }
                      >
                        {isOverdue(schedule)
                          ? t('paint.statusOverdue')
                          : t(`paint.status${schedule.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')}`)}
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {schedule.equipment?.equipment_name}
                    </p>
                    {/* Progress indicator */}
                    {(schedule.status === 'in_progress' || schedule.status === 'completed') && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <Progress value={getProgressPercent(schedule)} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground">
                            {schedule.current_step || 0}/6
                          </span>
                        </div>
                      </div>
                    )}
                    {schedule.assigned_technician && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                        {t('paint.assignedTechnician')}: {schedule.assigned_technician.name}
                      </p>
                    )}
                    {(schedule.status === 'scheduled' || isOverdue(schedule) || schedule.status === 'in_progress') && (
                      <Button
                        size="sm"
                        className="mt-2 w-full h-8 sm:h-9 text-xs sm:text-sm"
                        variant={schedule.status === 'in_progress' ? 'secondary' : 'default'}
                        onClick={() => navigate(`/paint/execution?schedule=${schedule.id}`)}
                      >
                        <Play className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        {schedule.status === 'in_progress' ? t('paint.continuePaint') : t('paint.startPaint')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="py-3 sm:py-4 px-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-blue-100 border border-blue-300" />
              <span className="text-xs sm:text-sm">{t('paint.statusScheduled')}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-yellow-100 border border-yellow-300" />
              <span className="text-xs sm:text-sm">{t('paint.statusInProgress')}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-green-100 border border-green-300" />
              <span className="text-xs sm:text-sm">{t('paint.statusCompleted')}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-red-100 border border-red-300" />
              <span className="text-xs sm:text-sm">{t('paint.statusOverdue')}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-gray-100 border border-gray-300" />
              <span className="text-xs sm:text-sm">{t('paint.statusCancelled')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
