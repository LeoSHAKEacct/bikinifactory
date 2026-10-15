// POST /api/google-disconnect { slug }
const { guard } = require('./_auth');
const G = require('./_github');
const Google = require('./_google');

module.exports = async (req, res) => {
  if (!guard(req, res, 'POST')) return;
  try {
    const { slug } = req.body || {};
    if (!(await G.readSites()).some(s => s.slug === slug)) throw G.userError('Sitio desconocido.');
    await Google.removeConnection(slug);
    res.status(200).json({ ok: true });
  } catch (e) {
    G.sendError(res, e);
  }
};
