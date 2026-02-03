// controllers/quizController.js
// Mengelola Logika Database untuk Quiz & CBT System
// FIXED: Sinkronisasi dengan Frontend, Token Session, Isu Nilai Hilang
// UPDATE: Fitur "Ujian Berbasis Kehadiran", "Reset Ujian", dan "Copy Quiz"

import { jsonResponse } from '../utils.js';

export async function handleQuizRequest(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    try {
        // ========================================
        // A. API QUIZ (GURU - MANAJEMEN)
        // ========================================

        // 1. LIST QUIZZES (Daftar Quiz per Kelas)
        if (pathname === "/api/quizzes" && method === "GET") {
            const classId = url.searchParams.get("class_id");
            if (!classId) return jsonResponse({ error: "class_id needed" }, 400);

            const { results } = await env.DB.prepare(`
            SELECT q.*, 
                   (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) as question_count,
                   (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id) as attempt_count
            FROM quizzes q 
            WHERE q.class_id = ? 
            ORDER BY q.created_at DESC
        `).bind(classId).all();
            return jsonResponse(results);
        }

        // 2. CREATE QUIZ (Buat Quiz Baru)
        if (pathname === "/api/quizzes" && method === "POST") {
            const body = await request.json();
            const { periodId, classId, title, description, showResults, checkAttendance, allowedStudents } = body;

            await env.DB.prepare(`
            INSERT INTO quizzes (period_id, class_id, title, description, duration, tolerance_minutes, show_limit, is_random, show_results, is_active, check_attendance, allowed_students)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
                periodId,
                classId,
                title,
                description || '',
                60, // Duration Default (60 menit)
                0,  // Tolerance Default (0 menit)
                0,  // Show Limit Default (0 = Semua)
                0,  // Random Default (0 = Tidak Acak)
                showResults || 0,
                0,   // Active Default (Mati)
                checkAttendance ? 1 : 0,
                JSON.stringify(allowedStudents || [])
            ).run();

            return jsonResponse({ message: "Quiz berhasil dibuat" });
        }

        // 3. UPDATE QUIZ (Edit Pengaturan)
        if (pathname === "/api/quizzes" && method === "PUT") {
            const body = await request.json();
            const { id, title, description, duration, toleranceMinutes, showLimit, isRandom, showResults, checkAttendance, allowedStudents } = body;

            await env.DB.prepare(`
            UPDATE quizzes 
            SET title = ?, description = ?, duration = ?, tolerance_minutes = ?, show_limit = ?, is_random = ?, show_results = ?, check_attendance = ?, allowed_students = ?
            WHERE id = ?
        `).bind(
                title,
                description,
                duration,
                toleranceMinutes || 0,
                showLimit || 0,
                isRandom ? 1 : 0,
                showResults ? 1 : 0,
                checkAttendance ? 1 : 0,
                JSON.stringify(allowedStudents || []),
                id
            ).run();

            return jsonResponse({ message: "Pengaturan quiz diperbarui" });
        }

        // 4. TOGGLE ACTIVE STATUS (Start/Stop Ujian)
        if (pathname === "/api/quizzes/toggle" && method === "POST") {
            const { id, isActive, scheduledAt } = await request.json();

            if (isActive) {
                // Start Ujian & Set Waktu Mulai
                await env.DB.prepare(`UPDATE quizzes SET is_active = 1, scheduled_at = ? WHERE id = ?`).bind(scheduledAt || null, id).run();
            } else {
                // Stop Ujian
                await env.DB.prepare(`UPDATE quizzes SET is_active = 0 WHERE id = ?`).bind(id).run();
            }
            return jsonResponse({ message: "Status quiz diubah" });
        }

        // 5. DELETE QUIZ (Hapus Permanen)
        if (pathname === "/api/quizzes" && method === "DELETE") {
            const id = url.searchParams.get("id");
            // Hapus Cascade: Jawaban Siswa -> Soal -> Header Quiz
            await env.DB.prepare("DELETE FROM quiz_attempts WHERE quiz_id = ?").bind(id).run();
            await env.DB.prepare("DELETE FROM quiz_questions WHERE quiz_id = ?").bind(id).run();
            await env.DB.prepare("DELETE FROM quizzes WHERE id = ?").bind(id).run();
            return jsonResponse({ message: "Quiz dihapus" });
        }

        // 6. GET QUESTIONS (Untuk Editor Guru)
        if (pathname === "/api/quizzes/questions" && method === "GET") {
            const quizId = url.searchParams.get("quiz_id");
            const { results } = await env.DB.prepare(`SELECT * FROM quiz_questions WHERE quiz_id = ?`).bind(quizId).all();
            return jsonResponse(results);
        }

        // 7. SAVE QUESTIONS (Simpan Soal Bulk)
        if (pathname === "/api/quizzes/questions" && method === "POST") {
            const { quizId, questions } = await request.json();

            // Strategi: Hapus semua soal lama, insert ulang yang baru (Simplest logic for integrity)
            await env.DB.prepare("DELETE FROM quiz_questions WHERE quiz_id = ?").bind(quizId).run();

            if (questions.length > 0) {
                const stmt = env.DB.prepare(`
                INSERT INTO quiz_questions (quiz_id, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
                // Batch insert agar performa tinggi
                const batch = questions.map(q => stmt.bind(
                    quizId, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.option_e, q.correct_answer
                ));
                await env.DB.batch(batch);
            }
            return jsonResponse({ message: "Soal berhasil disimpan" });
        }

        // 8. GET RESULTS (Lihat Hasil Nilai Siswa)
        if (pathname === "/api/quizzes/results" && method === "GET") {
            const quizId = url.searchParams.get("quiz_id");
            const quiz = await env.DB.prepare("SELECT class_id FROM quizzes WHERE id = ?").bind(quizId).first();
            if (!quiz) return jsonResponse([]);

            // Join Students + Quiz Attempts
            const { results } = await env.DB.prepare(`
            SELECT 
                s.name as student_name, 
                s.id as student_id,
                qa.score, 
                qa.finish_time,
                qa.start_time
            FROM students s
            LEFT JOIN quiz_attempts qa ON s.id = qa.student_id AND qa.quiz_id = ?
            WHERE s.class_id = ?
            ORDER BY 
                CASE WHEN qa.score IS NOT NULL THEN 0 ELSE 1 END, -- Yang sudah nilai taruh atas
                qa.score DESC, 
                s.name ASC
        `).bind(quizId, quiz.class_id).all();

            return jsonResponse(results);
        }

        // 9. [NEW] RESET ATTEMPT (Hapus Riwayat Ujian)
        // Bisa reset per siswa (jika ada student_id) atau global sekelas (jika cuma quiz_id)
        if (pathname === "/api/quizzes/reset-attempt" && method === "DELETE") {
            const quizId = url.searchParams.get("quiz_id");
            const studentId = url.searchParams.get("student_id");

            if (!quizId) return jsonResponse({ error: "Quiz ID diperlukan" }, 400);

            if (studentId) {
                // Reset 1 Siswa
                await env.DB.prepare("DELETE FROM quiz_attempts WHERE quiz_id = ? AND student_id = ?")
                    .bind(quizId, studentId).run();
                return jsonResponse({ message: "Riwayat ujian siswa berhasil direset." });
            } else {
                // Reset GLOBAL (Satu Kelas)
                await env.DB.prepare("DELETE FROM quiz_attempts WHERE quiz_id = ?")
                    .bind(quizId).run();
                return jsonResponse({ message: "Seluruh data ujian di quiz ini berhasil direset." });
            }
        }

        // 10. [NEW] COPY QUIZ (Duplikasi Quiz Antar Kelas)
        if (pathname === "/api/quizzes/copy" && method === "POST") {
            const { sourceQuizId, targetClassId } = await request.json();

            // Ambil Data Quiz Sumber
            const source = await env.DB.prepare("SELECT * FROM quizzes WHERE id = ?").bind(sourceQuizId).first();
            if (!source) return jsonResponse({ error: "Quiz asal tidak ditemukan" }, 404);

            // Tentukan Judul Baru
            let newTitle = source.title;
            // Jika dicopy ke kelas yang sama, tambahkan "(Copy)"
            if (String(source.class_id) === String(targetClassId)) {
                newTitle += " (Copy)";
            }

            // Insert Header Quiz Baru (Set is_active = 0)
            const result = await env.DB.prepare(`
            INSERT INTO quizzes (
                period_id, class_id, title, description, duration, tolerance_minutes, 
                show_limit, is_random, show_results, is_active, check_attendance, allowed_students
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        `).bind(
                source.period_id,
                targetClassId,
                newTitle,
                source.description,
                source.duration,
                source.tolerance_minutes,
                source.show_limit,
                source.is_random,
                source.show_results,
                source.check_attendance,
                source.allowed_students
            ).run();

            const newQuizId = result.meta.last_row_id;

            // Copy Semua Soal
            const { results: questions } = await env.DB.prepare("SELECT * FROM quiz_questions WHERE quiz_id = ?").bind(sourceQuizId).all();

            if (questions.length > 0) {
                const stmt = env.DB.prepare(`
                INSERT INTO quiz_questions (quiz_id, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

                const batch = questions.map(q => stmt.bind(
                    newQuizId, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.option_e, q.correct_answer
                ));

                await env.DB.batch(batch);
            }

            return jsonResponse({ message: "Quiz berhasil disalin." });
        }

        // ========================================
        // B. API QUIZ (STUDENT - ENGINE CBT)
        // ========================================

        // 1. START QUIZ (Generate Soal & Timer)
        if (pathname === "/api/student/quiz/start" && method === "GET") {
            const quizId = url.searchParams.get('id'); // Ambil dari URL

            // Verifikasi Session via Header
            const token = request.headers.get('Authorization')?.split(' ')[1];
            if (!token) return jsonResponse({ error: "Unauthorized" }, 401);

            const session = await env.DB.prepare(`SELECT student_id FROM student_sessions WHERE device_token = ?`).bind(token).first();
            if (!session) return jsonResponse({ error: "Unauthorized Session" }, 401);

            const studentId = session.student_id;

            // Cek apakah sudah pernah mengerjakan?
            const existing = await env.DB.prepare(`SELECT * FROM quiz_attempts WHERE quiz_id = ? AND student_id = ?`).bind(quizId, studentId).first();

            // Jika sudah submit (finish_time ada), tolak akses
            if (existing && existing.finish_time) {
                return jsonResponse({ error: "Ujian sudah diselesaikan." }, 403);
            }

            // Ambil Data Quiz
            const quiz = await env.DB.prepare("SELECT * FROM quizzes WHERE id = ?").bind(quizId).first();
            if (!quiz) return jsonResponse({ error: "Quiz not found" }, 404);

            let questionsOrderJson;

            if (existing) {
                // RESUME: Jika reload halaman, pakai soal yang sudah diacak sebelumnya
                questionsOrderJson = existing.questions_order;
            } else {
                // BARU MULAI: Generate Acak Soal
                const { results: allQuestions } = await env.DB.prepare("SELECT id FROM quiz_questions WHERE quiz_id = ?").bind(quizId).all();
                let selectedIds = allQuestions.map(q => q.id);

                // LOGIKA ACAK (Fisher-Yates Shuffle)
                if (quiz.is_random === 1) {
                    for (let i = selectedIds.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [selectedIds[i], selectedIds[j]] = [selectedIds[j], selectedIds[i]];
                    }
                }

                // LOGIKA LIMIT SOAL
                if (quiz.show_limit > 0 && selectedIds.length > quiz.show_limit) {
                    selectedIds = selectedIds.slice(0, quiz.show_limit);
                }

                questionsOrderJson = JSON.stringify(selectedIds);

                await env.DB.prepare(`
                INSERT INTO quiz_attempts (quiz_id, student_id, start_time, score, questions_order)
                VALUES (?, ?, ?, 0, ?)
            `).bind(quizId, studentId, new Date().toISOString(), questionsOrderJson).run();
            }

            // Render Soal ke Frontend
            const questionIds = JSON.parse(questionsOrderJson);
            if (questionIds.length === 0) return jsonResponse({ questions: [] });

            const placeholders = questionIds.map(() => '?').join(',');
            const { results: rawQuestions } = await env.DB.prepare(`
            SELECT id, question_text, option_a, option_b, option_c, option_d, option_e 
            FROM quiz_questions 
            WHERE id IN (${placeholders})
        `).bind(...questionIds).all();

            const sortedQuestions = questionIds.map(id => rawQuestions.find(q => q.id === id)).filter(Boolean);

            return jsonResponse({
                success: true,
                questions: sortedQuestions
            });
        }

        // 2. GET QUESTIONS FOR STUDENT (Opsional, jika dipisah logicnya)
        if (pathname === "/api/student/quiz/questions" && method === "GET") {
            // ... (Logic redundant dengan Start, tapi kita biarkan jika ada module lain yang pakai)
            return jsonResponse([]);
        }

        // 3. SUBMIT QUIZ & CALCULATE SCORE
        if (pathname === "/api/student/quiz/submit" && method === "POST") {
            // Ambil Header Token
            const token = request.headers.get('Authorization')?.split(' ')[1];
            if (!token) return jsonResponse({ error: "Unauthorized" }, 401);

            const session = await env.DB.prepare(`SELECT student_id FROM student_sessions WHERE device_token = ?`).bind(token).first();
            if (!session) return jsonResponse({ error: "Session Invalid" }, 401);

            const studentId = session.student_id; // INI KUNCINYA
            const { quizId, answers } = await request.json();

            const attempt = await env.DB.prepare(`SELECT id, questions_order, start_time, finish_time FROM quiz_attempts WHERE quiz_id = ? AND student_id = ?`).bind(quizId, studentId).first();
            if (!attempt) return jsonResponse({ error: "Data ujian tidak ditemukan" }, 400);

            // Prevent Double Submit
            if (attempt.finish_time) return jsonResponse({ error: "Sudah dikumpulkan" }, 403);

            const quiz = await env.DB.prepare(`SELECT duration, tolerance_minutes FROM quizzes WHERE id = ?`).bind(quizId).first();

            // --- VALIDASI WAKTU (Anti-Curang Waktu) ---
            const startTime = new Date(attempt.start_time);
            const now = new Date();
            const durationMs = quiz.duration * 60 * 1000;
            const toleranceMs = (quiz.tolerance_minutes || 0) * 60 * 1000;
            const networkBufferMs = 2 * 60 * 1000;

            const maxTime = new Date(startTime.getTime() + durationMs + toleranceMs + networkBufferMs);
            let isLate = now > maxTime;

            const assignedIds = JSON.parse(attempt.questions_order || '[]');
            if (assignedIds.length === 0) {
                await env.DB.prepare(`UPDATE quiz_attempts SET finish_time=?, score=0 WHERE id=?`)
                    .bind(new Date().toISOString(), attempt.id).run();
                return jsonResponse({ success: true, score: 0 });
            }

            // Ambil Kunci Jawaban
            const placeholders = assignedIds.map(() => '?').join(',');
            const { results: questions } = await env.DB.prepare(`
            SELECT id, correct_answer FROM quiz_questions WHERE id IN (${placeholders})
        `).bind(...assignedIds).all();

            // Hitung Nilai
            let correctCount = 0;
            assignedIds.forEach(qId => {
                const qData = questions.find(q => q.id === qId);
                if (qData) {
                    // Cari jawaban user untuk soal ID ini
                    // FIX: Gunakan Number() untuk handle type mismatch string/integer
                    const userAnsObj = answers.find(a => Number(a.question_id) === Number(qId));
                    const userAns = userAnsObj ? userAnsObj.answer : null;

                    if (userAns && userAns === qData.correct_answer) correctCount++;
                }
            });

            let finalScore = (correctCount / assignedIds.length) * 100;
            finalScore = Math.round(finalScore * 100) / 100;

            if (isLate) finalScore = 0;

            // Simpan Hasil & Jawaban Siswa
            await env.DB.prepare(`
            UPDATE quiz_attempts 
            SET finish_time = ?, score = ?, student_answers = ?
            WHERE id = ?
        `).bind(
                new Date().toISOString(),
                finalScore,
                JSON.stringify(answers),
                attempt.id
            ).run();

            return jsonResponse({
                success: true,
                score: finalScore,
                correctCount: isLate ? 0 : correctCount,
                isLate: isLate
            });
        }

        // 4. REVIEW QUIZ (Pembahasan Soal)
        if (pathname === "/api/student/quiz/review" && method === "GET") {
            const quizId = url.searchParams.get("id"); // Sesuai Frontend 'id'
            const token = request.headers.get('Authorization')?.split(' ')[1];

            if (!token) return jsonResponse({ error: "Unauthorized" }, 401);
            const session = await env.DB.prepare(`SELECT student_id FROM student_sessions WHERE device_token = ?`).bind(token).first();
            if (!session) return jsonResponse({ error: "Unauthorized" }, 401);

            const studentId = session.student_id;

            // Cek Apakah Guru Mengizinkan Pembahasan?
            const quiz = await env.DB.prepare("SELECT show_results FROM quizzes WHERE id = ?").bind(quizId).first();

            // [FIX] Pakai '!=' (Loose Equality) agar "1" (string) dianggap sama dengan 1 (number)
            if (!quiz || quiz.show_results != 1) {
                return jsonResponse({ error: "Pembahasan belum dibuka." }, 403);
            }

            // Ambil Data Ujian Siswa
            const attempt = await env.DB.prepare(`SELECT questions_order, student_answers, score FROM quiz_attempts WHERE quiz_id = ? AND student_id = ?`).bind(quizId, studentId).first();
            if (!attempt) return jsonResponse({ error: "Belum mengerjakan" }, 400);

            const questionIds = JSON.parse(attempt.questions_order || '[]');
            const studentAnswers = JSON.parse(attempt.student_answers || '[]');

            if (questionIds.length === 0) return jsonResponse([]);

            // Ambil Soal + KUNCI JAWABAN
            const placeholders = questionIds.map(() => '?').join(',');
            const { results: questions } = await env.DB.prepare(`
            SELECT id, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer
            FROM quiz_questions
            WHERE id IN (${placeholders})
        `).bind(...questionIds).all();

            // Urutkan sesuai tampilan siswa
            const sortedQuestions = questionIds.map(id => questions.find(q => q.id === id)).filter(Boolean);

            // Inject jawaban siswa ke dalam objek pertanyaan untuk frontend
            const resultData = sortedQuestions.map(q => {
                const myAnsObj = studentAnswers.find(a => a.question_id === q.id);
                return {
                    ...q,
                    my_answer: myAnsObj ? myAnsObj.answer : null
                };
            });

            return jsonResponse({
                score: attempt.score,
                questions: resultData
            });
        }

        return null;
    } catch (err) {
        return jsonResponse({ error: "Quiz Controller Error: " + err.message }, 500);
    }
}