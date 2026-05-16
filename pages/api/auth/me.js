// pages/api/auth/me.js — return current session user
import { getSession } from '../../../lib/session';

export default function handler(req, res) {
  var session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_authenticated' });
  res.status(200).json({
    email: session.email,
    name: session.name,
    picture: session.picture,
  });
}
