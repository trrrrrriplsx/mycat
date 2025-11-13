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
    { id: 'hunger', fill: 'hunger-fill', value: data.hunger },
    { id: 'happiness', fill: 'happiness-fill', value: data.happiness },
    { id: 'cleanliness', fill: 'cleanliness-fill', value: data.cleanliness }
  ];
  
  stats.forEach(stat => {
    const element = document.getElementById(stat.id);
    const fillElement = document.querySelector(`.${stat.fill}`);
    
    element.textContent = stat.value;
    fillElement.style.width = `${stat.value}%`;
    
    if (stat.value < 30) {
      element.style.color = '#ff4444';
    } else if (stat.value < 70) {
      element.style.color = '#ffaa00';
    } else {
      element.style.color = '#00aa00';
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
  
  petAvatar.textContent = breedEmojis[data.breed] || '🐱';
  
  if (data.currentAccessory) {
    accessoryEl.style.display = 'block';
    accessoryEl.textContent = getAccessoryEmoji(data.currentAccessory);
  } else {
    accessoryEl.style.display = 'none';
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
 
