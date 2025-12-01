# Firebase 푸시 알림 설정 가이드

SMART CMMS 애플리케이션에서 Firebase Cloud Messaging(FCM)을 사용하여 모바일/웹 푸시 알림을 구현하기 위한 상세 설정 가이드입니다.

## 목차

1. [Firebase 프로젝트 생성](#1-firebase-프로젝트-생성)
2. [Firebase Cloud Messaging 설정](#2-firebase-cloud-messaging-설정)
3. [웹 앱 등록 및 설정](#3-웹-앱-등록-및-설정)
4. [서비스 계정 키 생성](#4-서비스-계정-키-생성)
5. [React 앱에 Firebase 연동](#5-react-앱에-firebase-연동)
6. [Service Worker 설정](#6-service-worker-설정)
7. [Supabase Edge Function 연동](#7-supabase-edge-function-연동)
8. [테스트 및 디버깅](#8-테스트-및-디버깅)

---

## 1. Firebase 프로젝트 생성

### 1.1 Firebase Console 접속

1. [Firebase Console](https://console.firebase.google.com/)에 접속합니다.
2. Google 계정으로 로그인합니다.

### 1.2 새 프로젝트 생성

1. **"프로젝트 추가"** 버튼을 클릭합니다.

2. **프로젝트 이름 입력**:
   - 프로젝트 이름: `smart-cmms` (또는 원하는 이름)
   - 프로젝트 ID가 자동 생성됩니다 (예: `smart-cmms-12345`)
   - **"계속"** 클릭

3. **Google Analytics 설정** (선택사항):
   - 알림 분석을 위해 활성화하는 것을 권장합니다.
   - **"계속"** 클릭

4. **Analytics 계정 선택**:
   - 기존 계정 선택 또는 새 계정 생성
   - **"프로젝트 만들기"** 클릭

5. 프로젝트 생성이 완료될 때까지 대기합니다 (약 30초~1분).

---

## 2. Firebase Cloud Messaging 설정

### 2.1 Cloud Messaging 활성화

1. Firebase Console에서 생성한 프로젝트를 선택합니다.

2. 왼쪽 메뉴에서 **"빌드"** > **"Cloud Messaging"**을 클릭합니다.

3. Cloud Messaging이 자동으로 활성화되어 있습니다.

### 2.2 VAPID 키 생성 (웹 푸시용)

1. 프로젝트 설정으로 이동:
   - 왼쪽 상단의 **톱니바퀴 아이콘** 클릭
   - **"프로젝트 설정"** 선택

2. **"Cloud Messaging"** 탭을 클릭합니다.

3. **웹 구성** 섹션으로 스크롤합니다.

4. **"웹 푸시 인증서"** 영역에서:
   - **"키 쌍 생성"** 버튼을 클릭합니다.
   - 생성된 **VAPID 키**를 복사하여 안전한 곳에 저장합니다.

   ```
   예시: BLnVk2z3xR9dH...약 88자의 긴 문자열
   ```

   > ⚠️ **중요**: 이 키는 나중에 React 앱에서 사용됩니다.

---

## 3. 웹 앱 등록 및 설정

### 3.1 웹 앱 추가

1. Firebase Console 프로젝트 개요 페이지로 이동합니다.

2. **"앱 추가"** 버튼 또는 **웹 아이콘 (`</>`)**을 클릭합니다.

3. **앱 등록**:
   - 앱 닉네임: `SMART CMMS Web`
   - **"Firebase 호스팅도 설정"** 체크 해제 (Vercel/Netlify 사용 시)
   - **"앱 등록"** 클릭

### 3.2 Firebase SDK 구성 정보 복사

앱 등록 후 표시되는 구성 정보를 복사합니다:

```javascript
// Firebase 구성 객체
const firebaseConfig = {
  apiKey: "AIzaSyB...",
  authDomain: "smart-cmms-12345.firebaseapp.com",
  projectId: "smart-cmms-12345",
  storageBucket: "smart-cmms-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456",
  measurementId: "G-XXXXXXXXXX"  // Analytics 사용 시
};
```

> ⚠️ **중요**: 이 정보를 `.env` 파일에 저장합니다.

### 3.3 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하거나 수정합니다:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyB...
VITE_FIREBASE_AUTH_DOMAIN=smart-cmms-12345.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=smart-cmms-12345
VITE_FIREBASE_STORAGE_BUCKET=smart-cmms-12345.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_FIREBASE_VAPID_KEY=BLnVk2z3xR9dH...
```

---

## 4. 서비스 계정 키 생성

서버 사이드에서 FCM API를 호출하기 위해 서비스 계정 키가 필요합니다.

### 4.1 서비스 계정 생성

1. Firebase Console > **프로젝트 설정** > **"서비스 계정"** 탭으로 이동합니다.

2. **"새 비공개 키 생성"** 버튼을 클릭합니다.

3. **"키 생성"** 버튼을 클릭하면 JSON 파일이 다운로드됩니다.

   ```json
   {
     "type": "service_account",
     "project_id": "smart-cmms-12345",
     "private_key_id": "abc123...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "firebase-adminsdk-xxxxx@smart-cmms-12345.iam.gserviceaccount.com",
     "client_id": "123456789012345678901",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
     "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
   }
   ```

> ⚠️ **보안 주의**: 이 파일은 절대로 Git에 커밋하지 마세요! `.gitignore`에 추가하세요.

### 4.2 Supabase에 서비스 계정 키 저장

Supabase Edge Function에서 사용하기 위해:

1. Supabase Dashboard > **Settings** > **Edge Functions** > **Secrets**로 이동합니다.

2. 다음 시크릿을 추가합니다:
   ```
   FIREBASE_PROJECT_ID=smart-cmms-12345
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@smart-cmms-12345.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
   ```

---

## 5. React 앱에 Firebase 연동

### 5.1 Firebase 패키지 설치

```bash
npm install firebase
```

### 5.2 Firebase 초기화 파일 생성

`src/lib/firebase.ts` 파일을 생성합니다:

```typescript
import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig)

// Messaging 인스턴스 (브라우저 환경에서만)
let messaging: Messaging | null = null

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  messaging = getMessaging(app)
}

// FCM 토큰 요청
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    // 알림 권한 요청
    const permission = await Notification.requestPermission()

    if (permission !== 'granted') {
      console.log('알림 권한이 거부되었습니다.')
      return null
    }

    if (!messaging) {
      console.error('Messaging이 초기화되지 않았습니다.')
      return null
    }

    // FCM 토큰 발급
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    })

    console.log('FCM Token:', token)
    return token
  } catch (error) {
    console.error('FCM 토큰 발급 실패:', error)
    return null
  }
}

// 포그라운드 메시지 리스너
export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) return

  return onMessage(messaging, (payload) => {
    console.log('포그라운드 메시지 수신:', payload)
    callback(payload)
  })
}

export { app, messaging }
```

### 5.3 알림 훅 생성

`src/hooks/useFirebaseMessaging.ts` 파일을 생성합니다:

```typescript
import { useEffect, useState } from 'react'
import { requestNotificationPermission, onForegroundMessage } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

export function useFirebaseMessaging() {
  const [fcmToken, setFcmToken] = useState<string | null>(null)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const { user } = useAuthStore()

  // 알림 권한 요청 및 토큰 발급
  const requestPermission = async () => {
    const token = await requestNotificationPermission()

    if (token) {
      setFcmToken(token)
      setNotificationPermission('granted')

      // 토큰을 서버에 저장
      if (user?.id) {
        await saveFcmToken(user.id, token)
      }
    } else {
      setNotificationPermission(Notification.permission)
    }

    return token
  }

  // FCM 토큰을 Supabase에 저장
  const saveFcmToken = async (userId: string, token: string) => {
    try {
      const { error } = await supabase
        .from('user_fcm_tokens')
        .upsert({
          user_id: userId,
          fcm_token: token,
          device_type: 'web',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,device_type'
        })

      if (error) throw error
      console.log('FCM 토큰 저장 완료')
    } catch (error) {
      console.error('FCM 토큰 저장 실패:', error)
    }
  }

  // 포그라운드 메시지 처리
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      // 브라우저 알림 표시
      if (Notification.permission === 'granted') {
        new Notification(payload.notification?.title || '새 알림', {
          body: payload.notification?.body,
          icon: '/A symbol BLUE-02.png',
          badge: '/A symbol BLUE-02.png',
        })
      }
    })

    return () => {
      // cleanup if needed
    }
  }, [])

  return {
    fcmToken,
    notificationPermission,
    requestPermission,
  }
}
```

---

## 6. Service Worker 설정

### 6.1 Service Worker 파일 생성

`public/firebase-messaging-sw.js` 파일을 생성합니다:

```javascript
// Firebase 앱 초기화를 위한 스크립트
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

