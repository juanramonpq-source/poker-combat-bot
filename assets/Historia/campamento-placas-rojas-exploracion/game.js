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
const storyCampScene = storyParams.get("story_camp_scene") === "lake" ? "lake" : "camp";
const storyCampMusicPath = storyCampScene === "lake" ? "../Lake.mp3" : "../Campamento de placas rojas.mp3";
const storyCampMusicUrl = new URL(storyCampMusicPath, window.location.href).href;

const CAMP_PROGRESS_KEY = "pocobot-story-camp-red-plates-progress-v1";
const CAMP_AUDIO_TIME_KEY = `${CAMP_PROGRESS_KEY}:audio-time:${storyCampScene}`;
const CAMP_SCENE_POSITION_KEY = `${CAMP_PROGRESS_KEY}:position:${storyCampScene}`;
const CAMP_LAKE_SECRET_CARD_ID = "lake_secret_card";

if (storyEmbedMode) {
  document.body.classList.add("story-embed-mode");
}

canvas.setAttribute("tabindex", "0");
canvas.setAttribute("draggable", "false");

const viewport = {
  width: canvas.width,
  height: canvas.height,
};

function resizeViewportCanvas() {
  if (!storyEmbedMode) return;
  const visualViewport = window.visualViewport;
  const width = Math.max(320, Math.round(visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || canvas.width));
  const height = Math.max(240, Math.round(visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || canvas.height));
  if (viewport.width === width && viewport.height === height && canvas.width === width && canvas.height === height) return;
  viewport.width = width;
  viewport.height = height;
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
}

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
  x: storyCampScene === "lake" ? 770 : 746,
  y: storyCampScene === "lake" ? 810 : 618,
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

const campSceneSpawnPoint = { x: player.x, y: player.y };

const camera = {
  x: 0,
  y: 0,
  smoothness: 0.1,
};

const campScenePositionState = {
  x: Math.round(player.x),
  y: Math.round(player.y),
  savedAt: 0,
};

const DESKTOP_CAMERA_ZOOM = 0.86;
const desktopCameraMedia = window.matchMedia("(pointer: fine) and (hover: hover)");
const campSceneKey = storyCampScene === "lake" ? "campamento-placas-rojas-lago" : "campamento-placas-rojas";
const campPageUrl = new URL(window.location.href);
const sceneActionCooldown = {
  northExit: 0,
  returnCamp: 0,
};

const assets = {
  map: new Image(),
  corvo: new Image(),
  npcs: {},
  npcAnimations: {},
  objects: {},
  botFrames: [],
  frontFrames: [],
  sideFrames: [],
  hoverFrames: [],
  backFrame: null,
  ready: false,
};

const npcImageSources = {
  medic: "./assets/characters/exploration/nara-sanitaria-sprite.png",
  quartermaster: "./assets/characters/exploration/damaso-intendencia-sprite.png",
  mechanic: "./assets/characters/exploration/iria-mecanica-sprite.png",
  deck_pirate: "./assets/characters/exploration/nix-corsario-sprite.png",
  resistance_bot: "./assets/characters/exploration/piloto-resistencia-sprite.png",
  lake_drone: "./assets/characters/exploration/dron-lago-sprite.png",
};

const npcAnimationSources = {
  medic: [
    "./assets/characters/exploration/animation/nara-sanitaria-headturn-smooth-00.png",
    "./assets/characters/exploration/animation/nara-sanitaria-headturn-smooth-01.png",
    "./assets/characters/exploration/animation/nara-sanitaria-headturn-smooth-02.png",
    "./assets/characters/exploration/animation/nara-sanitaria-headturn-smooth-03.png",
    "./assets/characters/exploration/animation/nara-sanitaria-headturn-smooth-04.png",
  ],
};

const npcAnimationTimelines = {
  medic: [
    { frame: 0, duration: 3000 },
    { frame: 1, duration: 160 },
    { frame: 2, duration: 160 },
    { frame: 3, duration: 160 },
    { frame: 4, duration: 3000 },
    { frame: 3, duration: 160 },
    { frame: 2, duration: 160 },
    { frame: 1, duration: 160 },
  ],
};

const objectImageSources = {
  water_pc: "./assets/objects/water-pc-terminal-sprite-mirror.png",
};

const campCollisionZones = [
  {
    type: "rect",
    x: 0,
    y: -80,
    width: 1536,
    height: 120
  },
  {
    type: "rect",
    x: 0,
    y: 984,
    width: 1536,
    height: 120
  },
  {
    type: "rect",
    x: -80,
    y: 0,
    width: 120,
    height: 1024
  },
  {
    type: "rect",
    x: 1496,
    y: 0,
    width: 120,
    height: 1024
  },
  {
    type: "ellipse",
    x: 498.004987531172,
    y: 703.1785609912912,
    width: 265,
    height: 270
  },
  {
    type: "ellipse",
    x: 689,
    y: 814,
    width: 199,
    height: 207
  },
  {
    type: "ellipse",
    x: 1254,
    y: 626,
    width: 246,
    height: 277
  },
  {
    type: "ellipse",
    x: 1148.7755610972567,
    y: 680.6725699924017,
    width: 167,
    height: 115
  },
  {
    type: "ellipse",
    x: 1361,
    y: 590,
    width: 127,
    height: 102
  },
  {
    type: "ellipse",
    x: 1111,
    y: 22,
    width: 236,
    height: 284
  },
  {
    type: "ellipse",
    x: 954,
    y: 173,
    width: 190,
    height: 104
  },
  {
    type: "ellipse",
    x: 1280,
    y: 384,
    width: 220,
    height: 75
  },
  {
    type: "ellipse",
    x: 1329,
    y: 186,
    width: 177,
    height: 149
  },
  {
    type: "ellipse",
    x: 678,
    y: 32,
    width: 163,
    height: 128
  },
  {
    type: "ellipse",
    x: 801.2369077306734,
    y: 84.5332865743176,
    width: 102,
    height: 72
  },
  {
    type: "ellipse",
    x: 742,
    y: 121,
    width: 104,
    height: 55
  },
  {
    type: "ellipse",
    x: 583.3316708229427,
    y: 59.750657548658594,
    width: 79,
    height: 64
  },
  {
    type: "ellipse",
    x: 467.5286783042394,
    y: 90.9374013677012,
    width: 115,
    height: 74
  },
  {
    type: "ellipse",
    x: 753,
    y: 296,
    width: 53,
    height: 77
  },
  {
    type: "ellipse",
    x: 794,
    y: 328,
    width: 53,
    height: 59
  },
  {
    type: "ellipse",
    x: 852,
    y: 359,
    width: 45,
    height: 46
  },
  {
    type: "ellipse",
    x: 898,
    y: 353,
    width: 41,
    height: 75
  },
  {
    type: "ellipse",
    x: 947,
    y: 389,
    width: 47,
    height: 67
  },
  {
    type: "ellipse",
    x: 1001,
    y: 432,
    width: 90,
    height: 78
  },
  {
    type: "ellipse",
    x: 907,
    y: 466,
    width: 131,
    height: 85
  },
  {
    type: "ellipse",
    x: 870,
    y: 506,
    width: 66,
    height: 77
  },
  {
    type: "ellipse",
    x: 690,
    y: 326,
    width: 60,
    height: 41
  },
  {
    type: "ellipse",
    x: 640,
    y: 318,
    width: 37,
    height: 52
  },
  {
    type: "ellipse",
    x: 649,
    y: 337,
    width: 59,
    height: 34
  },
  {
    type: "ellipse",
    x: 591,
    y: 330,
    width: 43,
    height: 49
  },
  {
    type: "ellipse",
    x: 603,
    y: 340,
    width: 48,
    height: 41
  },
  {
    type: "ellipse",
    x: 575,
    y: 321,
    width: 25,
    height: 43
  },
  {
    type: "ellipse",
    x: 406,
    y: 590,
    width: 53,
    height: 72
  },
  {
    type: "ellipse",
    x: 344,
    y: 581,
    width: 60,
    height: 60
  },
  {
    type: "ellipse",
    x: 323,
    y: 550,
    width: 70,
    height: 52
  },
  {
    type: "ellipse",
    x: 364,
    y: 577,
    width: 70,
    height: 36
  },
  {
    type: "ellipse",
    x: 377,
    y: 557,
    width: 34,
    height: 31
  },
  {
    type: "ellipse",
    x: 311,
    y: 524,
    width: 55,
    height: 46
  },
  {
    type: "ellipse",
    x: 223,
    y: 588,
    width: 113,
    height: 85
  },
  {
    type: "ellipse",
    x: 71,
    y: 524,
    width: 74,
    height: 168
  },
  {
    type: "ellipse",
    x: 114,
    y: 600,
    width: 141,
    height: 112
  },
  {
    type: "ellipse",
    x: 56,
    y: 697,
    width: 235,
    height: 131
  },
  {
    type: "ellipse",
    x: 24,
    y: 758,
    width: 168,
    height: 138
  },
  {
    type: "ellipse",
    x: 16,
    y: 629,
    width: 138,
    height: 139
  },
  {
    type: "ellipse",
    x: 129,
    y: 131,
    width: 216,
    height: 249
  },
  {
    type: "ellipse",
    x: 246.9102244389028,
    y: 228.4414051084225,
    width: 149,
    height: 92
  },
  {
    type: "ellipse",
    x: 22,
    y: 132,
    width: 320,
    height: 140
  },
  {
    type: "ellipse",
    x: 0,
    y: 242,
    width: 182,
    height: 124
  },
  {
    type: "ellipse",
    x: 1018,
    y: 656,
    width: 239,
    height: 91
  },
  {
    type: "rect",
    x: 535,
    y: 500,
    width: 27,
    height: 8
  },
  {
    type: "rect",
    x: 426,
    y: 434,
    width: 22,
    height: 6
  }
];

