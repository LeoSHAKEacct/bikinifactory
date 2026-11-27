// Holly, the owl. Same mascot as the hospital app, here guiding law firms through the page:
// she changes pose per section, reacts to the service cards, hops on clicks and celebrates a signup.
// app.js calls Owl.base / Owl.flash / Owl.celebrate / Owl.say.
(function () {
  const POSES = ['idle', 'wave', 'think', 'point', 'cheer', 'fly', 'shock', 'phone'];
  POSES.forEach(p => { const i = new Image(); i.src = 'img/owl-' + p + '.webp'; });

  const root = document.createElement('div');
  root.className = 'owl';
  root.innerHTML = `
    <div class="owl-bubble" role="status" aria-live="polite"></div>
    <button class="owl-btn" type="button" aria-label="Holly: empezar">
      <span class="owl-tilt"><img class="owl-img" src="img/owl-wave.webp" alt="" width="120" height="120"></span>
    </button>`;
  document.body.appendChild(root);
  const img = root.querySelector('.owl-img'), bubble = root.querySelector('.owl-bubble'),
    tilt = root.querySelector('.owl-tilt'), btn = root.querySelector('.owl-btn');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let current = 'wave', base = { pose: 'wave', anim: 'bob' }, tempTimer, bubbleTimer, tempActive = false;

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
  function setBase(pose, text) {
    base = { pose, anim: 'bob' };
    if (text) say(text);
    if (!tempActive) show(pose, 'bob');
  }
  function flash(pose, anim, ms = 1100, text) {
    clearTimeout(tempTimer); tempActive = true;
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
    const colors = ['#b88a2e', '#0f2240', '#e2b85a', '#1d4ed8', '#2e7d32', '#c45000'];
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

  // ---- hovering a service card: Holly takes that card's pose and explains it ----
  let hoverEl = null, leaveTimer;
  document.addEventListener('mouseover', e => {
    const el = e.target.closest('.svc, .plan, .btn, .chip, .steps li');
    if (!el || el === hoverEl || el.closest('.owl')) return;
    hoverEl = el; clearTimeout(leaveTimer);
    if (tempActive) return;
    if (el.dataset.pose) { show(el.dataset.pose, 'lean'); say(el.dataset.say, 2600); }
    else if (el.dataset.plan === 'redes') { show('cheer', 'lean'); say('Atención + redes: más clientes nuevos 📣', 2400); }
    else if (el.dataset.plan === 'inicial') { show('point', 'lean'); say('El mejor punto de partida 👍', 2400); }
    else show('think', 'lean');
  });
  document.addEventListener('mouseout', e => {
    const el = e.target.closest('.svc, .plan, .btn, .chip, .steps li');
    if (!el || (e.relatedTarget && el.contains(e.relatedTarget))) return;
    hoverEl = null;
    leaveTimer = setTimeout(() => { if (!hoverEl && !tempActive) show(base.pose, base.anim); }, 350);
  });

  // ---- clicks: a happy hop ----
  document.addEventListener('click', e => {
    const el = e.target.closest('.chip, .btn, .steps li, .svc');
    if (!el || el.closest('.owl') || el.disabled) return;
    flash('cheer', 'hop', el.matches('.chip') ? 700 : 900);
  }, true);

  // ---- Holly leans towards the pointer ----
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

  // ---- tuck away while typing on small screens ----
  document.addEventListener('focusin', e => { if (e.target.matches('input, textarea, select')) root.classList.add('tuck'); });
  document.addEventListener('focusout', () => root.classList.remove('tuck'));

  // Tapping Holly takes you to the signup (or cheers if you're already there).
  btn.addEventListener('click', () => {
    const start = document.getElementById('empezar');
    const r = start.getBoundingClientRect();
    if (r.top < innerHeight * 0.6 && r.bottom > 0) flash('wave', 'hop', 1200, '¡Solo nombre, email y teléfono! 👇');
    else { start.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); flash('fly', 'fly', 1800); }
  });

  window.Owl = { base: setBase, flash, celebrate, say, hide: on => root.classList.toggle('away', !!on) };
})();
