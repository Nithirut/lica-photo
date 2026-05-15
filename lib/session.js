import crypto from 'crypto';

const SECRET = process.env.SESSION_SECRET || 'lica-photo-change-me-in-production!!';
const COOKIE_NAME = 'lica_sess';
const MAX_AGE = 60 * 60 * 8; // 8 hours

export function setSession(res, data) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${payload}.${sig}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`
  );
}

export function getSession(req) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  const [payload, sig] = match[1].split('.');
  if (!payload || !sig) return null;
  try {
    const expectedSig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    return null;
  }
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0`);
}

// Refresh access token using stored refresh_token
export async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token || null;
}
