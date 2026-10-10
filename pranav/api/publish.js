// One-click publish: commits a site's content (and any new photos) to the
// GitHub repo in a single commit. Vercel's Git integration then redeploys.
//
// Env vars (set in the Vercel project):
//   ADMIN_PASSWORD  password for the admin panel
//   GITHUB_TOKEN    fine-grained token with "Contents: read and write" on the repo
//   GITHUB_REPO     optional, default "LeoSHAKEacct/bikinifactory"
//   GITHUB_BRANCH   optional, default "main"
//   SITE_DIR        optional, folder of this Vercel project in the repo, default "pranav"

const { checkPassword } = require('./_auth');
const { buildPage } = require('./_shell');

const SLUGS = ['alana', 'a', 'b', 'c'];
const IMAGE_NAME = /^[a-z0-9][a-z0-9-]{0,60}\.(jpg|jpeg|png|webp)$/;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

async function gh(path, opts = {}) {
  const repo = process.env.GITHUB_REPO || 'LeoSHAKEacct/bikinifactory';
  const r = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'site-admin',
    },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(`GitHub ${r.status}: ${body.message || 'error'}`);
    err.status = r.status;
    throw err;
  }
  return body;
}

async function commitFiles(files, message) {
  const branch = process.env.GITHUB_BRANCH || 'main';
  const blobs = await Promise.all(files.map(async f => {
    const blob = await gh('/git/blobs', {
      method: 'POST',
      body: JSON.stringify({ content: f.content, encoding: f.encoding }),
    });
    return { path: f.path, mode: '100644', type: 'blob', sha: blob.sha };
  }));
  // Retry if someone else pushed between reading and updating the branch.
  for (let attempt = 0; attempt < 3; attempt++) {
    const ref = await gh(`/git/ref/heads/${branch}`);
    const parent = await gh(`/git/commits/${ref.object.sha}`);
    const tree = await gh('/git/trees', {
      method: 'POST',
      body: JSON.stringify({ base_tree: parent.tree.sha, tree: blobs }),
    });
    const commit = await gh('/git/commits', {
      method: 'POST',
      body: JSON.stringify({ message, tree: tree.sha, parents: [ref.object.sha] }),
    });
    try {
      await gh(`/git/refs/heads/${branch}`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: commit.sha, force: false }),
      });
      return commit.sha;
    } catch (e) {
      if (e.status !== 422 || attempt === 2) throw e;
    }
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkPassword(req)) return res.status(401).json({ error: 'Contraseña incorrecta.' });
  if (!process.env.GITHUB_TOKEN) {
    return res.status(500).json({ error: 'Falta configurar GITHUB_TOKEN en Vercel.' });
  }

  const { slug, content, images } = req.body || {};
  if (!SLUGS.includes(slug)) return res.status(400).json({ error: 'Sitio desconocido.' });
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return res.status(400).json({ error: 'Contenido inválido.' });
  }
  const contentJson = JSON.stringify(content, null, 2) + '\n';
  if (contentJson.length > 200000 || contentJson.includes('data:image')) {
    return res.status(400).json({ error: 'Contenido demasiado grande (¿una foto sin subir?).' });
  }

  const dir = (process.env.SITE_DIR || 'pranav').replace(/^\/+|\/+$/g, '');
  const prefix = dir ? `${dir}/${slug}` : slug;
  const files = [];

  for (const [name, data] of Object.entries(images || {})) {
    if (!IMAGE_NAME.test(name) || typeof data !== 'string') {
      return res.status(400).json({ error: `Nombre de imagen inválido: ${name}` });
    }
    const b64 = data.replace(/^data:image\/[a-z]+;base64,/, '');
    if (!/^[A-Za-z0-9+/=]+$/.test(b64) || b64.length * 0.75 > MAX_IMAGE_BYTES) {
      return res.status(400).json({ error: `Imagen inválida o muy grande: ${name}` });
    }
    files.push({ path: `${prefix}/${name}`, content: b64, encoding: 'base64' });
  }

  files.push({ path: `${prefix}/content.json`, content: contentJson, encoding: 'utf-8' });
  files.push({ path: `${prefix}/index.html`, content: buildPage(slug, content), encoding: 'utf-8' });

  try {
    const sha = await commitFiles(files, `Admin: publish /${slug}`);
    res.status(200).json({ ok: true, commit: sha, url: `/${slug}/` });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};
