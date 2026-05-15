// pages/api/auth/me.js
// Returns current session user info, refreshes token if expired

import { getSession, setSession, clearSession, refreshAccessToken } from '../../../lib/session';

export default async function handler(req, res) {
  const session = getSession(req);

  if (!session) {
    return res.status(401).json({ user: null });
  }

  // Refresh token if expired
  if (Date.now() >= session.expires_at) {
    if (!session.refresh_token) {
      clearSession(res);
      return res.status(401).json({ user: null });
    }

    const newToken = await refreshAccessToken(session.refresh_token);
    if (!newToken) {
      clearSession(res);
      return res.status(401).json({ user: null });
    }

    const updated = {
      ...session,
      access_token: newToken,
      expires_at: Date.now() + 55 * 60 * 1000, // ~55 min
    };
    setSession(res, updated);
    return res.status(200).json({ user: updated.user });
  }

  res.status(200).json({ user: session.user });
}
