// Renders every post in social.html to ../out. Run from aira/: node social/src/render.js
// Static posts -> JPG (1080x1350). Reels -> MP4 (1080x1920, 30 fps, 15 s) + a cover JPG.
const { chromium } = require('playwright');
const { spawn, execSync } = require('child_process');
const path = require('path');
const http = require('http'), fs = require('fs');
const ROOT = path.resolve(__dirname, '../..'), OUT = path.resolve(__dirname, '../out');
const ORDER = [
  ['01', 'regreso'], ['02', 'diciembre-todo-el-ano'], ['03', 'ganas-afuera'], ['04', 'cerca-de-todo'], ['05', 'elige-desde-donde-estes'],
  ['06', 'en-buenas-manos'], ['07', 'ano-nuevo'], ['08', '5-razones'], ['09', 'tipo-a'], ['10', 'visita-la-sala'],
];
const only = process.argv[2];
const types = { '.html': 'text/html', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
}).listen(8799);
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  for (const [n, id] of ORDER) {
    if (only && only !== id) continue;
    const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
    await p.goto(`http://localhost:8799/social/src/social.html?p=${id}`, { waitUntil: 'networkidle' });
    await p.evaluate(() => window.ready);
    const reel = await p.evaluate(() => window.isReel);
    const el = await p.$('#post');
    if (!reel) {
      await el.screenshot({ path: `${OUT}/${n}-${id}.jpg`, type: 'jpeg', quality: 92 });
      console.log('image', n, id);
    } else {
      const FPS = 30, DUR = 15, file = `${OUT}/${n}-${id}.mp4`;
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '20', '-movflags', '+faststart', file]);
      for (let i = 0; i < FPS * DUR; i++) {
        await p.evaluate(t => window.frame(t), i / FPS);
        const buf = await el.screenshot({ type: 'jpeg', quality: 90 });
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        if (i === Math.round(FPS * 1.6)) fs.writeFileSync(`${OUT}/${n}-${id}-cover.jpg`, buf);
      }
      ff.stdin.end(); await new Promise(r => ff.on('close', r));
      console.log('video', n, id, (fs.statSync(file).size / 1e6).toFixed(1) + ' MB');
    }
    await p.close();
  }
  await b.close(); srv.close();
})();
