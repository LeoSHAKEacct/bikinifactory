// POST /api/google-connect { slug }  -> { url }  Google sign-in page for this site's calendar.
const { guard, canEdit } = require('./_auth');
const G = require('./_github');
const Google = require('./_google');

module.exports = async (req, res) => {
  const who = guard(req, res, 'POST');
  if (!who) return;
  try {
    if (!Google.configured()) throw Google.missingConfig();
    const { slug } = req.body || {};
    if (!canEdit(who, (await G.readSites()).find(s => s.slug === slug))) throw G.userError('Sitio desconocido.');
    res.status(200).json({ url: Google.authUrl(req, slug) });
  } catch (e) {
    G.sendError(res, e);
  }
};
