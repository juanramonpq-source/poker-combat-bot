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
const forceVanArrival = storyParams.get("story_van_arrival") === "1";
const chapterStateKey = "pocobot-tower-4b-chapter-v1";
const towerExteriorPositionKey = "pocobot-story-tower-4b-exterior-position-v1";
const storySkipEnemyCombatsKey = "pocobot_story_skip_enemy_combats_v1";
const skipEnemyCombatsMode = storyParams.get("story_skip_combats") === "1"
  || localStorage.getItem(storySkipEnemyCombatsKey) === "1";
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
const unknownRadioIntroDelay = 15;
const xavorVanReturnArrivalDelay = 5;

const defaultChapterState = {
  chapterFlowVersion,
  exteriorDroneDefeated: false,
  exteriorDroneDefeatedIds: [],
  xavorArrived: false,
  pendingVanArrival: false,
  vanArrivalDelaySeconds: 0,
  xavorIntroduced: false,
  towerDoorOpen: false,
  exteriorDroneEncountered: false,
  unknownRadioIntroPlayed: false,
  interiorDroneDefeated: false,
  controlMechaDefeated: false,
  argosHackDefeated: false,
  missionComplete: false,
  finaleConversationPending: false,
  finalRewardClaimed: false,
  redGlowClaimed: false,
  inventoryRewards: [],
  coins: 0,
};

function loadChapterState() {
  if (storyParams.get("reset_chapter") === "1") {
    localStorage.removeItem(chapterStateKey);
  }

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
  x: 720,
  y: 662,
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
  spriteWidth: 190,
  spriteHeight: 190,
};

const towerExteriorPositionState = {
  x: Math.round(player.x),
  y: Math.round(player.y),
  savedAt: 0,
};

const sceneSpawnPoints = {
  default: { x: 720, y: 662 },
  missionReturn: { x: 520, y: 698 },
  fromInterior: { x: 806, y: 530 },
};

function placePlayerAt(point) {
  if (!point) return;
  player.x = Math.max(player.radius, Math.min(world.width - player.radius, Number(point.x) || sceneSpawnPoints.default.x));
  player.y = Math.max(player.radius, Math.min(world.height - player.radius, Number(point.y) || sceneSpawnPoints.default.y));
  player.vx = 0;
  player.vy = 0;
}

