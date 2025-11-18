// /js/tds.enhancements.js
// Why: non-invasive UX hardening (persist answers, deep link, results visibility, reduced-motion).

(() => {
  const ANSWERS_KEY = "tds_answers_v1";
  const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (id) => document.getElementById(id);

  // ---- Persist answers (why: users often reload/navigate back mid-quiz) ----
  function saveAnswers() {
    const form = $("tds-form");
    if (!form || !Array.isArray(window.QUESTIONS)) return;
    const payload = {};
    for (const q of window.QUESTIONS) {
      const checked = form.querySelector(`input[name="${q.id}"]:checked`);
      if (checked) payload[q.id] = checked.value;
    }
    try { localStorage.setItem(ANSWERS_KEY, JSON.stringify(payload)); } catch {}
  }

  function restoreAnswers() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(ANSWERS_KEY) || "null"); } catch {}
    if (!saved) return;
    const form = $("tds-form");
    if (!form) return;
    for (const [qid, val] of Object.entries(saved)) {
      const input = form.querySelector(`input[name="${qid}"][value="${val}"]`);
      if (input) input.checked = true;
    }
  }

  // ---- Deep-linking (why: shareable results; keeps state on refresh) ----
  function updateHashFromState() {
    if (!window.CURRENT_ZONE || window.CURRENT_S == null || window.CURRENT_R == null) return;
    const qp = new URLSearchParams();
    qp.set("zone", window.CURRENT_ZONE.code);
    qp.set("S", window.CURRENT_S.toFixed(2));
    qp.set("R", window.CURRENT_R.toFixed(2));
    history.replaceState(null, "", `#${qp.toString()}`);
  }

  function tryHydrateFromHash() {
    const hash = location.hash.replace(/^#/, "");
    if (!hash) return;
    const qp = new URLSearchParams(hash);
    const zoneCode = qp.get("zone");
    const S = parseFloat(qp.get("S"));
    const R = parseFloat(qp.get("R"));
    if (!zoneCode || Number.isNaN(S) || Number.isNaN(R)) return;

    // Use the public functions from tds.js (kept global)
    if (typeof window.selectZoneTraits === "function" &&
        typeof window.displayZoneAndPrompt === "function") {
      const zone = window.selectZoneTraits(zoneCode);
      if (zone) window.displayZoneAndPrompt(zone, S, R);
    }
  }

  // ---- Patch results display (why: ensure visibility even if using [hidden]) ----
  const _displayZoneAndPrompt = window.displayZoneAndPrompt;
  if (typeof _displayZoneAndPrompt === "function") {
    window.displayZoneAndPrompt = function patched(zone, S, R) {
      _displayZoneAndPrompt(zone, S, R);

      const results = $("results");
      if (results && results.hasAttribute("hidden")) {
        results.removeAttribute("hidden");
      }
      if (results && !prefersReduced) {
        results.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      const err = $("form-error");
      if (err) { err.textContent = ""; err.style.display = "none"; }

      updateHashFromState();
    };
  }

  // ---- Boot after original tds.js runs ----
  document.addEventListener("DOMContentLoaded", () => {
    // Wait a microtask so renderQuestions has populated the DOM
    queueMicrotask(() => {
      restoreAnswers();

      const form = $("tds-form");
      if (form) {
        // Save on any radio change
        form.addEventListener("change", (e) => {
          const t = e.target;
          if (t && t.matches('input[type="radio"]')) saveAnswers();
        }, true);

        // No-op: hash updates run inside our patched display function
        form.addEventListener("submit", () => {});
      }

      // If URL already has a result, hydrate immediately
      tryHydrateFromHash();
    });
  });

  // ---- Optional: add no-store to data fetchers (why: avoid stale JSON in prod caches) ----
  // Uncomment if you want stronger cache-busting without touching tds.js sources.
  // if (typeof window.loadTraits === "function") {
  //   const _loadTraits = window.loadTraits;
  //   window.loadTraits = async () => {
  //     const res = await fetch("data/traits.json", { cache: "no-store" });
  //     if (!res.ok) throw new Error("Unable to load traits.json");
  //     const data = await res.json();
  //     window.TDS_ZONES = data.zones || [];
  //     return window.TDS_ZONES;
  //   };
  // }
  // if (typeof window.loadFocusPersonas === "function") {
  //   const _loadFocus = window.loadFocusPersonas;
  //   window.loadFocusPersonas = async () => {
  //     const res = await fetch("data/focus_personas.json", { cache: "no-store" });
  //     if (!res.ok) throw new Error("Unable to load focus_personas.json");
  //     const data = await res.json();
  //     window.FOCUS_PERSONAS = data.focus_personas || [];
  //     return window.FOCUS_PERSONAS;
  //   };
  // }
})();
