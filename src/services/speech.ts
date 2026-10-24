// Speech synthesis service for sideline voice instructions
// Uses the browser Web Speech API for offline speech in English and Spanish

import { SupportedLocale } from '../i18n/translations';

const STORAGE_KEY = 'sidelinesentry_voice';

// Checks if the browser supports speech synthesis
export function isVoiceSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined'
  );
}

// Reads whether the coach has enabled voice instructions
export function getVoiceEnabled(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

// Safely stops any ongoing speech
export function cancelVoice(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore errors if synthesis is unavailable
    }
  }
}

// Saves the coach preference and cancels speech immediately if turned off
export function setVoiceEnabled(enabled: boolean): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {
      // Ignore localStorage quota errors
    }
  }
  if (!enabled) {
    cancelVoice();
  }
}

// Speaks an instruction aloud if voice is enabled and supported
export function speakInstruction(text: string, lang: SupportedLocale): void {
  if (!isVoiceSupported() || !getVoiceEnabled()) {
    return;
  }

  try {
    cancelVoice();

    const utterance = new SpeechSynthesisUtterance(text);
    const targetLang = lang === 'es' ? 'es-ES' : 'en-US';
    utterance.lang = targetLang;

    if (typeof window.speechSynthesis.getVoices === 'function') {
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice =
        voices.find(v => v.lang === targetLang) ||
        voices.find(v => v.lang.toLowerCase().startsWith(lang === 'es' ? 'es' : 'en'));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  } catch {
    // Graceful fallback if synthesis fails
  }
}
