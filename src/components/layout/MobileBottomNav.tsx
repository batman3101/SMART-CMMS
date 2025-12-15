import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Settings2,
  Wrench,
  Calendar,
  MoreHorizontal,
  X,
  BarChart3,
  Bell,
  Users,
  Shield,
  Settings,
  Sparkles,
  MessageSquare,
  Package,
  ClipboardList,
  FileText,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

interface NavItem {
  icon: React.ElementType
  labelKey: string
  path: string | null
  badge?: number
}

const mainNavItems: NavItem[] = [
  { icon: LayoutDashboard, labelKey: 'nav.dashboard', path: '/dashboard' },
  { icon: Settings2, labelKey: 'nav.equipment', path: '/equipment/list' },
  { icon: Wrench, labelKey: 'nav.maintenance', path: '/maintenance/input' },
  { icon: Calendar, labelKey: 'nav.pm', path: '/pm/calendar' },
  { icon: MoreHorizontal, labelKey: 'nav.more', path: null },
]

interface MoreMenuItem {
  icon: React.ElementType
  labelKey: string
  path: string
  category: 'main' | 'analytics' | 'ai' | 'admin'
}

const moreMenuItems: MoreMenuItem[] = [
  // 메인 기능
  { icon: LayoutDashboard, labelKey: 'nav.dashboard', path: '/dashboard', category: 'main' },
  { icon: Settings2, labelKey: 'nav.equipmentList', path: '/equipment/list', category: 'main' },
  { icon: FileText, labelKey: 'nav.equipmentMaster', path: '/equipment/master', category: 'main' },
  { icon: Wrench, labelKey: 'nav.maintenanceInput', path: '/maintenance/input', category: 'main' },
  { icon: ClipboardList, labelKey: 'nav.maintenanceHistory', path: '/maintenance/history', category: 'main' },
  { icon: Calendar, labelKey: 'nav.pmCalendar', path: '/pm/calendar', category: 'main' },
  { icon: Package, labelKey: 'nav.parts', path: '/parts', category: 'main' },
  { icon: Bell, labelKey: 'nav.notifications', path: '/maintenance/notifications', category: 'main' },
  // 분석
  { icon: BarChart3, labelKey: 'nav.analytics', path: '/analytics', category: 'analytics' },
  // AI
  { icon: Sparkles, labelKey: 'nav.aiInsights', path: '/ai/insights', category: 'ai' },
  { icon: MessageSquare, labelKey: 'nav.aiChat', path: '/ai/chat', category: 'ai' },
  // 관리
  { icon: Users, labelKey: 'nav.userManagement', path: '/admin/users', category: 'admin' },
  { icon: Shield, labelKey: 'nav.rolePermissions', path: '/admin/roles', category: 'admin' },
  { icon: Settings, labelKey: 'nav.settings', path: '/admin/settings', category: 'admin' },
  { icon: User, labelKey: 'nav.myInfo', path: '/profile', category: 'admin' },
]

export function MobileBottomNav() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  const isActive = (path: string | null) => {
    if (!path) return false
    if (path === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname.startsWith(path.split('/').slice(0, 2).join('/'))
  }

  const handleNavClick = (item: NavItem) => {
    if (item.path === null) {
      setIsMoreOpen(true)
    } else {
      navigate(item.path)
    }
  }

  const handleMoreItemClick = (path: string) => {
    navigate(path)
    setIsMoreOpen(false)
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'main':
        return t('nav.mainFeatures', '주요 기능')
      case 'analytics':
        return t('nav.analytics', '분석')
      case 'ai':
        return t('nav.ai', 'AI')
      case 'admin':
        return t('nav.admin', '관리')
      default:
        return ''
    }
  }

  // 사용자 권한에 따른 메뉴 필터링
  const filteredMoreItems = moreMenuItems.filter((item) => {
    if (item.category === 'admin' && user?.role && user.role > 2) {
      return false // Admin 메뉴는 관리자/슈퍼바이저만
    }
    return true
  })

  const groupedItems = filteredMoreItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, MoreMenuItem[]>
  )

  return (
    <>
      {/* 하단 네비게이션 바 */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
        <div className="flex h-16 items-center justify-around">
          {mainNavItems.map((item) => {
            const Icon = item.icon
            const active = item.path === null ? isMoreOpen : isActive(item.path)

            return (
              <button
                key={item.labelKey}
                onClick={() => handleNavClick(item)}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className={cn('h-5 w-5', active && 'text-primary')} />
                <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
              </button>
            )
          })}
        </div>
        {/* Safe area for iOS */}
        <div className="h-safe-area-inset-bottom bg-background" />
      </nav>

      {/* 더보기 메뉴 - 전체 화면 */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-[60] bg-background md:hidden">
          {/* 헤더 */}
          <div className="flex h-14 items-center justify-between border-b px-4">
            <h2 className="text-lg font-semibold">{t('nav.allMenus', '전체 메뉴')}</h2>
            <button
              onClick={() => setIsMoreOpen(false)}
              className="rounded-full p-2 hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 메뉴 콘텐츠 */}
          <div className="h-[calc(100vh-14rem)] overflow-y-auto px-4 py-4">
            {(['main', 'analytics', 'ai', 'admin'] as const).map((category) => {
              const items = groupedItems[category]
              if (!items || items.length === 0) return null

              return (
                <div key={category} className="mb-6">
                  <h3 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
                    {getCategoryLabel(category)}
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {items.map((item) => {
                      const Icon = item.icon
                      const active = location.pathname === item.path

                      return (
                        <button
                          key={item.path}
                          onClick={() => handleMoreItemClick(item.path)}
                          className={cn(
                            'flex flex-col items-center gap-2 rounded-lg p-3 transition-colors',
                            active
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <Icon className="h-6 w-6" />
                          <span className="text-center text-[10px] font-medium leading-tight">
                            {t(item.labelKey)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 하단 네비게이션 (전체 메뉴 화면 내) */}
          <div className="fixed bottom-0 left-0 right-0 border-t bg-background">
            <div className="flex h-16 items-center justify-around">
              {mainNavItems.map((item) => {
                const Icon = item.icon
                const active = item.path === null

                return (
                  <button
                    key={item.labelKey}
                    onClick={() => {
                      if (item.path === null) {
                        setIsMoreOpen(false)
                      } else {
                        navigate(item.path)
                        setIsMoreOpen(false)
                      }
                    }}
                    className={cn(
                      'flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors',
                      active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', active && 'text-primary')} />
                    <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
                  </button>
                )
              })}
            </div>
            <div className="h-safe-area-inset-bottom bg-background" />
          </div>
        </div>
      )}
    </>
  )
}

export default MobileBottomNav
