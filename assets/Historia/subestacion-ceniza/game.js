const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const mapButton = document.getElementById("story-map-button");
const substationMusic = document.getElementById("substation-music");

const objectiveTitle = document.getElementById("objective-title");
const objectiveCopy = document.getElementById("objective-copy");
const statusRoom = document.getElementById("status-room");
const statusCharges = document.getElementById("status-charges");
const statusPatrols = document.getElementById("status-patrols");
const statusAlert = document.getElementById("status-alert");
const interactPrompt = document.getElementById("interact-prompt");
const alertBanner = document.getElementById("alert-banner");
const toastEl = document.getElementById("toast");

const storyParams = new URLSearchParams(window.location.search);
const storyEmbedMode = storyParams.get("story_embed") === "1";
const storyReturnUrl = storyParams.get("story_return") || "";
const storyAudioMode = storyParams.get("story_audio") || "internal";
const storyLoadId = storyParams.get("story_load_id") || `subestacion-${Date.now()}`;
const requestedSceneKey = storyParams.get("story_sub_scene") || "hub";

const sceneApi = window.PoCoBOTSubestacionScenes;
if (!sceneApi) throw new Error("PoCoBOTSubestacionScenes no está disponible.");

const SUBESTACION_PROGRESS_KEY = "pocobot-story-subestacion-ceniza-progress-v1";
const SUBESTACION_ACTION_TYPE = "pocobot-story-subestacion-action";
const SUBESTACION_COMBAT_MISSION_ID = "subestacion_ceniza_patrol";
const DETECTION_FOV_HALF = Math.PI * 0.28;
const DETECTION_HARD_RADIUS_RATIO = 0.54;
const PATROL_COMBAT_DELAY_MS = 720;
const COMBAT_GRACE_MS = 2600;

const viewport = {
  width: canvas.width,
  height: canvas.height,
  dpr: Math.max(1, window.devicePixelRatio || 1),
};

const world = {
  width: 1536,
  height: 1024,
};

const camera = {
  x: 0,
  y: 0,
  zoom: 1.6,
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
  x: 770,
  y: 890,
  radius: 24,
  vx: 0,
  vy: 0,
  maxSpeed: 248,
  acceleration: 980,
  drag: 6.2,
  spriteWidth: 132,
  facing: "up",
};

const assets = {
  backgrounds: {},
  mechSheet: null,
  backFrame: null,
  sideFrames: [],
  hoverFrames: [],
};

const playerVisualFrameSources = window.PoCoBOTPlayerVisual?.assetSources("../shared-mecha-orientation/assets");
let playerVisual = null;
let currentScene = null;
let currentInteractions = [];
let currentCollisionZones = [];
let currentEnemies = [];
let activeInteractable = null;
let toastUntil = 0;
let animationHandle = 0;
let lastFrameTime = 0;

const state = {
  currentSceneKey: requestedSceneKey,
  chargesPlaced: { alpha: false, beta: false, gamma: false },
  chargeScenesTriggered: { alpha: false, beta: false, gamma: false },
  aftermathTriggered: false,
  combatPending: false,
  combatGraceUntil: 0,
  alertLabel: "Sigilo",
  promptOverride: "",
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function damp(current, target, smoothing, dt) {
  return current + (target - current) * (1 - Math.exp(-smoothing * dt));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function showToast(message, duration = 1500) {
  if (!toastEl) return;
  toastEl.hidden = false;
  toastEl.textContent = message;
  toastUntil = performance.now() + duration;
}

function hideToastIfNeeded(now = performance.now()) {
  if (!toastEl || toastEl.hidden) return;
  if (now < toastUntil) return;
  toastEl.hidden = true;
}

function postSubestacionAction(action, payload = {}) {
  const message = {
    type: SUBESTACION_ACTION_TYPE,
    action,
    loadId: storyLoadId,
    currentSceneKey: state.currentSceneKey,
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

function readSavedProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SUBESTACION_PROGRESS_KEY) || "{}");
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
    currentSceneKey: state.currentSceneKey,
    chargesPlaced: state.chargesPlaced,
    chargeScenesTriggered: state.chargeScenesTriggered,
    aftermathTriggered: state.aftermathTriggered,
    combatGraceMs: Math.max(0, Math.round(state.combatGraceUntil - performance.now())),
    player: {
      x: Math.round(player.x),
      y: Math.round(player.y),
      facing: player.facing,
    },
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(SUBESTACION_PROGRESS_KEY, JSON.stringify(payload));
  } catch (error) {}
}

