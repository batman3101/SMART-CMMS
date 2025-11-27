# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AMMS (ALMUS Maintenance Management System) is a CNC equipment maintenance management system for a Vietnamese factory. It manages 800+ CNC machines and auxiliary equipment, providing maintenance tracking, analytics, and AI-powered insights. The application supports Korean and Vietnamese languages.

## Commands

```bash
npm run dev      # Start development server (Vite)
npm run build    # TypeScript check + production build
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with shadcn/ui component patterns
- **State**: Zustand with persist middleware
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **i18n**: i18next (Korean/Vietnamese)
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation

### Directory Structure

```
src/
├── components/
│   ├── ui/          # Reusable UI components (shadcn/ui pattern)
│   └── layout/      # MainLayout, Header, Sidebar
├── pages/           # Route components organized by feature
│   ├── equipment/   # Equipment management pages
│   ├── maintenance/ # Maintenance record pages
│   ├── analytics/   # Analytics and reports
│   ├── ai/          # AI insights and chat
│   └── admin/       # User management and settings
├── stores/          # Zustand stores (authStore, equipmentStore, etc.)
├── lib/             # Utilities (supabase.ts, utils.ts)
├── types/           # TypeScript type definitions
├── mock/            # Mock data and API for development
│   ├── data/        # Static mock data
│   └── api/         # Mock API functions
└── i18n/
    └── locales/     # ko.json, vi.json translation files
```

### Key Patterns

**Path Aliases**: Use `@/` prefix for absolute imports (e.g., `@/components/ui/button`)

**Authentication Flow**:
- `useAuthStore` manages user state with localStorage persistence (key: `amms-auth`)
- `ProtectedRoute` component in App.tsx handles route protection
- User roles: 1=Admin, 2=Supervisor, 3=Technician, 4=Viewer

**Equipment Status Colors** (defined in tailwind.config.js as `status.*`):
- normal: #10B981 (green)
- pm: #3B82F6 (blue)
- repair: #F59E0B (yellow)
- emergency: #EF4444 (red)
- standby: #9CA3AF (gray)

**Data Layer**:
- Production: Supabase client in `src/lib/supabase.ts`
- Development: Mock data in `src/mock/` for offline development
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**Internationalization**:
- Default language: Korean (`ko`)
- Translation files: `src/i18n/locales/ko.json`, `src/i18n/locales/vi.json`
- Use `useTranslation` hook from `react-i18next` for translations
- Language preference stored in `useAuthStore`

### Domain Model

Core entities (see `src/types/index.ts`):
- **Equipment**: CNC machines (MAIN) and auxiliary equipment (SUB) with status tracking
- **MaintenanceRecord**: Repair records with start/end times, ratings, parts used
- **RepairType**: PM, Breakdown (BR), Predictive (PD), Quality (QA), Emergency (EM)
- **User**: Multi-role users with department and position

### Routing Structure

Routes are defined in `App.tsx` using React Router v6 with nested routes under MainLayout:
- `/dashboard` - Main dashboard
- `/equipment/*` - Equipment list, master data, bulk upload
- `/maintenance/*` - Maintenance input, history, monitoring
- `/analytics/*` - Analytics and reports
- `/ai/*` - AI insights and chat
- `/admin/*` - User management, roles, settings
