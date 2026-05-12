const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const orientationOverlay = document.getElementById("orientation-overlay");
const orientationLockButton = document.getElementById("orientation-lock-button");
const orientationLockStatus = document.getElementById("orientation-lock-status");
const storyMapButton = document.getElementById("story-map-button");
const campMusic = document.getElementById("camp-music");

const storyParams = new URLSearchParams(window.location.search);
const storyEmbedMode = storyParams.get("story_embed") === "1";
const storyReturnUrl = storyParams.get("story_return") || "";
const storyAudioMode = storyParams.get("story_audio") || "internal";

if (storyEmbedMode) {
  document.body.classList.add("story-embed-mode");
}

canvas.setAttribute("tabindex", "0");
canvas.setAttribute("draggable", "false");

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

const player = {
  x: 746,
  y: 618,
  radius: 26,
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
  spriteWidth: 174,
  spriteHeight: 174,
};

const camera = {
  x: 0,
  y: 0,
  smoothness: 0.1,
};

const DESKTOP_CAMERA_ZOOM = 0.86;
const desktopCameraMedia = window.matchMedia("(pointer: fine) and (hover: hover)");

const assets = {
  map: new Image(),
  botFrames: [],
  frontFrames: [],
  sideFrames: [],
  hoverFrames: [],
  backFrame: null,
  ready: false,
};

const collisionZones = [
  { type: "rect", x: 0, y: -80, width: 1536, height: 120 },
  { type: "rect", x: 0, y: 984, width: 1536, height: 120 },
  { type: "rect", x: -80, y: 0, width: 120, height: 1024 },
  { type: "rect", x: 1496, y: 0, width: 120, height: 1024 },
  { type: "ellipse", x: 498.004987531172, y: 703.1785609912912, width: 265, height: 270 },
  { type: "ellipse", x: 689, y: 814, width: 199, height: 207 },
  { type: "ellipse", x: 1254, y: 626, width: 246, height: 277 },
  { type: "ellipse", x: 1148.7755610972567, y: 680.6725699924017, width: 167, height: 115 },
  { type: "ellipse", x: 1361, y: 590, width: 127, height: 102 },
  { type: "ellipse", x: 1111, y: 22, width: 236, height: 284 },
  { type: "ellipse", x: 954, y: 173, width: 190, height: 104 },
  { type: "ellipse", x: 1280, y: 384, width: 220, height: 75 },
  { type: "ellipse", x: 1329, y: 186, width: 177, height: 149 },
  { type: "ellipse", x: 678, y: 32, width: 163, height: 128 },
  { type: "ellipse", x: 826, y: 104, width: 102, height: 72 },
  { type: "ellipse", x: 742, y: 121, width: 104, height: 55 },
  { type: "ellipse", x: 613, y: 93, width: 113, height: 76 },
  { type: "ellipse", x: 546, y: 58, width: 79, height: 64 },
  { type: "ellipse", x: 477, y: 104, width: 115, height: 74 },
  { type: "ellipse", x: 412, y: 133, width: 97, height: 65 },
  { type: "ellipse", x: 604, y: 198, width: 71, height: 53 },
  { type: "ellipse", x: 667, y: 201, width: 19, height: 46 },
  { type: "ellipse", x: 681, y: 214, width: 33, height: 31 },
  { type: "ellipse", x: 708, y: 226, width: 29, height: 23 },
  { type: "ellipse", x: 753, y: 296, width: 53, height: 77 },
  { type: "ellipse", x: 794, y: 328, width: 53, height: 59 },
  { type: "ellipse", x: 852, y: 359, width: 45, height: 46 },
  { type: "ellipse", x: 898, y: 353, width: 41, height: 75 },
  { type: "ellipse", x: 947, y: 389, width: 47, height: 67 },
  { type: "ellipse", x: 1001, y: 432, width: 90, height: 78 },
  { type: "ellipse", x: 907, y: 466, width: 131, height: 85 },
  { type: "ellipse", x: 870, y: 506, width: 66, height: 77 },
  { type: "ellipse", x: 806, y: 560, width: 80, height: 65 },
  { type: "ellipse", x: 690, y: 326, width: 60, height: 41 },
  { type: "ellipse", x: 640, y: 318, width: 37, height: 52 },
  { type: "ellipse", x: 636, y: 291, width: 25, height: 31 },
  { type: "ellipse", x: 649, y: 337, width: 59, height: 34 },
  { type: "ellipse", x: 591, y: 330, width: 43, height: 49 },
  { type: "ellipse", x: 603, y: 340, width: 48, height: 41 },
  { type: "ellipse", x: 575, y: 321, width: 25, height: 43 },
  { type: "ellipse", x: 395, y: 406, width: 103, height: 61 },
  { type: "ellipse", x: 483, y: 495, width: 76, height: 57 },
  { type: "ellipse", x: 406, y: 590, width: 53, height: 72 },
  { type: "ellipse", x: 344, y: 581, width: 60, height: 60 },
  { type: "ellipse", x: 323, y: 550, width: 70, height: 52 },
  { type: "ellipse", x: 364, y: 577, width: 70, height: 36 },
  { type: "ellipse", x: 377, y: 557, width: 34, height: 31 },
  { type: "ellipse", x: 311, y: 524, width: 55, height: 46 },
  { type: "ellipse", x: 175, y: 642, width: 263, height: 101 },
  { type: "ellipse", x: 223, y: 588, width: 113, height: 85 },
  { type: "ellipse", x: 71, y: 524, width: 74, height: 168 },
  { type: "ellipse", x: 114, y: 600, width: 141, height: 112 },
  { type: "ellipse", x: 56, y: 697, width: 235, height: 131 },
  { type: "ellipse", x: 24, y: 758, width: 168, height: 138 },
  { type: "ellipse", x: 16, y: 629, width: 138, height: 139 },
  { type: "ellipse", x: 129, y: 131, width: 216, height: 249 },
  { type: "ellipse", x: 340, y: 228, width: 149, height: 92 },
  { type: "ellipse", x: 22, y: 132, width: 320, height: 140 },
  { type: "ellipse", x: 0, y: 242, width: 182, height: 124 },
  { type: "ellipse", x: 1018, y: 656, width: 239, height: 91 }
];

