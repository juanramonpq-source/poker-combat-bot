const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const orientationOverlay = document.getElementById("orientation-overlay");
const orientationLockButton = document.getElementById("orientation-lock-button");
const orientationLockStatus = document.getElementById("orientation-lock-status");
const storyMapButton = document.getElementById("story-map-button");
const marketCrowdAmbience = document.getElementById("market-crowd-ambience");
const storyParams = new URLSearchParams(window.location.search);
const storyEmbedMode = storyParams.get("story_embed") === "1";
const storyReturnUrl = storyParams.get("story_return") || "";
const storySparringLocked = storyParams.get("story_sparring_locked") === "1";
const storyPostTowerMarket = storyParams.get("story_post_tower_market") === "1";
const storyPostTowerViajeroCleared = storyParams.get("story_post_tower_viajero_cleared") === "1";
const marketScenePositionKey = "pocobot-story-market-position-v1";

if (storyEmbedMode) {
  document.body.classList.add("story-embed-mode");
}

canvas.setAttribute("tabindex", "0");
canvas.setAttribute("draggable", "false");

function focusExplorationInput() {
  try {
    window.focus();
  } catch (error) {}
  try {
    canvas.focus({ preventScroll: true });
  } catch (error) {
    try { canvas.focus(); } catch (focusError) {}
  }
}

const viewport = {
  width: canvas.width,
  height: canvas.height,
};

const world = {
  width: 1536,
  height: 1024,
};

const input = {
  up: false,
  down: false,
  left: false,
  right: false,
  interactQueued: false,
  pointerActive: false,
  pointerId: null,
  pointerX: 0,
  pointerY: 0,
  pointerStartX: 0,
  pointerStartY: 0,
  pointerMoved: false,
};

function installExplorationGestureGuard() {
  const guardOptions = { passive: false, capture: true };
  const blockNativeCanvasGesture = (event) => {
    if (!event.cancelable) return;
    if (
      event.target === canvas ||
      event.target === document.body ||
      event.target === document.documentElement
    ) {
      event.preventDefault();
    }
  };

  ["selectstart", "dragstart", "contextmenu"].forEach((eventName) => {
    document.addEventListener(eventName, blockNativeCanvasGesture, guardOptions);
  });

  document.addEventListener(
    "touchmove",
    (event) => {
      if (!event.cancelable) return;
      if (input.pointerActive || event.target === canvas || storyEmbedMode) {
        event.preventDefault();
      }
    },
    guardOptions,
  );
}

installExplorationGestureGuard();

const player = {
  x: 775,
  y: 650,
  radius: 44,
  vx: 0,
  vy: 0,
  maxSpeed: 310,
  acceleration: 980,
  drag: 5.2,
  facing: "down",
  bob: 0,
  angle: 0,
  targetAngle: 0,
  glow: 0,
  thrustCycle: 0,
  thrustPower: 0,
  leanAmount: 0,
  leanSide: 0,
  sideBlend: 0,
  flameSkewX: 0,
  flameSkewY: 0,
  particleDebt: 0,
  spriteWidth: 248,
  spriteHeight: 248,
};

const marketScenePositionState = {
  x: Math.round(player.x),
  y: Math.round(player.y),
  savedAt: 0,
};

function placePlayerAt(point) {
  if (!point) return;
  player.x = Math.max(player.radius, Math.min(world.width - player.radius, Number(point.x) || 775));
  player.y = Math.max(player.radius, Math.min(world.height - player.radius, Number(point.y) || 650));
  player.vx = 0;
  player.vy = 0;
}

