const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const mapButton = document.getElementById("story-map-button");
const fosoMusic = document.getElementById("foso-music");

const objectiveTitle = document.getElementById("objective-title");
const objectiveCopy = document.getElementById("objective-copy");
const interactPrompt = document.getElementById("interact-prompt");
const handCardsEl = document.getElementById("hand-cards");

const statusThreats = document.getElementById("status-threats");
const statusCover = document.getElementById("status-cover");
const statusLosses = document.getElementById("status-losses");
const statusDeck = document.getElementById("status-deck");

const modalLayer = document.getElementById("modal-layer");
const modalKicker = document.getElementById("modal-kicker");
const modalTitle = document.getElementById("modal-title");
const modalCopy = document.getElementById("modal-copy");
const modalMeta = document.getElementById("modal-meta");
const modalLossPreview = document.getElementById("modal-loss-preview");
const modalCardGrid = document.getElementById("modal-card-grid");
const modalActions = document.getElementById("modal-actions");

const storyParams = new URLSearchParams(window.location.search);
const storyEmbedMode = storyParams.get("story_embed") === "1";
const storyReturnUrl = storyParams.get("story_return") || "";
const storyAudioMode = storyParams.get("story_audio") || "internal";
const storyLoadId = storyParams.get("story_load_id") || "default";
const storyExtraDeckParam = storyParams.get("story_deck_cards") || "";
const storyRemovedDeckParam = storyParams.get("story_removed_cards") || "";

const FOSO_SCENE_ID = "foso-viento-negro";
const FOSO_PROGRESS_KEY = "pocobot-story-foso-blackwind-progress-v1";
const FOSO_SAVE_INTERVAL_MS = 800;
const SUIT_SYMBOLS = {
  spades: "♠",
  hearts: "♥",
  clubs: "♣",
  diamonds: "♦",
};
const SUIT_LABELS = {
  spades: "Picas",
  hearts: "Corazones",
  clubs: "Treboles",
  diamonds: "Diamantes",
};
const SUIT_COLORS = {
  spades: "black",
  clubs: "black",
  hearts: "red",
  diamonds: "red",
};
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const WORLD_SCALE = {
  battleground: {
    x: 996,
    y: 46,
    width: 356,
    height: 214,
  },
  battlegroundMuzzles: [
    { x: 1058, y: 86 },
    { x: 1148, y: 78 },
    { x: 1246, y: 92 },
  ],
  redGlow: {
    x: 826,
    y: 952,
    radius: 30,
    pulse: 7,
  },
};
const LANE_NAMES = {
  west: "zigzag oeste",
  south: "curva sur",
  center: "nudo central",
  east: "pasarela este",
  north: "subida norte",
  battery: "acceso a bateria",
};

const viewport = {
  width: canvas.width,
  height: canvas.height,
  dpr: Math.max(1, window.devicePixelRatio || 1),
};

const world = {
  width: 1448,
  height: 1086,
  startX: 154,
  startY: 828,
  roadRadius: 56,
  edgePadding: 18,
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
};

const player = {
  x: world.startX,
  y: world.startY,
  radius: 24,
  vx: 0,
  vy: 0,
  maxSpeed: 260,
  acceleration: 980,
  drag: 5.6,
  spriteWidth: 132,
  facing: "up",
};

const camera = {
  x: 0,
  y: 0,
  zoom: 1.02,
};

const coverRects = [
  { x: 226, y: 738, width: 96, height: 56 },
  { x: 398, y: 650, width: 112, height: 58 },
  { x: 578, y: 518, width: 112, height: 58 },
  { x: 838, y: 382, width: 118, height: 62 },
  { x: 1078, y: 234, width: 126, height: 62 },
];
const baseDebugCollisionZones = [
  { type: "rect", x: 0, y: 4, width: 87, height: 837 },
  { type: "rect", x: 6, y: 874, width: 55, height: 204 },
  { type: "rect", x: 71, y: 1050, width: 1377, height: 36 },
  { type: "rect", x: 1381, y: 2, width: 67, height: 935 },
  { type: "rect", x: 1188, y: 934, width: 260, height: 120 },
  { type: "rect", x: 94, y: 2, width: 870, height: 59 },
  { type: "rect", x: 984, y: 5, width: 417, height: 53 },
  { type: "ellipse", x: 98, y: 655, width: 179, height: 175 },
  { type: "ellipse", x: 521, y: 669, width: 47, height: 51 },
  { type: "ellipse", x: 621, y: 869, width: 91, height: 64 },
  { type: "ellipse", x: 930, y: 880, width: 60, height: 50 },
  { type: "ellipse", x: 1118, y: 699, width: 92, height: 56 },
  { type: "ellipse", x: 1088, y: 731, width: 36, height: 45 },
  { type: "ellipse", x: 1235, y: 503, width: 62, height: 32 },
  { type: "ellipse", x: 1004, y: 513, width: 63, height: 48 },
  { type: "ellipse", x: 767, y: 649, width: 118, height: 74 },
  { type: "ellipse", x: 647, y: 457, width: 123, height: 94 },
  { type: "ellipse", x: 350, y: 497, width: 121, height: 71 },
  { type: "ellipse", x: 401, y: 346, width: 86, height: 49 },
  { type: "ellipse", x: 66, y: 236, width: 199, height: 113 },
  { type: "ellipse", x: 37, y: 378, width: 173, height: 101 },
  { type: "ellipse", x: 581, y: 184, width: 87, height: 31 },
  { type: "ellipse", x: 706, y: 265, width: 39, height: 53 },
  { type: "ellipse", x: 835, y: 208, width: 44, height: 24 },
  { type: "ellipse", x: 1032, y: 298, width: 29, height: 32 },
  { type: "ellipse", x: 1129, y: 372, width: 78, height: 55 },
  { type: "ellipse", x: 1289, y: 172, width: 98, height: 57 },
  { type: "ellipse", x: 821, y: 58, width: 156, height: 50 },
  { type: "ellipse", x: 286, y: 971, width: 179, height: 90 },
];
const debugCollisionZones = baseDebugCollisionZones.map((zone) => ({ ...zone }));

const laneTargets = {
  west: { x: 404.7282838983051, y: 744.2842649934811 },
  south: { x: 1025.173647327249, y: 665.7178536505867 },
  center: { x: 607.7832871577575, y: 359.66806551499343 },
  east: { x: 910, y: 408 },
  north: { x: 350.0147490221643, y: 175.86016949152543 },
  battery: { x: 1299.2475146675358, y: 410.76804921773146 },
};

const threats = [
  { id: "t1", triggerX: 404.7282838983051, triggerY: 744.2842649934811, triggerRadius: 88, lane: "west", impactX: 404.7282838983051, impactY: 744.2842649934811, damage: 1, eta: "4.2s", title: "Salva de apertura", copy: "La bateria calibra el primer zigzag junto a la entrada de la Ruta Ceniza.", missileCount: 2, spread: 20 },
  { id: "t2", triggerX: 1025.173647327249, triggerY: 665.7178536505867, triggerRadius: 92, lane: "south", impactX: 1025.173647327249, impactY: 665.7178536505867, damage: 2, eta: "3.8s", title: "Correccion de tiro", copy: "El fuego cae sobre la curva baja, donde el camino parece seguro pero no tiene salida limpia.", missileCount: 3, spread: 24 },
  { id: "t3", triggerX: 607.7832871577575, triggerY: 359.66806551499343, triggerRadius: 94, lane: "center", impactX: 607.7832871577575, impactY: 359.66806551499343, damage: 1, eta: "3.1s", title: "Rastreo del nudo central", copy: "Los sensores fijan el cruce de chatarra; el camino bueno empieza a confundirse con los ramales muertos.", missileCount: 2, spread: 22 },
  { id: "t4", triggerX: 840, triggerY: 420, triggerRadius: 98, lane: "east", impactX: 910, impactY: 408, damage: 2, eta: "2.7s", title: "Golpe sobre la pasarela", copy: "La bateria barre la pasarela este. Cubrirse aqui puede costar tiempo, pero llegar limpio al jefe vale oro.", missileCount: 3, spread: 26 },
  { id: "t5", triggerX: 350.0147490221643, triggerY: 175.86016949152543, triggerRadius: 96, lane: "north", impactX: 350.0147490221643, impactY: 175.86016949152543, damage: 2, eta: "2.6s", title: "Salva corta de altura", copy: "Las piezas de artilleria ya estan cerca. El tiro cae casi vertical sobre la subida norte.", missileCount: 4, spread: 26 },
  { id: "t6", triggerX: 1299.2475146675358, triggerY: 410.76804921773146, triggerRadius: 104, lane: "battery", impactX: 1299.2475146675358, impactY: 410.76804921773146, damage: 3, eta: "2.1s", title: "Ultima correccion", copy: "La bateria dispara a quemarropa sobre el acceso final antes de que puedas forzar el combate.", missileCount: 4, spread: 30 },
];

