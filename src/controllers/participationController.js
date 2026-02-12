// controllers/participationController.js
// Mengelola Nilai Keaktifan (Standalone Module)
// Fitur: CRUD Nilai, Auto-Calculate dari Presensi

import { jsonResponse } from '../utils.js';

export async function handleParticipationRequest(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    try {
        // ========================================
        // 1. GET PARTICIPATION DATA (List Siswa + Nilai)
        // ========================================
        // ========================================
        // DEBUG & FIX ENDPOINT
        // ========================================
        if (pathname === "/api/participation/debug-fix") {
            const report = { steps: [] };
            try {
                // 1. Check Table Info
                const tableInfo = await env.DB.prepare("PRAGMA table_info(grades)").all();
                report.steps.push({ step: "check_schema", columns: tableInfo.results.map(c => c.name) });

                const hasParticipation = tableInfo.results.some(c => c.name === 'participation');
                const hasNotes = tableInfo.results.some(c => c.name === 'participation_notes');

                // 2. Add Columns if missing
                if (!hasParticipation) {
                    try {
                        await env.DB.prepare("ALTER TABLE grades ADD COLUMN participation REAL DEFAULT 0").run();
                        report.steps.push({ step: "add_participation", status: "success" });
                    } catch (e) {
                        report.steps.push({ step: "add_participation", error: e.message });
                    }
                } else {
                    report.steps.push({ step: "add_participation", status: "already_exists" });
                }

                if (!hasNotes) {
                    try {
                        await env.DB.prepare("ALTER TABLE grades ADD COLUMN participation_notes TEXT").run();
                        report.steps.push({ step: "add_notes", status: "success" });
                    } catch (e) {
                        report.steps.push({ step: "add_notes", error: e.message });
                    }
                } else {
                    report.steps.push({ step: "add_notes", status: "already_exists" });
                }

                // 3. Test Query (Simple)
                try {
                    const testQuery = await env.DB.prepare(`SELECT id, participation FROM grades LIMIT 1`).all();
                    report.steps.push({ step: "test_query_simple", result: testQuery.results });
                } catch (e) {
                    report.steps.push({ step: "test_query_simple", error: e.message });
                }

                // 4. Test Query (Complex - The one that fails)
                try {
                    const classId = 1; // Dummy ID
                    const periodId = 1; // Dummy ID
                    const complexQuery = await env.DB.prepare(`
                        SELECT 
                        s.id, s.name,
                        g.participation,
                        g.participation_notes
                        FROM students s
                        LEFT JOIN grades g ON s.id = g.student_id AND g.period_id = ?
                        WHERE s.class_id = ?
                        LIMIT 1
                    `).bind(periodId, classId).all();
                    report.steps.push({ step: "test_query_complex", result: complexQuery.results });
                } catch (e) {
                    report.steps.push({ step: "test_query_complex", error: e.message });
                }

                return jsonResponse(report);
            } catch (e) {
                return jsonResponse({ error: "Debug Fix Error: " + e.message, report }, 500);
            }
        }

        // ========================================
        // 1. GET PARTICIPATION DATA (List Siswa + Nilai)
        // ========================================
        // ========================================
        // 1. GET PARTICIPATION DATA (Points System)
        // ========================================
        if (pathname === "/api/participation" && method === "GET") {
            const classId = url.searchParams.get("class_id");
            const periodId = url.searchParams.get("period_id");

            if (!classId || !periodId) return jsonResponse({ error: "Missing params" }, 400);

            try {
                // 1. Ambil Setting Kelas (Base Score & Points Config)
                const classInfo = await env.DB.prepare("SELECT participation_base_score, point_ask, point_answer, point_volunteer, point_sanction FROM classes WHERE id = ?").bind(classId).first();
                const config = {
                    base_score: classInfo?.participation_base_score || 60,
                    point_ask: classInfo?.point_ask || 1,
                    point_answer: classInfo?.point_answer || 2,
                    point_volunteer: classInfo?.point_volunteer || 3,
                    point_sanction: classInfo?.point_sanction || -1
                };

                // 2. Ambil Siswa
                const { results: students } = await env.DB.prepare(`
            SELECT id, name FROM students WHERE class_id = ? ORDER BY name ASC
          `).bind(classId).all();

                // 3. Ambil Total Poin per Siswa
                const { results: pointsData } = await env.DB.prepare(`
            SELECT student_id, SUM(points) as total_points, GROUP_CONCAT(type || ':' || points) as history
            FROM participation_logs
            WHERE class_id = ? AND period_id = ?
            GROUP BY student_id
          `).bind(classId, periodId).all();

                // 4. Gabungkan Data
                const pointsMap = {};
                pointsData.forEach(p => {
                    pointsMap[p.student_id] = {
                        total: p.total_points,
                        history: p.history
                    };
                });

                const finalData = students.map(s => {
                    const p = pointsMap[s.id];
                    const totalPoints = p ? p.total : 0;
                    const finalScore = Math.min(100, config.base_score + totalPoints); // Cap at 100

                    return {
                        id: s.id,
                        name: s.name,
                        participation: finalScore, // Untuk display nilai akhir
                        total_points: totalPoints, // Untuk display poin murni
                        base_score: config.base_score,
                        history: p ? p.history : "" // Raw history string
                    };
                });

                return jsonResponse({
                    students: finalData,
                    config: config
                });
            } catch (err) {
                return jsonResponse({ error: "Fetch Error: " + err.message }, 500);
            }
        }

        // ========================================
        // 1b. GET PARTICIPATION HISTORY (Detail)
        // ========================================
        if (pathname === "/api/participation/history" && method === "GET") {
            const studentId = url.searchParams.get("student_id");
            const periodId = url.searchParams.get("period_id");

            if (!studentId || !periodId) return jsonResponse({ error: "Params required" }, 400);

            const { results } = await env.DB.prepare(`
            SELECT id, type, points, notes, created_at 
            FROM participation_logs 
            WHERE student_id = ? AND period_id = ?
            ORDER BY created_at DESC
        `).bind(studentId, periodId).all();

            return jsonResponse(results);
        }

        // ========================================
        // 2. LOG PARTICIPATION (Tambah Poin)
        // ========================================
        // ========================================
        // 2. LOG PARTICIPATION (Tambah Poin)
        // ========================================
        if (pathname === "/api/participation/log" && method === "POST") {
            const body = await request.json();
            const { periodId, classId, studentId, type, points, notes } = body;

            try {
                await env.DB.prepare(`
                INSERT INTO participation_logs (period_id, class_id, student_id, type, points, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            `).bind(periodId, classId, studentId, type, points, notes || "").run();

                // Update nilai di tabel grades (optional, agar sinkron dengan rapor)

                // 1. Ambil Base Score Kelas
                const classInfo = await env.DB.prepare("SELECT participation_base_score FROM classes WHERE id = ?").bind(classId).first();
                const baseScore = classInfo?.participation_base_score || 60;

                // 2. Hitung Total Poin
                const total = await env.DB.prepare(`SELECT SUM(points) as t FROM participation_logs WHERE student_id = ? AND period_id = ?`).bind(studentId, periodId).first();
                const newScore = Math.min(100, baseScore + (total.t || 0));

                // 3. Upsert ke grades
                const existing = await env.DB.prepare("SELECT id FROM grades WHERE student_id = ? AND period_id = ?").bind(studentId, periodId).first();
                if (existing) {
                    await env.DB.prepare("UPDATE grades SET participation = ? WHERE id = ?").bind(newScore, existing.id).run();
                } else {
                    await env.DB.prepare("INSERT INTO grades (student_id, period_id, participation) VALUES (?, ?, ?)").bind(studentId, periodId, newScore).run();
                }

                return jsonResponse({ message: "Poin dicatat", newScore });
            } catch (e) {
                return jsonResponse({ error: "Log Error: " + e.message }, 500);
            }
        }

        // ========================================
        // 3. RESET PARTICIPATION (Hapus Log Siswa)
        // ========================================
        if (pathname === "/api/participation/reset" && method === "POST") {
            const body = await request.json();
            const { studentId, periodId } = body;

            await env.DB.prepare("DELETE FROM participation_logs WHERE student_id = ? AND period_id = ?").bind(studentId, periodId).run();

            // Reset nilai di grades ke Base Score
            const studentInfo = await env.DB.prepare("SELECT class_id FROM students WHERE id = ?").bind(studentId).first();
            let baseScore = 60;
            if (studentInfo) {
                const classInfo = await env.DB.prepare("SELECT participation_base_score FROM classes WHERE id = ?").bind(studentInfo.class_id).first();
                baseScore = classInfo?.participation_base_score || 60;
            }

            const existing = await env.DB.prepare("SELECT id FROM grades WHERE student_id = ? AND period_id = ?").bind(studentId, periodId).first();
            if (existing) {
                await env.DB.prepare("UPDATE grades SET participation = ? WHERE id = ?").bind(baseScore, existing.id).run();
            }

            return jsonResponse({ message: `Data di-reset ke nilai dasar (${baseScore}).` });
        }

        // ========================================
        // 4. DELETE LOG (Undo Participation)
        // ========================================
        if (pathname === "/api/participation/log" && method === "DELETE") {
            const logId = url.searchParams.get("id");
            if (!logId) return jsonResponse({ error: "ID required" }, 400);

            // 1. Get Log Details first (to know student & subtract points)
            const log = await env.DB.prepare("SELECT * FROM participation_logs WHERE id = ?").bind(logId).first();
            if (!log) return jsonResponse({ error: "Log not found" }, 404);

            const { student_id, period_id, class_id } = log;

            // 2. Delete Log
            await env.DB.prepare("DELETE FROM participation_logs WHERE id = ?").bind(logId).run();

            // 3. Recalculate Student's Total Points
            // Get Base Score
            const classInfo = await env.DB.prepare("SELECT participation_base_score FROM classes WHERE id = ?").bind(class_id).first();
            const baseScore = classInfo?.participation_base_score || 60;

            // Sum remaining logs
            const total = await env.DB.prepare(`SELECT SUM(points) as t FROM participation_logs WHERE student_id = ? AND period_id = ?`).bind(student_id, period_id).first();
            const newScore = Math.min(100, Math.max(0, baseScore + (total.t || 0)));

            // 4. Update Grades Table
            const existing = await env.DB.prepare("SELECT id FROM grades WHERE student_id = ? AND period_id = ?").bind(student_id, period_id).first();
            if (existing) {
                await env.DB.prepare("UPDATE grades SET participation = ? WHERE id = ?").bind(newScore, existing.id).run();
            } else {
                await env.DB.prepare("INSERT INTO grades (student_id, period_id, participation) VALUES (?, ?, ?)").bind(student_id, period_id, newScore).run();
            }

            return jsonResponse({ message: "Riwayat dihapus", newScore });
        }

        /*
                // ========================================
                // 2. SAVE PARTICIPATION (Simpan Nilai Manual) - DEPRECATED for Points System
                // ========================================
                if (pathname === "/api/participation" && method === "POST") {
                    const body = await request.json();
                    const { periodId, studentId, participation, notes } = body;
        
                    if (!periodId || !studentId) {
                        return jsonResponse({ error: "Data incomplete" }, 400);
                    }
        
                    // Cek apakah data nilai sudah ada sebelumnya?
                    const existing = await env.DB.prepare(`
                SELECT * FROM grades WHERE period_id = ? AND student_id = ?
              `).bind(periodId, studentId).first();
        
                    if (existing) {
                        // UPDATE
                        await env.DB.prepare(`
                  UPDATE grades 
                  SET participation = ?, participation_notes = ?, updated_at = CURRENT_TIMESTAMP
                  WHERE period_id = ? AND student_id = ?
                `).bind(participation, notes || '', periodId, studentId).run();
                    } else {
                        // INSERT (Buat row baru di grades cuma buat participation)
                        await env.DB.prepare(`
                  INSERT INTO grades (period_id, student_id, participation, participation_notes) 
                  VALUES (?, ?, ?, ?)
                `).bind(periodId, studentId, participation, notes || '').run();
                    }
        
                    return jsonResponse({ message: "Data tersimpan" });
                }
        */

        // ========================================
        // 3. AUTO-CALCULATE FROM ATTENDANCE
        // ========================================
        if (pathname === "/api/participation/calculate" && method === "POST") {
            const body = await request.json();
            const { classId, periodId } = body;

            if (!classId || !periodId) return jsonResponse({ error: "Missing params" }, 400);

            // Hitung Total Pertemuan di kelas ini
            const totalMeetingsQuery = await env.DB.prepare(`
        SELECT COUNT(DISTINCT date) as total 
        FROM attendance 
        WHERE class_id = ?
      `).bind(classId).first();

            const totalMeetings = totalMeetingsQuery.total || 0;

            if (totalMeetings === 0) {
                return jsonResponse({ error: "Belum ada data presensi di kelas ini." }, 400);
            }

            // Ambil data kehadiran per siswa (Hadir Only)
            // Status 'H' = Hadir. 'I', 'S', 'A' dianggap tidak hadir (atau mau dihitung setengah?)
            // Untuk simplifikasi: Hanya 'H' yang dihitung poin penuh. S/I mungkin 0.5?
            // User request: "Auto calculate". Kita pakai Logic: (Hadir / Total) * 100.

            const students = await env.DB.prepare(`
        SELECT id FROM students WHERE class_id = ?
      `).bind(classId).all();

            const updates = [];

            for (const s of students.results) {
                const attendance = await env.DB.prepare(`
          SELECT COUNT(*) as present_count 
          FROM attendance 
          WHERE class_id = ? AND student_id = ? AND status = 'H'
        `).bind(classId, s.id).first();

                const presentCount = attendance.present_count || 0;
                const score = Math.round((presentCount / totalMeetings) * 100); // 0-100

                // Simpan ke DB (Update/Insert)
                // Kita pakai logic UPSERT ala SQLite (INSERT OR REPLACE agak bahaya kalau replace row yg ada nilai lain)
                // Jadi pakai logic cek existing dulu

                const existing = await env.DB.prepare(`SELECT id FROM grades WHERE period_id = ? AND student_id = ?`).bind(periodId, s.id).first();

                if (existing) {
                    await env.DB.prepare(`UPDATE grades SET participation = ? WHERE period_id = ? AND student_id = ?`).bind(score, periodId, s.id).run();
                } else {
                    await env.DB.prepare(`INSERT INTO grades (period_id, student_id, participation) VALUES (?, ?, ?)`).bind(periodId, s.id, score).run();
                }

                updates.push({ id: s.id, score });
            }

            return jsonResponse({
                message: `Berhasil menghitung nilai keaktifan untuk ${updates.length} siswa.`,
                totalMeetings,
                updates
            });
        }

        return null; // Pass to next handler or 404
    } catch (err) {
        return jsonResponse({ error: "Participation Controller Error: " + err.message }, 500);
    }
}
