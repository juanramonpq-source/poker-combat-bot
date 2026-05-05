const phaseData = {
  montaje: {
    chip: "Montaje",
    status: "Construccion visible",
    attackLimit: "0",
    fuelFormula: "0 x 2 = 0",
    projectile: "No",
    fuelCore: "02"
  },
  robo: {
    chip: "Robo",
    status: "Diamantes listos para acelerar",
    attackLimit: "1",
    fuelFormula: "1 x 2 = 2",
    projectile: "No",
    fuelCore: "03"
  },
  ataque: {
    chip: "Ataque",
    status: "Selecciona combo y ventana de impacto",
    attackLimit: "2",
    fuelFormula: "2 x 2 = 4",
    projectile: "Cargado",
    fuelCore: "04"
  },
  proyectil: {
    chip: "Proyectil",
    status: "Ataque remoto armado",
    attackLimit: "3",
    fuelFormula: "2 x 2 = 4",
    projectile: "Si",
    fuelCore: "04"
  },
  confirmacion: {
    chip: "Confirmacion",
    status: "Listo para resolver el golpe",
    attackLimit: "3",
    fuelFormula: "2 x 2 = 4",
    projectile: "Armado",
    fuelCore: "04"
  },
  fin: {
    chip: "Fin de turno",
    status: "Esperando reaccion rival",
    attackLimit: "0",
    fuelFormula: "1 x 2 = 2",
    projectile: "En frio",
    fuelCore: "02"
  }
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
const rivalReadout = document.querySelector("[data-rival-readout]");

const phaseButtons = [...document.querySelectorAll("[data-phase]")];
const turnButtons = [...document.querySelectorAll("[data-turn]")];
const cards = [...document.querySelectorAll(".play-card")];

let currentTurn = "1";
let tutorialOn = true;
let rivalOpen = false;

function updateSelection() {
  const count = cards.filter((card) => card.classList.contains("is-selected")).length;
  selectionCount.textContent = `${count} carta${count === 1 ? "" : "s"}`;
}

function setPhase(phase) {
  const data = phaseData[phase];
  phaseChip.textContent = data.chip;
  statusText.textContent = data.status;
  attackLimit.textContent = data.attackLimit;
  fuelFormula.textContent = data.fuelFormula;
  projectileText.textContent = data.projectile;
  fuelCore.textContent = data.fuelCore;

  phaseButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.phase === phase);
  });
}

function setTurn(turn) {
  currentTurn = turn;
  turnButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.turn === turn);
  });
}

function setTutorial(enabled) {
  tutorialOn = enabled;
  tutorialToggle.textContent = enabled ? "Tutorial ON" : "Tutorial OFF";
  tutorialToggle.classList.toggle("is-active", enabled);
}

function setRivalReadout(open) {
  rivalOpen = open;
  rivalToggle.classList.toggle("is-active", open);

  if (open) {
    rivalReadout.innerHTML = `
      <span>Visibilidad</span>
      <strong>Extendida</strong>
      <p>Se destacan blindaje, defensa, estado de montaje y espacio libre de modulos.</p>
    `;
    return;
  }

  rivalReadout.innerHTML = `
    <span>Visibilidad</span>
    <strong>Parcial</strong>
    <p>Se muestra el chasis y la presion defensiva, pero no la mano oculta.</p>
  `;
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
  setRivalReadout(!rivalOpen);
});

cards.forEach((card) => {
  card.addEventListener("click", () => {
    card.classList.toggle("is-selected");
    updateSelection();
  });
});

setTurn(currentTurn);
setTutorial(tutorialOn);
setRivalReadout(rivalOpen);
setPhase("montaje");
updateSelection();
