import { NavLink } from 'react-router-dom'
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
  Server,
  Shield,
  Bell,
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
  const { sidebarCollapsed, toggleSidebarCollapse } = useUIStore()
  const { user } = useAuthStore()

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
          <span className="text-xl font-bold text-primary">AMMS</span>
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
                <NavGroup item={item} collapsed={sidebarCollapsed} />
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

function NavGroup({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { t } = useTranslation()

  if (collapsed) {
    return (
      <NavLink
        to={item.children?.[0]?.path || item.path}
        className={({ isActive }) =>
          cn(
            "flex items-center justify-center rounded-lg p-2 transition-colors",
            isActive
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
      <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400">
        {item.icon}
        <span>{t(item.labelKey)}</span>
      </div>
      <ul className="ml-4 space-y-1 border-l border-slate-700 pl-4">
        {item.children?.map((child) => (
          <li key={child.path}>
            <NavLink
              to={child.path}
              end={child.path === item.path}
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
  )
}
