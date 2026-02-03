# 멀티 팩토리 지원 구현 계획 (v3 - auth_user_id 수정)

## 원본 요청

단일 테넌트(ALT/1공장) SMART-CMMS 시스템을 멀티 팩토리(ALT + ALV/2공장) 지원으로 확장.
동일 Supabase 프로젝트 내에서 factory_id 기반 데이터 격리 구현.

## 인터뷰 요약

- 단일 Supabase 프로젝트, factory_id 컬럼으로 데이터 격리
- 프론트엔드에 팩토리 토글 셀렉터 추가 (ALT=1공장, ALV=2공장)
- 시스템 관리자(role=1)는 양 공장 접근 가능
- 기존 모든 데이터는 factory_id='ALT'로 마이그레이션
- 별도 git 브랜치에서 개발 후 PR

## 리서치 결과

- API 레이어: `src/lib/api.ts` (3136줄) - 모든 Supabase 쿼리가 이 파일에 집중
- 인증 스토어: `src/stores/authStore.ts` - Zustand persist, 현재 factory 개념 없음
- 타입 정의: `src/types/index.ts` - User, Equipment 등 모든 타입 정의
- 헤더: `src/components/layout/Header.tsx` - 언어 토글, 알림, 로그아웃 포함
- 22+ 테이블, 모두 RLS 활성화
- **Realtime 훅**: `src/hooks/useRealtimeSync.ts` - 직접 supabase 쿼리 (lines 26-33, 77-86, 199-208)
- **Realtime 구독**: `src/hooks/useRealtimeSubscription.ts` - filter 파라미터 지원
- **Bulk upload**: `src/pages/equipment/EquipmentBulkUploadPage.tsx`, `src/pages/admin/UserBulkUploadPage.tsx`
- **스토어 목록**: equipmentStore, maintenanceStore, notificationStore, settingsStore, uiStore, themeStore, authStore

---

## 작업 목표

### 핵심 목표
단일 Supabase 프로젝트 내에서 factory_id 기반 멀티 팩토리 데이터 격리를 구현하여, 각 공장(ALT, ALV)이 독립적으로 CMMS를 운영할 수 있도록 한다.

### 산출물
1. DB 스키마 변경 (factories 테이블, factory_id 컬럼, RLS 정책, DB 함수)
2. 프론트엔드 팩토리 셀렉터 및 컨텍스트
3. API 레이어 factory_id 필터링
4. Realtime 구독 factory_id 필터링
5. 스토어 리셋 메커니즘
6. 사용자 관리 (공장별 사용자, 시스템 관리자 크로스 접근)

### 완료 기준
- ALT(1공장) 사용자는 ALT 데이터만 조회/수정 가능
- ALV(2공장) 사용자는 ALV 데이터만 조회/수정 가능
- 시스템 관리자(role=1)는 팩토리 셀렉터로 전환하여 양쪽 모두 접근 가능
- RLS 정책이 DB 레벨에서 데이터 격리를 강제
- 기존 ALT 데이터 및 기능이 100% 동일하게 작동

---

## 가드레일

### 반드시 포함 (Must Have)
- factories 테이블 생성
- 팩토리 스코프 테이블에 factory_id 컬럼 추가 (자식 테이블 포함 - 비정규화)
- **DB 함수 기반 하이브리드 RLS 정책** (USING(true) 금지)
- 기존 데이터 factory_id='ALT' 마이그레이션
- 프론트엔드 팩토리 셀렉터
- API 레이어 모든 쿼리에 factory_id 필터
- Realtime 구독에 factory_id 필터
- 스토어 리셋 on factory switch
- users 테이블 factory_id NOT NULL (관리자 포함)
- Bulk upload에 factory_id 자동 주입

### 반드시 제외 (Must NOT Have)
- 기존 기능 변경 또는 제거
- 팩토리 간 데이터 공유 (마스터 데이터 제외)
- 새로운 인증 방식 도입
- Supabase 프로젝트 분리
- `USING (true)` RLS 정책 (보안 취약)

---

## 자식 테이블 비정규화 근거

`maintenance_parts`, `maintenance_images`, `paint_step_executions` 등 자식 테이블에도 factory_id를 직접 추가하는 이유:

1. **RLS 필수**: Supabase RLS는 행 단위로 동작하며, JOIN을 통한 부모 테이블 참조 불가
2. **Realtime 필터**: Supabase Realtime의 `filter` 파라미터는 해당 테이블 컬럼만 지원
3. **플랫 쿼리 성능**: 부모 JOIN 없이 직접 factory_id로 필터링하여 쿼리 성능 향상
4. **데이터 일관성**: 부모와 항상 동일한 factory_id를 가지므로 불일치 위험 낮음 (INSERT 시 API에서 자동 주입)

---

## 테이블 분류

