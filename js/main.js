// main.js - Core Pomodoro timer logic

// --- State ---
let workDuration = 25 * 60;
let shortBreakDuration = 5 * 60;
let longBreakDuration = 15 * 60;

let timeLeft = workDuration;
let totalTime = workDuration;
let isRunning = false;
let timerInterval = null;

let isWorkSession = true;
let pomodoroCount = 0;       // completed work sessions
let sessionStartTime = null;

// Stats (today)
let workSessionsCount = 0;
let breakSessionsCount = 0;
let totalWorkSeconds = 0;
let totalBreakSeconds = 0;
let pomodorosCompleted = 0;

// Session history [{type, duration, startTime}]
let sessionHistory = [];

// Hourly analytics: { 'YYYY-MM-DD': { [hour]: workMinutes } }
let analyticsData = {};

// --- Init ---
window.addEventListener('load', () => {
    loadFromStorage();
    generateStars();
    updateTimerDisplay();
    updateStats();
    renderRecentSessions();
    updateFireStage();
});

// --- Timer Controls ---
function startTimer() {
    if (isRunning) return;
    isRunning = true;
    sessionStartTime = sessionStartTime || Date.now();

    document.getElementById('startBtn').disabled = true;
    document.getElementById('pauseBtn').disabled = false;

    if (tickingEnabled) startTicking();

    timerInterval = setInterval(() => {
        timeLeft--;

        if (isWorkSession) totalWorkSeconds++;
        else totalBreakSeconds++;

        updateTimerDisplay();
        updateProgressBar();
        updateFireStage();
        updateStats();

        if (timeLeft <= 0) sessionComplete();
    }, 1000);
}

function pauseTimer() {
    if (!isRunning) return;
    isRunning = false;
    clearInterval(timerInterval);
    timerInterval = null;
    stopTicking();
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
}

function resetTimer() {
    pauseTimer();
    timeLeft = isWorkSession ? workDuration : (pomodoroCount % 4 === 0 && pomodoroCount > 0 ? longBreakDuration : shortBreakDuration);
    totalTime = timeLeft;
    sessionStartTime = null;
    updateTimerDisplay();
    updateProgressBar();
    updateFireStage();
}

function skipSession() {
    pauseTimer();
    recordPartialSession();
    advanceSession();
}

