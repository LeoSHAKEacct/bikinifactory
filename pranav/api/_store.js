// Lead storage for the pranav site: Upstash Redis over its REST API (Vercel: Storage -> Upstash for Redis,
// connected to this project, which sets KV_REST_API_URL / KV_REST_API_TOKEN). Files starting with "_" are not routes.
const crypto = require('crypto');

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const ready = () => !!(URL_ && TOKEN);

async function redis(...cmd) {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(`store: ${j.error || r.status}`);
  return j.result;
}

const KEY = id => `lead:${id}`;
async function getLead(id) { const v = await redis('GET', KEY(id)); return v ? JSON.parse(v) : null; }
async function putLead(lead) {
  // finished forms are kept; unfinished ones expire after 90 days
  const args = ['SET', KEY(lead.id), JSON.stringify(lead)];
  if (lead.status !== 'submitted') args.push('EX', String(90 * 86400));
  await redis(...args);
  await redis('ZADD', 'leads', String(lead.updated), lead.id);
}

function okPassword(given) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return false;
  const a = crypto.createHash('sha256').update(String(given || '')).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = { ready, redis, getLead, putLead, okPassword };