const interactables = [
  { id: "sign", x: 152, y: 818, radius: 86, label: "Leer cartel de la Ruta Ceniza", scale: 0.78 },
  { id: "battery", x: 1075.0623777705343, y: 191.43350717079528, radius: 132, label: "Alcance de la bateria residual", scale: 1 },
  { id: "red-glow", x: WORLD_SCALE.redGlow.x, y: WORLD_SCALE.redGlow.y, radius: WORLD_SCALE.redGlow.radius, label: "Resplandor rojo en ruinas de metal", scale: 0.45 },
];

const routePaths = [
  [
    { x: 154, y: 828 },
    { x: 212, y: 760 },
    { x: 306, y: 706 },
    { x: 412, y: 666 },
    { x: 520, y: 596 },
    { x: 614, y: 536 },
    { x: 706, y: 472 },
    { x: 820, y: 418 },
    { x: 948, y: 386 },
    { x: 1068, y: 292 },
    { x: 1192, y: 184 },
  ],
  [
    { x: 154, y: 828 },
    { x: 270, y: 874 },
    { x: 440, y: 822 },
    { x: 580, y: 764 },
    { x: 712, y: 706 },
    { x: 842, y: 724 },
    { x: 1020, y: 674 },
    { x: 1184, y: 590 },
    { x: 1322, y: 506 },
  ],
  [
    { x: 440, y: 822 },
    { x: 520, y: 934 },
    { x: 690, y: 984 },
    { x: 832, y: 940 },
    { x: 980, y: 844 },
    { x: 1098, y: 748 },
  ],
  [
    { x: 520, y: 596 },
    { x: 424, y: 500 },
    { x: 326, y: 466 },
    { x: 224, y: 506 },
    { x: 128, y: 584 },
  ],
  [
    { x: 614, y: 536 },
    { x: 640, y: 420 },
    { x: 566, y: 336 },
    { x: 462, y: 272 },
    { x: 354, y: 238 },
    { x: 232, y: 236 },
  ],
  [
    { x: 706, y: 472 },
    { x: 782, y: 556 },
    { x: 904, y: 592 },
    { x: 1042, y: 560 },
    { x: 1184, y: 590 },
  ],
  [
    { x: 820, y: 418 },
    { x: 766, y: 304 },
    { x: 640, y: 242 },
    { x: 518, y: 164 },
  ],
  [
    { x: 948, y: 386 },
    { x: 1044, y: 432 },
    { x: 1182, y: 414 },
    { x: 1322, y: 506 },
  ],
];

const assets = {
  background: new Image(),
  sign: new Image(),
  cover: new Image(),
  missile: new Image(),
  batteryWorld: new Image(),
  batteryCombat: new Image(),
  backFrame: null,
  sideFrames: [],
  hoverFrames: [],
};

const playerVisualFrameSources = window.PoCoBOTPlayerVisual?.assetSources("../shared-mecha-orientation/assets");
let playerVisual = null;
let lastTime = performance.now();
let saveTimer = 0;
let ambientMissileTimer = 0;
let toastMessage = "";
let toastUntil = 0;
let redGlowPulse = 0;
let lastExplosionSoundAt = 0;

const fosoAudio = {
  context: null,
  unlocked: false,
};

const state = {
  loaded: false,
  signRead: false,
  drawPile: [],
  hand: [],
  blockedBaseTokens: new Set(),
  blockedExtraIds: new Set(),
  lossEntries: [],
  resolvedThreatIds: new Set(),
  activeThreatId: "",
  activeThreatFlash: 0,
  redGlowCollected: false,
  modalMode: "",
  modalCardAction: "",
  scriptedMissiles: [],
  ambientMissiles: [],
  missileLayerSeed: Math.random(),
  explosions: [],
  nearestInteractableId: "",
  attemptComplete: false,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distanceSquaredToSegment(point, start, end) {
  const vx = end.x - start.x;
  const vy = end.y - start.y;
  const wx = point.x - start.x;
  const wy = point.y - start.y;
  const lengthSquared = vx * vx + vy * vy || 1;
  const t = clamp((wx * vx + wy * vy) / lengthSquared, 0, 1);
  const x = start.x + vx * t;
  const y = start.y + vy * t;
  const dx = point.x - x;
  const dy = point.y - y;
  return { distanceSquared: dx * dx + dy * dy, x, y };
}

function getNearestRoutePoint(x, y) {
  const point = { x, y };
  let nearest = { x, y, distanceSquared: Infinity };
  routePaths.forEach((path) => {
    for (let index = 0; index < path.length - 1; index += 1) {
      const candidate = distanceSquaredToSegment(point, path[index], path[index + 1]);
      if (candidate.distanceSquared < nearest.distanceSquared) {
        nearest = candidate;
      }
    }
  });
  return nearest;
}

function isOnPlayableRoute(x, y, radius = player.radius) {
  const nearest = getNearestRoutePoint(x, y);
  return nearest.distanceSquared <= (world.roadRadius - radius * 0.34) ** 2;
}

function constrainToPlayableRoute(x, y) {
  const clampedX = clamp(x, world.edgePadding + player.radius, world.width - world.edgePadding - player.radius);
  const clampedY = clamp(y, world.edgePadding + player.radius, world.height - world.edgePadding - player.radius);
  if (isOnPlayableRoute(clampedX, clampedY)) return { x: clampedX, y: clampedY };
  const nearest = getNearestRoutePoint(clampedX, clampedY);
  return {
    x: clamp(nearest.x, world.edgePadding + player.radius, world.width - world.edgePadding - player.radius),
    y: clamp(nearest.y, world.edgePadding + player.radius, world.height - world.edgePadding - player.radius),
  };
}

function constrainMovementPosition(x, y) {
  const clamped = {
    x: clamp(x, world.edgePadding + player.radius, world.width - world.edgePadding - player.radius),
    y: clamp(y, world.edgePadding + player.radius, world.height - world.edgePadding - player.radius),
  };
  return debugCollisionZones.length ? clamped : constrainToPlayableRoute(clamped.x, clamped.y);
}

function pointInDebugCollisionZone(point, zone) {
  if (!zone || typeof zone !== "object") return false;
  if (zone.type === "circle") {
    const dx = point.x - zone.x;
    const dy = point.y - zone.y;
    return dx * dx + dy * dy <= zone.radius * zone.radius;
  }
  if (zone.type === "ellipse") {
    const rx = Math.max(1, zone.width / 2);
    const ry = Math.max(1, zone.height / 2);
    const cx = zone.x + rx;
    const cy = zone.y + ry;
    const dx = (point.x - cx) / rx;
    const dy = (point.y - cy) / ry;
    return dx * dx + dy * dy <= 1;
  }
  if (zone.type === "poly") {
    if (!Array.isArray(zone.points) || zone.points.length < 3) return false;
    let inside = false;
    for (let index = 0, previous = zone.points.length - 1; index < zone.points.length; previous = index, index += 1) {
      const currentPoint = zone.points[index];
      const previousPoint = zone.points[previous];
      const intersects = ((currentPoint.y > point.y) !== (previousPoint.y > point.y))
        && point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) / (previousPoint.y - currentPoint.y || 1) + currentPoint.x;
      if (intersects) inside = !inside;
    }
    return inside;
  }
  return point.x >= zone.x
    && point.x <= zone.x + zone.width
    && point.y >= zone.y
    && point.y <= zone.y + zone.height;
}

function isBlockedByDebugCollision(x, y) {
  return debugCollisionZones.some((zone) => pointInDebugCollisionZone({ x, y }, zone));
}

function damp(current, target, smoothing, dt) {
  return current + (target - current) * (1 - Math.exp(-smoothing * dt));
}

function rankValue(rank) {
  if (rank === "A") return 1;
  if (rank === "J") return 11;
  if (rank === "Q") return 12;
  if (rank === "K") return 13;
  return Number(rank) || 0;
}

function shuffle(array) {
  const list = array.slice();
  for (let index = list.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [list[index], list[randomIndex]] = [list[randomIndex], list[index]];
  }
  return list;
}

function encodeBase64Json(value) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(value))));
  } catch (error) {
    return "";
  }
}

function decodeBase64Json(raw) {
  if (!raw) return [];
  try {
    return JSON.parse(decodeURIComponent(escape(atob(raw))));
  } catch (error) {
    return [];
  }
}

function createBaseDeck() {
  const cards = [];
  let index = 0;
  for (const suit of Object.keys(SUIT_SYMBOLS)) {
    for (const rank of RANKS) {
      cards.push({
        id: `base-${rank}-${suit}-${index}`,
        source: "base",
        rank,
        suit,
        token: `${rank}:${suit}`,
      });
      index += 1;
    }
  }
  return cards;
}

