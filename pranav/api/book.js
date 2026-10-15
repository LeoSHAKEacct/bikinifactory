// POST /api/book { slug, s, i, date, time, name, phone, note }
// Creates the appointment in the site's Google Calendar if the slot is still free.
const G = require('./_github');
const Google = require('./_google');
const B = require('./_booking');

const clean = (v, max) => String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    if (!Google.configured()) throw Google.missingConfig();
    const b = req.body || {};
    if (b.website) throw G.userError('Solicitud inválida.'); // honeypot field bots fill in
    const name = clean(b.name, 80), phone = clean(b.phone, 30), note = clean(b.note, 500);
    if (name.length < 2) throw G.userError('Escribe tu nombre.');
    if (phone.replace(/\D/g, '').length < 7) throw G.userError('Escribe un teléfono válido.');
    const { content, cfg, item, duration } = await B.findItem(b.slug, b.s, b.i);
    const slot = B.candidates(b.date, cfg, duration).find(x => x.time === b.time);
    if (!slot) throw G.userError('Ese horario ya no está disponible. Elige otro.', 409);
    const token = await Google.accessToken(b.slug);
    if (B.overlaps(slot, await Google.busy(token, slot.start, slot.end, cfg.timezone))) {
      throw G.userError('Ese horario ya está ocupado. Elige otro.', 409);
    }
    const event = await Google.createEvent(token, {
      summary: `${item.name} — ${name}`,
      description: [`Reserva desde el sitio /${b.slug}/`, `Servicio: ${item.name}`, `Cliente: ${name}`, `Teléfono: ${phone}`, note && `Nota: ${note}`].filter(Boolean).join('\n'),
      start: { dateTime: new Date(slot.start).toISOString(), timeZone: cfg.timezone },
      end: { dateTime: new Date(slot.end).toISOString(), timeZone: cfg.timezone },
    });
    res.status(200).json({ ok: true, item: item.name, date: b.date, time: b.time, duration, site: content.name || '', eventId: event.id });
  } catch (e) {
    G.sendError(res, e);
  }
};
