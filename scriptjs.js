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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor("#f8f9fa");

const user = tg.initDataUnsafe?.user;
if (!user) {
  alert("Откройте приложение через Telegram!");
  throw new Error("No Telegram user");
}

const userId = user.id.toString();

// Конфигурация магазина
const SHOP_ITEMS = {
  accessories: [
    { id: 'bow', name: 'Стильный бант', price: 100, emoji: '🎀', bonus: 1.1, order: 1 },
    { id: 'glasses', name: 'Крутые очки', price: 250, emoji: '👓', bonus: 1.2, order: 2 },
    { id: 'hat', name: 'Элегантная шляпа', price: 500, emoji: '🎩', bonus: 1.3, order: 3 },
    { id: 'collar', name: 'Блестящий ошейник', price: 800, emoji: '🔔', bonus: 1.4, order: 4 },
    { id: 'scarf', name: 'Теплый шарф', price: 1200, emoji: '🧣', bonus: 1.5, order: 5 }
  ],
  breeds: [
    { id: 'siamese', name: 'Сиамский', price: 5000, emoji: '🐈', order: 1 },
    { id: 'maine', name: 'Мейн-кун', price: 10000, emoji: '🐈‍⬛', order: 2 },
    { id: 'persian', name: 'Персидский', price: 20000, emoji: '🐱', order: 3 }
  ]
};

