# 0001 — 공장 격리(factory isolation)는 RLS로 강제한다

## 맥락
멀티테넌트(공장별 `factory_id`) 격리가 클라이언트 코드에 손으로 작성한 `.eq('factory_id', …)` 약 110곳에만 의존하고 있었다. Postgres RLS가 없어, 한 곳만 빠뜨려도(실제로 `ai-chat` 엣지 함수가 `factory_id`를 누락했었음) 공장 간 데이터 누수가 조용히 발생한다.

## 결정
- **클라이언트:** `scopedDb()` seam(`src/lib/scopedDb.ts`)을 도입해 스코프를 구조적으로 강제한다. 스코프 테이블은 자동으로 `factory_id`가 적용되고, 전역 테이블은 명시적 `.global`로만 접근한다 — 누락이 불가능해진다.
- **서버(별도 트랙):** 모든 테넌트 테이블에 Postgres RLS 정책으로 `factory_id` 격리를 강제한다. RLS가 진실의 원천이며, `scopedDb`는 그때까지의 단일 방어선이자 이후에도 쿼리 편의를 제공한다.

## 상태
- `scopedDb` seam: 도입됨(equipment 읽기부터 점진 이관 중, 잔여 ~100 호출 지점은 incremental).
- RLS 정책: **예정**(별도 작업). 현재 `supabase/migrations`에 RLS 정책 없음.

## 비고
RLS 적용 전까지 신규 데이터 접근은 반드시 `scopedDb()` 또는 의도적 `.global`을 거쳐야 한다. 직접 `getSupabase().from(...)`에 수동 `factory_id` 필터를 추가하는 패턴은 지양한다.
