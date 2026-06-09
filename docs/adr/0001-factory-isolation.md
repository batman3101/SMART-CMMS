# 0001 — 공장 격리(factory isolation): RLS + 클라이언트 seam + service-role 함수 스코프

## 맥락
멀티테넌트(공장별 `factory_id`) 격리가 필요하다. 실제 원격 DB는 **이미 26개 테이블 전부에 RLS가 활성**이고 마이그레이션 `update_rls_policies_factory_scoped` 등으로 **factory 스코프 RLS가 강제**되어 있다(헬퍼 `get_user_factory_id(auth.uid())` 기반). 즉 일반 authenticated 클라이언트 경로는 서버에서 격리된다.

> 참고: 이 ADR 초안은 한때 "RLS 부재"로 잘못 기술했다. 로컬 `supabase/migrations` 폴더가 원격과 동기화되지 않아(3개 파일) 생긴 오류이며, 본 문서에서 정정한다.

## 결정
격리를 **3중**으로 둔다.
1. **서버 RLS (진실의 원천)** — 이미 적용됨. authenticated 클라이언트의 모든 직접 쿼리를 factory로 격리.
2. **클라이언트 `scopedDb()` seam** — `src/lib/scopedDb.ts`. 구조적으로 factory 스코프를 강제하는 다층 방어(누락 방지) + 점진 이관 대상.
3. **service-role 엣지 함수의 명시적 스코프** — service-role 키는 **RLS를 우회**하므로, 엣지 함수는 `factory_id`를 **요청 body가 아니라 호출자 JWT에서 서버 도출**(body 신뢰 시 IDOR/테넌시 우회)해 모든 쿼리에 `.eq('factory_id', …)`를 적용해야 한다. (`ai-chat`은 본 작업에서 JWT 기반으로 수정. `ai-generate-insights`는 스코프는 하나 body 값을 신뢰하므로 동일 수정 권장.)

## 상태
- RLS: 적용됨(factory 스코프).
- `scopedDb`: 도입, equipment 읽기부터 점진 이관 중.
- 엣지 함수: `ai-chat` factory 스코프 수정(배포 대기). 나머지 service-role 함수 감사 권장.
- 추가 하드닝: `docs/SUPABASE_HARDENING.md` 참조(search_path, anon RPC 회수, RLS initplan, FK 인덱스).

## 비고
service-role을 쓰는 신규 엣지 함수/스크립트는 **반드시 factory_id로 명시 스코프**할 것. RLS에 의존할 수 없다(우회됨).
