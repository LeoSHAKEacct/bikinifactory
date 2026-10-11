// GET /api/load            -> { sites }
// GET /api/load?slug=x     -> { published, draft }  (straight from GitHub, no deploy lag)
const { guard } = require('./_auth');
const { MAIN, DRAFTS, sitePath, readJson, readSites, sendError } = require('./_github');

module.exports = async (req, res) => {
  if (!guard(req, res, 'GET')) return;
  res.setHeader('Cache-Control', 'no-store');
  try {
    const sites = await readSites();
    const slug = req.query.slug;
    if (!slug) return res.status(200).json({ sites });
    if (!sites.some(s => s.slug === slug)) return res.status(404).json({ error: 'Sitio desconocido.' });
    const [published, draft] = await Promise.all([
      readJson(sitePath(slug, 'content.json'), MAIN),
      readJson(sitePath(slug, 'draft.json'), DRAFTS).catch(() => null),
    ]);
    res.status(200).json({ published, draft });
  } catch (e) {
    sendError(res, e);
  }
};
