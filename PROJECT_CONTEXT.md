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
- [x] **Participation Feature**:
    - [x] Full CRUD for Participation Logs.
    - [x] History Modal with "Undo" (Delete) capability.
    - [x] Custom Confirmation Dialogs.
    - [x] Configurable Points System.
- [x] **UI/UX Refinements**:
    - [x] Sidebar Reordering ("Keaktifan" > "Nilai").
    - [x] Student Portal Grade Message Update.
    - [x] Quiz List UI Simplification (Dropdown Menu).
    - [x] Footer Branding Update.



    - [x] **Deep Linking**: implemented `class_id` auto-selection for Attendance & Materials.
- [x] **Grades (Nilai)**: Migrate `grades.js` -> `Grades.jsx`.
- [x] **Attendance**: Migrate `Attendance.jsx`.
- [x] **Schedule**: Migrate `schedule.js` -> `Schedule.jsx`.
- [x] **Materials**: Migrate `materials.js` -> `Materials.jsx`.

## 5. Active Session Context
**Current Focus**: Group Task Grading Fixes (Feb 11, 2026)
**Status**: All fixes deployed and verified.

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
Organized sidebar menu to follow the teaching workflow:
1.  **Dashboard**
2.  **Akademik** (Data Master: Periode, Kelas, Siswa, Kelompok)
3.  **KBM** (Jadwal, Absensi, Materi)
4.  **Evaluasi** (Tugas, Tugas Kelompok, Bank Soal/Quizzes, Nilai, Keaktifan)
5.  **Tools** (QR Code, dll)
6.  **Pengaturan**

### ✅ Completed (Feb 5, 2026)
27. ✅ **Teaching Journal (Jurnal Mengajar)**:
    - **Feature**: Digital teaching log with dynamic templates and auto-attendance.
    - **Components**: `Journal.jsx`, `JournalForm.jsx`, `JournalSettings.jsx`.
    - **Database**: `teaching_journals`, `journal_templates`, `journal_settings`.

28. ✅ **Enhanced KOP Settings (Journal PDF)**:
    - Dual Logo Support, Text Alignment, Signature Features.

29. ✅ **Journal Visuals & Validation (Feb 5, 2026)**.

### ✅ Completed (Feb 7-9, 2026)
30. ✅ **Participation Points (Nilai Keaktifan)**:
    - **Feature**: Configurable point types (Bertanya, Menjawab, Sukarela, Sanksi) per class.
    - **Components**: `Participation.jsx`, `participationController.js`.
    - **Database**: `participation_logs`, + new columns on `grades` and `classes`.

31. ✅ **Material Bank (Bank Bahan Ajar)**:
    - **Feature**: Centralized material repository with folder organization and class distribution.
    - **Database**: `material_folders`, `material_bank`, `material_distribution`.

32. ✅ **Group Management (Kelompok)**:
    - **Feature**: Group sets, groups, and member management per class.
    - **Components**: Group management in `groupController.js`.
    - **Database**: `group_sets`, `groups`, `group_members`.

### ✅ Completed (Feb 9-10, 2026)
33. ✅ **Group Tasks (Tugas Kelompok)**:
    - **Feature**: Full teacher group task interface mirroring individual tasks.
    - **Components**: `GroupTasks.jsx`, `GroupTaskEditor.jsx`, `GroupTaskList.jsx`, `GroupTaskGrading.jsx`.
    - **Student Side**: Group task detail view in `StudentTasks.jsx` with group member display, leader selection, and collaborative submission.
    - **Database**: `group_tasks`, `group_task_questions`, `group_task_submissions`, `group_task_answers`, `group_task_activity_log`.

