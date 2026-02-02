// controllers/attendanceController.js
// Mengelola Logika Absensi (Presensi) & Export CSV
// Fitur: Get Harian, Simpan Bulk, Hapus Harian, Export Harian & Rekap Bulanan, Cek Tanggal Tersedia

import { jsonResponse } from '../utils.js';

export async function handleAttendanceRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  try {
    // ========================================
    // 1. GET ATTENDANCE (Lihat Data Absensi)
    // ========================================
    if (pathname === "/api/attendance" && method === "GET") {
      const type = url.searchParams.get("type");
      const classId = url.searchParams.get("class_id");

      // [NEW] API: Ambil daftar tanggal yang sudah ada datanya (Untuk Quick Chips)
      if (type === "dates") {
         if (!classId) return jsonResponse({ error: "Class ID diperlukan" }, 400);

         // Ambil tanggal unik yang sudah pernah diabsen di kelas ini
         const { results } = await env.DB.prepare(`
            SELECT DISTINCT date FROM attendance WHERE class_id = ? ORDER BY date DESC
         `).bind(classId).all();

         // Return array simple: ['2026-01-01', '2026-01-02']
         return jsonResponse(results.map(r => r.date));
      }

      // [STANDARD] API: Ambil detail absensi per tanggal
      const date = url.searchParams.get("date"); // YYYY-MM-DD

      if (!classId || !date) {
        return jsonResponse({ error: "Class ID dan Tanggal diperlukan" }, 400);
      }

      // Cek apakah sudah ada data absensi pada tanggal & kelas tersebut?
      const { results: existingData } = await env.DB.prepare(`
        SELECT student_id, status FROM attendance WHERE class_id = ? AND date = ?
      `).bind(classId, date).all();

      // Ambil daftar semua siswa di kelas tersebut
      const { results: students } = await env.DB.prepare(`
        SELECT id, name FROM students WHERE class_id = ? ORDER BY name ASC
      `).bind(classId).all();

      // Gabungkan data: Siswa + Status Absensinya (jika ada)
      const data = students.map(s => {
        const record = existingData.find(e => e.student_id === s.id);
        return {
          student_id: s.id,
          name: s.name,
          status: record ? record.status : null // Null artinya belum diabsen
        };
      });

      return jsonResponse(data);
    }

    // ========================================
    // 2. SAVE ATTENDANCE (Simpan/Update Bulk)
    // ========================================
    if (pathname === "/api/attendance" && method === "POST") {
      const body = await request.json();
      const { classId, date, data } = body; // data = [{ student_id, status }, ...]

      if (!classId || !date || !Array.isArray(data)) {
        return jsonResponse({ error: "Data tidak valid" }, 400);
      }

      // Strategi Update: Hapus dulu data lama di tanggal/kelas itu, lalu insert baru (Clean Slate)
      const statements = [];

      // 1. Hapus data lama
      statements.push(
        env.DB.prepare("DELETE FROM attendance WHERE class_id = ? AND date = ?").bind(classId, date)
      );

      // 2. Insert data baru
      const insertStmt = env.DB.prepare(`
        INSERT INTO attendance (class_id, student_id, date, status) VALUES (?, ?, ?, ?)
      `);

      for (const item of data) {
        statements.push(insertStmt.bind(classId, item.student_id, date, item.status));
      }

      // Eksekusi Batch
      await env.DB.batch(statements);

      return jsonResponse({ message: "Data absensi berhasil disimpan." });
    }

    // ========================================
    // 3. DELETE ATTENDANCE (Hapus Data Harian) [NEW]
    // ========================================
    if (pathname === "/api/attendance" && method === "DELETE") {
      const classId = url.searchParams.get("class_id");
      const date = url.searchParams.get("date");

      if (!classId || !date) {
        return jsonResponse({ error: "Class ID dan Tanggal diperlukan" }, 400);
      }

      // Hapus semua record absensi untuk kelas & tanggal tersebut
      await env.DB.prepare(`
        DELETE FROM attendance WHERE class_id = ? AND date = ?
      `).bind(classId, date).run();

      return jsonResponse({ message: "Data absensi berhasil dihapus." });
    }

    // ========================================
    // 4. EXPORT CSV (Laporan)
    // ========================================
    if (pathname === "/api/attendance/export" && method === "GET") {
      const type = url.searchParams.get("type"); // 'daily' atau 'recap'
      const classId = url.searchParams.get("class_id");
      
      if (!classId) return new Response("Class ID missing", { status: 400 });

      // Ambil Info Kelas
      const cls = await env.DB.prepare("SELECT name FROM classes WHERE id = ?").bind(classId).first();
      const className = cls ? cls.name : "Kelas";

      let csvContent = "";
      let filename = "";

      // --- OPTION A: EXPORT HARIAN ---
      if (type === "daily") {
        const date = url.searchParams.get("date");
        if (!date) return new Response("Date missing", { status: 400 });

        filename = `Absensi_${className}_${date}.csv`;
        
        // Query Data
        const { results } = await env.DB.prepare(`
            SELECT s.name, a.status 
            FROM students s
            LEFT JOIN attendance a ON s.id = a.student_id AND a.date = ?
            WHERE s.class_id = ? 
            ORDER BY s.name ASC
        `).bind(date, classId).all();

        // Header CSV
        csvContent += "No;Nama Siswa;Tanggal;Status\n";

        // Rows
        results.forEach((row, index) => {
            const statusLabel = row.status ? row.status : "Belum Diabsen";
            csvContent += `${index + 1};"${row.name}";${date};${statusLabel}\n`;
        });
      }

      // --- OPTION B: EXPORT REKAP BULANAN/PERIODE ---
      else if (type === "recap") {
        const month = url.searchParams.get("month"); // Format: YYYY-MM
        if (!month) return new Response("Month missing", { status: 400 });

        filename = `Rekap_Absensi_${className}_${month}.csv`;

        // 1. Ambil semua siswa
        const { results: students } = await env.DB.prepare(`
            SELECT id, name FROM students WHERE class_id = ? ORDER BY name ASC
        `).bind(classId).all();

        // 2. Ambil data absensi dalam bulan tersebut
        const { results: attendance } = await env.DB.prepare(`
            SELECT student_id, status FROM attendance 
            WHERE class_id = ? AND date LIKE ?
        `).bind(classId, `${month}%`).all();

        // Header CSV
        csvContent += "No;Nama Siswa;Hadir (H);Sakit (S);Izin (I);Alpa (A);Total Kehadiran\n";

        // Logic Hitung Rekap
        students.forEach((s, index) => {
            const myRecords = attendance.filter(a => a.student_id === s.id);
            
            const h = myRecords.filter(r => r.status === 'H').length;
            const sa = myRecords.filter(r => r.status === 'S').length;
            const i = myRecords.filter(r => r.status === 'I').length;
            const a = myRecords.filter(r => r.status === 'A').length;
            const total = h + sa + i + a; 

            csvContent += `${index + 1};"${s.name}";${h};${sa};${i};${a};${total}\n`;
        });
      }

      // Return File CSV
      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`
        }
      });
    }

    return null;
  } catch (err) {
    return jsonResponse({ error: "Attendance Error: " + err.message }, 500);
  }
}