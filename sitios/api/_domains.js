// Own domains for single sites (ejemplo.com -> /e/).
// The list lives in sitios/vercel.json itself: one host rewrite per domain (and its www),
// plus the domain under the "/ -> /feed/" redirect's `missing` hosts. Changing it commits
// that file to main, so the routing goes live with the deploy that follows (~1 minute).
// With VERCEL_TOKEN set, the domain is also added to / removed from the Vercel project.
const G = require('./_github');

const CONFIG = `${G.DIR}/vercel.json`;
const KEEP = '_site/|api/|admin|editor|feed'; // shared paths every domain still serves as-is
const DOMAIN = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

// "https://www.Ejemplo.com/" -> "ejemplo.com"
function clean(v) {
  return String(v || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
}
function valid(d) { return DOMAIN.test(d) && !/(^|\.)vercel\.app$/.test(d); }

// { 'ejemplo.com': 'e', ... } from the config's host rewrites (www entries folded in).
function list(config) {
  const out = {};
  (config.rewrites || []).forEach(r => {
    const host = r.has && r.has[0] && r.has[0].type === 'host' && r.has[0].value;
    const m = host && /^\/([a-z0-9-]+)\/\$1$/.exec(r.destination || '');
    if (m) out[host.replace(/^www\./, '')] = m[1];
  });
  return out;
}

// The config with exactly these domains routed.
function build(config, domains) {
  const c = JSON.parse(JSON.stringify(config));
  c.rewrites = (c.rewrites || []).filter(r => !(r.has && r.has.some(h => h.type === 'host')));
  const hosts = [];
  Object.keys(domains).sort().forEach(d => {
    const slug = domains[d];
    [d, 'www.' + d].forEach(host => {
      hosts.push(host);
      c.rewrites.push({ source: `/((?!${KEEP}|${slug}/).*)`, has: [{ type: 'host', value: host }], destination: `/${slug}/$1` });
    });
  });
  c.redirects = (c.redirects || []).map(r => {
    if (r.source !== '/' || r.destination !== '/feed/') return r;
    const out = { source: '/', destination: '/feed/', permanent: false };
    if (hosts.length) out.missing = hosts.map(h => ({ type: 'host', value: h }));
    return out;
  });
  return c;
}

async function read() { return (await G.readJson(CONFIG, G.MAIN)) || {}; }

async function save(message, change) {
  await G.commit(G.MAIN, message, async () => {
    const config = await read();
    const domains = list(config);
    change(domains);
    return [{ path: CONFIG, content: JSON.stringify(build(config, domains), null, 2) + '\n', encoding: 'utf-8' }];
  });
}

// ---------- Vercel project (optional, needs VERCEL_TOKEN) ----------
const TEAM = process.env.VERCEL_TEAM_ID || 'team_dTuVFVmJCjYXmJ8WFKGvRXQV';
const PROJECT = process.env.VERCEL_PROJECT_ID || 'sitios';
const hasToken = () => Boolean(process.env.VERCEL_TOKEN);

async function vercel(path, opts = {}) {
  const sep = path.includes('?') ? '&' : '?';
  const r = await fetch(`https://api.vercel.com${path}${sep}teamId=${TEAM}`, {
    ...opts,
    headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
  });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body };
}

// Adds the domain and its www to the project; "already on this project" counts as done.
async function attach(d) {
  for (const name of [d, 'www.' + d]) {
    const r = await vercel(`/v10/projects/${PROJECT}/domains`, { method: 'POST', body: JSON.stringify({ name }) });
    const code = r.body.error && r.body.error.code;
    if (!r.ok && code !== 'domain_already_in_use_by_project' && code !== 'domain_already_exists') {
      throw G.userError(`Vercel no aceptó ${name}: ${(r.body.error && r.body.error.message) || r.status}`, 502);
    }
  }
}
async function detach(d) {
  for (const name of [d, 'www.' + d]) await vercel(`/v9/projects/${PROJECT}/domains/${name}`, { method: 'DELETE' });
}
// 'ok' | 'dns' (added, DNS still missing) | 'missing' (not on the project) | 'unknown' (no token)
async function status(d) {
  if (!hasToken()) return 'unknown';
  const p = await vercel(`/v9/projects/${PROJECT}/domains/${d}`);
  if (!p.ok) return 'missing';
  const c = await vercel(`/v6/domains/${d}/config`);
  return c.ok && c.body.misconfigured === false && p.body.verified !== false ? 'ok' : 'dns';
}

module.exports = { clean, valid, list, build, read, save, hasToken, attach, detach, status };
