// ======================================
// /js/tds.js  (uses exact traits.json keys)
// ======================================
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);

  // Exposed state
  window.CURRENT_S = null;
  window.CURRENT_R = null;
  window.CURRENT_ZONE = null;
  window.TDS_ZONES = [];
  window.FOCUS_PERSONAS = [];

  // Fallback QUESTIONS
  if (!Array.isArray(window.QUESTIONS)) {
    window.QUESTIONS = [
      { id: "q1", text: "I prefer content with clear structure and headings.", dimension: "S" },
      { id: "q2", text: "I value warm, friendly tone over strict formality.", dimension: "R" },
      { id: "q3", text: "I like step-by-step processes.", dimension: "S" },
      { id: "q4", text: "Stories/examples help me connect with the message.", dimension: "R" },
      { id: "q5", text: "Concise summaries are essential.", dimension: "S" },
      { id: "q6", text: "Collaborative, inclusive language feels best.", dimension: "R" },
      { id: "q7", text: "I prefer bullet lists over paragraphs.", dimension: "S" },
      { id: "q8", text: "Emotion/voice matters in communication.", dimension: "R" }
    ];
  }

  const SCALE = [
    { value: 1, label: "Strongly disagree" },
    { value: 2, label: "Disagree" },
    { value: 3, label: "Neutral" },
    { value: 4, label: "Agree" },
    { value: 5, label: "Strongly agree" }
  ];

  // Render quiz
  function renderQuestions() {
    const host = $("quiz-questions"); if (!host) return;
    host.innerHTML = "";
    for (const q of window.QUESTIONS) {
      const wrap = document.createElement("div"); wrap.className = "quiz-question";
      const qTextId = `${q.id}-label`;

      const title = document.createElement("div");
      title.className = "quiz-question-text"; title.id = qTextId; title.textContent = q.text;

      const scale = document.createElement("div"); scale.className = "quiz-scale";
      const labelsRow = document.createElement("div"); labelsRow.className = "quiz-scale-labels";
      const left = document.createElement("span"); left.className = "quiz-scale-label muted"; left.textContent = "Disagree";
      const right = document.createElement("span"); right.className = "quiz-scale-label muted"; right.textContent = "Agree";
      labelsRow.appendChild(left); labelsRow.appendChild(right);
      const opts = document.createElement("div"); opts.className = "quiz-options";

      for (const opt of SCALE) {
        const lab = document.createElement("label");
        lab.setAttribute("aria-label", `${opt.label} for ${q.text}`);
        const input = document.createElement("input");
        input.type = "radio"; input.name = q.id; input.value = String(opt.value); input.required = true;
        input.setAttribute("aria-labelledby", qTextId);
        lab.appendChild(input); opts.appendChild(lab);
      }

      scale.appendChild(labelsRow); scale.appendChild(opts);
      wrap.appendChild(title); wrap.appendChild(scale); host.appendChild(wrap);
    }
  }

  // Read answers
  function readAnswers() {
    const form = $("tds-form"); const out = {}; if (!form) return out;
    for (const q of window.QUESTIONS) {
      const checked = form.querySelector(`input[name="${q.id}"]:checked`);
      if (checked) out[q.id] = Number(checked.value);
    }
    return out;
  }

  // Scoring
  const norm = (v) => Math.max(0, Math.min(4, Number(v) - 1 || 0));
  function computeScores(ans) {
    const s = [], r = [];
    window.QUESTIONS.forEach((q, i) => {
      const v = ans[q.id]; if (v == null) return;
      const dim = q.dimension || (i % 2 === 0 ? "S" : "R");
      (dim === "S" ? s : r).push(norm(v));
    });
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    return { S: avg(s), R: avg(r) };
  }
  const band = (x) => Math.min(3, Math.floor(Math.max(0, Math.min(4, x))));
  function zoneFromCoords(S, R) {
    const letter = ["A", "B", "C", "D"][band(S)];
    const number = band(R) + 1;
    return { code: `${letter}${number}` };
  }

  // Data: traits + focus
  async function fetchJSON(url) {
    const bust = `__t=${Date.now()}`;
    const res = await fetch(`${url}${url.includes("?")?"&":"?"}${bust}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch failed: ${url}`);
    return res.json();
  }

  function normalizeZone(raw) {
    if (!raw || typeof raw !== "object") return null;
    const code = raw.code || raw.id || raw.zone; if (!code) return null;
    return {
      code,
      title: raw.title || `Zone ${code}`,
      styleText: raw.style || "",
      voiceText: raw.voice || "",
      traits: Array.isArray(raw.traits) ? raw.traits : [],
      summary: raw.summary || "",
      collabText: raw.collaboration || "",
      prompt: raw.prompt || "",
      badge: raw.badge || ""
    };
  }

  async function loadTraits() {
    try {
      const data = await fetchJSON("data/traits.json");
      const arr = Array.isArray(data?.zones) ? data.zones : Array.isArray(data) ? data : [];
      const normed = arr.map(normalizeZone).filter(Boolean);
      const all = ["A","B","C","D"].flatMap(L => ["1","2","3","4"].map(N => `${L}${N}`));
      const map = new Map(normed.map(z => [z.code, z]));
      for (const code of all) if (!map.has(code)) {
        const L = code[0], N = Number(code[1]);
        map.set(code, {
          code, title: `Zone ${code}`,
          styleText: L <= "B" ? "Structured, concise, pragmatic." : "Conversational, example-led, empathetic.",
          voiceText: N >= 3 ? "Warm, engaging, collaborative." : "Neutral, objective, focused.",
          traits: ["Clear","Relevant","Grounded","Kind"],
          summary: "", collabText: "", prompt: "", badge: ""
        });
      }
      window.TDS_ZONES = Array.from(map.values());
    } catch { window.TDS_ZONES = []; }
  }

  async function loadFocusPersonas() {
    try {
      const data = await fetchJSON("data/focus_personas.json");
      const arr = Array.isArray(data) ? data : (data.focus_personas || []);
      window.FOCUS_PERSONAS = arr.length ? arr : [ fallbackFocus() ];
    } catch { window.FOCUS_PERSONAS = [ fallbackFocus() ]; }
  }

  function fallbackFocus() {
    return { id:"general", name:"General Collaborator", desc:"Balanced default style for everyday collaboration.", traits:["Friendly","Clear","Curious"], prompt_hint:"Keep structure practical and tone warm." };
  }

  function selectZoneTraits(code) {
    return window.TDS_ZONES.find(z => z.code === code) || (function(){
      const L = code?.[0] || "B"; const N = Number(code?.[1] || 2);
      return { code, title:`Zone ${code}`, styleText: L<="B"?"Structured, concise, pragmatic.":"Conversational, example-led, empathetic.", voiceText: N>=3?"Warm, engaging, collaborative.":"Neutral, objective, focused.", traits:["Clear","Relevant","Grounded","Kind"], summary:"", collabText:"", prompt:"", badge:"" };
    })();
  }
  window.selectZoneTraits = selectZoneTraits;

  function renderFocusOptions() {
    const sel = $("focus-select"); if (!sel) return;
    const list = Array.isArray(window.FOCUS_PERSONAS) && window.FOCUS_PERSONAS.length ? window.FOCUS_PERSONAS : [fallbackFocus()];
    sel.innerHTML = "";
    for (const p of list) {
      const opt = document.createElement("option"); opt.value = p.id || p.name || "general"; opt.textContent = p.name || p.id; sel.appendChild(opt);
    }
  }

  function buildPrompt(zone, focus) {
    if (!zone) {
      return "";
    }
    const parts = [];

    if (zone.prompt && zone.prompt.trim()) {
      parts.push(zone.prompt.trim());
    } else {
      parts.push("You are an AI collaborator supporting someone with this communication style. Respond in a way that fits their preferred level of structure and relational warmth.");
    }

    if (focus && focus.name) {
      const focusDesc = (focus.description && focus.description.trim())
        ? focus.description.trim()
        : "a helpful collaborator in this area.";
      parts.push(
        `For this session, lean into a “${focus.name}” role: ${focusDesc}`
      );
    }

    if (focus && focus.suffix) {
      parts.push(focus.suffix.trim());
    }

    parts.push(
      "Treat this description as a guideline for the user’s preferred communication style, not a strict script. Adjust your tone, pacing, and level of detail whenever it would help with clarity, accuracy, or emotional care."
    );

    return parts.join("\n\n");
  }


  function updatePromptWithFocus() {
    if (!window.CURRENT_ZONE) return;
    const sel = $("focus-select"); const id = sel?.value;
    const focus = (window.FOCUS_PERSONAS || []).find(x => (x.id || x.name) === id) || window.FOCUS_PERSONAS[0] || fallbackFocus();
    const box = $("prompt-box"); const desc = $("focus-desc");
    if (desc) desc.textContent = focus?.desc || "";
    if (box) box.textContent = buildPrompt(window.CURRENT_ZONE, focus);
  }
  window.updatePromptWithFocus = updatePromptWithFocus;

  function coordsLabel(S,R){ return `S: ${S.toFixed(2)} · R: ${R.toFixed(2)}`; }

  function displayZoneAndPrompt(zone, S, R) {
    window.CURRENT_S = S; window.CURRENT_R = R; window.CURRENT_ZONE = zone;

    // Inline card (safe if elements don’t exist)
    const zoneTag = $("results-zone"); if (zoneTag) zoneTag.textContent = zone.code;
    const coords = $("results-coords"); if (coords) coords.textContent = coordsLabel(S, R);
    const badge = $("results-badge"); if (badge) badge.textContent = zone.badge || `Zone ${zone.code}`;
    const badgeImg = $("badge-img"); if (badgeImg) { badgeImg.src = `assets/badges/${zone.code}.svg`; badgeImg.alt = zone.badge || zone.title || zone.code; }
    const title = $("persona-current-summary"); if (title) title.textContent = zone.title || `Zone ${zone.code}`;
    const summaryEl = $("summary-text"); if (summaryEl) summaryEl.textContent = zone.summary || "";
    const styleText = $("style-text"); if (styleText) styleText.textContent = zone.styleText || "";
    const voiceText = $("voice-text"); if (voiceText) voiceText.textContent = zone.voiceText || "";
    const collabText = $("collab-text"); if (collabText) collabText.textContent = zone.collabText || "";
    const traitsList = $("traits-list");
    if (traitsList) { traitsList.innerHTML = ""; (zone.traits || []).slice(0, 12).forEach(t => { const li = document.createElement("li"); li.textContent = t; traitsList.appendChild(li); }); }

    renderFocusOptions(); updatePromptWithFocus();

    const useDrawer = window.USE_DRAWER_RESULTS === true;
    const results = $("results");
    if (results) {
      if (useDrawer) results.setAttribute("hidden", "");
      else { results.removeAttribute("hidden"); results.style.display = ""; try { if (!matchMedia("(prefers-reduced-motion: reduce)").matches) results.scrollIntoView({ behavior: "smooth", block: "start" }); } catch {} }
    }
    const err = $("form-error"); if (err) { err.textContent = ""; err.style.display = "none"; }

    const sel = $("focus-select");
    const focus = (window.FOCUS_PERSONAS || [])[sel ? sel.selectedIndex : -1] || window.FOCUS_PERSONAS[0] || fallbackFocus();
    const promptBoxText = $("prompt-box")?.textContent?.trim() || buildPrompt(zone, focus);

    try {
      document.dispatchEvent(new CustomEvent("tds:zone", {
        detail: {
          zone: zone.code, S, R,
          title: zone.title || `Zone ${zone.code}`,
          styleText: zone.styleText || "", voiceText: zone.voiceText || "",
          summary: zone.summary || "", collabText: zone.collabText || "",
          traits: (zone.traits || []).slice(0, 8),
          focus: focus?.name || focus?.id || "General",
          prompt: promptBoxText,
          badge: zone.badge || ""
        }
      }));
    } catch {}
  }
  window.displayZoneAndPrompt = displayZoneAndPrompt;

  function handleSubmit(e){
    e?.preventDefault?.();
    const ans = readAnswers();
    const missing = window.QUESTIONS.filter(q => !(q.id in ans));
    if (missing.length) { const err = $("form-error"); if (err) { err.textContent = "Please answer all questions."; err.style.display = "block"; } return; }
    const { S, R } = computeScores(ans);
    const { code } = zoneFromCoords(S, R);
    const zone = selectZoneTraits(code);
    displayZoneAndPrompt(zone, S, R);
  }

  function bindEvents() {
    const form = $("tds-form");
    if (form) {
      form.addEventListener("submit", handleSubmit);
      form.addEventListener("reset", () => { const err = $("form-error"); if (err) { err.textContent = ""; err.style.display = "none"; } const results = $("results"); if (results) results.setAttribute("hidden", ""); });
    }
    const sel = $("focus-select"); if (sel) sel.addEventListener("change", updatePromptWithFocus);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    renderQuestions(); bindEvents();
    await Promise.all([loadTraits(), loadFocusPersonas()]);
  });
})();