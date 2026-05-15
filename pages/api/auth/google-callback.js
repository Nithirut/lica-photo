// pages/api/auth/google-callback.js
// Handles the OAuth redirect, exchanges code for tokens, stores session

import { setSession } from '../../../lib/session';

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.redirect('/uploader?auth=denied');
  }

  if (!code) {
    return res.redirect('/uploader?auth=error');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json();
      console.error('Token exchange failed:', err);
      return res.redirect('/uploader?auth=error');
    }

    const tokens = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // Get user profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileRes.ok) {
      return res.redirect('/uploader?auth=error');
    }

    const profile = await profileRes.json();

    // Store session
    setSession(res, {
      access_token,
      refresh_token,
      expires_at: Date.now() + (expires_in - 60) * 1000, // subtract 60s buffer
      user: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        picture: profile.picture,
      },
    });

    res.redirect('/uploader?auth=success');
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect('/uploader?auth=error');
  }
}
