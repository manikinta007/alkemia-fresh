// controllers/studentAppController.js
// Mengelola API Khusus Aplikasi Siswa (Login, Claim Device, Dashboard, UJIAN)
// FIXED: Mencegah Double Submit, Validasi Waktu Server & Fitur Ujian Berbasis Kehadiran

import { jsonResponse, generateSalt, hashPassword } from '../utils.js';

export async function handleStudentAppRequest(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    try {
        // ========================================
        // 1. VERIFY QR CODE (Saat siswa scan QR)
        // ========================================
        if (pathname === "/api/student/verify" && method === "GET") {
            const classId = url.searchParams.get("c");
            const qrToken = url.searchParams.get("t");

            const qrCode = await env.DB.prepare(`SELECT * FROM class_qr_codes WHERE class_id = ? AND qr_token = ?`).bind(classId, qrToken).first();

            if (!qrCode) {
                return jsonResponse({ error: "QR Code tidak valid atau sudah kadaluarsa" }, 401);
            }

            const classInfo = await env.DB.prepare(`
          SELECT c.*, p.year, p.semester 
          FROM classes c 
          JOIN academic_periods p ON c.period_id = p.id 
          WHERE c.id = ?
      `).bind(classId).first();

            const school = await env.DB.prepare(`SELECT * FROM school_profile WHERE id = 1`).first();

            const { results: students } = await env.DB.prepare(`
          SELECT s.id, s.name, 
          (SELECT COUNT(*) FROM student_sessions ss WHERE ss.student_id = s.id AND ss.is_active = 1) as device_count
          FROM students s 
          WHERE s.class_id = ? 
          ORDER BY s.name ASC
      `).bind(classId).all();

            return jsonResponse({ classInfo, students, school });
        }

        // ========================================
        // 2. CLAIM DEVICE (LOGIN SISWA) - SECURED
        // ========================================
        if (pathname === "/api/student/claim" && method === "POST") {
            const body = await request.json();
            const { classId, studentId, deviceId } = body;
            const userAgent = request.headers.get("User-Agent") || "Unknown";

            if (!deviceId) return jsonResponse({ error: "Keamanan Perangkat Gagal: Device ID tidak ditemukan." }, 400);

            const existingSession = await env.DB.prepare(`
          SELECT * FROM student_sessions WHERE student_id = ? AND is_active = 1
      `).bind(studentId).first();

            if (existingSession) {
                return jsonResponse({ error: "Nama ini sudah digunakan di perangkat lain. Minta guru untuk mereset jika Anda pindah HP." }, 403);
            }

            const salt = generateSalt();
            const deviceHash = await hashPassword(deviceId, salt);
            const token = crypto.randomUUID();

            await env.DB.prepare(`
          INSERT INTO student_sessions (student_id, device_token, device_info, device_uuid_hash, device_uuid_salt, user_agent, is_active)
          VALUES (?, ?, ?, ?, ?, ?, 1)
      `).bind(studentId, token, 'Mobile Web', deviceHash, salt, userAgent).run();

            return jsonResponse({ success: true, token: token });
        }

        // ========================================
        // 3. STUDENT DASHBOARD (PROTECTED)
        // ========================================
        if (pathname === "/api/student/dashboard" && method === "GET") {
            const authHeader = request.headers.get("Authorization");
            const clientDeviceId = request.headers.get("X-Device-Id");
            const clientUserAgent = request.headers.get("User-Agent") || "Unknown";

            if (!authHeader || !authHeader.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);
            if (!clientDeviceId) return jsonResponse({ error: "Security Violation: Device ID Missing" }, 403);

            const token = authHeader.split(" ")[1];
            const session = await env.DB.prepare(`SELECT * FROM student_sessions WHERE device_token = ? AND is_active = 1`).bind(token).first();

            if (!session) return jsonResponse({ error: "Sesi kadaluarsa." }, 401);
            if (session.user_agent !== clientUserAgent) return jsonResponse({ error: "Akses Ditolak: Perangkat berubah." }, 403);

            const calculatedHash = await hashPassword(clientDeviceId, session.device_uuid_salt);
            if (calculatedHash !== session.device_uuid_hash) return jsonResponse({ error: "Akses Ditolak: Tagging Perangkat Mismatch." }, 403);

            await env.DB.prepare("UPDATE student_sessions SET last_access = CURRENT_TIMESTAMP WHERE id = ?").bind(session.id).run();

            const student = await env.DB.prepare(`
          SELECT s.*, c.name as class_name, c.show_grades FROM students s JOIN classes c ON s.class_id = c.id WHERE s.id = ?
      `).bind(session.student_id).first();

            const school = await env.DB.prepare(`SELECT * FROM school_profile WHERE id = 1`).first();

            const { results: materials } = await env.DB.prepare(`
         SELECT * FROM materials WHERE class_id = ? AND is_visible = 1 ORDER BY created_at DESC
      `).bind(student.class_id).all();

            const grade = await env.DB.prepare(`SELECT * FROM grades WHERE student_id = ?`).bind(student.id).first();

            // [NEW] Cek Absensi Hari Ini (Timezone Indonesia)
            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); // Output: YYYY-MM-DD
            const attendance = await env.DB.prepare(
                "SELECT status FROM attendance WHERE student_id = ? AND date = ?"
            ).bind(session.student_id, today).first();

            const isPresent = attendance && attendance.status === 'H';

            // QUERY QUIZ (Optimized + Fetch Check Attendance)
            const { results: quizzes } = await env.DB.prepare(`
        SELECT q.id, q.title, q.description, q.duration, q.show_limit, q.is_random, q.show_results, 
               q.scheduled_at, q.tolerance_minutes, q.is_active, q.check_attendance, q.allowed_students,
               q.is_offline_mode,
               (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) as total_pool_count,
               (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.student_id = ?) as attempt_count,
               (SELECT score FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.student_id = ?) as my_score
        FROM quizzes q
        WHERE q.class_id = ? AND q.is_active = 1
        ORDER BY q.created_at DESC
      `).bind(session.student_id, session.student_id, student.class_id).all();

            // [NEW] Logic Pengunci (Locked by Attendance)
            const quizzesAdjusted = quizzes.map(q => {
                let isLocked = false;

                if (q.check_attendance === 1) {
                    // Cek whitelist
                    const whitelist = JSON.parse(q.allowed_students || '[]');
                    const isWhitelisted = whitelist.some(id => String(id) === String(session.student_id));

                    // Jika TIDAK hadir DAN TIDAK whitelist, maka kunci
                    if (!isPresent && !isWhitelisted) {
                        isLocked = true;
                    }
                }

                return {
                    ...q,
                    is_locked_attendance: isLocked, // Kirim status kunci ke frontend
                    question_count: (q.show_limit > 0 && q.show_limit < q.total_pool_count) ? q.show_limit : q.total_pool_count
                };
            });

            return jsonResponse({
                student, materials, grade, school, gradesHidden: student.show_grades === 0, quizzes: quizzesAdjusted
            });
        }

        // 4. RESET CLAIMS
        if (pathname === "/api/student/reset-claims" && method === "POST") {
            const { classId } = await request.json();
            await env.DB.prepare(`UPDATE student_sessions SET is_active = 0 WHERE student_id IN (SELECT id FROM students WHERE class_id = ?)`).bind(classId).run();
            return jsonResponse({ message: "Semua sesi perangkat berhasil direset." });
        }

        // 5. UJIAN ENDPOINTS
        if (pathname === '/api/student/quiz/start' && method === 'GET') {
            const quizId = url.searchParams.get('id');
            return await startQuiz(env, request, quizId);
        }
        if (pathname === '/api/student/quiz/submit' && method === 'POST') {
            return await submitQuiz(request, env);
        }
        if (pathname === '/api/student/quiz/review' && method === 'GET') {
            const quizId = url.searchParams.get('id');
            return await getQuizReview(env, request, quizId);
        }

        return null;
    } catch (err) {
        return jsonResponse({ error: "Student App Error: " + err.message }, 500);
    }
}

