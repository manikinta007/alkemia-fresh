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
    - [x] **UI Refinement (Legacy)**: Reverted to `bg-zinc-950`, Floating Header, Hidden Scrollbars.
    - [x] **Features**: Material Presentation Modal, "Nilai" Tab Fix, Version Bump (2.1).
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
**Current Focus**: Bug Fixing Session (Feb 3, 2026)
**Tasks Completed**:
1.  ✅ **Task Grading White Screen**: Added missing `Clock` import in `TaskGrading.jsx`.
2.  ✅ **Mobile Sidebar Overlay**: Fixed overlay logic in `Layout.jsx` - now closes on outside click.
3.  ✅ **Task Publish Button**: Fixed `handleToggleStatus` in `Tasks.jsx` (Promise-based showConfirm).
4.  ✅ **Global QR Reset**: Fixed `handleReset` in `QRCodes.jsx` (Promise-based).
5.  ✅ **Task Delete Button**: Fixed in `Tasks.jsx`.
6.  ✅ **Google Drive Materials**: Simplified fallback UI in `StudentPortal.jsx`.
7.  ✅ **Grade Leak**: Fixed in `taskController.js` (checked `is_published` before returning `myGrade`).
8.  ✅ **Grade Status Label**: Added `NILAI_DALAM_PROSES` status (Purple) for graded but unpublished tasks.
9.  ✅ **Student Modal/Redirect**: Refactored Modal components to fix flicker. Changed Draft flow to "Save & Continue".
10. ✅ **Quiz Delete/Save Questions**: Fixed `showConfirm` usage in `useQuizData.js` (was callback-based, now Promise-based).
11. ✅ **Period Set Active/Delete**: Fixed `showConfirm` usage in `Periods.jsx` (was callback-based, now Promise-based).
12. ✅ **Delete Schedule Button**: Fixed `showConfirm` usage in `useScheduleData.js` (was callback-based, now Promise-based).
13. ✅ **Leaderboard Fullscreen Mode**: Added Browser Fullscreen API toggle in `LiveLeaderboard.jsx` for presentation mode.
14. ✅ **Quiz Answer Not Saved**: Fixed type mismatch (`question_id` string vs integer) in `quizController.js`. Fixed stale closure issue in `StudentCBT.jsx` for violation/auto-submit by reading from localStorage and using `handleSubmitRef`.
15. ✅ **Student App UI**: Prominent orange refresh button in header. Sticky header in Quiz Review page.
16. ✅ **Google Drive Quiz Images**: Improved proxy strategy using `uc?export=view` via Proxy (with fake User-Agent) to bypass Google Blocking/Flickering.
17. ✅ **Task Editor Image Button**: Fixed unresponsive button by passing explicit props to `TaskEditor` and using `type="button"`.

**Session End**: Issues persisted despite fixes.

### 🐛 Known Issues (Active)
1. **Google Drive Quiz Images**: ⚠️ IMPROVED - Proxy now transforms URLs to `lh3.googleusercontent.com` CDN, uses browser-like User-Agent, and has fallback to thumbnail endpoint. Testing required.
2. ~~**Task Editor Image Button**~~: ✅ FIXED - Added `urlModal` state, `URLInputModal` component, and `onOpenUrlModal` prop in `Tasks.jsx`.
3. **CSRF Allowed Origin**: `worker.js` still uses wildcard `*`. Needs to be restricted to production diff.
4. **Stored XSS (Question Text)**: Question Input is NOT sanitized. Vulnerable to XSS if a teacher account is compromised or malicious. `dangerouslySetInnerHTML` is used in `cbt.js` without backend sanitization.
5. **Rate Limiting**: Login attempts are successfully limited via Cloudflare KV (`utils.js` & `api.js`).

> [!IMPORTANT]
> **Rule**: Always update `PROJECT_CONTEXT.md` after completing a major task or update to keep the context fresh. Do not wait for instruction.
> **Rule**: When changing features, update this document immediately.

## 6. Completed Features (Historical)
### ✅ Sidebar Restructure (Academic Flow)
Reorganized sidebar menu to follow the teaching workflow:
1.  **Dashboard**
2.  **Akademik** (Data Master: Periode, Kelas, Siswa)
3.  **KBM** (Jadwal, Absensi, Materi)
4.  **Evaluasi** (Tugas, Bank Soal/Quizzes, Nilai)
5.  **Tools** (QR Code, dll)
6.  **Pengaturan**

## 7. Future Roadmap
- (No active roadmap items)
