// pages/api/drive/photos.js
// Lists all photos in an event folder + subfolders (paginated)
// GET /api/drive/photos?eventId=<id>&pageToken=<token>

import { google } from 'googleapis';
import { galleryLog } from '../../../lib/logger.js';
import { collectFolderIds, buildPhotoQuery } from '../../../lib/google-drive.js';

export const config = {
  api: { bodyParser: false },
};

const PAGE_SIZE = 100;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const eventId   = req.query.eventId;
  const pageToken = req.query.pageToken || null;

  if (!eventId) return res.status(400).json({ error: 'eventId required' });
  galleryLog.info('request_received', { eventId, hasPageToken: !!pageToken });

  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });

    // Decode pageToken or run fresh folder discovery
    let folderIds;
    let drivePageToken = null;

    if (pageToken) {
      try {
        const decoded = JSON.parse(Buffer.from(pageToken, 'base64url').toString('utf8'));
        folderIds      = decoded.folderIds;
        drivePageToken = decoded.drivePageToken || null;
        galleryLog.info('page_token_decoded', { folderCount: folderIds.length });
      } catch {
        galleryLog.warn('page_token_invalid', { note: 'restarting folder discovery' });
        folderIds = await collectFolderIds(drive, eventId);
      }
    } else {
      folderIds = await collectFolderIds(drive, eventId);
      galleryLog.info('folder_scan_done', { folderCount: folderIds.length });
    }

    // Single Drive query across all discovered folders
    const q = buildPhotoQuery(folderIds);
    galleryLog.info('photo_list_query', { q, folderCount: folderIds.length });

    const params = {
      q,
      fields: 'nextPageToken,files(id,name)',
      pageSize: PAGE_SIZE,
      orderBy: 'name',
    };
    if (drivePageToken) params.pageToken = drivePageToken;

    const listRes = await drive.files.list(params);
    const files   = listRes.data.files || [];

    const photos = files.map(f => ({
      id:           f.id,
      name:         f.name,
      thumbnailUrl: `/api/drive/photo?fileId=${f.id}&size=thumb`,
      downloadUrl:  `/api/drive/photo?fileId=${f.id}`,
    }));

    // Encode next page token — carry folderIds to skip re-scan on subsequent pages
    let nextPageToken = null;
    if (listRes.data.nextPageToken) {
      nextPageToken = Buffer.from(
        JSON.stringify({ folderIds, drivePageToken: listRes.data.nextPageToken }),
        'utf8'
      ).toString('base64url');
    }

    galleryLog.info('response_sent', { photoCount: photos.length, hasNextPage: !!nextPageToken });
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ photos, nextPageToken, foldersScanned: folderIds.length });

  } catch (err) {
    galleryLog.error('photos_api_error', err);
    return res.status(500).json({ error: 'Failed to fetch photos' });
  }
}
