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

  function render(c, slug, opts) {
    opts = opts || {};
    c = fillTokens(c, c.name || '', phoneDisplay(c.phone));
    var t = function (path) { return esc(get(c, path)); };
    var phone = digits(c.phone);
    var wa = 'https://wa.me/' + phone + (c.waMessage ? '?text=' + encodeURIComponent(c.waMessage) : '');
    var waAttrs = 'href="' + esc(wa) + '" target="_blank" rel="noopener"';

    var h = c.hero || {};
    var heroPhoto = photoUrl(h.photo, slug);
    var portrait = heroPhoto
      ? '<img src="' + esc(heroPhoto) + '" alt="' + t('name') + '">'
      : '<div class="ph-photo">' + PHOTO_ICON + 'Foto principal<br>próximamente</div>';
    var badge = (h.badgeTitle || h.badgeText)
      ? '<div class="badge"><b>' + t('hero.badgeTitle') + '</b>' + t('hero.badgeText') + '</div>' : '';

    var services = ((c.services || {}).items || []).map(function (s, i) {
      return '<article class="svc reveal"><div class="num">' + (i < 9 ? '0' : '') + (i + 1) + '</div><h3>' + esc(s.name) + '</h3><p>' + lines(s.desc) + '</p></article>';
    }).join('');

    var amen = ((c.facilities || {}).items || []).map(function (a) {
      return '<div class="item reveal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
        (ICONS[a.icon] || ICONS.star) + '</svg><div><h4>' + esc(a.title) + '</h4><p>' + lines(a.desc) + '</p></div></div>';
    }).join('');

    var gallery = ((c.facilities || {}).gallery || []).map(function (g, i) {
      var url = photoUrl(g.photo, slug);
      var cls = i === 0 ? 'room' : 'shot';
      if (url) {
        return '<figure class="' + cls + ' reveal"><img src="' + esc(url) + '" alt="' + esc(g.caption || '') + '" loading="lazy">' +
          (g.caption ? '<figcaption>' + esc(g.caption) + '</figcaption>' : '') + '</figure>';
      }
      return '<div class="' + (i === 0 ? 'room ' : '') + 'ph reveal">' + PHOTO_ICON + esc(g.placeholder || g.caption || 'Foto') + '<br>próximamente</div>';
    }).join('');

    var places = ((c.zones || {}).places || []).filter(Boolean).map(function (p) {
      return '<span class="chip">' + esc(p) + '</span>';
    }).join('');

    var waIcon = '<svg><use href="#wa"/></svg>';
    var html =
      '<nav id="nav"><div class="wrap">' +
        '<a href="#" class="logo gold">' + t('name') + '</a>' +
        '<div class="nav-links"><a href="#masajes">' + t('nav.services') + '</a><a href="#instalaciones">' + t('nav.facilities') + '</a><a href="#zonas">' + t('nav.zones') + '</a></div>' +
        '<a class="btn btn-wa" style="padding:10px 18px;font-size:14px" ' + waAttrs + '>' + waIcon + t('nav.reserve') + '</a>' +
      '</div></nav>' +

      '<header class="hero"><div class="wrap"><div class="reveal">' +
        '<div class="eyebrow">' + t('hero.eyebrow') + '</div>' +
        '<h1 class="serif">' + t('hero.title') + ' <em class="gold">' + t('hero.titleAccent') + '</em></h1>' +
        '<p class="lead">' + (h.greeting ? '<strong>' + t('hero.greeting') + '</strong><br>' : '') + lines(h.lead) + '</p>' +
        '<div class="ctas"><a class="btn btn-wa" ' + waAttrs + '>' + waIcon + t('hero.ctaPrimary') + '</a>' +
        (h.ctaSecondary ? '<a class="btn btn-ghost" href="#masajes">' + t('hero.ctaSecondary') + '</a>' : '') + '</div>' +
      '</div><div class="portrait reveal">' + portrait + badge + '</div></div></header>' +

      '<section class="intro"><div class="wrap reveal">' +
        '<p class="quote">' + t('intro.quote') + ' <span class="gold">' + t('intro.quoteAccent') + '</span></p>' +
        '<div class="divider">✦</div><p class="body">' + lines(get(c, 'intro.body')) + '</p>' +
      '</div></section>' +

      '<section id="masajes"><div class="wrap">' +
        '<div class="head reveal"><div class="eyebrow">' + t('services.eyebrow') + '</div><h2>' + t('services.title') + '</h2></div>' +
        '<div class="grid">' + services + '</div>' +
        (get(c, 'services.benefit') ? '<p class="benefit reveal">' + lines(get(c, 'services.benefit')) + '</p>' : '') +
      '</div></section>' +

      '<section id="instalaciones" style="padding-top:20px"><div class="wrap">' +
        '<div class="head reveal"><div class="eyebrow">' + t('facilities.eyebrow') + '</div><h2>' + t('facilities.title') + '</h2></div>' +
        '<div class="amen">' + amen + '</div>' +
        (gallery ? '<div class="gallery">' + gallery + '</div>' : '') +
      '</div></section>' +

      '<section id="zonas" class="zones"><div class="wrap">' +
        '<div class="head reveal"><div class="eyebrow">' + t('zones.eyebrow') + '</div><h2>' + t('zones.title') + '</h2>' +
        (get(c, 'zones.text') ? '<p>' + lines(get(c, 'zones.text')) + '</p>' : '') + '</div>' +
        '<div class="chips reveal">' + places + '</div>' +
      '</div></section>' +

      '<section class="cta"><div class="wrap reveal">' +
        '<div class="eyebrow">' + t('cta.eyebrow') + '</div>' +
        '<h2 class="gold" style="margin-top:14px">' + t('cta.title') + '</h2>' +
        '<p>' + lines(get(c, 'cta.text')) + '</p>' +
        '<a class="btn btn-wa" ' + waAttrs + '>' + waIcon + t('cta.button') + '</a>' +
      '</div></section>' +

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

  window.renderSite = render;

  // Published pages carry their content inline.
  var inline = document.getElementById('site-content');
  if (inline) {
    var data = JSON.parse(inline.textContent);
    render(data.content, data.slug);
  }
})();
