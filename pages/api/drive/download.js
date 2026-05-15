// pages/api/drive/download.js — proxy-download file (service account auth)
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  var id = req.query.id;
  if (!id) return res.status(400).json({ error: 'Missing id' });
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
  // Fetch filename from metadata
  var filename = id + '.jpg';
  try {
    var m = await fetch('https://www.googleapis.com/drive/v3/files/' + id + '?fields=name',
      { headers: { Authorization: 'Bearer ' + access } });
    var md = await m.json();
    if (md.name) filename = md.name;
  } catch(e) {}
  // Stream file
  var fr = await fetch('https://www.googleapis.com/drive/v3/files/' + id + '?alt=media',
    { headers: { Authorization: 'Bearer ' + access } });
  if (!fr.ok) return res.status(fr.status).json({ error: 'DRIVE_FETCH_FAILED' });
  var ct = fr.headers.get('content-type') || 'application/octet-stream';
  res.setHeader('Content-Type', ct);
  res.setHeader('Content-Disposition', 'attachment; filename="' + encodeURIComponent(filename) + '"');
  res.setHeader('Cache-Control', 'private, no-store');
  var buf = await fr.arrayBuffer();
  res.send(Buffer.from(buf));
}