### 팩토리 스코프 (factory_id 추가 필요 - 19개)
| 테이블 | 설명 |
|--------|------|
| `users` | 사용자 - **모든 사용자 NOT NULL** (관리자도 기본 공장 배정, UI에서 전환) |
| `equipments` | 설비 |
| `maintenance_records` | 정비 기록 |
| `maintenance_parts` | 정비 부품 (비정규화 - RLS/Realtime 필요) |
| `maintenance_images` | 정비 이미지 (비정규화 - RLS/Realtime 필요) |
| `pm_templates` | PM 템플릿 |
| `pm_schedules` | PM 스케줄 |
| `pm_executions` | PM 실행 |
| `paint_templates` | 도색 템플릿 |
| `paint_schedules` | 도색 스케줄 |
| `paint_executions` | 도색 실행 |
| `paint_step_executions` | 도색 단계 실행 (비정규화 - RLS/Realtime 필요) |
| `notifications` | 알림 |
| `notification_logs` | 알림 로그 |
| `ai_insights` | AI 인사이트 |
| `ai_chat_history` | AI 채팅 기록 |
| `activity_logs` | 활동 로그 |
| `generated_reports` | 생성된 보고서 |
| `settings` | 설정 |

### 공유 데이터 (factory_id 불필요)
| 테이블 | 사유 |
|--------|------|
| `equipment_types` | 설비 유형 마스터 데이터 - 양 공장 공통 |
| `repair_types` | 수리 유형 마스터 데이터 - 양 공장 공통 |
| `paint_checklist_steps` | 도색 체크리스트 마스터 - 양 공장 공통 |
| `role_permissions` | 권한 설정 - 양 공장 공통 |

### 사용자 종속 (user를 통해 간접 격리)
| 테이블 | 사유 |
|--------|------|
| `user_fcm_tokens` | user_id FK로 간접 격리 |
| `user_push_settings` | user_id FK로 간접 격리 |

---

## 태스크 플로우

```
[Phase 1: Git 브랜치]
       |
[Phase 2: DB 스키마 변경 + RLS + DB 함수]
       |
[Phase 3: 프론트엔드 타입 & 스토어 (리셋 메커니즘 포함)]
       |
[Phase 4: API 레이어 수정 (bulk upload 포함)]
       |
[Phase 5: Realtime 훅 수정]
       |
[Phase 6: UI 컴포넌트]
       |
[Phase 7: 페이지별 검증 & 수정]
       |
[Phase 8: 테스트 & 검증]
```

---

## 상세 태스크

### Phase 1: Git 브랜치 생성

**Task 1.1: feature 브랜치 생성**
- 명령어: `git checkout -b feature/multi-factory-support`
- 수락 기준: 새 브랜치에서 작업 시작

---

### Phase 2: 데이터베이스 스키마 변경 (Supabase MCP)

**Task 2.1: factories 테이블 생성**

> **수정사항**: `code` 컬럼 제거 (id와 중복), `name`과 `name_ko` 통합

```sql
CREATE TABLE factories (
  id TEXT PRIMARY KEY,           -- 'ALT', 'ALV' (코드 역할 겸함)
  name_ko TEXT NOT NULL,         -- '1공장'
  name_vi TEXT NOT NULL,         -- 'Nha may 1'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO factories (id, name_ko, name_vi) VALUES
  ('ALT', '1공장', 'Nhà máy 1'),
  ('ALV', '2공장', 'Nhà máy 2');

ALTER TABLE factories ENABLE ROW LEVEL SECURITY;

-- factories는 모든 인증 사용자가 조회 가능 (공장 목록은 공유 데이터)
CREATE POLICY "factories_select" ON factories
  FOR SELECT TO authenticated USING (true);
```
- 수락 기준: factories 테이블 생성, ALT/ALV 데이터 삽입 완료

**Task 2.2: DB 헬퍼 함수 생성 (RLS용)**

> **핵심 변경**: 하이브리드 RLS 접근법. DB 함수로 사용자의 factory_id와 role을 조회하여 RLS에서 사용.

```sql
-- 현재 인증된 사용자의 factory_id 반환
CREATE OR REPLACE FUNCTION get_user_factory_id(user_uuid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT factory_id FROM users WHERE auth_user_id = user_uuid;
$$;

-- 현재 인증된 사용자의 role 반환
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM users WHERE auth_user_id = user_uuid;
$$;
```

- 수락 기준: 두 함수 생성, `SELECT get_user_factory_id(auth.uid())` 정상 동작 확인

**Task 2.3: 팩토리 스코프 테이블에 factory_id 컬럼 추가**

각 팩토리 스코프 테이블에 대해 실행 (19개):

