// client/src/utils/api.js

let csrfToken = null;
let user = null;

// Detect environment
const IS_PROD = import.meta.env.PROD || window.location.hostname !== 'localhost';
const API_BASE_URL = ''; // Unified Deployment: Always relative path!
// const API_BASE_URL = IS_PROD ? 'https://alkemia-fresh.altratimuri.workers.dev' : '';

// Initialize session (fetch CSRF token)
export const initSession = async () => {
    try {
        // Must include credentials to send the httpOnly cookie
        const res = await fetch(`${API_BASE_URL}/api/auth/session`, { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            csrfToken = data.csrfToken;
            user = data.user;
            // Also store user in localStorage for non-critical UI updates if needed
            if (user) localStorage.setItem('user', JSON.stringify(user));
            return user;
        } else if (res.status === 401) {
            // Clear local user if session invalid
            user = null;
            csrfToken = null;
            localStorage.removeItem('user');
        }
    } catch (e) {
        console.error("Failed to init session", e);
    }
    return null;
};

export const getCsrfToken = () => csrfToken;
export const getUser = () => user; // Helper to get current user

// Wrapper for fetch that handles CSRF and Credentials
export const fetchApi = async (endpoint, options = {}) => {
    // Ensure credentials are sent
    options.credentials = 'include';
    options.headers = options.headers || {};

    // Auto-inject JSON content type if body exists and is not FormData
    if (options.body && typeof options.body === 'string' && !options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
    }

    // Inject CSRF Token for mutation requests
    const method = options.method?.toUpperCase() || 'GET';
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        if (!csrfToken) {
            // Try to fetch token if missing
            await initSession();
        }
        if (csrfToken) {
            options.headers['X-CSRF-Token'] = csrfToken;
        }
    }

    // Prepend API_BASE_URL if endpoint starts with /
    const url = endpoint.startsWith('/') ? `${API_BASE_URL}${endpoint}` : endpoint;

    const res = await fetch(url, options);

    // Global Error Handling
    if (res.status === 401) {
        // Redirect to login if unauthorized and not already on login page
        if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
        }
    }

    return res;
};
