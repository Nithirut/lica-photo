import { google } from 'googleapis';

export default async function handler(req, res) {
  const { fileId } = req.query;
  if (!fileId) return res.status(400).json({ error: 'No fileId' });
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });
    const meta = await drive.files.get({ fileId, fields: 'name,mimeType' });
    const file = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
    res.setHeader('Content-Type', meta.data.mimeType || 'image/jpeg');
    res.setHeader('Content-Disposition', `inline; filename="${meta.data.name}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(file.data));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load image' });
  }
}