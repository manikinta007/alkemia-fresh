// controllers/gradeIntegrationController.js
// Mengelola Integrasi Nilai (Grade Integration)
// Dynamic components, auto-calculation, manual override, CSV upload, remedial

import { jsonResponse } from '../utils.js';

// Default grade components template
const DEFAULT_COMPONENTS = [
    { name: 'Tugas Harian', weight: 30, source_type: 'tasks', sort_order: 1 },
    { name: 'Ulangan Harian', weight: 25, source_type: 'quizzes', sort_order: 2 },
    { name: 'UTS', weight: 20, source_type: 'manual', sort_order: 3 },
    { name: 'UAS', weight: 15, source_type: 'manual', sort_order: 4 },
    { name: 'Keaktifan', weight: 10, source_type: 'participation', sort_order: 5 },
];

export async function handleGradeIntegrationRequest(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    try {
        // ========================================
        // 1. GET GRADE CONFIG (Components + KKM for period)
        // ========================================
        if (pathname === "/api/grade-config" && method === "GET") {
            const periodId = url.searchParams.get("period_id");
            if (!periodId) return jsonResponse({ error: "period_id diperlukan" }, 400);

            // Get period with KKM
            const period = await env.DB.prepare(
                "SELECT id, kkm, show_grade_breakdown FROM academic_periods WHERE id = ?"
            ).bind(periodId).first();

            if (!period) return jsonResponse({ error: "Periode tidak ditemukan" }, 404);

            // Get components
            const { results: components } = await env.DB.prepare(
                "SELECT * FROM grade_components WHERE period_id = ? ORDER BY sort_order ASC"
            ).bind(periodId).all();

            return jsonResponse({
                kkm: period.kkm || 75,
                show_grade_breakdown: period.show_grade_breakdown || 0,
                components
            });
        }

        // ========================================
        // 2. SAVE GRADE CONFIG (Components + KKM)
        // ========================================
        if (pathname === "/api/grade-config" && method === "POST") {
            const body = await request.json();
            const { period_id, kkm, show_grade_breakdown, components } = body;

            if (!period_id) return jsonResponse({ error: "period_id diperlukan" }, 400);
            if (!components || !Array.isArray(components)) return jsonResponse({ error: "components diperlukan" }, 400);

            // Validate total weight = 100
            const totalWeight = components.reduce((sum, c) => sum + (parseInt(c.weight) || 0), 0);
            if (totalWeight !== 100) {
                return jsonResponse({ error: `Total bobot harus 100%, saat ini ${totalWeight}%` }, 400);
            }

            // Update period KKM & breakdown toggle
            await env.DB.prepare(
                "UPDATE academic_periods SET kkm = ?, show_grade_breakdown = ? WHERE id = ?"
            ).bind(kkm || 75, show_grade_breakdown || 0, period_id).run();

            // Delete old components and re-insert
            await env.DB.prepare("DELETE FROM grade_components WHERE period_id = ?").bind(period_id).run();

            for (let i = 0; i < components.length; i++) {
                const c = components[i];
                await env.DB.prepare(
                    "INSERT INTO grade_components (period_id, name, weight, source_type, sort_order) VALUES (?, ?, ?, ?, ?)"
                ).bind(period_id, c.name, c.weight, c.source_type, i + 1).run();
            }

            return jsonResponse({ message: "Konfigurasi nilai berhasil disimpan" });
        }

        // ========================================
        // 3. SEED DEFAULT CONFIG
        // ========================================
        if (pathname === "/api/grade-config/seed" && method === "POST") {
            const body = await request.json();
            const { period_id } = body;
            if (!period_id) return jsonResponse({ error: "period_id diperlukan" }, 400);

            // Check if components exist
            const existing = await env.DB.prepare(
                "SELECT COUNT(*) as count FROM grade_components WHERE period_id = ?"
            ).bind(period_id).first();

            if (existing.count > 0) {
                return jsonResponse({ message: "Komponen sudah ada, tidak perlu seed.", seeded: false });
            }

            for (const c of DEFAULT_COMPONENTS) {
                await env.DB.prepare(
                    "INSERT INTO grade_components (period_id, name, weight, source_type, sort_order) VALUES (?, ?, ?, ?, ?)"
                ).bind(period_id, c.name, c.weight, c.source_type, c.sort_order).run();
            }

            return jsonResponse({ message: "Template default berhasil dibuat", seeded: true });
        }

        // ========================================
        // 4. GET GRADE RECAP (Full table for a class)
        // ========================================
        if (pathname === "/api/grade-recap" && method === "GET") {
            const classId = url.searchParams.get("class_id");
            const periodId = url.searchParams.get("period_id");
            if (!classId || !periodId) return jsonResponse({ error: "class_id dan period_id diperlukan" }, 400);

            // Get period + KKM
            const period = await env.DB.prepare(
                "SELECT id, kkm, show_grade_breakdown FROM academic_periods WHERE id = ?"
            ).bind(periodId).first();
            const kkm = period?.kkm || 75;

            // Get components
            const { results: components } = await env.DB.prepare(
                "SELECT * FROM grade_components WHERE period_id = ? ORDER BY sort_order ASC"
            ).bind(periodId).all();

            if (components.length === 0) {
                return jsonResponse({ kkm, components: [], students: [], message: "Belum ada komponen nilai. Buat konfigurasi terlebih dahulu." });
            }

            // Get students
            const { results: students } = await env.DB.prepare(
                "SELECT id, name FROM students WHERE class_id = ? ORDER BY name ASC"
            ).bind(classId).all();

            // Get existing grade_values for this class
            const { results: existingValues } = await env.DB.prepare(
                "SELECT * FROM grade_values WHERE class_id = ? AND student_id IN (SELECT id FROM students WHERE class_id = ?)"
            ).bind(classId, classId).all();

            // Build lookup: { `${component_id}_${student_id}`: gradeValue }
            const valuesMap = {};
            existingValues.forEach(v => {
                valuesMap[`${v.component_id}_${v.student_id}`] = v;
            });

            // ---- AUTO-CALCULATION ----

            // Tasks: individual + group (published & graded)
            const { results: tasks } = await env.DB.prepare(
                "SELECT id FROM tasks WHERE class_id = ? AND is_active = 1"
            ).bind(classId).all();
            const taskIds = tasks.map(t => t.id);

            // Individual task grades per student
            const taskGrades = {}; // studentId -> { total, count }
            if (taskIds.length > 0) {
                const placeholders = taskIds.map(() => '?').join(',');
                const { results: taskSubs } = await env.DB.prepare(
                    `SELECT student_id, grade FROM task_submissions 
           WHERE task_id IN (${placeholders}) AND is_graded = 1 AND is_published = 1`
                ).bind(...taskIds).all();

                // Initialize all students with count = total published tasks
                students.forEach(s => {
                    taskGrades[s.id] = { total: 0, count: taskIds.length };
                });
                taskSubs.forEach(sub => {
                    if (taskGrades[sub.student_id]) {
                        taskGrades[sub.student_id].total += (sub.grade || 0);
                    }
                });
            }

            // Group task grades per student (via group membership)
            const { results: groupTasks } = await env.DB.prepare(
                "SELECT id, group_set_id FROM group_tasks WHERE class_id = ? AND is_active = 1"
            ).bind(classId).all();

            const groupTaskGrades = {}; // studentId -> { total, count }
            if (groupTasks.length > 0) {
                for (const gt of groupTasks) {
                    // Get submissions for this group task
                    const { results: gtSubs } = await env.DB.prepare(
                        `SELECT gs.group_id, gs.grade FROM group_task_submissions gs 
             WHERE gs.group_task_id = ? AND gs.is_graded = 1 AND gs.is_published = 1`
                    ).bind(gt.id).all();

                    const groupGradeMap = {};
                    gtSubs.forEach(s => { groupGradeMap[s.group_id] = s.grade || 0; });

                    // Map group grades to individual students via group_members
                    const { results: members } = await env.DB.prepare(
                        `SELECT gm.student_id, gm.group_id FROM group_members gm
             JOIN groups g ON gm.group_id = g.id
             WHERE g.set_id = ?`
                    ).bind(gt.group_set_id).all();

                    members.forEach(m => {
                        if (!groupTaskGrades[m.student_id]) {
                            groupTaskGrades[m.student_id] = { total: 0, count: 0 };
                        }
                        groupTaskGrades[m.student_id].count++;
                        if (groupGradeMap[m.group_id] !== undefined) {
                            groupTaskGrades[m.student_id].total += groupGradeMap[m.group_id];
                        }
                    });
                }
            }

            // Quizzes
            const { results: quizzes } = await env.DB.prepare(
                "SELECT id FROM quizzes WHERE class_id = ? AND is_active = 1"
            ).bind(classId).all();
            const quizIds = quizzes.map(q => q.id);

            const quizGrades = {}; // studentId -> { total, count }
            if (quizIds.length > 0) {
                const placeholders = quizIds.map(() => '?').join(',');
                const { results: quizAttempts } = await env.DB.prepare(
                    `SELECT student_id, quiz_id, score FROM quiz_attempts 
           WHERE quiz_id IN (${placeholders})`
                ).bind(...quizIds).all();

                students.forEach(s => {
                    quizGrades[s.id] = { total: 0, count: quizIds.length };
                });
                quizAttempts.forEach(a => {
                    if (quizGrades[a.student_id]) {
                        quizGrades[a.student_id].total += (a.score || 0);
                    }
                });
            }

            // Participation
            const participationGrades = {}; // studentId -> value
            // Get class base score
            const classInfo = await env.DB.prepare(
                "SELECT participation_base_score FROM classes WHERE id = ?"
            ).bind(classId).first();
            const baseScore = classInfo?.participation_base_score || 60;

            const { results: partLogs } = await env.DB.prepare(
                `SELECT student_id, SUM(points) as total_points 
         FROM participation_logs 
         WHERE class_id = ? AND period_id = ?
         GROUP BY student_id`
            ).bind(classId, periodId).all();

            const partMap = {};
            partLogs.forEach(p => { partMap[p.student_id] = p.total_points || 0; });
            students.forEach(s => {
                const pts = partMap[s.id] || 0;
                participationGrades[s.id] = Math.min(100, Math.max(0, baseScore + pts));
            });

            // ---- BUILD STUDENT ROWS ----
            const studentRows = students.map(s => {
                const componentValues = components.map(comp => {
                    const key = `${comp.id}_${s.id}`;
                    const existing = valuesMap[key];

                    let autoValue = null;

                    if (comp.source_type === 'tasks') {
                        const indiv = taskGrades[s.id] || { total: 0, count: 0 };
                        const grp = groupTaskGrades[s.id] || { total: 0, count: 0 };
                        const totalCount = indiv.count + grp.count;
                        autoValue = totalCount > 0 ? (indiv.total + grp.total) / totalCount : null;
                    } else if (comp.source_type === 'quizzes') {
                        const q = quizGrades[s.id] || { total: 0, count: 0 };
                        autoValue = q.count > 0 ? q.total / q.count : null;
                    } else if (comp.source_type === 'participation') {
                        autoValue = participationGrades[s.id] ?? null;
                    } else if (comp.source_type === 'manual') {
                        autoValue = existing?.auto_value ?? null;
                    }

                    const manualOverride = existing?.manual_override ?? null;
                    const effectiveValue = manualOverride !== null ? manualOverride : autoValue;

                    return {
                        component_id: comp.id,
                        auto_value: autoValue !== null ? Math.round(autoValue * 100) / 100 : null,
                        manual_override: manualOverride !== null ? Math.round(manualOverride * 100) / 100 : null,
                        effective_value: effectiveValue !== null ? Math.round(effectiveValue * 100) / 100 : null,
                        is_overridden: manualOverride !== null,
                        is_remedial: existing?.is_remedial || 0,
                        remedial_at: existing?.remedial_at || null
                    };
                });

                // Calculate final grade
                let finalGrade = 0;
                let hasAllValues = true;
                components.forEach((comp, i) => {
                    const cv = componentValues[i];
                    if (cv.effective_value !== null) {
                        finalGrade += cv.effective_value * (comp.weight / 100);
                    } else {
                        hasAllValues = false;
                    }
                });
                finalGrade = Math.round(finalGrade * 100) / 100;

                // Check remedial (any component)
                const isRemedial = componentValues.some(cv => cv.is_remedial === 1);
                if (isRemedial) {
                    finalGrade = Math.max(finalGrade, kkm);
                }

                return {
                    student_id: s.id,
                    student_name: s.name,
                    values: componentValues,
                    final_grade: finalGrade,
                    is_below_kkm: finalGrade < kkm && !isRemedial,
                    is_remedial: isRemedial,
                    has_all_values: hasAllValues
                };
            });

            return jsonResponse({
                kkm,
                components,
                students: studentRows
            });
        }

        // ========================================
        // 5. SAVE GRADE VALUE (Manual input or override)
        // ========================================
        if (pathname === "/api/grade-recap/save" && method === "POST") {
            const body = await request.json();
            const { component_id, class_id, student_id, value, is_override } = body;

            if (!component_id || !class_id || !student_id) {
                return jsonResponse({ error: "component_id, class_id, student_id diperlukan" }, 400);
            }

            const parsedValue = value !== null && value !== '' ? parseFloat(value) : null;

            // Check if exists
            const existing = await env.DB.prepare(
                "SELECT id FROM grade_values WHERE component_id = ? AND class_id = ? AND student_id = ?"
            ).bind(component_id, class_id, student_id).first();

            if (is_override) {
                // Manual override for auto-calculated component
                if (existing) {
                    await env.DB.prepare(
                        "UPDATE grade_values SET manual_override = ? WHERE id = ?"
                    ).bind(parsedValue, existing.id).run();
                } else {
                    await env.DB.prepare(
                        "INSERT INTO grade_values (component_id, class_id, student_id, manual_override) VALUES (?, ?, ?, ?)"
                    ).bind(component_id, class_id, student_id, parsedValue).run();
                }
            } else {
                // Direct manual value (for manual source_type components like UTS/UAS)
                if (existing) {
                    await env.DB.prepare(
                        "UPDATE grade_values SET auto_value = ?, manual_override = NULL WHERE id = ?"
                    ).bind(parsedValue, existing.id).run();
                } else {
                    await env.DB.prepare(
                        "INSERT INTO grade_values (component_id, class_id, student_id, auto_value) VALUES (?, ?, ?, ?)"
                    ).bind(component_id, class_id, student_id, parsedValue).run();
                }
            }

            return jsonResponse({ message: "Nilai disimpan" });
        }

        // ========================================
        // 6. RESET OVERRIDE
        // ========================================
        if (pathname === "/api/grade-recap/reset-override" && method === "POST") {
            const body = await request.json();
            const { component_id, class_id, student_id } = body;

            await env.DB.prepare(
                "UPDATE grade_values SET manual_override = NULL WHERE component_id = ? AND class_id = ? AND student_id = ?"
            ).bind(component_id, class_id, student_id).run();

            return jsonResponse({ message: "Override direset" });
        }

        // ========================================
        // 7. CSV PREVIEW (Name matching)
        // ========================================
        if (pathname === "/api/grade-recap/csv-preview" && method === "POST") {
            const body = await request.json();
            const { class_id, rows } = body; // rows = [{name, value}]

            if (!class_id || !rows) return jsonResponse({ error: "class_id dan rows diperlukan" }, 400);

            const { results: students } = await env.DB.prepare(
                "SELECT id, name FROM students WHERE class_id = ? ORDER BY name ASC"
            ).bind(class_id).all();

            // Fuzzy match: normalize names
            const normalize = (name) => name.toLowerCase().trim().replace(/\s+/g, ' ');
            const studentMap = {};
            students.forEach(s => { studentMap[normalize(s.name)] = s; });

            const preview = rows.map(row => {
                const normalizedName = normalize(row.name || '');
                const matched = studentMap[normalizedName];
                return {
                    csv_name: row.name,
                    csv_value: parseFloat(row.value) || 0,
                    matched: !!matched,
                    student_id: matched?.id || null,
                    student_name: matched?.name || null
                };
            });

            return jsonResponse({
                total: rows.length,
                matched: preview.filter(p => p.matched).length,
                unmatched: preview.filter(p => !p.matched).length,
                preview
            });
        }

        // ========================================
        // 8. CSV UPLOAD (Save values)
        // ========================================
        if (pathname === "/api/grade-recap/csv-upload" && method === "POST") {
            const body = await request.json();
            const { component_id, class_id, entries } = body; // entries = [{student_id, value}]

            if (!component_id || !class_id || !entries) {
                return jsonResponse({ error: "component_id, class_id, entries diperlukan" }, 400);
            }

            let saved = 0;
            for (const entry of entries) {
                if (!entry.student_id) continue;
                const parsedValue = parseFloat(entry.value) || 0;

                const existing = await env.DB.prepare(
                    "SELECT id FROM grade_values WHERE component_id = ? AND class_id = ? AND student_id = ?"
                ).bind(component_id, class_id, entry.student_id).first();

                if (existing) {
                    await env.DB.prepare(
                        "UPDATE grade_values SET auto_value = ?, manual_override = NULL WHERE id = ?"
                    ).bind(parsedValue, existing.id).run();
                } else {
                    await env.DB.prepare(
                        "INSERT INTO grade_values (component_id, class_id, student_id, auto_value) VALUES (?, ?, ?, ?)"
                    ).bind(component_id, class_id, entry.student_id, parsedValue).run();
                }
                saved++;
            }

            return jsonResponse({ message: `${saved} nilai berhasil diimpor` });
        }

        // ========================================
        // 9. REMEDIAL (Set student to KKM)
        // ========================================
        if (pathname === "/api/grade-recap/remedial" && method === "POST") {
            const body = await request.json();
            const { class_id, student_id, period_id } = body;

            if (!class_id || !student_id || !period_id) {
                return jsonResponse({ error: "class_id, student_id, period_id diperlukan" }, 400);
            }

            // Get all components for this period
            const { results: components } = await env.DB.prepare(
                "SELECT id FROM grade_components WHERE period_id = ?"
            ).bind(period_id).all();

            // Mark remedial on a grade_value entry (use first component as flag carrier)
            // We'll create/update an entry for the first component
            if (components.length > 0) {
                const firstCompId = components[0].id;
                const existing = await env.DB.prepare(
                    "SELECT id FROM grade_values WHERE component_id = ? AND class_id = ? AND student_id = ?"
                ).bind(firstCompId, class_id, student_id).first();

                const now = new Date().toISOString();
                if (existing) {
                    await env.DB.prepare(
                        "UPDATE grade_values SET is_remedial = 1, remedial_at = ? WHERE id = ?"
                    ).bind(now, existing.id).run();
                } else {
                    await env.DB.prepare(
                        "INSERT INTO grade_values (component_id, class_id, student_id, is_remedial, remedial_at) VALUES (?, ?, ?, 1, ?)"
                    ).bind(firstCompId, class_id, student_id, now).run();
                }
            }

            return jsonResponse({ message: "Remedial berhasil diterapkan" });
        }

        // ========================================
        // 10. UNDO REMEDIAL
        // ========================================
        if (pathname === "/api/grade-recap/undo-remedial" && method === "POST") {
            const body = await request.json();
            const { class_id, student_id } = body;

            await env.DB.prepare(
                "UPDATE grade_values SET is_remedial = 0, remedial_at = NULL WHERE class_id = ? AND student_id = ?"
            ).bind(class_id, student_id).run();

            return jsonResponse({ message: "Remedial dibatalkan" });
        }

        // ========================================
        // 11. STUDENT ENDPOINT: Get own grades
        // ========================================
        if (pathname === "/api/student/grade-recap" && method === "GET") {
            const studentId = url.searchParams.get("student_id");
            const classId = url.searchParams.get("class_id");
            const periodId = url.searchParams.get("period_id");

            if (!studentId || !classId || !periodId) {
                return jsonResponse({ error: "student_id, class_id, period_id diperlukan" }, 400);
            }

            // Get period settings
            const period = await env.DB.prepare(
                "SELECT kkm, show_grade_breakdown FROM academic_periods WHERE id = ?"
            ).bind(periodId).first();

            if (!period) return jsonResponse({ error: "Periode tidak ditemukan" }, 404);

            // Call the same recap logic but return only this student's data
            // Simplified: just get pre-calculated values
            const { results: components } = await env.DB.prepare(
                "SELECT * FROM grade_components WHERE period_id = ? ORDER BY sort_order ASC"
            ).bind(periodId).all();

            const { results: values } = await env.DB.prepare(
                "SELECT * FROM grade_values WHERE class_id = ? AND student_id = ?"
            ).bind(classId, studentId).all();

            const valuesMap = {};
            values.forEach(v => { valuesMap[v.component_id] = v; });

            // Build response
            let finalGrade = 0;
            const breakdown = components.map(comp => {
                const val = valuesMap[comp.id];
                const effectiveValue = val ? (val.manual_override !== null ? val.manual_override : val.auto_value) : null;
                if (effectiveValue !== null) {
                    finalGrade += effectiveValue * (comp.weight / 100);
                }
                return {
                    name: comp.name,
                    weight: comp.weight,
                    value: effectiveValue !== null ? Math.round(effectiveValue * 100) / 100 : null
                };
            });

            finalGrade = Math.round(finalGrade * 100) / 100;
            const isRemedial = values.some(v => v.is_remedial === 1);
            if (isRemedial) finalGrade = Math.max(finalGrade, period.kkm || 75);

            const response = {
                final_grade: finalGrade,
                kkm: period.kkm || 75,
                is_below_kkm: finalGrade < (period.kkm || 75) && !isRemedial,
                is_remedial: isRemedial
            };

            // Only include breakdown if teacher enabled it
            if (period.show_grade_breakdown === 1) {
                response.breakdown = breakdown;
            }

            return jsonResponse(response);
        }

        return null;
    } catch (err) {
        return jsonResponse({ error: "Grade Integration Error: " + err.message }, 500);
    }
}
