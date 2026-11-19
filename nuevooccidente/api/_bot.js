// Bot logic for Clínica Veterinaria Nuevo Occidente. Pure: input -> list of replies.
// Used by api/whatsapp.js (real WhatsApp) and api/bot-demo.js (the chat on the website).
// Prices and services come from data/clinica.json.
//
// A reply is one of:
//   { type: 'text', body }
//   { type: 'buttons', body, buttons: [{ id, title }] }            (max 3, title <= 20 chars)
//   { type: 'list', body, button, sections: [{ title, rows: [{ id, title, description }] }] } (max 10 rows)
// The result also carries `handoff: true` when a person from the clinic should take over the chat.
const DATA = require('../data/clinica.json');

const C = DATA.clinica;
const EXAMPLE = DATA.precios_de_ejemplo;

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/ñ/g, 'n').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

const money = (n) => '$' + Number(n).toLocaleString('es-CO').replace(/,/g, '.');

function priceLine(it) {
  const p = it.precio == null ? 'consultar' : (it.desde ? 'desde ' : '') + money(it.precio);
  return `• *${it.nombre}*: ${p}${it.nota ? `\n   _${it.nota}_` : ''}`;
}

const footer = () => (EXAMPLE ? '\n\n_(Precios de ejemplo, por confirmar.)_' : '') +
  '\n_Los valores pueden variar según el peso y la valoración del médico._';

// A clave matches when a word of the message starts with it (multi-word claves: substring).
function hits(words, text, claves) {
  let n = 0;
  for (const k of claves || []) {
    const c = norm(k);
    if (c.includes(' ') ? text.includes(c) : words.some((w) => w.startsWith(c))) n++;
  }
  return n;
}

const has = (words, text, claves) => hits(words, text, claves) > 0;

const INTENTS = {
  urgencia: ['urgenc', 'emergenc', 'convuls', 'envenen', 'atropell', 'sangrando', 'no respira', 'se esta muriendo'],
  humano: ['asesor', 'humano', 'persona', 'alguien', 'operador', 'hablar con'],
  cita: ['cita', 'agendar', 'agenda', 'turno', 'reserv', 'apart'],
  horario: ['horario', 'hora', 'abren', 'abierto', 'cierran', 'atienden', 'domingo', 'festivo', 'direccion', 'donde', 'ubica', 'llegar', 'mapa', 'barrio'],
  saludo: ['hola', 'buen', 'buenas', 'menu', 'inicio', 'opciones', 'info', 'informacion', 'precio', 'precios', 'servicio', 'servicios', 'hi', 'ola'],
  gracias: ['gracias', 'listo', 'ok', 'vale', 'perfecto', 'chao', 'adios'],
};

const NAV = [
  { id: 'cita', title: 'Agendar cita' },
  { id: 'menu', title: 'Menú principal' },
  { id: 'humano', title: 'Hablar con asesor' },
];

function mainMenu(intro) {
  const rows = DATA.categorias.map((c) => ({ id: 'cat:' + c.id, title: c.titulo.slice(0, 24), description: c.descripcion.slice(0, 72) }));
  rows.push({ id: 'horario', title: 'Horario y ubicación', description: 'Cómo llegar y cuándo atendemos' });
  rows.push({ id: 'cita', title: 'Agendar cita', description: 'Reserva consulta, cirugía o spa' });
  rows.push({ id: 'humano', title: 'Hablar con asesor', description: 'Te atiende una persona del equipo' });
  return {
    type: 'list',
    body: intro || '¿En qué te podemos ayudar? Elige una opción o escríbenos tu pregunta (por ejemplo: _"cuánto vale castrar una gata"_).',
    button: 'Ver opciones',
    sections: [{ title: 'Menú', rows: rows.slice(0, 10) }],
  };
}

function welcome() {
  return [
    { type: 'text', body: `¡Hola! 🐾 Bienvenido a *${C.nombre}*.\nConsulta general y especializada, cirugía, laboratorio, ecografía, rayos X, farmacia, spa y pet shop.` },
    mainMenu(),
  ];
}

