// pages/api/drive/face-search.js
// AI face search: selfie normalization (sharp) + thumbnail-first + Vision batching + recursive folders
import { google } from 'googleapis';
import sharp from 'sharp';

export const config = {
  api: { bodyParser: { sizeLimit: '12mb' } },
  maxDuration: 60,
};

const MAX_DEPTH = 2;
const MAX_FOLDERS = 20;
const MAX_PHOTOS = 120;
const VISION_BATCH = 16;
const SIMILARITY_THRESHOLD = 0.68;

// ─── structured logger ─────────────────────────────────────────────────────────
function log(step, data) {
  console.log(JSON.stringify({ tag: '[FACE SEARCH]', step, ...data }));
}
function logErr(step, err, extra) {
  console.error(JSON.stringify({
    tag: '[FACE SEARCH ERROR]',
    step,
    message: err?.message || String(err),
    code: err?.code || err?.status || undefined,
    ...extra,
  }));
}

// ─── selfie normalization ──────────────────────────────────────────────────────
// Accepts any format (HEIC, HEIF, WEBP, PNG, JPEG) → JPEG 1200px max, quality 82
// Also auto-rotates EXIF and strips metadata
async function normalizeSelfie(selfieDataUrl) {
  const match = selfieDataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) throw new Error('Invalid selfie data URL — expected data:mime;base64,... format');

  const mimeType = match[1].toLowerCase();
  const rawBase64 = match[2];
  const inputBuffer = Buffer.from(rawBase64, 'base64');
  const originalKB = Math.round(inputBuffer.length / 1024);

  log('selfie_parse', {
    mimeType,
    originalKB,
    base64Chars: rawBase64.length,
    bufferBytes: inputBuffer.length,
    base64Preview: rawBase64.slice(0, 20),
    isBufferEmpty: inputBuffer.length === 0,
  });

  if (inputBuffer.length === 0) throw new Error('Selfie buffer is empty after base64 decode');

  let normalized;
  try {
    const meta = await sharp(inputBuffer, { failOn: 'none' }).metadata();
    log('selfie_sharp_meta', {
      format: meta.format,
      width: meta.width,
      height: meta.height,
      hasExif: !!meta.exif,
      orientation: meta.orientation || 'none',
    });

    normalized = await sharp(inputBuffer, { failOn: 'none' })
      .rotate()
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
  } catch (sharpErr) {
    logErr('selfie_sharp_failed', sharpErr, { mimeType, originalKB });
    log('selfie_sharp_fallback', { mimeType });
    return rawBase64;
  }

  const normalizedKB = Math.round(normalized.length / 1024);
  log('selfie_normalized', { originalKB, normalizedKB, compressionRatio: (normalizedKB / originalKB).toFixed(2) });
  return normalized.toString('base64');
}

// ─── folder traversal ──────────────────────────────────────────────────────────
async function collectFolderIds(drive, rootId) {
  const ids = [rootId];
  async function scan(folderId, depth) {
    if (depth >= MAX_DEPTH || ids.length >= MAX_FOLDERS) return;
    try {
      const res = await drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id,name)',
        pageSize: 20,
      });
      const subs = res.data.files || [];
      log('subfolder_scan', { parentId: folderId, depth, found: subs.map(s => s.name) });
      await Promise.all(subs.map(async (sf) => {
        if (ids.length < MAX_FOLDERS) { ids.push(sf.id); await scan(sf.id, depth + 1); }
      }));
    } catch (e) { logErr('subfolder_scan_failed', e, { folderId, depth }); }
  }
  await scan(rootId, 0);
  return ids;
}

// ─── face geometry helpers ─────────────────────────────────────────────────────
function normalizeLandmarks(landmarks, box) {
  if (!landmarks || !box || !box.vertices || box.vertices.length < 3) return [];
  var x0 = box.vertices[0]?.x || 0, y0 = box.vertices[0]?.y || 0;
  var x1 = box.vertices[1]?.x || 0, y2 = box.vertices[2]?.y || 0;
  var w = x1 - x0, h = y2 - y0;
  if (w === 0 || h === 0) return [];
  return landmarks.map(l => ({
    type: l.type,
    x: ((l.position?.x || 0) - x0) / w,
    y: ((l.position?.y || 0) - y0) / h,
  }));
}

function faceSimilarity(marks1, marks2) {
  const KEY_TYPES = ['LEFT_EYE','RIGHT_EYE','NOSE_TIP','MOUTH_LEFT','MOUTH_RIGHT','LEFT_EYE_LEFT_CORNER','RIGHT_EYE_RIGHT_CORNER'];
  var totalDist = 0, count = 0;
  for (const t of KEY_TYPES) {
    const m1 = marks1.find(m => m.type === t), m2 = marks2.find(m => m.type === t);
    if (m1 && m2) { totalDist += Math.sqrt((m1.x-m2.x)**2 + (m1.y-m2.y)**2); count++; }
  }
  if (count === 0) return 0;
  return Math.max(0, 1 - (totalDist / count) * 3);
}

