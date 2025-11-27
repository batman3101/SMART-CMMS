// Mock Auth API
// When connecting to Supabase, replace with real auth API calls

import { mockUsers } from '../data'
import type { User } from '@/types'

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  user: User | null
  error: string | null
}

export const mockAuthApi = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    await delay(500) // Simulate network delay

    // Find user by email
    const user = mockUsers.find(
      (u) => u.email === credentials.email && u.is_active
    )

    if (!user) {
      return { user: null, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
    }

    // In mock, any password works for existing users
    // In production, this would validate against hashed password
    if (credentials.password.length < 4) {
      return { user: null, error: '비밀번호는 4자 이상이어야 합니다.' }
    }

    return { user, error: null }
  },

  async logout(): Promise<{ error: string | null }> {
    await delay(200)
    return { error: null }
  },

  async getCurrentUser(userId: string): Promise<User | null> {
    await delay(200)
    return mockUsers.find((u) => u.id === userId) || null
  },

  async updateProfile(
    userId: string,
    updates: Partial<User>
  ): Promise<{ user: User | null; error: string | null }> {
    await delay(300)

    const userIndex = mockUsers.findIndex((u) => u.id === userId)
    if (userIndex === -1) {
      return { user: null, error: '사용자를 찾을 수 없습니다.' }
    }

    // In mock, we just return the updated user
    const updatedUser = { ...mockUsers[userIndex], ...updates }
    return { user: updatedUser, error: null }
  },

  async changePassword(
    userId: string,
    _currentPassword: string,
    _newPassword: string
  ): Promise<{ error: string | null }> {
    await delay(300)

    const user = mockUsers.find((u) => u.id === userId)
    if (!user) {
      return { error: '사용자를 찾을 수 없습니다.' }
    }

    // In mock, password change always succeeds
    return { error: null }
  },
}
