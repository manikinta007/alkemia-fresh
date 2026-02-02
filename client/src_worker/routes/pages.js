// routes/pages.js
// Menangani seluruh request halaman HTML (Dashboard, Login, Student App, dll)

import { renderPage } from '../render.js';
import { getCookieValue } from '../utils.js';

// --- VIEWS IMPORTS ---
import { getLoginPage } from '../views/login.js';
import { getDashboardPage } from '../views/dashboard.js';
import { getPeriodsPage } from '../views/periods.js';
import { getClassesPage } from '../views/classes.js';
import { getGradesPage } from '../views/grades.js';
import { getMaterialsPage } from '../views/materials.js';
import { getQRCodesPage } from '../views/qrcode.js';
import { getSettingsPage } from '../views/settings.js';
import { getQuizPage } from '../views/quiz.js';
import { getLabPage } from '../views/lab.js';
import { getStudentLandingPage } from '../views/student/landing.js';
import { getStudentPortalPage } from '../views/student/portal.js';
import { getAttendancePage } from '../views/attendance.js';
import { getSchedulePage } from '../views/schedule.js';
import { getTasksPage } from '../views/tasks.js'; // [NEW] Import Halaman Tugas

// --- CONFIG & HEADERS ---
// [PENTING] Ganti URL ini dengan domain Worker Anda sendiri!
const ALLOWED_ORIGIN = "https://ganti-dengan-domain-anda.workers.dev"; 

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie, X-CSRF-Token, X-Student-Token, X-Device-Id", 
};

// --- HELPER: Verify Session for Page View ---
async function verifyAdminSession(request, env) {
  const token = getCookieValue(request, "auth_session");
  if (!token) return false;

  const session = await env.DB.prepare(`
    SELECT * FROM admin_sessions 
    WHERE session_token = ? AND expires_at > CURRENT_TIMESTAMP
  `).bind(token).first();

  return !!session;
}

