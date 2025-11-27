import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Mail,
  Building,
  Key,
  Save,
  Loader2,
  CheckCircle,
  Camera,
  Globe,
  Shield,
  Calendar,
  Clock,
} from 'lucide-react'

export default function ProfilePage() {
  const { t } = useTranslation()
  const { user, language, setLanguage } = useAuthStore()

  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  })

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  const [passwordError, setPasswordError] = useState('')

  const roleLabels: Record<number, string> = {
    1: t('admin.roleAdmin'),
    2: t('admin.roleSupervisor'),
    3: t('admin.roleTechnician'),
    4: t('admin.roleViewer'),
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    setSaveSuccess(false)

    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setIsSaving(false)
    setSaveSuccess(true)

    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const handleChangePassword = async () => {
    setPasswordError('')

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError(t('profile.passwordMismatch'))
      return
    }

    if (passwordData.new_password.length < 8) {
      setPasswordError(t('profile.passwordTooShort'))
      return
    }

    setIsChangingPassword(true)
    setPasswordSuccess(false)

    // Simulate password change
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setIsChangingPassword(false)
    setPasswordSuccess(true)
    setPasswordData({
      current_password: '',
      new_password: '',
      confirm_password: '',
    })

    setTimeout(() => setPasswordSuccess(false), 3000)
  }

  const handleLanguageChange = (lang: 'ko' | 'vi') => {
    setLanguage(lang)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('nav.profile')}</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('profile.profileInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-white text-3xl font-bold">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white border shadow-sm hover:bg-gray-50">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div>
                <p className="text-xl font-semibold">
                  {user?.name}
                </p>
                <p className="text-muted-foreground">{user?.email}</p>
                <Badge
                  variant={user?.role === 1 ? 'default' : 'outline'}
                  className="mt-1 flex w-fit items-center gap-1"
                >
                  {user?.role === 1 && <Shield className="h-3 w-3" />}
                  {user?.role && roleLabels[user.role]}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{user?.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>
                  {user?.department} / {user?.position}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {t('profile.joinedAt')}: {user?.created_at?.split('T')[0] || '2024-01-01'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {t('profile.lastLogin')}: {new Date().toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile */}
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.editProfile')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                handleSaveProfile()
              }}
            >
              <div className="space-y-2">
                <Label>{t('admin.name')}</Label>
                <Input
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData({ ...profileData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t('auth.email')}</Label>
                <Input
                  type="email"
                  value={profileData.email}
                  onChange={(e) =>
                    setProfileData({ ...profileData, email: e.target.value })
                  }
                />
              </div>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : saveSuccess ? (
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {saveSuccess ? t('common.success') : t('common.save')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Language Preference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('profile.languagePreference')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                variant={language === 'ko' ? 'default' : 'outline'}
                onClick={() => handleLanguageChange('ko')}
                className="flex-1"
              >
                <span className="mr-2">🇰🇷</span>
                한국어
              </Button>
              <Button
                variant={language === 'vi' ? 'default' : 'outline'}
                onClick={() => handleLanguageChange('vi')}
                className="flex-1"
              >
                <span className="mr-2">🇻🇳</span>
                Tieng Viet
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {t('profile.languageDescription')}
            </p>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {t('profile.changePassword')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                handleChangePassword()
              }}
            >
              <div className="space-y-2">
                <Label>{t('profile.currentPassword')}</Label>
                <Input
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, current_password: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t('profile.newPassword')}</Label>
                <Input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, new_password: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t('profile.confirmPassword')}</Label>
                <Input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirm_password: e.target.value })
                  }
                />
              </div>

              {passwordError && (
                <p className="text-sm text-red-500">{passwordError}</p>
              )}

              <Button
                type="submit"
                disabled={
                  isChangingPassword ||
                  !passwordData.current_password ||
                  !passwordData.new_password ||
                  !passwordData.confirm_password
                }
              >
                {isChangingPassword ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : passwordSuccess ? (
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                ) : (
                  <Key className="mr-2 h-4 w-4" />
                )}
                {passwordSuccess ? t('common.success') : t('profile.changePassword')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.activitySummary')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">{t('profile.totalRepairs')}</p>
              <p className="text-2xl font-bold text-blue-600">156</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">{t('profile.thisMonth')}</p>
              <p className="text-2xl font-bold text-green-600">23</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">{t('profile.avgRepairTime')}</p>
              <p className="text-2xl font-bold text-yellow-600">45{t('profile.minutes')}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">{t('profile.avgRating')}</p>
              <p className="text-2xl font-bold text-purple-600">4.8</p>
              <span className="text-yellow-500">★★★★★</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
