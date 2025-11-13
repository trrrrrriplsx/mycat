import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithCustomToken } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getDatabase, ref, get, set, onValue } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyAWNfjIZH6g9OA5i3pgGwZNOOsRI-J_bLQ",
  authDomain: "my-pet-e61e4.firebaseapp.com",
  databaseURL: "https://my-pet-e61e4-default-rtdb.firebaseio.com",
  projectId: "my-pet-e61e4",
  storageBucket: "my-pet-e61e4.firebasestorage.app",
  messagingSenderId: "105977367505",
  appId: "1:105977367505:web:f23e83bc8efc7835c6aef0"
};

console.log("🚀 Firebase config loaded");

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Telegram WebApp
const tg = window.Telegram.WebApp;
console.log("📱 Telegram WebApp object:", tg);

tg.expand();
tg.setHeaderColor("#f8f9fa");
tg.enableClosingConfirmation();
tg.setBackgroundColor("#f0f2f5");

const user = tg.initDataUnsafe?.user;
console.log("👤 Telegram user data:", user);

if (!user) {
  alert("❌ Откройте приложение через Telegram!");
  throw new Error("No Telegram user");
}

const userId = user.id.toString();
console.log("🆔 User ID:", userId);

// Получение токена с бэкенда
async function getCustomToken(userId) {
  console.log("🔑 getCustomToken called with userId:", userId);
  try {
    const response = await fetch(`https://tg-pet-api.onrender.com/api/token?uid=${userId}`);
    console.log("📡 Response from token API:", response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("✅ Received token from API:", data.token ? "Token received" : "No token");
    return data.token;
  } catch (error) {
    console.error("❌ Error fetching token:", error);
    throw error;
  }
}

// Вход в Firebase с кастомным токеном
async function loginWithTelegramId() {
  console.log("🔐 loginWithTelegramId called");
  try {
    const token = await getCustomToken(userId);
    console.log("🪙 Signing in with token:", token ? "Token present" : "Token missing");
    
    if (!token) {
      throw new Error("No token received from server");
    }
    
    const userCredential = await signInWithCustomToken(auth, token);
    console.log("✅ Successfully signed in with custom token", userCredential.user.uid);
    return userCredential;
  } catch (error) {
    console.error("❌ Error during signInWithCustomToken:", error);
    throw error;
  }
}

// Инициализация данных пользователя
async function initUserData(userRef) {
  console.log("📊 Initializing user data");
  const initialData = {
    coins: 50,
    hunger: 50,
    happiness: 80,
    cleanliness: 80,
    lastUpdate: Date.now(),
    name: user.first_name || "Котик",
    accessories: [],
    breed: "default",
    currentAccessory: null,
    level: 1,
    experience: 0
  };
  
  await set(userRef, initialData);
  console.log("✅ Initial data set in database:", initialData);
  return initialData;
}

// Обновление интерфейса
function render(data) {
  console.log("🎨 Rendering data to UI:", data);
  
  // Основные показатели
  document.getElementById('coins').textContent = data.coins;
  document.getElementById('hunger').textContent = data.hunger;
  document.getElementById('happiness').textContent = data.happiness;
  document.getElementById('cleanliness').textContent = data.cleanliness;
  
  // Отображение аватара кота в зависимости от породы
  const petAvatar = document.getElementById('pet-avatar');
  const breedEmojis = {
    default: '🐱',
    siamese: '🐈',
    maine: '🐈‍⬛',
    persian: '🐱'
  };
  petAvatar.textContent = breedEmojis[data.breed] || '🐱';
  
  // Отображение аксессуара
  const accessoryEl = document.getElementById('accessory');
  if (data.currentAccessory) {
    accessoryEl.style.display = 'block';
    accessoryEl.textContent = getAccessoryEmoji(data.currentAccessory);
    console.log("👒 Accessory displayed:", data.currentAccessory);
  } else {
    accessoryEl.style.display = 'none';
    console.log("❌ No accessory to display");
  }
  
  // Обновление прогресс-баров
  updateProgressBars(data);
}

// Функция для прогресс-баров
function updateProgressBars(data) {
  const stats = ['hunger', 'happiness', 'cleanliness'];
  stats.forEach(stat => {
    const element = document.getElementById(stat);
    const value = data[stat];
    
    // Цвет в зависимости от значения
    if (value < 30) {
      element.style.color = '#ff4444';
    } else if (value < 70) {
      element.style.color = '#ffaa00';
    } else {
      element.style.color = '#00aa00';
    }
  });
}

function getAccessoryEmoji(type) {
  const emojis = {
    hat: '🎩',
    bow: '🎀',
    glasses: '👓',
    siamese: '',
    maine: '',
    persian: ''
  };
  const emoji = emojis[type] || '';
  console.log("🎭 Accessory emoji for type", type, "is", emoji);
  return emoji;
}

// Улучшенная деградация параметров
function degrade(data) {
  console.log("📉 Applying degradation to data:", data);
  const now = Date.now();
  const hoursPassed = (now - data.lastUpdate) / (60 * 60 * 1000);
  console.log("⏰ Hours passed since last update:", hoursPassed.toFixed(2));

  const newData = { ...data };
  
  // Деградация в зависимости от прошедшего времени
  newData.hunger = Math.min(100, newData.hunger + Math.floor(hoursPassed * 5));
  newData.happiness = Math.max(0, newData.happiness - Math.floor(hoursPassed * 3));
  newData.cleanliness = Math.max(0, newData.cleanliness - Math.floor(hoursPassed * 2));
  newData.lastUpdate = now;

  console.log("📊 Data after degradation:", newData);
  return newData;
}

// Обновление параметра с анимацией
async function updateStat(field, delta) {
  console.log("🔄 updateStat called with field:", field, "and delta:", delta);
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  let data = snapshot.val();
  
  if (!data) {
    console.error("❌ No data found for user");
    return;
  }
  
  console.log("📋 Current data before update:", data);
  data = degrade(data);
  
  // Применяем изменение
  const newValue = Math.min(100, Math.max(0, data[field] + delta));
  console.log(`📈 ${field}: ${data[field]} -> ${newValue}`);
  data[field] = newValue;
  data.lastUpdate = Date.now();
  
  // Добавляем монеты за уход, если параметры в норме
  if (delta > 0 && newValue > 70) {
    const coinsEarned = Math.floor(delta / 10);
    data.coins += coinsEarned;
    console.log(`💰 Earned ${coinsEarned} coins for care`);
    showFloatingMessage(`+${coinsEarned} монет!`, '#4CAF50');
  }
  
  console.log("💾 Setting new data to database:", data);
  try {
    await set(userRef, data);
    console.log("✅ Data successfully updated in database");
  } catch (error) {
    console.error("❌ Error setting data:", error);
    return;
  }
  
  render(data);
  console.log("✅ UI rendered with updated data");
}

// Плавающие сообщения
function showFloatingMessage(text, color = '#333') {
  const message = document.createElement('div');
  message.textContent = text;
  message.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: ${color};
    color: white;
    padding: 10px 20px;
    border-radius: 20px;
    z-index: 1000;
    font-weight: bold;
    animation: floatUp 1.5s ease-out forwards;
  `;
  
  document.body.appendChild(message);
  
  setTimeout(() => {
    document.body.removeChild(message);
  }, 1500);
}

// Добавляем CSS анимацию
const style = document.createElement('style');
style.textContent = `
  @keyframes floatUp {
    0% { opacity: 0; transform: translate(-50%, -20px); }
    50% { opacity: 1; transform: translate(-50%, -50px); }
    100% { opacity: 0; transform: translate(-50%, -80px); }
  }
  
  .progress-bar {
    width: 100%;
    height: 8px;
    background: #eee;
    border-radius: 4px;
    margin: 5px 0;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }
`;
document.head.appendChild(style);

// Улучшенная игра в кости
async function playDiceGame() {
  console.log("🎲 playDiceGame started");
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  let data = snapshot.val();
  
  if (!data) {
    console.error("❌ No data found for user");
    return;
  }
  
  data = degrade(data);
  
  // Проверяем, достаточно ли счастья для игры
  if (data.happiness < 20) {
    alert("😿 Кот слишком грустный для игры! Поднимите настроение.");
    return;
  }
  
  const userGuess = parseInt(prompt("🎯 Угадай число от 1 до 6:"));
  
  if (isNaN(userGuess) || userGuess < 1 || userGuess > 6) {
    alert("❌ Введите число от 1 до 6!");
    return;
  }
  
  const dice = Math.floor(Math.random() * 6) + 1;
  console.log(`🎲 User guess: ${userGuess}, Dice roll: ${dice}`);
  
  if (userGuess === dice) {
    data.coins += 15;
    data.happiness = Math.min(100, data.happiness + 10);
    alert("🎉 Вы выиграли! +15 монет, +10 к настроению");
    showFloatingMessage("+15 монет! 🎉", "#4CAF50");
  } else {
    data.happiness = Math.max(0, data.happiness - 5);
    alert(`😔 Выпало: ${dice}. Попробуйте еще раз! -5 к настроению`);
  }
  
  data.lastUpdate = Date.now();
  
  try {
    await set(userRef, data);
    console.log("✅ Game result saved to database");
  } catch (error) {
    console.error("❌ Error saving game result:", error);
    return;
  }
  
  render(data);
}

// Улучшенная игра в клики
async function playClickGame() {
  console.log("🎯 playClickGame started");
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  let data = snapshot.val();
  
  if (!data) {
    console.error("❌ No data found for user");
    return;
  }
  
  data = degrade(data);
  
  if (data.happiness < 15) {
    alert("😿 Кот слишком грустный для игры!");
    return;
  }
  
  const petAvatar = document.getElementById('pet-avatar');
  let clicks = 0;
  const startTime = Date.now();
  const timeLimit = 5000; // 5 секунд
  
  alert("🎯 Быстро нажимайте на кота 5 раз за 5 секунд!");
  
  const originalCursor = petAvatar.style.cursor;
  petAvatar.style.cursor = 'pointer';
  
  const clickHandler = () => {
    clicks++;
    console.log(`🖱 Click registered, total clicks: ${clicks}`);
    
    // Анимация при клике
    petAvatar.style.transform = 'scale(0.9)';
    setTimeout(() => {
      petAvatar.style.transform = 'scale(1)';
    }, 100);
    
    if (clicks >= 5) {
      const timeUsed = Date.now() - startTime;
      if (timeUsed <= timeLimit) {
        const coinsWon = 20;
        data.coins += coinsWon;
        data.happiness = Math.min(100, data.happiness + 15);
        alert(`🏆 Победа! +${coinsWon} монет, +15 к настроению! Время: ${(timeUsed/1000).toFixed(2)}с`);
        showFloatingMessage(`+${coinsWon} монет! 🏆`, "#2196F3");
      } else {
        alert("⏰ Время вышло! Попробуйте еще раз.");
      }
      cleanup();
    }
  };
  
  const cleanup = () => {
    petAvatar.removeEventListener('click', clickHandler);
    petAvatar.style.cursor = originalCursor;
    data.lastUpdate = Date.now();
    
    set(userRef, data).then(() => {
      console.log("✅ Click game result saved");
      render(data);
    }).catch(error => {
      console.error("❌ Error saving click game result:", error);
    });
  };
  
  petAvatar.addEventListener('click', clickHandler);
  
  setTimeout(() => {
    if (clicks < 5) {
      alert("⏰ Время вышло! Попробуйте еще раз.");
      cleanup();
    }
  }, timeLimit);
}

// Покупка в магазине с проверками
async function buyItem(item, price) {
  console.log("🛒 buyItem called with item:", item, "and price:", price);
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  let data = snapshot.val();
  
  if (!data) {
    console.error("❌ No data found for user");
    return;
  }
  
  data = degrade(data);
  
  if (data.coins >= price) {
    console.log("✅ Purchase is affordable");
    data.coins -= price;
    
    if (!Array.isArray(data.accessories)) {
      data.accessories = [];
      console.log("📦 Initialized accessories array");
    }
    
    const isBreed = ['siamese', 'maine', 'persian'].includes(item);
    
    if (isBreed) {
      // Покупка породы
      data.breed = item;
      console.log("🐾 Breed updated to:", item);
      showFloatingMessage(`Порода изменена! 🐾`, "#FF9800");
    } else {
      // Покупка аксессуара
      if (!data.accessories.includes(item)) {
        data.accessories.push(item);
        console.log("🎁 Item added to accessories:", item);
      }
      data.currentAccessory = item;
      console.log("👒 Current accessory updated to:", item);
      showFloatingMessage(`Аксессуар надет! 👒`, "#9C27B0");
    }
    
    data.lastUpdate = Date.now();
    
    try {
      await set(userRef, data);
      console.log("✅ Purchase data saved to database");
    } catch (error) {
      console.error("❌ Error saving purchase data:", error);
      return;
    }
  } else {
    alert("❌ Недостаточно монет :(");
    console.log("💸 Purchase failed due to insufficient coins");
  }
  
  render(data);
}

// Настройка обработчиков событий
function setupEventListeners() {
  console.log("🔧 Setting up event listeners");
  
  // Основные действия
  document.getElementById('feed').onclick = () => {
    console.log("🍽 Feed button clicked");
    updateStat('hunger', -25);
    showFloatingMessage("Ням-ням! 🍖", "#4CAF50");
  };
  
  document.getElementById('play').onclick = () => {
    console.log("🧶 Play button clicked");
    updateStat('happiness', +15);
    showFloatingMessage("Весело! 🎾", "#2196F3");
  };
  
  document.getElementById('wash').onclick = () => {
    console.log("🛁 Wash button clicked");
    updateStat('cleanliness', +20);
    showFloatingMessage("Чистота! ✨", "#00BCD4");
  };
  
  // Игры
  document.getElementById('dice-game').onclick = () => {
    console.log("🎲 Dice game button clicked");
    playDiceGame();
  };
  
  document.getElementById('click-game').onclick = () => {
    console.log("🎯 Click game button clicked");
    playClickGame();
  };
  
  // Магазин
  document.querySelectorAll('.buy-btn').forEach(button => {
    button.onclick = () => {
      const item = button.dataset.item;
      const price = parseInt(button.dataset.price);
      console.log("🛒 Buy button clicked for item:", item, "with price:", price);
      buyItem(item, price);
    };
  });
  
  document.getElementById('open-shop').onclick = () => {
    console.log("🏪 Open shop button clicked");
    document.getElementById('shop-modal').style.display = 'flex';
  };
  
  document.getElementById('close-shop').onclick = () => {
    console.log("❌ Close shop button clicked");
    document.getElementById('shop-modal').style.display = 'none';
  };
  
  // Закрытие модального окна при клике вне его
  document.getElementById('shop-modal').onclick = (e) => {
    if (e.target.id === 'shop-modal') {
      document.getElementById('shop-modal').style.display = 'none';
    }
  };
}

// Основная функция инициализации
async function initApp() {
  console.log("🚀 initApp started");
  
  try {
    await loginWithTelegramId();
    const userRef = ref(db, `users/${userId}`);
    console.log("📡 User ref created:", userRef);
    
    // Инициализация или загрузка данных
    const snapshot = await get(userRef);
    console.log("📊 Initial data snapshot:", snapshot.val());
    
    if (!snapshot.exists()) {
      console.log("🆕 No data found, creating initial data");
      await initUserData(userRef);
    } else {
      console.log("✅ Data already exists, applying degradation");
      let data = snapshot.val();
      data = degrade(data);
      await set(userRef, data);
    }
    
    // Слушатель реального времени
    console.log("👂 Setting up real-time listener for user data");
    onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        console.log("🔄 Real-time data update received:", data);
        render(data);
      }
    });
    
    return true;
    
  } catch (error) {
    console.error("❌ Failed to initialize app:", error);
    throw error;
  }
}

// Запуск приложения
console.log("🎮 Starting app initialization");
initApp()
  .then(() => {
    console.log("✅ App initialized successfully");
    setupEventListeners();
    console.log("✅ Event listeners set up");
    showFloatingMessage("Добро пожаловать! 🐱", "#4CAF50");
  })
  .catch(error => {
    console.error("❌ Failed to initialize app:", error);
    alert("❌ Ошибка инициализации приложения. Проверь консоль.");
  });

// Обработка ошибок Firebase
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log("✅ User is signed in:", user.uid);
  } else {
    console.log("❌ User is signed out");
  }
});
