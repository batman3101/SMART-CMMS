# Supabase Edge Functions - 푸시 알림 시스템

이 디렉토리에는 AMMS의 서버 사이드 푸시 알림을 위한 Supabase Edge Functions가 포함되어 있습니다.

## 구조

```
supabase/
├── config.toml              # Supabase 프로젝트 설정
├── functions/
│   ├── _shared/
│   │   └── fcm.ts           # FCM 공유 유틸리티
│   ├── send-push-notification/
│   │   └── index.ts         # 범용 푸시 알림 전송
│   ├── notify-emergency/
│   │   └── index.ts         # 긴급 수리 알림
│   └── notify-pm-schedule/
│       └── index.ts         # PM 일정 알림
├── migrations/
│   ├── 20241213_create_fcm_tables.sql      # FCM 관련 테이블
│   └── 20241213_create_notification_triggers.sql  # 알림 트리거
└── README.md
```

## 설정 방법

### 1. 환경 변수 설정

Supabase Dashboard > Settings > Edge Functions에서 다음 환경 변수를 설정하세요:

```bash
FCM_SERVER_KEY=your_fcm_server_key_here
```

**FCM Server Key 발급 방법:**
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택 > 프로젝트 설정 > 클라우드 메시징
3. "Cloud Messaging API (레거시)" 섹션에서 서버 키 확인
   - 레거시 API가 비활성화된 경우 활성화 필요

### 2. 데이터베이스 마이그레이션

```bash
# Supabase CLI 설치
npm install -g supabase

# 로컬에서 마이그레이션 실행
supabase db push

# 또는 Supabase Dashboard에서 직접 SQL 실행
```

**생성되는 테이블:**
- `user_fcm_tokens` - 사용자별 FCM 토큰 저장
- `user_notifications` - 인앱 알림
- `notification_logs` - 푸시 알림 전송 로그
- `user_push_settings` - 사용자별 알림 설정

### 3. Edge Functions 배포

```bash
# 모든 함수 배포
supabase functions deploy

# 개별 함수 배포
supabase functions deploy send-push-notification
supabase functions deploy notify-emergency
supabase functions deploy notify-pm-schedule
```

## 사용 방법

### 클라이언트에서 호출

```typescript
import { serverPushService } from '@/services/serverPushService'

// 1. 긴급 수리 알림
await serverPushService.notifyEmergency({
  equipment_code: 'CNC-001',
  equipment_name: 'CNC 선반 #1',
  symptom: '스핀들 이상 소음 발생',
  building: 'A동'
})

// 2. PM 일정 알림 (오늘 예정)
await serverPushService.notifyPMSchedule({
  days_before: 0,  // 0: 오늘, 1: 내일, 3: 3일 전
  notify_assigned_only: true
})

// 3. 장시간 수리 알림
await serverPushService.notifyLongRepair({
  equipment_code: 'CNC-002',
  maintenance_id: 'uuid-here',
  duration_minutes: 150,
  technician_id: 'user-uuid'
})

// 4. 수리 완료 알림
await serverPushService.notifyRepairCompleted({
  equipment_code: 'CNC-003',
  maintenance_id: 'uuid-here',
  rating: 8
})

// 5. 사용자 지정 푸시
await serverPushService.sendPush({
  user_ids: ['user-uuid-1', 'user-uuid-2'],
  notification: {
    title: '공지사항',
    body: '시스템 점검 예정입니다.'
  },
  data: {
    type: 'info',
    url: '/announcements'
  }
})

// 6. 전체 브로드캐스트
await serverPushService.broadcast({
  title: '긴급 공지',
  body: '전체 사용자에게 전송되는 메시지입니다.'
})
```

### 직접 Edge Function 호출

```typescript
import { supabase } from '@/lib/supabase'

// send-push-notification 호출
const { data, error } = await supabase.functions.invoke('send-push-notification', {
  body: {
    // 대상 지정
    tokens: ['fcm-token-1', 'fcm-token-2'],
    // 또는
    user_ids: ['user-uuid'],
    // 또는
    roles: [1, 2, 3],  // 1: Admin, 2: Supervisor, 3: Technician
    // 또는
    broadcast: true,

    // 알림 내용
    notification: {
      title: '알림 제목',
      body: '알림 내용'
    },

    // 추가 데이터
    data: {
      type: 'emergency',
      equipment_code: 'CNC-001',
      url: '/maintenance/monitor'
    },

    // 옵션
    options: {
      priority: 'high',
      ttl: 3600,
      collapse_key: 'unique-key'
    }
  }
})
```

