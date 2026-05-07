(function(){
  const STORAGE_KEY = "pocobot_story_collision_overrides_v1";
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
    const type = zone.type === "circle" || zone.type === "poly" ? zone.type : "rect";

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

  function saveAll(data){
    const next = {
      version: VERSION,
      updatedAt: Date.now(),
      scenes: data?.scenes && typeof data.scenes === "object" ? data.scenes : {},
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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

  window.PoCoBOTStoryCollisionEditor = {
    STORAGE_KEY,
    normalizeZones,
    getSceneZones,
    saveSceneZones,
    clearSceneZones,
    applySceneZones,
    loadAll,
  };
})();
