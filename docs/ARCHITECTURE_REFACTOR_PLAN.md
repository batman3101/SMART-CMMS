# 아키텍처 심화(Deepening) 리팩토링 계획서

> 출처: `improve-codebase-architecture` 스킬(Matt Pocock) 아키텍처 리뷰 (2026-06-09)
> 리포트: `%TEMP%/architecture-review-20260609-ko.html`
> **진행 경로(확정): #2 → #1 → #3 → #4** (#5·#6·#7은 후순위 백로그)

## 자동 갱신 규칙

- 이 파일이 **진행 상황의 단일 소스(source of truth)** 입니다.
- Claude는 각 단계(Phase)를 완료할 때마다 **체크박스(`[ ]`→`[x]`)와 아래 대시보드를 자동 갱신**합니다.
- 상태 기호: ⬜ 대기 · 🟡 진행 중 · ✅ 완료 · ⛔ 보류/막힘
- 세션 내 라이브 추적용 네이티브 태스크 리스트와 후보·Phase 단위로 동기화됩니다.
- ⚠️ **현재 모드: 심화 탐색/설계 전용.** 사용자 지시에 따라 **P3(구현) 이후 코드 수정은 보류(⛔)** — 명시적 "구현 시작" 지시 전까지 소스 변경 없음.

---

## 📊 진행 현황 대시보드

| 순서 | 후보 | 강도 | P1 탐색 | P2 설계 | P3 구현 | P4 검증 | P5 정리 | 전체 |
|------|------|------|:--:|:--:|:--:|:--:|:--:|:--:|
| 1 | **#2 데이터 접근 seam** (`scopedDb` + 타입 에러) | 🟢 | ✅ | ✅ | ✅ | ✅(빌드) | 🟡 | ~90% |
| 2 | **#1 장비 읽기 경로 통합** | 🟢 | ✅ | ✅ | ✅ | ✅(빌드) | ✅ | 100% |
| 3 | **#3 얕은 스토어 심화/삭제** | 🟢 | ✅ | ✅ | ✅ | ✅(빌드) | 🟡 | ~85% |
| 4 | **#4 중복 sync 통합** | 🟢 | ✅ | ✅ | ✅ | ✅(빌드) | ✅ | 100% |

> ⛔ = 코드 수정 보류 중(사용자 대기). 설계 확정까지만 진행.

**Phase 정의**
- **P1 탐색(Grilling)** — 제약·의존성 분류·seam 위치 확정
- **P2 설계(Design It Twice)** — 후보 인터페이스 2~3개 비교 → 결정
- **P3 구현(Implement)** — 실제 리팩토링
- **P4 검증(Verify)** — `npm run build` / lint / 동작 확인
- **P5 정리(Cleanup)** — 얕은 모듈 삭제, `CONTEXT.md`/ADR 기록

---

## 후보 #2 — 데이터 접근 seam 심화 (`withFactory` + 타입 에러)

**대상:** `lib/api.ts:66-76`, 호출 지점 ×109, `lib/api.ts:2508`(ai-chat 누수), `lib/supabase.ts:42`
**의존성 분류:** in-process 로직 + Supabase 클라이언트(주입형) — 테스트는 fake 쿼리 빌더로 (실서버/가짜 어댑터 2개 → seam 정당화)

- [x] **P1 탐색** — 제약 조건·의존성 분류·seam 위치 확정 ✅
- [ ] 🟡 **P2 설계** — 인터페이스 후보 3종 제시 완료, **사용자 결정 대기 중**
- [ ] ⛔ **P3 구현** — (보류) 헬퍼 도입, 호출 지점 점진 이관, ai-chat factory_id 누수 수정
- [ ] ⛔ **P4 검증** — (보류) 빌드/타입체크 통과, factory 스코프 회귀 없음 확인
- [ ] ⛔ **P5 정리** — (보류) 중복 스코프/에러 처리 제거, 결정 사항 ADR 기록

