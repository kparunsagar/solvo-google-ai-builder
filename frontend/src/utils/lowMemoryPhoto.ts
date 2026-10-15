/**
 * Low-Memory Photo Capture & Progressive Downsampling Utility
 * Purpose: Prevents mobile browser Out-Of-Memory (OOM) crashes when technicians
 * take 12MP-50MP smartphone camera photos on budget Android devices.
 * 
 * Memory Profile:
 * Raw 48MP camera photo in memory = ~192 MB RAM (Triggers mobile browser tab crash)
 * Downsampled through lowMemoryPhoto = < 3.5 MB RAM (Runs silky smooth on 2GB RAM phones)
 */

export interface CompressPhotoOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 to 1.0 (default 0.75)
  format?: 'image/jpeg' | 'image/webp';
}

/**
 * Compresses a File, Blob, or Data URL safely with minimal RAM footprint.
 * Uses native createImageBitmap off-thread downsampling where supported,
 * with progressive fallback to revoked Object URLs.
 */
export async function compressPhotoLowMemory(
  source: File | Blob | string,
  options: CompressPhotoOptions = {}
): Promise<string> {
  const maxWidth = options.maxWidth || 800;
  const maxHeight = options.maxHeight || 1060;
  const quality = options.quality ?? 0.75;
  const format = options.format || 'image/jpeg';

  // 1. If input is already a string (data URL), check length.
  if (typeof source === 'string' && source.startsWith('data:')) {
    // If it's already reasonably compact (< 200KB), return as is
    if (source.length < 250000) {
      return source;
    }
  }

  // 2. Convert File/Blob or string to Blob
  let blob: Blob;
  if (typeof source === 'string') {
    blob = dataUrlToBlob(source);
  } else {
    blob = source;
  }

  // 3. Try Native createImageBitmap with hardware downsampling (lowest memory)
  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    try {
      // Decode and downscale directly in native C++ layer without V8 heap allocation
      const bitmap = await (createImageBitmap as any)(blob, {
        resizeWidth: maxWidth,
        resizeQuality: 'medium'
      });

      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d', { alpha: false });

      if (ctx) {
        ctx.drawImage(bitmap, 0, 0);
        // Explicitly close native bitmap to free GPU memory immediately
        if (typeof bitmap.close === 'function') {
          bitmap.close();
        }
        const result = canvas.toDataURL(format, quality);
        // Free canvas
        canvas.width = 0;
        canvas.height = 0;
        return result;
      }
      if (typeof bitmap.close === 'function') {
        bitmap.close();
      }
    } catch (bitmapErr) {
      console.warn('[LowMemoryPhoto] createImageBitmap resize fallback, trying object URL:', bitmapErr);
    }
  }

  // 4. Fallback: Zero-heap Object URL with immediate revocation
  return new Promise<string>((resolve) => {
    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(blob);
    } catch {
      resolve('');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const cleanup = () => {
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
      }
      img.onload = null;
      img.onerror = null;
      img.src = '';
    };

    img.onload = () => {
      try {
        let w = img.naturalWidth || img.width || maxWidth;
        let h = img.naturalHeight || img.height || maxHeight;

        // Calculate aspect-preserving target dimensions
        if (w > maxWidth || h > maxHeight) {
          const ratio = Math.min(maxWidth / w, maxHeight / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { alpha: false });

        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL(format, quality);
          canvas.width = 0;
          canvas.height = 0;
          cleanup();
          resolve(dataUrl);
          return;
        }
      } catch (err) {
        console.warn('[LowMemoryPhoto] Canvas draw error, retrying at 480px:', err);
        // Emergency ultra-low-memory fallback at 480px
        try {
          const smallCanvas = document.createElement('canvas');
          smallCanvas.width = 480;
          smallCanvas.height = 640;
          const sCtx = smallCanvas.getContext('2d');
          if (sCtx) {
            sCtx.drawImage(img, 0, 0, 480, 640);
            const lowRes = smallCanvas.toDataURL('image/jpeg', 0.65);
            cleanup();
            resolve(lowRes);
            return;
          }
        } catch {}
      }

      cleanup();
      resolve('');
    };

    img.onerror = () => {
      cleanup();
      resolve('');
    };

    img.src = objectUrl;
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binStr = atob(parts[1] || '');
  const len = binStr.length;
  const u8arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    u8arr[i] = binStr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}