async function getCustomToken(userId) {
  try {
    const response = await fetch(`https://tg-pet-api.onrender.com/api/token?uid=${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error("Error fetching token:", error);
    throw error;
  }
}

async function loginWithTelegramId() {
  try {
    const token = await getCustomToken(userId);
    if (!token) {
      throw new Error("No token received from server");
    }
    const userCredential = await signInWithCustomToken(auth, token);
    console.log("✅ Successfully signed in:", userCredential.user.uid);
    return userCredential;
  } catch (error) {
    console.error("❌ Error during signInWithCustomToken:", error);
    throw error;
  }
}

async function initUserData(userRef) {
  console.log("🆕 Creating initial user data...");
  const initialData = {
    coins: 50,
    hunger: 50,
    happiness: 80,
    cleanliness: 80,
    lastUpdate: Date.now(),
    name: user.first_name || "Пушистик",
    nameChanged: false,
    accessories: [],
    currentAccessory: null,
    breed: "default",
    level: 1,
    experience: 0
  };
  
  await set(userRef, initialData);
  console.log("✅ Initial data created:", initialData);
  return initialData;
}

function render(data) {
  console.log("🎨 Rendering data:", data);
  
  // Обновляем основные показатели
  document.getElementById('coins').textContent = data.coins || 0;
  document.getElementById('pet-name-display').textContent = data.name || "Пушистик";
  
  // Обновляем прогресс-бары и статистику
  updateProgressBars(data);
  updatePetAppearance(data);
  renderShopItems(data);
}

function updateProgressBars(data) {
  console.log("📊 Updating progress bars with data:", {
    hunger: data.hunger,
    happiness: data.happiness,
    cleanliness: data.cleanliness
  });

  const stats = [
    { id: 'hunger', type: 'hunger', value: data.hunger || 0 },
    { id: 'happiness', type: 'happiness', value: data.happiness || 0 },
    { id: 'cleanliness', type: 'cleanliness', value: data.cleanliness || 0 }
  ];
  
  stats.forEach(stat => {
    const element = document.getElementById(stat.id);
    const fillElement = document.querySelector(`.progress-fill[data-type="${stat.type}"]`);
    
    console.log(`Updating ${stat.type}:`, {
      element: !!element,
      fillElement: !!fillElement,
      value: stat.value
    });
    
    if (element) {
      element.textContent = stat.value;
      
      // Обновляем цвета текста в зависимости от значений
      if (stat.value < 30) {
        element.style.color = '#ff4444';
      } else if (stat.value < 70) {
        element.style.color = '#ffaa00';
      } else {
        element.style.color = '#00aa00';
      }
    }
    
    if (fillElement) {
      fillElement.style.width = `${stat.value}%`;
      console.log(`Set ${stat.type} progress bar to ${stat.value}%`);
    }
  });
}

function updatePetAppearance(data) {
  const petAvatar = document.getElementById('pet-avatar');
  const accessoryEl = document.getElementById('accessory');
  
  const breedEmojis = {
    default: '🐱',
    siamese: '🐈',
    maine: '🐈‍⬛',
    persian: '🐱'
  };
  
  if (petAvatar) {
    petAvatar.textContent = breedEmojis[data.breed] || '🐱';
  }
  
  if (accessoryEl) {
    if (data.currentAccessory) {
      accessoryEl.style.display = 'block';
      accessoryEl.textContent = getAccessoryEmoji(data.currentAccessory);
      console.log("🎭 Accessory displayed:", data.currentAccessory);
    } else {
      accessoryEl.style.display = 'none';
      console.log("🎭 No accessory");
    }
  }
}

function getAccessoryEmoji(type) {
  const emojis = {
    bow: '🎀',
    glasses: '👓',
    hat: '🎩',
    collar: '🔔',
    scarf: '🧣'
  };
  return emojis[type] || '';
}

function degrade(data) {
  const now = Date.now();
  const hoursPassed = (now - (data.lastUpdate || now)) / (60 * 60 * 1000);
  
  const newData = { ...data };
  
  // Применяем деградацию только если прошло достаточно времени
  if (hoursPassed > 0.1) { // минимум 6 минут
    newData.hunger = Math.min(100, (newData.hunger || 50) + Math.floor(hoursPassed * 5));
    newData.happiness = Math.max(0, (newData.happiness || 80) - Math.floor(hoursPassed * 3));
    newData.cleanliness = Math.max(0, (newData.cleanliness || 80) - Math.floor(hoursPassed * 2));
    newData.lastUpdate = now;
    
    console.log("📉 Applied degradation:", {
      hoursPassed: hoursPassed.toFixed(2),
      newHunger: newData.hunger,
      newHappiness: newData.happiness,
      newCleanliness: newData.cleanliness
    });
  }
  
  return newData;
}

async function updateStat(field, delta) {
  console.log(`🔄 Updating ${field} by ${delta}`);
  
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  
  if (!snapshot.exists()) {
    console.error("❌ No user data found!");
    return;
  }
  
  let data = snapshot.val();
  console.log("📋 Current data before update:", data);
  
  data = degrade(data);
  const currentValue = data[field] || 0;
  const newValue = Math.min(100, Math.max(0, currentValue + delta));
  
  data[field] = newValue;
  data.lastUpdate = Date.now();
  
  console.log(`📈 ${field}: ${currentValue} -> ${newValue}`);
  
  // Добавляем монеты за уход
  if (delta > 0 && newValue > 70) {
    const coinsEarned = Math.floor(delta / 10);
    data.coins = (data.coins || 0) + coinsEarned;
    showFloatingMessage(`+${coinsEarned} монет!`, 'coins');
    console.log(`💰 Earned ${coinsEarned} coins`);
  }
  
  try {
    await set(userRef, data);
    console.log("✅ Data updated successfully");
  } catch (error) {
    console.error("❌ Error updating data:", error);
  }
}

// Система смены имени
function setupNameSystem() {
  const editNameBtn = document.getElementById('edit-name-btn');
  const nameModal = document.getElementById('name-modal');
  const closeNameModal = document.getElementById('close-name-modal');
  const saveNameBtn = document.getElementById('save-name-btn');
  const cancelNameBtn = document.getElementById('cancel-name-btn');
  const nameInput = document.getElementById('name-input');
  const nameWarning = document.getElementById('name-change-warning');
  const charCount = document.getElementById('char-count');

  if (!editNameBtn) {
    console.error('Edit name button not found!');
    return;
  }

  editNameBtn.addEventListener('click', async () => {
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    const data = snapshot.val();
    
    nameModal.style.display = 'flex';
    nameInput.focus();
    
    // Показываем предупреждение если имя уже менялось
    if (data.nameChanged) {
      nameWarning.style.display = 'block';
    } else {
      nameWarning.style.display = 'none';
    }
  });

  closeNameModal.addEventListener('click', () => {
    nameModal.style.display = 'none';
    nameInput.value = '';
  });

  cancelNameBtn.addEventListener('click', () => {
    nameModal.style.display = 'none';
    nameInput.value = '';
  });

  nameInput.addEventListener('input', (e) => {
    const length = e.target.value.length;
    charCount.textContent = length;
    
    if (length > 20) {
      e.target.value = e.target.value.substring(0, 20);
      charCount.textContent = 20;
    }
  });

  saveNameBtn.addEventListener('click', async () => {
    const newName = nameInput.value.trim();
    
    if (newName.length < 2) {
      alert('Имя должно содержать минимум 2 символа!');
      return;
    }
    
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    let data = snapshot.val();
    
    if (data.nameChanged) {
      alert('Вы уже меняли имя кота! Это можно сделать только один раз.');
      nameModal.style.display = 'none';
      return;
    }
    
    data.name = newName;
    data.nameChanged = true;
    
    try {
      await set(userRef, data);
      document.getElementById('pet-name-display').textContent = newName;
      nameModal.style.display = 'none';
      nameInput.value = '';
      showFloatingMessage(`Имя изменено на: ${newName}`, 'action');
      console.log("✅ Name changed to:", newName);
    } catch (error) {
      console.error("❌ Error saving name:", error);
      alert('Ошибка при сохранении имени!');
    }
  });
}

// Система магазина
function renderShopItems(data) {
  const accessoriesGrid = document.getElementById('accessories-grid');
  const breedsGrid = document.getElementById('breeds-grid');
  
  if (!accessoriesGrid || !breedsGrid) {
    console.error('Shop grids not found!');
    return;
  }
  
  // Очищаем сетки
  accessoriesGrid.innerHTML = '';
  breedsGrid.innerHTML = '';
  
  console.log("🛒 Rendering shop items with data:", {
    accessories: data.accessories,
    currentAccessory: data.currentAccessory,
    breed: data.breed
  });
  
  // Рендерим аксессуары
  SHOP_ITEMS.accessories.forEach((item, index) => {
    const owned = data.accessories && data.accessories.includes(item.id);
    const equipped = data.currentAccessory === item.id;
    const canBuy = index === 0 || (data.accessories && data.accessories.includes(SHOP_ITEMS.accessories[index - 1].id));
    
    const shopItem = document.createElement('div');
    shopItem.className = `shop-item ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''} ${!canBuy ? 'disabled' : ''}`;
    
    let buttonText = 'Купить';
    if (equipped) buttonText = 'Надето';
    else if (owned) buttonText = 'Надеть';
    
    shopItem.innerHTML = `
      <div class="item-preview">${item.emoji}</div>
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-price">${item.price} 🪙</div>
        <div class="item-bonus">Бонус: +${Math.floor((item.bonus - 1) * 100)}% к доходам</div>
      </div>
      <button class="buy-btn ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''}" 
              data-item="${item.id}" data-price="${item.price}" 
              data-type="accessory"
              ${!canBuy ? 'disabled' : ''}>
        ${buttonText}
      </button>
    `;
    
    accessoriesGrid.appendChild(shopItem);
  });
  
  // Рендерим породы
  SHOP_ITEMS.breeds.forEach(item => {
    const owned = data.breed === item.id;
    
    const shopItem = document.createElement('div');
    shopItem.className = `shop-item ${owned ? 'owned' : ''}`;
    
    shopItem.innerHTML = `
      <div class="item-preview">${item.emoji}</div>
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-price">${item.price} 🪙</div>
      </div>
      <button class="buy-btn ${owned ? 'equipped' : ''}" 
              data-item="${item.id}" data-price="${item.price}"
              data-type="breed">
        ${owned ? 'Выбрано' : 'Купить'}
      </button>
    `;
    
    breedsGrid.appendChild(shopItem);
  });
  
  // Добавляем обработчики для кнопок покупки
  document.querySelectorAll('.buy-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = button.dataset.item;
      const price = parseInt(button.dataset.price);
      const type = button.dataset.type;
      buyItem(item, price, type);
    });
  });
}

async function buyItem(item, price, type) {
  console.log(`🛒 Buying ${type}: ${item} for ${price} coins`);
  
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  
  if (!snapshot.exists()) {
    console.error("❌ No user data found!");
    return;
  }
  
  let data = snapshot.val();
  
  data = degrade(data);
  
  if ((data.coins || 0) < price) {
    alert('Недостаточно монет!');
    return;
  }
  
  if (type === 'accessory') {
    // Проверяем, куплен ли предыдущий аксессуар
    const itemIndex = SHOP_ITEMS.accessories.findIndex(acc => acc.id === item);
    if (itemIndex > 0) {
      const prevItem = SHOP_ITEMS.accessories[itemIndex - 1].id;
      if (!data.accessories || !data.accessories.includes(prevItem)) {
        alert('Сначала нужно купить предыдущий аксессуар!');
        return;
      }
    }
    
    // Инициализируем массив аксессуаров если его нет
    if (!data.accessories) {
      data.accessories = [];
    }
    
    if (!data.accessories.includes(item)) {
      // Покупка нового аксессуара
      data.accessories.push(item);
      data.currentAccessory = item;
      data.coins = (data.coins || 0) - price;
      showFloatingMessage(`Куплен ${getAccessoryName(item)}!`, 'action');
      console.log(`✅ Bought new accessory: ${item}`);
    } else {
      // Переключение аксессуара
      if (data.currentAccessory === item) {
        data.currentAccessory = null;
        showFloatingMessage('Аксессуар снят', 'action');
        console.log(`✅ Unequipped accessory: ${item}`);
      } else {
        data.currentAccessory = item;
        showFloatingMessage('Аксессуар надет', 'action');
        console.log(`✅ Equipped accessory: ${item}`);
      }
    }
  } else if (type === 'breed') {
    if (data.breed !== item) {
      data.breed = item;
      data.coins = (data.coins || 0) - price;
      showFloatingMessage(`Порода изменена на ${getBreedName(item)}!`, 'action');
      console.log(`✅ Changed breed to: ${item}`);
    }
  }
  
  data.lastUpdate = Date.now();
  
  try {
    await set(userRef, data);
    console.log("✅ Purchase saved successfully");
  } catch (error) {
    console.error("❌ Error saving purchase:", error);
    alert('Ошибка при сохранении покупки!');
  }
}

function getAccessoryName(id) {
  const item = SHOP_ITEMS.accessories.find(acc => acc.id === id);
  return item ? item.name : '';
}

function getBreedName(id) {
  const item = SHOP_ITEMS.breeds.find(breed => breed.id === id);
  return item ? item.name : '';
}

// Мини-игры
async function playDiceGame() {
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  
  if (!snapshot.exists()) {
    console.error("❌ No user data found!");
    return;
  }
  
  let data = snapshot.val();
  
  data = degrade(data);
  
  if ((data.happiness || 0) < 20) {
    alert('😿 Кот слишком грустный для игры! Поднимите настроение.');
    return;
  }
  
  const userGuess = parseInt(prompt('🎯 Угадай число от 1 до 6:'));
  
  if (isNaN(userGuess) || userGuess < 1 || userGuess > 6) {
    alert('❌ Введите число от 1 до 6!');
    return;
  }
  
  const dice = Math.floor(Math.random() * 6) + 1;
  
  if (userGuess === dice) {
    const bonusMultiplier = data.currentAccessory ? 
      SHOP_ITEMS.accessories.find(acc => acc.id === data.currentAccessory)?.bonus || 1 : 1;
    const coinsWon = Math.floor(15 * bonusMultiplier);
    
    data.coins = (data.coins || 0) + coinsWon;
    data.happiness = Math.min(100, (data.happiness || 0) + 10);
    alert(`🎉 Вы выиграли! +${coinsWon} монет, +10 к настроению`);
    showFloatingMessage(`+${coinsWon} монет! 🎉`, "coins");
  } else {
    data.happiness = Math.max(0, (data.happiness || 0) - 5);
    alert(`😔 Выпало: ${dice}. Попробуйте еще раз! -5 к настроению`);
  }
  
  data.lastUpdate = Date.now();
  
  try {
    await set(userRef, data);
  } catch (error) {
    console.error("❌ Error saving game result:", error);
  }
}

async function playClickGame() {
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  
  if (!snapshot.exists()) {
    console.error("❌ No user data found!");
    return;
  }
  
  let data = snapshot.val();
  
  data = degrade(data);
  
  if ((data.happiness || 0) < 15) {
    alert('😿 Кот слишком грустный для игры!');
    return;
  }
  
  const petAvatar = document.getElementById('pet-avatar');
  let clicks = 0;
  const startTime = Date.now();
  const timeLimit = 5000;
  
  alert('🎯 Быстро нажимайте на кота 5 раз за 5 секунд!');
  
  const originalCursor = petAvatar.style.cursor;
  petAvatar.style.cursor = 'pointer';
  
  const clickHandler = () => {
    clicks++;
    
    if (clicks >= 5) {
      const timeUsed = Date.now() - startTime;
      if (timeUsed <= timeLimit) {
        const bonusMultiplier = data.currentAccessory ? 
          SHOP_ITEMS.accessories.find(acc => acc.id === data.currentAccessory)?.bonus || 1 : 1;
        const coinsWon = Math.floor(20 * bonusMultiplier);
        
        data.coins = (data.coins || 0) + coinsWon;
        data.happiness = Math.min(100, (data.happiness || 0) + 15);
        alert(`🏆 Победа! +${coinsWon} монет, +15 к настроению! Время: ${(timeUsed/1000).toFixed(2)}с`);
        showFloatingMessage(`+${coinsWon} монет! 🏆`, "coins");
      } else {
        alert('⏰ Время вышло! Попробуйте еще раз.');
      }
      cleanup();
    }
  };
  
  const cleanup = () => {
    petAvatar.removeEventListener('click', clickHandler);
    petAvatar.style.cursor = originalCursor;
    data.lastUpdate = Date.now();
    
    set(userRef, data).catch(error => {
      console.error("❌ Error saving click game result:", error);
    });
  };
  
  petAvatar.addEventListener('click', clickHandler);
  
  setTimeout(() => {
    if (clicks < 5) {
      alert('⏰ Время вышло! Попробуйте еще раз.');
      cleanup();
    }
  }, timeLimit);
}

// Вспомогательные функции
function showFloatingMessage(text, type = 'action') {
  const message = document.createElement('div');
  message.textContent = text;
  message.className = `floating-message ${type}`;
  
  document.body.appendChild(message);
  
  setTimeout(() => {
    if (document.body.contains(message)) {
      document.body.removeChild(message);
    }
  }, 1500);
}

// Настройка обработчиков событий
function setupEventListeners() {
  console.log("🔧 Setting up event listeners...");
  
  // Основные действия
  document.getElementById('feed').addEventListener('click', () => {
    console.log("🍽️ Feed button clicked");
    updateStat('hunger', -25);
    showFloatingMessage("Ням-ням! 🍖", "action");
  });
  
  document.getElementById('play').addEventListener('click', () => {
    console.log("🧶 Play button clicked");
    updateStat('happiness', +15);
    showFloatingMessage("Весело! 🎾", "action");
  });
  
  document.getElementById('wash').addEventListener('click', () => {
    console.log("🛁 Wash button clicked");
    updateStat('cleanliness', +20);
    showFloatingMessage("Чистота! ✨", "action");
  });
  
  // Игры
  document.getElementById('dice-game').addEventListener('click', playDiceGame);
  document.getElementById('click-game').addEventListener('click', playClickGame);
  
  // Магазин
  document.getElementById('open-shop').addEventListener('click', () => {
    console.log("🏪 Opening shop");
    document.getElementById('shop-modal').style.display = 'flex';
  });
  
  document.getElementById('close-shop').addEventListener('click', () => {
    document.getElementById('shop-modal').style.display = 'none';
  });
  
  // Закрытие модальных окон при клике вне
  document.getElementById('shop-modal').addEventListener('click', (e) => {
    if (e.target.id === 'shop-modal') {
      document.getElementById('shop-modal').style.display = 'none';
    }
  });
  
  document.getElementById('name-modal').addEventListener('click', (e) => {
    if (e.target.id === 'name-modal') {
      document.getElementById('name-modal').style.display = 'none';
    }
  });
  
  // Система имени
  setupNameSystem();
  
  console.log("✅ Event listeners setup complete");
}

// Основная функция инициализации
async function initApp() {
  console.log("🚀 Starting app initialization...");
  
  try {
    await loginWithTelegramId();
    console.log("✅ Firebase authentication successful");
    
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      console.log("🆕 No user data found, creating initial data...");
      await initUserData(userRef);
    } else {
      console.log("✅ User data found, applying degradation...");
      let data = snapshot.val();
      console.log("📋 Loaded user data:", data);
      data = degrade(data);
      await set(userRef, data);
      console.log("✅ Degradation applied and saved");
    }
    
    // Слушатель реального времени
    console.log("👂 Setting up real-time listener...");
    onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        console.log("🔄 Real-time update received:", data);
        render(data);
      } else {
        console.error("❌ No data in real-time update");
      }
    });
    
    return true;
    
  } catch (error) {
    console.error("❌ Failed to initialize app:", error);
    throw error;
  }
}

// Запуск приложения
console.log("🎮 Starting application...");
initApp()
  .then(() => {
    console.log("✅ App initialized successfully");
    setupEventListeners();
    showFloatingMessage("Добро пожаловать! 🐱", "action");
  })
  .catch(error => {
    console.error("❌ Failed to initialize app:", error);
    alert("❌ Ошибка инициализации приложения. Провер

