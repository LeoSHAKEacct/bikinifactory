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
  const fmtDate = s => new Date(s + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

  // ---------- views ----------
  function home() {
    const up = appts().filter(a => a.status === 'booked' && a.date >= ymd(new Date())).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
    view.innerHTML = `
      <h1>How can we help today?</h1>
      <p class="lead">${esc(H.name)} — book visits, check symptoms and get guided to the right care, 24/7.</p>
      ${up ? `<a class="card" style="display:block;text-decoration:none;color:inherit" href="#/appointments">
        <span class="badge">Next visit</span>
        <div class="doc" style="margin-top:8px"><div class="avatar">${initials(docById(up.doc).name)}</div>
        <div><b>${esc(docById(up.doc).name)}</b><br><span class="muted small">${fmtDate(up.date)} · ${up.time} · ${up.mode === 'video' ? 'Video call' : 'In person'}</span></div></div></a>` : ''}
      <div class="grid">
        <a class="tile primary" href="#/triage"><span class="ic">✚</span><b>Check symptoms</b><small>2-minute guided triage</small></a>
        <a class="tile" href="#/book"><span class="ic">▦</span><b>Book appointment</b><small>In person or video</small></a>
        <a class="tile" href="#/assistant"><span class="ic">✦</span><b>Ask the assistant</b><small>Describe it in your words</small></a>
        <a class="tile" href="#/appointments"><span class="ic">☰</span><b>My visits</b><small>Check-in, reschedule, cancel</small></a>
      </div>
      <h2>Specialties</h2>
      <div class="chips">${H.specialties.map(s => `<a class="chip" style="text-decoration:none" href="#/book?spec=${s.id}">${s.icon} ${esc(s.name)}</a>`).join('')}</div>
      ${disclaimer()}`;
  }

  function disclaimer() {
    return `<p class="disclaimer">This app gives guidance, not a diagnosis. In an emergency call <b>${H.emergencyNumber}</b>. Symptom checks follow rules reviewed by the hospital's clinical team.</p>`;
  }

  function emergency() {
    view.innerHTML = `
      <div class="level l1"><h2>Emergency</h2><p>If someone's life may be in danger, call now.</p>
        <a class="btn danger block" href="tel:${H.emergencyNumber}">Call ${H.emergencyNumber}</a></div>
      <div class="card"><b>Call immediately for:</b>
        <ul class="clean"><li>Chest pain or pressure, especially spreading to arm or jaw</li>
        <li>Face drooping, arm weakness, slurred speech (stroke)</li>
        <li>Severe difficulty breathing, blue lips</li><li>Heavy bleeding that won't stop</li>
        <li>Unconscious, seizure, or severe allergic reaction</li><li>Thoughts of ending your life</li></ul></div>
      <div class="card"><b>Emergency Department</b><p class="muted small">Open 24 hours · Main entrance, Ground floor<br>Hospital switchboard: ${esc(H.phone)}</p>
        <a class="btn ghost" href="#/triage">Not sure? Check symptoms</a></div>`;
  }

  // ----- triage wizard -----
  let tri;
  function triage() {
    tri = { step: 0, complaint: null, flags: [], age: null, severity: 3, days: null, conditions: [], pregnant: false };
    renderTriage();
  }
  function renderTriage() {
    const steps = 5, pct = Math.round((tri.step / steps) * 100);
    const back = tri.step ? `<button class="btn ghost" data-act="back">Back</button>` : '';
    let body = '';
    if (tri.step === 0) {
      body = `<h1>Who is this for?</h1><p class="lead">Age changes what's safe.</p>
        ${[['adult', 'Adult (16–74)'], ['senior', 'Adult 75+'], ['child', 'Child (3 months–15)'], ['infant', 'Baby under 3 months']]
          .map(([v, l]) => `<button class="option" data-age="${v}" aria-pressed="${tri.age === v}">${l}</button>`).join('')}`;
    } else if (tri.step === 1) {
      body = `<h1>What's the main problem?</h1><p class="lead">Pick the closest one.</p>
        ${T.COMPLAINTS.map(c => `<button class="option" data-c="${c.id}" aria-pressed="${tri.complaint === c.id}">${esc(c.label)}</button>`).join('')}`;
    } else if (tri.step === 2) {
      const c = T.COMPLAINTS.find(x => x.id === tri.complaint);
      body = `<h1>Any of these?</h1><p class="lead">Tap every one that applies. These are the danger signs.</p>
        ${c.flags.map((f, i) => `<button class="option" data-flag="${i}" aria-pressed="${!!tri.flags[i]}"><span>${tri.flags[i] ? '☑' : '☐'}</span><span>${esc(f.q)}</span></button>`).join('')}
        <div class="row end"><button class="btn" data-act="next">${tri.flags.some(Boolean) ? 'Continue' : 'None of these'}</button></div>`;
    } else if (tri.step === 3) {
      body = `<h1>How bad is it, and for how long?</h1>
        <label for="sev">Severity: <span id="sevv">${tri.severity}</span>/10</label>
        <input id="sev" type="range" min="0" max="10" value="${tri.severity}">
        <div class="row small muted" style="justify-content:space-between"><span>Mild</span><span>Worst imaginable</span></div>
        <label>Started</label>
        <div class="chips">${[['today', 'Today'], ['days', '1–7 days'], ['week', '1–2 weeks'], ['weeks', 'More than 2 weeks']]
          .map(([v, l]) => `<button class="chip" data-days="${v}" aria-pressed="${tri.days === v}">${l}</button>`).join('')}</div>
        <div class="row end" style="margin-top:16px"><button class="btn" data-act="next" ${tri.days ? '' : 'disabled'}>Continue</button></div>`;
    } else if (tri.step === 4) {
      const conds = ['Diabetes', 'Heart disease', 'Asthma / COPD', 'Kidney disease', 'Cancer treatment', 'Weak immune system'];
      body = `<h1>Anything else we should know?</h1><p class="lead">Optional — helps us be more careful.</p>
        <div class="chips">${conds.map(c => `<button class="chip" data-cond="${esc(c)}" aria-pressed="${tri.conditions.includes(c)}">${esc(c)}</button>`).join('')}
        <button class="chip" data-preg aria-pressed="${tri.pregnant}">Pregnant</button></div>
        <div class="row end" style="margin-top:16px"><button class="btn" data-act="next">See my result</button></div>`;
    } else {
      return renderTriageResult();
    }
    view.innerHTML = `<div class="progress"><i style="width:${pct}%"></i></div>${body}<div class="row" style="margin-top:12px">${back}</div>`;
  }
  function renderTriageResult() {
    const r = T.assess(tri), s = specById(r.spec);
    store.set('lastTriage', { at: Date.now(), level: r.level, complaint: r.complaint.label, reasons: r.reasons, severity: tri.severity, days: tri.days, age: tri.age, conditions: tri.conditions });
    let cta = '';
    if (r.level === 1) cta = `<a class="btn danger block" href="tel:${H.emergencyNumber}">Call ${H.emergencyNumber} now</a>`;
    else if (r.level === 2) cta = `<a class="btn block" href="#/book?spec=${r.spec}&urgent=1">Find the earliest slot today</a><p class="small" style="margin:8px 0 0">Or go straight to the Emergency Department — open 24h.</p>`;
    else cta = `<a class="btn block" href="#/book?spec=${r.spec}">Book ${esc(s.name)}</a>`;
    view.innerHTML = `
      <div class="level ${r.info.key}"><h2>${r.info.title}</h2><p>${r.info.action}</p>${cta}</div>
      ${r.reasons.length ? `<div class="card"><b>Why</b><ul class="clean">${r.reasons.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${r.level >= 3 ? `<div class="card"><b>Meanwhile</b><ul class="clean">${r.selfCare.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <p class="small muted">Get help sooner if things get worse or any danger sign appears.</p></div>` : ''}
      <div class="card"><b>Recommended</b><p class="muted" style="margin:4px 0">${s.icon} ${esc(s.name)} · ${r.info.wait}</p>
        <p class="small muted" style="margin:0">Your answers will be shared with the clinician so you don't have to repeat yourself.</p></div>
      <div class="row"><button class="btn ghost" data-act="restart">Start again</button><a class="btn ghost" href="#/assistant">Ask the assistant</a></div>
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
    if (tri.step === 2 && b.dataset.flag && T.COMPLAINTS.find(c => c.id === tri.complaint).flags[+b.dataset.flag].level === 1 && tri.flags[+b.dataset.flag]) tri.step = 5;
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
      view.innerHTML = `<h1>Book an appointment</h1><p class="lead">Choose a specialty. Not sure? <a href="#/triage">Check your symptoms</a> first.</p>
        ${H.specialties.map(s => `<button class="option" data-spec="${s.id}"><span style="font-size:22px">${s.icon}</span><span><b>${esc(s.name)}</b><small>${esc(s.desc)}</small></span></button>`).join('')}`;
      return;
    }
    const s = specById(bk.spec), docs = H.doctors.filter(d => d.spec === bk.spec);
    if (!bk.doc) {
      // earliest availability per doctor
      const days = nextDays(14);
      const rows = docs.map(d => { const day = days.find(x => freeSlots(d.id, x).length); return { d, day, slot: day && freeSlots(d.id, day)[0] }; })
        .sort((a, b) => ((a.day || 'z') + (a.slot || '')).localeCompare((b.day || 'z') + (b.slot || '')));
      view.innerHTML = `<button class="btn ghost" data-act="spec">← Specialties</button>
        <h1>${s.icon} ${esc(s.name)}</h1>
        ${bk.urgent ? `<div class="level l2" style="padding:12px"><b>Urgent:</b> showing the earliest slots first. If you get worse, go to the Emergency Department.</div>` : ''}
        ${rows.map(({ d, day, slot }) => `<button class="option" data-doc="${d.id}">
          <div class="avatar">${initials(d.name)}</div>
          <span style="flex:1"><b>${esc(d.name)}</b><small>★ ${d.rating} · ${d.langs.join(' · ')}${d.tele ? ' · Video available' : ''}</small>
          <small>${day ? `Next: <b>${fmtDate(day)} ${slot}</b>` : 'No slots in the next 2 weeks'}</small></span></button>`).join('')}`;
      return;
    }
    const d = docById(bk.doc), days = nextDays(14);
    if (!bk.date) bk.date = days.find(x => freeSlots(d.id, x).length) || days[0];
    const slots = freeSlots(d.id, bk.date);
    view.innerHTML = `<button class="btn ghost" data-act="doc">← Doctors</button>
      <div class="doc" style="margin:12px 0"><div class="avatar">${initials(d.name)}</div><div><b>${esc(d.name)}</b><br><span class="muted small">${esc(s.name)} · ★ ${d.rating}</span></div></div>
      ${d.tele ? `<label>Type of visit</label><div class="chips">
        <button class="chip" data-mode="clinic" aria-pressed="${bk.mode === 'clinic'}">🏥 In person</button>
        <button class="chip" data-mode="video" aria-pressed="${bk.mode === 'video'}">📹 Video call</button></div>` : ''}
      <label>Date</label>
      <div class="days">${days.map(x => { const n = freeSlots(d.id, x).length, dt = new Date(x + 'T12:00:00');
        return `<button class="day" data-date="${x}" aria-pressed="${bk.date === x}" ${n ? '' : 'disabled'}><small>${dt.toLocaleDateString(undefined, { weekday: 'short' })}</small><b>${dt.getDate()}</b><small>${n ? n + ' free' : 'full'}</small></button>`; }).join('')}</div>
      <label>Time</label>
      ${slots.length ? `<div class="slots">${slots.map(t => `<button class="slot" data-time="${t}" aria-pressed="${bk.time === t}">${t}</button>`).join('')}</div>` : '<p class="muted">No free times on this day.</p>'}
      ${bk.time ? patientForm() : ''}`;
  }
  function patientForm() {
    const p = store.get('patient', {}), last = store.get('lastTriage', null);
    const fresh = last && Date.now() - last.at < 864e5;
    return `<div class="card" style="margin-top:16px"><b>Your details</b>
      <form id="bkform">
        <label for="pn">Full name</label><input id="pn" name="name" required autocomplete="name" value="${esc(p.name)}">
        <label for="pd">Date of birth</label><input id="pd" name="dob" type="date" required value="${esc(p.dob)}">
        <label for="pp">Mobile</label><input id="pp" name="phone" type="tel" required autocomplete="tel" value="${esc(p.phone)}">
        <label for="pi">Insurance / ID number <span class="muted small">(optional)</span></label><input id="pi" name="ins" value="${esc(p.ins)}">
        <label for="pr">Reason for visit</label><textarea id="pr" name="reason" placeholder="e.g. cough for 5 days">${fresh ? esc(last.complaint + (last.reasons.length ? ' — ' + last.reasons.join('; ') : '')) : ''}</textarea>
        ${fresh ? '<p class="small muted">✓ Your symptom check will be attached for the doctor.</p>' : ''}
        <button class="btn block" style="margin-top:16px">${bk.reschedule ? 'Confirm new time' : 'Confirm booking'} · ${fmtDate(bk.date)} ${bk.time}</button>
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
    toast(bk.reschedule ? 'Rescheduled' : 'Booked! Reference ' + a.id);
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
          ${a.checkedIn ? '<span class="badge">Checked in</span>' : a.intake ? '<span class="badge gray">Form done</span>' : '<span class="badge amber">Pre-visit form</span>'}</div>
        <div class="doc" style="margin:10px 0"><div class="avatar">${initials(d.name)}</div>
          <div><b>${esc(d.name)}</b><br><span class="muted small">${s.icon} ${esc(s.name)}</span></div></div>
        <p style="margin:0"><b>${fmtDate(a.date)} · ${a.time}</b> · ${a.mode === 'video' ? '📹 Video call' : '🏥 ' + esc(H.name)}</p>
        ${a.triage ? `<p class="small muted" style="margin:4px 0 0">Symptom check attached: ${esc(a.triage.complaint)}</p>` : ''}
        <div class="row" style="margin-top:12px">
          ${a.date >= today ? `
            ${isToday && !a.checkedIn ? `<button class="btn" data-checkin="${a.id}">${a.mode === 'video' ? 'Join waiting room' : 'Check in'}</button>` : ''}
            <button class="btn ghost" data-intake="${a.id}">${a.intake ? 'Edit form' : 'Fill pre-visit form'}</button>
            <button class="btn ghost" data-ics="${a.id}">Add to calendar</button>
            <a class="btn ghost" href="#/book?re=${a.id}">Reschedule</a>
            <button class="btn ghost" data-cancel="${a.id}" style="color:var(--red)">Cancel</button>` : ''}
        </div></div>`;
    };
    view.innerHTML = `<h1>My visits</h1>
      ${up.length ? up.map(card).join('') : `<div class="card"><p>No upcoming appointments.</p><a class="btn" href="#/book">Book one</a></div>`}
      ${past.length ? `<h2>Past</h2>${past.map(card).join('')}` : ''}`;
  }
  view.addEventListener('click', e => {
    if (!location.hash.startsWith('#/appointments')) return;
    const b = e.target.closest('button'); if (!b) return;
    const list = appts();
    if (b.dataset.cancel) {
      if (!confirm('Cancel this appointment? The slot will be offered to someone else.')) return;
      saveAppts(list.map(a => a.id === b.dataset.cancel ? { ...a, status: 'cancelled' } : a)); toast('Cancelled'); route();
    } else if (b.dataset.checkin) {
      saveAppts(list.map(a => a.id === b.dataset.checkin ? { ...a, checkedIn: true } : a));
      toast("You're checked in. We'll notify you when it's your turn."); route();
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
      'DTSTART:' + start, 'DTEND:' + end, 'SUMMARY:Appointment with ' + d.name,
      'LOCATION:' + (a.mode === 'video' ? 'Video call' : H.name), 'DESCRIPTION:Reference ' + a.id, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); link.download = a.id + '.ics'; link.click();
  }

  // ----- pre-visit intake -----
  function intake(params) {
    const a = appts().find(x => x.id === params.get('id'));
    if (!a) { location.hash = '#/appointments'; return; }
    const i = a.intake || {};
    view.innerHTML = `<a class="btn ghost" href="#/appointments">← My visits</a>
      <h1>Pre-visit form</h1><p class="lead">Takes 2 minutes and saves time at the desk. Your doctor sees it before the visit.</p>
      <form id="inform" class="card">
        <label>Main concern</label><textarea name="concern" required>${esc(i.concern || a.reason)}</textarea>
        <label>Current medicines</label><textarea name="meds" placeholder="Name, dose, how often">${esc(i.meds)}</textarea>
        <label>Allergies</label><input name="allergies" value="${esc(i.allergies)}" placeholder="e.g. penicillin, none">
        <label>Questions for the doctor</label><textarea name="questions">${esc(i.questions)}</textarea>
        <label><input type="checkbox" name="consent" required ${i.consent ? 'checked' : ''} style="width:auto"> I agree to share this with my care team</label>
        <button class="btn block" style="margin-top:12px">Save</button>
      </form>`;
    $('#inform').onsubmit = e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target)); f.consent = !!f.consent;
      saveAppts(appts().map(x => x.id === a.id ? { ...x, intake: f } : x));
      toast('Saved — thank you'); location.hash = '#/appointments';
    };
  }

  // ----- AI assistant -----
  let chat = store.get('chat', []);
  function assistant() {
    if (!chat.length) chat = [{ role: 'assistant', content: "Hi, I'm the CareFlow assistant. Tell me what's going on in your own words, or ask about visiting hours, preparing for a test, or your appointments.\n\nI can't diagnose, but I'll point you to the right care." }];
    view.innerHTML = `<h1>Assistant</h1>
      <div class="chat" id="chat" aria-live="polite">${chat.map(m => `<div class="msg ${m.role === 'user' ? 'me' : 'ai'}">${esc(m.content)}</div>`).join('')}</div>
      <div id="chatcta"></div>
      <form class="composer" id="composer"><input id="q" placeholder="e.g. sore throat and fever since yesterday" autocomplete="off" required><button class="btn">Send</button></form>
      <div class="row" style="margin-top:8px"><button class="btn ghost small" id="clear">New conversation</button></div>
      ${disclaimer()}`;
    $('#composer').onsubmit = async e => {
      e.preventDefault();
      const q = $('#q').value.trim(); if (!q) return;
      $('#q').value = '';
      chat.push({ role: 'user', content: q }); assistantRender();
      const reply = await askAssistant(q);
      chat.push({ role: 'assistant', content: reply.text }); store.set('chat', chat.slice(-30));
      assistantRender(reply);
    };
    $('#clear').onclick = () => { chat = []; store.set('chat', []); assistant(); };
  }
  function assistantRender(reply) {
    $('#chat').innerHTML = chat.map(m => `<div class="msg ${m.role === 'user' ? 'me' : 'ai'}">${esc(m.content)}</div>`).join('');
    const cta = $('#chatcta');
    if (reply && reply.level === 1) cta.innerHTML = `<a class="btn danger block" style="margin-top:12px" href="tel:${H.emergencyNumber}">Call ${H.emergencyNumber}</a>`;
    else if (reply && reply.spec) cta.innerHTML = `<div class="row" style="margin-top:12px"><a class="btn" href="#/book?spec=${reply.spec}${reply.level === 2 ? '&urgent=1' : ''}">Book ${esc(specById(reply.spec)?.name || 'a visit')}</a><a class="btn ghost" href="#/triage">Run full symptom check</a></div>`;
    else cta.innerHTML = '';
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }
  async function askAssistant(q) {
    // Safety net that runs before any AI call.
    if (T.EMERGENCY_WORDS.test(q)) {
      return { level: 1, text: `What you describe could be an emergency. Please call ${H.emergencyNumber} now or go to the Emergency Department. If you are thinking about harming yourself, you are not alone — call ${H.emergencyNumber} or a crisis line right away.` };
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
      return { spec: comp.spec, level: 3,
        text: `It sounds like this may be about: ${comp.label.toLowerCase()}. The best next step is the 2-minute symptom check — it asks about the danger signs — or you can book ${s.name} directly.\n\nIf anything feels severe or is getting worse quickly, go to the Emergency Department.` };
    }
  }

  // ---------- router ----------
  const ROUTES = { '': home, triage, book, appointments, intake, assistant, emergency };
  function route() {
    const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
    const fn = ROUTES[path] || home;
    if (fn !== triage) tri = null;
    if (fn !== book) bk = null;
    fn(new URLSearchParams(qs || ''));
    document.querySelectorAll('.tabbar a').forEach(a => a.classList.toggle('active', a.dataset.tab === (path || 'home') || (path === 'intake' && a.dataset.tab === 'appointments')));
    view.focus({ preventScroll: true });
    if (fn !== book || !location.hash.includes('new=')) window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();
})();
