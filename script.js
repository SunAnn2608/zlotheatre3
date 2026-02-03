/* =========================
   Scene refs
========================= */
const sceneCurtain = document.getElementById("sceneCurtain");
const sceneCen1    = document.getElementById("sceneCen1");
const sceneCen2    = document.getElementById("sceneCen2");
const sceneCen3    = document.getElementById("sceneCen3");
const sceneCen4    = document.getElementById("sceneCen4");
const sceneCen5    = document.getElementById("sceneCen5");
const sceneCen6    = document.getElementById("sceneCen6");
const sceneCen7    = document.getElementById("sceneCen7");
const sceneCen8    = document.getElementById("sceneCen8");
const sceneCen9    = document.getElementById("sceneCen9");
const sceneCen10   = document.getElementById("sceneCen10");
const sceneCen11   = document.getElementById("sceneCen11");

const choiceYes = document.getElementById("choiceYes");
const choiceNo  = document.getElementById("choiceNo");
const panelText = document.getElementById("panelText");

const cen1Next      = document.getElementById("cen1Next");
const btnGo         = document.getElementById("btnGo");
const btnApproach   = document.getElementById("btnApproach");
const btnKnock      = document.getElementById("btnKnock");
const cen4WindowImg = document.getElementById("cen4WindowImg");

const cen5Panel       = document.getElementById("cen5Panel");
const cen5PanelClose  = document.getElementById("cen5PanelClose");
const btnGameWindow   = document.getElementById("btnGameWindow");
const btnGameBucket   = document.getElementById("btnGameBucket");

const gameOverlay     = document.getElementById("gameOverlay");
const gameOverlayImg  = document.getElementById("gameOverlayImg");
const gameClose       = document.getElementById("gameClose");

/* cen6-8 */
const cen6Next = document.getElementById("cen6Next");
const cen7Next = document.getElementById("cen7Next");
const cen8Panel = document.getElementById("cen8Panel");
const cen8HidePanel = document.getElementById("cen8HidePanel");

/* cen8 letter ui */
const btnTakeLetter = document.getElementById("btnTakeLetter");
const letterOverlay = document.getElementById("letterOverlay");
const letterYes = document.getElementById("letterYes");
const letterNo  = document.getElementById("letterNo");

/* cen9 */
const btnLeft  = document.getElementById("btnLeft");
const btnRight = document.getElementById("btnRight");

/* restart */
const btnRestart10 = document.getElementById("btnRestart10");
const btnRestart11 = document.getElementById("btnRestart11");

/* =========================
   Global state
========================= */
let locked = false;
let toCen1Timer = null;
let cen5ReadyAt = 0;

/* =========================
   Helpers
========================= */
const allScenes = [
  sceneCurtain, sceneCen1, sceneCen2, sceneCen3, sceneCen4, sceneCen5,
  sceneCen6, sceneCen7, sceneCen8, sceneCen9, sceneCen10, sceneCen11
].filter(Boolean);

function showScene(target) {
  for (const s of allScenes) s.hidden = true;
  if (target) target.hidden = false;
}

function goToCurtain(){
  locked = false;
  if (toCen1Timer) { clearTimeout(toCen1Timer); toCen1Timer = null; }
  showScene(sceneCurtain);
}

function goToCen1() {
  if (toCen1Timer) { clearTimeout(toCen1Timer); toCen1Timer = null; }
  showScene(sceneCen1);
}
function goToCen2(){ showScene(sceneCen2); }
function goToCen3(){ showScene(sceneCen3); }
function goToCen4(){ showScene(sceneCen4); }
function goToCen5(){ showScene(sceneCen5); markCen5Entered(); }

function goToCen6(){ showScene(sceneCen6); }
function goToCen7(){ showScene(sceneCen7); }
function goToCen8(){ showScene(sceneCen8); resetCen8UI(); }

function goToCen9(){ showScene(sceneCen9); }
function goToCen10(){ showScene(sceneCen10); }
function goToCen11(){ showScene(sceneCen11); }

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

/* =========================
   Overlay assets
========================= */
const GAME1_SRC = "images/backgame1.png";
const GAME2_SRC = "images/backgame2.png";

