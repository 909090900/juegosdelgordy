"use strict";

/* =========================================================
   1. DATOS
   ========================================================= */
const POINTS_PER_HIT = 10;
const CHOICES_PER_QUESTION = 4;

const FAMILIES = {
  alkane:      { label: "alcano",      rule: "Solo enlaces sencillos. Fórmula general CₙH₂ₙ₊₂." },
  alkene:      { label: "alqueno",     rule: "Tiene un doble enlace C=C. Fórmula general CₙH₂ₙ." },
  alkyne:      { label: "alquino",     rule: "Tiene un triple enlace C≡C. Fórmula general CₙH₂ₙ₋₂." },
  cycloalkane: { label: "cicloalcano", rule: "Cadena cerrada en anillo con enlaces sencillos. Fórmula general CₙH₂ₙ." },
  aromatic:    { label: "aromático",   rule: "Anillo de seis carbonos con dobles enlaces alternados." },
};

/*
  Cómo se describe cada estructura:
  - chain: lista de órdenes de enlace (1, 2 o 3) y, opcionalmente,
           los índices de átomos que llevan un metilo (branches).
  - ring:  número de átomos, enlaces dobles (índice del enlace) y,
           opcionalmente, el átomo que lleva un metilo (substituent).
*/
const MOLECULES = [
  { name: "Etano",          formula: "C₂H₆",  family: "alkane", shape: { type: "chain", bonds: [1] } },
  { name: "Propano",        formula: "C₃H₈",  family: "alkane", shape: { type: "chain", bonds: [1, 1] } },
  { name: "Butano",         formula: "C₄H₁₀", family: "alkane", shape: { type: "chain", bonds: [1, 1, 1] } },
  { name: "Pentano",        formula: "C₅H₁₂", family: "alkane", shape: { type: "chain", bonds: [1, 1, 1, 1] } },
  { name: "Hexano",         formula: "C₆H₁₄", family: "alkane", shape: { type: "chain", bonds: [1, 1, 1, 1, 1] } },
  { name: "2-Metilpropano", formula: "C₄H₁₀", family: "alkane", shape: { type: "chain", bonds: [1, 1], branches: [1] } },
  { name: "2-Metilbutano",  formula: "C₅H₁₂", family: "alkane", shape: { type: "chain", bonds: [1, 1, 1], branches: [1] } },

  { name: "Eteno",          formula: "C₂H₄",  family: "alkene", shape: { type: "chain", bonds: [2] } },
  { name: "Propeno",        formula: "C₃H₆",  family: "alkene", shape: { type: "chain", bonds: [2, 1] } },
  { name: "1-Buteno",       formula: "C₄H₈",  family: "alkene", shape: { type: "chain", bonds: [2, 1, 1] } },
  { name: "2-Buteno",       formula: "C₄H₈",  family: "alkene", shape: { type: "chain", bonds: [1, 2, 1] } },
  { name: "1,3-Butadieno",  formula: "C₄H₆",  family: "alkene", shape: { type: "chain", bonds: [2, 1, 2] },
    rule: "Dieno: dos dobles enlaces C=C. Fórmula general CₙH₂ₙ₋₂." },

  { name: "Etino",          formula: "C₂H₂",  family: "alkyne", shape: { type: "chain", bonds: [3] } },
  { name: "Propino",        formula: "C₃H₄",  family: "alkyne", shape: { type: "chain", bonds: [3, 1] } },
  { name: "1-Butino",       formula: "C₄H₆",  family: "alkyne", shape: { type: "chain", bonds: [3, 1, 1] } },
  { name: "2-Butino",       formula: "C₄H₆",  family: "alkyne", shape: { type: "chain", bonds: [1, 3, 1] } },

  { name: "Ciclopropano",   formula: "C₃H₆",  family: "cycloalkane", shape: { type: "ring", n: 3 } },
  { name: "Ciclohexano",    formula: "C₆H₁₂", family: "cycloalkane", shape: { type: "ring", n: 6 } },

  { name: "Benceno",        formula: "C₆H₆",  family: "aromatic", shape: { type: "ring", n: 6, doubles: [0, 2, 4] } },
  { name: "Tolueno",        formula: "C₇H₈",  family: "aromatic", shape: { type: "ring", n: 6, doubles: [0, 2, 4], substituent: 3 } },
];

