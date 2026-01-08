# SMART CMMS

**ALMUS Maintenance Management System** - CNC 설비 유지보수 관리 시스템

베트남 공장의 800+ CNC 설비 및 보조 장비의 유지보수를 관리하는 종합 시스템입니다.
한국어와 베트남어를 지원하며, AI 기반 인사이트와 분석 기능을 제공합니다.

---

## 주요 기능

### 대시보드
- 설비 현황 실시간 모니터링
- 오늘의 수리/PM 현황
- 긴급 알림 표시
- 설비 상태별 통계

### 설비 관리
- 설비 목록 조회 및 검색
- 설비 마스터 데이터 관리
- 설비 일괄 등록 (Excel 업로드)
- 설비 상태 관리 (정상/PM/수리/긴급/대기)

### 수리 관리
- 수리 실적 입력 (시작/완료)
- 수리 이력 조회
- 실시간 수리 현황 모니터링
- 사용 부품 기록

### PM (예방 보전) 관리
- PM 대시보드 (준수율 통계)
- PM 캘린더 (일정 시각화)
- PM 일정 관리 (생성/수정/삭제)
- PM 실행 및 체크리스트
- PM 템플릿 관리
- PM 분석 리포트

### 도색 관리
- 도색 대시보드
- 도색 일정 관리
- **6단계 체크리스트 기반 실행**:
  1. 설비 청소 (Vệ sinh thiết bị)
  2. 기존 도색 벗김 (Bóc sơn cũ)
  3. 건조 1 (Sấy khô 1)
  4. 신규 도색 (Sơn mới)
  5. 건조 2 (Sấy khô 2)
  6. 절삭유 교체 투입 (Thay dầu cắt)
- 단계별 진행률 추적
- 다일 작업 지원

### 분석 및 리포트
- 설비별 고장 순위
- 수리 유형별 분포
- 월별 수리 추이
- 기술자별 성과 분석
- 리포트 생성 및 다운로드

### AI 인사이트
- 자동 이상 감지
- 예측 유지보수 제안
- AI 질의응답 (챗봇)

### 관리자 기능
- 사용자 관리
- 역할별 권한 설정
- 시스템 설정

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, shadcn/ui |
| **State** | Zustand (persist middleware) |
| **Backend** | Supabase (PostgreSQL, Auth, Storage) |
| **i18n** | i18next (한국어/베트남어) |
| **Charts** | Recharts |
| **Forms** | React Hook Form, Zod |
| **Routing** | React Router v6 |

---

## 설치 및 실행

### 요구사항
- Node.js 18+
- npm 또는 yarn

### 설치

```bash
# 저장소 클론
git clone <repository-url>
cd SMART-CMMS

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일에 Supabase 설정 입력
```

### 환경 변수

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 실행

```bash
# 개발 서버 시작
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview

# 린트 검사
npm run lint
```

---

## 프로젝트 구조

```
src/
├── components/
│   ├── ui/              # 재사용 UI 컴포넌트 (shadcn/ui 패턴)
│   └── layout/          # MainLayout, Header, Sidebar, MobileBottomNav
├── pages/               # 페이지 컴포넌트 (기능별 구성)
│   ├── equipment/       # 설비 관리
│   ├── maintenance/     # 수리 관리
│   ├── pm/              # PM 관리
│   ├── paint/           # 도색 관리
│   ├── analytics/       # 분석 및 리포트
│   ├── ai/              # AI 인사이트
│   ├── parts/           # 부품 정보
│   └── admin/           # 관리자 설정
├── stores/              # Zustand 상태 관리
├── lib/                 # 유틸리티 (supabase.ts, api.ts, utils.ts)
├── types/               # TypeScript 타입 정의
├── hooks/               # 커스텀 React 훅
└── i18n/
    └── locales/         # ko.json, vi.json 번역 파일
```

---

## 라우팅 구조

| 경로 | 설명 |
|------|------|
| `/dashboard` | 메인 대시보드 |
| `/equipment/*` | 설비 목록, 마스터, 일괄 등록 |
| `/maintenance/*` | 수리 입력, 이력, 모니터링, 알림 |
| `/pm/*` | PM 대시보드, 캘린더, 일정, 실행, 템플릿, 분석 |
| `/paint/*` | 도색 대시보드, 일정, 실행 |
| `/analytics/*` | 통계 분석, 리포트 |
| `/ai/*` | AI 인사이트, 챗봇 |
| `/parts` | 부품 정보 |
| `/admin/*` | 사용자 관리, 권한, 설정 |
| `/profile` | 내 정보 |

---

## 사용자 역할

| 역할 | 코드 | 권한 |
|------|------|------|
| 시스템 관리자 | 1 | 전체 기능 접근 |
| 설비 관리자 | 2 | 관리 기능 접근 |
| 수리 직원 | 3 | 수리/PM/도색 실행 |
| 뷰어 | 4 | 조회 전용 |

---

## 설비 상태

| 상태 | 색상 | 설명 |
|------|------|------|
| 정상 (Normal) | 🟢 Green | 정상 가동 중 |
| PM | 🔵 Blue | 예방 보전 중 |
| 수리 (Repair) | 🟡 Yellow | 수리 진행 중 |
| 긴급 (Emergency) | 🔴 Red | 긴급 수리 필요 |
| 대기 (Standby) | ⚪ Gray | 가동 중지 |

---

## 다국어 지원

- **한국어 (ko)**: 기본 언어
- **베트남어 (vi)**: 현장 작업자용

번역 파일 위치: `src/i18n/locales/`

---

## 데이터베이스 구조

### 주요 테이블

- `users` - 사용자 정보
- `equipment` - 설비 정보
- `equipment_types` - 설비 유형
- `maintenance_records` - 수리 기록
- `repair_types` - 수리 유형
- `pm_templates` - PM 템플릿
- `pm_schedules` - PM 일정
- `pm_executions` - PM 실행 기록
- `paint_schedules` - 도색 일정
- `paint_executions` - 도색 실행 기록
- `paint_checklist_steps` - 도색 체크리스트 단계
- `paint_step_executions` - 도색 단계별 실행 기록

---

## 개발 가이드

### 코드 스타일
- TypeScript strict mode 사용
- ESLint + Prettier 적용
- 컴포넌트는 함수형 + hooks 사용

### 경로 별칭
```typescript
// @/ 접두사로 절대 경로 사용
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
```

### 상태 관리
```typescript
// Zustand store 사용
const { user, login, logout } = useAuthStore()
```

### 다국어
```typescript
// useTranslation hook 사용
const { t, i18n } = useTranslation()
<span>{t('common.save')}</span>
```

---

## 라이선스

Copyright (c) 2025 ALMUS TECH. All rights reserved.

---

## 문의

기술 지원 및 문의: ALMUS TECH 개발팀
