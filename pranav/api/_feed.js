// The public directory of published sites: <dir>/feed.json on main, rewritten
// in the same commit as each publish or delete.
const G = require('./_github');

const path = () => `${G.DIR}/feed.json`;

function photoPath(slug, v) {
  if (!v || /^https?:/.test(v)) return v || '';
  return v[0] === '/' ? v : `/${slug}/${v}`;
}

// Short card for the feed, built from a site's published content.
function entry(slug, content, ownerName) {
  const name = content.name || '';
  const fill = v => String(v || '').replace(/\{nombre\}/g, name).replace(/\{telefono\}/g, '');
  const secs = Array.isArray(content.sections) ? content.sections : [];
  const hero = secs.find(s => s.type === 'hero') || content.hero || {};
  const gallery = secs.reduce((a, s) => a.concat(s.gallery || []), []).find(g => g.photo && g.kind !== 'video');
  const zones = secs.find(s => s.type === 'zones') || content.zones || {};
  return {
    slug,
    name: fill(name),
    category: fill(content.category),
    description: fill((content.seo || {}).description || hero.lead),
    photo: photoPath(slug, hero.photo || (gallery && gallery.photo)),
    phone: String(content.phone || '').replace(/\D/g, ''),
    places: (zones.places || []).slice(0, 4),
    owner: ownerName || '',
    updatedAt: new Date().toISOString(),
  };
}

async function read(ref) {
  return (await G.readJson(path(), ref || G.MAIN).catch(() => null)) || { title: '', subtitle: '', sites: [] };
}

// File entry for a commit: the feed with this site added/updated (or removed when e is null).
async function withSite(slug, e) {
  const feed = await read();
  feed.sites = feed.sites.filter(s => s.slug !== slug);
  if (e) feed.sites.unshift(e);
  return { path: path(), content: JSON.stringify(feed, null, 2) + '\n', encoding: 'utf-8' };
}

module.exports = { entry, read, withSite, path };
