// POST /api/save { slug, content, images, create? }
// Saves a draft (and any new photos) to the drafts branch. Not live until published.
// With create: { label } it also registers a new site.
const { guard, canEdit } = require('./_auth');
const G = require('./_github');

module.exports = async (req, res) => {
  const who = guard(req, res, 'POST');
  if (!who) return;
  const { slug, content, images, create } = req.body || {};
  const MAX_STUDENT_SITES = 20;
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
    // A new copy gets its own copies of photos borrowed from other sites, so
    // deleting the original site never breaks it (blobs are reused, no upload).
    const borrowed = [];
    if (create) {
      for (const ref of G.photoRefs(slug, content)) {
        if (ref.slug === slug || borrowed.some(x => x.name === ref.name)) continue;
        const from = G.sitePath(ref.slug, ref.name);
        const sha = (await G.fileSha(from, G.DRAFTS).catch(() => null)) || (await G.fileSha(from, G.MAIN));
        if (sha) borrowed.push({ from: `/${ref.slug}/${ref.name}`, name: ref.name, sha });
      }
      (function walk(o) {
        if (Array.isArray(o)) return o.forEach(walk);
        if (o && typeof o === 'object') Object.keys(o).forEach(k => {
          const b = k === 'photo' && borrowed.find(x => x.from === o[k]);
          if (b) o[k] = b.name; else walk(o[k]);
        });
      })(content);
    }
    const imgs = G.imageEntries(slug, images).concat(borrowed.map(b => ({ path: G.sitePath(slug, b.name), sha: b.sha })));
    const finalJson = create ? G.checkContent(content) : json;
    await G.commit(G.DRAFTS, create ? `Admin: create /${slug}` : `Admin: save draft /${slug}`, async () => {
      const sites = await G.readSites();
      const site = sites.find(s => s.slug === slug);
      const entries = [...imgs, { path: G.sitePath(slug, 'draft.json'), content: finalJson, encoding: 'utf-8' }];
      if (create) {
        if (site) throw G.userError(`Ya existe un sitio en /${slug}/.`, 409);
        if (who.role === 'user' && sites.filter(s => s.owner === who.id).length >= MAX_STUDENT_SITES) {
          throw G.userError(`Llegaste al máximo de ${MAX_STUDENT_SITES} sitios.`, 403);
        }
        sites.push(who.role === 'user' ? { slug, label, owner: who.id } : { slug, label });
        entries.push({ path: `${G.DIR}/sites.json`, content: JSON.stringify(sites, null, 2) + '\n', encoding: 'utf-8' });
      } else if (!canEdit(who, site)) {
        throw G.userError('Sitio desconocido.', 403);
      }
      return entries;
    });
    res.status(200).json({ ok: true, content: create ? content : undefined });
  } catch (e) {
    G.sendError(res, e);
  }
};
