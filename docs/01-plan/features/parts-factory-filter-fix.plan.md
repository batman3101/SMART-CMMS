# PDCA Plan: 부품 재고 공장 필터링 수정

## 1. 문제 정의

### 현상
- 부품 정보 페이지에서 **모든 부품의 현재 재고가 0으로 표시**됨
- 1공장(ALT) 선택 시에도 재고가 0, 2공장(ALV) 선택 시에도 재고가 0

### 근본 원인
- **타입 불일치**: SMART-CMMS 앱의 `currentFactory`는 문자열 코드(`'ALT'`, `'ALV'`)를 사용
- 부품 DB(Supabase)의 `inventory.factory_id`는 **UUID** 타입
- `.eq('factory_id', 'ALT')` → UUID 컬럼에 문자열 'ALT'로 필터링하여 **항상 0건 반환**

### DB 실제 데이터
| factory_code | factory_id (UUID) | inventory 건수 |
|---|---|---|
| ALT (1공장) | `9659a391-cabe-4097-a79a-969577dc7dbb` | 921건 |
| ALV (2공장) | `5be40141-9688-4187-97d8-343716ce783e` | 0건 |

## 2. 영향 범위

### 영향받는 파일
| 파일 | 함수 | 문제 |
|---|---|---|
| `src/lib/supabase.ts` | `fetchPartsWithInventory()` | factory_code → UUID 변환 없음 |
| `src/lib/supabase.ts` | `getPartWithInventory()` | factory_id 필터링 자체 없음 |
| `src/lib/supabase.ts` | `getPartInventory()` | factory_id 필터링 자체 없음 |
| `src/pages/parts/PartsPage.tsx` | `loadParts()` | factory_code를 직접 전달 |
| `src/pages/maintenance/MaintenanceInputPage.tsx` | 부품 검색 | factory 필터 없이 재고 조회 |

## 3. 수정 계획

### Step 1: Factory Code → UUID 변환 헬퍼 추가 (`src/lib/supabase.ts`)
- `resolveFactoryId(factoryCode: string)` 함수 추가
- `factories` 테이블에서 `factory_code`로 `factory_id` UUID 조회
- 결과 캐싱 (Map)으로 반복 DB 호출 방지

### Step 2: `fetchPartsWithInventory()` 수정
- `factoryId` 파라미터를 factory_code로 받되, 내부에서 UUID로 변환 후 쿼리
- `resolveFactoryId()` 호출하여 UUID 획득 후 `.eq('factory_id', uuid)` 적용

### Step 3: `getPartWithInventory()` 수정
- `factoryCode` 파라미터 추가
- inventory 조회 시 factory_id 필터 추가 (공장별 재고 분리)

### Step 4: `getPartInventory()` 수정
- `factoryCode` 파라미터 추가
- 해당 공장의 재고만 반환하도록 필터 추가

### Step 5: MaintenanceInputPage 수정
- 부품 재고 조회 시 `currentFactory`를 함께 전달

### Step 6: 빌드 검증
- `npm run build` 통과 확인

## 4. 기대 효과
- 1공장(ALT) 선택 시 921건의 실제 재고 데이터 표시
- 2공장(ALV) 선택 시 해당 공장 재고만 표시
- 공장 간 데이터 격리 완벽 보장
- 정비 입력 시에도 해당 공장의 부품 재고만 표시

## 5. 리스크
- `factories` 테이블 조회 추가로 약간의 네트워크 요청 증가 → 캐싱으로 최소화
- 기존 코드의 `factoryId` 파라미터명은 유지하되 내부 동작만 변경
