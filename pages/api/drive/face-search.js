// pages/api/drive/face-search.js
// AI face search: thumbnail-first downloads + Vision API batching (16/req) + recursive subfolders
import { google } from 'googleapis';

export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } },
  maxDuration: 60,
};

const MAX_DEPTH = 2;
const MAX_FOLDERS = 20;
const MAX_PHOTOS = 120;
const VISION_BATCH = 16;
const SIMILARITY_THRESHOLD = 0.68;

// Recursively collect all folder IDs under a root folder
async function collectFolderIds(drive, rootId) {
  const ids = [rootId];
  async function scan(folderId, depth) {
    if (depth >= MAX_DEPTH || ids.length >= MAX_FOLDERS) return;
    try {
      const res = await drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id)',
        pageSize: 20,
      });
      const subs = res.data.files || [];
      await Promise.all(
        subs.map(async function (sf) {
          if (ids.length < MAX_FOLDERS) {
            ids.push(sf.id);
            await scan(sf.id, depth + 1);
          }
        })
      );
    } catch (e) {
      // skip failed subfolder silently
    }
  }
  await scan(rootId, 0);
  return ids;
}

// Normalize face landmarks to [0,1] relative to face bounding box
function normalizeLandmarks(landmarks, box) {
  if (!landmarks || !box || !box.vertices || box.vertices.length < 3) return [];
  var x0 = box.vertices[0]?.x || 0;
  var y0 = box.vertices[0]?.y || 0;
  var x1 = box.vertices[1]?.x || 0;
  var y2 = box.vertices[2]?.y || 0;
  var w = x1 - x0;
  var h = y2 - y0;
  if (w === 0 || h === 0) return [];
  return landmarks.map(function (l) {
    return {
      type: l.type,
      x: ((l.position?.x || 0) - x0) / w,
      y: ((l.position?.y || 0) - y0) / h,
    };
  });
}

// Compare two normalized landmark sets, return similarity score 0–1
function faceSimilarity(marks1, marks2) {
  var KEY_TYPES = [
    'LEFT_EYE',
    'RIGHT_EYE',
    'NOSE_TIP',
    'MOUTH_LEFT',
    'MOUTH_RIGHT',
    'LEFT_EYE_LEFT_CORNER',
    'RIGHT_EYE_RIGHT_CORNER',
  ];
  var totalDist = 0;
  var count = 0;
  for (var i = 0; i < KEY_TYPES.length; i++) {
    var type = KEY_TYPES[i];
    var m1 = marks1.find(function (m) { return m.type === type; });
    var m2 = marks2.find(function (m) { return m.type === type; });
    if (m1 && m2) {
      totalDist += Math.sqrt(Math.pow(m1.x - m2.x, 2) + Math.pow(m1.y - m2.y, 2));
      count++;
    }
  }
  if (count === 0) return 0;
  var avgDist = totalDist / count;
  return Math.max(0, 1 - avgDist * 3);
}

