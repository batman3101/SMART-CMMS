# CNC 설비 메인테넌스 관리 시스템 기획문서 (PRD)

---

## 문서 정보

| 항목 | 내용 |
|------|------|
| 프로젝트명 | AMMS (ALMUS Maintenance Management System) |
| 버전 | 2.0 |
| 작성일 | 2025년 1월 |
| 최종 수정일 | 2025년 11월 29일 |
| 대상 공장 | 베트남 박닌 공장 |
| 대상 사용자 | 유지보수 담당자 (한국인/베트남인) |

---

## 1. 프로젝트 개요

### 1.1 배경 및 필요성

베트남 박닌 공장에서 스마트폰 알루미늄 프레임 가공을 위해 운영 중인 800대의 CNC 설비와 다수의 부대설비에 대한 체계적인 유지보수 관리 시스템이 필요합니다.

**현재 문제점:**
- 수기 또는 엑셀 기반의 비효율적인 유지보수 기록 관리
- 설비 상태의 실시간 파악 어려움
- 유지보수 데이터 분석 및 예측 불가
- 한국인-베트남인 간 언어 장벽으로 인한 소통 문제

**기대 효과:**
- 실시간 설비 상태 모니터링
- 데이터 기반 의사결정 지원
- 예지보전을 통한 다운타임 최소화
- 다국어 지원으로 원활한 협업

### 1.2 목표

1. 모든 생산설비의 유지보수 이력 통합 관리
2. 실시간 설비 상태 모니터링 대시보드 구축
3. AI 기반 인사이트 제공으로 예지보전 실현
4. 한국어/베트남어 다국어 지원

---

## 2. 대상 설비 현황

### 2.1 메인 설비 (MAIN)

| 설비 유형 | 수량 | 설비번호 체계 | 비고 |
|-----------|------|---------------|------|
| CNC 밀링 머신 | 800대 | CNC-001 ~ CNC-800 | 주력 생산설비 |
| 초음파 클리닝 | 3대 | CL-001 ~ CL-003 | 세척공정 |
| 디버링 설비 | 5대 | DBR-001 ~ DBR-005 | 버 제거공정 |
| TRI 라인 | 2개 | TRI-001 ~ TRI-002 | 검사공정 |

### 2.2 서브 설비 (SUB)

| 설비 유형 | 설비번호 체계 | 비고 |
|-----------|---------------|------|
| 스크랩 압축기 | SUB-SCRAP-XXX | 폐기물 처리 |
| 콤프레셔 | SUB-COMP-XXX | 공압 공급 |
| 아버 히팅기 | SUB-HEAT-XXX | 공구 탈착 |
| 칩 컨베이어 | SUB-CONV-XXX | 칩 이송 |
| 쿨런트 탱크 | SUB-COOL-XXX | 절삭유 공급 |
| 기타 | SUB-ETC-XXX | 추가 등록 가능 |

> 참고: 서브설비는 엑셀 일괄 등록 기능을 통해 유연하게 추가 가능

---

## 3. 수리 유형 분류

### 3.1 기본 수리 유형

| 코드 | 수리 유형 | 설명 | 우선순위 |
|------|-----------|------|----------|
| PM | 정기 유지보수 | 계획된 예방정비 | 보통 |
| BR | 고장수리 | 설비 고장 발생 시 수리 | 높음 |
| PD | 예지보전 | 데이터 기반 사전 정비 | 보통 |
| QA | 제품불량 | 품질 이슈로 인한 설비 점검 | 높음 |
| EM | 긴급수리 | 즉각 대응 필요한 긴급 상황 | 최고 |

### 3.2 확장 가능 구조

- 관리자가 설정 페이지에서 수리 유형 추가/수정/삭제 가능
- 각 수리 유형별 색상 코드 지정 가능
- 우선순위 레벨 설정 가능

---

## 4. 기능 요구사항

### 4.1 페이지 구성

```
AMMS 시스템 구조
├── 로그인 페이지
├── 대시보드 (메인)
├── 설비관리
│   ├── 설비 현황 조회
│   ├── 설비 마스터 관리
│   └── 설비 일괄 등록 (엑셀)
├── 수리관리
│   ├── 수리 실적 입력
│   ├── 수리 이력 조회
│   └── 수리 현황 모니터링
├── 분석
│   ├── 통계 분석
│   └── 리포트 생성
├── AI 인사이트
│   ├── 자동 인사이트
│   └── AI 질의응답
├── 관리
│   ├── 사용자 관리
│   └── 시스템 설정
└── 내 정보
```

