# 공장 변경 시 데이터 자동 갱신 구현 계획 (v3 - Final)

## 요약
관리자가 공장(Factory)을 전환할 때 모든 페이지의 데이터가 자동으로 갱신되도록 각 페이지의 useEffect 의존성 배열에 `currentFactory`를 추가합니다.

**총 수정 대상: 18개 파일**

## 현재 문제

### 문제 상황
1. `FactorySelector`에서 `setCurrentFactory(factory)` 호출 시:
   - `authStore.currentFactory` 상태는 업데이트됨
   - `equipmentStore.reset()`, `maintenanceStore.reset()`, `notificationStore.reset()` 호출됨
   - **하지만** 각 페이지의 useEffect에 `currentFactory` 의존성이 없어 데이터 재로드가 발생하지 않음

2. 현재 상태:
   - `AnalyticsPage.tsx`: `currentFactory`를 건물 목록 로드에만 사용 (line 107), **메인 데이터 fetch는 의존성 없음**
   - 나머지 모든 페이지: 의존성 배열이 `[]` (빈 배열)

### 영향 범위
공장 변경 시 새로운 공장 데이터를 보려면 **페이지 새로고침(F5)**이 필요한 상황

## 해결 방안

### 선택한 접근법: 직접 의존성 추가 (Simple & Direct)

**이유:**
1. 커스텀 훅 없이 직접 의존성 추가가 가장 간단하고 명확함
2. ESLint exhaustive-deps 경고 회피 (fetchData를 의존성에 추가하지 않음)
3. 기존 코드 패턴과 일관성 유지
4. 디버깅 용이

**핵심 원리:**
- API 호출 시점에 `getCurrentFactoryId()`가 store에서 `currentFactory`를 직접 읽음
- useEffect에 `currentFactory` 의존성을 추가하면 공장 변경 시 fetch 함수가 재실행되어 새 공장 데이터를 가져옴

**패턴:**
```typescript
// 기존
useEffect(() => {
  fetchData()
}, [])

// 수정 후
const { currentFactory } = useAuthStore()

useEffect(() => {
  fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [currentFactory])
```

---

## 구체적인 구현 단계

### 1단계: DashboardPage.tsx

**파일:** `src/pages/DashboardPage.tsx`

**추가 import (line 34 부근에 추가):**
```typescript
import { useAuthStore } from '@/stores/authStore'
```

**컴포넌트 내부에 추가 (line 43 부근):**
```typescript
const { currentFactory } = useAuthStore()
```

**useEffect 수정 (line 197-199):**
```typescript
// 기존
useEffect(() => {
  fetchDashboardData()
}, [])

// 수정
useEffect(() => {
  fetchDashboardData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [currentFactory])
```

---

### 2단계: EquipmentListPage.tsx

**파일:** `src/pages/equipment/EquipmentListPage.tsx`

**추가 import:**
```typescript
import { useAuthStore } from '@/stores/authStore'
```

**컴포넌트 내부에 추가:**
```typescript
const { currentFactory } = useAuthStore()
```

**useEffect 수정:** 의존성 배열에 `currentFactory` 추가

---

### 3단계: EquipmentMasterPage.tsx

**파일:** `src/pages/equipment/EquipmentMasterPage.tsx`

**추가 import:**
```typescript
import { useAuthStore } from '@/stores/authStore'
```

**컴포넌트 내부에 추가:**
```typescript
const { currentFactory } = useAuthStore()
```

**useEffect 수정:** 의존성 배열에 `currentFactory` 추가

---

### 4단계: EquipmentBulkUploadPage.tsx

**파일:** `src/pages/equipment/EquipmentBulkUploadPage.tsx`

**추가 import:**
```typescript
import { useAuthStore } from '@/stores/authStore'
```

**컴포넌트 내부에 추가:**
```typescript
const { currentFactory } = useAuthStore()
```

**useEffect 수정:** 의존성 배열에 `currentFactory` 추가

---

### 5단계: MaintenanceHistoryPage.tsx

**파일:** `src/pages/maintenance/MaintenanceHistoryPage.tsx`