function readMarketScenePosition() {
  try {
    const parsed = JSON.parse(localStorage.getItem(marketScenePositionKey) || "{}");
    if (!parsed || typeof parsed !== "object") return null;
    const x = Number(parsed.x);
    const y = Number(parsed.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  } catch (error) {
    return null;
  }
}

function rememberMarketScenePosition(force = false) {
  const x = Math.round(player.x);
  const y = Math.round(player.y);
  const now = Date.now();
  if (!force) {
    const movedEnough = Math.abs(x - marketScenePositionState.x) >= 8 || Math.abs(y - marketScenePositionState.y) >= 8;
    const enoughTimePassed = now - marketScenePositionState.savedAt >= 900;
    if (!movedEnough && !enoughTimePassed) return;
  }
  marketScenePositionState.x = x;
  marketScenePositionState.y = y;
  marketScenePositionState.savedAt = now;
  try {
    localStorage.setItem(marketScenePositionKey, JSON.stringify({ x, y, savedAt: now }));
  } catch (error) {}
}

{
  const savedMarketPosition = readMarketScenePosition();
  if (savedMarketPosition) {
    placePlayerAt(savedMarketPosition);
    rememberMarketScenePosition(true);
  }
}

const camera = {
  x: 0,
  y: 0,
  smoothness: 0.1,
};

const DESKTOP_CAMERA_ZOOM = 0.86;
const desktopCameraMedia = window.matchMedia("(pointer: fine) and (hover: hover)");

const assets = {
  map: new Image(),
  vera: new Image(),
  sparringBot: new Image(),
  botFrames: [],
  frontFrames: [],
  sideFrames: [],
  hoverFrames: [],
  backFrame: null,
  ready: false,
};

const collisionZones = [
  { type: "rect", x: 4.842370744010168, y: -118.18643967606549, width: 1536, height: 146 },
  { type: "rect", x: 1508.7969735182849, y: 6.4843648401016765, width: 218, height: 896 },
  { type: "rect", x: 2.17906683480453, y: 990.0955252113259, width: 1536, height: 146 },
  { type: "rect", x: 1513, y: 903, width: 23, height: 93 },
  { type: "rect", x: 0, y: 20, width: 21, height: 1004 },
  { type: "ellipse", x: 921, y: 741, width: 316, height: 242 },
  { type: "ellipse", x: 1208, y: 431, width: 290, height: 175 },
  { type: "ellipse", x: 1318, y: 262, width: 192, height: 129 },
  { type: "ellipse", x: 968, y: 81, width: 284, height: 223 },
  { type: "ellipse", x: 599, y: 123, width: 194, height: 161 },
  { type: "ellipse", x: 434, y: 49, width: 169, height: 98 },
  { type: "ellipse", x: 274, y: 226, width: 222, height: 164 },
  { type: "ellipse", x: 49, y: 161, width: 209, height: 123 },
  { type: "ellipse", x: 101, y: 340, width: 193, height: 182 },
  { type: "ellipse", x: 154, y: 687, width: 356, height: 264 },
];
window.PoCoBOTStoryCollisionEditor?.applySceneZones("market", collisionZones);

const thrusters = [
  { x: -92, y: -47, width: 24, phase: 0.1 },
  { x: 92, y: -47, width: 24, phase: 1.7 },
];

const leanFrameSources = [
  "./assets/mecha-clean-frames/pocobot-mecha-clean-00.png",
  "./assets/mecha-clean-frames/pocobot-mecha-clean-01.png",
  "./assets/mecha-clean-frames/pocobot-mecha-clean-02.png",
  "./assets/mecha-clean-frames/pocobot-mecha-clean-03.png",
  "./assets/mecha-clean-frames/pocobot-mecha-clean-04.png",
];
const playerVisualFrameSources = window.PoCoBOTPlayerVisual.assetSources("../shared-mecha-orientation/assets");
let playerVisual = null;

const interactables = [
  {
    id: "vera",
    x: 486,
    y: 620,
    radius: 132,
    label: "Vera Hex",
    hint: "Hablar",
    message: "Vera Hex: vuelve al dialogo del mercado.",
  },
  {
    id: "sparring",
    x: 812,
    y: 338,
    radius: 148,
    label: "Viajero",
    hint: storyPostTowerMarket && !storyPostTowerViajeroCleared
      ? "Reto 4B: 2 monedas"
      : storySparringLocked ? "Completa otro nivel" : "Probar mazo ampliado",
    message: storyPostTowerMarket && !storyPostTowerViajeroCleared
      ? "Viajero activa el bloqueo de diamantes. Premio: 2 monedas."
      : storySparringLocked
        ? "Viajero espera otra marca de la Ruta Ceniza."
        : "Viajero: iniciando sparring con tu mazo ampliado.",
  },
  {
    id: "map_exit",
    x: 768,
    y: 850,
    radius: 150,
    label: "Salida del Mercado",
    hint: "Volver al mapa",
    message: "La salida del Mercado devuelve a la Ruta Ceniza.",
  },
];
window.PoCoBOTStoryCollisionEditor?.applySceneInteractionPoints("market", interactables);

const interactionState = {
  active: null,
  message: "",
  messageTimer: 0,
};

const touchInteractionConfirmationState = {
  targetId: "",
  expiresAt: 0,
};

function resetTouchInteractionConfirmation(targetId = "") {
  if (targetId && touchInteractionConfirmationState.targetId !== targetId) {
    return;
  }

  touchInteractionConfirmationState.targetId = "";
  touchInteractionConfirmationState.expiresAt = 0;
}

function isTouchMobileInteractionMode() {
  const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const hasTouch = hasCoarsePointer || navigator.maxTouchPoints > 0;
  const shortViewportSide = Math.min(window.innerWidth || 0, window.innerHeight || 0);

  return hasTouch && shortViewportSide <= 820;
}

function getTouchInteractionConfirmationMessage(interactable) {
  if (interactable.id === "vera") {
    return "Vera Hex esta cerca. Toca otra vez para hablar con ella y entrar a su mostrador.";
  }

  if (interactable.id === "sparring") {
    if (storyPostTowerMarket && !storyPostTowerViajeroCleared) {
      return "Viajero esta cerca. Toca otra vez para iniciar el reto de la Torre 4B por 2 monedas.";
    }

    if (storySparringLocked) {
      return "Viajero esta cerca. Toca otra vez para hablar con el.";
    }

    return "Viajero esta cerca. Toca otra vez para iniciar el sparring.";
  }

  return "";
}

function confirmTouchInteraction(interactable, now) {
  if (!["vera", "sparring"].includes(interactable.id) || !isTouchMobileInteractionMode()) {
    resetTouchInteractionConfirmation(interactable.id);
    return true;
  }

  const isPending =
    touchInteractionConfirmationState.targetId === interactable.id &&
    now <= touchInteractionConfirmationState.expiresAt;

  if (isPending) {
    resetTouchInteractionConfirmation(interactable.id);
    return true;
  }

  touchInteractionConfirmationState.targetId = interactable.id;
  touchInteractionConfirmationState.expiresAt = now + 4800;
  setInteractionMessage(getTouchInteractionConfirmationMessage(interactable), 4.4);
  return false;
}

const hudHelp = {
  expanded: true,
  autoCollapse: true,
  elapsed: 0,
  collapseDelay: 5,
  button: { x: 18, y: 18, width: 140, height: 38 },
};

const MARKET_CROWD_VOLUME = 0.192;
const MARKET_THEME_SRC = "../MercadodeChatarra.mp3";
const PARENT_MARKET_MUSIC_VOLUME = 0.34;
let marketCrowdShouldPlay = true;
let marketCrowdFadeFrame = null;

function fadeMarketCrowdAmbience(targetVolume, duration = 700, onComplete = null) {
  if (!marketCrowdAmbience) return;
  if (marketCrowdFadeFrame) {
    window.cancelAnimationFrame(marketCrowdFadeFrame);
    marketCrowdFadeFrame = null;
  }

  const startVolume = Number.isFinite(marketCrowdAmbience.volume)
    ? marketCrowdAmbience.volume
    : 0;
  const safeTarget = Math.max(0, Math.min(1, targetVolume));

  if (duration <= 0) {
    marketCrowdAmbience.volume = safeTarget;
    onComplete?.();
    return;
  }

  const startAt = performance.now();
  const step = (now) => {
    const progress = Math.max(0, Math.min(1, (now - startAt) / duration));
    const eased = 1 - Math.pow(1 - progress, 3);
    marketCrowdAmbience.volume = startVolume + (safeTarget - startVolume) * eased;
    if (progress < 1) {
      marketCrowdFadeFrame = window.requestAnimationFrame(step);
      return;
    }

    marketCrowdFadeFrame = null;
    marketCrowdAmbience.volume = safeTarget;
    onComplete?.();
  };

  marketCrowdFadeFrame = window.requestAnimationFrame(step);
}

async function startMarketCrowdAmbience() {
  if (!marketCrowdAmbience || !marketCrowdShouldPlay) return;

  try {
    marketCrowdAmbience.volume = 0;
    await marketCrowdAmbience.play();
    fadeMarketCrowdAmbience(MARKET_CROWD_VOLUME, 950);
  } catch (error) {
    // Some browsers still require the first pointer/key gesture. The listeners
    // below retry without disturbing the exploration if autoplay is blocked.
  }
}

function stopMarketCrowdAmbience(immediate = false) {
  if (!marketCrowdAmbience) return;
  marketCrowdShouldPlay = false;
  if (marketCrowdFadeFrame) {
    window.cancelAnimationFrame(marketCrowdFadeFrame);
    marketCrowdFadeFrame = null;
  }

  if (immediate) {
    marketCrowdAmbience.pause();
    marketCrowdAmbience.volume = 0;
    return;
  }

  fadeMarketCrowdAmbience(0, 260, () => {
    marketCrowdAmbience.pause();
  });
}

function resumeMarketCrowdAmbienceAfterGesture() {
  if (!marketCrowdShouldPlay || !marketCrowdAmbience?.paused) return;
  startMarketCrowdAmbience();
}

function primeParentMarketMusic() {
  if (!storyEmbedMode || window.parent === window) return;

  try {
    const parentMusic = window.parent.document?.getElementById("storyMapMusic");
    if (!parentMusic) return;

    const targetSource = new URL(MARKET_THEME_SRC, window.location.href).href;
    const sourceElement = parentMusic.querySelector("source");
    const currentSource = parentMusic.currentSrc
      || (sourceElement?.getAttribute("src")
        ? new URL(sourceElement.getAttribute("src"), window.parent.location.href).href
        : parentMusic.src);

    if (sourceElement && currentSource !== targetSource) {
      sourceElement.setAttribute("src", targetSource);
      parentMusic.load();
    } else if (!sourceElement && parentMusic.src !== targetSource) {
      parentMusic.src = targetSource;
      parentMusic.load();
    }

    parentMusic.loop = true;
    parentMusic.volume = PARENT_MARKET_MUSIC_VOLUME;
    const playPromise = parentMusic.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  } catch (error) {}
}

["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
  window.addEventListener(eventName, resumeMarketCrowdAmbienceAfterGesture, {
    passive: true,
  });
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) rememberMarketScenePosition(true);
  if (!marketCrowdAmbience) return;
  if (document.hidden) {
    marketCrowdAmbience.pause();
    return;
  }
  resumeMarketCrowdAmbienceAfterGesture();
});