const lakeCollisionZones = [
  {
    type: "rect",
    x: 0,
    y: -80,
    width: 1536,
    height: 120
  },
  {
    type: "rect",
    x: 0,
    y: 984,
    width: 1536,
    height: 120
  },
  {
    type: "rect",
    x: -80,
    y: 0,
    width: 120,
    height: 1024
  },
  {
    type: "rect",
    x: 1496,
    y: 0,
    width: 120,
    height: 1024
  },
  {
    type: "ellipse",
    x: 231.74563591022456,
    y: 7.353381261324444,
    width: 1060,
    height: 615
  },
  {
    type: "rect",
    x: 610,
    y: 46,
    width: 318,
    height: 58
  },
  {
    type: "ellipse",
    x: 51.710723192019955,
    y: -150.10590917061205,
    width: 212,
    height: 592
  },
  {
    type: "ellipse",
    x: 1253.0399002493766,
    y: -155.01116371500416,
    width: 222,
    height: 610
  },
  {
    type: "ellipse",
    x: -155.0997506234412,
    y: 710.080776199661,
    width: 460,
    height: 260
  },
  {
    type: "ellipse",
    x: 1317.8478802992518,
    y: 736.6351043310539,
    width: 456,
    height: 260
  }
];

const collisionZones = storyCampScene === "lake" ? lakeCollisionZones : campCollisionZones;
window.PoCoBOTStoryCollisionEditor?.applySceneZones(campSceneKey, collisionZones);

function readCampProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CAMP_PROGRESS_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function writeCampProgress(patch = {}) {
  const next = { ...readCampProgress(), ...patch, updatedAt: Date.now() };
  try {
    localStorage.setItem(CAMP_PROGRESS_KEY, JSON.stringify(next));
  } catch (error) {}
  return next;
}

let campProgress = readCampProgress();

function placePlayerAt(point) {
  if (!point) return;
  player.x = Math.max(player.radius, Math.min(world.width - player.radius, Number(point.x) || campSceneSpawnPoint.x));
  player.y = Math.max(player.radius, Math.min(world.height - player.radius, Number(point.y) || campSceneSpawnPoint.y));
  player.vx = 0;
  player.vy = 0;
}

function readCampScenePosition() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CAMP_SCENE_POSITION_KEY) || "{}");
    if (!parsed || typeof parsed !== "object") return null;
    const x = Number(parsed.x);
    const y = Number(parsed.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  } catch (error) {
    return null;
  }
}

function rememberCampScenePosition(force = false) {
  const x = Math.round(player.x);
  const y = Math.round(player.y);
  const now = Date.now();
  if (!force) {
    const movedEnough = Math.abs(x - campScenePositionState.x) >= 8 || Math.abs(y - campScenePositionState.y) >= 8;
    const enoughTimePassed = now - campScenePositionState.savedAt >= 900;
    if (!movedEnough && !enoughTimePassed) return;
  }
  campScenePositionState.x = x;
  campScenePositionState.y = y;
  campScenePositionState.savedAt = now;
  try {
    localStorage.setItem(CAMP_SCENE_POSITION_KEY, JSON.stringify({ x, y, savedAt: now }));
  } catch (error) {}
}

function applyInitialCampScenePosition() {
  if (storyParams.get("story_restore_position") === "1") {
    const spawnX = Number(storyParams.get("story_player_x"));
    const spawnY = Number(storyParams.get("story_player_y"));
    if (Number.isFinite(spawnX) && Number.isFinite(spawnY)) {
      placePlayerAt({ x: spawnX, y: spawnY });
      rememberCampScenePosition(true);
      return;
    }
  }
  const savedPosition = readCampScenePosition();
  if (!savedPosition) return;
  placePlayerAt(savedPosition);
  rememberCampScenePosition(true);
}

applyInitialCampScenePosition();

const campInteractables = [
  {
    id: "corvo",
    x: 1128.1695760598504,
    y: 825.3378923373658,
    radius: 118,
    label: "Corvo Vanta",
    hint: "Hablar",
    message: "Corvo observa tus manos antes que tu cara.",
    scale: 1
  },
  {
    id: "radio_xavor",
    x: 760,
    y: 425,
    radius: 60,
    label: "Radio de Xavor",
    hint: "Contactar",
    message: "La radio de Xavor puede romper la desconfianza de Corvo.",
    scale: 0.5
  },
  {
    id: "medic",
    x: 247.33915211970066,
    y: 886.6725115436319,
    radius: 98,
    label: "Nara, sanitaria",
    hint: "Encargo",
    message: "Nara necesita filtros limpios para contener la fiebre del agua.",
    scale: 1,
    role: "medic"
  },
  {
    id: "quartermaster",
    x: 1353.4837905236907,
    y: 489.3855865334034,
    radius: 104,
    label: "Dámaso, logística",
    hint: "Intercambio",
    message: "Damaso guarda filtros, pero pide una placa roja sellada.",
    scale: 0.85,
    role: "quartermaster"
  },
  {
    id: "mechanic",
    x: 448.1695760598504,
    y: 491.8310830557017,
    radius: 70,
    label: "Iria, mecanica",
    hint: "Intercambio",
    message: "Iria puede abrir el armario de placas si alguien le trae un fusible.",
    scale: 0.9,
    role: "mechanic"
  },
  {
    id: "deck_pirate",
    x: 387,
    y: 144,
    radius: 70,
    label: "Nix Corsario",
    hint: "Piratear mazo",
    message: "Nix puede purgar hasta tres cartas del mazo antes del hackeo del agua.",
    scale: 0.6,
    role: "deck_pirate"
  },
  {
    id: "sparring",
    x: 132.41147132169576,
    y: 468.3688701852826,
    radius: 106,
    label: "PoCoBOT de resistencia",
    hint: "Combate controlado",
    message: "Un PoCoBOT veterano acepta un duelo de calibracion.",
    scale: 0.8,
    role: "resistance_bot"
  },
  {
    id: "water_pc",
    x: 1212,
    y: 327,
    radius: 70,
    label: "PC del flujo de agua",
    hint: "Hackear",
    message: "El PC controla el flujo del agua. Xavor puede entrar conectando la radio.",
    scale: 1
  },
  {
    id: "north_exit",
    x: 1024.7556109725685,
    y: 115.82471213980936,
    radius: 70,
    label: "Paso norte",
    hint: "Ir al lago",
    message: "El paso norte lleva al lago de captacion.",
    scale: 0.71
  }
];

