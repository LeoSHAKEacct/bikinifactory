// POST /api/google-connect { slug }  -> { url }  Google sign-in page for this site's calendar.
const { guard } = require('./_auth');
const G = require('./_github');
const Google = require('./_google');

module.exports = async (req, res) => {
  if (!guard(req, res, 'POST')) return;
  try {
    if (!Google.configured()) throw Google.missingConfig();
    const { slug } = req.body || {};
    if (!(await G.readSites()).some(s => s.slug === slug)) throw G.userError('Sitio desconocido.');
    res.status(200).json({ url: Google.authUrl(req, slug) });
  } catch (e) {
    G.sendError(res, e);
  }
};