### ✅ Completed (Feb 11, 2026)
34. ✅ **Group Task Grading Fixes**:
    - **PG Auto-Score**: Backend now auto-calculates PG scores (`pgWeight / totalPgQuestions`) on grade save, matching individual tasks.
    - **Smart `is_graded` Levels**: `is_graded=0` (submitted), `is_graded=1` (fully graded). Only sets 1 when ALL essays are graded.
    - **4-Level Teacher Status**: BELUM KUMPUL → SUDAH KUMPUL (blue) → SEBAGIAN DINILAI (yellow) → DINILAI (green).
    - **`is_published` Check**: Student detail endpoint strips grade/feedback/scores when `is_published != 1`.
    - **Custom Alerts**: Replaced native `confirm()`/`alert()` with `showConfirm`/`showAlert`.
    - **Per-Group Publish**: New `/api/group-tasks/publish-submission` endpoint for individual group publishing.
    - **Student Status System**: 5 states: DRAFT → BELUM DIKERJAKAN → DIKUMPULKAN → DIPERIKSA (blue) → DINILAI (green).
    - **Draft Handling**: Draft saves show as BELUM_DIKERJAKAN on teacher side; student sees "DRAFT" with "LANJUTKAN →" button.
    - **Grading Transparency**: Group tasks show both Bobot (weight) and Poin (earned) per question with color grading.
    - Files modified: `groupTaskController.js`, `GroupTaskGrading.jsx`, `GroupTasks.jsx`, `StudentTasks.jsx`.

## 10. 📚 Database Schema Reference
> [!IMPORTANT]
> **Always refer to this schema before writing SQL queries.**
> Cloudflare D1 (SQLite). `academic_periods` uses `year` & `semester`, NOT `name`.

### **Core Identity & School**
- **`users`**: `username` (PK), `password`, `salt`, `name`, `nip`, `subject`
- **`teacher_subjects`**: `id`, `username`, `subject_name`
- **`admin_sessions`**: `session_token`, `csrf_token`, `expires_at`, `username`
- **`school_profile`**: `id`, `name`, `address`, `headmaster`
- **`academic_periods`**: `id`, `year` (TEXT), `semester` (TEXT), `is_active` (INT)

### **Academic & Students**
- **`classes`**: `id`, `period_id`, `name`, `show_grades`, `participation_base_score` (default 60), `point_ask`, `point_answer`, `point_volunteer`, `point_sanction`
- **`students`**: `id`, `period_id`, `class_id`, `name`, `qr_token`
- **`student_sessions`**: `device_token`, `device_uuid_hash`, `is_active`
- **`class_qr_codes`**: `id`, `class_id`, `qr_token`

### **Learning Management (KBM)**
- **`class_schedules`**: `day` (INT 0-6), `start_time`, `end_time`, `subject`
- **`attendance`**: `class_id`, `student_id`, `date`, `status` (H/S/I/A)
- **`materials`**: `class_id`, `title`, `file_url`, `file_type` (legacy)
- **`grades`**: `student_id`, `uh`, `uts`, `uas`, `tugas`, `final_grade`, `participation`, `participation_notes`

### **Material Bank (Bahan Ajar)**
- **`material_folders`**: `id`, `period_id`, `name`
- **`material_bank`**: `id`, `period_id`, `folder_id`, `title`, `description`, `file_url`, `file_type`, `file_size`, `r2_key`
- **`material_distribution`**: `id`, `material_id`, `class_id`, `is_visible`

### **Image Bank (Bank Gambar)**
- **`image_folders`**: `id`, `name`
- **`images`**: `id`, `folder_id`, `filename`, `r2_key`, `size_bytes`, `mime_type`

### **Examination (CBT)**
- **`quizzes`**: `id`, `title`, `duration`, `is_active`, `is_offline_mode`, `is_random`, `show_results`, `tolerance_minutes`, `show_limit`, `scheduled_at`, `check_attendance`, `allowed_students`
- **`quiz_questions`**: `question_text`, `option_a`…`option_e`, `correct_answer`
- **`quiz_attempts`**: `student_id`, `score`, `student_answers` (JSON), `questions_order`, `offline_status`, `offline_violations`, `offline_duration`