// Firebase 구성 (환경변수 사용 불가하므로 직접 입력)
firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
})

const messaging = firebase.messaging()

// 백그라운드 메시지 처리
messaging.onBackgroundMessage((payload) => {
  console.log('백그라운드 메시지 수신:', payload)

  const notificationTitle = payload.notification?.title || '새 알림'
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/A symbol BLUE-02.png',
    badge: '/A symbol BLUE-02.png',
    tag: payload.data?.tag || 'default',
    data: payload.data,
    actions: [
      {
        action: 'open',
        title: '열기',
      },
      {
        action: 'close',
        title: '닫기',
      },
    ],
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('알림 클릭:', event)

  event.notification.close()

  if (event.action === 'close') {
    return
  }

  // 앱 열기 또는 포커스
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 이미 열린 창이 있으면 포커스
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      // 열린 창이 없으면 새 창 열기
      if (clients.openWindow) {
        const url = event.notification.data?.url || '/maintenance/notifications'
        return clients.openWindow(url)
      }
    })
  )
})
```

### 6.2 Service Worker 등록

`src/main.tsx`에서 Service Worker를 등록합니다:

```typescript
// Service Worker 등록 (Firebase Messaging용)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('Service Worker 등록 성공:', registration.scope)
    })
    .catch((error) => {
      console.error('Service Worker 등록 실패:', error)
    })
}
```

---

## 7. Supabase Edge Function 연동

### 7.1 FCM 토큰 저장 테이블 생성

Supabase SQL Editor에서 실행:

```sql
-- FCM 토큰 저장 테이블
CREATE TABLE user_fcm_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  device_type TEXT DEFAULT 'web',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_type)
);

