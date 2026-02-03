# 멀티 팩토리(ALT/ALV) 아키텍처 점검 결과 및 수정 계획

## 점검 요약

| 항목 | 상태 |
|------|------|
| 중앙 상태 관리 (authStore.currentFactory) | ✅ 정상 |
| API 계층 factory_id 필터 (api.ts, 90+지점) | ✅ 정상 |
| FactorySelector UI | ✅ 정상 |
| Realtime 구독 factory 필터 | ✅ 정상 |
| Store reset on factory switch | ⚠️ settingsStore 누락 |
| 페이지 데이터 re-fetch on factory switch | ❌ 20개 페이지 미대응 |
| Parts 페이지 (외부 DB) | ℹ️ 의도된 설계 (공용 부품 DB) |
| Mock API factory 지원 | ⚠️ 미구현 (낮은 우선순위) |

## 핵심 문제: 공장 전환 시 데이터 재조회 안됨

### 현재 동작
1. 사용자가 Header에서 공장 전환 (ALT → ALV)
2. `setCurrentFactory`가 equipment/maintenance/notification store를 `reset()` → 데이터 비워짐
3. **하지만** 20개 페이지가 `useEffect(() => { fetch() }, [])` 패턴 → mount 시에만 fetch
4. 공장 전환 후 빈 화면이 보이고, 새 공장 데이터는 페이지를 떠났다 다시 돌아와야 로드됨

### 대상 페이지 (20개)
- DashboardPage, EquipmentListPage, EquipmentMasterPage, EquipmentBulkUploadPage
- MaintenanceInputPage, MaintenanceMonitorPage
- AnalyticsPage, ReportPage
- AIInsightPage
- SettingsPage, UserManagementPage, RolePermissionPage
- PMDashboardPage, PMScheduleListPage, PMScheduleCreatePage, PMTemplatesPage, PMAnalyticsPage
- PaintDashboardPage, PaintScheduleListPage, PaintScheduleCreatePage

---

## 수정 계획

### Phase 1: 공장 전환 시 자동 데이터 재조회 (Critical)

**접근법**: `useEffect` 의존성에 `currentFactory`를 추가하여 공장 전환 시 자동 re-fetch

**수정 대상 파일 및 방법**:

각 페이지에서:
```typescript
// BEFORE
useEffect(() => {
  fetchData()
}, [])

// AFTER
const { currentFactory } = useAuthStore()
useEffect(() => {
  fetchData()
}, [currentFactory])
```

**파일 목록**:

| # | 파일 경로 | 변경 내용 |
|---|-----------|-----------|
| 1 | `src/pages/DashboardPage.tsx` | useAuthStore에서 currentFactory import, useEffect deps에 추가 |
| 2 | `src/pages/equipment/EquipmentListPage.tsx` | 동일 |
| 3 | `src/pages/equipment/EquipmentMasterPage.tsx` | 동일 |
| 4 | `src/pages/equipment/EquipmentBulkUploadPage.tsx` | 동일 |
| 5 | `src/pages/maintenance/MaintenanceInputPage.tsx` | 동일 (이미 useAuthStore import됨) |
| 6 | `src/pages/maintenance/MaintenanceMonitorPage.tsx` | 동일 (이미 useAuthStore import됨) |
| 7 | `src/pages/analytics/AnalyticsPage.tsx` | 동일 |
| 8 | `src/pages/analytics/ReportPage.tsx` | 동일 (이미 useAuthStore import됨) |
| 9 | `src/pages/ai/AIInsightPage.tsx` | 동일 |
| 10 | `src/pages/admin/SettingsPage.tsx` | 동일 (이미 useAuthStore import됨) |
| 11 | `src/pages/admin/UserManagementPage.tsx` | 동일 |
| 12 | `src/pages/admin/RolePermissionPage.tsx` | 동일 |
| 13 | `src/pages/pm/PMDashboardPage.tsx` | 동일 |
| 14 | `src/pages/pm/PMScheduleListPage.tsx` | 동일 |
| 15 | `src/pages/pm/PMScheduleCreatePage.tsx` | 동일 |
| 16 | `src/pages/pm/PMTemplatesPage.tsx` | 동일 |
| 17 | `src/pages/pm/PMAnalyticsPage.tsx` | 동일 |
| 18 | `src/pages/paint/PaintDashboardPage.tsx` | 동일 |
| 19 | `src/pages/paint/PaintScheduleListPage.tsx` | 동일 |
| 20 | `src/pages/paint/PaintScheduleCreatePage.tsx` | 동일 |

**리스크**: 낮음. 기존 mount fetch 동작은 유지되고, 공장 전환 시 추가 fetch만 발생.

### Phase 2: settingsStore reset 추가 (Medium)

**수정 파일**: `src/stores/authStore.ts`

```typescript
// Line 122-128: setCurrentFactory 함수
setCurrentFactory: (factory: FactoryId) => {
  set({ currentFactory: factory })
  useEquipmentStore.getState().reset()
  useMaintenanceStore.getState().reset()
  useNotificationStore.getState().reset()
  // 추가: settingsStore도 reset
  useSettingsStore.getState().reset()  // 또는 fetchSettings() 재호출
},
```

**확인 필요**: settingsStore에 `reset()` 메서드가 있는지, 없으면 추가해야 함.

**리스크**: 낮음. settings가 factory별이므로 전환 시 새로 로드하는 것이 올바른 동작.

### Phase 3: PartsPage 확인 (Low - 의도된 설계일 수 있음)

**현재 상태**: `src/pages/parts/PartsPage.tsx`는 별도 Supabase 클라이언트(`partsSupabase`)로 외부 부품 DB 접근. factory_id 필터 없음.

**판단**: 부품 마스터 데이터는 두 공장이 공유하는 공용 DB이므로 factory 필터가 불필요한 것이 의도된 설계로 보임. **수정 불필요**.

단, inventory(재고) 데이터가 공장별이어야 한다면 추후 factory_id 필터 추가 검토.

### Phase 4: Mock API factory 지원 (Low Priority)

**현재 상태**: 모든 mock API가 factory 파라미터를 무시.

**판단**: 프로덕션은 Supabase API를 사용하므로 mock은 개발 편의용. 당장 수정 불필요.

추후 필요시: mock 데이터에 `factory_id` 필드 추가 → mock API에서 `getCurrentFactoryId()`로 필터링.

---

## 수정 우선순위

| 순서 | Phase | 중요도 | 영향 범위 |
|------|-------|--------|-----------|
| 1 | Phase 1: useEffect deps 수정 | Critical | 20개 페이지 |
| 2 | Phase 2: settingsStore reset | Medium | authStore + settingsStore |
| 3 | Phase 3: PartsPage 확인 | Low | 확인만 |
| 4 | Phase 4: Mock API | Low | 개발 모드만 |

## 검증 방법

1. 로그인 후 1공장(ALT) 대시보드에서 데이터 확인
2. Header에서 2공장(ALV)으로 전환
3. 대시보드 데이터가 자동으로 ALV 데이터로 갱신되는지 확인
4. 각 페이지(설비관리, 수리관리, PM, 도색, 분석, AI인사이트)에서 동일 테스트
5. 다시 1공장(ALT)으로 전환 후 원래 데이터 복원 확인
6. 설정 페이지에서 factory별 설정이 올바르게 전환되는지 확인

## 예상 수정 범위

- 변경 파일: 21개 (20개 페이지 + 1개 store)
- 각 페이지 변경량: 2-3줄 (import 추가 + useEffect deps 수정)
- authStore 변경량: 1줄 추가
- 총 변경량: ~50줄