function decodeExtraDeckCards() {
  return decodeBase64Json(storyExtraDeckParam)
    .filter((card) => card && RANKS.includes(card.rank) && Object.prototype.hasOwnProperty.call(SUIT_SYMBOLS, card.suit))
    .map((card, index) => ({
      id: String(card.id || `extra-${index}`),
      source: "extra",
      rank: card.rank,
      suit: card.suit,
      token: `${card.rank}:${card.suit}`,
      name: String(card.name || card.text || `Carta extra ${index + 1}`),
    }));
}

function decodeRemovedDeckTokens() {
  return new Set(
    decodeBase64Json(storyRemovedDeckParam)
      .filter((card) => card && RANKS.includes(card.rank) && Object.prototype.hasOwnProperty.call(SUIT_SYMBOLS, card.suit))
      .map((card) => `${card.rank}:${card.suit}`)
  );
}

function buildInitialDeck() {
  const removedTokens = decodeRemovedDeckTokens();
  const baseCards = createBaseDeck().filter((card) => !removedTokens.has(card.token));
  const extraCards = decodeExtraDeckCards();
  return shuffle(baseCards.concat(extraCards));
}

function cardLabel(card) {
  return `${card.rank}${SUIT_SYMBOLS[card.suit] || "?"}`;
}

function cardNote(card) {
  if (card.source === "extra") return card.name || "Carta de mercado";
  if (card.suit === "diamonds") return "Fuel / mitigacion";
  if (card.suit === "clubs") return "Armadura";
  if (card.suit === "spades") return "Ataque";
  return "Defensa";
}

function buildRedGlowRewardCard() {
  return {
    id: `red-glow-8c-${storyLoadId}`,
    source: "extra",
    rank: "8",
    suit: "clubs",
    token: "8:clubs",
    name: "Resplandor rojo del foso",
    note: "Carta táctica oculta",
  };
}

function buildDebugInteractionDefaults() {
  return interactables.map((item) => ({
    id: item.id,
    label: item.label,
    x: item.x,
    y: item.y,
    radius: item.radius,
    scale: item.scale || 1,
  })).concat(threats.map((threat, index) => ({
    id: threat.id,
    label: `Impacto ${index + 1} · ${threat.title}`,
    x: threat.impactX || laneTargets[threat.lane]?.x || threat.triggerX,
    y: threat.impactY || laneTargets[threat.lane]?.y || threat.triggerY,
    radius: threat.triggerRadius || 84,
    scale: 0.7,
  })));
}

function applyDebugPhysicsOverrides() {
  const editor = window.PoCoBOTStoryCollisionEditor;
  if (!editor) return;
  const zones = editor.getSceneZones ? editor.getSceneZones(FOSO_SCENE_ID, baseDebugCollisionZones) : baseDebugCollisionZones;
  debugCollisionZones.splice(0, debugCollisionZones.length, ...(Array.isArray(zones) ? zones : []));

  const points = editor.getSceneInteractionPoints
    ? editor.getSceneInteractionPoints(FOSO_SCENE_ID, buildDebugInteractionDefaults())
    : buildDebugInteractionDefaults();
  const byId = new Map(points.map((point) => [point.id, point]));

  interactables.forEach((item) => {
    const point = byId.get(item.id);
    if (!point) return;
    item.x = point.x;
    item.y = point.y;
    item.radius = point.radius;
    item.scale = point.scale || item.scale || 1;
    if (point.label) item.label = item.id === "sign"
      ? "Leer cartel de la Ruta Ceniza"
      : point.label;
    if (item.id === "red-glow") {
      WORLD_SCALE.redGlow.x = point.x;
      WORLD_SCALE.redGlow.y = point.y;
      WORLD_SCALE.redGlow.radius = point.radius;
    }
  });

  threats.forEach((threat) => {
    const point = byId.get(threat.id);
    if (!point) return;
    threat.triggerX = point.x;
    threat.triggerY = point.y;
    threat.impactX = point.x;
    threat.impactY = point.y;
    threat.triggerRadius = point.radius;
    if (laneTargets[threat.lane]) {
      laneTargets[threat.lane].x = point.x;
      laneTargets[threat.lane].y = point.y;
    }
  });
}

function makeLossEntry(card, reason) {
  return {
    id: card.id,
    source: card.source,
    rank: card.rank,
    suit: card.suit,
    token: card.token,
    label: cardLabel(card),
    reason,
  };
}

function showToast(message, duration = 1500) {
  toastMessage = message;
  toastUntil = performance.now() + duration;
}

function readSavedProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FOSO_PROGRESS_KEY) || "{}");
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.storyLoadId !== storyLoadId) return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

function saveProgress() {
  const payload = {
    storyLoadId,
    signRead: state.signRead,
    drawPile: state.drawPile,
    hand: state.hand,
    blockedBaseTokens: [...state.blockedBaseTokens],
    blockedExtraIds: [...state.blockedExtraIds],
    lossEntries: state.lossEntries,
    resolvedThreatIds: [...state.resolvedThreatIds],
    activeThreatId: state.activeThreatId,
    redGlowCollected: state.redGlowCollected,
    modalMode: state.modalMode,
    modalCardAction: state.modalCardAction,
    player: { x: player.x, y: player.y },
    attemptComplete: state.attemptComplete,
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(FOSO_PROGRESS_KEY, JSON.stringify(payload));
  } catch (error) {}
}

function clearProgress() {
  try {
    localStorage.removeItem(FOSO_PROGRESS_KEY);
  } catch (error) {}
}

function restoreProgress() {
  const saved = readSavedProgress();
  if (!saved) return false;
  state.signRead = !!saved.signRead;
  state.drawPile = Array.isArray(saved.drawPile) ? saved.drawPile : [];
  state.hand = Array.isArray(saved.hand) ? saved.hand : [];
  state.blockedBaseTokens = new Set(saved.blockedBaseTokens || []);
  state.blockedExtraIds = new Set(saved.blockedExtraIds || []);
  state.lossEntries = Array.isArray(saved.lossEntries) ? saved.lossEntries : [];
  state.resolvedThreatIds = new Set(saved.resolvedThreatIds || []);
  state.activeThreatId = typeof saved.activeThreatId === "string" ? saved.activeThreatId : "";
  state.redGlowCollected = !!saved.redGlowCollected;
  state.modalMode = typeof saved.modalMode === "string" ? saved.modalMode : "";
  state.modalCardAction = typeof saved.modalCardAction === "string" ? saved.modalCardAction : "";
  state.attemptComplete = !!saved.attemptComplete;
  if (saved.player) {
    const restored = constrainMovementPosition(
      Number(saved.player.x) || world.startX,
      Number(saved.player.y) || world.startY
    );
    player.x = restored.x;
    player.y = restored.y;
  }
  return true;
}

function seedNewAttempt() {
  state.signRead = false;
  state.drawPile = buildInitialDeck();
  state.hand = [];
  state.blockedBaseTokens = new Set();
  state.blockedExtraIds = new Set();
  state.lossEntries = [];
  state.resolvedThreatIds = new Set();
  state.activeThreatId = "";
  state.redGlowCollected = false;
  state.modalMode = "";
  state.modalCardAction = "";
  state.scriptedMissiles = [];
  state.ambientMissiles = [];
  state.explosions = [];
  state.nearestInteractableId = "";
  state.attemptComplete = false;
  player.x = world.startX;
  player.y = world.startY;
  drawCards(7);
  clearProgress();
}

function drawCards(amount = 1) {
  for (let count = 0; count < amount; count += 1) {
    const next = state.drawPile.shift();
    if (!next) return;
    state.hand.push(next);
  }
}

function removeCardFromHand(cardId) {
  const index = state.hand.findIndex((card) => card.id === cardId);
  if (index < 0) return null;
  return state.hand.splice(index, 1)[0];
}

function markCardBlocked(card, reason) {
  if (!card) return;
  if (card.source === "base") state.blockedBaseTokens.add(card.token);
  else state.blockedExtraIds.add(card.id);
  state.lossEntries.push(makeLossEntry(card, reason));
}

function getAvailableArmorCards() {
  const handArmor = state.hand.filter((card) => card.suit === "clubs").sort((left, right) => rankValue(right.rank) - rankValue(left.rank));
  const reserveArmor = state.drawPile.filter((card) => card.suit === "clubs").sort((left, right) => rankValue(right.rank) - rankValue(left.rank));
  return handArmor.concat(reserveArmor);
}

function previewArmorLoss(amount) {
  return getAvailableArmorCards().slice(0, amount);
}