// ─── thumbnail download ────────────────────────────────────────────────────────
async function downloadThumbnailBase64(drive, auth, fileId) {
  try {
    const meta = await drive.files.get({ fileId, fields: 'thumbnailLink,mimeType,name' });
    const thumbLink = meta.data.thumbnailLink;
    log('download_thumb_meta', { fileId, name: meta.data.name, mimeType: meta.data.mimeType, hasThumb: !!thumbLink });
    if (thumbLink) {
      let url800 = thumbLink.replace(/=s\d+$/, '=s800').replace(/=s\d+&/, '=s800&');
      if (!url800.includes('=s800')) url800 = thumbLink + '=s800';
      const token = (await (await auth.getClient()).getAccessToken()).token;
      if (token) {
        const fetchRes = await fetch(url800, { headers: { Authorization: `Bearer ${token}` } });
        log('download_thumb_fetch', { fileId, status: fetchRes.status });
        if (fetchRes.ok) {
          const buf = Buffer.from(await fetchRes.arrayBuffer());
          log('download_thumb_ok', { fileId, bytes: buf.length });
          return buf.toString('base64');
        }
      }
    }
  } catch (e) { logErr('download_thumb_exception', e, { fileId }); }

  log('download_fullres_attempt', { fileId });
  try {
    const fileRes = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
    log('download_fullres_ok', { fileId, bytes: fileRes.data?.byteLength });
    return Buffer.from(fileRes.data).toString('base64');
  } catch (e2) { logErr('download_fullres_exception', e2, { fileId }); return null; }
}