/* =========================================================
   2. ESTADO Y REFERENCIAS AL DOM
   ========================================================= */
const state = {
  deck: [],
  index: 0,
  score: 0,
  results: [],
  locked: false,
};

const $ = (id) => document.getElementById(id);

const els = {
  screens: { start: $("start"), game: $("game"), end: $("end") },
  track: $("track"),
  counter: $("counter"),
  score: $("score"),
  structure: $("structure"),
  toast: $("toast"),
  celebration: $("celebration"),
  drawing: $("drawing"),
  clue: $("clue"),
  options: $("options"),
  feedback: $("feedback"),
  next: $("next"),
  result: $("result"),
  review: $("review"),
};

/* =========================================================
   3. UTILIDADES
   ========================================================= */

// Fisher-Yates: mezcla uniforme
function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function showScreen(name) {
  for (const [key, el] of Object.entries(els.screens)) {
    el.hidden = key !== name;
  }
}

// Dos distractores de la misma familia (más difícil) y el resto al azar
function buildChoices(correct) {
  const others = MOLECULES.filter((m) => m !== correct);
  const sameFamily = shuffle(others.filter((m) => m.family === correct.family)).slice(0, 2);
  const rest = shuffle(others.filter((m) => !sameFamily.includes(m)));
  const distractors = [...sameFamily, ...rest].slice(0, CHOICES_PER_QUESTION - 1);
  return shuffle([correct, ...distractors]);
}

/* =========================================================
   4. GEOMETRÍA Y DIBUJO DE ESTRUCTURAS
   Todas las estructuras usan longitud de enlace = 1 y luego
   se escalan juntas para que se vean con el mismo tamaño.
   ========================================================= */
const VIEW = { w: 360, h: 170, pad: 22, maxBond: 44 };

function direction(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function chainGeometry({ bonds, branches = [] }) {
  const points = [{ x: 0, y: 0 }];
  const segments = [];
  let heading = Math.PI / 6;
  let turn = -Math.PI / 3;

  bonds.forEach((order, i) => {
    const from = points[i];
    const to = { x: from.x + Math.cos(heading), y: from.y + Math.sin(heading) };
    points.push(to);
    segments.push({ a: from, b: to, order });

    // Un carbono con triple enlace es lineal: la cadena no gira
    const stayStraight = order === 3 || bonds[i + 1] === 3;
    if (!stayStraight) {
      heading += turn;
      turn = -turn;
    }
  });

  // El metilo sale hacia el lado opuesto a sus vecinos
  branches.forEach((i) => {
    const here = points[i];
    const toPrev = direction(here, points[i - 1]);
    const toNext = direction(here, points[i + 1]);
    const out = direction({ x: 0, y: 0 }, { x: -(toPrev.x + toNext.x), y: -(toPrev.y + toNext.y) });
    segments.push({ a: here, b: { x: here.x + out.x, y: here.y + out.y }, order: 1 });
  });

  return segments;
}

function ringGeometry({ n, doubles = [], substituent = null }) {
  const radius = 1 / (2 * Math.sin(Math.PI / n)); // lado del polígono = 1
  const points = Array.from({ length: n }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
  });

  const segments = points.map((p, i) => ({
    a: p,
    b: points[(i + 1) % n],
    order: doubles.includes(i) ? 2 : 1,
  }));

  if (substituent !== null) {
    const p = points[substituent];
    const out = direction({ x: 0, y: 0 }, p);
    segments.push({ a: p, b: { x: p.x + out.x, y: p.y + out.y }, order: 1 });
  }
  return segments;
}

function svgLine(x1, y1, x2, y2) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("class", "bond");
  line.setAttribute("x1", x1.toFixed(1));
  line.setAttribute("y1", y1.toFixed(1));
  line.setAttribute("x2", x2.toFixed(1));
  line.setAttribute("y2", y2.toFixed(1));
  return line;
}

const BOND_OFFSETS = { 1: [0], 2: [-3.5, 3.5], 3: [-5.5, 0, 5.5] };

