// pages/api/auth/logout.js — clear session and redirect home
import { clearSession } from '../../../lib/session';

export default function handler(req, res) {
  clearSession(res);
  res.redirect(302, '/');
}
