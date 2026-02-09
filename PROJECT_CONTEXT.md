# Project Context: AlkeMia Learning System 2.0

## 1. Overview
**Goal**: Migrate the legacy AlkeMia exam & learning platform to a modern, serverless architecture using the Cloudflare Stack.
**State**: React SPA + Embedded Worker running on **Cloudflare Pages** (Unified Deployment).

## 2. Architecture Stack
| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React (Vite) + TailwindCSS | Single Page Application (SPA). |
| **Backend** | Cloudflare Pages Functions (`_worker.js`) | Source: `src/worker-fresh.js`. Compiled to `_worker.js` during build. |
| **Database** | Cloudflare D1 (SQLite) | Core relational data (Users, Classes, Grades, Quizzes). |
| **Storage** | Cloudflare R2 | Object storage for image uploads (Gudang Gambar, Profile). |
| **Cache/Auth** | Cloudflare KV | High-speed storage for Rate Limiting and Session management. |

## 3. Deployment & Git Strategy

### 🌐 Deployment Target
| Environment | URL | Status |
|-------------|-----|--------|
| **Staging/Dev** | `https://alkemia-fresh2.pages.dev` | ✅ Active |
| **Production** | `https://app.alkemia.my.id` | ⏸️ Reserved (after all features complete) |

**Platform**: Cloudflare Pages (Unified Deployment)
**Repository**: `https://github.com/manikinta007/alkemia-fresh`
**Build Command**: `npm run build` (builds frontend + bundles `_worker.js`)
**Build Output**: `client/dist`

### 🌿 Git Branching Strategy (Feature Branch)
```
main ──────────────────────●── (auto-deploy ke production)
         \                /
          feat/xxx ─────── (auto-deploy ke preview URL)
```

**Workflow:**
1. Buat branch baru dari `main`: `git checkout -b feat/nama-fitur`
2. Commit semua perubahan ke branch ini
3. Push: `git push origin feat/nama-fitur`
4. Cloudflare Pages auto-deploy ke preview URL (e.g., `feat-nama-fitur.alkemia-fresh2.pages.dev`)
5. Test di preview URL
6. Jika OK, merge ke `main` via GitHub PR atau local merge + push
7. **Rollback**: Revert merge commit atau re-deploy dari commit sebelumnya

### 🔗 Bindings (Cloudflare)

> [!CRITICAL]
> [!CRITICAL]
> **BACKUP INTEGRITY & GIT HEALTH PROTOCOLS**
> 
> **1. Mengapa "Tidak Bisa Ditarik"? (Divergent History)**
> Jika Anda melihat pesan error saat `git pull`, kemungkinan besar status git Anda adalah **Divergent** (Cabang bercabang).
> - Contoh: `Your branch is ahead of 'origin' by 3 commits, and behind 'origin' by 1 commit`.
> - **Penyebab**: Ada commit baru di Remote (GitHub) yg belum Anda punya, TAPI Anda juga membuat commit baru di Local.
> - **Solusi**: Gunakan command `git pull --rebase origin <branch_name>`. Ini akan menaruh commit lokal Anda *di atas* commit remote terupdate.
> 
> **2. Arti Cloudflare Build Log (Ceklis)**
> - **Status "Success"** adalah indikator utama.
> - Jika langkah "Cloning git repository" berhasil, berarti **Code AMAN di GitHub**. Cloudflare berhasil menariknya.
> - Ceklis yang hilang di langkah lain (misal "Building") bisa terjadi karena caching atau optimasi. **Selama Status = Success, backup aman.**
> 
> **3. SOP Wajib Setiap Sesi Coding**
> - **AWAL**: `git pull origin <branch>` (atau `git pull --rebase` jika error).
> - **AKHIR**: `git push origin <branch>`. Pastikan tidak ada error di terminal.
> - **VERIFIKASI**: Lakukan `git status` setelah push. Harus bersih & up-to-date.
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
9. ~~**Logo 2 Upload**~~: ✅ FIXED (Feb 5, 2026) - Fixed 403 Forbidden by switching to authenticated `fetchApi` and adding dedicated `/api/journal-settings/upload-logo-2` endpoint.

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

### ✅ Completed (Feb 5, 2026)
24. ✅ **Attendance Save/Delete Not Working**:
    - **Issue**: Confirmation modal callback pattern mismatch.
    - **Root Cause**: `showConfirm()` in `Alert.jsx` returned Promise but was called with callback pattern.
    - **Fix**: Modified `showConfirm()` to support BOTH callback and Promise patterns.
    - Files modified: `Alert.jsx`

25. ✅ **Class Delete 500 Error** (Complete Cascade Delete):
    - **Issue**: Deleting class with attendance/schedules/tasks data caused FK constraint error.
    - **Fix**: Added cascade delete for all FK tables in `classController.js`:
      - `attendance`, `class_schedules`, `tasks` (+ child tables)
    - Files modified: `classController.js`