// ─── main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const eventId = req.body?.eventId;
  const selfie  = req.body?.selfie;
  log('request_received', { eventId, selfieKB: selfie ? Math.round(selfie.length * 0.75 / 1024) : 0, hasSelfie: !!selfie });

  if (!eventId || !selfie) return res.status(400).json({ error: 'eventId and selfie required' });

  // ── credentials + auth ──
  let credentials;
  try {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    log('credentials_parsed', { clientEmail: credentials?.client_email, projectId: credentials?.project_id });
  } catch (e) {
    logErr('credentials_parse_failed', e, {});
    return res.status(500).json({ error: 'Invalid service account key', step: 'credentials_parse', detail: e.message });
  }

  let auth;
  try {
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/cloud-platform'],
    });
    const tok = await (await auth.getClient()).getAccessToken();
    log('auth_ok', { hasToken: !!tok?.token });
  } catch (e) {
    logErr('auth_failed', e, {});
    return res.status(500).json({ error: 'Google auth failed', step: 'google_auth', detail: e.message });
  }

  // ── step 1: normalize selfie ──
  log('selfie_normalize_start', {});
  let normalizedSelfieBase64;
  try {
    normalizedSelfieBase64 = await normalizeSelfie(selfie);
    log('selfie_normalize_done', { base64Chars: normalizedSelfieBase64.length });
  } catch (e) {
    logErr('selfie_normalize_failed', e, {});
    return res.status(400).json({ error: 'ไม่สามารถประมวลผลรูปได้ กรุณาใช้รูปภาพ JPEG หรือ PNG', step: 'selfie_normalize', detail: e.message });
  }

  // ── step 2: detect face in selfie ──
  log('selfie_detection_start', {});
  const vision = google.vision({ version: 'v1', auth });
  let selfieFaces;
  try {
    const selfieVision = await vision.images.annotate({
      requestBody: {
        requests: [{ image: { content: normalizedSelfieBase64 }, features: [{ type: 'FACE_DETECTION', maxResults: 5 }] }],
      },
    });
    const visionErr = selfieVision.data.responses?.[0]?.error;
    log('selfie_vision_response', { responses: selfieVision.data.responses?.length, visionErr: visionErr || null });
    if (visionErr) throw new Error(`Vision API error: ${visionErr.message} (code ${visionErr.code})`);
    selfieFaces = selfieVision.data.responses?.[0]?.faceAnnotations || [];
    log('selfie_faces_detected', { count: selfieFaces.length });
  } catch (e) {
    logErr('selfie_vision_api_failed', e, {});
    return res.status(500).json({ error: 'Vision API failed on selfie', step: 'selfie_face_detection', detail: e.message });
  }

  if (selfieFaces.length === 0) {
    log('selfie_no_face', {});
    return res.status(400).json({ error: 'ไม่พบใบหน้าในรูปที่อัปโหลด กรุณาใช้รูปที่เห็นใบหน้าชัดเจน' });
  }

  const selfieMarks = normalizeLandmarks(selfieFaces[0].landmarks, selfieFaces[0].boundingPoly);
  log('selfie_landmarks_normalized', { landmarkCount: selfieMarks.length });

  // ── step 3: folder discovery ──
  log('folder_scan_start', { eventId });
  const drive = google.drive({ version: 'v3', auth });
  let folderIds;
  try {
    folderIds = await collectFolderIds(drive, eventId);
    log('folder_scan_done', { folderCount: folderIds.length });
  } catch (e) {
    logErr('folder_scan_failed', e, { eventId });
    return res.status(500).json({ error: 'Failed to scan event folders', step: 'folder_scan', detail: e.message });
  }

  // ── step 4: list photos ──
  let photos;
  try {
    const folderQuery = folderIds.map(id => `'${id}' in parents`).join(' or ');
    const q = `(${folderQuery}) and mimeType contains 'image/' and not name contains 'Poster_info' and trashed=false`;
    log('photo_list_query', { q });
    const photosRes = await drive.files.list({ q, fields: 'files(id,name,mimeType)', pageSize: MAX_PHOTOS, orderBy: 'name' });
    photos = photosRes.data.files || [];
    log('photo_list_done', { count: photos.length, sample: photos.slice(0,3).map(p=>({name:p.name,mimeType:p.mimeType})) });
  } catch (e) {
    logErr('photo_list_failed', e, {});
    return res.status(500).json({ error: 'Failed to list photos', step: 'photo_list', detail: e.message });
  }

  if (photos.length === 0) {
    log('no_photos_found', {});
    return res.status(200).json({ matches: [], total: 0, searched: 0 });
  }

  // ── step 5: batch download + Vision comparison ──
  const matches = [];
  const totalBatches = Math.ceil(photos.length / VISION_BATCH);

  for (let i = 0; i < photos.length; i += VISION_BATCH) {
    const batchNum = Math.floor(i / VISION_BATCH) + 1;
    const batch = photos.slice(i, i + VISION_BATCH);
    log('batch_start', { batchNum, total: totalBatches, size: batch.length });

    const base64Results = await Promise.allSettled(batch.map(p => downloadThumbnailBase64(drive, auth, p.id)));
    const successCount = base64Results.filter(r => r.status === 'fulfilled' && r.value).length;
    log('batch_download_done', { batchNum, successCount, failCount: batch.length - successCount });

    const visionRequests = [], batchIndex = [];
    for (let j = 0; j < base64Results.length; j++) {
      const b64 = base64Results[j].status === 'fulfilled' ? base64Results[j].value : null;
      if (b64) { visionRequests.push({ image: { content: b64 }, features: [{ type: 'FACE_DETECTION', maxResults: 10 }] }); batchIndex.push(j); }
    }

    if (visionRequests.length === 0) { log('batch_no_valid_images', { batchNum }); continue; }
    log('vision_batch_request', { batchNum, requestCount: visionRequests.length });

    try {
      const vRes = await vision.images.annotate({ requestBody: { requests: visionRequests } });
      const responses = vRes.data.responses || [];
      log('vision_batch_response', { batchNum, responseCount: responses.length, errors: responses.filter(r=>r.error).map(r=>r.error) });

      for (let r = 0; r < responses.length; r++) {
        const photo = batch[batchIndex[r]];
        if (responses[r].error) { log('vision_response_error', { fileId: photo.id, error: responses[r].error }); continue; }
        const faces = responses[r].faceAnnotations || [];
        let bestScore = 0;
        for (const face of faces) {
          const score = faceSimilarity(selfieMarks, normalizeLandmarks(face.landmarks, face.boundingPoly));
          if (score > bestScore) bestScore = score;
        }
        log('face_comparison', { name: photo.name, facesDetected: faces.length, bestScore: bestScore.toFixed(3) });
        if (bestScore >= SIMILARITY_THRESHOLD) {
          matches.push({ id: photo.id, name: photo.name, score: bestScore, thumbnailUrl: `/api/drive/photo?fileId=${photo.id}&size=thumb`, downloadUrl: `/api/drive/photo?fileId=${photo.id}` });
          log('match_found', { name: photo.name, score: bestScore.toFixed(3) });
        }
      }
    } catch (e) { logErr('vision_batch_api_failed', e, { batchNum }); }

    log('batch_done', { batchNum, matchesSoFar: matches.length });
  }

  matches.sort((a, b) => b.score - a.score);
  log('search_complete', { totalMatches: matches.length, searched: photos.length });
  return res.status(200).json({ matches, total: matches.length, searched: photos.length });
    }
