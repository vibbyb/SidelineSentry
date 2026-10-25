// Service for managing athlete concussion recovery and CDC return-to-play progression
// Saves data in localStorage under key 'sidelinesentry_recovery'

import {
  AthleteRecoveryRecord,
  RecoveryStore,
  ReturnToPlayStep,
  SymptomEntry,
  SymptomKey,
  SymptomRatings
} from '../types/recovery';

export const RECOVERY_STORAGE_KEY = 'sidelinesentry_recovery';

// Get storage instance safely across browser and test environments
function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof localStorage !== 'undefined') return localStorage;
  const globalStorage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  return globalStorage || null;
}

// Default 6 CDC HEADS UP return to play steps
export function getDefaultSteps(): ReturnToPlayStep[] {
  return [
    {
      stepNumber: 1,
      name: 'Back to regular activities (school)',
      description: 'Athlete is back to regular activities like school and normal daily routines without symptoms worsening.',
      completed: false
    },
    {
      stepNumber: 2,
      name: 'Light aerobic activity (walking or stationary cycling)',
      description: 'Light exercise like walking or stationary bike, no resistance training.',
      completed: false
    },
    {
      stepNumber: 3,
      name: 'Moderate activity (jogging, brief running, moderate intensity)',
      description: 'Moderate aerobic activity like jogging or brief running drills to raise heart rate.',
      completed: false
    },
    {
      stepNumber: 4,
      name: 'Heavy, non-contact activity (sprinting, non-contact sport drills)',
      description: 'Harder non-contact drills like sprinting and agility drills.',
      completed: false
    },
    {
      stepNumber: 5,
      name: 'Practice and full contact (normal training practice after medical clearance)',
      description: 'Normal training practice and contact drills after written clearance from a medical provider.',
      completed: false
    },
    {
      stepNumber: 6,
      name: 'Competition (return to full game play)',
      description: 'Return to full game play and normal competition.',
      completed: false
    }
  ];
}

// Create a blank recovery record for an athlete
export function createDefaultRecoveryRecord(athleteId: string): AthleteRecoveryRecord {
  return {
    athleteId,
    returnToPlay: {
      steps: getDefaultSteps(),
      medicalClearance: {
        clearedByProvider: false,
        providerName: '',
        clearanceDate: undefined
      },
      lessThan24hWarning: false
    },
    symptomLog: [],
    lastUpdated: new Date().toISOString(),
    lessThan24hWarning: false
  };
}

// Calculate total symptom score from 7 symptoms (max 42)
export function calculateTotalSymptomScore(symptoms: Partial<SymptomRatings> | undefined): number {
  if (!symptoms) return 0;
  const keys: SymptomKey[] = [
    'headache',
    'dizziness',
    'nausea',
    'lightNoiseSensitivity',
    'fogginess',
    'concentration',
    'sleep'
  ];
  return keys.reduce((sum, key) => {
    const val = symptoms[key];
    return sum + (typeof val === 'number' && !isNaN(val) ? Math.max(0, Math.min(6, Math.round(val))) : 0);
  }, 0);
}

// Clamp symptom scores into valid 0-6 integers
function sanitizeSymptoms(symptoms: Partial<SymptomRatings> | undefined): SymptomRatings {
  const clamp = (val: number | undefined) =>
    typeof val === 'number' && !isNaN(val) ? Math.max(0, Math.min(6, Math.round(val))) : 0;

  return {
    headache: clamp(symptoms?.headache),
    dizziness: clamp(symptoms?.dizziness),
    nausea: clamp(symptoms?.nausea),
    lightNoiseSensitivity: clamp(symptoms?.lightNoiseSensitivity),
    fogginess: clamp(symptoms?.fogginess),
    concentration: clamp(symptoms?.concentration),
    sleep: clamp(symptoms?.sleep)
  };
}

