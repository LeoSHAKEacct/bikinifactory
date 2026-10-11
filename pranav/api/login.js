const { guard } = require('./_auth');

module.exports = async (req, res) => {
  if (!guard(req, res, 'POST')) return;
  res.status(200).json({ ok: true });
};
