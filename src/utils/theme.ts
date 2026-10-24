// High-contrast outdoor sunlight mode helper for high school sidelines.
// Toggles the 'sunlight' CSS class on document.documentElement and saves the coach's choice.

export const THEME_STORAGE_KEY = 'sidelinesentry_theme';

export function getSunlightMode(): boolean {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'sunlight') return true;
      if (stored === 'standard') return false;
    } catch {
      // If localStorage is not accessible, fall back to checking the DOM
    }
  }

  if (typeof document !== 'undefined' && document.documentElement) {
    return document.documentElement.classList.contains('sunlight');
  }

  return false;
}

export function setSunlightMode(enabled: boolean): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, enabled ? 'sunlight' : 'standard');
    } catch {
      // Storage might be restricted on some devices
    }
  }

  if (typeof document !== 'undefined' && document.documentElement) {
    if (enabled) {
      document.documentElement.classList.add('sunlight');
    } else {
      document.documentElement.classList.remove('sunlight');
    }
  }
}

export function toggleSunlightMode(): boolean {
  const next = !getSunlightMode();
  setSunlightMode(next);
  return next;
}

export function initSunlightMode(): boolean {
  const isEnabled = getSunlightMode();
  if (typeof document !== 'undefined' && document.documentElement) {
    if (isEnabled) {
      document.documentElement.classList.add('sunlight');
    } else {
      document.documentElement.classList.remove('sunlight');
    }
  }
  return isEnabled;
}