function clearProgress() {
  try {
    const saved = readSavedProgress();
    if (saved) localStorage.removeItem(SUBESTACION_PROGRESS_KEY);
  } catch (error) {}
}

function countPlacedCharges() {
  return ["alpha", "beta", "gamma"].filter((chargeId) => !!state.chargesPlaced[chargeId]).length;
}

function hasAllChargesPlaced() {
  return countPlacedCharges() >= 3;
}

function pointInSceneZone(point, zone) {
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

function isBlockedAt(x, y) {
  return currentCollisionZones.some((zone) => pointInSceneZone({ x, y }, zone));
}

function hasLineOfSight(fromX, fromY, toX, toY) {
  const distance = Math.hypot(toX - fromX, toY - fromY);
  const steps = Math.max(4, Math.ceil(distance / 28));
  for (let index = 1; index < steps; index += 1) {
    const ratio = index / steps;
    const sampleX = fromX + (toX - fromX) * ratio;
    const sampleY = fromY + (toY - fromY) * ratio;
    if (isBlockedAt(sampleX, sampleY)) return false;
  }
  return true;
}

function getSceneCameraZoom(width, height) {
  const portrait = height > width;
  if (portrait && width <= 720) return 1.2;
  const targetVisibleWorldWidth = width >= 1800 ? 740 : width >= 1280 ? 820 : 940;
  const targetVisibleWorldHeight = portrait ? 860 : 610;
  return clamp(Math.max(width / targetVisibleWorldWidth, height / targetVisibleWorldHeight), 1.08, 1.95);
}

function resizeCanvas() {
  const visualViewport = window.visualViewport;
  const width = Math.max(320, Math.round(visualViewport?.width || window.innerWidth || canvas.width));
  const height = Math.max(240, Math.round(visualViewport?.height || window.innerHeight || canvas.height));
  viewport.width = width;
  viewport.height = height;
  viewport.dpr = Math.max(1, window.devicePixelRatio || 1);
  camera.zoom = getSceneCameraZoom(width, height);
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
  return (0.74 + (player.y / Math.max(1, world.height)) * 0.18) * (1 / Math.max(1, camera.zoom)) * 0.94;
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
  const sceneKeys = sceneApi.getSceneKeys();
  const backgroundPromises = sceneKeys.map((sceneKey) => {
    const scene = sceneApi.getScene(sceneKey);
    return loadImage(sceneApi.runtimeAsset(scene.map.high)).then((image) => {
      assets.backgrounds[sceneKey] = image;
    });
  });

  const visualPromises = playerVisualFrameSources
    ? [
        loadImage(playerVisualFrameSources.back),
        ...playerVisualFrameSources.side.map((source) => loadImage(source)),
        ...playerVisualFrameSources.hover.map((source) => loadImage(source)),
      ]
    : [];

  const mechSheetPromise = loadImage(sceneApi.runtimeAsset("hoja_de_sprites_de_mech_industrial_web_1600.webp"));
  await Promise.all(backgroundPromises);
  const [mechSheet, ...visualFrames] = await Promise.all([
    mechSheetPromise,
    ...visualPromises,
  ]);

  assets.mechSheet = mechSheet;

  if (playerVisualFrameSources && visualFrames.length) {
    assets.backFrame = visualFrames[0];
    const sideStart = 1;
    assets.sideFrames = visualFrames.slice(sideStart, sideStart + playerVisualFrameSources.side.length);
    assets.hoverFrames = visualFrames.slice(sideStart + playerVisualFrameSources.side.length);
    createPlayerVisual();
  }
}

function getSceneWithOverrides(sceneKey) {
  const scene = sceneApi.getScene(sceneKey);
  currentCollisionZones = window.PoCoBOTStoryCollisionEditor?.getSceneZones(scene.id, scene.zones) || clone(scene.zones);
  currentInteractions = window.PoCoBOTStoryCollisionEditor?.getSceneInteractionPoints(scene.id, scene.interactions) || clone(scene.interactions);
  scene.zones = currentCollisionZones;
  scene.interactions = currentInteractions;
  return scene;
}

function buildEnemy(interaction) {
  const path = Array.isArray(interaction.path) && interaction.path.length
    ? clone(interaction.path)
    : [{ x: interaction.x, y: interaction.y }];
  const startPoint = path[0] || { x: interaction.x, y: interaction.y };
  return {
    id: interaction.id,
    label: interaction.label,
    x: startPoint.x,
    y: startPoint.y,
    radius: interaction.radius || 124,
    scale: interaction.scale || 0.78,
    prompt: interaction.prompt || "Mecha patrulla listo para combate",
    path,
    pathIndex: path.length > 1 ? 1 : 0,
    pathDirection: 1,
    speed: 92 + Math.random() * 18,
    walkTime: Math.random() * 2.8,
    facingX: 0,
    facingY: 1,
    dirX: 0,
    dirY: 1,
  };
}

function getSceneSpawn(scene, spawnKey, fallbackKey = "intro") {
  if (spawnKey && scene.spawnPoints?.[spawnKey]) return scene.spawnPoints[spawnKey];
  if (scene.spawnPoints?.[fallbackKey]) return scene.spawnPoints[fallbackKey];
  return Object.values(scene.spawnPoints || {})[0] || { x: world.width * 0.5, y: world.height * 0.5 };
}

function updateObjectiveUi() {
  if (!currentScene) return;
  if (hasAllChargesPlaced()) {
    if (state.currentSceneKey === "hub") {
      objectiveTitle.textContent = "Baliza de Mr. Wind lista";
      objectiveCopy.textContent = "Las tres cargas estan plantadas. Activa la baliza del hub para confirmar el sabotaje y salir de la subestacion.";
      return;
    }
    objectiveTitle.textContent = "Vuelve al hub";
    objectiveCopy.textContent = "Las tres cargas ya estan plantadas. Regresa al nodo central y envia la confirmacion a Mr. Wind.";
    return;
  }

  objectiveTitle.textContent = currentScene.objectiveTitle;
  objectiveCopy.textContent = currentScene.objectiveCopy;
}

function updateStatusUi() {
  statusRoom.textContent = currentScene?.shortLabel || "Hub";
  statusCharges.textContent = `${countPlacedCharges()}/3`;
  statusPatrols.textContent = String(currentEnemies.length);
  statusAlert.textContent = state.alertLabel;
  statusAlert.classList.toggle("is-danger", state.alertLabel !== "Sigilo");
  statusAlert.classList.toggle("is-ok", state.alertLabel === "Sigilo");
}

function loadScene(sceneKey, spawnKey = "", options = {}) {
  const nextScene = getSceneWithOverrides(sceneKey);
  currentScene = nextScene;
  state.currentSceneKey = nextScene.key;
  world.width = nextScene.width;
  world.height = nextScene.height;
  currentEnemies = nextScene.interactions
    .filter((interaction) => interaction.kind === "enemy")
    .map(buildEnemy);

  const restorePlayer = options.restorePlayer === true && options.playerPosition;
  const spawn = restorePlayer
    ? options.playerPosition
    : getSceneSpawn(nextScene, spawnKey, nextScene.key === "hub" ? "intro" : "from_hub");

  player.x = clamp(spawn.x, player.radius + 16, world.width - player.radius - 16);
  player.y = clamp(spawn.y, player.radius + 16, world.height - player.radius - 16);
  player.vx = 0;
  player.vy = 0;
  if (spawn.facing) player.facing = spawn.facing;
  activeInteractable = null;
  state.alertLabel = "Sigilo";
  state.combatPending = false;
  if (alertBanner) alertBanner.hidden = true;
  updateObjectiveUi();
  updateStatusUi();
  saveProgress();
}

function restoreProgress() {
  const saved = readSavedProgress();
  if (!saved) {
    loadScene(requestedSceneKey, requestedSceneKey === "hub" ? "intro" : "from_hub");
    return false;
  }

  state.chargesPlaced = {
    alpha: !!saved.chargesPlaced?.alpha,
    beta: !!saved.chargesPlaced?.beta,
    gamma: !!saved.chargesPlaced?.gamma,
  };
  state.chargeScenesTriggered = {
    alpha: !!saved.chargeScenesTriggered?.alpha,
    beta: !!saved.chargeScenesTriggered?.beta,
    gamma: !!saved.chargeScenesTriggered?.gamma,
  };
  state.aftermathTriggered = !!saved.aftermathTriggered;
  state.combatGraceUntil = performance.now() + Math.max(0, Number(saved.combatGraceMs) || 0);

  loadScene(saved.currentSceneKey || requestedSceneKey, "", {
    restorePlayer: true,
    playerPosition: {
      x: Number(saved.player?.x) || player.x,
      y: Number(saved.player?.y) || player.y,
      facing: typeof saved.player?.facing === "string" ? saved.player.facing : player.facing,
    },
  });
  return true;
}

function getSceneBackground() {
  return assets.backgrounds[state.currentSceneKey] || null;
}

function updateCamera() {
  const visibleWidth = viewport.width / camera.zoom;
  const visibleHeight = viewport.height / camera.zoom;
  camera.x = clamp(player.x - visibleWidth * 0.5, 0, Math.max(0, world.width - visibleWidth));
  camera.y = clamp(player.y - visibleHeight * 0.5, 0, Math.max(0, world.height - visibleHeight));
}

function constrainMovementPosition(x, y) {
  return {
    x: clamp(x, player.radius + 12, world.width - player.radius - 12),
    y: clamp(y, player.radius + 12, world.height - player.radius - 12),
  };
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
  player.vx = hasInput ? damp(player.vx, moveX * player.maxSpeed, 9, dt) : damp(player.vx, 0, player.drag, dt);
  player.vy = hasInput ? damp(player.vy, moveY * player.maxSpeed, 9, dt) : damp(player.vy, 0, player.drag, dt);

  let nextX = player.x + player.vx * dt;
  let nextY = player.y + player.vy * dt;
  const constrained = constrainMovementPosition(nextX, nextY);
  nextX = constrained.x;
  nextY = constrained.y;

  if (isBlockedAt(nextX, nextY)) {
    if (!isBlockedAt(nextX, player.y)) {
      nextY = player.y;
      player.vy = 0;
    } else if (!isBlockedAt(player.x, nextY)) {
      nextX = player.x;
      player.vx = 0;
    } else {
      nextX = player.x;
      nextY = player.y;
      player.vx = 0;
      player.vy = 0;
    }
  }

  player.x = nextX;
  player.y = nextY;
  if (Math.abs(player.vx) > Math.abs(player.vy)) player.facing = player.vx >= 0 ? "right" : "left";
  else if (Math.abs(player.vy) > 2) player.facing = player.vy >= 0 ? "down" : "up";

  if (playerVisual) {
    playerVisual.update(dt, hasInput, clamp(Math.hypot(player.vx, player.vy) / player.maxSpeed, 0, 1));
  }
}

function updateEnemy(enemy, dt) {
  const path = enemy.path || [];
  if (path.length > 1) {
    const target = path[enemy.pathIndex] || path[0];
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    const step = Math.min(distance, enemy.speed * dt);
    enemy.dirX = dx / distance;
    enemy.dirY = dy / distance;
    enemy.facingX = enemy.dirX;
    enemy.facingY = enemy.dirY;
    enemy.x += enemy.dirX * step;
    enemy.y += enemy.dirY * step;
    enemy.walkTime += dt * 7.4;

    if (distance <= 6) {
      if (enemy.pathIndex >= path.length - 1) enemy.pathDirection = -1;
      else if (enemy.pathIndex <= 0) enemy.pathDirection = 1;
      enemy.pathIndex += enemy.pathDirection;
      enemy.pathIndex = clamp(enemy.pathIndex, 0, path.length - 1);
    }
  } else {
    enemy.walkTime += dt * 1.8;
  }
}

function enemyCanSeePlayer(enemy) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const distance = Math.hypot(dx, dy);
  if (distance > enemy.radius) return false;
  if (distance <= enemy.radius * DETECTION_HARD_RADIUS_RATIO) return hasLineOfSight(enemy.x, enemy.y, player.x, player.y);
  const facingLength = Math.hypot(enemy.facingX || enemy.dirX || 0, enemy.facingY || enemy.dirY || 1) || 1;
  const facingX = (enemy.facingX || enemy.dirX || 0) / facingLength;
  const facingY = (enemy.facingY || enemy.dirY || 1) / facingLength;
  const dot = ((dx / Math.max(1, distance)) * facingX) + ((dy / Math.max(1, distance)) * facingY);
  if (dot < Math.cos(DETECTION_FOV_HALF)) return false;
  return hasLineOfSight(enemy.x, enemy.y, player.x, player.y);
}

