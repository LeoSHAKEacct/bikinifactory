// Export the three.js scene of one of our scroll pages to a .glb for Blender.
// usage: node export_glb.mjs <page.html> <out.glb> [three-dir]
// The page must expose window.__lumen.groups (the realestate engine does).
// Pass a local node_modules/three dir when the jsdelivr CDN is not reachable.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const [page_, out, threeDir] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
page.on('pageerror', e => console.log('pageerror:', e.message));
if (threeDir) await page.route(/cdn\.jsdelivr\.net\/npm\/three@[^/]+\//, r => {
  const rel = r.request().url().replace(/^.*three@[^/]+\//, '');
  r.fulfill({ path: path.join(threeDir, rel), contentType: 'text/javascript' });
});
await page.route(/fonts\.googleapis\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
await page.goto('file://' + path.resolve(page_));
await page.waitForFunction(() => window.__lumen, null, { timeout: 120000 });
const b64 = await page.evaluate(async () => {
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const THREE = await import('three');
  const root = new THREE.Group();
  for (const [k, grp] of Object.entries(window.__lumen.groups)) { const c = grp.clone(true); c.name = k; root.add(c); }
  const buf = await new GLTFExporter().parseAsync(root, { binary: true, maxTextureSize: 2048 });
  const bytes = new Uint8Array(buf); let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
});
fs.writeFileSync(out, Buffer.from(b64, 'base64'));
console.log('wrote', out, fs.statSync(out).size, 'bytes');
await browser.close();
