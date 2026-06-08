/* ============================================================
   Spanish Vocabulary Practice
   Dependency-free. State persists in the browser's localStorage.
   ============================================================ */

(() => {
  "use strict";

  const STORAGE_KEY = "spanish-practice.words.v1";

  /* Leitner-style mastery: each word has a level 0..MAX_LEVEL.
     Correct answer => +1, incorrect => -1. A word is "mastered"
     once it reaches MASTER_LEVEL. "Needs work" = below MASTER_LEVEL. */
  const MAX_LEVEL = 5;
  const MASTER_LEVEL = 5;

  /* Accented characters not on a standard English keyboard, bound to 1-6. */
  const ACCENTS = [
    { key: "1", ch: "á" },
    { key: "2", ch: "é" },
    { key: "3", ch: "í" },
    { key: "4", ch: "ó" },
    { key: "5", ch: "ú" },
    { key: "6", ch: "ñ" },
  ];

  const QUESTIONS_PER_SESSION = 12;
  const MC_OPTION_COUNT = 5;

  /* ---------------- State ---------------- */
  let words = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(normalizeWord) : [];
    } catch (e) {
      console.error("Failed to load saved words:", e);
      return [];
    }
  }

  function normalizeWord(w) {
    return {
      id: w.id || uid(),
      spanish: String(w.spanish || "").trim(),
      english: String(w.english || "").trim(),
      level: clamp(Number(w.level) || 0, 0, MAX_LEVEL),
      seen: Number(w.seen) || 0,
      correct: Number(w.correct) || 0,
      created: w.created || Date.now(),
      lastPracticed: w.lastPracticed || null,
    };
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
    } catch (e) {
      console.error("Failed to save words:", e);
      alert("Could not save to local storage. Your changes may be lost.");
    }
  }

  /* ---------------- Helpers ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  const norm = (s) => s.toLowerCase().trim().replace(/\s+/g, " ");
  const stripAccents = (s) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  /* Split a field into acceptable variants on "/" or "," */
  const variants = (s) =>
    s.split(/[/,]/).map((v) => norm(v)).filter(Boolean);

  function isMastered(w) { return w.level >= MASTER_LEVEL; }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* Weighted pick favoring weaker words (lower level => higher weight). */
  function weightedPick(pool, excludeId) {
    const candidates = pool.filter((w) => w.id !== excludeId);
    if (!candidates.length) return null;
    const weights = candidates.map((w) => (MAX_LEVEL - w.level) + 1);
    let total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i];
      if (r <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }

  function recordResult(word, wasCorrect) {
    word.seen += 1;
    word.lastPracticed = Date.now();
    if (wasCorrect) {
      word.correct += 1;
      word.level = clamp(word.level + 1, 0, MAX_LEVEL);
    } else {
      word.level = clamp(word.level - 1, 0, MAX_LEVEL);
    }
    save();
  }

  /* Insert text at the cursor position of an input. */
  function insertAtCursor(input, text) {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, start) + text + input.value.slice(end);
    const pos = start + text.length;
    input.setSelectionRange(pos, pos);
    input.focus();
  }

  /* Build the row of accent shortcut buttons for a given target input. */
  function buildAccentKeys(container, targetInput) {
    container.innerHTML = "";
    ACCENTS.forEach(({ key, ch }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "accent-key";
      btn.innerHTML = `<span class="num">${key}</span>${ch}`;
      btn.title = `Insert ${ch} (press ${key})`;
      btn.addEventListener("click", () => insertAtCursor(targetInput, ch));
      container.appendChild(btn);
    });
  }

  /* When focused in `input`, pressing 1-6 inserts the accented letter
     instead of the digit (Spanish words never contain digits). */
  function enableAccentDigits(input) {
    input.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const match = ACCENTS.find((a) => a.key === e.key);
      if (match) {
        e.preventDefault();
        insertAtCursor(input, match.ch);
      }
    });
  }

  /* ============================================================
     TABS
     ============================================================ */
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.dataset.tab;
      $$(".tab").forEach((t) => t.classList.toggle("active", t === tab));
      $$(".panel").forEach((p) => p.classList.toggle("active", p.id === name));
      if (name === "bank") renderWordList();
      if (name === "stats") renderStats();
      if (name === "practice") updateSetupSummary();
    });
  });

  /* ============================================================
     WORD BANK
     ============================================================ */
  const addForm = $("#add-form");
  const addSpanish = $("#add-spanish");
  const addEnglish = $("#add-english");
  const searchInput = $("#search");

  buildAccentKeys($("#add-accent-keys"), addSpanish);
  enableAccentDigits(addSpanish);

  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const spanish = addSpanish.value.trim();
    const english = addEnglish.value.trim();
    if (!spanish || !english) return;

    // Merge if the Spanish word already exists.
    const existing = words.find((w) => norm(w.spanish) === norm(spanish));
    if (existing) {
      existing.english = english;
      flash(`Updated “${spanish}”.`);
    } else {
      words.push(normalizeWord({ spanish, english }));
      flash(`Added “${spanish}”.`);
    }
    save();
    addForm.reset();
    addSpanish.focus();
    renderWordList();
    updateSetupSummary();
  });

  let flashTimer = null;
  function flash(msg) {
    let el = $("#flash");
    if (!el) {
      el = document.createElement("p");
      el.id = "flash";
      el.className = "hint muted";
      addForm.appendChild(el);
    }
    el.textContent = msg;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { el.textContent = ""; }, 2500);
  }

  searchInput.addEventListener("input", renderWordList);

  function renderWordList() {
    const list = $("#word-list");
    const q = norm(searchInput.value);
    $("#word-count").textContent = words.length;

    if (!words.length) {
      list.innerHTML = `<p class="empty">No words yet. Add some above to get started!</p>`;
      return;
    }

    const filtered = words
      .filter((w) => !q || norm(w.spanish).includes(q) || norm(w.english).includes(q))
      .sort((a, b) => a.level - b.level || a.spanish.localeCompare(b.spanish));

    if (!filtered.length) {
      list.innerHTML = `<p class="empty">No words match “${escapeHtml(searchInput.value)}”.</p>`;
      return;
    }

    list.innerHTML = "";
    filtered.forEach((w) => {
      const row = document.createElement("div");
      row.className = "word-row";

      const badge = isMastered(w)
        ? `<span class="badge mastered">Mastered</span>`
        : w.seen === 0
        ? `<span class="badge new">New</span>`
        : `<span class="badge learning">Learning</span>`;

      const pips = Array.from({ length: MAX_LEVEL }, (_, i) =>
        `<span class="pip ${i < w.level ? "on" : ""}"></span>`).join("");

      row.innerHTML = `
        <div class="word-main">
          <div class="word-es">${escapeHtml(w.spanish)}</div>
          <div class="word-en">${escapeHtml(w.english)}</div>
        </div>
        <div class="word-meta">
          <span class="level-pips" title="Level ${w.level}/${MAX_LEVEL}">${pips}</span>
          ${badge}
          <button class="icon-btn" data-act="edit" title="Edit">✎</button>
          <button class="icon-btn" data-act="del" title="Delete">🗑</button>
        </div>`;

      $('[data-act="edit"]', row).addEventListener("click", () => editWord(w.id));
      $('[data-act="del"]', row).addEventListener("click", () => deleteWord(w.id));
      list.appendChild(row);
    });
  }

  function editWord(id) {
    const w = words.find((x) => x.id === id);
    if (!w) return;
    const newEs = prompt("Spanish:", w.spanish);
    if (newEs === null) return;
    const newEn = prompt("English:", w.english);
    if (newEn === null) return;
    w.spanish = newEs.trim() || w.spanish;
    w.english = newEn.trim() || w.english;
    save();
    renderWordList();
  }

  function deleteWord(id) {
    const w = words.find((x) => x.id === id);
    if (!w) return;
    if (!confirm(`Delete “${w.spanish}”?`)) return;
    words = words.filter((x) => x.id !== id);
    save();
    renderWordList();
    updateSetupSummary();
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ---------------- Export / Import ---------------- */
  $("#export-btn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(words, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `spanish-words-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  $("#import-btn").addEventListener("click", () => $("#import-file").click());
  $("#import-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!Array.isArray(imported)) throw new Error("Not a list of words");
        let added = 0, updated = 0;
        imported.forEach((raw) => {
          const w = normalizeWord(raw);
          if (!w.spanish || !w.english) return;
          const existing = words.find((x) => norm(x.spanish) === norm(w.spanish));
          if (existing) {
            // Keep the higher progress of the two.
            existing.english = w.english;
            existing.level = Math.max(existing.level, w.level);
            existing.seen = Math.max(existing.seen, w.seen);
            existing.correct = Math.max(existing.correct, w.correct);
            updated++;
          } else {
            words.push(w);
            added++;
          }
        });
        save();
        renderWordList();
        updateSetupSummary();
        alert(`Import complete: ${added} added, ${updated} updated.`);
      } catch (err) {
        alert("Could not import that file: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  /* ============================================================
     PRACTICE SETUP
     ============================================================ */
  let chosenMode = "mc";   // "mc" | "fr"
  let chosenScope = "needs"; // "needs" | "all"

  $$("#mode-choices .choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      chosenMode = btn.dataset.mode;
      $$("#mode-choices .choice").forEach((b) => b.classList.toggle("selected", b === btn));
      updateSetupSummary();
    });
  });
  $$("#scope-choices .choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      chosenScope = btn.dataset.scope;
      $$("#scope-choices .choice").forEach((b) => b.classList.toggle("selected", b === btn));
      updateSetupSummary();
    });
  });

  function poolFor(scope) {
    if (scope === "all") return words.slice();
    return words.filter((w) => !isMastered(w));
  }

  function updateSetupSummary() {
    const summary = $("#setup-summary");
    const startBtn = $("#start-btn");
    const total = words.length;
    const needs = words.filter((w) => !isMastered(w)).length;
    const pool = poolFor(chosenScope);

    if (total === 0) {
      summary.textContent = "Your word bank is empty — add some words first.";
      startBtn.disabled = true;
      return;
    }
    if (chosenMode === "mc" && total < 2) {
      summary.textContent = "Multiple choice needs at least 2 words. Add more, or try free response.";
      startBtn.disabled = true;
      return;
    }
    if (pool.length === 0) {
      summary.textContent = "🎉 You've mastered every word! Switch to “All words” to keep them sharp.";
      startBtn.disabled = true;
      return;
    }
    startBtn.disabled = false;
    summary.textContent =
      `${total} word${total === 1 ? "" : "s"} total · ${needs} need work · ` +
      `this session draws from ${pool.length}.`;
  }

  $("#start-btn").addEventListener("click", startSession);
  $("#again-btn").addEventListener("click", () => {
    showPracticeScreen("setup");
    updateSetupSummary();
  });
  $("#end-session").addEventListener("click", () => {
    if (confirm("End this session?")) finishSession();
  });

  function showPracticeScreen(which) {
    $("#practice-setup").classList.toggle("hidden", which !== "setup");
    $("#practice-active").classList.toggle("hidden", which !== "active");
    $("#practice-results").classList.toggle("hidden", which !== "results");
  }

  /* ============================================================
     PRACTICE SESSION ENGINE
     ============================================================ */
  let session = null;

  function startSession() {
    const pool = poolFor(chosenScope);
    if (!pool.length) { updateSetupSummary(); return; }

    const count = Math.min(QUESTIONS_PER_SESSION, Math.max(pool.length, 1));
    session = {
      mode: chosenMode,
      pool,
      total: count,
      asked: 0,
      correct: 0,
      missed: [],   // words answered incorrectly
      current: null,
      answered: false,
    };
    showPracticeScreen("active");
    nextQuestion();
  }

  function nextQuestion() {
    if (session.asked >= session.total) { finishSession(); return; }
    session.asked += 1;
    session.answered = false;
    session.current = weightedPick(session.pool, session.current?.id) || session.pool[0];

    $("#session-progress").textContent = `Question ${session.asked} of ${session.total}`;
    $("#feedback").classList.add("hidden");

    if (session.mode === "mc") renderMC();
    else renderFR();
  }

  /* ---------------- Multiple choice (ES -> EN) ---------------- */
  function renderMC() {
    const w = session.current;
    $("#prompt-label").textContent = "What does this mean?";
    $("#prompt-word").textContent = w.spanish;
    $("#mc-options").classList.remove("hidden");
    $("#fr-area").classList.add("hidden");

    // Build distractor options from other words' English meanings.
    const others = shuffle(words.filter((x) => x.id !== w.id && norm(x.english) !== norm(w.english)));
    const distractors = [];
    const usedMeanings = new Set([norm(w.english)]);
    for (const o of others) {
      if (usedMeanings.has(norm(o.english))) continue;
      usedMeanings.add(norm(o.english));
      distractors.push(o.english);
      if (distractors.length >= MC_OPTION_COUNT - 1) break;
    }
    const options = shuffle([w.english, ...distractors]);

    const box = $("#mc-options");
    box.innerHTML = "";
    options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "mc-option";
      btn.type = "button";
      btn.dataset.value = opt;
      btn.innerHTML = `<span class="keycap">${i + 1}</span><span>${escapeHtml(opt)}</span>`;
      btn.addEventListener("click", () => answerMC(btn, opt));
      box.appendChild(btn);
    });
  }

  function answerMC(btn, value) {
    if (session.answered) return;
    session.answered = true;
    const w = session.current;
    const correct = norm(value) === norm(w.english);

    $$("#mc-options .mc-option").forEach((b) => {
      b.disabled = true;
      if (norm(b.dataset.value) === norm(w.english)) b.classList.add("correct");
    });
    if (!correct) btn.classList.add("wrong");

    finishAnswer(correct, w.english);
  }

  /* ---------------- Free response (EN -> ES) ---------------- */
  const frInput = $("#fr-input");
  buildAccentKeys($("#accent-keys"), frInput);
  enableAccentDigits(frInput);

  function renderFR() {
    const w = session.current;
    $("#prompt-label").textContent = "Type the Spanish for:";
    $("#prompt-word").textContent = w.english;
    $("#mc-options").classList.add("hidden");
    $("#fr-area").classList.remove("hidden");
    frInput.value = "";
    frInput.disabled = false;
    $("#fr-submit").disabled = false;
    setTimeout(() => frInput.focus(), 0);
  }

  function submitFR() {
    if (session.answered) return;
    const w = session.current;
    const user = norm(frInput.value);
    if (!user) return;

    const accepted = variants(w.spanish);
    const exact = accepted.includes(user);
    const accentOnly = !exact && accepted.some((a) => stripAccents(a) === stripAccents(user));

    session.answered = true;
    frInput.disabled = true;
    $("#fr-submit").disabled = true;

    // An accent-only mistake counts as incorrect but gets a gentler message.
    finishAnswer(exact, w.spanish, accentOnly && !exact ? "accent" : null);
  }

  $("#fr-submit").addEventListener("click", submitFR);
  frInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); submitFR(); }
  });

  /* ---------------- Shared answer handling ---------------- */
  function finishAnswer(correct, correctAnswer, special) {
    recordResult(session.current, correct);
    if (correct) session.correct += 1;
    else session.missed.push(session.current);

    const fb = $("#feedback");
    const fbText = $("#feedback-text");
    fb.classList.remove("hidden", "good", "bad", "warn");

    if (correct) {
      fb.classList.add("good");
      fbText.innerHTML = `<span class="big-verdict good-txt">¡Correcto! ✓</span>`;
    } else if (special === "accent") {
      fb.classList.add("warn");
      fbText.innerHTML =
        `<span class="big-verdict warn-txt">So close — check the accents.</span>` +
        `<div>Correct spelling: <span class="answer">${escapeHtml(correctAnswer)}</span></div>`;
    } else {
      fb.classList.add("bad");
      fbText.innerHTML =
        `<span class="big-verdict bad-txt">Not quite.</span>` +
        `<div>Answer: <span class="answer">${escapeHtml(correctAnswer)}</span></div>`;
    }

    const nextBtn = $("#next-btn");
    nextBtn.textContent = session.asked >= session.total ? "See results →" : "Next →";
    setTimeout(() => nextBtn.focus(), 0);
  }

  $("#next-btn").addEventListener("click", () => nextQuestion());

  /* Global keyboard shortcuts during active practice. */
  document.addEventListener("keydown", (e) => {
    if ($("#practice-active").classList.contains("hidden")) return;
    if (!session) return;

    // Advance with Enter when feedback is showing.
    if (session.answered && (e.key === "Enter")) {
      e.preventDefault();
      nextQuestion();
      return;
    }
    // Multiple-choice number keys 1-5 select an option.
    if (session.mode === "mc" && !session.answered) {
      const idx = parseInt(e.key, 10);
      if (idx >= 1 && idx <= MC_OPTION_COUNT) {
        const btn = $$("#mc-options .mc-option")[idx - 1];
        if (btn) { e.preventDefault(); btn.click(); }
      }
    }
  });

  function finishSession() {
    const fb = $("#feedback");
    fb.classList.add("hidden");
    const total = session.asked - (session.answered ? 0 : 1);
    const answered = session.answered ? session.asked : session.asked - 1;
    const pct = answered > 0 ? Math.round((session.correct / answered) * 100) : 0;

    $("#results-text").innerHTML =
      `You got <strong>${session.correct}</strong> of <strong>${answered}</strong> correct (${pct}%).`;

    const detail = $("#results-detail");
    if (session.missed.length) {
      const unique = [...new Map(session.missed.map((w) => [w.id, w])).values()];
      detail.innerHTML =
        `<p class="muted">Words to review:</p>` +
        unique.map((w) =>
          `<div class="result-row"><span><strong>${escapeHtml(w.spanish)}</strong></span>` +
          `<span class="muted">${escapeHtml(w.english)}</span></div>`).join("");
    } else if (answered > 0) {
      detail.innerHTML = `<p class="muted">Perfect run — every answer correct! 🌟</p>`;
    } else {
      detail.innerHTML = "";
    }

    session = null;
    showPracticeScreen("results");
  }

  /* ============================================================
     STATS
     ============================================================ */
  function renderStats() {
    const total = words.length;
    const mastered = words.filter(isMastered).length;
    const learning = words.filter((w) => w.seen > 0 && !isMastered(w)).length;
    const fresh = words.filter((w) => w.seen === 0).length;
    const totalReviews = words.reduce((a, w) => a + w.seen, 0);

    $("#stat-grid").innerHTML = [
      ["Total words", total],
      ["Mastered", mastered],
      ["Learning", learning],
      ["Not started", fresh],
      ["Total reviews", totalReviews],
    ].map(([label, num]) =>
      `<div class="stat-box"><div class="stat-num">${num}</div>` +
      `<div class="stat-label">${label}</div></div>`).join("");

    const masteryList = $("#mastery-list");
    if (!total) {
      masteryList.innerHTML = `<p class="empty">No data yet — add words and practice to see your progress.</p>`;
      return;
    }
    // Distribution of words across levels 0..MAX_LEVEL.
    const buckets = Array.from({ length: MAX_LEVEL + 1 }, () => 0);
    words.forEach((w) => buckets[w.level]++);
    masteryList.innerHTML = buckets.map((count, lvl) => {
      const pct = total ? Math.round((count / total) * 100) : 0;
      const label = lvl === 0 ? "Level 0 (new / struggling)"
        : lvl === MASTER_LEVEL ? `Level ${lvl} (mastered)`
        : `Level ${lvl}`;
      return `<div class="mastery-row">
          <div class="ml-top"><span>${label}</span><span class="muted">${count}</span></div>
          <div class="bar"><span style="width:${pct}%"></span></div>
        </div>`;
    }).join("");
  }

  /* ============================================================
     INIT
     ============================================================ */
  renderWordList();
  updateSetupSummary();
})();
