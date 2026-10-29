// Who is calling the admin API:
//   teacher  - header x-admin-password = ADMIN_PASSWORD (sees and controls every site)
//   student  - header Authorization: Bearer <session from /api/account> (only their own sites)
const crypto = require('crypto');
const C = require('./_crypto');

function checkPassword(req) {
  const expected = process.env.ADMIN_PASSWORD || '';
  const given = String(req.headers['x-admin-password'] || '');
  if (!expected) return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

const SESSION_DAYS = 30;
// site: set when the student logged in with a site's name; the session then only opens that site.
function sessionToken(user, site) {
  const t = { uid: user.id, name: user.name, exp: Date.now() + SESSION_DAYS * 864e5 };
  if (site) t.site = site;
  return C.sign(t);
}

// { role: 'admin' } | { role: 'user', id, name } | null
function identify(req) {
  if (req.headers['x-admin-password']) return checkPassword(req) ? { role: 'admin' } : null;
  const m = /^Bearer (.+)$/.exec(String(req.headers.authorization || ''));
  if (!m || !C.hasKey()) return null;
  const s = C.verify(m[1]);
  if (!s || !(s.exp > Date.now())) return null;
  return s.site ? { role: 'user', id: s.uid, name: s.name, site: s.site } : { role: 'user', id: s.uid, name: s.name };
}

// Sends an error and returns false, or returns the caller's identity.
function guard(req, res, method) {
  if (req.method !== method) { res.status(405).json({ error: 'Method not allowed' }); return false; }
  if (!process.env.GITHUB_TOKEN) { res.status(500).json({ error: 'Falta configurar GITHUB_TOKEN en Vercel.' }); return false; }
  if (req.headers['x-admin-password'] && !process.env.ADMIN_PASSWORD) { res.status(500).json({ error: 'Falta configurar ADMIN_PASSWORD en Vercel.' }); return false; }
  const who = identify(req);
  if (!who) { res.status(401).json({ error: req.headers.authorization ? 'Tu sesión expiró. Entra de nuevo.' : 'Contraseña incorrecta.' }); return false; }
  return who;
}

// Sites without an owner belong to the teacher.
function canEdit(who, site) {
  if (!site) return false;
  if (who.role === 'admin') return true;
  return Boolean(site.owner && site.owner === who.id && (!who.site || who.site === site.slug));
}

module.exports = { checkPassword, identify, guard, canEdit, sessionToken };
