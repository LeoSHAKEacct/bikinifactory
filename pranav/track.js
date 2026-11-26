/* Saves form progress to /api/lead, so Pranav's /admin shows finished requests and the ones people started
   but never sent. Nothing is saved until the visitor has typed a name, email or phone number. */
window.leadTracker = function (kind) {
  const KEY = "lead-" + kind;
  let id = null; try { id = sessionStorage.getItem(KEY); } catch (_) {}
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Math.random().toString(36).slice(2) + Date.now().toString(36)).toLowerCase();
    try { sessionStorage.setItem(KEY, id); } catch (_) {}
  }
  let timer = null, sent = "", latest = null, done = false;
  const worth = f => ["name", "email", "phone"].some(k => (f[k] || "").trim().length > 1);
  const send = (status, fields, beacon) => {
    const body = JSON.stringify({ id, kind, status, fields });
    if (beacon && navigator.sendBeacon) return navigator.sendBeacon("/api/lead", new Blob([body], { type: "application/json" }));
    return fetch("/api/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  };
  const t = {
    progress(fields) {
      if (done || !worth(fields)) return;
      latest = fields; clearTimeout(timer);
      timer = setTimeout(() => { const s = JSON.stringify(latest); if (s !== sent) { sent = s; send("started", latest); } }, 1500);
    },
    flush() {
      if (done || !latest) return;
      const s = JSON.stringify(latest); if (s === sent) return;
      sent = s; clearTimeout(timer); send("started", latest, true);
    },
    submit(fields) {
      done = true; clearTimeout(timer);
      try { sessionStorage.removeItem(KEY); } catch (_) {}
      return send("submitted", fields);
    },
  };
  addEventListener("pagehide", () => t.flush());
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") t.flush(); });
  return t;
};
