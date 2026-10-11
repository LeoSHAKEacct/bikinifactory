// POST /api/save { slug, content, images, create? }
// Saves a draft (and any new photos) to the drafts branch. Not live until published.
// With create: { label } it also registers a new site.
const { guard } = require('./_auth');
const G = require('./_github');

module.exports = async (req, res) => {
  if (!guard(req, res, 'POST')) return;
  const { slug, content, images, create } = req.body || {};
  try {
    const json = G.checkContent(content);
    G.photoRefs(slug, content);
    await G.ensureDrafts();
    const label = create ? String(create.label || '').trim().slice(0, 40) : '';
    if (create) {
      if (typeof slug !== 'string' || !G.SLUG.test(slug) || G.RESERVED.includes(slug)) {
        throw G.userError('Dirección inválida. Usa letras minúsculas, números o guiones.');
      }
      if (!label) throw G.userError('Falta el nombre del sitio.');
      if (await G.fileSha(G.sitePath(slug, 'index.html'), G.MAIN)) {
        throw G.userError(`La dirección /${slug}/ ya está en uso.`, 409);
      }
    }
    const imgs = G.imageEntries(slug, images);
    await G.commit(G.DRAFTS, create ? `Admin: create /${slug}` : `Admin: save draft /${slug}`, async () => {
      const sites = await G.readSites();
      const known = sites.some(s => s.slug === slug);
      const entries = [...imgs, { path: G.sitePath(slug, 'draft.json'), content: json, encoding: 'utf-8' }];
      if (create) {
        if (known) throw G.userError(`Ya existe un sitio en /${slug}/.`, 409);
        sites.push({ slug, label });
        entries.push({ path: `${G.DIR}/sites.json`, content: JSON.stringify(sites, null, 2) + '\n', encoding: 'utf-8' });
      } else if (!known) {
        throw G.userError('Sitio desconocido.');
      }
      return entries;
    });
    res.status(200).json({ ok: true });
  } catch (e) {
    G.sendError(res, e);
  }
};