### **Individual Tasks (Tugas Individu)**
- **`tasks`**: `id`, `period_id`, `class_id`, `title`, `deadline`, `target_type`, `allowed_students`, `is_active`, `pg_weight`, `allow_gallery`, `discussion_text`, `discussion_url`, `show_discussion`
- **`task_questions`**: `id`, `task_id`, `type` (pg/essay_text/essay_image), `question_text`, `question_image_url`, `options` (JSON), `correct_key`, `weight`, `char_limit`
- **`task_submissions`**: `id`, `task_id`, `student_id`, `grade`, `feedback`, `is_published` (0/1), `is_graded` (-1=Draft, 0=Submitted, 1=Fully Graded)
- **`task_answers`**: `id`, `submission_id`, `question_id`, `answer_text`, `answer_image_url`, `score`, `is_graded` (0/1)

### **Group Management (Kelompok)**
- **`group_sets`**: `id`, `class_id`, `name`
- **`groups`**: `id`, `set_id`, `name`, `leader_id`, `leader_selected_by`
- **`group_members`**: `id`, `group_id`, `student_id`

### **Group Tasks (Tugas Kelompok)**
- **`group_tasks`**: `id`, `period_id`, `class_id`, `group_set_id`, `title`, `description`, `deadline`, `question_mode`, `is_active`, `pg_weight`, `grades_published`, `discussion_text`, `discussion_url`, `show_discussion`
- **`group_task_questions`**: `id`, `group_task_id`, `type`, `question_text`, `question_image_url`, `options`, `correct_key`, `weight`
- **`group_task_submissions`**: `id`, `group_task_id`, `group_id`, `submitted_by`, `grade`, `feedback`, `is_graded` (-1=Draft, 0=Submitted, 1=Fully Graded), `is_published` (0/1), `submitted_at`
- **`group_task_answers`**: `id`, `submission_id`, `question_id`, `answer_text`, `answer_image_url`, `score`, `is_graded` (0/1)
- **`group_task_activity_log`**: `id`, `submission_id`, `student_id`, `question_id`, `action`, `detail`, `created_at`

### **Participation (Keaktifan)**
- **`participation_logs`**: `id`, `period_id`, `class_id`, `student_id`, `type`, `points`, `notes`, `created_at`

### **Teaching Journal (Jurnal Mengajar)**
- **`teaching_journals`**: `id`, `period_id`, `class_id`, `date`, `start_time`, `end_time`, `custom_data` (JSON)
- **`journal_templates`**: `id`, `name`, `is_default`, `template_config` (JSON)
- **`journal_settings`**: `id`, `school_name`, `school_address`, `school_logo_url`, `school_logo_2_url`, `logo_position`, `logo_2_position`, `school_name_align`, `school_address_align`, `pdf_orientation`, `signature_name`, `signature_nip`, `signature_image_url`, `signature_place`, `signature_date`, `signature_title`, `active_template_id`

## 11. 📊 Next Feature: Grade Integration (Integrasi Nilai)

### **Status**: DESIGN FINALIZED — Ready for Implementation

### **Objective**
Replace the rigid `grades` table (fixed columns: uh, uts, uas, tugas) with a **dynamic, configurable grading system** where teachers define their own components and weights.

### **Core Design Decisions**

| Topik | Keputusan |
|---|---|
| Komponen & Bobot | Guru buat sendiri + atur bobot (%) per **periode** |
| KKM | Guru set per **periode** (default 75) |
| Nilai | Dihitung per **kelas** (tugas/quiz per kelas bisa beda) |
| Default Template | Sudah ada template terisi yang bisa diedit |
| Tabel `grades` lama | Tidak dipakai, buat tabel baru |
| Student View | Nilai akhir saja (breakdown opsional, diatur toggle guru) |
| Export/Print | Nanti (Phase 2) |

### **Sumber Nilai & Cara Hitung**

| Komponen | Sumber | Rumus |
|---|---|---|
| Tugas Harian | Auto: semua task individu + kelompok (published & graded) | `total_nilai / jumlah_tugas` (0 jika tidak kumpul) |
| Ulangan Harian | Auto: semua quiz (published) | `total_nilai / jumlah_quiz` |
| UTS | Manual input / CSV upload | Langsung |
| UAS | Manual input / CSV upload | Langsung |
| Keaktifan | Auto: participation points | `base_score + total_points`, cap 100 |

