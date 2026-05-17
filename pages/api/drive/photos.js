// pages/api/drive/photos.js
// Lists images from an event folder + all subfolders (recursive, max depth 3)
import { google } from 'googleapis';

const MAX_DEPTH = 3;
const MAX_FOLDERS = 50;
const PAGE_SIZE = 100;

async function collectFolderIds(drive, rootId) {
  const ids = [rootId];
  async function scan(folderId, depth) {
    if (depth >= MAX_DEPTH || ids.length >= MAX_FOLDERS) return;
    try {
      const res = await drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id)',
        pageSize: 20,
      });
      const subs = res.data.files || [];
      await Promise.all(
        subs.map(async function (sf) {
          if (ids.length < MAX_FOLDERS) {
            ids.push(sf.id);
            await scan(sf.id, depth + 1);
          }
        })
      );
    } catch (e) {}
  }
  await scan(rootId, 0);
  return ids;
}

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

    var folderIds;
    var drivePageToken = null;

    if (pageToken) {
      try {
        var decoded = JSON.parse(Buffer.from(pageToken, 'base64url').toString('utf8'));
        folderIds = decoded.folderIds;
        drivePageToken = decoded.drivePageToken || null;
      } catch (e) {
        folderIds = await collectFolderIds(drive, eventId);
      }
    } else {
      folderIds = await collectFolderIds(drive, eventId);
    }

    var folderQuery = folderIds.map(function (id) { return `'${id}' in parents`; }).join(' or ');
    var q = `(${folderQuery}) and mimeType contains 'image/' and not name contains 'Poster_info' and trashed=false`;

    var params = {
      q: q,
      fields: 'nextPageToken,files(id,name)',
      pageSize: PAGE_SIZE,
      orderBy: 'name',
    };
    if (drivePageToken) params.pageToken = drivePageToken;

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

    var nextPageToken = null;
    if (listRes.data.nextPageToken) {
      nextPageToken = Buffer.from(
        JSON.stringify({ folderIds: folderIds, drivePageToken: listRes.data.nextPageToken }),
        'utf8'
      ).toString('base64url');
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      photos: photos,
      nextPageToken: nextPageToken,
      foldersScanned: folderIds.length,
    });
  } catch (err) {
    console.error('photos API error:', err);
    return res.status(500).json({ error: 'Failed to fetch photos' });
  }
}
