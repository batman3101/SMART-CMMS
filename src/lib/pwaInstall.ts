/**
 * PWA 설치 상태 관리 (프레임워크 비종속 모듈)
 *
 * `beforeinstallprompt` 이벤트는 React가 마운트되기 전에 발생할 수 있다.
 * 따라서 모듈 로드 시점(= main.tsx에서 최우선 import)에 리스너를 등록하여
 * 이벤트를 놓치지 않고 모듈 변수에 보관한다.
 * React 컴포넌트는 useSyncExternalStore 패턴(subscribe/getSnapshot)으로 구독한다.
 */

// Chrome/Edge/Android 에만 존재하는 비표준 이벤트
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt: () => Promise<void>
}

const DISMISS_KEY = 'pwa-install-dismissed'

let deferredPrompt: BeforeInstallPromptEvent | null = null
let installed = false

const stateListeners = new Set<() => void>()
const guideOpenListeners = new Set<() => void>()

// ───────────────────────── 플랫폼 감지 ─────────────────────────

/** iOS(아이폰/아이패드) 여부 - iOS Safari 는 beforeinstallprompt 미지원 → 수동 안내 필요 */
export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ 는 데스크톱 Safari 로 위장하므로 터치 포인트로 보강 판별
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

/** 이미 홈 화면 앱(standalone)으로 실행 중인지 */
export function isInStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    // iOS Safari 전용 플래그
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

// ──────────────────── 영구 닫힘(다시 보지 않기) ────────────────────

export function isDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function setDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    /* 프라이빗 모드 등 localStorage 차단 환경은 무시 */
  }
  recompute()
}

// ──────────────── 상태 스냅샷 (useSyncExternalStore) ────────────────

export interface PWAInstallState {
  /** Chrome/Edge 등에서 네이티브 설치 프롬프트 호출 가능 */
  canPrompt: boolean
  /** iOS 기기 - 수동 설치 안내만 가능 */
  isIOS: boolean
  /** 이미 앱으로 설치되어 standalone 실행 중 */
  isInstalled: boolean
  /** 사용자가 '다시 보지 않기'로 닫음 */
  dismissed: boolean
}

function computeState(): PWAInstallState {
  return {
    canPrompt: deferredPrompt !== null,
    isIOS: isIOSDevice(),
    isInstalled: installed || isInStandaloneMode(),
    dismissed: isDismissed(),
  }
}

// getSnapshot 은 동일 참조를 반환해야 무한 루프를 피할 수 있으므로 캐시한다.
let cachedState: PWAInstallState = computeState()

function recompute(): void {
  cachedState = computeState()
  stateListeners.forEach((l) => l())
}

export function subscribe(listener: () => void): () => void {
  stateListeners.add(listener)
  return () => stateListeners.delete(listener)
}

export function getSnapshot(): PWAInstallState {
  return cachedState
}

// ──────────────────── 네이티브 설치 트리거 ────────────────────

/** 네이티브 설치 프롬프트를 띄운다. 프롬프트는 1회용이므로 호출 후 폐기한다. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable'
  const evt = deferredPrompt
  await evt.prompt()
  const choice = await evt.userChoice
  deferredPrompt = null // 재사용 불가 → 소모 후 폐기
  recompute()
  return choice.outcome
}

// ───────────── 수동 안내 모달 열기 (헤더 버튼 → iOS 등) ─────────────

/** 헤더 '앱 설치' 버튼 등에서 호출 → 안내 모달을 강제로 연다('다시 보지 않기'와 무관). */
export function openInstallGuide(): void {
  guideOpenListeners.forEach((l) => l())
}

export function subscribeGuideOpen(listener: () => void): () => void {
  guideOpenListeners.add(listener)
  return () => guideOpenListeners.delete(listener)
}

// ──────────────── 이벤트 리스너 등록 (모듈 로드 즉시) ────────────────

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // 브라우저 기본 미니 인포바를 억제하고 직접 UI 로 제어
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    recompute()
  })

  window.addEventListener('appinstalled', () => {
    installed = true
    deferredPrompt = null
    recompute()
  })
}