const SPIDER1_SRC = "images/spider-1.png";
const SPIDER2_SRC = "images/spider-2.png";

const FACE_SRC = "images/face.png";
const KEY_SRC  = "images/key.png";

/* preload */
(function preload() {
  const assets = [GAME1_SRC, GAME2_SRC, SPIDER1_SRC, SPIDER2_SRC, FACE_SRC, KEY_SRC, "images/letter.png"];
  for (const src of assets) { const img = new Image(); img.src = src; }
})();

/* =========================
   Utility: drawn rect for object-fit: contain
========================= */
function getDrawnImageRect() {
  const nw = gameOverlayImg.naturalWidth;
  const nh = gameOverlayImg.naturalHeight;
  if (!nw || !nh) return null;

  const imgRect = gameOverlayImg.getBoundingClientRect();
  if (imgRect.width < 2 || imgRect.height < 2) return null;

  const ovr = gameOverlay.getBoundingClientRect();

  const imgAR = nw / nh;
  const boxAR = imgRect.width / imgRect.height;

  let drawW, drawH, offX, offY;

  if (boxAR > imgAR) {
    drawH = imgRect.height;
    drawW = drawH * imgAR;
    offX = (imgRect.width - drawW) / 2;
    offY = 0;
  } else {
    drawW = imgRect.width;
    drawH = drawW / imgAR;
    offX = 0;
    offY = (imgRect.height - drawH) / 2;
  }

  return {
    x: (imgRect.left - ovr.left) + offX,
    y: (imgRect.top  - ovr.top)  + offY,
    w: drawW,
    h: drawH
  };
}

