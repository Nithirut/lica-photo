// pages/api/auth/google-logout.js
import { clearSession } from '../../../lib/session';

export default function handler(req, res) {
  clearSession(res);
  res.redirect('/uploader');
}