function drawStructure(shape) {
  const segments = shape.type === "ring" ? ringGeometry(shape) : chainGeometry(shape);

  const xs = segments.flatMap((s) => [s.a.x, s.b.x]);
  const ys = segments.flatMap((s) => [s.a.y, s.b.y]);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];

  const fitX = maxX > minX ? (VIEW.w - 2 * VIEW.pad) / (maxX - minX) : Infinity;
  const fitY = maxY > minY ? (VIEW.h - 2 * VIEW.pad) / (maxY - minY) : Infinity;
  const scale = Math.min(fitX, fitY, VIEW.maxBond);

  const offsetX = VIEW.w / 2 - ((minX + maxX) / 2) * scale;
  const offsetY = VIEW.h / 2 - ((minY + maxY) / 2) * scale;
  const px = (p) => ({ x: p.x * scale + offsetX, y: p.y * scale + offsetY });

  const lines = [];
  segments.forEach(({ a, b, order }) => {
    const A = px(a);
    const B = px(b);
    const d = direction(A, B);
    const normal = { x: -d.y, y: d.x };

    BOND_OFFSETS[order].forEach((o) => {
      lines.push(svgLine(A.x + normal.x * o, A.y + normal.y * o, B.x + normal.x * o, B.y + normal.y * o));
    });
  });

  els.drawing.replaceChildren(...lines);
}

/* =========================================================
   5. CELEBRACIÓN AL ACERTAR
   ========================================================= */
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");
const PRAISE = ["¡Felicidades!", "¡Muy bien!", "¡Exacto!", "¡Así se hace!"];
const CONFETTI_COUNT = 30;

function currentStreak() {
  let streak = 0;
  for (let i = state.results.length - 1; i >= 0 && state.results[i]; i--) streak++;
  return streak;
}

function showToast(text) {
  els.toast.textContent = text;
  const frames = REDUCED_MOTION.matches
    ? [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }]
    : [
        { opacity: 0, transform: "translate(-50%, 14px) scale(.8)" },
        { opacity: 1, transform: "translate(-50%, 0) scale(1.1)", offset: 0.2 },
        { opacity: 1, transform: "translate(-50%, 0) scale(1)", offset: 0.75 },
        { opacity: 0, transform: "translate(-50%, -10px) scale(1)" },
      ];
  els.toast.animate(frames, { duration: 1700, easing: "ease-out" });
}

function bumpScore() {
  els.score.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.6)" }, { transform: "scale(1)" }],
    { duration: 450, easing: "ease-out" }
  );
}

