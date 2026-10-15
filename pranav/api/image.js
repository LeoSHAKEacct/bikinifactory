// GET /api/image?slug=x&name=foto.jpg
// Serves a site photo from the drafts branch or main, so the admin can show
// photos that are saved but not yet published (or not yet deployed).
const G = require('./_github');

const TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

module.exports = async (req, res) => {
  const { slug, name } = req.query;
  if (typeof slug !== 'string' || !G.SLUG.test(slug) || typeof name !== 'string' || !G.IMAGE_NAME.test(name)) {
    return res.status(400).end();
  }
  try {
    const path = G.sitePath(slug, name);
    const buf = (await G.readRaw(path, G.DRAFTS).catch(() => null)) || (await G.readRaw(path, G.MAIN));
    if (!buf) return res.status(404).end();
    res.setHeader('Content-Type', TYPES[name.split('.').pop()]);
    // Photo names are unique per upload, so they never change.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.status(200).send(buf);
  } catch (e) {
    res.status(502).end();
  }
};
