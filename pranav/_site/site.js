/* Renders a massage landing page from a content object.
   Used by every site (/alana, /a, /b, /c) and by the admin live preview. */
(function () {
  var ICONS = {
    home: '<path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    parking: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
    shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    drink: '<path d="M7 3h10l-1.5 8a3.5 3.5 0 0 1-7 0z"/><path d="M12 14.5V21M8.5 21h7"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    candle: '<path d="M12 3c1.5 2 1.5 3.5 0 5-1.5-1.5-1.5-3 0-5z"/><rect x="9" y="10" width="6" height="11" rx="1"/>',
    car: '<path d="M5 16V11l2-5h10l2 5v5"/><rect x="3" y="11" width="18" height="6" rx="2"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>'
  };
  var PHOTO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 8"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function lines(s) { return esc(s).replace(/\n/g, '<br>'); }
  function get(o, path) {
    return path.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o);
  }
  function digits(p) { return String(p || '').replace(/\D/g, ''); }
  function phoneDisplay(p) {
    var d = digits(p);
    if (d.length === 12 && d.indexOf('57') === 0) return '+57 ' + d.slice(2, 5) + ' ' + d.slice(5, 8) + ' ' + d.slice(8);
    return d ? '+' + d : '';
  }
  // fit: "contain" shows the whole photo over a blurred copy; otherwise it fills
  // the frame. pos picks what stays visible when filling: top, center, bottom.
  function frame(url, alt, fit, pos, lazy) {
    var contain = fit === 'contain', u = esc(url), l = lazy ? ' loading="lazy"' : '';
    return '<div class="pframe' + (contain ? ' contain' : '') + (!contain && /^(top|center|bottom)$/.test(pos) ? ' ' + pos : '') + '">' +
      (contain ? '<img class="blur" src="' + u + '" alt=""' + l + '>' : '') +
      '<img class="main" src="' + u + '" alt="' + esc(alt || '') + '"' + l + '></div>';
  }

  function photoUrl(v, slug) {
    if (!v) return '';
    if (/^(data:|https?:|\/)/.test(v)) return v;
    return '/' + slug + '/' + v;
  }

  // Replace {nombre} and {telefono} in every text field.
  function fillTokens(v, name, phone) {
    if (typeof v === 'string') return v.replace(/\{nombre\}/g, name).replace(/\{telefono\}/g, phone);
    if (Array.isArray(v)) return v.map(function (x) { return fillTokens(x, name, phone); });
    if (v && typeof v === 'object') {
      var o = {};
      Object.keys(v).forEach(function (k) { o[k] = k === 'photo' ? v[k] : fillTokens(v[k], name, phone); });
      return o;
    }
    return v;
  }

  // Older sites store fixed blocks (hero, intro, ...); newer ones an ordered
  // list of sections that can be duplicated, removed and reordered.
  var LEGACY = ['hero', 'intro', 'services', 'facilities', 'zones', 'cta'];
  function migrate(c) {
    if (Array.isArray(c.sections)) return c;
    var out = {}, sections = [];
    Object.keys(c).forEach(function (k) { if (LEGACY.indexOf(k) < 0) out[k] = c[k]; });
    LEGACY.forEach(function (k) {
      if (c[k]) { var s = { type: k }; Object.keys(c[k]).forEach(function (f) { s[f] = c[k][f]; }); sections.push(s); }
    });
    out.sections = sections;
    return out;
  }

  function render(c, slug, opts) {
    opts = opts || {};
    c = fillTokens(c, c.name || '', phoneDisplay(c.phone));
    var t = function (path) { return esc(get(c, path)); };
    var phone = digits(c.phone);
    var wa = 'https://wa.me/' + phone + (c.waMessage ? '?text=' + encodeURIComponent(c.waMessage) : '');
    var waAttrs = 'href="' + esc(wa) + '" target="_blank" rel="noopener"';

    var waIcon = '<svg><use href="#wa"/></svg>';
    var sections = migrate(c).sections;
    var bookingOn = Boolean(c.booking && c.booking.enabled === 'yes');
    current = { c: c, slug: slug, sections: sections, preview: Boolean(opts.preview) };
    // The first section of each type gets the id the menu links to.
    var ANCHORS = { services: 'masajes', facilities: 'instalaciones', zones: 'zonas' };
    var used = {};
    var ids = sections.map(function (s, i) {
      var a = ANCHORS[s.type];
      if (a && !used[a]) { used[a] = true; return a; }
      return 's' + (i + 1);
    });

    var R = {
      hero: function (h, id, i) {
        var url = photoUrl(h.photo, slug);
        var portrait = url
          ? frame(url, c.name, h.photoFit, h.photoPos)
          : '<div class="ph-photo">' + PHOTO_ICON + 'Foto principal<br>próximamente</div>';
        var badge = (h.badgeTitle || h.badgeText) ? '<div class="badge"><b>' + esc(h.badgeTitle) + '</b>' + esc(h.badgeText) + '</div>' : '';
        var tag = i === 0 ? 'header' : 'section';
        return '<' + tag + ' class="hero" id="' + id + '"><div class="wrap"><div class="reveal">' +
          (h.eyebrow ? '<div class="eyebrow">' + esc(h.eyebrow) + '</div>' : '') +
          '<h1 class="serif">' + esc(h.title) + ' <em class="gold">' + esc(h.titleAccent) + '</em></h1>' +
          '<p class="lead">' + (h.greeting ? '<strong>' + esc(h.greeting) + '</strong><br>' : '') + lines(h.lead) + '</p>' +
          '<div class="ctas">' + (h.ctaPrimary ? '<a class="btn btn-wa" ' + waAttrs + '>' + waIcon + esc(h.ctaPrimary) + '</a>' : '') +
          (h.ctaSecondary ? '<a class="btn btn-ghost" href="#' + (used.masajes ? 'masajes' : ids[i + 1] || '') + '">' + esc(h.ctaSecondary) + '</a>' : '') + '</div>' +
          '</div><div class="portrait reveal">' + portrait + badge + '</div></div></' + tag + '>';
      },
      intro: function (x, id) {
        return '<section class="intro" id="' + id + '"><div class="wrap reveal">' +
          '<p class="quote">' + esc(x.quote) + ' <span class="gold">' + esc(x.quoteAccent) + '</span></p>' +
          '<div class="divider">✦</div>' + (x.body ? '<p class="body">' + lines(x.body) + '</p>' : '') +
          '</div></section>';
      },
      services: function (x, id, si) {
        var items = (x.items || []).map(function (s, i) {
          var book = bookingOn && s.bookable !== 'no'
            ? '<button type="button" class="book-btn" data-s="' + si + '" data-i="' + i + '">' + esc(c.booking.button || 'Reservar') + '</button>' : '';
          return '<article class="svc reveal"><div class="num">' + (i < 9 ? '0' : '') + (i + 1) + '</div><h3>' + esc(s.name) + '</h3><p>' + lines(s.desc) + '</p>' + book + '</article>';
        }).join('');
        return '<section id="' + id + '"><div class="wrap">' + head(x) +
          '<div class="grid">' + items + '</div>' +
          (x.benefit ? '<p class="benefit reveal">' + lines(x.benefit) + '</p>' : '') +
          '</div></section>';
      },
      facilities: function (x, id) {
        var amen = (x.items || []).map(function (a) {
          return '<div class="item reveal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
            (ICONS[a.icon] || ICONS.star) + '</svg><div><h4>' + esc(a.title) + '</h4><p>' + lines(a.desc) + '</p></div></div>';
        }).join('');
        var gallery = (x.gallery || []).map(function (g, i) {
          var url = photoUrl(g.photo, slug), cls = i === 0 ? 'room' : 'shot';
          if (url) {
            return '<figure class="' + cls + ' reveal">' + frame(url, g.caption, g.fit, g.pos, true) +
              (g.caption ? '<figcaption>' + esc(g.caption) + '</figcaption>' : '') + '</figure>';
          }
          return '<div class="' + (i === 0 ? 'room ' : '') + 'ph reveal">' + PHOTO_ICON + esc(g.placeholder || g.caption || 'Foto') + '<br>próximamente</div>';
        }).join('');
        return '<section id="' + id + '" style="padding-top:20px"><div class="wrap">' + head(x) +
          (amen ? '<div class="amen">' + amen + '</div>' : '') +
          (gallery ? '<div class="gallery">' + gallery + '</div>' : '') +
          '</div></section>';
      },
      zones: function (x, id) {
        var places = (x.places || []).filter(Boolean).map(function (p) { return '<span class="chip">' + esc(p) + '</span>'; }).join('');
        return '<section id="' + id + '" class="zones"><div class="wrap">' + head(x, x.text) +
          '<div class="chips reveal">' + places + '</div></div></section>';
      },
      cta: function (x, id) {
        return '<section class="cta" id="' + id + '"><div class="wrap reveal">' +
          (x.eyebrow ? '<div class="eyebrow">' + esc(x.eyebrow) + '</div>' : '') +
          '<h2 class="gold" style="margin-top:14px">' + esc(x.title) + '</h2>' +
          (x.text ? '<p>' + lines(x.text) + '</p>' : '') +
          (x.button ? '<a class="btn btn-wa" ' + waAttrs + '>' + waIcon + esc(x.button) + '</a>' : '') +
          '</div></section>';
      }
    };
    function head(x, text) {
      return '<div class="head reveal">' + (x.eyebrow ? '<div class="eyebrow">' + esc(x.eyebrow) + '</div>' : '') +
        '<h2>' + esc(x.title) + '</h2>' + (text ? '<p>' + lines(text) + '</p>' : '') + '</div>';
    }

    var navLinks = [['masajes', 'nav.services'], ['instalaciones', 'nav.facilities'], ['zonas', 'nav.zones']]
      .filter(function (l) { return used[l[0]] && get(c, l[1]); })
      .map(function (l) { return '<a href="#' + l[0] + '">' + t(l[1]) + '</a>'; }).join('');

    var html =
      '<nav id="nav"><div class="wrap">' +
        '<a href="#" class="logo gold">' + t('name') + '</a>' +
        '<div class="nav-links">' + navLinks + '</div>' +
        '<a class="btn btn-wa" style="padding:10px 18px;font-size:14px" ' + waAttrs + '>' + waIcon + t('nav.reserve') + '</a>' +
      '</div></nav>' +
      sections.map(function (s, i) { return R[s.type] ? R[s.type](s, ids[i], i) : ''; }).join('') +
      '<footer><div class="wrap">© ' + new Date().getFullYear() + ' ' + t('footer') + '</div></footer>' +
      '<a class="fab" ' + waAttrs + ' aria-label="WhatsApp">' + waIcon + '</a>';

    var app = document.getElementById('app');
    app.innerHTML = html;
    if (!opts.preview && c.seo && c.seo.title) document.title = c.seo.title;

    var nav = document.getElementById('nav');
    var onScroll = function () { nav.classList.toggle('solid', window.scrollY > 30); };
    window.removeEventListener('scroll', window.__siteScroll || onScroll);
    window.__siteScroll = onScroll;
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var els = app.querySelectorAll('.reveal');
    if (opts.preview || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: 0.12 });
      els.forEach(function (el) { io.observe(el); });
    }
  }

  // ---------- bookings ----------
  var current = null;
  var DAYFMT = new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  var LONGFMT = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  function dayLabel(d, long) { return (long ? LONGFMT : DAYFMT).format(new Date(d + 'T12:00:00Z')); }
  function bookingDays(cfg) {
    var tz = cfg.timezone || 'America/Bogota', allowed = (cfg.days || [1, 2, 3, 4, 5, 6]).map(Number), out = [];
    var today = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    var base = Date.parse(today + 'T12:00:00Z');
    for (var k = 0; k <= (+cfg.maxDays || 30) && out.length < 60; k++) {
      var dt = new Date(base + k * 864e5);
      if (allowed.indexOf(dt.getUTCDay()) >= 0) out.push(dt.toISOString().slice(0, 10));
    }
    return out;
  }
  function waLink(text) { return 'https://wa.me/' + digits(current.c.phone) + '?text=' + encodeURIComponent(text); }

  function openBooking(si, ii) {
    var c = current.c, item = current.sections[si].items[ii], cfg = c.booking || {};
    var st = { si: si, ii: ii, item: item, date: null, time: null };
    var m = document.createElement('div');
    m.className = 'bk-modal';
    m.innerHTML = '<div class="bk-card" role="dialog" aria-modal="true"><button type="button" class="bk-x" aria-label="Cerrar">✕</button>' +
      '<div class="eyebrow">' + esc(cfg.button || 'Reservar') + '</div><h3>' + esc(item.name) + '</h3>' +
      '<p class="bk-sub">' + (+item.duration || 60) + ' min</p><div class="bk-body"></div></div>';
    document.body.appendChild(m);
    document.body.style.overflow = 'hidden';
    var body = m.querySelector('.bk-body');
    function close() { m.remove(); document.body.style.overflow = ''; }
    m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('.bk-x')) close(); });
    var fallback = function (msg) {
      body.innerHTML = '<p class="bk-msg">' + esc(msg) + '</p><a class="btn btn-wa bk-wide" target="_blank" rel="noopener" href="' +
        esc(waLink('Hola ' + (c.name || '') + ', quiero reservar: ' + item.name)) + '"><svg><use href="#wa"/></svg>Reservar por WhatsApp</a>';
    };
    if (current.preview) return fallback('Vista previa: las reservas funcionan en el sitio publicado, con Google Calendar conectado.');

    function stepDays() {
      var days = bookingDays(cfg);
      body.innerHTML = '<div class="bk-label">Elige el día</div><div class="bk-days">' + days.map(function (d) {
        return '<button type="button" data-d="' + d + '"' + (d === st.date ? ' class="on"' : '') + '>' + esc(dayLabel(d)) + '</button>';
      }).join('') + '</div><div class="bk-slots"></div>';
      body.querySelector('.bk-days').onclick = function (e) {
        var b = e.target.closest('button'); if (!b) return;
        st.date = b.dataset.d;
        [].forEach.call(this.children, function (x) { x.classList.toggle('on', x === b); });
        loadSlots();
      };
      if (st.date) loadSlots();
    }
    function loadSlots() {
      var box = body.querySelector('.bk-slots');
      box.innerHTML = '<div class="bk-label">Horarios</div><p class="bk-msg">Buscando horarios libres…</p>';
      var want = st.date;
      fetch('/api/slots?slug=' + encodeURIComponent(current.slug) + '&s=' + si + '&i=' + ii + '&date=' + want)
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (r) {
          if (st.date !== want) return;
          if (!r.ok) return fallback(r.j.error || 'No se pudieron cargar los horarios.');
          box.innerHTML = '<div class="bk-label">Horarios · ' + esc(dayLabel(want)) + '</div>' + (r.j.slots.length
            ? '<div class="bk-times">' + r.j.slots.map(function (t) { return '<button type="button" data-t="' + t + '">' + t + '</button>'; }).join('') + '</div>'
            : '<p class="bk-msg">No hay horarios libres este día. Prueba otro.</p>');
          var times = box.querySelector('.bk-times');
          if (times) times.onclick = function (e) { var b = e.target.closest('button'); if (b) { st.time = b.dataset.t; stepForm(); } };
        })
        .catch(function () { fallback('Sin conexión. Intenta de nuevo o reserva por WhatsApp.'); });
    }
    function stepForm(err) {
      body.innerHTML = '<p class="bk-pick">' + esc(dayLabel(st.date, true)) + ' · <b>' + st.time + '</b> <button type="button" class="bk-change">Cambiar</button></p>' +
        '<form class="bk-form"><label>Tu nombre<input name="name" required maxlength="80" autocomplete="name"></label>' +
        '<label>Tu teléfono / WhatsApp<input name="phone" type="tel" required maxlength="30" autocomplete="tel"></label>' +
        '<label>Nota (opcional)<textarea name="note" maxlength="500" rows="2"></textarea></label>' +
        '<input name="website" tabindex="-1" autocomplete="off" class="bk-hp" aria-hidden="true">' +
        (err ? '<p class="bk-err">' + esc(err) + '</p>' : '') +
        '<button type="submit" class="btn btn-wa bk-wide">Confirmar reserva</button></form>';
      body.querySelector('.bk-change').onclick = stepDays;
      var f = body.querySelector('form');
      if (st.form) { f.name.value = st.form.name; f.phone.value = st.form.phone; f.note.value = st.form.note; }
      f.onsubmit = function (e) {
        e.preventDefault();
        st.form = { name: f.name.value, phone: f.phone.value, note: f.note.value };
        var btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Reservando…';
        fetch('/api/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          slug: current.slug, s: si, i: ii, date: st.date, time: st.time,
          name: st.form.name, phone: st.form.phone, note: st.form.note, website: f.website.value
        }) })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
          .then(function (r) {
            if (r.ok) return stepDone();
            if (r.status === 409 && /horario/.test(r.j.error || '')) { st.time = null; stepDays(); body.insertAdjacentHTML('afterbegin', '<p class="bk-err">' + esc(r.j.error) + '</p>'); return; }
            if (r.status >= 500 || r.status === 409) return fallback(r.j.error || 'No se pudo reservar.');
            stepForm(r.j.error || 'Revisa los datos.');
          })
          .catch(function () { stepForm('Sin conexión. Intenta de nuevo.'); });
      };
    }
    function stepDone() {
      var text = 'Hola ' + (c.name || '') + ', acabo de reservar desde tu página:\n' +
        '• ' + item.name + '\n• ' + dayLabel(st.date, true) + ' a las ' + st.time + '\n' +
        '• Nombre: ' + st.form.name + '\n• Teléfono: ' + st.form.phone + (st.form.note ? '\n• Nota: ' + st.form.note : '');
      body.innerHTML = '<div class="bk-done">✓</div><p class="bk-ok"><b>¡Reserva confirmada!</b><br>' + esc(item.name) + '<br>' +
        esc(dayLabel(st.date, true)) + ' · ' + st.time + '</p>' +
        '<p class="bk-msg">Último paso: avisa por WhatsApp para recibir la confirmación.</p>' +
        '<a class="btn btn-wa bk-wide" target="_blank" rel="noopener" href="' + esc(waLink(text)) + '"><svg><use href="#wa"/></svg>Enviar aviso por WhatsApp</a>';
    }
    stepDays();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.book-btn');
    if (b && current) openBooking(+b.dataset.s, +b.dataset.i);
  });

  window.renderSite = render;
  window.siteMigrate = migrate;

  // Published pages carry their content inline.
  var inline = document.getElementById('site-content');
  if (inline) {
    var data = JSON.parse(inline.textContent);
    render(data.content, data.slug);
  }
})();
