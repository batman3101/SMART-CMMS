import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { openInstallGuide } from '@/lib/pwaInstall'

/**
 * 헤더 상시 '앱 설치' 버튼.
 * 설치가 가능(Chrome/Android)하거나 iOS 인 경우에만, 아직 설치되지 않았을 때 노출된다.
 * 클릭 시 안내 팝업을 열어(openInstallGuide) 플랫폼별 설치 흐름으로 연결한다.
 */
export default function PWAInstallButton() {
  const { t } = useTranslation()
  const { canPrompt, isIOS, isInstalled } = usePWAInstall()

  // 이미 설치됐거나, 설치 수단이 전혀 없으면 숨김
  if (isInstalled) return null
  if (!canPrompt && !isIOS) return null

  return (
    <>
      {/* 모바일: 아이콘만 */}
      <Button
        variant="ghost"
        size="icon"
        onClick={openInstallGuide}
        className="text-primary md:hidden"
        title={t('pwa.headerInstall')}
        aria-label={t('pwa.headerInstall')}
      >
        <Download className="h-5 w-5" />
      </Button>

      {/* 데스크톱: 텍스트 포함 강조 버튼 */}
      <Button
        variant="outline"
        size="sm"
        onClick={openInstallGuide}
        className="hidden border-primary/40 text-primary hover:bg-primary/10 hover:text-primary md:flex"
      >
        <Download className="mr-2 h-4 w-4" />
        {t('pwa.headerInstall')}
      </Button>
    </>
  )
}
