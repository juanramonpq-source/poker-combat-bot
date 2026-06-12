(function registerSubestacionCenizaScenes(global) {
  const ASSET_DIR = "assets/Historia/subestacion-ceniza";
  const RUNTIME_PAGE = `${ASSET_DIR}/index.html`;
  const SCENE_KEYS = ["hub", "reactor", "cruce", "fundicion"];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function runtimeAsset(filename) {
    return `./${filename}`;
  }

  function editorAsset(filename) {
    return `${ASSET_DIR}/${filename}`;
  }

  const sceneCatalog = {
    hub: {
      key: "hub",
      id: "subestacion-ceniza-hub",
      label: "Subestacion de Ceniza · Hub principal",
      shortLabel: "Hub principal",
      map: {
        low: "fabrica_post_apocaliptica_en_ruinas_web_1080_ligera.webp",
        high: "fabrica_post_apocaliptica_en_ruinas_web_1600.webp",
      },
      width: 1536,
      height: 1024,
      spawnPoints: {
        intro: { x: 770, y: 890 },
        from_reactor: { x: 250, y: 166 },
        from_cruce: { x: 1288, y: 166 },
        from_fundicion: { x: 768, y: 900 },
        after_combat: { x: 770, y: 864 },
      },
      objectiveTitle: "Nodo central de distribucion",
      objectiveCopy: "Elige uno de los tres ramales, esquiva a los mechas patrulla y vuelve al hub cuando las tres cargas queden plantadas.",
      zones: [
        { type: "rect", x: 0, y: -72, width: 1536, height: 110 },
        { type: "rect", x: 0, y: 986, width: 1536, height: 120 },
        { type: "rect", x: -72, y: 0, width: 110, height: 1024 },
        { type: "rect", x: 1498, y: 0, width: 110, height: 1024 },
        { type: "ellipse", x: -56.85536159600997, y: -81.47992284762404, width: 286, height: 198 },
        { type: "ellipse", x: 1358.004987531172, y: -78.53223449646384, width: 286, height: 204 },
        { type: "ellipse", x: 288, y: 56, width: 273, height: 97 },
        { type: "ellipse", x: 549, y: 43, width: 355, height: 139 },
        { type: "ellipse", x: 512, y: 97, width: 124, height: 110 },
        { type: "ellipse", x: 483, y: 168, width: 145, height: 120 },
        { type: "ellipse", x: 862, y: 36, width: 164, height: 102 },
        { type: "ellipse", x: 1108, y: 31, width: 189, height: 144 },
        { type: "ellipse", x: 1094, y: 209, width: 53, height: 48 },
        { type: "ellipse", x: 983, y: 271, width: 80, height: 123 },
        { type: "ellipse", x: 1120, y: 147, width: 65, height: 75 },
        { type: "ellipse", x: 1037, y: 235, width: 66, height: 64 },
        { type: "ellipse", x: 1356, y: 404, width: 152, height: 185 },
        { type: "ellipse", x: 1220, y: 531, width: 302, height: 456 },
        { type: "ellipse", x: 1110, y: 741, width: 185, height: 256 },
        { type: "ellipse", x: 556, y: 925, width: 402, height: 99 },
        { type: "ellipse", x: 956, y: 930, width: 165, height: 63 },
        { type: "ellipse", x: 34, y: 615, width: 144, height: 385 },
        { type: "ellipse", x: 147, y: 749, width: 208, height: 275 },
        { type: "ellipse", x: 316, y: 872, width: 215, height: 152 },
        { type: "ellipse", x: 15, y: 427, width: 128, height: 205 },
        { type: "ellipse", x: 39, y: 339, width: 110, height: 120 },
        { type: "ellipse", x: 130, y: 496, width: 93, height: 100 },
        { type: "ellipse", x: 294, y: 355, width: 66, height: 73 },
        { type: "ellipse", x: 473, y: 268, width: 92, height: 67 },
        { type: "ellipse", x: 327, y: 402, width: 64, height: 40 },
        { type: "ellipse", x: 95, y: 383, width: 210, height: 148 },
      ],
      interactions: [
        {
          id: "hub-door-reactor",
          kind: "door",
          label: "Ramal oeste · Reactor",
          prompt: "Entrar al ramal del reactor",
          x: 168,
          y: 128,
          radius: 92,
          scale: 0.68,
          targetScene: "reactor",
          targetSpawn: "from_hub",
        },
        {
          id: "hub-door-cruce",
          kind: "door",
          label: "Ramal este · Barras de cruce",
          prompt: "Entrar al cruce de barras",
          x: 1366,
          y: 128,
          radius: 92,
          scale: 0.68,
          targetScene: "cruce",
          targetSpawn: "from_hub",
        },
        {
          id: "hub-door-fundicion",
          kind: "door",
          label: "Ramal sur · Fundicion",
          prompt: "Entrar a la fundicion",
          x: 768,
          y: 950,
          radius: 79,
          scale: 0.72,
          targetScene: "fundicion",
          targetSpawn: "from_hub",
        },
        {
          id: "hub-master-link",
          kind: "extract",
          label: "Baliza de Mr. Wind",
          prompt: "Enviar confirmacion a Mr. Wind",
          x: 766,
          y: 326,
          radius: 79,
          scale: 0.84,
          requiresAllCharges: true,
        },
        {
          id: "hub-patrol-a",
          kind: "enemy",
          label: "Mecha centinela A",
          prompt: "Mecha patrulla listo para combate",
          x: 472,
          y: 572,
          radius: 87,
          scale: 0.76,
          path: [
            { x: 472, y: 572 },
            { x: 540, y: 818 },
            { x: 834, y: 828 },
            { x: 854, y: 654 },
            { x: 622, y: 486 },
          ],
        },
        {
          id: "hub-patrol-b",
          kind: "enemy",
          label: "Mecha centinela B",
          prompt: "Mecha patrulla listo para combate",
          x: 1090,
          y: 594,
          radius: 97,
          scale: 0.8,
          path: [
            { x: 1090, y: 594 },
            { x: 1148, y: 318 },
            { x: 966, y: 212 },
            { x: 698, y: 214 },
            { x: 612, y: 448 },
            { x: 924, y: 604 },
          ],
        },
      ],
    },
    reactor: {
      key: "reactor",
      id: "subestacion-ceniza-reactor",
      label: "Subestacion de Ceniza · Reactor central",
      shortLabel: "Reactor central",
      map: {
        low: "central_reactor_en_complejo_industrial_web_1080_ligera.webp",
        high: "central_reactor_en_complejo_industrial_web_1600.webp",
      },
      width: 1536,
      height: 1024,
      spawnPoints: {
        from_hub: { x: 774, y: 938 },
        after_combat: { x: 782, y: 884 },
      },
      objectiveTitle: "Carga 1 · Reactor central",
      objectiveCopy: "Acercate al anillo interior, evita a los centinelas orbitales y planta la primera carga donde la red descarga mas energia.",
      zones: [
        { type: "rect", x: 0, y: -72, width: 1536, height: 110 },
        { type: "rect", x: 0, y: 986, width: 1536, height: 120 },
        { type: "rect", x: -72, y: 0, width: 110, height: 1024 },
        { type: "rect", x: 1498, y: 0, width: 110, height: 1024 },
        { type: "ellipse", x: 50, y: 750, width: 266, height: 274 },
        { type: "ellipse", x: 32, y: 263, width: 93, height: 567 },
        { type: "ellipse", x: 96, y: 684, width: 112, height: 174 },
        { type: "ellipse", x: 8, y: 15, width: 354, height: 150 },
        { type: "ellipse", x: 0, y: 134, width: 244, height: 168 },
        { type: "ellipse", x: 255, y: 36, width: 310, height: 48 },
        { type: "ellipse", x: 1022, y: 19, width: 251, height: 35 },
        { type: "ellipse", x: 1162, y: 11, width: 360, height: 136 },
        { type: "ellipse", x: 1349, y: 115, width: 187, height: 171 },
        { type: "ellipse", x: 1353, y: 759, width: 134, height: 265 },
        { type: "ellipse", x: 1078, y: 910, width: 403, height: 77 },
        { type: "ellipse", x: 1271, y: 802, width: 145, height: 164 },
        { type: "ellipse", x: 1433, y: 648, width: 71, height: 153 },
        { type: "ellipse", x: 713, y: 51, width: 127, height: 509 },
        { type: "ellipse", x: 653, y: 289, width: 96, height: 207 },
        { type: "ellipse", x: 826, y: 275, width: 63, height: 230 },
        { type: "ellipse", x: 632, y: 269, width: 69, height: 162 },
        { type: "ellipse", x: 824, y: 251, width: 71, height: 140 },
      ],
      interactions: [
        {
          id: "reactor-return",
          kind: "door",
          label: "Volver al hub",
          prompt: "Regresar al hub",
          x: 772,
          y: 962,
          radius: 92,
          scale: 0.72,
          targetScene: "hub",
          targetSpawn: "from_reactor",
        },
        {
          id: "charge-alpha",
          kind: "charge",
          chargeId: "alpha",
          label: "Carga alpha · Nucleo del reactor",
          prompt: "Colocar carga alpha",
          x: 772,
          y: 152,
          radius: 98,
          scale: 0.9,
          sceneAction: "open-alpha-scene",
        },
        {
          id: "reactor-patrol-a",
          kind: "enemy",
          label: "Orbital del reactor A",
          prompt: "Mecha patrulla listo para combate",
          x: 466,
          y: 516,
          radius: 124,
          scale: 0.78,
          path: [
            { x: 466, y: 516 },
            { x: 560, y: 768 },
            { x: 790, y: 838 },
            { x: 1038, y: 762 },
            { x: 1090, y: 488 },
            { x: 984, y: 260 },
            { x: 760, y: 206 },
            { x: 544, y: 278 },
          ],
        },
        {
          id: "reactor-patrol-b",
          kind: "enemy",
          label: "Orbital del reactor B",
          prompt: "Mecha patrulla listo para combate",
          x: 1028,
          y: 512,
          radius: 124,
          scale: 0.78,
          path: [
            { x: 1028, y: 512 },
            { x: 950, y: 770 },
            { x: 674, y: 764 },
            { x: 520, y: 504 },
            { x: 626, y: 258 },
            { x: 904, y: 246 },
          ],
        },
      ],
    },
    cruce: {
      key: "cruce",
      id: "subestacion-ceniza-cruce",
      label: "Subestacion de Ceniza · Barras de cruce",
      shortLabel: "Barras de cruce",
      map: {
        low: "central_cruce_en_una_planta_industrial_web_1080_ligera.webp",
        high: "central_cruce_en_una_planta_industrial_web_1600.webp",
      },
      width: 1536,
      height: 1024,
      spawnPoints: {
        from_hub: { x: 770, y: 942 },
        after_combat: { x: 770, y: 886 },
      },
      objectiveTitle: "Carga 2 · Cruce de barras",
      objectiveCopy: "Busca el transformador principal del ramal este. Aqui los mechas patrullan en lineas rectas y cortan el paso con rapidez.",
      zones: [
        { type: "rect", x: 0, y: -72, width: 1536, height: 110 },
        { type: "rect", x: 0, y: 986, width: 1536, height: 120 },
        { type: "rect", x: -72, y: 0, width: 110, height: 1024 },
        { type: "rect", x: 1498, y: 0, width: 110, height: 1024 },
      ],
      interactions: [
        {
          id: "cruce-return",
          kind: "door",
          label: "Volver al hub",
          prompt: "Regresar al hub",
          x: 772,
          y: 956,
          radius: 92,
          scale: 0.72,
          targetScene: "hub",
          targetSpawn: "from_cruce",
        },
        {
          id: "charge-beta",
          kind: "charge",
          chargeId: "beta",
          label: "Carga beta · Cruce de barras",
          prompt: "Colocar carga beta",
          x: 1186,
          y: 232,
          radius: 92,
          scale: 0.88,
          sceneAction: "open-beta-scene",
        },
        {
          id: "cruce-patrol-a",
          kind: "enemy",
          label: "Barrido este-oeste",
          prompt: "Mecha patrulla listo para combate",
          x: 354,
          y: 402,
          radius: 132,
          scale: 0.78,
          path: [
            { x: 354, y: 402 },
            { x: 764, y: 396 },
            { x: 1200, y: 392 },
            { x: 894, y: 528 },
            { x: 474, y: 534 },
          ],
        },
        {
          id: "cruce-patrol-b",
          kind: "enemy",
          label: "Barrido norte-sur",
          prompt: "Mecha patrulla listo para combate",
          x: 784,
          y: 212,
          radius: 128,
          scale: 0.78,
          path: [
            { x: 784, y: 212 },
            { x: 786, y: 476 },
            { x: 782, y: 812 },
            { x: 1086, y: 734 },
            { x: 1114, y: 456 },
          ],
        },
      ],
    },
    fundicion: {
      key: "fundicion",
      id: "subestacion-ceniza-fundicion",
      label: "Subestacion de Ceniza · Fundicion de paneles",
      shortLabel: "Fundicion",
      map: {
        low: "fabrica_distopica_con_maquinaria_industrial_web_1080_ligera.webp",
        high: "fabrica_distopica_con_maquinaria_industrial_web_1600.webp",
      },
      width: 1536,
      height: 1024,
      spawnPoints: {
        from_hub: { x: 1378, y: 876 },
        after_combat: { x: 1328, y: 846 },
      },
      objectiveTitle: "Carga 3 · Fundicion de paneles",
      objectiveCopy: "El ultimo punto esta dentro del laberinto tecnico. La maquina principal esta al norte y los mechas patrullan pasillos estrechos.",
      zones: [
        { type: "rect", x: 0, y: -72, width: 1536, height: 110 },
        { type: "rect", x: 0, y: 986, width: 1536, height: 120 },
        { type: "rect", x: -72, y: 0, width: 110, height: 1024 },
        { type: "rect", x: 1498, y: 0, width: 110, height: 1024 },
      ],
      interactions: [
        {
          id: "fundicion-return",
          kind: "door",
          label: "Volver al hub",
          prompt: "Regresar al hub",
          x: 1386,
          y: 954,
          radius: 92,
          scale: 0.72,
          targetScene: "hub",
          targetSpawn: "from_fundicion",
        },
        {
          id: "charge-gamma",
          kind: "charge",
          chargeId: "gamma",
          label: "Carga gamma · Bastidor principal",
          prompt: "Colocar carga gamma",
          x: 1160,
          y: 200,
          radius: 92,
          scale: 0.9,
          sceneAction: "open-gamma-scene",
        },
        {
          id: "fundicion-patrol-a",
          kind: "enemy",
          label: "Pasillo oeste",
          prompt: "Mecha patrulla listo para combate",
          x: 744,
          y: 614,
          radius: 124,
          scale: 0.78,
          path: [
            { x: 744, y: 614 },
            { x: 1040, y: 640 },
            { x: 1268, y: 550 },
            { x: 1206, y: 350 },
            { x: 920, y: 344 },
            { x: 722, y: 476 },
          ],
        },
        {
          id: "fundicion-patrol-b",
          kind: "enemy",
          label: "Pasillo sur",
          prompt: "Mecha patrulla listo para combate",
          x: 362,
          y: 702,
          radius: 126,
          scale: 0.78,
          path: [
            { x: 362, y: 702 },
            { x: 610, y: 868 },
            { x: 962, y: 858 },
            { x: 1322, y: 854 },
            { x: 1268, y: 648 },
            { x: 1016, y: 632 },
            { x: 700, y: 626 },
          ],
        },
      ],
    },
  };

  function getScene(sceneKey) {
    const key = SCENE_KEYS.includes(sceneKey) ? sceneKey : "hub";
    return clone(sceneCatalog[key]);
  }

  function getSceneKeys() {
    return SCENE_KEYS.slice();
  }

  function buildExplorationUrl(sceneKey = "hub", options = {}) {
    const base = options.baseUrl || (typeof window !== "undefined" ? window.location.href : "http://localhost/");
    const returnUrl = options.returnUrl || "";
    const url = new URL(RUNTIME_PAGE, base);
    url.searchParams.set("story_embed", options.storyEmbed === false ? "0" : "1");
    url.searchParams.set("story_node", options.storyNode || "subestacion");
    url.searchParams.set("story_audio", options.audioMode || "internal");
    url.searchParams.set("story_sub_scene", SCENE_KEYS.includes(sceneKey) ? sceneKey : "hub");
    url.searchParams.set("story_load_id", options.loadId || `subestacion-${Date.now()}`);
    if (returnUrl) url.searchParams.set("story_return", returnUrl);
    if (options.versionTag) url.searchParams.set("v", options.versionTag);
    return url.href;
  }

  function getCollisionEditorScenes(options = {}) {
    const baseUrl = options.baseUrl || (typeof window !== "undefined" ? window.location.href : "http://localhost/");
    const returnUrl = options.returnUrl || "";
    const versionTag = options.versionTag || "devtools-subestacion-ceniza";
    const loadId = options.loadId || `subestacion-devtools-${Date.now()}`;
    return SCENE_KEYS.map((sceneKey) => {
      const scene = sceneCatalog[sceneKey];
      return {
        id: scene.id,
        label: scene.label,
        map: editorAsset(scene.map.high),
        fallbackMap: editorAsset(scene.map.low),
        width: scene.width,
        height: scene.height,
        zones: clone(scene.zones),
        interactions: clone(scene.interactions),
        openUrl: () => buildExplorationUrl(sceneKey, {
          baseUrl,
          returnUrl,
          loadId,
          versionTag,
        }),
      };
    });
  }

  global.PoCoBOTSubestacionScenes = {
    ASSET_DIR,
    RUNTIME_PAGE,
    runtimeAsset,
    editorAsset,
    getScene,
    getSceneKeys,
    buildExplorationUrl,
    getCollisionEditorScenes,
  };
})(window);
