// controllers/imageController.js
// Handle image upload to R2, folder management, and image CRUD

import { jsonResponse } from '../utils.js';

/**
 * Handle all image-related API requests
 */
export async function handleImageRequest(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // --- FOLDERS API ---

    // GET /api/folders - List all folders
    if (pathname === '/api/folders' && method === 'GET') {
        const { results } = await env.DB.prepare(`
            SELECT f.*, (SELECT COUNT(*) FROM images WHERE folder_id = f.id) as image_count
            FROM image_folders f ORDER BY f.name
        `).all();
        return jsonResponse({ folders: results });
    }

    // POST /api/folders - Create folder
    if (pathname === '/api/folders' && method === 'POST') {
        const { name } = await request.json();
        if (!name?.trim()) return jsonResponse({ error: 'Nama folder wajib diisi' }, 400);

        const result = await env.DB.prepare(`
            INSERT INTO image_folders (name) VALUES (?)
        `).bind(name.trim()).run();

        return jsonResponse({
            message: 'Folder berhasil dibuat',
            folder: { id: result.meta.last_row_id, name: name.trim() }
        });
    }

    // DELETE /api/folders/:id - Delete folder (images moved to uncategorized)
    if (pathname.match(/^\/api\/folders\/\d+$/) && method === 'DELETE') {
        const folderId = parseInt(pathname.split('/').pop());

        // Don't delete default folder (id=1)
        if (folderId === 1) {
            return jsonResponse({ error: 'Folder default tidak bisa dihapus' }, 400);
        }

        // Move images to default folder
        await env.DB.prepare('UPDATE images SET folder_id = 1 WHERE folder_id = ?').bind(folderId).run();
        await env.DB.prepare('DELETE FROM image_folders WHERE id = ?').bind(folderId).run();

        return jsonResponse({ message: 'Folder berhasil dihapus' });
    }

    // --- IMAGES API ---

    // GET /api/images - List images (with optional folder filter)
    if (pathname === '/api/images' && method === 'GET') {
        const folderId = url.searchParams.get('folder_id');

        let query = `
            SELECT i.*, f.name as folder_name 
            FROM images i 
            LEFT JOIN image_folders f ON i.folder_id = f.id
        `;

        if (folderId && folderId !== 'all') {
            query += ` WHERE i.folder_id = ${parseInt(folderId)}`;
        }

        query += ' ORDER BY i.created_at DESC LIMIT 100';

        const { results } = await env.DB.prepare(query).all();

        // Generate public URLs for each image
        const imagesWithUrls = results.map(img => ({
            ...img,
            url: `/api/images/file/${img.r2_key}`
        }));

        return jsonResponse({ images: imagesWithUrls });
    }

    // POST /api/images/upload - Upload new image
    if (pathname === '/api/images/upload' && method === 'POST') {
        try {
            const formData = await request.formData();
            const file = formData.get('file');
            const folderId = formData.get('folder_id') || 1;
            const filename = formData.get('filename') || file.name;

            if (!file) {
                return jsonResponse({ error: 'File gambar wajib diupload' }, 400);
            }

            // Generate unique R2 key
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 8);
            const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
            const r2Key = `images/${timestamp}_${random}.${ext}`;

            // Upload to R2
            const arrayBuffer = await file.arrayBuffer();
            await env.R2.put(r2Key, arrayBuffer, {
                httpMetadata: {
                    contentType: file.type || 'image/jpeg',
                },
            });

            // Save to database
            const result = await env.DB.prepare(`
                INSERT INTO images (folder_id, filename, r2_key, size_bytes, mime_type)
                VALUES (?, ?, ?, ?, ?)
            `).bind(
                parseInt(folderId),
                filename,
                r2Key,
                arrayBuffer.byteLength,
                file.type || 'image/jpeg'
            ).run();

            return jsonResponse({
                message: 'Gambar berhasil diupload',
                image: {
                    id: result.meta.last_row_id,
                    filename,
                    r2_key: r2Key,
                    url: `/api/images/file/${r2Key}`,
                    size_bytes: arrayBuffer.byteLength
                }
            });

        } catch (e) {
            console.error('Upload error:', e);
            return jsonResponse({ error: 'Gagal upload gambar: ' + e.message }, 500);
        }
    }

    // GET /api/images/file/:key - Serve image from R2
    if (pathname.startsWith('/api/images/file/') && method === 'GET') {
        const r2Key = pathname.replace('/api/images/file/', '');

        const object = await env.R2.get(r2Key);
        if (!object) {
            return new Response('Image not found', { status: 404 });
        }

        const headers = new Headers();
        headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
        headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year cache
        headers.set('Access-Control-Allow-Origin', '*');

        return new Response(object.body, { headers });
    }

    // DELETE /api/images/:id - Delete image
    if (pathname.match(/^\/api\/images\/\d+$/) && method === 'DELETE') {
        const imageId = parseInt(pathname.split('/').pop());

        // Get image info first
        const image = await env.DB.prepare('SELECT r2_key FROM images WHERE id = ?').bind(imageId).first();

        if (!image) {
            return jsonResponse({ error: 'Gambar tidak ditemukan' }, 404);
        }

        // Delete from R2
        await env.R2.delete(image.r2_key);

        // Delete from database
        await env.DB.prepare('DELETE FROM images WHERE id = ?').bind(imageId).run();

        return jsonResponse({ message: 'Gambar berhasil dihapus' });
    }

    // PUT /api/images/:id/move - Move image to another folder
    if (pathname.match(/^\/api\/images\/\d+\/move$/) && method === 'PUT') {
        const imageId = parseInt(pathname.split('/')[3]);
        const { folder_id } = await request.json();

        await env.DB.prepare('UPDATE images SET folder_id = ? WHERE id = ?')
            .bind(parseInt(folder_id), imageId).run();

        return jsonResponse({ message: 'Gambar berhasil dipindahkan' });
    }

    // Not an image API request
    return null;
}
