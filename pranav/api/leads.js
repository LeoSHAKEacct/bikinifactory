// Admin API for /admin: list, mark handled, delete. Header x-admin-password must match ADMIN_PASSWORD.
//   POST { action: "login" | "list" | "handled" | "delete", id?, handled? }
const { ready, redis, getLead, putLead, okPassword } = require('./_store');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.ADMIN_PASSWORD) return res.status(503).json({ error: 'ADMIN_PASSWORD is not set in Vercel.' });
  if (!okPassword(req.headers['x-admin-password'])) return res.status(401).json({ error: 'Wrong password.' });
  let b = req.body;
  try { if (typeof b === 'string') b = JSON.parse(b || '{}'); } catch (_) { b = {}; }
  b = b || {};
  if (b.action === 'login') return res.json({ ok: true, store: ready() });
  if (!ready()) return res.status(503).json({ error: 'The database is not connected yet (Vercel: Storage -> Upstash for Redis).' });
  try {
    if (b.action === 'list') {
      const ids = await redis('ZREVRANGE', 'leads', '0', '999');
      if (!ids.length) return res.json({ leads: [] });
      const vals = await redis('MGET', ...ids.map(id => `lead:${id}`));
      const gone = ids.filter((_, i) => !vals[i]);
      if (gone.length) await redis('ZREM', 'leads', ...gone);   // expired unfinished forms
      return res.json({ leads: vals.filter(Boolean).map(v => JSON.parse(v)) });
    }
    const id = String(b.id || '');
    if (!/^[a-z0-9]{12,40}$/.test(id)) return res.status(400).json({ error: 'Bad id' });
    if (b.action === 'handled') {
      const lead = await getLead(id); if (!lead) return res.status(404).json({ error: 'Not found' });
      lead.handled = !!b.handled; await putLead(lead); return res.json({ ok: true });
    }
    if (b.action === 'delete') { await redis('DEL', `lead:${id}`); await redis('ZREM', 'leads', id); return res.json({ ok: true }); }
    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    return res.status(500).json({ error: 'Database error. Try again.' });
  }
};