```sql
-- 예시: equipments 테이블
ALTER TABLE equipments ADD COLUMN factory_id TEXT REFERENCES factories(id);
UPDATE equipments SET factory_id = 'ALT';
ALTER TABLE equipments ALTER COLUMN factory_id SET NOT NULL;
CREATE INDEX idx_equipments_factory_id ON equipments(factory_id);
```

대상 테이블 (19개):
1. `users` - **NOT NULL** (관리자 포함, 기존 전부 'ALT')
2. `equipments`
3. `maintenance_records`
4. `maintenance_parts`
5. `maintenance_images`
6. `pm_templates`
7. `pm_schedules`
8. `pm_executions`
9. `paint_templates`
10. `paint_schedules`
11. `paint_executions`
12. `paint_step_executions`
13. `notifications` - **81k+ 행: 배치 마이그레이션 필요** (아래 참조)
14. `notification_logs`
15. `ai_insights`
16. `ai_chat_history`
17. `activity_logs`
18. `generated_reports`
19. `settings`

**users 테이블 처리**:
```sql
ALTER TABLE users ADD COLUMN factory_id TEXT REFERENCES factories(id);
UPDATE users SET factory_id = 'ALT';
ALTER TABLE users ALTER COLUMN factory_id SET NOT NULL;
CREATE INDEX idx_users_factory_id ON users(factory_id);
```
- 모든 사용자(관리자 포함)는 반드시 factory_id를 가짐
- 시스템 관리자(role=1)는 UI에서만 공장 전환 가능, DB에는 기본 소속 공장 저장

**notifications 배치 마이그레이션** (81k+ 행):
```sql
-- 배치로 처리하여 테이블 락 최소화
ALTER TABLE notifications ADD COLUMN factory_id TEXT REFERENCES factories(id);

-- 배치 업데이트 (10,000행씩)
DO $$
DECLARE
  batch_size INT := 10000;
  affected INT;
BEGIN
  LOOP
    UPDATE notifications
    SET factory_id = 'ALT'
    WHERE factory_id IS NULL
    AND id IN (
      SELECT id FROM notifications WHERE factory_id IS NULL LIMIT batch_size
    );
    GET DIAGNOSTICS affected = ROW_COUNT;
    EXIT WHEN affected = 0;
    RAISE NOTICE 'Updated % rows', affected;
    PERFORM pg_sleep(0.1);  -- 짧은 대기
  END LOOP;
END $$;

ALTER TABLE notifications ALTER COLUMN factory_id SET NOT NULL;
CREATE INDEX idx_notifications_factory_id ON notifications(factory_id);
```

- 수락 기준: 모든 19개 테이블에 factory_id 컬럼 추가, 기존 데이터 'ALT'로 설정, 인덱스 생성, notifications는 배치 처리

**Task 2.4: RLS 정책 업데이트 (하이브리드 방식)**

> **핵심 변경**: `USING (true)` 대신 DB 함수 기반 정책. 비관리자는 자신의 factory_id만 접근, 시스템 관리자(role=1)는 모든 공장 접근.

모든 팩토리 스코프 테이블에 대해:

```sql
-- 예시: equipments 테이블
DROP POLICY IF EXISTS "equipments_select" ON equipments;
DROP POLICY IF EXISTS "equipments_insert" ON equipments;
DROP POLICY IF EXISTS "equipments_update" ON equipments;
DROP POLICY IF EXISTS "equipments_delete" ON equipments;

-- SELECT: 자기 공장 데이터 또는 시스템 관리자
CREATE POLICY "equipments_select" ON equipments
  FOR SELECT TO authenticated
  USING (
    factory_id = get_user_factory_id(auth.uid())
    OR get_user_role(auth.uid()) = 1
  );

-- INSERT: 자기 공장에만 삽입 또는 시스템 관리자
CREATE POLICY "equipments_insert" ON equipments
  FOR INSERT TO authenticated
  WITH CHECK (
    factory_id = get_user_factory_id(auth.uid())
    OR get_user_role(auth.uid()) = 1
  );

-- UPDATE: 자기 공장 데이터만 또는 시스템 관리자
CREATE POLICY "equipments_update" ON equipments
  FOR UPDATE TO authenticated
  USING (
    factory_id = get_user_factory_id(auth.uid())
    OR get_user_role(auth.uid()) = 1
  );

-- DELETE: 자기 공장 데이터만 또는 시스템 관리자
CREATE POLICY "equipments_delete" ON equipments
  FOR DELETE TO authenticated
  USING (
    factory_id = get_user_factory_id(auth.uid())
    OR get_user_role(auth.uid()) = 1
  );
```

**시스템 관리자 동작 방식**:
- RLS: role=1은 모든 공장 데이터 접근 허용 (DB 보안 레이어)
- 앱 레벨: `getCurrentFactoryId()` 필터로 현재 선택된 공장 데이터만 표시 (UX 레이어)
- 즉, RLS는 "접근 가능 범위", 앱은 "보고 싶은 범위"를 담당

