// utils/imageCompressor.js
// Client-side image compression using Canvas API

/**
 * Compress and resize an image file
 * @param {File} file - The image file to compress
 * @param {Object} options - Compression options
 * @param {number} options.maxWidth - Maximum width (default: 1200)
 * @param {number} options.maxSizeKB - Target max size in KB (default: 500)
 * @param {number} options.quality - JPEG quality 0-1 (default: 0.8)
 * @returns {Promise<{blob: Blob, width: number, height: number, originalSize: number, compressedSize: number}>}
 */
export async function compressImage(file, options = {}) {
    const {
        maxWidth = 1200,
        maxSizeKB = 500,
        quality = 0.8
    } = options;

    const maxSizeBytes = maxSizeKB * 1024;
    const originalSize = file.size;

    // Skip compression if already small enough
    if (originalSize <= maxSizeBytes) {
        return {
            blob: file,
            width: 0, // Unknown without loading
            height: 0,
            originalSize,
            compressedSize: originalSize,
            skipped: true
        };
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
            // Calculate new dimensions
            let { width, height } = img;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            // Draw resized image
            ctx.drawImage(img, 0, 0, width, height);

            // Determine output format
            const isPNG = file.type === 'image/png';
            const mimeType = isPNG ? 'image/png' : 'image/jpeg';

            // Try compression with decreasing quality
            const tryCompress = (currentQuality) => {
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Failed to compress image'));
                            return;
                        }

                        // If still too large and we can reduce quality more
                        if (blob.size > maxSizeBytes && currentQuality > 0.5 && !isPNG) {
                            tryCompress(currentQuality - 0.1);
                            return;
                        }

                        // If still too large, try smaller dimensions
                        if (blob.size > maxSizeBytes && width > 800) {
                            const smallerWidth = Math.round(width * 0.8);
                            const smallerHeight = Math.round(height * 0.8);
                            canvas.width = smallerWidth;
                            canvas.height = smallerHeight;
                            ctx.drawImage(img, 0, 0, smallerWidth, smallerHeight);
                            canvas.toBlob(
                                (smallerBlob) => {
                                    resolve({
                                        blob: smallerBlob || blob,
                                        width: smallerWidth,
                                        height: smallerHeight,
                                        originalSize,
                                        compressedSize: smallerBlob?.size || blob.size,
                                        skipped: false
                                    });
                                },
                                mimeType,
                                isPNG ? undefined : currentQuality
                            );
                            return;
                        }

                        resolve({
                            blob,
                            width,
                            height,
                            originalSize,
                            compressedSize: blob.size,
                            skipped: false
                        });
                    },
                    mimeType,
                    isPNG ? undefined : currentQuality
                );
            };

            tryCompress(quality);
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Format bytes to human readable string
 */
export function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Generate a unique filename for R2 storage
 */
export function generateImageFilename(originalName) {
    const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `img_${timestamp}_${random}.${ext}`;
}
