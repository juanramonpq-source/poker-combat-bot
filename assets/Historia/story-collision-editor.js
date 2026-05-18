(function(){
  const STORAGE_KEY = "pocobot_story_collision_overrides_v1";
  const INTERACTION_STORAGE_KEY = "pocobot_story_interaction_overrides_v1";
  const VERSION = 1;

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function toFiniteNumber(value, fallback = 0){
    const next = Number(value);
    return Number.isFinite(next) ? next : fallback;
  }

  function normalizeZone(zone){
    if (!zone || typeof zone !== "object") return null;
    const type = ["circle", "ellipse", "poly"].includes(zone.type) ? zone.type : "rect";

    if (type === "circle") {
      const radius = Math.max(1, toFiniteNumber(zone.radius, 1));
      return {
        ...zone,
        type,
        x: toFiniteNumber(zone.x),
        y: toFiniteNumber(zone.y),
        radius,
      };
    }

    if (type === "ellipse") {
      return {
        ...zone,
        type,
        x: toFiniteNumber(zone.x),
        y: toFiniteNumber(zone.y),
        width: Math.max(1, toFiniteNumber(zone.width, 1)),
        height: Math.max(1, toFiniteNumber(zone.height, 1)),
      };
    }

    if (type === "poly") {
      const points = Array.isArray(zone.points)
        ? zone.points
            .map((point) => ({
              x: toFiniteNumber(point?.x),
              y: toFiniteNumber(point?.y),
            }))
            .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
        : [];
      if (points.length < 3) return null;
      return { ...zone, type, points };
    }

    return {
      ...zone,
      type,
      x: toFiniteNumber(zone.x),
      y: toFiniteNumber(zone.y),
      width: Math.max(1, toFiniteNumber(zone.width, 1)),
      height: Math.max(1, toFiniteNumber(zone.height, 1)),
    };
  }

  function normalizeZones(zones){
    if (!Array.isArray(zones)) return [];
    return zones.map(normalizeZone).filter(Boolean);
  }

  function normalizeInteractionPoint(point){
    if (!point || typeof point !== "object" || !point.id) return null;
    const scale = toFiniteNumber(point.scale, 1);
    const normalized = {
      id: String(point.id),
      x: toFiniteNumber(point.x),
      y: toFiniteNumber(point.y),
      radius: Math.max(1, toFiniteNumber(point.radius, 1)),
    };
    if (point.label) normalized.label = String(point.label);
    normalized.scale = Math.max(0.2, Math.min(3, scale));
    return normalized;
  }

  function normalizeInteractionPoints(points){
    if (!Array.isArray(points)) return [];
    return points.map(normalizeInteractionPoint).filter(Boolean);
  }

  function loadAll(){
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" && parsed.scenes
        ? parsed
        : { version: VERSION, updatedAt: 0, scenes: {} };
    } catch (error) {
      return { version: VERSION, updatedAt: 0, scenes: {} };
    }
  }

  function loadAllInteractions(){
    try {
      const parsed = JSON.parse(localStorage.getItem(INTERACTION_STORAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" && parsed.scenes
        ? parsed
        : { version: VERSION, updatedAt: 0, scenes: {} };
    } catch (error) {
      return { version: VERSION, updatedAt: 0, scenes: {} };
    }
  }

  function saveAll(data){
    const next = {
      version: VERSION,
      updatedAt: Date.now(),
      scenes: data?.scenes && typeof data.scenes === "object" ? data.scenes : {},
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function saveAllInteractions(data){
    const next = {
      version: VERSION,
      updatedAt: Date.now(),
      scenes: data?.scenes && typeof data.scenes === "object" ? data.scenes : {},
    };
    localStorage.setItem(INTERACTION_STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function getSceneOverride(sceneId){
    const stored = loadAll().scenes?.[sceneId];
    return Array.isArray(stored) ? normalizeZones(stored) : null;
  }

  function getSceneZones(sceneId, fallbackZones){
    return clone(getSceneOverride(sceneId) || normalizeZones(fallbackZones));
  }

  function saveSceneZones(sceneId, zones){
    const data = loadAll();
    data.scenes = data.scenes || {};
    data.scenes[sceneId] = normalizeZones(zones);
    return saveAll(data);
  }

  function clearSceneZones(sceneId){
    const data = loadAll();
    if (data.scenes) delete data.scenes[sceneId];
    return saveAll(data);
  }

  function applySceneZones(sceneId, targetZones){
    if (!Array.isArray(targetZones)) return targetZones;
    const override = getSceneOverride(sceneId);
    if (override) {
      targetZones.splice(0, targetZones.length, ...override);
    }
    return targetZones;
  }

  function getSceneInteractionOverride(sceneId){
    const stored = loadAllInteractions().scenes?.[sceneId];
    return Array.isArray(stored) ? normalizeInteractionPoints(stored) : null;
  }

  function applyPhysicalInteractionPoints(targetPoints, overridePoints){
    if (!Array.isArray(targetPoints) || !Array.isArray(overridePoints)) return targetPoints;
    const byId = new Map(overridePoints.map((point) => [point.id, point]));
    targetPoints.forEach((point) => {
      const override = byId.get(String(point.id));
      if (!override) return;
      point.x = override.x;
      point.y = override.y;
      point.radius = override.radius;
      if (override.label) point.label = override.label;
      if (Number.isFinite(override.scale)) point.scale = override.scale;
    });
    return targetPoints;
  }

  function getSceneInteractionPoints(sceneId, fallbackPoints){
    const points = clone(Array.isArray(fallbackPoints) ? fallbackPoints : []);
    return applyPhysicalInteractionPoints(points, getSceneInteractionOverride(sceneId) || []);
  }

  function saveSceneInteractionPoints(sceneId, points){
    const data = loadAllInteractions();
    data.scenes = data.scenes || {};
    data.scenes[sceneId] = normalizeInteractionPoints(points);
    return saveAllInteractions(data);
  }

  function clearSceneInteractionPoints(sceneId){
    const data = loadAllInteractions();
    if (data.scenes) delete data.scenes[sceneId];
    return saveAllInteractions(data);
  }

  function applySceneInteractionPoints(sceneId, targetPoints){
    return applyPhysicalInteractionPoints(targetPoints, getSceneInteractionOverride(sceneId) || []);
  }

  window.PoCoBOTStoryCollisionEditor = {
    STORAGE_KEY,
    INTERACTION_STORAGE_KEY,
    normalizeZones,
    normalizeInteractionPoints,
    getSceneZones,
    saveSceneZones,
    clearSceneZones,
    applySceneZones,
    getSceneInteractionPoints,
    saveSceneInteractionPoints,
    clearSceneInteractionPoints,
    applySceneInteractionPoints,
    loadAll,
    loadAllInteractions,
  };
})();
