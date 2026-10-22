// POST /api/google-disconnect { slug }
const { guard, canEdit } = require('../_auth');
const G = require('../_github');
const Google = require('../_google');

module.exports = async (req, res) => {
  const who = guard(req, res, 'POST');
  if (!who) return;
  try {
    const { slug } = req.body || {};
    if (!canEdit(who, (await G.readSites()).find(s => s.slug === slug))) throw G.userError('Sitio desconocido.');
    await Google.removeConnection(slug);
    res.status(200).json({ ok: true });
  } catch (e) {
    G.sendError(res, e);
  }
};