function readTowerExteriorPosition() {
  try {
    const parsed = JSON.parse(localStorage.getItem(towerExteriorPositionKey) || "{}");
    if (!parsed || typeof parsed !== "object") return null;
    const x = Number(parsed.x);
    const y = Number(parsed.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  } catch (error) {
    return null;
  }
}

function rememberTowerExteriorPosition(force = false) {
  const x = Math.round(player.x);
  const y = Math.round(player.y);
  const now = Date.now();
  if (!force) {
    const movedEnough = Math.abs(x - towerExteriorPositionState.x) >= 8 || Math.abs(y - towerExteriorPositionState.y) >= 8;
    const enoughTimePassed = now - towerExteriorPositionState.savedAt >= 900;
    if (!movedEnough && !enoughTimePassed) return;
  }
  towerExteriorPositionState.x = x;
  towerExteriorPositionState.y = y;
  towerExteriorPositionState.savedAt = now;
  try {
    localStorage.setItem(towerExteriorPositionKey, JSON.stringify({ x, y, savedAt: now }));
  } catch (error) {}
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

  if (storyParams.get("from_interior") === "1") {
    placePlayerAt(sceneSpawnPoints.fromInterior);
    return;
  }

  if (storyParams.get("mission_return") === "1") {
    placePlayerAt(sceneSpawnPoints.missionReturn);
    return;
  }

  const savedPosition = readTowerExteriorPosition();
  if (savedPosition) {
    placePlayerAt(savedPosition);
    rememberTowerExteriorPosition(true);
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
  mapDoorOpen: new Image(),
  xavorPortrait: new Image(),
  xavorVan: new Image(),
  exteriorDrone: new Image(),
  botFrames: [],
  frontFrames: [],
  sideFrames: [],
  hoverFrames: [],
  backFrame: null,
  ready: false,
};

const towerState = {
  doorOpen: chapterState.towerDoorOpen,
  doorBlend: chapterState.towerDoorOpen ? 1 : 0,
  doorOpening: false,
};

const walkableZones = [
  {
    type: "poly",
    points: [
      { x: 86, y: 336 },
      { x: 394, y: 214 },
      { x: 1064, y: 210 },
      { x: 1408, y: 374 },
      { x: 1436, y: 658 },
      { x: 1194, y: 800 },
      { x: 1040, y: 966 },
      { x: 780, y: 1024 },
      { x: 246, y: 944 },
      { x: 0, y: 792 },
      { x: 0, y: 528 },
    ],
  },
  {
    type: "poly",
    points: [
      { x: 1164, y: 392 },
      { x: 1536, y: 414 },
      { x: 1536, y: 594 },
      { x: 1240, y: 596 },
    ],
  },
];

const collisionZones = [
  { type: "ellipse", x: 501, y: 11, width: 471, height: 172 },
  { type: "ellipse", x: 458, y: 148, width: 184, height: 210 },
  { type: "ellipse", x: 312, y: 261, width: 187, height: 127 },
  { type: "ellipse", x: 498, y: 506, width: 137, height: 91 },
  { type: "ellipse", x: 198, y: 686, width: 154, height: 74 },
  { type: "ellipse", x: 4, y: 19, width: 141, height: 536 },
  { type: "ellipse", x: 60, y: 190, width: 350, height: 253 },
  { type: "ellipse", x: 23, y: 439, width: 158, height: 234 },
  { type: "ellipse", x: 34, y: 717, width: 203, height: 203 },
  { type: "ellipse", x: 237, y: 865, width: 323, height: 143 },
  { type: "ellipse", x: 690.4120481927711, y: 827.0365684917969, width: 152, height: 70 },
  { type: "ellipse", x: 960, y: 91, width: 315, height: 192 },
  { type: "ellipse", x: 1157, y: 235, width: 173, height: 151 },
  { type: "ellipse", x: 1348, y: 345, width: 188, height: 411 },
  { type: "ellipse", x: 1195, y: 630, width: 198, height: 150 },
  { type: "ellipse", x: 868.6506024096385, y: 505.29898624798807, width: 100, height: 100 },
  { type: "ellipse", x: 561.5783132530121, y: 684.1735520853923, width: 49, height: 33 },
  { type: "ellipse", x: 1075.5180722891566, y: 660.7616129669896, width: 101, height: 216 },
];
window.PoCoBOTStoryCollisionEditor?.applySceneZones("tower-exterior", collisionZones);

const thrusters = [
  { x: -76, y: -39, width: 17, phase: 0.1 },
  { x: 76, y: -39, width: 17, phase: 1.7 },
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
    id: "blue-computer",
    x: 318,
    y: 506,
    radius: 132,
    label: "Ordenador azul",
    hint: "Hackear",
    message: "Ordenador azul: Xavor prepara el puente de acceso a la compuerta.",
  },
  {
    id: "tower-door",
    x: 800.2622950819672,
    y: 264.36566767157285,
    radius: 156,
    label: "Puerta 4B",
    hint: "Entrar",
    message: "La compuerta abierta respira vapor frio hacia el interior de la torre.",
  },
  {
    id: "relay-bridge",
    x: 1290,
    y: 522,
    radius: 124,
    label: "Pasarela este",
    hint: "Examinar",
    message: "Pasarela este: las transmisiones siguen mudas desde La Caída.",
  },
  {
    id: "xavor-van",
    x: 313,
    y: 723,
    radius: 100,
    label: "Furgoneta de Xavor",
    hint: "Hablar",
    message: "La furgoneta chisporrotea como si supiera reirse antes de arrancar.",
  },
];
window.PoCoBOTStoryCollisionEditor?.applySceneInteractionPoints("tower-exterior", interactables);

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

const towerInventoryPanel = {
  open: false,
  button: { x: 0, y: 0, width: 168, height: 42 },
};

const redGlowCache = {
  x: 1088,
  y: 374,
  radius: 86,
};
const redGlowPickupRadius = redGlowCache.radius * 0.9;

const randomTowerCardRanks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const randomTowerCardSuits = ["hearts", "diamonds", "clubs", "spades"];
const cardFileRankMap = {
  A: "ace",
  J: "jack",
  Q: "queen",
  K: "king",
};

const suitLabelMap = {
  hearts: "corazones",
  diamonds: "diamantes",
  clubs: "tréboles",
  spades: "picas",
};

function getPlayerPositionPayload() {
  return {
    x: Math.round(player.x),
    y: Math.round(player.y),
  };
}

function postStoryTutorialAction(action, payload = {}) {
  rememberTowerExteriorPosition(true);
  const message = {
    type: "pocobot-story-tower-tutorial-action",
    action,
    savedAt: Date.now(),
    sceneMusic: musicConfig.scene,
    playerPosition: getPlayerPositionPayload(),
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

document.addEventListener("visibilitychange", () => {
  if (document.hidden) rememberTowerExteriorPosition(true);
});

window.addEventListener("pagehide", () => {
  rememberTowerExteriorPosition(true);
});

function setInteractionMessage(text, duration = 2.8) {
  interactionState.message = text;
  interactionState.messageTimer = duration;
}

function getRandomTowerCardReward() {
  const rank = randomTowerCardRanks[Math.floor(Math.random() * randomTowerCardRanks.length)];
  const suit = randomTowerCardSuits[Math.floor(Math.random() * randomTowerCardSuits.length)];
  const fileRank = cardFileRankMap[rank] || rank;
  const id = `tower-4b-glow-${rank.toLowerCase()}-${suit}`;
  const name = `${rank} de ${suitLabelMap[suit] || suit}`;
  return {
    id,
    name,
    text: `${name} · resplandor rojo de Torre 4B`,
    source: "Resplandor rojo de Torre 4B",
    rank,
    suit,
    cardImage: `assets/cards/hayeah-full/${fileRank}_of_${suit}.svg`,
    deckText: name,
  };
}

function claimRedGlowCache() {
  if (chapterState.redGlowClaimed) return;
  const rewardCard = getRandomTowerCardReward();
  const inventoryRewards = Array.isArray(chapterState.inventoryRewards)
    ? [...chapterState.inventoryRewards]
    : [];
  if (!inventoryRewards.includes(rewardCard.id)) {
    inventoryRewards.push(rewardCard.id);
  }
  patchChapterState({
    redGlowClaimed: true,
    inventoryRewards,
    lastGlowReward: rewardCard,
  });
  towerInventoryPanel.open = true;
  setInteractionMessage(`Resplandor rojo absorbido: ${rewardCard.name} se suma al inventario.`, 5.2);
  queueRadio([{
    text: `Xavor por radio: eso era memoria de baraja cristalizada. Te acaba de caer ${rewardCard.name}. Guárdala; las torres no regalan nada dos veces.`,
    unstable: true,
  }]);
  postStoryTutorialAction("tower-random-card-reward", {
    reward: { card: rewardCard },
    unlocks: ["tower-inventory"],
  });
}

function isPlayerInRedGlowPickupRange() {
  if (chapterState.redGlowClaimed) return false;
  const glowDistance = Math.hypot(player.x - redGlowCache.x, player.y - redGlowCache.y);
  return glowDistance < player.radius + redGlowPickupRadius;
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

function normalizeRadioEntry(entry, options = {}) {
  if (typeof entry === "string") {
    return {
      text: entry,
      unstable: !!options.unstable,
      typeSpeed: options.typeSpeed,
    };
  }

  if (!entry || typeof entry.text !== "string") {
    return null;
  }

  return {
    text: entry.text,
    unstable: !!entry.unstable || !!options.unstable,
    typeSpeed: entry.typeSpeed || options.typeSpeed,
  };
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

function queueRadio(lines, options = {}) {
  const normalizedEntries = (Array.isArray(lines) ? lines : [lines])
    .map((entry) => normalizeRadioEntry(entry, options))
    .filter((entry) => entry && entry.text);

  radioState.queue.push(...normalizedEntries);
  if (radioState.timer <= 0) {
    showNextRadio();
  }
}

function getRadioMessageDuration(text) {
  return clamp(10 + text.length * 0.085, 11.8, 23) * radioMessageDurationScale;
}

function showNextRadio() {
  const next = radioState.queue.shift();
  if (!next) {
    radioState.text = "";
    radioState.timer = 0;
    radioState.unstable = false;
    radioState.burst = 0;
    radioState.visibleChars = 0;
    return;
  }

  radioState.text = next.text;
  radioState.unstable = !!next.unstable;
  radioState.typeSpeed = Number.isFinite(next.typeSpeed)
    ? next.typeSpeed
    : radioState.unstable
      ? 34
      : 52;
  radioState.visibleChars = 0;
  radioState.timer = getRadioMessageDuration(next.text);
  radioState.burst = radioState.unstable ? 1.7 : 0;
  playRadioOpenSound();
}

function updateRadio(dt) {
  radioState.burst = Math.max(0, radioState.burst - dt);

  if (radioState.timer <= 0) {
    return;
  }

  const displayTextLength = getRadioFullDisplayText().length;
  if (displayTextLength > 0 && radioState.visibleChars < displayTextLength) {
    const glitchPulse = radioState.unstable && Math.sin(performance.now() * 0.034) > 0.72 ? 18 : 0;
    radioState.visibleChars = Math.min(
      displayTextLength,
      radioState.visibleChars + (radioState.typeSpeed + glitchPulse) * dt,
    );
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
  "blue-computer": 0,
  "tower-door": 0,
  "relay-bridge": 0,
  "xavor-van": 0,
};

function getExteriorDroneDefeatedIds() {
  return Array.isArray(chapterState.exteriorDroneDefeatedIds)
    ? chapterState.exteriorDroneDefeatedIds
    : [];
}

const exteriorDrones = [
  {
    id: "argos-drone-plaza",
    enemyId: "argos-perimeter-drone-plaza",
    mission: "tower_drone_hearts",
    suitTheme: "hearts",
    rewardId: "torre_4b_drone_plaza",
    x: 432,
    y: 772,
    baseX: 432,
    baseY: 772,
    radius: 34,
    phase: 0,
    patrolX: 74,
    patrolY: 18,
    speed: 1.18,
    label: "Dron de plaza",
  },
  {
    id: "argos-drone-relay",
    enemyId: "argos-perimeter-drone-relay",
    mission: "tower_drone_spades",
    suitTheme: "spades",
    rewardId: "torre_4b_drone_rele",
    x: 1010,
    y: 560,
    baseX: 1010,
    baseY: 560,
    radius: 34,
    phase: 1.4,
    patrolX: 96,
    patrolY: 34,
    speed: 1.12,
    label: "Dron de rele",
  },
  {
    id: "argos-drone-north",
    enemyId: "argos-perimeter-drone-north",
    mission: "tower_drone_clubs",
    suitTheme: "clubs",
    rewardId: "torre_4b_drone_antena",
    x: 776,
    y: 438,
    baseX: 776,
    baseY: 438,
    radius: 34,
    phase: 2.2,
    patrolX: 88,
    patrolY: 20,
    speed: 1.08,
    label: "Dron de antena",
  },
].map((drone) => ({
  ...drone,
  defeated: getExteriorDroneDefeatedIds().includes(drone.id),
  combatCooldown: 0,
}));

const xavorVan = {
  startX: -148,
  startY: 844,
  targetX: 282,
  targetY: 724,
  x: chapterState.pendingVanArrival || forceVanArrival ? -148 : 282,
  y: chapterState.pendingVanArrival || forceVanArrival ? 844 : 724,
  visible: chapterState.xavorArrived && !chapterState.pendingVanArrival,
  arrival: chapterState.xavorArrived && !chapterState.pendingVanArrival && !forceVanArrival ? 1 : 0,
  skid: forceVanArrival || chapterState.pendingVanArrival ? 1 : 0,
  soundPlayed: chapterState.xavorArrived && !chapterState.pendingVanArrival && !forceVanArrival,
  pendingArrival: !!chapterState.pendingVanArrival,
  arrivalDelay: chapterState.pendingVanArrival
    ? Math.max(0, Number(chapterState.vanArrivalDelaySeconds) || xavorVanReturnArrivalDelay)
    : 0,
  arrivalRadioQueued: false,
};

const radioState = {
  speaker: "Xavor Glitch",
  text: "",
  timer: 0,
  queue: [],
  unstable: false,
  burst: 0,
  visibleChars: 0,
  typeSpeed: 52,
};

function shouldScheduleInitialUnknownRadioIntro() {
  return !chapterState.unknownRadioIntroPlayed &&
    !chapterState.argosHackDefeated &&
    !chapterState.finalRewardClaimed &&
    !chapterState.xavorIntroduced &&
    !chapterState.xavorArrived &&
    !chapterState.pendingVanArrival &&
    !chapterState.exteriorDroneEncountered &&
    getExteriorDroneDefeatedIds().length === 0 &&
    storyParams.get("mission_return") !== "1";
}

const delayedUnknownRadioIntro = {
  active: shouldScheduleInitialUnknownRadioIntro(),
  timer: unknownRadioIntroDelay,
  triggered: !!chapterState.unknownRadioIntroPlayed,
};

const delayedUnknownRadioLines = [
  "Hola... chhhsss... 1, 2, 1, 2... ¿me recibes?... No hagas como que no me recibes porque sé qué sí lo estás haciendo...",
  "Eso dicen todas...",
  "Xavor por radio: Torre 4B sigue cerrada. Date una vuelta, mira el haz rojo y limpia la zona.",
  "Veo tres drones de ronda. Cada uno lleva recompensa. Si parecen poca cosa... no te confundas: eso dicen todas.",
];

function maybeTriggerDelayedUnknownRadioIntro(dt) {
  if (!delayedUnknownRadioIntro.active || delayedUnknownRadioIntro.triggered) return;
  delayedUnknownRadioIntro.timer = Math.max(0, delayedUnknownRadioIntro.timer - dt);
  if (delayedUnknownRadioIntro.timer > 0) return;
  delayedUnknownRadioIntro.triggered = true;
  delayedUnknownRadioIntro.active = false;
  patchChapterState({ unknownRadioIntroPlayed: true });
  queueRadio(delayedUnknownRadioLines, { unstable: true });
}

const xavorPresentation = {
  active: false,
  page: 0,
  pages: [
    {
      kicker: "Presentación",
      title: "Xavor Glitch",
      subtitle: "Técnico de frontera · Restaurador de sistemas muertos",
      text: "La furgoneta se detiene como si hubiera esquivado a la muerte por costumbre... Xavor Glitch baja entre cables, monitores abiertos y una sonrisa demasiado tranquila para alguien que sabe leer una ruina encendida. (Me gusta documentar todo lo que hago, no me juzgues).",
    },
    {
      kicker: "Lore PoCoBOT",
      title: "La baraja encontrada",
      subtitle: "La interfaz humana que sobrevivió al metal",
      text: "¿A que no sabes por qué los mechas a los que llamamos PoCoBOT se configuran con cartas de poker? Ven a hablar conmigo, que te lo explico...",
    },
    {
      kicker: "Misión",
      title: "Restaurar transmisiones",
      subtitle: "Torre de Seguimiento 4B",
      text: "La Caída apagó casi todo: voces humanas, rutas de auxilio, avisos de frontera. Incluso Argós quedó ciego en muchas zonas y ahora intenta reconstruirse tras el conflicto de hace dos años. Para restablecer transmisiones hay que llegar al panel de control superior y tumbar la inteligencia artificial que lo domina.",
    },
    {
      kicker: "Siguiente paso",
      title: "Hackeo preparado",
      subtitle: "Ordenador azul del escenario",
      text: "De momento la puerta está cerrada. Eso dicen todas... pero yo puedo abrir una grieta desde la furgoneta y desbloquear el ordenador azul que mantiene la compuerta cerrada. Tú solo ve hasta el terminal, activa el desbloqueo y sube.",
    },
  ],
};

const exhaustParticles = [];
const smokeParticles = [];

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

  if (xavorPresentation.active) {
    if (isStoryInteractKey(key) || key === "Escape") {
      advanceXavorPresentation();
    }
    return true;
  }

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

  if (
    chapterState.inventoryRewards?.length &&
    screenX >= towerInventoryPanel.button.x &&
    screenX <= towerInventoryPanel.button.x + towerInventoryPanel.button.width &&
    screenY >= towerInventoryPanel.button.y &&
    screenY <= towerInventoryPanel.button.y + towerInventoryPanel.button.height
  ) {
    towerInventoryPanel.open = !towerInventoryPanel.open;
    event.preventDefault();
    return;
  }

  if (xavorPresentation.active) {
    advanceXavorPresentation();
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
const ALLOW_PORTRAIT_EXPLORATION = true;

function shouldShowLandscapePrompt() {
  return !ALLOW_PORTRAIT_EXPLORATION && portraitMedia.matches && coarsePointerMedia.matches;
}

function isPortraitTouchViewport() {
  return portraitMedia.matches && coarsePointerMedia.matches;
}

function getCameraZoom() {
  return isPortraitTouchViewport() ? 1.12 : 1;
}

function getVisibleWorldSize() {
  const zoom = getCameraZoom();
  return {
    width: viewport.width / zoom,
    height: viewport.height / zoom,
  };
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

function pointInZone(pointX, pointY, zone) {
  if (zone.type === "rect") {
    return (
      pointX >= zone.x &&
      pointX <= zone.x + zone.width &&
      pointY >= zone.y &&
      pointY <= zone.y + zone.height
    );
  }

  if (zone.type === "circle") {
    const dx = pointX - zone.x;
    const dy = pointY - zone.y;
    return dx * dx + dy * dy <= zone.radius * zone.radius;
  }

  if (zone.type === "ellipse") {
    const rx = Math.max(1, zone.width / 2);
    const ry = Math.max(1, zone.height / 2);
    const cx = zone.x + rx;
    const cy = zone.y + ry;
    const dx = (pointX - cx) / rx;
    const dy = (pointY - cy) / ry;
    return dx * dx + dy * dy <= 1;
  }

  return pointInPolygon(pointX, pointY, zone.points);
}

function isInsideWalkableArea(circleX, circleY, radius) {
  const inset = radius * 0.72;
  const samples = [
    { x: circleX, y: circleY },
    { x: circleX - inset, y: circleY },
    { x: circleX + inset, y: circleY },
    { x: circleX, y: circleY - inset },
    { x: circleX, y: circleY + inset },
  ];

  return samples.every((sample) =>
    walkableZones.some((zone) => pointInZone(sample.x, sample.y, zone)),
  );
}

function actorCollisionHit(circleX, circleY, radius) {
  const staticHit = interactables.some((actor) => {
    const actorRadius = actorCollisionRadii[actor.id] ?? 0;
    if (actorRadius === 0) {
      return false;
    }

    const dx = circleX - actor.x;
    const dy = circleY - actor.y;
    const combinedRadius = radius + actorRadius;
    return dx * dx + dy * dy < combinedRadius * combinedRadius;
  });

  if (staticHit) {
    return true;
  }

  if (shouldShowXavorVan() && xavorVan.visible && xavorVan.arrival > 0.96) {
    const dx = circleX - xavorVan.x;
    const dy = circleY - xavorVan.y;
    const combinedRadius = radius + 70;
    return dx * dx + dy * dy < combinedRadius * combinedRadius;
  }

  return false;
}

function canMoveTo(nextX, nextY) {
  if (nextX - player.radius < 0 || nextX + player.radius > world.width) {
    return false;
  }

  if (nextY - player.radius < 0 || nextY + player.radius > world.height) {
    return false;
  }

  if (!isInsideWalkableArea(nextX, nextY, player.radius)) {
    return false;
  }

  const hitsScenery = collisionZones.some((zone) => {
    if (zone.opensWithDoor && towerState.doorOpen) {
      return false;
    }

    return collisionZoneHit(nextX, nextY, player.radius, zone);
  });

  return !hitsScenery && !actorCollisionHit(nextX, nextY, player.radius);
}

function ensureSafeInitialSpawn() {
  if (canMoveTo(player.x, player.y)) {
    snapCameraToPlayer();
    return;
  }

  const bases = [
    sceneSpawnPoints.default,
    sceneSpawnPoints.missionReturn,
    sceneSpawnPoints.fromInterior,
  ];
  const offsets = [
    [0, 0],
    [72, 0],
    [-72, 0],
    [0, 72],
    [0, -72],
    [128, 0],
    [-128, 0],
    [0, 128],
    [0, -128],
    [96, 96],
    [-96, 96],
    [96, -96],
    [-96, -96],
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
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
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
  const visibleWorld = getVisibleWorldSize();
  if (xavorVan.visible && xavorVan.arrival < 0.98 && !chapterState.xavorIntroduced) {
    const focusX = xavorVan.x * 0.72 + player.x * 0.28;
    const focusY = xavorVan.y * 0.64 + player.y * 0.36;
    return {
      x: clamp(focusX - visibleWorld.width / 2, 0, Math.max(0, world.width - visibleWorld.width)),
      y: clamp(focusY - visibleWorld.height / 2, 0, Math.max(0, world.height - visibleWorld.height)),
    };
  }

  const leadScale = isPortraitTouchViewport() ? 0.62 : 1;
  const leadX = clamp(player.vx * 0.28 * leadScale, -92, 92);
  const leadY = clamp(player.vy * 0.22 * leadScale, -70, 70);

  return {
    x: clamp(player.x + leadX - visibleWorld.width / 2, 0, Math.max(0, world.width - visibleWorld.width)),
    y: clamp(player.y + leadY - visibleWorld.height / 2, 0, Math.max(0, world.height - visibleWorld.height)),
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
  const [mapImage, firstBotFrame] = await Promise.all([
    loadImage("./assets/torre-seguimiento-4b-rendered-map.png"),
    loadImage(leanFrameSources[0]),
  ]);

  assets.map = mapImage;
  assets.botFrames = [firstBotFrame];
  assets.frontFrames = assets.botFrames;
  loadOptionalImage("./assets/torre-seguimiento-4b-door-open-map.png", (image) => {
    assets.mapDoorOpen = image;
  });
  loadOptionalImage("../low/torre_4b_compacta.webp", (image) => {
    assets.xavorBackdrop = image;
  });
  loadOptionalImage("../Brutos/transparent/XAVORpresentacion-transparent.png", (image) => {
    assets.xavorPortrait = image;
  });
  loadOptionalImage("./assets/chapter/xavor-van.png", (image) => {
    assets.xavorVan = image;
  });
  loadOptionalImage("./assets/chapter/argos-patrol-drone.png", (image) => {
    assets.exteriorDrone = image;
  });
  loadPlayerVisualFramesInBackground();
  createPlayerVisual();
  assets.ready = true;
  snapCameraToPlayer();
  startChapterMusic();

  const defeatedCount = defeatedExteriorDroneCount();
  if (chapterState.argosHackDefeated && !chapterState.finalRewardClaimed) {
    queueRadio([
      "Xavor: ¡ahí estás! Vuelve a la furgoneta. Tengo una recompensa y un discurso muy corto, que ya es raro en mí.",
    ]);
  } else if (chapterState.finalRewardClaimed) {
    queueRadio([
      "Xavor: Torre 4B vuelve a transmitir, tu radio ya está sincronizada y Argós tiene un mal día. Bonito final para un sitio feo. Adivina: Eso dicen todas...",
    ]);
  } else if (chapterState.xavorArrived && !chapterState.xavorIntroduced && !chapterState.pendingVanArrival) {
    queueRadio([
      "Xavor por radio: furgoneta en posición. Acércate y te cuento por qué esa torre importa.",
    ]);
  }
}

function playDoorOpenSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    return;
  }

  const audioContext = new AudioContext();
  const master = audioContext.createGain();
  master.gain.setValueAtTime(0.0001, audioContext.currentTime);
  master.gain.exponentialRampToValueAtTime(0.62, audioContext.currentTime + 0.025);
  master.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 2.05);
  master.connect(audioContext.destination);

  const bufferSize = Math.floor(audioContext.sampleRate * 1.75);
  const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const channel = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    channel[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const noise = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1600, audioContext.currentTime);
  filter.frequency.exponentialRampToValueAtTime(260, audioContext.currentTime + 1.35);
  filter.Q.value = 1.15;
  noise.buffer = noiseBuffer;
  noise.connect(filter);
  filter.connect(master);
  noise.start();
  noise.stop(audioContext.currentTime + 1.72);

  [42, 56, 88, 132].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = index < 2 ? "sawtooth" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.48, audioContext.currentTime + 1.55);
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.26 / (index + 1), audioContext.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 1.85);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(audioContext.currentTime + index * 0.04);
    oscillator.stop(audioContext.currentTime + 1.9);
  });

  [0.04, 0.32, 0.72].forEach((delay, index) => {
    const clank = audioContext.createOscillator();
    const gain = audioContext.createGain();
    clank.type = "square";
    clank.frequency.setValueAtTime(index === 0 ? 72 : 118 + index * 46, audioContext.currentTime + delay);
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.34 / (index + 1), audioContext.currentTime + delay + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + delay + 0.18);
    clank.connect(gain);
    gain.connect(master);
    clank.start(audioContext.currentTime + delay);
    clank.stop(audioContext.currentTime + delay + 0.2);
  });
}

function playVanArrivalSound() {
  if (xavorVan.soundPlayed) {
    return;
  }

  xavorVan.soundPlayed = true;
  playAudioClip("./assets/sfx/drag_racing_sfx_cc0.mp3", 0.58, 3.4);
  window.setTimeout(() => {
    playAudioClip("./assets/sfx/motor_looping_cc0.mp3", 0.32, 1.1);
  }, 360);

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    return;
  }

  const audioContext = new AudioContext();
  const master = audioContext.createGain();
  master.gain.setValueAtTime(0.0001, audioContext.currentTime);
  master.gain.exponentialRampToValueAtTime(0.22, audioContext.currentTime + 0.04);
  master.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 1.25);
  master.connect(audioContext.destination);

  const bufferSize = Math.floor(audioContext.sampleRate * 1.25);
  const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const channel = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    const fade = 1 - i / bufferSize;
    channel[i] = (Math.random() * 2 - 1) * fade;
  }

  const skid = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(880, audioContext.currentTime);
  filter.frequency.exponentialRampToValueAtTime(280, audioContext.currentTime + 1.05);
  skid.buffer = noiseBuffer;
  skid.connect(filter);
  filter.connect(master);
  skid.start(audioContext.currentTime + 0.08);
  skid.stop(audioContext.currentTime + 1.18);
}