---

### 4.2 상세 기능 명세

#### 4.2.1 로그인 페이지

**기능:**
- 사용자 인증 (아이디/비밀번호)
- 언어 선택 (한국어/베트남어)
- 비밀번호 찾기
- 자동 로그인 (선택)

**권한 레벨:**

| 레벨 | 역할 | 권한 범위 |
|------|------|-----------|
| 1 | 관리자 | 모든 기능 접근, 사용자 관리 |
| 2 | 슈퍼바이저 | 분석, 리포트, 수리 승인 |
| 3 | 테크니션 | 수리 실적 입력, 조회 |
| 4 | 뷰어 | 조회 전용 |

---

#### 4.2.2 대시보드

**실시간 현황 카드:**
- 전체 설비 수 / 가동 중 / 수리 중 / 대기
- 금일 수리 건수 / 완료 건수
- 긴급수리 알림 (깜박임 효과)

**차트 구성:**
- 설비 상태 분포 (도넛 차트)
- 수리 유형별 현황 (막대 차트)
- 최근 7일 수리 추이 (라인 차트)
- 설비별 고장 빈도 TOP 10 (가로 막대)

**빠른 액션:**
- 수리 시작 버튼
- 긴급수리 등록 버튼
- 최근 수리 목록 (5건)

**알림 영역:**
- PM 예정 설비 알림
- 장시간 수리 중 설비 경고
- AI 인사이트 요약

---

#### 4.2.3 설비 현황 관리

**설비 목록 조회:**
- 필터: 설비유형, 상태, 라인, 검색어
- 정렬: 설비번호, 최근수리일, 고장횟수
- 뷰 모드: 테이블뷰 / 카드뷰 / 레이아웃뷰

**설비 상태 구분:**

| 상태 | 색상 | 설명 |
|------|------|------|
| 정상 | 초록 | 가동 가능 상태 |
| PM 중 | 파랑 | 정기 유지보수 진행 |
| 수리 중 | 노랑 | 일반 수리 진행 |
| 긴급수리 | 빨강 | 긴급수리 진행 |
| 대기 | 회색 | 미가동 상태 |

**설비 마스터 관리:**
- 설비 등록/수정/삭제
- 설비 기본정보: 설비번호, 설비명, 설비유형, 설치일, 제조사, 모델명
- 설비 위치정보: 공장, 라인, 구역
- 설비 사양정보: 스핀들 타입, 축 수, 최대 RPM 등

**엑셀 일괄 등록:**
- 템플릿 다운로드 기능
- 엑셀 파일 업로드
- 데이터 유효성 검사
- 미리보기 후 확정 등록
- 등록 결과 리포트 (성공/실패 건수)

---

#### 4.2.4 수리 실적 입력

**입력 필드:**

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| 날짜 | Date | O | 수리 일자 (기본값: 오늘) |
| 작업 담당자 | Select | O | 로그인 사용자 자동 선택 |
| 설비 유형 | Select | O | MAIN/SUB 선택 |
| 설비 번호 | Select | O | 설비번호 검색/선택 |
| 수리 유형 | Select | O | PM/고장수리/예지보전/제품불량/긴급수리 |
| 증상 설명 | Textarea | - | 고장 증상 또는 점검 내용 |
| 사용 부품 | Multi-Input | - | 부품코드 입력 (복수 가능) |
| 수리 시작시간 | DateTime | O | 수리 시작 시점 |
| 수리 완료시간 | DateTime | - | 수리 완료 시점 |
| 수리 내용 | Textarea | - | 수행한 수리 작업 상세 |
| 완료 평점 | Rating | - | 1~10점 (완료 시 필수) |
| 첨부 사진 | File | - | 수리 전/후 사진 (최대 5장) |

**수리 프로세스 흐름:**

```
[수리 시작 등록]
      |
      v
설비 상태 변경 --> 해당 수리유형 상태로 자동 변환
(정상 -> 수리중)
      |
      v
[수리 작업 진행]
      |
      v
[수리 완료 등록]
      |
      v
설비 상태 변경 --> 정상 상태로 자동 복귀
(수리중 -> 정상)
      |
      v
[완료 평점 입력]
```