function consumeArmorLoss(amount) {
  const losses = previewArmorLoss(amount);
  losses.forEach((card) => {
    const handCard = removeCardFromHand(card.id);
    if (handCard) {
      markCardBlocked(handCard, "armor");
      return;
    }
    const deckIndex = state.drawPile.findIndex((entry) => entry.id === card.id);
    if (deckIndex >= 0) {
      const [removed] = state.drawPile.splice(deckIndex, 1);
      markCardBlocked(removed, "armor");
    }
  });
  return losses;
}

function canMitigateWithDiamonds() {
  return state.hand.some((card) => card.suit === "diamonds");
}

function describeLossReason(reason) {
  if (reason === "mitigate") return "Diamante usado en asedio";
  if (reason === "burn") return "Fuel quemado para robar";
  if (reason === "armor") return "Armadura perdida por impacto";
  return "Bloqueada temporalmente";
}

function buildLossBreakdown() {
  return {
    mitigate: state.lossEntries.filter((entry) => entry.reason === "mitigate"),
    burn: state.lossEntries.filter((entry) => entry.reason === "burn"),
    armor: state.lossEntries.filter((entry) => entry.reason === "armor"),
  };
}

function setObjective(title, copy) {
  objectiveTitle.textContent = title;
  objectiveCopy.textContent = copy;
}

function postFosoAction(action, payload = {}) {
  const message = {
    type: "pocobot-story-foso-action",
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
}

function buildStandaloneFosoCombatUrl(blockedBaseCards = [], blockedExtraCardIds = []) {
  const url = new URL("../../../poker_combat_bot_ONLINE.html", window.location.href);
  url.searchParams.set("story_mission", "foso_blackwind_battery");
  url.searchParams.set("story_embed", "1");
  url.searchParams.set("story_standalone", "1");
  url.searchParams.set("story_node", "foso");
  url.searchParams.set("story_audio", "internal");
  url.searchParams.set("story_brief", "on");
  url.searchParams.set("story_return", storyReturnUrl || new URL("../../../MODO_HISTORIA_DEVTOOLS.html", window.location.href).href);
  url.searchParams.set("story_ui", storyParams.get("story_ui") || "auto");
  const removedDeckCards = encodeBase64Json(blockedBaseCards);
  if (removedDeckCards) url.searchParams.set("story_removed_cards", removedDeckCards);
  if (storyExtraDeckParam) url.searchParams.set("story_deck_cards", storyExtraDeckParam);
  if (blockedExtraCardIds.length) url.searchParams.set("story_blocked_extra_card_ids", encodeBase64Json(blockedExtraCardIds));
  url.searchParams.set("v", "20260602-foso-battery-combat");
  return url.href;
}

function closeModal() {
  modalLayer.hidden = true;
}

function openModal(config = {}) {
  modalKicker.textContent = config.kicker || "";
  modalTitle.textContent = config.title || "";
  modalCopy.textContent = config.copy || "";
  modalMeta.innerHTML = "";
  modalLossPreview.innerHTML = "";
  modalCardGrid.innerHTML = "";
  modalActions.innerHTML = "";

  (config.meta || []).forEach((item) => {
    const pill = document.createElement("span");
    pill.className = `meta-pill${item.kind ? ` is-${item.kind}` : ""}`;
    pill.textContent = item.text;
    modalMeta.appendChild(pill);
  });

  (config.preview || []).forEach((item) => {
    const pill = document.createElement("span");
    pill.className = `meta-pill${item.kind ? ` is-${item.kind}` : ""}`;
    pill.textContent = item.text;
    modalLossPreview.appendChild(pill);
  });

  (config.cards || []).forEach((card) => {
    modalCardGrid.appendChild(createCardButton(card, {
      static: !!config.staticCards,
      highlight: config.highlightIds?.includes(card.id),
      onClick: config.onCardClick || null,
    }));
  });

  (config.actions || []).forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `modal-btn${action.variant ? ` ${action.variant}` : ""}`;
    button.textContent = action.label;
    button.addEventListener("click", action.onClick);
    modalActions.appendChild(button);
  });

  modalLayer.hidden = false;
}

function getThreatById(id) {
  return threats.find((threat) => threat.id === id) || null;
}

function getThreatByIdWithDefaults(id) {
  const threat = getThreatById(id);
  if (!threat) return null;
  return {
    ...threat,
    missileCount: threat.missileCount || 2,
    spread: threat.spread || 18,
  };
}

function getPendingThreat() {
  return threats.find((threat) => !state.resolvedThreatIds.has(threat.id)) || null;
}

function getResolvedThreatCount() {
  return state.resolvedThreatIds.size;
}

function isPlayerInCover() {
  return coverRects.some((rect) => (
    player.x + player.radius > rect.x
    && player.x - player.radius < rect.x + rect.width
    && player.y + player.radius > rect.y
    && player.y - player.radius < rect.y + rect.height
  ));
}

function getEffectiveThreatDamage(threat) {
  const coverReduction = isPlayerInCover() ? 1 : 0;
  return Math.max(0, threat.damage - coverReduction);
}

function buildThreatMeta(threat) {
  const damage = getEffectiveThreatDamage(threat);
  return [
    { text: `Impacto base: ${threat.damage}`, kind: "danger" },
    { text: `Carril: ${LANE_NAMES[threat.lane]}`, kind: "" },
    { text: `Tiempo: ${threat.eta}`, kind: "" },
    { text: isPlayerInCover() ? "Cobertura activa: -1 al daño" : "Fuera de cobertura", kind: isPlayerInCover() ? "ok" : "danger" },
    { text: `Pérdida real si aguantas: ${damage}`, kind: damage > 0 ? "danger" : "ok" },
    { text: `Ataques de la salva: ${threat.missileCount || 2}`, kind: "" },
  ];
}

function openSignModal() {
  state.modalMode = "sign";
  state.modalCardAction = "";
  openModal({
    kicker: "Inicio del asedio",
    title: "Cartel de la Ruta Ceniza",
    copy: "Cruza el Foso para seguir adelante. Cada diamante que gastes durante los impactos no estará disponible en el combate final contra la batería. Si absorbes golpes, perderás cartas de armadura para ese combate también.",
    meta: [
      { text: "Objetivo: llegar hasta la batería residual", kind: "" },
      { text: "No hay escenas de diálogo en este capítulo", kind: "ok" },
      { text: "Puedes ampliar tu mano a 1 carta extra quemando combustible", kind: "" },
      { text: "La mano inicial es de 7 cartas", kind: "" },
    ],
    actions: [
      {
        label: state.signRead ? "Seguir cruzando" : "Empezar el cruce",
        variant: "primary",
        onClick: () => {
          state.signRead = true;
          setObjective("Cruza el Foso y administra el desgaste.", "Lee cada impacto, busca cobertura y guarda las mejores cartas posibles para la bateria.");
          closeModal();
          saveProgress();
        },
      },
    ],
  });
}

function collectRedGlowReward() {
  if (state.redGlowCollected) return;
  state.redGlowCollected = true;
  state.hand.push(buildRedGlowRewardCard());
  showToast("Obtuviste 8 de tréboles del resplandor rojo.", 1800);
  setObjective("Resplandor descubierto", "La cubierta oculta te da una carta táctica extra para el asedio.");
  saveProgress();
}

function buildMissileSpawnPoint(originHint) {
  if (originHint === "left") {
    return {
      x: WORLD_SCALE.battlegroundMuzzles[0].x + (Math.random() * 18 - 9),
      y: WORLD_SCALE.battlegroundMuzzles[0].y + (Math.random() * 14 - 7),
    };
  }
  if (originHint === "right") {
    return {
      x: WORLD_SCALE.battlegroundMuzzles[2].x + (Math.random() * 18 - 9),
      y: WORLD_SCALE.battlegroundMuzzles[2].y + (Math.random() * 14 - 7),
    };
  }
  const muzzle = WORLD_SCALE.battlegroundMuzzles[Math.floor(Math.random() * WORLD_SCALE.battlegroundMuzzles.length)];
  return {
    x: muzzle.x + (Math.random() * 18 - 9),
    y: muzzle.y + (Math.random() * 14 - 7),
  };
}

