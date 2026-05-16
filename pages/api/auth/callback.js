// pages/api/auth/callback.js — exchange OAuth code, set session cookie
import { setSession } from '../../../lib/session';

export default async function handler(req, res) {
  var code = req.query.code;
  if (!code) return res.redirect(302, '/uploader?error=no_code');

  try {
    // Exchange code for tokens
    var tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }).toString(),
    });
    var tokens = await tokenRes.json();
    if (tokens.error) {
      return res.redirect(302, '/uploader?error=' + encodeURIComponent(tokens.error));
    }

    // Get user profile
    var userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: 'Bearer ' + tokens.access_token },
    });
    var user = await userRes.json();

    setSession(res, {
      email: user.email,
      name: user.name,
      picture: user.picture,
    });

    res.redirect(302, '/uploader');
  } catch (e) {
    console.error('OAuth callback error:', e);
    res.redirect(302, '/uploader?error=server_error');
  }
}
