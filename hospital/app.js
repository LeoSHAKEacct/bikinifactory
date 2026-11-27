(function () {
  const H = window.HOSPITAL, T = window.Triage;
  const view = document.getElementById('view');
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const specById = id => H.specialties.find(s => s.id === id);
  const docById = id => H.doctors.find(d => d.id === id);
  const initials = n => n.replace(/^Dr\.\s*/, '').split(/\s+/).map(w => w[0]).slice(0, 2).join('');

  // ---------- storage (local demo; production = hospital API) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('careflow.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('careflow.' + k, JSON.stringify(v)); } catch {} }
  };
  const owl = (fn, ...args) => { try { window.Owl && window.Owl[fn](...args); } catch {} };
  let owlPending = null, greeted = false;
  const appts = () => store.get('appointments', []);
  const saveAppts = list => store.set('appointments', list);

  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
  }

  // ---------- availability ----------
  const TIMES = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];
  function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  const ymd = d => d.toISOString().slice(0, 10);
  function freeSlots(docId, date) {
    const d = new Date(date + 'T12:00:00');
    if (d.getDay() === 0) return [];
    const taken = new Set(appts().filter(a => a.doc === docId && a.date === date && a.status !== 'cancelled').map(a => a.time));
    const now = new Date();
    return TIMES.filter(t => {
      if (d.getDay() === 6 && t >= '13:00') return false;
      if (hash(docId + date + t) % 10 < 4) return false; // simulated existing bookings
      if (taken.has(t)) return false;
      if (date === ymd(now) && t <= now.toTimeString().slice(0, 5)) return false;
      return true;
    });
  }
  function nextDays(n) {
    const out = [], d = new Date();
    for (let i = 0; i < n; i++) { const x = new Date(d); x.setDate(d.getDate() + i); out.push(ymd(x)); }
    return out;
  }
  const fmtDate = s => new Date(s + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

  // ---------- views ----------
  function home() {
    const up = appts().filter(a => a.status === 'booked' && a.date >= ymd(new Date())).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
    owl('base', 'wave', greeted ? '' : '¡Hola! Soy Holly 🦉 ¿En qué te ayudo hoy?', 'hop'); greeted = true;
    view.innerHTML = `
      <h1>¿Cómo podemos ayudarte hoy?</h1>
      <p class="lead">${esc(H.name)} — pide cita, revisa tus síntomas y te orientamos hacia la atención adecuada, 24/7.</p>
      ${up ? `<a class="card" style="display:block;text-decoration:none;color:inherit" href="#/appointments">
        <span class="badge">Próxima cita</span>
        <div class="doc" style="margin-top:8px"><div class="avatar">${initials(docById(up.doc).name)}</div>
        <div><b>${esc(docById(up.doc).name)}</b><br><span class="muted small">${fmtDate(up.date)} · ${up.time} · ${up.mode === 'video' ? 'Videollamada' : 'Presencial'}</span></div></div></a>` : ''}
      <div class="grid">
        <a class="tile primary" href="#/triage"><span class="ic">✚</span><b>Revisar síntomas</b><small>Triaje guiado en 2 minutos</small></a>
        <a class="tile" href="#/book"><span class="ic">▦</span><b>Pedir cita</b><small>Presencial o por vídeo</small></a>
        <a class="tile" href="#/assistant"><span class="ic">✦</span><b>Preguntar al asistente</b><small>Cuéntalo con tus palabras</small></a>
        <a class="tile" href="#/appointments"><span class="ic">☰</span><b>Mis citas</b><small>Check-in, cambiar, cancelar</small></a>
      </div>
      <h2>Especialidades</h2>
      <div class="chips">${H.specialties.map(s => `<a class="chip" style="text-decoration:none" href="#/book?spec=${s.id}">${s.icon} ${esc(s.name)}</a>`).join('')}</div>
      ${disclaimer()}`;
  }

  function disclaimer() {
    return `<p class="disclaimer">Esta app orienta, no diagnostica. En caso de emergencia llama al <b>${H.emergencyNumber}</b>. La revisión de síntomas sigue reglas revisadas por el equipo clínico del hospital.</p>`;
  }

  function emergency() {
    owl('base', 'shock', 'Si es grave, llama al ' + H.emergencyNumber + ' ahora mismo', 'shake');
    view.innerHTML = `
      <div class="level l1"><h2>Emergencia</h2><p>Si la vida de alguien puede estar en peligro, llama ahora.</p>
        <a class="btn danger block" href="tel:${H.emergencyNumber}">Llamar al ${H.emergencyNumber}</a></div>
      <div class="card"><b>Llama inmediatamente si hay:</b>
        <ul class="clean"><li>Dolor u opresión en el pecho, sobre todo si se extiende al brazo o la mandíbula</li>
        <li>Cara caída, debilidad en un brazo, habla arrastrada (ictus)</li>
        <li>Dificultad grave para respirar, labios azulados</li><li>Sangrado abundante que no para</li>
        <li>Pérdida de conocimiento, convulsiones o reacción alérgica grave</li><li>Pensamientos de quitarte la vida</li></ul></div>
      <div class="card"><b>Urgencias</b><p class="muted small">Abierto 24 horas · Entrada principal, planta baja<br>Centralita del hospital: ${esc(H.phone)}</p>
        <a class="btn ghost" href="#/triage">¿No estás seguro? Revisa tus síntomas</a></div>`;
  }

  // ----- triage wizard -----
  let tri;
  function triage() {
    tri = { step: 0, complaint: null, flags: [], age: null, severity: 3, days: null, conditions: [], pregnant: false };
    renderTriage();
  }
  function renderTriage() {
    const steps = 5, pct = Math.round((tri.step / steps) * 100);
    const back = tri.step ? `<button class="btn ghost" data-act="back">Atrás</button>` : '';
    let body = '';
    if (tri.step === 0) {
      body = `<h1>¿Para quién es?</h1><p class="lead">La edad cambia lo que es seguro.</p>
        ${[['adult', 'Adulto (16–74 años)'], ['senior', 'Adulto de 75 años o más'], ['child', 'Niño/a (3 meses–15 años)'], ['infant', 'Bebé menor de 3 meses']]
          .map(([v, l]) => `<button class="option" data-age="${v}" aria-pressed="${tri.age === v}">${l}</button>`).join('')}`;
    } else if (tri.step === 1) {
      body = `<h1>¿Cuál es el problema principal?</h1><p class="lead">Elige el más parecido.</p>
        ${T.COMPLAINTS.map(c => `<button class="option" data-c="${c.id}" aria-pressed="${tri.complaint === c.id}">${esc(c.label)}</button>`).join('')}`;
    } else if (tri.step === 2) {
      const c = T.COMPLAINTS.find(x => x.id === tri.complaint);
      body = `<h1>¿Tienes alguno de estos?</h1><p class="lead">Marca todos los que correspondan. Son señales de alarma.</p>
        ${c.flags.map((f, i) => `<button class="option" data-flag="${i}" aria-pressed="${!!tri.flags[i]}"><span>${tri.flags[i] ? '☑' : '☐'}</span><span>${esc(f.q)}</span></button>`).join('')}
        <div class="row end"><button class="btn" data-act="next">${tri.flags.some(Boolean) ? 'Continuar' : 'Ninguno de estos'}</button></div>`;
    } else if (tri.step === 3) {
      body = `<h1>¿Cuánto te molesta y desde cuándo?</h1>
        <label for="sev">Intensidad: <span id="sevv">${tri.severity}</span>/10</label>
        <input id="sev" type="range" min="0" max="10" value="${tri.severity}">
        <div class="row small muted" style="justify-content:space-between"><span>Leve</span><span>Lo peor imaginable</span></div>
        <label>Empezó</label>
        <div class="chips">${[['today', 'Hoy'], ['days', 'Hace 1–7 días'], ['week', 'Hace 1–2 semanas'], ['weeks', 'Hace más de 2 semanas']]
          .map(([v, l]) => `<button class="chip" data-days="${v}" aria-pressed="${tri.days === v}">${l}</button>`).join('')}</div>
        <div class="row end" style="margin-top:16px"><button class="btn" data-act="next" ${tri.days ? '' : 'disabled'}>Continuar</button></div>`;
    } else if (tri.step === 4) {
      const conds = ['Diabetes', 'Enfermedad del corazón', 'Asma / EPOC', 'Enfermedad renal', 'Tratamiento de cáncer', 'Defensas bajas'];
      body = `<h1>¿Algo más que debamos saber?</h1><p class="lead">Opcional — nos ayuda a ser más prudentes.</p>
        <div class="chips">${conds.map(c => `<button class="chip" data-cond="${esc(c)}" aria-pressed="${tri.conditions.includes(c)}">${esc(c)}</button>`).join('')}
        <button class="chip" data-preg aria-pressed="${tri.pregnant}">Embarazada</button></div>
        <div class="row end" style="margin-top:16px"><button class="btn" data-act="next">Ver mi resultado</button></div>`;
    } else {
      return renderTriageResult();
    }
    const OWL_STEP = [['think', 'Empecemos: ¿para quién es?'], ['think', 'Elige lo que más se parezca'],
      ['point', 'Marca cualquier señal de alarma'], ['think', 'Mueve la barra con sinceridad'], ['cheer', '¡Casi terminamos!']];
    if (tri.lastOwl !== tri.step) { tri.lastOwl = tri.step; owl('base', OWL_STEP[tri.step][0], OWL_STEP[tri.step][1], tri.step === 4 ? 'hop' : 'lean'); }
    view.innerHTML = `<div class="progress"><i style="width:${pct}%"></i></div>${body}<div class="row" style="margin-top:12px">${back}</div>`;
  }
  function renderTriageResult() {
    const r = T.assess(tri), s = specById(r.spec);
    const OWL_RES = { 1: ['shock', '¡Esto es una emergencia! Llama al ' + H.emergencyNumber + ' ya.', 'shake'],
      2: ['shock', '¡Muy urgente! Ve a Urgencias ahora.', 'shake'], 3: ['point', 'Hoy mismo: Urgencias o cita urgente.', 'lean'],
      4: ['idle', 'Nada grave, pero que te vea un médico pronto.', 'bob'], 5: ['cheer', '¡Buenas noticias! Parece leve. Cuídate 💙', 'hop'] };
    owl('base', ...OWL_RES[r.level]);
    store.set('lastTriage', { at: Date.now(), level: r.level, flags: r.complaint.flags.filter((f, i) => tri.flags[i] && f.level).map(f => f.q.replace(/^¿|\?$/g, '')), pregnant: tri.pregnant, complaint: r.complaint.label, reasons: r.reasons, severity: tri.severity, days: tri.days, age: tri.age, conditions: tri.conditions });
    let cta = '';
    if (r.level <= 2) cta = `<a class="btn danger block" href="tel:${H.emergencyNumber}">Llamar al ${H.emergencyNumber} ahora</a><a class="btn ghost block" style="margin-top:8px;background:var(--card)" href="#/emergency">Urgencias — abierto 24 h</a>`;
    else if (r.level === 3) cta = `<a class="btn block" href="#/book?spec=${r.spec}&urgent=1">Buscar la primera cita de hoy</a><p class="small" style="margin:8px 0 0">O ve directamente a Urgencias — abierto 24 h.</p>`;
    else cta = `<a class="btn block" href="#/book?spec=${r.spec}">Pedir cita en ${esc(s.name)}</a>`;
    const scale = [1, 2, 3, 4, 5].map(n => { const L = T.LEVELS[n];
      return `<div class="mts-step ${L.key}${n === r.level ? ' on' : ''}"><b>${L.color}</b><small>${L.target.replace('Atención ', '')}</small></div>`; }).join('');
    view.innerHTML = `
      <div class="mts" aria-label="Escala de triaje Manchester">${scale}</div>
      <div class="level ${r.info.key}"><span class="small" style="font-weight:700;text-transform:uppercase;letter-spacing:.04em">Color de triaje estimado</span>
        <h2>${r.info.title}</h2><p style="margin:0 0 4px"><b>${r.info.target}</b> en Urgencias</p><p>${r.info.action}</p>${cta}</div>
      ${r.reasons.length ? `<div class="card"><b>Por qué</b><ul class="clean">${r.reasons.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${r.level >= 4 ? `<div class="card"><b>Mientras tanto</b><ul class="clean">${r.selfCare.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <p class="small muted">Busca ayuda antes si empeoras o aparece alguna señal de alarma.</p></div>` : ''}
      <div class="card"><b>Recomendado</b><p class="muted" style="margin:4px 0">${s.icon} ${esc(s.name)}</p>
        <p class="small muted" style="margin:0">Tus respuestas se compartirán con el profesional sanitario para que no tengas que repetirlas. Es una estimación — la enfermera de triaje confirma tu color al llegar.</p></div>
      <a class="card" href="#/checkin" style="display:flex;gap:12px;align-items:center;text-decoration:none;color:inherit;border-color:var(--brand)">
        <span class="wa-ic">${WA_ICON}</span><span><b>${r.level <= 2 ? '¿Vas de camino? Avisa a recepción ahora' : 'Check-in — envía tus datos a recepción'}</b><br>
        <span class="small muted">Tu resultado de triaje (${r.info.color.toLowerCase()}) y tus datos llegan a recepción por WhatsApp.</span></span></a>
      <div class="row"><button class="btn ghost" data-act="restart">Empezar de nuevo</button><a class="btn ghost" href="#/assistant">Preguntar al asistente</a></div>
      ${disclaimer()}`;
  }
  view.addEventListener('click', e => {
    if (!tri || !location.hash.startsWith('#/triage')) return;
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.age) { tri.age = b.dataset.age; tri.step = 1; }
    else if (b.dataset.c) { tri.complaint = b.dataset.c; tri.flags = []; tri.step = 2; }
    else if (b.dataset.flag) { const i = +b.dataset.flag; tri.flags[i] = !tri.flags[i]; }
    else if (b.dataset.days) { tri.days = b.dataset.days; }
    else if (b.dataset.cond) { const c = b.dataset.cond; tri.conditions = tri.conditions.includes(c) ? tri.conditions.filter(x => x !== c) : [...tri.conditions, c]; }
    else if ('preg' in b.dataset) { tri.pregnant = !tri.pregnant; }
    else if (b.dataset.act === 'next') tri.step++;
    else if (b.dataset.act === 'back') tri.step--;
    else if (b.dataset.act === 'restart') return triage();
    else return;
    // Danger sign ticked: jump straight to the result, no more questions.
    if (tri.step === 2 && b.dataset.flag && T.COMPLAINTS.find(c => c.id === tri.complaint).flags[+b.dataset.flag].level <= 2 && T.COMPLAINTS.find(c => c.id === tri.complaint).flags[+b.dataset.flag].level > 0 && tri.flags[+b.dataset.flag]) tri.step = 5;
    renderTriage();
  });
  view.addEventListener('input', e => {
    if (e.target.id === 'sev') { tri.severity = +e.target.value; $('#sevv').textContent = tri.severity; }
  });

  // ----- booking -----
  let bk;
  function book(params) {
    bk = { spec: params.get('spec'), doc: null, date: null, time: null, mode: 'clinic', urgent: params.get('urgent') === '1', reschedule: params.get('re') };
    if (bk.reschedule) { const a = appts().find(x => x.id === bk.reschedule); if (a) { bk.spec = a.spec; bk.doc = a.doc; bk.mode = a.mode; } }
    renderBook();
  }
  function renderBook() {
    if (!bk.spec) {
      owl('base', 'think', '¿Qué especialidad necesitas?', 'lean');
      view.innerHTML = `<h1>Pedir cita</h1><p class="lead">Elige una especialidad. ¿No estás seguro? <a href="#/triage">Revisa tus síntomas</a> primero.</p>
        ${H.specialties.map(s => `<button class="option" data-spec="${s.id}"><span style="font-size:22px">${s.icon}</span><span><b>${esc(s.name)}</b><small>${esc(s.desc)}</small></span></button>`).join('')}`;
      return;
    }
    const s = specById(bk.spec), docs = H.doctors.filter(d => d.spec === bk.spec);
    if (!bk.doc) {
      // earliest availability per doctor
      const days = nextDays(14);
      const rows = docs.map(d => { const day = days.find(x => freeSlots(d.id, x).length); return { d, day, slot: day && freeSlots(d.id, day)[0] }; })
        .sort((a, b) => ((a.day || 'z') + (a.slot || '')).localeCompare((b.day || 'z') + (b.slot || '')));
      view.innerHTML = `<button class="btn ghost" data-act="spec">← Especialidades</button>
        <h1>${s.icon} ${esc(s.name)}</h1>
        ${bk.urgent ? `<div class="level l3" style="padding:12px"><b>Amarillo — urgente:</b> mostramos primero las citas más próximas. Si empeoras, ve a Urgencias.</div>` : ''}
        ${rows.map(({ d, day, slot }) => `<button class="option" data-doc="${d.id}">
          <div class="avatar">${initials(d.name)}</div>
          <span style="flex:1"><b>${esc(d.name)}</b><small>★ ${d.rating} · ${d.langs.join(' · ')}${d.tele ? ' · Vídeo disponible' : ''}</small>
          <small>${day ? `Próxima: <b>${fmtDate(day)} ${slot}</b>` : 'Sin citas en las próximas 2 semanas'}</small></span></button>`).join('')}`;
      return;
    }
    const d = docById(bk.doc), days = nextDays(14);
    if (!bk.date) bk.date = days.find(x => freeSlots(d.id, x).length) || days[0];
    const slots = freeSlots(d.id, bk.date);
    view.innerHTML = `<button class="btn ghost" data-act="doc">← Médicos</button>
      <div class="doc" style="margin:12px 0"><div class="avatar">${initials(d.name)}</div><div><b>${esc(d.name)}</b><br><span class="muted small">${esc(s.name)} · ★ ${d.rating}</span></div></div>
      ${d.tele ? `<label>Tipo de consulta</label><div class="chips">
        <button class="chip" data-mode="clinic" aria-pressed="${bk.mode === 'clinic'}">🏥 Presencial</button>
        <button class="chip" data-mode="video" aria-pressed="${bk.mode === 'video'}">📹 Videollamada</button></div>` : ''}
      <label>Fecha</label>
      <div class="days">${days.map(x => { const n = freeSlots(d.id, x).length, dt = new Date(x + 'T12:00:00');
        return `<button class="day" data-date="${x}" aria-pressed="${bk.date === x}" ${n ? '' : 'disabled'}><small>${dt.toLocaleDateString('es-ES', { weekday: 'short' })}</small><b>${dt.getDate()}</b><small>${n ? n + ' libres' : 'completo'}</small></button>`; }).join('')}</div>
      <label>Hora</label>
      ${slots.length ? `<div class="slots">${slots.map(t => `<button class="slot" data-time="${t}" aria-pressed="${bk.time === t}">${t}</button>`).join('')}</div>` : '<p class="muted">No hay horas libres este día.</p>'}
      ${bk.time ? patientForm() : ''}`;
    if (bk.time) owl('base', 'phone', 'Último paso: tus datos y listo', 'lean');
  }
  function patientForm() {
    const p = store.get('patient', {}), last = store.get('lastTriage', null);
    const fresh = last && Date.now() - last.at < 864e5;
    return `<div class="card" style="margin-top:16px"><b>Tus datos</b>
      <form id="bkform">
        <label for="pn">Nombre completo</label><input id="pn" name="name" required autocomplete="name" value="${esc(p.name)}">
        <label for="pd">Fecha de nacimiento</label><input id="pd" name="dob" type="date" required value="${esc(p.dob)}">
        <label for="pp">Móvil</label><input id="pp" name="phone" type="tel" required autocomplete="tel" value="${esc(p.phone)}">
        <label for="pi">Seguro / DNI <span class="muted small">(opcional)</span></label><input id="pi" name="ins" value="${esc(p.ins)}">
        <label for="pr">Motivo de la consulta</label><textarea id="pr" name="reason" placeholder="p. ej. tos desde hace 5 días">${fresh ? esc(last.complaint + (last.reasons.length ? ' — ' + last.reasons.join('; ') : '')) : ''}</textarea>
        ${fresh ? '<p class="small muted">✓ Tu revisión de síntomas se adjuntará para el médico.</p>' : ''}
        <button class="btn block" style="margin-top:16px">${bk.reschedule ? 'Confirmar nueva hora' : 'Confirmar cita'} · ${fmtDate(bk.date)} ${bk.time}</button>
      </form></div>`;
  }
  view.addEventListener('click', e => {
    if (!bk || !location.hash.startsWith('#/book')) return;
    const b = e.target.closest('button'); if (!b || b.form) return;
    if (b.dataset.spec) { bk.spec = b.dataset.spec; }
    else if (b.dataset.act === 'spec') { bk.spec = null; bk.doc = null; history.replaceState(null, '', '#/book'); }
    else if (b.dataset.doc) { bk.doc = b.dataset.doc; bk.date = null; bk.time = null; }
    else if (b.dataset.act === 'doc') { bk.doc = null; }
    else if (b.dataset.mode) { bk.mode = b.dataset.mode; }
    else if (b.dataset.date) { bk.date = b.dataset.date; bk.time = null; }
    else if (b.dataset.time) { bk.time = b.dataset.time; }
    else return;
    renderBook(); window.scrollTo({ top: b.dataset.time ? document.body.scrollHeight : 0, behavior: 'smooth' });
  });
  view.addEventListener('submit', e => {
    if (e.target.id !== 'bkform') return;
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    store.set('patient', { name: f.name, dob: f.dob, phone: f.phone, ins: f.ins });
    let list = appts();
    if (bk.reschedule) list = list.map(a => a.id === bk.reschedule ? { ...a, status: 'rescheduled' } : a);
    const last = store.get('lastTriage', null);
    const a = {
      id: 'CF-' + Math.random().toString(36).slice(2, 8).toUpperCase(), spec: bk.spec, doc: bk.doc, date: bk.date, time: bk.time,
      mode: bk.mode, reason: f.reason, status: 'booked', created: Date.now(),
      triage: last && Date.now() - last.at < 864e5 ? last : null, intake: null, checkedIn: false
    };
    list.push(a); saveAppts(list);
    toast(bk.reschedule ? 'Cita cambiada' : '¡Cita confirmada! Referencia ' + a.id);
    owlPending = bk.reschedule ? '¡Cita cambiada! 🎉' : '¡Cita confirmada! Te esperamos 🎉';
    location.hash = '#/appointments?new=' + a.id;
  });

  // ----- appointments -----
  function appointments(params) {
    const today = ymd(new Date()), list = appts().filter(a => a.status === 'booked');
    const up = list.filter(a => a.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const past = list.filter(a => a.date < today).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    const fresh = params.get('new');
    const card = a => {
      const d = docById(a.doc), s = specById(a.spec), isToday = a.date === today;
      return `<div class="card" ${a.id === fresh ? 'style="border-color:var(--brand)"' : ''}>
        <div class="row" style="justify-content:space-between"><span class="badge">${a.id}</span>
          ${a.checkedIn ? '<span class="badge">Check-in hecho</span>' : a.intake ? '<span class="badge gray">Formulario hecho</span>' : '<span class="badge amber">Formulario previo</span>'}</div>
        <div class="doc" style="margin:10px 0"><div class="avatar">${initials(d.name)}</div>
          <div><b>${esc(d.name)}</b><br><span class="muted small">${s.icon} ${esc(s.name)}</span></div></div>
        <p style="margin:0"><b>${fmtDate(a.date)} · ${a.time}</b> · ${a.mode === 'video' ? '📹 Videollamada' : '🏥 ' + esc(H.name)}</p>
        ${a.triage ? `<p class="small muted" style="margin:6px 0 0"><span class="dot ${T.LEVELS[a.triage.level]?.key || ''}"></span>Revisión de síntomas adjunta: ${esc(a.triage.complaint)} · ${T.LEVELS[a.triage.level]?.color || ''}</p>` : ''}
        <div class="row" style="margin-top:12px">
          ${a.date >= today ? `
            ${isToday && !a.checkedIn ? (a.mode === 'video' ? `<button class="btn" data-checkin="${a.id}">Entrar en sala de espera</button>` : `<a class="btn" href="#/checkin?id=${a.id}">Hacer check-in</a>`) : ''}
            <button class="btn ghost" data-intake="${a.id}">${a.intake ? 'Editar formulario' : 'Rellenar formulario previo'}</button>
            <button class="btn ghost" data-ics="${a.id}">Añadir al calendario</button>
            <a class="btn ghost" href="#/book?re=${a.id}">Cambiar cita</a>
            <button class="btn ghost" data-cancel="${a.id}" style="color:var(--red)">Cancelar</button>` : ''}
        </div></div>`;
    };
    owl('base', 'idle', up.length ? '' : 'Aún no tienes citas. ¿Pedimos una?', 'bob');
    view.innerHTML = `<h1>Mis citas</h1>
      ${up.length ? up.map(card).join('') : `<div class="card"><p>No tienes citas próximas.</p><a class="btn" href="#/book">Pedir una</a></div>`}
      ${past.length ? `<h2>Anteriores</h2>${past.map(card).join('')}` : ''}`;
  }
  view.addEventListener('click', e => {
    if (!location.hash.startsWith('#/appointments')) return;
    const b = e.target.closest('button'); if (!b) return;
    const list = appts();
    if (b.dataset.cancel) {
      if (!confirm('¿Cancelar esta cita? La hora se ofrecerá a otra persona.')) return;
      saveAppts(list.map(a => a.id === b.dataset.cancel ? { ...a, status: 'cancelled' } : a)); toast('Cita cancelada'); route();
    } else if (b.dataset.checkin) {
      saveAppts(list.map(a => a.id === b.dataset.checkin ? { ...a, checkedIn: true } : a));
      toast('Check-in hecho. Te avisaremos cuando sea tu turno.'); route();
    } else if (b.dataset.ics) {
      downloadIcs(list.find(a => a.id === b.dataset.ics));
    } else if (b.dataset.intake) {
      location.hash = '#/intake?id=' + b.dataset.intake;
    }
  });
  function downloadIcs(a) {
    const d = docById(a.doc), start = a.date.replace(/-/g, '') + 'T' + a.time.replace(':', '') + '00';
    const [h, m] = a.time.split(':').map(Number), endM = h * 60 + m + 30;
    const end = a.date.replace(/-/g, '') + 'T' + String(Math.floor(endM / 60)).padStart(2, '0') + String(endM % 60).padStart(2, '0') + '00';
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CareFlow//EN', 'BEGIN:VEVENT', 'UID:' + a.id + '@careflow',
      'DTSTART:' + start, 'DTEND:' + end, 'SUMMARY:Cita con ' + d.name,
      'LOCATION:' + (a.mode === 'video' ? 'Videollamada' : H.name), 'DESCRIPTION:Referencia ' + a.id, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); link.download = a.id + '.ics'; link.click();
  }

  // ----- pre-visit intake -----
  function intake(params) {
    const a = appts().find(x => x.id === params.get('id'));
    if (!a) { location.hash = '#/appointments'; return; }
    const i = a.intake || {};
    owl('base', 'phone', 'Así tu médico lo sabe antes de la cita', 'lean');
    view.innerHTML = `<a class="btn ghost" href="#/appointments">← Mis citas</a>
      <h1>Formulario previo</h1><p class="lead">Son 2 minutos y ahorras tiempo en el mostrador. Tu médico lo verá antes de la consulta.</p>
      <form id="inform" class="card">
        <label>Motivo principal</label><textarea name="concern" required>${esc(i.concern || a.reason)}</textarea>
        <label>Medicación actual</label><textarea name="meds" placeholder="Nombre, dosis, frecuencia">${esc(i.meds)}</textarea>
        <label>Alergias</label><input name="allergies" value="${esc(i.allergies)}" placeholder="p. ej. penicilina, ninguna">
        <label>Preguntas para el médico</label><textarea name="questions">${esc(i.questions)}</textarea>
        <label><input type="checkbox" name="consent" required ${i.consent ? 'checked' : ''} style="width:auto"> Acepto compartir esto con mi equipo médico</label>
        <button class="btn block" style="margin-top:12px">Guardar</button>
      </form>`;
    $('#inform').onsubmit = e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target)); f.consent = !!f.consent;
      saveAppts(appts().map(x => x.id === a.id ? { ...x, intake: f } : x));
      toast('Guardado — gracias'); owlPending = '¡Formulario guardado! 🙌'; location.hash = '#/appointments';
    };
  }

  // ----- AI assistant -----
  let chat = store.get('chat_es', []);
  function assistant() {
    if (!chat.length) chat = [{ role: 'assistant', content: 'Hola, soy el asistente de CareFlow. Cuéntame qué te pasa con tus propias palabras, o pregúntame por horarios de visita, cómo prepararte para una prueba o tus citas.\n\nNo puedo diagnosticar, pero te indicaré la atención adecuada.' }];
    owl('base', 'wave', 'Cuéntame qué te pasa, con tus palabras', 'hop');
    view.innerHTML = `<h1>Asistente</h1>
      <div class="chat" id="chat" aria-live="polite">${chat.map(m => `<div class="msg ${m.role === 'user' ? 'me' : 'ai'}">${esc(m.content)}</div>`).join('')}</div>
      <div id="chatcta"></div>
      <form class="composer" id="composer"><input id="q" placeholder="p. ej. dolor de garganta y fiebre desde ayer" autocomplete="off" required><button class="btn">Enviar</button></form>
      <div class="row" style="margin-top:8px"><button class="btn ghost small" id="clear">Nueva conversación</button></div>
      ${disclaimer()}`;
    $('#composer').onsubmit = async e => {
      e.preventDefault();
      const q = $('#q').value.trim(); if (!q) return;
      $('#q').value = '';
      chat.push({ role: 'user', content: q }); assistantRender();
      owl('base', 'think', 'Pensando…', 'pulse');
      const reply = await askAssistant(q);
      if (reply.level && reply.level <= 2) owl('base', 'shock', 'Esto puede ser urgente', 'shake');
      else { owl('base', 'wave', '', 'bob'); owl('flash', 'cheer', 'hop', 800); }
      chat.push({ role: 'assistant', content: reply.text }); store.set('chat_es', chat.slice(-30));
      assistantRender(reply);
    };
    $('#clear').onclick = () => { chat = []; store.set('chat_es', []); assistant(); };
  }
  function assistantRender(reply) {
    $('#chat').innerHTML = chat.map(m => `<div class="msg ${m.role === 'user' ? 'me' : 'ai'}">${esc(m.content)}</div>`).join('');
    const cta = $('#chatcta');
    if (reply && reply.level && reply.level <= 2) cta.innerHTML = `<a class="btn danger block" style="margin-top:12px" href="tel:${H.emergencyNumber}">Llamar al ${H.emergencyNumber}</a>`;
    else if (reply && reply.spec) cta.innerHTML = `<div class="row" style="margin-top:12px"><a class="btn" href="#/book?spec=${reply.spec}${reply.level === 3 ? '&urgent=1' : ''}">Pedir cita en ${esc(specById(reply.spec)?.name || 'consulta')}</a><a class="btn ghost" href="#/triage">Hacer la revisión completa</a></div>`;
    else cta.innerHTML = '';
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }
  async function askAssistant(q) {
    // Safety net that runs before any AI call.
    if (T.EMERGENCY_WORDS.test(q)) {
      return { level: 1, text: `Lo que describes podría ser una emergencia. Llama al ${H.emergencyNumber} ahora o ve a Urgencias. Si estás pensando en hacerte daño, no estás solo/a — llama al ${H.emergencyNumber} o a una línea de ayuda de inmediato.` };
    }
    try {
      const r = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chat.filter(m => m.role !== 'system').slice(-12), specialties: H.specialties.map(s => s.id) }) });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      if (!j.text) throw new Error('empty');
      return j;
    } catch {
      const c = T.guessComplaint(q), comp = T.COMPLAINTS.find(x => x.id === c), s = specById(comp.spec);
      return { spec: comp.spec, level: 4,
        text: `Parece que se trata de: ${comp.label.toLowerCase()}. Lo mejor es hacer la revisión de síntomas de 2 minutos — pregunta por las señales de alarma — o pedir cita en ${s.name} directamente.\n\nSi algo te parece grave o empeora rápido, ve a Urgencias.` };
    }
  }

  // ---------- router ----------
  const WA_ICON = '<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><path fill="#fff" d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6c-2 0-4-.5-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.4 14.4 0 0 0 5.5 4.9c2 .9 2.9 1 3.9.8a3.3 3.3 0 0 0 2.2-1.5 2.7 2.7 0 0 0 .2-1.5c-.1-.2-.3-.2-.6-.4z"/></svg>';
  const DOT = { 1: '🔴', 2: '🟠', 3: '🟡', 4: '🟢', 5: '🔵' };
  const AGE_LABEL = { adult: 'Adulto 16–74', senior: 'Adulto 75+', child: 'Niño/a', infant: 'Bebé menor de 3 meses' };
  const DAYS_LABEL = { today: 'hoy', days: 'hace 1–7 días', week: 'hace 1–2 semanas', weeks: 'hace más de 2 semanas' };

  // ----- check-in: patient data -> receptionist via WhatsApp -----
  const dmy = s => s ? s.split('-').reverse().join('/') : '';
  function ageFrom(dob) { if (!dob) return ''; const d = new Date(dob), n = new Date(); let y = n.getFullYear() - d.getFullYear();
    if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) y--; return y >= 0 ? y : ''; }
  function checkin(params) {
    const p = store.get('patient', {}), last = store.get('lastTriage', null);
    const tr = last && Date.now() - last.at < 12 * 36e5 ? last : null;
    const a = params.get('id') ? appts().find(x => x.id === params.get('id')) : null;
    const L = tr && T.LEVELS[tr.level];
    owl('base', 'phone', 'Rellena tus datos y los envío a recepción 📲', 'lean');
    view.innerHTML = `${a ? '<a class="btn ghost" href="#/appointments">← Mis citas</a>' : ''}
      <h1>Check-in</h1><p class="lead">Rellena tus datos. Llegan directamente a recepción junto con tu color de triaje, así no tienes que repetirlos en el mostrador.</p>
      ${L ? `<div class="level ${L.key}" style="padding:14px">
          <div class="row" style="justify-content:space-between"><span class="small" style="font-weight:700;text-transform:uppercase">Tu color de triaje</span><a class="small" href="#/triage">Repetir</a></div>
          <h2 style="margin:4px 0">${DOT[tr.level]} ${L.title}</h2><p style="margin:0">${esc(tr.complaint)} · ${L.target}</p></div>`
        : `<div class="card"><b>Aún no tienes color de triaje</b><p class="small muted" style="margin:4px 0 10px">Haz primero la revisión de síntomas de 2 minutos para que recepción pueda priorizarte.</p><a class="btn" href="#/triage">Revisar síntomas</a></div>`}
      ${tr && tr.level <= 2 ? `<a class="btn danger block" href="tel:${H.emergencyNumber}">Si empeora, llama al ${H.emergencyNumber}</a>` : ''}
      ${a ? `<div class="card"><b>Cita ${a.id}</b><p class="small muted" style="margin:4px 0 0">${esc(docById(a.doc).name)} · ${fmtDate(a.date)} ${a.time}</p></div>` : ''}
      <form id="ckform" class="card">
        <label for="cn">Nombre completo</label><input id="cn" name="name" required autocomplete="name" value="${esc(p.name)}">
        <div class="grid"><div><label for="cd">Fecha de nacimiento</label><input id="cd" name="dob" type="date" required value="${esc(p.dob)}"></div>
          <div><label for="cs">Sexo</label><select id="cs" name="sex">${['', 'Mujer', 'Hombre', 'Otro'].map(x => `<option ${p.sex === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div>
        <label for="cp">Móvil</label><input id="cp" name="phone" type="tel" required autocomplete="tel" value="${esc(p.phone)}">
        <label for="cid">DNI / documento de identidad</label><input id="cid" name="idnum" value="${esc(p.idnum)}">
        <label for="ci">Seguro médico / tarjeta sanitaria</label><input id="ci" name="ins" value="${esc(p.ins)}">
        <label for="ca">Alergias</label><input id="ca" name="allergies" placeholder="p. ej. penicilina, ninguna" value="${esc(p.allergies)}">
        <label for="cm">Medicación actual</label><input id="cm" name="meds" placeholder="Nombre y dosis" value="${esc(p.meds)}">
        <label for="ce">Contacto de emergencia (nombre + teléfono)</label><input id="ce" name="contact" value="${esc(p.contact)}">
        <label for="cr">Llegada</label><select id="cr" name="arrival">
          ${['Ya estoy en el hospital', 'Llego en 15 minutos', 'Llego en 30 minutos', 'Llego en 1 hora'].map(x => `<option>${x}</option>`).join('')}</select>
        <label for="cx">¿Algo más para recepción?</label><textarea id="cx" name="notes" placeholder="p. ej. necesito silla de ruedas, intérprete"></textarea>
        <label><input type="checkbox" name="consent" required style="width:auto"> Acepto enviar esta información a la recepción del hospital</label>
        <button class="btn block wa-btn" style="margin-top:14px">${WA_ICON} Enviar a recepción por WhatsApp</button>
      </form>`;
    $('#ckform').onsubmit = e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      store.set('patient', { ...p, name: f.name, dob: f.dob, sex: f.sex, phone: f.phone, idnum: f.idnum, ins: f.ins, allergies: f.allergies, meds: f.meds, contact: f.contact });
      const BR = '\u0001';
      const ref = a ? a.id : 'CK-' + Math.random().toString(36).slice(2, 7).toUpperCase();
      const lines = [
        `*${H.name} — Check-in de paciente* (${ref})`, BR,
        L ? `${DOT[tr.level]} *TRIAJE: ${L.color.toUpperCase()} — ${L.name}* (${L.target})` : '⚪ *TRIAJE: no realizado*',
        L ? `_Autotriaje estimado por el paciente — confirmar en el mostrador_` : '', BR,
        tr ? `*Motivo:* ${tr.complaint}` : '',
        tr && tr.flags && tr.flags.length ? `*Señales de alarma:* ${tr.flags.join('; ')}` : '',
        tr && tr.days ? `*Intensidad:* ${tr.severity}/10 · *Inicio:* ${DAYS_LABEL[tr.days]}` : '',
        tr && (tr.conditions.length || tr.pregnant) ? `*Antecedentes:* ${[...tr.conditions, tr.pregnant ? 'Embarazada' : ''].filter(Boolean).join(', ')}` : '',
        tr ? BR : '',
        `*Nombre:* ${f.name}`,
        `*Nacimiento:* ${dmy(f.dob)}${ageFrom(f.dob) !== '' ? ' (' + ageFrom(f.dob) + ' años)' : ''}${f.sex ? ' · ' + f.sex : ''}`,
        `*Teléfono:* ${f.phone}`,
        f.idnum ? `*DNI:* ${f.idnum}` : '', f.ins ? `*Seguro/tarjeta sanitaria:* ${f.ins}` : '',
        `*Alergias:* ${f.allergies || 'no indicadas'}`, f.meds ? `*Medicación:* ${f.meds}` : '',
        f.contact ? `*Contacto de emergencia:* ${f.contact}` : '',
        a ? `*Cita:* ${docById(a.doc).name}, ${dmy(a.date)} ${a.time}` : '',
        `*Llegada:* ${f.arrival}`, f.notes ? `*Notas:* ${f.notes}` : ''
      ].filter(Boolean).map(x => x === BR ? '' : x);
      const text = lines.join('\n');
      if (a) saveAppts(appts().map(x => x.id === a.id ? { ...x, checkedIn: true } : x));
      const num = String(H.receptionWhatsApp || '').replace(/\D/g, '');
      const url = 'https://wa.me/' + num + '?text=' + encodeURIComponent(text);
      window.open(url, '_blank', 'noopener') || (location.href = url);
      owl('base', 'cheer', '', 'bob'); owl('celebrate', '¡Listo! Pulsa Enviar en WhatsApp ✅');
      view.innerHTML = `<div class="level ${L ? L.key : 'l4'}"><h2>${L ? DOT[tr.level] + ' ' + L.title : 'Datos listos'}</h2>
        <p>Pulsa <b>Enviar</b> en WhatsApp para que llegue a recepción. Muestra la referencia <b>${ref}</b> en el mostrador.</p>
        <a class="btn block wa-btn" href="${url}" target="_blank" rel="noopener">${WA_ICON} Abrir WhatsApp de nuevo</a></div>
        <div class="card"><b>Vista previa del mensaje</b><pre class="small" style="white-space:pre-wrap;margin:8px 0 0;font:inherit">${esc(text.replace(/\*/g, '').replace(/_/g, ''))}</pre></div>
        <a class="btn ghost" href="#/">Inicio</a>`;
    };
  }

  const ROUTES = { '': home, triage, book, appointments, intake, assistant, emergency, checkin };
  function route() {
    const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
    const fn = ROUTES[path] || home;
    if (fn !== triage) tri = null;
    if (fn !== book) bk = null;
    fn(new URLSearchParams(qs || ''));
    if (owlPending) { owl('celebrate', owlPending); owlPending = null; }
    document.querySelectorAll('.tabbar a').forEach(a => a.classList.toggle('active', a.dataset.tab === (path || 'home') || ((path === 'intake' || path === 'checkin') && a.dataset.tab === 'appointments')));
    view.focus({ preventScroll: true });
    if (fn !== book || !location.hash.includes('new=')) window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();
})();
