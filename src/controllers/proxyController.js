// controllers/proxyController.js
// Proxy untuk bypass X-Frame-Options dsb di Client (Iframe)

export async function handleProxyRequest(request, env) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
        return new Response("URL parameter required", { status: 400 });
    }

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Alkemia-Worker-Proxy/1.0'
            }
        });

        const newHeaders = new Headers(response.headers);

        // 1. Remove Restrictive Headers
        newHeaders.delete("X-Frame-Options");
        newHeaders.delete("Content-Security-Policy");
        newHeaders.delete("X-Content-Type-Options");

        // 2. Add Permissive Headers
        newHeaders.set("Access-Control-Allow-Origin", "*");
        newHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
        });

    } catch (e) {
        return new Response("Proxy Error: " + e.message, { status: 500 });
    }
}