**부품코드 입력:**
- 기존 부품관리 앱에서 코드 복사하여 붙여넣기
- 복수 부품 입력 가능 (태그 형태)
- 부품코드 자동완성 기능 (향후 연동 시)

---

#### 4.2.5 수리 이력 조회

**조회 필터:**
- 기간 선택 (시작일 ~ 종료일)
- 설비 유형
- 설비 번호
- 수리 유형
- 담당자
- 상태 (진행중/완료)

**목록 표시 정보:**
- 수리번호 (자동생성)
- 설비번호
- 수리유형
- 담당자
- 시작시간 ~ 완료시간
- 소요시간 (자동계산)
- 상태
- 평점

**상세보기:**
- 전체 입력 정보 조회
- 첨부 사진 뷰어
- 수정 기능 (권한에 따라)
- 삭제 기능 (관리자만)

---

#### 4.2.6 분석 페이지

**추천 분석 항목:**

| 분석 항목 | 설명 | 차트 유형 |
|-----------|------|-----------|
| 설비별 고장 빈도 | 설비별 고장 횟수 순위 | 가로 막대 |
| 수리유형별 분포 | 수리유형 비율 분석 | 파이/도넛 |
| 월별 수리 추이 | 월간 수리 건수 트렌드 | 라인 |
| MTBF | 평균 고장 간격 시간 | KPI 카드 |
| MTTR | 평균 수리 시간 | KPI 카드 |
| 설비 가동률 | 설비별 가동률 현황 | 히트맵 |
| 담당자별 실적 | 담당자별 수리 건수/시간 | 테이블 |
| 부품 사용 현황 | 자주 사용되는 부품 TOP | 막대 |
| 시간대별 고장 분포 | 고장 발생 시간대 패턴 | 히트맵 |
| 요일별 고장 패턴 | 요일별 고장 발생 추이 | 막대 |

**리포트 기능:**
- 일간/주간/월간 리포트 자동생성
- PDF 다운로드
- 이메일 발송 (예약 가능)

---

#### 4.2.7 AI 인사이트 페이지

**자동 인사이트 (2시간마다 갱신):**

분석 내용:
- 이상 패턴 감지: 평소보다 고장이 많은 설비 알림
- 예지보전 추천: 고장 가능성 높은 설비 사전 경고
- 효율성 분석: 수리 시간이 긴 케이스 분석
- 부품 소모 예측: 부품 교체 주기 예측
- 트렌드 분석: 주요 지표 변화 추이

**AI 질의응답:**
- 자연어로 질문 입력
- 데이터 기반 답변 생성
- 예시 질문 제공

질문 예시:
- "이번 주 가장 많이 고장난 설비는?"
- "CNC-001 설비의 최근 수리 이력 알려줘"
- "PM 일정이 다가오는 설비 목록"
- "평균 수리 시간이 가장 긴 수리 유형은?"

**기술 스택:**
- Google Gemini API (무료 티어)
- 2시간마다 자동 분석 실행 (Cron Job)
- 인사이트 결과 DB 저장

---

#### 4.2.8 사용자 관리 페이지

**사용자 목록:**
- 사번
- 이름 (한국어/베트남어)
- 부서
- 직책
- 권한 레벨
- 상태 (활성/비활성)
- 최종 로그인

**사용자 CRUD:**
- 등록: 기본정보 + 권한 설정
- 수정: 정보 변경, 비밀번호 초기화
- 삭제: 비활성화 처리 (데이터 보존)
- 권한 변경: 역할 레벨 조정

**접근 로그:**
- 로그인/로그아웃 기록
- 주요 액션 로그 (수리등록, 설정변경 등)

---

#### 4.2.9 설정 페이지

**설정 항목:**

| 구분 | 설정 항목 | 설명 |
|------|-----------|------|
| 일반 | 시스템명 | 앱 타이틀 설정 |
| 일반 | 기본 언어 | 한국어/베트남어 |
| 일반 | 타임존 | Asia/Ho_Chi_Minh |
| 설비 | 설비유형 관리 | 설비유형 CRUD |
| 설비 | 상태값 관리 | 상태명, 색상 설정 |
| 수리 | 수리유형 관리 | 수리유형 CRUD |
| 수리 | 평점 기준 | 평점 척도 설정 |
| 알림 | 알림 설정 | 긴급수리 알림 ON/OFF |
| 알림 | 장시간 수리 기준 | N시간 이상 시 경고 |
| AI | API Key | Google API Key 설정 |
| AI | 갱신 주기 | 인사이트 갱신 간격 |
| 백업 | 자동 백업 | 백업 주기 설정 |

