// Teacher only: grades for each site and the feed order they produce.
// GET                                  -> { categories, ratings: { slug: { robust, clear, attractive, at } } }
// POST { slug, scores: { robust, ... } } -> saves one site's grades (private, encrypted; no deploy)
// POST { apply: true }                 -> writes the ranking into feed.json (one deploy)
// Grades are kept with the accounts (encrypted); feed.json only gets each site's position.
const { guard } = require('../_auth');
const G = require('../_github');
const A = require('../_accounts');
const Feed = require('../_feed');

const CATEGORIES = [['robust', 'Robusto'], ['clear', 'Claro'], ['attractive', 'Atractivo']];
const total = r => CATEGORIES.reduce((n, c) => n + (+r[c[0]] || 0), 0);

module.exports = async (req, res) => {
  const who = guard(req, res, req.method === 'POST' ? 'POST' : 'GET');
  if (!who) return;
  if (who.role !== 'admin') return res.status(403).json({ error: 'Solo el profesor.' });
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const acc = await A.read().catch(() => ({}));
      return res.status(200).json({ categories: CATEGORIES, ratings: acc.ratings || {} });
    }
    const b = req.body || {};
    if (b.apply) {
      const ratings = (await A.read().catch(() => ({}))).ratings || {};
      let ranked = 0;
      await G.commit(G.MAIN, 'Admin: feed ranking', async () => {
        const feed = await Feed.read();
        const order = feed.sites.filter(s => ratings[s.slug] && total(ratings[s.slug]) > 0)
          .sort((x, y) => total(ratings[y.slug]) - total(ratings[x.slug]) || String(y.updatedAt).localeCompare(String(x.updatedAt)));
        feed.sites.forEach(s => { delete s.rank; });
        order.forEach((s, i) => { s.rank = i + 1; });
        ranked = order.length;
        return [{ path: Feed.path(), content: JSON.stringify(feed, null, 2) + '\n', encoding: 'utf-8' }];
      });
      return res.status(200).json({ ok: true, ranked });
    }
    if (typeof b.slug !== 'string' || !G.SLUG.test(b.slug)) throw G.userError('Sitio desconocido.');
    const scores = {};
    CATEGORIES.forEach(([k]) => {
      const v = b.scores && b.scores[k];
      if (v === '' || v == null) return;
      const n = Math.round(+v);
      if (!(n >= 1 && n <= 10)) throw G.userError('Cada nota debe ser de 1 a 10.');
      scores[k] = n;
    });
    await A.update(`Admin: grade /${b.slug}`, async acc => {
      acc.ratings = acc.ratings || {};
      if (Object.keys(scores).length) acc.ratings[b.slug] = Object.assign(scores, { at: new Date().toISOString() });
      else delete acc.ratings[b.slug];
    });
    res.status(200).json({ ok: true });
  } catch (e) {
    G.sendError(res, e);
  }
};
