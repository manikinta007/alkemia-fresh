// utils/imageUtils.js
// Utility functions for handling Google Drive and other image URLs

/**
 * Extract Google Drive file ID from various URL formats
 */
function extractGoogleDriveFileId(url) {
    if (!url || !url.includes('drive.google.com') && !url.includes('googleusercontent.com')) {
        return null;
    }

    // Format: /file/d/{id}/view or /file/d/{id}/preview
    const fileMatch = url.match(/\/file\/d\/([^/]+)/);
    if (fileMatch) return fileMatch[1];

    // Format: /d/{id} (lh3.googleusercontent.com)
    const lh3Match = url.match(/\/d\/([^=?&/]+)/);
    if (lh3Match) return lh3Match[1];

    // Format: ?id={id} or &id={id}
    const idMatch = url.match(/[?&]id=([^&]+)/);
    if (idMatch) return idMatch[1];

    // Format: /uc?export=view&id={id}
    const ucMatch = url.match(/id=([^&]+)/);
    if (ucMatch) return ucMatch[1];

    return null;
}

/**
 * Convert a Google Drive URL to proxy URL
 */
export function convertToProxyUrl(url) {
    const fileId = extractGoogleDriveFileId(url);
    if (!fileId) return url; // Return original if not a Google Drive URL

    // Use thumbnail endpoint via proxy (most reliable)
    const driveUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    return `/api/proxy?url=${encodeURIComponent(driveUrl)}`;
}

/**
 * Transform all Google Drive image URLs in HTML content to use proxy
 * This is essential for rendering stored HTML with embedded images
 */
export function transformImageUrls(html) {
    if (!html || typeof html !== 'string') return html;

    // Regex to find img tags with src attribute
    const imgRegex = /<img\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi;

    return html.replace(imgRegex, (match, before, src, after) => {
        // Check if it's a Google Drive URL that needs transformation
        if (src.includes('drive.google.com') || src.includes('googleusercontent.com')) {
            const proxyUrl = convertToProxyUrl(src);
            // Add onerror handler to show placeholder on failure
            const errorHandler = `onerror="this.onerror=null;this.src='/placeholder-image.svg';this.alt='Gambar gagal dimuat'"`;
            return `<img ${before}src="${proxyUrl}" ${after} ${errorHandler}>`;
        }

        // Also transform proxy URLs that might have old format
        if (src.includes('/api/proxy?url=')) {
            try {
                const urlParam = new URLSearchParams(src.split('?')[1]).get('url');
                if (urlParam && (urlParam.includes('drive.google.com') || urlParam.includes('googleusercontent.com'))) {
                    const proxyUrl = convertToProxyUrl(decodeURIComponent(urlParam));
                    const errorHandler = `onerror="this.onerror=null;this.src='/placeholder-image.svg';this.alt='Gambar gagal dimuat'"`;
                    return `<img ${before}src="${proxyUrl}" ${after} ${errorHandler}>`;
                }
            } catch (e) {
                // If parsing fails, return original
            }
        }

        return match;
    });
}

/**
 * Process quiz/task content before rendering
 * Applies all necessary transformations
 */
export function processContentForDisplay(html) {
    return transformImageUrls(html);
}

// ========== OFFLINE IMAGE CACHING ==========

/**
 * Extract all image URLs from HTML content
 */
function extractImageUrls(html) {
    if (!html || typeof html !== 'string') return [];

    const urls = [];
    const imgRegex = /<img\s+[^>]*?src=["']([^"']+)["'][^>]*>/gi;
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
        urls.push(match[1]);
    }

    return urls;
}

/**
 * Download image and convert to base64 data URI
 * Uses the proxy endpoint to bypass CORS
 */
async function downloadImageAsBase64(imageUrl, proxyBaseUrl = '') {
    try {
        // Convert to proxy URL if it's a Google Drive URL
        let fetchUrl = imageUrl;
        if (imageUrl.includes('drive.google.com') || imageUrl.includes('googleusercontent.com')) {
            fetchUrl = convertToProxyUrl(imageUrl);
        }

        // Make sure proxy URL is absolute
        if (fetchUrl.startsWith('/api/proxy')) {
            fetchUrl = proxyBaseUrl + fetchUrl;
        }

        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error('Failed to fetch image');

        const blob = await response.blob();

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.warn('Failed to cache image:', imageUrl, error);
        return null;
    }
}

/**
 * Cache all images in HTML content as base64
 * Returns HTML with image URLs replaced by base64 data URIs
 */
export async function cacheImagesInContent(html, onProgress) {
    if (!html || typeof html !== 'string') return html;

    const imageUrls = extractImageUrls(html);
    const uniqueUrls = [...new Set(imageUrls)];

    if (uniqueUrls.length === 0) return html;

    const urlToBase64Map = new Map();
    let processed = 0;

    // Download all images in parallel (with limit)
    const batchSize = 3;
    for (let i = 0; i < uniqueUrls.length; i += batchSize) {
        const batch = uniqueUrls.slice(i, i + batchSize);
        const results = await Promise.all(
            batch.map(async (url) => {
                const base64 = await downloadImageAsBase64(url);
                return { url, base64 };
            })
        );

        results.forEach(({ url, base64 }) => {
            if (base64) urlToBase64Map.set(url, base64);
        });

        processed += batch.length;
        if (onProgress) onProgress(processed / uniqueUrls.length);
    }

    // Replace URLs with base64 in HTML
    let result = html;
    urlToBase64Map.forEach((base64, url) => {
        // Escape special regex characters in URL
        const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result.replace(new RegExp(escapedUrl, 'g'), base64);
    });

    return result;
}

/**
 * Process questions array and cache all images as base64
 * Used during offline package download
 */
export async function cacheQuestionsImages(questions, onProgress) {
    const totalImages = questions.reduce((acc, q) => {
        const urls = extractImageUrls(q.question_text || '');
        ['option_a', 'option_b', 'option_c', 'option_d', 'option_e'].forEach(opt => {
            urls.push(...extractImageUrls(q[opt] || ''));
        });
        return acc + urls.length;
    }, 0);

    let processedImages = 0;
    const cachedQuestions = [];

    for (const q of questions) {
        const cachedQ = { ...q };

        // Cache question_text images
        cachedQ.question_text = await cacheImagesInContent(q.question_text, (p) => {
            if (onProgress) onProgress((processedImages + p) / Math.max(totalImages, 1));
        });
        processedImages += extractImageUrls(q.question_text || '').length;

        // Cache option images
        for (const opt of ['option_a', 'option_b', 'option_c', 'option_d', 'option_e']) {
            if (q[opt]) {
                cachedQ[opt] = await cacheImagesInContent(q[opt], (p) => {
                    if (onProgress) onProgress((processedImages + p) / Math.max(totalImages, 1));
                });
                processedImages += extractImageUrls(q[opt] || '').length;
            }
        }

        cachedQuestions.push(cachedQ);
    }

    return cachedQuestions;
}