---

## 5. 기술 스택

### 5.1 프론트엔드

| 항목 | 기술 | 비고 |
|------|------|------|
| 프레임워크 | React 18 + Vite | 빠른 개발 환경 |
| 언어 | TypeScript | 타입 안정성 |
| 상태관리 | Zustand | 경량 상태관리 |
| UI 라이브러리 | shadcn/ui + Tailwind CSS | 모던 UI |
| 차트 | Recharts | 데이터 시각화 |
| 다국어 | i18next + react-i18next | 한국어/베트남어 |
| 폼 관리 | React Hook Form + Zod | 유효성 검사 |
| 라우팅 | React Router v6 | SPA 라우팅 |
| HTTP | Axios 또는 Fetch | API 통신 |
| 날짜 | date-fns | 날짜 처리 |

### 5.2 백엔드

| 항목 | 기술 | 비고 |
|------|------|------|
| BaaS | Supabase | 서버리스 백엔드 |
| 인증 | Supabase Auth | 사용자 인증 |
| 데이터베이스 | PostgreSQL (Supabase) | 관계형 DB |
| 스토리지 | Supabase Storage | 이미지 저장 |
| 실시간 | Supabase Realtime | 실시간 업데이트 |
| Edge Functions | Supabase Edge Functions | 서버리스 함수 |

### 5.3 AI/분석

| 항목 | 기술 | 비고 |
|------|------|------|
| AI API | Google Gemini API | 무료 티어 사용 |
| 스케줄러 | Supabase pg_cron | 정기 작업 |

### 5.4 배포/운영

| 항목 | 기술 | 비고 |
|------|------|------|
| 호스팅 | Vercel | 프론트엔드 배포 |
| 도메인 | Vercel 기본 도메인 | 필요시 커스텀 |
| CI/CD | Vercel + GitHub | 자동 배포 |
| 모니터링 | Vercel Analytics | 성능 모니터링 |

### 5.5 개발 환경

| 항목 | 기술 |
|------|------|
| IDE | VS Code |
| 버전관리 | Git + GitHub |
| 패키지관리 | npm 또는 pnpm |
| 코드품질 | ESLint + Prettier |

---

## 6. 데이터베이스 설계

### 6.1 ERD 개요

```
users (사용자)
  |
  +-- maintenance_records (수리실적)
  |     |
  |     +-- maintenance_parts (사용부품)
  |     |
  |     +-- maintenance_images (첨부이미지)
  |
equipments (설비)
  |
  +-- equipment_types (설비유형)
  |
  +-- maintenance_records (수리실적)

repair_types (수리유형)
  |
  +-- maintenance_records (수리실적)

settings (시스템설정)

ai_insights (AI 인사이트)
```

### 6.2 테이블 명세

#### users (사용자)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | PK |
| employee_id | VARCHAR | 사번 |
| name_ko | VARCHAR | 한국어 이름 |
| name_vi | VARCHAR | 베트남어 이름 |
| email | VARCHAR | 이메일 |
| department | VARCHAR | 부서 |
| position | VARCHAR | 직책 |
| role | INTEGER | 권한레벨 (1-4) |
| is_active | BOOLEAN | 활성상태 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

#### equipment_types (설비유형)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | PK |
| code | VARCHAR | 유형코드 (CNC, CL, DBR, TRI, SUB) |
| name_ko | VARCHAR | 한국어명 |
| name_vi | VARCHAR | 베트남어명 |
| category | VARCHAR | MAIN/SUB |
| is_active | BOOLEAN | 활성상태 |

#### equipments (설비)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | PK |
| equipment_no | VARCHAR | 설비번호 (CNC-001) |
| equipment_name | VARCHAR | 설비명 |
| type_id | UUID | FK -> equipment_types |
| status | VARCHAR | 상태 (normal/pm/repair/emergency/standby) |
| install_date | DATE | 설치일 |
| manufacturer | VARCHAR | 제조사 |
| model | VARCHAR | 모델명 |
| factory | VARCHAR | 공장 |
| line | VARCHAR | 라인 |
| zone | VARCHAR | 구역 |
| specs | JSONB | 사양정보 |
| is_active | BOOLEAN | 활성상태 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