function triggerPatrolCombat(enemy) {
  if (state.combatPending) return;
  state.combatPending = true;
  state.alertLabel = `Alerta ${enemy.label}`;
  updateStatusUi();
  alertBanner.hidden = false;
  alertBanner.textContent = `${enemy.label} te ha fijado. Panel enemigo ya montado para combate.`;
  state.combatGraceUntil = performance.now() + COMBAT_GRACE_MS;
  saveProgress();
  showToast("Deteccion confirmada. Mr. Wind te cubre la salida al duelo.", 1800);
  window.setTimeout(() => {
    postSubestacionAction("launch-patrol-combat", {
      mission: SUBESTACION_COMBAT_MISSION_ID,
    });
  }, PATROL_COMBAT_DELAY_MS);
}

function updateEnemies(dt) {
  currentEnemies.forEach((enemy) => {
    updateEnemy(enemy, dt);
    if (performance.now() >= state.combatGraceUntil && enemyCanSeePlayer(enemy)) {
      triggerPatrolCombat(enemy);
    }
  });
}

function getActiveInteractables() {
  return currentInteractions.filter((interaction) => {
    if (interaction.kind === "enemy") return true;
    if (interaction.kind === "charge" && state.chargesPlaced[interaction.chargeId]) return false;
    if (interaction.kind === "extract" && !hasAllChargesPlaced()) return false;
    return true;
  });
}