window.addEventListener("pagehide", () => {
  rememberMarketScenePosition(true);
});

function postStoryTutorialAction(action, payload = {}) {
  rememberMarketScenePosition(true);
  if (action === "talk-vera") {
    primeParentMarketMusic();
  }

  stopMarketCrowdAmbience(true);

  const message = {
    type: "pocobot-story-market-tutorial-action",
    action,
    savedAt: Date.now(),
    ...payload,
  };

  [window.parent !== window ? window.parent : null, window.opener].forEach((targetWindow) => {
    if (!targetWindow) return;
    try {
      targetWindow.postMessage(message, "*");
    } catch (error) {}
  });

  if (action === "return-map" && storyReturnUrl && window.parent === window) {
    window.location.href = storyReturnUrl;
  }
}

function setInteractionMessage(text, duration = 2.8) {
  interactionState.message = text;
  interactionState.messageTimer = duration;
}

const actorCollisionRadii = {
  vera: 28,
  sparring: 58,
};

const exhaustParticles = [];

const keyMap = {
  ArrowUp: "up",
  w: "up",
  W: "up",
  ArrowDown: "down",
  s: "down",
  S: "down",
  ArrowLeft: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  d: "right",
  D: "right",
};

function isStoryInteractKey(key) {
  return key === "e" || key === "E" || key === "Enter" || key === " ";
}

function setMovementKey(key, isPressed) {
  const action = keyMap[key];
  if (!action) {
    return false;
  }

  input[action] = isPressed;
  return true;
}

function handleStoryExplorationKeyDown(key, options = {}) {
  if (isStoryInteractKey(key)) {
    if (!options.repeat) {
      input.interactQueued = true;
    }
    return true;
  }

  return setMovementKey(key, true);
}

function handleStoryExplorationKeyUp(key) {
  return setMovementKey(key, false);
}

function getCanvasScreenPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = viewport.width / rect.width;
  const scaleY = viewport.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function getCameraZoom() {
  return desktopCameraMedia.matches ? DESKTOP_CAMERA_ZOOM : 1;
}

function getVisibleWorldSize() {
  const zoom = getCameraZoom();
  return {
    width: viewport.width / zoom,
    height: viewport.height / zoom,
  };
}

function isPointInsideRect(point, rect) {
  return (
    point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height
  );
}

function toggleHudHelp() {
  hudHelp.expanded = !hudHelp.expanded;
  hudHelp.autoCollapse = false;
  hudHelp.elapsed = 0;
}

function syncHudHelpCursor(event) {
  if (event.pointerType !== "mouse") {
    return;
  }

  const screenPoint = getCanvasScreenPoint(event);
  canvas.style.cursor = isPointInsideRect(screenPoint, hudHelp.button) ? "pointer" : "none";
}

window.addEventListener("keydown", (event) => {
  if (!handleStoryExplorationKeyDown(event.key, { repeat: event.repeat })) {
    return;
  }

  event.preventDefault();
});

window.addEventListener("keyup", (event) => {
  if (!handleStoryExplorationKeyUp(event.key)) {
    return;
  }

  event.preventDefault();
});

window.addEventListener("load", () => {
  window.setTimeout(focusExplorationInput, 40);
});

window.addEventListener("message", (event) => {
  const data = event.data;
  if (!data) {
    return;
  }

  if (data.type === "pocobot-story-exploration-focus") {
    focusExplorationInput();
    return;
  }

  if (data.type !== "pocobot-story-exploration-key") {
    return;
  }

  if (data.phase === "up") {
    handleStoryExplorationKeyUp(data.key);
    return;
  }

  handleStoryExplorationKeyDown(data.key, { repeat: false });
});

storyMapButton?.addEventListener("click", () => {
  setInteractionMessage("Volviendo al mapa de la Ruta Ceniza...", 1.4);
  postStoryTutorialAction("return-map");
});

function updatePointerTarget(event) {
  const screenPoint = getCanvasScreenPoint(event);
  const zoom = getCameraZoom();

  input.pointerX = clamp(camera.x + screenPoint.x / zoom, 0, world.width);
  input.pointerY = clamp(camera.y + screenPoint.y / zoom, 0, world.height);
}

canvas.addEventListener("pointerdown", (event) => {
  focusExplorationInput();

  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  const screenPoint = getCanvasScreenPoint(event);
  if (isPointInsideRect(screenPoint, hudHelp.button)) {
    toggleHudHelp();
    event.preventDefault();
    return;
  }

  input.pointerActive = true;
  input.pointerId = event.pointerId;
  updatePointerTarget(event);
  input.pointerStartX = input.pointerX;
  input.pointerStartY = input.pointerY;
  input.pointerMoved = false;
  canvas.setPointerCapture(event.pointerId);
  event.preventDefault();
});

canvas.addEventListener("pointermove", (event) => {
  syncHudHelpCursor(event);

  if (!input.pointerActive || event.pointerId !== input.pointerId) {
    return;
  }

  updatePointerTarget(event);
  const dragDistance = Math.hypot(
    input.pointerX - input.pointerStartX,
    input.pointerY - input.pointerStartY,
  );
  input.pointerMoved ||= dragDistance > 18;
  event.preventDefault();
});

canvas.addEventListener("pointerleave", () => {
  canvas.style.cursor = "none";
});

function stopPointerControl(event) {
  if (event.pointerId !== input.pointerId) {
    return;
  }

  input.pointerActive = false;
  input.pointerId = null;

  if (!input.pointerMoved && interactionState.active) {
    input.interactQueued = true;
  }

  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }

  event.preventDefault();
}

canvas.addEventListener("pointerup", stopPointerControl);
canvas.addEventListener("pointercancel", stopPointerControl);

const portraitMedia = window.matchMedia("(orientation: portrait)");
const coarsePointerMedia = window.matchMedia("(pointer: coarse)");

function shouldShowLandscapePrompt() {
  return portraitMedia.matches && coarsePointerMedia.matches;
}

function updateLandscapePrompt() {
  if (!orientationOverlay) {
    return;
  }

  orientationOverlay.hidden = !shouldShowLandscapePrompt();
}

async function requestLandscapeLock() {
  if (!orientationLockStatus) {
    return;
  }

  orientationLockStatus.textContent = "Solicitando pantalla completa y modo horizontal...";

  try {
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }

    if (screen.orientation?.lock) {
      await screen.orientation.lock("landscape");
      orientationLockStatus.textContent = "Modo horizontal solicitado. Si no cambia, gira el movil manualmente.";
    } else {
      orientationLockStatus.textContent = "Este navegador no permite bloquear la orientacion; gira el movil manualmente.";
    }
  } catch (error) {
    orientationLockStatus.textContent = "No se pudo forzar. Desbloquea la rotacion del movil y giralo a horizontal.";
  }

  updateLandscapePrompt();
}

orientationLockButton?.addEventListener("click", requestLandscapeLock);
window.addEventListener("resize", updateLandscapePrompt);
portraitMedia.addEventListener?.("change", updateLandscapePrompt);
coarsePointerMedia.addEventListener?.("change", updateLandscapePrompt);
desktopCameraMedia.addEventListener?.("change", snapCameraToPlayer);
screen.orientation?.addEventListener?.("change", updateLandscapePrompt);
updateLandscapePrompt();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function damp(current, target, rate, dt) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

