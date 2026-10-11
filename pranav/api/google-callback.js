// GET /api/google-callback?code&state  Google sends the user back here after consent.
const Google = require('./_google');

function page(res, ok, msg, slug) {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(ok ? 200 : 400).send(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Google Calendar</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#120709;color:#fbecef;font-family:system-ui,sans-serif;padding:16px;text-align:center}
div{max-width:380px}h1{font-size:22px;color:${ok ? '#25d366' : '#ff6b6b'}}p{color:#c9a3ac;line-height:1.5}</style></head>
<body><div><h1>${ok ? '✓ Google Calendar conectado' : 'No se pudo conectar'}</h1><p>${esc(msg)}</p><p>Puedes cerrar esta ventana.</p></div>
<script>try{opener&&opener.postMessage({type:'calendar-connected',ok:${ok},slug:${JSON.stringify(slug || '')}},location.origin)}catch(e){}${ok ? 'setTimeout(function(){window.close()},1500)' : ''}</script></body></html>`);
}

module.exports = async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return page(res, false, error === 'access_denied' ? 'Cancelaste el permiso en Google.' : error);
  if (!Google.configured()) return page(res, false, 'Faltan las claves de Google en Vercel.');
  const s = Google.readState(state);
  if (!s) return page(res, false, 'El enlace expiró. Vuelve al panel y pulsa Conectar otra vez.');
  try {
    const { email, refreshToken } = await Google.exchangeCode(req, code);
    await Google.saveConnection(s.slug, email, refreshToken);
    page(res, true, `Las reservas de /${s.slug}/ se guardarán en el calendario de ${email || 'tu cuenta'}.`, s.slug);
  } catch (e) {
    page(res, false, e.message, s.slug);
  }
};