/* =========================
   Game #1: spiders (backgame1) — SPEED x3
========================= */
const game1 = (() => {
  let running = false;
  let rafId = null;
  let lastTs = 0;

  let layer = null;
  let label = null;
  let hint = null;
  let spiders = [];

  let mouseX = -9999;
  let mouseY = -9999;
  let field = { x: 0, y: 0, w: 0, h: 0 };

  // ✅ ускорили в ~3 раза
  const cfg = {
    fleeRadius: 220,
    fleeStrength: 2700,   // было 900
    wanderStrength: 135,  // было 45
    maxSpeed: 660,        // было 220
    damping: 0.94
  };

  function ensureLayer() {
    if (layer) return;

    layer = document.createElement("div");
    layer.id = "game1Layer";
    layer.style.position = "absolute";
    layer.style.inset = "0";
    layer.style.zIndex = "2002";
    layer.style.pointerEvents = "none";
    gameOverlay.appendChild(layer);

    label = document.createElement("div");
    label.textContent = "ЗДЕСЬ НИЧЕГО НЕТ";
    label.style.position = "absolute";
    label.style.fontFamily = '"Blackcraft", system-ui, sans-serif';
    label.style.fontSize = "64px";
    label.style.lineHeight = "1";
    label.style.color = "rgba(255,255,255,0.95)";
    label.style.textShadow = "0 6px 30px rgba(0,0,0,0.75)";
    label.style.letterSpacing = "1px";
    label.style.whiteSpace = "nowrap";
    label.style.display = "none";
    label.style.pointerEvents = "none";
    layer.appendChild(label);

    hint = document.createElement("div");
    hint.className = "game1-hint";
    hint.id = "game1Hint";
    hint.textContent = "ПОЙМАЙ ПАУЧКОВ!";
    hint.style.position = "absolute";
    hint.style.pointerEvents = "none";
    layer.appendChild(hint);
  }

  function clearLayer() {
    if (!layer) return;
    layer.remove();
    layer = null;
    label = null;
    hint = null;
  }

  function updateField() {
    const r = getDrawnImageRect();
    if (!r) { field.w = field.h = 0; return false; }
    field = r;
    return true;
  }

  function positionLabel() {
    if (!label) return;
    label.style.left = (field.x + field.w / 2) + "px";
    label.style.top  = (field.y + field.h / 2) + "px";
    label.style.transform = "translate(-50%, -50%)";
  }

  function positionHint() {
    if (!hint) return;
    const padX = 14;
    const padY = 12;
    const x = field.x + padX;
    const y = field.y + field.h - padY;
    hint.style.left = x + "px";
    hint.style.top  = y + "px";
    hint.style.transform = "translate(0, -100%)";
  }

  function pickSize() {
    const minSide = Math.max(1, Math.min(field.w, field.h));
    const base = Math.round(minSide * 0.09);
    return clamp(base * 3, 100, 260);
  }

  function applyTransform(s) {
    const left = s.x - s.size / 2;
    const top  = s.y - s.size / 2;
    const flip = (s.vx >= 0) ? 1 : -1;
    s.el.style.transform = `translate(${left}px, ${top}px) scaleX(${flip})`;
  }

  function spawnSpider(src) {
    if (field.w <= 0 || field.h <= 0) return;

    const size = pickSize();
    const half = size / 2;
    const pad = half + 6;

    const minX = field.x + pad;
    const maxX = field.x + field.w - pad;
    const minY = field.y + pad;
    const maxY = field.y + field.h - pad;

    if (maxX <= minX || maxY <= minY) return;

    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);

    const el = document.createElement("img");
    el.src = src;
    el.alt = "";
    el.draggable = false;

    el.style.position = "absolute";
    el.style.width = size + "px";
    el.style.height = "auto";
    el.style.userSelect = "none";
    el.style.pointerEvents = "auto";
    el.style.cursor = "none";
    el.style.filter = "drop-shadow(0 8px 18px rgba(0,0,0,0.55))";

    const angle = Math.random() * Math.PI * 2;
    const speed = 90 + Math.random() * 90; // ✅ стартовая скорость тоже +примерно ×3
    const s = { el, x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, size, alive: true };

    el.addEventListener("pointerenter", () => {
      if (!running || !s.alive) return;
      s.alive = false;
      el.remove();
      checkWin();
    });

    applyTransform(s);
    layer.appendChild(el);
    spiders.push(s);
  }

  function stopAnimationOnly() {
    running = false;
    lastTs = 0;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;

    gameOverlay.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("resize", onResize);
  }

  function checkWin() {
    const alive = spiders.filter(s => s.alive).length;
    if (alive > 0) return;

    stopAnimationOnly();
    if (label) {
      label.style.display = "block";
      positionLabel();
    }
    if (hint) hint.style.display = "none";
  }

  function onPointerMove(e) {
    if (!running) return;
    const ovr = gameOverlay.getBoundingClientRect();
    mouseX = e.clientX - ovr.left;
    mouseY = e.clientY - ovr.top;
  }

  function onResize() {
    if (!running) return;
    if (!updateField()) return;

    const newSize = pickSize();
    for (const s of spiders) {
      if (!s.alive) continue;
      s.size = newSize;
      s.el.style.width = newSize + "px";
      applyTransform(s);
    }
    positionLabel();
    positionHint();
  }

  function tick(ts) {
    if (!running) return;

    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.033, (ts - lastTs)/1000);
    lastTs = ts;

    const minX = field.x + 8;
    const minY = field.y + 8;
    const maxX = field.x + field.w - 8;
    const maxY = field.y + field.h - 8;

    for (const s of spiders) {
      if (!s.alive) continue;

      s.vx += (Math.random() - 0.5) * cfg.wanderStrength * dt;
      s.vy += (Math.random() - 0.5) * cfg.wanderStrength * dt;

      const dx = s.x - mouseX;
      const dy = s.y - mouseY;
      const dist = Math.hypot(dx, dy);

      if (dist < cfg.fleeRadius) {
        const t = (cfg.fleeRadius - dist) / cfg.fleeRadius;
        const force = cfg.fleeStrength * (t*t);

        const nx = dist > 0.001 ? dx/dist : (Math.random()-0.5);
        const ny = dist > 0.001 ? dy/dist : (Math.random()-0.5);

        s.vx += nx * force * dt;
        s.vy += ny * force * dt;
      }

      const sp = Math.hypot(s.vx, s.vy);
      if (sp > cfg.maxSpeed) {
        const k = cfg.maxSpeed / sp;
        s.vx *= k;
        s.vy *= k;
      }

      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= Math.pow(cfg.damping, dt*60);
      s.vy *= Math.pow(cfg.damping, dt*60);

      const half = s.size * 0.45;

      if (s.x - half < minX) { s.x = minX + half; s.vx = Math.abs(s.vx); }
      else if (s.x + half > maxX) { s.x = maxX - half; s.vx = -Math.abs(s.vx); }

      if (s.y - half < minY) { s.y = minY + half; s.vy = Math.abs(s.vy); }
      else if (s.y + half > maxY) { s.y = maxY - half; s.vy = -Math.abs(s.vy); }

      applyTransform(s);
    }

    rafId = requestAnimationFrame(tick);
  }

  function internalStart() {
    ensureLayer();
    spiders = [];

    if (label) label.style.display = "none";
    if (hint) hint.style.display = "block";

    positionLabel();
    positionHint();

    spawnSpider(SPIDER1_SRC);
    spawnSpider(SPIDER1_SRC);
    spawnSpider(SPIDER2_SRC);
    spawnSpider(SPIDER2_SRC);
    spawnSpider(SPIDER2_SRC);

    if (spiders.length === 0) return;

    running = true;
    lastTs = 0;
    mouseX = -9999; mouseY = -9999;

    gameOverlay.addEventListener("pointermove", onPointerMove);
    window.addEventListener("resize", onResize);

    rafId = requestAnimationFrame(tick);
  }

  function start() {
    stop();
    ensureLayer();

    const tryStart = () => {
      if (!updateField()) { requestAnimationFrame(tryStart); return; }
      internalStart();
    };
    tryStart();
  }

  function stop() {
    stopAnimationOnly();
    clearLayer();
    spiders = [];
  }

  return { start, stop };
})();

