// pages/api/drive/photo.js
// Proxies event photos from Drive; supports full resolution and thumbnail redirect
import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  var fileId = req.query?.fileId;
  var size = req.query?.size;

  if (!fileId) return res.status(400).end();

  try {
    var credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    var auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    var drive = google.drive({ version: 'v3', auth });

    if (size === 'thumb') {
      // Try Drive's built-in thumbnailLink (fast, no bandwidth cost)
      var meta = await drive.files.get({
        fileId,
        fields: 'thumbnailLink,mimeType',
      });
      if (meta.data.thumbnailLink) {
        var thumbUrl = meta.data.thumbnailLink.replace('=s220', '=s600');
        return res.redirect(302, thumbUrl);
      }
      // Fall through to full stream if no thumbnail available
    }

    // Full-resolution stream
    var fileMeta = await drive.files.get({ fileId, fields: 'mimeType' });
    var fileRes = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    res.setHeader('Content-Type', fileMeta.data.mimeType || 'image/jpeg');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    fileRes.data.pipe(res);
  } catch (err) {
    console.error('photo proxy error:', err);
    return res.status(500).end();
  }
}
