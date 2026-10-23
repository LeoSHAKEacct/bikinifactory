// Download free Unsplash photos with a real browser: specific ids plus the first free results of some searches.
// Input: refs/tools/unsplash.txt, lines "id <ID>" or "q <search-slug> <count>". Output: OUT/<dir>/<n>-<id>.jpg and OUT/index.json
import { chromium } from 'playwright';
import fs from 'fs';
const OUT = process.env.OUT || 'refs/unsplash';
fs.mkdirSync(OUT, { recursive: true });
const lines = fs.readFileSync('refs/tools/unsplash.txt', 'utf8').split('\n').map(l => l.trim()).filter(Boolean);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' });
const page = await ctx.newPage();
const index = [];
async function grab(id, dir, n) {
  try {
    await page.goto(`https://unsplash.com/photos/${id}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);
    const info = await page.evaluate(() => ({
      og: document.querySelector('meta[property="og:image"]')?.content || '',
      title: document.title,
      plus: /Unsplash\+/.test(document.body.innerText.slice(0, 4000)) && !/Unsplash License/.test(document.body.innerText)
    }));
    if (!info.og || info.plus || /plus\.unsplash/.test(info.og)) { console.log('skip', id, info.og.slice(0, 60)); return; }
    const u = new URL(info.og); const src = `${u.origin}${u.pathname}?w=2400&q=85&fm=jpg&fit=max`;
    const r = await ctx.request.get(src, { timeout: 60000 });
    if (!r.ok()) { console.log('fail', id, r.status()); return; }
    const buf = await r.body();
    fs.mkdirSync(`${OUT}/${dir}`, { recursive: true });
    const f = `${OUT}/${dir}/${String(n).padStart(2, '0')}-${id}.jpg`; fs.writeFileSync(f, buf);
    index.push({ file: f, id, title: info.title, url: `https://unsplash.com/photos/${id}` }); console.log('ok', f, buf.length);
  } catch (e) { console.log('err', id, e.message); }
}
for (const l of lines) {
  const [kind, a, c] = l.split(/\s+/);
  if (kind === 'id') await grab(a, 'picked', index.length);
  if (kind === 'q') {
    try {
      await page.goto(`https://unsplash.com/s/photos/${a}?license=free`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3000);
      const ids = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href*="/photos/"]')].map(x => (x.getAttribute('href').match(/\/photos\/(?:[a-z0-9-]+-)?([A-Za-z0-9_-]{11})(?:$|\?)/) || [])[1]).filter(Boolean))]);
      console.log('query', a, ids.length);
      let n = 0; for (const id of ids) { if (n >= +(c || 6)) break; await grab(id, a, n); n++; }
    } catch (e) { console.log('qerr', a, e.message); }
  }
}
fs.writeFileSync(`${OUT}/index.json`, JSON.stringify(index, null, 1));
await b.close();