function updateNearestInteractable() {
  let best = null;
  let bestDistance = Infinity;
  getActiveInteractables().forEach((interaction) => {
    const anchor = interaction.kind === "enemy"
      ? currentEnemies.find((enemy) => enemy.id === interaction.id)
      : interaction;
    if (!anchor) return;
    const distance = Math.hypot(player.x - anchor.x, player.y - anchor.y);
    const reach = interaction.kind === "enemy" ? Math.max(74, interaction.radius * 0.62) : interaction.radius;
    if (distance <= reach && distance < bestDistance) {
      best = { ...interaction, x: anchor.x, y: anchor.y };
      bestDistance = distance;
    }
  });
  activeInteractable = best;
}

function updatePrompt() {
  if (!activeInteractable || state.combatPending) {
    interactPrompt.hidden = true;
    return;
  }
  let message = activeInteractable.prompt || activeInteractable.label || "";
  if (activeInteractable.kind === "door") message = `E · ${activeInteractable.prompt || activeInteractable.label}`;
  if (activeInteractable.kind === "charge") message = `E · ${activeInteractable.prompt || activeInteractable.label}`;
  if (activeInteractable.kind === "extract") message = hasAllChargesPlaced()
    ? "E · Confirmar sabotaje a Mr. Wind"
    : "Vuelve cuando las tres cargas esten plantadas";
  if (activeInteractable.kind === "enemy") message = "Mecha patrulla ya montado. Si te ve, iras a combate.";
  interactPrompt.hidden = !message;
  interactPrompt.textContent = message;
}

