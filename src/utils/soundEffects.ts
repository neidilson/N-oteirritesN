/**
 * Web Audio API Sound Synthesizer for N - Não Te Irrites
 * Produces crisp, delightful gaming sound effects with zero external file dependencies.
 */

import type { CaptureSkillKind } from './captureSkills';

export type DiceSoundPreset = 'original' | 'wood' | 'casino' | 'arcade' | 'silent';

export const DICE_SOUND_OPTIONS: { id: DiceSoundPreset; label: string }[] = [
  { id: 'original', label: 'Original (Clássico)' },
  { id: 'wood', label: 'Madeira Suave' },
  { id: 'casino', label: 'Casino / Marfim' },
  { id: 'arcade', label: 'Arcade Turbo' },
  { id: 'silent', label: 'Sem Som no Dado' }
];

let audioCtx: AudioContext | null = null;
let isSoundMuted = false;
let diceSoundPreset: DiceSoundPreset = 'original';

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Original classic board-game dice taps (clean triangle/sine clicks, zero noise hiss)
function playOriginalRoll(ctx: AudioContext, singleTap = false) {
  const now = ctx.currentTime;
  const count = singleTap ? 2 : 6;
  for (let i = 0; i < count; i++) {
    const t = now + i * (singleTap ? 0.045 : 0.055);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const startFreq = singleTap ? 480 - i * 90 : 280 + Math.random() * 280;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.042);

    const peak = singleTap ? 0.24 - i * 0.08 : 0.24 - i * 0.024;
    gain.gain.setValueAtTime(Math.max(0.05, peak), t);
    gain.gain.exponentialRampToValueAtTime(0.008, t + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }
}

// Warm soft wood/marimba knock
function playWoodRoll(ctx: AudioContext, singleTap = false) {
  const now = ctx.currentTime;
  const times = singleTap ? [0, 0.032] : [0, 0.068, 0.125, 0.175, 0.222];
  const freqs = singleTap ? [320, 260] : [290, 350, 250, 310, 230];
  times.forEach((dt, idx) => {
    const t = now + dt;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freqs[idx] || 280, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.036);

    const vol = Math.max(0.08, 0.34 - idx * 0.05);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.038);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.042);
  });
}

// Crisp bright casino/ivory die taps
function playCasinoRoll(ctx: AudioContext, singleTap = false) {
  const now = ctx.currentTime;
  const times = singleTap ? [0, 0.025] : [0, 0.052, 0.095, 0.145, 0.195, 0.242];
  times.forEach((dt, idx) => {
    const t = now + dt;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const base = 680 + (idx % 3) * 140;
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.024);

    const vol = Math.max(0.06, 0.24 - idx * 0.03);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.026);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.03);
  });
}

// Playful arcade turbo pops
function playArcadeRoll(ctx: AudioContext, singleTap = false) {
  const now = ctx.currentTime;
  const freqs = singleTap ? [520, 680] : [420, 520, 640, 560, 740, 880];
  freqs.forEach((f, idx) => {
    const t = now + idx * 0.042;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, t);
    osc.frequency.exponentialRampToValueAtTime(f * 1.25, t + 0.035);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.006, t + 0.038);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.042);
  });
}