// --- MAIN PAGE HANDLER ---
export async function handlePageRequest(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. PUBLIC PAGES (No Login Required)
    const isPublicPage = 
        pathname === "/" || 
        pathname === "/login" || 
        pathname === "/logout" || 
        pathname.startsWith("/student") || 
        pathname === "/sw.js" || 
        pathname === "/manifest.json";

    const isLoggedIn = await verifyAdminSession(request, env);

    // 2. REDIRECT LOGIC
    if (!isPublicPage && !isLoggedIn) {
        return Response.redirect(url.origin + "/", 302);
    }
    
    if ((pathname === "/" || pathname === "/login") && isLoggedIn) {
        return Response.redirect(url.origin + "/dashboard", 302);
    }

    // 3. ROUTING
    if (pathname === "/logout") {
        const token = getCookieValue(request, "auth_session");
        if (token) {
            await env.DB.prepare("DELETE FROM admin_sessions WHERE session_token = ?").bind(token).run();
        }

        return new Response(null, {
          status: 302,
          headers: {
            "Location": url.origin + "/",
            "Set-Cookie": "auth_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
          }
        });
    }

    // --- VIEW RENDERING ---

    if (pathname === "/" || pathname === "/login") {
      return renderPage(getLoginPage());
    }

    if (pathname === "/dashboard") {
      const { stats, activePeriod, school } = await getDashboardData(env);
      return renderPage(getDashboardPage(stats, activePeriod, school));
    }

    if (pathname === "/periods") {
      const { activePeriod, periods } = await getCommonData(env);
      return renderPage(getPeriodsPage(periods, activePeriod));
    }

    if (pathname === "/classes") {
      const { activePeriod } = await getCommonData(env);
      const classes = await getClassesData(env, activePeriod);
      return renderPage(getClassesPage(classes, activePeriod));
    }

    if (pathname === "/schedule") {
      const { activePeriod } = await getCommonData(env);
      const classes = await getClassesData(env, activePeriod);
      return renderPage(getSchedulePage(classes, activePeriod));
    }

    // [NEW] HALAMAN TUGAS
    if (pathname === "/tasks") {
      const { activePeriod } = await getCommonData(env);
      const classes = await getClassesData(env, activePeriod);
      return renderPage(getTasksPage(classes, activePeriod));
    }

    if (pathname === "/lab") { 
      const { activePeriod } = await getCommonData(env);
      return renderPage(getLabPage(activePeriod));
    }

    if (pathname === "/grades") {
      const { activePeriod } = await getCommonData(env);
      const classes = await getClassesData(env, activePeriod);
      return renderPage(getGradesPage(classes, activePeriod));
    }

    if (pathname === "/materials") {
      const { activePeriod } = await getCommonData(env);
      const classes = await getClassesData(env, activePeriod);
      return renderPage(getMaterialsPage(classes, activePeriod));
    }

    if (pathname === "/qrcodes") {
      const { activePeriod } = await getCommonData(env);
      const classes = await getClassesData(env, activePeriod);
      return renderPage(getQRCodesPage(classes, activePeriod));
    }

    if (pathname === "/quizzes") {
      const { activePeriod } = await getCommonData(env);
      const classes = await getClassesData(env, activePeriod);
      return renderPage(getQuizPage(classes, activePeriod));
    }

    if (pathname === "/settings") {
      const { activePeriod, school } = await getCommonData(env);
      return renderPage(getSettingsPage(school, activePeriod));
    }

    if (pathname === "/attendance") {
      const { activePeriod } = await getCommonData(env);
      const classes = await getClassesData(env, activePeriod);
      return renderPage(getAttendancePage(classes, activePeriod));
    }

    // --- STUDENT PAGES ---
    if (pathname === "/student" || pathname === "/student/scan") {
      return renderPage(getStudentLandingPage());
    }
    if (pathname === "/student/portal") {
      return renderPage(getStudentPortalPage());
    }

    // --- ASSETS (Manifest & SW) ---
    if (pathname === "/manifest.json") {
      return new Response(JSON.stringify({
        name: "AlkeMia Portal",
        short_name: "AlkeMia",
        start_url: "/student",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#000000",
        icons: [{ src: "https://iili.io/f4HD692.png", sizes: "192x192", type: "image/png" }]
      }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    if (pathname === "/sw.js") {
      return new Response("self.addEventListener('fetch', () => {});", { headers: { "Content-Type": "application/javascript", ...corsHeaders } });
    }

    return new Response("Halaman tidak ditemukan (404)", { status: 404 });
}

// --- DATA HELPERS (Dipindahkan dari worker.js lama) ---

async function getCommonData(env) {
  const activePeriod = await env.DB.prepare("SELECT * FROM academic_periods WHERE is_active = 1 LIMIT 1").first();
  const { results: periods } = await env.DB.prepare("SELECT * FROM academic_periods ORDER BY created_at DESC").all();
  const school = await env.DB.prepare("SELECT * FROM school_profile WHERE id = 1").first();
  return { activePeriod, periods, school };
}

async function getClassesData(env, activePeriod) {
  if (!activePeriod) return [];
  const { results } = await env.DB.prepare("SELECT * FROM classes WHERE period_id = ?").bind(activePeriod.id).all();
  return results || [];
}

async function getDashboardData(env) {
  const { activePeriod, school } = await getCommonData(env);
  const stats = { students: 0, classes: 0, materials: 0, quizzes: 0 };
   
  if (activePeriod) {
    stats.classes = await count(env, "classes", "period_id = ?", activePeriod.id);
    stats.students = await count(env, "students", "class_id IN (SELECT id FROM classes WHERE period_id = ?)", activePeriod.id);
    stats.materials = await count(env, "materials", "period_id = ?", activePeriod.id);
    stats.quizzes = await count(env, "quizzes", "period_id = ?", activePeriod.id);
  }
  return { stats, activePeriod, school };
}

async function count(env, table, where, ...params) {
  const res = await env.DB.prepare(`SELECT COUNT(*) as total FROM ${table} WHERE ${where}`).bind(...params).first();
  return res.total;
}