// Helper to parse date strings for 24h comparison
function parseStepDate(dateStr?: string): number | null {
  if (!dateStr) return null;
  const iso = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`;
  const time = new Date(iso).getTime();
  return isNaN(time) ? null : time;
}

// Check if any two consecutive completed steps were completed less than 24 hours apart
export function check24HourWarning(steps: ReturnToPlayStep[]): boolean {
  for (let i = 0; i < steps.length - 1; i++) {
    const current = steps[i];
    const next = steps[i + 1];
    if (current.completed && next.completed && current.completedDate && next.completedDate) {
      const t1 = parseStepDate(current.completedDate);
      const t2 = parseStepDate(next.completedDate);
      if (t1 !== null && t2 !== null) {
        const diff = Math.abs(t2 - t1);
        if (diff < 24 * 60 * 60 * 1000) {
          return true;
        }
      }
    }
  }
  return false;
}

// Load entire recovery store from localStorage with safety fallback for corrupted JSON
function getRecoveryStore(): RecoveryStore {
  const storage = getStorage();
  if (!storage) return {};
  try {
    const raw = storage.getItem(RECOVERY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      console.warn('Corrupted recovery data in localStorage; falling back to empty store');
      return {};
    }
    return parsed as RecoveryStore;
  } catch (err) {
    console.warn('Corrupted recovery data in localStorage; falling back to empty store', err);
    return {};
  }
}

// Save store to localStorage
function saveRecoveryStore(store: RecoveryStore): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch (err) {
    console.error('Failed to save recovery store:', err);
    return false;
  }
}

// Ensure record has complete step array and fields
function normalizeRecord(athleteId: string, record?: AthleteRecoveryRecord): AthleteRecoveryRecord {
  const def = createDefaultRecoveryRecord(athleteId);
  if (!record) return def;

  const defaultSteps = getDefaultSteps();
  const existingSteps = record.returnToPlay?.steps || [];

  const mergedSteps = defaultSteps.map((step, idx) => {
    const existing = existingSteps.find(s => s.stepNumber === step.stepNumber) || existingSteps[idx];
    if (!existing) return step;
    return {
      ...step,
      completed: Boolean(existing.completed),
      completedDate: existing.completedDate || undefined
    };
  });

  const clearance = record.returnToPlay?.medicalClearance || {
    clearedByProvider: false,
    providerName: '',
    clearanceDate: undefined
  };

  const warning = check24HourWarning(mergedSteps);

  const symptomLog = Array.isArray(record.symptomLog)
    ? record.symptomLog.map(entry => ({
        ...entry,
        symptoms: sanitizeSymptoms(entry.symptoms),
        totalScore: entry.totalScore ?? calculateTotalSymptomScore(entry.symptoms)
      }))
    : [];

  // Sort ascending by date
  symptomLog.sort((a, b) => a.date.localeCompare(b.date));

  return {
    athleteId,
    returnToPlay: {
      steps: mergedSteps,
      medicalClearance: clearance,
      lessThan24hWarning: warning
    },
    symptomLog,
    lastUpdated: record.lastUpdated || new Date().toISOString(),
    lessThan24hWarning: warning
  };
}

// Load recovery record for a specific athlete
export function loadAthleteRecovery(athleteId: string): AthleteRecoveryRecord {
  const store = getRecoveryStore();
  return normalizeRecord(athleteId, store[athleteId]);
}

// Toggle a Return-to-Play step (enforces sequential order and medical clearance for steps 5-6)
export function toggleReturnToPlayStep(
  athleteId: string,
  stepNumber: number,
  completed: boolean,
  dateStr?: string
): AthleteRecoveryRecord & { lessThan24hWarning: boolean; success: boolean; error?: string } {
  const store = getRecoveryStore();
  const record = normalizeRecord(athleteId, store[athleteId]);
  const steps = record.returnToPlay.steps;

  const targetIndex = steps.findIndex(s => s.stepNumber === stepNumber);
  if (targetIndex === -1) {
    return {
      ...record,
      lessThan24hWarning: record.returnToPlay.lessThan24hWarning,
      success: false,
      error: `Invalid step number: ${stepNumber}`
    };
  }

  if (completed) {
    // Sequential check: cannot mark step N complete unless step N-1 is complete
    if (stepNumber > 1) {
      const prevStep = steps.find(s => s.stepNumber === stepNumber - 1);
      if (!prevStep || !prevStep.completed) {
        return {
          ...record,
          lessThan24hWarning: record.returnToPlay.lessThan24hWarning,
          success: false,
          error: `Step ${stepNumber - 1} must be completed first.`
        };
      }
    }

    // Mark current step as complete
    steps[targetIndex].completed = true;
    steps[targetIndex].completedDate = dateStr || new Date().toISOString().split('T')[0];
  } else {
    // Unchecking step N automatically unchecks steps N+1..6
    for (let i = targetIndex; i < steps.length; i++) {
      steps[i].completed = false;
      steps[i].completedDate = undefined;
    }
  }

  // Recalculate 24h spacing warning
  const warning = check24HourWarning(steps);
  record.returnToPlay.lessThan24hWarning = warning;
  record.lessThan24hWarning = warning;
  record.lastUpdated = new Date().toISOString();

  store[athleteId] = record;
  saveRecoveryStore(store);

  return {
    ...record,
    lessThan24hWarning: warning,
    success: true
  };
}

// Update medical clearance for an athlete
export function setMedicalClearance(
  athleteId: string,
  cleared: boolean,
  providerName: string,
  clearanceDate?: string
): AthleteRecoveryRecord {
  const store = getRecoveryStore();
  const record = normalizeRecord(athleteId, store[athleteId]);

  record.returnToPlay.medicalClearance = {
    clearedByProvider: cleared,
    providerName: providerName.trim(),
    clearanceDate: clearanceDate || (cleared ? new Date().toISOString().split('T')[0] : undefined)
  };

  // If clearance is revoked, automatically uncheck steps 5 and 6
  if (!cleared || !providerName.trim()) {
    record.returnToPlay.steps.forEach(step => {
      if (step.stepNumber >= 5 && step.completed) {
        step.completed = false;
        step.completedDate = undefined;
      }
    });
  }

  const warning = check24HourWarning(record.returnToPlay.steps);
  record.returnToPlay.lessThan24hWarning = warning;
  record.lessThan24hWarning = warning;
  record.lastUpdated = new Date().toISOString();

  store[athleteId] = record;
  saveRecoveryStore(store);
  return record;
}

// Reset Return to Play progression for an athlete
export function resetReturnToPlay(athleteId: string): AthleteRecoveryRecord {
  const store = getRecoveryStore();
  const record = normalizeRecord(athleteId, store[athleteId]);

  record.returnToPlay = {
    steps: getDefaultSteps(),
    medicalClearance: {
      clearedByProvider: false,
      providerName: '',
      clearanceDate: undefined
    },
    lessThan24hWarning: false
  };
  record.lessThan24hWarning = false;
  record.lastUpdated = new Date().toISOString();

  store[athleteId] = record;
  saveRecoveryStore(store);
  return record;
}

// Save or update a daily symptom log entry
export function saveSymptomEntry(
  athleteId: string,
  entry: {
    id?: string;
    date: string;
    symptoms: Partial<SymptomRatings>;
    notes?: string;
  }
): AthleteRecoveryRecord {
  const store = getRecoveryStore();
  const record = normalizeRecord(athleteId, store[athleteId]);

  const sanitized = sanitizeSymptoms(entry.symptoms);
  const totalScore = calculateTotalSymptomScore(sanitized);
  const entryDate = entry.date || new Date().toISOString().split('T')[0];

  // If an entry for the same date already exists, update it in place
  const existingIndex = record.symptomLog.findIndex(e => e.date === entryDate);

  if (existingIndex >= 0) {
    const existing = record.symptomLog[existingIndex];
    record.symptomLog[existingIndex] = {
      id: existing.id,
      date: entryDate,
      symptoms: sanitized,
      notes: entry.notes !== undefined ? entry.notes : existing.notes,
      totalScore
    };
  } else {
    const newEntry: SymptomEntry = {
      id: entry.id || `symptom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date: entryDate,
      symptoms: sanitized,
      notes: entry.notes,
      totalScore
    };
    record.symptomLog.push(newEntry);
  }

  // Sort entries ascending by date
  record.symptomLog.sort((a, b) => a.date.localeCompare(b.date));
  record.lastUpdated = new Date().toISOString();

  store[athleteId] = record;
  saveRecoveryStore(store);
  return record;
}

