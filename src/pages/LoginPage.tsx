import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Globe, Eye, EyeOff, Loader2 } from 'lucide-react'
import { mockAuthApi } from '@/mock/api'

export default function LoginPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { login, language, setLanguage } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Mock API를 사용한 로그인 처리
      // Supabase 연동 시 mockAuthApi.login을 실제 API로 교체
      const { user, error: loginError } = await mockAuthApi.login({ email, password })

      if (loginError || !user) {
        setError(loginError || t('auth.loginFailed'))
        return
      }

      login(user)
      navigate('/dashboard')
    } catch {
      setError(t('auth.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  const toggleLanguage = () => {
    const newLang = language === 'ko' ? 'vi' : 'ko'
    setLanguage(newLang)
    i18n.changeLanguage(newLang)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <span className="text-2xl font-bold text-white">A</span>
          </div>
          <CardTitle className="text-2xl">AMMS</CardTitle>
          <p className="text-sm text-muted-foreground">
            ALMUS Maintenance Management System
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                t('auth.login')
              )}
            </Button>

            <div className="flex items-center justify-between pt-4">
              <Button
                type="button"
                variant="link"
                className="text-sm"
              >
                {t('auth.forgotPassword')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleLanguage}
              >
                <Globe className="mr-2 h-4 w-4" />
                {language === 'ko' ? 'Tiếng Việt' : '한국어'}
              </Button>
            </div>
          </form>

          {/* 테스트 계정 안내 (개발 모드에서만 표시) */}
          <div className="mt-6 rounded-lg bg-muted p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {language === 'ko' ? '테스트 계정' : 'Tài khoản test'}
            </p>
            <div className="space-y-1 text-xs">
              <p>
                <span className="font-medium">Admin:</span> admin@amms.com / admin123
              </p>
              <p>
                <span className="font-medium">Supervisor:</span> supervisor@amms.com / super123
              </p>
              <p>
                <span className="font-medium">Technician:</span> tech1@amms.com / tech123
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
