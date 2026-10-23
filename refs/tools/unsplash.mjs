// Download free Unsplash photos: specific ids plus the first free results of some searches.
// Input: refs/tools/unsplash.txt with lines "id <ID>" or "q <search-slug> <count>". Output: OUT/<slug or id>/<n>-<id>.jpg and OUT/index.json
import fs from 'fs';
const OUT = process.env.OUT || 'refs/unsplash';
const UA = { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
const lines = fs.readFileSync('refs/tools/unsplash.txt', 'utf8').split('\n').map(l => l.trim()).filter(Boolean);
const index = [];
async function grab(id, dir, n) {
  const page = await fetch(`https://unsplash.com/photos/${id}`, { headers: UA }).then(r => r.text()).catch(() => '');
  if (/plus\.unsplash\.com/.test(page.slice(0, 200000)) && /Unsplash\+ License/i.test(page)) { console.log('skip plus', id); return; }
  const title = (page.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const author = (page.match(/"name":"([^"]+)","first_name"/) || [])[1] || '';
  const r = await fetch(`https://unsplash.com/photos/${id}/download?force=true&w=2400`, { headers: UA, redirect: 'follow' });
  if (!r.ok) { console.log('fail', id, r.status); return; }
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 20000) { console.log('small', id); return; }
  fs.mkdirSync(`${OUT}/${dir}`, { recursive: true });
  const f = `${OUT}/${dir}/${String(n).padStart(2, '0')}-${id}.jpg`; fs.writeFileSync(f, buf);
  index.push({ file: f, id, title, author, url: `https://unsplash.com/photos/${id}` }); console.log('ok', f, buf.length);
}
for (const l of lines) {
  const [kind, a, b] = l.split(/\s+/);
  if (kind === 'id') await grab(a, 'picked', index.length);
  if (kind === 'q') {
    const html = await fetch(`https://unsplash.com/s/photos/${a}?license=free`, { headers: UA }).then(r => r.text()).catch(() => '');
    const ids = [...new Set([...html.matchAll(/href="\/photos\/(?:[a-z0-9-]+-)?([A-Za-z0-9_-]{11})"/g)].map(m => m[1]))];
    console.log('query', a, ids.length);
    let n = 0; for (const id of ids) { if (n >= +(b || 6)) break; await grab(id, a, n); n++; }
  }
}
fs.writeFileSync(`${OUT}/index.json`, JSON.stringify(index, null, 1));
