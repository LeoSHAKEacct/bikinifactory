(function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- Holly follows the sections ----------
  const SECTION = {
    top: ['wave', '¡Hola! Soy Holly, la asistente de tu despacho 🦉'],
    soluciones: ['idle', 'Pasa el ratón por cada tarjeta 👆'],
    demo: ['phone', 'Mira cómo atiendo un caso real ▶'],
    precios: ['point', 'Dos planes claros, en pesos colombianos'],
    seguridad: ['think', 'El abogado siempre aprueba antes de enviar ⚖️'],
    empezar: ['wave', 'Solo tu nombre, email y teléfono 👇'],
  };
  let lastSec = '';
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const id = en.target.id, s = SECTION[id];
      if (!s || id === lastSec) return;
      lastSec = id; window.Owl && Owl.base(s[0], s[1]);
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  ['top', 'soluciones', 'demo', 'precios', 'seguridad', 'empezar'].forEach(id => { const el = document.getElementById(id); el && io.observe(el); });
  setTimeout(() => window.Owl && Owl.say(SECTION.top[1], 5000), 700);

  // ---------- Demo: the 7-step flow ----------
  const screen = $('#screen'), steps = $$('#steps li');
  const SCENES = [
    { t: 'WhatsApp · Despacho', s: 'Nuevo mensaje', pose: 'phone', items: [
      ['in', 'Hola, buenas noches. Me despidieron de la empresa y no me han pagado la liquidación. ¿Ustedes llevan esos casos?'] ] },
    { t: 'WhatsApp · Despacho', s: 'Holly respondiendo · 23:14', pose: 'wave', items: [
      ['in', 'Hola, buenas noches. Me despidieron de la empresa y no me han pagado la liquidación. ¿Ustedes llevan esos casos?'],
      ['out', 'Hola, soy Holly, la asistente del despacho 🦉. Siento lo que pasó. Para orientarte: ¿cuál es tu nombre y en qué fecha terminó el contrato?'],
      ['in', 'Carlos Rojas. Terminó el 3 de noviembre, llevaba 4 años.'] ] },
    { t: 'Panel del despacho', s: 'Calificación automática', pose: 'think', items: [
      ['panel', `<h4>Consulta nueva · <span class="pill">Laboral</span></h4><dl>
        <dt>Cliente</dt><dd>Carlos Rojas</dd><dt>Asunto</dt><dd>Despido sin pago de liquidación</dd>
        <dt>Antigüedad</dt><dd>4 años</dd><dt>¿Lo atendemos?</dt><dd><span class="pill ok">Sí · área laboral</span></dd>
        <dt>Urgencia</dt><dd><span class="pill warn">Revisar plazo de reclamación</span></dd></dl>`] ] },
    { t: 'WhatsApp · Despacho', s: 'Holly en línea', pose: 'point', items: [
      ['out', 'Es un caso que atendemos, Carlos. La abogada Laura Gómez puede verte:\n📅 Jueves 10:00\n📅 Viernes 16:00\n¿Cuál prefieres?'],
      ['in', 'El jueves a las 10.'],
      ['out', '¡Hecho! Cita confirmada el jueves a las 10:00. Te enviaré un recordatorio el día anterior ✅'] ] },
    { t: 'WhatsApp · Despacho', s: 'Holly en línea', pose: 'phone', items: [
      ['out', 'Para que la abogada llegue preparada, sube aquí tu contrato, la carta de despido y tus últimas nóminas 🔒\nholly.link/doc/7Kx2'],
      ['in', '📎 contrato.pdf  📎 carta_despido.jpg  📎 nominas.pdf'],
      ['out', 'Recibidos, gracias. Nos vemos el jueves.'] ] },
    { t: 'Resumen para la abogada', s: 'Preparado por Holly · borrador', pose: 'think', items: [
      ['panel', `<h4>Resumen preliminar · Carlos Rojas</h4><dl>
        <dt>Contrato</dt><dd>Indefinido desde 01/10/2022</dd><dt>Salario</dt><dd>COP 2.600.000 / mes</dd>
        <dt>Terminación</dt><dd>03/11 · sin justa causa alegada</dd><dt>Pendiente</dt><dd>Liquidación, vacaciones, prima</dd>
        <dt>Docs</dt><dd>3 archivos · cláusula 7 (preaviso) marcada</dd></dl>
        <p class="muted small" style="margin:8px 0 0">Borrador para revisión. No se envía al cliente sin aprobación.</p>`] ] },
    { t: 'Aviso a la abogada', s: 'Antes de la reunión', pose: 'cheer', items: [
      ['panel', `<h4>🔔 Jueves 10:00 · Carlos Rojas (laboral)</h4>
        <p style="margin:0 0 6px">Consulta, 3 documentos y resumen listos en el expediente.</p>
        <p style="margin:0"><span class="pill ok">Preparada</span> <span class="pill warn">Plazo: revisar caducidad</span></p>`],
      ['out', 'De un mensaje a las 23:14 a una consulta preparada, sin que nadie del despacho moviera un dedo. 🦉'] ] },
  ];
  let playing = false, playTimer, typingTimer;

  function render(i, animate) {
    const sc = SCENES[i];
    steps.forEach((li, k) => { li.classList.toggle('on', k === i); li.classList.toggle('done', k < i); });
    $('#screen-title').textContent = sc.t; $('#screen-sub').textContent = sc.s;
    window.Owl && Owl.flash(sc.pose, 'lean', 1600);
    clearTimeout(typingTimer);
    screen.innerHTML = '';
    const items = sc.items.slice();
    const add = it => {
      const el = document.createElement(it[0] === 'panel' ? 'div' : 'p');
      el.className = it[0] === 'panel' ? 'panel' : 'm ' + it[0];
      if (it[0] === 'panel') el.innerHTML = it[1]; else el.textContent = it[1];
      screen.appendChild(el);
    };
    if (!animate || reduce) { items.forEach(add); return; }
    (function next() {
      const it = items.shift(); if (!it) return;
      if (it[0] === 'out') {
        const t = document.createElement('div'); t.className = 'typing'; t.innerHTML = '<i></i><i></i><i></i>'; screen.appendChild(t);
        typingTimer = setTimeout(() => { t.remove(); add(it); typingTimer = setTimeout(next, 500); }, 800);
      } else { add(it); typingTimer = setTimeout(next, 700); }
    })();
  }
  function stop() { playing = false; clearTimeout(playTimer); $('#play').textContent = '▶ Reproducir demo'; }
  steps.forEach((li, i) => li.addEventListener('click', () => { stop(); render(i, true); }));
  $('#play').addEventListener('click', () => {
    if (playing) return stop();
    playing = true; $('#play').textContent = '❚❚ Pausar';
    let i = 0;
    (function go() {
      if (!playing) return;
      render(i, true);
      i++;
      if (i < SCENES.length) playTimer = setTimeout(go, 3800);
      else playTimer = setTimeout(() => { stop(); window.Owl && Owl.celebrate('¿Lo quieres en tu despacho? ¡Empieza abajo!'); }, 3000);
    })();
  });
  render(0, false);
  // auto-play once when the demo first scrolls into view
  const demoIo = new IntersectionObserver(es => { if (es[0].isIntersecting) { demoIo.disconnect(); if (!reduce) $('#play').click(); } }, { threshold: 0.4 });
  demoIo.observe($('#demo'));

  // ---------- Start form ----------
  const form = $('#start-form');
  let plan = '';
  const interests = new Set();
  function setPlan(p) {
    plan = p;
    $$('#plan-chips .chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.plan === p)));
  }
  $$('#plan-chips .chip').forEach(c => c.addEventListener('click', () => setPlan(plan === c.dataset.plan ? '' : c.dataset.plan)));
  $$('#int-chips .chip').forEach(c => c.addEventListener('click', () => {
    const k = c.dataset.int; interests.has(k) ? interests.delete(k) : interests.add(k);
    c.setAttribute('aria-pressed', String(interests.has(k)));
  }));
  $$('[data-pick]').forEach(a => a.addEventListener('click', () => setPlan(a.dataset.pick)));
  // also accept ?plan=redes in the link
  const qp = new URLSearchParams(location.search).get('plan'); if (['inicial', 'redes'].includes(qp)) setPlan(qp);

  const err = $('#form-err');
  function bad(el, msg) { el.setAttribute('aria-invalid', 'true'); el.focus(); err.textContent = msg; window.Owl && Owl.flash('shock', 'shake', 1000); return false; }
  function validate() {
    $$('#start-form [aria-invalid]').forEach(e => e.removeAttribute('aria-invalid'));
    const n = $('#f-name'), e = $('#f-email'), p = $('#f-phone');
    if (n.value.trim().length < 2) return bad(n, 'Escribe tu nombre.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.value.trim())) return bad(e, 'Revisa tu email.');
    const d = p.value.replace(/\D/g, '');
    if (d.length < 7 || d.length > 15) return bad(p, 'Revisa tu teléfono (con indicativo, por ejemplo +57).');
    if (!$('#f-ok').checked) return bad($('#f-ok'), 'Necesitamos tu permiso para contactarte.');
    err.textContent = ''; return true;
  }
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    if (!validate()) return;
    const btn = $('#submit'); btn.disabled = true; btn.textContent = 'Enviando…';
    window.Owl && Owl.base('think');
    const data = {
      name: $('#f-name').value, email: $('#f-email').value, phone: $('#f-phone').value,
      firm: $('#f-firm').value, size: $('#f-size').value, plan, interests: [...interests],
      msg: $('#f-msg').value, website: form.website.value, page: location.href,
    };
    try {
      const r = await fetch('/api/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || 'No pudimos enviar tus datos. Inténtalo de nuevo.');
      $('#form-body').hidden = true; $('#form-done').hidden = false;
      $('#done-name').textContent = data.name.trim().split(/\s+/)[0];
      window.Owl && (Owl.base('cheer'), Owl.celebrate('¡Bienvenido a HollyAI! 🎉'));
      try { localStorage.setItem('ley-started', '1'); } catch (_) {}
    } catch (e) {
      err.textContent = e.message; window.Owl && Owl.flash('shock', 'shake', 1000);
      btn.disabled = false; btn.textContent = 'Empezar';
    }
  });
})();
