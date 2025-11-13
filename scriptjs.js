Хорошо! Вот **обновлённая версия `script.js`** с **подробным логированием** в `console.log`, чтобы ты **видел**, **что происходит** и **где возникают ошибки**.

```js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithCustomToken } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getDatabase, ref, get, set, onValue } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

// Твои настройки Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAWNfjIZH6g9OA5i3pgGwZNOOsRI-J_bLQ",
  authDomain: "my-pet-e61e4.firebaseapp.com",
  databaseURL: "https://my-pet-e61e4-default-rtdb.firebaseio.com",
  projectId: "my-pet-e61e4",
  storageBucket: "my-pet-e61e4.firebasestorage.app",
  messagingSenderId: "105977367505",
  appId: "1:105977367505:web:f23e83bc8efc7835c6aef0"
};

console.log("Firebase config loaded");

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Telegram
const tg = window.Telegram.WebApp;
console.log("Telegram WebApp object:", tg);

tg.expand();
tg.setHeaderColor("#f8f9fa");

const user = tg.initDataUnsafe?.user;
console.log("Telegram user data:", user);

if (!user) {
  alert("Откройте приложение через Telegram!");
  throw new Error("No Telegram user");
}

const userId = user.id.toString();
console.log("User ID:", userId);

// Получение токена с бэкенда
async function getCustomToken(userId) {
  console.log("getCustomToken called with userId:", userId);
  try {
    const response = await fetch(`https://tg-pet-api.onrender.com/api/token?uid=${userId}`);
    console.log("Response from token API:", response.status);
    const data = await response.json();
    console.log("Received token from API:", data.token ? "Token received" : "No token");
    return data.token;
  } catch (error) {
    console.error("Error fetching token:", error);
    throw error;
  }
}

// Вход в Firebase с кастомным токеном
async function loginWithTelegramId() {
  console.log("loginWithTelegramId called");
  try {
    const token = await getCustomToken(userId);
    console.log("Signing in with token:", token ? "Token present" : "Token missing");
    await signInWithCustomToken(auth, token);
    console.log("Successfully signed in with custom token");
  } catch (error) {
    console.error("Error during signInWithCustomToken:", error);
    throw error;
  }
}

// Инициализация
async function initApp() {
  console.log("initApp started");
  await loginWithTelegramId();
  const userRef = ref(db, `users/${userId}`);
  console.log("User ref created:", userRef);

  // Инициализация данных пользователя
  const snapshot = await get(userRef);
  console.log("Initial data snapshot:", snapshot.val());
  if (!snapshot.exists()) {
    console.log("No data found, creating initial data");
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
    console.log("Initial data set in database:", initialData);
  } else {
    console.log("Data already exists, skipping initialization");
  }

  // Отображение данных
  console.log("Setting up real-time listener for user data");
  onValue(userRef, (snapshot) => {
    const data = snapshot.val();
    console.log("Real-time data update received:", data);
    render(data);
  });
}

// Обновление интерфейса
function render(data) {
  console.log("Rendering data to UI:", data);
  document.getElementById('coins').textContent = data.coins;
  document.getElementById('hunger').textContent = data.hunger;
  document.getElementById('happiness').textContent = data.happiness;
  document.getElementById('cleanliness').textContent = data.cleanliness;

  // Отображение аксессуара
  const accessoryEl = document.getElementById('accessory');
  if (data.currentAccessory) {
    accessoryEl.style.display = 'block';
    accessoryEl.textContent = getAccessoryEmoji(data.currentAccessory);
    console.log("Accessory displayed:", data.currentAccessory);
  } else {
    accessoryEl.style.display = 'none';
    console.log("No accessory to display");
  }
}

function getAccessoryEmoji(type) {
  const emojis = {
    hat: '🎩',
    bow: '🎀',
    glasses: '👓'
  };
  const emoji = emojis[type] || '';
  console.log("Accessory emoji for type", type, "is", emoji);
  return emoji;
}

// Деградация параметров
function degrade(data) {
  console.log("Applying degradation to data:", data);
  const now = Date.now();
  const minutesPassed = Math.floor((now - data.lastUpdate) / (60 * 1000));
  console.log("Minutes passed since last update:", minutesPassed);

  const newData = { ...data };
  // Ограничиваем количество добавляемых параметров, чтобы не переполнить
  const hungerIncrease = Math.min(100 - newData.hunger, Math.floor(minutesPassed / 30) * 20);
  const happinessDecrease = Math.min(newData.happiness, Math.floor(minutesPassed / 60) * 10);
  const cleanlinessDecrease = Math.min(newData.cleanliness, Math.floor(minutesPassed / 60) * 10);

  newData.hunger = Math.min(100, newData.hunger + hungerIncrease);
  newData.happiness = Math.max(0, newData.happiness - happinessDecrease);
  newData.cleanliness = Math.max(0, newData.cleanliness - cleanlinessDecrease);
  newData.lastUpdate = now;

  console.log("Data after degradation:", newData);
  return newData;
}

// Обновление параметра
async function updateStat(field, delta) {
  console.log("updateStat called with field:", field, "and delta:", delta);
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  let data = snapshot.val();
  console.log("Current data before update:", data);
  data = degrade(data);
  console.log("Data after degradation:", data);
  data[field] = Math.min(100, Math.max(0, data[field] + delta));
  console.log("Data after applying delta:", data);
  data.lastUpdate = Date.now();
  console.log("Setting new data to database:", data);
  try {
    await set(userRef, data);
    console.log("Data successfully updated in database");
  } catch (error) {
    console.error("Error setting data:", error);
    return;
  }
  render(data); // ✅ Обновляем интерфейс сразу
  console.log("UI rendered with updated data");
}