#### repair_types (수리유형)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | PK |
| code | VARCHAR | 유형코드 (PM, BR, PD, QA, EM) |
| name_ko | VARCHAR | 한국어명 |
| name_vi | VARCHAR | 베트남어명 |
| color | VARCHAR | 표시색상 |
| priority | INTEGER | 우선순위 |
| is_active | BOOLEAN | 활성상태 |

#### maintenance_records (수리실적)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | PK |
| record_no | VARCHAR | 수리번호 (자동생성) |
| date | DATE | 수리일자 |
| equipment_id | UUID | FK -> equipments |
| repair_type_id | UUID | FK -> repair_types |
| technician_id | UUID | FK -> users |
| symptom | TEXT | 증상설명 |
| repair_content | TEXT | 수리내용 |
| start_time | TIMESTAMP | 시작시간 |
| end_time | TIMESTAMP | 완료시간 |
| duration_minutes | INTEGER | 소요시간(분) |
| rating | INTEGER | 완료평점 (1-10) |
| status | VARCHAR | 상태 (in_progress/completed) |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

#### maintenance_parts (사용부품)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | PK |
| maintenance_id | UUID | FK -> maintenance_records |
| part_code | VARCHAR | 부품코드 |
| quantity | INTEGER | 수량 |

#### maintenance_images (첨부이미지)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | PK |
| maintenance_id | UUID | FK -> maintenance_records |
| image_url | VARCHAR | 이미지 URL |
| image_type | VARCHAR | before/after |
| created_at | TIMESTAMP | 생성일 |

#### settings (시스템설정)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | PK |
| key | VARCHAR | 설정키 |
| value | JSONB | 설정값 |
| description | VARCHAR | 설명 |
| updated_at | TIMESTAMP | 수정일 |
| updated_by | UUID | FK -> users |

#### ai_insights (AI 인사이트)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | PK |
| insight_type | VARCHAR | 인사이트 유형 |
| title | VARCHAR | 제목 |
| content | TEXT | 내용 |
| data | JSONB | 관련 데이터 |
| generated_at | TIMESTAMP | 생성시간 |

#### activity_logs (활동로그)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | PK |
| user_id | UUID | FK -> users |
| action | VARCHAR | 액션 |
| target_type | VARCHAR | 대상 유형 |
| target_id | UUID | 대상 ID |
| details | JSONB | 상세 정보 |
| created_at | TIMESTAMP | 생성일 |

#### user_fcm_tokens (FCM 토큰) ✅ 구현완료
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | PK |
| user_id | UUID | FK -> auth.users |
| fcm_token | TEXT | FCM 토큰 문자열 |
| device_type | VARCHAR | 디바이스 유형 (web/android/ios) |
| device_info | JSONB | 디바이스 상세 정보 |
| is_active | BOOLEAN | 활성 상태 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |
| last_used_at | TIMESTAMP | 마지막 사용일 |

#### role_permissions (역할 권한)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | PK |
| role | INTEGER | 역할 레벨 (1-4) |
| page_key | VARCHAR | 페이지 키 |
| page_name | VARCHAR | 페이지 이름 |
| can_access | BOOLEAN | 접근 권한 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

### 6.3 PM (예방정비) 관련 테이블

#### pm_templates (PM 템플릿)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | PK |
| name | VARCHAR | 템플릿명 |
| name_ko | VARCHAR | 한국어명 |
| name_vi | VARCHAR | 베트남어명 |
| description | TEXT | 설명 |
| equipment_type_id | UUID | FK -> equipment_types |
| interval_type | VARCHAR | 주기 유형 (daily/weekly/monthly/quarterly/yearly) |
| interval_value | INTEGER | 주기 값 |
| estimated_duration | INTEGER | 예상 소요시간 (분) |
| checklist_items | JSONB | 체크리스트 항목 |
| required_parts | JSONB | 필요 부품 |
| is_active | BOOLEAN | 활성 상태 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