function handleChargeInteraction(interaction) {
  if (!interaction?.chargeId || state.chargesPlaced[interaction.chargeId]) return;
  state.chargesPlaced[interaction.chargeId] = true;
  state.chargeScenesTriggered[interaction.chargeId] = true;
  saveProgress();
  showToast(`Carga ${interaction.chargeId.toUpperCase()} colocada.`, 1500);
  updateObjectiveUi();
  updateStatusUi();
  if (interaction.sceneAction) {
    postSubestacionAction(interaction.sceneAction, {
      chargeId: interaction.chargeId,
    });
  }
}

function handleDoorInteraction(interaction) {
  if (!interaction?.targetScene) return;
  loadScene(interaction.targetScene, interaction.targetSpawn || "from_hub");
  showToast(interaction.label || "Movimiento entre ramales", 950);
}

function handleExtractInteraction() {
  if (!hasAllChargesPlaced() || state.aftermathTriggered) return;
  state.aftermathTriggered = true;
  saveProgress();
  showToast("Baliza enviada. Mr. Wind entra por radio.", 1200);
  postSubestacionAction("open-aftermath-scene");
}

function handleInteract() {
  if (!activeInteractable || state.combatPending) return;
  if (activeInteractable.kind === "door") {
    handleDoorInteraction(activeInteractable);
    return;
  }
  if (activeInteractable.kind === "charge") {
    handleChargeInteraction(activeInteractable);
    return;
  }
  if (activeInteractable.kind === "extract") {
    handleExtractInteraction();
    return;
  }
  if (activeInteractable.kind === "enemy") {
    showToast("No intentes tocar al centinela. Solo necesitas que no te vea.", 1300);
  }
}

