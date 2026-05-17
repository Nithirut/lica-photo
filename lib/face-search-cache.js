// lib/face-search-cache.js
// Face search result cache backed by Vercel KV (Redis).
//
// WHY KV?
//  - Persistent across cold starts (unlike /tmp)
//  - Shared across all function instances in parallel
//  - ~1ms read latency vs ~10-30s Vision API scan
//  - Native TTL support â no manual expiry cleanup needed
//
// SECURITY: only stores selfie hash + match metadata, NEVER raw selfie images.
//
// KEY SCHEMA: face-search:{eventId}:{sha256hex}
// VALUE: { eventId, hash, matches, searched, createdAt }

import { createHash } from 'crypto';
import { kv } from '@vercel/kv';
import { faceLog } from './logger.js';

// âââ config ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;   // 7 days
const KEY_PREFIX        = 'face-search';

// âââ helpers âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

/**
 * Generate a stable SHA-256 hash from the normalized selfie buffer.
 * IMPORTANT: hash AFTER normalization so format differences (HEIC vs JPEG)
 * for the same photo produce the same hash.
 *
 * @param {Buffer} normalizedBuffer   raw JPEG buffer from sharp normalization
 * @returns {string}                  64-char lowercase hex string
 */
export function hashSelfie(normalizedBuffer) {
  return createHash('sha256').update(normalizedBuffer).digest('hex');
}

/**
 * Build the KV key for a given event + selfie hash.
 * @param {string} eventId
 * @param {string} hash
 * @returns {string}
 */
function cacheKey(eventId, hash) {
  return `${KEY_PREFIX}:${eventId}:${hash}`;
}

// âââ public API ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

/**
 * Read a cached face search result.
 * Returns null if not found, expired, or KV unavailable (non-fatal).
 *
 * @param {string} eventId
 * @param {string} hash
 * @returns {Promise<object|null>}
 */
export async function readCache(eventId, hash) {
  try {
    const entry = await kv.get(cacheKey(eventId, hash));
    if (!entry) {
      faceLog.info('cache_miss', { eventId, hash: hash.slice(0, 12) });
      return null;
    }
    faceLog.info('cache_hit', {
      eventId,
      hash:       hash.slice(0, 12),
      matchCount: entry.matches?.length ?? 0,
      searched:   entry.searched ?? 0,
      cachedAt:   entry.createdAt,
    }, { _force: true });
    return entry;
  } catch (e) {
    // KV unavailable or misconfigured â fall through to live Vision API scan.
    // This makes caching a pure performance optimization, never a hard dependency.
    faceLog.warn('cache_read_error', {
      message: e.message,
      note:    'falling through to Vision API scan',
    });
    return null;
  }
}

/**
 * Write face search results to KV cache.
 * Fire-and-forget safe â failures are logged but never thrown.
 *
 * @param {string}   eventId
 * @param {string}   hash
 * @param {object[]} matches    array of { id, name, score, thumbnailUrl, downloadUrl }
 * @param {number}   searched   total photos scanned (for UI display)
 * @returns {Promise<void>}
 */
export async function writeCache(eventId, hash, matches, searched) {
  try {
    const entry = {
      eventId,
      hash,
      matches,   // full match objects â no raw selfie data stored
      searched,
      createdAt: new Date().toISOString(),
    };
    await kv.set(cacheKey(eventId, hash), entry, { ex: CACHE_TTL_SECONDS });
    faceLog.info('cache_written', {
      eventId,
      hash:       hash.slice(0, 12),
      matchCount: matches.length,
      searched,
      ttlDays:    CACHE_TTL_SECONDS / 86400,
    });
  } catch (e) {
    // Non-fatal â search result was already returned to the user.
    faceLog.warn('cache_write_error', { message: e.message });
  }
}

/**
 * Invalidate all cached results for an event.
 * Useful when new photos are added to an event folder.
 * NOTE: KV does not support pattern-based deletion natively.
 * This is a placeholder for a future scan-and-delete implementation.
 *
 * @param {string} eventId
 * @returns {Promise<void>}
 */
export async function invalidateEvent(eventId) {
  // Future: use kv.scan() to find and delete all keys matching face-search:{eventId}:*
  // For now, results naturally expire after CACHE_TTL_SECONDS.
  faceLog.info('cache_invalidate_noop', {
    eventId,
    note: 'manual invalidation not yet implemented; cache expires after 7 days',
  });
}