function openTowerDoor() {
  if (towerState.doorOpen) {
    setInteractionMessage("La puerta ya está abierta. Entra cuando quieras.", 2.8);
    return;
  }

  towerState.doorOpen = true;
  towerState.doorOpening = true;
  patchChapterState({ towerDoorOpen: true });
  playDoorOpenSound();
  emitDoorSmokeBurst();
  setInteractionMessage("Xavor: Puerta 4B abierta. Eso dicen todas... pero esta vez es verdad.", 4.2);
  queueRadio([
    "Xavor: la compuerta ha cedido. Ve hasta la puerta y entra con cuidado.",
  ]);
  postStoryTutorialAction("blue-computer-hack", {
    doorOpen: true,
    unlocks: ["tower-door"],
  });
}

function defeatedExteriorDroneCount() {
  return exteriorDrones.filter((drone) => drone.defeated).length;
}

function shouldShowXavorVan() {
  return (xavorVan.visible || (chapterState.xavorArrived && !chapterState.pendingVanArrival)) && defeatedExteriorDroneCount() > 0;
}

function startPendingXavorVanArrival() {
  xavorVan.pendingArrival = false;
  xavorVan.visible = true;
  xavorVan.arrival = 0;
  xavorVan.x = xavorVan.startX;
  xavorVan.y = xavorVan.startY;
  xavorVan.skid = 1;
  xavorVan.soundPlayed = false;
  xavorVan.smokeDebt = 0;
  patchChapterState({ pendingVanArrival: false, xavorArrived: true, vanArrivalDelaySeconds: 0 });
  setInteractionMessage("La furgoneta de Xavor entra en escena entre chispas.", 4.8);
  queueRadio([
    "Xavor por radio: furgoneta en posición. Acércate y te cuento por qué esa torre importa.",
  ]);
}

