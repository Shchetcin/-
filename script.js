// Конфигурация
const CONFIG = {
    SHEET_ID: '15h-OZqL316OhvV0nHQzwFtpcCQ5Ynt_KgJkQZgGnLFs',
    ADMIN_PASSWORD: 'org123', // Простой пароль для демо
    REFRESH_INTERVAL: 5000 // Обновление каждые 5 секунд
};

let currentTeam = null;
let isAdmin = false;
let refreshInterval = null;

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, есть ли сохраненная сессия
    const savedTeam = localStorage.getItem('currentTeam');
    const savedAdmin = localStorage.getItem('isAdmin');
    
    if (savedTeam) {
        currentTeam = JSON.parse(savedTeam);
        showTeamScreen();
        loadTeamData();
        startAutoRefresh();
    } else if (savedAdmin === 'true') {
        isAdmin = true;
        showAdminScreen();
        loadAdminData();
        startAutoRefresh();
    }
});

// Функции авторизации
async function loginAsTeam() {
    const code = document.getElementById('team-code').value.trim().toUpperCase();
    
    if (!code) {
        showNotification('Введите код команды', 'error');
        return;
    }
    
    // Ищем команду в Google Sheets
    try {
        const teams = await getTeams();
        const team = teams.find(t => t.code === code);
        
        if (team) {
            currentTeam = team;
            localStorage.setItem('currentTeam', JSON.stringify(team));
            showTeamScreen();
            loadTeamData();
            startAutoRefresh();
            showNotification(`Добро пожаловать, ${team.name}!`, 'success');
        } else {
            showNotification('Команда не найдена', 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка подключения', 'error');
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
        showNotification('Неверный пароль', 'error');
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

// Работа с Google Sheets через Apps Script
async function getTeams() {
    // Для демо используем фиктивные данные
    // В реальном приложении здесь будет запрос к вашему скрипту
    
    // Пример фиктивных данных
    return [
        { id: 1, name: "Команда А", score: 150, code: "ABC123" },
        { id: 2, name: "Команда B", score: 120, code: "DEF456" },
        { id: 3, name: "Команда C", score: 90, code: "GHI789" },
        { id: 4, name: "Команда D", score: 180, code: "JKL012" }
    ];
}

async function getTeamHistory(teamId) {
    // Фиктивная история
    return [
        { time: "10:30", change: 20, reason: "Победа в квесте", by: "Иван И." },
        { time: "11:45", change: 10, reason: "Активность", by: "Мария С." },
        { time: "12:15", change: 30, reason: "Творческий подход", by: "Алексей П." }
    ];
}

async function addPointsToTeam(teamId, points, reason) {
    // В реальном приложении здесь запись в Google Sheets
    console.log(`Начислено команде ${teamId}: ${points} баллов. Причина: ${reason}`);
    
    // Обновляем локальные данные
    const teams = await getTeams();
    const team = teams.find(t => t.id === teamId);
    if (team) {
        team.score += points;
    }
    
    return { success: true };
}

// Обновление интерфейса
async function loadTeamData() {
    if (!currentTeam) return;
    
    document.getElementById('team-name').textContent = currentTeam.name;
    document.getElementById('team-score').textContent = currentTeam.score;
    
    // Загружаем историю
    const history = await getTeamHistory(currentTeam.id);
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = history.map(item => `
        <div class="history-item">
            <div><strong>${item.time}</strong> • ${item.reason}</div>
            <div style="color: ${item.change > 0 ? '#4CAF50' : '#f44336'}; font-weight: bold;">
                ${item.change > 0 ? '+' : ''}${item.change} баллов
            </div>
            <div style="font-size: 12px; color: #666;">Начислил: ${item.by}</div>
        </div>
    `).join('');
    
    // Загружаем рейтинг
    await loadRating();
}

async function loadAdminData() {
    // Загружаем список команд для выпадающего списка
    const teams = await getTeams();
    const teamSelect = document.getElementById('team-select');
    teamSelect.innerHTML = '<option value="">Выберите команду</option>' +
        teams.map(team => 
            `<option value="${team.id}">${team.name} (${team.score} баллов)</option>`
        ).join('');
    
    // Загружаем рейтинг
    await loadAdminRating();
}

async function loadRating() {
    const teams = await getTeams();
    teams.sort((a, b) => b.score - a.score);
    
    const ratingList = document.getElementById('rating-list');
    ratingList.innerHTML = teams.map((team, index) => {
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

async function loadAdminRating() {
    const teams = await getTeams();
    teams.sort((a, b) => b.score - a.score);
    
    const ratingList = document.getElementById('admin-rating');
    ratingList.innerHTML = teams.map((team, index) => `
        <div class="rating-item">
            <div class="position position-${index + 1}">${index + 1}</div>
            <div style="flex-grow: 1; padding: 0 15px;">
                <div><strong>${team.name}</strong></div>
                <div style="font-size: 12px; color: #666;">ID: ${team.code} • ${team.score} баллов</div>
            </div>
            <button onclick="selectTeam(${team.id})" style="width: auto; padding: 5px 10px; font-size: 12px;">
                Выбрать
            </button>
        </div>
    `).join('');
}

// Действия организатора
async function addPoints() {
    const teamId = parseInt(document.getElementById('team-select').value);
    const points = parseInt(document.getElementById('points-input').value);
    const reason = document.getElementById('reason-input').value.trim();
    
    if (!teamId || !points || !reason) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    const result = await addPointsToTeam(teamId, points, reason);
    
    if (result.success) {
        showNotification(`Начислено ${points} баллов!`, 'success');
        document.getElementById('points-input').value = '';
        document.getElementById('reason-input').value = '';
        
        // Обновляем данные
        if (isAdmin) {
            loadAdminData();
        }
        if (currentTeam && currentTeam.id === teamId) {
            currentTeam.score += points;
            loadTeamData();
        }
    }
}

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
    document.getElementById('team-select').scrollIntoView();
}

// Утилиты
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification show ${type}`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
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

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// Создаем PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
}
