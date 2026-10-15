const crypto = require('crypto');

// Constant-time comparison of the x-admin-password header against ADMIN_PASSWORD.
function checkPassword(req) {
  const expected = process.env.ADMIN_PASSWORD || '';
  const given = String(req.headers['x-admin-password'] || '');
  if (!expected) return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

// Sends an error and returns false unless the request may use the admin API.
function guard(req, res, method) {
  if (req.method !== method) { res.status(405).json({ error: 'Method not allowed' }); return false; }
  if (!process.env.ADMIN_PASSWORD) { res.status(500).json({ error: 'Falta configurar ADMIN_PASSWORD en Vercel.' }); return false; }
  if (!checkPassword(req)) { res.status(401).json({ error: 'Contraseña incorrecta.' }); return false; }
  if (!process.env.GITHUB_TOKEN) { res.status(500).json({ error: 'Falta configurar GITHUB_TOKEN en Vercel.' }); return false; }
  return true;
}

module.exports = { checkPassword, guard };