**users 테이블 특수 RLS**:
```sql
-- users는 자기 공장 + 시스템 관리자는 전체 조회
CREATE POLICY "users_select" ON users
  FOR SELECT TO authenticated
  USING (
    factory_id = get_user_factory_id(auth.uid())
    OR get_user_role(auth.uid()) = 1
    OR id = (SELECT id FROM users WHERE auth_user_id = auth.uid())  -- 자기 자신은 항상 조회 가능
  );
```

- 수락 기준: 모든 19개 팩토리 스코프 테이블에 하이브리드 RLS 정책 적용, `USING(true)` 없음

**Task 2.5: Supabase RPC 함수 업데이트**

api.ts를 분석하여 factory_id 파라미터가 필요한 RPC 함수 확인 후 수정.

- 수락 기준: factory_id 파라미터를 받는 RPC 함수 업데이트 (있는 경우)

---

### Phase 3: 프론트엔드 타입 & 스토어 수정

**Task 3.1: 타입 정의 추가**
- 파일: `C:\Work Drive\APP\SMART-CMMS\src\types\index.ts`
- 변경 내용:
```typescript
// Factory types
export type FactoryId = 'ALT' | 'ALV'

export interface Factory {
  id: FactoryId
  name_ko: string
  name_vi: string
  is_active: boolean
}

export const FACTORIES: Record<FactoryId, { name_ko: string; name_vi: string }> = {
  ALT: { name_ko: '1공장', name_vi: 'Nhà máy 1' },
  ALV: { name_ko: '2공장', name_vi: 'Nhà máy 2' },
}
```
- User 인터페이스에 `factory_id: FactoryId` 추가
- 수락 기준: FactoryId, Factory 타입 정의, User에 factory_id 필드 추가

**Task 3.2: Auth 스토어에 currentFactory 추가**
- 파일: `C:\Work Drive\APP\SMART-CMMS\src\stores\authStore.ts`
- 변경 내용:
  - `AuthState` 인터페이스에 추가:
    ```typescript
    currentFactory: FactoryId
    setCurrentFactory: (factory: FactoryId) => void
    canSwitchFactory: () => boolean
    ```
  - 초기값: `currentFactory: 'ALT'`
  - `setCurrentFactory`: factory 값 설정 + **모든 스토어 리셋 트리거**
  - `canSwitchFactory`: `user?.role === 1` 일 때만 true 반환
  - `login` 시 `user.factory_id`를 `currentFactory`로 설정
  - persist 대상에 `currentFactory` 포함
- 수락 기준: currentFactory 상태 관리, 시스템 관리자만 전환 가능, 로그인 시 자동 설정

**Task 3.3: 스토어 리셋 메커니즘 구현**

> **신규 태스크**: 팩토리 전환 시 캐시된 데이터 초기화

각 스토어에 `reset()` 함수 추가:

- 파일: `C:\Work Drive\APP\SMART-CMMS\src\stores\equipmentStore.ts`
- 파일: `C:\Work Drive\APP\SMART-CMMS\src\stores\maintenanceStore.ts`
- 파일: `C:\Work Drive\APP\SMART-CMMS\src\stores\notificationStore.ts`
- 파일: `C:\Work Drive\APP\SMART-CMMS\src\stores\settingsStore.ts`

각 스토어에 추가:
```typescript
reset: () => set({
  // 모든 데이터 상태를 초기값으로 리셋
  equipments: [],
  loading: false,
  error: null,
  // ... 각 스토어별 초기 상태
})
```

`setCurrentFactory` 구현:
```typescript
setCurrentFactory: (factory: FactoryId) => {
  set({ currentFactory: factory })
  // 모든 데이터 스토어 리셋
  useEquipmentStore.getState().reset()
  useMaintenanceStore.getState().reset()
  useNotificationStore.getState().reset()
  useSettingsStore.getState().reset()
  // Realtime은 dependency array에 의해 자동 재구독
  // loadAllData는 useAppRealtime의 useEffect에 의해 자동 재호출
}
```

- 수락 기준: 모든 데이터 스토어에 reset() 추가, 팩토리 전환 시 스토어 초기화 후 데이터 재로드, `window.location.reload()` 사용하지 않음

---

### Phase 4: API 레이어 수정

**Task 4.1: API 헬퍼 함수 추가**
- 파일: `C:\Work Drive\APP\SMART-CMMS\src\lib\api.ts`
- 변경 내용:
```typescript
import { useAuthStore } from '@/stores/authStore'

const getCurrentFactoryId = (): string => {
  return useAuthStore.getState().currentFactory
}
```
- 수락 기준: getCurrentFactoryId 헬퍼 함수 추가

