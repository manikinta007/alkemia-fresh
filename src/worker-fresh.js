// worker.js
// ALKEMIA MAIN WORKER (FINAL ENTRY POINT)
// Tugas: Global Error Handling, CORS, & Smart Routing Dispatcher

import { jsonResponse } from './utils.js';

// --- ROUTERS (Legacy/General) ---
import { handleApiRequest } from './routes/api.js';
import { handlePageRequest } from './routes/pages.js';

// --- SPECIFIC CONTROLLERS (New Features) ---
import { handleTaskRequest } from './controllers/taskController.js';
import { handleMigrationRequest } from './controllers/migrationController.js';

// --- CONFIG & HEADERS ---
// [PENTING] Ganti URL ini dengan domain Worker Anda sendiri jika sudah production!
const ALLOWED_ORIGIN = "*"; // Saat development boleh bintang (*), nanti ganti domain asli.

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie, X-CSRF-Token, X-Student-Token, X-Device-Id",
};

// --- MAIN LOGIC ---
export default {
  async fetch(request, env) {
    // 1. GLOBAL CORS PREFLIGHT (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (!env.DB) throw new Error("Database (D1) belum terhubung! Cek wranger.toml.");

      const url = new URL(request.url);
      const pathname = url.pathname;

      // 2. ROUTING DISPATCHER

      // A. JIKA REQUEST KE API (DATA) - Backend Logic
      if (pathname.startsWith("/api/")) {

        // [JALUR KHUSUS 1] Migrasi Database
        if (pathname.startsWith("/api/migrate/")) {
          return await handleMigrationRequest(request, env);
        }

        // [JALUR KHUSUS 2] Modul Tugas & Remedial (Guru & Siswa)
        if (pathname.startsWith("/api/tasks") ||
          pathname === "/api/student/tasks" ||
          pathname === "/api/student/task-detail" ||
          pathname === "/api/student/submit" ||
          pathname === "/api/student/upload") {

          return await handleTaskRequest(request, env);
        }

        // [JALUR UMUM] Sisa request lainnya (Auth, Dashboard, Absensi, dll)
        return await handleApiRequest(request, env);
      }

      // B. STATIC ASSETS (Frontend React Vite, STAGING V2)
      // Jika binding ASSETS tersedia
      if (env.ASSETS) {
        try {
          // 1. Coba serve file fisik (js, css, png, dll)
          const assetResponse = await env.ASSETS.fetch(request);
          if (assetResponse.status < 400) {
            return assetResponse;
          }

          // 2. SPA Fallback: Serve index.html HANYA untuk route yang sudah dimigrasi ke React
          const spaRoutes = [
            '/',
            '/login',
            '/dashboard',
            '/periods',
            '/classes',
            '/attendance',
            '/schedule',
            '/materials',
            '/tasks',
            '/quizzes'
          ];

          const isSpaRoute = spaRoutes.some(r => pathname === r || pathname.startsWith(r + '/'));

          if (isSpaRoute && !pathname.includes('.')) {
            const indexResponse = await env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
            return indexResponse;
          }
        } catch (e) {
          // Fallback to legacy
        }
      }

      // C. LEGACY FALLBACK
      return await handlePageRequest(request, env);

    } catch (err) {
      // Global Error Handler
      return new Response(JSON.stringify({ error: "Worker Error: " + err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }
};