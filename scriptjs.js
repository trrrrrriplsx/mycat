console.log("Script loaded");

const tg = window.Telegram.WebApp;
console.log("Telegram WebApp object:", tg);

tg.expand();
tg.setHeaderColor("#f8f9fa");

const user = tg.initDataUnsafe?.user;
if (!user) {
  alert("Откройте приложение через Telegram!");
  throw new Error("No Telegram user");
}

console.log("User ID:", user.id);

const userId = user.id.toString();

// Функция для получения данных питомца
function getPet() {
  const data = localStorage.getItem(`pet_${userId}`);
  if (!data) {
    console.log("No pet found, creating new one");
    const newPet = {
      hunger: 0,
      happiness: 100,
      cleanliness: 100,
      lastUpdate: Date.now(),
      name: "Котик"
    };
    localStorage.setItem(`pet_${userId}`, JSON.stringify(newPet));
    return newPet;
  }
  console.log("Pet loaded from localStorage:", JSON.parse(data));
  return JSON.parse(data);
}

// Функция для сохранения данных питомца
function savePet(pet) {
  localStorage.setItem(`pet_${userId}`, JSON.stringify(pet));
  console.log("Pet saved to localStorage:", pet);
}

// Обновляем интерфейс
function render(pet) {
  console.log("Rendering pet:", pet);
  const hungerEl = document.getElementById('hunger');
  const happinessEl = document.getElementById('happiness');
  const cleanlinessEl = document.getElementById('cleanliness');

  if (!hungerEl) console.error("Element #hunger not found!");
  if (!happinessEl) console.error("Element #happiness not found!");
  if (!cleanlinessEl) console.error("Element #cleanliness not found!");

  if (hungerEl) hungerEl.textContent = pet.hunger;
  if (happinessEl) happinessEl.textContent = pet.happiness;
  if (cleanlinessEl) cleanlinessEl.textContent = pet.cleanliness;
}

// Применяем деградацию
function degrade(pet) {
  const now = Date.now();
  const minutesPassed = Math.floor((now - pet.lastUpdate) / (60 * 1000));

  const newPet = {...pet};
  newPet.hunger = Math.min(100, newPet.hunger + Math.floor(minutesPassed / 30) * 20);
  newPet.happiness = Math.max(0, newPet.happiness - Math.floor(minutesPassed / 60) * 10);
  newPet.cleanliness = Math.max(0, newPet.cleanliness - Math.floor(minutesPassed / 60) * 10);
  newPet.lastUpdate = now;

  console.log("Degraded pet:", newPet);
  return newPet;
}

// Загружаем и отображаем
let currentPet = getPet();
currentPet = degrade(currentPet);
render(currentPet);
savePet(currentPet);

// Проверяем, найдены ли кнопки
const feedBtn = document.getElementById('feed');
const playBtn = document.getElementById('play');
const washBtn = document.getElementById('wash');

console.log("Buttons found:", { feedBtn, playBtn, washBtn });

if (feedBtn) {
  feedBtn.onclick = () => {
    console.log("Feed button clicked");
    updateStat('hunger', -30);
  };
} else {
  console.error("Feed button not found!");
}

if (playBtn) {
  playBtn.onclick = () => {
    console.log("Play button clicked");
    updateStat('happiness', +20);
  };
} else {
  console.error("Play button not found!");
}

if (washBtn) {
  washBtn.onclick = () => {
    console.log("Wash button clicked");
    updateStat('cleanliness', +25);
  };
} else {
  console.error("Wash button not found!");
}

function updateStat(field, delta) {
  console.log("updateStat called with:", field, delta);
  currentPet = getPet();
  currentPet = degrade(currentPet);
  currentPet[field] = Math.min(100, Math.max(0, currentPet[field] + delta));
  currentPet.lastUpdate = Date.now();
  render(currentPet);
  savePet(currentPet);
}
