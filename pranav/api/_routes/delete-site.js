// POST /api/delete-site { slug }
// Removes a site everywhere: its live files and feed card (main) and its
// drafts, photos, calendar link and list entry (drafts branch).
const { guard, canEdit } = require('../_auth');
const G = require('../_github');
const Feed = require('../_feed');
const Google = require('../_google');

module.exports = async (req, res) => {
  const who = guard(req, res, 'POST');
  if (!who) return;
  const { slug } = req.body || {};
  try {
    const site = (await G.readSites()).find(s => s.slug === slug);
    if (!canEdit(who, site)) throw G.userError('No puedes eliminar este sitio.', 403);
    const prefix = `${G.DIR}/${slug}/`;
    try { await Google.removeConnection(slug); } catch (e) { /* the files go away below anyway */ }
    await G.commit(G.MAIN, `Admin: delete /${slug}`, async () => {
      const files = await G.listFiles(prefix, G.MAIN);
      return [...files.map(f => ({ path: f.path, remove: true })), await Feed.withSite(slug, null)];
    });
    await G.commit(G.DRAFTS, `Admin: delete /${slug}`, async () => {
      const files = await G.listFiles(prefix, G.DRAFTS);
      const sites = (await G.readSites()).filter(s => s.slug !== slug);
      return [...files.map(f => ({ path: f.path, remove: true })),
        { path: `${G.DIR}/sites.json`, content: JSON.stringify(sites, null, 2) + '\n', encoding: 'utf-8' }];
    });
    res.status(200).json({ ok: true });
  } catch (e) {
    G.sendError(res, e);
  }
};