function beginXavorPresentation() {
  input.pointerActive = false;
  input.pointerId = null;
  setInteractionMessage("", 0);
  postStoryTutorialAction("xavor-introduction-request", {
    unlocks: ["xavor-dialogue"],
    lore: "cards-as-human-readable-mecha-configuration",
  });
}

function completeXavorPresentation() {
  xavorPresentation.active = false;
  patchChapterState({ xavorIntroduced: true });
  setInteractionMessage("Xavor ha enlazado la furgoneta al ordenador azul. Ya puedes hackear la puerta.", 4.6);
  queueRadio([
    "Xavor: ordenador preparado. Ve al terminal azul y pulsa E. ¡Aprovecha, que lo tenemos tontorrón!",
  ]);
  postStoryTutorialAction("xavor-introduction", {
    unlocks: ["blue-computer"],
    lore: "cards-as-human-readable-mecha-configuration",
  });
}

function completeMissionWithXavor() {
  patchChapterState({
    finaleConversationPending: true,
  });

  setInteractionMessage("Xavor abre la furgoneta. Toca cerrar la misión cara a cara.", 4.4);
  queueRadio([
    "Xavor: ¡ahí estás! Vuelve a la furgoneta. Tengo una recompensa y un discurso muy corto, que ya es raro en mí.",
  ]);
  postStoryTutorialAction("xavor-finale-request", {
    missionComplete: true,
    unlocks: ["xavor-radio"],
  });
}

