// Saves the website's forms as visitors fill them in, so Pranav sees finished AND abandoned requests in /admin.
//   POST { id, kind: "contact" | "booking", status: "started" | "submitted", fields: {...} }
// A submitted form is also emailed to Pranav (Resend: RESEND_API_KEY; LEAD_EMAIL and MAIL_FROM optional).
const { ready, getLead, putLead } = require('./_store');

const FIELDS = {
  contact: ['goal', 'type', 'budget', 'timeline', 'name', 'email', 'phone', 'city', 'msg'],
  booking: ['slot', 'slotDubai', 'name', 'phone', 'email', 'topic', 'how', 'budget', 'notes', 'tz'],
};
const LABELS = { goal: 'Interested in', type: 'Property type', budget: 'Budget (AED)', timeline: 'Timeline', name: 'Name', email: 'Email', phone: 'WhatsApp', city: 'City / Country', msg: 'Message', slot: 'Time (UTC)', slotDubai: 'Time (Dubai)', topic: 'Topic', how: 'Meeting', notes: 'Notes', tz: "Visitor's timezone" };
const LIMIT = 60, WINDOW_MS = 10 * 60 * 1000, hits = new Map();
const tooMany = ip => { const now = Date.now(), l = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS); l.push(now); hits.set(ip, l); if (hits.size > 5000) hits.clear(); return l.length > LIMIT; };

async function email(lead) {
  if (!process.env.RESEND_API_KEY) return false;
  const f = lead.fields, what = lead.kind === 'booking' ? `Consultation request: ${f.slotDubai || ''}` : `Website enquiry: ${f.goal || ''}`;
  const text = `${what}\n\n` + Object.keys(f).filter(k => f[k]).map(k => `${LABELS[k] || k}: ${f[k]}`).join('\n') + `\n\nAll requests: https://pranav-sepia.vercel.app/admin`;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || 'Pranav Website <onboarding@resend.dev>',
      to: [process.env.LEAD_EMAIL || 'pranav@shethrealestate.in'],
      reply_to: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email || '') ? f.email : undefined,
      subject: `${what}${f.name ? ' — ' + f.name : ''}`.slice(0, 200),
      text,
    }),
  });
  return r.ok;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!ready()) return res.json({ ok: false, stored: false });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (tooMany(ip)) return res.status(429).json({ error: 'Too many requests' });
  let b = req.body;
  try { if (typeof b === 'string') b = JSON.parse(b || '{}'); } catch (_) { b = {}; }
  b = b || {};
  const id = String(b.id || ''), kind = b.kind, status = b.status === 'submitted' ? 'submitted' : 'started';
  if (!/^[a-z0-9]{12,40}$/.test(id) || !FIELDS[kind]) return res.status(400).json({ error: 'Bad request' });
  const fields = {};
  for (const k of FIELDS[kind]) if (b.fields && b.fields[k] != null) fields[k] = String(b.fields[k]).slice(0, k === 'msg' || k === 'notes' ? 2000 : 200).trim();

  try {
    const now = Date.now(), old = await getLead(id);
    if (old && old.kind !== kind) return res.status(400).json({ error: 'Bad request' });
    const lead = old || { id, kind, created: now, handled: false, emailed: false, page: kind === 'booking' ? '/book' : '/#contact' };
    lead.fields = Object.assign({}, lead.fields, fields);
    lead.status = lead.status === 'submitted' ? 'submitted' : status;   // never goes back from submitted
    lead.updated = now;
    if (lead.status === 'submitted' && !lead.submitted) lead.submitted = now;
    if (lead.status === 'submitted' && !lead.emailed) { try { lead.emailed = await email(lead); } catch (_) { lead.emailed = false; } }
    await putLead(lead);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Could not save' });
  }
};
