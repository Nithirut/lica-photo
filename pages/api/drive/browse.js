// pages/api/drive/browse.js — list Drive folder contents (server-side auth)
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  var folderId = req.query.folderId;
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
  var rootId = process.env.DRIVE_ROOT_FOLDER_ID || 'root';
  var target = folderId || rootId;
  var q = encodeURIComponent('\'' + target + '\' in parents and trashed = false');
  var fields = encodeURIComponent('files(id,name,mimeType,thumbnailLink,size,createdTime,imageMediaMetadata)');
  var dr = await fetch(
    'https://www.googleapis.com/drive/v3/files?q=' + q + '&fields=' + fields + '&orderBy=name&pageSize=500',
    { headers: { Authorization: 'Bearer ' + access } }
  );
  var dd = await dr.json();
  var all = dd.files || [];
  var FTYPE = 'application/vnd.google-apps.folder';
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
  return res.status(200).json({
    configured: true,
    folderId: target,
    folders: all.filter(function(f){ return f.mimeType === FTYPE; }),
    files: all.filter(function(f){ return f.mimeType !== FTYPE; }),
  });
}