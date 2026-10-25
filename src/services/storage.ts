// LocalStorage helpers for athletes and assessments

import { AthleteProfile, AssessmentRecord } from '../types/clinical';

const ATHLETES_KEY = 'sidelinesentry_athletes';
const ASSESSMENTS_KEY = 'sidelinesentry_assessments';
const RECOVERY_KEY = 'sidelinesentry_recovery';

// Map of legacy sample athlete names from earlier builds
const LEGACY_SEED_NAMES: Record<string, string[]> = {
  'ath-1': ['Marcus Vance'],
  'ath-2': ['Jordan Hayes'],
  'ath-3': ['Colton Brooks', 'Elena Rostova'],
  'ath-4': ['Tyler Harris', 'Devon Brooks'],
  'ath-5': ['Maya Lin', 'Lucas Meyer'],
  'ath-6': ['Devon Miller', 'Sofia Chen']
};

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
    // When the storage key is null or empty, use the provided default athletes
    if (raw === null || raw.trim() === '') return defaultAthletes;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultAthletes;

    const valid = parsed.filter(
      a => a && typeof a === 'object' && typeof a.id === 'string' && typeof a.name === 'string'
    ) as AthleteProfile[];

    // Migrate any legacy seed athlete names to Test Athlete 1..6
    let hasMigration = false;
    const migrated = valid.map(ath => {
      const legacyList = LEGACY_SEED_NAMES[ath.id];
      if (legacyList && legacyList.includes(ath.name)) {
        const num = ath.id.replace('ath-', '');
        hasMigration = true;
        return { ...ath, name: `Test Athlete ${num}` };
      }
      return ath;
    });

    if (hasMigration) {
      saveAthletes(migrated);
    }

    return migrated;
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
    if (!Array.isArray(parsed)) return [];

    const valid = parsed.filter(
      a => a && typeof a === 'object' && typeof a.id === 'string' && typeof a.athleteId === 'string'
    ) as AssessmentRecord[];

    // Migrate any legacy saved assessments:
    // 1. Strip any trigger containing 'Safety Margin' or 'Margen de seguridad'
    // 2. If red flags are present, strip any skipped test entries from primaryTriggers
    let hasMigration = false;
    const migrated = valid.map(assessment => {
      if (!assessment.triage?.primaryTriggers) return assessment;

      const redFlags = assessment.redFlags as Record<string, boolean | undefined> | undefined;
      const hasFlags =
        Boolean((redFlags as { hasRedFlags?: boolean } | undefined)?.hasRedFlags) ||
        (redFlags && Object.entries(redFlags).some(([k, v]) => k !== 'hasRedFlags' && v === true)) ||
        Boolean(assessment.isEmergencyLockdown);

      const filteredTriggers = assessment.triage.primaryTriggers.filter(t => {
        if (/safety margin|margen de seguridad/i.test(t)) return false;
        if (hasFlags && /skipped|omitid/i.test(t)) return false;
        return true;
      });

      if (filteredTriggers.length !== assessment.triage.primaryTriggers.length) {
        hasMigration = true;
        return {
          ...assessment,
          triage: {
            ...assessment.triage,
            primaryTriggers: filteredTriggers
          }
        };
      }
      return assessment;
    });

    if (hasMigration) {
      storage.setItem(ASSESSMENTS_KEY, JSON.stringify(migrated));
    }

    return migrated;
  } catch {
    return [];
  }
}

export function saveAssessment(record: AssessmentRecord): boolean {
  const storage = getStorage();
  if (!storage || !record || !record.id || !record.athleteId || record.isDemo) return false;
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
  if (!athleteId) return [];
  const all = loadAssessments();
  return all.filter(a => a && a.athleteId === athleteId);
}

// Remove an athlete, their assessments, and their recovery log
export function deleteAthlete(athleteId: string): AthleteProfile[] {
  const storage = getStorage();
  if (!storage) return [];

  // Remove athlete from saved list
  const currentAthletes = loadAthletes([]);
  const updatedAthletes = currentAthletes.filter(a => a.id !== athleteId);
  saveAthletes(updatedAthletes);

  // Remove assessments belonging to this athlete
  const currentAssessments = loadAssessments();
  const updatedAssessments = currentAssessments.filter(a => a.athleteId !== athleteId);
  storage.setItem(ASSESSMENTS_KEY, JSON.stringify(updatedAssessments));

  // Clear recovery tracking for this athlete if it exists
  try {
    const rawRecovery = storage.getItem(RECOVERY_KEY);
    if (rawRecovery) {
      const recoveryData = JSON.parse(rawRecovery);
      if (recoveryData && typeof recoveryData === 'object' && !Array.isArray(recoveryData)) {
        delete recoveryData[athleteId];
        storage.setItem(RECOVERY_KEY, JSON.stringify(recoveryData));
      }
    }
  } catch (err) {
    console.error('Failed to clean recovery data for deleted athlete:', err);
  }

  return updatedAthletes;
}

// Export all local roster and assessment data to a portable JSON string
export function exportBackupData(): string {
  const storage = getStorage();
  const athletes = loadAthletes([]);
  const assessments = loadAssessments();

  let recovery: Record<string, unknown> = {};
  if (storage) {
    try {
      const rawRecovery = storage.getItem(RECOVERY_KEY);
      if (rawRecovery) {
        const parsedRecovery = JSON.parse(rawRecovery);
        if (parsedRecovery && typeof parsedRecovery === 'object' && !Array.isArray(parsedRecovery)) {
          recovery = parsedRecovery;
        }
      }
    } catch {
      recovery = {};
    }
  }

  const payload = {
    app: 'SidelineSentry',
    version: 1,
    exportedAt: new Date().toISOString(),
    athletes,
    assessments,
    recovery
  };

  return JSON.stringify(payload, null, 2);
}

export interface BackupImportResult {
  ok: boolean;
  error?: string;
  athletes?: AthleteProfile[];
}

// Import roster backup and validate its schema before writing to storage
export function importBackupData(rawJson: string): BackupImportResult {
  const storage = getStorage();
  if (!storage) {
    return { ok: false, error: 'Storage is not available.' };
  }

  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Backup data must be a JSON object.' };
    }

    if (parsed.app !== 'SidelineSentry') {
      return { ok: false, error: 'Invalid app identifier in backup.' };
    }

    if (parsed.version !== 1) {
      return { ok: false, error: 'Unsupported backup version.' };
    }

    if (!Array.isArray(parsed.athletes)) {
      return { ok: false, error: 'Athletes must be an array.' };
    }

    for (const a of parsed.athletes) {
      if (!a || typeof a !== 'object' || typeof a.id !== 'string' || typeof a.name !== 'string') {
        return { ok: false, error: 'Each athlete in backup must have a valid id and name.' };
      }
    }

    if (!Array.isArray(parsed.assessments)) {
      return { ok: false, error: 'Assessments must be an array.' };
    }

    // Only update localStorage after full validation passes
    saveAthletes(parsed.athletes);
    storage.setItem(ASSESSMENTS_KEY, JSON.stringify(parsed.assessments));

    if (parsed.recovery && typeof parsed.recovery === 'object' && !Array.isArray(parsed.recovery)) {
      storage.setItem(RECOVERY_KEY, JSON.stringify(parsed.recovery));
    }

    return { ok: true, athletes: parsed.athletes };
  } catch {
    return { ok: false, error: 'Malformed JSON string.' };
  }
}

// Backward-compatible export
export const AssessmentStore = {
  loadAthletes,
  saveAthletes,
  deleteAthlete,
  loadAssessments,
  saveAssessment,
  getAthleteHistory,
  exportBackupData,
  importBackupData
};