function category(cat) {
  return [{
    type: 'buttons',
    body: `*${cat.titulo}*\n\n${cat.items.map(priceLine).join('\n')}${footer()}`.slice(0, 1024),
    buttons: NAV,
  }];
}

function items(list) {
  return [{
    type: 'buttons',
    body: `${list.map(priceLine).join('\n')}${footer()}`.slice(0, 1024),
    buttons: NAV,
  }];
}

function horario() {
  const lines = [`*${C.nombre}*`];
  lines.push('📍 ' + (C.direccion || 'Dirección: escríbenos y te enviamos la ubicación.'));
  if (C.maps_url) lines.push('🗺️ ' + C.maps_url);
  lines.push('🕒 ' + (C.horario || 'Horario: escríbenos y te confirmamos.'));
  lines.push('📞 ' + C.telefono);
  return [{ type: 'buttons', body: lines.join('\n'), buttons: NAV }];
}

const cita = () => ({
  handoff: true,
  messages: [{
    type: 'text',
    body: '📅 *Agendar cita*\nEnvíanos en un solo mensaje:\n1. Nombre de tu mascota\n2. Perro o gato, y edad\n3. Servicio (consulta, vacuna, cirugía, spa…)\n4. Día y hora que prefieres\n\nUna persona del equipo te confirma la cita por aquí. 🙌',
  }],
});

const humano = () => ({
  handoff: true,
  messages: [{ type: 'text', body: '👩‍⚕️ Listo, una persona del equipo te responde por aquí en breve. Si es una urgencia, llámanos al ' + C.telefono + '.' }],
});

const urgencia = () => ({
  handoff: true,
  messages: [{ type: 'text', body: '🚨 ' + C.urgencias + '\n\nTambién puedes escribir aquí qué le pasa a tu mascota y el equipo te responde de inmediato.' }],
});

// input: { text } for a typed message, or { id } for a tapped button / list row.
function reply(input) {
  const wrap = (messages) => ({ handoff: false, messages });
  const id = input.id || '';

  if (id === 'menu') return wrap([mainMenu()]);
  if (id === 'cita') return cita();
  if (id === 'humano') return humano();
  if (id === 'horario') return wrap(horario());
  if (id.startsWith('cat:')) {
    const cat = DATA.categorias.find((c) => 'cat:' + c.id === id);
    if (cat) return wrap(category(cat));
  }

  const text = norm(input.text || '');
  const words = text.split(' ').filter(Boolean);
  if (!words.length) return wrap(welcome());

  if (has(words, text, INTENTS.urgencia)) return urgencia();
  if (has(words, text, INTENTS.humano)) return humano();

  // Prices: score every service by matching keywords; keep the best ones.
  let best = 0;
  let found = [];
  for (const cat of DATA.categorias) {
    const catHit = has(words, text, cat.claves) ? 1 : 0;
    for (const it of cat.items) {
      const s = hits(words, text, it.claves);
      if (!s) continue;
      const score = s * 2 + catHit;
      if (score > best) { best = score; found = [it]; } else if (score === best) found.push(it);
    }
  }
  if (found.length && found.length <= 6) return wrap(items(found));
  if (has(words, text, INTENTS.horario)) return wrap(horario());
  if (has(words, text, INTENTS.cita)) return cita();
  const cat = DATA.categorias.find((c) => has(words, text, c.claves));
  if (cat) return wrap(category(cat));
  if (found.length) return wrap(items(found.slice(0, 6)));

  if (has(words, text, INTENTS.saludo)) return wrap(welcome());
  if (has(words, text, INTENTS.gracias)) return wrap([{ type: 'text', body: '¡Con gusto! 🐶🐱 Si necesitas algo más, escribe *menú*.' }]);

  return wrap([mainMenu('No entendí bien tu mensaje 🙈. Elige una opción del menú o escribe *asesor* para hablar con una persona.')]);
}

module.exports = { reply, mainMenu, DATA };
