// pages/api/drive/face-search.js
// AI face search within a specific event folder using Google Vision API
import { google } from 'googleapis';

export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } },
};

// Normalize face landmarks to [0,1] relative to the face bounding box
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

// Compare two normalized landmark sets, return similarity score 0-1
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

// Call Google Vision face detection on a base64 image
async function detectFaces(auth, imageBase64) {
  var vision = google.vision({ version: 'v1', auth });
  var result = await vision.images.annotate({
    requestBody: {
      requests: [
        {
          image: { content: imageBase64 },
          features: [{ type: 'FACE_DETECTION', maxResults: 20 }],
        },
      ],
    },
  });
  return result.data.responses?.[0]?.faceAnnotations || [];
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
        'https://www.googleapis.com/auth/cloud-vision',
      ],
    });

    var selfieBase64 = selfie.replace(/^data:image\/\w+;base64,/, '');

    // 1. Detect face in selfie
    var selfieFaces = await detectFaces(auth, selfieBase64);
    if (selfieFaces.length === 0) {
      return res.status(400).json({
        error: 'ไม่พบใบหน้าในรูปที่อัปโหลด กรุณาใช้รูปที่เห็นใบหน้าชัดเจน',
      });
    }
    var selfieFace = selfieFaces[0];
    var selfieMarks = normalizeLandmarks(
      selfieFace.landmarks,
      selfieFace.boundingPoly
    );

    // 2. List all photos in event folder (non-poster images)
    var drive = google.drive({ version: 'v3', auth });
    var photosRes = await drive.files.list({
      q: `'${eventId}' in parents and mimeType contains 'image/' and not name contains 'Poster_info' and trashed=false`,
      fields: 'files(id,name,mimeType)',
      pageSize: 500,
    });
    var photos = photosRes.data.files || [];

    // 3. Process photos in batches
    var BATCH_SIZE = 5;
    var SIMILARITY_THRESHOLD = 0.72;
    var matches = [];

    for (var i = 0; i < photos.length; i += BATCH_SIZE) {
      var batch = photos.slice(i, i + BATCH_SIZE);
      var results = await Promise.allSettled(
        batch.map(async function (photo) {
          var fileRes = await drive.files.get(
            { fileId: photo.id, alt: 'media' },
            { responseType: 'arraybuffer' }
          );
          var base64 = Buffer.from(fileRes.data).toString('base64');
          var faces = await detectFaces(auth, base64);
          if (faces.length === 0) return null;
          for (var j = 0; j < faces.length; j++) {
            var face = faces[j];
            var marks = normalizeLandmarks(face.landmarks, face.boundingPoly);
            var score = faceSimilarity(selfieMarks, marks);
            if (score >= SIMILARITY_THRESHOLD) {
              return {
                id: photo.id,
                name: photo.name,
                score: score,
                thumbnailUrl: `/api/drive/photo?fileId=${photo.id}&size=thumb`,
                downloadUrl: `/api/drive/photo?fileId=${photo.id}`,
              };
            }
          }
          return null;
        })
      );
      for (var k = 0; k < results.length; k++) {
        if (results[k].status === 'fulfilled' && results[k].value) {
          matches.push(results[k].value);
        }
      }
    }

    matches.sort(function (a, b) { return b.score - a.score; });

    return res.status(200).json({
      matches: matches,
      total: matches.length,
      searched: photos.length,
    });
  } catch (err) {
    console.error('face-search error:', err);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดระหว่างการค้นหา กรุณาลองใหม่อีกครั้ง' });
  }
}
