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
function sessionToken(user) {
  return C.sign({ uid: user.id, name: user.name, exp: Date.now() + SESSION_DAYS * 864e5 });
}

// { role: 'admin' } | { role: 'user', id, name } | null
function identify(req) {
  if (req.headers['x-admin-password']) return checkPassword(req) ? { role: 'admin' } : null;
  const m = /^Bearer (.+)$/.exec(String(req.headers.authorization || ''));
  if (!m || !C.hasKey()) return null;
  const s = C.verify(m[1]);
  return s && s.exp > Date.now() ? { role: 'user', id: s.uid, name: s.name } : null;
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
  return Boolean(site) && (who.role === 'admin' || (site.owner && site.owner === who.id));
}

module.exports = { checkPassword, identify, guard, canEdit, sessionToken };
