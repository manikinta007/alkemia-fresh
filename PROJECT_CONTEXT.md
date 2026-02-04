# Project Context: AlkeMia Learning System 2.0

## 1. Overview
**Goal**: Migrate the legacy AlkeMia exam & learning platform to a modern, serverless architecture using the Cloudflare Stack.
**State**: React SPA + Embedded Worker running on **Cloudflare Pages** (Unified Deployment).

## 2. Architecture Stack
| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React (Vite) + TailwindCSS | Single Page Application (SPA). |
| **Backend** | Cloudflare Pages Functions (`_worker.js`) | Embedded Worker bundled into Pages deployment. No separate Worker. |
| **Database** | Cloudflare D1 (SQLite) | Core relational data (Users, Classes, Grades, Quizzes). |
| **Storage** | Cloudflare R2 | Object storage for image uploads (Gudang Gambar, Profile). |
| **Cache/Auth** | Cloudflare KV | High-speed storage for Rate Limiting and Session management. |

## 3. Deployment
**Live URL**: `https://alkemia-fresh2.pages.dev`
**Platform**: Cloudflare Pages (Unified Deployment)
**Repository**: `https://github.com/manikinta007/alkemia-fresh`
**Build Command**: `npm run build` (builds frontend + bundles `_worker.js`)
**Build Output**: `client/dist`

| Binding | Type | Value |
| :--- | :--- | :--- |
| `DB` | D1 Database | `alkemiafresh2` |
| `R2` | R2 Bucket | `alkemiafresh2` |
| `KV` | KV Namespace | `alkemiafresh2` |

> [!NOTE]
> **No Separate Worker**. The backend logic (`src/worker-fresh.js`) is bundled into `client/dist/_worker.js` during build and runs directly within Pages (Advanced Mode).

## 4. Migration Progress Tracking

### 🚀 CI/CD & Deployment
- **Workflow**: Automated build & deploy on `git push main`.
- **Build Process**:
  1. `npm install` (root)
  2. `cd client && npm install && npm run build` (Vite builds SPA)
  3. `esbuild src/worker-fresh.js --bundle --outfile=client/dist/_worker.js` (Bundles backend)
- **Status**: **Fully Migrated & Unified**. Single domain, no CORS issues.

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
18. ✅ **Bank Gambar (Gudang Gambar)**:
    - Renamed menu "Gudang Gambar" -> "Bank Gambar".
    - Fixed `loadFolders` and `loadImages` JSON parsing logic (was using raw Response).
    - Added `/api/migrate/images` endpoint for initializing `image_folders` and `images` tables.
    - Verified `ImagePickerModal` is integrated into both Quiz Editor and Task Editor.

**Session End**: Issues persisted despite fixes.

### 🐛 Known Issues (Active)
1. ~~**Google Drive Quiz Images**~~: ✅ FIXED - Client-side URL transformation via `imageUtils.js` + `processContentForDisplay()` + thumbnail proxy endpoint.
2. ~~**Task Editor Image Button**~~: ✅ FIXED - Added `urlModal` state, `URLInputModal` component, and `onOpenUrlModal` prop in `Tasks.jsx`.
3. ~~**Bank Gambar Integration**~~: ✅ FIXED (Feb 4, 2026) - Changed image insertion handlers to use immutable updates (`.map()`) instead of direct mutation to properly trigger React re-renders in `contentEditable` preview.
4. ~~**Bank Gambar Move Image**~~: ✅ ADDED (Feb 4, 2026) - Added Move button on image hover with folder selection modal. Uses `/api/images/:id/move` endpoint.
5. **Bank Gambar Future Enhancements** (Planned):
    - Bulk delete with checkbox selection
    - Sort by name, date, size, or extension
6. **CSRF Allowed Origin**: `worker.js` still uses wildcard `*`. Needs to be restricted to production domain.
7. **Stored XSS (Question Text)**: Question Input is NOT sanitized. Vulnerable to XSS.
8. **Rate Limiting**: Login attempts are successfully limited via Cloudflare KV.