// Confeti con los colores de las cinco familias; algunas piezas son hexágonos (benceno)
function launchConfetti() {
  const styles = getComputedStyle(document.documentElement);
  const colors = Object.keys(FAMILIES).map((f) => styles.getPropertyValue(`--${f}`).trim());
  const rect = els.structure.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;

  for (let i = 0; i < CONFETTI_COUNT; i++) {
    const piece = document.createElement("span");
    const size = 8 + Math.random() * 8;
    piece.className = i % 3 === 0 ? "confetti hex" : "confetti";
    piece.style.cssText =
      `width:${size}px;height:${size}px;background:${colors[i % colors.length]};` +
      `left:${originX - size / 2}px;top:${originY - size / 2}px;`;

    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
    const distance = 90 + Math.random() * 150;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const spin = (Math.random() - 0.5) * 720;

    const animation = piece.animate(
      [
        { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx * 1.15}px, ${dy + 160}px) rotate(${spin}deg) scale(.6)`, opacity: 0 },
      ],
      { duration: 1100 + Math.random() * 600, easing: "cubic-bezier(.2,.7,.4,1)" }
    );
    animation.onfinish = () => piece.remove();
    els.celebration.appendChild(piece);
  }
}

function celebrate() {
  const streak = currentStreak();
  const praise = streak >= 3
    ? `¡Racha de ${streak}!`
    : PRAISE[Math.floor(Math.random() * PRAISE.length)];

  showToast(`${praise} +${POINTS_PER_HIT}`);
  bumpScore();
  if (!REDUCED_MOTION.matches) launchConfetti();
}

/* =========================================================
   6. RENDER
   ========================================================= */
function renderTrack() {
  [...els.track.children].forEach((li, i) => {
    if (i < state.results.length) li.className = state.results[i] ? "is-correct" : "is-wrong";
    else li.className = i === state.index ? "is-current" : "";
  });
}

function renderOption(molecule, position) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "option";
  btn.dataset.name = molecule.name;

  const key = document.createElement("span");
  key.className = "key";
  key.textContent = position + 1;

  const label = document.createElement("span");
  label.textContent = molecule.name;

  btn.append(key, label);
  return btn;
}

function renderQuestion() {
  const current = state.deck[state.index];
  state.locked = false;

  els.counter.textContent = `Pregunta ${state.index + 1} de ${state.deck.length}`;
  els.score.textContent = state.score;
  els.clue.textContent = `Fórmula molecular ${current.formula}. Cada vértice y cada extremo es un carbono.`;
  els.structure.removeAttribute("data-family");
  drawStructure(current.shape);

  els.options.replaceChildren(...buildChoices(current).map(renderOption));
  els.feedback.replaceChildren();
  els.next.hidden = true;
  renderTrack();
}

function renderFeedback(isRight, current) {
  const family = FAMILIES[current.family];

  const verdict = document.createElement("strong");
  verdict.className = isRight ? "ok" : "bad";
  verdict.textContent = isRight ? `Correcto, +${POINTS_PER_HIT} puntos` : `Era ${current.name}`;

  const detail = document.createElement("span");
  detail.textContent = `${current.name} es un ${family.label}. ${current.rule || family.rule}`;

  els.feedback.replaceChildren(verdict, detail);
}

function renderResults() {
  const total = state.deck.length;
  const hits = state.results.filter(Boolean).length;
  const percent = Math.round((hits / total) * 100);

  const verdict =
    percent >= 80 ? "Dominas la nomenclatura básica." :
    percent >= 50 ? "Buen resultado, falta repasar algunos." :
                    "Conviene repasar antes de otro intento.";

  els.result.textContent =
    `${verdict} Acertaste ${hits} de ${total} (${percent}%) y sumaste ${state.score} puntos.`;

  const missed = state.deck.filter((_, i) => !state.results[i]).map((m) => m.name);
  els.review.textContent = missed.length
    ? `Para repasar: ${missed.join(", ")}.`
    : "No fallaste ninguno.";

  showScreen("end");
}

/* =========================================================
   7. FLUJO DEL JUEGO
   ========================================================= */
function startGame() {
  state.deck = shuffle(MOLECULES);
  state.index = 0;
  state.score = 0;
  state.results = [];

  els.track.style.setProperty("--n", state.deck.length);
  els.track.replaceChildren(...state.deck.map(() => document.createElement("li")));
  showScreen("game");
  renderQuestion();
}

function submitAnswer(chosenBtn) {
  if (state.locked) return;
  state.locked = true;

  const current = state.deck[state.index];
  const isRight = chosenBtn.dataset.name === current.name;

  els.options.querySelectorAll(".option").forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.name === current.name) btn.classList.add("is-correct");
    else if (btn === chosenBtn) btn.classList.add("is-wrong");
  });

  state.results.push(isRight);
  if (isRight) state.score += POINTS_PER_HIT;

  els.structure.dataset.family = current.family;
  els.score.textContent = state.score;
  renderFeedback(isRight, current);
  renderTrack();
  if (isRight) celebrate();

  const isLast = state.index === state.deck.length - 1;
  els.next.textContent = isLast ? "Ver resultado" : "Siguiente pregunta";
  els.next.hidden = false;
  els.next.focus();
}

function nextQuestion() {
  state.index++;
  if (state.index < state.deck.length) renderQuestion();
  else renderResults();
}

/* =========================================================
   8. EVENTOS
   ========================================================= */
$("startBtn").addEventListener("click", startGame);
$("restartBtn").addEventListener("click", startGame);
els.next.addEventListener("click", nextQuestion);

els.options.addEventListener("click", (event) => {
  const btn = event.target.closest(".option");
  if (btn) submitAnswer(btn);
});

document.addEventListener("keydown", (event) => {
  if (els.screens.game.hidden || state.locked) return;
  const n = Number(event.key);
  if (n >= 1 && n <= CHOICES_PER_QUESTION) els.options.children[n - 1]?.click();
});
