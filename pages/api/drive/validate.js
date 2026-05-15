// pages/api/drive/validate.js
// Validates that a Google Drive folder ID is accessible by the authenticated user

import { getSession, setSession, refreshAccessToken } from '../../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  const { folderId } = req.body;
  if (!folderId) return res.status(400).json({ error: 'folderId required' });

  // Ensure we have a valid access token
  let token = session.access_token;
  if (Date.now() >= session.expires_at && session.refresh_token) {
    token = await refreshAccessToken(session.refresh_token);
    if (!token) return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    setSession(res, { ...session, access_token: token, expires_at: Date.now() + 55 * 60 * 1000 });
  }

  try {
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType,capabilities`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (driveRes.status === 404) {
      return res.status(404).json({ error: 'Folder not found. Check the link and try again.' });
    }
    if (driveRes.status === 403) {
      return res.status(403).json({ error: 'Access denied. Make sure the folder is shared with your account.' });
    }
    if (!driveRes.ok) {
      return res.status(400).json({ error: 'Could not access folder.' });
    }

    const data = await driveRes.json();

    if (data.mimeType !== 'application/vnd.google-apps.folder') {
      return res.status(400).json({ error: 'That link points to a file, not a folder.' });
    }

    if (!data.capabilities?.canAddChildren) {
      return res.status(403).json({ error: 'You don\'t have permission to upload into this folder.' });
    }

    return res.status(200).json({ id: data.id, name: data.name });
  } catch (err) {
    console.error('Drive validate error:', err);
    return res.status(500).json({ error: 'Server error during folder validation.' });
  }
}