// Download a photo as base64: try thumbnailLink at 800px first, fallback to full-res stream
async function downloadThumbnailBase64(drive, auth, fileId) {
  try {
    // Step 1: get thumbnailLink
    var meta = await drive.files.get({ fileId, fields: 'thumbnailLink,mimeType' });
    var thumbLink = meta.data.thumbnailLink;
    if (thumbLink) {
      // Bump thumbnail size to 800px for better face detection
      var url800 = thumbLink.replace(/=s\d+$/, '=s800').replace(/=s\d+&/, '=s800&');
      if (!url800.includes('=s800')) url800 = thumbLink + '=s800';
      // Fetch with service account Bearer token
      var client = await auth.getClient();
      var tokenRes = await client.getAccessToken();
      var token = tokenRes.token || tokenRes.res?.data?.access_token;
      if (token) {
        var fetchRes = await fetch(url800, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (fetchRes.ok) {
          var arrayBuf = await fetchRes.arrayBuffer();
          return Buffer.from(arrayBuf).toString('base64');
        }
      }
    }
  } catch (e) {
    // fall through to full-res
    console.log(`thumb failed for ${fileId}: ${e.message}`);
  }

  // Step 2: fallback — full-res arraybuffer download
  try {
    var fileRes = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    return Buffer.from(fileRes.data).toString('base64');
  } catch (e2) {
    console.log(`full-res failed for ${fileId}: ${e2.message}`);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  var eventId = req.body?.eventId;
  var selfie = req.body?.selfie;

  if (!eventId || !selfie) {
    return res.status(400).json({ error: 'eventId and selfie required' });
  }

  try {
    var credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    var auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/cloud-platform',
      ],
    });

    var selfieBase64 = selfie.replace(/^data:image\/\w+;base64,/, '');
    console.log('face-search: step 1 — detecting selfie face');

    // Step 1: detect face in selfie
    var vision = google.vision({ version: 'v1', auth });
    var selfieVision = await vision.images.annotate({
      requestBody: {
        requests: [
          {
            image: { content: selfieBase64 },
            features: [{ type: 'FACE_DETECTION', maxResults: 5 }],
          },
        ],
      },
    });
    var selfieFaces = selfieVision.data.responses?.[0]?.faceAnnotations || [];
    console.log(`face-search: selfie faces detected: ${selfieFaces.length}`);
    if (selfieFaces.length === 0) {
      return res.status(400).json({
        error: 'ไม่พบใบหน้าในรูปที่อัปโหลด กรุณาใช้รูปที่เห็นใบหน้าชัดเจน',
      });
    }
    var selfieFace = selfieFaces[0];
    var selfieMarks = normalizeLandmarks(selfieFace.landmarks, selfieFace.boundingPoly);

    // Step 2: discover folders recursively
    var drive = google.drive({ version: 'v3', auth });
    console.log('face-search: step 2 — collecting folder IDs');
    var folderIds = await collectFolderIds(drive, eventId);
    console.log(`face-search: folders found: ${folderIds.length}`);

    // Step 3: single Drive query across all folders
    var folderQuery = folderIds.map(function (id) { return `'${id}' in parents`; }).join(' or ');
    var q = `(${folderQuery}) and mimeType contains 'image/' and not name contains 'Poster_info' and trashed=false`;
    var photosRes = await drive.files.list({
      q,
      fields: 'files(id,name)',
      pageSize: MAX_PHOTOS,
      orderBy: 'name',
    });
    var photos = photosRes.data.files || [];
    console.log(`face-search: photos to search: ${photos.length}`);

    // Step 4: process in VISION_BATCH=16 chunks with parallel thumbnail downloads
    var matches = [];
    for (var i = 0; i < photos.length; i += VISION_BATCH) {
      var batch = photos.slice(i, i + VISION_BATCH);
      console.log(`face-search: processing batch ${Math.floor(i / VISION_BATCH) + 1} (${batch.length} photos)`);

      // Download all thumbnails in parallel
      var base64Results = await Promise.allSettled(
        batch.map(function (photo) {
          return downloadThumbnailBase64(drive, auth, photo.id);
        })
      );

      // Build Vision API batch request (skip any failed downloads)
      var visionRequests = [];
      var batchIndex = [];
      for (var j = 0; j < base64Results.length; j++) {
        var b64 = base64Results[j].status === 'fulfilled' ? base64Results[j].value : null;
        if (b64) {
          visionRequests.push({
            image: { content: b64 },
            features: [{ type: 'FACE_DETECTION', maxResults: 10 }],
          });
          batchIndex.push(j);
        }
      }

      if (visionRequests.length === 0) continue;

      // Single Vision API call for the whole batch
      try {
        var visionRes = await vision.images.annotate({
          requestBody: { requests: visionRequests },
        });
        var responses = visionRes.data.responses || [];

        for (var r = 0; r < responses.length; r++) {
          var photoIdx = batchIndex[r];
          var photo = batch[photoIdx];
          var faces = responses[r].faceAnnotations || [];
          var bestScore = 0;
          for (var f = 0; f < faces.length; f++) {
            var marks = normalizeLandmarks(faces[f].landmarks, faces[f].boundingPoly);
            var score = faceSimilarity(selfieMarks, marks);
            if (score > bestScore) bestScore = score;
          }
          if (bestScore >= SIMILARITY_THRESHOLD) {
            matches.push({
              id: photo.id,
              name: photo.name,
              score: bestScore,
              thumbnailUrl: `/api/drive/photo?fileId=${photo.id}&size=thumb`,
              downloadUrl: `/api/drive/photo?fileId=${photo.id}`,
            });
          }
        }
      } catch (vErr) {
        console.log(`face-search: vision batch error: ${vErr.message}`);
      }
    }

    matches.sort(function (a, b) { return b.score - a.score; });
    console.log(`face-search: done — ${matches.length} matches out of ${photos.length}`);

    return res.status(200).json({
      matches,
      total: matches.length,
      searched: photos.length,
    });
  } catch (err) {
    console.error('face-search error:', err);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดระหว่างการค้นหา กรุณาลองใหม่อีกครั้ง' });
  }
    }
