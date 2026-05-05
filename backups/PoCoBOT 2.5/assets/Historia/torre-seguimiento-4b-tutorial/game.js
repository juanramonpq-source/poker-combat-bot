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

const defaultChapterState = {
  chapterFlowVersion,
  exteriorDroneDefeated: false,
  exteriorDroneDefeatedIds: [],
  xavorArrived: false,
  xavorIntroduced: false,
  towerDoorOpen: false,
  interiorDroneDefeated: false,
  controlMechaDefeated: false,
  argosHackDefeated: false,
  missionComplete: false,
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
  x: 720,
  y: 662,
  radius: 26,
  vx: 0,
  vy: 0,
  maxSpeed: 310,
  acceleration: 980,
  drag: 5.2,
  angle: 0,
  targetAngle: 0,
  glow: 0,
  thrustCycle: 0,
  thrustPower: 0,
  leanAmount: 0,
  leanSide: 0,
  flameSkewX: 0,
  flameSkewY: 0,
  particleDebt: 0,
  spriteWidth: 190,
  spriteHeight: 190,
};

if (storyParams.get("mission_return") === "1") {
  player.x = 520;
  player.y = 698;
}

const spawnX = Number(storyParams.get("story_player_x"));
const spawnY = Number(storyParams.get("story_player_y"));
if (Number.isFinite(spawnX) && Number.isFinite(spawnY)) {
  player.x = Math.max(player.radius, Math.min(world.width - player.radius, spawnX));
  player.y = Math.max(player.radius, Math.min(world.height - player.radius, spawnY));
}

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
  {
    type: "poly",
    points: [
      { x: 492, y: 252 },
      { x: 662, y: 254 },
      { x: 640, y: 354 },
      { x: 536, y: 366 },
      { x: 458, y: 318 },
    ],
  },
  {
    type: "poly",
    points: [
      { x: 890, y: 258 },
      { x: 988, y: 258 },
      { x: 1030, y: 336 },
      { x: 878, y: 398 },
      { x: 844, y: 336 },
    ],
  },
  { type: "rect", x: 708, y: 288, width: 116, height: 64, opensWithDoor: true },
  { type: "circle", x: 120, y: 638, radius: 44 },
  { type: "rect", x: 178, y: 694, width: 72, height: 48 },
  { type: "rect", x: 566, y: 800, width: 54, height: 44 },
  { type: "rect", x: 704, y: 838, width: 154, height: 36 },
  { type: "rect", x: 1194, y: 430, width: 62, height: 66 },
  {
    type: "poly",
    points: [
      { x: 1056, y: 430 },
      { x: 1110, y: 440 },
      { x: 1130, y: 482 },
      { x: 1082, y: 506 },
      { x: 1038, y: 480 },
    ],
  },
];

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
    x: 766,
    y: 366,
    radius: 178,
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
    message: "Pasarela este: las transmisiones siguen mudas desde La Caida.",
  },
  {
    id: "xavor-van",
    x: 282,
    y: 724,
    radius: 152,
    label: "Furboneta de Xavor",
    hint: "Hablar",
    message: "La furboneta chisporrotea como si supiera reirse antes de arrancar.",
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

const towerInventoryPanel = {
  open: false,
  button: { x: 0, y: 0, width: 168, height: 42 },
};

const redGlowCache = {
  x: 1088,
  y: 374,
  radius: 86,
};

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
  clubs: "treboles",
  spades: "picas",
};

function getPlayerPositionPayload() {
  return {
    x: Math.round(player.x),
    y: Math.round(player.y),
  };
}