## API 상세

### send-push-notification

범용 푸시 알림 전송 함수

**요청:**
```typescript
interface Request {
  // 대상 (하나 이상 필수)
  token?: string
  tokens?: string[]
  user_ids?: string[]
  roles?: number[]
  departments?: string[]
  broadcast?: boolean

  // 알림 내용 (필수)
  notification: {
    title: string
    body: string
    image?: string
  }

  // 추가 데이터
  data?: {
    type?: 'emergency' | 'long_repair' | 'completed' | 'info' | 'pm_schedule'
    equipment_code?: string
    url?: string
    [key: string]: string | undefined
  }

  // 옵션
  options?: {
    priority?: 'high' | 'normal'
    ttl?: number
    collapse_key?: string
  }
}
```

**응답:**
```typescript
interface Response {
  success: boolean
  sent: number
  failed: number
  total: number
  errors?: string[]
}
```

### notify-emergency

긴급 수리 전용 알림 함수

**요청:**
```typescript
interface Request {
  equipment_code: string       // 필수
  equipment_name?: string
  maintenance_id?: string
  symptom?: string
  building?: string
  target_roles?: number[]      // 기본: [1, 2, 3]
  target_departments?: string[]
}
```

### notify-pm-schedule

PM 일정 알림 함수

**요청:**
```typescript
interface Request {
  schedule_id?: string         // 특정 일정만
  days_before?: number         // 기본: 0 (오늘)
  notify_assigned_only?: boolean  // 기본: true
}
```

## 데이터베이스 트리거

자동 알림 트리거:

1. **긴급 수리 알림** (`trigger_notify_emergency_repair`)
   - `maintenance_records`에 긴급 수리(EM) 등록 시 자동 발송

2. **수리 완료 알림** (`trigger_notify_repair_completed`)
   - 정비 기록 상태가 'completed'로 변경 시 자동 발송

3. **장시간 수리 체크** (`check_long_repairs(threshold_minutes)`)
   - 스케줄러에서 주기적 호출 필요
   - 예: `SELECT check_long_repairs(120);` (2시간 기준)

4. **PM 일정 알림** (`check_pm_schedules_and_notify()`)
   - 스케줄러에서 매일 호출 필요
   - 예: `SELECT * FROM check_pm_schedules_and_notify();`

## Cron Job 설정 (선택)

pg_cron 확장을 사용하여 자동 실행:

```sql
-- pg_cron 확장 활성화 (Supabase Dashboard에서)
-- Extensions > pg_cron

-- 매 30분마다 장시간 수리 체크
SELECT cron.schedule(
    'check-long-repairs',
    '*/30 * * * *',
    $$SELECT check_long_repairs(120)$$
);

-- 매일 오전 8시에 PM 일정 알림
SELECT cron.schedule(
    'notify-pm-schedules',
    '0 8 * * *',
    $$SELECT * FROM check_pm_schedules_and_notify()$$
);
```

## 문제 해결

### FCM 토큰 발급 실패
- Firebase 프로젝트 설정 확인
- VAPID Key 설정 확인
- 브라우저 알림 권한 확인

### Edge Function 호출 실패
- Supabase 프로젝트 URL 확인
- Service Role Key 확인
- FCM_SERVER_KEY 환경 변수 확인

### 알림이 도착하지 않음
- FCM 토큰 유효성 확인
- user_fcm_tokens 테이블에서 is_active 확인
- user_push_settings에서 알림 설정 확인
- 브라우저 Service Worker 등록 상태 확인

## 로그 확인

```sql
-- 최근 알림 전송 로그
SELECT * FROM notification_logs
ORDER BY sent_at DESC
LIMIT 20;

-- 사용자별 인앱 알림
SELECT * FROM user_notifications
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC;

-- 활성 FCM 토큰
SELECT * FROM user_fcm_tokens
WHERE is_active = true;
```
