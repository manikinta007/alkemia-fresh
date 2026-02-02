// controllers/scheduleController.js
// Mengelola Jadwal Pelajaran (Roster)
// Fitur: CRUD Jadwal, Support Multi-Mapel (Subject dipilih dari Frontend)

import { jsonResponse } from '../utils.js';

export async function handleScheduleRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  try {
    // ========================================
    // 1. GET SCHEDULES (Ambil Data Jadwal)
    // ========================================
    if (pathname === "/api/schedules" && method === "GET") {
      const periodId = url.searchParams.get("period_id");

      if (!periodId) {
        return jsonResponse({ error: "Period ID diperlukan" }, 400);
      }

      // Ambil jadwal beserta nama kelasnya
      // Diurutkan berdasarkan Hari (1-7) lalu Jam Mulai
      const { results } = await env.DB.prepare(`
        SELECT 
            cs.id, 
            cs.class_id, 
            c.name as class_name, 
            cs.day, 
            cs.start_time, 
            cs.end_time, 
            cs.subject
        FROM class_schedules cs
        JOIN classes c ON cs.class_id = c.id
        WHERE cs.period_id = ?
        ORDER BY cs.day ASC, cs.start_time ASC
      `).bind(periodId).all();

      return jsonResponse(results);
    }

    // ========================================
    // 2. CREATE SCHEDULE (Simpan Jadwal Baru)
    // ========================================
    if (pathname === "/api/schedules" && method === "POST") {
      const body = await request.json();
      
      // Update: Menerima 'subject' langsung dari body (pilihan dropdown frontend)
      // Username tidak lagi wajib untuk lookup mapel, tapi bisa disimpan untuk log jika perlu
      const { periodId, classId, day, startTime, endTime, subject } = body;

      // Validasi Input Dasar (Termasuk subject)
      if (!periodId || !classId || !day || !startTime || !endTime || !subject) {
        return jsonResponse({ error: "Data tidak lengkap. Pastikan mapel dipilih." }, 400);
      }

      // Validasi Konflik Jadwal
      // Cek apakah di hari & jam yang sama, kelas tersebut sudah ada jadwal?
      const conflict = await env.DB.prepare(`
        SELECT id FROM class_schedules 
        WHERE period_id = ? AND class_id = ? AND day = ? 
        AND (
            (start_time <= ? AND end_time >= ?) OR 
            (start_time <= ? AND end_time >= ?)
        )
      `).bind(periodId, classId, day, startTime, startTime, endTime, endTime).first();

      if (conflict) {
         // Opsional: return error jika ingin strict anti-bentrok
         // return jsonResponse({ error: "Jadwal bentrok dengan jam lain di kelas ini!" }, 409);
      }

      // Simpan ke Database (Langsung gunakan subject dari input)
      await env.DB.prepare(`
        INSERT INTO class_schedules (period_id, class_id, day, start_time, end_time, subject)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(periodId, classId, day, startTime, endTime, subject).run();

      return jsonResponse({ message: "Jadwal berhasil ditambahkan" });
    }

    // ========================================
    // 3. DELETE SCHEDULE (Hapus Jadwal)
    // ========================================
    if (pathname === "/api/schedules" && method === "DELETE") {
      const id = url.searchParams.get("id");

      if (!id) {
        return jsonResponse({ error: "ID Jadwal diperlukan" }, 400);
      }

      await env.DB.prepare("DELETE FROM class_schedules WHERE id = ?").bind(id).run();

      return jsonResponse({ message: "Jadwal berhasil dihapus" });
    }

    return null;
  } catch (err) {
    return jsonResponse({ error: "Schedule Error: " + err.message }, 500);
  }
}