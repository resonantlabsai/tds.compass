// ==============================
// File: /js/app.js  (drop-in)
// Purpose: persist quiz result + hydrate index snapshot + drawer
// ==============================
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "tds:lastResult";
  const THEME_KEY = "tds:theme";

function applyTheme(theme) {
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("theme-light", theme === "light");
  root.classList.toggle("theme-dark", theme === "dark");
}

function initTheme() {
  let stored = null;
  try { stored = localStorage.getItem(THEME_KEY); } catch (e) {}
  const initial = stored || document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(initial);
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  btn.addEventListener("click", (evt) => {
    evt.preventDefault();
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
  });
}


  // ---- storage helpers ----
  function saveLastResult(payload) {
    // Why: so index.html can render snapshot after navigating from quiz
    try {
      const data = { ...payload, at: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }
  function loadLastResult() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data?.zone) return null;
      return data;
    } catch { return null; }
  }

  // ---- drawer (shared) ----
  function injectDrawerStyles(){ if($("tds-drawer-style")) return;
    const css = `.tds-drawer{position:fixed;inset:0;display:none;background:rgba(0,0,0,.4);z-index:60;}
    .tds-drawer.open{display:block;}
    .tds-drawer-panel{position:absolute;right:0;top:0;bottom:0;width:min(520px,92vw);background:var(--surface);border-left:1px solid var(--border);box-shadow:var(--shadow);padding:var(--space-6);overflow:auto;}
    .tds-drawer-close{position:absolute;top:12px;right:12px;}`;
    const s=document.createElement("style"); s.id="tds-drawer-style"; s.textContent=css; document.head.appendChild(s);
  }
  function ensureDrawer(){
    let el=$("snapshot-drawer"); if(el) return el;
    injectDrawerStyles();
    el=document.createElement("div"); el.id="snapshot-drawer"; el.className="tds-drawer";
    el.innerHTML=`<div class="tds-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <button class="btn ghost tds-drawer-close" aria-label="Close">Close</button>
      <div class="chip" id="drawer-badge">Persona snapshot</div>\n      <img id="drawer-badge-img" class="badge" alt="" />
      <div class="tag" id="drawer-zone">—</div>
      <h3 id="drawer-title" class="card-title">—</h3>
      <p id="drawer-summary" class="muted">—</p>
      <ul id="drawer-traits" class="traits"></ul>
      <p id="drawer-collab" class="muted">—</p>
      <div class="kbd"><span>Prompt</span><pre><code id="drawer-prompt">—</code></pre></div>
    </div>`;
    document.body.appendChild(el);
    el.addEventListener("click",(e)=>{ if(e.target===el) closeDrawer(); });
    el.querySelector(".tds-drawer-close").addEventListener("click", closeDrawer);
    document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeDrawer(); });
    return el;
  }
  function openDrawerPayload(p){
    const host=ensureDrawer();
    const setText=(id,txt)=>{const el=$(id); if(el) el.textContent = txt ?? "";};
    const L=p.zone?.[0]||"B", N=p.zone?.[1]||"2";
    const map={A:"high structure",B:"moderate structure",C:"relational-leaning",D:"highly relational"};
    setText("drawer-badge", p.badge || "Persona snapshot");
    const img = $("drawer-badge-img"); if (img) { img.src = `assets/badges/${p.zone || ""}.svg`; img.alt = p.badge || p.zone || "Persona badge"; }

    setText("drawer-zone", `${L}${N} — ${map[L]} · band ${N}`);
    setText("drawer-title", p.title || p.focus || "Persona");
    setText("drawer-summary", p.summary || p.styleText || p.voiceText || "");
    setText("drawer-collab", p.collabText || "");
    const ul=$("drawer-traits"); if (ul){ ul.innerHTML=""; (p.traits||[]).forEach(t=>{const li=document.createElement("li"); li.textContent=t; ul.appendChild(li);}); }
    setText("drawer-prompt", p.prompt || "");
    host.classList.add("open");
  }
  function closeDrawer(){ const host=$("snapshot-drawer"); if(host) host.classList.remove("open"); }

  // ---- hydrate home snapshot card (index.html) ----
  function renderHomeSnapshot(p){
    // IDs expected on index.html card (safe if missing)
    const setText=(id,txt)=>{const el=$(id); if(el) el.textContent = txt ?? "";};
    const L=p.zone?.[0]||"B", N=p.zone?.[1]||"2";
    const map={A:"high structure",B:"moderate structure",C:"relational-leaning",D:"highly relational"};
    setText("snapshot-zone", `${L}${N} — ${map[L]} · band ${N}`);
    setText("snapshot-name", p.title || p.focus || "Persona");
    setText("snapshot-desc", p.summary || p.styleText || p.voiceText || "");
    const traitsEl = $("snapshot-traits");
    if (traitsEl) { traitsEl.innerHTML=""; (p.traits||[]).slice(0,6).forEach(t=>{const li=document.createElement("li"); li.textContent=t; traitsEl.appendChild(li);}); }
    setText("snapshot-prompt", p.prompt || "");
  }

  // ---- event wiring ----
  document.addEventListener("tds:zone", (e) => {
    const d = e.detail || {};
    // Hide inline results if present (quiz page)
    const inline = document.getElementById("results"); if (inline) inline.setAttribute("hidden","");

    saveLastResult(d);          // <— persist for index.html
    openDrawerPayload(d);       // <— show now
    // If current page has a home card (e.g., you run quiz inside index), update it too
    if (document.getElementById("snapshot-name")) renderHomeSnapshot(d);
  });

  // ---- boot ----
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    // Prefer drawer on quiz pages
    if (document.getElementById("tds-form")) window.USE_DRAWER_RESULTS = true;

    // If home snapshot card exists, hydrate from storage
    if (document.getElementById("snapshot-name")) {
      const last = loadLastResult();
      if (last) renderHomeSnapshot(last);

      // Optional button to open drawer with last result
      const btn = document.getElementById("open-last-profile");
      if (btn && last) btn.addEventListener("click", (e)=>{ e.preventDefault(); openDrawerPayload(last); });
    }
  });
})();