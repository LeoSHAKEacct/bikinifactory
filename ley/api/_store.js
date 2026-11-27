// Lead storage for ley.hollyai.app: a private Vercel Blob store connected to the project
// (sets BLOB_READ_WRITE_TOKEN). One JSON file per signup under leads/. Files starting with "_" are not routes.
const crypto = require('crypto');
const { put, list, get } = require('@vercel/blob');

const ready = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

async function saveLead(lead) {
  await put(`leads/${lead.created}-${lead.id}.json`, JSON.stringify(lead), {
    access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true,
  });
}

async function readText(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks).toString('utf8');
}

async function allLeads() {
  const blobs = [];
  let cursor;
  do {
    const r = await list({ prefix: 'leads/', cursor, limit: 1000 });
    blobs.push(...r.blobs); cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  blobs.sort((a, b) => b.pathname.localeCompare(a.pathname));
  const out = [];
  for (const b of blobs.slice(0, 500)) {
    try {
      const r = await get(b.pathname, { access: 'private', useCache: false });
      if (r && r.stream) out.push(JSON.parse(await readText(r.stream)));
    } catch (_) { /* skip unreadable */ }
  }
  return out;
}

function okPassword(given) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return false;
  const a = crypto.createHash('sha256').update(String(given || '')).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = { ready, saveLead, allLeads, okPassword };