**Task 4.2: 팩토리 스코프 SELECT 쿼리에 factory_id 필터 추가**

`api.ts`의 모든 SELECT 쿼리에 `.eq('factory_id', getCurrentFactoryId())` 추가.

영향 범위:
- Equipment: `getEquipments`, `getEquipment`, `getEquipmentStats` 등
- Maintenance: `getMaintenanceRecords`, `getMaintenanceRecord` 등
- PM: `getPMSchedules`, `getPMTemplates` 등
- Paint: `getPaintSchedules`, `getPaintTemplates` 등
- Notifications: `getNotifications` 등
- AI: `getAIInsights`, `getAIChatHistory` 등
- Dashboard: `getDashboardStats` 등
- Settings: `getSettings` 등
- Activity: `getActivityLogs` 등
- Reports: `getGeneratedReports` 등
- Users: `getUsers` - 항상 `getCurrentFactoryId()` 필터 적용 (시스템 관리자의 공장 전환은 UI 레벨에서 처리)

**주의사항**:
- 공유 테이블(equipment_types, repair_types, paint_checklist_steps, role_permissions)에는 factory_id 필터 추가하지 않음
- user_fcm_tokens, user_push_settings는 user_id 기반이므로 factory_id 불필요

- 수락 기준: 모든 팩토리 스코프 SELECT 쿼리에 factory_id 필터 적용

**Task 4.3: INSERT 쿼리에 factory_id 자동 포함**

모든 INSERT/CREATE 함수에서 데이터 객체에 `factory_id: getCurrentFactoryId()` 자동 추가.

```typescript
const createEquipment = async (data: EquipmentCreateForm) => {
  const sb = getSupabase()
  const { data: result, error } = await sb
    .from('equipments')
    .insert({ ...data, factory_id: getCurrentFactoryId() })
    .select()
    .single()
}
```

- 수락 기준: 모든 INSERT 쿼리에 factory_id 자동 포함

**Task 4.4: UPDATE/DELETE 쿼리에 factory_id 필터 추가**

방어적 프로그래밍으로 `.eq('factory_id', getCurrentFactoryId())` 추가.

- 수락 기준: UPDATE/DELETE 쿼리에 factory_id 필터 추가

**Task 4.5: Bulk Upload API에 factory_id 주입**

> **신규 태스크**: CSV에서 factory_id를 받지 않고 API 레이어에서 자동 주입

- 파일: `C:\Work Drive\APP\SMART-CMMS\src\lib\api.ts`
- 함수: `bulkCreateEquipments` (line 169), `bulkCreateUsers` (line 592)

```typescript
// bulkCreateEquipments 수정
async bulkCreateEquipments(equipments: Partial<Equipment>[]): Promise<...> {
  const factoryId = getCurrentFactoryId()
  const withFactory = equipments.map(eq => ({ ...eq, factory_id: factoryId }))
  // ... 기존 로직에 withFactory 사용
}

// bulkCreateUsers 수정
async bulkCreateUsers(users: ...): Promise<...> {
  const factoryId = getCurrentFactoryId()
  const withFactory = users.map(u => ({ ...u, factory_id: factoryId }))
  // ... 기존 로직에 withFactory 사용
}
```

- 수락 기준: bulk upload 함수가 각 행에 현재 factory_id를 자동 주입, CSV 파일에 factory_id 컬럼 불필요

**Task 4.6: Factories API 함수 추가**
```typescript
export const getFactories = async (): Promise<Factory[]> => {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('factories')
    .select('*')
    .eq('is_active', true)
  if (error) throw error
  return data || []
}
```
- 수락 기준: getFactories API 함수 추가

---

### Phase 5: Realtime 훅 수정

> **신규 Phase**: Critic 피드백 반영 - 직접 Supabase 쿼리 및 Realtime 필터 누락 해결

**Task 5.1: useRealtimeSync.ts 직접 쿼리를 API 함수로 교체**

- 파일: `C:\Work Drive\APP\SMART-CMMS\src\hooks\useRealtimeSync.ts`

현재 직접 supabase를 호출하는 코드 3곳:
1. Lines 26-33: `useEquipmentRealtime` - `supabase.from('equipments').select(...)`
2. Lines 77-86: `useMaintenanceRealtime` - `supabase.from('maintenance_records').select(...)`
3. Lines 199-208: `useAppRealtime.loadAllData` - `supabase.from('equipments')...` + `supabase.from('maintenance_records')...`

변경 방법: `api.ts`의 기존 함수를 호출하도록 교체
```typescript
// Before (직접 쿼리)
const { data } = await supabase
  .from('equipments')
  .select(`*, type:equipment_types(*)`)
  .eq('is_active', true)
  .order('equipment_no')

// After (API 함수 사용)
import { equipmentApi, maintenanceApi } from '@/lib/api'
const { data } = await equipmentApi.getEquipments()
// 이렇게 하면 api.ts의 factory_id 필터가 자동 적용됨
```