#### pm_schedules (PM 일정)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | PK |
| template_id | UUID | FK -> pm_templates |
| equipment_id | UUID | FK -> equipments |
| scheduled_date | DATE | 예정일 |
| assigned_technician_id | UUID | FK -> users |
| status | VARCHAR | 상태 (scheduled/in_progress/completed/overdue/cancelled) |
| priority | VARCHAR | 우선순위 (low/medium/high) |
| notes | TEXT | 메모 |
| notification_sent_3days | BOOLEAN | 3일전 알림 발송 여부 |
| notification_sent_1day | BOOLEAN | 1일전 알림 발송 여부 |
| notification_sent_today | BOOLEAN | 당일 알림 발송 여부 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

#### pm_executions (PM 실행 기록)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | PK |
| schedule_id | UUID | FK -> pm_schedules |
| equipment_id | UUID | FK -> equipments |
| technician_id | UUID | FK -> users |
| started_at | TIMESTAMP | 시작 시간 |
| completed_at | TIMESTAMP | 완료 시간 |
| duration_minutes | INTEGER | 소요 시간 (분) |
| checklist_results | JSONB | 체크리스트 수행 결과 |
| used_parts | JSONB | 사용 부품 |
| findings | TEXT | 발견 사항 |
| findings_severity | VARCHAR | 심각도 (none/minor/major/critical) |
| created_repair_id | UUID | FK -> maintenance_records |
| rating | INTEGER | 평점 |
| notes | TEXT | 메모 |
| status | VARCHAR | 상태 (in_progress/completed) |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

---

## 7. API 설계

### 7.1 인증

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /auth/login | 로그인 |
| POST | /auth/logout | 로그아웃 |
| POST | /auth/refresh | 토큰 갱신 |
| POST | /auth/password-reset | 비밀번호 재설정 |

### 7.2 설비

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /equipments | 설비 목록 조회 |
| GET | /equipments/:id | 설비 상세 조회 |
| POST | /equipments | 설비 등록 |
| PUT | /equipments/:id | 설비 수정 |
| DELETE | /equipments/:id | 설비 삭제 |
| POST | /equipments/bulk | 설비 일괄 등록 |
| PATCH | /equipments/:id/status | 설비 상태 변경 |

### 7.3 수리실적

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /maintenance | 수리실적 목록 |
| GET | /maintenance/:id | 수리실적 상세 |
| POST | /maintenance/start | 수리 시작 등록 |
| PUT | /maintenance/:id/complete | 수리 완료 처리 |
| PUT | /maintenance/:id | 수리실적 수정 |
| DELETE | /maintenance/:id | 수리실적 삭제 |

### 7.4 분석

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /analytics/overview | 개요 통계 |
| GET | /analytics/equipment/:id | 설비별 분석 |
| GET | /analytics/repair-types | 수리유형별 분석 |
| GET | /analytics/technicians | 담당자별 분석 |
| GET | /analytics/trends | 추이 분석 |

### 7.5 AI

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /ai/insights | 자동 인사이트 조회 |
| POST | /ai/chat | AI 질의응답 |
| POST | /ai/generate | 인사이트 생성 (수동) |

### 7.6 사용자

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /users | 사용자 목록 |
| GET | /users/:id | 사용자 상세 |
| POST | /users | 사용자 등록 |
| PUT | /users/:id | 사용자 수정 |
| DELETE | /users/:id | 사용자 삭제 |

### 7.7 설정

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /settings | 설정 조회 |
| PUT | /settings/:key | 설정 수정 |
| GET | /settings/repair-types | 수리유형 목록 |
| POST | /settings/repair-types | 수리유형 추가 |

---

## 8. UI/UX 설계

### 8.1 반응형 브레이크포인트

| 디바이스 | 화면 너비 | 레이아웃 |
|----------|-----------|----------|
| 모바일 | ~640px | 단일 컬럼, 햄버거 메뉴 |
| 태블릿 | 641~1024px | 2컬럼, 축소 사이드바 |
| 데스크탑 | 1025px~ | 다중 컬럼, 전체 사이드바 |

### 8.2 컬러 시스템

**주요 색상:**
- Primary: #2563EB (파랑)
- Success: #10B981 (초록)
- Warning: #F59E0B (노랑)
- Danger: #EF4444 (빨강)
- Neutral: #6B7280 (회색)

