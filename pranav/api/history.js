// GET /api/history?slug=x          -> { versions: [{ sha, date, message }] }  published versions, newest first
// GET /api/history?slug=x&sha=abc  -> { content }  that version
const { guard } = require('./_auth');
const G = require('./_github');

module.exports = async (req, res) => {
  if (!guard(req, res, 'GET')) return;
  const { slug, sha } = req.query;
  try {
    if (typeof slug !== 'string' || !G.SLUG.test(slug)) throw G.userError('Sitio desconocido.');
    const path = G.sitePath(slug, 'content.json');
    if (sha) {
      if (!/^[0-9a-f]{7,40}$/.test(sha)) throw G.userError('Versión inválida.');
      const content = await G.readJson(path, sha);
      if (!content) throw G.userError('Versión no encontrada.', 404);
      return res.status(200).json({ content });
    }
    const commits = await G.gh(`/commits?path=${encodeURIComponent(path)}&sha=${G.MAIN}&per_page=30`);
    res.status(200).json({
      versions: commits.map(c => ({ sha: c.sha, date: c.commit.committer.date, message: c.commit.message.split('\n')[0] })),
    });
  } catch (e) {
    G.sendError(res, e);
  }
};