26. ✅ **Short Tokens for iOS PWA Manual Entry**:
    - New QR codes now use 8-char alphanumeric (e.g., `A7B3C9XY`) instead of UUID.
    - Teacher QR page displays `CLASSID-TOKEN` shortcode for easy sharing.
    - `ManualCodeEntry` component in `StudentLanding.jsx` for iOS PWA data recovery.
    - Files modified: `qrController.js`, `QRCodes.jsx`, `StudentLanding.jsx`

## 6. Future Improvement Plans (Backlog)

### ✅ Empty Answer Handling (Fixed - Feb 4, 2026)
- **Issue**: Submitting empty essays previously skipped creating `task_answers` rows.
- **Symptoms**:
  1. **Sync Input Bug**: Multiple empty grading inputs shared `null` ID, causing them to update together.
  2. **False Green Status**: System thought grading was complete because it only saw PG answers.
- **Fix Applied**: 
  - **Frontend** (`StudentTasks.jsx`): Changed submit to iterate over `questions` array (all), not `answers` object (only filled).
  - **Backend** (`taskController.js`): Submit endpoint now iterates over ALL questions and force creates rows for empty answers.

### ✅ Review Mode Summary Card (Added - Feb 4, 2026)
- **Feature**: Added a "Jawaban Kamu" Summary Card below PG options in review mode.
- **Display**: Shows color-coded status with icons:
  - ✅ **Benar** (green): `Jawaban Kamu: A • BENAR`
  - ❌ **Salah** (red): `Jawaban Kamu: B • Jawaban Benar: A`
  - ⚠️ **Tidak Dijawab** (yellow): `Tidak Dijawab • Jawaban Benar: A`
- **Applied to**: Both Quiz (`StudentCBT.jsx`) and Task (`StudentTasks.jsx`) review modes.

### ✅ Multi-Image Upload for Essay_Image (Added - Feb 4, 2026)
- **Feature**: Students can now upload up to **5 images** per essay_image question.
- **Implementation**:
  - **Frontend Student** (`StudentTasks.jsx`): Gallery grid UI with "Tambah Foto" button, individual delete ❌ on each image.
  - **Backend** (`taskController.js`): Stores `answerImages` array as JSON string in `answer_image_url` column.
  - **Frontend Teacher** (`TaskGrading.jsx`): Parses JSON and displays image gallery with lightbox.
- **Features**: All images are compressed before upload, counter shows `(n/5)`.

### ✅ Review Mode Image Display (Fixed - Feb 4, 2026)
- **Issue**: Uploaded images were not visible in student review mode after submission.
- **Cause**: API returned `answerImage` (string) but frontend expected `answerImages` (array).
- **Fix**: Backend now parses `answer_image_url` as JSON and returns `answerImages` array for proper display.

### ✅ Grading State Reset (Fixed - Feb 4, 2026)
- **Issue**: Switching between task grading modes retained old student selection.
- **Fix**: Added `setSelectedSubmission(null)` when entering grading mode in `Tasks.jsx`.

### ✅ Delete Question Image Button (Added - Feb 4, 2026)
- **Feature**: Teachers can now remove inserted images from questions in the editor.
- **Implementation**:
  - **Managers**: Added "Detected Images Manager" below `QuestionEditor.jsx` (Quiz) & `TaskEditor.jsx` (Task).
  - **Logic**: Parses HTML content to list embedded `<img>` tags. Delete button removes the specific image tag from the HTML string.
  - **UI**: Displayed as a thumbnail gallery with X button.

  - **UI**: Displayed as a thumbnail gallery with X button.

## 6. ✅ Offline Mode CBT (Semi-Offline) - IMPLEMENTED (Feb 2026)

### **Status**: FULLY IMPLEMENTED AND DEPLOYED

### **Architecture**
- **Unified Database**: Added `is_offline_mode` column to `quizzes` table.
- **Unified Entry**: Students use same "Quiz" menu; backend branches to appropriate flow.
- **Separate Component**: `StudentCBTOffline.jsx` ensures zero regression on online quizzes.

### **Completed Features**

#### 1. **Offline Flow (Teacher Side)**
- Toggle "Mode Offline" in Quiz Editor.
- Real-time monitoring via `/api/quiz/:id/offline-monitor` endpoint.
- Unified results table shows STATUS, 📱 (tab switches), and 📡 (connection detections).

