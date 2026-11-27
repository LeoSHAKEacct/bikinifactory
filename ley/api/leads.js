// Admin list of signups. POST { password } -> { leads: [...] }. Password = ADMIN_PASSWORD env var.
const { ready, allLeads, okPassword } = require('./_store');
const fails = new Map();

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const f = fails.get(ip) || { n: 0, t: 0 };
  if (f.n >= 10 && Date.now() - f.t < 15 * 60 * 1000) return res.status(429).json({ error: 'Demasiados intentos' });
  let b = req.body;
  try { if (typeof b === 'string') b = JSON.parse(b || '{}'); } catch (_) { b = {}; }
  if (!okPassword((b || {}).password)) { fails.set(ip, { n: f.n + 1, t: Date.now() }); return res.status(401).json({ error: 'Contraseña incorrecta' }); }
  fails.delete(ip);
  if (!ready()) return res.json({ leads: [], warning: 'Almacenamiento no conectado' });
  try { return res.json({ leads: await allLeads() }); }
  catch (e) { return res.status(500).json({ error: 'No se pudieron leer los registros' }); }
};
