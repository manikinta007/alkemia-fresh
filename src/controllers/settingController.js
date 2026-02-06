// controllers/settingController.js
// Mengelola Autentikasi (Secure), Profil Sekolah, dan Init DB
// SECURED: PBKDF2/SHA-256 Hashing + Database Sessions + CSRF Token
// Update: Support Multi-Mapel (Teacher Subjects) & Attendance Check for Quiz

import { jsonResponse, hashPassword, generateSalt } from '../utils.js';

export async function handleSettingRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  try {
    // ========================================
    // 1. AUTHENTICATION (SECURE LOGIN)
    // ========================================
    if (pathname === "/api/login" && method === "POST") {
      const body = await request.json();
      const { username, password } = body;

      if (!username || !password) {
        return jsonResponse({ error: "Username dan password harus diisi" }, 400);
      }

      // 1. Ambil user berdasarkan username
      const user = await env.DB.prepare(`
        SELECT * FROM users WHERE username = ?
      `).bind(username).first();

      if (!user) {
        return jsonResponse({ error: "Username atau Password salah" }, 401);
      }

      // 2. Hash password input dengan SALT yang ada di database
      const inputHash = await hashPassword(password, user.salt);

      // 3. Bandingkan Hash
      if (inputHash === user.password) {
        // LOGIN SUKSES -> Generate Session & CSRF Token

        const sessionToken = crypto.randomUUID(); // Untuk Cookie (HttpOnly)
        const csrfToken = crypto.randomUUID();    // Untuk Header (Client Side)

        // Set expired 24 jam dari sekarang
        await env.DB.prepare(`
            INSERT INTO admin_sessions (session_token, csrf_token, username, expires_at)
            VALUES (?, ?, ?, datetime('now', '+1 day'))
        `).bind(sessionToken, csrfToken, user.username).run();

        const school = await env.DB.prepare("SELECT * FROM school_profile WHERE id = 1").first();
        const activePeriod = await env.DB.prepare(`SELECT * FROM academic_periods WHERE is_active = 1 LIMIT 1`).first();

        // [NEW] Ambil Daftar Mapel Guru (Multi-Subject)
        const { results: subjectsRes } = await env.DB.prepare(`
            SELECT subject_name FROM teacher_subjects WHERE username = ?
        `).bind(user.username).all();

        const subjects = subjectsRes.map(s => s.subject_name);

        // Return Data
        return jsonResponse({
          success: true,
          sessionToken: sessionToken,
          csrfToken: csrfToken,
          user: {
            name: user.name,
            username: user.username,
            role: "admin",
            nip: user.nip,
            subjects: subjects // Array Mapel (['Kimia', 'Fisika'])
          },
          school: school || { name: 'Belum diset' },
          activePeriod: activePeriod || null
        });

      } else {
        return jsonResponse({ error: "Username atau Password salah" }, 401);
      }
    }

    // ========================================
    // 2. CHANGE PASSWORD (SECURE)
    // ========================================
    if (pathname === "/api/change-password" && method === "POST") {
      const body = await request.json();
      const { username, oldPassword, newPassword } = body;

      if (!username || !oldPassword || !newPassword) {
        return jsonResponse({ error: "Data tidak lengkap" }, 400);
      }

      // Ambil user untuk dapatkan salt lama
      const user = await env.DB.prepare(`SELECT * FROM users WHERE username = ?`).bind(username).first();

      if (!user) return jsonResponse({ error: "User tidak ditemukan" }, 404);

      // Verifikasi password lama
      const oldHash = await hashPassword(oldPassword, user.salt);
      if (oldHash !== user.password) {
        return jsonResponse({ error: "Password lama salah!" }, 401);
      }

      // Generate Salt Baru & Hash Password Baru
      const newSalt = generateSalt();
      const newHash = await hashPassword(newPassword, newSalt);

      // Update Database
      await env.DB.prepare(`
        UPDATE users SET password = ?, salt = ? WHERE username = ?
      `).bind(newHash, newSalt, username).run();

      return jsonResponse({ message: "Password berhasil diperbarui. Silakan login ulang." });
    }

    // ========================================
    // 3. SCHOOL & USER PROFILE
    // ========================================

    // Get School Info
    if (pathname === "/api/school" && method === "GET") {
      const result = await env.DB.prepare(`
        SELECT * FROM school_profile WHERE id = 1
      `).first();
      return jsonResponse(result || {});
    }

    // Update Profile (Support Multi-Mapel)
    if (pathname === "/api/save-all-profile" && method === "POST") {
      const body = await request.json();
      const { user, school } = body; // user.subjects harus array

      // 1. Update Data Dasar User
      await env.DB.prepare(`
        UPDATE users SET name = ?, nip = ? WHERE username = ?
      `).bind(user.name, user.nip, user.username).run();

      // 2. Update Mapel (Hapus Lama -> Insert Baru)
      await env.DB.prepare("DELETE FROM teacher_subjects WHERE username = ?").bind(user.username).run();

      if (user.subjects && Array.isArray(user.subjects) && user.subjects.length > 0) {
        const stmt = env.DB.prepare("INSERT INTO teacher_subjects (username, subject_name) VALUES (?, ?)");
        // Eksekusi batch insert
        const batch = user.subjects.map(s => stmt.bind(user.username, s));
        await env.DB.batch(batch);
      }

      // 3. Update Sekolah
      await env.DB.prepare(`
        UPDATE school_profile SET name = ?, address = ?, headmaster = ? WHERE id = 1
      `).bind(school.name, school.address, school.headmaster).run();

      // 4. Ambil Data Terbaru untuk Return
      const updatedUser = await env.DB.prepare(`SELECT name, username, nip FROM users WHERE username = ?`).bind(user.username).first();
      const { results: newSubjects } = await env.DB.prepare(`SELECT subject_name FROM teacher_subjects WHERE username = ?`).bind(user.username).all();

      updatedUser.subjects = newSubjects.map(s => s.subject_name);

      return jsonResponse({ message: "Semua data berhasil disimpan.", user: updatedUser });
    }

    // ========================================
    // 4. SYSTEM INIT (RESET DATABASE WITH CSRF TABLE)
    // ========================================
    if (pathname === "/api/init" && method === "GET") {
      try {
        // Generate Default Admin Credentials
        const defaultSalt = generateSalt();
        const defaultPassHash = await hashPassword("guru123", defaultSalt);

        await env.DB.batch([
          // --- HAPUS TABEL LAMA (Urutan Dibalik: Child -> Parent) ---
          // Ini mencegah error "FOREIGN KEY constraint failed"

          // 1. Level Transaksi & Detail (Paling Bawah)
          env.DB.prepare("DROP TABLE IF EXISTS task_answers"),     // [Modul Tasks]
          env.DB.prepare("DROP TABLE IF EXISTS task_submissions"), // [Modul Tasks]
          env.DB.prepare("DROP TABLE IF EXISTS task_questions"),   // [Modul Tasks]
          env.DB.prepare("DROP TABLE IF EXISTS quiz_attempts"),
          env.DB.prepare("DROP TABLE IF EXISTS quiz_questions"),
          env.DB.prepare("DROP TABLE IF EXISTS grades"),
          env.DB.prepare("DROP TABLE IF EXISTS attendance"),
          env.DB.prepare("DROP TABLE IF EXISTS class_schedules"),
          env.DB.prepare("DROP TABLE IF EXISTS teacher_subjects"),
          env.DB.prepare("DROP TABLE IF EXISTS admin_sessions"),
          env.DB.prepare("DROP TABLE IF EXISTS student_sessions"),
          env.DB.prepare("DROP TABLE IF EXISTS class_qr_codes"),
          env.DB.prepare("DROP TABLE IF EXISTS materials"),
          env.DB.prepare("DROP TABLE IF EXISTS images"),           // [Gudang Gambar]
          env.DB.prepare("DROP TABLE IF EXISTS image_folders"),    // [Gudang Gambar]
          env.DB.prepare("DROP TABLE IF EXISTS teaching_journals"), // [Jurnal Mengajar]
          env.DB.prepare("DROP TABLE IF EXISTS journal_templates"), // [Jurnal Mengajar]
          env.DB.prepare("DROP TABLE IF EXISTS journal_settings"),  // [Jurnal Mengajar]

          // 2. Level Fitur Utama (Middle)
          env.DB.prepare("DROP TABLE IF EXISTS tasks"),            // [Modul Tasks]
          env.DB.prepare("DROP TABLE IF EXISTS quizzes"),

          // 3. Level Entitas (Middle-High)
          env.DB.prepare("DROP TABLE IF EXISTS students"),
          env.DB.prepare("DROP TABLE IF EXISTS classes"),

          // 4. Level Induk (Top Level)
          env.DB.prepare("DROP TABLE IF EXISTS academic_periods"),
          env.DB.prepare("DROP TABLE IF EXISTS school_profile"),
          env.DB.prepare("DROP TABLE IF EXISTS users"),

          // --- BUAT TABEL BARU (CREATE) ---

          // Tabel User (Guru) - Subject kolom tetap ada untuk legacy/primary, tapi kita pakai tabel relasi
          env.DB.prepare(`
            CREATE TABLE users (
              username TEXT PRIMARY KEY, 
              password TEXT NOT NULL, 
              salt TEXT NOT NULL,
              name TEXT NOT NULL, 
              nip TEXT, 
              subject TEXT 
            )
          `),

          // [NEW] Tabel Mapel Guru (Multi-Subject)
          env.DB.prepare(`
            CREATE TABLE teacher_subjects (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username TEXT NOT NULL,
              subject_name TEXT NOT NULL,
              FOREIGN KEY (username) REFERENCES users(username)
            )
          `),

          // Tabel Admin Sessions (NEW) - Anti-Spoofing & CSRF
          env.DB.prepare(`
            CREATE TABLE admin_sessions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              session_token TEXT UNIQUE NOT NULL,
              csrf_token TEXT NOT NULL,
              username TEXT NOT NULL,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              expires_at TEXT NOT NULL
            )
          `),

          // Tabel Profil Sekolah
          env.DB.prepare(`
            CREATE TABLE school_profile (
              id INTEGER PRIMARY KEY, 
              name TEXT NOT NULL, 
              address TEXT, 
              headmaster TEXT
            )
          `),

          // Tabel Periode Akademik
          env.DB.prepare(`
            CREATE TABLE academic_periods (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              year TEXT NOT NULL,
              semester TEXT NOT NULL,
              is_active INTEGER DEFAULT 0,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
          `),

          // Tabel Kelas
          env.DB.prepare(`
            CREATE TABLE classes (
              id INTEGER PRIMARY KEY AUTOINCREMENT, 
              period_id INTEGER NOT NULL,
              name TEXT NOT NULL, 
              show_grades INTEGER DEFAULT 0, 
              FOREIGN KEY (period_id) REFERENCES academic_periods(id)
            )
          `),

          // Tabel Siswa
          env.DB.prepare(`
            CREATE TABLE students (
              id INTEGER PRIMARY KEY AUTOINCREMENT, 
              period_id INTEGER NOT NULL,
              class_id INTEGER NOT NULL, 
              name TEXT NOT NULL, 
              qr_token TEXT NOT NULL,
              FOREIGN KEY (period_id) REFERENCES academic_periods(id),
              FOREIGN KEY (class_id) REFERENCES classes(id)
            )
          `),

          // Tabel Absensi (Presensi)
          env.DB.prepare(`
            CREATE TABLE attendance (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              class_id INTEGER NOT NULL,
              student_id INTEGER NOT NULL,
              date TEXT NOT NULL,
              status TEXT NOT NULL,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (class_id) REFERENCES classes(id),
              FOREIGN KEY (student_id) REFERENCES students(id)
            )
          `),

          // Tabel Jadwal Pelajaran (Roster)
          env.DB.prepare(`
            CREATE TABLE class_schedules (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              period_id INTEGER NOT NULL,
              class_id INTEGER NOT NULL,
              day INTEGER NOT NULL, 
              start_time TEXT NOT NULL,
              end_time TEXT NOT NULL,
              subject TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (period_id) REFERENCES academic_periods(id),
              FOREIGN KEY (class_id) REFERENCES classes(id)
            )
          `),

          // Tabel Nilai
          env.DB.prepare(`
            CREATE TABLE grades (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              period_id INTEGER NOT NULL,
              student_id INTEGER NOT NULL,
              uh REAL DEFAULT 0,
              uts REAL DEFAULT 0,
              uas REAL DEFAULT 0,
              tugas REAL DEFAULT 0,
              final_grade REAL DEFAULT 0,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (period_id) REFERENCES academic_periods(id),
              FOREIGN KEY (student_id) REFERENCES students(id)
            )
          `),

          // Tabel Bahan Ajar
          env.DB.prepare(`
            CREATE TABLE materials (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              period_id INTEGER NOT NULL,
              class_id INTEGER NOT NULL,
              title TEXT NOT NULL,
              description TEXT,
              file_url TEXT,
              file_type TEXT,
              is_visible INTEGER DEFAULT 1,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (period_id) REFERENCES academic_periods(id),
              FOREIGN KEY (class_id) REFERENCES classes(id)
            )
          `),

          // Tabel Student Sessions (UPDATED: Digital Tagging + Hash)
          env.DB.prepare(`
            CREATE TABLE student_sessions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              student_id INTEGER NOT NULL,
              device_token TEXT UNIQUE NOT NULL,
              device_info TEXT,
              device_uuid_hash TEXT, 
              device_uuid_salt TEXT,
              user_agent TEXT,
              claimed_at TEXT DEFAULT CURRENT_TIMESTAMP,
              last_access TEXT DEFAULT CURRENT_TIMESTAMP,
              is_active INTEGER DEFAULT 1,
              FOREIGN KEY (student_id) REFERENCES students(id)
            )
          `),

          // Tabel Class QR Codes
          env.DB.prepare(`
            CREATE TABLE class_qr_codes (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              class_id INTEGER NOT NULL,
              qr_token TEXT UNIQUE NOT NULL,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (class_id) REFERENCES classes(id)
            )
          `),

          // Tabel Quiz (Header) - Updated with Offline Mode
          env.DB.prepare(`
            CREATE TABLE quizzes (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              period_id INTEGER NOT NULL,
              class_id INTEGER NOT NULL,
              title TEXT NOT NULL,
              description TEXT,
              duration INTEGER DEFAULT 60,
              tolerance_minutes INTEGER DEFAULT 0,
              show_limit INTEGER DEFAULT 0,
              is_random INTEGER DEFAULT 0,
              show_results INTEGER DEFAULT 0,
              scheduled_at TEXT,
              is_active INTEGER DEFAULT 0,
              check_attendance INTEGER DEFAULT 0,
              allowed_students TEXT,
              is_offline_mode INTEGER DEFAULT 0,  -- [NEW] Mode Offline CBT
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (period_id) REFERENCES academic_periods(id),
              FOREIGN KEY (class_id) REFERENCES classes(id)
            )
          `),

          // Tabel Soal Quiz
          env.DB.prepare(`
            CREATE TABLE quiz_questions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              quiz_id INTEGER NOT NULL,
              question_text TEXT NOT NULL,
              option_a TEXT NOT NULL,
              option_b TEXT NOT NULL,
              option_c TEXT NOT NULL,
              option_d TEXT NOT NULL,
              option_e TEXT NOT NULL,
              correct_answer TEXT NOT NULL,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
            )
          `),

          // Tabel Percobaan/Hasil Siswa - Updated with Offline Tracking
          env.DB.prepare(`
            CREATE TABLE quiz_attempts (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              quiz_id INTEGER NOT NULL,
              student_id INTEGER NOT NULL,
              questions_order TEXT,
              student_answers TEXT,
              start_time TEXT,
              finish_time TEXT,
              score REAL DEFAULT 0,
              offline_status TEXT DEFAULT NULL,      -- [NEW] Offline tracking
              offline_violations TEXT DEFAULT NULL,  -- [NEW] Violation logs
              offline_duration INTEGER DEFAULT NULL, -- [NEW] Time spent offline
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
              FOREIGN KEY (student_id) REFERENCES students(id)
            )
          `),

          // ========================================
          // MODUL TASKS (Tugas & Remedial) - V10
          // ========================================

          // Tabel Tasks (Header Tugas)
          env.DB.prepare(`
            CREATE TABLE tasks (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              period_id INTEGER,
              class_id INTEGER,
              title TEXT NOT NULL,
              description TEXT,
              deadline TEXT,
              target_type TEXT DEFAULT 'all',
              allowed_students TEXT,
              is_active INTEGER DEFAULT 0,
              pg_weight INTEGER DEFAULT 0,
              allow_gallery INTEGER DEFAULT 0,
              discussion_text TEXT,              -- [V10] Pembahasan Global
              discussion_url TEXT,               -- [V10] Link Kunci Jawaban
              show_discussion INTEGER DEFAULT 0, -- [V10] Toggle Pembahasan
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (period_id) REFERENCES academic_periods(id),
              FOREIGN KEY (class_id) REFERENCES classes(id)
            )
          `),

          // Tabel Task Questions (Butir Soal)
          env.DB.prepare(`
            CREATE TABLE task_questions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              task_id INTEGER,
              type TEXT NOT NULL,
              question_text TEXT,
              question_image_url TEXT,
              options TEXT,
              correct_key TEXT,
              char_limit INTEGER DEFAULT 500,
              weight INTEGER DEFAULT 0,
              FOREIGN KEY (task_id) REFERENCES tasks(id)
            )
          `),

          // Tabel Task Submissions (Pengumpulan Siswa)
          env.DB.prepare(`
            CREATE TABLE task_submissions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              task_id INTEGER,
              student_id INTEGER,
              grade REAL DEFAULT 0,
              feedback TEXT,
              is_published INTEGER DEFAULT 0,
              is_graded INTEGER DEFAULT 0,  -- 0=Belum, 1=Selesai, -1=Draft
              submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (task_id) REFERENCES tasks(id),
              FOREIGN KEY (student_id) REFERENCES students(id)
            )
          `),

          // Tabel Task Answers (Jawaban Per Nomor)
          env.DB.prepare(`
            CREATE TABLE task_answers (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              submission_id INTEGER,
              question_id INTEGER,
              answer_text TEXT,
              answer_image_url TEXT,
              score REAL DEFAULT 0,
              is_graded INTEGER DEFAULT 0,  -- [NEW] Flag untuk essay grading
              FOREIGN KEY (submission_id) REFERENCES task_submissions(id),
              FOREIGN KEY (question_id) REFERENCES task_questions(id)
            )
          `),

          // ========================================
          // MODUL GUDANG GAMBAR (Image Gallery)
          // ========================================

          env.DB.prepare(`
            CREATE TABLE image_folders (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
          `),

          env.DB.prepare(`
            CREATE TABLE images (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              folder_id INTEGER,
              filename TEXT NOT NULL,
              r2_key TEXT NOT NULL UNIQUE,
              size_bytes INTEGER,
              mime_type TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (folder_id) REFERENCES image_folders(id) ON DELETE SET NULL
            )
          `),

          env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_images_folder ON images(folder_id)`),
          env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_images_created ON images(created_at DESC)`),

          // ========================================
          // MODUL JURNAL MENGAJAR (Teaching Journal)
          // ========================================

          env.DB.prepare(`
            CREATE TABLE teaching_journals (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              period_id INTEGER,
              class_id INTEGER NOT NULL,
              date TEXT NOT NULL,
              start_time TEXT,
              end_time TEXT,
              custom_data TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (period_id) REFERENCES academic_periods(id),
              FOREIGN KEY (class_id) REFERENCES classes(id)
            )
          `),

          env.DB.prepare(`
            CREATE TABLE journal_templates (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              is_default INTEGER DEFAULT 0,
              template_config TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
          `),

          env.DB.prepare(`
            CREATE TABLE journal_settings (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              school_name TEXT,
              school_address TEXT,
              school_logo_url TEXT,
              school_logo_2_url TEXT,
              logo_position TEXT DEFAULT 'left',
              logo_2_position TEXT,
              school_name_align TEXT DEFAULT 'center',
              school_address_align TEXT DEFAULT 'center',
              pdf_orientation TEXT DEFAULT 'landscape',
              signature_name TEXT,
              signature_nip TEXT,
              signature_image_url TEXT,
              signature_place TEXT DEFAULT 'Jakarta',
              signature_date TEXT,
              signature_title TEXT,
              active_template_id INTEGER,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (active_template_id) REFERENCES journal_templates(id)
            )
          `),

          env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_journals_class ON teaching_journals(class_id)`),
          env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_journals_date ON teaching_journals(date DESC)`),

          // Seed Data (Admin dengan Secure Hash)
          env.DB.prepare(`
            INSERT INTO users (username, password, salt, name, nip, subject) 
            VALUES ('admin', ?, ?, 'Bapak Guru', '-', 'Kimia')
          `).bind(defaultPassHash, defaultSalt),

          // Seed Data (Teacher Subject Default: Kimia)
          env.DB.prepare(`
            INSERT INTO teacher_subjects (username, subject_name) VALUES ('admin', 'Kimia')
          `),

          env.DB.prepare(`
            INSERT INTO school_profile (id, name, address, headmaster) 
            VALUES (1, 'SMA Harapan Bangsa', 'Jl. Pendidikan No. 1', 'Dr. Kepala Sekolah')
          `),

          env.DB.prepare(`
            INSERT INTO academic_periods (year, semester, is_active) 
            VALUES ('2024/2025', 'Ganjil', 1)
          `),

          // Seed: Default Image Folder
          env.DB.prepare(`INSERT INTO image_folders (id, name) VALUES (1, 'Umum')`),

          // Seed: Default Journal Templates
          env.DB.prepare(`
            INSERT INTO journal_templates (name, is_default, template_config) VALUES 
            ('Kurikulum Merdeka', 1, ?)
          `).bind(JSON.stringify([
            { key: "jp", label: "JP", type: "number", width: 40 },
            { key: "temu", label: "Temu Ke-", type: "number", width: 60 },
            { key: "tujuan", label: "Tujuan Pembelajaran", type: "textarea", width: 200 },
            { key: "iktp", label: "IKTP", type: "textarea", width: 150 },
            { key: "materi", label: "Materi", type: "textarea", width: 150 },
            { key: "capaian", label: "Capaian KKTP", type: "textarea", width: 150 },
            { key: "absensi", label: "Absensi", type: "attendance_summary", width: 100 },
            { key: "keterangan", label: "Keterangan", type: "text", width: 150 }
          ])),

          env.DB.prepare(`
            INSERT INTO journal_templates (name, is_default, template_config) VALUES 
            ('Kurikulum 2013', 1, ?)
          `).bind(JSON.stringify([
            { key: "kd", label: "Kompetensi Dasar", type: "textarea", width: 180 },
            { key: "indikator", label: "Indikator", type: "textarea", width: 180 },
            { key: "materi_pokok", label: "Materi Pokok", type: "textarea", width: 150 },
            { key: "metode", label: "Metode", type: "text", width: 100 },
            { key: "absensi", label: "Absensi", type: "attendance_summary", width: 100 },
            { key: "refleksi", label: "Refleksi", type: "textarea", width: 150 }
          ])),

          env.DB.prepare(`
            INSERT INTO journal_templates (name, is_default, template_config) VALUES 
            ('Minimalis', 1, ?)
          `).bind(JSON.stringify([
            { key: "materi", label: "Materi", type: "textarea", width: 200 },
            { key: "kegiatan", label: "Kegiatan Pembelajaran", type: "textarea", width: 250 },
            { key: "absensi", label: "Absensi", type: "attendance_summary", width: 100 },
            { key: "catatan", label: "Catatan", type: "text", width: 150 }
          ]))
        ]);

        return jsonResponse({
          message: "Database Security Reset Berhasil! (CSRF Protection Ready)",
          info: "Default Login: admin / guru123"
        });
      } catch (e) {
        return jsonResponse({ error: "Init Gagal: " + e.message }, 500);
      }
    }

    return null;
  } catch (err) {
    return jsonResponse({ error: "Setting Controller Error: " + err.message }, 500);
  }
}