function lerpAngle(current, target, rate, dt) {
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + difference * (1 - Math.exp(-rate * dt));
}

function worldVectorToLocal(x, y) {
  const cos = Math.cos(player.angle);
  const sin = Math.sin(player.angle);

  return {
    x: x * cos + y * sin,
    y: -x * sin + y * cos,
  };
}

function localPointToWorld(x, y) {
  const cos = Math.cos(player.angle);
  const sin = Math.sin(player.angle);

  return {
    x: player.x + x * cos - y * sin,
    y: player.y + x * sin + y * cos,
  };
}

function localVectorToWorld(x, y) {
  const cos = Math.cos(player.angle);
  const sin = Math.sin(player.angle);

  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

function circleRectCollision(circleX, circleY, radius, rect) {
  const nearestX = clamp(circleX, rect.x, rect.x + rect.width);
  const nearestY = clamp(circleY, rect.y, rect.y + rect.height);
  const dx = circleX - nearestX;
  const dy = circleY - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

function circleCircleCollision(circleX, circleY, radius, zone) {
  const dx = circleX - zone.x;
  const dy = circleY - zone.y;
  const combinedRadius = radius + zone.radius;
  return dx * dx + dy * dy < combinedRadius * combinedRadius;
}

function circleEllipseCollision(circleX, circleY, radius, zone) {
  const rx = Math.max(1, zone.width / 2);
  const ry = Math.max(1, zone.height / 2);
  const cx = zone.x + rx;
  const cy = zone.y + ry;
  const dx = (circleX - cx) / (rx + radius);
  const dy = (circleY - cy) / (ry + radius);
  return dx * dx + dy * dy <= 1;
}

function distanceToSegmentSquared(pointX, pointY, start, end) {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (lengthSquared === 0) {
    const dx = pointX - start.x;
    const dy = pointY - start.y;
    return dx * dx + dy * dy;
  }

  const t = clamp(
    ((pointX - start.x) * segmentX + (pointY - start.y) * segmentY) / lengthSquared,
    0,
    1,
  );
  const nearestX = start.x + segmentX * t;
  const nearestY = start.y + segmentY * t;
  const dx = pointX - nearestX;
  const dy = pointY - nearestY;

  return dx * dx + dy * dy;
}

function pointInPolygon(pointX, pointY, points) {
  let inside = false;

  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const a = points[i];
    const b = points[j];
    const crosses = (a.y > pointY) !== (b.y > pointY);

    if (crosses) {
      const intersectionX = ((b.x - a.x) * (pointY - a.y)) / (b.y - a.y) + a.x;
      if (pointX < intersectionX) {
        inside = !inside;
      }
    }
  }

  return inside;
}

function circlePolygonCollision(circleX, circleY, radius, points) {
  if (pointInPolygon(circleX, circleY, points)) {
    return true;
  }

  const radiusSquared = radius * radius;
  return points.some((point, index) => {
    const next = points[(index + 1) % points.length];
    return distanceToSegmentSquared(circleX, circleY, point, next) < radiusSquared;
  });
}

function collisionZoneHit(circleX, circleY, radius, zone) {
  if (zone.type === "rect") {
    return circleRectCollision(circleX, circleY, radius, zone);
  }

  if (zone.type === "circle") {
    return circleCircleCollision(circleX, circleY, radius, zone);
  }

  if (zone.type === "ellipse") {
    return circleEllipseCollision(circleX, circleY, radius, zone);
  }

  return circlePolygonCollision(circleX, circleY, radius, zone.points);
}

function actorCollisionHit(circleX, circleY, radius) {
  return interactables.some((actor) => {
    const actorRadius = actorCollisionRadii[actor.id] ?? 0;
    if (actorRadius === 0) {
      return false;
    }

    const dx = circleX - actor.x;
    const dy = circleY - actor.y;
    const combinedRadius = radius + actorRadius;
    return dx * dx + dy * dy < combinedRadius * combinedRadius;
  });
}

function canMoveTo(nextX, nextY) {
  if (nextX - player.radius < 0 || nextX + player.radius > world.width) {
    return false;
  }

  if (nextY - player.radius < 0 || nextY + player.radius > world.height) {
    return false;
  }

  const hitsScenery = collisionZones.some((zone) =>
    collisionZoneHit(nextX, nextY, player.radius, zone),
  );

  return !hitsScenery && !actorCollisionHit(nextX, nextY, player.radius);
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`No se pudo cargar ${source}`));
    image.src = source;
  });
}

function createFallbackCanvas(width, height, draw) {
  const fallback = document.createElement("canvas");
  fallback.width = width;
  fallback.height = height;
  const fallbackCtx = fallback.getContext("2d");
  draw(fallbackCtx, width, height);
  return fallback;
}

function createFallbackMarketMap() {
  return createFallbackCanvas(world.width, world.height, (fallbackCtx, width, height) => {
    const gradient = fallbackCtx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#1a1d1e");
    gradient.addColorStop(0.48, "#26343a");
    gradient.addColorStop(1, "#0b1117");
    fallbackCtx.fillStyle = gradient;
    fallbackCtx.fillRect(0, 0, width, height);
    fallbackCtx.fillStyle = "rgba(244, 212, 154, 0.18)";
    for (let x = 80; x < width; x += 180) {
      fallbackCtx.fillRect(x, 120, 72, height - 240);
    }
  });
}

function createFallbackBotFrame() {
  return createFallbackCanvas(256, 256, (fallbackCtx, width, height) => {
    fallbackCtx.translate(width / 2, height / 2);
    fallbackCtx.fillStyle = "rgba(7, 15, 22, 0.92)";
    fallbackCtx.strokeStyle = "rgba(143, 244, 255, 0.82)";
    fallbackCtx.lineWidth = 8;
    fallbackCtx.beginPath();
    fallbackCtx.roundRect(-58, -70, 116, 140, 28);
    fallbackCtx.fill();
    fallbackCtx.stroke();
    fallbackCtx.fillStyle = "rgba(255, 213, 95, 0.92)";
    fallbackCtx.fillRect(-34, -22, 68, 20);
  });
}

function loadOptionalImage(source, assign) {
  loadImage(source)
    .then(assign)
    .catch(() => {});
}

function loadPlayerVisualFramesInBackground() {
  Promise.all([
    ...leanFrameSources.slice(1).map((source) => loadImage(source)),
    loadImage(playerVisualFrameSources.back),
    ...playerVisualFrameSources.side.map((source) => loadImage(source)),
    ...playerVisualFrameSources.hover.map((source) => loadImage(source)),
  ])
    .then((visualFrames) => {
      const frontRestCount = Math.max(0, leanFrameSources.length - 1);
      const botFrames = [assets.botFrames[0], ...visualFrames.slice(0, frontRestCount)].filter(Boolean);
      const backFrame = visualFrames[frontRestCount];
      const sideFramesStart = frontRestCount + 1;
      const sideFrames = visualFrames.slice(sideFramesStart, sideFramesStart + playerVisualFrameSources.side.length);
      const hoverFrames = visualFrames.slice(sideFramesStart + playerVisualFrameSources.side.length);

      assets.botFrames = botFrames;
      assets.frontFrames = botFrames;
      assets.backFrame = backFrame;
      assets.sideFrames = sideFrames;
      assets.hoverFrames = hoverFrames;
    })
    .catch(() => {});
}