const lakeInteractables = [
  {
    id: "lake_drone",
    x: 761.4962593516209,
    y: 581.8583201823601,
    radius: 160,
    label: "Dron del lago",
    hint: "Combate",
    message: "El dron esta ensuciando el lago con sedimentos de Argós.",
    scale: 1,
    role: "lake_drone"
  },
  {
    id: CAMP_LAKE_SECRET_CARD_ID,
    x: 1222,
    y: 356,
    radius: 76,
    label: "Resplandor rojo",
    hint: "Examinar",
    message: "Un resplandor rojo palpita entre chatarra y barro seco.",
    scale: 0.72
  },
  {
    id: "return_camp",
    x: 769,
    y: 977,
    radius: 70,
    label: "Volver al campamento",
    hint: "Regresar",
    message: "El sendero sur vuelve al campamento.",
    scale: 1
  }
];

const interactables = storyCampScene === "lake" ? lakeInteractables : campInteractables;
window.PoCoBOTStoryCollisionEditor?.applySceneInteractionPoints(campSceneKey, interactables);

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
let campMusicPausedForVisibility = false;
let campMusicRestoreAttempted = false;
let lastCampMusicSaveAt = 0;

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

function smoothstep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function getCampPerspectiveScale(subject = player) {
  const nearY = 760;
  const farY = 170;
  const depth = smoothstep((nearY - subject.y) / (nearY - farY));
  return 1 - depth * 0.34;
}

function getEntityVisualScale(subject = {}) {
  const scale = Number(subject.scale ?? subject.spriteScale ?? 1);
  return Number.isFinite(scale) ? clamp(scale, 0.2, 3) : 1;
}

function withCampPerspective(subject, draw) {
  const visualScale = getCampPerspectiveScale(subject) * getEntityVisualScale(subject);
  ctx.save();
  ctx.translate(subject.x, subject.y);
  ctx.scale(visualScale, visualScale);
  draw(visualScale);
  ctx.restore();
}

function getCameraZoom() {
  if (isPortraitTouchViewport()) return 0.82;
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

function loadOptionalImage(source, assign) {
  loadImage(source)
    .then(assign)
    .catch((error) => console.warn(error));
}

function loadOptionalAnimation(sources, assign) {
  Promise.all(sources.map((source) => loadImage(source)))
    .then(assign)
    .catch((error) => console.warn(error));
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
    getVisualScale: getCampPerspectiveScale,
    baseSize: player.spriteWidth,
    sideFrameVerticalOffsets: playerVisualFrameSources.sideFrameVerticalOffsets,
  });
}

