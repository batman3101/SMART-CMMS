import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Wrench,
  BarChart3,
  Bot,
  Users,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Server,
  Shield,
  CalendarClock,
  Package,
} from 'lucide-react'

interface NavItem {
  path: string
  icon: React.ReactNode
  labelKey: string
  children?: { path: string; labelKey: string }[]
  requiredRole?: number
}

const navItems: NavItem[] = [
  {
    path: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    labelKey: 'nav.dashboard',
  },
  {
    path: '/equipment',
    icon: <Server className="h-5 w-5" />,
    labelKey: 'nav.equipment',
    children: [
      { path: '/equipment', labelKey: 'nav.equipmentList' },
      { path: '/equipment/master', labelKey: 'nav.equipmentMaster' },
      { path: '/equipment/bulk-upload', labelKey: 'nav.equipmentBulkUpload' },
    ],
  },
  {
    path: '/maintenance',
    icon: <Wrench className="h-5 w-5" />,
    labelKey: 'nav.maintenance',
    children: [
      { path: '/maintenance', labelKey: 'nav.maintenanceInput' },
      { path: '/maintenance/history', labelKey: 'nav.maintenanceHistory' },
      { path: '/maintenance/monitor', labelKey: 'nav.maintenanceMonitor' },
      { path: '/maintenance/notifications', labelKey: 'nav.notifications' },
    ],
  },
  {
    path: '/pm',
    icon: <CalendarClock className="h-5 w-5" />,
    labelKey: 'nav.pm',
    children: [
      { path: '/pm', labelKey: 'nav.pmDashboard' },
      { path: '/pm/calendar', labelKey: 'nav.pmCalendar' },
      { path: '/pm/schedules', labelKey: 'nav.pmSchedules' },
      { path: '/pm/execution', labelKey: 'nav.pmExecution' },
      { path: '/pm/templates', labelKey: 'nav.pmTemplates' },
      { path: '/pm/analytics', labelKey: 'nav.pmAnalytics' },
    ],
  },
  {
    path: '/analytics',
    icon: <BarChart3 className="h-5 w-5" />,
    labelKey: 'nav.analytics',
    children: [
      { path: '/analytics', labelKey: 'nav.statistics' },
      { path: '/analytics/report', labelKey: 'nav.report' },
    ],
  },
  {
    path: '/ai',
    icon: <Bot className="h-5 w-5" />,
    labelKey: 'nav.ai',
    children: [
      { path: '/ai', labelKey: 'nav.aiInsight' },
      { path: '/ai/chat', labelKey: 'nav.aiChat' },
    ],
  },
  {
    path: '/parts',
    icon: <Package className="h-5 w-5" />,
    labelKey: 'nav.parts',
  },
  {
    path: '/admin/users',
    icon: <Users className="h-5 w-5" />,
    labelKey: 'nav.userManagement',
    requiredRole: 1,
  },
  {
    path: '/admin/roles',
    icon: <Shield className="h-5 w-5" />,
    labelKey: 'nav.rolePermission',
    requiredRole: 1,
  },
  {
    path: '/admin/settings',
    icon: <Settings className="h-5 w-5" />,
    labelKey: 'nav.settings',
    requiredRole: 1,
  },
]

export default function Sidebar() {
  const { t } = useTranslation()
  const location = useLocation()
  const { sidebarCollapsed, toggleSidebarCollapse } = useUIStore()
  const { user } = useAuthStore()

  // Track which menu groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    // Initially expand the group that contains the current path
    const currentGroup = navItems.find(
      (item) =>
        item.children &&
        item.children.some((child) => location.pathname === child.path || location.pathname.startsWith(child.path + '/'))
    )
    return currentGroup ? [currentGroup.path] : []
  })

  const toggleGroup = (path: string) => {
    setExpandedGroups((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    )
  }

  const isGroupExpanded = (path: string) => expandedGroups.includes(path)

  const isGroupActive = (item: NavItem) => {
    if (!item.children) return false
    return item.children.some(
      (child) => location.pathname === child.path || location.pathname.startsWith(child.path + '/')
    )
  }

  const filteredNavItems = navItems.filter(
    (item) => !item.requiredRole || (user?.role && user.role <= item.requiredRole)
  )

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-slate-900 text-white transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-slate-700 px-4">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <img
              src="/A symbol BLUE-02.png"
              alt="Symbol"
              className="h-8 w-8 object-contain"
            />
            <span className="text-lg font-bold text-primary" style={{ fontFamily: 'Inter, sans-serif' }}>
              SMART CMMS
            </span>
          </div>
        )}
        {sidebarCollapsed && (
          <img
            src="/A symbol BLUE-02.png"
            alt="Symbol"
            className="h-8 w-8 object-contain"
          />
        )}
        <button
          onClick={toggleSidebarCollapse}
          className="rounded p-1 hover:bg-slate-700"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {filteredNavItems.map((item) => (
            <li key={item.path}>
              {item.children ? (
                <NavGroup
                  item={item}
                  collapsed={sidebarCollapsed}
                  expanded={isGroupExpanded(item.path)}
                  active={isGroupActive(item)}
                  onToggle={() => toggleGroup(item.path)}
                />
              ) : (
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                      isActive
                        ? "bg-primary text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    )
                  }
                >
                  {item.icon}
                  {!sidebarCollapsed && <span>{t(item.labelKey)}</span>}
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Profile Link */}
      <div className="border-t border-slate-700 p-2">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
              isActive
                ? "bg-primary text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )
          }
        >
          <User className="h-5 w-5" />
          {!sidebarCollapsed && <span>{t('nav.profile')}</span>}
        </NavLink>
      </div>
    </aside>
  )
}

interface NavGroupProps {
  item: NavItem
  collapsed: boolean
  expanded: boolean
  active: boolean
  onToggle: () => void
}

function NavGroup({ item, collapsed, expanded, active, onToggle }: NavGroupProps) {
  const { t } = useTranslation()

  if (collapsed) {
    return (
      <NavLink
        to={item.children?.[0]?.path || item.path}
        className={({ isActive }) =>
          cn(
            "flex items-center justify-center rounded-lg p-2 transition-colors",
            isActive || active
              ? "bg-primary text-white"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          )
        }
      >
        {item.icon}
      </NavLink>
    )
  }

  return (
    <div>
      {/* Parent menu item - clickable to toggle */}
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between rounded-lg px-3 py-2 transition-colors",
          active
            ? "bg-slate-800 text-white"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        )}
      >
        <div className="flex items-center gap-3">
          {item.icon}
          <span className="text-sm font-medium">{t(item.labelKey)}</span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            expanded ? "rotate-180" : ""
          )}
        />
      </button>

      {/* Child menu items - collapsible */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <ul className="ml-4 mt-1 space-y-1 border-l border-slate-700 pl-4">
          {item.children?.map((child) => (
            <li key={child.path}>
              <NavLink
                to={child.path}
                end={child.path === item.path || child.path === item.children?.[0]?.path}
                className={({ isActive }) =>
                  cn(
                    "block rounded-lg px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )
                }
              >
                {t(child.labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
