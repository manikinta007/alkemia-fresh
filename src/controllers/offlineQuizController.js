// controllers/offlineQuizController.js
// Handle Offline Mode CBT: Package Download, Offline Submit, Teacher Monitoring
// ISOLATED FILE - Does not affect existing quizController.js logic

import { jsonResponse } from '../utils.js';

export async function handleOfflineQuizRequest(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    try {
        // ========================================
        // 1. DOWNLOAD OFFLINE PACKAGE (Student)
        // ========================================
        // GET /api/quiz/:id/offline-package
        // Downloads quiz questions + images (Base64) for IndexedDB storage
        const packageMatch = pathname.match(/^\/api\/quiz\/(\d+)\/offline-package$/);
        if (packageMatch && method === "GET") {
            const quizId = packageMatch[1];

            // Verify Session
            const token = request.headers.get('Authorization')?.split(' ')[1];
            if (!token) return jsonResponse({ error: "Unauthorized" }, 401);

            const session = await env.DB.prepare(
                `SELECT student_id FROM student_sessions WHERE device_token = ?`
            ).bind(token).first();
            if (!session) return jsonResponse({ error: "Unauthorized Session" }, 401);

            const studentId = session.student_id;

            // Get Quiz Info
            const quiz = await env.DB.prepare(`
        SELECT id, title, duration, is_random, show_limit, is_offline_mode 
        FROM quizzes WHERE id = ? AND is_active = 1
      `).bind(quizId).first();

            if (!quiz) return jsonResponse({ error: "Quiz tidak ditemukan atau belum aktif" }, 404);
            if (!quiz.is_offline_mode) return jsonResponse({ error: "Quiz ini bukan mode offline" }, 400);

            // Check if already attempted
            const existing = await env.DB.prepare(
                `SELECT * FROM quiz_attempts WHERE quiz_id = ? AND student_id = ?`
            ).bind(quizId, studentId).first();

            if (existing && existing.finish_time) {
                return jsonResponse({ error: "Ujian sudah diselesaikan." }, 403);
            }

            // Get Questions
            const { results: allQuestions } = await env.DB.prepare(
                `SELECT id, question_text, option_a, option_b, option_c, option_d, option_e 
         FROM quiz_questions WHERE quiz_id = ?`
            ).bind(quizId).all();

            let selectedQuestions = [...allQuestions];

            // Shuffle if random
            if (quiz.is_random === 1) {
                for (let i = selectedQuestions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [selectedQuestions[i], selectedQuestions[j]] = [selectedQuestions[j], selectedQuestions[i]];
                }
            }

            // Limit if needed
            if (quiz.show_limit > 0 && selectedQuestions.length > quiz.show_limit) {
                selectedQuestions = selectedQuestions.slice(0, quiz.show_limit);
            }

            const questionIds = selectedQuestions.map(q => q.id);

            // Create or update attempt record (mark as downloading)
            if (!existing) {
                await env.DB.prepare(`
          INSERT INTO quiz_attempts (quiz_id, student_id, questions_order, offline_status)
          VALUES (?, ?, ?, 'downloading')
        `).bind(quizId, studentId, JSON.stringify(questionIds)).run();
            } else {
                await env.DB.prepare(`
          UPDATE quiz_attempts SET questions_order = ?, offline_status = 'downloading'
          WHERE quiz_id = ? AND student_id = ?
        `).bind(JSON.stringify(questionIds), quizId, studentId).run();
            }

            // Return package
            return jsonResponse({
                success: true,
                quiz: {
                    id: quiz.id,
                    title: quiz.title,
                    duration: quiz.duration
                },
                questions: selectedQuestions,
                questionOrder: questionIds,
                downloadedAt: new Date().toISOString()
            });
        }

        // ========================================
        // 2. UPDATE OFFLINE STATUS (Student)
        // ========================================
        // POST /api/quiz/offline/status
        // Updates student status: ready, in_exam
        if (pathname === "/api/quiz/offline/status" && method === "POST") {
            const token = request.headers.get('Authorization')?.split(' ')[1];
            if (!token) return jsonResponse({ error: "Unauthorized" }, 401);

            const session = await env.DB.prepare(
                `SELECT student_id FROM student_sessions WHERE device_token = ?`
            ).bind(token).first();
            if (!session) return jsonResponse({ error: "Unauthorized" }, 401);

            const { quizId, status } = await request.json();
            const validStatuses = ['ready', 'in_exam', 'finished'];
            if (!validStatuses.includes(status)) {
                return jsonResponse({ error: "Invalid status" }, 400);
            }

            await env.DB.prepare(`
        UPDATE quiz_attempts SET offline_status = ?, start_time = CASE WHEN ? = 'in_exam' AND start_time IS NULL THEN ? ELSE start_time END
        WHERE quiz_id = ? AND student_id = ?
      `).bind(status, status, new Date().toISOString(), quizId, session.student_id).run();

            return jsonResponse({ success: true });
        }

        // ========================================
        // 3. SUBMIT OFFLINE ANSWERS (Student)
        // ========================================
        // POST /api/quiz/offline/submit
        if (pathname === "/api/quiz/offline/submit" && method === "POST") {
            const token = request.headers.get('Authorization')?.split(' ')[1];
            if (!token) return jsonResponse({ error: "Unauthorized" }, 401);

            const session = await env.DB.prepare(
                `SELECT student_id FROM student_sessions WHERE device_token = ?`
            ).bind(token).first();
            if (!session) return jsonResponse({ error: "Unauthorized" }, 401);

            const studentId = session.student_id;
            const { quizId, answers, durationSeconds, violations } = await request.json();

            // Get attempt
            const attempt = await env.DB.prepare(`
        SELECT id, questions_order, finish_time 
        FROM quiz_attempts WHERE quiz_id = ? AND student_id = ?
      `).bind(quizId, studentId).first();

            if (!attempt) return jsonResponse({ error: "Data ujian tidak ditemukan" }, 400);
            if (attempt.finish_time) return jsonResponse({ error: "Sudah dikumpulkan" }, 403);

            // Get quiz duration for validation
            const quiz = await env.DB.prepare(`SELECT duration FROM quizzes WHERE id = ?`).bind(quizId).first();

            // Validate duration (allow 2 min tolerance for network delay)
            const maxDuration = (quiz.duration * 60) + 120;
            const isLate = durationSeconds > maxDuration;

            const assignedIds = JSON.parse(attempt.questions_order || '[]');
            if (assignedIds.length === 0) {
                await env.DB.prepare(`
          UPDATE quiz_attempts SET finish_time = ?, score = 0, offline_status = 'submitted'
          WHERE id = ?
        `).bind(new Date().toISOString(), attempt.id).run();
                return jsonResponse({ success: true, score: 0 });
            }

            // Get correct answers
            const placeholders = assignedIds.map(() => '?').join(',');
            const { results: questions } = await env.DB.prepare(`
        SELECT id, correct_answer FROM quiz_questions WHERE id IN (${placeholders})
      `).bind(...assignedIds).all();

            // Calculate score
            let correctCount = 0;
            assignedIds.forEach(qId => {
                const qData = questions.find(q => q.id === qId);
                if (qData) {
                    const userAnsObj = answers.find(a => a.question_id === qId);
                    const userAns = userAnsObj ? userAnsObj.answer : null;
                    if (userAns && userAns === qData.correct_answer) correctCount++;
                }
            });

            let finalScore = (correctCount / assignedIds.length) * 100;
            finalScore = Math.round(finalScore * 100) / 100;
            if (isLate) finalScore = 0;

            // Save results
            await env.DB.prepare(`
        UPDATE quiz_attempts 
        SET finish_time = ?, score = ?, student_answers = ?, 
            offline_violations = ?, offline_duration = ?, offline_status = 'submitted'
        WHERE id = ?
      `).bind(
                new Date().toISOString(),
                finalScore,
                JSON.stringify(answers),
                JSON.stringify(violations || []),
                durationSeconds,
                attempt.id
            ).run();

            return jsonResponse({
                success: true,
                score: finalScore,
                correctCount: isLate ? 0 : correctCount,
                isLate: isLate,
                violationCount: (violations || []).length
            });
        }

        // ========================================
        // 4. TEACHER MONITORING (Polling)
        // ========================================
        // GET /api/quiz/:id/offline-monitor
        const monitorMatch = pathname.match(/^\/api\/quiz\/(\d+)\/offline-monitor$/);
        if (monitorMatch && method === "GET") {
            const quizId = monitorMatch[1];

            // Get quiz class for student list
            const quiz = await env.DB.prepare(
                `SELECT class_id FROM quizzes WHERE id = ?`
            ).bind(quizId).first();

            if (!quiz) return jsonResponse({ error: "Quiz tidak ditemukan" }, 404);

            // Get all students with their attempt status
            const { results } = await env.DB.prepare(`
        SELECT 
          s.id as student_id,
          s.name as student_name,
          qa.offline_status,
          qa.score,
          qa.offline_violations,
          qa.start_time,
          qa.finish_time
        FROM students s
        LEFT JOIN quiz_attempts qa ON s.id = qa.student_id AND qa.quiz_id = ?
        WHERE s.class_id = ?
        ORDER BY 
          CASE 
            WHEN qa.offline_status = 'in_exam' THEN 1
            WHEN qa.offline_status = 'downloading' THEN 2
            WHEN qa.offline_status = 'ready' THEN 3
            WHEN qa.offline_status = 'submitted' THEN 4
            ELSE 5
          END,
          s.name ASC
      `).bind(quizId, quiz.class_id).all();

            // Parse violations count
            const studentsWithViolations = results.map(s => ({
                ...s,
                violationCount: s.offline_violations ? JSON.parse(s.offline_violations).length : 0
            }));

            return jsonResponse({
                students: studentsWithViolations,
                timestamp: new Date().toISOString()
            });
        }

        return null;
    } catch (err) {
        return jsonResponse({ error: "Offline Quiz Controller Error: " + err.message }, 500);
    }
}
