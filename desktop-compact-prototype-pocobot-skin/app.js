const phaseData = {
  montaje: {
    chip: "Montaje",
    status: "Montaje en curso",
    attackLimit: "0",
    fuelFormula: "0 x 2 = 0",
    projectile: "No",
    fuelCore: "02",
    tutorialTitle: "Montaje en curso",
    tutorialShort: "Coloca cartas en ataque, defensa, armadura y fuel. Esta vista enseña toda la lectura tactica sin depender del scroll.",
    tutorialLong: "Empieza llenando los modulos visibles. En PC esta vista muestra mano, rival y consola al mismo tiempo para acelerar decisiones."
  },
  robo: {
    chip: "Robo",
    status: "Diamantes listos para acelerar",
    attackLimit: "1",
    fuelFormula: "1 x 2 = 2",
    projectile: "No",
    fuelCore: "03",
    tutorialTitle: "Robo con diamantes",
    tutorialShort: "Los diamantes aumentan el combustible del panel y empujan el limite de ataque con picas.",
    tutorialLong: "Usa diamantes para alimentar el panel. Cada punto de fuel aumenta la ventana ofensiva y prepara la escalada del turno."
  },
  ataque: {
    chip: "Ataque",
    status: "Ataque habilitado",
    attackLimit: "2",
    fuelFormula: "2 x 2 = 4",
    projectile: "Cargado",
    fuelCore: "04",
    tutorialTitle: "Ataque abierto",
    tutorialShort: "Lee el panel rival y abre una secuencia de ataque cuando su defensa parezca corta.",
    tutorialLong: "Esta es la fase agresiva. Observa las cartas del rival, compara defensa y armadura y abre el ataque cuando el intercambio te favorezca.",
    attackFx: true
  },
  proyectil: {
    chip: "Proyectil",
    status: "Modo proyectil armado",
    attackLimit: "3",
    fuelFormula: "2 x 2 = 4",
    projectile: "Si",
    fuelCore: "04",
    tutorialTitle: "Modo proyectil",
    tutorialShort: "El proyectil remata a distancia. Activalo solo cuando el mecha ya tenga una base operativa estable.",
    tutorialLong: "El proyectil mete presion visual y tactica. Funciona mejor cuando ya has consolidado fuel y el rival no puede absorber el impacto completo.",
    attackFx: true
  },
  confirmacion: {
    chip: "Confirmacion",
    status: "Ataque listo para confirmar",
    attackLimit: "3",
    fuelFormula: "2 x 2 = 4",
    projectile: "Armado",
    fuelCore: "04",
    tutorialTitle: "Confirmar ataque",
    tutorialShort: "Confirma solo cuando la lectura de radar y modulos del rival te de una ventaja clara.",
    tutorialLong: "La confirmacion cierra la secuencia ofensiva. Asegurate de que el rival no conserve suficiente defensa o armadura para devolverte el turno.",
    attackFx: true
  },
  fin: {
    chip: "Fin de turno",
    status: "Esperando reaccion rival",
    attackLimit: "0",
    fuelFormula: "1 x 2 = 2",
    projectile: "En frio",
    fuelCore: "02",
    tutorialTitle: "Fin de turno",
    tutorialShort: "Pasa turno cuando no puedas mejorar tu lectura ni tu ataque sin sobreexponerte.",
    tutorialLong: "Cerrar turno tambien es una decision tactica. Deja el panel listo y fuerza al rival a jugar contra una posicion preparada."
  }
};

