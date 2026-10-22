// Single entry point for every /api/<route> request. Vercel's Hobby plan
// allows at most 12 functions per deployment, so the handlers live in
// _routes/ (ignored as functions) and this one function dispatches to them.
const ROUTES = {
  account: require('./_routes/account'),
  book: require('./_routes/book'),
  class: require('./_routes/class'),
  'delete-site': require('./_routes/delete-site'),
  'google-callback': require('./_routes/google-callback'),
  'google-connect': require('./_routes/google-connect'),
  'google-disconnect': require('./_routes/google-disconnect'),
  history: require('./_routes/history'),
  image: require('./_routes/image'),
  load: require('./_routes/load'),
  login: require('./_routes/login'),
  publish: require('./_routes/publish'),
  ratings: require('./_routes/ratings'),
  save: require('./_routes/save'),
  slots: require('./_routes/slots'),
};

module.exports = (req, res) => {
  const handler = ROUTES[req.query.route];
  if (!handler) return res.status(404).json({ error: 'Not found' });
  return handler(req, res);
};
