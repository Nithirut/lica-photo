// pages/api/drive/download.js — proxy-download a Drive file
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  var id = req.query.id;
  if (!id) return res.status(400).json({ error: 'Missing id' });
  var rt = process.env.GOOGLE_REFRESH_TOKEN;
  if (!rt) return res.status(503).json({ error: 'NOT_CONFIGURED', message: 'Add GOOGLE_REFRESH_TOKEN to Vercel env vars.' });
  var tr = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: rt, grant_type: 'refresh_token',
    }).toString(),
  });
  var td = await tr.json();
  var access = td.access_token;
  if (!access) return res.status(401).json({ error: 'TOKEN_FAILED' });
  // Fetch filename
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
  res.setHeader('Cache-Control', 'no-store');
  var buf = await fr.arrayBuffer();
  res.send(Buffer.from(buf));
}