const rivalData = {
  1: {
    name: "Jugador 2",
    attackCount: "2/2",
    defense: "1",
    armor: "1",
    mount: "49%",
    mountBar: 49,
    fuel: "02",
    projectile: "No",
    projectileBar: 22,
    summary: "Parcial",
    detailCollapsed: "Se muestran modulos equipados y combustible visible. La mano y las futuras combinaciones siguen ocultas.",
    detailExpanded: "El rival ya tiene ataque funcional, una defensa ligera y combustible suficiente para presionar, pero su montaje aun es incompleto.",
    zones: {
      attack: [
        { src: "../assets/cards/hayeah-full/10_of_clubs.svg", alt: "Diez de treboles" },
        { src: "../assets/cards/hayeah-full/jack_of_clubs.svg", alt: "Jota de treboles" }
      ],
      defense: [
        { src: "../assets/cards/hayeah-full/7_of_hearts.svg", alt: "Siete de corazones" }
      ],
      armor: [
        { src: "../assets/cards/hayeah-full/4_of_spades.svg", alt: "Cuatro de picas" }
      ],
      fuel: [
        { src: "../assets/cards/hayeah-full/9_of_diamonds.svg", alt: "Nueve de diamantes" },
        { src: "../assets/cards/hayeah-full/10_of_diamonds.svg", alt: "Diez de diamantes" }
      ]
    }
  },
  2: {
    name: "Jugador 1",
    attackCount: "2/2",
    defense: "1",
    armor: "2",
    mount: "74%",
    mountBar: 74,
    fuel: "03",
    projectile: "Cargado",
    projectileBar: 84,
    summary: "Extendido",
    detailCollapsed: "Se muestran modulos equipados y combustible visible. La mano y las futuras combinaciones siguen ocultas.",
    detailExpanded: "Cabina estable, doble armadura montada y ataque consistente. El rival puede abrir una secuencia ofensiva fuerte si mantienes la guardia baja.",
    zones: {
      attack: [
        { src: "../assets/cards/hayeah-full/10_of_clubs.svg", alt: "Diez de treboles" },
        { src: "../assets/cards/hayeah-full/king_of_clubs.svg", alt: "Rey de treboles" }
      ],
      defense: [
        { src: "../assets/cards/hayeah-full/6_of_hearts.svg", alt: "Seis de corazones" }
      ],
      armor: [
        { src: "../assets/cards/hayeah-full/4_of_spades.svg", alt: "Cuatro de picas" },
        { src: "../assets/cards/hayeah-full/king_of_spades.svg", alt: "Rey de picas" }
      ],
      fuel: [
        { src: "../assets/cards/hayeah-full/10_of_diamonds.svg", alt: "Diez de diamantes" },
        { src: "../assets/cards/hayeah-full/queen_of_diamonds.svg", alt: "Reina de diamantes" }
      ]
    }
  }
};

const stageBars = {
  1: 74,
  2: 49
};

const phaseChip = document.querySelector("[data-phase-chip]");
const statusText = document.querySelector("[data-status-text]");
const attackLimit = document.querySelector("[data-attack-limit]");
const fuelFormula = document.querySelector("[data-fuel-formula]");
const projectileText = document.querySelector("[data-projectile-text]");
const selectionCount = document.querySelector("[data-selection-count]");
const fuelCore = document.querySelector("[data-fuel-core]");
const tutorialToggle = document.querySelector('[data-toggle="tutorial"]');
const rivalToggle = document.querySelector('[data-action="peek"]');
const rivalName = document.querySelector("[data-rival-name]");
const rivalAttackCount = document.querySelector("[data-rival-attack-count]");
const rivalDefense = document.querySelector("[data-rival-defense]");
const rivalArmor = document.querySelector("[data-rival-armor]");
const rivalMount = document.querySelector("[data-rival-mount]");
const rivalFuel = document.querySelector("[data-rival-fuel]");
const rivalProjectile = document.querySelector("[data-rival-projectile]");
const rivalReadout = document.querySelector("[data-rival-readout]");
const tutorialTitle = document.querySelector("[data-tutorial-title]");
const tutorialText = document.querySelector("[data-tutorial-text]");
const attackBeam = document.querySelector("[data-attack-beam]");

const rivalZoneNodes = {
  attack: document.querySelector('[data-rival-zone="attack"]'),
  defense: document.querySelector('[data-rival-zone="defense"]'),
  armor: document.querySelector('[data-rival-zone="armor"]'),
  fuel: document.querySelector('[data-rival-zone="fuel"]')
};

const rivalBarNodes = {
  mount: document.querySelector('[data-rival-bar="mount"]'),
  projectile: document.querySelector('[data-rival-bar="projectile"]')
};

const stageBarNodes = {
  1: document.querySelector('[data-stage-bar="1"]'),
  2: document.querySelector('[data-stage-bar="2"]')
};

const radarNodes = {
  1: document.querySelector('[data-radar="1"]'),
  2: document.querySelector('[data-radar="2"]')
};

const mechaNodes = {
  1: document.querySelector('[data-mecha="1"]'),
  2: document.querySelector('[data-mecha="2"]')
};

const phaseButtons = [...document.querySelectorAll("[data-phase]")];
const turnButtons = [...document.querySelectorAll("[data-turn]")];
const cards = [...document.querySelectorAll(".play-card")];

let currentTurn = "1";
let tutorialOn = false;
let rivalOpen = false;

function updateSelection() {
  const count = cards.filter((card) => card.classList.contains("is-selected")).length;
  selectionCount.textContent = `${count} carta${count === 1 ? "" : "s"}`;
}

