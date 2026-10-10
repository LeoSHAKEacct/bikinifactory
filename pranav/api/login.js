const { checkPassword } = require('./_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'Falta configurar ADMIN_PASSWORD en Vercel.' });
  }
  if (!checkPassword(req)) return res.status(401).json({ error: 'Contraseña incorrecta.' });
  res.status(200).json({ ok: true, canPublish: Boolean(process.env.GITHUB_TOKEN) });
};
