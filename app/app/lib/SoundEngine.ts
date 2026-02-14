'use client';

/**
 * SoundEngine — Web Audio API based game sounds.
 * All sounds are procedurally generated (no external files needed).
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

/** Short tap/click for cell capture */
export function playCapture() {
    try {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.04);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
    } catch { /* silent fail */ }
}

/** Core zone capture — brighter, more resonant */
export function playCoreCapture() {
    try {
        const ctx = getCtx();
        // Two oscillators for richer tone
        for (const freq of [600, 900]) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.08);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.8, ctx.currentTime + 0.2);

            gain.gain.setValueAtTime(0.06, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.25);
        }
    } catch { /* silent fail */ }
}

/** Rank-up fanfare — rising arpeggio */
export function playRankUp() {
    try {
        const ctx = getCtx();
        const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            const startTime = ctx.currentTime + i * 0.1;

            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.07, startTime + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

            osc.start(startTime);
            osc.stop(startTime + 0.25);
        });
    } catch { /* silent fail */ }
}

/** Cluster bonus — low resonant thud + chime */
export function playClusterBonus() {
    try {
        const ctx = getCtx();

        // Low thud
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(120, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.15);
        gain1.gain.setValueAtTime(0.1, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.2);

        // Chime
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1200, ctx.currentTime + 0.05);
        gain2.gain.setValueAtTime(0.04, ctx.currentTime + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc2.start(ctx.currentTime + 0.05);
        osc2.stop(ctx.currentTime + 0.3);
    } catch { /* silent fail */ }
}

/** Round end — descending tone */
export function playRoundEnd() {
    try {
        const ctx = getCtx();
        const notes = [880, 784, 659, 523]; // A5 G5 E5 C5

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'triangle';
            const startTime = ctx.currentTime + i * 0.15;

            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.06, startTime + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

            osc.start(startTime);
            osc.stop(startTime + 0.3);
        });
    } catch { /* silent fail */ }
}

/** Error / denied beep */
export function playDenied() {
    try {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.setValueAtTime(150, ctx.currentTime + 0.06);

        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
    } catch { /* silent fail */ }
}
