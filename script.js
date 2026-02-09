// config.js
const CONFIG = {
  // Замените на URL вашего Google Apps Script веб-приложения
  API_URL: 'https://script.google.com/macros/s/AKfycbw.../exec',
  
  // Или если не работает, попробуйте через proxy (CORS Anywhere для теста):
  // API_URL: 'https://cors-anywhere.herokuapp.com/https://script.google.com/macros/s/AKfycbw.../exec',
  
  ADMIN_PASSWORD: 'org123',
  REFRESH_INTERVAL: 10000 // 10 секунд
};

// State
let currentTeam = null;
let isAdmin = false;
let refreshInterval = null;

// API Functions
async function callAPI(action, params = {}) {
  const url = new URL(CONFIG.API_URL);
  
  // Добавляем параметры
  params.action = action;
  Object.keys(params).forEach(key => {
    url.searchParams.append(key, params[key]);
  });
  
  try {
    // Для теста можно использовать fetch с mode: 'no-cors' 
    // но тогда не сможете читать ответ
    const response = await fetch(url.toString(), {
      method: 'GET',
      mode: 'cors' // Важно!
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('API Error:', error);
    
    // Фолбэк на фиктивные данные если API не работает
    return getMockData(action, params);
  }
}

// Mock data for fallback
function getMockData(action, params) {
  console.log('Using mock data for:', action);
  
  const mockTeams = [
    { id: 1, name: "Команда Альфа", score: 150, code: "ABC123" },
    { id: 2, name: "Команда Бета", score: 120, code: "DEF456" },
    { id: 3, name: "Команда Гамма", score: 90, code: "GHI789" },
    { id: 4, name: "Команда Дельта", score: 180, code: "JKL012" }
  ];
  
  switch(action) {
    case 'getTeams':
      return { success: true, teams: mockTeams };
      
    case 'getTeam':
      const code = params.code;
      const team = mockTeams.find(t => t.code === code);
      return team ? 
        { success: true, team: team } : 
        { success: false, error: 'Team not found' };
        
    case 'getRating':
      return { 
        success: true, 
        teams: [...mockTeams].sort((a, b) => b.score - a.score) 
      };
      
    case 'getHistory':
      const mockHistory = [
        { time: "10:30", change: 20, reason: "Победа в квесте", by: "Иван И." },
        { time: "11:45", change: 10, reason: "Активность", by: "Мария С." },
        { time: "12:15", change: 30, reason: "Творческий подход", by: "Алексей П." }
      ];
      return { success: true, history: mockHistory };
      
    case 'addPoints':
      // В мок-режиме просто обновляем локально
      const teamId = parseInt(params.teamId);
      const points = parseInt(params.points);
      const team = mockTeams.find(t => t.id === teamId);
      
      if (team) {
        team.score += points;
        return { success: true, newScore: team.score };
      }
      return { success: false, error: 'Team not found' };
      
    default:
      return { success: false, error: 'Unknown action' };
  }
}

// Authentication
async function loginAsTeam() {
  const code = document.getElementById('team-code').value.trim().toUpperCase();
  
  if (!code) {
    showNotification('Введите код команды', 'error');
    return;
  }
  
  showLoading(true);
  
  try {
    const result = await callAPI('getTeam', { code: code });
    
    if (result.success) {
      currentTeam = result.team;
      localStorage.setItem('currentTeam', JSON.stringify(currentTeam));
      showTeamScreen();
      loadTeamData();
      startAutoRefresh();
      showNotification(`Добро пожаловать, ${currentTeam.name}!`, 'success');
    } else {
      showNotification(result.error || 'Команда не найдена', 'error');
    }
  } catch (error) {
    showNotification('Ошибка подключения. Используется демо-режим', 'warning');
    // Используем фиктивные данные
    loginWithMockData(code);
  } finally {
    showLoading(false);
  }
}

function loginWithMockData(code) {
  const mockTeams = [
    { id: 1, name: "Команда Альфа", score: 150, code: "ABC123" },
    { id: 2, name: "Команда Бета", score: 120, code: "DEF456" },
    { id: 3, name: "Команда Гамма", score: 90, code: "GHI789" },
    { id: 4, name: "Команда Дельта", score: 180, code: "JKL012" }
  ];
  
  const team = mockTeams.find(t => t.code === code);
  
  if (team) {
    currentTeam = team;
    localStorage.setItem('currentTeam', JSON.stringify(currentTeam));
    showTeamScreen();
    loadTeamData();
    startAutoRefresh();
    showNotification(`Добро пожаловать, ${team.name}! (демо-режим)`, 'success');
  } else {
    showNotification('Команда не найдена. Попробуйте ABC123, DEF456, GHI789, JKL012', 'error');
  }
}

function loginAsAdmin() {
  const password = document.getElementById('admin-pass').value;
  
  if (password === CONFIG.ADMIN_PASSWORD) {
    isAdmin = true;
    localStorage.setItem('isAdmin', 'true');
    showAdminScreen();
    loadAdminData();
    startAutoRefresh();
    showNotification('Панель организатора активна', 'success');
  } else {
    showNotification('Неверный пароль. Попробуйте: org123', 'error');
  }
}

// Data Loading
async function loadTeamData() {
  if (!currentTeam) return;
  
  document.getElementById('team-name').textContent = currentTeam.name;
  document.getElementById('team-score').textContent = currentTeam.score;
  
  // Загружаем историю
  const result = await callAPI('getHistory', { teamId: currentTeam.id });
  
  if (result.success) {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = result.history.map(item => `
      <div class="history-item">
        <div><strong>${item.time}</strong> • ${item.reason}</div>
        <div style="color: ${item.change > 0 ? '#4CAF50' : '#f44336'}; font-weight: bold;">
          ${item.change > 0 ? '+' : ''}${item.change} баллов
        </div>
        <div style="font-size: 12px; color: #666;">Начислил: ${item.by}</div>
      </div>
    `).join('');
  }
  
  // Загружаем рейтинг
  await loadRating();
}

async function loadRating() {
  const result = await callAPI('getRating');
  
  if (result.success) {
    const ratingList = document.getElementById('rating-list');
    ratingList.innerHTML = result.teams.map((team, index) => {
      const isCurrent = currentTeam && team.id === currentTeam.id;
      return `
        <div class="rating-item ${isCurrent ? 'current' : ''}">
          <div class="position position-${index + 1}">${index + 1}</div>
          <div style="flex-grow: 1; padding: 0 15px;">
            <div><strong>${team.name}</strong></div>
            <div style="font-size: 12px; color: #666;">${team.score} баллов</div>
          </div>
          ${isCurrent ? '<div style="color: #2196F3;">👆 Ваша команда</div>' : ''}
        </div>
      `;
    }).join('');
  }
}

async function loadAdminData() {
  // Загружаем команды
  const result = await callAPI('getTeams');
  
  if (result.success) {
    const teams = result.teams;
    const teamSelect = document.getElementById('team-select');
    teamSelect.innerHTML = '<option value="">Выберите команду</option>' +
      teams.map(team => 
        `<option value="${team.id}">${team.name} (${team.score} баллов)</option>`
      ).join('');
    
    // Загружаем рейтинг
    await loadAdminRating();
  }
}

async function loadAdminRating() {
  const result = await callAPI('getRating');
  
  if (result.success) {
    const ratingList = document.getElementById('admin-rating');
    ratingList.innerHTML = result.teams.map((team, index) => `
      <div class="rating-item">
        <div class="position position-${index + 1}">${index + 1}</div>
        <div style="flex-grow: 1; padding: 0 15px;">
          <div><strong>${team.name}</strong></div>
          <div style="font-size: 12px; color: #666;">ID: ${team.id} • ${team.score} баллов</div>
        </div>
        <button onclick="selectTeam(${team.id})" style="width: auto; padding: 5px 10px; font-size: 12px;">
          Выбрать
        </button>
      </div>
    `).join('');
  }
}

// Admin Actions
async function addPoints() {
  const teamId = parseInt(document.getElementById('team-select').value);
  const points = parseInt(document.getElementById('points-input').value);
  const reason = document.getElementById('reason-input').value.trim();
  
  if (!teamId || isNaN(points) || !reason) {
    showNotification('Заполните все поля', 'error');
    return;
  }
  
  const result = await callAPI('addPoints', {
    teamId: teamId,
    points: points,
    reason: reason,
    moderator: 'Организатор'
  });
  
  if (result.success) {
    showNotification(`Начислено ${points} баллов! Новый счет: ${result.newScore}`, 'success');
    document.getElementById('points-input').value = '';
    document.getElementById('reason-input').value = '';
    
    // Обновляем данные
    loadAdminData();
    
    // Если пользователь смотрит эту команду, обновляем его экран
    if (currentTeam && currentTeam.id === teamId) {
      currentTeam.score = result.newScore;
      localStorage.setItem('currentTeam', JSON.stringify(currentTeam));
      loadTeamData();
    }
  } else {
    showNotification(result.error || 'Ошибка начисления', 'error');
  }
}

// UI Helpers
function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  if (!notification) {
    console.log(`[${type}] ${message}`);
    return;
  }
  
  notification.textContent = message;
  notification.className = `notification show ${type}`;
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

function showLoading(show) {
  let loader = document.getElementById('loader');
  if (!loader && show) {
    loader = document.createElement('div');
    loader.id = 'loader';
    loader.innerHTML = '<div class="spinner"></div>';
    loader.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255,255,255,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;
    document.body.appendChild(loader);
  } else if (loader && !show) {
    loader.remove();
  }
}

// Добавьте в style.css:
// .spinner { border: 5px solid #f3f3f3; border-top: 5px solid #667eea; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; }
// @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

// Auto-refresh
function startAutoRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    if (currentTeam) {
      loadTeamData();
    } else if (isAdmin) {
      loadAdminData();
    }
  }, CONFIG.REFRESH_INTERVAL);
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  const savedTeam = localStorage.getItem('currentTeam');
  const savedAdmin = localStorage.getItem('isAdmin');
  
  if (savedTeam) {
    try {
      currentTeam = JSON.parse(savedTeam);
      showTeamScreen();
      loadTeamData();
      startAutoRefresh();
    } catch (e) {
      localStorage.removeItem('currentTeam');
    }
  } else if (savedAdmin === 'true') {
    isAdmin = true;
    showAdminScreen();
    loadAdminData();
    startAutoRefresh();
  }
  
  // Добавляем стиль для спиннера
  const style = document.createElement('style');
  style.textContent = `
    .spinner { 
      border: 5px solid #f3f3f3; 
      border-top: 5px solid #667eea; 
      border-radius: 50%; 
      width: 50px; 
      height: 50px; 
      animation: spin 1s linear infinite; 
    }
    @keyframes spin { 
      0% { transform: rotate(0deg); } 
      100% { transform: rotate(360deg); } 
    }
  `;
  document.head.appendChild(style);
});

