// pages/api/drive/face-search.js
// AI face search: POST { eventId, selfie } â { matches, total, searched }
// Delegates to lib/ modules â this file is routing + orchestration only.

import { google } from 'googleapis';
import { faceLog } from '../../../lib/logger.js';
import { collectFolderIds, downloadFileBase64, buildPhotoQuery } from '../../../lib/google-drive.js';
import { normalizeSelfie } from '../../../lib/image-processing.js';
import { normalizeLandmarks, bestMatchScore } from '../../../lib/face-search-helpers.js';

export const config = {
  api: { bodyParser: { sizeLimit: '12mb' } },
  maxDuration: 60,
};

const MAX_PHOTOS        = 120;
const VISION_BATCH      = 16;
const SIMILARITY_THRESHOLD = 0.68;

// âââ main handler ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const eventId = req.body?.eventId;
  const selfie  = req.body?.selfie;
  faceLog.info('request_received', {
    eventId,
    selfieKB: selfie ? Math.round(selfie.length * 0.75 / 1024) : 0,
    hasSelfie: !!selfie,
  });

  if (!eventId || !selfie) {
    return res.status(400).json({ error: 'eventId and selfie required' });
  }

  // ââ credentials + auth ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  let credentials;
  try {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    faceLog.info('credentials_parsed', { clientEmail: credentials?.client_email, projectId: credentials?.project_id });
  } catch (e) {
    faceLog.error('credentials_parse_failed', e);
    return res.status(500).json({ error: 'Invalid service account key', step: 'credentials_parse', detail: e.message });
  }

  let auth;
  try {
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/cloud-platform',
      ],
    });
    const tok = await (await auth.getClient()).getAccessToken();
    faceLog.info('auth_ok', { hasToken: !!tok?.token });
  } catch (e) {
    faceLog.error('auth_failed', e);
    return res.status(500).json({ error: 'Google auth failed', step: 'google_auth', detail: e.message });
  }

  const drive  = google.drive({ version: 'v3', auth });
  const vision = google.vision({ version: 'v1', auth });

  // ââ step 1: normalize selfie ââââââââââââââââââââââââââââââââââââââââââââââââââ
  faceLog.info('selfie_normalize_start', {});
  let normalizedSelfieBase64;
  try {
    normalizedSelfieBase64 = await normalizeSelfie(selfie);
    faceLog.info('selfie_normalize_done', { base64Chars: normalizedSelfieBase64.length });
  } catch (e) {
    faceLog.error('selfie_normalize_failed', e);
    return res.status(400).json({
      error: 'à¹à¸¡à¹à¸ªà¸²à¸¡à¸²à¸£à¸à¸à¸£à¸°à¸¡à¸§à¸¥à¸à¸¥à¸£à¸¹à¸à¹à¸à¹ à¸à¸£à¸¸à¸à¸²à¹à¸à¹à¸£à¸¹à¸à¸ à¸²à¸ JPEG à¸«à¸£à¸·à¸­ PNG',
      step: 'selfie_normalize',
      detail: e.message,
    });
  }

  // ââ step 2: detect selfie face ââââââââââââââââââââââââââââââââââââââââââââââââ
  // ââ 2a: HARD VALIDATION of normalizedSelfieBase64 ââââââââââââââââââââââââââââ
  faceLog.info('selfie_payload_inspect', {
    contentLength:   normalizedSelfieBase64?.length ?? 0,
    first50chars:    normalizedSelfieBase64?.slice(0, 50),
    hasDataPrefix:   normalizedSelfieBase64?.startsWith('data:'),
    hasBase64Marker: normalizedSelfieBase64?.startsWith('data:image'),
    isEmpty:         !normalizedSelfieBase64 || normalizedSelfieBase64.length === 0,
    isTooShort:      normalizedSelfieBase64?.length < 100,
  }, { _force: true });

  if (!normalizedSelfieBase64 || normalizedSelfieBase64.length === 0) {
    faceLog.error('selfie_validation_failed', new Error('normalizedSelfieBase64 is empty'), {});
    return res.status(400).json({
      error: 'Selfie base64 is empty after normalization',
      step: 'selfie_payload_validation',
    });
  }
  if (normalizedSelfieBase64.startsWith('data:')) {
    faceLog.error('selfie_validation_failed', new Error('base64 still has data: prefix â stripping'), {
      prefix: normalizedSelfieBase64.slice(0, 80),
    });
    // Strip the data URL prefix as a last-resort fix
    const commaIdx = normalizedSelfieBase64.indexOf(',');
    if (commaIdx !== -1) normalizedSelfieBase64 = normalizedSelfieBase64.slice(commaIdx + 1);
    faceLog.info('selfie_prefix_stripped', { newFirst50: normalizedSelfieBase64.slice(0, 50) }, { _force: true });
  }
  if (normalizedSelfieBase64.length < 100) {
    faceLog.error('selfie_validation_failed', new Error(`base64 too short: ${normalizedSelfieBase64.length} chars`), {});
    return res.status(400).json({
      error: `Selfie base64 suspiciously short (${normalizedSelfieBase64.length} chars)`,
      step: 'selfie_payload_validation',
    });
  }

  // ââ 2b: BUILD and LOG exact Vision API request ââââââââââââââââââââââââââââââââ
  const selfieRequest = {
    image: { content: normalizedSelfieBase64 },
    features: [{ type: 'FACE_DETECTION', maxResults: 5 }],
  };
  faceLog.info('selfie_vision_request_shape', {
    method:             'vision.images.annotate (batchAnnotateImages)',
    requ