**P1 탐색 결과 (확인된 사실):**
- ⚠️ **정정(2026-06-09):** RLS는 **이미 26개 테이블 전부 활성·factory 스코프**되어 있음(원격 마이그레이션 33개). 로컬 `supabase/migrations`가 3개뿐이라 초기에 "RLS 부재"로 오판했던 것. 실제 위험은 **service-role 엣지 함수가 RLS를 우회**(→ `ai-chat` 누수). 상세·조치: `docs/SUPABASE_HARDENING.md`.
- `.from(` **156회** vs 스코프 **110회** → 약 **46개 쿼리는 의도적 전역**(equipment_types·repair_types·factories 등). seam은 전역/스코프를 **명시 구분** 필요.
- 엣지 함수 **2개**: `ai-generate-insights`(factory_id 정상) · `ai-chat`(누락). 누수면 좁음.
- 별도 **parts DB**(`partsSupabase`, `resolveFactoryId(code)`)는 메인 DB(`getCurrentFactoryId()` UUID)와 스코프 의미가 다름 → seam에서 혼동 금지.
- 기존 `Result`/`DataError` 타입 없음 → 신규 도입.
- **의존성 분류:** 헬퍼는 in-process 로직 + 주입형 Supabase 빌더(가짜 빌더로 테스트, 어댑터 2개 → seam 정당화). RLS 포함 시 "remote but owned"(PGLite/branch 테스트).

**P2 설계 — 인터페이스 후보 3종 (Design It Twice):**
- **A. 최소 래퍼** `withFactory(query)` — 기계적 래핑. 블래스트 작음. 단 스코프가 여전히 opt-in → 누락 가능. 레버리지 낮음.
- **B. 스코프드 클라이언트** `scopedDb().from(...)` — 구조적 자동 스코프, 전역은 `.global` 명시 opt-out. **누락 불가능**, 레버리지 높음.
- **C. RLS 우선 + `Result<T,E>`** — DB에 격리(서버 진실), 클라이언트는 에러만 정규화. 누수 **진짜 불가능**. 단 RLS 부재 → 마이그레이션·정책 작성 필요(큰 작업).
- **권장: B+C 단계적 하이브리드** — 지금은 `scopedDb`(B)+타입 에러로 클라이언트 seam을 깔고 엣지 2개도 통과시켜 ai-chat 누수 차단, RLS(C)는 별도 트랙+ADR로 서버 보증.

**✅ P2 확정 설계 (2026-06-09 잠금):**
- [x] D1 seam 형태 → **B+C 하이브리드**: `scopedDb()` 클라이언트 + 서버 RLS 별도 트랙
- [x] D2 RLS 범위 → **별도 트랙 + ADR** (RLS는 일정 분리)
- [x] D3 에러 모델 → **`{data,error}` 봉투 유지 + error 타입화** (`DataError` 유니온)

**확정 구현 윤곽 (⛔ 보류 — "구현 시작" 승인 시 진행):**
- `scopedDb()` 프록시: 스코프 테이블 자동 `.eq('factory_id')`, 전역은 `.global` 명시 opt-out
- 엣지 함수 2개도 통과 → **ai-chat factory_id 누수 차단**
- `DataError` 유니온 도입, `{data, error}` 봉투는 유지(호출자 호환)
- 별도 트랙: Postgres RLS 정책 + ADR(`docs/adr/0001-factory-isolation.md`)

---

## 후보 #1 — 장비(Equipment) 읽기 경로 통합