### ✅ Completed (Feb 4, 2026)
19. ✅ **R2 Image Public Access**: Fixed images not displaying in student app. Added `/api/images/file/` to public API whitelist in `api.js`. Images now accessible without authentication.
20. ✅ **Transparent Task Grading System**: 
    - **Backend Fix**: PG scoring now stores actual weight-based points (`pg_weight / total_pg_questions`) instead of just 1.
    - **Frontend Display**: Shows both Bobot (weight) AND Poin (earned) per question after grades are published.
    - **Color Grading**: Applied to per-question scores and final grade display:
      - 🔴 Merah: 0-50%
      - 🟡 Kuning: 51-69%
      - 🔵 Biru: 70-79%
      - 🟢 Hijau: 80-100%
    - Files modified: `taskController.js`, `StudentTasks.jsx`

21. ✅ **Floating Essay Navigation Panel** (Teacher Grading UI):
    - Collapsible panel (bottom-right) for quick essay navigation
    - Essay toggle buttons with grading status indicators
    - Running score display and "Simpan Semua & Lanjut" button
    - Partial save warning when not all essays are graded
    - Files modified: `TaskGrading.jsx`

22. ✅ **4-Level Grading Status System** (Completed & Tested - Feb 4, 2026):
    - Added `is_graded` flag per answer: Migration `/api/migrate/is-graded`
    - PG auto `is_graded=1` on submit, Essay starts `is_graded=0`
    - 4-level status:
      - ⚪ GRAY: Belum submit
      - 🔵 BLUE: Sudah kumpul, belum dinilai sama sekali
      - 🟡 YELLOW: Sebagian essay sudah dinilai (X/Y Essay)
      - 🟢 GREEN: Semua essay sudah dinilai
    - Changed publish from block to warning-only
    - **Key Fixes**:
      - Submissions API includes `answers` with `is_graded` and `type` fields
      - Essay input shows placeholder "-" instead of default 0 for ungraded
      - Floating panel uses `is_graded` from database, not gradeInput values
      - Only essays with actual input are sent to backend for grading (skip undefined/empty)
      - Real-time score updates in floating panel
    - Files modified: `migrationController.js`, `taskController.js`, `TaskGrading.jsx`, `Tasks.jsx`

23. ✅ **UX Improvements on Grading Flow** (Completed - Feb 4, 2026):
    - Simplified "Tugas diperbarui" alert message
    - Fixed floating panel partial save warning using real-time session input
    - Replaced browser `confirm()` with custom `showConfirm()` modal
    - **PG Score Sync Fix**: Backend now automatically recalculates and updates PG `task_answers.score` when teacher saves grades. Fixes issue where students saw 0.0 points for correct answers if weight was changed after submission.
    - Files modified: `taskController.js`, `TaskGrading.jsx`, `Tasks.jsx`

## 6. Future Improvement Plans (Backlog)
### 🔄 Batch Grade Recalculation (Planned)
- **Goal**: Automatically update all student grades when the teacher updates task weights (PG/Essay).
- **Current Issue**: Changing weights in "Edit Task" does not update existing submission scores automatically. Teacher must manually re-save each student.
- **Proposed Logic**:
  1. Trigger on `PUT /api/tasks` (Weight Update).
  2. **Security**: Read `old_weight` from DB before update.
  3. **Essay**: Reverse calculate `Quality (0-100) = (Old Point / Old Weight) * 100`. Then `New Point = (Quality / 100) * New Weight`.
  4. **PG**: Recalculate based on `New Weight / Total PG Questions`.
  5. **Safety**: System already enforces initial weight setup (preventing Old Weight = 0), making this safe.

### ✅ Empty Answer Handling (Fixed - Feb 4, 2026)
- **Issue**: Submitting empty essays previously skipped creating `task_answers` rows.
- **Symptoms**:
  1. **Sync Input Bug**: Multiple empty grading inputs shared `null` ID, causing them to update together.
  2. **False Green Status**: System thought grading was complete because it only saw PG answers.
- **Fix Applied**: 
  - **Frontend** (`StudentTasks.jsx`): Changed submit to iterate over `questions` array (all), not `answers` object (only filled).
  - **Backend** (`taskController.js`): Submit endpoint now iterates over ALL questions and force creates rows for empty answers.

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
