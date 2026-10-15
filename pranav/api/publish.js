// POST /api/publish { slug, content, images }
// Puts a site live: commits content.json, index.html and its photos to main
// (Vercel redeploys), then clears the site's draft.
const { guard } = require('./_auth');
const { buildPage } = require('./_shell');
const G = require('./_github');

module.exports = async (req, res) => {
  if (!guard(req, res, 'POST')) return;
  const { slug, content, images } = req.body || {};
  try {
    const json = G.checkContent(content);
    const sites = await G.readSites();
    if (!sites.some(s => s.slug === slug)) throw G.userError('Sitio desconocido.');
    const imgs = G.imageEntries(slug, images);
    const uploaded = new Set(imgs.map(e => e.path));

    // Photos saved in drafts but never published must be copied to main.
    const copies = [];
    for (const ref of G.photoRefs(slug, content)) {
      const path = G.sitePath(ref.slug, ref.name);
      if (uploaded.has(path) || copies.some(c => c.path === path)) continue;
      if (await G.fileSha(path, G.MAIN)) continue;
      const sha = await G.fileSha(path, G.DRAFTS).catch(() => null);
      if (!sha) throw G.userError(`No se encontró la foto ${ref.name}. Vuelve a subirla.`);
      copies.push({ path, sha });
    }

    const sha = await G.commit(G.MAIN, `Admin: publish /${slug}`, async () => [
      ...imgs,
      ...copies,
      { path: G.sitePath(slug, 'content.json'), content: json, encoding: 'utf-8' },
      { path: G.sitePath(slug, 'index.html'), content: buildPage(slug, content), encoding: 'utf-8' },
    ]);

    // The draft now equals what is live; drop it (best effort).
    try {
      const draftPath = G.sitePath(slug, 'draft.json');
      await G.commit(G.DRAFTS, `Admin: clear draft /${slug}`, async () =>
        (await G.fileSha(draftPath, G.DRAFTS)) ? [{ path: draftPath, remove: true }] : []);
    } catch (e) { /* the draft is identical anyway */ }

    res.status(200).json({ ok: true, commit: sha, url: `/${slug}/` });
  } catch (e) {
    G.sendError(res, e);
  }
};
