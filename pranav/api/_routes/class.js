// Teacher only: class settings and students.
// GET                                   -> { classCode, title, subtitle, students: [{ id, name, email, createdAt, sites }] }
// POST { classCode?, title?, subtitle? } -> saves them (title/subtitle are shown on /feed/)
const { guard } = require('../_auth');
const G = require('../_github');
const A = require('../_accounts');
const Feed = require('../_feed');

module.exports = async (req, res) => {
  const who = guard(req, res, req.method === 'POST' ? 'POST' : 'GET');
  if (!who) return;
  if (who.role !== 'admin') return res.status(403).json({ error: 'Solo el profesor.' });
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'POST') {
      const b = req.body || {};
      if (b.classCode !== undefined) {
        const code = String(b.classCode).trim().toUpperCase();
        if (code && !/^[A-Z0-9-]{4,30}$/.test(code)) throw G.userError('El código debe tener de 4 a 30 letras o números.');
        await A.update('Admin: class code', async acc => { acc.classCode = code; });
      }
      if (b.title !== undefined || b.subtitle !== undefined) {
        await G.commit(G.MAIN, 'Admin: feed title', async () => {
          const feed = await Feed.read();
          if (b.title !== undefined) feed.title = String(b.title).slice(0, 80);
          if (b.subtitle !== undefined) feed.subtitle = String(b.subtitle).slice(0, 200);
          return [{ path: Feed.path(), content: JSON.stringify(feed, null, 2) + '\n', encoding: 'utf-8' }];
        });
      }
      return res.status(200).json({ ok: true });
    }
    const [acc, sites, feed] = await Promise.all([A.read().catch(() => ({ classCode: '', users: [] })), G.readSites(), Feed.read()]);
    res.status(200).json({
      classCode: acc.classCode, title: feed.title, subtitle: feed.subtitle,
      students: acc.users.map(u => Object.assign(A.publicUser(u), { sites: sites.filter(s => s.owner === u.id).map(s => s.slug) })),
    });
  } catch (e) {
    G.sendError(res, e);
  }
};
