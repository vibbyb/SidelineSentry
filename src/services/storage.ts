// LocalStorage helpers for athletes and assessments

import { AthleteProfile, AssessmentRecord } from '../types/clinical';

const ATHLETES_KEY = 'sidelinesentry_athletes';
const ASSESSMENTS_KEY = 'sidelinesentry_assessments';

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof localStorage !== 'undefined') return localStorage;
  const globalStorage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  return globalStorage || null;
}

export function loadAthletes(defaultAthletes: AthleteProfile[]): AthleteProfile[] {
  const storage = getStorage();
  if (!storage) return defaultAthletes;
  try {
    const raw = storage.getItem(ATHLETES_KEY);
    if (!raw) return defaultAthletes;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultAthletes;
  } catch {
    return defaultAthletes;
  }
}

export function saveAthletes(athletes: AthleteProfile[]): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(ATHLETES_KEY, JSON.stringify(athletes));
    return true;
  } catch (err) {
    console.error('Failed to save athletes:', err);
    return false;
  }
}

export function loadAssessments(): AssessmentRecord[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(ASSESSMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAssessment(record: AssessmentRecord): boolean {
  const storage = getStorage();
  if (!storage || record.isDemo) return false;
  try {
    const existing = loadAssessments();
    const filtered = existing.filter(a => a.id !== record.id);
    const updated = [record, ...filtered];
    storage.setItem(ASSESSMENTS_KEY, JSON.stringify(updated));
    return true;
  } catch (err: unknown) {
    // Under storage pressure (e.g. QuotaExceededError), strip signatureDataUrl from older historical records and retry once
    const isQuotaError =
      (err &&
        typeof err === 'object' &&
        (('name' in err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')) ||
          ('code' in err && (err.code === 22 || err.code === 1014)))) ||
      String(err).toLowerCase().includes('quota');

    if (isQuotaError) {
      try {
        const existing = loadAssessments();
        const filtered = existing.filter(a => a.id !== record.id);
        const stripped = filtered.map(a => {
          if (a.certification?.signatureDataUrl) {
            return {
              ...a,
              certification: {
                ...a.certification,
                signatureDataUrl: undefined
              }
            };
          }
          return a;
        });
        const updated = [record, ...stripped];
        storage.setItem(ASSESSMENTS_KEY, JSON.stringify(updated));
        return true;
      } catch (retryErr) {
        console.error('Failed to save assessment after stripping signatures:', retryErr);
        return false;
      }
    }
    console.error('Failed to save assessment:', err);
    return false;
  }
}

export function getAthleteHistory(athleteId: string): AssessmentRecord[] {
  const all = loadAssessments();
  return all.filter(a => a.athleteId === athleteId);
}

// Backward-compatible export
export const AssessmentStore = {
  loadAthletes,
  saveAthletes,
  loadAssessments,
  saveAssessment,
  getAthleteHistory
};
