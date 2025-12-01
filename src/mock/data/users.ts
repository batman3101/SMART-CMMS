import type { User, RolePermission } from '@/types'
import { DEPARTMENTS, POSITIONS } from '@/types'

export const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@amms.com',
    name: '관리자',
    department: DEPARTMENTS.GENERAL_MANAGEMENT,
    position: POSITIONS.SYSTEM_ADMIN,
    role: 1,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    email: 'supervisor@amms.com',
    name: '설비관리자',
    department: DEPARTMENTS.FACILITY_MANAGEMENT,
    position: POSITIONS.FACILITY_MANAGER,
    role: 2,
    is_active: true,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: '3',
    email: 'tech1@amms.com',
    name: '김철수',
    department: DEPARTMENTS.FACILITY_MANAGEMENT,
    position: POSITIONS.REPAIR_STAFF,
    role: 3,
    is_active: true,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
  {
    id: '4',
    email: 'tech2@amms.com',
    name: '이영희',
    department: DEPARTMENTS.FACILITY_MANAGEMENT,
    position: POSITIONS.REPAIR_STAFF,
    role: 3,
    is_active: true,
    created_at: '2024-01-04T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
  },
  {
    id: '5',
    email: 'tech3@amms.com',
    name: '박민수',
    department: DEPARTMENTS.FACILITY_MANAGEMENT,
    position: POSITIONS.REPAIR_STAFF,
    role: 3,
    is_active: true,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
  },
  {
    id: '6',
    email: 'tech4@amms.com',
    name: '최지훈',
    department: DEPARTMENTS.FACILITY_MANAGEMENT,
    position: POSITIONS.REPAIR_STAFF,
    role: 3,
    is_active: true,
    created_at: '2024-01-06T00:00:00Z',
    updated_at: '2024-01-06T00:00:00Z',
  },
  {
    id: '7',
    email: 'nguyen@amms.com',
    name: 'Nguyễn Văn A',
    department: DEPARTMENTS.FACILITY_MANAGEMENT,
    position: POSITIONS.REPAIR_STAFF,
    role: 3,
    is_active: true,
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
  },
  {
    id: '8',
    email: 'tran@amms.com',
    name: 'Trần Thị B',
    department: DEPARTMENTS.FACILITY_MANAGEMENT,
    position: POSITIONS.REPAIR_STAFF,
    role: 3,
    is_active: true,
    created_at: '2024-02-02T00:00:00Z',
    updated_at: '2024-02-02T00:00:00Z',
  },
  {
    id: '9',
    email: 'viewer@amms.com',
    name: '뷰어',
    department: DEPARTMENTS.GENERAL_MANAGEMENT,
    position: POSITIONS.VIEWER,
    role: 4,
    is_active: true,
    created_at: '2024-02-03T00:00:00Z',
    updated_at: '2024-02-03T00:00:00Z',
  },
]

export const mockTechnicians = mockUsers.filter(
  (user) => user.role === 3 && user.is_active
)

