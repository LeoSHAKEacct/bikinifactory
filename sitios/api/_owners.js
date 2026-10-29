// Who may edit which site: the teacher links a site to an email and/or phone,
// and only an account created with that email or phone gets the site.
// The links live with the accounts (encrypted, accounts.json "contacts"), never in
// sites.json, because the repo is public.
const G = require('./_github');

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const email = v => String(v || '').trim().toLowerCase();
const phone = v => String(v || '').replace(/\D/g, '');
// "erikha", "Erikha", "Érikha " all name the same site.
const plain = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Phones match on their last 10 digits, so "+57 321 745 5367" and "3217455367" agree.
function samePhone(a, b) {
  a = phone(a); b = phone(b);
  if (a.length < 7 || b.length < 7) return false;
  return a.slice(-10) === b.slice(-10);
}

// Does what the student typed (an email or a phone) match the site's link?
function matches(contact, typed) {
  if (!contact) return false;
  const t = String(typed || '').trim();
  if (t.includes('@')) return Boolean(contact.email) && contact.email === email(t);
  return Boolean(contact.phone) && samePhone(contact.phone, t);
}

function findSite(sites, name) {
  const n = plain(name);
  if (!n) return null;
  return sites.find(s => plain(s.slug) === n) || sites.find(s => plain(s.label) === n) || null;
}

// Sets (or clears, with null) a site's owner in the site list on the drafts branch.
async function setOwner(slug, ownerId) {
  await G.ensureDrafts();
  await G.commit(G.DRAFTS, `Admin: owner of /${slug}`, async () => {
    const sites = await G.readSites();
    const s = sites.find(x => x.slug === slug);
    if (!s) throw G.userError('Sitio desconocido.', 404);
    if (ownerId) s.owner = ownerId; else delete s.owner;
    return [{ path: `${G.DIR}/sites.json`, content: JSON.stringify(sites, null, 2) + '\n', encoding: 'utf-8' }];
  });
}

module.exports = { EMAIL, email, phone, samePhone, matches, findSite, setOwner };
