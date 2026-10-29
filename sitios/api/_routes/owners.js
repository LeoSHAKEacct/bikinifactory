// Teacher only: which email/phone each site is linked to.
// GET                                   -> { links: { slug: { email, phone, account: { name, email, phone } | null } } }
// POST { slug, email, phone }           -> links the site (an existing account with that email/phone gets it now)
// POST { slug, remove: true }           -> unlinks: the student loses the site and their login is deleted
//                                          (unless it still owns other sites), so they can sign up again
const { guard } = require('../_auth');
const G = require('../_github');
const A = require('../_accounts');
const O = require('../_owners');

module.exports = async (req, res) => {
  const who = guard(req, res, req.method === 'POST' ? 'POST' : 'GET');
  if (!who) return;
  if (who.role !== 'admin') return res.status(403).json({ error: 'Solo el profesor.' });
  res.setHeader('Cache-Control', 'no-store');
  try {
    const sites = await G.readSites();
    if (req.method === 'GET') {
      const acc = await A.read().catch(() => ({ users: [] }));
      const links = {};
      sites.forEach(s => {
        const l = (acc.contacts || {})[s.slug], u = s.owner && acc.users.find(x => x.id === s.owner);
        if (l || u) links[s.slug] = { email: (l && l.email) || '', phone: (l && l.phone) || '', account: u ? A.publicUser(u) : null };
      });
      return res.status(200).json({ links });
    }

    const b = req.body || {};
    const site = sites.find(s => s.slug === b.slug);
    if (!site) throw G.userError('Sitio desconocido.', 404);

    if (b.remove) {
      await A.update(`Admin: unlink /${site.slug}`, async acc => {
        if (acc.contacts) delete acc.contacts[site.slug];
        const ownsOther = site.owner && sites.some(s => s.slug !== site.slug && s.owner === site.owner);
        if (site.owner && !ownsOther) acc.users = acc.users.filter(u => u.id !== site.owner);
      });
      if (site.owner) await O.setOwner(site.slug, null);
      return res.status(200).json({ ok: true });
    }

    const email = O.email(b.email), phone = O.phone(b.phone);
    if (!email && !phone) throw G.userError('Escribe un correo o un teléfono.');
    if (email && !O.EMAIL.test(email)) throw G.userError('Ese correo no es válido.');
    if (phone && phone.length < 7) throw G.userError('Ese teléfono no es válido.');
    const link = {};
    if (email) link.email = email;
    if (phone) link.phone = phone;
    const owner = await A.update(`Admin: link /${site.slug}`, async acc => {
      acc.contacts = acc.contacts || {};
      acc.contacts[site.slug] = link;
      // Someone who already has an account with this email/phone gets the site right away.
      const u = acc.users.find(x => (email && x.email === email) || (phone && x.phone && O.samePhone(x.phone, phone)));
      return u ? u.id : null;
    });
    // A different owner from before loses the site; the matching account (if any) gets it.
    if ((owner || null) !== (site.owner || null)) await O.setOwner(site.slug, owner);
    res.status(200).json({ ok: true, linkedAccount: Boolean(owner) });
  } catch (e) {
    G.sendError(res, e);
  }
};
