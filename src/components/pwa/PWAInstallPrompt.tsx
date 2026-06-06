import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Download, X, Share, Plus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { promptInstall, setDismissed, subscribeGuideOpen } from '@/lib/pwaInstall'

/** 최초 접속 자동 노출까지의 지연(ms) - 초기 로딩/로그인을 방해하지 않도록 약간 늦춘다. */
const AUTO_SHOW_DELAY = 2500

/**
 * PWA 설치 안내 모달 (Radix Dialog 기반).
 * Radix 가 ESC 닫기 · 포커스 트랩 · 스크롤 잠금 · 포털 · 접근성(aria)을 처리한다.
 *  - 최초 접속 시 자동 1회 노출(설치 안됨 + 미닫힘 + 설치가능 또는 iOS).
 *  - 헤더 '앱 설치' 버튼 등에서 openInstallGuide() 로 수동 호출 가능.
 *  - 플랫폼: Chrome/Android → 네이티브 설치 버튼, iOS → 수동 설치 단계 안내.
 */
export default function PWAInstallPrompt() {
  const { t } = useTranslation()
  const { canPrompt, isIOS, isInstalled, dismissed } = usePWAInstall()

  const [open, setOpen] = useState(false)
  const [installing, setInstalling] = useState(false)
  const autoShownRef = useRef(false)

  // 헤더 '앱 설치' 버튼 등 수동 열기 ('다시 보지 않기' 여부와 무관하게 열림)
  useEffect(() => subscribeGuideOpen(() => setOpen(true)), [])

  // 최초 접속 자동 노출
  useEffect(() => {
    if (autoShownRef.current) return
    if (isInstalled || dismissed) return
    if (!canPrompt && !isIOS) return // 설치 수단이 없으면 노출 안 함
    autoShownRef.current = true
    const id = window.setTimeout(() => setOpen(true), AUTO_SHOW_DELAY)
    return () => window.clearTimeout(id)
  }, [canPrompt, isIOS, isInstalled, dismissed])

  // 이미 설치된 경우 어떤 상황에도 렌더링하지 않음
  if (isInstalled) return null

  const handleInstall = async () => {
    setInstalling(true)
    const outcome = await promptInstall()
    setInstalling(false)
    if (outcome !== 'unavailable') setOpen(false)
  }

  const handleDontShowAgain = () => {
    setDismissed()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPortal>
        {/* 딤 오버레이 (애니메이션은 .pwa-overlay 가 담당) */}
        <DialogOverlay className="pwa-overlay z-[100] bg-black/50" />

        <DialogPrimitive.Content
          className={cn(
            'pwa-sheet fixed z-[100] flex max-h-[90dvh] w-full flex-col overflow-y-auto border bg-background p-5 shadow-2xl outline-none',
            // 모바일: 하단 바텀시트
            'inset-x-0 bottom-0 rounded-t-2xl',
            // 데스크톱: 중앙 모달 (translate 중앙정렬)
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl'
          )}
        >
          {/* 헤더 */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/icon-192x192.png"
                alt="SMART CMMS"
                className="h-12 w-12 rounded-xl border bg-white object-contain p-1"
              />
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {t('pwa.installTitle')}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">SMART CMMS · ALMUS TECH</p>
              </div>
            </div>
            <DialogClose
              className="-mr-1 -mt-1 rounded p-1 text-muted-foreground hover:bg-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label={t('common.close')}
            >
              <X className="h-5 w-5" />
            </DialogClose>
          </div>

          {/* 설명 (Radix 가 aria-describedby 자동 연결) */}
          <DialogDescription className="mt-4">{t('pwa.installDesc')}</DialogDescription>

          {/* 혜택 */}
          <ul className="mt-3 space-y-1.5">
            {['benefit1', 'benefit2', 'benefit3'].map((k) => (
              <li key={k} className="flex items-center gap-2 text-sm text-foreground">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                {t(`pwa.${k}`)}
              </li>
            ))}
          </ul>

          {/* iOS 수동 설치 안내 */}
          {isIOS && (
            <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="mb-2 font-medium text-foreground">{t('pwa.iosTitle')}</p>
              <ol className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Share className="h-4 w-4 shrink-0 text-primary" /> {t('pwa.iosStep1')}
                </li>
                <li className="flex items-center gap-2">
                  <Plus className="h-4 w-4 shrink-0 text-primary" /> {t('pwa.iosStep2')}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-primary" /> {t('pwa.iosStep3')}
                </li>
              </ol>
            </div>
          )}

          {/* 액션 */}
          <div className="mt-5 flex flex-col gap-3">
            {!isIOS && (
              <Button onClick={handleInstall} disabled={installing || !canPrompt} className="w-full">
                <Download className="h-4 w-4" />
                {installing ? t('pwa.installing') : t('pwa.installButton')}
              </Button>
            )}
            <div className="flex items-center justify-between">
              <button
                onClick={handleDontShowAgain}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                {t('pwa.dontShowAgain')}
              </button>
              <DialogClose className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline">
                {t('pwa.later')}
              </DialogClose>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
