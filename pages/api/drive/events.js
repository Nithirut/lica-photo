// pages/api/drive/events.js
// Lists event folders with their Poster_info image IDs
import { google } from 'googleapis';

const FOLDER_ID = process.env.DRIVE_FOLDER_ID || '1XWC1YGcl_oCzxX0GSMcX2BiiT2xaGTO3';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });

    // List event folders
    const foldersRes = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id,name,createdTime,modifiedTime)',
      orderBy: 'createdTime desc',
      pageSize: 100,
    });
    const folders = foldersRes.data.files || [];

    // For each folder, find Poster_info file and count photos
    const events = await Promise.all(
      folders.map(async (folder) => {
        const [posterRes, countRes] = await Promise.all([
          drive.files.list({
            q: `'${folder.id}' in parents and name contains 'Poster_info' and mimeType contains 'image/' and trashed=false`,
            fields: 'files(id,name)',
            pageSize: 1,
          }),
          drive.files.list({
            q: `'${folder.id}' in parents and mimeType contains 'image/' and not name contains 'Poster_info' and trashed=false`,
            fields: 'nextPageToken,files(id)',
            pageSize: 1,
          }),
        ]);
        const poster = posterRes.data.files?.[0] || null;
        return {
          id: folder.id,
          name: folder.name,
          date: folder.modifiedTime || folder.createdTime,
          posterId: poster?.id || null,
        };
      })
    );

    // Sort newest first by date
    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(200).json({ events });
  } catch (err) {
    console.error('events API error:', err);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
}
