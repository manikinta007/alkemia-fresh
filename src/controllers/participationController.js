import { jsonResponse, errorResponse } from '../utils/response.js';

export async function handleParticipationRequest(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
        // GET /api/participation/settings?class_id={id}
        if (path === '/api/participation/settings' && request.method === 'GET') {
            const classId = url.searchParams.get('class_id');
            if (!classId) return errorResponse('class_id required', 400);

            const settings = await env.DB.prepare(
                'SELECT * FROM participation_settings WHERE class_id = ?'
            ).bind(classId).first();

            // Return default settings if not configured yet
            if (!settings) {
                return jsonResponse({
                    class_id: parseInt(classId),
                    base_score: 50,
                    ask_points: 2,
                    answer_points: 3,
                    present_points: 5,
                    penalty_points: -2
                });
            }

            return jsonResponse(settings);
        }

        // POST /api/participation/settings
        if (path === '/api/participation/settings' && request.method === 'POST') {
            const { class_id, base_score, ask_points, answer_points, present_points, penalty_points } = await request.json();

            // Check if settings exist
            const existing = await env.DB.prepare(
                'SELECT id FROM participation_settings WHERE class_id = ?'
            ).bind(class_id).first();

            if (existing) {
                // Update
                await env.DB.prepare(`
                    UPDATE participation_settings 
                    SET base_score = ?, ask_points = ?, answer_points = ?, 
                        present_points = ?, penalty_points = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE class_id = ?
                `).bind(base_score, ask_points, answer_points, present_points, penalty_points, class_id).run();
            } else {
                // Insert
                await env.DB.prepare(`
                    INSERT INTO participation_settings 
                    (class_id, base_score, ask_points, answer_points, present_points, penalty_points)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).bind(class_id, base_score, ask_points, answer_points, present_points, penalty_points).run();
            }

            return jsonResponse({ success: true });
        }

        // GET /api/participation/students?class_id={id}
        if (path === '/api/participation/students' && request.method === 'GET') {
            const classId = url.searchParams.get('class_id');
            if (!classId) return errorResponse('class_id required', 400);

            // Get settings
            const settings = await env.DB.prepare(
                'SELECT * FROM participation_settings WHERE class_id = ?'
            ).bind(classId).first();

            const baseScore = settings?.base_score || 50;

            // Get all students in class
            const students = await env.DB.prepare(
                'SELECT id, name FROM students WHERE class_id = ? ORDER BY name'
            ).bind(classId).all();

            // Get participation logs for each student
            const studentsWithPoints = await Promise.all(students.results.map(async (student) => {
                const logs = await env.DB.prepare(`
                    SELECT SUM(points) as total_points, COUNT(*) as activity_count
                    FROM participation_logs 
                    WHERE student_id = ? AND class_id = ? AND is_undone = 0
                `).bind(student.id, classId).first();

                const totalPoints = logs?.total_points || 0;
                const finalScore = baseScore + totalPoints;

                return {
                    ...student,
                    base_score: baseScore,
                    activity_points: totalPoints,
                    final_score: finalScore,
                    activity_count: logs?.activity_count || 0
                };
            }));

            return jsonResponse(studentsWithPoints);
        }

        // POST /api/participation/log
        if (path === '/api/participation/log' && request.method === 'POST') {
            const { class_id, student_id, activity_type, points, teacher_id } = await request.json();

            await env.DB.prepare(`
                INSERT INTO participation_logs 
                (class_id, student_id, activity_type, points, teacher_id)
                VALUES (?, ?, ?, ?, ?)
            `).bind(class_id, student_id, activity_type, points, teacher_id || 1).run();

            return jsonResponse({ success: true });
        }

        // POST /api/participation/undo
        if (path === '/api/participation/undo' && request.method === 'POST') {
            const { student_id, class_id } = await request.json();

            // Get last activity that is not undone
            const lastActivity = await env.DB.prepare(`
                SELECT id FROM participation_logs 
                WHERE student_id = ? AND class_id = ? AND is_undone = 0
                ORDER BY timestamp DESC LIMIT 1
            `).bind(student_id, class_id).first();

            if (!lastActivity) {
                return errorResponse('No activity to undo', 404);
            }

            // Mark as undone
            await env.DB.prepare(
                'UPDATE participation_logs SET is_undone = 1 WHERE id = ?'
            ).bind(lastActivity.id).run();

            return jsonResponse({ success: true });
        }

        // GET /api/participation/history?student_id={id}&class_id={id}
        if (path === '/api/participation/history' && request.method === 'GET') {
            const studentId = url.searchParams.get('student_id');
            const classId = url.searchParams.get('class_id');

            if (!studentId || !classId) {
                return errorResponse('student_id and class_id required', 400);
            }

            const history = await env.DB.prepare(`
                SELECT activity_type, points, timestamp, is_undone
                FROM participation_logs 
                WHERE student_id = ? AND class_id = ? AND is_undone = 0
                ORDER BY timestamp DESC
            `).bind(studentId, classId).all();

            return jsonResponse(history.results);
        }

        return errorResponse('Not found', 404);

    } catch (error) {
        console.error('[participationController] Error:', error);
        return errorResponse(error.message, 500);
    }
}
