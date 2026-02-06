# Multi-Factory Equipment Isolation - 점검 및 수정 계획 (v2)

## 요약
1공장(ALT)과 2공장(ALV) 간 데이터 완전 격리를 보장하기 위해, 동일한 설비 코드(equipment_code)가 서로 다른 공장에 등록될 수 있도록 코드베이스의 문제점을 식별하고 수정한다.

## 현재 상태 분석

### 정상 작동하는 부분 (factory_id 필터링 완료)
| 영역 | 파일 | 상태 |
|------|------|------|
| Equipment CRUD (Supabase API) | `src/lib/api.ts:88-194` | ✅ 모든 쿼리에 factory_id 필터 |
| Maintenance CRUD | `src/lib/api.ts:306-472` | ✅ 모든 쿼리에 factory_id 필터 |
| Users 목록/생성/비활성화 | `src/lib/api.ts:478-662` | ✅ factory_id 필터 |
| Dashboard Statistics | `src/lib/api.ts:741-780` | ✅ factory_id 필터 |
| Analytics (Failure Rank, Distribution) | `src/lib/api.ts:782-970` | ✅ factory_id 필터 |
| Factory Switch → Store Reset | `src/stores/authStore.ts` | ✅ 공장 변경 시 모든 store 리셋 |
| EquipmentMasterPage 데이터 재로드 | `src/pages/equipment/EquipmentMasterPage.tsx:138` | ✅ currentFactory 변경 시 재로드 |

### 발견된 문제점 (우선순위 순)

#### 문제 1: [CRITICAL] Supabase DB - equipment_code UNIQUE 제약조건
- **상황**: DB에 `UNIQUE(equipment_code)` 제약조건이 있을 가능성 높음
- **근거**: Mock API(`src/mock/api/equipments.ts:218`)에서 글로벌 중복 검사 → 원래 설계가 equipment_code를 전역 고유로 가정
- **영향**: 2공장에서 1공장과 동일한 equipment_code 등록 시 DB 에러 발생
- **수정**: `UNIQUE(equipment_code)` → `UNIQUE(equipment_code, factory_id)` 변경

#### 문제 2: [HIGH] EquipmentMasterPage - building 드롭다운 부트스트랩 문제
- **파일**: `src/pages/equipment/EquipmentMasterPage.tsx:114-117, 789-801`
- **문제**: building 목록이 현재 조회된 설비에서 `useMemo`로 추출됨. 2공장에 설비 0건이면 드롭다운 비어있음
- **데드락**: building 없이 설비 등록 불가 → 설비 없이 building 생성 불가
- **영향**: 2공장 최초 설비 등록 완전 차단

#### 문제 3: [MEDIUM] Equipment 타입에 factory_id 미포함
- **파일**: `src/types/index.ts:99-115`
- **문제**: `Equipment` 인터페이스에 `factory_id` 필드 없음
- **영향**: DB에서 반환된 Equipment 객체에 factory_id가 있으나 TypeScript가 인식 못함

#### 문제 4: [LOW] Mock API - factory_id 필터링 미적용
- **파일**: `src/mock/api/equipments.ts`, `src/mock/api/users.ts`
- **문제**: Mock API 전체에 factory_id 필터링 없음
- **영향**: 운영 환경은 Supabase API(`src/lib/api.ts`) 사용하므로 영향 없음. 개발/테스트 환경에서만 해당

## 수정 계획

### Step 1: [CRITICAL] Supabase DB UNIQUE constraint 확인 및 수정
- **작업**: Supabase MCP 도구로 현재 equipments 테이블 제약조건 확인
- **SQL 확인**:
  ```sql
  SELECT conname, pg_get_constraintdef(oid)
  FROM pg_constraint
  WHERE conrelid = 'equipments'::regclass;
  ```
- **수정 (필요 시)**:
  ```sql
  ALTER TABLE equipments DROP CONSTRAINT <constraint_name>;
  ALTER TABLE equipments ADD CONSTRAINT equipments_code_factory_unique
    UNIQUE(equipment_code, factory_id);
  ```
- **안전성**: 현재 1공장(ALT) 데이터만 존재하므로 충돌 없음
- **이 단계가 선행되어야 하는 이유**: 코드 수정 없이도 이 constraint가 핵심 차단 요인

### Step 2: [HIGH] EquipmentMasterPage - building 입력을 Combobox로 변경
- **파일**: `src/pages/equipment/EquipmentMasterPage.tsx:789-801`
- **변경 내용**:
  - building `<Select>` → `<Input>` + `<datalist>` (combobox 패턴)으로 변경
  - 기존 building 목록이 있으면 자동완성 제안으로 표시
  - 비어있을 때도 직접 입력 가능 (예: 'A동', 'B동')
- **변경 범위**: EquipmentMasterPage.tsx 1개 파일의 폼 JSX만 수정
- **EquipmentListPage, AnalyticsPage의 building 필터 드롭다운**: 필터용이므로 수정 불필요 (설비가 등록되면 자연스럽게 채워짐)

### Step 3: [MEDIUM] Equipment 인터페이스에 factory_id 추가
- **파일**: `src/types/index.ts:99-115`
- **변경**: `factory_id?: string` (optional) 추가
- **optional인 이유**:
  1. API 레이어(`src/lib/api.ts:148`)가 `getCurrentFactoryId()`로 자동 주입
  2. 폼 데이터 구성 시(`EquipmentMasterPage.tsx:267`) factory_id를 포함하지 않음
  3. DB에서 반환될 때는 항상 포함되나, 생성 시에는 API 레이어가 처리
  4. required로 하면 최소 3개 파일에서 컴파일 에러 발생

### Step 4: [LOW] Mock API factory_id 필터링 (선택적 - 운영 비영향)
- **결정**: 실제 운영은 Supabase 사용. Mock API 수정은 스킵
- **이유**: Architect 분석 결과, 모든 활성 페이지가 `src/lib/api.ts` (unified API)를 사용하며 factory_id 필터링 완료

## 수용 기준 (Acceptance Criteria)
1. 2공장(ALV)에서 1공장(ALT)과 동일한 equipment_code(예: CNC-001)로 설비 등록 가능
2. 공장 전환 시 해당 공장의 설비만 목록에 표시
3. 2공장 최초 설비 등록 시 building 직접 입력 가능
4. Equipment TypeScript 인터페이스에 factory_id 포함
5. 빌드 에러 없음 (`npm run build` 통과)

## 리스크 및 완화
| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| DB unique constraint 변경 시 기존 데이터 영향 | LOW | 현재 1공장 데이터만 있으므로 충돌 없음 |
| Equipment 타입 변경에 따른 타입 에러 | NONE | optional 필드(`?`)로 추가하여 기존 코드 100% 호환 |
| Building combobox로 변경 시 잘못된 값 입력 | LOW | 기존 building이 자동완성으로 제안되어 오타 최소화 |

## 검증 절차
1. DB constraint 확인 SQL 실행
2. `npm run build` 빌드 확인
3. 2공장 전환 → building 직접 입력하여 설비 등록 테스트
4. 1공장 전환 → 2공장 설비가 보이지 않는지 확인
5. 1공장에서 동일 코드 설비가 정상 표시되는지 확인
