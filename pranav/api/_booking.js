// Booking rules shared by /api/slots and /api/book. Always read from the
// published content, so visitors can't change durations or hours.
const G = require('./_github');

const DEFAULTS = {
  enabled: 'no', timezone: 'America/Bogota', days: [1, 2, 3, 4, 5, 6],
  start: '09:00', end: '19:00', step: 30, minNotice: 2, maxDays: 30,
};

function config(content) {
  return Object.assign({}, DEFAULTS, content.booking || {});
}

// The bookable item at sections[s].items[i], or a user error.
async function findItem(slug, s, i) {
  if (typeof slug !== 'string' || !G.SLUG.test(slug)) throw G.userError('Sitio desconocido.', 404);
  const content = await G.readJson(G.sitePath(slug, 'content.json'), G.MAIN);
  if (!content || !Array.isArray(content.sections)) throw G.userError('Este sitio no tiene reservas.', 404);
  const cfg = config(content);
  if (cfg.enabled !== 'yes') throw G.userError('Las reservas no están activas en este sitio.', 409);
  const sec = content.sections[+s];
  const item = sec && sec.type === 'services' && (sec.items || [])[+i];
  if (!item || item.bookable === 'no') throw G.userError('Este servicio no se puede reservar.', 404);
  return { content, cfg, item, duration: Math.max(15, Math.min(600, +item.duration || 60)) };
}

// Offset of a time zone from UTC at a given instant, in ms.
function tzOffset(tz, ms) {
  const p = {};
  new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(new Date(ms)).forEach(x => { p[x.type] = x.value; });
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000;
}

// "2026-10-14" + "15:30" in a time zone -> UTC milliseconds.
function zonedToUtc(date, time, tz) {
  const [y, m, d] = date.split('-').map(Number), [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let t = guess - tzOffset(tz, guess);
  const again = guess - tzOffset(tz, t);
  if (again !== t) t = again;
  return t;
}

function todayIn(tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function validDate(date, cfg) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw G.userError('Fecha inválida.');
  const day = new Date(date + 'T00:00:00Z').getUTCDay();
  const diff = (Date.parse(date + 'T00:00:00Z') - Date.parse(todayIn(cfg.timezone) + 'T00:00:00Z')) / 864e5;
  return cfg.days.map(Number).includes(day) && diff >= 0 && diff <= +cfg.maxDays;
}

const toMin = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
const fmt = min => String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');

// Candidate start times for a day ("HH:MM"), before checking the calendar.
function candidates(date, cfg, duration) {
  if (!validDate(date, cfg)) return [];
  const out = [], step = Math.max(5, +cfg.step || 30), earliest = Date.now() + (+cfg.minNotice || 0) * 36e5;
  for (let m = toMin(cfg.start); m + duration <= toMin(cfg.end); m += step) {
    const start = zonedToUtc(date, fmt(m), cfg.timezone);
    if (start >= earliest) out.push({ time: fmt(m), start, end: start + duration * 6e4 });
  }
  return out;
}

const overlaps = (slot, busy) => busy.some(([a, b]) => slot.start < b && slot.end > a);

module.exports = { config, findItem, candidates, overlaps, zonedToUtc, todayIn };
