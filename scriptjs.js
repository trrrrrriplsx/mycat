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
    await signInWithCustomToken(auth, token);
  } catch (error) {
    console.error("Error during signInWithCustomToken:", error);
    throw error;
  }
}

async function initUserData(userRef) {
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
  return initialData;
}

function render(data) {
  document.getElementById('coins').textContent = data.coins;
  document.getElementById('pet-name-display').textContent = data.name;
  
  updateProgressBars(data);
  updatePetAppearance(data);
  renderShopItems(data);
}

function updateProgressBars(data) {
  const stats = [
    { id: 'hunger', type: 'hunger', value: data.hunger },
    { id: 'happiness', type: 'happiness', value: data.happiness },
    { id: 'cleanliness', type: 'cleanliness', value: data.cleanliness }
  ];
  
  stats.forEach(stat => {
    const element = document.getElementById(stat.id);
    const fillElement = document.querySelector(`.progress-fill[data-type="${stat.type}"]`);
    
    if (element && fillElement) {
      element.textContent = stat.value;
      fillElement.style.width = `${stat.value}%`;
      
      // Обновляем цвета текста в зависимости от значений
      if (stat.value < 30) {
        element.style.color = '#ff4444';
      } else if (stat.value < 70) {
        element.style.color = '#ffaa00';
      } else {
        element.style.color = '#00aa00';
      }
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
    } else {
      accessoryEl.style.display = 'none';
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
  const hoursPassed = (now - data.lastUpdate) / (60 * 60 * 1000);
  
  const newData = { ...data };
  newData.hunger = Math.min(100, newData.hunger + Math.floor(hoursPassed * 5));
  newData.happiness = Math.max(0, newData.happiness - Math.floor(hoursPassed * 3));
  newData.cleanliness = Math.max(0, newData.cleanliness - Math.floor(hoursPassed * 2));
  newData.lastUpdate = now;
  
  return newData;
}

async function updateStat(field, delta) {
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  let data = snapshot.val();
  
  data = degrade(data);
  data[field] = Math.min(100, Math.max(0, data[field] + delta));
  data.lastUpdate = Date.now();
  
  // Добавляем монеты за уход
  if (delta > 0 && data[field] > 70) {
    const coinsEarned = Math.floor(delta / 10);
    data.coins += coinsEarned;
    showFloatingMessage(`+${coinsEarned} монет!`, 'coins');
  }
  
  await set(userRef, data);
  render(data);
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
    
    await set(userRef, data);
    document.getElementById('pet-name-display').textContent = newName;
    nameModal.style.display = 'none';
    nameInput.value = '';
    showFloatingMessage(`Имя изменено на: ${newName}`, 'action');
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
  
  // Рендерим аксессуары
  SHOP_ITEMS.accessories.forEach((item, index) => {
    const owned = data.accessories && data.accessories.includes(item.id);
    const equipped = data.currentAccessory === item.id;
    const canBuy = index === 0 || (data.accessories && data.accessories.includes(SHOP_ITEMS.accessories[index - 1].id));
    
    const shopItem = document.createElement('div');
    shopItem.className = `shop-item ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''} ${!canBuy ? 'disabled' : ''}`;
    
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
        ${equipped ? 'Надето' : owned ? 'Надеть' : 'Купить'}
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
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  let data = snapshot.val();
  
  data = degrade(data);
  
  if (data.coins < price) {
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
      data.coins -= price;
      showFloatingMessage(`Куплен ${getAccessoryName(item)}!`, 'action');
    } else {
      // Переключение аксессуара
      if (data.currentAccessory === item) {
        data.currentAccessory = null;
        showFloatingMessage('Аксессуар снят', 'action');
      } else {
        data.currentAccessory = item;
        showFloatingMessage('Аксессуар надет', 'action');
      }
    }
  } else if (type === 'breed') {
    if (data.breed !== item) {
      data.breed = item;
      data.coins -= price;
      showFloatingMessage(`Порода изменена на ${getBreedName(item)}!`, 'action');
    }
  }
  
  data.lastUpdate = Date.now();
  await set(userRef, data);
  render(data);
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
  let data = snapshot.val();
  
  data = degrade(data);
  
  if (data.happiness < 20) {
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
    
    data.coins += coinsWon;
    data.happiness = Math.min(100, data.happiness + 10);
    alert(`🎉 Вы выиграли! +${coinsWon} монет, +10 к настроению`);
    showFloatingMessage(`+${coinsWon} монет! 🎉`, "coins");
  } else {
    data.happiness = Math.max(0, data.happiness - 5);
    alert(`😔 Выпало: ${dice}. Попробуйте еще раз! -5 к настроению`);
  }
  
  data.lastUpdate = Date.now();
  await set(userRef, data);
  render(data);
}

async function playClickGame() {
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  let data = snapshot.val();
  
  data = degrade(data);
  
  if (data.happiness < 15) {
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
        
        data.coins += coinsWon;
        data.happiness = Math.min(100, data.happiness + 15);
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
    
    set(userRef, data).then(() => {
      render(data);
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
  // Основные действия
  document.getElementById('feed').addEventListener('click', () => {
    updateStat('hunger', -25);
    showFloatingMessage("Ням-ням! 🍖", "action");
  });
  
  document.getElementById('play').addEventListener('click', () => {
    updateStat('happiness', +15);
    showFloatingMessage("Весело! 🎾", "action");
  });
  
  document.getElementById('wash').addEventListener('click', () => {
    updateStat('cleanliness', +20);
    showFloatingMessage("Чистота! ✨", "action");
  });
  
  // Игры
  document.getElementById('dice-game').addEventListener('click', playDiceGame);
  document.getElementById('click-game').addEventListener('click', playClickGame);
  
  // Магазин
  document.getElementById('open-shop').addEventListener('click', () => {
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
}

// Основная функция инициализации
async function initApp() {
  try {
    await loginWithTelegramId();
    const userRef = ref(db, `users/${userId}`);
    
    const snapshot = await get(userRef);
    if (!snapshot.exists()) {
      await initUserData(userRef);
    } else {
      let data = snapshot.val();
      data = degrade(data);
      await set(userRef, data);
    }
    
    // Слушатель реального времени
    onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        render(data);
      }
    });
    
    return true;
    
  } catch (error) {
    console.error("Failed to initialize app:", error);
    throw error;
  }
}

// Запуск приложения
initApp()
  .then(() => {
    setupEventListeners();
    showFloatingMessage("Добро пожаловать! 🐱", "action");
  })
  .catch(error => {
    console.error("Failed to initialize app:", error);
    alert("❌ Ошибка инициализации приложения.");
  });
