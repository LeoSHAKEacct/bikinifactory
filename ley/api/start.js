// "Empezar" form: a law firm leaves name, email and phone so the HollyAI team can set them up.
//   POST { name, email, phone, firm?, size?, plan?, interests?: [..], msg?, website? (honeypot) }
// Saved to the private Blob store (see _store.js). If RESEND_API_KEY is set, also emailed to LEAD_EMAIL.
const crypto = require('crypto');
const { ready, saveLead } = require('./_store');

const PLANS = ['inicial', 'redes', 'nose'];
const INTERESTS = ['recepcion', 'contratos', 'citas', 'resumenes', 'plazos', 'procesos', 'incorporacion', 'redes'];
const LIMIT = 8, WINDOW_MS = 10 * 60 * 1000, hits = new Map();
const tooMany = ip => { const now = Date.now(), l = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS); l.push(now); hits.set(ip, l); if (hits.size > 5000) hits.clear(); return l.length > LIMIT; };
const clean = (v, n = 200) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

async function email(lead) {
  if (!process.env.RESEND_API_KEY || !process.env.LEAD_EMAIL) return false;
  const text = [
    `Nuevo despacho quiere empezar con HollyAI Ley`, '',
    `Nombre: ${lead.name}`, `Email: ${lead.email}`, `Teléfono: ${lead.phone}`,
    lead.firm && `Despacho: ${lead.firm}`, lead.size && `Abogados: ${lead.size}`, lead.plan && `Plan: ${lead.plan}`,
    lead.interests.length && `Le interesa: ${lead.interests.join(', ')}`, lead.msg && `Mensaje: ${lead.msg}`,
    '', 'Todos los registros: https://ley.hollyai.app/admin',
  ].filter(Boolean).join('\n');
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || 'HollyAI Ley <onboarding@resend.dev>',
      to: [process.env.LEAD_EMAIL], reply_to: lead.email,
      subject: `Nuevo registro: ${lead.firm || lead.name}`.slice(0, 200), text,
    }),
  });
  return r.ok;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (tooMany(ip)) return res.status(429).json({ error: 'Demasiados intentos. Prueba en unos minutos.' });
  let b = req.body;
  try { if (typeof b === 'string') b = JSON.parse(b || '{}'); } catch (_) { b = {}; }
  b = b || {};
  if (b.website) return res.json({ ok: true }); // honeypot: bots fill hidden fields

  const lead = {
    id: crypto.randomBytes(6).toString('hex'), created: Date.now(),
    name: clean(b.name, 120), email: clean(b.email, 160).toLowerCase(), phone: clean(b.phone, 40),
    firm: clean(b.firm, 160), size: clean(b.size, 20),
    plan: PLANS.includes(b.plan) ? b.plan : '',
    interests: (Array.isArray(b.interests) ? b.interests : []).filter(x => INTERESTS.includes(x)).slice(0, 8),
    msg: clean(b.msg, 1500), page: clean(b.page, 200), ua: clean(req.headers['user-agent'], 200),
  };
  const digits = lead.phone.replace(/\D/g, '');
  if (lead.name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email) || digits.length < 7 || digits.length > 15)
    return res.status(400).json({ error: 'Revisa tu nombre, email y teléfono.' });
  if (!ready()) return res.status(503).json({ error: 'Registro no disponible ahora mismo.' });

  try { lead.emailed = await email(lead); } catch (_) { lead.emailed = false; }
  try {
    await saveLead(lead);
    return res.json({ ok: true, id: lead.id });
  } catch (e) {
    return res.status(500).json({ error: 'No pudimos guardar tus datos. Inténtalo de nuevo.' });
  }
};
