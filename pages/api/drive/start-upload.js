// pages/api/drive/start-upload.js
// Creates a Google Drive resumable upload session using service account.
// Returns uploadUrl for the client to PUT the file directly to Google.
// NOTE: The LICA Drive folder must be shared with the service account as Editor.
import { getSession } from '../../../lib/session';
var crypto = require('crypto');

async function getServiceToken() {
  var sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  var now = Math.floor(Date.now() / 1000);
  var header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  var claim = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');
  var sigInput = header + '.' + claim;
  var signer = crypto.createSign('RSA-SHA256');
  signer.update(sigInput);
  var sig = signer.sign(sa.private_key, 'base64url');
  var jwt = sigInput + '.' + sig;

  var r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  var d = await r.json();
  return d.access_token;
}

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  var session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_authenticated' });

  var { name, mimeType, folderId } = req.body || {};
  if (!name || !mimeType) return res.status(400).json({ error: 'missing_fields' });

  try {
    var token = await getServiceToken();
    var parentId = folderId || process.env.DRIVE_FOLDER_ID;

    var initRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': mimeType,
        },
        body: JSON.stringify({ name: name, parents: [parentId] }),
      }
    );

    if (!initRes.ok) {
      var errText = await initRes.text();
      return res.status(500).json({ error: 'drive_error', detail: errText });
    }

    var uploadUrl = initRes.headers.get('location');
    res.status(200).json({ uploadUrl: uploadUrl });
  } catch (e) {
    console.error('start-upload error:', e);
    res.status(500).json({ error: 'server_error', detail: e.message });
  }
}
