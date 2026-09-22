# 대시보드 설비 상태 집계 수정 검증

- 브랜치: `fix/dashboard-equipment-status-counts`
- 검증일: 2026-09-22

## 원인과 수정

기존 상단 카드는 전체 설비에서 진행 중 수리 **기록 수**와 대기 설비 수만 차감했다. 원형 차트는 PM 실행과 도색 일정을 포함한 유효 설비 상태를 사용해 두 집계가 달랐다.

상단 카드와 원형 차트가 같은 상태 분포 응답을 사용하도록 통합했다. 가동 중은 `normal`, 도색 중은 `paint`, PM 중은 `pm`, 수리 중은 `repair + emergency` 설비 수다. 기존 상태 우선순위(긴급수리 > 수리 > PM > 도색)를 유지해 한 설비를 중복 집계하지 않는다. 긴급수리 알림은 기존의 당일 EM 기록 건수이며 설비 수 합계에 더하지 않는다.

도색·PM 카드를 추가하고 화면 너비별 2/3/6열 배치를 적용했다. 원형 차트의 겹치는 라벨은 줄바꿈 가능한 범례로 바꾸고 도색 번역을 적용했다. 공장 전환·새로고침 시 이전 데이터를 비우고, 오래된 응답을 무시하며, 집계 조회 실패 시 오류와 재시도 버튼을 표시한다.

## 변경 파일

- `src/lib/api.ts`: 유효 상태에 따른 카드 집계
- `src/types/index.ts`: PM·도색 수 및 상태 분포 응답 필드
- `src/pages/DashboardPage.tsx`: 카드, 범례, 조회 오류 및 요청 순서 처리
- `src/mock/data/statistics.ts`: mock 응답 계약 일치
- `src/i18n/locales/ko.json`, `vi.json`: 조회 오류 안내
- `src/lib/dashboard.test.ts`: 회귀 테스트 4개

## 검증 결과

- `npm test`: 3개 파일, 89개 테스트 통과
- `npm run build`: TypeScript 및 Vite 빌드 통과 (기존 큰 번들 / Browserslist 경고)
- 변경 TypeScript 파일 ESLint: 통과
- `git diff --check`: 통과
- 전체 ESLint: 기존 오류 2건, 경고 23건. `src/main.tsx:4`의 `no-prototype-builtins`, `supabase/functions/send-push-notification/index.ts:292`의 미사용 인자. HEAD에도 동일 코드가 있음을 확인했다.
- 독립 코드 검토: 최초 공장 전환 실패 시 이전 집계 잔존 지적을 수정, 최종 검토 No findings.

## Chromium 브라우저 검증

로컬 Vite 앱과 실제 집계 API 코드를 실행하되 Supabase HTTP 응답을 재현 데이터로 대체하고 테스트 로그인 상태를 주입했다. 운영 로그인·운영 DB·배포 검증은 아니다.

- 829대: 가동 813, 수리 4(긴급수리 포함), 도색 6, PM 6
- 동일 설비의 수리 기록이 중복되어도 설비 수 중복 집계 없음
- 새로고침, ALT/ALV 전환 및 요청의 공장 필터 확인
- 다른 공장 조회 실패 시 이전 카드 제거, 재시도 후 정상 복구
- 한국어·베트남어 카드 및 범례
- 화면 너비 390 / 768 / 1400 / 1920px
- JavaScript page error 0건. 의도적 조회 실패 시나리오의 HTTP 500 및 오류 로그는 예상 결과.

로컬 증거: `.omx/state/dashboard-status/`의 `browser-test.mjs`, `browser-results.json`, `desktop.png`, `mobile.png`, `mobile-vi.png`, `width-768.png`, `width-1920.png`, `ralph-progress.json`. 시각 검증 95/100, pass.

운영 배포와 DB 변경은 수행하지 않았다. 기존 미커밋 파일은 이번 변경에 포함하지 않았다.
