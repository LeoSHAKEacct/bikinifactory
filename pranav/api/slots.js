// GET /api/slots?slug=a&s=1&i=0&date=2026-10-14  -> { slots: ["09:00", ...] }
// Free start times for one bookable item on one day (public, used by visitors).
const G = require('./_github');
const Google = require('./_google');
const B = require('./_booking');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (!Google.configured()) throw Google.missingConfig();
    const { slug, s, i, date } = req.query;
    const { cfg, duration } = await B.findItem(slug, s, i);
    const list = B.candidates(date, cfg, duration);
    if (!list.length) return res.status(200).json({ slots: [] });
    const token = await Google.accessToken(slug);
    const busy = await Google.busy(token, list[0].start, list[list.length - 1].end, cfg.timezone);
    res.status(200).json({ slots: list.filter(x => !B.overlaps(x, busy)).map(x => x.time) });
  } catch (e) {
    G.sendError(res, e);
  }
};