**추가 import:**
```typescript
import { useAuthStore } from '@/stores/authStore'
```

**컴포넌트 내부에 추가:**
```typescript
const { currentFactory } = useAuthStore()
```

**useEffect 수정:**
```typescript
// 기존
}, [passedEquipmentId])

// 수정
}, [passedEquipmentId, currentFactory])
```

---

### 6단계: MaintenanceInputPage.tsx

**파일:** `src/pages/maintenance/MaintenanceInputPage.tsx`

**추가 import:**
```typescript
import { useAuthStore } from '@/stores/authStore'
```

**컴포넌트 내부에 추가:**
```typescript
const { currentFactory } = useAuthStore()
```

**useEffect 수정:** 의존성 배열에 `currentFactory` 추가

---

### 7단계: MaintenanceMonitorPage.tsx

**파일:** `src/pages/maintenance/MaintenanceMonitorPage.tsx`

**이미 `useAuthStore` import 있음** - `user`만 사용 중

**수정:**
```typescript
// 기존
const { user } = useAuthStore()

// 수정
const { user, currentFactory } = useAuthStore()
```

**useEffect 수정:** 의존성 배열에 `currentFactory` 추가

---

### 8단계: PMDashboardPage.tsx

**파일:** `src/pages/pm/PMDashboardPage.tsx`

**추가 import:**
```typescript
import { useAuthStore } from '@/stores/authStore'
```

**컴포넌트 내부에 추가:**
```typescript
const { currentFactory } = useAuthStore()
```

**useEffect 수정:** 의존성 배열에 `currentFactory` 추가

---

### 9단계: PMScheduleListPage.tsx

**파일:** `src/pages/pm/PMScheduleListPage.tsx`

**추가 import:**
```typescript
import { useAuthStore } from '@/stores/authStore'
```

**컴포넌트 내부에 추가:**
```typescript
const { currentFactory } = useAuthStore()
```

**주의:** 이 파일에는 두 개의 useEffect가 있음
- **첫 번째 useEffect (equipment types, technicians 로드)**: equipment_types는 전역 데이터이므로 `currentFactory` 의존성 **불필요** - 수정 안함
- **두 번째 useEffect (schedules 로드)**: PM 스케줄은 공장별 데이터이므로 `currentFactory` 의존성 **필요** - 수정함

---

### 10단계: PMCalendarPage.tsx

**파일:** `src/pages/pm/PMCalendarPage.tsx`

**추가 import:**
```typescript
import { useAuthStore } from '@/stores/authStore'
```

**컴포넌트 내부에 추가:**
```typescript
const { currentFactory } = useAuthStore()
```

**useEffect 수정:** 의존성 배열에 `currentFactory` 추가

---

### 11단계: PMTemplatesPage.tsx

**파일:** `src/pages/pm/PMTemplatesPage.tsx`

**추가 import:**
```typescript
import { useAuthStore } from '@/stores/authStore'
```

**컴포넌트 내부에 추가:**
```typescript
const { currentFactory } = useAuthStore()
```

**분석 결과:**
- **첫 번째 useEffect (line 120-123)**: `fetchData()` → `equipmentApi.getEquipmentTypes()` - **전역 데이터** (equipment_types는 공장과 무관) - 수정 **불필요**
- **두 번째 useEffect (line 125-128)**: `fetchTemplates()` → `pmApi.getTemplates()` - **공장별 데이터** (PM 템플릿은 공장별) - `currentFactory` 의존성 **필요**

**수정:**
```typescript
// 기존 (line 125-128)
useEffect(() => {
  fetchTemplates()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [equipmentTypeFilter])

// 수정
useEffect(() => {
  fetchTemplates()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [equipmentTypeFilter, currentFactory])
```

---

### 12단계: PMAnalyticsPage.tsx

**파일:** `src/pages/pm/PMAnalyticsPage.tsx`

**추가 import:**
```typescript
import { useAuthStore } from '@/stores/authStore'
```

**컴포넌트 내부에 추가:**
```typescript
const { currentFactory } = useAuthStore()
```

