// controllers/classController.js
// Mengelola Logika Database untuk Kelas dan Siswa
// (Diekstrak dari data.js)

import { jsonResponse } from '../utils.js';

export async function handleClassRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  try {
    // ========================================
    // A. API KELAS
    // ========================================

    if (pathname === "/api/classes") {
      // 1. GET CLASSES (List Kelas)
      if (method === "GET") {
        let periodId = url.searchParams.get("period_id");

        if (!periodId) {
          // [AUTO-DETECT] Ambil periode aktif jika parameter kosong
          const activePeriod = await env.DB.prepare("SELECT id FROM academic_periods WHERE is_active = 1").first();
          if (activePeriod) {
            periodId = activePeriod.id;
          } else {
            // Jika tidak ada periode aktif dan tidak ada param, return error atau array kosong
            // Return array kosong lebih aman agar tidak crash frontend
            return jsonResponse([]);
          }
        }

        const { results } = await env.DB.prepare(`
          SELECT c.*, p.year, p.semester 
          FROM classes c
          JOIN academic_periods p ON c.period_id = p.id
          WHERE c.period_id = ?
          ORDER BY c.id DESC
        `).bind(periodId).all();

        return jsonResponse(results);
      }

      // 2. CREATE CLASS (Buat Kelas)
      if (method === "POST") {
        const body = await request.json();
        const { periodId, name } = body;

        if (!periodId || !name) {
          return jsonResponse({ error: "Period ID dan nama kelas harus diisi" }, 400);
        }

        const info = await env.DB.prepare(`
          INSERT INTO classes (period_id, name, show_grades) 
          VALUES (?, ?, 0)
        `).bind(periodId, name).run();

        return jsonResponse({
          message: "Kelas berhasil dibuat",
          id: info.meta.last_row_id
        });
      }

      // 3. EDIT CLASS (Ubah Nama)
      if (method === "PUT") {
        const body = await request.json();
        const { id, name } = body;

        if (!id || !name) {
          return jsonResponse({ error: "ID dan nama kelas diperlukan" }, 400);
        }

        await env.DB.prepare(`UPDATE classes SET name = ? WHERE id = ?`).bind(name, id).run();
        return jsonResponse({ message: "Nama kelas berhasil diperbarui" });
      }

      // 4. DELETE CLASS (Hapus Kelas & Cascade Data)
      if (method === "DELETE") {
        const id = url.searchParams.get("id");
        if (!id) return jsonResponse({ error: "ID kelas diperlukan" }, 400);

        // Hapus Cascade (Berurutan agar bersih)
        // 1. Ambil Siswa ID untuk hapus data turunannya
        const { results: students } = await env.DB.prepare("SELECT id FROM students WHERE class_id = ?").bind(id).all();
        const studentIds = students.map(s => s.id);

        if (studentIds.length > 0) {
          // Hapus secara manual satu per satu jika batch tidak support array binding
          // Atau gunakan loop sederhana (lebih aman untuk D1 saat ini)
          for (const sid of studentIds) {
            await env.DB.prepare(`DELETE FROM grades WHERE student_id = ?`).bind(sid).run();
            await env.DB.prepare(`DELETE FROM student_sessions WHERE student_id = ?`).bind(sid).run();
            await env.DB.prepare(`DELETE FROM quiz_attempts WHERE student_id = ?`).bind(sid).run();
            await env.DB.prepare(`DELETE FROM students WHERE id = ?`).bind(sid).run();
          }
        }

        // 2. Ambil Quiz ID untuk hapus soal
        const { results: quizzes } = await env.DB.prepare("SELECT id FROM quizzes WHERE class_id = ?").bind(id).all();

        for (const quiz of quizzes) {
          await env.DB.prepare(`DELETE FROM quiz_questions WHERE quiz_id = ?`).bind(quiz.id).run();
          await env.DB.prepare(`DELETE FROM quiz_attempts WHERE quiz_id = ?`).bind(quiz.id).run();
          await env.DB.prepare(`DELETE FROM quizzes WHERE id = ?`).bind(quiz.id).run();
        }

        // 3. Hapus Tasks dan child tables-nya
        const { results: tasks } = await env.DB.prepare("SELECT id FROM tasks WHERE class_id = ?").bind(id).all();

        for (const task of tasks) {
          // Hapus answers dulu (paling dalam)
          await env.DB.prepare(`DELETE FROM task_answers WHERE submission_id IN (SELECT id FROM task_submissions WHERE task_id = ?)`).bind(task.id).run();
          await env.DB.prepare(`DELETE FROM task_submissions WHERE task_id = ?`).bind(task.id).run();
          await env.DB.prepare(`DELETE FROM task_questions WHERE task_id = ?`).bind(task.id).run();
          await env.DB.prepare(`DELETE FROM tasks WHERE id = ?`).bind(task.id).run();
        }

        // 4. Hapus Data Lain (Materials, QR Codes, Attendance, Schedules, Kelas itu sendiri)
        await env.DB.batch([
          env.DB.prepare("DELETE FROM attendance WHERE class_id = ?").bind(id),
          env.DB.prepare("DELETE FROM class_schedules WHERE class_id = ?").bind(id),
          env.DB.prepare("DELETE FROM materials WHERE class_id = ?").bind(id),
          env.DB.prepare("DELETE FROM class_qr_codes WHERE class_id = ?").bind(id),
          env.DB.prepare("DELETE FROM classes WHERE id = ?").bind(id)
        ]);

        return jsonResponse({ message: "Kelas dan seluruh datanya berhasil dihapus." });
      }
    }

    // 5. TOGGLE GRADES (Tampilkan/Sembunyikan Nilai)
    if (pathname === "/api/classes/toggle-grades" && method === "POST") {
      const body = await request.json();
      const { classId, showGrades } = body;
      const val = showGrades ? 1 : 0;
      await env.DB.prepare(`UPDATE classes SET show_grades = ? WHERE id = ?`).bind(val, classId).run();
      return jsonResponse({ message: "Status tampilan nilai diperbarui." });
    }

    // ========================================
    // B. API SISWA
    // ========================================

    if (pathname === "/api/students") {
      // 1. GET STUDENTS
      if (method === "GET") {
        const classId = url.searchParams.get("class_id");
        if (!classId) return jsonResponse({ error: "class_id diperlukan" }, 400);

        const { results } = await env.DB.prepare(`
          SELECT * FROM students WHERE class_id = ? ORDER BY name ASC
        `).bind(classId).all();

        return jsonResponse(results);
      }

      // 2. ADD STUDENT (Single)
      if (method === "POST") {
        const body = await request.json();
        const { periodId, classId, name } = body;

        if (!periodId || !classId || !name) return jsonResponse({ error: "Data tidak lengkap" }, 400);

        const qrToken = crypto.randomUUID();
        const info = await env.DB.prepare(`
          INSERT INTO students (period_id, class_id, name, qr_token) 
          VALUES (?, ?, ?, ?)
        `).bind(periodId, classId, name, qrToken).run();

        return jsonResponse({
          message: "Siswa berhasil ditambahkan",
          id: info.meta.last_row_id,
          qr_token: qrToken
        });
      }

      // 3. EDIT STUDENT
      if (method === "PUT") {
        const body = await request.json();
        const { id, name } = body;
        if (!id || !name) return jsonResponse({ error: "ID dan Nama diperlukan" }, 400);
        await env.DB.prepare(`UPDATE students SET name = ? WHERE id = ?`).bind(name, id).run();
        return jsonResponse({ message: "Data siswa berhasil diperbarui" });
      }

      // 4. DELETE STUDENT (Single / Bulk)
      if (method === "DELETE") {
        const contentType = request.headers.get("content-type") || "";
        const body = contentType.includes("application/json") ? await request.json() : null;

        // Hapus Bulk (Banyak sekaligus)
        if (body && body.ids && Array.isArray(body.ids) && body.ids.length > 0) {
          for (const id of body.ids) {
            await env.DB.prepare(`DELETE FROM grades WHERE student_id = ?`).bind(id).run();
            await env.DB.prepare(`DELETE FROM student_sessions WHERE student_id = ?`).bind(id).run();
            await env.DB.prepare(`DELETE FROM quiz_attempts WHERE student_id = ?`).bind(id).run();
            await env.DB.prepare(`DELETE FROM students WHERE id = ?`).bind(id).run();
          }
          return jsonResponse({ message: `${body.ids.length} siswa berhasil dihapus` });
        }

        // Hapus Single (Satu per satu via URL param)
        const id = url.searchParams.get("id");
        if (id) {
          await env.DB.batch([
            env.DB.prepare("DELETE FROM grades WHERE student_id = ?").bind(id),
            env.DB.prepare("DELETE FROM student_sessions WHERE student_id = ?").bind(id),
            env.DB.prepare("DELETE FROM quiz_attempts WHERE student_id = ?").bind(id),
            env.DB.prepare("DELETE FROM students WHERE id = ?").bind(id)
          ]);
          return jsonResponse({ message: "Siswa berhasil dihapus" });
        }
      }
    }

    // 5. BULK IMPORT STUDENTS (CSV)
    if (pathname === "/api/students/bulk" && method === "POST") {
      const body = await request.json();
      const { periodId, classId, names } = body;

      const stmts = names.map(name =>
        env.DB.prepare(`INSERT INTO students (period_id, class_id, name, qr_token) VALUES (?, ?, ?, ?)`)
          .bind(periodId, classId, name, crypto.randomUUID())
      );

      await env.DB.batch(stmts);
      return jsonResponse({ message: `Berhasil mengimport ${names.length} siswa` });
    }

    // 6. CHECK CLAIM STATUS (Untuk Guru melihat siapa yang sudah login)
    if (pathname === "/api/student/claim-status" && method === "GET") {
      const { results } = await env.DB.prepare(`
        SELECT s.id, s.name, (SELECT COUNT(*) FROM student_sessions ss WHERE ss.student_id = s.id AND ss.is_active = 1) as device_count, (SELECT MAX(ss.last_access) FROM student_sessions ss WHERE ss.student_id = s.id AND ss.is_active = 1) as last_access FROM students s WHERE s.class_id = ? ORDER BY s.name ASC
      `).bind(url.searchParams.get("class_id")).all();
      return jsonResponse(results);
    }

    // 7. UNLOCK DEVICE (Reset Session Siswa oleh Guru)
    if (pathname === "/api/student/unlock" && method === "POST") {
      await env.DB.prepare(`UPDATE student_sessions SET is_active = 0 WHERE student_id = ?`).bind((await request.json()).studentId).run();
      return jsonResponse({ message: "Unlocked" });
    }

    // [BARU] 8. AMBIL LIST SISWA PER KELAS (Untuk Dropdown Remedial)
    if (pathname === "/api/classes/students" && method === "GET") {
      const classId = url.searchParams.get("class_id");
      if (!classId) return jsonResponse({ error: "Class ID diperlukan" }, 400);

      const { results } = await env.DB.prepare(
        "SELECT id, name FROM students WHERE class_id = ? ORDER BY name ASC"
      ).bind(classId).all();

      return jsonResponse(results || []);
    }

    return null;
  } catch (err) {
    return jsonResponse({ error: "Class Controller Error: " + err.message }, 500);
  }
}