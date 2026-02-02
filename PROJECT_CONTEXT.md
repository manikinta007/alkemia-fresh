# Project Context: AlkeMia Learning System 2.0

## 1. Overview
**Goal**: Migrate the legacy AlkeMia exam & learning platform to a modern, serverless architecture using the Cloudflare Stack.
**State**: Hybrid (Legacy Frontend + New React Frontend) running on Cloudflare Workers.

## 2. Architecture Stack
| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React (Vite) + TailwindCSS | Single Page Application (SPA), replacing legacy EJS/HTML views. |
| **Backend** | Cloudflare Workers | Serverless compute, handling API requests and routing. |
| **Database** | Cloudflare D1 (SQLite) | Core relational data (Users, Classes, Grades, Quizzes). |
| **Storage** | Cloudflare R2 | Object storage for image uploads (Quizzes, Profile). |
| **Cache/Auth** | Cloudflare KV | High-speed storage for Rate Limiting and Session management. |

## 3. Deployment Environments
| Env | URL | Worker | DB Binding | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Production (Legacy)** | `app.alkemia.my.id` | `alkemia2` | `DB` | **Stable**. Reverted to legacy code. |
| **Staging (V2)** | `v2.alkemia.my.id` | `alkemia-v2` | `DB` | **Active**. For testing React migration features. |
| **Production (Fresh)** | `https://alkemia-fresh2.pages.dev` | `alkemia-fresh2` | `alkemiafresh2` | **Live**. Main Pages Deployment. |

## 4. Migration Progress Tracking

### 🚀 CI/CD & Deployment
- **Platform**: Cloudflare Pages.
- **Repository**: `https://github.com/manikinta007/alkemia-fresh`
- **Workflow**: Automated build & deploy on `git push main`.
- **Status**: **Fully Migrated**. Backend logic now resides in `client/src_worker/` and routed via `client/functions/api`.

### ✅ Completed
- [x] **Backend Modularization**: Refactored `worker.js` into modular controllers (`taskController`, `quizController`, etc.).
- [x] **Auth System**: Implemented secure `pbkdf2` hashing and session management.
- [x] **Frontend Migration**:
    - [x] Login Page (Redesign with "Reactor Core" theme).
    - [x] Dashboard (Stats & Navigation).
    - [x] Quizzes & Exams (Full Feature Parity: Leaderboard, Q&A Editor, CSV Import).
    - [x] Sidebar Navigation (Split Tasks vs Quizzes).
- [x] **Infrastructure**:
    - [x] D1, R2, KV integration.
    - [x] Static Assets serving (React build).
- [x] **Student App**: Full Migration to React PWA (Landing, Portal, Tasks, CBT).
- [x] **Dashboard Refactor**:
    - [x] Fixed Legacy Links (SPA Navigation).
    - [x] **Deep Linking**: implemented `class_id` auto-selection for Attendance & Materials.

### ⏳ Pending / Next Steps
- [ ] **DB Initialization (Fresh)**: Run `/api/init` on the fresh production deployment.
- [x] **Grades (Nilai)**: Migrate `grades.js` -> `Grades.jsx`.
- [x] **Attendance**: Migrate `Attendance.jsx`.
- [x] **Schedule**: Migrate `schedule.js` -> `Schedule.jsx`.
- [x] **Materials**: Migrate `materials.js` -> `Materials.jsx`.

## 5. Active Session Context
**Active Session Context**
**Current Focus**: Dashboard Stability & Student App Verification.
**Tasks**:
1.  ✅ **Completed**: Student App Migration (PWA), Dashboard Refactor (Fixed Links/Stats).
2.  🚀 **Next**: **Final Deployment & Testing**. 
**Immediate Plan**: Ensure all dashboard links work and Student App flows are smooth.

> [!IMPORTANT]
> **Rule**: Always update `PROJECT_CONTEXT.md` after completing a major task or update to keep the context fresh. Do not wait for instruction.
> **Rule**: When changing features, update this document immediately.

## 6. Future Roadmap
### 🎨 Sidebar Restructure (Academic Flow)
Plan to reorganize sidebar menu to reduce clutter and follow the teaching workflow:
1.  **Dashboard**
2.  **Akademik** (Data Master: Periode, Kelas, Siswa)
3.  **KBM** (Jadwal, Absensi, Materi)
4.  **Evaluasi** (Tugas, Bank Soal/Quizzes, Nilai)
5.  **Tools** (QR Code, dll)
6.  **Pengaturan**