**useEffect 수정:** 의존성 배열에 `currentFactory` 추가

---

### 13단계: PaintDashboardPage.tsx

**파일:** `src/pages/paint/PaintDashboardPage.tsx`

**추가 import:**
```typescript
import { useAuthStore } from '@/stores/authStore'
```

**컴포넌트 내부에 추가:**
```typescript
const { currentFactory } = useAuthStore()
```

**useEffect 수정:** 의존성 배열에 `currentFactory` 추가

---

### 14단계: PaintScheduleListPage.tsx

**파일:** `src/pages/paint/PaintScheduleListPage.tsx`

**추가 import:**
```typescript
import { useAuthStore } from '@/stores/authStore'
```

**컴포넌트 내부에 추가:**
```typescript
const { currentFactory } = useAuthStore()
```

**주의:** PMScheduleListPage와 동일한 패턴
- **첫 번째 useEffect**: 전역 데이터 로드 - 수정 **불필요**
- **두 번째 useEffect**: 스케줄 로드 - `currentFactory` 의존성 **필요**

---

### 15단계: PaintCalendarPage.tsx

**파일:** `src/pages/paint/PaintCalendarPage.tsx`

**추가 import:**
```typescript
import { useAuthStore } from '@/stores/authStore'
```

**컴포넌트 내부에 추가:**
```typescript
const { currentFactory } = useAuthStore()
```

**useEffect 수정:** 의존성 배열에 `currentFactory` 추가

---

### 16단계: AIInsightPage.tsx

**파일:** `src/pages/ai/AIInsightPage.tsx`

**추가 import:**
```typescript
import { useAuthStore } from '@/stores/authStore'
```

**컴포넌트 내부에 추가:**
```typescript
const { currentFactory } = useAuthStore()
```

**useEffect 수정:** 의존성 배열에 `currentFactory` 추가

---

### 17단계: NotificationsPage.tsx

**파일:** `src/pages/NotificationsPage.tsx`

**추가 import:**
```typescript
import { useAuthStore } from '@/stores/authStore'
```

**컴포넌트 내부에 추가:**
```typescript
const { currentFactory } = useAuthStore()
```

**useEffect 수정:** 의존성 배열에 `currentFactory` 추가

---

### 18단계: ReportPage.tsx

**파일:** `src/pages/analytics/ReportPage.tsx`

**추가 import:**
```typescript
import { useAuthStore } from '@/stores/authStore'
```

**컴포넌트 내부에 추가:**
```typescript
const { currentFactory } = useAuthStore()
```

**useEffect 수정:** 의존성 배열에 `currentFactory` 추가

---

### 19단계: AnalyticsPage.tsx (기존 파일 수정)

**파일:** `src/pages/analytics/AnalyticsPage.tsx`

**현재 상태:**
- `currentFactory`가 이미 import 및 사용 중 (line 66)
- `fetchBuildings` useEffect에만 의존성으로 사용됨 (line 107)
- 메인 `fetchData` useEffect (line 151-155)에는 `currentFactory` 의존성 없음

**수정 필요:**
```typescript
// 기존 (line 151-155)
useEffect(() => {
  if (startDate && endDate) {
    fetchData()
  }
}, [fetchData, startDate, endDate])

// 수정
useEffect(() => {
  if (startDate && endDate) {
    fetchData()
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [startDate, endDate, currentFactory])
```

**이유:** API 호출 시점에 `getCurrentFactoryId()`가 store에서 `currentFactory`를 직접 읽으므로, useEffect에 `currentFactory` 의존성을 추가하면 공장 변경 시 `fetchData`가 재실행되어 새 공장 데이터를 가져옴.

---

## 제외 페이지 및 사유

### PartsPage.tsx - 제외
**파일:** `src/pages/parts/PartsPage.tsx`
**분석 결과:**
- `loadCategories()`: `fetchPartCategories()` - 별도 Supabase 인스턴스 (`partsSupabase`) 사용, 공장 필터 없음
- `loadParts()`: `fetchPartsWithInventory()` - 별도 Supabase 인스턴스 사용, 공장 필터 없음
**결론:** 부품 데이터는 **전역 데이터**로, 공장과 무관하게 동일한 데이터를 표시함. 수정 **불필요**.