function advanceXavorPresentation() {
  if (!xavorPresentation.active) {
    return;
  }

  if (xavorPresentation.page < xavorPresentation.pages.length - 1) {
    xavorPresentation.page += 1;
    return;
  }

  completeXavorPresentation();
}

function triggerExteriorDroneCombat(drone) {
  if (drone.defeated || drone.combatCooldown > 0) {
    return;
  }

  if (!skipEnemyCombatsMode && (storyEmbedMode || window.parent !== window)) {
    delayedUnknownRadioIntro.active = false;
    delayedUnknownRadioIntro.triggered = true;
    patchChapterState({ exteriorDroneEncountered: true, unknownRadioIntroPlayed: true });
    drone.combatCooldown = 2.2;
    setInteractionMessage(`${drone.label}: combate temático detectado. Entrando a modo historia...`, 3.4);
    queueRadio([
      `Xavor: ${drone.label.toLowerCase()} mantiene un mazo casi normal, pero de ${drone.suitTheme} solo conserva una carta. El dron ya está montado; tú tendrás que levantar el PoCoBOT desde cero.`,
    ]);
    postStoryTutorialAction("request-drone-combat", {
      mission: drone.mission,
      droneId: drone.id,
      enemyId: drone.enemyId,
      suitTheme: drone.suitTheme,
      rewardId: drone.rewardId,
      returnScene: "exterior",
      reward: { coins: 1 },
      music: {
        combat: musicConfig.usualCombat,
        returnToScene: musicConfig.scene,
      },
    });
    return;
  }

  const wasFirstVictory = defeatedExteriorDroneCount() === 0;
  delayedUnknownRadioIntro.active = false;
  delayedUnknownRadioIntro.triggered = true;
  const defeatedIds = [...new Set([...getExteriorDroneDefeatedIds(), drone.id])];

  drone.combatCooldown = 1.5;
  drone.defeated = true;
  patchChapterState({
    exteriorDroneEncountered: true,
    unknownRadioIntroPlayed: true,
    exteriorDroneDefeatedIds: defeatedIds,
    exteriorDroneDefeated: true,
    xavorArrived: wasFirstVictory ? false : chapterState.xavorArrived,
    pendingVanArrival: wasFirstVictory ? true : chapterState.pendingVanArrival,
    vanArrivalDelaySeconds: wasFirstVictory
      ? xavorVanReturnArrivalDelay
      : Number(chapterState.vanArrivalDelaySeconds) || 0,
    coins: chapterState.coins + 1,
  });

  if (wasFirstVictory) {
    xavorVan.pendingArrival = true;
    xavorVan.arrivalDelay = xavorVanReturnArrivalDelay;
    xavorVan.visible = false;
    xavorVan.arrival = 0;
    xavorVan.skid = 1;
    xavorVan.soundPlayed = false;
    setInteractionMessage("Primer dron vencido. Señal de Xavor acercándose...", 5.2);
  } else {
    setInteractionMessage(`${drone.label} vencido. Recompensa: 1 moneda PoCoBOT.`, 4.2);
    queueRadio([
      `Xavor: ${drone.label.toLowerCase()} fuera. Otra moneda para la causa.`,
    ]);
  }

  postStoryTutorialAction("exterior-drone-combat", {
    droneId: drone.id,
    enemyId: drone.enemyId,
    mission: drone.mission,
    result: "victory",
    reward: { coins: 1 },
    totalCoins: chapterState.coins,
    music: {
      combat: musicConfig.usualCombat,
      returnToScene: musicConfig.scene,
    },
    unlocks: wasFirstVictory ? ["xavor-van"] : [],
  });
}

function updateChapterActors(dt) {
  exteriorDrones.forEach((drone) => {
    drone.combatCooldown = Math.max(0, drone.combatCooldown - dt);

    if (!drone.defeated) {
      drone.phase += dt * drone.speed;
      drone.x = drone.baseX + Math.sin(drone.phase) * drone.patrolX;
      drone.y = drone.baseY + Math.sin(drone.phase * 1.7) * drone.patrolY;

      const distance = Math.hypot(player.x - drone.x, player.y - drone.y);
      if (distance < player.radius + drone.radius + 5) {
        triggerExteriorDroneCombat(drone);
      }
    }
  });

  if (isPlayerInRedGlowPickupRange()) {
    claimRedGlowCache();
  }

  if (xavorVan.pendingArrival) {
    xavorVan.arrivalDelay = Math.max(0, xavorVan.arrivalDelay - dt);
    xavorVan.visible = false;
    if (xavorVan.arrivalDelay <= 0) {
      startPendingXavorVanArrival();
    }
  } else {
    xavorVan.visible = shouldShowXavorVan();
  }
  if (xavorVan.visible && !xavorVan.soundPlayed && xavorVan.arrival < 0.16) {
    playVanArrivalSound();
  }
  xavorVan.arrival = damp(xavorVan.arrival, xavorVan.visible ? 1 : 0, 2.8, dt);
  const easedArrival = 1 - Math.pow(1 - clamp(xavorVan.arrival, 0, 1), 3);
  xavorVan.x = xavorVan.startX + (xavorVan.targetX - xavorVan.startX) * easedArrival;
  xavorVan.y =
    xavorVan.startY +
    (xavorVan.targetY - xavorVan.startY) * easedArrival -
    Math.sin(easedArrival * Math.PI) * 38;
  xavorVan.skid = Math.max(0, xavorVan.skid - dt * 0.55);
}

