// Mock Users API
// When connecting to Supabase, replace with real API calls

import { mockUsers, mockTechnicians, getRolePermissions, updateRolePermission } from '../data'
import type { User, UserRole, RolePermission } from '@/types'

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const mockUsersApi = {
  async getUsers(): Promise<{
    data: User[]
    error: string | null
  }> {
    await delay(300)
    return { data: mockUsers, error: null }
  },

  async getUserById(id: string): Promise<{
    data: User | null
    error: string | null
  }> {
    await delay(200)
    const user = mockUsers.find((u) => u.id === id)
    return {
      data: user || null,
      error: user ? null : '사용자를 찾을 수 없습니다.',
    }
  },

  async getTechnicians(): Promise<{
    data: User[]
    error: string | null
  }> {
    await delay(200)
    return { data: mockTechnicians, error: null }
  },

  async getUsersByRole(role: UserRole): Promise<{
    data: User[]
    error: string | null
  }> {
    await delay(200)
    const users = mockUsers.filter((u) => u.role === role && u.is_active)
    return { data: users, error: null }
  },

  async createUser(
    user: Omit<User, 'id' | 'created_at' | 'updated_at'> & { password?: string }
  ): Promise<{ data: User | null; error: string | null }> {
    await delay(300)

    // Check if email already exists
    if (mockUsers.some((u) => u.email === user.email)) {
      return { data: null, error: '이미 존재하는 이메일입니다.' }
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      email: user.email,
      name: user.name,
      department: user.department,
      position: user.position,
      role: user.role,
      is_active: user.is_active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // In real implementation, password would be handled by Supabase Auth
    mockUsers.push(newUser)

    return { data: newUser, error: null }
  },

  async updateUser(
    id: string,
    updates: Partial<User> & { password?: string }
  ): Promise<{ data: User | null; error: string | null }> {
    await delay(300)

    const userIndex = mockUsers.findIndex((u) => u.id === id)
    if (userIndex === -1) {
      return { data: null, error: '사용자를 찾을 수 없습니다.' }
    }

    // In real implementation, password would be handled by Supabase Auth
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userUpdates } = updates

    const updatedUser: User = {
      ...mockUsers[userIndex],
      ...userUpdates,
      updated_at: new Date().toISOString(),
    }

    mockUsers[userIndex] = updatedUser

    return { data: updatedUser, error: null }
  },

  async deactivateUser(id: string): Promise<{ error: string | null }> {
    await delay(300)

    const userIndex = mockUsers.findIndex((u) => u.id === id)
    if (userIndex === -1) {
      return { error: '사용자를 찾을 수 없습니다.' }
    }

    mockUsers[userIndex].is_active = false
    return { error: null }
  },

  async activateUser(id: string): Promise<{ error: string | null }> {
    await delay(300)

    const userIndex = mockUsers.findIndex((u) => u.id === id)
    if (userIndex === -1) {
      return { error: '사용자를 찾을 수 없습니다.' }
    }

    mockUsers[userIndex].is_active = true
    return { error: null }
  },

  async resetPassword(id: string): Promise<{ error: string | null }> {
    await delay(300)

    const user = mockUsers.find((u) => u.id === id)
    if (!user) {
      return { error: '사용자를 찾을 수 없습니다.' }
    }

    // In real implementation, this would trigger Supabase password reset email
    return { error: null }
  },

  // Role Permission APIs
  async getRolePermissions(): Promise<{
    data: RolePermission[]
    error: string | null
  }> {
    await delay(200)
    return { data: getRolePermissions(), error: null }
  },

  async updateRolePermission(
    role: UserRole,
    pageKey: string,
    canAccess: boolean
  ): Promise<{
    data: RolePermission[]
    error: string | null
  }> {
    await delay(200)
    const updatedPermissions = updateRolePermission(role, pageKey, canAccess)
    return { data: updatedPermissions, error: null }
  },
}