function renderTutorial(phase) {
  const data = phaseData[phase];
  tutorialTitle.textContent = data.tutorialTitle;
  tutorialText.textContent = tutorialOn ? data.tutorialLong : data.tutorialShort;
}

function setPhase(phase) {
  const data = phaseData[phase];
  phaseChip.textContent = data.chip;
  statusText.textContent = data.status;
  attackLimit.textContent = data.attackLimit;
  fuelFormula.textContent = data.fuelFormula;
  projectileText.textContent = data.projectile;
  fuelCore.textContent = data.fuelCore;
  renderTutorial(phase);

  phaseButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.phase === phase);
  });

  if (data.attackFx) {
    triggerAttackFx();
  }
}

function renderZoneCards(container, cardsForZone) {
  container.innerHTML = "";

  if (!cardsForZone.length) {
    const empty = document.createElement("span");
    empty.className = "rival-card-empty";
    empty.textContent = "Vacio";
    container.append(empty);
    return;
  }

  cardsForZone.forEach((card) => {
    const image = document.createElement("img");
    image.className = "rival-card-thumb";
    image.src = card.src;
    image.alt = card.alt;
    container.append(image);
  });
}

function renderRivalPanel() {
  const data = rivalData[currentTurn];
  rivalName.textContent = data.name;
  rivalAttackCount.textContent = data.attackCount;
  rivalDefense.textContent = data.defense;
  rivalArmor.textContent = data.armor;
  rivalMount.textContent = data.mount;
  rivalFuel.textContent = data.fuel;
  rivalProjectile.textContent = data.projectile;
  rivalBarNodes.mount.style.width = `${data.mountBar}%`;
  rivalBarNodes.projectile.style.width = `${data.projectileBar}%`;

  Object.entries(rivalZoneNodes).forEach(([zone, node]) => {
    renderZoneCards(node, data.zones[zone]);
  });

  rivalReadout.innerHTML = `
    <span>Resumen</span>
    <strong>${rivalOpen ? data.summary : "Parcial"}</strong>
    <p>${rivalOpen ? data.detailExpanded : data.detailCollapsed}</p>
  `;
  rivalToggle.textContent = rivalOpen ? "Ocultar detalle rival" : "Ver panel rival";
  rivalToggle.classList.toggle("is-active", rivalOpen);
}

function setTurn(turn) {
  currentTurn = turn;
  turnButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.turn === turn);
  });
  renderRivalPanel();
}

function setTutorial(enabled) {
  tutorialOn = enabled;
  tutorialToggle.textContent = enabled ? "Tutorial ON" : "Tutorial OFF";
  tutorialToggle.classList.toggle("is-active", enabled);

  const activePhaseButton = phaseButtons.find((button) => button.classList.contains("is-active"));
  if (activePhaseButton) {
    renderTutorial(activePhaseButton.dataset.phase);
  }
}

function primeStageBars() {
  Object.entries(stageBarNodes).forEach(([player, node]) => {
    node.style.width = `${stageBars[player]}%`;
  });
}

function clearAttackFx() {
  attackBeam.classList.remove("is-firing", "from-left", "from-right");
  Object.values(radarNodes).forEach((node) => node.classList.remove("is-impact"));
  Object.values(mechaNodes).forEach((node) => node.classList.remove("is-hit"));
}

function triggerAttackFx() {
  const attacker = currentTurn;
  const target = currentTurn === "1" ? "2" : "1";

  clearAttackFx();

  attackBeam.classList.add(attacker === "1" ? "from-left" : "from-right");
  mechaNodes[target].classList.add("is-hit");
  radarNodes[target].classList.add("is-impact");

  void attackBeam.offsetWidth;
  attackBeam.classList.add("is-firing");

  window.setTimeout(() => {
    clearAttackFx();
  }, 780);
}

phaseButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setPhase(button.dataset.phase);
  });
});

turnButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setTurn(button.dataset.turn);
  });
});

tutorialToggle.addEventListener("click", () => {
  setTutorial(!tutorialOn);
});

rivalToggle.addEventListener("click", () => {
  rivalOpen = !rivalOpen;
  renderRivalPanel();
});

cards.forEach((card) => {
  card.addEventListener("click", () => {
    card.classList.toggle("is-selected");
    updateSelection();
  });
});

primeStageBars();
setTurn(currentTurn);
setTutorial(tutorialOn);
setPhase("montaje");
updateSelection();