// --- HELPER FUNCTIONS ---

async function getSessionFromRequest(request, env) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.split(" ")[1];
    return await env.DB.prepare("SELECT * FROM student_sessions WHERE device_token = ? AND is_active = 1").bind(token).first();
}

async function startQuiz(env, request, quizId) {
    const session = await getSessionFromRequest(request, env);
    if (!session) return jsonResponse({ error: "Unauthorized" }, 401);

    const quiz = await env.DB.prepare("SELECT * FROM quizzes WHERE id = ?").bind(quizId).first();
    if (!quiz || quiz.is_active === 0) return jsonResponse({ error: "Quiz tidak aktif" }, 404);

    // [NEW] GATEKEEPER: Cek Kehadiran (Attendance Check)
    if (quiz.check_attendance === 1) {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
        const attendance = await env.DB.prepare("SELECT status FROM attendance WHERE student_id = ? AND date = ?").bind(session.student_id, today).first();
        const isPresent = attendance && attendance.status === 'H';

        const whitelist = JSON.parse(quiz.allowed_students || '[]');
        const isWhitelisted = whitelist.some(id => String(id) === String(session.student_id));

        if (!isPresent && !isWhitelisted) {
            return jsonResponse({ error: "Akses Ditolak: Anda tercatat tidak hadir (belum presensi) dan tidak memiliki izin khusus." }, 403);
        }
    }

    // Cek attempt sebelumnya
    const existing = await env.DB.prepare("SELECT * FROM quiz_attempts WHERE quiz_id = ? AND student_id = ?").bind(quizId, session.student_id).first();

    // JIKA SUDAH SELESAI (finish_time ada), TOLAK AKSES
    if (existing && existing.finish_time) {
        return jsonResponse({ error: "Anda sudah menyelesaikan ujian ini." }, 403);
    }

    let questionsOrderJson;

    if (existing) {
        // Jika sedang mengerjakan (reload halaman), kembalikan soal yang sama
        questionsOrderJson = existing.questions_order;
    } else {
        // Baru mulai
        const { results: allQuestions } = await env.DB.prepare("SELECT id FROM quiz_questions WHERE quiz_id = ?").bind(quizId).all();
        let selectedIds = allQuestions.map(q => q.id);

        if (quiz.is_random === 1) {
            for (let i = selectedIds.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [selectedIds[i], selectedIds[j]] = [selectedIds[j], selectedIds[i]];
            }
        }
        if (quiz.show_limit > 0 && selectedIds.length > quiz.show_limit) {
            selectedIds = selectedIds.slice(0, quiz.show_limit);
        }

        questionsOrderJson = JSON.stringify(selectedIds);

        await env.DB.prepare(`
            INSERT INTO quiz_attempts (quiz_id, student_id, start_time, score, questions_order)
            VALUES (?, ?, ?, 0, ?)
        `).bind(quizId, session.student_id, new Date().toISOString(), questionsOrderJson).run();
    }

    const questionIds = JSON.parse(questionsOrderJson);
    if (questionIds.length === 0) return jsonResponse({ questions: [] });

    const placeholders = questionIds.map(() => '?').join(',');
    const { results: rawQuestions } = await env.DB.prepare(`
        SELECT id, question_text, option_a, option_b, option_c, option_d, option_e 
        FROM quiz_questions 
        WHERE id IN (${placeholders})
    `).bind(...questionIds).all();

    const sortedQuestions = questionIds.map(id => rawQuestions.find(q => q.id === id)).filter(Boolean);
    return jsonResponse({ quiz: { id: quiz.id, title: quiz.title, duration: quiz.duration }, questions: sortedQuestions });
}

