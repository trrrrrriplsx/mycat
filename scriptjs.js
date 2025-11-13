import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithCustomToken } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getDatabase, ref, get, set, onValue } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

// Твои настройки Firebase
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef1234567890"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

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

// Получение токена с бэкенда
async function getCustomToken(userId) {
  const response = await fetch(`https://tg-pet-api.onrender.com/api/token?uid=${userId}`);
  const data = await response.json();
  return data.token;
}

// Вход в Firebase с кастомным токеном
async function loginWithTelegramId() {
  const token = await getCustomToken(userId);
  await signInWithCustomToken(auth, token);
}

// Инициализация
async function initApp() {
  await loginWithTelegramId();
  const userRef = ref(db, `users/${userId}`);

  // Инициализация данных пользователя
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
  }

  // Отображение данных
  onValue(userRef, (snapshot) => {
    const data = snapshot.val();
    render(data);
  });
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
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  let data = snapshot.val();
  data = degrade(data);
  data[field] = Math.min(100, Math.max(0, data[field] + delta));
  data.lastUpdate = Date.now();
  await set(userRef, data);
}

// Мини-игры
async function playDiceGame() {
  const userRef = ref(db, `users/${userId}`);
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
}

async function playClickGame() {
  const userRef = ref(db, `users/${userId}`);
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
  const userRef = ref(db, `users/${userId}`);
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
}

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

// Запуск
initApp().catch(console.error);
