import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useNotificationStore, NotificationType } from '@/stores/notificationStore'
import { pushNotificationService } from '@/services/pushNotificationService'
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle,
  Wrench,
  Trash2,
  CheckCheck,
  Filter,
  Calendar,
  Settings,
  Smartphone,
} from 'lucide-react'

export default function NotificationsPage() {
  const { t } = useTranslation()

  // Notification Store 연동
  const {
    notifications,
    pushSettings,
    isSubscribed,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearReadNotifications,
    getUnreadCount,
    setPushSettings,
    fetchNotifications,
  } = useNotificationStore()

  // Supabase에서 알림 가져오기
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const [filterType, setFilterType] = useState<string>('all')
  const [showSettings, setShowSettings] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default')

  const unreadCount = getUnreadCount()

  // 권한 상태 확인 및 FCM 토큰 자동 등록
  useEffect(() => {
    if (pushNotificationService.isSupported()) {
      const currentPermission = pushNotificationService.getPermissionStatus()
      setPermissionStatus(currentPermission)

      // 권한이 granted이고 푸시가 활성화되어 있으면 FCM 토큰 자동 등록
      // (기존 사용자들의 토큰이 등록 안 된 경우를 위한 자동 복구)
      if (currentPermission === 'granted' && pushSettings.enabled) {
        pushNotificationService.registerFCMToken()
      }
    }
  }, [pushSettings.enabled])

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case 'long_repair':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'pm_schedule':
        return <Calendar className="h-5 w-5 text-purple-500" />
      default:
        return <Wrench className="h-5 w-5 text-blue-500" />
    }
  }

  const getNotificationBgColor = (type: NotificationType, read: boolean) => {
    if (read) return 'bg-background'
    switch (type) {
      case 'emergency':
        return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
      case 'long_repair':
        return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
      case 'completed':
        return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
      case 'pm_schedule':
        return 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800'
      default:
        return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
    }
  }

  const getTypeBadge = (type: NotificationType) => {
    switch (type) {
      case 'emergency':
        return <Badge variant="destructive">{t('notification.emergency')}</Badge>
      case 'long_repair':
        return <Badge className="bg-yellow-500">{t('notification.longRepair')}</Badge>
      case 'completed':
        return <Badge className="bg-green-500">{t('notification.completed')}</Badge>
      case 'pm_schedule':
        return <Badge className="bg-purple-500">{t('notification.pmSchedule')}</Badge>
      default:
        return <Badge variant="secondary">{t('notification.info')}</Badge>
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

  const handleRequestPermission = async () => {
    const permission = await pushNotificationService.requestPermission()
    setPermissionStatus(permission)
  }

  const handleTogglePushEnabled = async (enabled: boolean) => {
    if (enabled) {
      if (permissionStatus !== 'granted') {
        const permission = await pushNotificationService.requestPermission()
        setPermissionStatus(permission)
        if (permission !== 'granted') return
      } else {
        // 권한이 이미 granted인 경우에도 FCM 토큰 등록
        await pushNotificationService.registerFCMToken()
      }
    }
    setPushSettings({ enabled })
  }

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === 'all') return true
    if (filterType === 'unread') return !n.read
    return n.type === filterType
  })

  // 날짜별로 그룹화
  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = notification.date
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(notification)
    return groups
  }, {} as Record<string, typeof notifications>)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (dateStr === today.toISOString().split('T')[0]) {
      return t('notification.today')
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return t('notification.yesterday')
    }
    return date.toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-bold">{t('notification.pageTitle')}</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} {t('notification.unread')}</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant={showSettings ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="mr-2 h-4 w-4" />
            {t('notification.pushSettings')}
          </Button>
          <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
            <CheckCheck className="mr-2 h-4 w-4" />
            {t('notification.markAllRead')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearReadNotifications}
            disabled={notifications.filter((n) => n.read).length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('notification.deleteRead')}
          </Button>
        </div>
      </div>

      {/* 푸시 알림 설정 */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              {t('notification.pushSettings')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 권한 상태 */}
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('notification.permissionStatus')}</p>
                  <p className="text-sm text-muted-foreground">
                    {permissionStatus === 'granted'
                      ? t('notification.permissionGranted')
                      : permissionStatus === 'denied'
                      ? t('notification.permissionDenied')
                      : t('notification.permissionDefault')}
                  </p>
                </div>
                {permissionStatus !== 'granted' && (
                  <Button onClick={handleRequestPermission} disabled={permissionStatus === 'denied'}>
                    {t('notification.requestPermission')}
                  </Button>
                )}
              </div>
            </div>

            {/* 푸시 알림 활성화 */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-enabled">{t('notification.enablePush')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('notification.enablePushDesc')}
                </p>
              </div>
              <Switch
                id="push-enabled"
                checked={pushSettings.enabled}
                onCheckedChange={handleTogglePushEnabled}
                disabled={permissionStatus === 'denied'}
              />
            </div>

            {/* 알림 유형별 설정 */}
            {pushSettings.enabled && (
              <div className="space-y-4 border-t pt-4">
                <p className="text-sm font-medium">{t('notification.notificationTypes')}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <Label htmlFor="push-emergency">{t('notification.emergency')}</Label>
                  </div>
                  <Switch
                    id="push-emergency"
                    checked={pushSettings.emergency}
                    onCheckedChange={(checked) => setPushSettings({ emergency: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <Label htmlFor="push-long-repair">{t('notification.longRepair')}</Label>
                  </div>
                  <Switch
                    id="push-long-repair"
                    checked={pushSettings.long_repair}
                    onCheckedChange={(checked) => setPushSettings({ long_repair: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <Label htmlFor="push-completed">{t('notification.completed')}</Label>
                  </div>
                  <Switch
                    id="push-completed"
                    checked={pushSettings.completed}
                    onCheckedChange={(checked) => setPushSettings({ completed: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-500" />
                    <Label htmlFor="push-pm">{t('notification.pmSchedule')}</Label>
                  </div>
                  <Switch
                    id="push-pm"
                    checked={pushSettings.pm_schedule}
                    onCheckedChange={(checked) => setPushSettings({ pm_schedule: checked })}
                  />
                </div>
              </div>
            )}

            {/* 구독 상태 */}
            {isSubscribed && (
              <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-4">
                <p className="text-sm text-green-700 dark:text-green-300">
                  {t('notification.subscribed')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('notification.total')}</p>
              <p className="text-xl font-bold">{notifications.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('notification.emergency')}</p>
              <p className="text-xl font-bold text-red-600">
                {notifications.filter((n) => n.type === 'emergency').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('notification.longRepair')}</p>
              <p className="text-xl font-bold text-yellow-600">
                {notifications.filter((n) => n.type === 'long_repair').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Bell className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('notification.unread')}</p>
              <p className="text-xl font-bold text-blue-600">{unreadCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t('notification.filter')}:</span>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: t('common.all') },
                { value: 'unread', label: t('notification.unread') },
                { value: 'emergency', label: t('notification.emergency') },
                { value: 'long_repair', label: t('notification.longRepair') },
                { value: 'completed', label: t('notification.completed') },
                { value: 'pm_schedule', label: t('notification.pmSchedule') },
              ].map((filter) => (
                <Button
                  key={filter.value}
                  variant={filterType === filter.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 알림 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('notification.list')}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">{t('notification.noNotifications')}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedNotifications)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, items]) => (
                  <div key={date}>
                    <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                      {formatDate(date)}
                    </h3>
                    <div className="space-y-3">
                      {items.map((notification) => (
                        <div
                          key={notification.id}
                          className={`relative rounded-lg border p-4 transition-colors ${getNotificationBgColor(
                            notification.type,
                            notification.read
                          )}`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="mt-0.5">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className={`font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {notification.title || getNotificationTitle(notification.type)}
                                </p>
                                {getTypeBadge(notification.type)}
                                {!notification.read && (
                                  <span className="h-2 w-2 rounded-full bg-primary" />
                                )}
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {notification.message || getNotificationMessage(notification.type, notification.equipment_code)}
                              </p>
                              {notification.equipment_code && (
                                <p className="mt-2 text-xs">
                                  <span className="rounded bg-muted px-2 py-1 font-mono">
                                    {notification.equipment_code}
                                  </span>
                                </p>
                              )}
                              <p className="mt-2 text-xs text-muted-foreground">
                                {notification.time}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                  title={t('notification.markRead')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeNotification(notification.id)}
                                title={t('common.delete')}
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
