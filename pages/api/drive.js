import { google } from 'googleapis';

async function getDriveClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  return google.drive({ version: 'v3', auth });
}

export default async function handler(req, res) {
  const { type, folderId, groupFolderId } = req.query;

  try {
    const drive = await getDriveClient();

    if (type === 'folders') {
      const parentId = groupFolderId || process.env.DRIVE_FOLDER_ID;
      const response = await drive.files.list({
        q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name, createdTime)',
        orderBy: 'createdTime desc',
        pageSize: 50,
      });
      return res.status(200).json({ folders: response.data.files || [] });
    }

    if (type === 'photos' && folderId) {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and (mimeType='image/jpeg' or mimeType='image/png' or mimeType='image/webp') and trashed=false`,
        fields: 'files(id, name, thumbnailLink, createdTime)',
        pageSize: 200,
        orderBy: 'createdTime desc',
      });
      return res.status(200).json({ photos: response.data.files || [] });
    }

    return res.status(400).json({ error: 'Invalid request' });

  } catch (error) {
    console.error('Drive API error:', error);
    return res.status(500).json({ error: 'Failed to connect to Google Drive' });
  }
}