- 수락 기준: useRealtimeSync.ts에서 직접 supabase 쿼리 0개, 모든 데이터 접근은 api.ts를 통해

**Task 5.2: Realtime 구독에 factory_id 필터 추가**

- 파일: `C:\Work Drive\APP\SMART-CMMS\src\hooks\useRealtimeSync.ts`

`useAppRealtime` 훅의 `useMultiTableRealtime` 호출에서 각 테이블 구독에 factory_id 필터 추가:

```typescript
// authStore에서 currentFactory 가져오기
const { user, currentFactory, refreshUser } = useAuthStore()

// useMultiTableRealtime configs에 filter 추가
{
  table: 'equipments',
  filter: `factory_id=eq.${currentFactory}`,  // 추가
  onInsert: () => { ... },
  ...
},
{
  table: 'maintenance_records',
  filter: `factory_id=eq.${currentFactory}`,  // 추가
  ...
},
{
  table: 'notifications',
  filter: user?.id ? `user_id=eq.${user.id}` : undefined,
  // notifications는 user_id 필터 유지 (이미 factory 스코프)
  ...
},
{
  table: 'pm_schedules',
  filter: `factory_id=eq.${currentFactory}`,  // 추가
  ...
},
{
  table: 'pm_executions',
  filter: `factory_id=eq.${currentFactory}`,  // 추가
  ...
},
{
  table: 'settings',
  filter: `factory_id=eq.${currentFactory}`,  // 추가
  ...
},
```

**자동 재구독**: `currentFactory`가 변경되면 `useMultiTableRealtime`의 dependency array(`configs`)가 변경되어 자동으로 기존 채널 해제 + 새 채널 구독.

- 수락 기준: 모든 realtime 구독에 factory_id 필터 적용, 팩토리 전환 시 자동 재구독

**Task 5.3: useAppRealtime에 currentFactory 의존성 추가**

`loadAllData`와 `useMultiTableRealtime` 호출이 `currentFactory` 변경 시 재실행되도록:

```typescript
export function useAppRealtime(enabled = true) {
  const { user, currentFactory, refreshUser } = useAuthStore()
  // ...
  // loadAllData의 useCallback deps에 currentFactory 추가
  const loadAllData = useCallback(async () => {
    // api 함수를 통해 데이터 로드 (factory_id 자동 적용)
    // ...
  }, [setEquipments, setRecords, currentFactory])  // currentFactory 추가
```

- 수락 기준: currentFactory 변경 시 loadAllData 재실행, Realtime 재구독

---

### Phase 6: UI 컴포넌트

**Task 6.1: FactorySelector 컴포넌트 생성**
- 파일: `C:\Work Drive\APP\SMART-CMMS\src\components\layout\FactorySelector.tsx`
- 구현:
  - 현재 factory 표시 (드롭다운)
  - 시스템 관리자(role=1)만 전환 가능
  - 일반 사용자는 자신의 factory 표시만 (비활성)
  - 전환 시 `useAuthStore.setCurrentFactory()` 호출 (스토어 리셋 + Realtime 재구독 자동 처리)
  - **`window.location.reload()` 사용 금지** - 스토어 리셋 메커니즘 사용
  - 디자인: Header 영역에 배치, 언어 토글 옆
- 수락 기준: FactorySelector 컴포넌트 구현, 시스템 관리자만 전환 가능, 전환 시 페이지 새로고침 없이 데이터 갱신

**Task 6.2: Header에 FactorySelector 통합**
- 파일: `C:\Work Drive\APP\SMART-CMMS\src\components\layout\Header.tsx`
- 변경: FactorySelector를 언어 토글 왼쪽에 배치
- 수락 기준: Header에 FactorySelector 표시

**Task 6.3: 번역 키 추가**
- 파일: `C:\Work Drive\APP\SMART-CMMS\src\i18n\locales\ko.json`
- 파일: `C:\Work Drive\APP\SMART-CMMS\src\i18n\locales\vi.json`
- 추가 키:
```json
{
  "factory": {
    "title": "공장",
    "alt": "1공장 (ALT)",
    "alv": "2공장 (ALV)",
    "switch": "공장 전환",
    "current": "현재 공장"
  }
}
```
- 수락 기준: ko.json, vi.json에 factory 관련 번역 추가

---

### Phase 7: 페이지별 검증 & 수정

**Task 7.1: 대시보드 페이지 검증**
- 파일: `src/pages/dashboard/` 내 파일들
- 확인: 대시보드 통계가 현재 factory 기준으로 표시되는지
- 수락 기준: 대시보드가 현재 factory 데이터만 표시