function spawnMissile(targetX, targetY, scripted = false, options = {}) {
  const sideHint = options.side || (Math.random() > 0.5 ? "left" : "right");
  const start = options.start || buildMissileSpawnPoint(sideHint);
  const side = sideHint === "left" ? -1 : 1;
  const baseAngle = Math.atan2(targetY - start.y, targetX - (start.x + side * 90));
  const baseJitter = options.baseJitter || (Math.random() * 0.12 + 0.08);
  const missile = {
    x: options.origin ? options.origin.x : start.x + side * (160 + Math.random() * 110),
    y: options.origin ? options.origin.y : start.y - 12,
    targetX,
    targetY,
    speed: scripted ? (560 + Math.random() * 70) : (430 + Math.random() * 70),
    baseAngle,
    drift: side,
    jitter: scripted ? 0.16 + Math.random() * 0.12 : 0.32 + Math.random() * 0.2,
    jitterFrequency: 7 + Math.random() * 4,
    jitterSeed: Math.random() * 1000,
    baseJitter,
    instability: scripted ? (1.15 + Math.random() * 0.1) : (0.72 + Math.random() * 0.18),
    rotation: baseAngle,
    life: 0,
    maxLife: scripted ? 4.2 : 3.6,
    trail: [],
    scripted,
  };
  missile.trail.push({ x: missile.x, y: missile.y, alpha: 0.24 });
  if (scripted) state.scriptedMissiles.push(missile);
  else state.ambientMissiles.push(missile);
}

function spawnThreatVolley(threat) {
  const withDefaults = getThreatByIdWithDefaults(threat.id);
  if (!withDefaults) return;
  const count = withDefaults.missileCount || 2;
  const spread = withDefaults.spread || 18;
  const targetXBase = threat.impactX || laneTargets[threat.lane]?.x || player.x;
  const targetYBase = threat.impactY || laneTargets[threat.lane]?.y || player.y;
  const total = Math.max(1, count);
  for (let index = 0; index < total; index += 1) {
    const laneOffset = (index - (total - 1) / 2) * spread;
    const targetX = targetXBase + laneOffset + (Math.random() * (spread * 0.38) - spread * 0.19);
    const targetY = targetYBase + (index % 2 === 0 ? -10 : 10) + (Math.random() * 10 - 5);
    spawnMissile(targetX, targetY, true, {
      side: index % 2 === 0 ? "left" : "right",
      baseJitter: 0.18 + Math.random() * 0.07,
      instability: 1.05 + Math.random() * 0.22,
    });
  }
  state.activeThreatFlash = 0.48;
}

function pushExplosion(x, y, radius = 86) {
  state.explosions.push({ x, y, radius, life: 0.75 });
  const distanceToPlayer = Math.hypot(player.x - x, player.y - y);
  playExplosionSound(clamp(radius / 90, 0.6, 1.45), clamp(distanceToPlayer / 520, 0, 1));
}

function resolveThreatWithDiamond(card) {
  const threat = getThreatById(state.activeThreatId);
  if (!threat || !card || card.suit !== "diamonds") return;
  const removed = removeCardFromHand(card.id);
  if (!removed) return;
  markCardBlocked(removed, "mitigate");
  state.resolvedThreatIds.add(threat.id);
  state.activeThreatId = "";
  state.modalCardAction = "";
  showToast(`${cardLabel(removed)} bloqueada para el combate final`, 1500);
  setObjective("Cruza el Foso y administra el desgaste.", "La bateria ya ha registrado tu firma. Cuanto menos gastes, mejor llegas al combate.");
  closeModal();
  saveProgress();
}

function burnDiamondForDraw(card) {
  if (!card || card.suit !== "diamonds") return;
  const removed = removeCardFromHand(card.id);
  if (!removed) return;
  markCardBlocked(removed, "burn");
  drawCards(1);
  state.modalCardAction = "";
  showToast(`Quemaste ${cardLabel(removed)} y robaste 1 carta`, 1400);
  openThreatModal(getThreatById(state.activeThreatId));
  saveProgress();
}

function resolveThreatByTakingImpact() {
  const threat = getThreatById(state.activeThreatId);
  if (!threat) return;
  const effectiveDamage = getEffectiveThreatDamage(threat);
  const losses = consumeArmorLoss(effectiveDamage);
  state.resolvedThreatIds.add(threat.id);
  state.activeThreatId = "";
  state.modalCardAction = "";
  closeModal();
  showToast(
    effectiveDamage > 0
      ? `Perdiste ${losses.length} carta${losses.length === 1 ? "" : "s"} de armadura para el jefe`
      : "La cobertura absorbio la salva",
    1700
  );
  saveProgress();
}

function openThreatModal(threat) {
  if (!threat) return;
  state.modalMode = "threat";
  const previewLosses = previewArmorLoss(getEffectiveThreatDamage(threat));
  const preview = previewLosses.length
    ? previewLosses.map((card) => ({ text: `Se perderia ${cardLabel(card)}`, kind: "danger" }))
    : [{ text: "No perderias armadura si aguantas desde esta posicion", kind: "ok" }];
  openModal({
    kicker: "Impacto de artilleria",
    title: threat.title,
    copy: threat.copy,
    meta: buildThreatMeta(threat),
    preview,
    cards: state.hand,
    onCardClick: (card) => {
      if (state.modalCardAction === "mitigate") resolveThreatWithDiamond(card);
      if (state.modalCardAction === "burn") burnDiamondForDraw(card);
    },
    highlightIds: state.modalCardAction ? state.hand.filter((card) => card.suit === "diamonds").map((card) => card.id) : [],
    actions: [
      {
        label: state.modalCardAction === "mitigate" ? "Selecciona un diamante de tu mano" : "Usar diamante",
        variant: "primary",
        onClick: () => {
          if (!canMitigateWithDiamonds()) {
            showToast("No tienes diamantes en mano ahora mismo", 1200);
            return;
          }
          state.modalCardAction = "mitigate";
          openThreatModal(threat);
        },
      },
      {
        label: state.modalCardAction === "burn" ? "Selecciona un diamante para quemarlo" : "Quemar combustible y robar",
        variant: "secondary",
        onClick: () => {
          if (!canMitigateWithDiamonds()) {
            showToast("No puedes quemar combustible sin diamantes en mano", 1200);
            return;
          }
          state.modalCardAction = "burn";
          openThreatModal(threat);
        },
      },
      {
        label: "Asumir impacto",
        variant: "danger",
        onClick: resolveThreatByTakingImpact,
      },
    ],
  });
}

function openBatteryLockedModal() {
  openModal({
    kicker: "Objetivo bloqueado",
    title: "La bateria todavia no esta al alcance",
    copy: "Antes de poder forzar el combate final tienes que sobrevivir a todas las salvas del pasillo. Busca coberturas y deja que la bateria gaste sus correcciones de tiro.",
    meta: [
      { text: `Impactos superados: ${getResolvedThreatCount()}/${threats.length}`, kind: "" },
      { text: "La ultima tabla de perdidas aparecera justo antes del jefe", kind: "" },
    ],
    actions: [
      {
        label: "Volver al asedio",
        variant: "primary",
        onClick: closeModal,
      },
    ],
  });
}

function launchFinalCombat() {
  const blockedBaseCards = [...state.blockedBaseTokens].map((token) => {
    const [rank, suit] = token.split(":");
    return { rank, suit };
  });
  const blockedExtraCardIds = [...state.blockedExtraIds];
  postFosoAction("launch-battery-combat", {
    blockedBaseCards,
    blockedExtraCardIds,
    lossEntries: state.lossEntries,
  });
  if (window.parent === window && !window.opener) {
    window.location.href = buildStandaloneFosoCombatUrl(blockedBaseCards, blockedExtraCardIds);
  }
}

function openSummaryModal() {
  state.modalMode = "summary";
  const breakdown = buildLossBreakdown();
  const cards = state.lossEntries.slice();
  const preview = cards.map((entry) => ({
    text: `${entry.label} · ${describeLossReason(entry.reason)}`,
    kind: entry.reason === "armor" ? "danger" : "",
  }));
  openModal({
    kicker: "Asedio completado",
    title: "Cartas bloqueadas para el combate final",
    copy: "Estas cartas quedan fuera solo para la batalla contra la bateria. Si superas el capitulo, volveran a tu mazo de historia intactas.",
    meta: [
      { text: `Diamantes usados: ${breakdown.mitigate.length}`, kind: "" },
      { text: `Fuel quemado: ${breakdown.burn.length}`, kind: "" },
      { text: `Armadura destruida: ${breakdown.armor.length}`, kind: "danger" },
      { text: `Mazo restante para el jefe: ${state.drawPile.length + state.hand.length}`, kind: "ok" },
    ],
    preview,
    cards: cards,
    staticCards: true,
    actions: [
      {
        label: "Iniciar combate contra la bateria",
        variant: "primary",
        onClick: launchFinalCombat,
      },
      {
        label: "Revisar mano restante",
        variant: "secondary",
        onClick: closeModal,
      },
    ],
  });
}