**설비 상태 색상:**
- 정상: #10B981
- PM 중: #3B82F6
- 수리 중: #F59E0B
- 긴급수리: #EF4444
- 대기: #9CA3AF

### 8.3 주요 화면 와이어프레임

**대시보드 (데스크탑):**
```
+------------------+--------------------------------+
|                  |   [현황카드] [현황카드] [현황카드] |
|    사이드바       +--------------------------------+
|                  |   [도넛차트]    |   [막대차트]    |
|    - 대시보드     +----------------+----------------+
|    - 설비관리     |   [라인차트]    |   [TOP10]      |
|    - 수리관리     +----------------+----------------+
|    - 분석        |   [최근 수리 목록]               |
|    - AI 인사이트  |                                |
|    - 사용자관리   +--------------------------------+
|    - 설정        |   [알림/공지]                   |
+------------------+--------------------------------+
```

**수리 입력 (모바일):**
```
+------------------------+
|  <= 수리 시작 등록      |
+------------------------+
|                        |
|  날짜: [2025-01-15]    |
|                        |
|  담당자: [홍길동 v]     |
|                        |
|  설비유형: [CNC v]      |
|                        |
|  설비번호: [검색...]    |
|                        |
|  수리유형: [고장수리 v]  |
|                        |
|  증상: [            ]  |
|        [            ]  |
|                        |
|  부품: [+ 부품추가]     |
|                        |
|  시작시간: [09:30]      |
|                        |
+------------------------+
|    [수리 시작 등록]     |
+------------------------+
```

---

## 9. 다국어 지원 (i18n)

### 9.1 지원 언어

| 코드 | 언어 |
|------|------|
| ko | 한국어 |
| vi | 베트남어 (Tiếng Việt) |

### 9.2 번역 키 구조 예시

```json
{
  "common": {
    "save": { "ko": "저장", "vi": "Lưu" },
    "cancel": { "ko": "취소", "vi": "Hủy" },
    "delete": { "ko": "삭제", "vi": "Xóa" },
    "edit": { "ko": "수정", "vi": "Chỉnh sửa" },
    "search": { "ko": "검색", "vi": "Tìm kiếm" }
  },
  "equipment": {
    "title": { "ko": "설비 관리", "vi": "Quản lý thiết bị" },
    "status": {
      "normal": { "ko": "정상", "vi": "Bình thường" },
      "repair": { "ko": "수리 중", "vi": "Đang sửa chữa" },
      "emergency": { "ko": "긴급수리", "vi": "Sửa chữa khẩn cấp" }
    }
  },
  "maintenance": {
    "title": { "ko": "수리 실적", "vi": "Kết quả sửa chữa" },
    "start": { "ko": "수리 시작", "vi": "Bắt đầu sửa chữa" },
    "complete": { "ko": "수리 완료", "vi": "Hoàn thành sửa chữa" }
  }
}
```

### 9.3 언어 전환

- 로그인 화면에서 언어 선택
- 헤더에서 언어 전환 버튼
- 사용자별 언어 설정 저장
- 브라우저 언어 자동 감지 (최초 접속 시)

---

## 10. 추가 권장 기능

### 10.1 알림/푸시 기능 ✅ (구현 완료)

**알림 유형:**
- 긴급수리 발생 알림
- PM 예정일 사전 알림 (D-3, D-1, 당일)
- 장시간 수리 경고 (설정 시간 초과)
- 수리 완료 알림
- AI 인사이트 중요 발견 알림

**구현 방법:**
- 인앱 알림 (완료)
- 브라우저 푸시 알림 - Firebase Cloud Messaging (완료)
- 이메일 알림 (향후 구현)

**기술 스택:**
- Firebase Cloud Messaging (FCM) - 웹 푸시 알림
- Supabase Edge Functions - 알림 발송 서버
- Service Worker - 백그라운드 메시지 수신

**FCM 토큰 관리:**
- user_fcm_tokens 테이블에 사용자별 토큰 저장
- 디바이스 정보 및 활성 상태 관리
- 토큰 자동 갱신 및 비활성 토큰 정리

### 10.2 QR코드 기능

**활용 방안:**
- 각 설비에 QR코드 부착
- 스캔 시 해당 설비 정보 즉시 조회
- 바로 수리 등록 화면으로 이동
- 설비 이력 빠른 조회

