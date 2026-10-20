// Download the full-size originals behind the Wix thumbnails.
import fs from 'fs';
const idx = JSON.parse(fs.readFileSync('nido/src/images.json', 'utf8'));
fs.mkdirSync('nido/src/full', { recursive: true });
for (const i of idx) {
  const m = i.url.match(/^(https:\/\/static\.wixstatic\.com\/media\/[^/]+~mv2\.[a-z]+)/i); if (!m) continue;
  const r = await fetch(m[1], { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) { console.log('miss', m[1], r.status); continue; }
  const buf = Buffer.from(await r.arrayBuffer()); const ext = m[1].split('.').pop();
  fs.writeFileSync(`nido/src/full/${i.name.replace(/\.\w+$/, '')}.${ext}`, buf); console.log('ok', i.name, buf.length);
}