function createCardButton(card, options = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = [
    "story-card-btn",
    `suit-${SUIT_COLORS[card.suit] || "black"}`,
    card.suit === "diamonds" ? "is-base-diamond" : "",
    card.suit === "clubs" ? "is-base-club" : "",
    options.static ? "is-static" : "",
    options.highlight ? "is-highlight" : "",
  ].filter(Boolean).join(" ");
  if (options.static) button.disabled = true;

  const rank = document.createElement("span");
  rank.className = "story-card-rank";
  rank.textContent = card.label || cardLabel(card);

  const suit = document.createElement("span");
  suit.className = "story-card-suit";
  suit.textContent = card.reason ? describeLossReason(card.reason) : `${SUIT_LABELS[card.suit]} · ${card.source === "extra" ? "Extra" : "Base"}`;

  const note = document.createElement("span");
  note.className = "story-card-note";
  note.textContent = card.note || cardNote(card);

  button.append(rank, suit, note);
  if (typeof options.onClick === "function" && !options.static) {
    button.addEventListener("click", () => options.onClick(card));
  }
  return button;
}

function renderHand() {
  handCardsEl.innerHTML = "";
  state.hand.forEach((card) => {
    handCardsEl.appendChild(createCardButton(card));
  });
}

function renderStatus() {
  statusThreats.textContent = `${getResolvedThreatCount()}/${threats.length}`;
  statusCover.textContent = isPlayerInCover() ? "Si" : "No";
  statusLosses.textContent = String(state.lossEntries.length);
  statusDeck.textContent = String(state.drawPile.length);
  renderHand();
}

function getFosoCameraZoom(width, height) {
  const portrait = height > width;
  if (portrait && width <= 720) return 0.72;
  if (width <= 1180 || height <= 680) return 0.92;
  return 1.02;
}

function resizeCanvas() {
  const visualViewport = window.visualViewport;
  const width = Math.max(320, Math.round(visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || canvas.width));
  const height = Math.max(240, Math.round(visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || canvas.height));
  viewport.width = width;
  viewport.height = height;
  viewport.dpr = Math.max(1, window.devicePixelRatio || 1);
  camera.zoom = getFosoCameraZoom(width, height);
  canvas.width = Math.round(width * viewport.dpr);
  canvas.height = Math.round(height * viewport.dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawSoftShadow(x, y, radiusX, radiusY, opacity = 0.24) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(radiusX, radiusY);
  const gradient = ctx.createRadialGradient(0, 0, 0.12, 0, 0, 1);
  gradient.addColorStop(0, `rgba(0,0,0,${opacity})`);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function getPerspectiveScale() {
  return 0.74 + ((player.y - 160) / (world.height - 160)) * 0.18;
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
    getVisualScale: getPerspectiveScale,
    baseSize: player.spriteWidth,
    sideFrameVerticalOffsets: playerVisualFrameSources.sideFrameVerticalOffsets,
  });
}

async function loadAssets() {
  const sourceMap = {
    background: "./assets/foso-background.webp",
    sign: "./assets/route-sign-ruta-ceniza.png",
    cover: "./assets/cover-barricade.png",
    missile: "./assets/missile-artillery.png",
    batteryWorld: "./assets/battery-emplacement-world.png",
    batteryCombat: "./assets/battery-emplacement-combat.png",
  };

  const visualPromises = playerVisualFrameSources
    ? [
        loadImage(playerVisualFrameSources.back),
        ...playerVisualFrameSources.side.map((source) => loadImage(source)),
        ...playerVisualFrameSources.hover.map((source) => loadImage(source)),
      ]
    : [];

  const [background, sign, cover, missile, batteryWorld, batteryCombat, ...visualFrames] = await Promise.all([
    loadImage(sourceMap.background),
    loadImage(sourceMap.sign),
    loadImage(sourceMap.cover),
    loadImage(sourceMap.missile),
    loadImage(sourceMap.batteryWorld),
    loadImage(sourceMap.batteryCombat),
    ...visualPromises,
  ]);

  assets.background = background;
  assets.sign = sign;
  assets.cover = cover;
  assets.missile = missile;
  assets.batteryWorld = batteryWorld;
  assets.batteryCombat = batteryCombat;

  if (playerVisualFrameSources && visualFrames.length) {
    assets.backFrame = visualFrames[0];
    const sideStart = 1;
    assets.sideFrames = visualFrames.slice(sideStart, sideStart + playerVisualFrameSources.side.length);
    assets.hoverFrames = visualFrames.slice(sideStart + playerVisualFrameSources.side.length);
    createPlayerVisual();
  }
}

function drawBackground() {
  ctx.drawImage(assets.background, 0, 0, world.width, world.height);
}

function drawCover(rect) {
  ctx.drawImage(assets.cover, rect.x - 12, rect.y - 8, rect.width + 24, rect.height + 22);
}

function drawInteractableSign() {
  if (state.signRead) return;
  const sign = interactables.find((entry) => entry.id === "sign") || { x: 152, y: 818, scale: 0.78 };
  const scale = sign.scale || 0.78;
  const width = 192 * scale;
  const height = 240 * scale;
  ctx.drawImage(assets.sign, sign.x - width * 0.5, sign.y - height + 28 * scale, width, height);
}

