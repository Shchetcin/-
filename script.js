// config.gs
const CONFIG = {
  SHEET_ID: '15h-OZqL316OhvV0nHQzwFtpcCQ5Ynt_KgJkQZgGnLFs', // Вставьте сюда ID вашей таблицы
  ALLOWED_ORIGINS: [
    'https://Shchetcin.github.io',
    'http://localhost:5500', // Для локальной разработки
    'https://127.0.0.1:5500'
  ]
};

// utils.gs
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    // Получаем origin из запроса
    var origin = e && e.source ? e.source : '';
    
    // Проверяем разрешен ли origin
    if (CONFIG.ALLOWED_ORIGINS.indexOf(origin) === -1 && origin !== '') {
      // Если не в списке, но можем разрешить все (для теста)
      // Для продакшена уберите этот блок
      origin = '*'; // Разрешаем всем на время разработки
    } else if (origin === '') {
      origin = '*'; // Для запросов без origin
    }
    
    // Устанавливаем CORS заголовки
    var headers = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };
    
    // Обрабатываем OPTIONS запрос (preflight)
    if (e && e.parameter && e.parameter.request === 'options') {
      return ContentService.createTextOutput()
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders(headers);
    }
    
    // Обрабатываем основной запрос
    var result = processRequest(e);
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(headers);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    });
  }
}

// main.gs
function processRequest(e) {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var action = e.parameter.action;
  
  switch(action) {
    case 'getTeams':
      return getTeams(ss);
    case 'getTeam':
      return getTeam(ss, e.parameter.teamId, e.parameter.code);
    case 'addPoints':
      return addPoints(ss, e.parameter);
    case 'getRating':
      return getRating(ss);
    case 'getHistory':
      return getHistory(ss, e.parameter.teamId);
    default:
      return { success: false, error: 'Unknown action' };
  }
}

function getTeams(ss) {
  var sheet = ss.getSheetByName('teams');
  var data = sheet.getDataRange().getValues();
  var teams = [];
  
  for (var i = 1; i < data.length; i++) {
    teams.push({
      id: data[i][0],
      name: data[i][1],
      score: data[i][2],
      code: data[i][3]
    });
  }
  
  return { success: true, teams: teams };
}

function getTeam(ss, teamId, code) {
  var sheet = ss.getSheetByName('teams');
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if ((teamId && data[i][0] == teamId) || (code && data[i][3] == code)) {
      return {
        success: true,
        team: {
          id: data[i][0],
          name: data[i][1],
          score: data[i][2],
          code: data[i][3]
        }
      };
    }
  }
  
  return { success: false, error: 'Team not found' };
}

function addPoints(ss, params) {
  var teamId = params.teamId;
  var points = parseInt(params.points);
  var reason = params.reason;
  var moderator = params.moderator || 'Admin';
  
  // Обновляем баллы в таблице teams
  var teamSheet = ss.getSheetByName('teams');
  var teamData = teamSheet.getDataRange().getValues();
  var newScore = 0;
  
  for (var i = 1; i < teamData.length; i++) {
    if (teamData[i][0] == teamId) {
      newScore = teamData[i][2] + points;
      teamSheet.getRange(i + 1, 3).setValue(newScore);
      break;
    }
  }
  
  // Добавляем запись в историю
  var logSheet = ss.getSheetByName('transactions');
  logSheet.appendRow([
    new Date(),
    teamId,
    points,
    reason,
    moderator
  ]);
  
  // Обновляем кеш
  SpreadsheetApp.flush();
  
  return { success: true, newScore: newScore };
}

function getRating(ss) {
  var sheet = ss.getSheetByName('teams');
  var data = sheet.getDataRange().getValues();
  var teams = [];
  
  for (var i = 1; i < data.length; i++) {
    teams.push({
      id: data[i][0],
      name: data[i][1],
      score: data[i][2]
    });
  }
  
  // Сортируем по убыванию баллов
  teams.sort(function(a, b) {
    return b.score - a.score;
  });
  
  return { success: true, teams: teams };
}

function getHistory(ss, teamId) {
  var sheet = ss.getSheetByName('transactions');
  var data = sheet.getDataRange().getValues();
  var history = [];
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] == teamId) {
      history.push({
        time: Utilities.formatDate(data[i][0], Session.getScriptTimeZone(), 'HH:mm'),
        change: data[i][2],
        reason: data[i][3],
        by: data[i][4]
      });
    }
  }
  
  // Сортируем по времени (последние сначала)
  history.reverse();
  
  return { success: true, history: history };
}

