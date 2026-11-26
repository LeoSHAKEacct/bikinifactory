/* Extra sections on Pranav's site, built from content.js plus four always-on tools:
   area map, payment plan calculator, Golden Visa checker, Dubai vs the world.
   Runs before the horizontal-page script, so panels with nothing to show are removed first. */
(() => {
  const C = window.PRANAV_CONTENT || {}, $ = id => document.getElementById(id);
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const aed = n => "AED " + Math.round(n).toLocaleString("en-US");
  const dropPanel = el => { const p = el && el.closest(".pnl"); if (p) p.remove(); };

  // send a visitor to the contact form with their request already written
  window.prefillContact = (goal, msg) => {
    const f = $("lead"); if (!f) return;
    const r = f.querySelector(`[name=goal][value="${goal}"]`);
    if (r && !r.checked) { r.checked = true; r.dispatchEvent(new Event("change", {bubbles: true})); }
    if (msg) f.querySelector("[name=msg]").value = msg;
    const a = document.createElement("a"); a.href = "#contact"; document.body.appendChild(a); a.click(); a.remove();
  };
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-prefill]"); if (!b) return;
    e.preventDefault(); window.prefillContact(b.dataset.goal || "Something else", b.dataset.prefill);
  });

  /* ---- deal ticker (opening screen) ---- */
  const deals = (C.deals || []).filter(Boolean);
  if (deals.length && $("ticker")) {
    const row = deals.map(d => `<span>✦ ${esc(d)}</span>`).join("");
    $("ticker").innerHTML = `<div class="tk-track">${row}${row}</div>`; $("ticker").hidden = false;
  }

  /* ---- on site: construction diary + reels ---- */
  const diary = (C.diary || []).filter(d => d && (d.text || d.image));
  if (diary.length) $("diary").innerHTML = diary.map(d => `<article class="dy reveal">${d.image ? `<div class="dy-img" style="background-image:url('${esc(d.image)}')"></div>` : ""}
    <div class="dy-body"><span class="dy-stage">${esc(d.stage || "")}</span><h3>${esc(d.project || "")}</h3><p>${esc(d.text || "")}</p><small>${esc(d.date || "")}</small></div></article>`).join("");
  else $("diary").remove();
  const reels = (C.reels || []).map(u => String(u).match(/instagram\.com\/(?:reel|p|tv)\/([\w-]+)/)).filter(Boolean);
  $("reels").innerHTML = reels.length
    ? reels.slice(0, 6).map(m => `<div class="reel reveal"><iframe src="https://www.instagram.com/${m[0].includes("/p/") ? "p" : "reel"}/${m[1]}/embed" loading="lazy" allowfullscreen title="Instagram reel"></iframe></div>`).join("")
    : `<a class="ig-card reveal" href="https://www.instagram.com/exclusivewithpranav/" target="_blank" rel="noopener"><b>@exclusivewithpranav</b><span>Site visits, new launches and market takes, every week on Instagram.</span><em>Follow on Instagram →</em></a>`;

  /* ---- next launch: countdown + first-access list ---- */
  const L = C.launch;
  if (L && L.name && $("launchBox")) {
    const t = Date.parse(L.date), track = window.leadTracker ? leadTracker("launch") : null;
    $("launchBox").innerHTML = `<div class="ln-card reveal">${L.image ? `<div class="ln-img" style="background-image:url('${esc(L.image)}')"></div>` : ""}
      <div class="ln-body"><span class="eyebrow">Exclusive launch</span><h3>${esc(L.name)}</h3><p class="ln-meta">${esc([L.area, L.from && "from " + L.from, L.plan && L.plan + " payment plan"].filter(Boolean).join(" · "))}</p>
      ${L.blurb ? `<p class="ln-blurb">${esc(L.blurb)}</p>` : ""}<div class="cd" id="cd"></div>
      <form class="ln-form" id="lnForm"><input name="name" placeholder="Full name" required autocomplete="name"><input name="phone" placeholder="WhatsApp (with country code)" required inputmode="tel" autocomplete="tel"><input name="email" type="email" placeholder="Email (optional)" autocomplete="email">
      <button class="btn btn-gold" type="submit">Get the brochure first →</button></form><p class="ln-ok" id="lnOk" hidden>You're on the list. Pranav will send you the brochure before the public launch.</p></div></div>`;
    const tick = () => { const s = Math.max(0, Math.floor((t - Date.now()) / 1000));
      $("cd").innerHTML = isNaN(t) ? "" : s ? [[Math.floor(s / 86400), "days"], [Math.floor(s / 3600) % 24, "hours"], [Math.floor(s / 60) % 60, "min"], [s % 60, "sec"]].map(([v, l]) => `<div><b>${String(v).padStart(2, "0")}</b><span>${l}</span></div>`).join("") : "<p class='ln-meta'>Launched: ask for availability.</p>"; };
    tick(); setInterval(tick, 1000);
    const f = $("lnForm"), fields = () => ({ launch: L.name, name: f.name.value, phone: f.phone.value, email: f.email.value });
    f.addEventListener("input", () => track && track.progress(fields()));
    f.onsubmit = e => { e.preventDefault(); if (track) track.submit(fields());
      window.open(`https://wa.me/971555366354?text=${encodeURIComponent(`Hi Pranav, please send me the brochure for ${L.name} before the launch. I'm ${f.name.value}.`)}`, "_blank", "noopener");
      f.hidden = true; $("lnOk").hidden = false; };
  } else dropPanel($("launchBox"));

  /* ---- client voices + market takes ---- */
  const voices = (C.voices || []).filter(v => v && v.text), takes = (C.takes || []).filter(t => t && t.title);
  if (voices.length) $("voiceList").innerHTML = voices.map(v => `<figure class="vc reveal"><blockquote>“${esc(v.text)}”</blockquote><figcaption><b>${esc(v.name || "")}</b>${v.role ? ` · ${esc(v.role)}` : ""}</figcaption></figure>`).join("");
  else $("voiceWrap").remove();
  if (takes.length) $("takeList").innerHTML = takes.map(t => `<article class="tk reveal"><small>${esc(t.date || "")}</small><h3>${esc(t.title)}</h3><p>${esc(t.text || "")}</p>${t.link ? `<a href="${esc(t.link)}" target="_blank" rel="noopener">Watch / read →</a>` : ""}</article>`).join("");
  else $("takeWrap").remove();
  if (!voices.length && !takes.length) dropPanel($("voices"));

  /* ---- area map ---- */
  const AREAS = [
    { id: "palm", name: "Palm Jumeirah", x: 250, y: 205, tier: 4, demand: "High", homes: "Villas & beach apartments", best: "Trophy homes and luxury holiday lets", note: "Dubai's icon: private beaches, signature villas and branded hotels." },
    { id: "marina", name: "Dubai Marina", x: 170, y: 300, tier: 3, demand: "Very high", homes: "Apartments", best: "Rental investors and young professionals", note: "Walkable waterfront towers with restaurants, metro and tram on the doorstep." },
    { id: "jbr", name: "JBR", x: 205, y: 270, tier: 3, demand: "Very high", homes: "Beachfront apartments", best: "Short-term holiday lets", note: "Right on the beach and The Walk; tourists all year." },
    { id: "beachfront", name: "Emaar Beachfront", x: 228, y: 245, tier: 4, demand: "High", homes: "New beach towers", best: "Off-plan buyers who want sea views", note: "Private-beach island between the Marina and the Palm." },
    { id: "jvc", name: "JVC", x: 290, y: 345, tier: 1, demand: "High", homes: "Apartments & townhouses", best: "Strong yields at a lower entry price", note: "Popular with tenants; one of the best yield-to-price areas." },
    { id: "hills", name: "Dubai Hills Estate", x: 370, y: 300, tier: 3, demand: "High", homes: "Villas, townhouses & apartments", best: "Families: parks, golf and top schools", note: "Green master community between Downtown and the Marina." },
    { id: "downtown", name: "Downtown", x: 470, y: 205, tier: 4, demand: "Very high", homes: "Apartments & penthouses", best: "Prestige buys and short-term rentals", note: "Burj Khalifa, Dubai Mall and the Opera on your doorstep." },
    { id: "bay", name: "Business Bay", x: 500, y: 225, tier: 3, demand: "High", homes: "Canal-side apartments", best: "Yield-focused investors", note: "Next to Downtown at a lower entry price, along the Dubai Water Canal." },
    { id: "creek", name: "Dubai Creek Harbour", x: 575, y: 165, tier: 3, demand: "Growing", homes: "Waterfront apartments", best: "Long-term growth with skyline views", note: "Emaar's waterfront master plan facing the Downtown skyline." },
    { id: "south", name: "Dubai South", x: 150, y: 430, tier: 1, demand: "Growing", homes: "Apartments, townhouses & villas", best: "Early buyers betting on the new airport district", note: "Around Al Maktoum Airport and Expo City; early-stage growth." },
  ];
  if ($("map")) {
    // label offsets [dx, dy, anchor] so close-together areas don't overlap
    const L = { beachfront: [19, 5, "start"], jbr: [-19, 5, "end"], marina: [-19, 5, "end"], jvc: [0, 30], bay: [19, 16, "start"], downtown: [-6, -18, "end"] };
    $("map").innerHTML = `<svg viewBox="0 0 700 480" aria-label="Map of Dubai areas">
      <path class="sea" d="M0 0H700V0L620 120 560 150 470 160 380 190 300 215 230 260 160 320 60 400 0 450Z"/>
      <path class="coast" d="M0 450L60 400 160 320 230 260 300 215 380 190 470 160 560 150 620 120 700 0"/>
      <path class="palm" d="M250 230 L250 185 M250 195 l-22 -14 M250 195 l22 -14 M250 205 l-24 -8 M250 205 l24 -8 M250 215 l-22 -2 M250 215 l22 -2"/>
      <path class="road" d="M40 460 L180 340 L330 270 L480 220 L640 180"/>
      ${AREAS.map(a => `<g class="pin" data-id="${a.id}" tabindex="0" role="button" aria-label="${a.name}"><circle cx="${a.x}" cy="${a.y}" r="13"/><circle class="dot" cx="${a.x}" cy="${a.y}" r="5"/><text x="${a.x + (L[a.id] || [0, -18])[0]}" y="${a.y + (L[a.id] || [0, -18])[1]}" text-anchor="${(L[a.id] || [0, 0, "middle"])[2] || "middle"}">${a.name}</text></g>`).join("")}
    </svg>`;
    const show = id => {
      const a = AREAS.find(x => x.id === id) || AREAS[0];
      $("map").querySelectorAll(".pin").forEach(p => p.classList.toggle("on", p.dataset.id === a.id));
      $("areaCard").innerHTML = `<span class="eyebrow">Area guide</span><h3>${a.name}</h3><p class="ar-note">${a.note}</p>
        <dl><div><dt>Price level</dt><dd><span class="tier">${"●".repeat(a.tier)}<i>${"●".repeat(4 - a.tier)}</i></span></dd></div><div><dt>Rental demand</dt><dd>${a.demand}</dd></div><div><dt>Homes</dt><dd>${a.homes}</dd></div><div><dt>Best for</dt><dd>${a.best}</dd></div></dl>
        <button class="btn btn-gold" type="button" data-goal="Buy a property" data-prefill="I'm interested in ${a.name}. Please send me what's available there.">Ask Pranav about ${a.name} →</button>
        <p class="fine">A general guide. Pranav shares current prices and availability.</p>`;
    };
    $("map").addEventListener("click", e => { const p = e.target.closest(".pin"); if (p) show(p.dataset.id); });
    $("map").addEventListener("keydown", e => { const p = e.target.closest(".pin"); if (p && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); show(p.dataset.id); } });
    show("marina");
  }

  /* ---- investor tools: tabs ---- */
  document.querySelectorAll("#tools .tt-tabs button").forEach(b => b.onclick = () => {
    document.querySelectorAll("#tools .tt-tabs button").forEach(x => x.classList.toggle("on", x === b));
    document.querySelectorAll("#tools .tt-pane").forEach(p => p.hidden = p.id !== b.dataset.pane);
  });

  /* payment plan */
  const PLANS = { "60/40": [20, 60], "50/50": [20, 50], "70/30": [20, 70], "80/20": [20, 80], "40/60": [10, 40] };
  const pp = () => {
    const price = +$("ppPrice").value, [down, during] = PLANS[$("ppPlan").value], months = +$("ppMonths").value, dld = $("ppDld").checked ? price * .04 : 0;
    const book = price * down / 100, mid = price * (during - down) / 100, hand = price * (100 - during) / 100, monthly = mid / months;
    $("ppPriceV").textContent = aed(price); $("ppMonthsV").textContent = months + " months";
    const rows = [["On booking", book + dld, `${down}% deposit${dld ? " + 4% DLD fee" : ""}`], ["During construction", mid, `${during - down}% over ${months} months ≈ ${aed(monthly)} / month`], ["On handover", hand, `${100 - during}%`]];
    const max = Math.max(...rows.map(r => r[1]));
    $("ppOut").innerHTML = rows.map(r => `<div class="pp-row"><div><b>${r[0]}</b><small>${r[2]}</small></div><strong>${aed(r[1])}</strong><span class="pp-bar"><i style="width:${(r[1] / max * 100).toFixed(1)}%"></i></span></div>`).join("")
      + `<div class="pp-total"><span>Total incl. ${dld ? "DLD fee" : "price"}</span><b>${aed(price + dld)}</b></div>`;
  };
  ["ppPrice", "ppPlan", "ppMonths", "ppDld"].forEach(id => $(id) && $(id).addEventListener("input", pp)); if ($("ppPrice")) pp();

  /* Golden Visa checker */
  const gv = () => {
    const v = +$("gvVal").value, off = $("gvType").value === "offplan", mort = $("gvMort").checked;
    $("gvValV").textContent = aed(v);
    let h, t, cls;
    if (v >= 2000000) { cls = "ok"; h = "You can apply for the 10-year Golden Visa"; t = `Property worth AED 2M or more qualifies${off ? " (off-plan from approved developers counts)" : ""}.${mort ? " With a mortgage, the bank's letter is part of the application." : ""}`; }
    else if (v >= 750000) { cls = "mid"; h = "You can apply for the 2-year investor visa"; t = `Add ${aed(2000000 - v)} in property value to reach the 10-year Golden Visa.`; }
    else { cls = "no"; h = "Not yet"; t = `${aed(750000 - v)} more for the 2-year investor visa, ${aed(2000000 - v)} more for the 10-year Golden Visa.`; }
    $("gvOut").className = "gv-out " + cls;
    $("gvOut").innerHTML = `<h3>${h}</h3><p>${t}</p><button class="btn btn-gold" type="button" data-goal="Buy a property" data-prefill="I'd like a property that gets me the Golden Visa. My budget is around ${aed(Math.max(v, 2000000))}.">Find me a property that qualifies →</button>`;
  };
  ["gvVal", "gvType", "gvMort"].forEach(id => $(id) && $(id).addEventListener("input", gv)); if ($("gvVal")) gv();
})();