// [FIXED] SUBMIT DENGAN PENGECEKAN DOUBLE DATA
async function submitQuiz(request, env) {
    const session = await getSessionFromRequest(request, env);
    if (!session) return jsonResponse({ error: "Unauthorized" }, 401);

    const { quizId, answers } = await request.json();

    // 1. CEK STATUS UJIAN (PENTING)
    const existingEntry = await env.DB.prepare(
        "SELECT id, finish_time, start_time FROM quiz_attempts WHERE quiz_id = ? AND student_id = ?"
    ).bind(quizId, session.student_id).first();

    // Jika finish_time sudah ada, berarti sudah dikirim sebelumnya. TOLAK.
    if (existingEntry && existingEntry.finish_time) {
        return jsonResponse({ error: "Ujian sudah dikumpulkan sebelumnya." }, 403);
    }

    // 2. AMBIL KUNCI
    const { results: keys } = await env.DB.prepare("SELECT id, correct_answer FROM quiz_questions WHERE quiz_id = ?").bind(quizId).all();
    const keyMap = new Map();
    keys.forEach(k => keyMap.set(k.id, k.correct_answer));

    // 3. HITUNG NILAI
    let correct = 0;
    answers.forEach(ans => {
        if (keyMap.get(ans.question_id) === ans.answer) correct++;
    });
    const score = Math.round((correct / keys.length) * 100);
    const answersJson = JSON.stringify(answers);
    const finishedAt = new Date().toISOString();

    // 4. SIMPAN DATA
    if (existingEntry) {
        await env.DB.prepare(`
            UPDATE quiz_attempts 
            SET score = ?, student_answers = ?, finish_time = ? 
            WHERE id = ?
        `).bind(score, answersJson, finishedAt, existingEntry.id).run();
    } else {
        // Fallback (jarang terjadi kalau flow normal)
        await env.DB.prepare(`
            INSERT INTO quiz_attempts (quiz_id, student_id, score, student_answers, finish_time)
            VALUES (?, ?, ?, ?, ?)
        `).bind(quizId, session.student_id, score, answersJson, finishedAt).run();
    }

    return jsonResponse({ success: true, score });
}

async function getQuizReview(env, request, quizId) {
    const session = await getSessionFromRequest(request, env);
    if (!session) return jsonResponse({ error: "Unauthorized" }, 401);

    const quiz = await env.DB.prepare("SELECT show_results FROM quizzes WHERE id = ?").bind(quizId).first();
    if (!quiz || quiz.show_results !== 1) return jsonResponse({ error: "Pembahasan ditutup oleh guru." }, 403);

    const attempt = await env.DB.prepare("SELECT student_answers, score FROM quiz_attempts WHERE quiz_id = ? AND student_id = ?").bind(quizId, session.student_id).first();
    if (!attempt) return jsonResponse({ error: "Belum ada riwayat ujian." }, 404);

    const studentAnswers = JSON.parse(attempt.student_answers || '[]');
    const ansMap = {};
    studentAnswers.forEach(a => ansMap[a.question_id] = a.answer);

    const { results: questions } = await env.DB.prepare("SELECT id, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer FROM quiz_questions WHERE quiz_id = ? ORDER BY id ASC").bind(quizId).all();

    const reviewData = questions.map(q => ({ ...q, my_answer: ansMap[q.id] || null }));
    return jsonResponse({ score: attempt.score, questions: reviewData });
}