#### 2. **Offline Flow (Student Side)**
- **Download Phase**: Questions + images cached to IndexedDB.
- **Image Caching**: All `<img>` src URLs converted to Base64 data URIs for offline display.
- **Lockdown Gate**: "MULAI UJIAN" disabled until `navigator.onLine === false`.
- **Execution**: Timer uses `performance.now()` (tamper-resistant). Answers saved locally.
- **Violation Tracking**:
  - `TAB_SWITCH`: Increments counter → auto-submit on 2nd offense.
  - `CONNECTION_DETECTED`: Logged but does NOT trigger auto-submit.
- **Submission**: Answers batch-uploaded when reconnected.

#### 3. **PWA Enforcement & iOS Compatibility**
- **Mandatory PWA Access**: Entire `/student/portal` blocked from browser. Must use installed PWA.
- **iOS localStorage Issue**: Safari ↔ PWA standalone have separate storage.
- **Solution**: Added `ManualCodeEntry` component for re-login when data lost.
  - Teacher sees shortcode on QR page: `CLASSID-TOKEN` (e.g., `1-A7B3C9XY`).
  - Student inputs code manually in PWA if localStorage empty.
- **Short Tokens**: New QR codes use 8-char alphanumeric (not UUID) for easy manual entry.

#### 4. **Files Modified**
| File | Changes |
|------|---------|
| `quizController.js` | Added offline endpoints: download, update-status, submit |
| `offlineQuizController.js` | Offline monitoring + violation parsing |
| `StudentCBTOffline.jsx` | New component for offline quiz flow |
| `useOfflineQuiz.js` | Custom hook for timer, answers, violations |
| `imageUtils.js` | Functions for Base64 image caching |
| `StudentPortal.jsx` | PWA enforcement block |
| `StudentLanding.jsx` | ManualCodeEntry component for iOS |
| `qrController.js` | Short token generation |
| `QRCodes.jsx` | Display shortcode for teachers |
| `QuizResults.jsx` | Unified table with offline columns |

---

## 7. ⚠️ Development Guidelines

### **Cascade Delete for FK Tables**
> [!IMPORTANT]
> When adding a new feature with a table that references `classes(id)` via Foreign Key, 
> you **MUST** add cascade delete logic in `classController.js` DELETE handler.

**Currently Handled Tables:**
- `students` (+ child: `grades`, `student_sessions`, `quiz_attempts`)
- `quizzes` (+ child: `quiz_questions`, `quiz_attempts`)
- `tasks` (+ child: `task_questions`, `task_submissions`, `task_answers`)
- `attendance`
- `class_schedules`
- `materials`
- `class_qr_codes`

**Pattern for New Tables:**
```javascript
// In classController.js DELETE handler:
// 1. If table has child FKs, delete children first (loop or subquery)
// 2. Add to batch delete array
await env.DB.batch([
  env.DB.prepare("DELETE FROM your_new_table WHERE class_id = ?").bind(id),
  // ... existing deletes
]);
```


## 8. Future Development Plan: SaaS Transformation (Multi-Tenant)

### **Objective**
Transform the single-school system into a SaaS platform where 1 Account = 1 Teacher/School, with centralized Super Admin management.

### **Roadmap Strategy**

#### **Phase 1: Data Isolation (The Foundation)**
- **Goal**: Ensure Teacher A cannot see Teacher B's classes.
- **Action**: 
  - Add `teacher_id` column to all primary tables (`classes`, `academic_periods`, `students`).
  - Refactor ALL controllers to inject `WHERE teacher_id = ?` in every query.
  - **Risk**: High effort, requires strict audit of all SQL queries.

#### **Phase 2: Super Admin & Access Control**
- **Goal**: Centralized management of users.
- **Action**:
  - Create `/admin` dashboard separate from teacher login.
  - Capabilities: Create Teacher, Suspend Account, Reset Password.
  - Table `teachers` with columns: `plan_type` (BASIC/PRO), `app_config` (JSON).

#### **Phase 3: White Labeling & Customization**
- **Goal**: Allow teachers to brand their app.
- **Action**:
  - **Basic**: Dynamic Header Title & Logo based on `app_config` JSON.
  - **Advanced**: Dynamic PWA Manifest (custom app icon on student home screen) - requires dynamic endpoint.

#### **Phase 4: Feature Flags (Monetization)**
- **Goal**: Lock premium features (e.g., Offline Mode) for PRO plans.
- **Action**: Middleware checks `plan_type` before allowing access to specific API routes (e.g., `/api/quiz/offline`).

## 9. Completed Features (Historical)
### ✅ Sidebar Restructure (Academic Flow)
Reorganized sidebar menu to follow the teaching workflow:
1.  **Dashboard**
2.  **Akademik** (Data Master: Periode, Kelas, Siswa)
3.  **KBM** (Jadwal, Absensi, Materi)
4.  **Evaluasi** (Tugas, Bank Soal/Quizzes, Nilai)
5.  **Tools** (QR Code, dll)
6.  **Pengaturan**

