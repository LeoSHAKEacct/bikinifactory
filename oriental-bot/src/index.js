// Oriental Wellness Center: booking server on the WhatsApp Business Platform (Cloud API).
//
// POST /book      a booking from the website: saved as "pending", the customer gets a
//                 "request received" message and the staff phone gets the booking with
//                 Confirm / Other time buttons.
// GET  /webhook   Meta's verification handshake.
// POST /webhook   button taps from the staff phone: Confirm sends the customer the
//                 confirmation, Other time asks the customer for a new time.
// cron (1 min)    30 minutes after a confirmed session ends, the customer gets the
//                 Google review request.
//
// Secrets (set with `wrangler secret put`, never in this file):
//   WA_TOKEN         permanent System User access token
//   WA_PHONE_ID      phone number ID of the clinic's number in WhatsApp Manager
//   VERIFY_TOKEN     any string you choose; the same one goes in the Meta webhook settings
//   APP_SECRET       Meta app secret, to check webhook signatures
// Vars (wrangler.toml): STAFF_PHONE, REVIEW_URL, ALLOWED_ORIGIN, GRAPH_VERSION, TZ_OFFSET_MIN

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });

function cors(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// dates are stored in UTC; messages show Panama local time
function local(iso, env) {
  const d = new Date(new Date(iso).getTime() + Number(env.TZ_OFFSET_MIN) * 60000);
  const day = d.toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const time = d.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
  return { day, time };
}

async function sendTemplate(env, to, name, bodyParams, buttons = []) {
  const components = [{ type: 'body', parameters: bodyParams.map(text => ({ type: 'text', text: String(text) })) }];
  buttons.forEach((b, index) => components.push({ type: 'button', sub_type: b.sub_type, index: String(index), parameters: [b.param] }));
  const res = await fetch(`https://graph.facebook.com/${env.GRAPH_VERSION}/${env.WA_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'template', template: { name, language: { code: 'es' }, components } }),
  });
  if (!res.ok) throw new Error(`WhatsApp ${name} -> ${to}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function validSignature(req, body, env) {
  const sig = req.headers.get('X-Hub-Signature-256') || '';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.APP_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  const hex = 'sha256=' + [...mac].map(b => b.toString(16).padStart(2, '0')).join('');
  if (hex.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

async function book(req, env) {
  let b;
  try { b = await req.json(); } catch { return json({ error: 'bad json' }, 400, cors(env)); }
  const phone = String(b.phone || '').replace(/\D/g, '');
  const start = new Date(b.start);
  const dur = Number(b.dur);
  const name = String(b.name || '').trim().slice(0, 80);
  const svc = String(b.svc || '').trim().slice(0, 80);
  if (!name || !svc || phone.length < 10 || isNaN(start) || !(dur > 0 && dur <= 240) || start < Date.now())
    return json({ error: 'missing or invalid fields' }, 400, cors(env));

  const id = crypto.randomUUID().slice(0, 8);
  const end = new Date(start.getTime() + dur * 60000);
  await env.DB.prepare(
    `INSERT INTO bookings (id, svc, dur, start_at, end_at, name, phone, note, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).bind(id, svc, dur, start.toISOString(), end.toISOString(), name, phone, String(b.note || '').slice(0, 300), new Date().toISOString()).run();

  const { day, time } = local(start.toISOString(), env);
  // customer: request received, waiting for confirmation
  await sendTemplate(env, phone, 'cita_recibida', [name, svc, day, time]);
  // staff: the booking with two buttons; the payload carries the booking id back to /webhook
  await sendTemplate(env, env.STAFF_PHONE, 'nueva_cita', [svc, day, time, name, '+' + phone], [
    { sub_type: 'quick_reply', param: { type: 'payload', payload: `confirm:${id}` } },
    { sub_type: 'quick_reply', param: { type: 'payload', payload: `other:${id}` } },
  ]);
  return json({ ok: true, id, status: 'pending' }, 200, cors(env));
}

async function webhook(req, env) {
  const body = await req.text();
  if (!(await validSignature(req, body, env))) return new Response('bad signature', { status: 401 });
  const data = JSON.parse(body);
  for (const entry of data.entry || []) for (const change of entry.changes || []) {
    for (const m of change.value?.messages || []) {
      const payload = m.button?.payload || m.interactive?.button_reply?.id;
      if (!payload || m.from !== env.STAFF_PHONE) continue;          // only staff taps change a booking
      const [action, id] = payload.split(':');
      const row = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
      if (!row || row.status !== 'pending') continue;
      const { day, time } = local(row.start_at, env);
      if (action === 'confirm') {
        await env.DB.prepare(`UPDATE bookings SET status = 'confirmed' WHERE id = ?`).bind(id).run();
        await sendTemplate(env, row.phone, 'cita_confirmada', [row.name, row.svc, day, time]);
      } else if (action === 'other') {
        await env.DB.prepare(`UPDATE bookings SET status = 'reschedule' WHERE id = ?`).bind(id).run();
        await sendTemplate(env, row.phone, 'cita_otra_hora', [row.name, row.svc, day, time]);
      }
    }
  }
  return new Response('ok');
}

// every minute: review request 30 minutes after a confirmed session ends
async function reviews(env) {
  const due = new Date(Date.now() - 30 * 60000).toISOString();
  const { results } = await env.DB.prepare(
    `SELECT * FROM bookings WHERE status = 'confirmed' AND review_sent_at IS NULL AND end_at <= ? LIMIT 20`
  ).bind(due).all();
  for (const row of results) {
    try {
      await sendTemplate(env, row.phone, 'resena_google', [row.name, row.svc]);
      await env.DB.prepare('UPDATE bookings SET review_sent_at = ? WHERE id = ?').bind(new Date().toISOString(), row.id).run();
    } catch (e) { console.error(e.message); }
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(env) });
    if (url.pathname === '/book' && req.method === 'POST') return book(req, env);
    if (url.pathname === '/webhook' && req.method === 'GET') {
      const ok = url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === env.VERIFY_TOKEN;
      return ok ? new Response(url.searchParams.get('hub.challenge')) : new Response('forbidden', { status: 403 });
    }
    if (url.pathname === '/webhook' && req.method === 'POST') return webhook(req, env);
    return new Response('Oriental Wellness booking server', { status: 200 });
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(reviews(env));
  },
};
