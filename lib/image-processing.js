// lib/image-processing.js
// Image normalization utilities using sharp
// Handles: HEIC, HEIF, WEBP, PNG, JPEG → normalized JPEG
// Always: auto-rotate EXIF, resize to max 1200px, quality 82, strip metadata

import sharp from 'sharp';
import { imageLog } from './logger.js';

/**
 * Normalize a selfie for Vision API consumption.
 * Accepts a base64 data URL (any format) and returns a plain base64 JPEG string.
 *
 * Why normalize?
 *  - Mobile cameras send HEIC/HEIF which Vision API may not accept
 *  - Portrait shots carry EXIF rotation flags that confuse landmark detection
 *  - Full-res 12MP images are large; 1200px is sufficient for face detection
 *  - Stripping metadata reduces payload size
 *
 * @param {string} selfieDataUrl  data:image/<type>;base64,<data>
 * @returns {Promise<string>}     plain base64 JPEG (no data: prefix)
 */
export async function normalizeSelfie(selfieDataUrl) {
  // 1. Parse data URL
  const match = selfieDataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) throw new Error('Invalid selfie data URL - expected data:mime;base64,... format');

  const mimeType    = match[1].toLowerCase();
  const rawBase64   = match[2];
  const inputBuffer = Buffer.from(rawBase64, 'base64');
  const originalKB  = Math.round(inputBuffer.length / 1024);

  imageLog.info('selfie_parse', {
    mimeType,
    originalKB,
    bufferBytes: inputBuffer.length,
    base64Preview: rawBase64.slice(0, 20),
    isEmpty: inputBuffer.length === 0,
  });

  if (inputBuffer.length === 0) {
    throw new Error('Selfie buffer is empty after base64 decode');
  }

  // 2. Read metadata for logging (before transformation)
  try {
    const meta = await sharp(inputBuffer, { failOn: 'none' }).metadata();
    imageLog.info('selfie_sharp_meta', {
      format: meta.format,
      width: meta.width,
      height: meta.height,
      hasExif: !!meta.exif,
      orientation: meta.orientation ?? 'none',
      channels: meta.channels,
    });
  } catch (metaErr) {
    imageLog.warn('selfie_meta_read_failed', { message: metaErr.message });
  }

  // 3. Normalize: rotate -> resize -> JPEG
  let normalized;
  try {
    normalized = await sharp(inputBuffer, { failOn: 'none' })
      .rotate()
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
  } catch (sharpErr) {
    imageLog.error('selfie_sharp_failed', sharpErr, { mimeType, originalKB });
    imageLog.warn('selfie_sharp_fallback', { note: 'sending raw base64 to Vision API' });
    return rawBase64;
  }

  const normalizedKB = Math.round(normalized.length / 1024);
  imageLog.info('selfie_normalized', {
    originalKB,
    normalizedKB,
    compressionRatio: (normalizedKB / originalKB).toFixed(2),
  });

  return normalized.toString('base64');
}

/**
 * Detect the image format from a base64 data URL mime type.
 * Returns a normalized format string for logging/validation.
 *
 * @param {string} dataUrl
 * @returns {string}  e.g. 'jpeg', 'png', 'heic', 'webp', 'unknown'
 */
export function detectFormat(dataUrl) {
  const match = dataUrl.match(/^data:image\/([^;]+);/);
  if (!match) return 'unknown';
  const raw = match[1].toLowerCase();
  if (raw === 'jpg' || raw === 'jpeg') return 'jpeg';
  if (raw === 'heic' || raw === 'heif') return 'heic';
  return raw;
    }