window.PoCoBOTStoryCollisionEditor?.applySceneZones("campamento-placas-rojas", collisionZones);

const interactables = [];
window.PoCoBOTStoryCollisionEditor?.applySceneInteractionPoints("campamento-placas-rojas", interactables);

const interactionState = {
  active: null,
  message: "",
  messageTimer: 0,
};

const hudHelp = {
  expanded: !storyEmbedMode,
  autoCollapse: true,
  elapsed: 0,
  collapseDelay: 5,
  button: { x: 18, y: 18, width: 140, height: 38 },
};

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

const leanFrameSources = [
  "../shared-mecha-orientation/assets/pocobot-mecha-idle-hover-00.png",
];
const playerVisualFrameSources = window.PoCoBOTPlayerVisual?.assetSources("../shared-mecha-orientation/assets");
let playerVisual = null;
let lastTime = performance.now();
let campMusicStarted = false;
let campMusicShouldPlay = true;
let campMusicFadeFrame = null;

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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function damp(current, target, rate, dt) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
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

function getCanvasScreenPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = viewport.width / rect.width;
  const scaleY = viewport.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
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

function isPointInsideRect(point, rect) {
  return (
    point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height
  );
}

function circleRectCollision(circleX, circleY, radius, rect) {
  const nearestX = clamp(circleX, rect.x, rect.x + rect.width);
  const nearestY = clamp(circleY, rect.y, rect.y + rect.height);
  const dx = circleX - nearestX;
  const dy = circleY - nearestY;
  return dx * dx + dy * dy < radius * radius;
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

function collisionZoneHit(circleX, circleY, radius, zone) {
  if (zone.type === "rect") {
    return circleRectCollision(circleX, circleY, radius, zone);
  }
  return circleEllipseCollision(circleX, circleY, radius, zone);
}

function canMoveTo(nextX, nextY) {
  if (nextX - player.radius < 0 || nextX + player.radius > world.width) {
    return false;
  }

  if (nextY - player.radius < 0 || nextY + player.radius > world.height) {
    return false;
  }

  return !collisionZones.some((zone) =>
    collisionZoneHit(nextX, nextY, player.radius, zone),
  );
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

function createFallbackCampMap() {
  return createFallbackCanvas(world.width, world.height, (fallbackCtx, width, height) => {
    const gradient = fallbackCtx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#29100c");
    gradient.addColorStop(0.52, "#3a2419");
    gradient.addColorStop(1, "#090808");
    fallbackCtx.fillStyle = gradient;
    fallbackCtx.fillRect(0, 0, width, height);
    fallbackCtx.fillStyle = "rgba(195, 50, 36, 0.28)";
    for (let x = 100; x < width; x += 260) {
      fallbackCtx.fillRect(x, 130, 120, height - 260);
    }
  });
}

function createFallbackBotFrame() {
  return createFallbackCanvas(256, 256, (fallbackCtx, width, height) => {
    fallbackCtx.translate(width / 2, height / 2);
    fallbackCtx.fillStyle = "rgba(7, 15, 22, 0.92)";
    fallbackCtx.strokeStyle = "rgba(140, 236, 255, 0.82)";
    fallbackCtx.lineWidth = 8;
    fallbackCtx.beginPath();
    fallbackCtx.roundRect(-58, -70, 116, 140, 28);
    fallbackCtx.fill();
    fallbackCtx.stroke();
    fallbackCtx.fillStyle = "rgba(255, 177, 92, 0.92)";
    fallbackCtx.fillRect(-34, -22, 68, 20);
  });
}

function createPlayerVisual() {
  if (!window.PoCoBOTPlayerVisual || !playerVisualFrameSources) return;
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

async function loadAssets() {
  const [mapImage, firstBotFrame] = await Promise.all([
    loadImage("./assets/campamento-placas-rojas-map.webp").catch((error) => {
      console.warn(error);
      return createFallbackCampMap();
    }),
    loadImage(leanFrameSources[0]).catch((error) => {
      console.warn(error);
      return createFallbackBotFrame();
    }),
  ]);

  assets.map = mapImage;
  assets.botFrames = [firstBotFrame];
  assets.frontFrames = assets.botFrames;

  if (playerVisualFrameSources) {
    Promise.all([
      loadImage(playerVisualFrameSources.back),
      ...playerVisualFrameSources.side.map((source) => loadImage(source)),
      ...playerVisualFrameSources.hover.map((source) => loadImage(source)),
    ])
      .then((visualFrames) => {
        assets.backFrame = visualFrames[0];
        assets.sideFrames = visualFrames.slice(1, 1 + playerVisualFrameSources.side.length);
        assets.hoverFrames = visualFrames.slice(1 + playerVisualFrameSources.side.length);
      })
      .catch(() => {});
  }

  createPlayerVisual();
  assets.ready = true;
  snapCameraToPlayer();
}

function fadeCampMusic(targetVolume, duration = 700, onComplete = null) {
  if (!campMusic) return;
  if (campMusicFadeFrame) {
    window.cancelAnimationFrame(campMusicFadeFrame);
    campMusicFadeFrame = null;
  }

  const startVolume = Number.isFinite(campMusic.volume) ? campMusic.volume : 0;
  const safeTarget = clamp(targetVolume, 0, 1);
  const startAt = performance.now();
  const step = (now) => {
    const progress = clamp((now - startAt) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    campMusic.volume = startVolume + (safeTarget - startVolume) * eased;
    if (progress < 1) {
      campMusicFadeFrame = window.requestAnimationFrame(step);
      return;
    }
    campMusicFadeFrame = null;
    campMusic.volume = safeTarget;
    onComplete?.();
  };
  campMusicFadeFrame = window.requestAnimationFrame(step);
}

function primeParentCampMusic() {
  if (!storyEmbedMode || window.parent === window) return;

  try {
    const parentMusic = window.parent.document?.getElementById("storyMapMusic");
    if (!parentMusic) return;

    const targetSource = new URL("../Silencio de Acero.mp3", window.location.href).href;
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
    parentMusic.volume = 0.34;
    parentMusic.play()?.catch?.(() => {});
  } catch (error) {}
}

async function startCampMusic() {
  if (!campMusic || !campMusicShouldPlay) return;

  if (storyAudioMode === "external") {
    campMusicStarted = true;
    primeParentCampMusic();
    return;
  }

  try {
    if (!campMusicStarted) {
      campMusic.volume = 0;
    }
    campMusicStarted = true;
    await campMusic.play();
    if (campMusic.volume < 0.33) {
      fadeCampMusic(0.34, 950);
    }
  } catch (error) {
    campMusicStarted = false;
  }
}

function stopCampMusic(immediate = false) {
  if (!campMusic) return;
  campMusicShouldPlay = false;
  if (campMusicFadeFrame) {
    window.cancelAnimationFrame(campMusicFadeFrame);
    campMusicFadeFrame = null;
  }
  if (immediate) {
    campMusic.pause();
    campMusic.volume = 0;
    return;
  }
  fadeCampMusic(0, 260, () => campMusic.pause());
}

function postStoryCampAction(action, payload = {}) {
  stopCampMusic(true);

  const message = {
    type: "pocobot-story-camp-action",
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
  startCampMusic();

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

function toggleHudHelp() {
  hudHelp.expanded = !hudHelp.expanded;
  hudHelp.autoCollapse = false;
  hudHelp.elapsed = 0;
}

function syncHudHelpCursor(event) {
  if (event.pointerType !== "mouse") return;
  const screenPoint = getCanvasScreenPoint(event);
  canvas.style.cursor = isPointInsideRect(screenPoint, hudHelp.button) ? "pointer" : "none";
}

function updatePointerTarget(event) {
  const screenPoint = getCanvasScreenPoint(event);
  const zoom = getCameraZoom();

  input.pointerX = clamp(camera.x + screenPoint.x / zoom, 0, world.width);
  input.pointerY = clamp(camera.y + screenPoint.y / zoom, 0, world.height);
}

canvas.addEventListener("pointerdown", (event) => {
  focusExplorationInput();
  startCampMusic();

  if (event.pointerType === "mouse" && event.button !== 0) return;

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
  if (!input.pointerActive || event.pointerId !== input.pointerId) return;

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
  if (event.pointerId !== input.pointerId) return;

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

window.addEventListener("keydown", (event) => {
  if (!handleStoryExplorationKeyDown(event.key, { repeat: event.repeat })) return;
  event.preventDefault();
});

window.addEventListener("keyup", (event) => {
  if (!handleStoryExplorationKeyUp(event.key)) return;
  event.preventDefault();
});

window.addEventListener("load", () => {
  window.setTimeout(focusExplorationInput, 40);
});

window.addEventListener("message", (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === "pocobot-story-exploration-focus") {
    focusExplorationInput();
    return;
  }

  if (data.type !== "pocobot-story-exploration-key") return;

  if (data.phase === "up") {
    handleStoryExplorationKeyUp(data.key);
    return;
  }

  handleStoryExplorationKeyDown(data.key, { repeat: false });
});

storyMapButton?.addEventListener("click", () => {
  setInteractionMessage("Volviendo al mapa de la Ruta Ceniza...", 1.4);
  postStoryCampAction("return-map");
});

["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
  window.addEventListener(eventName, () => startCampMusic(), { passive: true });
});

document.addEventListener("visibilitychange", () => {
  if (!campMusic) return;
  if (document.hidden) {
    campMusic.pause();
    return;
  }
  startCampMusic();
});

const portraitMedia = window.matchMedia("(orientation: portrait)");
const coarsePointerMedia = window.matchMedia("(pointer: coarse)");

function shouldShowLandscapePrompt() {
  return portraitMedia.matches && coarsePointerMedia.matches;
}

function updateLandscapePrompt() {
  if (!orientationOverlay) return;
  orientationOverlay.hidden = !shouldShowLandscapePrompt();
}

async function requestLandscapeLock() {
  if (!orientationLockStatus) return;
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

function findActiveInteraction() {
  interactionState.active = null;
}

function update(dt) {
  if (!assets.ready) return;

  if (hudHelp.expanded && hudHelp.autoCollapse) {
    hudHelp.elapsed += dt;
    if (hudHelp.elapsed >= hudHelp.collapseDelay) {
      hudHelp.expanded = false;
    }
  }

  let moveX = 0;
  let moveY = 0;
  if (input.left) moveX -= 1;
  if (input.right) moveX += 1;
  if (input.up) moveY -= 1;
  if (input.down) moveY += 1;

  if (input.pointerActive) {
    const dx = input.pointerX - player.x;
    const dy = input.pointerY - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 10) {
      moveX += dx / distance;
      moveY += dy / distance;
    }
  }

  const length = Math.hypot(moveX, moveY);
  const hasInput = length > 0.01;
  if (hasInput) {
    moveX /= length;
    moveY /= length;
    player.vx += moveX * player.acceleration * dt;
    player.vy += moveY * player.acceleration * dt;
  }

  const speed = Math.hypot(player.vx, player.vy);
  if (speed > player.maxSpeed) {
    player.vx = (player.vx / speed) * player.maxSpeed;
    player.vy = (player.vy / speed) * player.maxSpeed;
  }

  const dragFactor = Math.exp(-player.drag * dt);
  player.vx *= hasInput ? 0.985 : dragFactor;
  player.vy *= hasInput ? 0.985 : dragFactor;

  const nextX = player.x + player.vx * dt;
  const nextY = player.y + player.vy * dt;

  if (canMoveTo(nextX, player.y)) {
    player.x = nextX;
  } else {
    player.vx *= -0.15;
  }

  if (canMoveTo(player.x, nextY)) {
    player.y = nextY;
  } else {
    player.vy *= -0.15;
  }

  const finalSpeed = Math.hypot(player.vx, player.vy);
  if (finalSpeed > 18) {
    player.targetAngle = Math.atan2(player.vy, player.vx);
  }
  player.angle = damp(player.angle, player.targetAngle, 8, dt);
  player.bob += dt * (2.8 + finalSpeed / 90);
  player.glow = damp(player.glow, hasInput ? 1 : 0.28, 4, dt);

  if (playerVisual) {
    playerVisual.update(dt, hasInput, clamp(finalSpeed / player.maxSpeed, 0, 1));
  }

  const target = getCameraTarget();
  camera.x = damp(camera.x, target.x, 8, dt);
  camera.y = damp(camera.y, target.y, 8, dt);

  if (interactionState.messageTimer > 0) {
    interactionState.messageTimer = Math.max(0, interactionState.messageTimer - dt);
  }

  findActiveInteraction();
  input.interactQueued = false;
}

function drawSoftShadow(x, y, radiusX, radiusY, alpha = 0.35) {
  const gradient = ctx.createRadialGradient(x, y, 2, x, y, radiusX);
  gradient.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.save();
  ctx.scale(1, radiusY / radiusX);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y / (radiusY / radiusX), radiusX, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFallbackPlayer() {
  const bobY = Math.sin(player.bob) * 4;
  drawSoftShadow(player.x, player.y + 28, 58, 22, 0.3);
  ctx.save();
  ctx.translate(player.x, player.y + bobY);
  ctx.rotate(player.angle + Math.PI / 2);
  ctx.fillStyle = "rgba(9, 18, 25, 0.94)";
  ctx.strokeStyle = `rgba(140, 236, 255, ${0.45 + player.glow * 0.35})`;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(-34, -48, 68, 96, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffb15c";
  ctx.fillRect(-20, -8, 40, 12);
  ctx.restore();
}

function drawMap() {
  ctx.drawImage(assets.map, 0, 0, world.width, world.height);

  const pulse = 0.5 + Math.sin(performance.now() / 420) * 0.5;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = `rgba(255, 109, 56, ${0.02 + pulse * 0.025})`;
  ctx.beginPath();
  ctx.ellipse(768, 520, 300, 170, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHudHelp() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = "700 14px Trebuchet MS, Segoe UI, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(12, 8, 7, 0.72)";
  ctx.strokeStyle = "rgba(255, 177, 92, 0.28)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(hudHelp.button.x, hudHelp.button.y, hudHelp.button.width, hudHelp.button.height, 19);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffb15c";
  ctx.fillText(hudHelp.expanded ? "Ocultar ayuda" : "Ayuda", hudHelp.button.x + 18, hudHelp.button.y + 19);

  if (hudHelp.expanded) {
    const boxX = 18;
    const boxY = 66;
    const boxWidth = 318;
    const boxHeight = 94;
    ctx.fillStyle = "rgba(12, 8, 7, 0.74)";
    ctx.strokeStyle = "rgba(255, 177, 92, 0.24)";
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 243, 230, 0.9)";
    ctx.font = "700 14px Trebuchet MS, Segoe UI, sans-serif";
    ctx.fillText("WASD / flechas: mover PoCoBOT", boxX + 18, boxY + 26);
    ctx.fillText("Raton / tactil: mantener y arrastrar", boxX + 18, boxY + 52);
    ctx.fillText("E / Enter: listo para futuros puntos", boxX + 18, boxY + 78);
  }

  if (interactionState.message && interactionState.messageTimer > 0) {
    ctx.fillStyle = "rgba(12, 8, 7, 0.8)";
    ctx.strokeStyle = "rgba(140, 236, 255, 0.3)";
    ctx.beginPath();
    ctx.roundRect(230, viewport.height - 72, 500, 46, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff3e6";
    ctx.font = "800 15px Trebuchet MS, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(interactionState.message, viewport.width / 2, viewport.height - 49);
  }
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, viewport.width, viewport.height);

  if (!assets.ready) {
    ctx.fillStyle = "#090807";
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    ctx.fillStyle = "#ffb15c";
    ctx.font = "800 18px Trebuchet MS, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Cargando Campamento de las Placas Rojas...", viewport.width / 2, viewport.height / 2);
    return;
  }

  const zoom = getCameraZoom();
  ctx.save();
  ctx.scale(zoom, zoom);
  ctx.translate(-camera.x, -camera.y);
  drawMap();
  if (playerVisual) {
    playerVisual.draw();
  } else {
    drawFallbackPlayer();
  }
  ctx.restore();

  ctx.save();
  const vignette = ctx.createRadialGradient(
    viewport.width / 2,
    viewport.height / 2,
    viewport.width * 0.28,
    viewport.width / 2,
    viewport.height / 2,
    viewport.width * 0.7,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.32)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  ctx.restore();

  drawHudHelp();
}

function loop(now) {
  const dt = clamp((now - lastTime) / 1000, 0, 0.04);
  lastTime = now;
  update(dt);
  draw();
  window.requestAnimationFrame(loop);
}

loadAssets()
  .catch((error) => {
    console.warn(error);
    assets.map = createFallbackCampMap();
    assets.botFrames = [createFallbackBotFrame()];
    assets.frontFrames = assets.botFrames;
    createPlayerVisual();
    assets.ready = true;
    snapCameraToPlayer();
  })
  .finally(() => {
    window.requestAnimationFrame(loop);
  });
