import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SortableTableHead } from '@/components/ui/sortable-table-head'
import {
  Search,
  UserPlus,
  Edit,
  X,
  Loader2,
  Shield,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react'
import { usersApi } from '@/lib/api'
import { useTableSort } from '@/hooks'
import type { User, UserRole, DepartmentCode, PositionCode } from '@/types'
import { DEPARTMENTS, POSITIONS, POSITION_ROLE_MAP } from '@/types'

export default function UserManagementPage() {
  const { t } = useTranslation()
  const { addToast } = useToast()

  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    department: DEPARTMENTS.FACILITY_MANAGEMENT as DepartmentCode,
    position: POSITIONS.REPAIR_STAFF as PositionCode,
    role: 3 as UserRole,
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // 부서 목록 (번역 키 매핑)
  const departmentOptions = [
    { value: DEPARTMENTS.GENERAL_MANAGEMENT, labelKey: 'admin.departmentGeneralManagement' },
    { value: DEPARTMENTS.FACILITY_MANAGEMENT, labelKey: 'admin.departmentFacilityManagement' },
  ]

  // 직책 목록 (번역 키 매핑)
  const positionOptions = [
    { value: POSITIONS.SYSTEM_ADMIN, labelKey: 'admin.positionSystemAdmin' },
    { value: POSITIONS.FACILITY_MANAGER, labelKey: 'admin.positionFacilityManager' },
    { value: POSITIONS.REPAIR_STAFF, labelKey: 'admin.positionRepairStaff' },
    { value: POSITIONS.VIEWER, labelKey: 'admin.positionViewer' },
  ]

  const roleLabels: Record<number, string> = {
    1: t('admin.roleAdmin'),
    2: t('admin.roleSupervisor'),
    3: t('admin.roleTechnician'),
    4: t('admin.roleViewer'),
  }

  // 부서명 표시 함수
  const getDepartmentLabel = (dept: string) => {
    const option = departmentOptions.find((o) => o.value === dept)
    return option ? t(option.labelKey) : dept
  }

  // 직책명 표시 함수
  const getPositionLabel = (pos: string) => {
    const option = positionOptions.find((o) => o.value === pos)
    return option ? t(option.labelKey) : pos
  }

  // 직책 변경시 권한 자동 설정
  const handlePositionChange = (position: PositionCode) => {
    const role = POSITION_ROLE_MAP[position]
    setFormData({ ...formData, position, role })
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchQuery, roleFilter, statusFilter])

  const fetchUsers = async () => {
    setIsLoading(true)
    const { data } = await usersApi.getUsers()
    if (data) {
      setUsers(data)
    }
    setIsLoading(false)
  }

  const filterUsers = () => {
    let filtered = [...users]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      )
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === parseInt(roleFilter))
    }

    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active'
      filtered = filtered.filter((user) => user.is_active === isActive)
    }

    setFilteredUsers(filtered)
  }

  // Sorting
  const { sortedData, requestSort, getSortDirection } = useTableSort<User>(
    filteredUsers,
    { key: 'email', direction: 'asc' }
  )

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.email) {
      errors.email = t('admin.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t('admin.emailInvalid')
    }

    if (!editingUser && !formData.password) {
      errors.password = t('admin.passwordRequired')
    } else if (!editingUser && formData.password.length < 6) {
      errors.password = t('admin.passwordTooShort')
    }

    if (!formData.name) {
      errors.name = t('admin.nameRequired')
    }

    if (!formData.department) {
      errors.department = t('admin.departmentRequired')
    }

    if (!formData.position) {
      errors.position = t('admin.positionRequired')
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const openCreateModal = () => {
    setEditingUser(null)
    setFormData({
      email: '',
      password: '',
      name: '',
      department: DEPARTMENTS.FACILITY_MANAGEMENT,
      position: POSITIONS.REPAIR_STAFF,
      role: 3,
    })
    setFormErrors({})
    setShowPassword(false)
    setIsModalOpen(true)
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      password: '',
      name: user.name,
      department: (user.department as DepartmentCode) || DEPARTMENTS.FACILITY_MANAGEMENT,
      position: (user.position as PositionCode) || POSITIONS.REPAIR_STAFF,
      role: user.role,
    })
    setFormErrors({})
    setShowPassword(false)
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setIsSaving(true)

    try {
      if (editingUser) {
        const updateData: Partial<User> & { password?: string } = {
          email: formData.email,
          name: formData.name,
          department: formData.department,
          position: formData.position,
          role: formData.role,
        }

        // Only include password if it's being changed
        if (formData.password) {
          updateData.password = formData.password
        }

        const { data, error } = await usersApi.updateUser(editingUser.id, updateData)
        if (error) {
          addToast({ type: 'error', title: t('common.error'), message: error })
        } else if (data) {
          setUsers(users.map((u) => (u.id === editingUser.id ? data : u)))
          addToast({ type: 'success', title: t('admin.userUpdated'), message: data.name })
          setIsModalOpen(false)
        }
      } else {
        const { data, error } = await usersApi.createUser({
          email: formData.email,
          name: formData.name,
          department: formData.department,
          position: formData.position,
          role: formData.role,
          is_active: true,
        } as Parameters<typeof usersApi.createUser>[0])

        if (error) {
          addToast({ type: 'error', title: t('common.error'), message: error })
        } else if (data) {
          setUsers([data, ...users])
          addToast({ type: 'success', title: t('admin.userCreated'), message: data.name })
          setIsModalOpen(false)
        }
      }
    } catch (error) {
      addToast({ type: 'error', title: t('common.error'), message: String(error) })
    }

    setIsSaving(false)
  }

  const handleToggleStatus = async (user: User) => {
    if (user.is_active) {
      await usersApi.deactivateUser(user.id)
    } else {
      await usersApi.activateUser(user.id)
    }
    setUsers(users.map((u) => (u.id === user.id ? { ...u, is_active: !u.is_active } : u)))
  }

  const handleResetPassword = async (user: User) => {
    await usersApi.resetPassword(user.id)
    addToast({ type: 'success', title: t('admin.passwordResetSuccess'), message: user.name })
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('admin.userManagement')}</h1>
        <Button onClick={openCreateModal}>
          <UserPlus className="mr-2 h-4 w-4" />
          {t('admin.addUser')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('admin.searchByNameEmail')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-[150px]"
            >
              <option value="all">{t('admin.allRoles')}</option>
              <option value="1">{t('admin.roleAdmin')}</option>
              <option value="2">{t('admin.roleSupervisor')}</option>
              <option value="3">{t('admin.roleTechnician')}</option>
              <option value="4">{t('admin.roleViewer')}</option>
            </Select>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-[150px]"
            >
              <option value="all">{t('admin.allStatus')}</option>
              <option value="active">{t('admin.active')}</option>
              <option value="inactive">{t('admin.inactive')}</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  sortKey="email"
                  sortDirection={getSortDirection('email')}
                  onSort={requestSort}
                >
                  {t('auth.email')}
                </SortableTableHead>
                <SortableTableHead
                  sortKey="name"
                  sortDirection={getSortDirection('name')}
                  onSort={requestSort}
                >
                  {t('admin.name')}
                </SortableTableHead>
                <SortableTableHead
                  sortKey="department"
                  sortDirection={getSortDirection('department')}
                  onSort={requestSort}
                >
                  {t('admin.department')}
                </SortableTableHead>
                <SortableTableHead
                  sortKey="position"
                  sortDirection={getSortDirection('position')}
                  onSort={requestSort}
                >
                  {t('admin.position')}
                </SortableTableHead>
                <SortableTableHead
                  sortKey="role"
                  sortDirection={getSortDirection('role')}
                  onSort={requestSort}
                >
                  {t('admin.role')}
                </SortableTableHead>
                <SortableTableHead
                  sortKey="is_active"
                  sortDirection={getSortDirection('is_active')}
                  onSort={requestSort}
                >
                  {t('admin.activeStatus')}
                </SortableTableHead>
                <SortableTableHead
                  sortKey=""
                  sortDirection={null}
                  onSort={() => {}}
                  className="text-right"
                >
                  {t('common.actions')}
                </SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <p className="font-medium">{user.name}</p>
                  </TableCell>
                  <TableCell>{getDepartmentLabel(user.department)}</TableCell>
                  <TableCell>{getPositionLabel(user.position)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === 1 ? 'default' : 'outline'}
                      className="flex w-fit items-center gap-1"
                    >
                      {user.role === 1 && <Shield className="h-3 w-3" />}
                      {roleLabels[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.is_active ? 'success' : 'secondary'}
                      className="flex w-fit items-center gap-1 cursor-pointer"
                      onClick={() => handleToggleStatus(user)}
                    >
                      {user.is_active ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {user.is_active ? t('admin.active') : t('admin.inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResetPassword(user)}
                        title={t('admin.resetPassword')}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              {t('common.noData')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">{t('admin.totalUsers')}</p>
            <p className="text-2xl font-bold">{users.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">{t('admin.activeUsers')}</p>
            <p className="text-2xl font-bold text-green-600">
              {users.filter((u) => u.is_active).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">{t('admin.technicians')}</p>
            <p className="text-2xl font-bold text-blue-600">
              {users.filter((u) => u.role === 3 && u.is_active).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">{t('admin.admins')}</p>
            <p className="text-2xl font-bold text-purple-600">
              {users.filter((u) => u.role === 1).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {editingUser ? t('admin.editUser') : t('admin.addUser')}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label>{t('auth.email')} *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                />
                {formErrors.email && (
                  <p className="text-sm text-destructive">{formErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label>
                  {t('auth.password')} {!editingUser && '*'}
                  {editingUser && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({t('admin.leaveEmptyToKeep')})
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? '••••••••' : t('admin.enterPassword')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {formErrors.password && (
                  <p className="text-sm text-destructive">{formErrors.password}</p>
                )}
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label>{t('admin.name')} *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('admin.enterName')}
                />
                {formErrors.name && (
                  <p className="text-sm text-destructive">{formErrors.name}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Department */}
                <div className="space-y-2">
                  <Label>{t('admin.department')} *</Label>
                  <Select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value as DepartmentCode })}
                  >
                    {departmentOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </option>
                    ))}
                  </Select>
                  {formErrors.department && (
                    <p className="text-sm text-destructive">{formErrors.department}</p>
                  )}
                </div>

                {/* Position - 직책 선택시 권한 자동 설정 */}
                <div className="space-y-2">
                  <Label>{t('admin.position')} *</Label>
                  <Select
                    value={formData.position}
                    onChange={(e) => handlePositionChange(e.target.value as PositionCode)}
                  >
                    {positionOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </option>
                    ))}
                  </Select>
                  {formErrors.position && (
                    <p className="text-sm text-destructive">{formErrors.position}</p>
                  )}
                </div>
              </div>

              {/* Role - 직책에 따라 자동 설정됨 (읽기 전용) */}
              <div className="space-y-2">
                <Label>{t('admin.role')}</Label>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{roleLabels[formData.role]}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    ({t('admin.position')}에 따라 자동 설정)
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {t('common.save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
