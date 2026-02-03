// controllers/migrationController.js
// KHUSUS UNTUK UPDATE STRUKTUR DATABASE (MIGRATION V10)
// Fitur: Tasks + Draft/Publish + Smart Grading + Gallery Permission + Publish Grades + Explicit Graded Status
// Update V10: Master Key Columns (Discussion Text/URL & Show Toggle)

import { jsonResponse } from '../utils.js';

export async function handleMigrationRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  try {
    // 1. FULL RESET & INIT (Jalankan ini HANYA untuk instalasi baru atau jika ingin menghapus semua data tugas)
    // Endpoint: /api/migrate/tasks
    if (pathname === "/api/migrate/tasks" && method === "GET") {

      await env.DB.batch([
        // 1. BERSIHKAN TABEL LAMA (Reset Schema agar bersih)
        // Urutan drop penting karena Foreign Key
        env.DB.prepare("DROP TABLE IF EXISTS task_answers"),
        env.DB.prepare("DROP TABLE IF EXISTS task_submissions"),
        env.DB.prepare("DROP TABLE IF EXISTS task_questions"),
        env.DB.prepare("DROP TABLE IF EXISTS tasks"),

        // 2. TABEL TASKS (Header Tugas)
        // [UPDATE V10] Tambah kolom discussion_text, discussion_url, show_discussion
        env.DB.prepare(`
          CREATE TABLE tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            period_id INTEGER,
            class_id INTEGER,
            title TEXT NOT NULL,
            description TEXT,
            deadline TEXT,
            target_type TEXT DEFAULT 'all', -- 'all' atau 'specific'
            allowed_students TEXT,          -- JSON Array ID Siswa (jika specific)
            is_active INTEGER DEFAULT 0,    -- 0 = Draft, 1 = Published
            pg_weight INTEGER DEFAULT 0,    -- Bobot Total PG
            allow_gallery INTEGER DEFAULT 0, -- 0 = Wajib Kamera, 1 = Boleh Galeri
            discussion_text TEXT,           -- [BARU V10] Pembahasan Global (Teks)
            discussion_url TEXT,            -- [BARU V10] Link/Gambar Kunci
            show_discussion INTEGER DEFAULT 0, -- [BARU V10] 0 = Tutup, 1 = Buka
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (period_id) REFERENCES academic_periods(id),
            FOREIGN KEY (class_id) REFERENCES classes(id)
          )
        `),

        // 3. TABEL TASK QUESTIONS (Butir Soal)
        env.DB.prepare(`
          CREATE TABLE task_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER,
            type TEXT NOT NULL,             -- 'pg', 'essay_text', 'essay_image'
            question_text TEXT,             -- Teks Soal / Instruksi
            question_image_url TEXT,        -- Gambar Soal (Opsional)
            options TEXT,                   -- JSON Array (Khusus PG)
            correct_key TEXT,               -- Kunci Jawaban PG / Pembahasan Essay
            char_limit INTEGER DEFAULT 500, -- Batas karakter Essay
            weight INTEGER DEFAULT 0,       -- Bobot Nilai Per Soal (Essay)
            FOREIGN KEY (task_id) REFERENCES tasks(id)
          )
        `),

        // 4. TABEL TASK SUBMISSIONS (Header Pengumpulan Siswa)
        env.DB.prepare(`
          CREATE TABLE task_submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER,
            student_id INTEGER,
            grade REAL DEFAULT 0,           -- Nilai Akhir
            feedback TEXT,                  -- Catatan Umum Guru
            is_published INTEGER DEFAULT 0, -- 0 = Sembunyi, 1 = Tayang
            is_graded INTEGER DEFAULT 0,    -- 0 = Belum, 1 = Selesai, -1 = Draft
            submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (task_id) REFERENCES tasks(id),
            FOREIGN KEY (student_id) REFERENCES students(id)
          )
        `),

        // 5. TABEL TASK ANSWERS (Detail Jawaban Siswa Per Nomor)
        env.DB.prepare(`
          CREATE TABLE task_answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            submission_id INTEGER,
            question_id INTEGER,
            answer_text TEXT,               -- Jawaban Teks Siswa
            answer_image_url TEXT,          -- Jawaban Gambar Siswa
            score REAL DEFAULT 0,           -- Nilai Per Nomor Soal
            FOREIGN KEY (submission_id) REFERENCES task_submissions(id),
            FOREIGN KEY (question_id) REFERENCES task_questions(id)
          )
        `)
      ]);

      return jsonResponse({ message: "Reset & Migrasi V10 Berhasil: Kolom Diskusi/Master Key Siap." });
    }

    // 2. INCREMENTAL UPDATE V10 (Jalankan ini jika database SUDAH ADA datanya dan tidak mau hapus)
    // Endpoint: /api/migrate/v10-update
    if (pathname === "/api/migrate/v10-update" && method === "GET") {
      try {
        // Tambahkan 3 kolom baru ke tabel tasks
        await env.DB.batch([
          env.DB.prepare("ALTER TABLE tasks ADD COLUMN discussion_text TEXT"),
          env.DB.prepare("ALTER TABLE tasks ADD COLUMN discussion_url TEXT"),
          env.DB.prepare("ALTER TABLE tasks ADD COLUMN show_discussion INTEGER DEFAULT 0")
        ]);
        return jsonResponse({ message: "Update V10 Berhasil: Kolom diskusi ditambahkan ke tabel tasks." });
      } catch (e) {
        if (e.message && e.message.includes("duplicate column name")) {
          return jsonResponse({ message: "Info: Kolom V10 sudah ada sebelumnya." });
        }
        throw e;
      }
    }

    // 3. IMAGE TABLES MIGRATION (Bank Gambar)
    // Endpoint: /api/migrate/images
    if (pathname === "/api/migrate/images" && method === "GET") {
      try {
        await env.DB.batch([
          // Folder untuk organisasi gambar
          env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS image_folders (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
          `),
          // Gambar yang diupload ke R2
          env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS images (
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
          // Index untuk performa
          env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_images_folder ON images(folder_id)`),
          env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_images_created ON images(created_at DESC)`),
          // Default folder
          env.DB.prepare(`INSERT OR IGNORE INTO image_folders (id, name) VALUES (1, 'Umum')`)
        ]);
        return jsonResponse({ message: "Migrasi Bank Gambar Berhasil: Tabel image_folders & images siap." });
      } catch (e) {
        return jsonResponse({ error: "Migrate Images Error: " + e.message }, 500);
      }
    }

    return null;
  } catch (err) {
    return jsonResponse({ error: "Migration Error: " + err.message }, 500);
  }
}