-- RLS 정책
ALTER TABLE user_fcm_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tokens"
  ON user_fcm_tokens
  FOR ALL
  USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX idx_user_fcm_tokens_user_id ON user_fcm_tokens(user_id);
```

### 7.2 알림 발송 Edge Function 생성

`supabase/functions/send-notification/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  user_ids: string[]
  title: string
  body: string
  data?: Record<string, string>
}

serve(async (req) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_ids, title, body, data }: NotificationPayload = await req.json()

    // Supabase 클라이언트 생성
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 대상 사용자들의 FCM 토큰 조회
    const { data: tokens, error: tokenError } = await supabaseAdmin
      .from('user_fcm_tokens')
      .select('fcm_token')
      .in('user_id', user_ids)

    if (tokenError) throw tokenError

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No FCM tokens found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // FCM API 호출을 위한 액세스 토큰 발급
    const accessToken = await getAccessToken()

    // 각 토큰에 대해 알림 발송
    const results = await Promise.allSettled(
      tokens.map(({ fcm_token }) =>
        sendFcmMessage(accessToken, fcm_token, title, body, data)
      )
    )

    const successCount = results.filter((r) => r.status === 'fulfilled').length
    const failCount = results.filter((r) => r.status === 'rejected').length

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('알림 발송 오류:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Google OAuth 액세스 토큰 발급
async function getAccessToken(): Promise<string> {
  const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL')
  const privateKey = Deno.env.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n')

  const now = Math.floor(Date.now() / 1000)
  const exp = now + 3600

  // JWT 헤더
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }

  // JWT 페이로드
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: exp,
  }

  // JWT 서명 및 토큰 생성
  const encoder = new TextEncoder()
  const headerB64 = btoa(JSON.stringify(header))
  const payloadB64 = btoa(JSON.stringify(payload))
  const signatureInput = `${headerB64}.${payloadB64}`

  // RSA 서명
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBinary(privateKey!),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(signatureInput)
  )

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
  const jwt = `${signatureInput}.${signatureB64}`

  // 액세스 토큰 요청
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

