// lib/logger.js
// Centralized structured logger for LICA Photo
// Usage: const log = createLogger('FACE SEARCH')
//        log.info('step_name', { key: value })
//        log.error('step_name', err, { extra: data })
//        log.perf('step_name', startMs)

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Create a namespaced logger.
 * @param {string} namespace  e.g. 'FACE SEARCH', 'GOOGLE DRIVE', 'IMAGE PROC'
 */
export function createLogger(namespace) {
  const tag = `[${namespace}]`;

  function _serialize(level, step, data) {
    return JSON.stringify({ tag, level, step, ts: new Date().toISOString(), ...data });
  }

  return {
    /** Informational — suppressed in production unless data._force = true */
    info(step, data = {}) {
      if (IS_PROD && !data._force) return;
      console.log(_serialize('info', step, data));
    },
    /** Warning — always logged */
    warn(step, data = {}) {
      console.warn(_serialize('warn', step, data));
    },
    /** Error — always logged, includes stack in dev */
    error(step, err, extra = {}) {
      console.error(_serialize('error', step, {
        message: err?.message || String(err),
        code: err?.code || err?.status || undefined,
        stack: !IS_PROD ? (err?.stack || undefined) : undefined,
        ...extra,
      }));
    },
    /** Perf timing — only logs if duration >= threshold (500ms prod, 0ms dev) */
    perf(step, startMs, data = {}) {
      const duration_ms = Date.now() - startMs;
      if (duration_ms < (IS_PROD ? 500 : 0)) return;
      console.log(_serialize('perf', step, { duration_ms, ...data }));
    },
  };
}

// Pre-built loggers — import these directly across API routes
export const driveLog   = createLogger('GOOGLE DRIVE');
export const faceLog    = createLogger('FACE SEARCH');
export const imageLog   = createLogger('IMAGE PROC');
export const apiLog     = createLogger('API');
export const galleryLog = createLogger('GALLERY');
