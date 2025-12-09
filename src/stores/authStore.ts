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

          // If session exists but no user in store, fetch user data
          const currentUser = get().user
          if (!currentUser && session.user) {
            // Fetch user profile from users table
            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .eq('auth_user_id', session.user.id)
              .single()

            if (userData) {
              set({ user: userData, isAuthenticated: true, isLoading: false })
            } else {
              // User exists in auth but not in users table
              set({ isAuthenticated: false, isLoading: false, user: null })
              return false
            }
          } else {
            set({ isLoading: false })
          }

          return true
        } catch (error) {
          console.error('Session check failed:', error)
          set({ isAuthenticated: false, isLoading: false, user: null })
          return false
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