// Мини-игры
async function playDiceGame() {
  console.log("playDiceGame started");
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  let data = snapshot.val();
  console.log("Current data before game:", data);
  data = degrade(data);
  console.log("Data after degradation:", data);

  const userGuess = parseInt(prompt("Угадай число от 1 до 6:"));
  console.log("User guess:", userGuess);
  const dice = Math.floor(Math.random() * 6) + 1;
  console.log("Dice roll:", dice);

  if (userGuess === dice) {
    data.coins += 10;
    alert("Вы выиграли! +10 монет");
    console.log("User won dice game, coins increased");
  } else {
    alert(`Выпало: ${dice}`);
    console.log("User lost dice game");
  }

  data.lastUpdate = Date.now();
  console.log("Setting new data after game:", data);
  try {
    await set(userRef, data);
    console.log("Game result saved to database");
  } catch (error) {
    console.error("Error saving game result:", error);
    return;
  }
  render(data); // ✅ Обновляем интерфейс
  console.log("UI rendered after game");
}

async function playClickGame() {
  console.log("playClickGame started");
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  let data = snapshot.val();
  console.log("Current data before click game:", data);
  data = degrade(data);
  console.log("Data after degradation:", data);

  const petAvatar = document.getElementById('pet-avatar');
  let clicks = 0;
  const startTime = Date.now();
  console.log("Click game started, waiting for 3 clicks in 5 seconds");

  petAvatar.onclick = () => {
    clicks++;
    console.log("Click registered, total clicks:", clicks);
    if (clicks >= 3) {
      if (Date.now() - startTime <= 5000) {
        data.coins += 15;
        alert("Победа! +15 монет");
        console.log("User won click game, coins increased");
      } else {
        alert("Время вышло!");
        console.log("User lost click game due to timeout");
      }
      petAvatar.onclick = null;
      console.log("Click handler removed");
    }
  };

  setTimeout(() => {
    if (clicks < 3) {
      alert("Время вышло!");
      console.log("User lost click game due to timeout (in timeout handler)");
      petAvatar.onclick = null;
      console.log("Click handler removed in timeout");
    }
  }, 5000);
}

// Покупка в магазине
async function buyItem(item, price) {
  console.log("buyItem called with item:", item, "and price:", price);
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  let data = snapshot.val();
  console.log("Current data before purchase:", data);
  data = degrade(data);
  console.log("Data after degradation:", data);

  if (data.coins >= price) {
    console.log("Purchase is affordable");
    data.coins -= price;
    if (!Array.isArray(data.accessories)) {
      data.accessories = [];
      console.log("Initialized accessories array");
    }
    if (!data.accessories.includes(item)) {
      data.accessories.push(item);
      console.log("Item added to accessories:", item);
    } else {
      console.log("Item already in accessories:", item);
    }
    if (['siamese', 'maine', 'persian'].includes(item)) {
      data.breed = item;
      console.log("Breed updated to:", item);
    } else {
      data.currentAccessory = item;
      console.log("Current accessory updated to:", item);
    }
    data.lastUpdate = Date.now();
    console.log("Setting new data after purchase:", data);
    try {
      await set(userRef, data);
      console.log("Purchase data saved to database");
    } catch (error) {
      console.error("Error saving purchase data:", error);
      return;
    }
    alert("Покупка успешна!");
    console.log("Purchase successful alert shown");
  } else {
    alert("Недостаточно монет :(");
    console.log("Purchase failed due to insufficient coins");
  }
  render(data); // ✅ Обновляем интерфейс
  console.log("UI rendered after purchase");
}

// Функция для установки обработчиков кнопок (вызывается после успешной инициализации)
function setupEventListeners() {
  console.log("Setting up event listeners");
  document.getElementById('feed').onclick = () => {
    console.log("Feed button clicked");
    updateStat('hunger', -30);
  };
  document.getElementById('play').onclick = () => {
    console.log("Play button clicked");
    updateStat('happiness', +20);
  };
  document.getElementById('wash').onclick = () => {
    console.log("Wash button clicked");
    updateStat('cleanliness', +25);
  };
  document.getElementById('dice-game').onclick = () => {
    console.log("Dice game button clicked");
    playDiceGame();
  };
  document.getElementById('click-game').onclick = () => {
    console.log("Click game button clicked");
    playClickGame();
  };

  document.querySelectorAll('.buy-btn').forEach(button => {
    button.onclick = () => {
      const item = button.dataset.item;
      const price = parseInt(button.dataset.price);
      console.log("Buy button clicked for item:", item, "with price:", price);
      buyItem(item, price);
    };
  });

  document.getElementById('open-shop').onclick = () => {
    console.log("Open shop button clicked");
    document.getElementById('shop-modal').style.display = 'block';
  };

  document.getElementById('close-shop').onclick = () => {
    console.log("Close shop button clicked");
    document.getElementById('shop-modal').style.display = 'none';
  };
}

// Запуск
console.log("Starting app initialization");
initApp()
  .then(() => {
    console.log("App initialized successfully");
    setupEventListeners(); // Устанавливаем обработчики только после успешной инициализации
    console.log("Event listeners set up");
  })
  .catch(error => {
    console.error("Failed to initialize app:", error);
    alert("Ошибка инициализации приложения. Проверь консоль.");
  });
```
