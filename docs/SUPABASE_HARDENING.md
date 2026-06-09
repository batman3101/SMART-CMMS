# Supabase 보안·성능 하드닝 보고서 (2026-06-09)

아키텍처 심화(#2 데이터 접근 seam) 후속으로 실제 원격 Supabase 프로젝트를 점검한 결과와 조치. **프로덕션 반영(엣지 배포·DB 마이그레이션 적용)과 main 머지는 사용자 지시 시 진행(게이트).** 이 브랜치엔 산출물(코드·SQL·문서)만 커밋됨.

## 정정 — RLS는 이미 적용되어 있다
직전 ADR 초안의 "RLS 부재"는 **오류**였다(로컬 `supabase/migrations` 3개만 보고 단정). 실제 원격 DB는:
- **26개 public 테이블 전부 RLS 활성**, 마이그레이션 33개.
- `update_rls_policies_factory_scoped`, `add_factory_id_to_all_tables`, `create_factory_helper_functions_v2`(`get_user_factory_id`/`get_user_role`)로 **factory 스코프 RLS가 강제**됨.
- 따라서 일반 클라이언트(anon/authenticated 키) 경로는 RLS로 격리됨. `scopedDb`는 다층 방어(클라이언트)로서 여전히 유효.

**진짜 위험은 "RLS 없음"이 아니라 "service-role 엣지 함수가 RLS를 우회"** 한다는 것.

## 🔴 보안 — 수정 완료 (배포 대기)
| 항목 | 상태 | 산출물 |
|------|------|--------|
| **ai-chat 공장 간 누수** — service-role로 RLS 우회, `factory_id` 미적용 채 전 공장 데이터를 AI 컨텍스트에 노출 | ✅ 수정 | `supabase/functions/ai-chat/index.ts` — **호출자 JWT에서 사용자 인증 → 본인 `factory_id` 서버 도출**(body 미신뢰, IDOR 차단) + 모든 쿼리 `.eq('factory_id', …)` |
| `ai-generate-insights` — **동일 IDOR 소지** | ⚠️ 권장 | `factory_id`로 스코프하나 그 값을 **요청 body에서 신뢰** → 로그인 사용자가 타 공장 id 전달 시 탈취 가능. ai-chat과 **동일하게 JWT 도출**로 수정 권장(레포에 없어 download→수정→deploy 별도) |
| `send-notification`/`admin-user-management`/`notify-*` | ⏳ 감사 권장 | service-role 사용 시 동일 패턴 점검 필요 (이번엔 ai-* 중심 처리) |
| 함수 `search_path` 미설정 ×10 (0011) | ✅ 마이그레이션 | `20260609090001_security_hardening.sql` |
| SECURITY DEFINER 헬퍼 anon RPC 노출 (0028/0029) | ✅ 마이그레이션 | 동 파일 — `get_user_factory_id`/`get_user_role` anon EXECUTE 회수(authenticated는 RLS가 필요로 하므로 유지), `notify_long_repair` anon·authenticated 회수 |
| Auth 유출 비밀번호 보호 비활성 | ⏳ 대시보드 설정 | Supabase Auth 설정에서 토글(코드 아님) |

## 🟡 성능 — 마이그레이션 작성 (적용 대기)
| 항목 | 상태 | 산출물 |
|------|------|--------|
| `auth_rls_initplan` ×88 (정책이 행마다 `auth.*` 재평가) | ✅ 마이그레이션 | `20260609090003_optimize_rls_initplan.sql` — 88개 정책/24개 테이블, `auth.*`/헬퍼를 `(select …)`로 hoisting. 동작 동일, 대형 테이블(`notifications` 22만행 등) 성능 개선 |
| `unindexed_foreign_keys` ×4 | ✅ 마이그레이션 | `20260609090002_add_missing_fk_indexes.sql` |

## 🟢 권고 — 판단 필요 (자동 적용 안 함)
- **`unused_index` ×40 (INFO)** — 미사용 인덱스. 운영 트래픽 확인 후 선별 DROP 권장(섣부른 삭제 금지).
- **`multiple_permissive_policies` ×40 (WARN)** — `equipment_types`·`repair_types`·`role_permissions`·`user_push_settings` 등에서 동일 역할/액션에 다중 permissive 정책. 중복(예: `equipment_types`의 "read"와 "view") 통합 권장.
- **레포 동기화** — 원격엔 마이그레이션 33·엣지함수 7개인데 로컬은 일부만 존재. `supabase db pull` / `supabase functions download`로 레포를 프로덕션과 일치시키기 권장.

## ✅ 적용 완료 & 검증 (2026-06-09, 프로덕션 반영됨)
배포·마이그레이션을 프로덕션에 적용하고 `get_advisors`로 검증함. **main 머지는 별도 지시 대기.**

| 검증 항목 | 시작 | 적용 후 |
|------|------|---------|
| `ai-chat` 누수/IDOR | 취약 | **v16 배포** (JWT 신원 도출, body 미신뢰) ✅ |
| `function_search_path_mutable` | 10 | **0** ✅ |
| `anon` SECURITY DEFINER 실행(0028) | 3 | **0** ✅ |
| `auth_rls_initplan` | 88 | **0** ✅ |
| `unindexed_foreign_keys` | 4 | **0** ✅ |

**적용된 마이그레이션(원격 기록):** `security_hardening_search_path_and_anon_rpc` → `add_missing_fk_indexes` → `optimize_rls_initplan` → `restrict_security_definer_grants`(090001의 anon revoke 보정: PUBLIC revoke+authenticated grant) → `optimize_rls_initplan_v2`(090003 보정: 안쪽 `auth.uid()`까지 래핑).

**남은 항목(의도적/권고, 미해소가 정상):**
- `authenticated` SECURITY DEFINER 실행(0029) ×2 — `get_user_factory_id`/`get_user_role`. **RLS가 authenticated 컨텍스트에서 호출하므로 EXECUTE 유지가 정상**(수정 시 RLS 깨짐).
- 유출 비밀번호 보호 — **Supabase 대시보드 토글**(코드 아님, 직접).
- `unused_index` ×44(새 FK 인덱스 4개 포함, 곧 사용됨) · `multiple_permissive_policies` ×40 — INFO/권고, 운영 확인 후 선별.
- `ai-generate-insights` — 동일 body-신뢰 IDOR. 레포에 없어 별도 download→JWT 수정→deploy 권장.

## 잔여(다음 단계)
- **main 머지** (지시 시): `chore/supabase-factory-hardening` → main.
- 레포 동기화: `supabase db pull` / `supabase functions download`로 원격 33 마이그레이션·7 함수와 일치.
