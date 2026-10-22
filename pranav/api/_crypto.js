// Encryption and signing with TOKEN_KEY (any long random text set in Vercel).
// Used for Google tokens, student accounts and login sessions; changing
// TOKEN_KEY makes all of them unreadable, so it must stay the same.
const crypto = require('crypto');

const hasKey = () => Boolean(process.env.TOKEN_KEY);
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

// payload -> "data.signature"; verify returns the payload or null.
function sign(obj) {
  const data = Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${data}.${crypto.createHmac('sha256', key()).update(data).digest('base64url')}`;
}
function verify(token) {
  const [data, sig] = String(token || '').split('.');
  if (!data || !sig) return null;
  const want = crypto.createHmac('sha256', key()).update(data).digest('base64url');
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try { return JSON.parse(Buffer.from(data, 'base64url').toString('utf8')); } catch (e) { return null; }
}

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('base64');
  return `scrypt$${salt}$${crypto.scryptSync(pw, salt, 32).toString('base64')}`;
}
function checkPassword(pw, stored) {
  const [, salt, hash] = String(stored).split('$');
  if (!salt || !hash) return false;
  const a = crypto.scryptSync(String(pw), salt, 32), b = Buffer.from(hash, 'base64');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sameText(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest(), y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

module.exports = { hasKey, key, encrypt, decrypt, sign, verify, hashPassword, checkPassword, sameText };