**대상:** `lib/api.ts:182,163`, `hooks/useRealtimeSync.ts:24`, `pages/equipment/EquipmentListPage.tsx:98,183`, `stores/equipmentStore.ts`
**의존성 분류:** local-substitutable (#2의 seam 위에 올라감)

- [x] **P1 탐색** — 읽기 경로·effective status 소비 지점 매핑 완료 ✅
- [ ] 🟡 **P2 설계** — 정책/단일 읽기 형태, **사용자 결정 대기 중**
- [ ] ⛔ **P3 구현** — (보류) 단일 enriched 읽기로 통합, 이중 경로 제거
- [ ] ⛔ **P4 검증** — (보류) 목록/대시보드/마스터 상태 일치(parity) 확인
- [ ] ⛔ **P5 정리** — (보류) opt-in 플래그 제거, 도메인 용어 `CONTEXT.md` 반영

**P1 탐색 결과 (확인된 사실):**
- `getEquipments()` 호출 **11곳 중 effective status는 `EquipmentListPage` 1곳만**. 나머지(useRealtimeSync 25·174, reportGenerator 142, AnalyticsPage 94, ReportPage 97, EquipmentMasterPage 126·314, MaintenanceInputPage 124, Paint/PM 생성, store)는 원시 캐시 status.
- effective status 계산 **2곳 중복**: `getEquipments`(api.ts:198) + `getEquipmentStatusDistribution`(api.ts:940). 대시보드(DashboardPage:274)는 후자 사용.
- `fetchInProgressEquipmentSets` = in-progress 필터 쿼리 3개(소량) → 항상 enrich 비용 낮음.
- **의존성 분류:** local-substitutable, #2 `scopedDb` seam 위에 올라감.

**P2 설계 — 정책 후보:**
- **(a) 항상 enrich** — `getEquipments`가 늘 effective status 반환. 단순·정확, 호출마다 +3 소량 쿼리.
- **(b) 기본 enrich + 명시 opt-out** — 기본은 정확, 대량/성능 경로(Master·bulk)만 `{ raw: true }`. (권장)
- **(c) 캐시 기반 파생** — 모듈 캐시 + 운영 데이터에서 client 파생(추가 쿼리 0). 종착점이나 #3 캐시 필요.

**✅ P2 확정 설계 (2026-06-09 잠금):**
- [x] D1 정책 → **(b) 기본 enrich + 명시 opt-out** (#3 후 (c) 캐시 파생으로 진화)
- [x] D2 대시보드 통합 → **예, 단일 읽기에서 파생** (목록·대시보드 구조적 일치)

**확정 설계 윤곽 (⛔ 보류):**
- 단일 장비 읽기가 기본 effective status 반환, 대량 경로만 `{ raw: true }` opt-out
- `getEquipmentStatusDistribution`은 단일 읽기에서 파생(중복 `fetchInProgressEquipmentSets` 제거)
- realtime/store가 동일 enriched 읽기 사용 → 11곳 상태 일치

---

## 후보 #3 — 얕은 Zustand 스토어 심화 또는 삭제

**대상:** `stores/equipmentStore.ts`, `stores/maintenanceStore.ts` 외 5개
**의존성 분류:** in-process

- [x] **P1 탐색** — 서버상태 vs UI상태 스토어 구분, 노선 후보 확정 ✅
- [ ] 🟡 **P2 설계** — 심화 vs 삭제(쿼리 라이브러리) 노선, **사용자 결정 대기 중**
- [ ] ⛔ **P3 구현** — (보류) 선택 노선 적용, 페이지의 이중 소싱 제거
- [ ] ⛔ **P4 검증** — (보류) 컴포넌트 없이 테스트 가능성 확인
- [ ] ⛔ **P5 정리** — (보류) 얕은 스토어/우회 호출 삭제

**P1 탐색 결과 (확인된 사실):**
- **서버 상태 스토어**(얕음, 심화 대상): `equipmentStore`·`maintenanceStore` — 순수 배열 CRUD.
- **UI 상태 스토어**(정상, 유지): `themeStore`·`uiStore`·`settingsStore`·`notificationStore`(realtime 목록)·`authStore`(세션).
- #1 (c) 캐시 파생 종착점이 이 후보의 캐시 모듈에 의존.
- 노선 선택이 **#4(중복 sync)에 직접 영향** — 쿼리 라이브러리는 stale/focus/refetch를 흡수해 #4를 상당 부분 소멸시킴.

**P2 설계 — 노선 후보:**
- **X. 커스텀 심화** — equipment/maintenance 캐시 모듈이 fetch+effective+realtime 정합성을 작은 읽기 뒤에 소유. 신규 의존성 0, 기존 스택 유지, #4 sync 모듈과 통합.
- **Y. 쿼리 라이브러리 도입(TanStack Query 등)** — 얕은 서버상태 스토어 삭제, realtime은 쿼리 무효화로. **#3+#4 동시 해소**, 업계 표준·매우 깊음. 단 신규 의존성+이관 범위 큼.

**✅ P2 확정 설계 (2026-06-09 잠금):**
- [x] D1 노선 → **X. 커스텀 심화** (신규 의존성 0)

**확정 설계 윤곽 (⛔ 보류):**
- `equipmentStore`·`maintenanceStore`를 fetch+effective+realtime 정합성을 소유하는 캐시 모듈로 심화 (작은 `useEquipment()`/`useMaintenance()` 읽기)
- UI 상태 스토어(theme·ui·settings·notification·auth)는 그대로 유지
- 페이지의 이중 소싱 제거 → #1 (c) 캐시 파생 종착 가능
- **#4는 여전히 필요** — sync 모듈이 이 캐시 모듈을 갱신

---

## 후보 #4 — 중복 sync 통합

**대상:** `hooks/useRealtimeSync.ts:20,61,158`, `hooks/useDataSync.ts:57-96`, `hooks/useRealtimeSubscription.ts`
**의존성 분류:** in-process

- [x] **P1 탐색** — 실제 사용처/죽은 코드 식별 완료 ✅
- [ ] 🟡 **P2 설계** — 레지스트리 배치, **사용자 결정 대기 중**
- [ ] ⛔ **P3 구현** — (보류) 단일 `useSync` 유지, 죽은 훅 삭제, 매핑 seam화
- [ ] ⛔ **P4 검증** — (보류) 실시간/포커스 갱신 동작 확인
- [ ] ⛔ **P5 정리** — (보류) 중복/죽은 훅 삭제

**P1 탐색 결과 (확인된 사실):**
- 🔴 **실제 사용은 `useAppRealtime` 1곳뿐**(`MainLayout.tsx:14`). `useEquipmentRealtime`·`useMaintenanceRealtime`·`useNotificationRealtime`·`useDataSync`는 **죽은 코드**(미사용).
- `useAppRealtime`이 `useDataSync`의 focus/stale/online을 **재사용 않고 복붙**(203-242). 원본은 미호출.
- primitive: `useRealtimeSubscription`(단일, 죽은 훅들이 사용) + `useMultiTableRealtime`(useAppRealtime가 사용, 라이브).
- 모든 콜백이 `AnyRecord` 캐스팅 → 도메인 매핑이 컴포넌트 레벨에 노출.
- → **#4 = 단일 useSync 유지 + 죽은 훅 대거 삭제 + 매핑 seam화 + #3 캐시 연결.** 위험 낮음.

**P2 설계 — 레지스트리 배치 후보:**
- **중앙 레지스트리** — sync 모듈이 테이블 목록을 소유, onChange가 각 #3 캐시 모듈의 reconcile 호출. 구독 라이프사이클 1개.
- **모듈별 등록** — 각 캐시 모듈이 자기 테이블 sync를 등록. 응집 높지만 죽은 per-entity 훅 패턴 재현 위험.

**✅ P2 확정 설계 (2026-06-09 잠금):**
- [x] D1 레지스트리 → **중앙 레지스트리**

**확정 설계 윤곽 (⛔ 보류):**
- 단일 `useSync` = 정리된 `useAppRealtime`, 중앙 테이블 레지스트리 구동
- onChange가 #3 캐시 모듈(equipment/maintenance) reconcile 호출
- DB행→도메인 매핑 seam화(`AnyRecord` 노출 제거)
- 죽은 훅 삭제: `useEquipmentRealtime`·`useMaintenanceRealtime`·`useNotificationRealtime`·`useDataSync`(+미사용 primitive)

---

## 백로그 (이번 경로 외)

- **#5** `equipmentStatus` 모듈 (derive+color+label 통합) — 탐색 가치
- **#6** 권한 모듈 `can(user, action)` — 탐색 가치
- **#7** 문서 생성 seam (Excel/PDF 라벨 공유) — 실험적

---

## 🛠 구현 결과 (2026-06-09)

**빌드 검증:** `npm run build` ✅ (tsc + vite, exit 0) · 런타임 구동 테스트는 사용자 담당.

**완료:**
- **#2**: `src/lib/scopedDb.ts`(구조적 공장 스코프) + `src/lib/dataErrors.ts`(`DataError`) 도입, **ai-chat `factory_id` 누수 수정**, equipment 읽기(`getEquipments`/`getEquipmentById`)를 scopedDb로 이관.
- **#1**: `getEquipments` 기본 effective status + `{raw:true}` opt-out(Master), 대시보드 분포를 단일 읽기에서 파생.
- **#3**: `src/data/useEquipmentData.ts` 캐시 훅 도입, `EquipmentListPage`를 공유 캐시로 연결(이중 소싱 제거, 실시간 반영).
- **#4**: `useDataSync.ts` 삭제, `useRealtimeSync.ts`의 죽은 per-entity 훅 3개 제거, 장비 realtime UPDATE를 enriched 리로드로.

**잔여 (incremental — 빌드 영향 없음):**
- #2: 나머지 ~100개 수동 `factory_id` 호출 지점의 scopedDb 점진 이관. (RLS는 이미 적용됨 — 별도 Supabase 하드닝은 `docs/SUPABASE_HARDENING.md`: ai-chat 누수 수정·search_path·RLS initplan·FK 인덱스, 적용/머지 게이트.)
- #3: maintenance 캐시 훅 + 나머지 equipment 페이지(Analytics/Report/MaintenanceInput 등) 점진 연결.

_마지막 갱신: 2026-06-09 · 구현(P3) 완료·빌드 그린 → 커밋/푸시/머지 진행._
