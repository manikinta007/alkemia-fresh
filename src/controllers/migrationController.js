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

    // 4. IS_GRADED COLUMN MIGRATION (For proper grading workflow)
    // Endpoint: /api/migrate/is-graded
    if (pathname === "/api/migrate/is-graded" && method === "GET") {
      try {
        await env.DB.prepare("ALTER TABLE task_answers ADD COLUMN is_graded INTEGER DEFAULT 0").run();
        return jsonResponse({ message: "Migrasi is_graded Berhasil: Kolom is_graded ditambahkan ke task_answers." });
      } catch (e) {
        if (e.message && e.message.includes("duplicate column name")) {
          return jsonResponse({ message: "Info: Kolom is_graded sudah ada sebelumnya." });
        }
        return jsonResponse({ error: "Migrate is_graded Error: " + e.message }, 500);
      }
    }

    // 5. OFFLINE MODE MIGRATION (For CBT Offline Feature)
    // Endpoint: /api/migrate/offline-mode
    if (pathname === "/api/migrate/offline-mode" && method === "GET") {
      try {
        await env.DB.prepare("ALTER TABLE quizzes ADD COLUMN is_offline_mode INTEGER DEFAULT 0").run();
        return jsonResponse({ message: "Migrasi Offline Mode Berhasil: Kolom is_offline_mode ditambahkan ke quizzes." });
      } catch (e) {
        if (e.message && e.message.includes("duplicate column name")) {
          return jsonResponse({ message: "Info: Kolom is_offline_mode sudah ada sebelumnya." });
        }
        return jsonResponse({ error: "Migrate Offline Mode Error: " + e.message }, 500);
      }
    }

    // 6. OFFLINE TRACKING COLUMNS (For quiz_attempts table)
    // Endpoint: /api/migrate/offline-tracking
    if (pathname === "/api/migrate/offline-tracking" && method === "GET") {
      try {
        await env.DB.batch([
          env.DB.prepare("ALTER TABLE quiz_attempts ADD COLUMN offline_status TEXT DEFAULT NULL"),
          env.DB.prepare("ALTER TABLE quiz_attempts ADD COLUMN offline_violations TEXT DEFAULT NULL"),
          env.DB.prepare("ALTER TABLE quiz_attempts ADD COLUMN offline_duration INTEGER DEFAULT NULL")
        ]);
        return jsonResponse({ message: "Migrasi Offline Tracking Berhasil: Kolom monitoring ditambahkan ke quiz_attempts." });
      } catch (e) {
        if (e.message && e.message.includes("duplicate column name")) {
          return jsonResponse({ message: "Info: Kolom offline tracking sudah ada sebelumnya." });
        }
        return jsonResponse({ error: "Migrate Offline Tracking Error: " + e.message }, 500);
      }
    }

    // 7. TEACHING JOURNAL TABLES MIGRATION (Jurnal Mengajar Feature)
    // Endpoint: /api/migrate/journals
    if (pathname.startsWith("/api/migrate/journals") && method === "GET") {
      try {
        await env.DB.batch([
          // 1. Tabel Teaching Journals (Data Jurnal Harian)
          env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS teaching_journals (
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
          // 2. Tabel Journal Templates (Template Kolom Jurnal)
          env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS journal_templates (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              is_default INTEGER DEFAULT 0,
              template_config TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
          `),
          // 3. Tabel Journal Settings (Pengaturan KOP & Tanda Tangan)
          env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS journal_settings (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              school_name TEXT,
              school_address TEXT,
              school_logo_url TEXT,
              pdf_orientation TEXT DEFAULT 'landscape',
              signature_name TEXT,
              signature_nip TEXT,
              signature_image_url TEXT,
              active_template_id INTEGER,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (active_template_id) REFERENCES journal_templates(id)
            )
          `),
          // Index untuk performa query
          env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_journals_class ON teaching_journals(class_id)`),
          env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_journals_date ON teaching_journals(date DESC)`)
        ]);

        // Add new columns if not exist (for existing tables)
        const newColumns = [
          'active_template_id INTEGER',
          'school_logo_2_url TEXT',
          'logo_position TEXT DEFAULT "left"',
          'logo_2_position TEXT',
          'school_name_align TEXT DEFAULT "center"',
          'school_address_align TEXT DEFAULT "center"',
          'signature_place TEXT DEFAULT "Jakarta"',
          'signature_date TEXT',
          'signature_title TEXT'
        ];

        for (const column of newColumns) {
          try {
            await env.DB.prepare(`ALTER TABLE journal_settings ADD COLUMN ${column}`).run();
          } catch (e) {
            // Column might already exist, ignore error
          }
        }

        // Insert 3 Default Templates (jika belum ada)
        const existingTemplates = await env.DB.prepare("SELECT COUNT(*) as count FROM journal_templates").first();
        if (existingTemplates.count === 0) {
          await env.DB.batch([
            // Template 1: Kurikulum Merdeka
            env.DB.prepare(`
              INSERT INTO journal_templates (name, is_default, template_config) VALUES (?, 1, ?)
            `).bind("Kurikulum Merdeka", JSON.stringify([
              { key: "jp", label: "JP", type: "number", width: 40 },
              { key: "temu", label: "Temu Ke-", type: "number", width: 60 },
              { key: "tujuan", label: "Tujuan Pembelajaran", type: "textarea", width: 200 },
              { key: "iktp", label: "IKTP", type: "textarea", width: 150 },
              { key: "materi", label: "Materi", type: "textarea", width: 150 },
              { key: "capaian", label: "Capaian KKTP", type: "textarea", width: 150 },
              { key: "absensi", label: "Absensi", type: "attendance", width: 100 },
              { key: "keterangan", label: "Keterangan", type: "text", width: 150 }
            ])),
            // Template 2: Kurikulum 2013
            env.DB.prepare(`
              INSERT INTO journal_templates (name, is_default, template_config) VALUES (?, 1, ?)
            `).bind("Kurikulum 2013", JSON.stringify([
              { key: "kd", label: "Kompetensi Dasar", type: "textarea", width: 180 },
              { key: "indikator", label: "Indikator", type: "textarea", width: 180 },
              { key: "materi_pokok", label: "Materi Pokok", type: "textarea", width: 150 },
              { key: "metode", label: "Metode", type: "text", width: 100 },
              { key: "absensi", label: "Absensi", type: "attendance", width: 100 },
              { key: "refleksi", label: "Refleksi", type: "textarea", width: 150 }
            ])),
            // Template 3: Minimalis
            env.DB.prepare(`
              INSERT INTO journal_templates (name, is_default, template_config) VALUES (?, 1, ?)
            `).bind("Minimalis", JSON.stringify([
              { key: "materi", label: "Materi", type: "textarea", width: 200 },
              { key: "kegiatan", label: "Kegiatan Pembelajaran", type: "textarea", width: 250 },
              { key: "absensi", label: "Absensi", type: "attendance", width: 100 },
              { key: "catatan", label: "Catatan", type: "text", width: 150 }
            ]))
          ]);
        }

        return jsonResponse({
          message: "Migrasi Jurnal Mengajar Berhasil: Tabel teaching_journals, journal_templates, journal_settings siap.",
          templates_inserted: existingTemplates.count === 0 ? 3 : 0
        });
      } catch (e) {
        return jsonResponse({ error: "Migrate Journals Error: " + e.message }, 500);
      }
    }

    // 8. MATERIAL BANK MIGRATION (Bank Bahan Ajar Feature)
    // Endpoint: /api/migrate/material-bank
    if (pathname === "/api/migrate/material-bank" && method === "GET") {
      try {
        await env.DB.batch([
          // 1. Tabel Material Folders (Pengelompokan Materi)
          env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS material_folders (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              period_id INTEGER NOT NULL,
              name TEXT NOT NULL,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (period_id) REFERENCES academic_periods(id)
            )
          `),
          // 2. Tabel Material Bank (Master/Gudang Materi)
          env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS material_bank (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              period_id INTEGER NOT NULL,
              folder_id INTEGER,
              title TEXT NOT NULL,
              description TEXT,
              file_url TEXT,
              file_type TEXT DEFAULT 'link',
              file_size INTEGER DEFAULT 0,
              r2_key TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (period_id) REFERENCES academic_periods(id),
              FOREIGN KEY (folder_id) REFERENCES material_folders(id) ON DELETE SET NULL
            )
          `),
          // 3. Tabel Material Distribution (Mapping Materi ke Kelas)
          env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS material_distribution (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              material_id INTEGER NOT NULL,
              class_id INTEGER NOT NULL,
              is_visible INTEGER DEFAULT 1,
              distributed_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (material_id) REFERENCES material_bank(id) ON DELETE CASCADE,
              FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
            )
          `),
          // Indexes untuk performa
          env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_material_bank_period ON material_bank(period_id)`),
          env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_material_bank_folder ON material_bank(folder_id)`),
          env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_material_dist_material ON material_distribution(material_id)`),
          env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_material_dist_class ON material_distribution(class_id)`),
          // Tambah unique constraint agar tidak double distribute
          env.DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_material_dist_unique ON material_distribution(material_id, class_id)`)
        ]);

        // Migrate data dari tabel materials lama (jika ada)
        const oldMaterials = await env.DB.prepare("SELECT * FROM materials").all();
        if (oldMaterials.results && oldMaterials.results.length > 0) {
          const processedMaterials = new Map();

          for (const m of oldMaterials.results) {
            const key = `${m.title}|${m.file_url}`;

            if (!processedMaterials.has(key)) {
              // Insert ke material_bank (Master)
              await env.DB.prepare(`
                INSERT INTO material_bank (period_id, title, description, file_url, file_type, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
              `).bind(m.period_id, m.title, m.description || '', m.file_url || '', m.file_type || 'link', m.created_at || new Date().toISOString()).run();
              processedMaterials.set(key, true);
            }
          }

          // Now create distributions
          const newMaterials = await env.DB.prepare("SELECT id, title, file_url FROM material_bank").all();
          const materialMap = new Map();
          newMaterials.results.forEach(nm => {
            materialMap.set(`${nm.title}|${nm.file_url}`, nm.id);
          });

          let distCount = 0;
          for (const m of oldMaterials.results) {
            const key = `${m.title}|${m.file_url}`;
            const materialId = materialMap.get(key);
            if (materialId && m.class_id) {
              try {
                await env.DB.prepare(`
                  INSERT OR IGNORE INTO material_distribution (material_id, class_id, is_visible, distributed_at)
                  VALUES (?, ?, ?, ?)
                `).bind(materialId, m.class_id, m.is_visible ?? 1, m.created_at || new Date().toISOString()).run();
                distCount++;
              } catch (e) { /* ignore duplicate */ }
            }
          }

          return jsonResponse({
            message: `Migrasi Material Bank Berhasil: ${processedMaterials.size} materi unik, ${distCount} distribusi.`,
            migrated_materials: processedMaterials.size,
            migrated_distributions: distCount
          });
        }

        return jsonResponse({ message: "Migrasi Material Bank Berhasil: Tabel material_bank, material_folders, material_distribution siap." });
      } catch (e) {
        return jsonResponse({ error: "Migrate Material Bank Error: " + e.message }, 500);
      }
    }

    // [NEW] MIGRATION: Participation Grades (Nilai Keaktifan)
    if (pathname === "/api/migrate/participation-grades") {
      try {
        // Add participation column
        try {
          await env.DB.prepare("ALTER TABLE grades ADD COLUMN participation REAL DEFAULT 0").run();
        } catch (e) { console.log("Column participation might already exist", e.message); }

        // Add participation_notes column
        try {
          await env.DB.prepare("ALTER TABLE grades ADD COLUMN participation_notes TEXT").run();
        } catch (e) { console.log("Column participation_notes might already exist", e.message); }

        return jsonResponse({ message: "Migration: Participation Grades columns added successfully." });
      } catch (err) {
        return jsonResponse({ error: "Migration Error: " + err.message }, 500);
      }
    }

    // [NEW] MIGRATION: Participation Points Table
    if (pathname === "/api/migrate/participation-points") {
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS participation_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            period_id INTEGER,
            class_id INTEGER,
            student_id INTEGER,
            type TEXT,
            points INTEGER,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (period_id) REFERENCES academic_periods(id),
            FOREIGN KEY (class_id) REFERENCES classes(id),
            FOREIGN KEY (student_id) REFERENCES students(id)
          )
        `).run();

        return jsonResponse({ message: "Migration: Participation Points table created successfully." });
      } catch (err) {
        return jsonResponse({ error: "Migration Error: " + err.message }, 500);
      }
    }



    // [NEW] MIGRATION: Participation Base Score (Configurable)
    if (pathname === "/api/migrate/participation-settings") {
      try {
        try {
          await env.DB.prepare("ALTER TABLE classes ADD COLUMN participation_base_score INTEGER DEFAULT 60").run();
        } catch (e) {
          console.log("participation_base_score col exists?", e.message);
        }
        return jsonResponse({ message: "Migration: Participation Settings added." });
      } catch (err) {
        return jsonResponse({ error: "Migration Error: " + err.message }, 500);
      }
    }



    // [NEW] MIGRATION: Participation Config (Ask, Answer, Volunteer, Sanction)
    if (pathname === "/api/migrate/participation-config") {
      try {
        const columns = [
          { name: "point_ask", def: 1 },
          { name: "point_answer", def: 2 },
          { name: "point_volunteer", def: 3 },
          { name: "point_sanction", def: -1 }
        ];

        for (const col of columns) {
          try {
            await env.DB.prepare(`ALTER TABLE classes ADD COLUMN ${col.name} INTEGER DEFAULT ${col.def}`).run();
          } catch (e) { console.log(`${col.name} col exists?`, e.message); }
        }

        return jsonResponse({ message: "Migration: Participation Config columns added." });
      } catch (err) {
        return jsonResponse({ error: "Migration Error: " + err.message }, 500);
      }
    }



    // [New] MIGRATION: Groups Tables
    if (pathname === "/api/migrate/groups-table") {
      try {
        await env.DB.batch([
          // Drop old tables first (reverse order for FK safety)
          env.DB.prepare("DROP TABLE IF EXISTS group_members"),
          env.DB.prepare("DROP TABLE IF EXISTS groups"),
          env.DB.prepare("DROP TABLE IF EXISTS group_sets"),
          // Recreate with correct schema
          env.DB.prepare(`
            CREATE TABLE group_sets (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              class_id INTEGER NOT NULL,
              name TEXT NOT NULL,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (class_id) REFERENCES classes(id)
            )
          `),
          env.DB.prepare(`
            CREATE TABLE groups (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              set_id INTEGER NOT NULL,
              name TEXT NOT NULL,
              FOREIGN KEY (set_id) REFERENCES group_sets(id) ON DELETE CASCADE
            )
          `),
          env.DB.prepare(`
            CREATE TABLE group_members (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              group_id INTEGER NOT NULL,
              student_id INTEGER NOT NULL,
              FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
              FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
            )
          `)
        ]);
        return jsonResponse({ message: "Migration: Group tables recreated with correct schema." });
      } catch (err) {
        return jsonResponse({ error: "Migration Error: " + err.message }, 500);
      }
    }

    // [New] MIGRATION: Group Tasks Feature
    if (pathname === "/api/migrate/group-tasks") {
      try {
        await env.DB.batch([
          env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS group_tasks (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              period_id INTEGER,
              class_id INTEGER NOT NULL,
              group_set_id INTEGER NOT NULL,
              title TEXT NOT NULL,
              description TEXT,
              deadline TEXT,
              question_mode TEXT DEFAULT 'same',
              is_active INTEGER DEFAULT 0,
              grades_published INTEGER DEFAULT 0,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (class_id) REFERENCES classes(id),
              FOREIGN KEY (group_set_id) REFERENCES group_sets(id)
            )
          `),
          env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS group_task_questions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              group_task_id INTEGER NOT NULL,
              group_id INTEGER,
              type TEXT NOT NULL,
              question_text TEXT,
              question_image_url TEXT,
              options TEXT, -- JSON string for PG options
              correct_key TEXT, -- Answer key (text/option) or explanation
              char_limit INTEGER DEFAULT 500,
              weight REAL DEFAULT 0,
              FOREIGN KEY (group_task_id) REFERENCES group_tasks(id) ON DELETE CASCADE,
              FOREIGN KEY (group_id) REFERENCES groups(id)
            )
          `),
          env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS group_task_submissions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              group_task_id INTEGER NOT NULL,
              group_id INTEGER NOT NULL,
              submitted_by INTEGER NOT NULL,
              grade REAL DEFAULT 0,
              feedback TEXT,
              is_graded INTEGER DEFAULT 0, -- -1=draft, 0=waiting, 1=graded
              is_published INTEGER DEFAULT 0,
              submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (group_task_id) REFERENCES group_tasks(id) ON DELETE CASCADE,
              FOREIGN KEY (group_id) REFERENCES groups(id),
              FOREIGN KEY (submitted_by) REFERENCES students(id)
            )
          `),
          env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS group_task_answers (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              submission_id INTEGER NOT NULL,
              question_id INTEGER NOT NULL,
              answer_text TEXT,
              answer_image_url TEXT,
              score REAL DEFAULT 0,
              is_graded INTEGER DEFAULT 0,
              FOREIGN KEY (submission_id) REFERENCES group_task_submissions(id) ON DELETE CASCADE,
              FOREIGN KEY (question_id) REFERENCES group_task_questions(id)
            )
          `)
        ]);
        return jsonResponse({ message: "Migration: Group Task tables created." });
      } catch (err) {
        return jsonResponse({ error: "Migration Error: " + err.message }, 500);
      }
    }

    return null;
  } catch (err) {
    return jsonResponse({ error: "Migration Error: " + err.message }, 500);
  }
}