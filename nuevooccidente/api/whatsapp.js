// WhatsApp webhook (Meta WhatsApp Cloud API) for Clínica Veterinaria Nuevo Occidente.
//   GET  /api/whatsapp  -> Meta's webhook verification (hub.challenge)
//   POST /api/whatsapp  -> incoming messages; the bot answers prices, services, hours, and hands off to a person.
//
// Vercel env vars:
//   WHATSAPP_TOKEN        permanent access token (System User token from Meta Business)
//   WHATSAPP_PHONE_ID     "Phone number ID" from the WhatsApp > API Setup page
//   WHATSAPP_VERIFY_TOKEN any secret string; type the same one in Meta's webhook settings
//   WHATSAPP_APP_SECRET   App secret (App settings > Basic); used to check Meta's signature
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN  optional; makes the "person took over" pause survive restarts
//   BOT_PAUSE_HOURS       optional, default 12: how long the bot stays quiet in a chat after a handoff
const crypto = require('crypto');
const { reply } = require('./_bot');

const GRAPH = 'https://graph.facebook.com/v21.0';
const PAUSE_HOURS = Number(process.env.BOT_PAUSE_HOURS || 12);

// ---- chat pause (bot stays quiet while a person handles the chat) ----
const memory = new Map();
const seen = new Map();
const redisOn = () => process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(cmd) {
  const r = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  return (await r.json()).result;
}

async function pause(phone) {
  const secs = Math.round(PAUSE_HOURS * 3600);
  if (redisOn()) return redis(['SET', `nvo:pause:${phone}`, '1', 'EX', String(secs)]);
  memory.set(phone, Date.now() + secs * 1000);
}

async function resume(phone) {
  if (redisOn()) return redis(['DEL', `nvo:pause:${phone}`]);
  memory.delete(phone);
}

async function isPaused(phone) {
  if (redisOn()) return Boolean(await redis(['GET', `nvo:pause:${phone}`]));
  const until = memory.get(phone);
  return Boolean(until && until > Date.now());
}

// Meta retries a webhook it thinks failed; skip messages already answered.
async function firstTime(msgId) {
  if (redisOn()) return (await redis(['SET', `nvo:msg:${msgId}`, '1', 'NX', 'EX', '86400'])) === 'OK';
  if (seen.has(msgId)) return false;
  seen.set(msgId, Date.now());
  if (seen.size > 2000) seen.delete(seen.keys().next().value);
  return true;
}

// ---- sending ----
function toWhatsApp(to, m) {
  const base = { messaging_product: 'whatsapp', recipient_type: 'individual', to };
  if (m.type === 'buttons') {
    return { ...base, type: 'interactive', interactive: {
      type: 'button',
      body: { text: m.body },
      action: { buttons: m.buttons.slice(0, 3).map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title.slice(0, 20) } })) },
    } };
  }
  if (m.type === 'list') {
    return { ...base, type: 'interactive', interactive: {
      type: 'list',
      body: { text: m.body },
      action: { button: m.button.slice(0, 20), sections: m.sections },
    } };
  }
  return { ...base, type: 'text', text: { body: m.body, preview_url: true } };
}

async function send(to, m) {
  try {
  const r = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(toWhatsApp(to, m)),
  });
  if (!r.ok) console.error('WhatsApp send failed', r.status, await r.text());
  } catch (e) { console.error('WhatsApp send error', e.message); }
}

// ---- incoming ----
function readRaw(req) {
  if (req.readableEnded) return Promise.resolve(Buffer.alloc(0)); // body already consumed by the runtime
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', () => resolve(Buffer.alloc(0)));
  });
}

function validSignature(raw, header) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // not configured yet: accept (set it before going live)
  if (!header || !raw.length) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(header));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function inputOf(msg) {
  if (msg.type === 'text') return { text: msg.text.body };
  if (msg.type === 'interactive') {
    const i = msg.interactive;
    return { id: (i.button_reply || i.list_reply || {}).id };
  }
  if (msg.type === 'button') return { text: msg.button.text };
  return null; // audio, image, sticker, location...
}

async function handleMessage(msg) {
  const from = msg.from;
  if (!(await firstTime(msg.id))) return;

  const input = inputOf(msg);
  // Typing "menu" / "bot" always brings the bot back, even during a pause.
  const wake = input && input.text && /^\s*(men[uú]|bot|inicio)\s*$/i.test(input.text);
  if (wake) await resume(from);
  else if (await isPaused(from)) return;

  if (!input) {
    await send(from, { type: 'text', body: 'Recibimos tu mensaje 🙌. Por ahora el asistente solo lee texto; una persona del equipo lo revisa pronto. Escribe *menú* para ver precios y servicios.' });
    await pause(from);
    return;
  }

  const out = reply(input);
  for (const m of out.messages) await send(from, m);
  if (out.handoff) await pause(from);
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const q = req.query || {};
    if (q['hub.mode'] === 'subscribe' && q['hub.verify_token'] && q['hub.verify_token'] === process.env.WHATSAPP_VERIFY_TOKEN) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(String(q['hub.challenge'] || ''));
    }
    return res.status(403).send('Forbidden');
  }
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  let raw = await readRaw(req);
  let body;
  try {
    body = raw.length ? JSON.parse(raw.toString('utf8')) : req.body;
  } catch {
    return res.status(400).send('Bad JSON');
  }
  if (!raw.length && process.env.WHATSAPP_APP_SECRET) raw = Buffer.from(JSON.stringify(body || {}));
  if (!validSignature(raw, req.headers['x-hub-signature-256'])) return res.status(401).send('Bad signature');

  try {
    for (const entry of (body && body.entry) || []) {
      for (const change of entry.changes || []) {
        const v = change.value || {};
        // A person answered from the WhatsApp Business app (coexistence): bot steps aside in that chat.
        for (const echo of v.message_echoes || []) if (echo.to) await pause(echo.to);
        for (const msg of v.messages || []) await handleMessage(msg);
      }
    }
  } catch (e) {
    console.error('webhook error', e);
  }
  // Always 200, or Meta keeps retrying the same message.
  return res.status(200).send('OK');
};
