// Public: GET -> feed.json as it is on main right now.
// The static /feed.json only changes after Vercel finishes a deploy, so the feed
// would lag behind every publish or delete; this reads GitHub directly instead.
// The CDN keeps a copy for a few seconds so visitors don't each hit GitHub.
const G = require('../_github');
const Feed = require('../_feed');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const feed = await Feed.read();
    res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10');
    res.status(200).json(feed);
  } catch (e) {
    G.sendError(res, e);
  }
};
