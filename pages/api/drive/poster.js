// pages/api/drive/poster.js
// Proxies a Drive image file (Poster_info) with long-lived caching
import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { fileId } = req.query;
  if (!fileId) return res.status(400).json({ error: 'fileId required' });

  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });

    const meta = await drive.files.get({ fileId, fields: 'mimeType' });
    const mimeType = meta.data.mimeType || 'image/jpeg';

    const fileRes = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    fileRes.data.pipe(res);
  } catch (err) {
    console.error('poster API error:', err);
    return res.status(500).json({ error: 'Failed to fetch poster' });
  }
}
