const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor("#f8f9fa");

const user = tg.initDataUnsafe?.user;
if (!user) {
  alert("Откройте приложение через Telegram!");
  throw new Error("No Telegram user");
}

const userId = user.id.toString();

// Функция для получения данных питомца
function getPet() {
  const data = localStorage.getItem(`pet_${userId}`);
  if (!data) {
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
  return JSON.parse(data);
}

// Функция для сохранения данных питомца
function savePet(pet) {
  localStorage.setItem(`pet_${userId}`, JSON.stringify(pet));
}

// Обновляем интерфейс
function render(pet) {
  document.getElementById('hunger').textContent = pet.hunger;
  document.getElementById('happiness').textContent = pet.happiness;
  document.getElementById('cleanliness').textContent = pet.cleanliness;
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

  return newPet;
}

// Загружаем и отображаем
let currentPet = getPet();
currentPet = degrade(currentPet);
render(currentPet);
savePet(currentPet); // Сохраняем обновлённое состояние

// Обработчики кнопок
document.getElementById('feed').onclick = () => updateStat('hunger', -30);
document.getElementById('play').onclick = () => updateStat('happiness', +20);
document.getElementById('wash').onclick = () => updateStat('cleanliness', +25);

function updateStat(field, delta) {
  currentPet = getPet();
  currentPet = degrade(currentPet);
  currentPet[field] = Math.min(100, Math.max(0, currentPet[field] + delta));
  currentPet.lastUpdate = Date.now();
  render(currentPet);
  savePet(currentPet);
}
