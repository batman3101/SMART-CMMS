import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { supabase, signOut as supabaseSignOut } from '@/lib/supabase'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  language: 'ko' | 'vi'
  login: (user: User) => void
  logout: () => Promise<void>
  setLanguage: (lang: 'ko' | 'vi') => void
  updateUser: (user: Partial<User>) => void
  setLoading: (loading: boolean) => void
  checkSession: () => Promise<boolean>
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      language: 'ko',

      login: (user) =>
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        }),

      logout: async () => {
        await supabaseSignOut()
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        })
      },

      setLanguage: (language) => set({ language }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      setLoading: (isLoading) => set({ isLoading }),

      checkSession: async () => {
        if (!supabase) {
          set({ isAuthenticated: false, isLoading: false, user: null })
          return false
        }

        try {
          const { data: { session } } = await supabase.auth.getSession()

          if (!session) {
            set({ isAuthenticated: false, isLoading: false, user: null })
            return false
          }

          // 항상 Supabase에서 최신 사용자 데이터 가져오기 (캐시보다 DB 우선)
          if (session.user) {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('*')
              .eq('auth_user_id', session.user.id)
              .single()

            if (userError || !userData) {
              // User exists in auth but not in users table
              console.error('User profile not found:', userError)
              set({ isAuthenticated: false, isLoading: false, user: null })
              return false
            }

            // 최신 데이터로 상태 업데이트
            set({ user: userData, isAuthenticated: true, isLoading: false })
          }

          return true
        } catch (error) {
          console.error('Session check failed:', error)
          set({ isAuthenticated: false, isLoading: false, user: null })
          return false
        }
      },

      // Supabase에서 최신 사용자 데이터 새로고침
      refreshUser: async () => {
        const currentUser = get().user
        if (!supabase || !currentUser?.id) return

        try {
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .single()

          if (!error && userData) {
            set({ user: userData })
          }
        } catch (error) {
          console.error('Failed to refresh user:', error)
        }
      },
    }),
    {
      name: 'amms-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        language: state.language,
      }),
    }
  )
)