function drawWorldBackground() {
  const image = getSceneBackground();
  if (!image) return;
  ctx.drawImage(image, 0, 0, world.width, world.height);
}

function drawInteractionMarker(interaction, options = {}) {
  const pulse = Math.sin((performance.now() * 0.004) + (options.phase || 0)) * 0.5 + 0.5;
  const x = options.x ?? interaction.x;
  const y = options.y ?? interaction.y;
  const radius = Math.max(22, (interaction.radius || 72) * (options.radiusScale || 0.45));
  const tone = options.tone || "cyan";
  const glowInner = tone === "danger" ? "rgba(255,130,90,0.55)" : tone === "amber" ? "rgba(255,190,110,0.52)" : "rgba(142,225,255,0.54)";
  const glowOuter = tone === "danger" ? "rgba(255,108,77,0)" : tone === "amber" ? "rgba(255,180,107,0)" : "rgba(142,225,255,0)";

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const gradient = ctx.createRadialGradient(x, y, 4, x, y, radius * (1.8 + pulse * 0.35));
  gradient.addColorStop(0, glowInner);
  gradient.addColorStop(1, glowOuter);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius * (1.24 + pulse * 0.12), 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = tone === "danger"
    ? `rgba(255,151,124,${0.62 + pulse * 0.2})`
    : tone === "amber"
      ? `rgba(255,223,162,${0.58 + pulse * 0.18})`
      : `rgba(210,245,255,${0.58 + pulse * 0.18})`;
  ctx.lineWidth = 2.2;
  ctx.setLineDash([8, 7]);
  ctx.lineDashOffset = -performance.now() * 0.018;
  ctx.beginPath();
  ctx.arc(x, y, radius * (0.84 + pulse * 0.06), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawDoor(interaction) {
  drawInteractionMarker(interaction, { tone: "cyan", radiusScale: 0.42 });
}

function drawCharge(interaction) {
  if (state.chargesPlaced[interaction.chargeId]) return;
  drawInteractionMarker(interaction, { tone: "amber", radiusScale: 0.48, phase: 1.1 });
}

function drawExtract(interaction) {
  if (!hasAllChargesPlaced()) return;
  drawInteractionMarker(interaction, { tone: "danger", radiusScale: 0.52, phase: 2.4 });
}

function drawEnemyCone(enemy, engaged = false) {
  const angle = Math.atan2(enemy.facingY || enemy.dirY || 1, enemy.facingX || enemy.dirX || 0);
  const radius = enemy.radius;
  const start = angle - DETECTION_FOV_HALF;
  const end = angle + DETECTION_FOV_HALF;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(enemy.x, enemy.y);
  ctx.arc(enemy.x, enemy.y, radius, start, end);
  ctx.closePath();
  const gradient = ctx.createRadialGradient(enemy.x, enemy.y, radius * 0.18, enemy.x, enemy.y, radius);
  if (engaged) {
    gradient.addColorStop(0, "rgba(255,118,88,0.34)");
    gradient.addColorStop(1, "rgba(255,118,88,0)");
  } else {
    gradient.addColorStop(0, "rgba(142,225,255,0.2)");
    gradient.addColorStop(1, "rgba(142,225,255,0)");
  }
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}

function drawEnemyStatusPanel(enemy) {
  const panelX = enemy.x + 48;
  const panelY = enemy.y - 88;
  ctx.save();
  ctx.translate(panelX, panelY);
  ctx.fillStyle = "rgba(9, 12, 17, 0.86)";
  ctx.strokeStyle = "rgba(255, 180, 107, 0.36)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-28, -16, 56, 32, 9);
  ctx.fill();
  ctx.stroke();

  const chips = [
    { label: "P", x: -16, tone: "#ffd7c2" },
    { label: "C", x: 0, tone: "#ffd7c2" },
    { label: "A", x: 16, tone: "#ffd7c2" },
  ];
  ctx.font = '900 10px "Trebuchet MS", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  chips.forEach((chip) => {
    ctx.fillStyle = chip.tone;
    ctx.fillText(chip.label, chip.x, -3);
  });
  ctx.fillStyle = "#8ee1ff";
  ctx.fillRect(-20, 7, 40, 4);
  ctx.restore();
}