**Task 7.2: 설비 관리 페이지 검증**
- 파일: `src/pages/equipment/` 내 파일들
- 확인: 설비 목록, 상세, 생성, 수정이 현재 factory 기준
- 수락 기준: 설비 CRUD가 factory 격리 상태로 동작

**Task 7.3: 설비 Bulk Upload 페이지 검증**

> **신규 태스크**

- 파일: `C:\Work Drive\APP\SMART-CMMS\src\pages\equipment\EquipmentBulkUploadPage.tsx`
- 확인: CSV 업로드 시 factory_id가 API 레이어에서 자동 주입되는지
- 확인: 업로드된 설비가 현재 factory에만 표시되는지
- 수락 기준: bulk upload된 설비에 올바른 factory_id 자동 설정

**Task 7.4: 사용자 Bulk Upload 페이지 검증**

> **신규 태스크**

- 파일: `C:\Work Drive\APP\SMART-CMMS\src\pages\admin\UserBulkUploadPage.tsx`
- 확인: CSV 업로드 시 factory_id가 API 레이어에서 자동 주입되는지
- 수락 기준: bulk upload된 사용자에 올바른 factory_id 자동 설정

**Task 7.5: 정비 관리 페이지 검증**
- 파일: `src/pages/maintenance/` 내 파일들
- 확인: 정비 기록, 모니터링이 현재 factory 기준
- 수락 기준: 정비 CRUD가 factory 격리 상태로 동작

**Task 7.6: PM 관리 페이지 검증**
- 파일: `src/pages/pm/` 또는 관련 페이지
- 확인: PM 스케줄, 템플릿, 실행이 현재 factory 기준
- 수락 기준: PM CRUD가 factory 격리 상태로 동작

**Task 7.7: 도색 관리 페이지 검증**
- 파일: `src/pages/paint/` 또는 관련 페이지
- 확인: 도색 스케줄, 대시보드, 실행이 현재 factory 기준
- 수락 기준: 도색 CRUD가 factory 격리 상태로 동작

**Task 7.8: 분석 및 보고서 페이지 검증**
- 파일: `src/pages/analytics/` 내 파일들
- 확인: 모든 분석 데이터가 현재 factory 기준
- 수락 기준: 분석 페이지가 factory 격리 데이터 표시

**Task 7.9: AI 페이지 검증**
- 파일: `src/pages/ai/` 내 파일들
- 확인: AI 인사이트, 채팅 기록이 현재 factory 기준
- 수락 기준: AI 기능이 factory 격리 상태로 동작

**Task 7.10: 관리자 페이지 수정**
- 파일: `src/pages/admin/` 내 파일들
- 변경:
  - 사용자 관리: 현재 factory 사용자만 표시 (시스템 관리자는 전환하여 각 공장 관리)
  - 사용자 생성 시 factory_id는 현재 선택된 factory로 자동 설정
  - 설정 페이지: 공장별 설정 표시
- 수락 기준: 관리자 페이지가 factory 컨텍스트에 맞게 동작

---

### Phase 8: 테스트 & 검증

**Task 8.1: ALT(1공장) 기존 데이터 검증**
- 모든 기존 데이터가 factory_id='ALT'로 정상 조회되는지 확인
- 대시보드 통계 수치가 마이그레이션 전과 동일한지 확인
- 수락 기준: 기존 기능 100% 정상 동작

**Task 8.2: ALV(2공장) 빈 상태 검증**
- factory를 ALV로 전환 시 데이터가 비어있는 상태로 표시되는지 확인
- 빈 상태에서 에러 없이 UI가 렌더링되는지 확인
- 수락 기준: ALV 전환 시 빈 상태 정상 표시

**Task 8.3: 크로스 팩토리 격리 검증**
- ALT에서 생성한 데이터가 ALV에서 보이지 않는지 확인
- ALV에서 생성한 데이터가 ALT에서 보이지 않는지 확인
- **RLS 검증**: Supabase SQL Editor에서 직접 쿼리하여 RLS 정책이 올바르게 작동하는지 확인
- 수락 기준: 팩토리 간 데이터 완전 격리 (앱 레벨 + DB 레벨 모두)

**Task 8.4: Realtime 검증**
- 팩토리 전환 시 Realtime 구독이 올바르게 재구독되는지 확인
- 다른 공장의 변경사항이 수신되지 않는지 확인
- 수락 기준: Realtime이 현재 factory 데이터만 수신

**Task 8.5: 스토어 리셋 검증**
- 팩토리 전환 시 이전 공장 데이터가 잠시라도 표시되지 않는지 확인
- 전환 후 새 공장 데이터가 정상 로드되는지 확인
- 수락 기준: 팩토리 전환 시 깨끗한 상태 전환

**Task 8.6: 빌드 및 타입 검증**
- `npm run build` 성공
- `npm run lint` 통과
- 수락 기준: 빌드/린트 에러 없음