function update(dt) {
  if (!assets.ready) {
    return;
  }

  hudHelp.elapsed += dt;
  if (hudHelp.expanded && hudHelp.elapsed >= hudHelp.collapseDelay) {
    hudHelp.expanded = false;
  }
  maybeTriggerDelayedUnknownRadioIntro(dt);

  if (xavorPresentation.active) {
    player.vx = damp(player.vx, 0, player.drag, dt);
    player.vy = damp(player.vy, 0, player.drag, dt);
    player.glow += dt * 3.2;
    updateRadio(dt);
    return;
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
  emitVanArrivalSmoke(dt);
  updateSmokeParticles(dt);
  updateInteractions(dt);
  updateRadio(dt);
  towerState.doorBlend = damp(towerState.doorBlend, towerState.doorOpen ? 1 : 0, towerState.doorOpening ? 1.25 : 3.2, dt);
  if (towerState.doorOpening && towerState.doorBlend > 0.96) {
    towerState.doorOpening = false;
  }

  const target = getCameraTarget();

  camera.x += (target.x - camera.x) * camera.smoothness;
  camera.y += (target.y - camera.y) * camera.smoothness;
  rememberTowerExteriorPosition();
}

function drawMap() {
  ctx.drawImage(assets.map, 0, 0, world.width, world.height);

  if (towerState.doorBlend > 0.01 && assets.mapDoorOpen) {
    ctx.save();
    ctx.globalAlpha = towerState.doorBlend;
    ctx.drawImage(assets.mapDoorOpen, 0, 0, world.width, world.height);
    ctx.restore();
  }
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

function emitSmokeParticle(x, y, options = {}) {
  smokeParticles.push({
    x,
    y,
    vx: (Math.random() - 0.5) * (options.spreadX ?? 80) + (options.vx ?? 0),
    vy: -Math.random() * (options.lift ?? 70) + (options.vy ?? 0),
    age: 0,
    life: (options.life ?? 1.1) + Math.random() * (options.lifeJitter ?? 0.8),
    size: (options.size ?? 26) + Math.random() * (options.sizeJitter ?? 32),
    warmth: options.warmth ?? 0.25,
  });

  if (smokeParticles.length > 180) {
    smokeParticles.splice(0, smokeParticles.length - 180);
  }
}

function emitDoorSmokeBurst() {
  for (let i = 0; i < 54; i += 1) {
    emitSmokeParticle(768 + (Math.random() - 0.5) * 116, 358 + Math.random() * 34, {
      spreadX: 150,
      lift: 130,
      vy: -24,
      life: 1.5,
      lifeJitter: 1.2,
      size: 22,
      sizeJitter: 44,
      warmth: 0.55,
    });
  }
}

function emitVanArrivalSmoke(dt) {
  if (!shouldShowXavorVan() || xavorVan.arrival < 0.03 || xavorVan.arrival > 0.985) {
    return;
  }

  const intensity = (1 - xavorVan.arrival) * 18 + xavorVan.skid * 16;
  xavorVan.smokeDebt = (xavorVan.smokeDebt || 0) + intensity * dt;

  while (xavorVan.smokeDebt >= 1) {
    emitSmokeParticle(xavorVan.x - 122 + Math.random() * 34, xavorVan.y + 64 + Math.random() * 22, {
      spreadX: 170,
      lift: 58,
      vx: -80,
      vy: 18,
      life: 0.9,
      lifeJitter: 0.7,
      size: 20,
      sizeJitter: 34,
      warmth: 0.36,
    });
    xavorVan.smokeDebt -= 1;
  }
}

function updateSmokeParticles(dt) {
  for (let i = smokeParticles.length - 1; i >= 0; i -= 1) {
    const particle = smokeParticles[i];
    particle.age += dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 1 - Math.min(0.85, dt * 0.92);
    particle.vy -= dt * 6;
    particle.size += dt * 18;

    if (particle.age >= particle.life) {
      smokeParticles.splice(i, 1);
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
    if (interactable.id === "xavor-van" && (!xavorVan.visible || xavorVan.arrival < 0.9)) {
      return;
    }

    const distance = getInteractionDistance(interactable);
    if (distance <= interactable.radius && distance < nearestDistance) {
      nearest = interactable;
      nearestDistance = distance;
    }
  });

  interactionState.active = nearest;

  if (input.interactQueued) {
    if (nearest) {
      let message = nearest.message;

      if (nearest.id === "blue-computer") {
        if (!chapterState.xavorIntroduced) {
          message = chapterState.xavorArrived
            ? "El ordenador azul está bloqueado. Xavor aún no ha enlazado su furgoneta al terminal."
            : "El ordenador azul está ahí, pero no responde. Primero explora la zona y despeja los drones.";
          queueRadio([
            chapterState.xavorArrived
              ? "Xavor por radio: acércate a la furgoneta primero. El hackeo no se improvisa... bueno, casi nunca."
              : "Xavor por radio: todavía no, campeón. Primero limpia la zona de drones y luego hablamos de hackeos.",
          ]);
        } else {
          openTowerDoor();
          input.interactQueued = false;
          return;
        }
      }

      if (nearest.id === "xavor-van") {
        if (chapterState.argosHackDefeated) {
          if (!chapterState.finalRewardClaimed) {
            completeMissionWithXavor();
            input.interactQueued = false;
            return;
          }

          message = "Xavor: recompensa entregada, transmisiones vivas y furgoneta sin explotar. Final elegante. Eso dicen todas...";
          setInteractionMessage(message, 3.8);
          input.interactQueued = false;
          return;
        }

        if (!chapterState.xavorIntroduced) {
          beginXavorPresentation();
          input.interactQueued = false;
          return;
        }

        message = "Xavor: el ordenador ya está preparado. Ve al terminal azul y abre la puerta.";
      }

      if (nearest.id === "tower-door") {
        if (!towerState.doorOpen) {
          message = "La puerta sigue cerrada. Necesitas que Xavor hackee el ordenador azul.";
        } else {
          setInteractionMessage(message, 2.4);
          postStoryTutorialAction("enter-interior", {
            nextScene: "torre-seguimiento-4b-interior-baja",
          });
          navigateToScene("../torre-seguimiento-4b-interior-baja/index.html?from_exterior=1&preserve_chapter=1");
          input.interactQueued = false;
          return;
        }
      }

      setInteractionMessage(message, 3.4);
      postStoryTutorialAction(nearest.id, { doorOpen: towerState.doorOpen });
    } else {
      setInteractionMessage("Acércate al ordenador azul, a la furgoneta, a la puerta o a la pasarela.", 2.4);
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

function drawSmokeParticles() {
  ctx.save();

  smokeParticles.forEach((particle) => {
    const fade = clamp(1 - particle.age / particle.life, 0, 1);
    const radius = particle.size * (0.42 + (1 - fade) * 0.7);
    const warm = particle.warmth;
    const gradient = ctx.createRadialGradient(
      particle.x,
      particle.y,
      0,
      particle.x,
      particle.y,
      radius,
    );

    gradient.addColorStop(0, `rgba(${120 + warm * 90}, ${118 + warm * 66}, ${110 + warm * 30}, ${0.34 * fade})`);
    gradient.addColorStop(0.55, `rgba(82, 84, 82, ${0.2 * fade})`);
    gradient.addColorStop(1, "rgba(38, 40, 42, 0)");

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
  interactables.forEach((interactable) => {
    if (interactable.id === "xavor-van" && (!xavorVan.visible || xavorVan.arrival < 0.9)) {
      return;
    }

    drawInteractionMarker(interactable);
  });
}

function drawRedGlowCache() {
  if (chapterState.redGlowClaimed) return;
  const pulse = 0.5 + Math.sin(player.glow * 5.6) * 0.5;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const gradient = ctx.createRadialGradient(redGlowCache.x, redGlowCache.y, 0, redGlowCache.x, redGlowCache.y, redGlowCache.radius);
  gradient.addColorStop(0, `rgba(255, 92, 88, ${0.42 + pulse * 0.22})`);
  gradient.addColorStop(0.45, `rgba(255, 48, 66, ${0.18 + pulse * 0.16})`);
  gradient.addColorStop(1, "rgba(255, 48, 66, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(redGlowCache.x, redGlowCache.y, redGlowCache.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(255, 213, 95, ${0.2 + pulse * 0.28})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 12]);
  ctx.beginPath();
  ctx.arc(redGlowCache.x, redGlowCache.y, redGlowCache.radius * 0.52, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (isPlayerInRedGlowPickupRange()) {
    drawWorldLabel(redGlowCache.x, redGlowCache.y - redGlowCache.radius * 0.66, "Memoria roja", "Recoger");
  }
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
  if (!image) {
    return;
  }

  const bob = options.bob || 0;
  const alpha = options.alpha ?? 1;
  const rotation = options.rotation || 0;

  if (options.shadow) {
    drawSoftShadow(x, y + height * 0.24, width * 0.72, height * 0.2, options.shadow);
  }

  ctx.save();
  ctx.translate(x, y + bob);
  ctx.rotate(rotation);
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  ctx.restore();
}

function drawExteriorDrone(drone) {
  if (drone.defeated) {
    return;
  }

  const bob = Math.sin(player.glow * 4.2 + drone.phase) * 7;
  drawSoftShadow(drone.x, drone.y + 42, 78, 18, 0.22);
  drawWorldSprite(assets.exteriorDrone, drone.x, drone.y + bob, 106, 84, {
    alpha: 0.98,
  });
}

function drawXavorVan() {
  if (!xavorVan.visible && xavorVan.arrival < 0.02) {
    return;
  }

  const arrivalShake = (1 - xavorVan.arrival) * Math.sin(player.glow * 26) * 4;
  const skidAlpha = clamp((1 - xavorVan.arrival) * 1.2 + xavorVan.skid * 0.55, 0, 0.75);

  if (skidAlpha > 0.03) {
    ctx.save();
    ctx.globalAlpha = skidAlpha;
    ctx.strokeStyle = "rgba(18, 22, 22, 0.72)";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(xavorVan.x - 120, xavorVan.y + 54);
    ctx.bezierCurveTo(xavorVan.x - 170, xavorVan.y + 68, xavorVan.x - 226, xavorVan.y + 54, xavorVan.x - 282, xavorVan.y + 78);
    ctx.moveTo(xavorVan.x - 104, xavorVan.y + 72);
    ctx.bezierCurveTo(xavorVan.x - 162, xavorVan.y + 96, xavorVan.x - 222, xavorVan.y + 84, xavorVan.x - 278, xavorVan.y + 112);
    ctx.stroke();

    ctx.globalCompositeOperation = "lighter";
    const dust = ctx.createRadialGradient(xavorVan.x - 132, xavorVan.y + 62, 0, xavorVan.x - 132, xavorVan.y + 62, 92);
    dust.addColorStop(0, "rgba(255, 218, 126, 0.18)");
    dust.addColorStop(1, "rgba(255, 218, 126, 0)");
    ctx.fillStyle = dust;
    ctx.beginPath();
    ctx.arc(xavorVan.x - 132, xavorVan.y + 62, 92, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawWorldSprite(assets.xavorVan, xavorVan.x + arrivalShake, xavorVan.y, 236, 190, {
    alpha: clamp(xavorVan.arrival, 0, 1),
    shadow: 0.34,
    rotation: -0.06 - (1 - clamp(xavorVan.arrival, 0, 1)) * 0.18,
  });
}

function drawWorldActors() {
  const actors = [
    ...exteriorDrones.map((drone) => ({ y: drone.y, draw: () => drawExteriorDrone(drone) })),
    { y: xavorVan.y, draw: drawXavorVan },
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

  ctx.strokeStyle = "rgba(75, 255, 164, 0.62)";
  ctx.fillStyle = "rgba(75, 255, 164, 0.08)";
  walkableZones.forEach((zone) => {
    ctx.beginPath();
    ctx.moveTo(zone.points[0].x, zone.points[0].y);
    zone.points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  ctx.strokeStyle = "rgba(255, 75, 75, 0.74)";
  ctx.fillStyle = "rgba(255, 75, 75, 0.14)";
  collisionZones.forEach((zone) => {
    ctx.beginPath();
    if (zone.type === "rect") {
      ctx.rect(zone.x, zone.y, zone.width, zone.height);
    } else if (zone.type === "circle") {
      ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
    } else if (zone.type === "ellipse") {
      ctx.ellipse(zone.x + zone.width / 2, zone.y + zone.height / 2, zone.width / 2, zone.height / 2, 0, 0, Math.PI * 2);
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
      ctx.fillText(line, x, y + linesDrawn * lineHeight);
      linesDrawn += 1;
      line = word;
    } else {
      line = testLine;
    }

    if (isLastWord && line && linesDrawn < maxLines) {
      ctx.fillText(line, x, y + linesDrawn * lineHeight);
      linesDrawn += 1;
    }
  });

  return linesDrawn;
}

function drawImageCover(image, x, y, width, height) {
  if (!image) {
    ctx.fillStyle = "rgba(3, 8, 14, 0.88)";
    ctx.fillRect(x, y, width, height);
    return;
  }

  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawImageContain(image, x, y, width, height) {
  if (!image) {
    return;
  }

  const scale = Math.min(width / image.width, height / image.height);
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

function getRadioFullDisplayText() {
  if (isXavorKnownOnRadio()) return radioState.text;
  return radioState.text.replace(/^Xavor(?:\s+Glitch)?(?:\s+por\s+radio)?:\s*/i, "Voz cifrada: ");
}

function isRadioTyping() {
  return radioState.timer > 0 && radioState.visibleChars < getRadioFullDisplayText().length;
}

function getRadioDisplayText() {
  const fullText = getRadioFullDisplayText();
  const visibleLength = Math.min(fullText.length, Math.floor(radioState.visibleChars));
  return fullText.slice(0, visibleLength);
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

function drawXavorPresentationOverlay() {
  if (!xavorPresentation.active) {
    return;
  }

  const page = xavorPresentation.pages[xavorPresentation.page];
  const progress = `${xavorPresentation.page + 1}/${xavorPresentation.pages.length}`;
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.save();
  if (assets.xavorBackdrop) {
    drawImageCover(assets.xavorBackdrop, 0, 0, viewport.width, viewport.height);
  } else {
    ctx.fillStyle = "rgba(3, 8, 14, 0.96)";
    ctx.fillRect(0, 0, viewport.width, viewport.height);
  }

  ctx.fillStyle = "rgba(3, 8, 14, 0.56)";
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  const scan = ctx.createLinearGradient(0, 0, viewport.width, viewport.height);
  scan.addColorStop(0, "rgba(74, 215, 255, 0.16)");
  scan.addColorStop(0.48, "rgba(255, 209, 108, 0.08)");
  scan.addColorStop(1, "rgba(3, 8, 14, 0.68)");
  ctx.fillStyle = scan;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = "rgba(105, 238, 255, 0.22)";
  ctx.lineWidth = 1;
  for (let x = 36; x < viewport.width; x += 44) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 160, viewport.height);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";

  ctx.save();
  ctx.globalAlpha = 0.96;
  drawImageContain(assets.xavorPortrait, viewport.width - 410, 44, 360, viewport.height - 88);
  ctx.restore();

  const tagX = 52;
  const tagY = 48;
  ctx.fillStyle = "rgba(8, 17, 29, 0.74)";
  ctx.strokeStyle = "rgba(255, 213, 95, 0.34)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(tagX, tagY, 360, 82, 18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffd55f";
  ctx.font = "700 14px Trebuchet MS";
  ctx.fillText(page.kicker.toUpperCase(), tagX + 22, tagY + 30);
  ctx.fillStyle = "#eef8ff";
  ctx.font = "800 30px Trebuchet MS";
  ctx.fillText(page.title, tagX + 22, tagY + 62);

  const cardX = 52;
  const cardY = viewport.height - 274;
  const cardW = Math.min(740, viewport.width - 104);
  const cardH = 212;
  ctx.fillStyle = "rgba(5, 11, 18, 0.92)";
  ctx.strokeStyle = "rgba(80, 235, 255, 0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 22);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(132, 234, 255, 0.9)";
  ctx.font = "700 13px Trebuchet MS";
  ctx.fillText(`XAVOR GLITCH // ${page.subtitle}`, cardX + 24, cardY + 34);

  ctx.fillStyle = "#eef8ff";
  ctx.font = "18px Trebuchet MS";
  drawWrappedText(page.text, cardX + 24, cardY + 70, cardW - 48, 24, 5);

  ctx.fillStyle = "rgba(255, 213, 95, 0.88)";
  ctx.font = "13px Trebuchet MS";
  ctx.fillText(`Pulsa E, Enter o toca/clic para continuar · ${progress}`, cardX + 24, cardY + cardH - 24);
  ctx.restore();
}

function drawRadioOverlay() {
  if (!radioState.text || radioState.timer <= 0) {
    return;
  }

  const width = Math.min(720, viewport.width - 36);
  const height = 124;
  const jitter = radioState.unstable ? (Math.random() - 0.5) * (4 + radioState.burst * 8) : 0;
  const x = 18 + jitter;
  const y = viewport.height - 214 + (radioState.unstable ? (Math.random() - 0.5) * 3 : 0);

  ctx.save();
  ctx.fillStyle = "rgba(5, 11, 18, 0.9)";
  ctx.strokeStyle = "rgba(80, 235, 255, 0.42)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 18);
  ctx.fill();
  ctx.stroke();
  drawRadioInterference(x, y, width, height);
  if (radioState.unstable) {
    ctx.globalAlpha = 0.18 + radioState.burst * 0.18;
    ctx.fillStyle = "#ffffff";
    for (let line = y + 10; line < y + height - 8; line += 17) {
      ctx.fillRect(x + 12 + Math.random() * 18, line, width - 34 - Math.random() * 80, 1);
    }
    ctx.globalAlpha = 1;
  }

  drawRadioPortrait(x + 14, y + 14, 82, 82);

  ctx.fillStyle = "#84eaff";
  ctx.font = "700 13px Trebuchet MS";
  ctx.fillText(`RADIO // ${getRadioSpeakerLabel()}`, x + 112, y + 30);

  ctx.fillStyle = "#eef8ff";
  ctx.font = "15px Trebuchet MS";
  const typingCursor = isRadioTyping() && Math.floor(performance.now() / 180) % 2 === 0 ? " |" : "";
  drawWrappedText(`${getRadioDisplayText()}${typingCursor}`, x + 112, y + 56, width - 132, 20, 3);

  ctx.fillStyle = "rgba(255, 213, 95, 0.9)";
  ctx.font = "12px Trebuchet MS";
  ctx.fillText("Hilo narrativo activo", x + 112, y + 104);
  ctx.restore();
}

function drawHud() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  if (hudHelp.expanded) {
    const panelWidth = Math.min(520, viewport.width - 36);
    hudHelp.button = { x: 18, y: 18, width: panelWidth, height: 92 };
    ctx.fillStyle = "rgba(8, 17, 29, 0.82)";
    ctx.fillRect(18, 18, panelWidth, 92);

    ctx.strokeStyle = "rgba(146, 246, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, panelWidth, 92);

    ctx.fillStyle = "#eef8ff";
    ctx.font = "18px Trebuchet MS";
    ctx.fillText("PoCoBOT // Torre de Seguimiento 4B", 32, 46);

    ctx.fillStyle = "rgba(238, 248, 255, 0.82)";
    ctx.font = "14px Trebuchet MS";
    ctx.fillText("WASD para moverte · E o Enter para aceptar/seleccionar", 32, 68);
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

  const objectiveText = chapterState.finalRewardClaimed
    ? `Misión completada · Radio de Xavor recibida · Monedas: ${chapterState.coins}`
    : chapterState.argosHackDefeated
      ? `Vuelve a la furgoneta de Xavor para cerrar la mision · Monedas: ${chapterState.coins}`
      : `${skipEnemyCombatsMode ? "TEST: toca enemigos para omitir combate · " : ""}Explora, derrota drones (${defeatedExteriorDroneCount()}/3) y hackea el ordenador azul · Monedas: ${chapterState.coins}`;
  if (hudHelp.expanded) {
    ctx.fillStyle = "rgba(238, 248, 255, 0.82)";
    ctx.font = "14px Trebuchet MS";
    ctx.fillText(objectiveText, 32, 88);
  }

  const inventoryRewards = Array.isArray(chapterState.inventoryRewards) ? chapterState.inventoryRewards : [];
  if (inventoryRewards.length) {
    towerInventoryPanel.button = {
      x: viewport.width - 198,
      y: viewport.height - 128,
      width: 168,
      height: 42,
    };
    ctx.fillStyle = "rgba(8, 17, 29, 0.84)";
    ctx.beginPath();
    ctx.roundRect(towerInventoryPanel.button.x, towerInventoryPanel.button.y, towerInventoryPanel.button.width, towerInventoryPanel.button.height, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 213, 95, 0.3)";
    ctx.stroke();
    ctx.fillStyle = "#ffe0bc";
    ctx.font = "700 14px Trebuchet MS";
    ctx.fillText(`Inventario ${inventoryRewards.length} +`, towerInventoryPanel.button.x + 18, towerInventoryPanel.button.y + 27);

    if (towerInventoryPanel.open) {
      const panelW = 320;
      const panelH = Math.min(190, 78 + inventoryRewards.length * 26);
      const panelX = Math.max(18, viewport.width - panelW - 30);
      const panelY = Math.max(80, towerInventoryPanel.button.y - panelH - 12);
      ctx.fillStyle = "rgba(5, 10, 17, 0.92)";
      ctx.beginPath();
      ctx.roundRect(panelX, panelY, panelW, panelH, 18);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 213, 95, 0.28)";
      ctx.stroke();
      ctx.fillStyle = "#84eaff";
      ctx.font = "700 13px Trebuchet MS";
      ctx.fillText("INVENTARIO DE TORRE", panelX + 18, panelY + 28);
      ctx.fillStyle = "#eef8ff";
      ctx.font = "14px Trebuchet MS";
      const lastReward = chapterState.lastGlowReward?.name || "Carta recuperada";
      ctx.fillText(lastReward, panelX + 18, panelY + 58);
      ctx.fillStyle = "rgba(238, 248, 255, 0.72)";
      ctx.font = "12px Trebuchet MS";
      ctx.fillText("El inventario histórico también se actualiza.", panelX + 18, panelY + 84);
    }
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
    kicker: "Exploración táctica",
    title: "Torre de Seguimiento 4B",
    subtitle: "Activando radar, emisor y pasarelas de Argós",
    status: "Enlazando furgoneta, drones y ordenador azul",
    accent: "#ffd55f",
    shadow: "#1c1712",
    deep: "#0f2b34"
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
  drawRedGlowCache();
  drawExhaustParticles();
  drawSmokeParticles();
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
  drawXavorPresentationOverlay();
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
