// Shared GitHub helpers for the admin API.
//
// Published sites live on MAIN (pranav/<slug>/content.json, index.html, photos).
// Drafts and the site list live on the DRAFTS branch, which Vercel does not
// deploy (see vercel.json "git.deploymentEnabled"), so autosave costs no deploys.

const REPO = process.env.GITHUB_REPO || 'LeoSHAKEacct/bikinifactory';
const MAIN = process.env.GITHUB_BRANCH || 'main';
const DRAFTS = 'admin-drafts';
const DIR = (process.env.SITE_DIR || 'pranav').replace(/^\/+|\/+$/g, '');

const SLUG = /^[a-z0-9][a-z0-9-]{0,29}$/;
const RESERVED = ['admin', 'api', '_site', 'anamaria', 'mohammad', 'index', 'sites', 'public', 'static'];
const IMAGE_NAME = /^[a-z0-9][a-z0-9-]{0,60}\.(jpg|jpeg|png|webp)$/;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

async function gh(path, opts = {}, raw = false) {
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'site-admin',
    },
  });
  if (raw && r.ok) return Buffer.from(await r.arrayBuffer());
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(`GitHub ${r.status}: ${body.message || 'error'}`);
    err.status = r.status;
    throw err;
  }
  return body;
}

async function orNull(p) {
  try { return await p; } catch (e) { if (e.status === 404) return null; throw e; }
}

const sitePath = (slug, name) => `${DIR}/${slug}/${name}`;

// File contents as a Buffer, or null if missing.
function readRaw(path, ref) {
  return orNull(gh(`/contents/${encodeURI(path)}?ref=${ref}`, {}, true));
}

async function readJson(path, ref) {
  const buf = await readRaw(path, ref);
  return buf ? JSON.parse(buf.toString('utf8')) : null;
}

// Blob sha of a file, or null if missing.
async function fileSha(path, ref) {
  const meta = await orNull(gh(`/contents/${encodeURI(path)}?ref=${ref}`));
  return meta && !Array.isArray(meta) ? meta.sha : null;
}

async function ensureDrafts() {
  const ref = await orNull(gh(`/git/ref/heads/${DRAFTS}`));
  if (ref) return;
  const main = await gh(`/git/ref/heads/${MAIN}`);
  await gh('/git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${DRAFTS}`, sha: main.object.sha }) })
    .catch(e => { if (e.status !== 422) throw e; }); // 422: created meanwhile
}

async function readSites() {
  return (await readJson(`${DIR}/sites.json`, DRAFTS).catch(() => null))
    || (await readJson(`${DIR}/sites.json`, MAIN))
    || [];
}

// Commits files to a branch in one commit. `build` returns entries of
//   { path, content, encoding }  new file contents
//   { path, sha }                reuse an existing blob
//   { path, remove: true }       delete the file
// It is called again if the branch moved, so it can re-read state.
async function commit(branch, message, build) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const ref = await gh(`/git/ref/heads/${branch}`);
    const parent = await gh(`/git/commits/${ref.object.sha}`);
    const entries = await build();
    const tree = await Promise.all(entries.map(async e => {
      if (e.remove) return { path: e.path, mode: '100644', type: 'blob', sha: null };
      if (e.sha) return { path: e.path, mode: '100644', type: 'blob', sha: e.sha };
      const blob = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: e.content, encoding: e.encoding }) });
      return { path: e.path, mode: '100644', type: 'blob', sha: blob.sha };
    }));
    if (!tree.length) return ref.object.sha;
    const newTree = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: parent.tree.sha, tree }) });
    const c = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: newTree.sha, parents: [ref.object.sha] }) });
    try {
      await gh(`/git/refs/heads/${branch}`, { method: 'PATCH', body: JSON.stringify({ sha: c.sha, force: false }) });
      return c.sha;
    } catch (e) {
      if (e.status !== 422 || attempt === 3) throw e;
    }
  }
}

// Validates uploaded photos ({ name: dataUrl }) and returns file entries.
function imageEntries(slug, images) {
  return Object.entries(images || {}).map(([name, data]) => {
    if (!IMAGE_NAME.test(name) || typeof data !== 'string') throw userError(`Nombre de imagen inválido: ${name}`);
    const b64 = data.replace(/^data:image\/[a-z]+;base64,/, '');
    if (!/^[A-Za-z0-9+/=]+$/.test(b64) || b64.length * 0.75 > MAX_IMAGE_BYTES) throw userError(`Imagen inválida o muy grande: ${name}`);
    return { path: sitePath(slug, name), content: b64, encoding: 'base64' };
  });
}

// Every photo reference in a content object, as { slug, name }.
// "foto.jpg" belongs to the site itself; "/otro/foto.jpg" to another site.
function photoRefs(slug, content) {
  const refs = [];
  const add = v => {
    if (!v || /^https?:/.test(v)) return;
    const m = /^\/([a-z0-9][a-z0-9-]{0,29})\/([^/]+)$/.exec(v);
    const ref = m ? { slug: m[1], name: m[2] } : { slug, name: v };
    if (!IMAGE_NAME.test(ref.name)) throw userError(`Referencia de foto inválida: ${v}`);
    refs.push(ref);
  };
  // Any "photo" field, in any section.
  (function walk(o) {
    if (Array.isArray(o)) return o.forEach(walk);
    if (o && typeof o === 'object') Object.keys(o).forEach(k => (k === 'photo' && typeof o[k] === 'string' ? add(o[k]) : walk(o[k])));
  })(content);
  return refs;
}

function checkContent(content) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) throw userError('Contenido inválido.');
  const json = JSON.stringify(content, null, 2) + '\n';
  if (json.length > 200000 || json.includes('data:image')) throw userError('Contenido demasiado grande (¿una foto sin subir?).');
  return json;
}

function userError(msg, status = 400) {
  const e = new Error(msg);
  e.userStatus = status;
  return e;
}

function sendError(res, e) {
  if (e.userStatus) return res.status(e.userStatus).json({ error: e.message });
  res.status(502).json({ error: e.message });
}

module.exports = {
  MAIN, DRAFTS, DIR, SLUG, RESERVED, IMAGE_NAME,
  gh, orNull, sitePath, readRaw, readJson, fileSha, ensureDrafts, readSites, commit,
  imageEntries, photoRefs, checkContent, userError, sendError,
};