function drawEnemy(enemy) {
  const engaged = !state.combatPending && performance.now() >= state.combatGraceUntil && enemyCanSeePlayer(enemy);
  drawEnemyCone(enemy, engaged);
  drawSoftShadow(enemy.x, enemy.y + 30, 28, 12, 0.3);

  if (assets.mechSheet) {
    const frameIndex = Math.floor(enemy.walkTime) % 8;
    const columns = 4;
    const frameWidth = 400;
    const frameHeight = 400;
    const sourceX = (frameIndex % columns) * frameWidth;
    const sourceY = Math.floor(frameIndex / columns) * frameHeight;
    const size = 118 * (enemy.scale || 0.78);
    const bob = Math.sin(enemy.walkTime * 0.8) * 3;
    ctx.save();
    ctx.translate(enemy.x, enemy.y + bob);
    if ((enemy.facingX || enemy.dirX || 0) < -0.08) ctx.scale(-1, 1);
    ctx.drawImage(
      assets.mechSheet,
      sourceX,
      sourceY,
      frameWidth,
      frameHeight,
      -size * 0.52,
      -size * 0.78,
      size,
      size
    );
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.fillStyle = "#3d4654";
    ctx.strokeStyle = "#8ee1ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-22, -32, 44, 64, 10);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawEnemyStatusPanel(enemy);
}

function drawPlayer() {
  drawSoftShadow(player.x, player.y + 28, 28, 10, 0.32);
  if (playerVisual) {
    playerVisual.draw();
    return;
  }
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = "#cceaff";
  ctx.strokeStyle = "#1a3242";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-20, -28, 40, 56, 12);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawSceneInteractions() {
  currentInteractions.forEach((interaction) => {
    if (interaction.kind === "door") drawDoor(interaction);
    else if (interaction.kind === "charge") drawCharge(interaction);
    else if (interaction.kind === "extract") drawExtract(interaction);
  });
}

function render() {
  ctx.clearRect(0, 0, viewport.width, viewport.height);
  updateCamera();
  ctx.save();
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
  drawWorldBackground();
  drawSceneInteractions();
  currentEnemies.forEach(drawEnemy);
  drawPlayer();
  ctx.restore();
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
  saveProgress();
  if (storyEmbedMode) {
    postSubestacionAction("return-map");
    return;
  }
  if (storyReturnUrl) {
    window.location.href = storyReturnUrl;
  }
}

function maybeStartMusic() {
  if (storyAudioMode !== "internal" || !substationMusic) return;
  const playPromise = substationMusic.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {});
  }
}

function update(dt) {
  if (!state.combatPending) {
    movePlayer(dt);
    updateEnemies(dt);
  }
  updateNearestInteractable();
  updatePrompt();
  if (input.interactQueued) {
    input.interactQueued = false;
    handleInteract();
  }
  hideToastIfNeeded();
  render();
}

function loop(now) {
  if (!lastFrameTime) lastFrameTime = now;
  const dt = clamp((now - lastFrameTime) / 1000, 0.001, 0.032);
  lastFrameTime = now;
  update(dt);
  animationHandle = requestAnimationFrame(loop);
}

function bindEvents() {
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("keydown", (event) => handleKey(event, true));
  window.addEventListener("keyup", (event) => handleKey(event, false));
  window.addEventListener("blur", clearPointerActive, { passive: true });
  window.addEventListener("beforeunload", saveProgress);

  canvas.addEventListener("pointerdown", (event) => {
    canvas.setPointerCapture?.(event.pointerId);
    setPointerActive(event);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!input.pointerActive || input.pointerId !== event.pointerId) return;
    worldPointerDirection(event.clientX, event.clientY);
  });
  canvas.addEventListener("pointerup", clearPointerActive);
  canvas.addEventListener("pointercancel", clearPointerActive);
  canvas.addEventListener("pointerleave", (event) => {
    if (input.pointerId === event.pointerId) clearPointerActive();
  });

  mapButton.addEventListener("click", attemptReturnToMap);
  document.body.addEventListener("pointerdown", maybeStartMusic, { passive: true });
  window.addEventListener("keydown", maybeStartMusic, { passive: true });
}

async function boot() {
  bindEvents();
  await loadAssets();
  restoreProgress();
  updateObjectiveUi();
  updateStatusUi();
  render();
  maybeStartMusic();
  animationHandle = requestAnimationFrame(loop);
}

boot().catch((error) => {
  console.error(error);
  objectiveTitle.textContent = "Error cargando Subestacion de Ceniza";
  objectiveCopy.textContent = "Revisa la consola o vuelve a abrir el capitulo.";
});
