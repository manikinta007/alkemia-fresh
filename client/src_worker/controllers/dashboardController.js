// controllers/dashboardController.js
import { jsonResponse } from '../utils.js';

async function getCommonData(env) {
    const activePeriod = await env.DB.prepare("SELECT * FROM academic_periods WHERE is_active = 1 LIMIT 1").first();
    // We might not need all periods for the dashboard, just active one is usually enough for stats
    // But let's keep it simple.
    const school = await env.DB.prepare("SELECT * FROM school_profile WHERE id = 1").first();
    return { activePeriod, school };
}

async function count(env, table, where, ...params) {
    const res = await env.DB.prepare(`SELECT COUNT(*) as total FROM ${table} WHERE ${where}`).bind(...params).first();
    return res.total;
}

export async function handleDashboardRequest(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    if (pathname === "/api/dashboard" && method === "GET") {
        try {
            const { activePeriod, school } = await getCommonData(env);
            const stats = { students: 0, classes: 0, materials: 0, quizzes: 0 };

            if (activePeriod) {
                stats.classes = await count(env, "classes", "period_id = ?", activePeriod.id);
                stats.students = await count(env, "students", "class_id IN (SELECT id FROM classes WHERE period_id = ?)", activePeriod.id);
                stats.materials = await count(env, "materials", "period_id = ?", activePeriod.id);
                stats.quizzes = await count(env, "quizzes", "period_id = ?", activePeriod.id);
            }

            return jsonResponse({
                stats,
                activePeriod,
                school
            });

        } catch (e) {
            return jsonResponse({ error: "Dashboard Error: " + e.message }, 500);
        }
    }

    return null;
}