// Delete a symptom log entry by date or id
export function deleteSymptomEntry(athleteId: string, dateStr: string): AthleteRecoveryRecord {
  const store = getRecoveryStore();
  const record = normalizeRecord(athleteId, store[athleteId]);

  record.symptomLog = record.symptomLog.filter(e => e.date !== dateStr && e.id !== dateStr);
  record.lastUpdated = new Date().toISOString();

  store[athleteId] = record;
  saveRecoveryStore(store);
  return record;
}

// Clear recovery data for an athlete or all athletes
export function clearRecoveryData(athleteId?: string): void {
  const storage = getStorage();
  if (!storage) return;

  if (athleteId) {
    const store = getRecoveryStore();
    delete store[athleteId];
    saveRecoveryStore(store);
  } else {
    storage.removeItem(RECOVERY_STORAGE_KEY);
  }
}

// Export all recovery data as JSON string
export function exportRecoveryData(): string {
  const storage = getStorage();
  if (!storage) return '{}';
  return storage.getItem(RECOVERY_STORAGE_KEY) || '{}';
}

// Import recovery data from JSON string or object
export function importRecoveryData(data: string | object): boolean {
  try {
    let parsed: unknown = data;
    if (typeof data === 'string') {
      try {
        parsed = JSON.parse(data);
      } catch {
        return false;
      }
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return false;
    }

    const map = parsed as Record<string, unknown>;
    // Validate each record has reasonable structure
    for (const key of Object.keys(map)) {
      const item = map[key];
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return false;
      }
      const rec = item as Record<string, unknown>;
      // Must have either athleteId, returnToPlay, or symptomLog
      if (!rec.athleteId && !rec.returnToPlay && !rec.symptomLog) {
        return false;
      }
    }

    const storage = getStorage();
    if (!storage) return false;
    storage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(parsed));
    return true;
  } catch {
    return false;
  }
}
