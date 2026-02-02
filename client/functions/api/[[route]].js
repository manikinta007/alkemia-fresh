// functions/api/[[route]].js
// Adapter for Cloudflare Pages Functions to use existing Worker logic

import worker from '../../src/worker-fresh.js';

export const onRequest = async (context) => {
    // Adapter: context.request is a standard Request object
    // context.env contains bindings (DB, KV, R2)

    // Call the original worker's fetch method
    // Note: worker-fresh.js default export has a async fetch(request, env) method
    return await worker.fetch(context.request, context.env);
};