// Default role permissions
export const defaultRolePermissions: RolePermission[] = [
  {
    role: 1, // Admin - 모든 접근 가능
    permissions: [
      { page_key: 'dashboard', page_name: '대시보드', can_access: true },
      { page_key: 'equipment', page_name: '설비 현황', can_access: true },
      { page_key: 'equipment_master', page_name: '설비 마스터', can_access: true },
      { page_key: 'equipment_bulk', page_name: '일괄 등록', can_access: true },
      { page_key: 'maintenance_input', page_name: '수리 실적 입력', can_access: true },
      { page_key: 'maintenance_history', page_name: '수리 이력 조회', can_access: true },
      { page_key: 'maintenance_monitor', page_name: '수리 현황', can_access: true },
      { page_key: 'analytics', page_name: '통계 분석', can_access: true },
      { page_key: 'report', page_name: '리포트', can_access: true },
      { page_key: 'ai_insight', page_name: '자동 인사이트', can_access: true },
      { page_key: 'ai_chat', page_name: 'AI 질의응답', can_access: true },
      { page_key: 'user_management', page_name: '사용자 관리', can_access: true },
      { page_key: 'role_permission', page_name: '권한 관리', can_access: true },
      { page_key: 'settings', page_name: '시스템 설정', can_access: true },
      { page_key: 'profile', page_name: '내 정보', can_access: true },
    ],
  },
  {
    role: 2, // Supervisor
    permissions: [
      { page_key: 'dashboard', page_name: '대시보드', can_access: true },
      { page_key: 'equipment', page_name: '설비 현황', can_access: true },
      { page_key: 'equipment_master', page_name: '설비 마스터', can_access: true },
      { page_key: 'equipment_bulk', page_name: '일괄 등록', can_access: true },
      { page_key: 'maintenance_input', page_name: '수리 실적 입력', can_access: true },
      { page_key: 'maintenance_history', page_name: '수리 이력 조회', can_access: true },
      { page_key: 'maintenance_monitor', page_name: '수리 현황', can_access: true },
      { page_key: 'analytics', page_name: '통계 분석', can_access: true },
      { page_key: 'report', page_name: '리포트', can_access: true },
      { page_key: 'ai_insight', page_name: '자동 인사이트', can_access: true },
      { page_key: 'ai_chat', page_name: 'AI 질의응답', can_access: true },
      { page_key: 'user_management', page_name: '사용자 관리', can_access: false },
      { page_key: 'role_permission', page_name: '권한 관리', can_access: false },
      { page_key: 'settings', page_name: '시스템 설정', can_access: false },
      { page_key: 'profile', page_name: '내 정보', can_access: true },
    ],
  },
  {
    role: 3, // Technician
    permissions: [
      { page_key: 'dashboard', page_name: '대시보드', can_access: true },
      { page_key: 'equipment', page_name: '설비 현황', can_access: true },
      { page_key: 'equipment_master', page_name: '설비 마스터', can_access: false },
      { page_key: 'equipment_bulk', page_name: '일괄 등록', can_access: false },
      { page_key: 'maintenance_input', page_name: '수리 실적 입력', can_access: true },
      { page_key: 'maintenance_history', page_name: '수리 이력 조회', can_access: true },
      { page_key: 'maintenance_monitor', page_name: '수리 현황', can_access: true },
      { page_key: 'analytics', page_name: '통계 분석', can_access: false },
      { page_key: 'report', page_name: '리포트', can_access: false },
      { page_key: 'ai_insight', page_name: '자동 인사이트', can_access: false },
      { page_key: 'ai_chat', page_name: 'AI 질의응답', can_access: false },
      { page_key: 'user_management', page_name: '사용자 관리', can_access: false },
      { page_key: 'role_permission', page_name: '권한 관리', can_access: false },
      { page_key: 'settings', page_name: '시스템 설정', can_access: false },
      { page_key: 'profile', page_name: '내 정보', can_access: true },
    ],
  },
  {
    role: 4, // Viewer
    permissions: [
      { page_key: 'dashboard', page_name: '대시보드', can_access: true },
      { page_key: 'equipment', page_name: '설비 현황', can_access: true },
      { page_key: 'equipment_master', page_name: '설비 마스터', can_access: false },
      { page_key: 'equipment_bulk', page_name: '일괄 등록', can_access: false },
      { page_key: 'maintenance_input', page_name: '수리 실적 입력', can_access: false },
      { page_key: 'maintenance_history', page_name: '수리 이력 조회', can_access: true },
      { page_key: 'maintenance_monitor', page_name: '수리 현황', can_access: true },
      { page_key: 'analytics', page_name: '통계 분석', can_access: true },
      { page_key: 'report', page_name: '리포트', can_access: true },
      { page_key: 'ai_insight', page_name: '자동 인사이트', can_access: false },
      { page_key: 'ai_chat', page_name: 'AI 질의응답', can_access: false },
      { page_key: 'user_management', page_name: '사용자 관리', can_access: false },
      { page_key: 'role_permission', page_name: '권한 관리', can_access: false },
      { page_key: 'settings', page_name: '시스템 설정', can_access: false },
      { page_key: 'profile', page_name: '내 정보', can_access: true },
    ],
  },
]

// In-memory storage for role permissions (simulating database)
let rolePermissions = [...defaultRolePermissions]

export const getRolePermissions = () => rolePermissions

export const updateRolePermission = (
  role: number,
  pageKey: string,
  canAccess: boolean
) => {
  rolePermissions = rolePermissions.map((rp) => {
    if (rp.role === role) {
      return {
        ...rp,
        permissions: rp.permissions.map((p) =>
          p.page_key === pageKey ? { ...p, can_access: canAccess } : p
        ),
      }
    }
    return rp
  })
  return rolePermissions
}
