// routes/api.js
// Menangani seluruh request yang berawalan "/api/"
// Termasuk Logic Login, Rate Limiting, dan Routing ke Controller

import { jsonResponse, getCookieValue, checkLoginLimit, recordLoginFailure, resetLoginFailures } from '../utils.js';

// --- CONTROLLERS ---
import { handleUploadRequest } from '../controllers/uploadController.js';
import { handlePeriodRequest } from '../controllers/periodController.js';
import { handleClassRequest } from '../controllers/classController.js';
import { handleGradeRequest } from '../controllers/gradeController.js';
import { handleMaterialRequest } from '../controllers/materialController.js';
import { handleQRRequest } from '../controllers/qrController.js';
import { handleQuizRequest } from '../controllers/quizController.js';
import { handleStudentAppRequest } from '../controllers/studentAppController.js';
import { handleSettingRequest } from '../controllers/settingController.js';
import { handleAttendanceRequest } from '../controllers/attendanceController.js';
import { handleScheduleRequest } from '../controllers/scheduleController.js';
import { handleMigrationRequest } from '../controllers/migrationController.js'; // [NEW] Database Migration
import { handleTaskRequest } from '../controllers/taskController.js'; // [NEW] Task & Remedial
import { handleDashboardRequest } from '../controllers/dashboardController.js'; // [NEW] Dashboard Stats

// --- CONFIG & HEADERS ---
// [PENTING] Ganti URL ini dengan domain Worker Anda sendiri!
const ALLOWED_ORIGIN = "https://ganti-dengan-domain-anda.workers.dev";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie, X-CSRF-Token, X-Student-Token, X-Device-Id",
};

// --- SECURITY CHECKER (CSRF & Session) ---
async function verifyApiProtection(request, env) {
  const method = request.method;

  // 1. Session Check (Wajib untuk semua method kecuali login/init/student/migrate)
  const sessionToken = getCookieValue(request, "auth_session");
  if (!sessionToken) return { valid: false, status: 401, error: "Unauthorized: Please Login" };

  // 2. CSRF Check (Hanya untuk POST, PUT, DELETE)
  if (method === "POST" || method === "PUT" || method === "DELETE") {
    const csrfHeader = request.headers.get("X-CSRF-Token");

    if (!csrfHeader) {
      return { valid: false, status: 403, error: "Forbidden: Missing CSRF Token" };
    }

    const validSession = await env.DB.prepare(`
      SELECT * FROM admin_sessions 
      WHERE session_token = ? AND csrf_token = ? AND expires_at > CURRENT_TIMESTAMP
    `).bind(sessionToken, csrfHeader).first();

    if (!validSession) {
      return { valid: false, status: 403, error: "Forbidden: Invalid CSRF Token" };
    }
  } else {
    // Untuk GET API, cukup cek Session saja
    const validSession = await env.DB.prepare(`
        SELECT * FROM admin_sessions 
        WHERE session_token = ? AND expires_at > CURRENT_TIMESTAMP
      `).bind(sessionToken).first();

    if (!validSession) return { valid: false, status: 401, error: "Unauthorized: Session Expired" };
  }

  return { valid: true };
}

