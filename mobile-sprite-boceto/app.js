const buttons = document.querySelectorAll("button");
const tabs = document.querySelectorAll("[data-tab]");
const shell = document.querySelector(".phone-shell");
const cards = document.querySelectorAll(".cards img");

buttons.forEach((button) => {
  button.addEventListener("pointerdown", () => button.classList.add("is-pressed"));
  button.addEventListener("pointerup", () => button.classList.remove("is-pressed"));
  button.addEventListener("pointerleave", () => button.classList.remove("is-pressed"));
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.remove("is-active"));
    tab.classList.add("is-active");
  });
});

document.querySelector('[data-action="attack"]').addEventListener("click", () => {
  shell.classList.remove("attack-flash");
  requestAnimationFrame(() => shell.classList.add("attack-flash"));
});

cards.forEach((card) => {
  card.addEventListener("click", () => {
    cards.forEach((item) => item.classList.remove("is-selected"));
    card.classList.add("is-selected");
  });
});