function getCameraTarget() {
  const leadX = clamp(player.vx * 0.28, -92, 92);
  const leadY = clamp(player.vy * 0.22, -70, 70);
  const visibleWorld = getVisibleWorldSize();

  return {
    x: clamp(
      player.x + leadX - visibleWorld.width / 2,
      0,
      Math.max(0, world.width - visibleWorld.width),
    ),
    y: clamp(
      player.y + leadY - visibleWorld.height / 2,
      0,
      Math.max(0, world.height - visibleWorld.height),
    ),
  };
}

function snapCameraToPlayer() {
  const target = getCameraTarget();
  camera.x = target.x;
  camera.y = target.y;
}

function createPlayerVisual() {
  playerVisual = window.PoCoBOTPlayerVisual.create({
    ctx,
    player,
    assets,
    clamp,
    damp,
    drawSoftShadow,
    baseSize: player.spriteWidth,
    sideFrameVerticalOffsets: playerVisualFrameSources.sideFrameVerticalOffsets,
  });
}

function updatePlayerVisual(dt, hasInput, speedRatio) {
  if (playerVisual) {
    playerVisual.update(dt, hasInput, speedRatio);
  }
}

async function loadAssets() {
  const [mapImage, firstBotFrame] = await Promise.all([
    loadImage("./assets/mercado-reles-rendered-map-optimized.jpg").catch((error) => {
      console.warn(error);
      return loadImage("./assets/mercado-reles-rendered-map.png").catch(() => createFallbackMarketMap());
    }),
    loadImage(leanFrameSources[0]).catch((error) => {
      console.warn(error);
      return createFallbackBotFrame();
    }),
  ]);

  assets.map = mapImage;
  assets.botFrames = [firstBotFrame];
  assets.frontFrames = assets.botFrames;
  loadOptionalImage("./assets/vera-hex-rendered.png", (image) => {
    assets.vera = image;
  });
  loadOptionalImage("./assets/pocobot-sparring-topdown.png", (image) => {
    assets.sparringBot = image;
  });
  createPlayerVisual();
  assets.ready = true;
  snapCameraToPlayer();
  window.setTimeout(loadPlayerVisualFramesInBackground, 450);
}

function update(dt) {
  if (!assets.ready) {
    return;
  }

  if (hudHelp.expanded && hudHelp.autoCollapse) {
    hudHelp.elapsed += dt;
    if (hudHelp.elapsed >= hudHelp.collapseDelay) {
      hudHelp.expanded = false;
    }
  }

  let moveX = 0;
  let moveY = 0;
  let movePower = 0;

  if (input.left) moveX -= 1;
  if (input.right) moveX += 1;
  if (input.up) moveY -= 1;
  if (input.down) moveY += 1;

  const keyboardMagnitude = Math.hypot(moveX, moveY);
  if (keyboardMagnitude > 0) {
    moveX /= keyboardMagnitude;
    moveY /= keyboardMagnitude;
    movePower = 1;
  } else if (input.pointerActive) {
    const pointerDx = input.pointerX - player.x;
    const pointerDy = input.pointerY - player.y;
    const pointerDistance = Math.hypot(pointerDx, pointerDy);

    if (pointerDistance > 28) {
      moveX = pointerDx / pointerDistance;
      moveY = pointerDy / pointerDistance;
      movePower = clamp((pointerDistance - 28) / 170, 0.24, 1);
    }
  }

  const hasInput = movePower > 0;

  if (hasInput) {
    player.vx += moveX * player.acceleration * movePower * dt;
    player.vy += moveY * player.acceleration * movePower * dt;
    player.targetAngle = Math.atan2(moveY, moveX) - Math.PI / 2;
  } else {
    player.vx = damp(player.vx, 0, player.drag, dt);
    player.vy = damp(player.vy, 0, player.drag, dt);
  }

  const currentSpeed = Math.hypot(player.vx, player.vy);

  if (currentSpeed > player.maxSpeed) {
    const scale = player.maxSpeed / currentSpeed;
    player.vx *= scale;
    player.vy *= scale;
  }

  const nextX = player.x + player.vx * dt;
  const nextY = player.y + player.vy * dt;

  if (canMoveTo(nextX, player.y)) {
    player.x = nextX;
  } else {
    player.vx *= -0.12;
  }

  if (canMoveTo(player.x, nextY)) {
    player.y = nextY;
  } else {
    player.vy *= -0.12;
  }

  const glideSpeed = Math.hypot(player.vx, player.vy);
  if (!hasInput && glideSpeed > 8) {
    player.targetAngle = Math.atan2(player.vy, player.vx) - Math.PI / 2;
  }

  player.angle = lerpAngle(player.angle, player.targetAngle, hasInput ? 5.5 : 3.8, dt);

  const speedRatio = clamp(glideSpeed / player.maxSpeed, 0, 1);
  updatePlayerVisual(dt, hasInput, speedRatio);
  updateInteractions(dt);

  const target = getCameraTarget();

  camera.x += (target.x - camera.x) * camera.smoothness;
  camera.y += (target.y - camera.y) * camera.smoothness;
  rememberMarketScenePosition();
}

function drawMap() {
  ctx.drawImage(assets.map, 0, 0, world.width, world.height);
}

function emitExhaustParticle(thruster, power) {
  const origin = localPointToWorld(thruster.x, thruster.y);
  const backward = localVectorToWorld(
    player.flameSkewX * 0.018 + (Math.random() - 0.5) * 0.34,
    -1,
  );
  const speed = 90 + power * 150 + Math.random() * 50;

  exhaustParticles.push({
    x: origin.x + backward.x * 10,
    y: origin.y + backward.y * 10,
    vx: backward.x * speed - player.vx * 0.22,
    vy: backward.y * speed - player.vy * 0.22,
    age: 0,
    life: 0.28 + Math.random() * 0.18,
    size: 4 + Math.random() * 7 + power * 4,
  });

  if (exhaustParticles.length > 90) {
    exhaustParticles.splice(0, exhaustParticles.length - 90);
  }
}

function updateExhaustParticles(dt, hasInput, speedRatio) {
  const power = player.thrustPower * (hasInput ? 1 : 0.45 + speedRatio * 0.4);
  player.particleDebt += power * dt * 28;

  while (player.particleDebt >= 1) {
    const thruster = thrusters[Math.floor(Math.random() * thrusters.length)];
    emitExhaustParticle(thruster, power);
    player.particleDebt -= 1;
  }

  for (let i = exhaustParticles.length - 1; i >= 0; i -= 1) {
    const particle = exhaustParticles[i];
    particle.age += dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 1 - Math.min(0.9, dt * 1.8);
    particle.vy *= 1 - Math.min(0.9, dt * 1.8);

    if (particle.age >= particle.life) {
      exhaustParticles.splice(i, 1);
    }
  }
}

function getInteractionDistance(interactable) {
  return Math.hypot(player.x - interactable.x, player.y - interactable.y);
}