/* =========================
   Game #2: faces + glow + key (backgame2)
========================= */
const game2 = (() => {
  let running = false;

  let layer = null;
  let faces = [];
  let field = { x: 0, y: 0, w: 0, h: 0 };

  let glow = null;
  let keyScreen = null;

  function ensureLayer() {
    if (layer) return;

    layer = document.createElement("div");
    layer.id = "game2Layer";
    layer.style.position = "absolute";
    layer.style.inset = "0";
    layer.style.zIndex = "2002";
    layer.style.pointerEvents = "none";
    gameOverlay.appendChild(layer);

    glow = document.createElement("div");
    glow.id = "game2Glow";
    glow.style.position = "absolute";
    glow.style.width = "180px";
    glow.style.height = "180px";
    glow.style.borderRadius = "50%";
    glow.style.pointerEvents = "none";
    glow.style.transform = "translate(-50%, -50%)";
    glow.style.opacity = "0";
    glow.style.filter = "blur(10px)";
    glow.style.background = "rgba(255,255,255,0.18)";
    glow.style.mixBlendMode = "screen";
    glow.style.zIndex = "2003";
    layer.appendChild(glow);
  }

  function clearLayer() {
    if (!layer) return;
    layer.remove();
    layer = null;
    glow = null;
  }

  function updateField() {
    const r = getDrawnImageRect();
    if (!r) { field.w = field.h = 0; return false; }
    field = r;
    return true;
  }

  function faceSize() {
    const minSide = Math.max(1, Math.min(field.w, field.h));
    return clamp(Math.round(minSide * 0.22), 90, 220);
  }

  function placeFaceAt(x, y, size, flipX = false) {
    const el = document.createElement("img");
    el.src = FACE_SRC;
    el.alt = "";
    el.draggable = false;

    el.style.position = "absolute";
    el.style.width = size + "px";
    el.style.height = "auto";
    el.style.left = "0";
    el.style.top = "0";
    el.style.userSelect = "none";
    el.style.pointerEvents = "auto";
    el.style.cursor = "none";
    el.style.filter = "drop-shadow(0 10px 22px rgba(0,0,0,0.6))";
    el.style.transformOrigin = "center center";

    const tx = x - size / 2;
    const ty = y - size / 2;

    el.style.transform = flipX
      ? `translate(${tx}px, ${ty}px) scaleX(-1)`
      : `translate(${tx}px, ${ty}px)`;

    const obj = { el, alive: true };

    el.addEventListener("pointerenter", () => {
      if (!running || !obj.alive) return;
      obj.alive = false;
      el.remove();
      checkWin();
    });

    layer.appendChild(el);
    faces.push(obj);
  }

  function spawnFaces() {
    faces = [];

    const size = faceSize();

    const padX = size * 0.70;
    const padTop = size * 0.72;
    const padBottom = size * 0.90;

    const leftX   = field.x + padX;
    const rightX  = field.x + field.w - padX;

    const topY    = field.y + padTop;
    const bottomY = field.y + field.h - padBottom;

    const midX    = field.x + field.w / 2;
    const midY    = field.y + field.h / 2;

    placeFaceAt(leftX,  topY,    size, false);
    placeFaceAt(rightX, topY,    size, true);

    placeFaceAt(leftX,  bottomY, size, false);
    placeFaceAt(rightX, bottomY, size, true);

    placeFaceAt(midX,   midY,    size, false);
  }

  function showKeyScreen() {
    if (keyScreen) return;

    keyScreen = document.createElement("div");
    keyScreen.id = "game2KeyScreen";
    keyScreen.style.position = "absolute";
    keyScreen.style.inset = "0";
    keyScreen.style.zIndex = "2100";
    keyScreen.style.display = "flex";
    keyScreen.style.flexDirection = "column";
    keyScreen.style.alignItems = "center";
    keyScreen.style.justifyContent = "center";
    keyScreen.style.gap = "18px";
    keyScreen.style.background = "rgba(0,0,0,0.72)";
    keyScreen.style.pointerEvents = "auto";

    const img = document.createElement("img");
    img.src = KEY_SRC;
    img.alt = "";
    img.draggable = false;
    img.style.maxWidth = "86vw";
    img.style.maxHeight = "70vh";
    img.style.objectFit = "contain";
    img.style.filter = "drop-shadow(0 18px 40px rgba(0,0,0,0.75))";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "ИСПОЛЬЗОВАТЬ";
    btn.style.fontFamily = '"Blackcraft", system-ui, sans-serif';
    btn.style.fontSize = "48px";
    btn.style.lineHeight = "1";
    btn.style.color = "#fff";
    btn.style.padding = "14px 22px";
    btn.style.border = "0";
    btn.style.background = "transparent";
    btn.style.cursor = "pointer";
    btn.style.textShadow = "0 6px 30px rgba(0,0,0,0.75)";
    btn.style.userSelect = "none";

    btn.addEventListener("click", () => {
      closeGame();
      goToCen6();
    });

    keyScreen.appendChild(img);
    keyScreen.appendChild(btn);
    layer.appendChild(keyScreen);
  }

  function checkWin() {
    const alive = faces.filter(f => f.alive).length;
    if (alive > 0) return;

    running = false;
    if (glow) glow.style.opacity = "0";
    showKeyScreen();
  }

  function onPointerMove(e) {
    if (!glow) return;
    const ovr = gameOverlay.getBoundingClientRect();
    const x = e.clientX - ovr.left;
    const y = e.clientY - ovr.top;

    glow.style.left = x + "px";
    glow.style.top  = y + "px";
    glow.style.opacity = running ? "1" : "0";
  }

  function onResize() {
    if (!running) return;
    if (!updateField()) return;

    for (const f of faces) {
      if (f.el && f.el.isConnected) f.el.remove();
    }
    faces = [];
    spawnFaces();
  }

  function internalStart() {
    ensureLayer();
    if (keyScreen) { keyScreen.remove(); keyScreen = null; }

    spawnFaces();

    running = true;
    gameOverlay.addEventListener("pointermove", onPointerMove);
    window.addEventListener("resize", onResize);

    if (glow) glow.style.opacity = "1";
  }

  function start() {
    stop();
    ensureLayer();

    const tryStart = () => {
      if (!updateField()) { requestAnimationFrame(tryStart); return; }
      internalStart();
    };
    tryStart();
  }

  function stop() {
    running = false;

    gameOverlay.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("resize", onResize);

    for (const f of faces) {
      if (f.el && f.el.isConnected) f.el.remove();
    }
    faces = [];

    if (keyScreen) { keyScreen.remove(); keyScreen = null; }

    clearLayer();
  }

  return { start, stop };
})();

