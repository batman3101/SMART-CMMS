/**
 * Permission utilities for role-based access control
 * User roles: 1=Admin, 2=Supervisor, 3=Technician, 4=Viewer
 */

import type { User } from '@/types'

export type Permission =
  | 'maintenance:create'
  | 'maintenance:complete'
  | 'maintenance:view'
  | 'equipment:create'
  | 'equipment:edit'
  | 'equipment:view'
  | 'pm:create'
  | 'pm:execute'
  | 'pm:view'
  | 'admin:users'
  | 'admin:settings'
  | 'analytics:view'
  | 'ai:chat'

// Permission matrix by role
const permissionMatrix: Record<number, Permission[]> = {
  // Admin - Full access
  1: [
    'maintenance:create', 'maintenance:complete', 'maintenance:view',
    'equipment:create', 'equipment:edit', 'equipment:view',
    'pm:create', 'pm:execute', 'pm:view',
    'admin:users', 'admin:settings',
    'analytics:view', 'ai:chat'
  ],
  // Supervisor - Manage maintenance and PM
  2: [
    'maintenance:create', 'maintenance:complete', 'maintenance:view',
    'equipment:edit', 'equipment:view',
    'pm:create', 'pm:execute', 'pm:view',
    'analytics:view', 'ai:chat'
  ],
  // Technician - Execute maintenance and PM
  3: [
    'maintenance:create', 'maintenance:complete', 'maintenance:view',
    'equipment:view',
    'pm:execute', 'pm:view',
    'ai:chat'
  ],
  // Viewer - Read only
  4: [
    'maintenance:view',
    'equipment:view',
    'pm:view',
    'analytics:view'
  ]
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false
  const permissions = permissionMatrix[user.role] || []
  return permissions.includes(permission)
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(user: User | null, permissions: Permission[]): boolean {
  if (!user) return false
  return permissions.some(permission => hasPermission(user, permission))
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(user: User | null, permissions: Permission[]): boolean {
  if (!user) return false
  return permissions.every(permission => hasPermission(user, permission))
}

/**
 * Get role name for display
 */
export function getRoleName(role: number, language: 'ko' | 'vi' = 'ko'): string {
  const roleNames: Record<number, { ko: string; vi: string }> = {
    1: { ko: '관리자', vi: 'Quản trị viên' },
    2: { ko: '감독자', vi: 'Giám sát viên' },
    3: { ko: '기술자', vi: 'Kỹ thuật viên' },
    4: { ko: '뷰어', vi: 'Người xem' }
  }
  return roleNames[role]?.[language] || 'Unknown'
}

/**
 * Check if user can access a specific page
 */
export function canAccessPage(user: User | null, page: string): boolean {
  if (!user) return false

  const pagePermissions: Record<string, Permission[]> = {
    '/maintenance/input': ['maintenance:create'],
    '/maintenance/monitor': ['maintenance:complete'],
    '/maintenance/history': ['maintenance:view'],
    '/equipment/list': ['equipment:view'],
    '/equipment/master': ['equipment:edit'],
    '/pm/dashboard': ['pm:view'],
    '/pm/schedule': ['pm:view'],
    '/pm/execution': ['pm:execute'],
    '/pm/templates': ['pm:create'],
    '/analytics': ['analytics:view'],
    '/ai/chat': ['ai:chat'],
    '/ai/insights': ['ai:chat'],
    '/admin/users': ['admin:users'],
    '/admin/settings': ['admin:settings'],
  }

  const requiredPermissions = pagePermissions[page]
  if (!requiredPermissions) return true // No specific permission required

  return hasAnyPermission(user, requiredPermissions)
}
