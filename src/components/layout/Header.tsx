import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useNotificationStore, NotificationType } from '@/stores/notificationStore'
import { Button } from '@/components/ui/button'
import { LogOut, Globe, Bell, Sun, Moon, AlertTriangle, Wrench, Clock, CheckCircle, X, Calendar } from 'lucide-react'

export default function Header() {
  const { t } = useTranslation()
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, logout, language, setLanguage } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()

  // Notification Store 연동
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    getUnreadCount,
  } = useNotificationStore()

  const [showNotifications, setShowNotifications] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = getUnreadCount()

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const toggleLanguage = () => {
    const newLang = language === 'ko' ? 'vi' : 'ko'
    setLanguage(newLang)
    i18n.changeLanguage(newLang)
  }

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'long_repair':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pm_schedule':
        return <Calendar className="h-4 w-4 text-purple-500" />
      default:
        return <Wrench className="h-4 w-4 text-blue-500" />
    }
  }

  const getNotificationBgColor = (type: NotificationType, read: boolean) => {
    if (read) return 'bg-background'
    switch (type) {
      case 'emergency':
        return 'bg-red-50 dark:bg-red-950/20'
      case 'long_repair':
        return 'bg-yellow-50 dark:bg-yellow-950/20'
      case 'completed':
        return 'bg-green-50 dark:bg-green-950/20'
      case 'pm_schedule':
        return 'bg-purple-50 dark:bg-purple-950/20'
      default:
        return 'bg-blue-50 dark:bg-blue-950/20'
    }
  }

  // 알림 제목/메시지 번역 헬퍼
  const getNotificationTitle = (type: NotificationType) => {
    switch (type) {
      case 'emergency':
        return t('notification.emergencyTitle')
      case 'long_repair':
        return t('notification.longRepairTitle')
      case 'completed':
        return t('notification.completedTitle')
      case 'pm_schedule':
        return t('notification.pmScheduleTitle')
      default:
        return t('notification.info')
    }
  }

  const getNotificationMessage = (type: NotificationType, equipmentCode?: string, rating?: number) => {
    switch (type) {
      case 'emergency':
        return t('notification.emergencyMessage', { equipment: equipmentCode || '' })
      case 'long_repair':
        return t('notification.longRepairMessage', { equipment: equipmentCode || '' })
      case 'completed':
        return t('notification.completedMessage', { equipment: equipmentCode || '', rating: rating || 9 })
      case 'pm_schedule':
        return t('notification.pmScheduleMessage', { equipment: equipmentCode || '' })
      default:
        return ''
    }
  }

  const handleNotificationClick = (notificationId: string, type: NotificationType) => {
    markAsRead(notificationId)
    // 알림 유형에 따라 해당 페이지로 이동
    if (type === 'emergency' || type === 'long_repair') {
      navigate('/maintenance/monitoring')
    } else if (type === 'completed') {
      navigate('/maintenance/history')
    } else if (type === 'pm_schedule') {
      navigate('/maintenance')
    }
    setShowNotifications(false)
  }

  // 상대 시간 표시 (created_at 기준)
  const getRelativeTime = (createdAt: string) => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffMs = now.getTime() - created.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return t('notification.justNow', '방금 전')
    if (diffMins < 60) return t('notification.minutesAgo', '{{mins}}분 전', { mins: diffMins })
    if (diffHours < 24) return t('notification.hoursAgo', '{{hours}}시간 전', { hours: diffHours })
    return t('notification.daysAgo', '{{days}}일 전', { days: diffDays })
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">
          {language === 'ko'
            ? 'ALMUS TECH 설비 유지보수 시스템'
            : 'ALMUS TECH Maintenance Management System'}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>

          {/* 알림 드롭다운 */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border bg-background shadow-lg">
              {/* 헤더 */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="font-semibold">{t('notification.title')}</h3>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-primary"
                    onClick={markAllAsRead}
                  >
                    {t('notification.markAllRead')}
                  </Button>
                )}
              </div>

              {/* 알림 목록 */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    {t('notification.noNotifications')}
                  </div>
                ) : (
                  notifications.slice(0, 5).map((notification) => (
                    <div
                      key={notification.id}
                      className={`relative cursor-pointer border-b px-4 py-3 transition-colors hover:bg-muted/50 ${getNotificationBgColor(
                        notification.type,
                        notification.read
                      )}`}
                      onClick={() => handleNotificationClick(notification.id, notification.type)}
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 pr-6">
                          <p className={`text-sm ${!notification.read ? 'font-semibold' : ''}`}>
                            {getNotificationTitle(notification.type)}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                            {getNotificationMessage(notification.type, notification.equipment_code)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {getRelativeTime(notification.created_at)}
                          </p>
                        </div>
                      </div>
                      <button
                        className="absolute right-2 top-2 rounded p-1 hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeNotification(notification.id)
                        }}
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                      {!notification.read && (
                        <div className="absolute left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* 푸터 */}
              {notifications.length > 0 && (
                <div className="border-t px-4 py-2">
                  <button
                    type="button"
                    className="w-full rounded-md py-2 text-xs text-primary hover:bg-muted transition-colors"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowNotifications(false)
                      navigate('/maintenance/notifications')
                    }}
                  >
                    {t('notification.viewAll')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title={theme === 'light' ? '다크 모드' : '라이트 모드'}
        >
          {theme === 'light' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>

        {/* Language Toggle */}
        <Button variant="ghost" size="sm" onClick={toggleLanguage}>
          <Globe className="mr-2 h-4 w-4" />
          {language === 'ko' ? '한국어' : 'Tiếng Việt'}
        </Button>

        {/* User Info */}
        <div className="flex items-center gap-3 border-l pl-4">
          <div className="text-right">
            <p className="text-sm font-medium">
              {user?.name}
            </p>
            <p className="text-xs text-muted-foreground">{user?.department}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