> [!IMPORTANT]
> **Enforcement Rule**: Jika siswa tidak mengumpulkan tugas/quiz, nilainya = 0 dan tetap masuk pembagi. Contoh: 3 tugas, siswa hanya kumpul 2 (70, 75) → avg = (70 + 75 + 0) / 3 = 48.3.

### **Manual Override**
- Guru bisa **override** nilai auto per siswa per komponen
- Nilai yang di-override ditampilkan dengan **warna biru** sebagai tanda manual edit
- Database: `manual_override` column. Effective value = `COALESCE(manual_override, auto_value)`
- Use case: guru ingin "angkat" nilai siswa jika terlalu rendah

### **Contoh Perhitungan**
```
Konfigurasi: Tugas 30%, UH 25%, UTS 20%, UAS 15%, Keaktifan 10%  |  KKM: 75

Siswa A:
  Tugas Harian  = avg(80, 80, 80) = 80   × 30% = 24.0
  Ulangan Harian = avg(70, 75)    = 72.5 × 25% = 18.125
  UTS            = 65                    × 20% = 13.0
  UAS            = 70                    × 15% = 10.5
  Keaktifan      = 85                    × 10% = 8.5
  ─────────────────────────────────────────────────
  Nilai Akhir = 74.125  ⚠️ DI BAWAH KKM!
```

### **CSV Upload (UTS/UAS)**
Format: `Nama,Nilai`
```csv
Nama,Nilai
Ahmad Fauzi,75
Budi Santoso,80
Citra Dewi,65
```
- Match berdasarkan nama siswa di kelas
- Preview sebelum import: nama tidak cocok → warning merah
- Guru pilih komponen tujuan (UTS/UAS) saat upload

### **Remedial Flow (Opsi B3 — Simpel)**
```
1. Sistem deteksi NA < KKM → badge ⚠️ merah di tabel nilai
2. Guru beri tugas remedial di menu Tugas (seperti biasa, tidak perlu linking)
3. Siswa kerjakan → guru nilai di menu Tugas
4. Di halaman Nilai, tombol "Remedial → KKM" muncul untuk siswa di bawah KKM
5. Guru klik → konfirmasi → NA = KKM (75) ✅
6. Badge berubah hijau: "Remedial ✅"
```
- Tombol **hanya aktif** jika NA < KKM (tidak bisa disalahgunakan)
- Database: `is_remedial = true`, `remedial_at` (timestamp) sebagai audit trail
- Tidak perlu linking ke tugas spesifik — guru yang memutuskan kapan remedial sah

### **UI Rekap Nilai (Teacher)**
```
┌──────────────────────────────────────────────────────────────┐
│ Kelas: XI IPA 1                                    KKM: 75  │
├───────────────┬───────┬───────┬─────┬─────┬──────┬──────┬───┤
│ Siswa         │ Tugas │ UH    │ UTS │ UAS │ Akt  │ NA   │   │
│               │ (30%) │ (25%) │(20%)│(15%)│(10%) │      │   │
├───────────────┼───────┼───────┼─────┼─────┼──────┼──────┼───┤
│ Ahmad Fauzi   │  80   │ [72]🔵│ 65  │ 70  │  85  │ 76.4 │ ✅ │
│ Budi Santoso  │  50   │  45   │ 60  │ 55  │  70  │ 53.5 │ ⚠️ │
│ Citra Dewi    │  90   │  85   │ 80  │ 78  │  90  │ 85.2 │ ✅ │
└───────────────┴───────┴───────┴─────┴─────┴──────┴──────┴───┘

🔵 = Diedit guru (override manual)
⚠️ = Di bawah KKM → tombol "Remedial → KKM"
✅ = Lulus / Sudah remedial
```

