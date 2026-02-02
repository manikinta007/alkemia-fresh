// controllers/uploadController.js
// Mengelola Upload File ke Cloudflare R2
// Public Access URL sudah disesuaikan.

import { jsonResponse } from '../utils.js';

export async function handleUploadRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  // URL Public R2 (JANGAN DIUBAH)
  const R2_PUBLIC_URL = "https://cdn.alkemia.my.id";

  try {
    if (pathname === "/api/upload" && method === "POST") {
      // 1. Ambil File dari Form Data
      const formData = await request.formData();
      const file = formData.get('file');

      if (!file) {
        return jsonResponse({ error: "Tidak ada file yang diunggah" }, 400);
      }

      // --- [REVISI] VALIDASI UKURAN (MAX 1MB) ---
      // 1 MB = 1 * 1024 * 1024 bytes
      if (file.size > 1 * 1024 * 1024) {
        return jsonResponse({ error: "Ukuran file terlalu besar! Maksimal 1MB." }, 400);
      }

      // 3. Generate Nama Unik (UUID + Extension)
      const extension = file.name.split('.').pop();
      const uniqueName = `${crypto.randomUUID()}.${extension}`;

      // 4. Upload ke R2 Bucket (Binding: R2)
      await env.R2.put(uniqueName, file);

      // 5. Kembalikan URL Gambar
      const publicUrl = `${R2_PUBLIC_URL}/${uniqueName}`;
      
      return jsonResponse({ 
        success: true, 
        url: publicUrl,
        name: uniqueName
      });
    }

    return null;
  } catch (err) {
    return jsonResponse({ error: "Upload Error: " + err.message }, 500);
  }
}