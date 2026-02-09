// controllers/materialBankController.js
// Mengelola Bank Bahan Ajar (Master Repository) dan Distribusi ke Kelas
// Fitur: CRUD Bank, Folder Management, Distribute to Classes, R2 Upload

import { jsonResponse } from '../utils.js';

export async function handleMaterialBankRequest(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    try {
        // ==========================================================
        // BAGIAN 1: MATERIAL BANK (Master/Gudang)
        // ==========================================================

        // 1. GET MATERIALS IN BANK (List semua materi di gudang)
        if (pathname === "/api/material-bank" && method === "GET") {
            const periodId = url.searchParams.get("period_id");
            const folderId = url.searchParams.get("folder_id");

            if (!periodId) return jsonResponse({ error: "Period ID diperlukan" }, 400);

            let query = `
        SELECT mb.*, mf.name as folder_name,
        (SELECT COUNT(*) FROM material_distribution WHERE material_id = mb.id) as distribution_count
        FROM material_bank mb
        LEFT JOIN material_folders mf ON mb.folder_id = mf.id
        WHERE mb.period_id = ?
      `;
            const params = [periodId];

            if (folderId && folderId !== 'all') {
                if (folderId === 'none') {
                    query += " AND mb.folder_id IS NULL";
                } else {
                    query += " AND mb.folder_id = ?";
                    params.push(folderId);
                }
            }

            query += " ORDER BY mb.created_at DESC";

            const { results } = await env.DB.prepare(query).bind(...params).all();
            return jsonResponse(results);
        }

        // 2. CREATE MATERIAL IN BANK
        if (pathname === "/api/material-bank" && method === "POST") {
            const body = await request.json();
            const { periodId, folderId, title, description, fileUrl, fileType, fileSize, r2Key } = body;

            if (!periodId || !title) return jsonResponse({ error: "Data tidak lengkap" }, 400);

            const result = await env.DB.prepare(`
        INSERT INTO material_bank (period_id, folder_id, title, description, file_url, file_type, file_size, r2_key)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
                periodId,
                folderId || null,
                title,
                description || '',
                fileUrl || '',
                fileType || 'link',
                fileSize || 0,
                r2Key || null
            ).run();

            return jsonResponse({
                message: "Materi berhasil ditambahkan ke Bank.",
                id: result.meta.last_row_id
            });
        }

        // 3. UPDATE MATERIAL IN BANK
        if (pathname === "/api/material-bank" && method === "PUT") {
            const body = await request.json();
            const { id, folderId, title, description, fileUrl, fileType, fileSize, r2Key } = body;

            if (!id) return jsonResponse({ error: "ID materi diperlukan" }, 400);

            await env.DB.prepare(`
        UPDATE material_bank 
        SET folder_id = ?, title = ?, description = ?, file_url = ?, file_type = ?, file_size = ?, r2_key = ?
        WHERE id = ?
      `).bind(
                folderId || null,
                title,
                description || '',
                fileUrl || '',
                fileType || 'link',
                fileSize || 0,
                r2Key || null,
                id
            ).run();

            return jsonResponse({ message: "Materi berhasil diperbarui." });
        }

        // 4. DELETE MATERIAL FROM BANK
        if (pathname === "/api/material-bank" && method === "DELETE") {
            const id = url.searchParams.get("id");
            if (!id) return jsonResponse({ error: "ID materi diperlukan" }, 400);

            // Get R2 key before deleting (for cleanup)
            const material = await env.DB.prepare("SELECT r2_key FROM material_bank WHERE id = ?").bind(id).first();

            // Delete from DB (cascade will delete distributions)
            await env.DB.prepare("DELETE FROM material_bank WHERE id = ?").bind(id).run();

            // Delete from R2 if exists
            if (material?.r2_key && env.R2) {
                try {
                    await env.R2.delete(material.r2_key);
                } catch (e) { /* ignore R2 error */ }
            }

            return jsonResponse({ message: "Materi dihapus dari Bank." });
        }

        // ==========================================================
        // BAGIAN 2: FOLDER MANAGEMENT
        // ==========================================================

        // 5. GET FOLDERS
        if (pathname === "/api/material-bank/folders" && method === "GET") {
            const periodId = url.searchParams.get("period_id");
            if (!periodId) return jsonResponse({ error: "Period ID diperlukan" }, 400);

            const { results } = await env.DB.prepare(`
        SELECT mf.*, 
        (SELECT COUNT(*) FROM material_bank WHERE folder_id = mf.id) as material_count
        FROM material_folders mf
        WHERE mf.period_id = ?
        ORDER BY mf.name ASC
      `).bind(periodId).all();

            return jsonResponse(results);
        }

        // 6. CREATE FOLDER
        if (pathname === "/api/material-bank/folders" && method === "POST") {
            const body = await request.json();
            const { periodId, name } = body;

            if (!periodId || !name) return jsonResponse({ error: "Data tidak lengkap" }, 400);

            const result = await env.DB.prepare(`
        INSERT INTO material_folders (period_id, name) VALUES (?, ?)
      `).bind(periodId, name).run();

            return jsonResponse({
                message: "Folder berhasil dibuat.",
                id: result.meta.last_row_id
            });
        }

        // 7. DELETE FOLDER
        if (pathname === "/api/material-bank/folders" && method === "DELETE") {
            const id = url.searchParams.get("id");
            if (!id) return jsonResponse({ error: "ID folder diperlukan" }, 400);

            // Set folder_id to NULL for materials in this folder (don't delete them)
            await env.DB.prepare("UPDATE material_bank SET folder_id = NULL WHERE folder_id = ?").bind(id).run();
            await env.DB.prepare("DELETE FROM material_folders WHERE id = ?").bind(id).run();

            return jsonResponse({ message: "Folder dihapus (materi dipindah ke tanpa folder)." });
        }

        // ==========================================================
        // BAGIAN 3: DISTRIBUTION (Bagikan ke Kelas)
        // ==========================================================

        // 8. GET DISTRIBUTIONS (Lihat distribusi materi)
        if (pathname === "/api/material-bank/distributions" && method === "GET") {
            const periodId = url.searchParams.get("period_id");
            const classId = url.searchParams.get("class_id");
            const materialId = url.searchParams.get("material_id");

            let query = `
        SELECT md.*, mb.title, mb.description, mb.file_url, mb.file_type, c.name as class_name
        FROM material_distribution md
        JOIN material_bank mb ON md.material_id = mb.id
        JOIN classes c ON md.class_id = c.id
        WHERE mb.period_id = ?
      `;
            const params = [periodId];

            if (classId) {
                query += " AND md.class_id = ?";
                params.push(classId);
            }

            if (materialId) {
                query += " AND md.material_id = ?";
                params.push(materialId);
            }

            query += " ORDER BY md.distributed_at DESC";

            const { results } = await env.DB.prepare(query).bind(...params).all();
            return jsonResponse(results);
        }

        // 9. CREATE DISTRIBUTION (Bagikan materi ke kelas)
        if (pathname === "/api/material-bank/distribute" && method === "POST") {
            const body = await request.json();
            const { materialId, classIds } = body;

            if (!materialId || !classIds || !Array.isArray(classIds) || classIds.length === 0) {
                return jsonResponse({ error: "Material ID dan Class IDs diperlukan" }, 400);
            }

            // Use INSERT OR IGNORE to avoid duplicates
            let successCount = 0;
            for (const classId of classIds) {
                try {
                    await env.DB.prepare(`
            INSERT OR IGNORE INTO material_distribution (material_id, class_id, is_visible)
            VALUES (?, ?, 1)
          `).bind(materialId, classId).run();
                    successCount++;
                } catch (e) { /* ignore duplicates */ }
            }

            return jsonResponse({
                message: `Materi berhasil dibagikan ke ${successCount} kelas.`,
                distributed_count: successCount
            });
        }

        // 10. UPDATE DISTRIBUTION VISIBILITY
        if (pathname === "/api/material-bank/distribute" && method === "PUT") {
            const body = await request.json();
            const { id, isVisible } = body;

            if (!id) return jsonResponse({ error: "Distribution ID diperlukan" }, 400);

            await env.DB.prepare(`
        UPDATE material_distribution SET is_visible = ? WHERE id = ?
      `).bind(isVisible ? 1 : 0, id).run();

            return jsonResponse({ message: isVisible ? "Materi ditampilkan ke siswa." : "Materi disembunyikan dari siswa." });
        }

        // 11. DELETE DISTRIBUTION (Tarik materi dari kelas)
        if (pathname === "/api/material-bank/distribute" && method === "DELETE") {
            const id = url.searchParams.get("id");
            const materialId = url.searchParams.get("material_id");
            const classId = url.searchParams.get("class_id");

            if (id) {
                await env.DB.prepare("DELETE FROM material_distribution WHERE id = ?").bind(id).run();
            } else if (materialId && classId) {
                await env.DB.prepare("DELETE FROM material_distribution WHERE material_id = ? AND class_id = ?").bind(materialId, classId).run();
            } else {
                return jsonResponse({ error: "ID atau Material+Class ID diperlukan" }, 400);
            }

            return jsonResponse({ message: "Materi ditarik dari kelas." });
        }

        // ==========================================================
        // BAGIAN 4: R2 UPLOAD (Direct Upload to Storage)
        // ==========================================================

        // 12. UPLOAD FILE TO R2
        if (pathname === "/api/material-bank/upload" && method === "POST") {
            if (!env.R2) return jsonResponse({ error: "Storage belum dikonfigurasi" }, 500);

            try {
                const formData = await request.formData();
                const file = formData.get('file');

                if (!file) return jsonResponse({ error: "File tidak ditemukan" }, 400);

                const originalName = file.name || 'file';
                const ext = originalName.split('.').pop() || 'bin';
                const r2Key = `materials/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
                const fileBuffer = await file.arrayBuffer();

                await env.R2.put(r2Key, fileBuffer, {
                    httpMetadata: { contentType: file.type || 'application/octet-stream' }
                });

                // Construct public URL
                let r2Domain = "https://cdn.alkemia.my.id";
                if (r2Domain.endsWith('/')) r2Domain = r2Domain.slice(0, -1);
                const publicUrl = `${r2Domain}/${r2Key}`;

                return jsonResponse({
                    url: publicUrl,
                    r2Key: r2Key,
                    filename: originalName,
                    size: fileBuffer.byteLength,
                    type: file.type
                });
            } catch (e) {
                return jsonResponse({ error: "Gagal upload: " + e.message }, 500);
            }
        }

        return null;
    } catch (err) {
        return jsonResponse({ error: "Material Bank Controller Error: " + err.message }, 500);
    }
}