function postStoryTutorialAction(action, payload = {}) {
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
    text: `Xavor por radio: eso era memoria de baraja cristalizada. Te acaba de caer ${rewardCard.name}. Guardala; las torres no regalan nada dos veces.`,
    unstable: true,
  }]);
  postStoryTutorialAction("tower-random-card-reward", {
    reward: { card: rewardCard },
    unlocks: ["tower-inventory"],
  });
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
    };
  }

  if (!entry || typeof entry.text !== "string") {
    return null;
  }

  return {
    text: entry.text,
    unstable: !!entry.unstable || !!options.unstable,
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

function showNextRadio() {
  const next = radioState.queue.shift();
  if (!next) {
    radioState.text = "";
    radioState.timer = 0;
    radioState.unstable = false;
    radioState.burst = 0;
    return;
  }

  radioState.text = next.text;
  radioState.timer = clamp(9 + next.text.length * 0.07, 10.4, 19.6);
  radioState.unstable = !!next.unstable;
  radioState.burst = radioState.unstable ? 1.7 : 0;
  playRadioOpenSound();
}

function updateRadio(dt) {
  radioState.burst = Math.max(0, radioState.burst - dt);

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
  x: 282,
  y: 724,
  startX: -148,
  startY: 844,
  targetX: 282,
  targetY: 724,
  visible: chapterState.xavorArrived,
  arrival: chapterState.xavorArrived && !forceVanArrival ? 1 : 0,
  skid: forceVanArrival ? 1 : 0,
  soundPlayed: chapterState.xavorArrived && !forceVanArrival,
};

const radioState = {
  speaker: "Xavor Glitch",
  text: "",
  timer: 0,
  queue: [],
  unstable: false,
  burst: 0,
};

const delayedUnknownRadioIntro = {
  active:
    !chapterState.argosHackDefeated &&
    !chapterState.finalRewardClaimed &&
    !chapterState.xavorIntroduced &&
    !chapterState.xavorArrived &&
    defeatedExteriorDroneCount() === 0,
  timer: 30,
  triggered: false,
};

const delayedUnknownRadioLines = [
  "Hola... chhhsss... 1, 2, 1, 2... ¿me recibes?... No hagas como que no me recibes porque sé qué sí me estás recibiendo...",
  "Xavor por radio: Torre 4B sigue cerrada. Date una vuelta, mira el ordenador azul y limpia la zona.",
  "Veo tres drones de ronda. Cada uno lleva recompensa. Si parecen poca cosa... eso dicen todas.",
];

function maybeTriggerDelayedUnknownRadioIntro(dt) {
  if (!delayedUnknownRadioIntro.active || delayedUnknownRadioIntro.triggered) return;
  delayedUnknownRadioIntro.timer = Math.max(0, delayedUnknownRadioIntro.timer - dt);
  if (delayedUnknownRadioIntro.timer > 0) return;
  delayedUnknownRadioIntro.triggered = true;
  delayedUnknownRadioIntro.active = false;
  queueRadio(delayedUnknownRadioLines, { unstable: true });
}

const xavorPresentation = {
  active: false,
  page: 0,
  pages: [
    {
      kicker: "Presentacion",
      title: "Xavor Glitch",
      subtitle: "Tecnico de frontera · Restaurador de sistemas muertos",
      text: "La furboneta se detiene como si hubiera esquivado a la muerte por costumbre. Xavor Glitch baja entre cables, monitores abiertos y una sonrisa demasiado tranquila para alguien que sabe leer una ruina encendida.",
    },
    {
      kicker: "Pasado de Argos",
      title: "El fallo correcto",
      subtitle: "Reles, nodos y protocolos secundarios",
      text: "Antes de La Caida trabaje donde nadie mira: rutas de enlace, filtros de senal, identificadores encubiertos. Argos no solo ordenaba el mundo; lo sellaba. Yo aprendi a dejar grietas pequenas para que alguien pudiera respirar.",
    },
    {
      kicker: "Lore PoCoBOT",
      title: "La baraja encontrada",
      subtitle: "La interfaz humana que sobrevivio al metal",
      text: "Hace anos aparecio una baraja vieja con el nombre Baraja para Poker. Nadie sabia jugar a ese poker, pero sus cuatro palos, figuras y ases eran perfectos para configurar mechas sin exigir robotica. Picas, corazones, treboles, diamantes: una lengua sencilla para que un humano no desapareciera dentro de la maquina.",
    },
    {
      kicker: "Mision",
      title: "Restaurar transmisiones",
      subtitle: "Torre de Seguimiento 4B",
      text: "La Caida apago casi todo: voces humanas, rutas de auxilio, avisos de frontera. Incluso Argos quedo ciego en muchas zonas y ahora intenta reconstruirse tras el conflicto de hace dos anos. Para restablecer transmisiones hay que llegar al panel de control superior y tumbar la inteligencia artificial que lo domina.",
    },
    {
      kicker: "Siguiente paso",
      title: "Hackeo preparado",
      subtitle: "Ordenador azul del escenario",
      text: "De momento la puerta esta cerrada. Eso dicen todas... pero yo puedo abrir una grieta desde la furboneta y desbloquear el ordenador azul que mantiene la compuerta cerrada. Tu solo ve hasta el terminal, activa el desbloqueo y sube.",
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

async function loadAssets() {
  const [
    mapImage,
    mapDoorOpenImage,
    xavorBackdropImage,
    xavorPortraitImage,
    xavorVanImage,
    exteriorDroneImage,
    ...botFrames
  ] = await Promise.all([
    loadImage("./assets/torre-seguimiento-4b-rendered-map.png"),
    loadImage("./assets/torre-seguimiento-4b-door-open-map.png"),
    loadImage("../low/torre_4b_compacta.webp"),
    loadImage("../Brutos/transparent/XAVORpresentacion-transparent.png"),
    loadImage("./assets/chapter/xavor-van.png"),
    loadImage("./assets/chapter/argos-patrol-drone.png"),
    ...leanFrameSources.map((source) => loadImage(source)),
  ]);

  assets.map = mapImage;
  assets.mapDoorOpen = mapDoorOpenImage;
  assets.xavorBackdrop = xavorBackdropImage;
  assets.xavorPortrait = xavorPortraitImage;
  assets.xavorVan = xavorVanImage;
  assets.exteriorDrone = exteriorDroneImage;
  assets.botFrames = botFrames;
  assets.ready = true;
  snapCameraToPlayer();
  startChapterMusic();

  const defeatedCount = defeatedExteriorDroneCount();
  if (chapterState.argosHackDefeated && !chapterState.finalRewardClaimed) {
    queueRadio([
      "Xavor: ahi estas! Vuelve a la furboneta. Tengo una recompensa y un discurso muy corto, que ya es raro en mi.",
    ]);
  } else if (chapterState.finalRewardClaimed) {
    queueRadio([
      "Xavor: Torre 4B vuelve a transmitir y tu inventario ya tiene ese 7 de corazones. Bonito final para un dia feo.",
    ]);
  } else if (defeatedCount === 0 && !delayedUnknownRadioIntro.active) {
    queueRadio([
      "Xavor por radio: Torre 4B sigue cerrada. Date una vuelta, mira el ordenador azul y limpia la zona.",
      "Veo tres drones de ronda. Cada uno lleva recompensa. Si parecen poca cosa... eso dicen todas.",
    ]);
  } else if (!chapterState.xavorIntroduced) {
    queueRadio([
      "Xavor por radio: furboneta en posicion. Acercate y te cuento por que esa torre importa.",
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
    setInteractionMessage("La puerta ya esta abierta. Entra cuando quieras.", 2.8);
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
  return chapterState.xavorArrived && defeatedExteriorDroneCount() > 0;
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
  setInteractionMessage("Xavor ha enlazado la furboneta al ordenador azul. Ya puedes hackear la puerta.", 4.6);
  queueRadio([
    "Xavor: ordenador preparado. Ve al terminal azul y pulsa E. Si Argos dice que no... bueno, eso dicen todas.",
  ]);
  postStoryTutorialAction("xavor-introduction", {
    unlocks: ["blue-computer"],
    lore: "cards-as-human-readable-mecha-configuration",
  });
}

function completeMissionWithXavor() {
  const rewardCard = {
    id: "tower-4b-7-hearts",
    value: "7",
    suit: "hearts",
    label: "7 de corazones",
    source: "Torre de Seguimiento 4B",
  };
  const inventoryRewards = Array.isArray(chapterState.inventoryRewards)
    ? [...chapterState.inventoryRewards]
    : [];

  if (!inventoryRewards.includes(rewardCard.id)) {
    inventoryRewards.push(rewardCard.id);
  }

  patchChapterState({
    missionComplete: true,
    finalRewardClaimed: true,
    inventoryRewards,
  });

  setInteractionMessage("Mision completada. Xavor entrega una carta 7 de corazones para tu inventario.", 5.2);
  queueRadio([
    "Xavor: transmisiones restauradas, Argos humillado y mi furboneta sigue entera. Te has ganado esto.",
    "Xavor: carta 7 de corazones para tu inventario. No preguntes por que la tenia en la guantera... eso dicen todas.",
  ]);
  postStoryTutorialAction("tower-4b-mission-complete", {
    reward: {
      card: rewardCard,
      inventoryId: rewardCard.id,
    },
    missionComplete: true,
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

  if (storyEmbedMode || window.parent !== window) {
    delayedUnknownRadioIntro.active = false;
    delayedUnknownRadioIntro.triggered = true;
    drone.combatCooldown = 2.2;
    setInteractionMessage(`${drone.label}: combate tematico detectado. Entrando a modo historia...`, 3.4);
    queueRadio([
      `Xavor: ${drone.label.toLowerCase()} mantiene un mazo casi normal, pero de ${drone.suitTheme} solo conserva una carta. El dron ya esta montado; tu tendras que levantar el PoCoBOT desde cero.`,
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
    exteriorDroneDefeatedIds: defeatedIds,
    exteriorDroneDefeated: true,
    xavorArrived: wasFirstVictory ? true : chapterState.xavorArrived,
    coins: chapterState.coins + 1,
  });

  if (wasFirstVictory) {
    xavorVan.visible = true;
    xavorVan.arrival = 0;
    xavorVan.skid = 1;
    playVanArrivalSound();
    setInteractionMessage("Primer dron vencido. La furboneta de Xavor entra derrapando entre chispas.", 5.2);
    queueRadio([
      "Xavor: bonita limpieza. Llego con discrecion absoluta: motor, neon, derrape y cero verguenza.",
      "Acercate a la furboneta. Te explico lo de las cartas, la torre y por que Argos se va a enfadar.",
    ]);
  } else {
    setInteractionMessage(`${drone.label} vencido. Recompensa: 1 moneda PoCoBOT.`, 4.2);
    queueRadio([
      `Xavor: ${drone.label.toLowerCase()} fuera. Otra moneda para la causa.`,
    ]);
  }

  postStoryTutorialAction("exterior-drone-combat", {
    enemyId: drone.enemyId,
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

  if (!chapterState.redGlowClaimed) {
    const glowDistance = Math.hypot(player.x - redGlowCache.x, player.y - redGlowCache.y);
    if (glowDistance < player.radius + redGlowCache.radius * 0.42) {
      claimRedGlowCache();
    }
  }

  xavorVan.visible = shouldShowXavorVan();
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
  const localVelocity = worldVectorToLocal(player.vx, player.vy);
  const sideSlip = clamp(localVelocity.x / player.maxSpeed, -1, 1);
  const forwardSlip = clamp(localVelocity.y / player.maxSpeed, -1, 1);

  const desiredLean = hasInput ? clamp(0.62 + speedRatio * 0.46, 0, 1) : speedRatio * 0.36;
  player.leanAmount = damp(player.leanAmount, desiredLean, hasInput ? 8.5 : 4.2, dt);
  player.leanSide = damp(player.leanSide, sideSlip, 7, dt);
  player.flameSkewX = damp(player.flameSkewX, -sideSlip * 22, 10, dt);
  player.flameSkewY = damp(player.flameSkewY, -forwardSlip * 12, 10, dt);

  const desiredThrustPower = hasInput ? 0.62 + speedRatio * 0.48 : speedRatio * 0.28;
  player.thrustPower = damp(player.thrustPower, desiredThrustPower, hasInput ? 12 : 4.8, dt);
  player.thrustCycle += dt * (8 + glideSpeed * 0.035);
  player.glow += dt * 3.2;
  updateChapterActors(dt);
  emitVanArrivalSmoke(dt);
  updateExhaustParticles(dt, hasInput, speedRatio);
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
}

function drawMap() {
  ctx.drawImage(assets.map, 0, 0, world.width, world.height);

  if (towerState.doorBlend > 0.01) {
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
            ? "El ordenador azul esta bloqueado. Xavor aun no ha enlazado su furboneta al terminal."
            : "El ordenador azul esta ahi, pero no responde. Primero explora la zona y despeja los drones.";
          queueRadio([
            chapterState.xavorArrived
              ? "Xavor por radio: acercate a la furboneta primero. El hackeo no se improvisa... bueno, casi nunca."
              : "Xavor por radio: todavia no, campeon. Primero limpia la zona de drones y luego hablamos de hackeos.",
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

          message = "Xavor: recompensa entregada, transmisiones vivas y furboneta sin explotar. Final elegante.";
          setInteractionMessage(message, 3.8);
          input.interactQueued = false;
          return;
        }

        if (!chapterState.xavorIntroduced) {
          beginXavorPresentation();
          input.interactQueued = false;
          return;
        }

        message = "Xavor: el ordenador ya esta preparado. Ve al terminal azul y abre la puerta.";
      }

      if (nearest.id === "tower-door") {
        if (!towerState.doorOpen) {
          message = "La puerta sigue cerrada. Necesitas que Xavor hackee el ordenador azul.";
        } else {
          setInteractionMessage(message, 2.4);
          postStoryTutorialAction("enter-interior", {
            nextScene: "torre-seguimiento-4b-interior-baja",
          });
          navigateToScene("../torre-seguimiento-4b-interior-baja/index.html");
          input.interactQueued = false;
          return;
        }
      }

      setInteractionMessage(message, 3.4);
      postStoryTutorialAction(nearest.id, { doorOpen: towerState.doorOpen });
    } else {
      setInteractionMessage("Acercate al ordenador azul, a la furboneta, a la puerta o a la pasarela.", 2.4);
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
  const firstIndex = Math.floor(framePosition);
  const secondIndex = Math.min(frames.length - 1, firstIndex + 1);
  const blend = framePosition - firstIndex;

  if (firstIndex === secondIndex) {
    drawMechaFrame(frames[firstIndex], 0.97);
    return;
  }

  drawMechaFrame(frames[firstIndex], 0.97);
  drawMechaFrame(frames[secondIndex], 0.97 * blend);
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
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawImageContain(image, x, y, width, height) {
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
  drawWrappedText(getRadioDisplayText(), x + 112, y + 56, width - 132, 20, 3);

  ctx.fillStyle = "rgba(255, 213, 95, 0.9)";
  ctx.font = "12px Trebuchet MS";
  ctx.fillText("Hilo narrativo activo", x + 112, y + 104);
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
    ? `Mision completada · Recompensa: 7 de corazones · Monedas: ${chapterState.coins}`
    : chapterState.argosHackDefeated
      ? `Vuelve a la furboneta de Xavor para cerrar la mision · Monedas: ${chapterState.coins}`
      : `Explora, derrota drones (${defeatedExteriorDroneCount()}/3) y hackea el ordenador azul · Monedas: ${chapterState.coins}`;
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
      ctx.fillText("El inventario historico tambien se actualiza.", panelX + 18, panelY + 84);
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

function drawLoading() {
  ctx.clearRect(0, 0, viewport.width, viewport.height);
  ctx.fillStyle = "#08111d";
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  const gradient = ctx.createLinearGradient(0, 0, viewport.width, viewport.height);
  gradient.addColorStop(0, "rgba(255, 181, 113, 0.18)");
  gradient.addColorStop(1, "rgba(146, 246, 255, 0.18)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  ctx.fillStyle = "#eef8ff";
  ctx.font = "28px Trebuchet MS";
  ctx.fillText("Cargando Torre de Seguimiento 4B...", 244, 265);

  ctx.fillStyle = "rgba(238, 248, 255, 0.72)";
  ctx.font = "16px Trebuchet MS";
  ctx.fillText("Activando radar, emisor y pasarelas de Argos", 286, 295);
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
    requestAnimationFrame(gameLoop);
  });
