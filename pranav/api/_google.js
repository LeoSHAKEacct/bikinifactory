// Google Calendar connection for bookings.
//
// Env vars (Vercel project): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, TOKEN_KEY
// (any long random text; encrypts the stored Google tokens and signs OAuth state),
// optional GOOGLE_REDIRECT_URI (default https://<host>/api/google-callback).
//
// Each site's connection is stored encrypted in <site>/calendar.json on the
// drafts branch, which Vercel never deploys.

const crypto = require('crypto');
const G = require('./_github');

const SCOPES = [
  'openid', 'email',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
].join(' ');

function configured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.TOKEN_KEY);
}
function missingConfig() {
  return G.userError('Falta configurar GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y TOKEN_KEY en Vercel.', 500);
}

function redirectUri(req) {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `https://${host}/api/google-callback`;
}

const key = () => crypto.createHash('sha256').update(String(process.env.TOKEN_KEY)).digest();

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), data].map(b => b.toString('base64')).join('.');
}
function decrypt(blob) {
  const [iv, tag, data] = blob.split('.').map(s => Buffer.from(s, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString('utf8');
}

// OAuth state: slug + time, signed so the callback knows which site to connect.
function signState(slug) {
  const payload = Buffer.from(JSON.stringify({ slug, t: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', key()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
function readState(state) {
  const [payload, sig] = String(state || '').split('.');
  if (!payload || !sig) return null;
  const want = crypto.createHmac('sha256', key()).update(payload).digest('base64url');
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  const s = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  return Date.now() - s.t < 15 * 60 * 1000 ? s : null;
}

function authUrl(req, slug) {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(req),
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: signState(slug),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

async function tokenRequest(params) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, ...params }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(`Google: ${j.error_description || j.error || r.status}`);
    e.google = j.error;
    throw e;
  }
  return j;
}

// Exchanges the OAuth code; returns { email, refreshToken }.
async function exchangeCode(req, code) {
  const j = await tokenRequest({ code, redirect_uri: redirectUri(req), grant_type: 'authorization_code' });
  if (!j.refresh_token) throw new Error('Google no entregó permiso permanente. Intenta conectar de nuevo.');
  let email = '';
  try { email = JSON.parse(Buffer.from(j.id_token.split('.')[1], 'base64url').toString('utf8')).email || ''; } catch (e) { /* optional */ }
  return { email, refreshToken: j.refresh_token };
}

const calendarPath = slug => G.sitePath(slug, 'calendar.json');

async function readConnection(slug) {
  return G.readJson(calendarPath(slug), G.DRAFTS).catch(() => null);
}

async function saveConnection(slug, email, refreshToken) {
  await G.ensureDrafts();
  const json = JSON.stringify({ email, connectedAt: new Date().toISOString(), token: encrypt(refreshToken) }, null, 2) + '\n';
  await G.commit(G.DRAFTS, `Admin: connect calendar /${slug}`, async () => [{ path: calendarPath(slug), content: json, encoding: 'utf-8' }]);
}

async function removeConnection(slug) {
  const conn = await readConnection(slug);
  if (!conn) return;
  try {
    await fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(decrypt(conn.token)), { method: 'POST' });
  } catch (e) { /* removing it here is what matters */ }
  await G.commit(G.DRAFTS, `Admin: disconnect calendar /${slug}`, async () => [{ path: calendarPath(slug), remove: true }]);
}

async function accessToken(slug) {
  const conn = await readConnection(slug);
  if (!conn) throw G.userError('La agenda de este sitio no está conectada.', 409);
  try {
    return (await tokenRequest({ refresh_token: decrypt(conn.token), grant_type: 'refresh_token' })).access_token;
  } catch (e) {
    if (e.google === 'invalid_grant') throw G.userError('La conexión con Google Calendar expiró. Hay que conectarla de nuevo en el panel.', 409);
    throw e;
  }
}

async function calendarApi(token, path, body) {
  const r = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Google Calendar: ${(j.error && j.error.message) || r.status}`);
  return j;
}

async function busy(token, fromMs, toMs, timeZone) {
  const j = await calendarApi(token, '/freeBusy', {
    timeMin: new Date(fromMs).toISOString(), timeMax: new Date(toMs).toISOString(), timeZone, items: [{ id: 'primary' }],
  });
  return ((j.calendars && j.calendars.primary && j.calendars.primary.busy) || [])
    .map(b => [Date.parse(b.start), Date.parse(b.end)]);
}

function createEvent(token, event) {
  return calendarApi(token, '/calendars/primary/events', event);
}

module.exports = {
  configured, missingConfig, authUrl, readState, exchangeCode,
  readConnection, saveConnection, removeConnection, accessToken, busy, createEvent,
};