/* =========================
   Overlay open/close
========================= */
function openGame(src) {
  game1.stop();
  game2.stop();

  gameOverlay.setAttribute("aria-hidden", "false");
  gameOverlayImg.onload = null;
  gameOverlayImg.src = src;

  const startAfterDecode = () => {
    if (src === GAME1_SRC) game1.start();
    if (src === GAME2_SRC) game2.start();
  };

  if (typeof gameOverlayImg.decode === "function") {
    gameOverlayImg.decode()
      .then(() => requestAnimationFrame(startAfterDecode))
      .catch(() => requestAnimationFrame(startAfterDecode));
  } else {
    if (gameOverlayImg.complete) requestAnimationFrame(startAfterDecode);
    else gameOverlayImg.onload = () => requestAnimationFrame(startAfterDecode);
  }
}

function closeGame() {
  game1.stop();
  game2.stop();

  gameOverlay.setAttribute("aria-hidden", "true");
  gameOverlayImg.onload = null;
  gameOverlayImg.src = "";
}

gameClose.addEventListener("click", closeGame);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && gameOverlay.getAttribute("aria-hidden") === "false") closeGame();
});
gameOverlay.addEventListener("pointerdown", (e) => {
  if (e.target === gameOverlay) closeGame();
});

/* =========================
   CEN5 UI helpers
========================= */
function resetCen5UI() {
  btnGameWindow.hidden = true;
  btnGameBucket.hidden = true;

  cen5Panel.hidden = false;
  cen5Panel.classList.remove("panel-fadeout");

  cen5PanelClose.disabled = false;
}

