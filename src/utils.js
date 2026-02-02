// utils.js
// Utility functions: Response formatting, Security Helpers (Crypto) & Rate Limiting

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // Production note: Ganti '*' dengan domain asli jika sudah live
    },
  });
}

// --- SECURITY: CRYPTO HELPER (SHA-256 + SALT) ---

// 1. Generate Random Salt (Hex String)
export function generateSalt(length = 16) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return [...array].map(b => b.toString(16).padStart(2, '0')).join('');
}

// 2. Hash Password (Async) -> SHA-256(password + salt)
export async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt); // Gabungkan pass + salt
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// --- SECURITY: XSS PROTECTION ---

export function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
}

export function safeJsonStringify(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

// --- HELPER: COOKIE PARSER ---
export function getCookieValue(request, name) {
  const cookieString = request.headers.get("Cookie");
  if (!cookieString) return null;
  const match = cookieString.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return match[2];
  return null;
}

// --- SECURITY: RATE LIMITING (KV BASED) ---

const MAX_LOGIN_ATTEMPTS = 10;       // Maksimal 5x salah
const BLOCK_DURATION = 900;         // Blokir 15 Menit (900 detik)

// 1. Cek apakah IP sedang diblokir
export async function checkLoginLimit(env, ip) {
  if (!env.KV) return { allowed: true }; // Bypass jika KV belum dibinding

  const key = `login_fail:${ip}`;
  const count = await env.KV.get(key);

  if (count && parseInt(count) >= MAX_LOGIN_ATTEMPTS) {
      return { allowed: false };
  }
  return { allowed: true };
}

// 2. Catat kegagalan login (Increment Counter)
export async function recordLoginFailure(env, ip) {
  if (!env.KV) return;

  const key = `login_fail:${ip}`;
  let count = await env.KV.get(key);
  
  count = count ? parseInt(count) + 1 : 1;

  // Simpan counter ke KV dengan durasi expired 15 menit
  await env.KV.put(key, count.toString(), { expirationTtl: BLOCK_DURATION });
}

// 3. Reset jika login sukses (Hapus Counter)
export async function resetLoginFailures(env, ip) {
  if (!env.KV) return;
  await env.KV.delete(`login_fail:${ip}`);
}