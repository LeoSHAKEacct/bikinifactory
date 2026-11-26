// Teacher only: own domains for single sites.
// GET                         -> { domains: { domain: { slug, status } }, auto }
//                                status: ok | dns | missing | unknown (auto: VERCEL_TOKEN is set)
// POST { slug, domain }       -> routes the domain to that site (one domain per site)
// POST { slug, remove: true } -> stops routing that site's domain
const { guard } = require('../_auth');
const G = require('../_github');
const D = require('../_domains');

module.exports = async (req, res) => {
  const who = guard(req, res, req.method === 'POST' ? 'POST' : 'GET');
  if (!who) return;
  if (who.role !== 'admin') return res.status(403).json({ error: 'Solo el profesor.' });
  res.setHeader('Cache-Control', 'no-store');
  try {
    const current = D.list(await D.read());
    if (req.method === 'GET') {
      const domains = {};
      await Promise.all(Object.keys(current).map(async d => {
        domains[d] = { slug: current[d], status: await D.status(d).catch(() => 'unknown') };
      }));
      return res.status(200).json({ domains, auto: D.hasToken() });
    }

    const b = req.body || {};
    if (!(await G.readSites()).some(s => s.slug === b.slug)) throw G.userError('Sitio desconocido.', 404);
    const old = Object.keys(current).filter(d => current[d] === b.slug);

    if (b.remove) {
      if (!old.length) return res.status(200).json({ ok: true });
      await D.save(`Admin: remove domain of /${b.slug}`, m => old.forEach(d => delete m[d]));
      if (D.hasToken()) await Promise.all(old.map(d => D.detach(d).catch(() => {})));
      return res.status(200).json({ ok: true });
    }

    const domain = D.clean(b.domain);
    if (!D.valid(domain)) throw G.userError('Escribe un dominio válido, por ejemplo ejemplo.com');
    if (current[domain] && current[domain] !== b.slug) throw G.userError(`${domain} ya está conectado al sitio /${current[domain]}/.`, 409);
    if (D.hasToken()) await D.attach(domain); // first, so a refused domain changes nothing
    await D.save(`Admin: domain ${domain} -> /${b.slug}`, m => {
      old.forEach(d => delete m[d]);
      m[domain] = b.slug;
    });
    if (D.hasToken()) await Promise.all(old.filter(d => d !== domain).map(d => D.detach(d).catch(() => {})));
    res.status(200).json({ ok: true, domain, auto: D.hasToken() });
  } catch (e) {
    G.sendError(res, e);
  }
};
