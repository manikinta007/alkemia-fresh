// controllers/materialController.js
// Mengelola Logika Database untuk Bahan Ajar (Materials)
// (Diekstrak dari data.js)

import { jsonResponse } from '../utils.js';

export async function handleMaterialRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  try {
    // ========================================
    // API BAHAN AJAR (MATERIALS)
    // ========================================
    
    if (pathname === "/api/materials") {
      // 1. GET MATERIALS (List Materi)
      if (method === "GET") {
        const classId = url.searchParams.get("class_id");
        const periodId = url.searchParams.get("period_id"); 
        
        if (classId) {
            // Ambil materi spesifik satu kelas
            const { results } = await env.DB.prepare(`
              SELECT * FROM materials WHERE class_id = ? ORDER BY created_at DESC
            `).bind(classId).all();
            return jsonResponse(results);
        } else if (periodId) {
            // Ambil SEMUA materi dalam satu periode (untuk Dashboard/Monitoring)
            const { results } = await env.DB.prepare(`
              SELECT m.*, c.name as class_name 
              FROM materials m 
              JOIN classes c ON m.class_id = c.id 
              WHERE m.period_id = ? 
              ORDER BY m.created_at DESC
            `).bind(periodId).all();
            return jsonResponse(results);
        }
        return jsonResponse({ error: "Parameter tidak lengkap" }, 400);
      }
      
      // 2. CREATE MATERIAL (Bagikan Materi)
      // Fitur: Bisa kirim ke BANYAK kelas sekaligus (Bulk Insert)
      if (method === "POST") {
        const body = await request.json();
        const { periodId, classIds, title, description, fileUrl, fileType } = body;
        
        // Handle input: classIds bisa array (multi) atau classId single
        const targets = Array.isArray(classIds) ? classIds : (body.classId ? [body.classId] : []);
        
        if (targets.length === 0) {
            return jsonResponse({ error: "Target kelas tidak dipilih" }, 400);
        }

        const stmt = env.DB.prepare(`
          INSERT INTO materials (period_id, class_id, title, description, file_url, file_type, is_visible) 
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `);

        // Eksekusi Batch (Lebih efisien daripada loop await satu-satu)
        const batch = targets.map(cId => 
          stmt.bind(periodId, cId, title, description || '', fileUrl || '', fileType || '')
        );
        
        await env.DB.batch(batch);
        return jsonResponse({ message: "Materi berhasil dibagikan ke " + targets.length + " kelas." });
      }

      // 3. TOGGLE VISIBILITY (Sembunyikan/Tampilkan Materi)
      if (method === "PUT") {
        const body = await request.json();
        const { id, isVisible } = body;
        
        await env.DB.prepare(`
          UPDATE materials SET is_visible = ? WHERE id = ?
        `).bind(isVisible ? 1 : 0, id).run();
        
        return jsonResponse({ message: "Status visibilitas diperbarui" });
      }
      
      // 4. DELETE MATERIAL
      if (method === "DELETE") {
        const id = url.searchParams.get("id");
        if (!id) return jsonResponse({ error: "ID materi diperlukan" }, 400);

        await env.DB.prepare(`DELETE FROM materials WHERE id = ?`).bind(id).run();
        return jsonResponse({ message: "Materi dihapus" });
      }
    }

    return null;
  } catch (err) {
    return jsonResponse({ error: "Material Controller Error: " + err.message }, 500);
  }
}