### ✅ Completed (Feb 5, 2026)
27. ✅ **Teaching Journal (Jurnal Mengajar)**:
    - **Feature**: Digital teaching log with dynamic templates and auto-attendance.
    - **Architecture**:
      - **App-Side Join**: `journalController.js` performs manual joining of Journals + Classes + Periods to avoid D1 SQL JOIN instability.
      - **PWA Fix**: Excluded `/api/*` from VitePWA navigation fallback to prevent React app interception.
      - **Migration**: `/api/migrate/journals` endpoint for initializing tables.
    - **Components**: `Journal.jsx`, `JournalForm.jsx`, `JournalSettings.jsx`.
    - **Database**: `teaching_journals`, `journal_templates`, `journal_settings`.

28. ✅ **Enhanced KOP Settings (Journal PDF)**:
    - **Dual Logo Support**: Upload Logo 2, independent positioning (Left/Right/Top/Bottom).
    - **Text Alignment**: Control alignment for School Name & Address (Left/Center/Right).
    - **Signature Features**: Delete button, Place & Date fields (Manual/Auto).
    - **Migration**: Added new columns to `journal_settings` table.

29. ✅ **Journal Visuals & Validation (Feb 5, 2026)**:
    - **Header**: PDF Table Header changed to White with borders.
    - **Signature**: Added "Jabatan" (Title) field.
    - **Validation**: Added `required` field check.
    - **Logo 2**: Fixed 403 Forbidden.

## 10. 📚 Database Schema Reference
> [!IMPORTANT]
> **Always refer to this schema before writing SQL queries.**
> Cloudflare D1 (SQLite) has specific limitations and this project uses specific naming conventions (e.g., `academic_periods` uses `year` & `semester`, NOT `name`).

### **Core Identity & School**
- **`users`**: `username` (PK), `password`, `salt`, `name`, `nip`, `subject`
- **`admin_sessions`**: `session_token`, `expires_at`, `username`
- **`school_profile`**: `id`, `name`, `address`, `headmaster`
- **`academic_periods`**: 
  - `id` (PK)
  - `year` (TEXT, e.g., "2024/2025")
  - `semester` (TEXT, e.g., "Ganjil")
  - `is_active` (INT)
  - *Note: No `name` column. Combine `year + ' - ' + semester` for display.*

### **Academic & Students**
- **`classes`**: `id` (PK), `period_id`, `name` (TEXT), `show_grades`
- **`students`**: `id` (PK), `period_id`, `class_id`, `name`, `qr_token` (UUID/Shortcode)
- **`student_sessions`**: `device_token`, `device_uuid_hash`, `is_active`

### **Learning Management (KBM)**
- **`class_schedules`**: `day` (INT 0-6), `start_time`, `end_time`, `subject`
- **`attendance`**: `class_id`, `student_id`, `date`, `status` (H/S/I/A)
- **`materials`**: `class_id`, `title`, `file_url`, `file_type`
- **`grades`**: `student_id`, `uh`, `uts`, `uas`, `tugas`, `final_grade`

### **Examination (CBT & Tasks)**
- **`quizzes`**: `id`, `title`, `duration`, `is_active`, `is_offline_mode`
- **`quiz_questions`**: `question_text`, `option_a`...`option_e`, `correct_answer`
- **`quiz_attempts`**: `student_id`, `score`, `student_answers` (JSON)
- **`tasks`**: `title`, `deadline`, `target_type` ('all'/'selected'), `pg_weight`
- **`task_submissions`**: `student_id`, `grade`, `is_graded` (0=None, 1=Partial, 2=Full)

### **Teaching Journal (Jurnal Mengajar)**
- **`teaching_journals`**: 
  - `id` (PK)
  - `class_id` (FK -> classes.id)
  - `period_id` (FK -> academic_periods.id)
  - `date`, `start_time`, `end_time`
  - `custom_data` (JSON String: `{"materi": "...", "absensi": "..."}`)
- **`journal_templates`**: `name`, `template_config` (JSON)
- **`journal_settings`**: `school_logo_url`, `signature_image_url`

## 11. Future Roadmap (Planned)

### 📊 Phase 2: Grade Integration (Integrasi Nilai)
- **Objective**: Auto-sync scores from Quizzes/Tasks to the Gradebook.
- **Current Issue**: Manual double-entry required (Quiz Result → Gradebook).
- **Plan**:
  - **One-Click Sync**: Button "Export to Gradebook" in Quiz/Task result page.
  - **Destination Selection**: Teacher chooses target column (UH/Tugas/UTS/UAS).
  - **Long-term**: Dynamic columns in Gradebook (e.g., UH 1, UH 2, Tugas 1, Tugas 2) instead of fixed columns.