// PEM 형식의 키를 바이너리로 변환
function pemToBinary(pem: string): ArrayBuffer {
  const b64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')

  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// FCM 메시지 발송
async function sendFcmMessage(
  accessToken: string,
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  const projectId = Deno.env.get('FIREBASE_PROJECT_ID')

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          notification: {
            title,
            body,
          },
          data,
          webpush: {
            notification: {
              icon: '/A symbol BLUE-02.png',
              badge: '/A symbol BLUE-02.png',
            },
            fcm_options: {
              link: data?.url || '/maintenance/notifications',
            },
          },
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`FCM 발송 실패: ${error}`)
  }
}
```

### 7.3 Edge Function 배포

```bash
# Supabase CLI 설치 (이미 설치된 경우 생략)
npm install -g supabase

# 로그인
supabase login

# Edge Function 배포
supabase functions deploy send-notification --project-ref YOUR_PROJECT_REF
```

---

## 8. 테스트 및 디버깅

### 8.1 알림 권한 테스트

브라우저 콘솔에서:

```javascript
// 알림 권한 상태 확인
console.log('알림 권한:', Notification.permission)

// 알림 권한 요청
Notification.requestPermission().then(permission => {
  console.log('권한 결과:', permission)
})
```

### 8.2 FCM 토큰 테스트

Firebase Console에서 테스트 메시지 발송:

1. Firebase Console > **Cloud Messaging** > **"첫 번째 캠페인 만들기"** 또는 **"Send your first message"**

2. 알림 작성:
   - 알림 제목: `테스트 알림`
   - 알림 텍스트: `이것은 테스트 메시지입니다.`

3. 타겟 설정:
   - **"단일 기기로 테스트 메시지 보내기"** 선택
   - FCM 등록 토큰 입력 (콘솔에 출력된 토큰)

4. **"테스트"** 버튼 클릭

### 8.3 일반적인 문제 해결

#### 문제: "messaging/permission-blocked"
- **원인**: 브라우저에서 알림이 차단됨
- **해결**: 브라우저 설정에서 해당 사이트의 알림 허용

#### 문제: "messaging/failed-service-worker-registration"
- **원인**: Service Worker 등록 실패
- **해결**:
  - `public/firebase-messaging-sw.js` 파일 경로 확인
  - HTTPS 환경 또는 localhost에서만 동작
  - 브라우저 캐시 삭제 후 재시도

#### 문제: "messaging/token-subscribe-failed"
- **원인**: VAPID 키 불일치
- **해결**: Firebase Console의 VAPID 키와 환경변수 일치 확인

#### 문제: 백그라운드 알림이 오지 않음
- **원인**: Service Worker가 올바르게 등록되지 않음
- **해결**:
  - 개발자 도구 > Application > Service Workers 확인
  - Service Worker가 "activated and running" 상태인지 확인

### 8.4 디버깅 도구

1. **Chrome DevTools**:
   - Application > Service Workers: SW 상태 확인
   - Application > Push Messaging: 푸시 구독 확인
   - Console: FCM 관련 로그 확인

2. **Firebase Console**:
   - Cloud Messaging > Reports: 발송 통계 확인

3. **Supabase Dashboard**:
   - Edge Functions > Logs: 함수 실행 로그 확인

---

## 부록: 체크리스트

### Firebase 설정 체크리스트

- [ ] Firebase 프로젝트 생성 완료
- [ ] 웹 앱 등록 완료
- [ ] VAPID 키 생성 완료
- [ ] 서비스 계정 키 다운로드 완료
- [ ] 환경변수 설정 완료 (`.env`)

### 코드 설정 체크리스트

- [ ] Firebase SDK 설치 (`npm install firebase`)
- [ ] `src/lib/firebase.ts` 생성
- [ ] `src/hooks/useFirebaseMessaging.ts` 생성
- [ ] `public/firebase-messaging-sw.js` 생성
- [ ] Service Worker 등록 코드 추가

### Supabase 설정 체크리스트

- [ ] `user_fcm_tokens` 테이블 생성
- [ ] Edge Function 시크릿 설정
- [ ] Edge Function 배포

### 테스트 체크리스트

- [ ] 알림 권한 요청 테스트
- [ ] FCM 토큰 발급 확인
- [ ] 포그라운드 알림 테스트
- [ ] 백그라운드 알림 테스트
- [ ] Edge Function 호출 테스트

---

## 참고 자료

- [Firebase Cloud Messaging 공식 문서](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Web Push 가이드](https://firebase.google.com/docs/cloud-messaging/js/client)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
