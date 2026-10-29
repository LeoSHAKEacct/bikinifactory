// GET /api/load            -> { sites }
// GET /api/load?slug=x     -> { published, draft, calendar }  (straight from GitHub, no deploy lag)
const { guard, canEdit } = require('../_auth');
const A = require('../_accounts');
const { MAIN, DRAFTS, sitePath, readJson, readSites, sendError } = require('../_github');
const Google = require('../_google');

module.exports = async (req, res) => {
  const who = guard(req, res, 'GET');
  if (!who) return;
  res.setHeader('Cache-Control', 'no-store');
  try {
    const all = await readSites();
    const slug = req.query.slug;
    if (!slug) {
      // Teacher sees every site (with its owner's name); a student only their own.
      let sites = all.filter(s => canEdit(who, s));
      if (who.role === 'admin') {
        const users = (await A.read().catch(() => ({ users: [] }))).users;
        sites = sites.map(s => Object.assign({}, s, { ownerName: s.owner ? ((users.find(u => u.id === s.owner) || {}).name || '?') : '' }));
      }
      return res.status(200).json({ sites, who: who.role === 'admin' ? { role: 'admin' } : { role: 'user', name: who.name, site: who.site || '' } });
    }
    if (!canEdit(who, all.find(s => s.slug === slug))) return res.status(404).json({ error: 'Sitio desconocido.' });
    const [published, draft, conn] = await Promise.all([
      readJson(sitePath(slug, 'content.json'), MAIN),
      readJson(sitePath(slug, 'draft.json'), DRAFTS).catch(() => null),
      Google.readConnection(slug),
    ]);
    const calendar = { configured: Google.configured(), email: conn ? conn.email || '(conectado)' : null };
    res.status(200).json({ published, draft, calendar });
  } catch (e) {
    sendError(res, e);
  }
};
