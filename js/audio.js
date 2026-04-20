// audio.js - Ticking sound via Web Audio API

let audioCtx = null;
let tickInterval = null;
let tickingEnabled = false;

function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function playTick() {
    const ctx = getAudioCtx();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.08);
}

function playSessionEndChime() {
    const ctx = getAudioCtx();
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        const t = ctx.currentTime + i * 0.25;
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.start(t);
        osc.stop(t + 0.5);
    });
}

function startTicking() {
    if (!tickingEnabled || tickInterval) return;
    tickInterval = setInterval(playTick, 1000);
}

function stopTicking() {
    if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
    }
}

function toggleTickingSound() {
    tickingEnabled = document.getElementById('tickingSoundCheckbox').checked;
    if (!tickingEnabled) {
        stopTicking();
    } else if (isRunning) {
        startTicking();
    }
}
