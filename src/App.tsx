import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import MainLayout from '@/components/layout/MainLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import EquipmentListPage from '@/pages/equipment/EquipmentListPage'
import EquipmentMasterPage from '@/pages/equipment/EquipmentMasterPage'
import EquipmentBulkUploadPage from '@/pages/equipment/EquipmentBulkUploadPage'
import MaintenanceInputPage from '@/pages/maintenance/MaintenanceInputPage'
import MaintenanceHistoryPage from '@/pages/maintenance/MaintenanceHistoryPage'
import MaintenanceMonitorPage from '@/pages/maintenance/MaintenanceMonitorPage'
import NotificationsPage from '@/pages/NotificationsPage'
import AnalyticsPage from '@/pages/analytics/AnalyticsPage'
import ReportPage from '@/pages/analytics/ReportPage'
import AIInsightPage from '@/pages/ai/AIInsightPage'
import AIChatPage from '@/pages/ai/AIChatPage'
import UserManagementPage from '@/pages/admin/UserManagementPage'
import RolePermissionPage from '@/pages/admin/RolePermissionPage'
import SettingsPage from '@/pages/admin/SettingsPage'
import ProfilePage from '@/pages/ProfilePage'
import PMDashboardPage from '@/pages/pm/PMDashboardPage'
import PMScheduleListPage from '@/pages/pm/PMScheduleListPage'
import PMCalendarPage from '@/pages/pm/PMCalendarPage'
import PMExecutionPage from '@/pages/pm/PMExecutionPage'
import PMTemplatesPage from '@/pages/pm/PMTemplatesPage'
import PMAnalyticsPage from '@/pages/pm/PMAnalyticsPage'
import PMScheduleDetailPage from '@/pages/pm/PMScheduleDetailPage'
import PMScheduleCreatePage from '@/pages/pm/PMScheduleCreatePage'
import PartsPage from '@/pages/parts/PartsPage'
import { Loader2 } from 'lucide-react'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()

  // Show loading while checking session
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  const { checkSession } = useAuthStore()
  const { fetchSettings } = useSettingsStore()

  // Check Supabase session and load settings on app load
  useEffect(() => {
    checkSession()
    fetchSettings()
  }, [checkSession, fetchSettings])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Equipment Management */}
        <Route path="equipment">
          <Route index element={<EquipmentListPage />} />
          <Route path="master" element={<EquipmentMasterPage />} />
          <Route path="bulk-upload" element={<EquipmentBulkUploadPage />} />
        </Route>

        {/* Maintenance Management */}
        <Route path="maintenance">
          <Route index element={<MaintenanceInputPage />} />
          <Route path="history" element={<MaintenanceHistoryPage />} />
          <Route path="monitor" element={<MaintenanceMonitorPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        {/* PM (Preventive Maintenance) */}
        <Route path="pm">
          <Route index element={<PMDashboardPage />} />
          <Route path="calendar" element={<PMCalendarPage />} />
          <Route path="schedules" element={<PMScheduleListPage />} />
          <Route path="schedules/new" element={<PMScheduleCreatePage />} />
          <Route path="schedules/:id" element={<PMScheduleDetailPage />} />
          <Route path="execution" element={<PMExecutionPage />} />
          <Route path="templates" element={<PMTemplatesPage />} />
          <Route path="analytics" element={<PMAnalyticsPage />} />
        </Route>

        {/* Analytics */}
        <Route path="analytics">
          <Route index element={<AnalyticsPage />} />
          <Route path="report" element={<ReportPage />} />
        </Route>

        {/* AI Insights */}
        <Route path="ai">
          <Route index element={<AIInsightPage />} />
          <Route path="chat" element={<AIChatPage />} />
        </Route>

        {/* Parts Information */}
        <Route path="parts" element={<PartsPage />} />

        {/* Admin */}
        <Route path="admin">
          <Route path="users" element={<UserManagementPage />} />
          <Route path="roles" element={<RolePermissionPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Profile */}
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  )
}

export default App
