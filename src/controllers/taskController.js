// controllers/taskController.js
// Mengelola Tugas & Remedial (Guru & Siswa)
// Fitur: CRUD, Draft/Publish, Smart Grading, Student Access, Auto-Grade PG, Gallery Control, Publish Grades
// Update V12: Fix Student Review Mode (Read student_id from URL Query Param)

import { jsonResponse } from '../utils.js';

export async function handleTaskRequest(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    try {
        // ==========================================================
        // BAGIAN 1: GURU (TEACHER SIDE)
        // ==========================================================

        // 1. GET TASKS LIST (Guru)
        if (pathname === "/api/tasks" && method === "GET") {
            const classId = url.searchParams.get("class_id");
            if (!classId) return jsonResponse({ error: "Class ID diperlukan" }, 400);

            const { results } = await env.DB.prepare(`
            SELECT t.*, 
            (SELECT COUNT(*) FROM task_questions WHERE task_id = t.id) as question_count,
            (SELECT COUNT(*) FROM task_submissions WHERE task_id = t.id AND is_graded != -1) as submission_count
            FROM tasks t 
            WHERE t.class_id = ? 
            ORDER BY t.created_at DESC
        `).bind(classId).all();

            const parsedResults = results.map(task => ({
                ...task,
                allowed_students: task.allowed_students ? JSON.parse(task.allowed_students) : [],
                // [UPDATE V10] Kirim status saklar diskusi ke frontend guru
                show_discussion: task.show_discussion === 1
            }));

            return jsonResponse(parsedResults);
        }

        // 2. GET TASK DETAILS (Editor Guru)
        if (pathname === "/api/tasks/detail" && method === "GET") {
            const taskId = url.searchParams.get("id");
            if (!taskId) return jsonResponse({ error: "Task ID diperlukan" }, 400);

            // [UPDATE V10] Ambil kolom discussion global
            const task = await env.DB.prepare("SELECT *, discussion_text, discussion_url, show_discussion FROM tasks WHERE id = ?").bind(taskId).first();
            if (!task) return jsonResponse({ error: "Tugas tidak ditemukan" }, 404);

            const { results: questions } = await env.DB.prepare("SELECT * FROM task_questions WHERE task_id = ? ORDER BY id ASC").bind(taskId).all();

            const parsedQuestions = questions.map(q => ({
                id: q.id, // Penting untuk Smart Update
                type: q.type,
                questionText: q.question_text,
                questionImageUrl: q.question_image_url,
                options: q.options ? JSON.parse(q.options) : [],
                correctKey: q.correct_key,
                charLimit: q.char_limit,
                weight: q.weight || 0,
                // [UPDATE V10] Helper field: Jika essay, correct_key berisi pembahasan guru
                explanation: (q.type !== 'pg') ? q.correct_key : null
            }));

            return jsonResponse({
                ...task,
                allowedStudents: task.allowed_students ? JSON.parse(task.allowed_students) : [],
                questions: parsedQuestions
            });
        }

        // 3. CREATE TASK (Guru)
        if (pathname === "/api/tasks" && method === "POST") {
            const body = await request.json();
            const {
                periodId, classId, title, description, deadline,
                targetType, allowedStudents, questions, pgWeight, allowGallery
            } = body;

            if (!title || !classId || !questions) return jsonResponse({ error: "Data tugas tidak lengkap" }, 400);

            const studentJson = (targetType === 'specific' && Array.isArray(allowedStudents)) ? JSON.stringify(allowedStudents) : null;

            const taskResult = await env.DB.prepare(`
            INSERT INTO tasks (period_id, class_id, title, description, deadline, target_type, allowed_students, is_active, pg_weight, allow_gallery)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        `).bind(
                periodId, classId, title, description || '', deadline || null,
                targetType || 'all', studentJson, pgWeight || 0, allowGallery ? 1 : 0
            ).run();

            const newTaskId = taskResult.meta.last_row_id;
            const stmts = [];

            for (const q of questions) {
                let charLimit = q.type === 'essay_text' ? (q.charLimit || 500) : 500;
                const optionsJson = (q.type === 'pg' && Array.isArray(q.options)) ? JSON.stringify(q.options) : null;

                // [UPDATE V10] Simpan explanation (pembahasan) ke kolom correct_key jika tipe Essay
                let storedKey = q.correctKey;
                if (q.type !== 'pg' && q.explanation) {
                    storedKey = q.explanation.substring(0, 1000); // Limit 1000 char
                }

                stmts.push(env.DB.prepare(`
                INSERT INTO task_questions (task_id, type, question_text, question_image_url, options, correct_key, char_limit, weight)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(newTaskId, q.type, q.questionText || '', q.questionImageUrl || null, optionsJson, storedKey || null, charLimit, q.weight || 0));
            }

            if (stmts.length > 0) await env.DB.batch(stmts);
            return jsonResponse({ message: "Draft tugas berhasil dibuat." });
        }

        // 4. UPDATE TASK (Guru) - SMART UPDATE & RECALCULATE
        if (pathname === "/api/tasks" && method === "PUT") {
            const body = await request.json();
            const {
                id, title, description, deadline,
                targetType, allowedStudents, questions, pgWeight, allowGallery
            } = body;

            if (!id || !title || !questions) return jsonResponse({ error: "Data update tidak lengkap" }, 400);

            const studentJson = (targetType === 'specific' && Array.isArray(allowedStudents)) ? JSON.stringify(allowedStudents) : null;

            // 1. Update Header Tugas
            await env.DB.prepare(`
            UPDATE tasks 
            SET title = ?, description = ?, deadline = ?, target_type = ?, allowed_students = ?, pg_weight = ?, allow_gallery = ?
            WHERE id = ?
        `).bind(
                title, description || '', deadline || null,
                targetType || 'all', studentJson, pgWeight || 0, allowGallery ? 1 : 0,
                id
            ).run();

            // 2. SMART UPDATE QUESTIONS (Preserve IDs for Grading)
            // Ambil soal lama dari DB untuk perbandingan
            const { results: oldQuestions } = await env.DB.prepare("SELECT * FROM task_questions WHERE task_id = ?").bind(id).all();
            const oldQsMap = new Map(oldQuestions.map(q => [q.id, q]));
            const newQsIds = new Set();

            const stmts = [];

            for (const q of questions) {
                let charLimit = q.type === 'essay_text' ? (q.charLimit || 500) : 500;
                const optionsJson = (q.type === 'pg' && Array.isArray(q.options)) ? JSON.stringify(q.options) : null;

                // [UPDATE V10] Simpan explanation essay ke correct_key
                let storedKey = q.correctKey;
                if (q.type !== 'pg' && q.explanation) {
                    storedKey = q.explanation.substring(0, 1000);
                }

                // Jika soal punya ID dan ID tersebut ada di DB lama -> UPDATE
                if (q.id && oldQsMap.has(q.id)) {
                    newQsIds.add(q.id);
                    stmts.push(env.DB.prepare(`
                    UPDATE task_questions 
                    SET type=?, question_text=?, question_image_url=?, options=?, correct_key=?, char_limit=?, weight=?
                    WHERE id=?
                `).bind(
                        q.type, q.questionText || '', q.questionImageUrl || null, optionsJson, storedKey || null, charLimit, q.weight || 0,
                        q.id
                    ));
                } else {
                    // Jika tidak punya ID atau ID baru -> INSERT
                    stmts.push(env.DB.prepare(`
                    INSERT INTO task_questions (task_id, type, question_text, question_image_url, options, correct_key, char_limit, weight)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(id, q.type, q.questionText || '', q.questionImageUrl || null, optionsJson, storedKey || null, charLimit, q.weight || 0));
                }
            }

            // Hapus soal yang tidak ada di list baru
            for (const [oldId, _] of oldQsMap) {
                if (!newQsIds.has(oldId)) {
                    stmts.push(env.DB.prepare("DELETE FROM task_questions WHERE id = ?").bind(oldId));
                    stmts.push(env.DB.prepare("DELETE FROM task_answers WHERE question_id = ?").bind(oldId));
                }
            }

            if (stmts.length > 0) await env.DB.batch(stmts);

            // 3. AUTO-RECALCULATE GRADES (Penilaian Surut)
            // Hanya hitung ulang submission yang BUKAN draft (is_graded != -1)
            const { results: submissions } = await env.DB.prepare("SELECT id, student_id FROM task_submissions WHERE task_id = ? AND is_graded != -1").bind(id).all();

            if (submissions.length > 0) {
                const { results: currentQuestions } = await env.DB.prepare("SELECT * FROM task_questions WHERE task_id = ?").bind(id).all();

                const recalcStmts = [];
                const pgTotalQs = currentQuestions.filter(q => q.type === 'pg').length;

                for (const sub of submissions) {
                    const { results: answers } = await env.DB.prepare("SELECT * FROM task_answers WHERE submission_id = ?").bind(sub.id).all();

                    let newTotalScore = 0;
                    let pgCorrectCount = 0;

                    for (const q of currentQuestions) {
                        const ans = answers.find(a => a.question_id === q.id);

                        if (q.type === 'pg') {
                            if (ans && ans.answer_text === q.correct_key) {
                                pgCorrectCount++;
                            }
                        } else {
                            if (ans) {
                                const oldQ = oldQsMap.get(q.id);
                                let currentScore = ans.score || 0;

                                if (oldQ && oldQ.weight > 0) {
                                    const quality = currentScore / oldQ.weight;
                                    const newScore = quality * q.weight;
                                    currentScore = newScore;
                                    recalcStmts.push(env.DB.prepare("UPDATE task_answers SET score = ? WHERE id = ?").bind(newScore, ans.id));
                                }

                                newTotalScore += currentScore;
                            }
                        }
                    }

                    if (pgTotalQs > 0) {
                        const pgScore = (pgCorrectCount / pgTotalQs) * (pgWeight || 0);
                        newTotalScore += pgScore;
                    }

                    recalcStmts.push(env.DB.prepare("UPDATE task_submissions SET grade = ? WHERE id = ?").bind(newTotalScore, sub.id));
                }

                if (recalcStmts.length > 0) await env.DB.batch(recalcStmts);
            }

            return jsonResponse({ message: `Tugas diperbarui. Nilai ${submissions.length} siswa telah dihitung ulang.` });
        }

        // [NEW ENDPOINT V10] 5. SAVE DISCUSSION & KEY CONFIG (Guru - Master Key)
        if (pathname === "/api/tasks/discussion" && method === "POST") {
            const body = await request.json();
            const { taskId, discussionText, discussionUrl, showDiscussion } = body;

            if (!taskId) return jsonResponse({ error: "Task ID diperlukan" }, 400);

            // Update kolom pembahasan global & saklar
            await env.DB.prepare(`
            UPDATE tasks 
            SET discussion_text = ?, discussion_url = ?, show_discussion = ?
            WHERE id = ?
        `).bind(discussionText || '', discussionUrl || '', showDiscussion ? 1 : 0, taskId).run();

            return jsonResponse({ message: showDiscussion ? "Kunci & Pembahasan DIBUKA ke siswa." : "Kunci & Pembahasan DITUTUP." });
        }

        // 6. TOGGLE STATUS (Publish/Draft)
        if (pathname === "/api/tasks/toggle" && method === "POST") {
            const body = await request.json();
            const { id, isActive } = body;
            await env.DB.prepare("UPDATE tasks SET is_active = ? WHERE id = ?").bind(isActive ? 1 : 0, id).run();
            return jsonResponse({ message: isActive ? "Tugas Diterbitkan!" : "Tugas Ditarik Kembali (Draft)" });
        }

        // 7. DELETE TASK
        if (pathname === "/api/tasks" && method === "DELETE") {
            const id = url.searchParams.get("id");
            if (!id) return jsonResponse({ error: "Task ID diperlukan" }, 400);

            const { results: subs } = await env.DB.prepare("SELECT id FROM task_submissions WHERE task_id = ?").bind(id).all();
            const subIds = subs.map(s => s.id);

            if (subIds.length > 0) {
                for (const subId of subIds) await env.DB.prepare("DELETE FROM task_answers WHERE submission_id = ?").bind(subId).run();
                await env.DB.prepare("DELETE FROM task_submissions WHERE task_id = ?").bind(id).run();
            }
            await env.DB.prepare("DELETE FROM task_questions WHERE task_id = ?").bind(id).run();
            await env.DB.prepare("DELETE FROM tasks WHERE id = ?").bind(id).run();

            return jsonResponse({ message: "Tugas dihapus" });
        }

        // 8. GET SUBMISSIONS LIST (Grading)
        if (pathname === "/api/tasks/submissions" && method === "GET") {
            const taskId = url.searchParams.get("task_id");
            if (!taskId) return jsonResponse({ error: "Task ID diperlukan" }, 400);

            const { total: essayCount } = await env.DB.prepare("SELECT COUNT(*) as total FROM task_questions WHERE task_id = ? AND type != 'pg'").bind(taskId).first();
            const hasEssay = essayCount > 0;

            // [UPDATE] Filter hanya yang bukan draft (is_graded != -1) agar draft siswa tidak masuk grading guru
            const { results } = await env.DB.prepare(`
            SELECT ts.id, ts.student_id, ts.grade, ts.submitted_at, ts.is_published, ts.feedback, ts.is_graded, s.name as student_name
            FROM task_submissions ts
            JOIN students s ON ts.student_id = s.id
            WHERE ts.task_id = ? AND ts.is_graded != -1 
            ORDER BY ts.submitted_at DESC
        `).bind(taskId).all();

            const parsedResults = results.map(sub => ({
                ...sub,
                needs_review: hasEssay && sub.is_graded === 0
            }));

            return jsonResponse(parsedResults);
        }

        // 9. GET SUBMISSION DETAIL (Grading)
        if (pathname === "/api/tasks/submission-detail" && method === "GET") {
            const submissionId = url.searchParams.get("submission_id");
            if (!submissionId) return jsonResponse({ error: "Submission ID diperlukan" }, 400);

            const submission = await env.DB.prepare(`
            SELECT ts.*, s.name as student_name FROM task_submissions ts
            JOIN students s ON ts.student_id = s.id WHERE ts.id = ?
        `).bind(submissionId).first();

            if (!submission) return jsonResponse({ error: "Data tidak ditemukan" }, 404);

            // [FIX] Ambil SEMUA soal dari task ini, bukan hanya yang dijawab
            const { results: allQuestions } = await env.DB.prepare(`
                SELECT id, type, question_text, question_image_url, correct_key, options, weight
                FROM task_questions 
                WHERE task_id = ? 
                ORDER BY id ASC
            `).bind(submission.task_id).all();

            // Ambil jawaban siswa untuk submission ini
            const { results: studentAnswers } = await env.DB.prepare(`
                SELECT id as answer_id, question_id, answer_text, answer_image_url, score, is_graded
                FROM task_answers 
                WHERE submission_id = ?
            `).bind(submissionId).all();

            // Buat map jawaban berdasarkan question_id
            const answersMap = {};
            studentAnswers.forEach(a => {
                answersMap[a.question_id] = a;
            });

            // Gabungkan: semua soal + jawaban (atau null jika tidak dijawab)
            const parsedAnswers = allQuestions.map(q => {
                const ans = answersMap[q.id] || null;
                return {
                    question_id: q.id,
                    type: q.type,
                    question_text: q.question_text,
                    question_image_url: q.question_image_url,
                    correct_key: q.correct_key,
                    options: q.options ? JSON.parse(q.options) : [],
                    weight: q.weight,
                    // Jawaban siswa (bisa null jika tidak dijawab)
                    answer_id: ans?.answer_id || null,
                    answer_text: ans?.answer_text || '',
                    answer_image_url: ans?.answer_image_url || null,
                    score: ans?.score || 0,
                    is_answered: !!ans,
                    is_graded: ans?.is_graded || 0  // [NEW] Flag untuk tracking essay yang sudah dinilai
                };
            });

            return jsonResponse({ submission, answers: parsedAnswers });
        }

        // 10. GRADE SUBMISSION
        if (pathname === "/api/tasks/grade" && method === "POST") {
            const body = await request.json();
            const { submissionId, grade, feedback, essayScores } = body;

            await env.DB.prepare(`UPDATE task_submissions SET grade = ?, feedback = ?, is_graded = 1 WHERE id = ?`).bind(grade, feedback || '', submissionId).run();

            if (essayScores && Object.keys(essayScores).length > 0) {
                const stmts = [];
                for (const [answerId, score] of Object.entries(essayScores)) {
                    // [NEW] Set is_graded=1 when teacher saves essay score
                    stmts.push(env.DB.prepare("UPDATE task_answers SET score = ?, is_graded = 1 WHERE id = ?").bind(score, answerId));
                }
                if (stmts.length > 0) await env.DB.batch(stmts);
            }

            return jsonResponse({ message: "Nilai berhasil disimpan" });
        }

        // ==========================================================
        // BAGIAN 2: SISWA (STUDENT SIDE) - UPDATED
        // ==========================================================

        // 11. GET STUDENT TASKS
        if (pathname === "/api/student/tasks" && method === "GET") {
            const classId = url.searchParams.get("class_id");
            const studentId = url.searchParams.get("student_id");

            if (!classId || !studentId) return jsonResponse({ error: "Parameter tidak lengkap" }, 400);

            const { results: tasks } = await env.DB.prepare(`
            SELECT id, title, description, deadline, target_type, allowed_students,
            (SELECT COUNT(*) FROM task_questions WHERE task_id = tasks.id) as question_count
            FROM tasks 
            WHERE class_id = ? AND is_active = 1
            ORDER BY created_at DESC
        `).bind(classId).all();

            const filteredTasks = [];

            for (const t of tasks) {
                if (t.target_type === 'specific') {
                    const allowed = t.allowed_students ? JSON.parse(t.allowed_students) : [];
                    if (!allowed.includes(parseInt(studentId))) continue;
                }

                const sub = await env.DB.prepare("SELECT id, grade, is_published, is_graded FROM task_submissions WHERE task_id = ? AND student_id = ?").bind(t.id, studentId).first();

                // [LOGIC STATUS]
                // -1: DRAFT (Belum Submit Final) -> Tampilkan 'BELUM_DIKERJAKAN' di list agar bisa lanjut
                // 0: Menunggu Nilai (Sudah submit, belum dinilai guru)
                // 1: Dinilai (Sudah dinilai guru)
                // is_published: 0 = Belum tampil ke siswa, 1 = Sudah tampil

                let status = 'BELUM_DIKERJAKAN';
                if (sub) {
                    if (sub.is_graded === -1) status = 'BELUM_DIKERJAKAN'; // Draft
                    else if (sub.is_graded === 1 && sub.is_published == 1) status = 'DINILAI'; // Graded AND Published
                    else if (sub.is_graded === 1 && sub.is_published != 1) status = 'SEDANG_DIPERIKSA'; // Graded but NOT Published
                    else status = 'MENUNGGU_NILAI'; // Submitted, waiting for grade
                }

                filteredTasks.push({
                    id: t.id,
                    title: t.title,
                    description: t.description,
                    deadline: t.deadline,
                    question_count: t.question_count,
                    status: status,
                    // My Grade hanya jika is_published=1 DAN bukan draft
                    my_grade: (sub && sub.is_published == 1 && sub.is_graded != -1) ? sub.grade : null
                });
            }

            return jsonResponse(filteredTasks);
        }

        // 12. GET STUDENT TASK DETAIL (SECURED & WEIGHTED) [HEAVY UPDATE V12]
        if (pathname === "/api/student/task-detail" && method === "GET") {
            const taskId = url.searchParams.get("task_id");
            // [FIXED] Ambil student_id dari URL Parameter (dari frontend) atau Header (legacy)
            const studentId = url.searchParams.get("student_id") || request.headers.get("X-Student-Id");

            if (!taskId) return jsonResponse({ error: "Task ID diperlukan" }, 400);

            // [UPDATE V10] Ambil discussion/key info
            const task = await env.DB.prepare("SELECT * FROM tasks WHERE id = ?").bind(taskId).first();
            if (!task) return jsonResponse({ error: "Tugas tidak ditemukan" }, 404);

            // [UPDATE V10] Ambil weight (bobot) untuk transparansi
            const { results: questions } = await env.DB.prepare(`
            SELECT id, type, question_text, question_image_url, options, char_limit, weight, correct_key 
            FROM task_questions WHERE task_id = ? ORDER BY id ASC
        `).bind(taskId).all();

            const showKey = task.show_discussion === 1;

            const safeQuestions = questions.map(q => {
                // Base Data (Selalu dikirim)
                const data = {
                    id: q.id,
                    type: q.type,
                    questionText: q.question_text,
                    questionImageUrl: q.question_image_url,
                    options: q.options ? JSON.parse(q.options) : [],
                    charLimit: q.char_limit,
                    weight: q.weight // [TRANSPARANSI] Kirim bobot agar frontend bisa hitung poin
                };

                // SECURITY GATE: Hanya kirim kunci/pembahasan jika showKey ON
                if (showKey) {
                    if (q.type === 'pg') {
                        data.correctKey = q.correct_key; // Kunci PG (A/B/C)
                    } else {
                        data.explanation = q.correct_key; // Pembahasan Essay (disimpan di kolom correct_key)
                    }
                }
                return data;
            });

            // Filter Global Discussion Data
            const cleanTask = {
                id: task.id,
                title: task.title,
                deadline: task.deadline,
                description: task.description,
                allow_gallery: task.allow_gallery,
                pg_weight: task.pg_weight,
                show_discussion: showKey // Beritahu frontend status kunci
            };

            if (showKey) {
                cleanTask.discussion_text = task.discussion_text;
                cleanTask.discussion_url = task.discussion_url;
            }

            // [UPDATE V11] FETCH JAWABAN SISWA (Jika Ada)
            // Ini perbaikan krusial agar Foto Jawaban & Nilai muncul saat Review Mode
            let existingAnswers = {};
            let myGrade = null;
            let feedback = null;

            if (studentId) {
                const sub = await env.DB.prepare("SELECT id, grade, feedback, is_published, is_graded FROM task_submissions WHERE task_id = ? AND student_id = ?").bind(taskId, studentId).first();

                if (sub) {
                    // [SECURITY] Only show grade & feedback if published
                    if (sub.is_published == 1 && sub.is_graded != -1) {
                        myGrade = sub.grade;
                        feedback = sub.feedback;
                    }

                    // Muat Jawaban Detail (Teks, Gambar, DAN Score) - Always show student's own answers
                    const { results: ansRows } = await env.DB.prepare("SELECT question_id, answer_text, answer_image_url, score FROM task_answers WHERE submission_id = ?").bind(sub.id).all();

                    ansRows.forEach(a => {
                        existingAnswers[a.question_id] = {
                            answerText: a.answer_text,
                            answerImage: a.answer_image_url,
                            earnedScore: a.score  // [TRANSPARANSI] Kirim poin yang didapat per soal
                        };
                    });
                }
            }

            return jsonResponse({
                task: cleanTask,
                questions: safeQuestions,
                existing_answers: existingAnswers, // [FIXED] Kirim jawaban siswa
                my_grade: myGrade,                 // [FIXED] Kirim status nilai
                feedback: feedback                 // [FIXED] Kirim feedback guru
            });
        }

        // 13. STUDENT SUBMIT (Draft or Final)
        if (pathname === "/api/student/submit" && method === "POST") {
            const body = await request.json();
            const { taskId, studentId, answers, isDraft } = body;

            if (!taskId || !studentId || !answers) return jsonResponse({ error: "Data tidak lengkap" }, 400);

            // [SECURITY] Cek Deadline (Hanya jika FINAL submit)
            const taskData = await env.DB.prepare("SELECT deadline, pg_weight FROM tasks WHERE id = ?").bind(taskId).first();

            if (taskData.deadline) {
                const deadlineTime = new Date(taskData.deadline).getTime();
                const now = Date.now();
                // Beri toleransi 1 menit untuk latensi jaringan
                if (now > deadlineTime + 60000) {
                    return jsonResponse({ error: "Maaf, batas waktu pengumpulan sudah habis." }, 400);
                }
            }

            // Cek Submission Lama
            const existing = await env.DB.prepare("SELECT id FROM task_submissions WHERE task_id = ? AND student_id = ?").bind(taskId, studentId).first();

            // Hapus submission lama jika ada (untuk overwrite draft atau final revisi sebelum deadline??)
            // [UPDATE] Jika existing adalah DRAFT (is_graded == -1), kita BOLEH overwrite.
            // Jika existing adalah FINAL (is_graded != -1), kita TOLAK.

            if (existing) {
                const checkStatus = await env.DB.prepare("SELECT is_graded FROM task_submissions WHERE id = ?").bind(existing.id).first();
                if (checkStatus.is_graded !== -1) {
                    return jsonResponse({ error: "Anda sudah mengumpulkan tugas ini secara final." }, 403);
                }
                // Hapus yang lama (Draft) agar bersih
                await env.DB.prepare("DELETE FROM task_answers WHERE submission_id = ?").bind(existing.id).run();
                await env.DB.prepare("DELETE FROM task_submissions WHERE id = ?").bind(existing.id).run();
            }

            // Hitung PG
            const { results: dbQuestions } = await env.DB.prepare("SELECT id, type, correct_key, weight FROM task_questions WHERE task_id = ?").bind(taskId).all();
            const qMap = {};
            let pgTotalCount = 0;
            dbQuestions.forEach(q => {
                qMap[q.id] = q;
                if (q.type === 'pg') pgTotalCount++;
            });

            // [FIX] Hitung poin per soal PG berdasarkan bobot
            const pgWeight = taskData.pg_weight || 0;
            const scorePerPg = pgTotalCount > 0 ? pgWeight / pgTotalCount : 0;

            let pgCorrectCount = 0;
            const processedAnswers = [];

            for (const ans of answers) {
                const qDb = qMap[ans.questionId];
                let answerScore = 0;
                const isPG = qDb && qDb.type === 'pg';

                if (isPG) {
                    if (ans.answerText === qDb.correct_key) {
                        answerScore = scorePerPg; // [FIX] Simpan poin sebenarnya, bukan 1
                        pgCorrectCount++;
                    }
                }

                processedAnswers.push({
                    qId: ans.questionId,
                    text: ans.answerText || '',
                    img: ans.answerImage || null,
                    score: answerScore,
                    isGraded: isPG ? 1 : 0  // [NEW] PG auto-graded, Essay starts ungraded
                });
            }

            let initialGrade = 0;
            if (pgTotalCount > 0) {
                initialGrade = (pgCorrectCount / pgTotalCount) * (taskData.pg_weight || 0);
            }
            initialGrade = Math.round(initialGrade * 100) / 100;

            // [LOGIC DRAFT]
            // Jika Draft, set is_graded = -1. Jika Final, set is_graded = 0 (Menunggu Nilai)
            const statusGraded = isDraft ? -1 : 0;

            const subResult = await env.DB.prepare("INSERT INTO task_submissions (task_id, student_id, grade, is_graded) VALUES (?, ?, ?, ?)").bind(taskId, studentId, initialGrade, statusGraded).run();
            const submissionId = subResult.meta.last_row_id;

            const stmts = [];
            for (const p of processedAnswers) {
                stmts.push(
                    env.DB.prepare(`
                    INSERT INTO task_answers (submission_id, question_id, answer_text, answer_image_url, score, is_graded)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).bind(submissionId, p.qId, p.text, p.img, p.score, p.isGraded)
                );
            }

            if (stmts.length > 0) await env.DB.batch(stmts);

            return jsonResponse({ message: isDraft ? "Draft tersimpan." : "Jawaban berhasil dikirim." });
        }

        // 14. UPLOAD GAMBAR (Untuk Soal Essay Image)
        if (pathname === "/api/student/upload" && method === "POST") {
            if (!env.R2) return jsonResponse({ error: "Storage belum dikonfigurasi" }, 500);

            try {
                const formData = await request.formData();
                const file = formData.get('file');

                if (!file) return jsonResponse({ error: "File tidak ditemukan" }, 400);

                const filename = `student-upload-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
                const fileBuffer = await file.arrayBuffer();

                await env.R2.put(filename, fileBuffer, {
                    httpMetadata: { contentType: 'image/jpeg' }
                });

                let r2Domain = "https://cdn.alkemia.my.id";
                if (r2Domain.endsWith('/')) r2Domain = r2Domain.slice(0, -1);

                const publicUrl = `${r2Domain}/${filename}`;

                return jsonResponse({ url: publicUrl, filename: filename });
            } catch (e) {
                return jsonResponse({ error: "Gagal upload: " + e.message }, 500);
            }
        }

        // 15. PUBLISH/UNPUBLISH GRADES
        if (pathname === "/api/tasks/publish" && method === "POST") {
            const body = await request.json();
            const { taskId, submissionId, isPublished } = body;
            const newVal = isPublished ? 1 : 0;

            if (taskId) {
                await env.DB.prepare("UPDATE task_submissions SET is_published = ? WHERE task_id = ?").bind(newVal, taskId).run();
                return jsonResponse({ message: isPublished ? "Semua nilai diterbitkan!" : "Semua nilai ditarik kembali." });
            }
            else if (submissionId) {
                await env.DB.prepare("UPDATE task_submissions SET is_published = ? WHERE id = ?").bind(newVal, submissionId).run();
                return jsonResponse({ message: isPublished ? "Nilai siswa diterbitkan." : "Nilai siswa disembunyikan." });
            }

            return jsonResponse({ error: "Parameter publish salah" }, 400);
        }

        return null;
    } catch (err) {
        return jsonResponse({ error: "Task Controller Error: " + err.message }, 500);
    }
}