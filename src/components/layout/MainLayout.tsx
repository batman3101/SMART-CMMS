import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import { useAppRealtime } from '@/hooks/useRealtimeSync'
import { useFirebaseMessaging } from '@/hooks/useFirebaseMessaging'

export default function MainLayout() {
  const { sidebarCollapsed } = useUIStore()

  // Supabase Realtime 구독 - 실시간 데이터 동기화
  useAppRealtime(true)

  // Firebase Cloud Messaging - 푸시 알림
  useFirebaseMessaging()

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "ml-16" : "ml-64"
        )}
      >
        <Header />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