function updateInteractions(dt) {
  interactionState.messageTimer = Math.max(0, interactionState.messageTimer - dt);
  const now = performance.now();

  let nearest = null;
  let nearestDistance = Infinity;

  interactables.forEach((interactable) => {
    const distance = getInteractionDistance(interactable);
    if (distance <= interactable.radius && distance < nearestDistance) {
      nearest = interactable;
      nearestDistance = distance;
    }
  });

  interactionState.active = nearest;

  if (
    touchInteractionConfirmationState.targetId &&
    (nearest?.id !== touchInteractionConfirmationState.targetId || now > touchInteractionConfirmationState.expiresAt)
  ) {
    resetTouchInteractionConfirmation();
  }

  if (input.interactQueued) {
    if (nearest) {
      if (nearest.id === "vera") {
        if (!confirmTouchInteraction(nearest, now)) {
          input.interactQueued = false;
          return;
        }

        setInteractionMessage("Vera Hex abre su mostrador entre piezas y antiguas monedas.", 1.6);
        postStoryTutorialAction("talk-vera");
      } else if (nearest.id === "sparring") {
        if (!confirmTouchInteraction(nearest, now)) {
          input.interactQueued = false;
          return;
        }

        setInteractionMessage(nearest.message, 3.4);
        postStoryTutorialAction("sparring");
      } else if (nearest.id === "map_exit") {
        resetTouchInteractionConfirmation();
        setInteractionMessage(nearest.message, 3.4);
        postStoryTutorialAction("return-map");
      }
    } else {
      resetTouchInteractionConfirmation();
      setInteractionMessage("Acercate a Vera Hex, Viajero o la salida para interactuar.", 2.4);
    }

    input.interactQueued = false;
  }
}