// Make functions global for onclick handlers
window.loginAsTeam = loginAsTeam;
window.loginAsAdmin = loginAsAdmin;
window.logout = logout;
window.addPoints = addPoints;
window.quickAdd = quickAdd;
window.selectTeam = selectTeam;

function quickAdd(points, reason) {
  const teamId = parseInt(document.getElementById('team-select').value);
  if (!teamId) {
    showNotification('Сначала выберите команду', 'error');
    return;
  }
  
  document.getElementById('points-input').value = points;
  document.getElementById('reason-input').value = reason;
  addPoints();
}

function selectTeam(teamId) {
  document.getElementById('team-select').value = teamId;
  document.getElementById('team-select').scrollIntoView({ behavior: 'smooth' });
}

function showTeamScreen() {
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('admin-screen').classList.remove('active');
  document.getElementById('team-screen').classList.add('active');
}

function showAdminScreen() {
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('team-screen').classList.remove('active');
  document.getElementById('admin-screen').classList.add('active');
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

function logout() {
  currentTeam = null;
  isAdmin = false;
  localStorage.removeItem('currentTeam');
  localStorage.removeItem('isAdmin');
  stopAutoRefresh();
  document.getElementById('login-screen').classList.add('active');
  document.getElementById('team-screen').classList.remove('active');
  document.getElementById('admin-screen').classList.remove('active');
}
