// pages/api/drive/browse.js — list Drive folder (service account auth)
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  var folderId = req.query.folderId;
  var saRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!saRaw) return res.status(503).json({ error: 'NOT_CONFIGURED', message: 'Add GOOGLE_SERVICE_ACCOUNT_KEY to Vercel env vars.' });
  var sa;
  try { sa = JSON.parse(saRaw); } catch(e) { return res.status(500).json({ error: 'INVALID_SA_KEY' }); }
  // Build JWT for service account
  var crypto = require('crypto');
  var now = Math.floor(Date.now() / 1000);
  var jwtHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  var jwtPayload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, iat: now,
  })).toString('base64url');
  var sigInput = jwtHeader + '.' + jwtPayload;
  var signer = crypto.createSign('RSA-SHA256');
  signer.update(sigInput);
  var sig = signer.sign(sa.private_key, 'base64url');
  var jwt = sigInput + '.' + sig;
  // Exchange JWT for access token
  var tr = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });
  var td = await tr.json();
  var access = td.access_token;
  if (!access) return res.status(401).json({ error: 'SA_TOKEN_FAILED', detail: td });
  var rootId = process.env.DRIVE_FOLDER_ID || 'root';
  var target = folderId || rootId;
  var q = encodeURIComponent('\'' + target + '\' in parents and trashed = false');
  var fields = encodeURIComponent('files(id,name,mimeType,thumbnailLink,size,createdTime)');
  var dr = await fetch(
    'https://www.googleapis.com/drive/v3/files?q=' + q + '&fields=' + fields + '&orderBy=name&pageSize=500',
    { headers: { Authorization: 'Bearer ' + access } }
  );
  var dd = await dr.json();
  var all = dd.files || [];
  var FT = 'application/vnd.google-apps.folder';
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
  return res.status(200).json({
    configured: true,
    folderId: target,
    folders: all.filter(function(f){ return f.mimeType === FT; }),
    files:   all.filter(function(f){ return f.mimeType !== FT; }),
  });
}