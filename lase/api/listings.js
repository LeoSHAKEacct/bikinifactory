// LASE listings CRM API (used by /admin). Data lives only in this project's folder: lase/data/.
//   POST { action: "image", name, data(base64 jpeg) }  -> stores the photo as a git blob, returns { path, sha }
//   POST { action: "save", listings: [...], images: [{ path, sha }] } -> one commit: data/listings.json + new photos
// Every request needs header x-admin-password = ADMIN_PASSWORD (Vercel env). Needs GITHUB_TOKEN (Vercel env).
const crypto = require('crypto');

const REPO = process.env.GITHUB_REPO || 'LeoSHAKEacct/bikinifactory';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const DIR = 'lase/data';
const MAX_IMAGE = 2.5 * 1024 * 1024;

function okPassword(req) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return false;
  const a = crypto.createHash('sha256').update(String(req.headers['x-admin-password'] || '')).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

async function gh(path, opts = {}) {
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json', 'User-Agent': 'lase-crm' },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(`GitHub ${r.status}: ${body.message || 'error'}`); e.status = r.status; throw e; }
  return body;
}

const str = (v, n = 200) => String(v == null ? '' : v).slice(0, n);
function clean(l) {
  return {
    id: str(l.id, 60).toLowerCase().replace(/[^a-z0-9-]/g, '') || crypto.randomBytes(4).toString('hex'),
    tab: ['buy', 'rent'].includes(l.tab) ? l.tab : 'buy',
    title: str(l.title, 120), loc: str(l.loc, 120), price: str(l.price, 60), per: str(l.per, 30),
    beds: str(l.beds, 40), baths: str(l.baths, 40), size: str(l.size, 40),
    img: str(l.img, 400), desc: str(l.desc, 1200), hidden: !!l.hidden,
  };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'ADMIN_PASSWORD is not set in Vercel.' });
  if (!okPassword(req)) return res.status(401).json({ error: 'Wrong password.' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  if (body.action === 'login') return res.json({ ok: true });
  if (!process.env.GITHUB_TOKEN) return res.status(500).json({ error: 'GITHUB_TOKEN is not set in Vercel (Settings → Environment Variables).' });
  try {
    if (body.action === 'image') {
      const name = str(body.name, 80).toLowerCase().replace(/[^a-z0-9.-]/g, '-');
      if (!/\.(jpg|jpeg|png|webp)$/.test(name)) return res.status(400).json({ error: 'Photos must be JPG, PNG or WEBP.' });
      const data = String(body.data || '');
      if (Buffer.byteLength(data, 'base64') > MAX_IMAGE) return res.status(400).json({ error: 'Photo too large.' });
      const blob = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: data, encoding: 'base64' }) });
      const path = `img/${Date.now().toString(36)}-${name}`;
      return res.json({ path, sha: blob.sha });
    }
    if (body.action === 'save') {
      const listings = (Array.isArray(body.listings) ? body.listings : []).slice(0, 300).map(clean);
      const images = (Array.isArray(body.images) ? body.images : []).filter(i => /^img\/[a-z0-9.-]+$/.test(i.path) && /^[0-9a-f]{40}$/.test(i.sha));
      const ref = await gh(`/git/ref/heads/${BRANCH}`);
      const base = await gh(`/git/commits/${ref.object.sha}`);
      const json = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: JSON.stringify(listings, null, 2) + '\n', encoding: 'utf-8' }) });
      const tree = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: base.tree.sha, tree: [
        { path: `${DIR}/listings.json`, mode: '100644', type: 'blob', sha: json.sha },
        ...images.map(i => ({ path: `${DIR}/${i.path}`, mode: '100644', type: 'blob', sha: i.sha })),
      ] }) });
      const commit = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message: `LASE CRM: publish ${listings.length} listings`, tree: tree.sha, parents: [ref.object.sha] }) });
      await gh(`/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });
      return res.json({ ok: true, count: listings.length });
    }
    return res.status(400).json({ error: 'Unknown action.' });
  } catch (e) {
    return res.status(e.status === 409 || e.status === 422 ? 409 : 500).json({ error: e.status === 409 || e.status === 422 ? 'Someone else just published. Reload and try again.' : e.message });
  }
};
