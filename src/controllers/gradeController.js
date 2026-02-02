// controllers/gradeController.js
// Mengelola Logika Database untuk Nilai Siswa (Grades)
// (Diekstrak dari data.js)

import { jsonResponse } from '../utils.js';

export async function handleGradeRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  try {
    // ========================================
    // API NILAI (GRADES)
    // ========================================

    if (pathname === "/api/grades") {
      // 1. GET GRADES (Ambil Data Nilai per Kelas)
      if (method === "GET") {
        const classId = url.searchParams.get("class_id");
        if (!classId) return jsonResponse({ error: "class_id diperlukan" }, 400);

        const { results } = await env.DB.prepare(`
          SELECT 
            s.id,
            s.name,
            g.uh, g.uts, g.uas, g.tugas, g.final_grade
          FROM students s
          LEFT JOIN grades g ON s.id = g.student_id
          WHERE s.class_id = ?
          ORDER BY s.name ASC
        `).bind(classId).all();

        return jsonResponse(results);
      }

      // 2. SAVE GRADE (Simpan/Update Nilai)
      if (method === "POST") {
        const body = await request.json();
        const { periodId, studentId, uh, uts, uas, tugas } = body;

        // Rumus Perhitungan Nilai Akhir
        // UH 30%, UTS 20%, UAS 30%, Tugas 20%
        const finalGrade = (
          (parseFloat(uh || 0) * 0.3) +
          (parseFloat(uts || 0) * 0.2) +
          (parseFloat(uas || 0) * 0.3) +
          (parseFloat(tugas || 0) * 0.2)
        );

        // Cek apakah data nilai sudah ada sebelumnya?
        const existing = await env.DB.prepare(`
            SELECT * FROM grades WHERE period_id = ? AND student_id = ?
        `).bind(periodId, studentId).first();

        if (existing) {
          // UPDATE jika sudah ada
          await env.DB.prepare(`
            UPDATE grades 
            SET uh=?, uts=?, uas=?, tugas=?, final_grade=?, updated_at=CURRENT_TIMESTAMP 
            WHERE period_id=? AND student_id=?
          `).bind(uh, uts, uas, tugas, finalGrade, periodId, studentId).run();
        } else {
          // INSERT jika belum ada
          await env.DB.prepare(`
            INSERT INTO grades (period_id, student_id, uh, uts, uas, tugas, final_grade) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(periodId, studentId, uh, uts, uas, tugas, finalGrade).run();
        }

        return jsonResponse({ message: "Nilai disimpan", finalGrade });
      }
    }

    return null;
  } catch (err) {
    return jsonResponse({ error: "Grade Controller Error: " + err.message }, 500);
  }
}