function sessionComplete() {
    pauseTimer();
    playSessionEndChime();
    recordCompletedSession();
    advanceSession();
    saveToStorage();

    // Browser notification
    if (Notification.permission === 'granted') {
        new Notification(isWorkSession ? '☕ Break time!' : '🍅 Back to work!');
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

function advanceSession() {
    if (isWorkSession) {
        pomodoroCount++;
        pomodorosCompleted++;
        isWorkSession = false;
        if (pomodoroCount % 4 === 0) {
            timeLeft = longBreakDuration;
            totalTime = longBreakDuration;
            document.getElementById('sessionType').textContent = 'Long Break 🌙';
        } else {
            timeLeft = shortBreakDuration;
            totalTime = shortBreakDuration;
            document.getElementById('sessionType').textContent = 'Short Break ☕';
        }
    } else {
        isWorkSession = true;
        timeLeft = workDuration;
        totalTime = workDuration;
        document.getElementById('sessionType').textContent = 'Work Session';
    }
    sessionStartTime = null;
    updateTimerDisplay();
    updateProgressBar();
    updateFireStage();
    updateStats();
    renderRecentSessions();
}

// --- Session Recording ---
function recordCompletedSession() {
    const duration = totalTime - timeLeft;
    const entry = {
        type: isWorkSession ? 'work' : 'break',
        duration,
        startTime: sessionStartTime || Date.now(),
        completed: true
    };
    sessionHistory.unshift(entry);
    if (isWorkSession) workSessionsCount++;
    else breakSessionsCount++;
    recordAnalytics(entry);
}

function recordPartialSession() {
    const elapsed = totalTime - timeLeft;
    if (elapsed < 10) return;
    const entry = {
        type: isWorkSession ? 'work' : 'break',
        duration: elapsed,
        startTime: sessionStartTime || Date.now(),
        completed: false
    };
    sessionHistory.unshift(entry);
    recordAnalytics(entry);
}

function recordAnalytics(entry) {
    if (entry.type !== 'work') return;
    const d = new Date(entry.startTime);
    const dateKey = d.toISOString().slice(0, 10);
    const hour = d.getHours();
    if (!analyticsData[dateKey]) analyticsData[dateKey] = {};
    analyticsData[dateKey][hour] = (analyticsData[dateKey][hour] || 0) + Math.round(entry.duration / 60);
    saveToStorage();
}

// --- Display ---
function updateTimerDisplay() {
    const m = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const s = String(timeLeft % 60).padStart(2, '0');
    const display = `${m}:${s}`;
    document.getElementById('timer').textContent = display;
    document.getElementById('floatingTimer').textContent = display;
    document.title = `${display} - Pomodoro`;

    const type = document.getElementById('sessionType').textContent;
    document.getElementById('floatingSessionType').textContent = type;
}

function updateProgressBar() {
    const pct = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
    document.getElementById('progressBar').style.width = pct + '%';
}

function updateFireStage() {
    const pct = totalTime > 0 ? (totalTime - timeLeft) / totalTime : 0;
    const indicator = document.getElementById('fireStage');
    const bgGif = document.getElementById('backgroundGif');

    if (!isWorkSession) {
        indicator.textContent = '🪵 Fire: Resting';
        if (bgGif) bgGif.src = 'low_fire.gif';
        return;
    }

    if (pct < 0.33) {
        indicator.textContent = '🔥 Fire: High';
        if (bgGif) bgGif.src = 'high_fire.gif';
    } else if (pct < 0.66) {
        indicator.textContent = '🔥 Fire: Medium';
        if (bgGif) bgGif.src = 'mid_fire.gif';
    } else {
        indicator.textContent = '🕯️ Fire: Low';
        if (bgGif) bgGif.src = 'low_fire.gif';
    }
}

function updateStats() {
    document.getElementById('workSessionsCount').textContent = workSessionsCount;
    document.getElementById('breakSessionsCount').textContent = breakSessionsCount;
    document.getElementById('totalWorkTime').textContent = formatMinutes(totalWorkSeconds);
    document.getElementById('totalBreakTime').textContent = formatMinutes(totalBreakSeconds);
    document.getElementById('pomodorosCompleted').textContent = pomodorosCompleted;
}

function formatMinutes(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// --- Settings ---
function updateWorkDuration() {
    const v = parseInt(document.getElementById('workDurationInput').value) || 25;
    workDuration = v * 60;
    if (isWorkSession && !isRunning) { timeLeft = workDuration; totalTime = workDuration; updateTimerDisplay(); updateProgressBar(); }
}

function updateShortBreak() {
    const v = parseInt(document.getElementById('shortBreakInput').value) || 5;
    shortBreakDuration = v * 60;
}

function updateLongBreak() {
    const v = parseInt(document.getElementById('longBreakInput').value) || 15;
    longBreakDuration = v * 60;
}

// --- Stars ---
function generateStars() {
    const container = document.getElementById('stars');
    if (!container) return;
    for (let i = 0; i < 120; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        const size = Math.random() * 2.5 + 0.5;
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        star.style.animationDelay = Math.random() * 3 + 's';
        container.appendChild(star);
    }
}

// --- Persistence ---
function saveToStorage() {
    localStorage.setItem('pomodoro_stats', JSON.stringify({
        workSessionsCount, breakSessionsCount,
        totalWorkSeconds, totalBreakSeconds, pomodorosCompleted
    }));
    localStorage.setItem('pomodoro_history', JSON.stringify(sessionHistory.slice(0, 50)));
    localStorage.setItem('pomodoro_analytics', JSON.stringify(analyticsData));
}

function loadFromStorage() {
    try {
        const stats = JSON.parse(localStorage.getItem('pomodoro_stats') || '{}');
        const today = new Date().toDateString();
        const savedDate = localStorage.getItem('pomodoro_date');
        if (savedDate === today) {
            workSessionsCount = stats.workSessionsCount || 0;
            breakSessionsCount = stats.breakSessionsCount || 0;
            totalWorkSeconds = stats.totalWorkSeconds || 0;
            totalBreakSeconds = stats.totalBreakSeconds || 0;
            pomodorosCompleted = stats.pomodorosCompleted || 0;
        } else {
            localStorage.setItem('pomodoro_date', today);
        }
        sessionHistory = JSON.parse(localStorage.getItem('pomodoro_history') || '[]');
        analyticsData = JSON.parse(localStorage.getItem('pomodoro_analytics') || '{}');
    } catch (e) { console.error('Storage load error', e); }
}

function clearAllSessions() {
    if (!confirm('Clear all session history?')) return;
    sessionHistory = [];
    workSessionsCount = 0; breakSessionsCount = 0;
    totalWorkSeconds = 0; totalBreakSeconds = 0;
    pomodorosCompleted = 0;
    saveToStorage();
    updateStats();
    renderRecentSessions();
}
