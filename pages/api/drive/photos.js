// pages/api/drive/photos.js
// Lists all photos in an event folder (paginated)
import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  var eventId = req.query.eventId;
  var pageToken = req.query.pageToken || null;

  if (!eventId) return res.status(400).json({ error: 'eventId required' });

  try {
    var credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    var auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    var drive = google.drive({ version: 'v3', auth });

    var params = {
      q: `'${eventId}' in parents and mimeType contains 'image/' and not name contains 'Poster_info' and trashed=false`,
      fields: 'nextPageToken,files(id,name)',
      pageSize: 100,
      orderBy: 'name',
    };
    if (pageToken) params.pageToken = pageToken;

    var listRes = await drive.files.list(params);
    var files = listRes.data.files || [];

    var photos = files.map(function (f) {
      return {
        id: f.id,
        name: f.name,
        thumbnailUrl: `/api/drive/photo?fileId=${f.id}&size=thumb`,
        downloadUrl: `/api/drive/photo?fileId=${f.id}`,
      };
    });

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      photos: photos,
      nextPageToken: listRes.data.nextPageToken || null,
    });
  } catch (err) {
    console.error('photos API error:', err);
    return res.status(500).json({ error: 'Failed to fetch photos' });
  }
}
