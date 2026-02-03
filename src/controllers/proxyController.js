// controllers/proxyController.js
// Proxy untuk bypass X-Frame-Options dan Google Drive restrictions

export async function handleProxyRequest(request, env) {
    const url = new URL(request.url);
    let targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
        return new Response("URL parameter required", { status: 400 });
    }

    try {
        // --- GOOGLE DRIVE URL TRANSFORMATION ---
        // Convert various Google Drive URL formats to the most reliable one
        if (targetUrl.includes('drive.google.com')) {
            // Extract file ID from various formats
            let fileId = null;

            // Format: /file/d/{id}/view or /file/d/{id}/preview
            const fileMatch = targetUrl.match(/\/file\/d\/([^/]+)/);
            if (fileMatch) fileId = fileMatch[1];

            // Format: uc?export=view&id={id}
            const ucMatch = targetUrl.match(/[?&]id=([^&]+)/);
            if (!fileId && ucMatch) fileId = ucMatch[1];

            // Format: thumbnail?id={id}
            const thumbMatch = targetUrl.match(/thumbnail\?id=([^&]+)/);
            if (!fileId && thumbMatch) fileId = thumbMatch[1];

            if (fileId) {
                // Use Google Drive thumbnail endpoint (most reliable for public files)
                // sz=w1000 gives us a decent resolution image
                targetUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
            }
        }

        // --- FETCH WITH BROWSER-LIKE HEADERS ---
        const response = await fetch(targetUrl, {
            headers: {
                // Use a common browser User-Agent to avoid blocking
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://drive.google.com/',
            },
            // Cloudflare-specific: follow redirects automatically
            redirect: 'follow',
        });

        // Check if we got an actual image
        const contentType = response.headers.get('Content-Type') || '';

        // If Google returned HTML instead of image (captcha/auth page), try fallback
        if (contentType.includes('text/html') && targetUrl.includes('googleusercontent.com')) {
            // Fallback to thumbnail endpoint
            const fileId = targetUrl.match(/\/d\/([^=]+)/)?.[1];
            if (fileId) {
                const fallbackUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
                const fallbackResponse = await fetch(fallbackUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'image/*',
                        'Referer': 'https://drive.google.com/',
                    },
                    redirect: 'follow',
                });

                if (fallbackResponse.ok) {
                    return buildImageResponse(fallbackResponse);
                }
            }
        }

        return buildImageResponse(response);

    } catch (e) {
        console.error("Proxy Error:", e);
        return new Response("Proxy Error: " + e.message, { status: 500 });
    }
}

// Helper to build the proxied response with proper headers
function buildImageResponse(response) {
    const newHeaders = new Headers(response.headers);

    // Remove restrictive headers
    newHeaders.delete("X-Frame-Options");
    newHeaders.delete("Content-Security-Policy");
    newHeaders.delete("X-Content-Type-Options");

    // Add permissive CORS headers
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");

    // Add caching headers (cache for 1 hour)
    newHeaders.set("Cache-Control", "public, max-age=3600, s-maxage=3600");

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
    });
}