---

## 커밋 전략

| 커밋 번호 | 내용 | Phase |
|-----------|------|-------|
| 1 | DB 스키마 변경: factories 테이블, DB 함수, factory_id 컬럼, RLS 정책 | Phase 2 |
| 2 | 타입 정의 및 스토어 수정 (리셋 메커니즘 포함) | Phase 3 |
| 3 | API 레이어 factory_id 필터 + bulk upload 주입 | Phase 4 |
| 4 | Realtime 훅 수정: API 함수 사용 + factory_id 필터 | Phase 5 |
| 5 | FactorySelector UI 컴포넌트 및 Header 통합 | Phase 6 |
| 6 | 번역 키 추가 | Phase 6 |
| 7 | 페이지별 수정 및 검증 (bulk upload 포함) | Phase 7 |
| 8 | 최종 빌드 검증 및 정리 | Phase 8 |

---

## 롤백 계획

> **신규 섹션**

### DB 롤백 (Phase 2 실패 시)

```sql
-- 1. RLS 정책 원복 (각 테이블별 기존 정책 재생성 필요 - 사전 백업 필수)
-- 사전 작업: 마이그레이션 전 기존 RLS 정책 덤프
-- SELECT * FROM pg_policies WHERE schemaname = 'public';

-- 2. factory_id 컬럼 제거
ALTER TABLE equipments DROP COLUMN IF EXISTS factory_id;
-- ... 19개 테이블 모두

-- 3. DB 함수 제거
DROP FUNCTION IF EXISTS get_user_factory_id(UUID);
DROP FUNCTION IF EXISTS get_user_role(UUID);

-- 4. factories 테이블 제거
DROP TABLE IF EXISTS factories;
```

### 프론트엔드 롤백
- Git revert: `git revert feature/multi-factory-support` 머지 커밋
- 또는 브랜치별 커밋 revert

### 롤백 체크리스트
1. DB 변경 전 **반드시** `pg_dump`로 스키마 + 데이터 백업
2. 기존 RLS 정책을 SQL 파일로 백업 (pg_policies 조회)
3. 각 Phase 완료 후 중간 검증 수행
4. 문제 발견 시 해당 Phase까지만 롤백

---

## 성공 기준

1. **데이터 격리**: ALT/ALV 간 데이터 완전 격리 (RLS + 앱 레벨 이중 보호)
2. **기능 보존**: 기존 ALT 데이터 및 모든 기능 100% 동작
3. **UX**: 시스템 관리자가 헤더에서 원클릭으로 공장 전환 가능 (새로고침 없이)
4. **보안**: `USING(true)` RLS 정책 없음, DB 함수 기반 하이브리드 RLS
5. **Realtime**: factory_id 기반 Realtime 필터링, 전환 시 자동 재구독
6. **코드 품질**: TypeScript 빌드 통과, 린트 통과, 직접 supabase 쿼리 없음 (api.ts 통해)
7. **확장성**: 향후 추가 공장(ALV2 등) 지원 가능한 구조

---

## 리스크 및 완화

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| api.ts에서 factory_id 누락된 쿼리 | 데이터 유출 | RLS가 DB 레벨에서 차단 (이중 보호) |
| RLS DB 함수 성능 | 쿼리 지연 | `STABLE` 힌트로 함수 결과 캐싱, 인덱스 활용 |
| notifications 81k 마이그레이션 | 테이블 락 | 배치 UPDATE (10,000행씩) + pg_sleep |
| 대시보드 집계 쿼리에서 factory_id 누락 | 잘못된 통계 | RPC 함수 포함 모든 집계 쿼리 검토 |
| 팩토리 전환 시 캐시된 데이터 표시 | UX 혼란 | 스토어 reset() 메커니즘으로 즉시 초기화 |
| useRealtimeSync.ts 직접 쿼리 | factory_id 미적용 | api.ts 함수로 교체하여 필터 자동 적용 |
| Realtime 채널에 factory_id 미필터 | 타 공장 이벤트 수신 | filter 파라미터에 factory_id 추가 |
| Bulk upload에서 factory_id 누락 | 잘못된 공장 데이터 | API 레이어에서 자동 주입 (CSV 의존 X) |

---

## 구현 순서 의존성

```
Phase 2 (DB + RLS + 함수) ──> Phase 3 (타입/스토어/리셋) ──> Phase 4 (API + Bulk)
                                                                      |
                                                               Phase 5 (Realtime)
                                                                      |
                                                               Phase 6 (UI)
                                                                      |
                                                               Phase 7 (페이지 검증)
                                                                      |
                                                               Phase 8 (테스트)
```

Phase 2는 Supabase MCP 도구로 직접 실행.
Phase 3~8은 코드 수정으로 진행.
