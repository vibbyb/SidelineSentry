import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calculateTotalSymptomScore,
  clearRecoveryData,
  exportRecoveryData,
  getDefaultSteps,
  importRecoveryData,
  loadAthleteRecovery,
  RECOVERY_STORAGE_KEY,
  resetReturnToPlay,
  saveSymptomEntry,
  deleteSymptomEntry,
  setMedicalClearance,
  toggleReturnToPlayStep
} from './recovery';

// Mock localStorage for Node test environment
function createMockStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    }
  };
}

describe('Recovery Service (CDC Return to Play & Symptom Log)', () => {
  let mockStorage: Storage;

  beforeEach(() => {
    mockStorage = createMockStorage();
    (globalThis as unknown as { localStorage: Storage }).localStorage = mockStorage;
    (globalThis as unknown as { window: { localStorage: Storage } }).window = { localStorage: mockStorage };
    vi.restoreAllMocks();
  });

  describe('Sequential Step Enforcement', () => {
    it('blocks Step 2 if Step 1 is not completed', () => {
      const res = toggleReturnToPlayStep('ath1', 2, true);
      expect(res.success).toBe(false);
      expect(res.returnToPlay.steps[1].completed).toBe(false);

      const record = loadAthleteRecovery('ath1');
      expect(record.returnToPlay.steps[0].completed).toBe(false);
      expect(record.returnToPlay.steps[1].completed).toBe(false);
    });

    it('allows Step 1, then allows Step 2', () => {
      const s1 = toggleReturnToPlayStep('ath1', 1, true, '2026-10-20');
      expect(s1.success).toBe(true);
      expect(s1.returnToPlay.steps[0].completed).toBe(true);

      const s2 = toggleReturnToPlayStep('ath1', 2, true, '2026-10-21');
      expect(s2.success).toBe(true);
      expect(s2.returnToPlay.steps[1].completed).toBe(true);
    });

    it('unchecking Step 2 automatically unchecks Step 3, 4, etc.', () => {
      // Complete steps 1, 2, 3
      toggleReturnToPlayStep('ath1', 1, true, '2026-10-20');
      toggleReturnToPlayStep('ath1', 2, true, '2026-10-21');
      const s3 = toggleReturnToPlayStep('ath1', 3, true, '2026-10-22');
      expect(s3.returnToPlay.steps[2].completed).toBe(true);

      // Now uncheck Step 2
      const uncheckRes = toggleReturnToPlayStep('ath1', 2, false);
      expect(uncheckRes.returnToPlay.steps[0].completed).toBe(true); // Step 1 remains complete
      expect(uncheckRes.returnToPlay.steps[1].completed).toBe(false); // Step 2 is unchecked
      expect(uncheckRes.returnToPlay.steps[2].completed).toBe(false); // Step 3 auto unchecked
      expect(uncheckRes.returnToPlay.steps[3].completed).toBe(false); // Step 4 auto unchecked
    });
  });

  describe('Medical Clearance Gate on Steps 5 & 6', () => {
    beforeEach(() => {
      // Complete steps 1 to 4
      toggleReturnToPlayStep('ath1', 1, true, '2026-10-20');
      toggleReturnToPlayStep('ath1', 2, true, '2026-10-21');
      toggleReturnToPlayStep('ath1', 3, true, '2026-10-22');
      toggleReturnToPlayStep('ath1', 4, true, '2026-10-23');
    });

    it('blocks Step 5 without medical clearance', () => {
      const res = toggleReturnToPlayStep('ath1', 5, true, '2026-10-24');
      expect(res.success).toBe(false);
      expect(res.returnToPlay.steps[4].completed).toBe(false);
    });

    it('blocks Step 5 if providerName is empty string even if clearedByProvider is true', () => {
      setMedicalClearance('ath1', true, '   ');
      const res = toggleReturnToPlayStep('ath1', 5, true, '2026-10-24');
      expect(res.success).toBe(false);
      expect(res.returnToPlay.steps[4].completed).toBe(false);
    });

    it('allows Step 5 and Step 6 once valid medical clearance is set', () => {
      setMedicalClearance('ath1', true, 'Dr. Sarah Smith, MD', '2026-10-24');
      const s5 = toggleReturnToPlayStep('ath1', 5, true, '2026-10-24');
      expect(s5.success).toBe(true);
      expect(s5.returnToPlay.steps[4].completed).toBe(true);

      const s6 = toggleReturnToPlayStep('ath1', 6, true, '2026-10-25');
      expect(s6.success).toBe(true);
      expect(s6.returnToPlay.steps[5].completed).toBe(true);
    });

    it('revoking medical clearance automatically unchecks Step 5 and Step 6', () => {
      setMedicalClearance('ath1', true, 'Dr. Sarah Smith, MD', '2026-10-24');
      toggleReturnToPlayStep('ath1', 5, true, '2026-10-24');
      toggleReturnToPlayStep('ath1', 6, true, '2026-10-25');

      const revoked = setMedicalClearance('ath1', false, '');
      expect(revoked.returnToPlay.steps[4].completed).toBe(false);
      expect(revoked.returnToPlay.steps[5].completed).toBe(false);
    });
  });

  describe('24-Hour Warning Detection', () => {
    it('sets lessThan24hWarning to true when consecutive steps have the same date', () => {
      toggleReturnToPlayStep('ath1', 1, true, '2026-10-24');
      const s2 = toggleReturnToPlayStep('ath1', 2, true, '2026-10-24');

      expect(s2.lessThan24hWarning).toBe(true);
      expect(s2.returnToPlay.lessThan24hWarning).toBe(true);
    });

    it('does not trigger warning when steps are 24 hours apart', () => {
      toggleReturnToPlayStep('ath1', 1, true, '2026-10-24');
      const s2 = toggleReturnToPlayStep('ath1', 2, true, '2026-10-25');

      expect(s2.lessThan24hWarning).toBe(false);
      expect(s2.returnToPlay.lessThan24hWarning).toBe(false);
    });

    it('detects less than 24h warning with ISO timestamps under 24 hours', () => {
      toggleReturnToPlayStep('ath1', 1, true, '2026-10-24T09:00:00Z');
      const s2 = toggleReturnToPlayStep('ath1', 2, true, '2026-10-24T17:00:00Z');

      expect(s2.lessThan24hWarning).toBe(true);
    });
  });

  describe('Daily Symptom Log', () => {
    it('calculates total symptom score sum correctly out of 42', () => {
      const score = calculateTotalSymptomScore({
        headache: 3,
        dizziness: 2,
        nausea: 1,
        lightNoiseSensitivity: 4,
        fogginess: 0,
        concentration: 5,
        sleep: 6
      });
      expect(score).toBe(21);

      // Max score test
      const maxScore = calculateTotalSymptomScore({
        headache: 6,
        dizziness: 6,
        nausea: 6,
        lightNoiseSensitivity: 6,
        fogginess: 6,
        concentration: 6,
        sleep: 6
      });
      expect(maxScore).toBe(42);
    });

    it('saves a new symptom entry and updates same-day entry in place', () => {
      saveSymptomEntry('ath1', {
        date: '2026-10-24',
        symptoms: {
          headache: 2,
          dizziness: 1,
          nausea: 0,
          lightNoiseSensitivity: 1,
          fogginess: 2,
          concentration: 1,
          sleep: 3
        },
        notes: 'Mild headache after school'
      });

      let record = loadAthleteRecovery('ath1');
      expect(record.symptomLog.length).toBe(1);
      expect(record.symptomLog[0].totalScore).toBe(10);
      expect(record.symptomLog[0].notes).toBe('Mild headache after school');

      // Update same date
      saveSymptomEntry('ath1', {
        date: '2026-10-24',
        symptoms: {
          headache: 1,
          dizziness: 0,
          nausea: 0,
          lightNoiseSensitivity: 0,
          fogginess: 1,
          concentration: 0,
          sleep: 1
        },
        notes: 'Feeling much better in the evening'
      });

      record = loadAthleteRecovery('ath1');
      expect(record.symptomLog.length).toBe(1);
      expect(record.symptomLog[0].totalScore).toBe(3);
      expect(record.symptomLog[0].notes).toBe('Feeling much better in the evening');
    });

    it('sorts multiple entries by date ascending', () => {
      saveSymptomEntry('ath1', {
        date: '2026-10-25',
        symptoms: { headache: 1, dizziness: 0, nausea: 0, lightNoiseSensitivity: 0, fogginess: 0, concentration: 0, sleep: 0 }
      });
      saveSymptomEntry('ath1', {
        date: '2026-10-23',
        symptoms: { headache: 4, dizziness: 0, nausea: 0, lightNoiseSensitivity: 0, fogginess: 0, concentration: 0, sleep: 0 }
      });
      saveSymptomEntry('ath1', {
        date: '2026-10-24',
        symptoms: { headache: 2, dizziness: 0, nausea: 0, lightNoiseSensitivity: 0, fogginess: 0, concentration: 0, sleep: 0 }
      });

      const record = loadAthleteRecovery('ath1');
      expect(record.symptomLog.map(e => e.date)).toEqual(['2026-10-23', '2026-10-24', '2026-10-25']);
    });

    it('deletes a symptom log entry by date or id', () => {
      saveSymptomEntry('ath1', {
        date: '2026-10-24',
        symptoms: { headache: 2, dizziness: 0, nausea: 0, lightNoiseSensitivity: 0, fogginess: 0, concentration: 0, sleep: 0 }
      });
      expect(loadAthleteRecovery('ath1').symptomLog.length).toBe(1);

      deleteSymptomEntry('ath1', '2026-10-24');
      expect(loadAthleteRecovery('ath1').symptomLog.length).toBe(0);
    });
  });

  describe('Reset and Clear Data', () => {
    it('resetReturnToPlay clears steps and medical clearance while preserving symptoms', () => {
      toggleReturnToPlayStep('ath1', 1, true, '2026-10-20');
      setMedicalClearance('ath1', true, 'Dr. Smith');
      saveSymptomEntry('ath1', {
        date: '2026-10-20',
        symptoms: { headache: 1, dizziness: 0, nausea: 0, lightNoiseSensitivity: 0, fogginess: 0, concentration: 0, sleep: 0 }
      });

      const reset = resetReturnToPlay('ath1');
      expect(reset.returnToPlay.steps[0].completed).toBe(false);
      expect(reset.returnToPlay.medicalClearance.clearedByProvider).toBe(false);
      expect(reset.returnToPlay.medicalClearance.providerName).toBe('');
      expect(reset.symptomLog.length).toBe(1);
    });

    it('clearRecoveryData removes athlete record or entire store', () => {
      toggleReturnToPlayStep('ath1', 1, true);
      toggleReturnToPlayStep('ath2', 1, true);

      clearRecoveryData('ath1');
      const a1 = loadAthleteRecovery('ath1');
      const a2 = loadAthleteRecovery('ath2');

      expect(a1.returnToPlay.steps[0].completed).toBe(false);
      expect(a2.returnToPlay.steps[0].completed).toBe(true);

      clearRecoveryData();
      expect(localStorage.getItem(RECOVERY_STORAGE_KEY)).toBeNull();
    });
  });

  describe('Export, Import, and Corrupted Fallback', () => {
    it('exports recovery data as valid JSON', () => {
      toggleReturnToPlayStep('ath1', 1, true, '2026-10-24');
      const exported = exportRecoveryData();
      expect(typeof exported).toBe('string');
      const parsed = JSON.parse(exported);
      expect(parsed.ath1.returnToPlay.steps[0].completed).toBe(true);
    });

    it('imports valid recovery data and rejects invalid shapes', () => {
      const valid = {
        ath99: {
          athleteId: 'ath99',
          returnToPlay: {
            steps: getDefaultSteps(),
            medicalClearance: { clearedByProvider: true, providerName: 'Dr. Jones' },
            lessThan24hWarning: false
          },
          symptomLog: []
        }
      };

      expect(importRecoveryData(JSON.stringify(valid))).toBe(true);
      const loaded = loadAthleteRecovery('ath99');
      expect(loaded.returnToPlay.medicalClearance.providerName).toBe('Dr. Jones');

      // Invalid JSON string
      expect(importRecoveryData('{ broken json ')).toBe(false);

      // Primitive types
      expect(importRecoveryData(12345 as unknown as object)).toBe(false);
      expect(importRecoveryData(null as unknown as object)).toBe(false);

      // Array shape
      expect(importRecoveryData([1, 2, 3] as unknown as object)).toBe(false);

      // Invalid inner record shapes
      expect(importRecoveryData({ athX: 'string-not-object' })).toBe(false);
      expect(importRecoveryData({ athX: { randomProperty: 123 } })).toBe(false);
    });

    it('handles corrupted localStorage safely with console.warn and empty store fallback', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem(RECOVERY_STORAGE_KEY, 'corrupted{non-json');

      const record = loadAthleteRecovery('ath1');
      expect(record.returnToPlay.steps.length).toBe(6);
      expect(record.returnToPlay.steps[0].completed).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
    });
  });
});