### **Planned Database Schema**
```sql
-- Komponen nilai per periode (guru configurable)
grade_components (
  id INTEGER PRIMARY KEY,
  period_id INTEGER,         -- FK → academic_periods
  name TEXT,                 -- "Tugas Harian", "UH", "UTS", "UAS", "Keaktifan"
  weight INTEGER,            -- Bobot persentase (30, 25, 20, 15, 10)
  source_type TEXT,          -- 'tasks' | 'quizzes' | 'participation' | 'manual'
  sort_order INTEGER
)

-- Nilai per komponen per siswa
grade_values (
  id INTEGER PRIMARY KEY,
  component_id INTEGER,      -- FK → grade_components
  class_id INTEGER,          -- FK → classes
  student_id INTEGER,        -- FK → students
  auto_value REAL,           -- Nilai auto-kalkulasi
  manual_override REAL,      -- Override guru (NULL = pakai auto). Ditandai biru di UI
  is_remedial INTEGER DEFAULT 0,  -- 1 = sudah remedial
  remedial_at TEXT           -- Timestamp remedial
)

-- KKM per periode
ALTER TABLE academic_periods ADD COLUMN kkm INTEGER DEFAULT 75;

-- Toggle breakdown visibility untuk siswa
ALTER TABLE academic_periods ADD COLUMN show_grade_breakdown INTEGER DEFAULT 0;
```

### **Implementation Phases**
1. **Phase 1**: Database migration + Component CRUD + KKM setting
2. **Phase 2**: Auto-calculation engine (tasks, quizzes, participation → grade_values)
3. **Phase 3**: Manual input UI + CSV upload for UTS/UAS
4. **Phase 4**: Override manual (blue indicator) + Remedial flow
5. **Phase 5**: Student-side display (final grade + optional breakdown)
6. **Future**: Export/Print rekap nilai (PDF)

## 12. 📊 Future Feature: Item Analysis & Question Bank (Analisis Butir Soal)

### **Status**: CONCEPTUAL DESIGN (Feb 12, 2026)

### **Objective**
Implement sophisticated psychometric analysis for exam questions (Item Analysis) to evaluate question quality (Difficulty, Discrimination, Distractor Effectiveness).

### **Core Problem**
Current system stores questions locally within each Quiz (`quiz_questions`).
- **Challenge**: Randomized questions (Bank 30 -> Show 10) fragment the sample size, making per-quiz analysis statistically weak for small classes (<30 students).
- **Challenge**: Copied quizzes (`Copy Quiz`) create new question IDs, preventing aggregated analysis across classes/semesters.

### **Planned Solution: Hybrid Question Bank**

#### **1. Database Schema Enhancements**
```sql
-- Link copied quizzes to their parent (for aggregation)
ALTER TABLE quizzes ADD COLUMN parent_quiz_id INTEGER;

-- Link copied questions to their origin (for aggregation)
ALTER TABLE quiz_questions ADD COLUMN parent_question_id INTEGER;

-- [Future] Centralized Question Bank Table
CREATE TABLE question_bank (
  id INTEGER PRIMARY KEY,
  folder_id INTEGER,   -- Organized by Topic/Chapter
  type TEXT,           -- PG/Essay
  question_text TEXT,
  -- ...options,
  created_at TEXT
);
```

#### **2. Analysis Metrics (The "Holy Trinity")**
- **Tingkat Kesukaran ($P$)**: `Correct Answers / Total Attempts`. (Mudah > 0.7, Sukar < 0.3)
- **Daya Beda ($D$)**: `(Upper Group Correct - Lower Group Correct) / (0.5 * N)`.
  - Determines if the question correctly differentiates high-performing vs low-performing students.
  - Requires sorting students by total score first.
- **Distractor Effectiveness**: Percentage of students choosing each wrong option (A, B, C, D, E).
  - 0% selection = Bad distractor.

#### **3. Editor Workflow Changes**
- **New Feature**: "Import from Question Bank" in Quiz Editor.
- **UI**:
  - Tab 1: **Manual Input** (Local Question)
  - Tab 2: **Question Bank** (Search, Filter by Topic, Select & Import)
- **Logic**: Importing links the local `quiz_question` to the `question_bank` ID, enabling cross-exam analytics.

#### **4. Visualization (Analytics Dashboard)**
- **Placement**: Inside Quiz Detail -> New Tab "Analisis Butir Soal".
- **Views**:
  - **Per-Quiz**: Analysis based only on students in that specific class/quiz.
  - **Aggregated (Smart)**: Uses `parent_quiz_id` or `question_bank_id` to pool data from ALL classes that used this question.
