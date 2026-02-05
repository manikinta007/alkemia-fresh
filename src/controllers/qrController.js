// controllers/qrController.js
// Mengelola Logika Database untuk QR Code Kelas
// (Diekstrak dari data.js)

import { jsonResponse } from '../utils.js';

export async function handleQRRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  try {
    // ========================================
    // API QR CODE
    // ========================================

    // 1. GENERATE QR (Buat Token QR Baru untuk Kelas)
    if (pathname === "/api/qr/generate" && method === "POST") {
      const body = await request.json();
      const { classId } = body;

      // Cek apakah kelas ini sudah punya QR Code aktif?
      const existing = await env.DB.prepare(`SELECT * FROM class_qr_codes WHERE class_id = ?`).bind(classId).first();

      if (existing) {
        // Jika sudah ada, kembalikan yang lama (jangan buat baru biar tidak membingungkan siswa yg sedang scan)
        return jsonResponse({
          qrToken: existing.qr_token,
          qrUrl: `/student?c=${classId}&t=${existing.qr_token}`,
          existing: true
        });
      }

      // Jika belum ada, buat baru (8 karakter alphanumeric untuk mudah diketik manual)
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0,O,1,I)
      let qrToken = '';
      for (let i = 0; i < 8; i++) {
        qrToken += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      await env.DB.prepare(`INSERT INTO class_qr_codes (class_id, qr_token) VALUES (?, ?)`).bind(classId, qrToken).run();

      return jsonResponse({
        qrToken,
        qrUrl: `/student?c=${classId}&t=${qrToken}`,
        existing: false
      });
    }

    // 2. GET QR INFO (Lihat Statistik QR: Total Siswa vs Yang Sudah Claim)
    if (pathname === "/api/qr/info" && method === "GET") {
      const classId = url.searchParams.get("class_id");

      const qrCode = await env.DB.prepare(`SELECT * FROM class_qr_codes WHERE class_id = ?`).bind(classId).first();

      if (!qrCode) return jsonResponse({ error: "QR not found" }, 404);

      // Hitung total siswa di kelas ini
      const total = await env.DB.prepare(`SELECT COUNT(*) as count FROM students WHERE class_id = ?`).bind(classId).first();

      // Hitung berapa siswa yang sudah berhasil login (Claim Device)
      const claimed = await env.DB.prepare(`
        SELECT COUNT(DISTINCT s.student_id) as count 
        FROM student_sessions s 
        JOIN students st ON s.student_id = st.id 
        WHERE st.class_id = ? AND s.is_active = 1
      `).bind(classId).first();

      return jsonResponse({
        qrToken: qrCode.qr_token,
        qrUrl: `/student?c=${classId}&t=${qrCode.qr_token}`,
        totalStudents: total.count,
        claimedStudents: claimed.count
      });
    }

    return null;
  } catch (err) {
    return jsonResponse({ error: "QR Controller Error: " + err.message }, 500);
  }
}