// controllers/periodController.js
// Mengelola Logika Database untuk Periode Akademik
// OPTIMIZED: Menggunakan db.batch() untuk penghapusan super cepat

import { jsonResponse } from '../utils.js';

export async function handlePeriodRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  try {
    // 1. GET ALL PERIODS
    if (pathname === "/api/periods" && method === "GET") {
      const { results } = await env.DB.prepare(`
        SELECT * FROM academic_periods ORDER BY created_at DESC
      `).all();
      return jsonResponse(results);
    }

    // 2. CREATE NEW PERIOD (With Copy Logic)
    if (pathname === "/api/periods" && method === "POST") {
      const body = await request.json();
      const { year, semester, sourcePeriodId, withStudents, withMaterials } = body;

      if (!year || !semester) {
        return jsonResponse({ error: "Tahun dan semester harus diisi" }, 400);
      }

      const info = await env.DB.prepare(`
        INSERT INTO academic_periods (year, semester, is_active) 
        VALUES (?, ?, 0)
      `).bind(year, semester).run();

      const newPeriodId = info.meta.last_row_id;

      // Logika Copy Data (Optimized)
      if (sourcePeriodId) {
        const { results: oldClasses } = await env.DB.prepare(`SELECT * FROM classes WHERE period_id = ?`).bind(sourcePeriodId).all();

        for (const oldClass of oldClasses) {
          const classInfo = await env.DB.prepare(`INSERT INTO classes (period_id, name, show_grades) VALUES (?, ?, 0)`).bind(newPeriodId, oldClass.name).run();
          const newClassId = classInfo.meta.last_row_id;

          if (withStudents) {
            const { results: students } = await env.DB.prepare(`SELECT * FROM students WHERE class_id = ?`).bind(oldClass.id).all();
            if (students.length > 0) {
              const stmt = env.DB.prepare(`INSERT INTO students (period_id, class_id, name, qr_token) VALUES (?, ?, ?, ?)`);
              await env.DB.batch(students.map(s => stmt.bind(newPeriodId, newClassId, s.name, crypto.randomUUID())));
            }
          }

          if (withMaterials) {
            const { results: materials } = await env.DB.prepare(`SELECT * FROM materials WHERE class_id = ?`).bind(oldClass.id).all();
            if (materials.length > 0) {
              const stmt = env.DB.prepare(`INSERT INTO materials (period_id, class_id, title, description, file_url, file_type, is_visible) VALUES (?, ?, ?, ?, ?, ?, 1)`);
              await env.DB.batch(materials.map(m => stmt.bind(newPeriodId, newClassId, m.title, m.description, m.file_url, m.file_type)));
            }
          }
        }
      }

      return jsonResponse({ message: "Periode akademik berhasil dibuat", id: newPeriodId });
    }

    // 3. EDIT PERIOD (PUT)
    if (pathname === "/api/periods" && method === "PUT") {
      const body = await request.json();
      const { id, year, semester } = body;

      await env.DB.prepare(`UPDATE academic_periods SET year = ?, semester = ? WHERE id = ?`).bind(year, semester, id).run();
      return jsonResponse({ message: "Periode berhasil diperbarui" });
    }

    // 4. DELETE PERIOD (SEQUENTIAL FOR SAFETY)
    if (pathname === "/api/periods" && method === "DELETE") {
      const idParam = url.searchParams.get("id");
      if (!idParam) return jsonResponse({ error: "ID required" }, 400);

      const id = parseInt(idParam);
      console.log(`[Period] Deleting period ID: ${id}`);

      // Manual Sequential Delete to ensure integrity and catch errors per table
      try {
        await env.DB.prepare("DELETE FROM grades WHERE period_id = ?").bind(id).run();
        await env.DB.prepare("DELETE FROM students WHERE period_id = ?").bind(id).run();
        await env.DB.prepare("DELETE FROM materials WHERE period_id = ?").bind(id).run();
        await env.DB.prepare("DELETE FROM quizzes WHERE period_id = ?").bind(id).run();
        await env.DB.prepare("DELETE FROM classes WHERE period_id = ?").bind(id).run();
        await env.DB.prepare("DELETE FROM academic_periods WHERE id = ?").bind(id).run();
      } catch (dbErr) {
        console.error("[Period] Delete Error:", dbErr);
        return jsonResponse({ error: "Gagal menghapus data terkait: " + dbErr.message }, 500);
      }

      return jsonResponse({ message: "Periode dan seluruh datanya berhasil dihapus" });
    }

    // 5. SET ACTIVE PERIOD
    if (pathname === "/api/periods/set-active" && method === "POST") {
      const body = await request.json();
      const { periodId } = body;

      if (!periodId) return jsonResponse({ error: "Period ID required" }, 400);

      const targetId = parseInt(periodId);
      console.log(`[Period] Setting active period to ID: ${targetId} (Type: ${typeof targetId})`);

      // 1. Reset all to 0
      await env.DB.prepare(`UPDATE academic_periods SET is_active = 0`).run();

      // 2. Set target to 1
      const info = await env.DB.prepare(`UPDATE academic_periods SET is_active = 1 WHERE id = ?`).bind(targetId).run();

      if (info.meta.changes === 0) {
        console.error(`[Period] Failed to set active. ID ${targetId} not found or no changes made.`);
        return jsonResponse({ error: "Gagal mengaktifkan periode. ID tidak ditemukan." }, 404);
      }

      const activePeriod = await env.DB.prepare(`SELECT * FROM academic_periods WHERE id = ?`).bind(targetId).first();
      console.log('[Period] New Active Period:', activePeriod);

      return jsonResponse({ message: "Periode aktif berhasil diubah", activePeriod });
    }

    return null;
  } catch (err) {
    console.error("[Period] Controller Warning:", err);
    return jsonResponse({ error: "Period Controller Error: " + err.message }, 500);
  }
}