// controllers/journalController.js
// CONTROLLER UNTUK FITUR JURNAL MENGAJAR
// Fitur: CRUD Jurnal, Template Management, Settings, Export PDF

import { jsonResponse } from '../utils.js';

export async function handleJournalRequest(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    try {
        // ============================================
        // 1. JOURNALS CRUD
        // ============================================

        // GET /api/journals - List journals with filters
        if (pathname === "/api/journals" && method === "GET") {
            try {
                const classId = url.searchParams.get("class_id");
                const periodId = url.searchParams.get("period_id");
                const month = url.searchParams.get("month"); // Format: YYYY-MM

                // 1. Fetch Journals (Single Table)
                let query = "SELECT * FROM teaching_journals WHERE 1=1";
                const params = [];

                if (classId) {
                    query += " AND class_id = ?";
                    params.push(classId);
                }
                if (periodId) {
                    query += " AND period_id = ?";
                    params.push(periodId);
                }
                if (month) {
                    query += " AND date LIKE ?";
                    params.push(`${month}%`);
                }

                query += " ORDER BY date DESC, start_time ASC";

                const stmt = env.DB.prepare(query);
                const result = params.length > 0
                    ? await stmt.bind(...params).all()
                    : await stmt.all();

                const rawJournals = result.results || [];

                // 2. Collect unique IDs for relations
                const classIds = [...new Set(rawJournals.map(j => j.class_id).filter(Boolean))];
                const periodIds = [...new Set(rawJournals.map(j => j.period_id).filter(Boolean))];

                // 3. Fetch Relations (App-Side Join)
                let classesMap = {};
                let periodsMap = {};

                if (classIds.length > 0) {
                    // D1 doesn't support WHERE IN array efficiently in binding, so we loop or query all if small
                    // Optimization: Query all relevant classes manually or just simple lookup
                    // Since lists are small, we can fetch specific IDs dynamically
                    const placeholders = classIds.map(() => '?').join(',');
                    const classRes = await env.DB.prepare(`SELECT id, name FROM classes WHERE id IN (${placeholders})`)
                        .bind(...classIds).all();
                    (classRes.results || []).forEach(c => classesMap[c.id] = c.name);
                }

                if (periodIds.length > 0) {
                    const placeholders = periodIds.map(() => '?').join(',');
                    // Note: academic_periods has 'year' and 'semester', not 'name'
                    const periodRes = await env.DB.prepare(`SELECT id, year, semester FROM academic_periods WHERE id IN (${placeholders})`)
                        .bind(...periodIds).all();
                    (periodRes.results || []).forEach(p => periodsMap[p.id] = `${p.year} - ${p.semester}`);
                }

                // 4. Map Data & Parse JSON
                const journals = rawJournals.map(j => {
                    let customData = {};
                    try {
                        if (typeof j.custom_data === 'string') {
                            customData = JSON.parse(j.custom_data);
                        } else if (typeof j.custom_data === 'object' && j.custom_data !== null) {
                            customData = j.custom_data;
                        }
                    } catch (e) {
                        // silent fail for json parse
                    }

                    return {
                        ...j,
                        class_name: classesMap[j.class_id] || "Kelas Tidak Ditemukan",
                        period_name: periodsMap[j.period_id] || "-",
                        custom_data: customData
                    };
                });

                return jsonResponse({ journals });
            } catch (err) {
                return jsonResponse({
                    error: "Journal List Error: " + err.message,
                    stack: err.stack
                }, 500);
            }
        }

        // GET /api/journals/attendance - Get attendance summary for journal
        // NOTE: This must come BEFORE /api/journals/:id to avoid route conflict
        if (pathname === "/api/journals/attendance" && method === "GET") {
            const classId = url.searchParams.get("class_id");
            const date = url.searchParams.get("date");

            if (!classId || !date) {
                return jsonResponse({ error: "class_id dan date wajib diisi" }, 400);
            }

            // Get attendance summary for the class on given date
            const { results } = await env.DB.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'H' THEN 1 ELSE 0 END) as hadir,
          SUM(CASE WHEN status = 'S' THEN 1 ELSE 0 END) as sakit,
          SUM(CASE WHEN status = 'I' THEN 1 ELSE 0 END) as izin,
          SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END) as alpa
        FROM attendance
        WHERE class_id = ? AND date = ?
      `).bind(classId, date).all();

            const summary = results[0] || { total: 0, hadir: 0, sakit: 0, izin: 0, alpa: 0 };

            return jsonResponse({
                attendance: summary,
                formatted: `H: ${summary.hadir} | S: ${summary.sakit} | I: ${summary.izin} | A: ${summary.alpa}`
            });
        }

        // GET /api/journals/:id - Get single journal
        if (pathname.match(/^\/api\/journals\/\d+$/) && method === "GET") {
            const id = pathname.split("/").pop();

            const journal = await env.DB.prepare(`
        SELECT 
          j.*,
          c.name as class_name,
          p.name as period_name
        FROM teaching_journals j
        LEFT JOIN classes c ON j.class_id = c.id
        LEFT JOIN academic_periods p ON j.period_id = p.id
        WHERE j.id = ?
      `).bind(id).first();

            if (!journal) {
                return jsonResponse({ error: "Jurnal tidak ditemukan" }, 404);
            }

            journal.custom_data = journal.custom_data ? JSON.parse(journal.custom_data) : {};

            return jsonResponse({ journal });
        }

        // POST /api/journals - Create journal
        if (pathname === "/api/journals" && method === "POST") {
            const body = await request.json();
            const { period_id, class_id, date, start_time, end_time, custom_data } = body;

            if (!class_id || !date) {
                return jsonResponse({ error: "class_id dan date wajib diisi" }, 400);
            }

            const result = await env.DB.prepare(`
        INSERT INTO teaching_journals (period_id, class_id, date, start_time, end_time, custom_data)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
                period_id || null,
                class_id,
                date,
                start_time || null,
                end_time || null,
                custom_data ? JSON.stringify(custom_data) : null
            ).run();

            return jsonResponse({
                message: "Jurnal berhasil ditambahkan",
                id: result.meta.last_row_id
            });
        }

        // PUT /api/journals - Update journal
        if (pathname === "/api/journals" && method === "PUT") {
            const body = await request.json();
            const { id, period_id, class_id, date, start_time, end_time, custom_data } = body;

            if (!id) {
                return jsonResponse({ error: "id wajib diisi" }, 400);
            }

            await env.DB.prepare(`
        UPDATE teaching_journals 
        SET period_id = ?, class_id = ?, date = ?, start_time = ?, end_time = ?, custom_data = ?
        WHERE id = ?
      `).bind(
                period_id || null,
                class_id,
                date,
                start_time || null,
                end_time || null,
                custom_data ? JSON.stringify(custom_data) : null,
                id
            ).run();

            return jsonResponse({ message: "Jurnal berhasil diperbarui" });
        }

        // DELETE /api/journals - Delete journal
        if (pathname === "/api/journals" && method === "DELETE") {
            const id = url.searchParams.get("id");

            if (!id) {
                return jsonResponse({ error: "id wajib diisi" }, 400);
            }

            await env.DB.prepare("DELETE FROM teaching_journals WHERE id = ?").bind(id).run();

            return jsonResponse({ message: "Jurnal berhasil dihapus" });
        }

        // ============================================
        // 2. JOURNAL TEMPLATES
        // ============================================

        // GET /api/journal-templates - List all templates
        if (pathname === "/api/journal-templates" && method === "GET") {
            const { results } = await env.DB.prepare(`
        SELECT * FROM journal_templates ORDER BY is_default DESC, name ASC
      `).all();

            // Safe parse helper: handles double-stringify and ensures key property
            const safeParseConfig = (configStr) => {
                if (!configStr) return [];
                try {
                    let parsed = JSON.parse(configStr);
                    // Handle double-stringify case
                    if (typeof parsed === 'string') {
                        parsed = JSON.parse(parsed);
                    }
                    // Ensure each column has 'key' property
                    if (Array.isArray(parsed)) {
                        return parsed.map(col => ({
                            ...col,
                            key: col.key || col.id || `col_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
                        }));
                    }
                    return [];
                } catch (e) {
                    console.error('Error parsing template_config:', e);
                    return [];
                }
            };

            const templates = results.map(t => ({
                ...t,
                template_config: safeParseConfig(t.template_config)
            }));

            return jsonResponse({ templates });
        }

        // GET /api/journal-templates/:id - Get template detail
        if (pathname.match(/^\/api\/journal-templates\/\d+$/) && method === "GET") {
            const id = pathname.split("/").pop();

            const template = await env.DB.prepare(`
        SELECT * FROM journal_templates WHERE id = ?
      `).bind(id).first();

            if (!template) {
                return jsonResponse({ error: "Template tidak ditemukan" }, 404);
            }

            template.template_config = template.template_config ? JSON.parse(template.template_config) : [];

            return jsonResponse({ template });
        }

        // POST /api/journal-templates - Create or update template
        if (pathname === "/api/journal-templates" && method === "POST") {
            const body = await request.json();
            const { id, name, template_config } = body;

            if (!name || !template_config) {
                return jsonResponse({ error: "name dan template_config wajib diisi" }, 400);
            }

            if (id) {
                // Update existing
                await env.DB.prepare(`
          UPDATE journal_templates SET name = ?, template_config = ? WHERE id = ?
        `).bind(name, JSON.stringify(template_config), id).run();

                return jsonResponse({ message: "Template berhasil diperbarui" });
            } else {
                // Create new (custom template, is_default = 0)
                const result = await env.DB.prepare(`
          INSERT INTO journal_templates (name, is_default, template_config) VALUES (?, 0, ?)
        `).bind(name, JSON.stringify(template_config)).run();

                return jsonResponse({
                    message: "Template berhasil dibuat",
                    id: result.meta.last_row_id
                });
            }
        }

        // DELETE /api/journal-templates - Delete template
        if (pathname === "/api/journal-templates" && method === "DELETE") {
            const id = url.searchParams.get("id");

            if (!id) {
                return jsonResponse({ error: "id wajib diisi" }, 400);
            }

            // Check if default template
            const template = await env.DB.prepare("SELECT is_default FROM journal_templates WHERE id = ?").bind(id).first();
            if (template?.is_default === 1) {
                return jsonResponse({ error: "Template default tidak bisa dihapus" }, 400);
            }

            await env.DB.prepare("DELETE FROM journal_templates WHERE id = ?").bind(id).run();

            return jsonResponse({ message: "Template berhasil dihapus" });
        }

        // PUT /api/journal-templates/set-active - Set active template
        if (pathname === "/api/journal-templates/set-active" && method === "PUT") {
            const body = await request.json();
            const { template_id } = body;

            if (!template_id) {
                return jsonResponse({ error: "template_id wajib diisi" }, 400);
            }

            // Check if template exists
            const template = await env.DB.prepare("SELECT id FROM journal_templates WHERE id = ?").bind(template_id).first();
            if (!template) {
                return jsonResponse({ error: "Template tidak ditemukan" }, 404);
            }

            // Update or create settings with active_template_id
            const existing = await env.DB.prepare("SELECT id FROM journal_settings LIMIT 1").first();
            if (existing) {
                await env.DB.prepare("UPDATE journal_settings SET active_template_id = ? WHERE id = ?")
                    .bind(template_id, existing.id).run();
            } else {
                await env.DB.prepare("INSERT INTO journal_settings (active_template_id) VALUES (?)")
                    .bind(template_id).run();
            }

            return jsonResponse({ message: "Template aktif berhasil diatur" });
        }

        // ============================================
        // 3. JOURNAL SETTINGS
        // ============================================

        // GET /api/journal-settings - Get settings
        if (pathname === "/api/journal-settings" && method === "GET") {
            let settings = await env.DB.prepare("SELECT * FROM journal_settings LIMIT 1").first();

            if (!settings) {
                // Create default settings if not exist
                await env.DB.prepare(`
          INSERT INTO journal_settings (school_name, school_address, pdf_orientation)
          VALUES ('Nama Sekolah', 'Alamat Sekolah', 'landscape')
        `).run();
                settings = await env.DB.prepare("SELECT * FROM journal_settings LIMIT 1").first();
            }

            return jsonResponse({ settings });
        }

        // PUT /api/journal-settings - Update settings
        if (pathname === "/api/journal-settings" && method === "PUT") {
            const body = await request.json();
            const {
                school_name,
                school_address,
                school_logo_url,
                school_logo_2_url,
                logo_position,
                logo_2_position,
                school_name_align,
                school_address_align,
                pdf_orientation,
                signature_name,
                signature_nip,
                signature_image_url,
                signature_place,
                signature_date,
                active_template_id
            } = body;

            // Check if settings exist
            const existing = await env.DB.prepare("SELECT id FROM journal_settings LIMIT 1").first();

            if (existing) {
                await env.DB.prepare(`
          UPDATE journal_settings SET
            school_name = ?,
            school_address = ?,
            school_logo_url = ?,
            school_logo_2_url = ?,
            logo_position = ?,
            logo_2_position = ?,
            school_name_align = ?,
            school_address_align = ?,
            pdf_orientation = ?,
            signature_name = ?,
            signature_nip = ?,
            signature_image_url = ?,
            signature_place = ?,
            signature_date = ?,
            active_template_id = ?
          WHERE id = ?
        `).bind(
                    school_name || null,
                    school_address || null,
                    school_logo_url || null,
                    school_logo_2_url || null,
                    logo_position || 'left',
                    logo_2_position || null,
                    school_name_align || 'center',
                    school_address_align || 'center',
                    pdf_orientation || 'landscape',
                    signature_name || null,
                    signature_nip || null,
                    signature_image_url || null,
                    signature_place || 'Jakarta',
                    signature_date || null,
                    active_template_id || null,
                    existing.id
                ).run();
            } else {
                await env.DB.prepare(`
          INSERT INTO journal_settings (
            school_name, school_address, school_logo_url, school_logo_2_url,
            logo_position, logo_2_position, school_name_align, school_address_align,
            pdf_orientation, signature_name, signature_nip, signature_image_url,
            signature_place, signature_date, active_template_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
                    school_name || null,
                    school_address || null,
                    school_logo_url || null,
                    school_logo_2_url || null,
                    logo_position || 'left',
                    logo_2_position || null,
                    school_name_align || 'center',
                    school_address_align || 'center',
                    pdf_orientation || 'landscape',
                    signature_name || null,
                    signature_nip || null,
                    signature_image_url || null,
                    signature_place || 'Jakarta',
                    signature_date || null,
                    active_template_id || null
                ).run();
            }

            return jsonResponse({ message: "Pengaturan berhasil disimpan" });
        }

        // POST /api/journal-settings/upload-logo - Upload logo to R2
        if (pathname === "/api/journal-settings/upload-logo" && method === "POST") {
            const formData = await request.formData();
            const file = formData.get("file");

            if (!file) {
                return jsonResponse({ error: "File tidak ditemukan" }, 400);
            }

            const arrayBuffer = await file.arrayBuffer();
            const key = `journal/logo_${Date.now()}.${file.name.split('.').pop()}`;

            await env.R2.put(key, arrayBuffer, {
                httpMetadata: { contentType: file.type }
            });

            // Update settings with new logo URL
            const existing = await env.DB.prepare("SELECT id FROM journal_settings LIMIT 1").first();
            if (existing) {
                await env.DB.prepare("UPDATE journal_settings SET school_logo_url = ? WHERE id = ?")
                    .bind(key, existing.id).run();
            }

            return jsonResponse({
                message: "Logo berhasil diupload",
                url: `/api/images/file/${key}`
            });
        }

        // POST /api/journal-settings/upload-signature - Upload signature to R2
        if (pathname === "/api/journal-settings/upload-signature" && method === "POST") {
            const formData = await request.formData();
            const file = formData.get("file");

            if (!file) {
                return jsonResponse({ error: "File tidak ditemukan" }, 400);
            }

            const arrayBuffer = await file.arrayBuffer();
            const key = `journal/signature_${Date.now()}.${file.name.split('.').pop()}`;

            await env.R2.put(key, arrayBuffer, {
                httpMetadata: { contentType: file.type }
            });

            // Update settings with new signature URL
            const existing = await env.DB.prepare("SELECT id FROM journal_settings LIMIT 1").first();
            if (existing) {
                await env.DB.prepare("UPDATE journal_settings SET signature_image_url = ? WHERE id = ?")
                    .bind(key, existing.id).run();
            }

            return jsonResponse({
                message: "Tanda tangan berhasil diupload",
                url: `/api/images/file/${key}`
            });
        }

        // NOTE: Attendance endpoint moved to line 64-93 for correct route priority

        return null;

    } catch (err) {
        return jsonResponse({ error: "Journal Error: " + err.message }, 500);
    }
}