### AIChatPage.tsx - 제외
**파일:** `src/pages/ai/AIChatPage.tsx`
**사유:** 이 페이지는 공장별 데이터를 로드하지 않음. 채팅 인터페이스로, 사용자 입력에 따라 AI API를 호출하며, 초기 데이터 로드가 없음. AI 백엔드는 API 호출 시점에 `currentFactory`를 참조하므로 수정 불필요.

### LoginPage.tsx - 제외
**사유:** 로그인 페이지는 인증 전이므로 공장 개념 없음

### ProfilePage.tsx - 제외
**사유:** 사용자 프로필은 공장과 무관

### Admin 페이지들 - 제외
- `UserManagementPage.tsx`: 사용자 관리는 공장과 무관 (전체 사용자 조회)
- `RolePermissionPage.tsx`: 권한 관리는 전역 설정
- `SettingsPage.tsx`: 시스템 설정은 전역
- `UserBulkUploadPage.tsx`: 사용자 일괄 업로드는 공장과 무관

### Detail/Execution 페이지들 - 제외
- `PMScheduleDetailPage.tsx`: ID 기반 조회
- `PMScheduleCreatePage.tsx`: 생성 페이지
- `PMExecutionPage.tsx`: ID 기반 실행
- `PaintScheduleDetailPage.tsx`: ID 기반 조회
- `PaintScheduleCreatePage.tsx`: 생성 페이지
- `PaintExecutionPage.tsx`: ID 기반 실행

---

## 수정 대상 파일 목록

### 필수 수정 (18개 파일)
- [ ] `src/pages/DashboardPage.tsx` - import 추가 + useEffect 수정
- [ ] `src/pages/equipment/EquipmentListPage.tsx` - import 추가 + useEffect 수정
- [ ] `src/pages/equipment/EquipmentMasterPage.tsx` - import 추가 + useEffect 수정
- [ ] `src/pages/equipment/EquipmentBulkUploadPage.tsx` - import 추가 + useEffect 수정
- [ ] `src/pages/maintenance/MaintenanceHistoryPage.tsx` - import 추가 + useEffect 수정
- [ ] `src/pages/maintenance/MaintenanceInputPage.tsx` - import 추가 + useEffect 수정
- [ ] `src/pages/maintenance/MaintenanceMonitorPage.tsx` - 기존 import 수정 + useEffect 수정
- [ ] `src/pages/pm/PMDashboardPage.tsx` - import 추가 + useEffect 수정
- [ ] `src/pages/pm/PMScheduleListPage.tsx` - import 추가 + 두 번째 useEffect만 수정
- [ ] `src/pages/pm/PMCalendarPage.tsx` - import 추가 + useEffect 수정
- [ ] `src/pages/pm/PMTemplatesPage.tsx` - import 추가 + 두 번째 useEffect만 수정
- [ ] `src/pages/pm/PMAnalyticsPage.tsx` - import 추가 + useEffect 수정
- [ ] `src/pages/paint/PaintDashboardPage.tsx` - import 추가 + useEffect 수정
- [ ] `src/pages/paint/PaintScheduleListPage.tsx` - import 추가 + 두 번째 useEffect만 수정
- [ ] `src/pages/paint/PaintCalendarPage.tsx` - import 추가 + useEffect 수정
- [ ] `src/pages/ai/AIInsightPage.tsx` - import 추가 + useEffect 수정
- [ ] `src/pages/NotificationsPage.tsx` - import 추가 + useEffect 수정
- [ ] `src/pages/analytics/ReportPage.tsx` - import 추가 + useEffect 수정
- [ ] `src/pages/analytics/AnalyticsPage.tsx` - 메인 fetchData useEffect에 currentFactory 추가

### 수정 불필요 (전역 데이터)
- `src/pages/parts/PartsPage.tsx` - 별도 Supabase 인스턴스 사용, 공장 필터 없음 (전역 데이터)

