// ui.js - UI interactions: panels, analytics, settings, background

// --- Panel Toggles ---
let leftPanelOpen = true;
let rightPanelOpen = true;
let settingsOpen = false;
let historyOpen = false;

function toggleLeftPanel() {
    leftPanelOpen = !leftPanelOpen;
    const panel = document.getElementById('leftPanel');
    const btn = document.getElementById('leftMinimizeBtn');
    panel.classList.toggle('minimized', !leftPanelOpen);
    btn.textContent = leftPanelOpen ? '▼' : '▶';
}

function toggleSettings() {
    settingsOpen = !settingsOpen;
    const el = document.getElementById('settingsContent');
    el.style.display = settingsOpen ? 'block' : 'none';
}

function toggleSessionHistory() {
    historyOpen = !historyOpen;
    const el = document.getElementById('sessionHistoryContent');
    el.style.display = historyOpen ? 'block' : 'none';
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        document.exitFullscreen().catch(() => {});
    }
}

// --- Session History Rendering ---
function renderRecentSessions() {
    const container = document.getElementById('recentSessionsList');
    if (!container) return;
    if (!sessionHistory.length) {
        container.innerHTML = '<p style="opacity:0.6;font-size:0.85rem;">No sessions yet.</p>';
        return;
    }
    container.innerHTML = sessionHistory.slice(0, 10).map(s => {
        const d = new Date(s.startTime);
        const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dur = Math.round(s.duration / 60);
        const icon = s.type === 'work' ? '🍅' : '☕';
        const label = s.type === 'work' ? 'Work' : 'Break';
        const status = s.completed ? '' : ' <span style="opacity:0.5">(partial)</span>';
        return `<div class="session-entry">
            <span>${icon} ${label}${status}</span>
            <span>${dur}m &nbsp; ${time}</span>
        </div>`;
    }).join('');
}

// --- Daily Analytics ---
let analyticsChart = null;

function openDailyAnalytics() {
    document.getElementById('analyticsModal').style.display = 'flex';
    renderDaySelector();
}

function closeAnalytics() {
    document.getElementById('analyticsModal').style.display = 'none';
}

function renderDaySelector() {
    const days = Object.keys(analyticsData).sort().reverse().slice(0, 7);
    const today = new Date().toISOString().slice(0, 10);
    if (!days.includes(today)) days.unshift(today);

    const selector = document.getElementById('daySelector');
    selector.innerHTML = days.map(d => {
        const label = d === today ? 'Today' : formatDateLabel(d);
        return `<button class="day-btn" onclick="showDayAnalytics('${d}', this)">${label}</button>`;
    }).join('');

    const firstBtn = selector.querySelector('.day-btn');
    if (firstBtn) { firstBtn.classList.add('active'); showDayAnalytics(today, firstBtn); }
}

function formatDateLabel(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function showDayAnalytics(dateKey, btn) {
    document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const data = analyticsData[dateKey] || {};
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const values = hours.map(h => data[h] || 0);
    const labels = hours.map(h => {
        const ampm = h < 12 ? 'am' : 'pm';
        const hr = h % 12 || 12;
        return `${hr}${ampm}`;
    });

    const totalMinutes = values.reduce((a, b) => a + b, 0);
    const peakHour = values.indexOf(Math.max(...values));

    document.getElementById('analyticsSummary').innerHTML = totalMinutes
        ? `<strong>Total work:</strong> ${totalMinutes}m &nbsp;|&nbsp; 
           <strong>Peak hour:</strong> ${labels[peakHour]} (${values[peakHour]}m)`
        : '<em>No data for this day.</em>';

    const ctx = document.getElementById('hourlyChart').getContext('2d');
    if (analyticsChart) analyticsChart.destroy();
    analyticsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Work (min)',
                data: values,
                backgroundColor: 'rgba(255, 120, 50, 0.7)',
                borderColor: 'rgba(255, 80, 20, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#ccc', maxRotation: 45 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#ccc' }, grid: { color: 'rgba(255,255,255,0.1)' }, beginAtZero: true }
            }
        }
    });
}

// --- Background Settings ---
function changeWallpaper() {
    const val = document.getElementById('wallpaperSelect').value;
    const img = document.getElementById('backgroundGif');
    const wallpapers = {
        campfire: 'high_fire.gif',
        forest:   'forest.gif',
        mountain: 'mountain.gif',
        ocean:    'ocean.gif'
    };
    if (img) img.src = wallpapers[val] || 'high_fire.gif';
}

function changeBackgroundOpacity(value) {
    document.getElementById('opacityValue').textContent = value + '%';
    const img = document.getElementById('backgroundGif');
    if (img) img.style.opacity = value / 100;
}

function handleBackgroundUpload() {
    const file = document.getElementById('bgFileUpload').files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = document.getElementById('backgroundGif');
    if (img) img.src = url;
}

function resetBackground() {
    const img = document.getElementById('backgroundGif');
    if (img) { img.src = 'high_fire.gif'; img.style.opacity = 0.4; }
    document.getElementById('opacitySlider').value = 40;
    document.getElementById('opacityValue').textContent = '40%';
    document.getElementById('wallpaperSelect').value = 'campfire';
}

// Close analytics modal on backdrop click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('analyticsModal');
    if (e.target === modal) closeAnalytics();
});
