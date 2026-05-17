// pages/api/drive/face-search.js
// AI face search: POST { eventId, selfie } → { matches, total, searched, cacheHit? }
// Delegates to lib/ modules — this file is routing + orchestration only.

import { google } from 'googleapis';
import { faceLog } from '../../../lib/logger.js';
import { collectFolderIds, downloadFileBase64, buildPhotoQuery } from '../../../lib/google-drive.js';
import { normalizeSelfie } from '../../../lib/image-processing.js';
import { normalizeLandmarks, bestMatchScore } from '../../../lib/face-search-helpers.js';
import { hashSelfie, readCache, writeCache } from '../../../lib/face-search-cache.js';

export const config = {
  api: { bodyParser: { sizeLimit: '12mb' } },
  maxDuration: 60,
};

const MAX_PHOTOS        = 120;
const VISION_BATCH      = 16;
const SIMILARITY_THRESHOLD = 0.68;

// ─── main handler ──────────────────────────────────────────────────────────────
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

  // ── credentials + auth ────────────────────────────────────────────────────────
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

  // ── step 1: normalize selfie ──────────────────────────────────────────────────
  faceLog.info('selfie_normalize_start', {});
  let normalizedSelfieBase64;
  try {
    normalizedSelfieBase64 = await normalizeSelfie(selfie);
    faceLog.info('selfie_normalize_done', { base64Chars: normalizedSelfieBase64.length });
  } catch (e) {
    faceLog.error('selfie_normalize_failed', e);
    return res.status(400).json({
      error: 'ไม่สามารถประมวลผลรูปได้ กรุณาใช้รูปภาพ JPEG หรือ PNG',
      step: 'selfie_normalize',
      detail: e.message,
    });
  }

  // ── step 2: detect selfie face ────────────────────────────────────────────────
  // ── 2a: HARD VALIDATION of normalizedSelfieBase64 ────────────────────────────
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
    faceLog.error('selfie_validation_failed', new Error('base64 still has data: prefix — stripping'), {
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

  // ── 2b: hash selfie + cache lookup ───────────────────────────────────────────
  // Hash is computed from the normalized buffer (post-sharp) so HEIC and JPEG
  // versions of the same photo produce the same hash.
  const selfieBuffer = Buffer.from(normalizedSelfieBase64, 'base64');
  const selfieHash   = hashSelfie(selfieBuffer);
  faceLog.info('selfie_hash', { hash: selfieHash.slice(0, 16), eventId }, { _force: true });

  const cached = await readCache(eventId, selfieHash);
  if (cached) {
    faceLog.info('cache_serving_response', {
      matchCount: cached.matches.length,
      searched:   cached.searched,
      cachedAt:   cached.createdAt,
    }, { _force: true });
    return res.status(200).json({
      matches:  cached.matches,
      total:    cached.matches.length,
      searched: cached.searched,
      cacheHit: true,
      cachedAt: cached.createdAt,
    });
  }

  // ── 2c: BUILD and LOG exact Vision API request ────────────────────────────────
  const selfieRequest = {
    image: { content: normalizedSelfieBase64 },
    features: [{ type: 'FACE_DETECTION', maxResults: 5 }],
  };
  faceLog.info('selfie_vision_request_shape', {
    method:             'vision.images.annotate (batchAnnotateImages)',
    requestCount:       1,
    imageKeys:          Object.keys(selfieRequest.image),
    contentLength:      selfieRequest.image.content.length,
    contentFirst50:     selfieRequest.image.content.slice(0, 50),
    contentHasPrefix:   selfieRequest.image.content.startsWith('data:'),
    features:           JSON.stringify(selfieRequest.features),
  }, { _force: true });

  faceLog.info('selfie_detection_start', {});
  let selfieMarks;
  try {
    const selfieVision = await vision.images.annotate({
      requestBody: { requests: [selfieRequest] },
    });

    const rawResponse = selfieVision.data.responses?.[0];
    const visionErr   = rawResponse?.error;
    const selfieFaces = rawResponse?.faceAnnotations || [];

    faceLog.info('selfie_vision_response', {
      httpStatus:    selfieVision.status,
      responseKeys:  rawResponse ? Object.keys(rawResponse) : [],
      faceCount:     selfieFaces.length,
      visionErr:     visionErr || null,
      visionErrCode: visionErr?.code ?? null,
      visionErrMsg:  visionErr?.message ?? null,
    }, { _force: true });

    if (visionErr) throw new Error(`Vision API error: ${visionErr.message} (code ${visionErr.code})`);
    if (selfieFaces.length === 0) {
      faceLog.info('selfie_no_face', {});
      return res.status(400).json({ error: 'ไม่พบใบหน้าในรูปที่อัปโหลด กรุณาใช้รูปที่เห็นใบหน้าชัดเจน' });
    }

    selfieMarks = normalizeLandmarks(selfieFaces[0].landmarks, selfieFaces[0].boundingPoly);
    faceLog.info('selfie_landmarks_normalized', { landmarkCount: selfieMarks.length });
  } catch (e) {
    faceLog.error('selfie_vision_api_failed', e, {
      errorName:    e.name,
      errorMessage: e.message,
      errorCode:    e.code,
      errorStatus:  e.status,
      errorDetails: e.errors ? JSON.stringify(e.errors) : null,
    });
    return res.status(500).json({
      error:  'Vision API failed on selfie',
      step:   'selfie_face_detection',
      detail: e.message,
      code:   e.code ?? null,
    });
  }

  // ── step 3: folder discovery ──────────────────────────────────────────────────
  faceLog.info('folder_scan_start', { eventId });
  let folderIds;
  try {
    folderIds = await collectFolderIds(drive, eventId, { maxDepth: 2, maxFolders: 20 });
    faceLog.info('folder_scan_done', { folderCount: folderIds.length });
  } catch (e) {
    faceLog.error('folder_scan_failed', e, { eventId });
    return res.status(500).json({ error: 'Failed to scan event folders', step: 'folder_scan', detail: e.message });
  }

  // ── step 4: list photos ───────────────────────────────────────────────────────
  let photos;
  try {
    const q = buildPhotoQuery(folderIds);
    faceLog.info('photo_list_query', { q });
    const photosRes = await drive.files.list({
      q,
      fields: 'files(id,name,mimeType)',
      pageSize: MAX_PHOTOS,
      orderBy: 'name',
    });
    photos = photosRes.data.files || [];
    faceLog.info('photo_list_done', {
      count: photos.length,
      sample: photos.slice(0, 3).map(p => ({ name: p.name, mimeType: p.mimeType })),
    });
  } catch (e) {
    faceLog.error('photo_list_failed', e);
    return res.status(500).json({ error: 'Failed to list photos', step: 'photo_list', detail: e.message });
  }

  if (photos.length === 0) {
    faceLog.info('no_photos_found', {});
    return res.status(200).json({ matches: [], total: 0, searched: 0 });
  }

  // ── step 5: batch download + Vision comparison ────────────────────────────────
  const matches      = [];
  const totalBatches = Math.ceil(photos.length / VISION_BATCH);

  for (let i = 0; i < photos.length; i += VISION_BATCH) {
    const batchNum = Math.floor(i / VISION_BATCH) + 1;
    const batch    = photos.slice(i, i + VISION_BATCH);
    const t0 = Date.now();
    faceLog.info('batch_start', { batchNum, total: totalBatches, size: batch.length });

    // parallel thumbnail downloads
    const base64Results = await Promise.allSettled(
      batch.map(p => downloadFileBase64(drive, auth, p.id))
    );
    const successCount = base64Results.filter(r => r.status === 'fulfilled' && r.value).length;
    faceLog.info('batch_download_done', { batchNum, successCount, failCount: batch.length - successCount });

    // build Vision batch request
    const visionRequests = [];
    const batchIndex     = [];
    for (let j = 0; j < base64Results.length; j++) {
      const b64 = base64Results[j].status === 'fulfilled' ? base64Results[j].value : null;
      if (b64) {
        visionRequests.push({ image: { content: b64 }, features: [{ type: 'FACE_DETECTION', maxResults: 10 }] });
        batchIndex.push(j);
      }
    }

    if (visionRequests.length === 0) { faceLog.info('batch_no_valid_images', { batchNum }); continue; }
    faceLog.info('vision_batch_request', { batchNum, requestCount: visionRequests.length });

    try {
      const vRes      = await vision.images.annotate({ requestBody: { requests: visionRequests } });
      const responses = vRes.data.responses || [];
      faceLog.info('vision_batch_response', {
        batchNum,
        responseCount: responses.length,
        errors: responses.filter(r => r.error).map(r => r.error),
      });

      for (let r = 0; r < responses.length; r++) {
        const photo = batch[batchIndex[r]];
        if (responses[r].error) {
          faceLog.warn('vision_response_error', { fileId: photo.id, error: responses[r].error });
          continue;
        }
        const score = bestMatchScore(selfieMarks, responses[r].faceAnnotations);
        faceLog.info('face_comparison', { name: photo.name, faces: (responses[r].faceAnnotations||[]).length, score: score.toFixed(3) });
        if (score >= SIMILARITY_THRESHOLD) {
          matches.push({
            id: photo.id,
            name: photo.name,
            score,
            thumbnailUrl: `/api/drive/photo?fileId=${photo.id}&size=thumb`,
            downloadUrl:  `/api/drive/photo?fileId=${photo.id}`,
          });
          faceLog.info('match_found', { name: photo.name, score: score.toFixed(3) });
        }
      }
    } catch (e) {
      faceLog.error('vision_batch_api_failed', e, { batchNum });
    }

    faceLog.perf('batch_complete', t0, { batchNum, matchesSoFar: matches.length });
  }

  matches.sort((a, b) => b.score - a.score);
  faceLog.info('search_complete', { totalMatches: matches.length, searched: photos.length }, { _force: true });

  // ── step 6: write cache (fire-and-forget, non-blocking) ───────────────────────
  writeCache(eventId, selfieHash, matches, photos.length).catch(() => {});

  return res.status(200).json({ matches, total: matches.length, searched: photos.length });
}
