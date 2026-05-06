const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const orientationOverlay = document.getElementById("orientation-overlay");
const orientationLockButton = document.getElementById("orientation-lock-button");
const orientationLockStatus = document.getElementById("orientation-lock-status");
const storyMapButton = document.getElementById("story-map-button");
const storyParams = new URLSearchParams(window.location.search);
const storyEmbedMode = storyParams.get("story_embed") === "1";
const storyReturnUrl = storyParams.get("story_return") || "";
const debugMode = storyParams.get("debug") === "1";
const storyAudioMode = storyParams.get("story_audio") || "";
const chapterStateKey = "pocobot-tower-4b-chapter-v1";
const chapterFlowVersion = 3;

const musicConfig = {
  scene: {
    id: "silencio-acero",
    label: "Silencio de Acero",
    src: "../Silencio de Acero.mp3",
    volume: 0.34,
    loop: true,
  },
  usualCombat: {
    id: "usual-combat-rotation",
    label: "Canciones habituales de combate",
    tracks: [
      { id: "combat-01", src: "../../audio_01.mp3" },
      { id: "combat-02", src: "../../audio_02.mp3" },
    ],
  },
};

const chapterMusic = {
  audio: null,
  started: false,
};

const radioOpenSoundSrc = "../sfx/walkie_roger_beep_cc0.mp3";
const radioMessageDurationScale = 0.5;

const defaultChapterState = {
  chapterFlowVersion,
  exteriorDroneDefeated: false,
  exteriorDroneDefeatedIds: [],
  xavorArrived: false,
  xavorIntroduced: false,
  towerDoorOpen: false,
  exteriorDroneEncountered: false,
  interiorDroneDefeated: false,
  controlMechaDefeated: false,
  argosHackDefeated: false,
  missionComplete: false,
  finalRewardClaimed: false,
  inventoryRewards: [],
  coins: 0,
};

function loadChapterState() {
  try {
    const storedState = JSON.parse(localStorage.getItem(chapterStateKey) || "{}");
    if (storedState.chapterFlowVersion !== chapterFlowVersion && storyParams.get("preserve_chapter") !== "1") {
      return { ...defaultChapterState };
    }

    return {
      ...defaultChapterState,
      ...storedState,
    };
  } catch (error) {
    return { ...defaultChapterState };
  }
}

const chapterState = loadChapterState();

function saveChapterState() {
  localStorage.setItem(chapterStateKey, JSON.stringify(chapterState));
}

function patchChapterState(patch) {
  Object.assign(chapterState, patch);
  saveChapterState();
}

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
  x: 762,
  y: 792,
  radius: 28,
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
  spriteWidth: 170,
  spriteHeight: 170,
};

const sceneSpawnPoints = {
  default: { x: 762, y: 792 },
  fromExterior: { x: 762, y: 792 },
  fromControl: { x: 1168, y: 304 },
};

function placePlayerAt(point) {
  if (!point) return;
  player.x = Math.max(player.radius, Math.min(world.width - player.radius, Number(point.x) || sceneSpawnPoints.default.x));
  player.y = Math.max(player.radius, Math.min(world.height - player.radius, Number(point.y) || sceneSpawnPoints.default.y));
  player.vx = 0;
  player.vy = 0;
}

function applyInitialStorySpawn() {
  if (storyParams.get("story_restore_position") === "1") {
    const spawnX = Number(storyParams.get("story_player_x"));
    const spawnY = Number(storyParams.get("story_player_y"));
    if (Number.isFinite(spawnX) && Number.isFinite(spawnY)) {
      placePlayerAt({ x: spawnX, y: spawnY });
      return;
    }
  }

  if (storyParams.get("from_control") === "1") {
    placePlayerAt(sceneSpawnPoints.fromControl);
    return;
  }

  if (storyParams.get("from_exterior") === "1") {
    placePlayerAt(sceneSpawnPoints.fromExterior);
    return;
  }

  placePlayerAt(sceneSpawnPoints.default);
}

applyInitialStorySpawn();

