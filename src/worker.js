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

      // B. JIKA REQUEST KE HALAMAN (TAMPILAN HTML)
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