// --- MAIN API HANDLER ---
export async function handleApiRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  // ========================================
  // A. INTERCEPT LOGIN (Inject Cookie & Rate Limiting)
  // ========================================
  if (pathname === "/api/login" && method === "POST") {

    // 1. RATE LIMITING CHECK (KV)
    const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
    const limitCheck = await checkLoginLimit(env, clientIP);

    if (!limitCheck.allowed) {
      return jsonResponse({
        error: "Terlalu banyak percobaan gagal. Akses diblokir sementara (15 menit)."
      }, 429);
    }

    // 2. PROSES LOGIN (Panggil SettingController)
    const response = await handleSettingRequest(request, env);

    // 3. CEK HASIL LOGIN (Untuk Rate Limiting & Cookie)
    if (response.status === 200) {
      // Login SUKSES -> Reset Counter Gagal
      await resetLoginFailures(env, clientIP);

      const responseClone = response.clone();
      const data = await responseClone.json();

      if (data.sessionToken) {
        const newResponse = new Response(response.body, response);
        newResponse.headers.append(
          "Set-Cookie",
          `auth_session=${data.sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
        );
        // Inject CORS headers
        Object.entries(corsHeaders).forEach(([key, value]) => {
          newResponse.headers.set(key, value);
        });
        return newResponse;
      }
    } else if (response.status === 401) {
      // Login GAGAL (Password Salah) -> Catat Kegagalan
      await recordLoginFailure(env, clientIP);
    }

    // Return error response (jika gagal) dengan CORS
    const errResponse = new Response(response.body, response);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errResponse.headers.set(key, value);
    });
    return errResponse;
  }

  // ========================================
  // B. GENERAL API ROUTES
  // ========================================

  // Cek apakah API Public atau Protected
  const isPublicApi =
    pathname === "/api/login" ||
    pathname === "/api/init" ||
    pathname.startsWith("/api/migrate") || // Allow migration
    pathname.startsWith("/api/student");

  if (!isPublicApi) {
    const security = await verifyApiProtection(request, env);
    if (!security.valid) {
      return jsonResponse({ error: security.error }, security.status);
    }
  }


  // ========================================
  // C. API CONTROLLER ROUTING
  // ========================================

  try {
    // Routing ke Controller
    let apiResponse;

    // [NEW] Auth Session Endpoint (Get CSRF Token)
    if (pathname === "/api/auth/session" && method === "GET") {
      const sessionToken = getCookieValue(request, "auth_session");
      if (!sessionToken) return jsonResponse({ error: "No session" }, 401);

      const session = await env.DB.prepare("SELECT csrf_token, username FROM admin_sessions WHERE session_token = ?").bind(sessionToken).first();
      if (session) {
        const user = await env.DB.prepare("SELECT username, name, nip, 'admin' as role FROM users WHERE username = ?").bind(session.username).first();

        // Fetch Subjects
        const { results: subjectsRes } = await env.DB.prepare("SELECT subject_name FROM teacher_subjects WHERE username = ?").bind(session.username).all();
        if (user) user.subjects = subjectsRes.map(s => s.subject_name);

        return jsonResponse({ csrfToken: session.csrf_token, user });
      } else {
        return jsonResponse({ error: "Invalid session" }, 401);
      }

    }

    // [NEW] Logout Endpoint
    if (pathname === "/api/auth/logout" && method === "POST") {
      const response = jsonResponse({ message: "Logged out" });
      response.headers.append(
        "Set-Cookie",
        "auth_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
      );
      return response;
    }

    if (!apiResponse) apiResponse = await handleUploadRequest(request, env);
    if (!apiResponse) apiResponse = await handleSettingRequest(request, env);
    if (!apiResponse) apiResponse = await handlePeriodRequest(request, env);
    if (!apiResponse) apiResponse = await handleClassRequest(request, env);
    if (!apiResponse) apiResponse = await handleGradeRequest(request, env);
    if (!apiResponse) apiResponse = await handleMaterialRequest(request, env);
    if (!apiResponse) apiResponse = await handleQRRequest(request, env);
    if (!apiResponse) apiResponse = await handleQuizRequest(request, env);
    if (!apiResponse) apiResponse = await handleStudentAppRequest(request, env);
    if (!apiResponse) apiResponse = await handleAttendanceRequest(request, env);
    if (!apiResponse) apiResponse = await handleScheduleRequest(request, env);

    // [NEW] Task API
    if (!apiResponse) apiResponse = await handleTaskRequest(request, env);

    // [NEW] Dashboard API
    if (!apiResponse) apiResponse = await handleDashboardRequest(request, env);

    // [NEW] Migration Route
    if (!apiResponse) apiResponse = await handleMigrationRequest(request, env);

    if (apiResponse) {
      const finalRes = new Response(apiResponse.body, apiResponse);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        finalRes.headers.set(key, value);
      });
      return finalRes;
    }

    return jsonResponse({ error: "API endpoint tidak ditemukan" }, 404);

  } catch (e) {
    // Global Error Handler for API
    return jsonResponse({ error: "Worker Internal Error: " + e.message, stack: e.stack }, 500);
  }
}