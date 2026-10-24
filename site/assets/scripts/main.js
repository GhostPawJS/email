// Replays a recorded run of @ghostpaw/email 0.4.0 (2026-10-24, fixed clock). Without this script every step and result stays visible.
const STATES = [{"rows": [{"k": "Messages", "v": "0"}, {"k": "Threads", "v": "0"}, {"k": "Last search", "v": "—"}, {"k": "Tool result", "v": "—"}, {"k": "IMAP session", "v": "none"}], "foot": "An empty SQLite cache after initSchema(db)."}, {"rows": [{"k": "Messages", "v": "1 · Ops, Invoice 4471", "t": "cyan"}, {"k": "Threads", "v": "not computed"}, {"k": "Last search", "v": "—"}, {"k": "Tool result", "v": "—"}, {"k": "IMAP session", "v": "none"}], "foot": "Cached as uid 1 in INBOX."}, {"rows": [{"k": "Messages", "v": "2 · Ops, Mika", "t": "cyan"}, {"k": "Threads", "v": "not computed"}, {"k": "Last search", "v": "—"}, {"k": "Tool result", "v": "—"}, {"k": "IMAP session", "v": "none"}], "foot": "The reply carries In-Reply-To and References."}, {"rows": [{"k": "Messages", "v": "3 · Ops, Mika, Ren"}, {"k": "Threads", "v": "2 · invoice (2), climbing (1)", "t": "violet"}, {"k": "Last search", "v": "—"}, {"k": "Tool result", "v": "—"}, {"k": "IMAP session", "v": "none"}], "foot": "Threads come from the headers, not the subjects."}, {"rows": [{"k": "Messages", "v": "3 · Ops, Mika, Ren"}, {"k": "Threads", "v": "2"}, {"k": "Last search", "v": "“invoice” → uid 1, 2", "t": "cyan"}, {"k": "Tool result", "v": "—"}, {"k": "IMAP session", "v": "none"}], "foot": "FTS5 local search, no server."}, {"rows": [{"k": "Messages", "v": "3 · Ops, Mika, Ren"}, {"k": "Threads", "v": "2"}, {"k": "Last search", "v": "“invoice” → uid 1, 2"}, {"k": "Tool result", "v": "mail_read · success", "t": "ward"}, {"k": "IMAP session", "v": "none"}], "foot": "The same call an agent makes."}, {"rows": [{"k": "Messages", "v": "3 · Ops, Mika, Ren"}, {"k": "Threads", "v": "2"}, {"k": "Last search", "v": "“invoice” → uid 1, 2"}, {"k": "Tool result", "v": "mail_sync · error", "t": "alarm"}, {"k": "IMAP session", "v": "none"}], "foot": "Sync needs a live IMAP session. Nothing was faked."}];
(() => {
  const list = document.getElementById("state-list");
  const foot = document.getElementById("state-foot");
  const steps = Array.from(document.querySelectorAll(".step"));
  const reset = document.getElementById("reset");
  const status = document.getElementById("run-status");
  if (!list || !steps.length) return;
  const motion = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  let at = 0;

  function paint(i) {
    const s = STATES[i];
    list.textContent = "";
    for (const r of s.rows) {
      const li = document.createElement("li");
      if (r.t) li.className = "t-" + r.t;
      const k = document.createElement("span"); k.className = "k"; k.textContent = r.k;
      const v = document.createElement("span"); v.className = "v"; v.textContent = r.v;
      li.append(k, v);
      if (r.w != null) {
        const bar = document.createElement("span"); bar.className = "bar";
        const fill = document.createElement("i");
        bar.append(fill); li.append(bar);
        const w = Math.max(0, Math.min(1, r.w)) * 100 + "%";
        const from = list.dataset.prev && JSON.parse(list.dataset.prev)[r.k];
        fill.style.width = motion && from != null ? from : w;
        if (motion && from != null) requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = w; }));
      }
      list.append(li);
    }
    const prev = {};
    for (const r of s.rows) if (r.w != null) prev[r.k] = Math.max(0, Math.min(1, r.w)) * 100 + "%";
    list.dataset.prev = JSON.stringify(prev);
    if (foot) foot.textContent = s.foot || "";
  }

  function mark() {
    steps.forEach((el, i) => {
      el.classList.toggle("done", i < at);
      el.classList.toggle("next", i === at);
    });
    if (status) status.textContent = at < steps.length ? "Step " + (at + 1) + " of " + steps.length + " is next." : "All " + steps.length + " steps replayed.";
  }

  steps.forEach((el, i) => {
    const btn = el.querySelector(".run-btn");
    btn.addEventListener("click", () => {
      if (i !== at) return;
      at = i + 1;
      paint(at);
      mark();
      if (el.classList.contains("refused") && motion) {
        el.classList.add("flash");
        el.addEventListener("animationend", () => el.classList.remove("flash"), { once: true });
      }
      const next = steps[at] && steps[at].querySelector(".run-btn");
      const res = el.querySelector(".result");
      if (res) { res.setAttribute("tabindex", "-1"); res.focus({ preventScroll: true }); }
      if (next) next.setAttribute("aria-describedby", "run-status");
    });
  });
  if (reset) reset.addEventListener("click", () => { at = 0; list.dataset.prev = ""; paint(0); mark(); steps[0].querySelector(".run-btn").focus(); });
  paint(0);
  mark();

  document.querySelectorAll(".copy").forEach((b) => {
    b.addEventListener("click", async () => {
      const input = document.getElementById(b.dataset.copy);
      try { await navigator.clipboard.writeText(input.value); } catch { input.select(); document.execCommand("copy"); }
      const label = b.textContent;
      b.textContent = "Copied";
      setTimeout(() => { b.textContent = label; }, 1400);
    });
  });
})();