function drawBatteryWorld() {
  const threat = getThreatByIdWithDefaults(state.activeThreatId);
  const pulse = (Math.sin(performance.now() * 0.015) * 0.5 + 0.5) * (threat ? 1 : 0);
  const glow = 24 + pulse * 16;
  const glowBaseY = WORLD_SCALE.battleground.y + 46;

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(
    WORLD_SCALE.battleground.x + WORLD_SCALE.battleground.width * 0.5,
    glowBaseY,
    glow,
    14,
    0,
    0,
    Math.PI * 2
  );
  const glowGradient = ctx.createRadialGradient(
    WORLD_SCALE.battleground.x + WORLD_SCALE.battleground.width * 0.5,
    glowBaseY,
    4,
    WORLD_SCALE.battleground.x + WORLD_SCALE.battleground.width * 0.5,
    glowBaseY,
    glow + 12
  );
  glowGradient.addColorStop(0, "rgba(255, 102, 68, 0.42)");
  glowGradient.addColorStop(1, "rgba(255, 102, 68, 0)");
  ctx.fillStyle = glowGradient;
  ctx.fill();
  ctx.restore();

  WORLD_SCALE.battlegroundMuzzles.forEach((muzzle, index) => {
    const localPulse = Math.sin(performance.now() * 0.012 + index) * 0.5 + 0.5;
    const radius = 12 + localPulse * 8 + pulse * 10;
    const gradient = ctx.createRadialGradient(muzzle.x, muzzle.y, 2, muzzle.x, muzzle.y, radius);
    gradient.addColorStop(0, "rgba(255, 226, 176, 0.72)");
    gradient.addColorStop(0.36, "rgba(255, 90, 55, 0.42)");
    gradient.addColorStop(1, "rgba(255, 90, 55, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(muzzle.x, muzzle.y, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  if (!threat) return;
}

function drawRedGlowMarker() {
  const worldPoint = WORLD_SCALE.redGlow;
  const distToPlayer = Math.hypot(player.x - worldPoint.x, player.y - worldPoint.y);
  const discover = clamp(1 - distToPlayer / 360, 0.1, 1);
  const basePulse = Math.sin(performance.now() * 0.014) * 0.5 + 0.5;
  const baseRadius = Math.max(8, worldPoint.radius * 0.92);
  const beaconRadius = Math.max(12, baseRadius + 12 + basePulse * 12);
  const pulseGlow = clamp(redGlowPulse * 0.9, 0, 1);
  const hiddenRatio = state.redGlowCollected ? 0.12 : 0.32 + discover * 0.28;

  ctx.save();
  ctx.beginPath();
  const pulseGradient = ctx.createRadialGradient(
    worldPoint.x,
    worldPoint.y,
    baseRadius,
    worldPoint.x,
    worldPoint.y,
    beaconRadius + 54 * (pulseGlow * 0.6)
  );
  pulseGradient.addColorStop(0, `rgba(255, 80, 50, ${0.42 * hiddenRatio})`);
  pulseGradient.addColorStop(1, "rgba(255, 80, 50, 0)");
  ctx.fillStyle = pulseGradient;
  ctx.arc(worldPoint.x, worldPoint.y, beaconRadius + 54 * (pulseGlow * 0.6), 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = `rgba(255, 120, 95, ${Math.min(0.68, 0.18 + discover * 0.38 + basePulse * 0.1 + pulseGlow * hiddenRatio * 0.1)})`;
  ctx.arc(worldPoint.x, worldPoint.y, baseRadius + Math.sin(basePulse * Math.PI) * (1 + pulseGlow), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPrompt() {
  const item = interactables.find((entry) => entry.id === state.nearestInteractableId);
  if (!item) {
    interactPrompt.hidden = true;
    return;
  }
  interactPrompt.hidden = false;
  interactPrompt.textContent = `${item.label} · E / toque`;
}

function drawPlayer() {
  if (playerVisual) {
    playerVisual.draw();
    return;
  }
  drawSoftShadow(player.x, player.y + 42, 44, 14, 0.28);
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = "#1b2531";
  ctx.strokeStyle = "#8ee1ff";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(-46, -54, 92, 108, 22);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffb46b";
  ctx.fillRect(-24, -12, 48, 18);
  ctx.restore();
}

function drawMissile(missile) {
  missile.trail.forEach((point, index) => {
    const alpha = point.alpha * (index + 1) / missile.trail.length;
    ctx.save();
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = "rgba(255, 130, 70, 0.28)";
    ctx.beginPath();
    ctx.arc(point.x, point.y, Math.max(2, 7 - index * 0.45), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  ctx.save();
  ctx.translate(missile.x, missile.y);
  ctx.rotate(missile.rotation);
  ctx.drawImage(assets.missile, -22, -22, 44, 44);
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = "rgba(255, 170, 114, 0.46)";
  ctx.beginPath();
  const tailLength = missile.scripted ? -72 : -54;
  const tailWiggle = missile.scripted ? 2 : 1.25;
  ctx.moveTo(-12, 0);
  ctx.lineTo(tailLength, -8 + tailWiggle);
  ctx.lineTo(tailLength, 8 - tailWiggle);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = "rgba(255, 220, 176, 0.33)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawExplosions(dt) {
  for (let index = state.explosions.length - 1; index >= 0; index -= 1) {
    const explosion = state.explosions[index];
    explosion.life -= dt;
    if (explosion.life <= 0) {
      state.explosions.splice(index, 1);
      continue;
    }
    const progress = 1 - explosion.life / 0.75;
    ctx.save();
    ctx.globalAlpha = 0.72 - progress * 0.58;
    const gradient = ctx.createRadialGradient(explosion.x, explosion.y, 0, explosion.x, explosion.y, explosion.radius);
    gradient.addColorStop(0, "rgba(255, 238, 184, 0.95)");
    gradient.addColorStop(0.36, "rgba(255, 132, 83, 0.62)");
    gradient.addColorStop(1, "rgba(255, 132, 83, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, explosion.radius * (0.45 + progress), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawToast() {
  if (!toastMessage || toastUntil <= performance.now()) return;
  ctx.save();
  const width = Math.min(viewport.width - 40, 460);
  const x = (viewport.width - width) / 2;
  const y = viewport.height * 0.17;
  ctx.fillStyle = "rgba(8, 10, 13, 0.78)";
  ctx.strokeStyle = "rgba(255, 180, 107, 0.26)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, width, 44, 22);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff2e0";
  ctx.font = "700 16px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(toastMessage, x + width / 2, y + 27);
  ctx.restore();
}

function updateCamera() {
  const viewWorldWidth = viewport.width / camera.zoom;
  const viewWorldHeight = viewport.height / camera.zoom;
  const targetX = clamp(player.x - viewWorldWidth * 0.5, 0, Math.max(0, world.width - viewWorldWidth));
  const targetY = clamp(player.y - viewWorldHeight * 0.58, 0, Math.max(0, world.height - viewWorldHeight));
  camera.x = damp(camera.x, targetX, 8, 1 / 60);
  camera.y = damp(camera.y, targetY, 8, 1 / 60);
}

function movePlayer(dt) {
  let moveX = 0;
  let moveY = 0;
  if (input.left) moveX -= 1;
  if (input.right) moveX += 1;
  if (input.up) moveY -= 1;
  if (input.down) moveY += 1;
  if (input.pointerActive) {
    moveX += input.pointerX;
    moveY += input.pointerY;
  }
  const length = Math.hypot(moveX, moveY) || 1;
  moveX /= length;
  moveY /= length;
  const hasInput = Math.abs(moveX) > 0.08 || Math.abs(moveY) > 0.08;
  const acceleration = hasInput ? player.acceleration : 0;
  player.vx = hasInput ? damp(player.vx, moveX * player.maxSpeed, 9, dt) : damp(player.vx, 0, player.drag, dt);
  player.vy = hasInput ? damp(player.vy, moveY * player.maxSpeed, 9, dt) : damp(player.vy, 0, player.drag, dt);
  let nextX = player.x + player.vx * dt;
  let nextY = player.y + player.vy * dt;
  const constrained = constrainMovementPosition(nextX, nextY);
  nextX = constrained.x;
  nextY = constrained.y;
  if (isBlockedByDebugCollision(nextX, nextY)) {
    nextX = player.x;
    nextY = player.y;
    player.vx = 0;
    player.vy = 0;
  }

  const finalPosition = constrainMovementPosition(nextX, nextY);
  nextX = finalPosition.x;
  nextY = finalPosition.y;
  if (isBlockedByDebugCollision(nextX, nextY)) {
    nextX = player.x;
    nextY = player.y;
    player.vx = 0;
    player.vy = 0;
  }

  player.x = nextX;
  player.y = nextY;
  if (Math.abs(player.vx) > Math.abs(player.vy)) player.facing = player.vx >= 0 ? "right" : "left";
  else if (Math.abs(player.vy) > 2) player.facing = player.vy >= 0 ? "down" : "up";
  if (playerVisual) {
    playerVisual.update(dt, hasInput, clamp(Math.hypot(player.vx, player.vy) / player.maxSpeed, 0, 1));
  }
}

function updateNearestInteractable() {
  let best = null;
  let bestDistance = Infinity;
  interactables.forEach((item) => {
    if (item.id === "sign" && state.signRead) return;
    const distance = Math.hypot(player.x - item.x, player.y - item.y);
    if (distance <= item.radius && distance < bestDistance) {
      best = item;
      bestDistance = distance;
    }
  });
  state.nearestInteractableId = best ? best.id : "";
}

function handleInteract() {
  const targetId = state.nearestInteractableId;
  if (!targetId) return;
  if (targetId === "sign") {
    openSignModal();
    return;
  }
  if (targetId === "battery") {
    if (getResolvedThreatCount() < threats.length) {
      openBatteryLockedModal();
      return;
    }
    openSummaryModal();
    return;
  }
  if (targetId === "red-glow") {
    if (state.redGlowCollected) {
      showToast("Ya tomaste el resplandor del foso.", 1200);
      return;
    }
    collectRedGlowReward();
  }
}

function maybeTriggerThreat() {
  if (!state.signRead || modalLayer.hidden === false || state.activeThreatId) return;
  const threat = threats.find((entry) => {
    if (state.resolvedThreatIds.has(entry.id)) return false;
    const triggerX = entry.triggerX || entry.impactX || laneTargets[entry.lane]?.x || player.x;
    const triggerY = entry.triggerY || entry.impactY || laneTargets[entry.lane]?.y || player.y;
    const triggerRadius = entry.triggerRadius || 84;
    return Math.hypot(player.x - triggerX, player.y - triggerY) <= triggerRadius;
  });
  if (!threat) return;
  state.activeThreatId = threat.id;
  state.modalCardAction = "";
  spawnThreatVolley(threat);
  openThreatModal(threat);
}

function updateMissiles(list, dt) {
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const missile = list[index];
    missile.life += dt;
    const travelX = missile.targetX - missile.x;
    const travelY = missile.targetY - missile.y;
    const distanceToTarget = Math.hypot(travelX, travelY);
    const wobble = Math.sin(missile.life * missile.jitterFrequency + missile.jitterSeed) * missile.jitter;
    const wobbleSecondary = Math.sin((missile.life * missile.jitterFrequency * 1.4) + missile.jitterSeed * 1.4) * (missile.jitter * 0.5);
    const jitter = (wobble + wobbleSecondary) * missile.baseJitter * missile.instability;
    const lateralFactor = missile.drift || 1;
    const driftX = -Math.sin(missile.baseAngle) * jitter * lateralFactor;
    const driftY = Math.cos(missile.baseAngle) * jitter * lateralFactor;
    const angle = Math.atan2(travelY + driftY * 12, travelX + driftX * 12);
    const speed = missile.speed * (1 + Math.sin(missile.life * 7) * (missile.scripted ? 0.018 : 0.03));
    missile.rotation = angle;
    missile.x += Math.cos(angle) * speed * dt;
    missile.y += Math.sin(angle) * speed * dt;
    missile.trail.push({ x: missile.x, y: missile.y, alpha: 0.22 * (1 - clamp(missile.life / missile.maxLife, 0, 1)) });
    if (missile.trail.length > 16) {
      missile.trail.shift();
    }
    if (distanceToTarget < 30 || missile.life >= missile.maxLife) {
      pushExplosion(missile.targetX, missile.targetY, missile.scripted ? 96 : 64);
      list.splice(index, 1);
    }
  }
}

function maybeSpawnAmbientMissile(dt) {
  if (!state.signRead) return;
  ambientMissileTimer -= dt;
  if (ambientMissileTimer > 0) return;
  ambientMissileTimer = 0.64 + Math.random() * 0.58;
  const playerRoute = getNearestRoutePoint(
    player.x + (Math.random() * 240 - 120),
    player.y + (Math.random() * 220 - 110)
  );
  const x = playerRoute.x + (Math.random() * 64 - 32);
  const y = playerRoute.y + (Math.random() * 64 - 32);
  spawnMissile(
    x,
    y,
    false,
    { side: Math.random() > 0.5 ? "left" : "right", baseJitter: 0.18 + Math.random() * 0.08, instability: 0.56 + Math.random() * 0.16 }
  );
}

function updateGame(dt) {
  if (modalLayer.hidden) movePlayer(dt);
  updateNearestInteractable();
  maybeTriggerThreat();
  maybeSpawnAmbientMissile(dt);
  state.activeThreatFlash = clamp(state.activeThreatFlash - dt * 1.25, 0, 0.6);
  const redGlowTarget = state.redGlowCollected ? 0.15 : 1;
  redGlowPulse = clamp(damp(redGlowPulse, redGlowTarget, 2.1, dt), 0, 1);
  updateMissiles(state.scriptedMissiles, dt);
  updateMissiles(state.ambientMissiles, dt);
  if (input.interactQueued) {
    input.interactQueued = false;
    handleInteract();
  }
  updateCamera();
  renderStatus();
  drawPrompt();
  if (state.signRead && getResolvedThreatCount() >= threats.length) {
    setObjective("Asedio superado. Busca la bateria residual.", "Acercate al emplazamiento del fondo para ver la tabla de perdidas e iniciar el combate final.");
  }
  const battery = interactables.find((entry) => entry.id === "battery");
  const batteryReached = battery && Math.hypot(player.x - battery.x, player.y - battery.y) <= battery.radius;
  if (state.signRead && !state.attemptComplete && getResolvedThreatCount() >= threats.length && batteryReached) {
    state.attemptComplete = true;
    showToast("La bateria ya esta al alcance", 1600);
    saveProgress();
  }
  saveTimer += dt * 1000;
  if (saveTimer >= FOSO_SAVE_INTERVAL_MS) {
    saveTimer = 0;
    saveProgress();
  }
}

function renderWorld(dt) {
  ctx.clearRect(0, 0, viewport.width, viewport.height);
  updateCamera();
  ctx.save();
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
  drawBackground();
  drawBatteryWorld();
  drawRedGlowMarker();
  state.ambientMissiles.forEach(drawMissile);
  state.scriptedMissiles.forEach(drawMissile);
  drawInteractableSign();
  drawPlayer();
  drawExplosions(dt);
  ctx.restore();
  drawToast();
}

function frame(now) {
  const dt = clamp((now - lastTime) / 1000, 0, 0.032);
  lastTime = now;
  if (state.loaded) updateGame(dt);
  renderWorld(dt);
  requestAnimationFrame(frame);
}

function worldPointerDirection(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (viewport.width / Math.max(1, rect.width));
  const y = (clientY - rect.top) * (viewport.height / Math.max(1, rect.height));
  const worldX = x / camera.zoom + camera.x;
  const worldY = y / camera.zoom + camera.y;
  const dx = worldX - player.x;
  const dy = worldY - player.y;
  const length = Math.hypot(dx, dy) || 1;
  input.pointerX = dx / length;
  input.pointerY = dy / length;
}

function setPointerActive(event) {
  input.pointerActive = true;
  input.pointerId = event.pointerId;
  worldPointerDirection(event.clientX, event.clientY);
}

function clearPointerActive() {
  input.pointerActive = false;
  input.pointerId = null;
  input.pointerX = 0;
  input.pointerY = 0;
}

function handleKey(event, active) {
  if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") input.up = active;
  if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") input.down = active;
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") input.left = active;
  if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") input.right = active;
  if (active && (event.key === "e" || event.key === "E" || event.key === "Enter" || event.key === " ")) {
    input.interactQueued = true;
  }
}

function attemptReturnToMap() {
  if (storyEmbedMode) {
    postFosoAction("return-map");
    return;
  }
  if (storyReturnUrl) {
    window.location.href = storyReturnUrl;
  }
}

function maybeStartMusic() {
  if (storyAudioMode !== "internal" || !fosoMusic) return;
  const playPromise = fosoMusic.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {});
  }
}

function ensureFosoAudio() {
  if (fosoAudio.context) return fosoAudio.context;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  fosoAudio.context = new AudioContextClass();
  return fosoAudio.context;
}

function unlockFosoAudio() {
  const context = ensureFosoAudio();
  if (!context) return;
  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }
  fosoAudio.unlocked = true;
}

function createExplosionNoiseBuffer(context) {
  const length = Math.floor(context.sampleRate * 0.72);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let falloff = 1;
  for (let index = 0; index < length; index += 1) {
    falloff *= 0.9984;
    data[index] = (Math.random() * 2 - 1) * falloff;
  }
  return buffer;
}

function playExplosionSound(intensity = 1, distanceRatio = 0.5) {
  const nowMs = performance.now();
  if (nowMs - lastExplosionSoundAt < 90) return;
  const context = ensureFosoAudio();
  if (!context || !fosoAudio.unlocked) return;

  lastExplosionSoundAt = nowMs;
  const now = context.currentTime;
  const closeness = clamp(1 - distanceRatio, 0.16, 1);
  const gainAmount = clamp(0.035 + intensity * 0.05 * closeness, 0.025, 0.14);
  const master = context.createGain();
  const low = context.createOscillator();
  const lowGain = context.createGain();
  const noise = context.createBufferSource();
  const noiseGain = context.createGain();
  const filter = context.createBiquadFilter();

  master.gain.setValueAtTime(gainAmount, now);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);
  master.connect(context.destination);

  low.type = "sine";
  low.frequency.setValueAtTime(58 + intensity * 12, now);
  low.frequency.exponentialRampToValueAtTime(26, now + 0.62);
  lowGain.gain.setValueAtTime(0.82, now);
  lowGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);
  low.connect(lowGain).connect(master);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(760 + intensity * 420, now);
  filter.frequency.exponentialRampToValueAtTime(110, now + 0.54);
  filter.Q.value = 0.8;
  noise.buffer = createExplosionNoiseBuffer(context);
  noiseGain.gain.setValueAtTime(0.7, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.46);
  noise.connect(filter).connect(noiseGain).connect(master);

  low.start(now);
  noise.start(now);
  low.stop(now + 0.78);
  noise.stop(now + 0.78);
}

async function boot() {
  resizeCanvas();
  await loadAssets();
  applyDebugPhysicsOverrides();
  const restored = restoreProgress();
  if (!restored) seedNewAttempt();
  state.loaded = true;
  renderStatus();
  setObjective(
    state.signRead ? "Cruza el Foso y administra el desgaste." : "Busca el cartel de la Ruta Ceniza.",
    state.signRead
      ? "Lee cada impacto, busca cobertura y guarda las mejores cartas posibles para la bateria."
      : "Está junto al inicio, en la esquina inferior izquierda. Acercate e interactua para leer las instrucciones."
  );
  if (state.activeThreatId) {
    openThreatModal(getThreatById(state.activeThreatId));
  }
  maybeStartMusic();
  requestAnimationFrame(frame);
}

mapButton.addEventListener("click", attemptReturnToMap);
canvas.addEventListener("pointerdown", (event) => {
  unlockFosoAudio();
  if (modalLayer.hidden === false) return;
  setPointerActive(event);
});
canvas.addEventListener("pointermove", (event) => {
  if (!input.pointerActive || event.pointerId !== input.pointerId) return;
  worldPointerDirection(event.clientX, event.clientY);
});
canvas.addEventListener("pointerup", clearPointerActive);
canvas.addEventListener("pointercancel", clearPointerActive);
canvas.addEventListener("dblclick", () => {
  input.interactQueued = true;
});
window.addEventListener("keydown", (event) => {
  unlockFosoAudio();
  handleKey(event, true);
});
window.addEventListener("keyup", (event) => handleKey(event, false));
window.addEventListener("resize", resizeCanvas);
window.visualViewport?.addEventListener?.("resize", resizeCanvas);
window.addEventListener("orientationchange", () => window.setTimeout(resizeCanvas, 80));
window.addEventListener("beforeunload", saveProgress);
window.addEventListener("pointerdown", () => {
  unlockFosoAudio();
  maybeStartMusic();
}, { once: true, passive: true });

boot().catch((error) => {
  console.error(error);
  setObjective("No se pudo cargar el Foso.", "Revisa los assets del capitulo 6.");
});
