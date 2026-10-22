// Student accounts.
// POST { action: 'signup', name, email, password }       -> { token, user }
// POST { action: 'login', email, password }              -> { token, user }
// GET  (Authorization: Bearer)                            -> { user }
const G = require('../_github');
const C = require('../_crypto');
const A = require('../_accounts');
const { identify, sessionToken } = require('../_auth');

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (!C.hasKey()) throw G.userError('Las cuentas de estudiantes aún no están activas (falta TOKEN_KEY en Vercel).', 500);
    if (req.method === 'GET') {
      const who = identify(req);
      if (!who || who.role !== 'user') return res.status(401).json({ error: 'Entra de nuevo.' });
      const u = (await A.read()).users.find(x => x.id === who.id);
      if (!u) return res.status(401).json({ error: 'Tu cuenta ya no existe.' });
      return res.status(200).json({ user: A.publicUser(u) });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const b = req.body || {};
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');

    if (b.action === 'login') {
      const u = (await A.read()).users.find(x => x.email === email);
      if (!u || !C.checkPassword(password, u.hash)) throw G.userError('Correo o contraseña incorrectos.', 401);
      return res.status(200).json({ token: sessionToken(u), user: A.publicUser(u) });
    }

    if (b.action === 'signup') {
      const name = String(b.name || '').trim().slice(0, 60);
      if (name.length < 2) throw G.userError('Escribe tu nombre.');
      if (!EMAIL.test(email)) throw G.userError('Escribe un correo válido.');
      if (password.length < 6) throw G.userError('La contraseña debe tener al menos 6 caracteres.');
      const user = await A.update(`Admin: new student account`, async acc => {
        if (acc.users.some(x => x.email === email)) throw G.userError('Ya existe una cuenta con ese correo. Entra con tu contraseña.', 409);
        const u = { id: A.newId(), name, email, hash: C.hashPassword(password), createdAt: new Date().toISOString() };
        acc.users.push(u);
        return u;
      });
      return res.status(200).json({ token: sessionToken(user), user: A.publicUser(user) });
    }
    throw G.userError('Acción desconocida.');
  } catch (e) {
    G.sendError(res, e);
  }
};