export const soundManager = {
  get isMuted() {
    return isSoundMuted;
  },

  setMuted(muted: boolean) {
    isSoundMuted = muted;
    try {
      localStorage.setItem('nao_te_irrites_muted', muted ? 'true' : 'false');
    } catch {
      // ignore
    }
  },

  getDiceSoundPreset(): DiceSoundPreset {
    return diceSoundPreset;
  },

  setDiceSoundPreset(preset: DiceSoundPreset) {
    diceSoundPreset = preset;
    try {
      localStorage.setItem('nao_te_irrites_dice_sound', preset);
    } catch {
      // ignore
    }
  },

  init() {
    try {
      const stored = localStorage.getItem('nao_te_irrites_muted');
      if (stored !== null) {
        isSoundMuted = stored === 'true';
      }
      const storedPreset = localStorage.getItem('nao_te_irrites_dice_sound') as DiceSoundPreset | null;
      if (storedPreset && DICE_SOUND_OPTIONS.some((o) => o.id === storedPreset)) {
        diceSoundPreset = storedPreset;
      }
    } catch {
      // ignore
    }
  },

  // Single crisp die tap when clicking directly
  playDiceTap() {
    if (isSoundMuted || diceSoundPreset === 'silent') return;
    const ctx = getAudioContext();
    if (!ctx) return;
    if (diceSoundPreset === 'wood') return playWoodRoll(ctx, true);
    if (diceSoundPreset === 'casino') return playCasinoRoll(ctx, true);
    if (diceSoundPreset === 'arcade') return playArcadeRoll(ctx, true);
    return playOriginalRoll(ctx, true);
  },

  // Subtle wall bounce tap (only on wood/casino presets to keep original/arcade clean)
  playDiceWallBounce() {
    if (isSoundMuted || (diceSoundPreset !== 'wood' && diceSoundPreset !== 'casino')) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    if (diceSoundPreset === 'wood') return playWoodRoll(ctx, true);
    return playCasinoRoll(ctx, true);
  },

  // Dice roll sound respecting the player's selected sound preset
  playDiceRoll() {
    if (isSoundMuted || diceSoundPreset === 'silent') return;
    const ctx = getAudioContext();
    if (!ctx) return;
    if (diceSoundPreset === 'wood') return playWoodRoll(ctx, false);
    if (diceSoundPreset === 'casino') return playCasinoRoll(ctx, false);
    if (diceSoundPreset === 'arcade') return playArcadeRoll(ctx, false);
    return playOriginalRoll(ctx, false);
  },

  // Move step for a piece
  playPieceMove() {
    if (isSoundMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  },

  // Capture piece (Dramatic boom + triumphant chime)
  playCapture() {
    if (isSoundMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Bass thud
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.28);
    subGain.gain.setValueAtTime(0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.29);

    // Chime glissando
    [520, 680, 880, 1040].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + 0.08 + idx * 0.05;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.16);
    });
  },

  // Theme & base-specific piece capture ability sound
  playCaptureSkill(kind: CaptureSkillKind) {
    if (isSoundMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (kind === 'fire_breath') {
      // Filtered noise roar + low flame rumble
      const bufSize = Math.floor(ctx.sampleRate * 0.42);
      const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(340, now);
      filter.frequency.exponentialRampToValueAtTime(1100, now + 0.16);
      filter.frequency.exponentialRampToValueAtTime(260, now + 0.42);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.36, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.42);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      return;
    }

    if (kind === 'lightning_bolt') {
      // Sharp electric zap + thunder drop
      [1480, 920, 1760, 620].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + idx * 0.035;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.09);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
      });
      return;
    }

    if (kind === 'monster_fist') {
      // Heavy seismic smash punch
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(190, now);
      sub.frequency.exponentialRampToValueAtTime(38, now + 0.34);
      subGain.gain.setValueAtTime(0.5, now);
      subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      sub.connect(subGain);
      subGain.connect(ctx.destination);
      sub.start(now);
      sub.stop(now + 0.36);

      const crack = ctx.createOscillator();
      const crackGain = ctx.createGain();
      crack.type = 'square';
      crack.frequency.setValueAtTime(280, now);
      crack.frequency.exponentialRampToValueAtTime(75, now + 0.12);
      crackGain.gain.setValueAtTime(0.22, now);
      crackGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      crack.connect(crackGain);
      crackGain.connect(ctx.destination);
      crack.start(now);
      crack.stop(now + 0.13);
      return;
    }

    if (kind === 'football_shot') {
      // Crisp ball kick thump + stadium cheer chime
      const kick = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(240, now);
      kick.frequency.exponentialRampToValueAtTime(55, now + 0.14);
      kickGain.gain.setValueAtTime(0.42, now);
      kickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      kick.connect(kickGain);
      kickGain.connect(ctx.destination);
      kick.start(now);
      kick.stop(now + 0.16);

      [587.33, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + 0.11 + idx * 0.055;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.17);
      });
      return;
    }

    if (kind === 'cyber_laser') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1600, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.28);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.29);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
      return;
    }

    if (kind === 'royal_sword' || kind === 'forest_arrows') {
      [980, 1320, 1760].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + idx * 0.05;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.65, t + 0.14);
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.16);
      });
      return;
    }

    // graffiti_boom, scarab_swarm, or fallback
    this.playCapture();
  },

  // Captured sad slide ("Não acredito!")
  playCapturedSad() {
    if (isSoundMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.4);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.42);
  },

  // Victory Fanfare
  playVictory() {
    if (isSoundMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [440, 554.37, 659.25, 880, 880, 880, 1108.73];
    const durations = [0.12, 0.12, 0.12, 0.18, 0.1, 0.1, 0.45];
    let time = ctx.currentTime + 0.05;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + durations[i]);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + durations[i] + 0.02);

      time += durations[i] + 0.04;
    });
  },

  // Turn Timer tick warning
  playTimerTick() {
    if (isSoundMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  },

  // Coin sound for deposit / win
  playCoin() {
    if (isSoundMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [987.77, 1318.51].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.07;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.24);
    });
  },

  // In-game message pop
  playMessagePop() {
    if (isSoundMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }
};
