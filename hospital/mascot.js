// Holly, the owl mascot. Changes pose and animation depending on what the
// patient is doing: hovering an option, clicking, getting a triage result,
// finishing a form. app.js calls Owl.base / Owl.flash / Owl.celebrate.
(function () {
  const POSES = ['idle', 'wave', 'think', 'point', 'cheer', 'fly', 'shock', 'phone'];
  POSES.forEach(p => { const i = new Image(); i.src = 'img/owl-' + p + '.webp'; }); // preload

  const root = document.createElement('div');
  root.className = 'owl';
  root.innerHTML = `
    <div class="owl-bubble" role="status" aria-live="polite"></div>
    <button class="owl-btn" type="button" aria-label="Habla con Holly, la asistente">
      <span class="owl-tilt"><img class="owl-img" src="img/owl-wave.webp" alt="" width="120" height="120"></span>
    </button>`;
  document.body.appendChild(root);
  const img = root.querySelector('.owl-img'), bubble = root.querySelector('.owl-bubble'),
    tilt = root.querySelector('.owl-tilt'), btn = root.querySelector('.owl-btn');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let current = 'wave', base = { pose: 'idle', anim: 'bob' }, tempTimer, bubbleTimer;

  function show(pose, anim) {
    if (pose !== current) {
      current = pose;
      img.classList.remove('pop'); void img.offsetWidth; img.classList.add('pop');
      img.src = 'img/owl-' + pose + '.webp';
    }
    root.dataset.anim = anim || 'bob';
  }
  function say(text, ms = 4200) {
    clearTimeout(bubbleTimer);
    if (!text) { bubble.classList.remove('on'); return; }
    bubble.textContent = text; bubble.classList.add('on');
    bubbleTimer = setTimeout(() => bubble.classList.remove('on'), ms);
  }
  // Base pose for the current screen; hover/click reactions return to it.
  // The entrance animation plays once; afterwards Holly just bobs (or keeps pulsing while thinking).
  let tempActive = false;
  function setBase(pose, text, anim) {
    base = { pose, anim: anim === 'pulse' ? 'pulse' : 'bob' };
    if (text) say(text);
    if (tempActive) return; // a click reaction is playing: it returns to this new base when done
    show(pose, anim || 'bob');
  }
  // Short reaction, then back to the base pose.
  function flash(pose, anim, ms = 1100, text) {
    clearTimeout(tempTimer);
    tempActive = true;
    show(pose, anim);
    if (text) say(text, ms + 1500);
    tempTimer = setTimeout(() => { tempActive = false; show(base.pose, base.anim); }, ms);
  }
  function celebrate(text) {
    flash('fly', 'fly', 2600, text);
    if (!reduce) confetti();
  }
  function confetti() {
    const box = document.createElement('div'); box.className = 'owl-confetti';
    const colors = ['#d32f2f', '#f57c00', '#fbc02d', '#388e3c', '#1976d2', '#0b6e6e'];
    for (let i = 0; i < 26; i++) {
      const s = document.createElement('i');
      s.style.left = (Math.random() * 100) + '%';
      s.style.background = colors[i % colors.length];
      s.style.animationDelay = (Math.random() * 0.4) + 's';
      s.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
      s.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      box.appendChild(s);
    }
    root.appendChild(box); setTimeout(() => box.remove(), 2200);
  }

  // ---- hover: Holly looks curious and gives a hint for main destinations ----
  const HINTS = {
    '#/triage': 'Te digo qué tan urgente es 🩺', '#/book': 'Elige especialidad, día y hora',
    '#/assistant': 'Pregúntame lo que quieras', '#/appointments': 'Tus citas y tu check-in',
    '#/checkin': 'Envío tus datos a recepción 📲', '#/emergency': 'Si es grave, llama al 112 ya'
  };
  const HOVERABLE = '.tile, .option, .chip, .slot, .day, .btn, a.card, .tabbar a, .sos';
  let hoverEl = null, leaveTimer;
  document.addEventListener('mouseover', e => {
    const el = e.target.closest(HOVERABLE);
    if (!el || el === hoverEl || el.disabled) return;
    hoverEl = el; clearTimeout(leaveTimer);
    if (tempActive) return;
    const href = el.getAttribute('href') || '';
    const danger = el.matches('.sos, .btn.danger') || href.startsWith('tel:');
    show(danger ? 'point' : 'think', danger ? 'shake' : 'lean');
    const key = Object.keys(HINTS).find(k => href === k || href.startsWith(k + '?'));
    if (danger) say('Si es grave, llama al 112 ya', 2200);
    else if (key && el.matches('.tile, a.card, .tabbar a')) say(HINTS[key], 2200);
  });
  document.addEventListener('mouseout', e => {
    const el = e.target.closest(HOVERABLE);
    if (!el || (e.relatedTarget && el.contains(e.relatedTarget))) return;
    hoverEl = null;
    leaveTimer = setTimeout(() => { if (!hoverEl && !tempActive) show(base.pose, base.anim); }, 350);
  });

  // ---- click: a happy hop ----
  document.addEventListener('click', e => {
    const el = e.target.closest('.option, .chip, .slot, .day, .tile, button.btn');
    if (!el || el.closest('.owl') || el.disabled) return;
    if (el.matches('.chip, .slot, .day, .option[data-flag]')) flash('cheer', 'hop', 700);
    else flash('cheer', 'hop', 900);
  }, true);

  // ---- Holly turns slightly towards the pointer ----
  let raf;
  document.addEventListener('mousemove', e => {
    if (reduce || raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      const r = btn.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const ang = Math.max(-10, Math.min(10, (e.clientX - cx) / 40));
      const lift = Math.max(-6, Math.min(0, (e.clientY - cy) / 60));
      tilt.style.transform = `rotate(${ang}deg) translateY(${lift}px)`;
    });
  });

  // ---- tuck away while typing on small screens (keyboard covers the page) ----
  document.addEventListener('focusin', e => { if (e.target.matches('input, textarea, select')) root.classList.add('tuck'); });
  document.addEventListener('focusout', () => root.classList.remove('tuck'));

  // Tapping Holly opens the assistant (or says hi if already there).
  btn.addEventListener('click', () => {
    if (location.hash.startsWith('#/assistant')) flash('wave', 'hop', 1200, '¡Aquí estoy! Escríbeme abajo 👇');
    else location.hash = '#/assistant';
  });

  window.Owl = { base: setBase, flash, celebrate, say };
})();