### 수정 불필요 (기타)
- `src/pages/ai/AIChatPage.tsx` - 공장별 데이터 로드 없음
- `src/pages/LoginPage.tsx` - 인증 전 페이지
- `src/pages/ProfilePage.tsx` - 공장과 무관
- `src/pages/admin/UserManagementPage.tsx` - 전역 사용자 관리
- `src/pages/admin/RolePermissionPage.tsx` - 전역 권한 관리
- `src/pages/admin/SettingsPage.tsx` - 전역 설정
- `src/pages/admin/UserBulkUploadPage.tsx` - 전역 사용자 업로드

### 수정 불필요 (Detail/Execution 페이지 6개)
- `src/pages/pm/PMScheduleDetailPage.tsx` - ID 기반
- `src/pages/pm/PMScheduleCreatePage.tsx` - 생성 페이지
- `src/pages/pm/PMExecutionPage.tsx` - ID 기반
- `src/pages/paint/PaintScheduleDetailPage.tsx` - ID 기반
- `src/pages/paint/PaintScheduleCreatePage.tsx` - 생성 페이지
- `src/pages/paint/PaintExecutionPage.tsx` - ID 기반

---

## 검증 방법

### 1. 빌드 검증
```bash
npm run build
```
- TypeScript 에러 없음 확인
- ESLint 경고 확인 (eslint-disable 주석으로 처리)

### 2. 수동 검증 시나리오

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 관리자로 로그인 | ALT 공장 선택됨 |
| 2 | Dashboard 페이지 확인 | ALT 공장 데이터 표시 |
| 3 | Factory Selector에서 ALV 선택 | 로딩 표시 후 ALV 데이터로 갱신 |
| 4 | Equipment List 페이지 이동 | ALV 장비 목록 표시 |
| 5 | ALT로 다시 전환 | 즉시 ALT 장비 목록으로 갱신 |
| 6 | Maintenance History 확인 | 선택된 공장의 정비 기록 표시 |
| 7 | PM Dashboard 확인 | 선택된 공장의 PM 일정 표시 |
| 8 | Analytics 페이지 확인 | 선택된 공장의 통계 표시 |
| 9 | Parts 페이지 확인 | 공장 변경과 무관하게 동일한 부품 목록 표시 (전역 데이터) |

### 3. 브라우저 개발자 도구 확인

**Network 탭:**
- 공장 전환 시 API 호출 발생 확인
- 호출된 API의 `factory_id` 파라미터 확인

**React DevTools:**
- `useAuthStore`의 `currentFactory` 값 변경 확인
- 각 페이지 컴포넌트의 리렌더링 확인

---

## 위험 요소 및 대응

| 위험 | 영향도 | 대응 |
|------|--------|------|
| useEffect 무한 루프 | HIGH | `currentFactory`만 의존성에 추가, fetchData는 제외 (eslint-disable 사용) |
| 공장 전환 중 API 호출 실패 | MEDIUM | 기존 에러 핸들링 유지, 로딩 상태 표시 |
| 빈 상태 깜빡임 | LOW | store.reset() 후 즉시 fetch 시작되므로 큰 문제 없음 |

---

## 커밋 전략

### Single Commit (권장)
```
feat: add factory change auto-refresh to all data pages

- Add currentFactory dependency to useEffect in 18 pages
- Pages now automatically reload data when factory is switched
- Excludes admin pages (global data), parts page (separate DB),
  and detail/execution pages (ID-based)

Affected pages:
- Dashboard, Equipment (List/Master/BulkUpload)
- Maintenance (History/Input/Monitor)
- PM (Dashboard/ScheduleList/Calendar/Templates/Analytics)
- Paint (Dashboard/ScheduleList/Calendar)
- AI Insight, Notifications, Report, Analytics
```

---

## 성공 기준

1. **기능적:** 공장 전환 시 모든 데이터 페이지가 자동으로 갱신됨
2. **성능적:** 불필요한 API 호출 없음, 로딩 상태 적절히 표시
3. **안정성:** 콘솔 에러 없음, 무한 루프 없음
4. **유지보수:** 일관된 패턴으로 향후 페이지 추가 시 가이드 제공
