// lib/session.js — HMAC-signed cookie session, no external deps
var crypto = require('crypto');

var SECRET = process.env.SESSION_SECRET || 'dev-secret-please-change';
var COOKIE_NAME = 'lica_sess';
var MAX_AGE = 60 * 60 * 8; // 8 hours

function sign(data) {
  var payload = Buffer.from(JSON.stringify(data)).toString('base64');
  var sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}

function verify(token) {
  if (!token) return null;
  var dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  var payload = token.slice(0, dot);
  var sig = token.slice(dot + 1);
  var expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  if (expected !== sig) return null;
  try { return JSON.parse(Buffer.from(payload, 'base64').toString()); }
  catch (e) { return null; }
}

function getSession(req) {
  var cookie = (req.cookies || {})[COOKIE_NAME];
  return verify(cookie);
}

function setSession(res, data) {
  var token = sign(data);
  res.setHeader('Set-Cookie',
    COOKIE_NAME + '=' + token +
    '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + MAX_AGE
  );
}

function clearSession(res) {
  res.setHeader('Set-Cookie',
    COOKIE_NAME + '=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
  );
}

module.exports = { getSession, setSession, clearSession };
