// Подключение Firebase SDK
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getDatabase, ref, get, set, onValue } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

// Твои настройки Firebase (их нужно будет вставить)
const firebaseConfig = {
  apiKey: "AIzaSyAWNfjIZH6g9OA5i3pgGwZNOOsRI-J_bLQ",
    authDomain: "my-pet-e61e4.firebaseapp.com",
    databaseURL: "https://my-pet-e61e4-default-rtdb.firebaseio.com",
    projectId: "my-pet-e61e4",
    storageBucket: "my-pet-e61e4.firebasestorage.app",
    messagingSenderId: "105977367505",
    appId: "1:105977367505:web:f23e83bc8efc7835c6aef0"
  };

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Telegram
const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor("#f8f9fa");

const user = tg.initDataUnsafe?.user;
if (!user) {
  alert("Откройте приложение через Telegram!");
  throw new Error("No Telegram user");
}

const userId = user.id.toString();
const userRef = ref(db, `users/${userId}`);

// Инициализация данных пользователя
async function initUser() {
  const snapshot = await get(userRef);
  if (!snapshot.exists()) {
    const initialData = {
      coins: 0,
      hunger: 0,
      happiness: 100,
      cleanliness: 100,
      lastUpdate: Date.now(),
      name: "Котик",
      accessories: [],
      breed: "default",
      currentAccessory: null
    };
    await set(userRef, initialData);
    return initialData;
  }
  return snapshot.val();
}

// Обновление интерфейса
function render(data) {
  document.getElementById('coins').textContent = data.coins;
  document.getElementById('hunger').textContent = data.hunger;
  document.getElementById('happiness').textContent = data.happiness;
  document.getElementById('cleanliness').textContent = data.cleanliness;

  // Отображение аксессуара
  const accessoryEl = document.getElementById('accessory');
  if (data.currentAccessory) {
    accessoryEl.style.display = 'block';
    accessoryEl.textContent = getAccessoryEmoji(data.currentAccessory);
  } else {
    accessoryEl.style.display = 'none';
  }
}

function getAccessoryEmoji(type) {
  const emojis = {
    hat: '🎩',
    bow: '🎀',
    glasses: '👓'
  };
  return emojis[type] || '';
}

// Деградация параметров
function degrade(data) {
  const now = Date.now();
  const minutesPassed = Math.floor((now - data.lastUpdate) / (60 * 1000));

  const newData = { ...data };
  newData.hunger = Math.min(100, newData.hunger + Math.floor(minutesPassed / 30) * 20);
  newData.happiness = Math.max(0, newData.happiness - Math.floor(minutesPassed / 60) * 10);
  newData.cleanliness = Math.max(0, newData.cleanliness - Math.floor(minutesPassed / 60) * 10);
  newData.lastUpdate = now;

  return newData;
}

// Обновление параметра
async function updateStat(field, delta) {
  const snapshot = await get(userRef);
  let data = snapshot.val();
  data = degrade(data);
  data[field] = Math.min(100, Math.max(0, data[field] + delta));
  data.lastUpdate = Date.now();
  await set(userRef, data);
  render(data);
}

// Мини-игры
async function playDiceGame() {
  const snapshot = await get(userRef);
  let data = snapshot.val();
  data = degrade(data);

  const userGuess = parseInt(prompt("Угадай число от 1 до 6:"));
  const dice = Math.floor(Math.random() * 6) + 1;

  if (userGuess === dice) {
    data.coins += 10;
    alert("Вы выиграли! +10 монет");
  } else {
    alert(`Выпало: ${dice}`);
  }

  data.lastUpdate = Date.now();
  await set(userRef, data);
  render(data);
}

async function playClickGame() {
  const snapshot = await get(userRef);
  let data = snapshot.val();
  data = degrade(data);

  const petAvatar = document.getElementById('pet-avatar');
  let clicks = 0;
  const startTime = Date.now();

  petAvatar.onclick = () => {
    clicks++;
    if (clicks >= 3) {
      if (Date.now() - startTime <= 5000) {
        data.coins += 15;
        alert("Победа! +15 монет");
      } else {
        alert("Время вышло!");
      }
      petAvatar.onclick = null;
    }
  };

  setTimeout(() => {
    if (clicks < 3) {
      alert("Время вышло!");
      petAvatar.onclick = null;
    }
  }, 5000);
}

// Покупка в магазине
async function buyItem(item, price) {
  const snapshot = await get(userRef);
  let data = snapshot.val();
  data = degrade(data);

  if (data.coins >= price) {
    data.coins -= price;
    if (!data.accessories.includes(item)) {
      data.accessories.push(item);
    }
    if (['siamese', 'maine', 'persian'].includes(item)) {
      data.breed = item;
    } else {
      data.currentAccessory = item;
    }
    data.lastUpdate = Date.now();
    await set(userRef, data);
    alert("Покупка успешна!");
  } else {
    alert("Недостаточно монет :(");
  }
  render(data);
}

// Загрузка и отображение
initUser().then(data => {
  data = degrade(data);
  render(data);
  set(userRef, data); // Сохраняем деградировавшее состояние
});

// Обработчики кнопок
document.getElementById('feed').onclick = () => updateStat('hunger', -30);
document.getElementById('play').onclick = () => updateStat('happiness', +20);
document.getElementById('wash').onclick = () => updateStat('cleanliness', +25);
document.getElementById('dice-game').onclick = playDiceGame;
document.getElementById('click-game').onclick = playClickGame;

document.querySelectorAll('.buy-btn').forEach(button => {
  button.onclick = () => {
    const item = button.dataset.item;
    const price = parseInt(button.dataset.price);
    buyItem(item, price);
  };
});

document.getElementById('open-shop').onclick = () => {
  document.getElementById('shop-modal').style.display = 'block';
};

document.getElementById('close-shop').onclick = () => {
  document.getElementById('shop-modal').style.display = 'none';
};
