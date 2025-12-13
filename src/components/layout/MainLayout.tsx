import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import MobileBottomNav from './MobileBottomNav'
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
          // 모바일: 마진 없음, 데스크톱: 사이드바 너비만큼 마진
          "ml-0 md:ml-16",
          !sidebarCollapsed && "md:ml-64",
          // 모바일: 하단 네비게이션 공간 확보
          "pb-16 md:pb-0"
        )}
      >
        <Header />
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      {/* 모바일 하단 네비게이션 */}
      <MobileBottomNav />
    </div>
  )
}
