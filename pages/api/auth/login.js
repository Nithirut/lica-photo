// pages/api/auth/login.js — redirect to Google OAuth
export default function handler(req, res) {
  var params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
  });
  res.redirect(302, 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString());
}
