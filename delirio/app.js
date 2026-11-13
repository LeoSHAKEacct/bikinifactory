/* Delírio Spa — shared data, i18n and demo booking engine.
   Everything is fake: availability is generated, bookings live in this browser only. */
(function () {
  'use strict';

  /* ---------- Data ---------- */
  const TREATMENTS = [
    {
      id: 'relax', color: '#8a6a4a',
      name: { pt: 'Massagem Relaxante', en: 'Relaxing Massage' },
      desc: {
        pt: 'Movimentos lentos e envolventes com óleos aquecidos para soltar a tensão do corpo e da mente.',
        en: 'Slow, enveloping strokes with warm oils to release tension from body and mind.'
      },
      options: [{ min: 60, price: 60 }, { min: 90, price: 85 }]
    },
    {
      id: 'sensual', color: '#a34a52',
      name: { pt: 'Massagem Sensual', en: 'Sensual Massage' },
      desc: {
        pt: 'Toque suave e consciente que desperta os sentidos, num ambiente íntimo de luz baixa e aromas.',
        en: 'A soft, mindful touch that awakens the senses, in an intimate setting of low light and aromas.'
      },
      options: [{ min: 60, price: 80 }, { min: 90, price: 110 }]
    },
    {
      id: 'tantric', color: '#6e1f2b', signature: true,
      name: { pt: 'Massagem Tântrica', en: 'Tantric Massage' },
      desc: {
        pt: 'A nossa assinatura. Respiração, presença e energia — uma viagem profunda de relaxamento e prazer.',
        en: 'Our signature. Breath, presence and energy — a deep journey into relaxation and pleasure.'
      },
      options: [{ min: 60, price: 100 }, { min: 90, price: 140 }]
    },
    {
      id: 'four', color: '#7a4b6e',
      name: { pt: 'Massagem a Quatro Mãos', en: 'Four-Hands Massage' },
      desc: {
        pt: 'Duas terapeutas em perfeita sintonia. Uma experiência envolvente que é impossível de esquecer.',
        en: 'Two therapists in perfect harmony. An enveloping experience you will not forget.'
      },
      options: [{ min: 60, price: 160 }]
    },
    {
      id: 'couple', color: '#4f5e7a',
      name: { pt: 'Ritual para Casais', en: 'Couples Ritual' },
      desc: {
        pt: 'Lado a lado, na mesma sala. Um momento a dois para reconectar, com espumante de boas-vindas.',
        en: 'Side by side, in the same room. A moment for two to reconnect, with a welcome glass of bubbly.'
      },
      options: [{ min: 60, price: 180 }, { min: 90, price: 240 }]
    },
    {
      id: 'delirio', color: '#c9a36a', signature: true,
      name: { pt: 'Ritual Delírio', en: 'Delírio Ritual' },
      desc: {
        pt: 'Duche de boas-vindas, esfoliação, massagem tântrica completa e chá no final. Duas horas só para si.',
        en: 'Welcome shower, body scrub, a full tantric massage and tea to finish. Two hours just for you.'
      },
      options: [{ min: 120, price: 200 }]
    }
  ];

  const THERAPISTS = [
    { id: 'sofia', name: 'Sofia', tag: { pt: 'Tântrica · Sensual', en: 'Tantric · Sensual' } },
    { id: 'ines', name: 'Inês', tag: { pt: 'Relaxante · Tântrica', en: 'Relaxing · Tantric' } },
    { id: 'mariana', name: 'Mariana', tag: { pt: 'Sensual · Rituais', en: 'Sensual · Rituals' } },
    { id: 'beatriz', name: 'Beatriz', tag: { pt: 'Quatro mãos · Casais', en: 'Four hands · Couples' } }
  ];

  // minutes from midnight; null = closed. 0 = Sunday
  const HOURS = { 0: null, 1: [660, 1260], 2: [660, 1260], 3: [660, 1260], 4: [660, 1260], 5: [660, 1260], 6: [660, 1140] };
  const DAYS_AHEAD = 45;

  /* ---------- i18n ---------- */
  const I18N = {
    pt: {
      'nav.about': 'A experiência', 'nav.menu': 'Massagens', 'nav.gift': 'Vouchers', 'nav.faq': 'Perguntas', 'nav.contact': 'Contacto', 'nav.book': 'Reservar',
      'hero.kicker': 'Lisboa · Conde de Redondo', 'hero.title': 'Um refúgio<br>para <em>os sentidos.</em>',
      'hero.sub': 'Massagens tântricas e sensuais num espaço íntimo, discreto e cuidado ao detalhe — no coração de Lisboa.',
      'hero.cta': 'Reservar agora', 'hero.cta2': 'Ver massagens', 'hero.rating': 'avaliação média online',
      'about.kicker': 'A experiência', 'about.title': 'Desligue do mundo.<br>Ligue-se a si.',
      'about.body': 'Desde a chegada, tudo é pensado para que se sinta à vontade: entrada discreta, salas privadas com duche, toalhas aquecidas, música suave e terapeutas atentas ao seu ritmo.',
      'p1.t': 'Discrição total', 'p1.b': 'Entrada reservada, sem esperas em sala comum. A sua privacidade vem primeiro.',
      'p2.t': 'Higiene impecável', 'p2.b': 'Roupa de cama e toalhas novas em cada sessão, salas preparadas ao pormenor.',
      'p3.t': 'Terapeutas dedicadas', 'p3.b': 'Equipa formada em massagem holística e tântrica, sempre com respeito pelos seus limites.',
      'menu.kicker': 'O menu', 'menu.title': 'Escolha a sua experiência', 'menu.sub': 'Todas as sessões incluem duche privado, óleos naturais e um chá no final.',
      'menu.signature': 'Assinatura', 'menu.from': 'desde', 'menu.book': 'Reservar',
      'gift.kicker': 'Vouchers', 'gift.title': 'Ofereça um momento inesquecível', 'gift.body': 'Vouchers digitais para qualquer massagem, entregues por email num envelope elegante. Válidos durante 6 meses.', 'gift.cta': 'Pedir um voucher',
      'book.kicker': 'Agenda online', 'book.title': 'Reserve em 1 minuto', 'book.sub': 'Escolha a massagem, o dia e a hora. Confirmamos por SMS.',
      'step.1': 'Massagem', 'step.2': 'Data & hora', 'step.3': 'Os seus dados', 'step.4': 'Confirmado',
      'b.duration': 'Duração', 'b.therapist': 'Terapeuta', 'b.any': 'Sem preferência', 'b.date': 'Escolha o dia', 'b.time': 'Horas disponíveis',
      'b.pickday': 'Escolha um dia para ver as horas.', 'b.full': 'Sem horas livres neste dia. Experimente outro.', 'b.closed': 'Fechado',
      'b.name': 'Nome (pode ser só o primeiro)', 'b.phone': 'Telemóvel', 'b.email': 'Email (opcional)', 'b.notes': 'Algum pedido especial? (opcional)',
      'b.adult': 'Confirmo que tenho 18 anos ou mais.', 'b.next': 'Continuar', 'b.back': 'Voltar', 'b.confirm': 'Confirmar reserva',
      'b.summary': 'A sua reserva', 'b.total': 'Total', 'b.payat': 'Pagamento no local · MB Way, cartão ou numerário',
      'b.none': 'Ainda nada escolhido.', 'b.doneT': 'Reserva confirmada', 'b.doneB': 'Enviámos os detalhes para o seu telemóvel. Até breve!',
      'b.ref': 'Referência', 'b.new': 'Fazer outra reserva', 'b.cal': 'Adicionar ao calendário',
      'b.demo': 'Versão de demonstração — nenhuma reserva é enviada.', 'b.mine': 'As minhas reservas', 'b.cancel': 'Cancelar',
      'b.err.name': 'Indique o seu nome.', 'b.err.phone': 'Indique um telemóvel válido.', 'b.err.adult': 'Confirme que é maior de idade.',
      'b.with': 'com', 'b.min': 'min', 'b.slots': 'horas livres',
      'faq.kicker': 'Perguntas frequentes', 'faq.title': 'Tudo o que precisa de saber',
      'q1': 'Como funciona a primeira visita?', 'a1': 'À chegada é recebido em privado, oferecemos uma bebida e explicamos a sessão. Tem duche à disposição antes e depois.',
      'q2': 'Posso escolher a terapeuta?', 'a2': 'Sim. Ao reservar pode escolher uma terapeuta específica ou deixar “Sem preferência” para ver mais horários.',
      'q3': 'Como posso pagar?', 'a3': 'No local, por MB Way, cartão ou numerário. Não é necessário pagamento antecipado.',
      'q4': 'E se precisar de cancelar?', 'a4': 'Sem problema — pedimos apenas um aviso com pelo menos 2 horas de antecedência, por SMS ou WhatsApp.',
      'q5': 'A discrição é garantida?', 'a5': 'Totalmente. Os seus dados são usados só para a reserva e a fatura, se pedida, sai com uma descrição neutra.',
      'contact.kicker': 'Visite-nos', 'contact.title': 'Contacto & horário', 'contact.hours': 'Horário',
      'd.week': 'Segunda a sexta', 'd.sat': 'Sábado', 'd.sun': 'Domingo', 'd.closed': 'Fechado',
      'contact.call': 'Ligar', 'contact.wa': 'WhatsApp', 'contact.map': 'Abrir no mapa',
      'foot.adult': 'Serviço exclusivo para maiores de 18 anos.', 'foot.rights': 'Todos os direitos reservados.',
      'ag.title': 'Agenda da equipa', 'ag.today': 'Hoje', 'ag.k1': 'Marcações', 'ag.k2': 'Ocupação', 'ag.k3': 'Faturação prevista', 'ag.k4': 'Reservas online',
      'ag.online': 'Online', 'ag.list': 'Reservas feitas no site (demo)', 'ag.empty': 'Ainda não há reservas feitas no site. Faça uma na página principal.', 'ag.reset': 'Limpar reservas demo', 'ag.site': 'Ver site', 'ag.closed': 'Fechado neste dia.'
    },
    en: {
      'nav.about': 'Experience', 'nav.menu': 'Massages', 'nav.gift': 'Gift cards', 'nav.faq': 'FAQ', 'nav.contact': 'Contact', 'nav.book': 'Book',
      'hero.kicker': 'Lisbon · Conde de Redondo', 'hero.title': 'A sanctuary<br>for <em>the senses.</em>',
      'hero.sub': 'Tantric and sensual massage in an intimate, discreet space cared for in every detail — in the heart of Lisbon.',
      'hero.cta': 'Book now', 'hero.cta2': 'See massages', 'hero.rating': 'average online rating',
      'about.kicker': 'The experience', 'about.title': 'Switch off the world.<br>Switch on yourself.',
      'about.body': 'From the moment you arrive, everything is designed to put you at ease: a discreet entrance, private rooms with shower, warm towels, soft music and therapists attentive to your pace.',
      'p1.t': 'Total discretion', 'p1.b': 'Private entrance, no shared waiting room. Your privacy comes first.',
      'p2.t': 'Spotless hygiene', 'p2.b': 'Fresh linen and towels for every session, rooms prepared to the last detail.',
      'p3.t': 'Dedicated therapists', 'p3.b': 'A team trained in holistic and tantric massage, always respecting your boundaries.',
      'menu.kicker': 'The menu', 'menu.title': 'Choose your experience', 'menu.sub': 'Every session includes a private shower, natural oils and tea to finish.',
      'menu.signature': 'Signature', 'menu.from': 'from', 'menu.book': 'Book',
      'gift.kicker': 'Gift cards', 'gift.title': 'Give an unforgettable moment', 'gift.body': 'Digital gift cards for any massage, delivered by email in an elegant envelope. Valid for 6 months.', 'gift.cta': 'Request a gift card',
      'book.kicker': 'Online booking', 'book.title': 'Book in 1 minute', 'book.sub': 'Pick your massage, day and time. We confirm by text.',
      'step.1': 'Massage', 'step.2': 'Date & time', 'step.3': 'Your details', 'step.4': 'Confirmed',
      'b.duration': 'Duration', 'b.therapist': 'Therapist', 'b.any': 'No preference', 'b.date': 'Pick a day', 'b.time': 'Available times',
      'b.pickday': 'Pick a day to see times.', 'b.full': 'No free times this day. Try another.', 'b.closed': 'Closed',
      'b.name': 'Name (first name is fine)', 'b.phone': 'Mobile', 'b.email': 'Email (optional)', 'b.notes': 'Any special request? (optional)',
      'b.adult': 'I confirm I am 18 or older.', 'b.next': 'Continue', 'b.back': 'Back', 'b.confirm': 'Confirm booking',
      'b.summary': 'Your booking', 'b.total': 'Total', 'b.payat': 'Pay on site · MB Way, card or cash',
      'b.none': 'Nothing chosen yet.', 'b.doneT': 'Booking confirmed', 'b.doneB': 'We sent the details to your phone. See you soon!',
      'b.ref': 'Reference', 'b.new': 'Make another booking', 'b.cal': 'Add to calendar',
      'b.demo': 'Demo version — no booking is actually sent.', 'b.mine': 'My bookings', 'b.cancel': 'Cancel',
      'b.err.name': 'Please enter your name.', 'b.err.phone': 'Please enter a valid mobile number.', 'b.err.adult': 'Please confirm you are of age.',
      'b.with': 'with', 'b.min': 'min', 'b.slots': 'free times',
      'faq.kicker': 'FAQ', 'faq.title': 'Everything you need to know',
      'q1': 'How does the first visit work?', 'a1': 'You are welcomed privately, offered a drink and we explain the session. A shower is available before and after.',
      'q2': 'Can I choose my therapist?', 'a2': 'Yes. When booking you can pick a specific therapist or leave “No preference” to see more times.',
      'q3': 'How do I pay?', 'a3': 'On site, by MB Way, card or cash. No prepayment needed.',
      'q4': 'What if I need to cancel?', 'a4': 'No problem — we only ask for at least 2 hours’ notice, by text or WhatsApp.',
      'q5': 'Is discretion guaranteed?', 'a5': 'Completely. Your details are only used for the booking, and invoices, if requested, carry a neutral description.',
      'contact.kicker': 'Visit us', 'contact.title': 'Contact & hours', 'contact.hours': 'Opening hours',
      'd.week': 'Monday to Friday', 'd.sat': 'Saturday', 'd.sun': 'Sunday', 'd.closed': 'Closed',
      'contact.call': 'Call', 'contact.wa': 'WhatsApp', 'contact.map': 'Open in maps',
      'foot.adult': 'Service exclusively for adults 18+.', 'foot.rights': 'All rights reserved.',
      'ag.title': 'Team agenda', 'ag.today': 'Today', 'ag.k1': 'Appointments', 'ag.k2': 'Occupancy', 'ag.k3': 'Expected revenue', 'ag.k4': 'Online bookings',
      'ag.online': 'Online', 'ag.list': 'Bookings made on the site (demo)', 'ag.empty': 'No bookings from the site yet. Make one on the main page.', 'ag.reset': 'Clear demo bookings', 'ag.site': 'View site', 'ag.closed': 'Closed on this day.'
    }
  };

  let lang = 'pt';
  try { lang = localStorage.getItem('delirio_lang') || 'pt'; } catch (e) {}
  if (!I18N[lang]) lang = 'pt';
  const t = (k) => (I18N[lang][k] != null ? I18N[lang][k] : k);
  const L = (o) => (o && typeof o === 'object' ? o[lang] || o.pt : o);

  const listeners = [];
  function setLang(l) {
    lang = I18N[l] ? l : 'pt';
    try { localStorage.setItem('delirio_lang', lang); } catch (e) {}
    applyLang();
    listeners.forEach((fn) => fn(lang));
  }
  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.innerHTML = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    document.querySelectorAll('[data-lang]').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
  }

  /* ---------- Dates ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const dateOf = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const hm = (min) => pad(Math.floor(min / 60)) + ':' + pad(min % 60);
  const locale = () => (lang === 'pt' ? 'pt-PT' : 'en-GB');
  const fmtDate = (k, opts) => dateOf(k).toLocaleDateString(locale(), opts || { weekday: 'long', day: 'numeric', month: 'long' });
  const todayKey = () => keyOf(new Date());
  const nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
  const hoursFor = (k) => HOURS[dateOf(k).getDay()];

  /* ---------- Seeded fake schedule ---------- */
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed; return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
  const INITIALS = ['J. M.', 'R. S.', 'P. A.', 'T. C.', 'M. F.', 'D. L.', 'A. R.', 'N. P.', 'L. B.', 'H. G.', 'C. V.', 'F. O.'];
  const fakeCache = {};
  function fakeBlocks(k, thId) {
    const id = k + '|' + thId;
    if (fakeCache[id]) return fakeCache[id];
    const h = hoursFor(k); const out = [];
    if (h) {
      const r = rng(hash(id));
      const busyness = 0.35 + r() * 0.3; // 35–65% chance to book each slot
      let cur = h[0];
      while (cur < h[1]) {
        if (r() < busyness) {
          const tr = TREATMENTS[Math.floor(r() * TREATMENTS.length)];
          const op = tr.options[Math.floor(r() * tr.options.length)];
          if (cur + op.min > h[1]) break;
          out.push({ start: cur, end: cur + op.min, treat: tr.id, min: op.min, price: op.price, client: INITIALS[Math.floor(r() * INITIALS.length)], fake: true });
          cur += op.min + 30; // 30 min turnover
        } else cur += 60;
      }
    }
    return (fakeCache[id] = out);
  }

  /* ---------- Stored (demo) bookings ---------- */
  const STORE = 'delirio_bookings';
  function loadBookings() { try { return JSON.parse(localStorage.getItem(STORE) || '[]'); } catch (e) { return memBookings; } }
  let memBookings = [];
  function saveBookings(list) { memBookings = list; try { localStorage.setItem(STORE, JSON.stringify(list)); } catch (e) {} }
  function blocksFor(k, thId) {
    const mine = loadBookings().filter((b) => b.date === k && b.therapist === thId)
      .map((b) => ({ start: b.start, end: b.start + b.min, treat: b.treat, min: b.min, price: b.price, client: b.name, online: true, ref: b.ref }));
    return fakeBlocks(k, thId).concat(mine).sort((a, b) => a.start - b.start);
  }
  function isFree(k, thId, start, dur) {
    return !blocksFor(k, thId).some((b) => start < b.end + 15 && b.start < start + dur + 15);
  }
  function slotsFor(k, dur, thChoice) {
    const h = hoursFor(k); if (!h) return [];
    const ths = thChoice && thChoice !== 'any' ? [thChoice] : THERAPISTS.map((x) => x.id);
    const isToday = k === todayKey(); const out = [];
    for (let s = h[0]; s + dur <= h[1]; s += 30) {
      if (isToday && s < nowMin() + 60) continue;
      const free = ths.filter((th) => isFree(k, th, s, dur));
      if (free.length) out.push({ start: s, therapists: free });
    }
    return out;
  }
  function addBooking(b) {
    const ref = 'DS-' + Math.random().toString(36).slice(2, 6).toUpperCase() + pad(new Date().getSeconds());
    const full = Object.assign({ ref, created: Date.now() }, b);
    saveBookings(loadBookings().concat(full));
    return full;
  }
  function cancelBooking(ref) { saveBookings(loadBookings().filter((b) => b.ref !== ref)); }
  function clearBookings() { saveBookings([]); }

  window.DS = {
    TREATMENTS, THERAPISTS, HOURS, DAYS_AHEAD, t, L, setLang, applyLang, onLang: (fn) => listeners.push(fn),
    get lang() { return lang; }, keyOf, dateOf, hm, fmtDate, todayKey, hoursFor, locale,
    blocksFor, slotsFor, isFree, loadBookings, addBooking, cancelBooking, clearBookings,
    treat: (id) => TREATMENTS.find((x) => x.id === id), therapist: (id) => THERAPISTS.find((x) => x.id === id)
  };

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]'); if (b) setLang(b.dataset.lang);
  });
  document.addEventListener('DOMContentLoaded', applyLang);
})();
