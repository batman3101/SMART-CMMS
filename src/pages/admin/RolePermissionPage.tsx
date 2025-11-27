import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Loader2,
  Shield,
  Eye,
  Users,
  Wrench,
  Save,
  Check,
  X,
} from 'lucide-react'
import { mockUsersApi } from '@/mock/api'
import type { RolePermission, UserRole } from '@/types'

export default function RolePermissionPage() {
  const { t } = useTranslation()
  const { addToast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [permissions, setPermissions] = useState<RolePermission[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  const roleLabels: Record<number, { label: string; icon: React.ReactNode; color: string }> = {
    1: { label: t('admin.roleAdmin'), icon: <Shield className="h-4 w-4" />, color: 'text-purple-600' },
    2: { label: t('admin.roleSupervisor'), icon: <Eye className="h-4 w-4" />, color: 'text-blue-600' },
    3: { label: t('admin.roleTechnician'), icon: <Wrench className="h-4 w-4" />, color: 'text-green-600' },
    4: { label: t('admin.roleViewer'), icon: <Users className="h-4 w-4" />, color: 'text-gray-600' },
  }

  useEffect(() => {
    fetchPermissions()
  }, [])

  const fetchPermissions = async () => {
    setIsLoading(true)
    const { data } = await mockUsersApi.getRolePermissions()
    if (data) {
      setPermissions(data)
    }
    setIsLoading(false)
  }

  const handleTogglePermission = (role: UserRole, pageKey: string) => {
    // Admin은 모든 권한 수정 불가
    if (role === 1) {
      addToast({
        type: 'warning',
        title: t('admin.cannotModifyAdmin'),
        message: t('admin.adminHasAllAccess'),
      })
      return
    }

    setPermissions((prev) =>
      prev.map((rp) => {
        if (rp.role === role) {
          return {
            ...rp,
            permissions: rp.permissions.map((p) =>
              p.page_key === pageKey ? { ...p, can_access: !p.can_access } : p
            ),
          }
        }
        return rp
      })
    )
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      // 각 변경된 권한을 저장
      for (const rp of permissions) {
        for (const p of rp.permissions) {
          await mockUsersApi.updateRolePermission(rp.role, p.page_key, p.can_access)
        }
      }

      addToast({
        type: 'success',
        title: t('admin.permissionsSaved'),
        message: t('admin.permissionsSavedDesc'),
      })
      setHasChanges(false)
    } catch (error) {
      addToast({
        type: 'error',
        title: t('common.error'),
        message: String(error),
      })
    }

    setIsSaving(false)
  }

  // 페이지 그룹핑
  const pageGroups = [
    {
      name: t('admin.pageGroupDashboard'),
      pages: ['dashboard'],
    },
    {
      name: t('admin.pageGroupEquipment'),
      pages: ['equipment', 'equipment_master', 'equipment_bulk'],
    },
    {
      name: t('admin.pageGroupMaintenance'),
      pages: ['maintenance_input', 'maintenance_history', 'maintenance_monitor'],
    },
    {
      name: t('admin.pageGroupAnalytics'),
      pages: ['analytics', 'report'],
    },
    {
      name: t('admin.pageGroupAI'),
      pages: ['ai_insight', 'ai_chat'],
    },
    {
      name: t('admin.pageGroupAdmin'),
      pages: ['user_management', 'role_permission', 'settings'],
    },
    {
      name: t('admin.pageGroupProfile'),
      pages: ['profile'],
    },
  ]

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // 모든 페이지 가져오기
  const allPages = permissions[0]?.permissions || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('admin.rolePermission')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin.rolePermissionDesc')}
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {t('common.save')}
        </Button>
      </div>

      {/* Role Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            {Object.entries(roleLabels).map(([role, { label, icon, color }]) => (
              <div key={role} className={`flex items-center gap-2 ${color}`}>
                {icon}
                <span className="font-medium">{label}</span>
                {role === '1' && (
                  <Badge variant="secondary" className="text-xs">
                    {t('admin.allAccess')}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.pageAccessPermissions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">{t('admin.pageName')}</TableHead>
                  {permissions.map((rp) => (
                    <TableHead key={rp.role} className="text-center min-w-[120px]">
                      <div className={`flex items-center justify-center gap-1 ${roleLabels[rp.role].color}`}>
                        {roleLabels[rp.role].icon}
                        <span>{roleLabels[rp.role].label}</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageGroups.map((group) => (
                  <>
                    {/* Group Header */}
                    <TableRow key={`group-${group.name}`} className="bg-muted/50">
                      <TableCell colSpan={5} className="font-semibold">
                        {group.name}
                      </TableCell>
                    </TableRow>
                    {/* Group Pages */}
                    {group.pages.map((pageKey) => {
                      const page = allPages.find((p) => p.page_key === pageKey)
                      if (!page) return null

                      return (
                        <TableRow key={pageKey}>
                          <TableCell className="font-medium pl-8">
                            {page.page_name}
                          </TableCell>
                          {permissions.map((rp) => {
                            const permission = rp.permissions.find(
                              (p) => p.page_key === pageKey
                            )
                            const canAccess = permission?.can_access ?? false
                            const isAdmin = rp.role === 1

                            return (
                              <TableCell key={`${rp.role}-${pageKey}`} className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`h-8 w-8 p-0 ${
                                    canAccess
                                      ? 'text-green-600 hover:text-green-700 hover:bg-green-100'
                                      : 'text-red-600 hover:text-red-700 hover:bg-red-100'
                                  } ${isAdmin ? 'cursor-not-allowed opacity-50' : ''}`}
                                  onClick={() => handleTogglePermission(rp.role, pageKey)}
                                  disabled={isAdmin}
                                >
                                  {canAccess ? (
                                    <Check className="h-5 w-5" />
                                  ) : (
                                    <X className="h-5 w-5" />
                                  )}
                                </Button>
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      )
                    })}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <p className="font-medium">{t('admin.permissionNote')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('admin.permissionNoteDesc')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