const camera = {
  x: 0,
  y: 0,
  smoothness: 0.1,
};

const assets = {
  map: new Image(),
  xavorPortrait: new Image(),
  patrolDrone: new Image(),
  botFrames: [],
  frontFrames: [],
  sideFrames: [],
  hoverFrames: [],
  backFrame: null,
  ready: false,
};

const collisionZones = [
  { type: "rect", x: 0, y: 0, width: 1536, height: 112 },
  { type: "rect", x: 0, y: 922, width: 1536, height: 102 },
  { type: "rect", x: 0, y: 0, width: 128, height: 1024 },
  { type: "rect", x: 1394, y: 0, width: 142, height: 1024 },
  { type: "rect", x: 154, y: 244, width: 172, height: 292 },
  { type: "rect", x: 330, y: 96, width: 142, height: 210 },
  { type: "rect", x: 518, y: 112, width: 300, height: 156 },
  { type: "rect", x: 900, y: 118, width: 96, height: 128 },
  { type: "rect", x: 1256, y: 226, width: 84, height: 238 },
  { type: "circle", x: 1276, y: 602, radius: 132 },
  { type: "rect", x: 1044, y: 612, width: 132, height: 138 },
  { type: "rect", x: 360, y: 742, width: 198, height: 178 },
  { type: "rect", x: 820, y: 760, width: 218, height: 156 },
  { type: "rect", x: 1046, y: 814, width: 148, height: 108 },
  { type: "circle", x: 238, y: 640, radius: 92 },
  {
    type: "poly",
    points: [
      { x: 1262, y: 96 },
      { x: 1322, y: 76 },
      { x: 1322, y: 178 },
      { x: 1268, y: 198 },
    ],
  },
];

const thrusters = [
  { x: -68, y: -35, width: 15, phase: 0.1 },
  { x: 68, y: -35, width: 15, phase: 1.7 },
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
    id: "entry-door",
    x: 760,
    y: 850,
    radius: 168,
    label: "Puerta exterior",
    hint: "Examinar",
    message: "La compuerta exterior sigue abierta. El ruido de la tormenta queda atras.",
  },
  {
    id: "lock-console",
    x: 1036,
    y: 382,
    radius: 84,
    label: "Consola de bloqueo",
    hint: "Sincronizar",
    message: "Consola de bloqueo: la escalera superior reconoce la firma del PoCoBOT.",
  },
  {
    id: "stairs-up",
    x: 1184,
    y: 206,
    radius: 88,
    label: "Escaleras superiores",
    hint: "Subir",
    message: "Escaleras superiores: acceso preparado hacia la sala de control.",
  },
];

const interactionState = {
  active: null,
  message: "",
  messageTimer: 0,
};

const hudHelp = {
  expanded: true,
  elapsed: 0,
  collapseDelay: 10,
  button: { x: 18, y: 18, width: 190, height: 42 },
};