async function loadAssets() {
  const mapSource = storyCampScene === "lake"
    ? "./assets/lago-norte-map.png"
    : "./assets/campamento-placas-rojas-map.webp";
  const [mapImage, corvoImage, firstBotFrame] = await Promise.all([
    loadImage(mapSource).catch((error) => {
      console.warn(error);
      return createFallbackCampMap();
    }),
    loadImage("./assets/characters/exploration/corvo-vanta-seated-sprite.png").catch((error) => {
      console.warn(error);
      return null;
    }),
    loadImage(leanFrameSources[0]).catch((error) => {
      console.warn(error);
      return createFallbackBotFrame();
    }),
  ]);

  assets.map = mapImage;
  assets.corvo = corvoImage;
  assets.botFrames = [firstBotFrame];
  assets.frontFrames = assets.botFrames;
  Object.entries(npcImageSources).forEach(([key, source]) => {
    loadOptionalImage(source, (image) => {
      assets.npcs[key] = image;
    });
  });
  Object.entries(npcAnimationSources).forEach(([key, sources]) => {
    loadOptionalAnimation(sources, (frames) => {
      assets.npcAnimations[key] = frames;
    });
  });
  Object.entries(objectImageSources).forEach(([key, source]) => {
    loadOptionalImage(source, (image) => {
      assets.objects[key] = image;
    });
  });

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

function syncCampMusicSource() {
  if (!campMusic) return false;
  if (campMusic.dataset.storyCampMusicSrc === storyCampMusicUrl) return false;
  const declaredSource = campMusic.getAttribute("src") || "";
  const resolvedDeclaredSource = declaredSource ? new URL(declaredSource, window.location.href).href : "";
  if ((campMusic.currentSrc || campMusic.src || resolvedDeclaredSource) === storyCampMusicUrl || resolvedDeclaredSource === storyCampMusicUrl) {
    campMusic.dataset.storyCampMusicSrc = storyCampMusicUrl;
    return false;
  }
  campMusic.src = storyCampMusicUrl;
  campMusic.dataset.storyCampMusicSrc = storyCampMusicUrl;
  campMusic.load();
  return true;
}

syncCampMusicSource();

function readStoredCampMusicTime() {
  try {
    const storedTime = Number(sessionStorage.getItem(CAMP_AUDIO_TIME_KEY));
    return Number.isFinite(storedTime) && storedTime > 0 ? storedTime : 0;
  } catch (error) {
    return 0;
  }
}

function rememberCampMusicTime(force = false) {
  if (!campMusic || !Number.isFinite(campMusic.currentTime) || campMusic.currentTime <= 0) return;
  const now = performance.now();
  if (!force && now - lastCampMusicSaveAt < 1200) return;
  lastCampMusicSaveAt = now;
  try {
    sessionStorage.setItem(CAMP_AUDIO_TIME_KEY, String(campMusic.currentTime));
  } catch (error) {}
}

function restoreCampMusicTimeOnce() {
  if (!campMusic || campMusicRestoreAttempted) return;
  campMusicRestoreAttempted = true;
  const resumeAt = readStoredCampMusicTime();
  if (resumeAt <= 0 || campMusic.currentTime > 0.25) return;

  const applyStoredTime = () => {
    try {
      const duration = Number(campMusic.duration);
      campMusic.currentTime = Number.isFinite(duration) && duration > 1 ? resumeAt % duration : resumeAt;
    } catch (error) {}
  };

  if (campMusic.readyState >= 1) {
    applyStoredTime();
  } else {
    campMusic.addEventListener("loadedmetadata", applyStoredTime, { once: true });
  }
}

function primeParentCampMusic() {
  if (!storyEmbedMode || window.parent === window) return;

  try {
    const parentMusic = window.parent.document?.getElementById("storyMapMusic");
    if (!parentMusic) return;

    const targetSource = storyCampMusicUrl;
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
  const sourceChanged = syncCampMusicSource();
  restoreCampMusicTimeOnce();
  const alreadyPlaying = !sourceChanged && !campMusic.paused && !campMusic.ended;

  if (storyAudioMode === "external") {
    campMusicStarted = true;
    primeParentCampMusic();
    return;
  }

  if (alreadyPlaying) {
    campMusicStarted = true;
    if (campMusic.volume < 0.33) {
      fadeCampMusic(0.34, 420);
    }
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
  rememberCampMusicTime(true);
  campMusicShouldPlay = false;
  campMusicPausedForVisibility = false;
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

function silenceParentStoryMapMusic() {
  if (!storyEmbedMode || window.parent === window) return;
  try {
    window.parent.document?.querySelectorAll("audio,video").forEach((media) => {
      try {
        media.pause();
      } catch (error) {}
    });
    const parentMusic = window.parent.document?.getElementById("storyMapMusic");
    if (!parentMusic) return;
    parentMusic.pause();
  } catch (error) {}
}

function postStoryCampAction(action, payload = {}) {
  stopCampMusic(true);
  silenceParentStoryMapMusic();

  const message = {
    type: "pocobot-story-camp-action",
    action,
    savedAt: Date.now(),
    ...payload,
  };

  let posted = false;
  [window.parent !== window ? window.parent : null, window.opener].forEach((targetWindow) => {
    if (!targetWindow) return;
    try {
      targetWindow.postMessage(message, "*");
      posted = true;
    } catch (error) {}
  });

  if (action === "return-map" && storyReturnUrl && window.parent === window) {
    window.location.href = storyReturnUrl;
    return;
  }

  if (!posted) {
    handleStandaloneCampAction(action, payload);
  }
}

function completeLocalCampStep(interactionId) {
  if (interactionId === "corvo") {
    campProgress = writeCampProgress({ corvoIntroSeen: true });
  } else if (interactionId === "radio_xavor") {
    campProgress = writeCampProgress({ corvoTrusted: true, xavorVerified: true });
  } else if (interactionId === "medic") {
    campProgress = writeCampProgress({ medicRequest: true });
  } else if (interactionId === "quartermaster" && campProgress.medicRequest) {
    campProgress = writeCampProgress({ filtersReady: true });
  } else if (interactionId === "mechanic" && campProgress.filtersReady) {
    campProgress = writeCampProgress({ valveFuse: true });
  } else if (interactionId === "deck_pirate" && campProgress.valveFuse) {
    campProgress = writeCampProgress({ deckPirateMet: true });
  } else if (interactionId === "water_pc" && campProgress.corvoTrusted && campProgress.valveFuse && campProgress.deckPurged && campProgress.trialCleared) {
    campProgress = writeCampProgress({ waterFixed: true });
  } else if (interactionId === "lake_drone") {
    campProgress = writeCampProgress({ lakeDroneSeen: true });
  }
}

function getWaterPcPendingTasks() {
  const tasks = [];
  if (!campProgress.corvoIntroSeen) tasks.push("Habla con Corvo");
  if (campProgress.corvoIntroSeen && !campProgress.corvoTrusted) tasks.push("Activa la radio de Xavor");
  if (!campProgress.medicRequest) tasks.push("Habla con Nara");
  if (campProgress.medicRequest && !campProgress.filtersReady) tasks.push("Habla con Dámaso");
  if (campProgress.filtersReady && !campProgress.valveFuse) tasks.push("Habla con Iria");
  if (campProgress.valveFuse && !campProgress.deckPurged) tasks.push("Habla con Nix");
  if (!campProgress.trialCleared) tasks.push("Supera la calibracion del PoCoBOT");
  return tasks;
}

function getWaterPcLockedMessage() {
  const pendingTasks = getWaterPcPendingTasks();
  if (!pendingTasks.length) return "El PC sigue esperando la autorizacion final del campamento.";
  return `Todavia falta: ${pendingTasks.join(" · ")}`;
}

function getInteractionAction(interaction) {
  if (!interaction) return "";
  if (interaction.id === "return_camp") return "return-camp";
  if (interaction.id === "north_exit") return campProgress.waterFixed ? "open-lake" : "north-locked";
  if (interaction.id === "water_pc") return campProgress.corvoTrusted && campProgress.valveFuse && campProgress.deckPurged && campProgress.trialCleared ? "hack-pc" : "pc-locked";
  if (interaction.id === "deck_pirate") return campProgress.valveFuse ? "deck-pirate" : "deck-pirate-locked";
  if (interaction.id === "sparring") return "camp-trial";
  if (interaction.id === "lake_drone") return campProgress.lakeClean ? "lake-cleared" : "lake-drone";
  if (interaction.id === CAMP_LAKE_SECRET_CARD_ID) return campProgress.lakeGlowClaimed ? "lake-secret-card-claimed" : "lake-secret-card";
  return interaction.id.replaceAll("_", "-");
}

function handleInteraction(interaction) {
  if (!interaction) return;
  const action = getInteractionAction(interaction);

  if (action === "north-locked") {
    setInteractionMessage("El paso norte está cerrado.", 3.0);
    return;
  }
  if (action === "pc-locked") {
    setInteractionMessage(getWaterPcLockedMessage(), 5.2);
    return;
  }
  if (action === "deck-pirate-locked") {
    setInteractionMessage("Nix ni levanta la vista: primero consigue el fusible de Iria.", 3.0);
    return;
  }
  if (action === "lake-cleared") {
    setInteractionMessage("El lago vuelve a correr limpio. Te has ganado el respeto del Campamento de las Placas Rojas.", 3.2);
    return;
  }
  if (action === "lake-secret-card-claimed") {
    setInteractionMessage("El resplandor rojo ya se ha apagado. Solo queda el barro removido.", 3.4);
    return;
  }
  if (interaction.id === "radio_xavor" && !campProgress.corvoIntroSeen) {
    setInteractionMessage("Es la radio que te dio Xavor, la dejas aquí por si hay que contactar con él en algún momento.", 4.2);
    return;
  }

  rememberCampScenePosition(true);
  completeLocalCampStep(interaction.id);
  setInteractionMessage(interaction.message, 2.4);
  postStoryCampAction(action, {
    interactionId: interaction.id,
    scene: storyCampScene,
    playerPosition: { x: Math.round(player.x), y: Math.round(player.y) },
    progress: campProgress,
  });
}

function setInteractionMessage(text, duration = 2.8) {
  interactionState.message = text;
  interactionState.messageTimer = duration;
}

function navigateStandaloneScene(scene) {
  const target = new URL(window.location.href);
  target.searchParams.set("story_camp_scene", scene);
  target.searchParams.set("story_audio", storyAudioMode);
  window.location.href = target.href;
}

function buildStandaloneCombatUrl(mission, returnScene = "camp") {
  const target = new URL("../../../poker_combat_bot_ONLINE.html", window.location.href);
  target.searchParams.set("story_mission", mission);
  target.searchParams.set("story_embed", "1");
  target.searchParams.set("story_node", "campamento");
  target.searchParams.set("story_audio", "internal");
  target.searchParams.set("story_brief", "on");
  target.searchParams.set("story_standalone", "1");
  target.searchParams.set("story_ui", window.matchMedia("(pointer: coarse)").matches && Math.min(window.innerWidth || 0, window.innerHeight || 0) <= 820 && window.matchMedia("(orientation: landscape)").matches ? "horizontal" : "compact");
  target.searchParams.set("story_camp_return_scene", returnScene);
  target.searchParams.set("story_return", window.location.href);
  return target.href;
}

const standaloneSceneCopy = {
  corvo_intro: {
    kicker: "Corvo Vanta",
    title: "La desconfianza de las Placas Rojas",
    text: "Corvo no aparta la mano de la placa roja. Te deja claro que el campamento no entrega sus sistemas vitales a nadie que no haya demostrado de qué lado está.",
    actions: [{ label: "Buscar la radio de Xavor", action: "close" }],
  },
  corvo_lore: {
    kicker: "Corvo Vanta",
    title: "La Caída y Mr. Wind",
    text: "Corvo habla de una civilización que confundió excelencia con obediencia. Mr. Wind fue su jefe y acabó seducido por Argós hasta convertirse en Custodio. Si quieres tocar el PC del agua, tendrás que ayudar antes a su gente.",
    actions: [{ label: "Ayudar al campamento", action: "close" }],
  },
  xavor_radio: {
    kicker: "Radio de Xavor",
    title: "Señal verificada",
    text: "Xavor entra por la radio con su voz rota y confirma que vienes de los nuestros. Corvo no sonríe, pero deja de tratarte como una posible amenaza.",
    actions: [{ label: "Hablar con Corvo", action: "close" }],
  },
  medic: {
    kicker: "Nara · Enfermería",
    title: "Fiebre de agua",
    text: "Nara necesita filtros. El agua sabe a óxido caliente y la gente empieza a enfermar. Te entrega una placa médica para que Dámaso abra mueva la logística.",
    actions: [{ label: "Ir a logística", action: "close" }],
  },
  quartermaster_locked: {
    kicker: "Dámaso · Logística",
    title: "Falta una placa médica",
    text: "Dámaso no libera filtros sin una petición sellada. Primero habla con Nara, porque en este campamento cada recurso tiene su trámite.",
    actions: [{ label: "Buscar a Nara", action: "close" }],
  },
  quartermaster: {
    kicker: "Dámaso · Logística",
    title: "Filtros entregados",
    text: "Dámaso entrega los filtros y habla de la escasez posterior a La Caída. La válvula norte aún necesita un fusible estable: Iria puede tenerlo.",
    actions: [{ label: "Buscar a Iria", action: "close" }],
  },
  mechanic_locked: {
    kicker: "Iria · Válvula norte",
    title: "Cadena incompleta",
    text: "Iria no entrega el fusible si la enfermería sigue sin filtros. Primero resuelve el encargo de Nara y Dámaso.",
    actions: [{ label: "Volver al campamento", action: "close" }],
  },
  mechanic: {
    kicker: "Iria · Válvula norte",
    title: "Fusible de válvula",
    text: "Iria te entrega el fusible. Falta purgar el mazo, busca a Nix.",
    actions: [{ label: "Buscar a Nix", action: "close" }],
  },
  deck_pirate_locked: {
    kicker: "Nix Corsario",
    title: "Aún no hay nada que piratear",
    text: "Nix ni levanta la vista. Primero consigue el fusible de Iria para que el hackeo del mazo tenga sentido.",
    actions: [{ label: "Buscar el fusible", action: "close" }],
  },
  deck_pirate: {
    kicker: "Nix Corsario",
    title: "Piratear el mazo",
    text: "Nix puede purgar hasta tres cartas del mazo histórico. Sellará el canal para que el PC del agua acepte mejor a Xavor.",
    actions: [
      { label: "Purgar mazo", action: "deck-purge" },
      { label: "Cerrar", action: "close" },
    ],
  },
  deck_pirate_done: {
    kicker: "Nix Corsario",
    title: "Mazo purgado",
    text: "El canal de cartas ya no chisporrotea con ruido de Argós. Si ya superaste la calibración, el PC del agua está listo.",
    actions: [{ label: "Ir al PC del agua", action: "close" }],
  },
  trial: {
    kicker: "PoCoBOT de resistencia",
    title: "Combate controlado",
    text: "La piloto propone una prueba controlada: demostrar criterio y priorizar velocidad. ",
    actions: [
      { label: "Iniciar combate", action: "combat-trial" },
    ],
  },
  trial_win: {
    kicker: "Calibración",
    title: "Prueba superada",
    text: "La resistencia concede la marca de calibración. ",
    actions: [{ label: "Seguir reparación", action: "close" }],
  },
  pc_hack: {
    kicker: "PC del flujo de agua",
    title: "Xavor entra en la red",
    text: "Con fusible, mazo limpio y autorización, Xavor restaura el flujo. El agua vuelve a correr, pero llega sucia desde el Lago Norte. El paso norte queda abierto. Busca la causa.",
    actions: [
      { label: "Ir al Lago Norte", action: "go-lake" },
      { label: "Cerrar", action: "close" },
    ],
  },
  lake_drone: {
    kicker: "Lago Norte",
    title: "Dron contaminante",
    text: "El dron ejecuta una purga antigua de Argós y remueve sedimentos del lago. No responde a una negociación.",
    actions: [
      { label: "Iniciar combate", action: "combat-drone" },
    ],
  },
  lake_secret_card: {
    kicker: "Lago Norte",
    title: "Resplandor oculto",
    text: "Entre barro, chatarra y un brillo rojo casi tapado por la orilla, encuentras un 8 de tréboles intacto.",
    actions: [{ label: "Guardar hallazgo", action: "close" }],
  },
  lake_win: {
    kicker: "Lago Norte",
    title: "Agua limpia",
    text: "El dron cae. El lago deja de arrastrar barro oscuro y eres el nuevo héroe del Campamento de las Placas Rojas.",
    actions: [{ label: "Volver al campamento", action: "go-camp" }],
  },
};

let standaloneSceneOverlay = null;

function ensureStandaloneSceneOverlay() {
  if (standaloneSceneOverlay) return standaloneSceneOverlay;
  const overlay = document.createElement("section");
  overlay.className = "camp-local-scene";
  overlay.hidden = true;
  overlay.innerHTML = `
    <article class="camp-local-card">
      <button class="camp-local-close" type="button" aria-label="Cerrar escena">Cerrar</button>
      <p class="camp-local-kicker"></p>
      <h2></h2>
      <p class="camp-local-text"></p>
      <div class="camp-local-actions"></div>
    </article>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector(".camp-local-close").addEventListener("click", closeStandaloneScene);
  standaloneSceneOverlay = overlay;
  return overlay;
}

function openStandaloneScene(key) {
  const scene = standaloneSceneCopy[key];
  if (!scene) return;
  const overlay = ensureStandaloneSceneOverlay();
  overlay.querySelector(".camp-local-kicker").textContent = scene.kicker;
  overlay.querySelector("h2").textContent = scene.title;
  overlay.querySelector(".camp-local-text").textContent = scene.text;
  const actions = overlay.querySelector(".camp-local-actions");
  actions.innerHTML = "";
  scene.actions.forEach((entry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = entry.label;
    button.addEventListener("click", () => handleStandaloneSceneAction(entry.action));
    actions.appendChild(button);
  });
  overlay.hidden = false;
  window.requestAnimationFrame(() => overlay.classList.add("active"));
}

function closeStandaloneScene() {
  if (!standaloneSceneOverlay) return;
  standaloneSceneOverlay.classList.remove("active");
  window.setTimeout(() => {
    if (!standaloneSceneOverlay.classList.contains("active")) standaloneSceneOverlay.hidden = true;
  }, 180);
  focusExplorationInput();
}

function handleStandaloneSceneAction(action) {
  if (action === "close") {
    closeStandaloneScene();
    return;
  }
  if (action === "go-lake") {
    closeStandaloneScene();
    navigateStandaloneScene("lake");
    return;
  }
  if (action === "go-camp") {
    closeStandaloneScene();
    navigateStandaloneScene("camp");
    return;
  }
  if (action === "deck-purge") {
    campProgress = writeCampProgress({ deckPurged: true, deckPirateMet: true, deckPurgedCount: 0, deckPurgedIds: [] });
    openStandaloneScene("deck_pirate_done");
    return;
  }
  if (action === "combat-trial") {
    window.location.href = buildStandaloneCombatUrl("camp_resistance_trial", "camp");
    return;
  }
  if (action === "combat-drone") {
    window.location.href = buildStandaloneCombatUrl("camp_lake_drone", "lake");
  }
}

function handleStandaloneCampAction(action, payload = {}) {
  if (action === "return-camp") {
    navigateStandaloneScene("camp");
    return;
  }
  if (action === "open-lake") {
    navigateStandaloneScene("lake");
    return;
  }
  if (action === "lake-secret-card") {
    if (!campProgress.lakeGlowClaimed) {
      campProgress = writeCampProgress({ lakeGlowClaimed: true });
    }
    openStandaloneScene("lake_secret_card");
    return;
  }
  if (action === "return-map") {
    setInteractionMessage("Abre el modo historia para volver al mapa de la Ruta Ceniza.", 3.2);
    return;
  }
  if (action === "corvo") {
    openStandaloneScene((payload.progress || campProgress).corvoTrusted ? "corvo_lore" : "corvo_intro");
    return;
  }
  if (action === "radio-xavor") {
    openStandaloneScene("xavor_radio");
    return;
  }
  if (action === "medic") {
    openStandaloneScene("medic");
    return;
  }
  if (action === "quartermaster") {
    openStandaloneScene((payload.progress || campProgress).medicRequest ? "quartermaster" : "quartermaster_locked");
    return;
  }
  if (action === "mechanic") {
    openStandaloneScene((payload.progress || campProgress).filtersReady ? "mechanic" : "mechanic_locked");
    return;
  }
  if (action === "deck-pirate") {
    openStandaloneScene((payload.progress || campProgress).deckPurged ? "deck_pirate_done" : "deck_pirate");
    return;
  }
  if (action === "camp-trial") {
    openStandaloneScene("trial");
    return;
  }
  if (action === "hack-pc") {
    openStandaloneScene("pc_hack");
    return;
  }
  if (action === "lake-drone") {
    openStandaloneScene((payload.progress || campProgress).lakeClean ? "lake_win" : "lake_drone");
  }
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

campMusic?.addEventListener("timeupdate", () => rememberCampMusicTime());

document.addEventListener("visibilitychange", () => {
  if (document.hidden) rememberCampScenePosition(true);
  if (!campMusic) return;
  if (document.hidden) {
    rememberCampMusicTime(true);
    campMusicPausedForVisibility = campMusicShouldPlay && !campMusic.paused;
    campMusic.pause();
    return;
  }
  if (campMusicPausedForVisibility || campMusicShouldPlay) {
    startCampMusic();
  }
  campMusicPausedForVisibility = false;
});

window.addEventListener("pagehide", () => {
  rememberCampScenePosition(true);
  rememberCampMusicTime(true);
});

const portraitMedia = window.matchMedia("(orientation: portrait)");
const coarsePointerMedia = window.matchMedia("(pointer: coarse)");
const ALLOW_PORTRAIT_EXPLORATION = true;

function isPortraitTouchViewport() {
  return portraitMedia.matches && coarsePointerMedia.matches;
}

function shouldShowLandscapePrompt() {
  return !ALLOW_PORTRAIT_EXPLORATION && portraitMedia.matches && coarsePointerMedia.matches;
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
function handleViewportResize() {
  resizeViewportCanvas();
  updateLandscapePrompt();
  snapCameraToPlayer();
}

window.addEventListener("resize", handleViewportResize);
window.visualViewport?.addEventListener?.("resize", handleViewportResize);
window.addEventListener("orientationchange", () => window.setTimeout(handleViewportResize, 80));
portraitMedia.addEventListener?.("change", updateLandscapePrompt);
coarsePointerMedia.addEventListener?.("change", updateLandscapePrompt);
desktopCameraMedia.addEventListener?.("change", snapCameraToPlayer);
screen.orientation?.addEventListener?.("change", updateLandscapePrompt);
updateLandscapePrompt();

function findActiveInteraction() {
  interactionState.active = null;
  let best = null;
  let bestDistance = Infinity;
  interactables.forEach((item) => {
    const distance = Math.hypot(player.x - item.x, player.y - item.y);
    if (distance <= item.radius && distance < bestDistance) {
      best = item;
      bestDistance = distance;
    }
  });
  interactionState.active = best;
}

function maybeAutoUseSceneExit(now) {
  if (storyCampScene === "camp" && campProgress.waterFixed && player.y <= 110 && player.x > 650 && player.x < 886) {
    if (now - sceneActionCooldown.northExit > 1400) {
      sceneActionCooldown.northExit = now;
      const exit = campInteractables.find((item) => item.id === "north_exit");
      if (exit) handleInteraction(exit);
    }
  }
  if (storyCampScene === "lake" && player.y >= 892 && player.x > 620 && player.x < 916) {
    if (now - sceneActionCooldown.returnCamp > 1400) {
      sceneActionCooldown.returnCamp = now;
      const exit = lakeInteractables.find((item) => item.id === "return_camp");
      if (exit) handleInteraction(exit);
    }
  }
}

function update(dt) {
  if (!assets.ready) return;
  const now = performance.now();

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
  if (input.interactQueued && interactionState.active) {
    handleInteraction(interactionState.active);
  }
  maybeAutoUseSceneExit(now);
  rememberCampScenePosition();
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
  const visualScale = getCampPerspectiveScale(player);
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.scale(visualScale, visualScale);
  ctx.translate(-player.x, -player.y);
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
  ctx.restore();
}

function drawMap() {
  ctx.drawImage(assets.map, 0, 0, world.width, world.height);

  const pulse = 0.5 + Math.sin(performance.now() / 420) * 0.5;
  if (storyCampScene === "lake") {
    drawLakeOverlay(pulse);
    return;
  }

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = `rgba(255, 109, 56, ${0.02 + pulse * 0.025})`;
  ctx.beginPath();
  ctx.ellipse(768, 520, 300, 170, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

}

function drawLakeOverlay(pulse) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = campProgress.lakeClean
    ? `rgba(140, 236, 255, ${0.14 + pulse * 0.08})`
    : `rgba(255, 91, 63, ${0.1 + pulse * 0.08})`;
  ctx.lineWidth = 5;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.ellipse(768, 392 + i * 22, 260 + i * 78, 92 + i * 34, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = campProgress.lakeClean
    ? `rgba(140, 236, 255, ${0.025 + pulse * 0.035})`
    : `rgba(95, 62, 43, ${0.075 + pulse * 0.045})`;
  ctx.beginPath();
  ctx.ellipse(768, 380, 390, 205, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function getInteractionDistance(interactable) {
  return Math.hypot(player.x - interactable.x, player.y - interactable.y);
}

function drawWorldLabel(x, y, title, subtitle, options = {}) {
  const active = !!options.active;
  const perspective = options.perspectiveScale || 1;
  const scale = (active ? 1 : 0.86) * perspective;
  const alpha = active ? 0.96 : 0.72;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.font = "800 14px Trebuchet MS, Segoe UI, sans-serif";
  const titleWidth = ctx.measureText(title).width;
  ctx.font = "700 11px Trebuchet MS, Segoe UI, sans-serif";
  const subtitleWidth = ctx.measureText(subtitle).width;
  const width = Math.min(210, Math.max(titleWidth, subtitleWidth) + 30);
  const height = active ? 44 : 32;
  const yOffset = active ? -62 : -48;

  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(17, 10, 9, 0.86)";
  ctx.strokeStyle = active ? "rgba(140, 236, 255, 0.5)" : "rgba(255, 177, 92, 0.36)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-width / 2, yOffset, width, height, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = active ? "#8cecff" : "#ffb15c";
  ctx.fillRect(-width / 2 + 10, yOffset + 8, 5, height - 16);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff3e6";
  ctx.font = "900 13px Trebuchet MS, Segoe UI, sans-serif";
  ctx.fillText(title, 4, yOffset + (active ? 16 : 16), width - 26);
  if (active) {
    ctx.fillStyle = "rgba(180, 244, 255, 0.84)";
    ctx.font = "800 10px Trebuchet MS, Segoe UI, sans-serif";
    ctx.fillText(subtitle, 4, yOffset + 32, width - 26);
  }
  ctx.restore();
}

function drawInteractionPlate(item, options = {}) {
  const active = interactionState.active?.id === item.id;
  const distance = getInteractionDistance(item);
  const revealDistance = Number.isFinite(options.revealDistance)
    ? options.revealDistance
    : item.radius * 1.04;
  const shouldReveal = active || distance <= revealDistance || options.alwaysLabel;
  if (!shouldReveal) return;

  const pulse = 0.5 + Math.sin(performance.now() / 300) * 0.5;
  const perspective = getCampPerspectiveScale(item);
  const radiusX = (options.radiusX || (active ? 56 + pulse * 8 : 42)) * perspective;
  const radiusY = (options.radiusY || (active ? 30 + pulse * 4 : 22)) * perspective;
  const plateAlpha = active ? 1 : clamp(1 - distance / revealDistance, 0.18, 0.46);
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(140, 236, 255, ${active ? 0.88 : 0.2 * plateAlpha})`;
  ctx.fillStyle = `rgba(140, 236, 255, ${active ? 0.075 : 0.018 * plateAlpha})`;
  ctx.lineWidth = active ? 3.2 : 1.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();

  if (active || options.alwaysLabel) {
    const labelLift = (options.labelLift || 56) * perspective;
    const labelY = options.labelDirection === "below" ? item.y + labelLift : item.y - labelLift;
    drawWorldLabel(item.x, labelY, item.label, item.hint, { active, perspectiveScale: perspective });
  }
}

function getNpcPalette(item) {
  if (item.role === "medic") return { body: "#f2eadc", trim: "#d64a43", visor: "#8cecff" };
  if (item.role === "quartermaster") return { body: "#5d4631", trim: "#ffb15c", visor: "#ffe2a6" };
  if (item.role === "mechanic") return { body: "#25323b", trim: "#8cecff", visor: "#ffb15c" };
  if (item.role === "deck_pirate") return { body: "#17111f", trim: "#d64a43", visor: "#66ffe4" };
  if (item.role === "resistance_bot") return { body: "#1a2028", trim: "#c33224", visor: "#8cecff" };
  if (item.role === "lake_drone") return { body: "#16232a", trim: "#66d0bf", visor: "#ff5b3f" };
  return { body: "#241712", trim: "#ffb15c", visor: "#8cecff" };
}

function getNpcAnimationImage(item, options = {}) {
  const animationFrames = assets.npcAnimations[item.role];
  if (!animationFrames?.length) return assets.npcs[item.role];

  const timeline = npcAnimationTimelines[item.role];
  if (!timeline?.length) {
    const frameMs = options.frameMs || 260;
    return animationFrames[Math.floor(performance.now() / frameMs) % animationFrames.length];
  }

  const totalDuration = timeline.reduce((total, step) => total + step.duration, 0);
  let elapsed = performance.now() % totalDuration;
  for (const step of timeline) {
    if (elapsed < step.duration) {
      return animationFrames[step.frame] || animationFrames[0];
    }
    elapsed -= step.duration;
  }
  return animationFrames[0];
}

function drawNpcImage(item, options = {}) {
  const image = getNpcAnimationImage(item, options);
  if (!image) return false;
  const width = options.width || 76;
  const height = options.height || 168;
  const lift = options.lift ?? 22;
  const shadowWidth = options.shadowWidth || Math.max(52, width * 0.72);
  const shadowHeight = options.shadowHeight || Math.max(16, width * 0.22);
  withCampPerspective(item, () => {
    drawSoftShadow(0, 18, shadowWidth, shadowHeight, options.shadowAlpha ?? 0.28);
    ctx.save();
    if (options.offsetX || options.offsetY) ctx.translate(options.offsetX || 0, options.offsetY || 0);
    if (options.bob) ctx.translate(0, options.bob);
    if (options.rotate) ctx.rotate(options.rotate);
    ctx.drawImage(image, -width / 2, -height + lift, width, height);
    ctx.restore();
  });
  return true;
}

function drawHumanNpc(item) {
  const spriteSizes = {
    medic: { width: 96, height: 168, lift: 24, shadowWidth: 54, shadowHeight: 16 },
    quartermaster: { width: 98, height: 172, lift: 24, shadowWidth: 56, shadowHeight: 17 },
    mechanic: { width: 96, height: 170, lift: 24, shadowWidth: 54, shadowHeight: 16 },
    deck_pirate: { width: 100, height: 170, lift: 24, shadowWidth: 58, shadowHeight: 17 },
  };
  if (drawNpcImage(item, spriteSizes[item.role])) return;

  const palette = getNpcPalette(item);
  withCampPerspective(item, () => {
    drawSoftShadow(0, 26, 42, 14, 0.32);
    ctx.fillStyle = palette.body;
    ctx.strokeStyle = palette.trim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-18, -30, 36, 58, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = palette.visor;
    ctx.beginPath();
    ctx.arc(0, -42, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(8, 8, 10, 0.7)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = palette.trim;
    ctx.fillRect(-22, -8, 44, 8);
  });
}

function drawResistanceBotNpc(item) {
  if (drawNpcImage(item, {
    width: 104,
    height: 182,
    lift: 28,
    shadowWidth: 62,
    shadowHeight: 22,
    shadowAlpha: 0.3,
  })) return;

  const palette = getNpcPalette(item);
  withCampPerspective(item, () => {
    drawSoftShadow(0, 34, 58, 18, 0.34);
    ctx.fillStyle = palette.body;
    ctx.strokeStyle = palette.trim;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(-30, -42, 60, 84, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = palette.visor;
    ctx.fillRect(-20, -10, 40, 12);
    ctx.fillStyle = "rgba(195, 50, 36, 0.92)";
    ctx.fillRect(-36, 12, 72, 10);
  });
}

function drawLakeDroneNpc(item) {
  const now = performance.now();
  const hover = Math.sin(now / 180) * 6 + Math.sin(now / 74) * 2.8;
  const offsetX = Math.sin(now / 92) * 5 + Math.cos(now / 41) * 2.2;
  const rotate = Math.sin(now / 240) * 0.034 + Math.cos(now / 68) * 0.018;
  if (drawNpcImage(item, {
    width: 210,
    height: 140,
    lift: 72,
    bob: hover,
    offsetX,
    rotate,
    shadowWidth: 86,
    shadowHeight: 24,
    shadowAlpha: 0.34,
  })) return;

  const palette = getNpcPalette(item);
  withCampPerspective(item, () => {
    ctx.translate(offsetX, hover);
    ctx.rotate(rotate);
    drawSoftShadow(0, 48 - hover, 68, 20, 0.32);
    ctx.fillStyle = palette.body;
    ctx.strokeStyle = palette.trim;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 48, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = palette.visor;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 91, 63, 0.65)";
    ctx.beginPath();
    ctx.arc(0, 0, 64, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawLakeSecretGlow(item) {
  const pulse = 0.5 + Math.sin(performance.now() / 260) * 0.5;
  withCampPerspective(item, () => {
    drawSoftShadow(0, 20, 52, 16, 0.22);
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(255, 42, 24, ${0.18 + pulse * 0.16})`;
    ctx.beginPath();
    ctx.ellipse(0, -10, 56, 22, -0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 124, 68, ${0.08 + pulse * 0.12})`;
    ctx.beginPath();
    ctx.ellipse(8, -22, 34, 14, -0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = `rgba(255, 198, 146, ${0.4 + pulse * 0.25})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-18, 8);
    ctx.lineTo(-2, -18);
    ctx.lineTo(20, -6);
    ctx.stroke();
  });
}

function drawRadioTerminal(item) {
  const pulse = 0.5 + Math.sin(performance.now() / 360) * 0.5;
  withCampPerspective(item, () => {
    drawSoftShadow(0, 30, 54, 16, 0.3);
    ctx.fillStyle = "rgba(40, 23, 18, 0.96)";
    ctx.strokeStyle = "rgba(255, 177, 92, 0.5)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-42, -20, 84, 44, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(15, 22, 26, 0.96)";
    ctx.strokeStyle = "rgba(140, 236, 255, 0.46)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-22, -52, 44, 42, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = `rgba(140, 236, 255, ${0.56 + pulse * 0.28})`;
    ctx.fillRect(-13, -39, 26, 8);
    ctx.strokeStyle = "rgba(255, 177, 92, 0.72)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(20, -47);
    ctx.lineTo(42, -74);
    ctx.stroke();
    ctx.fillStyle = "rgba(195, 50, 36, 0.92)";
    ctx.beginPath();
    ctx.arc(42, -74, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawWaterPc(item) {
  const pulse = 0.5 + Math.sin(performance.now() / 420) * 0.5;
  const sprite = assets.objects.water_pc;
  if (sprite) {
    withCampPerspective(item, () => {
      const width = 156;
      const height = 196;
      drawSoftShadow(0, 40, 78, 22, 0.32);
      ctx.drawImage(sprite, -width / 2, -height + 50, width, height);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = campProgress.waterFixed
        ? `rgba(102, 255, 228, ${0.12 + pulse * 0.08})`
        : `rgba(255, 91, 63, ${0.09 + pulse * 0.07})`;
      ctx.beginPath();
      ctx.ellipse(10, -82, 36, 16, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    });
    return;
  }

  withCampPerspective(item, () => {
    drawSoftShadow(0, 38, 74, 20, 0.34);
    ctx.fillStyle = "rgba(22, 22, 24, 0.95)";
    ctx.strokeStyle = "rgba(255, 177, 92, 0.42)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(-56, -28, 112, 64, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(4, 18, 24, 0.98)";
    ctx.strokeStyle = "rgba(140, 236, 255, 0.54)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-44, -82, 88, 58, 10);
    ctx.fill();
    ctx.stroke();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = campProgress.waterFixed
      ? `rgba(102, 255, 228, ${0.28 + pulse * 0.2})`
      : `rgba(255, 91, 63, ${0.22 + pulse * 0.18})`;
    ctx.fillRect(-32, -68, 64, 18);
    ctx.fillRect(-28, -43, 56, 6);
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "rgba(102, 255, 228, 0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-52, 12);
    ctx.bezierCurveTo(-82, 24, -86, 44, -112, 48);
    ctx.moveTo(52, 12);
    ctx.bezierCurveTo(78, 22, 84, 42, 108, 48);
    ctx.stroke();
  });
}

function drawNorthGate(item) {
  const open = !!campProgress.waterFixed;
  withCampPerspective(item, () => {
    drawSoftShadow(0, 38, 92, 22, 0.26);
    ctx.strokeStyle = open ? "rgba(140, 236, 255, 0.62)" : "rgba(195, 50, 36, 0.72)";
    ctx.fillStyle = "rgba(20, 12, 10, 0.9)";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-70, 36);
    ctx.lineTo(-70, -46);
    ctx.moveTo(70, 36);
    ctx.lineTo(70, -46);
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-70, -46);
    ctx.quadraticCurveTo(0, -82, 70, -46);
    ctx.stroke();
    ctx.fillStyle = open ? "rgba(12, 45, 48, 0.82)" : "rgba(48, 17, 13, 0.88)";
    ctx.strokeStyle = "rgba(255, 177, 92, 0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-42, -32, 84, 34, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = open ? "#8cecff" : "#ffb15c";
    ctx.font = "900 13px Trebuchet MS, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(open ? "LAGO NORTE" : "CERRADO", 0, -15);
  });
}

function drawReturnCampSign(item) {
  withCampPerspective(item, () => {
    drawSoftShadow(0, 22, 58, 16, 0.26);
    ctx.strokeStyle = "rgba(255, 177, 92, 0.62)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-32, 26);
    ctx.lineTo(-32, -42);
    ctx.stroke();
    ctx.fillStyle = "rgba(34, 20, 14, 0.92)";
    ctx.strokeStyle = "rgba(140, 236, 255, 0.42)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-32, -60, 104, 38, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#8cecff";
    ctx.font = "900 12px Trebuchet MS, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("CAMPAMENTO", 20, -41);
    ctx.fillStyle = "#ffb15c";
    ctx.beginPath();
    ctx.moveTo(-48, -41);
    ctx.lineTo(-30, -52);
    ctx.lineTo(-30, -46);
    ctx.lineTo(-12, -46);
    ctx.lineTo(-12, -36);
    ctx.lineTo(-30, -36);
    ctx.lineTo(-30, -30);
    ctx.closePath();
    ctx.fill();
  });
}

function drawObjectInteractable(item) {
  if (item.id === "radio_xavor") {
    drawRadioTerminal(item);
    return true;
  }
  if (item.id === "water_pc") {
    drawWaterPc(item);
    return true;
  }
  if (item.id === "north_exit") {
    drawNorthGate(item);
    return true;
  }
  if (item.id === CAMP_LAKE_SECRET_CARD_ID) {
    drawLakeSecretGlow(item);
    return true;
  }
  if (item.id === "return_camp") {
    drawReturnCampSign(item);
    return true;
  }
  return false;
}

function drawNpcMarker(item) {
  const isObject = item.id === "radio_xavor"
    || item.id === "water_pc"
    || item.id === "north_exit"
    || item.id === "return_camp";
  const labelConfig = {
    radio_xavor: { labelLift: 94 },
    water_pc: { labelLift: 92 },
    north_exit: { labelLift: 118, labelDirection: "below" },
    [CAMP_LAKE_SECRET_CARD_ID]: { labelLift: 80 },
    return_camp: { labelLift: 82 },
  }[item.id] || {};
  drawInteractionPlate(item, {
    radiusX: item.role === "lake_drone" ? 108 : isObject ? 62 : 42,
    radiusY: item.role === "lake_drone" ? 46 : isObject ? 27 : 23,
    labelLift: labelConfig.labelLift ?? (item.role === "lake_drone" ? 102 : isObject ? 82 : 66),
    labelDirection: labelConfig.labelDirection,
  });

  drawObjectInteractable(item);
  if (item.role === "resistance_bot") {
    drawResistanceBotNpc(item);
  } else if (item.role === "lake_drone") {
    drawLakeDroneNpc(item);
  } else if (item.role) {
    drawHumanNpc(item);
  }
}

function getCorvoInteractable() {
  return campInteractables.find((item) => item.id === "corvo") || {
    id: "corvo",
    x: 562,
    y: 506,
    radius: 118,
    label: "Corvo Vanta",
    hint: "Hablar",
  };
}

function drawCorvo() {
  const corvoInteraction = getCorvoInteractable();
  withCampPerspective(corvoInteraction, () => {
    if (assets.corvo) {
      drawSoftShadow(0, 26, 54, 18, 0.36);
      ctx.fillStyle = "rgba(10, 8, 7, 0.22)";
      ctx.beginPath();
      ctx.ellipse(0, -8, 40, 34, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(assets.corvo, -88, -86, 176, 114);
    } else {
      drawSoftShadow(0, 24, 50, 16, 0.34);
      ctx.fillStyle = "#14161b";
      ctx.strokeStyle = "#c33224";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(-34, -40, 68, 78, 20);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffb15c";
      ctx.fillRect(-22, -8, 44, 12);
    }
  });
  drawInteractionPlate(corvoInteraction, {
    radiusX: 48,
    radiusY: 24,
    labelLift: 78,
  });
}

function drawCampActors() {
  if (storyCampScene === "camp") {
    drawCorvo();
  }
  interactables.forEach((item) => {
    if (item.id === "corvo") return;
    drawNpcMarker(item);
  });
}

function drawPlayerActor() {
  if (playerVisual) {
    playerVisual.draw();
  } else {
    drawFallbackPlayer();
  }
}

function drawWorldActors() {
  const actors = interactables
    .filter((item) => item.id !== "corvo")
    .map((item) => ({
      y: item.y,
      draw: () => drawNpcMarker(item),
    }));

  if (storyCampScene === "camp") {
    actors.push({ y: getCorvoInteractable().y, draw: drawCorvo });
  }

  actors.push({ y: player.y, draw: drawPlayerActor });
  actors.sort((a, b) => a.y - b.y);
  actors.forEach((actor) => actor.draw());
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
    ctx.fillText("E / Enter: interactuar con Corvo, PNJ y terminales", boxX + 18, boxY + 78);
  }

  if (interactionState.active) {
    const label = interactionState.active.label;
    const hint = interactionState.active.hint;
    const promptWidth = Math.min(376, viewport.width - 28);
    const promptX = (viewport.width - promptWidth) / 2;
    const promptY = viewport.height - (isPortraitTouchViewport() ? 118 : 132);
    ctx.fillStyle = "rgba(12, 8, 7, 0.84)";
    ctx.strokeStyle = "rgba(140, 236, 255, 0.34)";
    ctx.beginPath();
    ctx.roundRect(promptX, promptY, promptWidth, 48, 17);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = "#8cecff";
    ctx.font = "900 14px Trebuchet MS, Segoe UI, sans-serif";
    ctx.fillText(`${label} · ${hint}`, viewport.width / 2, promptY + 20);
    ctx.fillStyle = "rgba(255, 243, 230, 0.82)";
    ctx.font = "700 12px Trebuchet MS, Segoe UI, sans-serif";
    ctx.fillText("Pulsa E / Enter o toca para interactuar", viewport.width / 2, promptY + 38);
  }

  if (interactionState.message && interactionState.messageTimer > 0) {
    ctx.font = "800 15px Trebuchet MS, Segoe UI, sans-serif";
    const messageLines = wrapCanvasText(interactionState.message, Math.min(viewport.width - 136, 680));
    const messageLineHeight = 20;
    const messageBoxWidth = Math.min(viewport.width - 96, 740);
    const messageBoxHeight = Math.max(48, 28 + messageLines.length * messageLineHeight);
    const messageBoxX = (viewport.width - messageBoxWidth) / 2;
    const messageBoxY = viewport.height - messageBoxHeight - 12;
    ctx.fillStyle = "rgba(12, 8, 7, 0.8)";
    ctx.strokeStyle = "rgba(140, 236, 255, 0.3)";
    ctx.beginPath();
    ctx.roundRect(messageBoxX, messageBoxY, messageBoxWidth, messageBoxHeight, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff3e6";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const firstLineY = messageBoxY + messageBoxHeight / 2 - ((messageLines.length - 1) * messageLineHeight) / 2;
    messageLines.forEach((line, index) => {
      ctx.fillText(line, viewport.width / 2, firstLineY + index * messageLineHeight);
    });
  }
  ctx.restore();
}

function wrapCanvasText(text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (!currentLine || ctx.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
      return;
    }
    lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) lines.push(currentLine);
  return lines;
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
  drawWorldActors();
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

resizeViewportCanvas();
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