function markCen5Entered() {
  cen5ReadyAt = performance.now() + 350;
  resetCen5UI();
}

/* =========================
   CEN8 UI helpers
========================= */
function resetCen8UI() {
  if (cen8Panel) cen8Panel.hidden = false;
  if (btnTakeLetter) btnTakeLetter.hidden = true;   // 👈 start hidden
  if (letterOverlay) letterOverlay.setAttribute("aria-hidden", "true");
}

function revealTakeLetterBtn() {
  if (!btnTakeLetter) return;
  btnTakeLetter.hidden = false;
}

/* =========================
   CURTAIN
========================= */
choiceYes.addEventListener("click", () => {
  if (locked) return;
  locked = true;
  goToCen1();
});

choiceNo.addEventListener("click", () => {
  if (locked) return;
  locked = true;

  panelText.innerHTML =
    `Нет? Хммм...\n` +
    `Как интересно.... Ты должно быть не понял.\n` +
    `<span class="text-panel__line3">С каких это пор ты тут главный?!</span>`;

  toCen1Timer = setTimeout(goToCen1, 5000);
});

/* =========================
   CEN1-4
========================= */
cen1Next.addEventListener("click", () => goToCen2());
btnGo.addEventListener("click", () => goToCen3());
btnApproach.addEventListener("click", () => goToCen4());

btnKnock.dataset.state = "knock";
btnKnock.addEventListener("click", () => {
  if (btnKnock.dataset.state === "knock") {
    cen4WindowImg.src = "images/window_2.png";
    btnKnock.textContent = "БЕЖАТЬ";
    btnKnock.dataset.state = "run";
    return;
  }
  if (btnKnock.dataset.state === "run") {
    goToCen5();
  }
});

/* =========================
   CEN5
========================= */
cen5PanelClose.addEventListener("click", (e) => {
  if (performance.now() < cen5ReadyAt) return;

  e.preventDefault();
  e.stopPropagation();

  cen5PanelClose.disabled = true;
  cen5Panel.classList.add("panel-fadeout");

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;

    cen5Panel.hidden = true;
    btnGameWindow.hidden = false;
    btnGameBucket.hidden = false;
  };

  const onEnd = (ev) => {
    if (ev.propertyName !== "opacity") return;
    cen5Panel.removeEventListener("transitionend", onEnd);
    finish();
  };

  cen5Panel.addEventListener("transitionend", onEnd);

  setTimeout(() => {
    cen5Panel.removeEventListener("transitionend", onEnd);
    finish();
  }, 520);
});

