'use client';

/**
 * Money Shelter Real-Time Notification Sound & Voice Alert Engine
 * 
 * Provides:
 * 1. Crisp Web Audio API Chime (WhatsApp / iOS style marimba ding-dong chime)
 * 2. Natural Web Speech Voice Alert (announces new loan / case status)
 * 3. Mobile Device Vibration (haptic feedback)
 * 4. Browser Autoplay Audio Unlocker
 * 5. Notification Deduplication & User Sound Preferences
 */

export type SoundMode = 'voice' | 'chime' | 'mute';

const STORAGE_KEY_SOUND_MODE = 'qfs_notification_sound_mode';
const STORAGE_KEY_SEEN_IDS = 'qfs_seen_notification_ids';

let audioContext: AudioContext | null = null;
let audioUnlocked = false;

// Global memory cache of seen notification IDs
const seenNotificationIds = new Set<string>();

// Initialize seen IDs from sessionStorage if available
if (typeof window !== 'undefined') {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_SEEN_IDS);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach((id) => seenNotificationIds.add(id));
      }
    }
  } catch {}
}

/**
 * Get current sound preference ('voice' | 'chime' | 'mute')
 * Default is 'voice' (chime + voice alert)
 */
export function getNotificationSoundMode(): SoundMode {
  if (typeof window === 'undefined') return 'voice';
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SOUND_MODE);
    if (saved === 'voice' || saved === 'chime' || saved === 'mute') {
      return saved;
    }
  } catch {}
  return 'voice';
}

/**
 * Set user sound preference
 */
export function setNotificationSoundMode(mode: SoundMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SOUND_MODE, mode);
  } catch {}
}

/**
 * Safely get or create Web Audio Context
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioContext = new AudioCtx();
    }
  }

  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

/**
 * Unlock Web Audio and Speech Synthesis on user interaction
 */
export function unlockAudio(): void {
  if (typeof window === 'undefined') return;

  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Warm up speech synthesis voices
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }

    audioUnlocked = true;
  } catch {}
}

// Auto-unlock on first user interaction anywhere on the page
if (typeof window !== 'undefined') {
  const events = ['click', 'touchstart', 'keydown', 'pointerdown'];
  const handleFirstInteraction = () => {
    unlockAudio();
    events.forEach((evt) => {
      window.removeEventListener(evt, handleFirstInteraction);
    });
  };
  events.forEach((evt) => {
    window.addEventListener(evt, handleFirstInteraction, { passive: true });
  });
}

/**
 * Play WhatsApp / Messaging Style 3-Tone Notification Chime
 */
export function playChimeSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Harmonic tones: D5 (587.33Hz), A5 (880.00Hz), D6 (1174.66Hz)
    const tones = [
      { freq: 587.33, start: 0.00, duration: 0.16, gain: 0.35, type: 'sine' as OscillatorType },
      { freq: 880.00, start: 0.08, duration: 0.22, gain: 0.40, type: 'triangle' as OscillatorType },
      { freq: 1174.66, start: 0.16, duration: 0.38, gain: 0.30, type: 'sine' as OscillatorType },
    ];

    tones.forEach(({ freq, start, duration, gain: maxGain, type }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + start);

      // Sweet attack and smooth exponential decay
      gainNode.gain.setValueAtTime(0.001, now + start);
      gainNode.gain.exponentialRampToValueAtTime(maxGain, now + start + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration);
    });

    // Mobile vibration haptic
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([120, 60, 120]);
    }
  } catch (err) {
    console.warn('[notificationAudio] Chime playback failed:', err);
  }
}

/**
 * Format raw notification text into clear, natural spoken words
 */
function cleanTextForSpeech(text: string): string {
  return text
    // Remove all emojis (e.g. 🎉, 💰, 🔔, 📋, 🤝, 🎖️, 🚨)
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}]/gu, '')
    // Format ₹ amount into "X rupees"
    .replace(/₹\s*([0-9,]+)/g, '$1 rupees')
    // Expand banking / system acronyms for clear pronunciation
    .replace(/\bRM\b/g, 'Relationship Manager')
    .replace(/\bKYC\b/g, 'K Y C')
    .replace(/\bDSA\b/g, 'D S A')
    .replace(/\bDocs\b/gi, 'Documents')
    .replace(/\bReq\b/gi, 'Required')
    .replace(/\bp\.a\.\b/gi, 'per annum')
    .replace(/#([0-9a-zA-Z_-]+)/g, 'case $1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Announce notification via Web Speech API
 */
export function playVoiceAlert(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    // Resume speech synthesis if suspended by browser
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();

    const cleanText = cleanTextForSpeech(text);
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05; // Slightly brisk, clear pace
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Pick best English voice if available (e.g., Indian English or standard natural)
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang.includes('en-IN')) ||
      voices.find((v) => v.lang.includes('en-US')) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('[notificationAudio] Voice synthesis failed:', err);
  }
}

/**
 * Trigger combined alert (chime tone + optional voice speech)
 */
export function triggerNotificationAlert(notification: {
  id: string;
  title: string;
  message?: string;
}): void {
  const mode = getNotificationSoundMode();
  if (mode === 'mute') return;

  // 1. Play messaging chime tone immediately
  playChimeSound();

  // 2. Play voice alert if enabled
  if (mode === 'voice') {
    // Delay speech by 320ms so chime tone rings cleanly first
    setTimeout(() => {
      // Announce the title (which contains the core alert like "Loan Approved: 50,000 rupees")
      let speechText = notification.title;
      // If title is short (like "New Loan Application Received"), include the message lead
      if (notification.message && speechText.length < 35) {
        const firstSentence = notification.message.split('.')[0];
        if (firstSentence) {
          speechText = `${speechText}: ${firstSentence}`;
        }
      }
      playVoiceAlert(speechText);
    }, 320);
  }
}

/**
 * Check if a notification ID was already seen/alerted
 */
export function isNotificationSeen(id: string): boolean {
  return seenNotificationIds.has(id);
}

/**
 * Mark a notification ID as seen so it won't trigger repeated sound alerts
 */
export function markNotificationSeen(id: string): void {
  seenNotificationIds.add(id);
  if (typeof window !== 'undefined') {
    try {
      const arr = Array.from(seenNotificationIds).slice(-100); // keep last 100
      sessionStorage.setItem(STORAGE_KEY_SEEN_IDS, JSON.stringify(arr));
    } catch {}
  }
}

/**
 * Mark multiple notification IDs as seen (e.g. initial page load)
 */
export function seedSeenNotifications(ids: string[]): void {
  ids.forEach((id) => seenNotificationIds.add(id));
  if (typeof window !== 'undefined') {
    try {
      const arr = Array.from(seenNotificationIds).slice(-100);
      sessionStorage.setItem(STORAGE_KEY_SEEN_IDS, JSON.stringify(arr));
    } catch {}
  }
}

/**
 * Test alert for user verification in UI
 */
export function testNotificationSound(): void {
  unlockAudio();
  playChimeSound();
  const mode = getNotificationSoundMode();
  if (mode === 'voice') {
    setTimeout(() => {
      playVoiceAlert('Money Shelter voice alert is active. New notifications will sound like this.');
    }, 320);
  }
}
