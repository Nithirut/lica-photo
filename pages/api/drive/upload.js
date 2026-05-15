// pages/api/drive/upload.js
// Accepts base64-encoded image, uploads to specified Google Drive folder

import { getSession, setSession, refreshAccessToken } from '../../../lib/session';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  const { folderId, base64, fileName, mimeType } = req.body;
  if (!folderId || !base64 || !fileName) {
    return res.status(400).json({ error: 'folderId, base64, and fileName are required' });
  }

  // Ensure valid access token
  let token = session.access_token;
  if (Date.now() >= session.expires_at && session.refresh_token) {
    token = await refreshAccessToken(session.refresh_token);
    if (!token) return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    setSession(res, { ...session, access_token: token, expires_at: Date.now() + 55 * 60 * 1000 });
  }

  try {
    const fileBuffer = Buffer.from(base64, 'base64');
    const fileMime = mimeType || 'image/webp';

    // Build multipart/related body
    const boundary = `lica_boundary_${Date.now()}`;
    const metadata = JSON.stringify({
      name: fileName,
      parents: [folderId],
    });

    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`),
      Buffer.from(metadata),
      Buffer.from(`\r\n--${boundary}\r\nContent-Type: ${fileMime}\r\n\r\n`),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--`),
    ]);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': body.length,
        },
        body,
      }
    );

    if (uploadRes.status === 403) {
      const err = await uploadRes.json();
      return res.status(403).json({ error: 'Upload denied. Check folder permissions.' });
    }

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      console.error('Drive upload error:', err);
      return res.status(500).json({ error: 'Upload to Google Drive failed.' });
    }

    const file = await uploadRes.json();
    return res.status(200).json({
      id: file.id,
      name: file.name,
      url: file.webViewLink,
      downloadUrl: file.webContentLink,
    });
  } catch (err) {
    console.error('Upload handler error:', err);
    return res.status(500).json({ error: 'Server error during upload.' });
  }
}