function postStoryTutorialAction(action, payload = {}) {
  const message = {
    type: "pocobot-story-tower-interior-action",
    action,
    savedAt: Date.now(),
    sceneMusic: musicConfig.scene,
    playerPosition: {
      x: Math.round(player.x),
      y: Math.round(player.y),
    },
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

function startChapterMusic() {
  if (storyAudioMode === "external") {
    return;
  }

  if (!chapterMusic.audio) {
    chapterMusic.audio = new Audio(new URL(musicConfig.scene.src, window.location.href).href);
    chapterMusic.audio.loop = musicConfig.scene.loop;
    chapterMusic.audio.preload = "auto";
    chapterMusic.audio.volume = musicConfig.scene.volume;
  }

  if (chapterMusic.started) {
    return;
  }

  const playPromise = chapterMusic.audio.play();
  if (playPromise && typeof playPromise.then === "function") {
    playPromise
      .then(() => {
        chapterMusic.started = true;
      })
      .catch(() => {});
  } else {
    chapterMusic.started = true;
  }
}

function playAudioClip(source, volume = 0.5, duration = 2.4) {
  const audio = new Audio(new URL(source, window.location.href).href);
  audio.preload = "auto";
  audio.volume = volume;

  const stopTimer = window.setTimeout(() => {
    audio.pause();
    audio.currentTime = 0;
  }, duration * 1000);

  const playPromise = audio.play();
  if (playPromise && typeof playPromise.then === "function") {
    playPromise.catch(() => window.clearTimeout(stopTimer));
  }
}

function playRadioOpenSound() {
  playAudioClip(radioOpenSoundSrc, 0.34, 0.95);
}

function queueRadio(lines) {
  radioState.queue.push(...lines);
  if (radioState.timer <= 0) {
    showNextRadio();
  }
}

function getRadioMessageDuration(text) {
  return clamp(9 + text.length * 0.07, 10.4, 19.6) * radioMessageDurationScale;
}

function showNextRadio() {
  const next = radioState.queue.shift();
  if (!next) {
    radioState.text = "";
    radioState.timer = 0;
    return;
  }

  radioState.text = next;
  radioState.timer = getRadioMessageDuration(next);
  playRadioOpenSound();
}

function updateRadio(dt) {
  if (radioState.timer <= 0) {
    return;
  }

  radioState.timer = Math.max(0, radioState.timer - dt);
  if (radioState.timer === 0) {
    showNextRadio();
  }
}

function navigateToScene(relativeUrl) {
  if (storyEmbedMode || window.parent !== window) {
    return;
  }

  window.location.href = relativeUrl;
}

const actorCollisionRadii = {
  "entry-door": 0,
  "lock-console": 0,
  "stairs-up": 0,
};

const interiorDrone = {
  x: 648,
  y: 520,
  baseX: 648,
  baseY: 520,
  radius: 46,
  phase: 0,
  defeated: chapterState.interiorDroneDefeated,
  combatCooldown: 0,
};

const radioState = {
  speaker: "Xavor Glitch",
  text: "",
  timer: 0,
  queue: [],
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
  startChapterMusic();

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

window.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "pocobot-story-exploration-key") {
    return;
  }

  if (data.phase === "up") {
    handleStoryExplorationKeyUp(data.key);
    return;
  }

  handleStoryExplorationKeyDown(data.key, { repeat: false });
});

storyMapButton?.addEventListener("click", () => {
  startChapterMusic();
  setInteractionMessage("Volviendo al mapa de la Ruta Ceniza...", 1.4);
  postStoryTutorialAction("return-map");
});

function updatePointerTarget(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = viewport.width / rect.width;
  const scaleY = viewport.height / rect.height;
  const screenX = (event.clientX - rect.left) * scaleX;
  const screenY = (event.clientY - rect.top) * scaleY;

  input.pointerX = clamp(camera.x + screenX, 0, world.width);
  input.pointerY = clamp(camera.y + screenY, 0, world.height);
}

