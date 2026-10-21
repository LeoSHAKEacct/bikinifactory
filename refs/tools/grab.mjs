// Crawl the site, save page text, screenshots and every image it shows.
import { chromium } from 'playwright';
import fs from 'fs';
const START = process.env.START;
const OUT = process.env.OUT;
fs.mkdirSync(OUT + '/img', { recursive: true }); fs.mkdirSync(OUT + '/shots', { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' });
const page = await ctx.newPage();
const seen = new Set(), queue = [START], imgs = new Map(), pages = [];
while (queue.length && pages.length < 20) {
  const url = queue.shift().split('#')[0]; if (seen.has(url)) continue; seen.add(url);
  try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); } catch (e) { console.log('fail', url, e.message); continue; }
  try { await page.waitForLoadState('load', { timeout: 30000 }); } catch {}
  await page.waitForTimeout(4000);
  for (let y = 0; y < 30; y++) { await page.mouse.wheel(0, 900); await page.waitForTimeout(250); }
  await page.waitForTimeout(1500);
  const data = await page.evaluate(() => {
    const abs = u => { try { return new URL(u, location.href).href; } catch { return null; } };
    const out = [];
    document.querySelectorAll('img').forEach(i => { const u = i.currentSrc || i.src; if (u) out.push({ u: abs(u), alt: i.alt || '', w: i.naturalWidth, h: i.naturalHeight, logo: /logo/i.test(i.className + i.alt + i.src + (i.closest('header') ? ' header' : '')) }); if (i.srcset) i.srcset.split(',').forEach(s => out.push({ u: abs(s.trim().split(' ')[0]), alt: i.alt || '' })); });
    document.querySelectorAll('source[srcset]').forEach(s => s.srcset.split(',').forEach(x => out.push({ u: abs(x.trim().split(' ')[0]), alt: '' })));
    document.querySelectorAll('*').forEach(el => { const bg = getComputedStyle(el).backgroundImage; const m = bg && bg.match(/url\(["']?([^"')]+)/); if (m) out.push({ u: abs(m[1]), alt: 'bg' }); });
    document.querySelectorAll('svg').forEach((s, k) => { if (s.closest('header') || /logo/i.test(s.getAttribute('class') || '') || /logo/i.test(s.parentElement?.className || '')) out.push({ svg: s.outerHTML, alt: 'inline-svg-' + k }); });
    const links = [...document.querySelectorAll('a[href]')].map(a => abs(a.getAttribute('href'))).filter(Boolean);
    const meta = { title: document.title, desc: document.querySelector('meta[name=description]')?.content || '', og: document.querySelector('meta[property="og:image"]')?.content || '', icon: [...document.querySelectorAll('link[rel*=icon]')].map(l => l.href) };
    return { out, links, text: document.body.innerText, meta, fonts: [...new Set([...document.querySelectorAll('h1,h2,h3,p,a,body')].map(e => getComputedStyle(e).fontFamily))], colors: [...new Set([...document.querySelectorAll('body,header,footer,h1,h2,a,button,section')].map(e => getComputedStyle(e).color + ' / ' + getComputedStyle(e).backgroundColor))] };
  });
  const n = pages.length;
  pages.push({ url, ...data.meta, fonts: data.fonts, colors: data.colors, text: data.text });
  await page.screenshot({ path: `${OUT}/shots/p${n}.jpg`, fullPage: true, type: 'jpeg', quality: 55 });
  data.out.forEach(o => { if (o.svg) fs.writeFileSync(`${OUT}/img/${o.alt}-p${n}.svg`, o.svg); else if (o.u && !o.u.startsWith('data:')) { const prev = imgs.get(o.u) || {}; imgs.set(o.u, { ...prev, ...o, pages: [...new Set([...(prev.pages || []), url])] }); } });
  [...data.meta.icon, data.meta.og].filter(Boolean).forEach(u => imgs.set(u, { u, alt: 'meta' }));
  for (const l of data.links) { try { const h = new URL(l); if (h.hostname.replace(/^www\./, '') === new URL(START).hostname.replace(/^www\./, '') && !seen.has(l.split('#')[0]) && !/\.(pdf|jpg|png)$/i.test(h.pathname)) queue.push(l); } catch {} }
  console.log('page', n, url, data.out.length);
}
let k = 0; const index = [];
const orig = u => { const m = u.match(/^(https:\/\/static\.wixstatic\.com\/media\/[^/]+~mv2\.[a-z]+)/i); return m ? m[1] : u.replace(/-\d+x\d+(\.(jpe?g|png|webp))$/i, '$1'); };
for (const [u, o] of [...imgs]) { const ou = orig(u); if (ou !== u && !imgs.has(ou)) imgs.set(ou, { ...o, u: ou, orig: true }); }
for (const [u, o] of imgs) {
  try {
    const r = await ctx.request.get(u, { timeout: 60000 }); if (!r.ok()) continue;
    const buf = await r.body(); if (buf.length < 2500) continue;
    const ct = r.headers()['content-type'] || ''; const ext = ct.includes('png') ? 'png' : ct.includes('svg') ? 'svg' : ct.includes('webp') ? 'webp' : ct.includes('avif') ? 'avif' : ct.includes('gif') ? 'gif' : 'jpg';
    const name = `i${String(k++).padStart(3, '0')}.${ext}`; fs.writeFileSync(`${OUT}/img/${name}`, buf);
    index.push({ name, url: u, alt: o.alt, logo: !!o.logo, w: o.w, h: o.h, bytes: buf.length, pages: o.pages });
  } catch (e) { console.log('imgfail', u); }
}
fs.writeFileSync(`${OUT}/images.json`, JSON.stringify(index, null, 1));
fs.writeFileSync(`${OUT}/pages.json`, JSON.stringify(pages, null, 1));
console.log('images', index.length);
await b.close();