btnGameWindow.addEventListener("click", (e) => {
  if (sceneCen5.hidden) return;
  e.preventDefault();
  e.stopPropagation();
  openGame(GAME1_SRC);
});

btnGameBucket.addEventListener("click", (e) => {
  if (sceneCen5.hidden) return;
  e.preventDefault();
  e.stopPropagation();
  openGame(GAME2_SRC);
});

sceneCen5.addEventListener("pointerdown", (e) => {
  if (sceneCen5.hidden) return;
  if (performance.now() < cen5ReadyAt) {
    e.preventDefault();
    e.stopPropagation();
  }
}, { capture: true });

/* =========================
   CEN6-8 переходы
========================= */
cen6Next.addEventListener("click", (e) => {
  e.preventDefault(); e.stopPropagation();
  goToCen7();
});

cen7Next.addEventListener("click", (e) => {
  e.preventDefault(); e.stopPropagation();
  goToCen8();
});

/* CEN8: hide panel => show TAKE LETTER button */
function hideCen8PanelAndReveal() {
  if (cen8Panel && !cen8Panel.hidden) cen8Panel.hidden = true;
  revealTakeLetterBtn();
}

cen8HidePanel.addEventListener("click", (e) => {
  e.preventDefault(); e.stopPropagation();
  hideCen8PanelAndReveal();
});

/* optional: click on panel itself also hides + reveals */
cen8Panel.addEventListener("click", (e) => {
  // клики по самой плашке (не по стрелке) — тоже работают
  hideCen8PanelAndReveal();
});

/* =========================
   CEN8: письмо
========================= */
btnTakeLetter.addEventListener("click", (e) => {
  e.preventDefault(); e.stopPropagation();
  letterOverlay.setAttribute("aria-hidden", "false");
});

function acceptLetterAndGoCen9() {
  letterOverlay.setAttribute("aria-hidden", "true");
  goToCen9();
}

letterYes.addEventListener("click", (e) => {
  e.preventDefault(); e.stopPropagation();
  acceptLetterAndGoCen9();
});
letterNo.addEventListener("click", (e) => {
  e.preventDefault(); e.stopPropagation();
  acceptLetterAndGoCen9();
});

/* кликом по фону закрыть модалку */
letterOverlay.addEventListener("pointerdown", (e) => {
  if (e.target === letterOverlay) {
    letterOverlay.setAttribute("aria-hidden", "true");
  }
});

/* Esc закрывает модалку письма */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && letterOverlay.getAttribute("aria-hidden") === "false") {
    letterOverlay.setAttribute("aria-hidden", "true");
  }
});

/* =========================
   CEN9: выбор
========================= */
btnLeft.addEventListener("click", (e) => {
  e.preventDefault(); e.stopPropagation();
  goToCen10();
});
btnRight.addEventListener("click", (e) => {
  e.preventDefault(); e.stopPropagation();
  goToCen11();
});

/* =========================
   CEN10/CEN11: restart
========================= */
btnRestart10.addEventListener("click", (e) => {
  e.preventDefault(); e.stopPropagation();
  goToCurtain();
});
btnRestart11.addEventListener("click", (e) => {
  e.preventDefault(); e.stopPropagation();
  goToCurtain();
});
/* =========================
   Background music (silent UI)
========================= */
const bgMusic = document.getElementById("bgMusic");

function tryPlayMusic() {
  if (!bgMusic) return;

  bgMusic.volume = 0.12; // тихо (0..1)
  bgMusic.muted = false;

  const p = bgMusic.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}

// Попытка сразу (сработает, если браузер разрешит)
tryPlayMusic();

// Если браузер блокирует автоплей — стартуем на первом взаимодействии (без кнопок)
window.addEventListener("pointerdown", tryPlayMusic, { once: true });
window.addEventListener("keydown", tryPlayMusic, { once: true });