canvas.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  startChapterMusic();

  const rect = canvas.getBoundingClientRect();
  const scaleX = viewport.width / rect.width;
  const scaleY = viewport.height / rect.height;
  const screenX = (event.clientX - rect.left) * scaleX;
  const screenY = (event.clientY - rect.top) * scaleY;
  if (
    screenX >= hudHelp.button.x &&
    screenX <= hudHelp.button.x + hudHelp.button.width &&
    screenY >= hudHelp.button.y &&
    screenY <= hudHelp.button.y + hudHelp.button.height
  ) {
    hudHelp.expanded = !hudHelp.expanded;
    hudHelp.elapsed = 0;
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

function ensureSafeInitialSpawn() {
  if (canMoveTo(player.x, player.y)) {
    snapCameraToPlayer();
    return;
  }

  const bases = [
    sceneSpawnPoints.default,
    sceneSpawnPoints.fromExterior,
    sceneSpawnPoints.fromControl,
  ];
  const offsets = [
    [0, 0],
    [64, 0],
    [-64, 0],
    [0, 64],
    [0, -64],
    [112, 0],
    [-112, 0],
    [0, 112],
    [0, -112],
    [84, 84],
    [-84, 84],
    [84, -84],
    [-84, -84],
  ];

  for (const base of bases) {
    for (const [dx, dy] of offsets) {
      const candidate = {
        x: base.x + dx,
        y: base.y + dy,
      };
      if (canMoveTo(candidate.x, candidate.y)) {
        placePlayerAt(candidate);
        snapCameraToPlayer();
        return;
      }
    }
  }

  placePlayerAt(sceneSpawnPoints.default);
  snapCameraToPlayer();
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function getCameraTarget() {
  const leadX = clamp(player.vx * 0.28, -92, 92);
  const leadY = clamp(player.vy * 0.22, -70, 70);

  return {
    x: clamp(player.x + leadX - viewport.width / 2, 0, world.width - viewport.width),
    y: clamp(player.y + leadY - viewport.height / 2, 0, world.height - viewport.height),
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
    baseSize: Math.round(player.spriteWidth * 0.88),
    sideFrameVerticalOffsets: playerVisualFrameSources.sideFrameVerticalOffsets,
  });
}

function updatePlayerVisual(dt, hasInput, speedRatio) {
  if (playerVisual) {
    playerVisual.update(dt, hasInput, speedRatio);
  }
}

async function loadAssets() {
  const [mapImage, xavorPortraitImage, patrolDroneImage, ...visualFrames] = await Promise.all([
    loadImage("./assets/torre-4b-interior-baja-map.png"),
    loadImage("../Brutos/transparent/XAVOR2-transparent.png"),
    loadImage("./assets/chapter/argos-patrol-drone.png"),
    ...leanFrameSources.map((source) => loadImage(source)),
    loadImage(playerVisualFrameSources.back),
    ...playerVisualFrameSources.side.map((source) => loadImage(source)),
    ...playerVisualFrameSources.hover.map((source) => loadImage(source)),
  ]);
  const botFrames = visualFrames.slice(0, leanFrameSources.length);
  const backFrame = visualFrames[leanFrameSources.length];
  const sideFramesStart = leanFrameSources.length + 1;
  const sideFrames = visualFrames.slice(sideFramesStart, sideFramesStart + playerVisualFrameSources.side.length);
  const hoverFrames = visualFrames.slice(sideFramesStart + playerVisualFrameSources.side.length);

  assets.map = mapImage;
  assets.xavorPortrait = xavorPortraitImage;
  assets.patrolDrone = patrolDroneImage;
  assets.botFrames = botFrames;
  assets.frontFrames = botFrames;
  assets.backFrame = backFrame;
  assets.sideFrames = sideFrames;
  assets.hoverFrames = hoverFrames;
  createPlayerVisual();
  assets.ready = true;
  snapCameraToPlayer();
  startChapterMusic();

  if (chapterState.argosHackDefeated && !chapterState.finalRewardClaimed) {
    queueRadio([
      "Xavor: planta baja despejada. Sal por la puerta exterior y vuelve a la furboneta para cerrar esto.",
    ]);
  } else {
    queueRadio([
      "Xavor: planta baja de Torre 4B. Si oyes zumbidos, no es nostalgia: hay un dron flotando por ahí.",
      "El combate es opcional. Puedes esquivarlo y subir. Aunque si te da una moneda... yo me aprovecharía...",
    ]);
  }
}

function triggerInteriorDroneCombat() {
  if (interiorDrone.defeated || interiorDrone.combatCooldown > 0) {
    return;
  }

  if (storyEmbedMode || window.parent !== window) {
    interiorDrone.combatCooldown = 2.2;
    setInteractionMessage("Dron interior detectado. Combate del modo historia en preparación...", 3.4);
    queueRadio([
      "Xavor: ese dron no bloquea la ruta, pero si lo derribas te llevas otra antigua moneda. Hay días en los que hasta la chatarra paga.",
    ]);
    postStoryTutorialAction("request-interior-drone-combat", {
      mission: "tower_interior_drone",
      enemyId: "tower-4b-floating-drone",
      rewardId: "torre_4b_interior_drone",
      returnScene: "interior",
      reward: { coins: 1 },
      music: {
        combat: musicConfig.usualCombat,
        returnToScene: musicConfig.scene,
      },
    });
    return;
  }

  interiorDrone.combatCooldown = 1.5;
  interiorDrone.defeated = true;
  patchChapterState({
    interiorDroneDefeated: true,
    coins: chapterState.coins + 1,
  });

  setInteractionMessage("Dron interior vencido. Recompensa: 1 moneda PoCoBOT.", 4.2);
  queueRadio([
    "Xavor: moneda conseguida. No era obligatorio, pero quedaba feo dejarlo zumbando.",
    "Sigue hacia las escaleras. Arriba empieza la parte donde Argós ya no finge ser amable.",
  ]);
  postStoryTutorialAction("optional-drone-combat", {
    enemyId: "tower-4b-floating-drone",
    optional: true,
    result: "victory",
    reward: { coins: 1 },
    totalCoins: chapterState.coins,
    music: {
      combat: musicConfig.usualCombat,
      returnToScene: musicConfig.scene,
    },
  });
}

function updateChapterActors(dt) {
  interiorDrone.combatCooldown = Math.max(0, interiorDrone.combatCooldown - dt);

  if (!interiorDrone.defeated) {
    interiorDrone.phase += dt * 1.15;
    interiorDrone.x = interiorDrone.baseX + Math.sin(interiorDrone.phase) * 210;
    interiorDrone.y = interiorDrone.baseY + Math.sin(interiorDrone.phase * 2.1) * 26;

    const distance = Math.hypot(player.x - interiorDrone.x, player.y - interiorDrone.y);
    if (distance < player.radius + interiorDrone.radius + 8) {
      triggerInteriorDroneCombat();
    }
  }
}

function update(dt) {
  if (!assets.ready) {
    return;
  }

  hudHelp.elapsed += dt;
  if (hudHelp.expanded && hudHelp.elapsed >= hudHelp.collapseDelay) {
    hudHelp.expanded = false;
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
  updateChapterActors(dt);
  updateInteractions(dt);
  updateRadio(dt);

  const target = getCameraTarget();

  camera.x += (target.x - camera.x) * camera.smoothness;
  camera.y += (target.y - camera.y) * camera.smoothness;
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
  const speed = 72 + power * 104 + Math.random() * 36;

  exhaustParticles.push({
    x: origin.x + backward.x * 10,
    y: origin.y + backward.y * 10,
    vx: backward.x * speed - player.vx * 0.22,
    vy: backward.y * speed - player.vy * 0.22,
    age: 0,
    life: 0.28 + Math.random() * 0.18,
    size: 2.2 + Math.random() * 4 + power * 2.6,
  });

  if (exhaustParticles.length > 90) {
    exhaustParticles.splice(0, exhaustParticles.length - 90);
  }
}

function updateExhaustParticles(dt, hasInput, speedRatio) {
  const power = player.thrustPower * (hasInput ? 1 : 0.45 + speedRatio * 0.4);
  player.particleDebt += power * dt * 18;

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

  if (input.interactQueued) {
    if (nearest) {
      if (nearest.id === "entry-door" && chapterState.argosHackDefeated) {
        setInteractionMessage("Saliendo al exterior de Torre 4B para volver con Xavor...", 2.6);
        postStoryTutorialAction("return-exterior-finale", {
          nextScene: "torre-seguimiento-4b-tutorial",
        });
        navigateToScene("../torre-seguimiento-4b-tutorial/index.html?mission_return=1&from_interior=1&preserve_chapter=1");
        input.interactQueued = false;
        return;
      }

      if (nearest.id === "stairs-up") {
        setInteractionMessage("Subiendo a la sala de control 4B...", 2.4);
        postStoryTutorialAction("enter-control-room", {
          nextScene: "torre-seguimiento-4b-sala-control",
        });
        navigateToScene("../torre-seguimiento-4b-sala-control/index.html?from_interior=1&preserve_chapter=1");
        input.interactQueued = false;
        return;
      }

      setInteractionMessage(nearest.message, 3.4);
      postStoryTutorialAction(nearest.id);
    } else {
      setInteractionMessage("Acércate a la puerta, la consola o las escaleras para interactuar.", 2.4);
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

function drawWorldSprite(image, x, y, width, height, options = {}) {
  const bob = options.bob || 0;
  const alpha = options.alpha ?? 1;

  if (options.shadow) {
    drawSoftShadow(x, y + height * 0.24, width * 0.72, height * 0.2, options.shadow);
  }

  ctx.save();
  ctx.translate(x, y + bob);
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  ctx.restore();
}

function drawInteriorDrone() {
  if (interiorDrone.defeated) {
    return;
  }

  const bob = Math.sin(player.glow * 4.4 + interiorDrone.phase) * 8;
  drawWorldSprite(assets.patrolDrone, interiorDrone.x, interiorDrone.y, 126, 102, {
    bob,
    shadow: 0.24,
  });
}

function drawWorldActors() {
  const actors = [
    { y: interiorDrone.y, draw: drawInteriorDrone },
    { y: player.y, draw: drawPlayer },
  ];

  actors.sort((a, b) => a.y - b.y);
  actors.forEach((actor) => actor.draw());
}

function drawCollisionDebug() {
  if (!debugMode) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = "rgba(255, 75, 75, 0.74)";
  ctx.fillStyle = "rgba(255, 75, 75, 0.14)";
  ctx.lineWidth = 2;

  collisionZones.forEach((zone) => {
    ctx.beginPath();
    if (zone.type === "rect") {
      ctx.rect(zone.x, zone.y, zone.width, zone.height);
    } else if (zone.type === "circle") {
      ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
    } else {
      ctx.moveTo(zone.points[0].x, zone.points[0].y);
      zone.points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
  });

  ctx.restore();
}

function drawFlameJet(thruster, power) {
  const pulse = 0.82 + Math.sin(player.thrustCycle + thruster.phase) * 0.18;
  const speedRatio = clamp(Math.hypot(player.vx, player.vy) / player.maxSpeed, 0, 1);
  const length = (16 + power * 44 + speedRatio * 16) * pulse;
  const width = thruster.width * (0.72 + power * 0.48);
  const lick = Math.sin(player.thrustCycle * 1.7 + thruster.phase) * width * 0.18;
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
  const glowPoint = localPointToWorld(thruster.x * 0.72, thruster.y + 64);
  const radius = 18 + power * 24;
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

function drawWrappedText(text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const words = text.split(" ");
  let line = "";
  let linesDrawn = 0;

  words.forEach((word, index) => {
    const testLine = line ? `${line} ${word}` : word;
    const isLastWord = index === words.length - 1;

    if (ctx.measureText(testLine).width > maxWidth && line) {
      if (linesDrawn < maxLines) {
        ctx.fillText(line, x, y + linesDrawn * lineHeight);
      }
      linesDrawn += 1;
      line = word;
    } else {
      line = testLine;
    }

    if (isLastWord && line && linesDrawn < maxLines) {
      ctx.fillText(line, x, y + linesDrawn * lineHeight);
    }
  });
}

function drawImageCover(image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function isXavorKnownOnRadio() {
  return !!chapterState.xavorIntroduced;
}

function getRadioSpeakerLabel() {
  return isXavorKnownOnRadio() ? "XAVOR GLITCH" : "X4V-0R // 4B-CRYPT";
}

function getRadioDisplayText() {
  if (isXavorKnownOnRadio()) return radioState.text;
  return radioState.text.replace(/^Xavor(?:\s+Glitch)?:\s*/i, "Voz cifrada: ");
}

function drawRadioPortrait(x, y, width, height) {
  const known = isXavorKnownOnRadio();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 14);
  ctx.clip();
  drawImageCover(assets.xavorPortrait, x, y, width, height);
  if (!known) {
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
    ctx.fillRect(x, y, width, height);
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "rgba(132, 234, 255, 0.36)";
    ctx.lineWidth = 1;
    for (let line = y + 8; line < y + height; line += 9) {
      ctx.beginPath();
      ctx.moveTo(x, line);
      ctx.lineTo(x + width, line + 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawRadioInterference(x, y, width, height) {
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#84eaff";
  for (let line = y + 8; line < y + height; line += 5) {
    ctx.fillRect(x + 2, line, width - 4, 1);
  }
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#ffd55f";
  const pulse = Math.sin(performance.now() * 0.018) * 8;
  ctx.fillRect(x + 20 + pulse, y + 6, Math.max(24, width * 0.16), 1);
  ctx.fillRect(x + width * 0.62 - pulse, y + height - 10, Math.max(18, width * 0.12), 1);
  ctx.restore();
}

function drawRadioOverlay() {
  if (!radioState.text || radioState.timer <= 0) {
    return;
  }

  const width = Math.min(720, viewport.width - 36);
  const height = 124;
  const x = 18;
  const y = viewport.height - 214;

  ctx.save();
  ctx.fillStyle = "rgba(5, 11, 18, 0.9)";
  ctx.strokeStyle = "rgba(80, 235, 255, 0.42)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 18);
  ctx.fill();
  ctx.stroke();
  drawRadioInterference(x, y, width, height);

  drawRadioPortrait(x + 14, y + 14, 82, 82);

  ctx.fillStyle = "#84eaff";
  ctx.font = "700 13px Trebuchet MS";
  ctx.fillText(`RADIO // ${getRadioSpeakerLabel()}`, x + 112, y + 30);

  ctx.fillStyle = "#eef8ff";
  ctx.font = "15px Trebuchet MS";
  drawWrappedText(getRadioDisplayText(), x + 112, y + 56, width - 132, 20, 3);
  ctx.restore();
}

function drawHud() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  if (hudHelp.expanded) {
    hudHelp.button = { x: 18, y: 18, width: 520, height: 92 };
    ctx.fillStyle = "rgba(8, 17, 29, 0.82)";
    ctx.fillRect(18, 18, 520, 92);

    ctx.strokeStyle = "rgba(146, 246, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, 520, 92);

    ctx.fillStyle = "#eef8ff";
    ctx.font = "18px Trebuchet MS";
    ctx.fillText("PoCoBOT // Interior Bajo Torre 4B", 32, 46);

    ctx.fillStyle = "rgba(238, 248, 255, 0.82)";
    ctx.font = "14px Trebuchet MS";
    ctx.fillText("WASD para moverte · E o Enter para aceptar/seleccionar", 32, 68);
    ctx.fillText("Esquiva o vence el dron opcional, luego sube a control", 32, 88);
  } else {
    hudHelp.button = { x: 18, y: 18, width: 190, height: 42 };
    ctx.fillStyle = "rgba(8, 17, 29, 0.82)";
    ctx.beginPath();
    ctx.roundRect(18, 18, 190, 42, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(146, 246, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#eef8ff";
    ctx.font = "700 14px Trebuchet MS";
    ctx.fillText("Info controles +", 34, 45);
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

  drawRadioOverlay();
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
    kicker: "Interior de torre",
    title: "Interior Bajo 4B",
    subtitle: "Encendiendo escaleras, relés y consolas de bloqueo",
    status: "Buscando rutas seguras hacia la sala de control",
    accent: "#9ff3ff",
    shadow: "#12161b",
    deep: "#132833"
  });
}

function render() {
  if (!assets.ready) {
    drawLoading();
    return;
  }

  ctx.clearRect(0, 0, viewport.width, viewport.height);
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawMap();
  drawExhaustParticles();
  drawInteractionMarkers();
  drawPointerTarget();
  drawWorldActors();
  drawCollisionDebug();

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
loadAssets()
  .catch((error) => {
    console.error("No se pudieron cargar los activos del juego:", error);
  })
  .finally(() => {
    ensureSafeInitialSpawn();
    requestAnimationFrame(gameLoop);
  });