function drawExhaustParticles() {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  exhaustParticles.forEach((particle) => {
    const fade = 1 - particle.age / particle.life;
    const radius = particle.size * (0.55 + fade * 0.75);
    const gradient = ctx.createRadialGradient(
      particle.x,
      particle.y,
      0,
      particle.x,
      particle.y,
      radius,
    );

    gradient.addColorStop(0, `rgba(230, 255, 255, ${0.55 * fade})`);
    gradient.addColorStop(0.32, `rgba(45, 230, 255, ${0.42 * fade})`);
    gradient.addColorStop(1, "rgba(0, 60, 255, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function drawSoftShadow(x, y, width, height, alpha = 0.34) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, Math.max(width, height) * 0.5);
  gradient.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.save();
  ctx.scale(1, height / width);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y / (height / width), width * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWorldLabel(x, y, title, subtitle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.font = "700 16px Trebuchet MS";
  const titleWidth = ctx.measureText(title).width;
  ctx.font = "12px Trebuchet MS";
  const subtitleWidth = ctx.measureText(subtitle).width;
  const width = Math.max(titleWidth, subtitleWidth) + 28;

  ctx.fillStyle = "rgba(5, 10, 14, 0.82)";
  ctx.strokeStyle = "rgba(80, 235, 255, 0.34)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-width / 2, -60, width, 48, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f5fbff";
  ctx.font = "700 16px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(title, 0, -40);
  ctx.fillStyle = "rgba(180, 244, 255, 0.82)";
  ctx.font = "12px Trebuchet MS";
  ctx.fillText(subtitle, 0, -22);
  ctx.restore();
}

function drawInteractionMarker(interactable) {
  const distance = getInteractionDistance(interactable);
  const isActive = interactionState.active?.id === interactable.id;
  const pulse = 0.5 + Math.sin(player.glow * 4) * 0.5;
  const ringAlpha = isActive ? 0.48 + pulse * 0.22 : distance < interactable.radius * 1.45 ? 0.2 : 0.08;

  ctx.save();
  ctx.translate(interactable.x, interactable.y);
  ctx.strokeStyle = `rgba(66, 238, 255, ${ringAlpha})`;
  ctx.lineWidth = isActive ? 3 : 1.5;
  ctx.setLineDash(isActive ? [10, 8] : [4, 9]);
  ctx.beginPath();
  ctx.arc(0, 0, interactable.radius * 0.54, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (isActive) {
    drawWorldLabel(interactable.x, interactable.y - interactable.radius * 0.46, interactable.label, interactable.hint);
  }
}

function drawInteractionMarkers() {
  interactables.forEach(drawInteractionMarker);
}

function drawPointerTarget() {
  if (!input.pointerActive) {
    return;
  }

  const distance = Math.hypot(input.pointerX - player.x, input.pointerY - player.y);
  const alpha = clamp(distance / 180, 0.18, 0.72);
  const pulse = 0.5 + Math.sin(player.glow * 6) * 0.5;
  const radius = 18 + pulse * 5;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(115, 246, 255, ${alpha})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(input.pointerX, input.pointerY);
  ctx.stroke();
  ctx.setLineDash([]);

  const gradient = ctx.createRadialGradient(
    input.pointerX,
    input.pointerY,
    0,
    input.pointerX,
    input.pointerY,
    radius * 1.8,
  );
  gradient.addColorStop(0, `rgba(220, 255, 255, ${0.18 * alpha})`);
  gradient.addColorStop(0.45, `rgba(42, 224, 255, ${0.2 * alpha})`);
  gradient.addColorStop(1, "rgba(0, 100, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(input.pointerX, input.pointerY, radius * 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(190, 255, 255, ${0.62 * alpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(input.pointerX, input.pointerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(input.pointerX - radius * 0.58, input.pointerY);
  ctx.lineTo(input.pointerX + radius * 0.58, input.pointerY);
  ctx.moveTo(input.pointerX, input.pointerY - radius * 0.58);
  ctx.lineTo(input.pointerX, input.pointerY + radius * 0.58);
  ctx.stroke();
  ctx.restore();
}

function drawVeraHex() {
  if (!assets.vera) {
    return;
  }

  const width = 76;
  const height = 176;

  drawSoftShadow(interactables[0].x, interactables[0].y + 12, 58, 18, 0.26);
  ctx.drawImage(
    assets.vera,
    interactables[0].x - width / 2,
    interactables[0].y - height + 22,
    width,
    height,
  );
}

function drawTrainingBot() {
  if (!assets.sparringBot) {
    return;
  }

  const bot = interactables[1];
  const bob = Math.sin(player.glow * 1.8) * 2;

  drawSoftShadow(bot.x, bot.y + 58, 150, 42, 0.38);

  ctx.save();
  ctx.translate(bot.x, bot.y + bob);
  ctx.rotate(Math.sin(player.glow * 0.9) * 0.018);
  ctx.drawImage(assets.sparringBot, -96, -118, 192, 192);
  ctx.restore();
}

function drawWorldActors() {
  const actors = [
    { y: interactables[0].y, draw: drawVeraHex },
    { y: interactables[1].y, draw: drawTrainingBot },
    { y: player.y, draw: drawPlayer },
  ];

  actors.sort((a, b) => a.y - b.y);
  actors.forEach((actor) => actor.draw());
}

function drawFlameJet(thruster, power) {
  const pulse = 0.82 + Math.sin(player.thrustCycle + thruster.phase) * 0.18;
  const speedRatio = clamp(Math.hypot(player.vx, player.vy) / player.maxSpeed, 0, 1);
  const length = (24 + power * 70 + speedRatio * 28) * pulse;
  const width = thruster.width * (0.8 + power * 0.7);
  const lick = Math.sin(player.thrustCycle * 1.7 + thruster.phase) * width * 0.22;
  const tipX = player.flameSkewX * (0.55 + power * 0.45) + lick;
  const tipY = -length + player.flameSkewY;
  const midSkew = player.flameSkewX * 0.38;

  ctx.save();
  ctx.translate(thruster.x, thruster.y);
  ctx.globalCompositeOperation = "lighter";

  const outer = ctx.createLinearGradient(tipX, tipY, 0, 8);
  outer.addColorStop(0, "rgba(0, 54, 255, 0)");
  outer.addColorStop(0.32, `rgba(0, 148, 255, ${0.16 + power * 0.22})`);
  outer.addColorStop(0.78, `rgba(30, 236, 255, ${0.24 + power * 0.42})`);
  outer.addColorStop(1, "rgba(255, 255, 255, 0.78)");

  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.moveTo(-width * 0.55, 5);
  ctx.bezierCurveTo(-width * 0.95 + midSkew, -length * 0.28, -width * 0.35 + midSkew, -length * 0.74, tipX, tipY);
  ctx.bezierCurveTo(width * 0.34 + midSkew, -length * 0.72, width * 0.9 + midSkew, -length * 0.25, width * 0.55, 5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = `rgba(230, 255, 255, ${0.18 + power * 0.34})`;
  ctx.beginPath();
  ctx.moveTo(-width * 0.23, 2);
  ctx.bezierCurveTo(-width * 0.3 + midSkew * 0.5, -length * 0.28, -width * 0.1 + midSkew * 0.7, -length * 0.62, tipX * 0.62, tipY * 0.78);
  ctx.bezierCurveTo(width * 0.18 + midSkew * 0.6, -length * 0.58, width * 0.28, -length * 0.2, width * 0.2, 2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawThrusterFlames() {
  const speedRatio = clamp(Math.hypot(player.vx, player.vy) / player.maxSpeed, 0, 1);
  const power = player.thrustPower * (0.55 + speedRatio * 0.45);

  if (power < 0.04) {
    return;
  }

  thrusters.forEach((thruster) => drawFlameJet(thruster, power));
}

function drawPilotCockpitEmphasis() {
  const flicker = 0.5 + Math.sin(player.glow * 1.6) * 0.5;

  ctx.save();
  ctx.translate(0, -25);

  const canopy = ctx.createLinearGradient(0, -34, 0, 32);
  canopy.addColorStop(0, "rgba(182, 255, 255, 0.2)");
  canopy.addColorStop(0.5, "rgba(10, 205, 225, 0.08)");
  canopy.addColorStop(1, "rgba(2, 82, 104, 0.16)");

  ctx.fillStyle = canopy;
  ctx.strokeStyle = `rgba(135, 255, 255, ${0.34 + flicker * 0.16})`;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.roundRect(-22, -34, 44, 66, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(231, 255, 255, 0.22)";
  ctx.beginPath();
  ctx.ellipse(-8, -18, 3.8, 15, -0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(230, 255, 255, 0.2)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-15, 22);
  ctx.quadraticCurveTo(0, 31, 15, 22);
  ctx.stroke();

  ctx.restore();
}

function drawMechaFrame(frame, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(
    frame,
    -player.spriteWidth / 2,
    -player.spriteHeight / 2,
    player.spriteWidth,
    player.spriteHeight,
  );
  ctx.restore();
}

function drawLeanFrameAnimation() {
  const frames = assets.botFrames;
  const framePosition = clamp(player.leanAmount, 0, 1) * (frames.length - 1);
  const frameIndex = Math.min(frames.length - 1, Math.max(0, Math.round(framePosition)));
  drawMechaFrame(frames[frameIndex], 1);
}

function drawThrusterGroundGlow(thruster, power) {
  const glowPoint = localPointToWorld(thruster.x * 0.72, thruster.y + 82);
  const radius = 26 + power * 34;
  const gradient = ctx.createRadialGradient(
    glowPoint.x,
    glowPoint.y,
    0,
    glowPoint.x,
    glowPoint.y,
    radius,
  );

  gradient.addColorStop(0, `rgba(160, 250, 255, ${0.24 * power})`);
  gradient.addColorStop(0.42, `rgba(18, 210, 255, ${0.18 * power})`);
  gradient.addColorStop(1, "rgba(0, 120, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(glowPoint.x, glowPoint.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayerGroundContact() {
  const speedRatio = clamp(Math.hypot(player.vx, player.vy) / player.maxSpeed, 0, 1);
  const hoverLift = player.thrustPower * 0.28;
  const contact = localPointToWorld(player.leanSide * 8, 68 + player.leanAmount * 8);

  drawSoftShadow(
    contact.x,
    contact.y,
    122 + speedRatio * 36,
    34 - hoverLift * 8,
    0.3 - hoverLift * 0.08,
  );

  if (player.thrustPower < 0.05) {
    return;
  }

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  thrusters.forEach((thruster) => drawThrusterGroundGlow(thruster, player.thrustPower));
  ctx.restore();
}

function drawPlayer() {
  if (playerVisual) {
    playerVisual.draw();
    return;
  }

  const hoverBob = Math.sin(player.thrustCycle * 0.85) * (1.5 + player.thrustPower * 2.2);
  const lean = player.leanAmount;
  const bank = player.leanSide;
  const bodyRoll = Math.sin(player.thrustCycle * 0.55) * player.thrustPower * 0.008;
  const bankRoll = bank * 0.08;
  const leanOffsetY = lean * 5;

  drawPlayerGroundContact();

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);

  drawThrusterFlames();

  ctx.save();
  ctx.translate(bank * 3, hoverBob + leanOffsetY);
  ctx.rotate(bodyRoll + bankRoll);
  drawLeanFrameAnimation();

  ctx.save();
  drawPilotCockpitEmphasis();
  ctx.restore();

  ctx.restore();
  ctx.restore();
}

function drawHud() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const helpWidth = Math.min(520, viewport.width - 36);
  const helpHeight = hudHelp.expanded ? 92 : 38;
  hudHelp.button = {
    x: 18,
    y: 18,
    width: hudHelp.expanded ? helpWidth : 140,
    height: helpHeight,
  };

  ctx.fillStyle = "rgba(8, 17, 29, 0.82)";
  ctx.fillRect(hudHelp.button.x, hudHelp.button.y, hudHelp.button.width, hudHelp.button.height);
  ctx.strokeStyle = "rgba(146, 246, 255, 0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(hudHelp.button.x, hudHelp.button.y, hudHelp.button.width, hudHelp.button.height);

  ctx.fillStyle = "#eef8ff";
  ctx.font = hudHelp.expanded ? "18px Trebuchet MS" : "700 14px Trebuchet MS";
  ctx.fillText(
    hudHelp.expanded ? "PoCoBOT // Mercado de Reles Muertos" : "Info controles",
    32,
    hudHelp.expanded ? 46 : 42,
  );

  if (hudHelp.expanded) {
    ctx.fillStyle = "rgba(238, 248, 255, 0.82)";
    ctx.font = "14px Trebuchet MS";
    ctx.fillText("WASD para moverte · E / Enter para seleccionar", 32, 68);
    ctx.fillText("Raton/dedo para moverte · acercate a puntos activos", 32, 88);
  } else {
    ctx.fillStyle = "rgba(146, 246, 255, 0.78)";
    ctx.font = "14px Trebuchet MS";
    ctx.fillText("+", hudHelp.button.x + hudHelp.button.width - 28, 42);
  }

  if (interactionState.messageTimer > 0 || interactionState.active) {
    const message = interactionState.messageTimer > 0
      ? interactionState.message
      : `${interactionState.active.label}: ${interactionState.active.hint.toLowerCase()} disponible.`;

    ctx.fillStyle = "rgba(8, 17, 29, 0.88)";
    ctx.fillRect(18, viewport.height - 76, viewport.width - 36, 52);
    ctx.strokeStyle = "rgba(255, 213, 95, 0.36)";
    ctx.strokeRect(18, viewport.height - 76, viewport.width - 36, 52);

    ctx.fillStyle = "#ffd55f";
    ctx.font = "16px Trebuchet MS";
    ctx.fillText(message, 34, viewport.height - 44);
  }
}

function drawFittedLoadingText(text, x, y, maxWidth, size, weight = "700", color = "#eef8ff", align = "left") {
  let fontSize = size;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  do {
    ctx.font = `${weight} ${fontSize}px Trebuchet MS`;
    if (ctx.measureText(text).width <= maxWidth || fontSize <= 12) break;
    fontSize -= 1;
  } while (fontSize > 12);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawChapterLoadingScreen(config) {
  const width = viewport.width;
  const height = viewport.height;
  const time = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
  ctx.clearRect(0, 0, width, height);

  const baseGradient = ctx.createLinearGradient(0, 0, width, height);
  baseGradient.addColorStop(0, config.shadow || "#16110f");
  baseGradient.addColorStop(0.48, "#08111d");
  baseGradient.addColorStop(1, config.deep || "#102a31");
  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = config.grid || "rgba(132, 234, 255, 0.16)";
  ctx.lineWidth = 1;
  for (let x = -height; x < width + height; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(x + height, 0);
    ctx.stroke();
  }
  for (let y = 24; y < height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  const scanY = (time * 56) % Math.max(height, 1);
  const scanGradient = ctx.createLinearGradient(0, scanY - 42, 0, scanY + 42);
  scanGradient.addColorStop(0, "rgba(132, 234, 255, 0)");
  scanGradient.addColorStop(0.5, config.scan || "rgba(132, 234, 255, 0.18)");
  scanGradient.addColorStop(1, "rgba(132, 234, 255, 0)");
  ctx.fillStyle = scanGradient;
  ctx.fillRect(0, scanY - 42, width, 84);

  const panelW = Math.min(Math.max(width * 0.58, 520), width - 44);
  const panelH = Math.min(230, height - 56);
  const panelX = (width - panelW) / 2;
  const panelY = (height - panelH) / 2;
  const compact = panelW < 500;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = 28;
  ctx.fillStyle = "rgba(5, 12, 20, 0.78)";
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 22);
  ctx.fill();
  ctx.restore();

  const accentGradient = ctx.createLinearGradient(panelX, panelY, panelX + panelW, panelY);
  accentGradient.addColorStop(0, config.accent || "#ffd55f");
  accentGradient.addColorStop(0.55, "#84eaff");
  accentGradient.addColorStop(1, "rgba(132, 234, 255, 0.15)");
  ctx.strokeStyle = accentGradient;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 22);
  ctx.stroke();

  ctx.fillStyle = accentGradient;
  ctx.fillRect(panelX + 22, panelY + 22, Math.max(56, panelW * 0.18), 3);
  ctx.fillRect(panelX + 22, panelY + panelH - 25, Math.max(92, panelW * 0.26), 3);

  const radarX = compact ? panelX + panelW - 54 : panelX + 82;
  const radarY = compact ? panelY + 54 : panelY + 92;
  const radarRadius = compact ? 34 : 48;
  ctx.strokeStyle = "rgba(132, 234, 255, 0.28)";
  ctx.lineWidth = 2;
  for (let ring = 1; ring <= 3; ring += 1) {
    ctx.beginPath();
    ctx.arc(radarX, radarY, (radarRadius / 3) * ring, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(radarX, radarY);
  ctx.rotate(time * 1.8);
  const sweep = ctx.createLinearGradient(0, 0, radarRadius, 0);
  sweep.addColorStop(0, config.accent || "#ffd55f");
  sweep.addColorStop(1, "rgba(132, 234, 255, 0)");
  ctx.strokeStyle = sweep;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(radarRadius, 0);
  ctx.stroke();
  ctx.restore();

  const textX = compact ? panelX + 24 : panelX + 154;
  const textMax = compact ? panelW - 48 : panelW - 188;
  drawFittedLoadingText(config.kicker, textX, panelY + 48, textMax, 13, "700", config.accent || "#ffd55f");
  drawFittedLoadingText(config.title, textX, panelY + 88, textMax, compact ? 24 : 30, "800", "#eef8ff");
  drawFittedLoadingText(config.subtitle, textX, panelY + 121, textMax, 16, "600", "rgba(238, 248, 255, 0.74)");

  const barX = textX;
  const barY = panelY + panelH - 70;
  const barW = textMax;
  const progress = 0.18 + ((Math.sin(time * 2.2) + 1) / 2) * 0.72;
  ctx.fillStyle = "rgba(238, 248, 255, 0.08)";
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, 12, 6);
  ctx.fill();
  const fillGradient = ctx.createLinearGradient(barX, barY, barX + barW, barY);
  fillGradient.addColorStop(0, config.accent || "#ffd55f");
  fillGradient.addColorStop(1, "#84eaff");
  ctx.fillStyle = fillGradient;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW * progress, 12, 6);
  ctx.fill();

  const statusText = config.status || "Sincronizando sistemas de Ruta Ceniza";
  drawFittedLoadingText(statusText, barX, barY + 39, barW, 12, "700", "rgba(132, 234, 255, 0.82)");
  ctx.textAlign = "left";
}

function drawLoading() {
  drawChapterLoadingScreen({
    kicker: "Mercado explorable",
    title: "Mercado de Relés Muertos",
    subtitle: "Preparando puestos, cartas y puntos de interacción",
    status: "Vera está calibrando precios, monedas y barajas",
    accent: "#f4d49a",
    shadow: "#201711",
    deep: "#122732",
    scan: "rgba(244, 212, 154, 0.16)"
  });
}

function render() {
  if (!assets.ready) {
    drawLoading();
    return;
  }

  ctx.clearRect(0, 0, viewport.width, viewport.height);
  ctx.save();
  const cameraZoom = getCameraZoom();
  ctx.scale(cameraZoom, cameraZoom);
  ctx.translate(-camera.x, -camera.y);

  drawMap();
  drawExhaustParticles();
  drawInteractionMarkers();
  drawPointerTarget();
  drawWorldActors();

  ctx.restore();

  const vignette = ctx.createRadialGradient(
    viewport.width / 2,
    viewport.height / 2,
    120,
    viewport.width / 2,
    viewport.height / 2,
    620,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(4, 8, 14, 0.34)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  drawHud();
}

let lastTime = performance.now();

function gameLoop(currentTime) {
  const dt = Math.min((currentTime - lastTime) / 1000, 0.033);
  lastTime = currentTime;

  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

drawLoading();
requestAnimationFrame(gameLoop);
requestAnimationFrame(() => {
  window.setTimeout(() => {
    loadAssets()
      .catch((error) => {
        console.error("No se pudieron cargar los activos del juego:", error);
      })
      .finally(() => {
        startMarketCrowdAmbience();
      });
  }, 0);
});
