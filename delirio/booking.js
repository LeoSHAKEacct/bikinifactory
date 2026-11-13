/* Delírio Spa — public site: menu cards, booking wizard, page chrome. */
(function () {
  'use strict';
  const { t, L } = DS;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eur = (n) => '€' + n;

  const state = { step: 1, treat: null, min: null, therapist: 'any', date: null, start: null, month: null };
  let lastBooking = null;

  /* ---------- Chrome ---------- */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  $('#burger').onclick = () => $('#links').classList.toggle('open');
  $$('#links a').forEach((a) => (a.onclick = () => $('#links').classList.remove('open')));
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => es.forEach((e) => $('.mbar').classList.toggle('hide', e.isIntersecting)), { threshold: 0.05 }).observe($('#book'));
  $('#yr').textContent = new Date().getFullYear();

  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 }) : null;
  const reveal = () => $$('.rv:not(.in)').forEach((el) => (io ? io.observe(el) : el.classList.add('in')));

  /* ---------- Menu cards ---------- */
  function renderCards() {
    $('#cards').innerHTML = DS.TREATMENTS.map((tr, i) => `
      <article class="card rv" style="--c:${tr.color}">
        <div class="card-img"><img src="img/${tr.id}.webp" alt="" loading="lazy"></div>
        ${tr.signature ? `<span class="tag">${t('menu.signature')}</span>` : ''}
        <div class="num">0${i + 1}</div>
        <h3>${L(tr.name)}</h3>
        <p>${L(tr.desc)}</p>
        <div class="opts">${tr.options.map((o) => `<span>${o.min} ${t('b.min')}<b>${eur(o.price)}</b></span>`).join('')}</div>
        <div class="foot"><div class="price"><small>${t('menu.from')}</small>${eur(tr.options[0].price)}</div>
          <button class="btn btn-ghost btn-sm" data-pick="${tr.id}">${t('menu.book')}</button></div>
      </article>`).join('');
    reveal();
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick]'); if (!b) return;
    pickTreat(b.dataset.pick); go(1);
    $('#book').scrollIntoView({ behavior: 'smooth' });
  });

  function renderMarquee() {
    const words = DS.TREATMENTS.map((x) => L(x.name));
    $('#marquee').innerHTML = words.concat(words).map((w) => `<span>${w}</span>`).join('');
  }

  function renderNextFree() {
    for (let i = 0; i < 14; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      const k = DS.keyOf(d); const s = DS.slotsFor(k, 60, 'any');
      if (s.length) {
        const when = i === 0 ? (DS.lang === 'pt' ? 'Hoje' : 'Today') : i === 1 ? (DS.lang === 'pt' ? 'Amanhã' : 'Tomorrow') : DS.fmtDate(k, { weekday: 'long' });
        $('#nextFree').textContent = (DS.lang === 'pt' ? 'Próxima vaga: ' : 'Next opening: ') + when + ', ' + DS.hm(s[0].start);
        $('#nextFreeSub').textContent = s.length + ' ' + t('b.slots');
        return;
      }
    }
  }

  /* ---------- Wizard ---------- */
  function go(n) {
    state.step = n;
    $$('.pane').forEach((p) => p.classList.toggle('on', +p.dataset.p === n));
    $$('#steps li').forEach((li) => { const s = +li.dataset.s; li.classList.toggle('on', s === n); li.classList.toggle('done', s < n); });
    if (n === 2) { renderTherapists(); renderCal(); renderSlots(); }
    validate();
  }
  $$('[data-back]').forEach((b) => (b.onclick = () => go(state.step - 1)));

  function pickTreat(id) {
    const tr = DS.treat(id); state.treat = id;
    if (!tr.options.some((o) => o.min === state.min)) state.min = tr.options[0].min;
    state.start = null;
    renderTList(); renderSummary();
  }
  function renderTList() {
    $('#tlist').innerHTML = DS.TREATMENTS.map((tr) => `
      <button type="button" class="titem ${state.treat === tr.id ? 'sel' : ''}" data-t="${tr.id}">
        <b>${L(tr.name)}</b><em>${t('menu.from')} ${eur(tr.options[0].price)}</em>
        <small>${tr.options.map((o) => o.min + ' ' + t('b.min')).join(' · ')}</small>
      </button>`).join('');
    $$('#tlist [data-t]').forEach((b) => (b.onclick = () => pickTreat(b.dataset.t)));
    const tr = state.treat && DS.treat(state.treat);
    $('#durGrp').hidden = !tr;
    if (tr) {
      $('#durs').innerHTML = tr.options.map((o) => `<button type="button" class="chip ${o.min === state.min ? 'sel' : ''}" data-m="${o.min}">${o.min} ${t('b.min')} · ${eur(o.price)}</button>`).join('');
      $$('#durs [data-m]').forEach((b) => (b.onclick = () => { state.min = +b.dataset.m; state.start = null; renderTList(); renderSummary(); }));
    }
    validate();
  }
  $('#next1').onclick = () => go(2);

  function renderTherapists() {
    const opts = [{ id: 'any', name: t('b.any'), tag: '' }].concat(DS.THERAPISTS);
    $('#ths').innerHTML = opts.map((th) => `
      <button type="button" class="th ${state.therapist === th.id ? 'sel' : ''}" data-th="${th.id}">
        <div class="av">${th.id === 'any' ? '✦' : th.name[0]}</div><b>${th.name}</b><small>${L(th.tag) || '&nbsp;'}</small>
      </button>`).join('');
    $$('#ths [data-th]').forEach((b) => (b.onclick = () => { state.therapist = b.dataset.th; state.start = null; renderTherapists(); renderCal(); renderSlots(); renderSummary(); }));
  }

  function renderCal() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const last = new Date(today); last.setDate(last.getDate() + DS.DAYS_AHEAD);
    if (!state.month) state.month = new Date(today.getFullYear(), today.getMonth(), 1);
    const m = state.month;
    $('#mTitle').textContent = m.toLocaleDateString(DS.locale(), { month: 'long', year: 'numeric' });
    $('#mPrev').disabled = m <= new Date(today.getFullYear(), today.getMonth(), 1);
    $('#mNext').disabled = new Date(m.getFullYear(), m.getMonth() + 1, 1) > last;
    const wds = []; for (let i = 0; i < 7; i++) wds.push(new Date(2024, 0, 1 + i).toLocaleDateString(DS.locale(), { weekday: 'short' }).slice(0, 3));
    let html = wds.map((w) => `<div class="wd">${w}</div>`).join('');
    const lead = (m.getDay() + 6) % 7;
    for (let i = 0; i < lead; i++) html += '<span></span>';
    const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const dt = new Date(m.getFullYear(), m.getMonth(), d); const k = DS.keyOf(dt);
      const out = dt < today || dt > last || !DS.hoursFor(k);
      let dot = '';
      let n = 0;
      if (!out && state.treat) { n = DS.slotsFor(k, state.min, state.therapist).length; dot = n ? `<span class="av-dot ${n < 4 ? 'low' : ''}"></span>` : ''; }
      const dis = out || (state.treat && n === 0);
      html += `<button type="button" data-d="${k}" class="${k === state.date ? 'sel' : ''} ${+dt === +today ? 'today' : ''}" ${dis ? 'disabled' : ''}>${d}${dot}</button>`;
    }
    $('#cal').innerHTML = html;
    $$('#cal [data-d]').forEach((b) => (b.onclick = () => { state.date = b.dataset.d; state.start = null; renderCal(); renderSlots(); renderSummary(); }));
  }
  $('#mPrev').onclick = () => { state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1); renderCal(); };
  $('#mNext').onclick = () => { state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1); renderCal(); };

  function renderSlots() {
    const box = $('#slots');
    if (!state.date) { $('#dayTitle').textContent = ''; box.innerHTML = `<div class="empty">${t('b.pickday')}</div>`; validate(); return; }
    $('#dayTitle').textContent = DS.fmtDate(state.date);
    if (!DS.hoursFor(state.date)) { box.innerHTML = `<div class="empty">${t('b.closed')}</div>`; return; }
    const s = DS.slotsFor(state.date, state.min, state.therapist);
    if (!s.length) { box.innerHTML = `<div class="empty">${t('b.full')}</div>`; validate(); return; }
    box.innerHTML = `<div class="slots">${s.map((x) => `<button type="button" class="chip ${x.start === state.start ? 'sel' : ''}" data-s="${x.start}">${DS.hm(x.start)}</button>`).join('')}</div>`;
    $$('#slots [data-s]').forEach((b) => (b.onclick = () => { state.start = +b.dataset.s; renderSlots(); renderSummary(); }));
    validate();
  }
  $('#next2').onclick = () => go(3);

  function validate() {
    $('#next1').disabled = !(state.treat && state.min);
    $('#next2').disabled = !(state.date && state.start != null);
  }

  /* ---------- Summary ---------- */
  function price() { const tr = state.treat && DS.treat(state.treat); const o = tr && tr.options.find((x) => x.min === state.min); return o ? o.price : 0; }
  function renderSummary() {
    const rows = [];
    if (state.treat) rows.push([t('step.1'), L(DS.treat(state.treat).name)], [t('b.duration'), state.min + ' ' + t('b.min')]);
    if (state.treat) rows.push([t('b.therapist'), state.therapist === 'any' ? t('b.any') : DS.therapist(state.therapist).name]);
    if (state.date) rows.push([t('step.2'), DS.fmtDate(state.date, { weekday: 'short', day: 'numeric', month: 'short' }) + (state.start != null ? ' · ' + DS.hm(state.start) : '')]);
    $('#sum').innerHTML = rows.length ? rows.map((r) => `<div class="sum-row"><span>${r[0]}</span><b>${esc(r[1])}</b></div>`).join('') : `<p class="sum-note" style="padding:8px 0 12px">${t('b.none')}</p>`;
    $('#total').textContent = eur(price());
  }

  /* ---------- Confirm ---------- */
  $('#confirm').onclick = () => {
    const f = $('#form'); const name = f.name.value.trim(); const phone = f.phone.value.replace(/[^\d+]/g, '');
    $('#fName').classList.toggle('bad', !name); $('#fPhone').classList.toggle('bad', phone.replace(/\D/g, '').length < 9);
    let err = '';
    if (!name) err = t('b.err.name'); else if (phone.replace(/\D/g, '').length < 9) err = t('b.err.phone'); else if (!f.adult.checked) err = t('b.err.adult');
    $('#err').textContent = err; if (err) return;
    let th = state.therapist;
    if (th === 'any') { const slot = DS.slotsFor(state.date, state.min, 'any').find((x) => x.start === state.start); th = slot ? slot.therapists[0] : DS.THERAPISTS[0].id; }
    lastBooking = DS.addBooking({ treat: state.treat, min: state.min, price: price(), therapist: th, date: state.date, start: state.start, name, phone, email: f.email.value.trim(), notes: f.notes.value.trim() });
    renderTicket(); renderMine(); renderNextFree(); go(4);
  };
  function renderTicket() {
    const b = lastBooking; if (!b) return;
    const rows = [[t('b.ref'), b.ref], [t('step.1'), L(DS.treat(b.treat).name) + ' · ' + b.min + ' ' + t('b.min')], [t('step.2'), DS.fmtDate(b.date) + ', ' + DS.hm(b.start)], [t('b.therapist'), DS.therapist(b.therapist).name], [t('b.total'), eur(b.price)]];
    $('#ticket').innerHTML = rows.map((r) => `<span>${r[0]}</span><b>${esc(r[1])}</b>`).join('');
  }
  $('#again').onclick = () => {
    Object.assign(state, { treat: null, min: null, therapist: 'any', date: null, start: null }); $('#form').reset(); $('#err').textContent = '';
    renderTList(); renderSummary(); go(1);
  };
  $('#ics').onclick = () => {
    const b = lastBooking; if (!b) return;
    const d = DS.dateOf(b.date); const st = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, b.start); const en = new Date(+st + b.min * 60000);
    const f = (x) => x.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Delirio Spa//PT', 'BEGIN:VEVENT', 'UID:' + b.ref + '@deliriospa', 'DTSTAMP:' + f(new Date()), 'DTSTART:' + f(st), 'DTEND:' + f(en),
      'SUMMARY:Delírio Spa · ' + L(DS.treat(b.treat).name), 'LOCATION:Rua do Conde de Redondo 60\\, 1150-108 Lisboa', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'delirio-spa.ics'; a.click();
  };

  function renderMine() {
    const now = DS.todayKey();
    const list = DS.loadBookings().filter((b) => b.date >= now).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    $('#mine').hidden = !list.length;
    $('#mineList').innerHTML = list.map((b) => `<div class="mine-item"><div><b>${L(DS.treat(b.treat).name)}</b><small>${DS.fmtDate(b.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${DS.hm(b.start)} · ${b.ref}</small></div><button data-cancel="${b.ref}">${t('b.cancel')}</button></div>`).join('');
    $$('#mineList [data-cancel]').forEach((x) => (x.onclick = () => { DS.cancelBooking(x.dataset.cancel); renderMine(); renderNextFree(); if (state.step === 2) { renderCal(); renderSlots(); } }));
  }

  function renderAll() { renderCards(); renderMarquee(); renderNextFree(); renderTList(); renderSummary(); renderMine(); renderTicket(); if (state.step === 2) { renderTherapists(); renderCal(); renderSlots(); } }
  DS.onLang(renderAll);
  DS.applyLang(); renderAll(); go(1); reveal();
})();