### 10.3 PM 일정 관리 ✅ (구현 완료)

**기능:**
- PM 템플릿 관리 (설비유형별 체크리스트, 필요부품 정의)
- PM 주기 설정 (일간/주간/월간/분기/연간)
- PM 캘린더 뷰
- PM 일정 자동 생성 및 할당
- PM 실행 기록 관리 (체크리스트 결과, 발견사항)
- PM 준수율 통계 및 리포트
- 자동 알림 (D-3, D-1, 당일, 지연)

**PM 워크플로우:**
```
[PM 템플릿 생성] → [PM 일정 자동생성] → [알림 발송]
                        ↓
              [PM 실행 시작] → [체크리스트 수행]
                        ↓
              [PM 완료] ← [이상발견시 수리등록]
```

**PM 상태:**
- scheduled: 예정됨
- in_progress: 진행 중
- completed: 완료
- overdue: 지연
- cancelled: 취소

### 10.4 대시보드 커스터마이징

**기능:**
- 위젯 드래그앤드롭 배치
- 사용자별 대시보드 레이아웃 저장
- 자주 보는 차트 즐겨찾기

### 10.5 오프라인 모드

**기능:**
- 네트워크 끊김 시 로컬 저장
- 재연결 시 자동 동기화
- PWA 지원

### 10.6 데이터 내보내기

**기능:**
- 엑셀 다운로드 (설비목록, 수리이력)
- PDF 리포트 생성
- 기간별/조건별 필터 후 내보내기

### 10.7 감사 로그

**기록 항목:**
- 모든 데이터 생성/수정/삭제
- 로그인/로그아웃
- 권한 변경
- 설정 변경

---

## 11. 개발 일정 (예상)

### Phase 1: 기본 기능 (4주)

| 주차 | 작업 내용 |
|------|-----------|
| 1주 | 프로젝트 셋업, DB 설계, 인증 구현 |
| 2주 | 설비 관리 CRUD, 엑셀 일괄등록 |
| 3주 | 수리 실적 입력/조회, 상태 연동 |
| 4주 | 대시보드, 기본 차트 |

### Phase 2: 고급 기능 (3주)

| 주차 | 작업 내용 |
|------|-----------|
| 5주 | 분석 페이지, 리포트 |
| 6주 | AI 인사이트, 질의응답 |
| 7주 | 사용자 관리, 설정, 다국어 |

### Phase 3: 마무리 (1주)

| 주차 | 작업 내용 |
|------|-----------|
| 8주 | 테스트, 버그수정, 배포, 문서화 |

---

## 12. 리스크 및 대응방안

| 리스크 | 영향도 | 대응방안 |
|--------|--------|----------|
| Supabase 무료 티어 제한 | 중 | 사용량 모니터링, 필요시 유료 전환 |
| Google AI API 제한 | 중 | 호출 빈도 조절, 캐싱 적용 |
| 다국어 번역 품질 | 저 | 베트남 현지 검수 진행 |
| 모바일 UX | 중 | 현장 테스트 후 개선 |
| 데이터 마이그레이션 | 중 | 기존 엑셀 데이터 변환 도구 개발 |

---

## 13. 성공 지표 (KPI)

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| 시스템 사용률 | 90% 이상 | 일일 활성 사용자 수 |
| 수리 기록 완성도 | 95% 이상 | 필수 필드 입력률 |
| 평균 수리 시간 | 20% 감소 | MTTR 비교 |
| 긴급수리 비율 | 30% 감소 | 예지보전 효과 |
| 사용자 만족도 | 4.0/5.0 이상 | 설문조사 |

---

## 14. 부록

### 14.1 용어 정의

| 용어 | 설명 |
|------|------|
| PM | Preventive Maintenance (예방정비) |
| MTBF | Mean Time Between Failures (평균 고장 간격) |
| MTTR | Mean Time To Repair (평균 수리 시간) |
| OEE | Overall Equipment Effectiveness (설비종합효율) |

### 14.2 참고 자료

- Supabase 공식 문서: https://supabase.com/docs
- React 공식 문서: https://react.dev
- i18next 문서: https://www.i18next.com
- Google AI API: https://ai.google.dev

---

**문서 끝**

> 본 문서는 프로젝트 진행 상황에 따라 업데이트될 수 있습니다.
