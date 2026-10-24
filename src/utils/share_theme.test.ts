import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AssessmentSession, AthleteProfile } from '../types/clinical';
import { buildParentShareSummary, shareParentSummary } from './share';
import {
  getSunlightMode,
  setSunlightMode,
  toggleSunlightMode,
  initSunlightMode,
  THEME_STORAGE_KEY
} from './theme';
import * as clipboardModule from './clipboard';

describe('share.ts - buildParentShareSummary', () => {
  const sampleAthlete: AthleteProfile = {
    id: 'ath-1',
    name: 'Marcus Vance',
    jerseyNumber: '12',
    sport: 'Football',
    position: 'Quarterback',
    baselineStabilityIndex: 0.078,
    baselineReactionTimeMs: 220,
    baselineKingDevickSeconds: 39.5
  };

  const sampleAssessment: AssessmentSession = {
    id: 'session-12345',
    athleteId: 'ath-1',
    timestamp: '2026-10-24T16:30:00.000Z',
    isPostImpact: true,
    isDemo: false,
    balanceScore: {
      durationSeconds: 15,
      stabilityIndex: 0.115,
      peakSway: 0.18,
      swayHistory: [],
      valid: true
    },
    reactionScore: {
      averageMs: 285,
      fastestMs: 260,
      slowestMs: 310,
      trials: [280, 285, 290],
      falseStarts: 0,
      valid: true
    },
    kingDevickScore: {
      durationSeconds: 47.8,
      errorsCount: 2,
      completed: true
    },
    redFlags: {
      neckPain: true,
      doubleVision: false,
      weaknessOrTingling: false,
      severeOrIncreasingHeadache: false,
      seizureOrConvulsion: false,
      lossOfConsciousness: false,
      deterioratingConsciousState: false,
      vomitingRepeated: false,
      increasingConfusion: false
    },
    triage: {
      verdict: 'IMMEDIATE_REMOVAL',
      primaryTriggers: ['EMERGENCY PROTOCOL: Neck pain or tenderness'],
      swayDegradationPercent: 47.4,
      reactionDelayDeltaMs: 65,
      kingDevickDeltaSeconds: 8.3,
      nonDiagnosticDisclaimer: 'SidelineSentry is a sideline screening tool.'
    }
  };

  it('builds concise parent summary in English under 1100 characters', () => {
    const summary = buildParentShareSummary(
      { ...sampleAssessment, athlete: sampleAthlete },
      'en'
    );

    expect(summary.length).toBeLessThan(1100);
    expect(summary).toContain('Marcus Vance');
    expect(summary).toContain('Football');
    expect(summary).toContain('SIT THEM OUT');
    expect(summary).toContain('Emergency: Neck pain or tenderness');
    expect(summary).toContain('When in doubt, sit them out');
    expect(summary).toContain('Medical Disclaimer');
    expect(summary).toContain('0.115 m/s²');
    expect(summary).toContain('285 ms');
    expect(summary).toContain('47.8 s');
  });

  it('builds concise parent summary in Spanish under 1100 characters with zero raw English verdicts', () => {
    const summary = buildParentShareSummary(
      { ...sampleAssessment, athlete: sampleAthlete },
      'es'
    );

    expect(summary.length).toBeLessThan(1100);
    expect(summary).toContain('Marcus Vance');
    expect(summary).toContain('Football');
    expect(summary).toContain('RETIRAR DEL JUEGO');
    expect(summary).toContain('Emergencia: Dolor o sensibilidad en el cuello');
    expect(summary).toContain('Aviso médico');

    // Zero raw English verdict in Spanish summary
    expect(summary).not.toContain('SIT THEM OUT');
    expect(summary).not.toContain('NEEDS FURTHER CHECKUP');
    expect(summary).not.toContain('SCORES LOOK NORMAL');
    expect(summary).not.toContain('IMMEDIATE_REMOVAL');
    expect(summary).not.toContain('EVALUATION_RECOMMENDED');
    expect(summary).not.toContain('CLEAR_OBSERVED');
  });

  it('displays Skipped or Omitida when tests are skipped due to safety reasons', () => {
    const skippedAssessment: AssessmentSession = {
      ...sampleAssessment,
      balanceScore: {
        durationSeconds: 0,
        stabilityIndex: 0,
        peakSway: 0,
        swayHistory: [],
        valid: false,
        skippedReason: 'CONTRAINDICATED_EMERGENCY_LOCKDOWN'
      },
      reactionScore: {
        averageMs: 0,
        fastestMs: 0,
        slowestMs: 0,
        trials: [],
        falseStarts: 0,
        valid: false,
        skippedReason: 'CONTRAINDICATED_EMERGENCY_LOCKDOWN'
      },
      kingDevickScore: {
        durationSeconds: 0,
        errorsCount: 0,
        completed: false,
        skippedReason: 'CONTRAINDICATED_EMERGENCY_LOCKDOWN'
      }
    };

    const summaryEn = buildParentShareSummary(
      { ...skippedAssessment, athlete: sampleAthlete },
      'en'
    );
    expect(summaryEn).toContain('Balance Test: Skipped');
    expect(summaryEn).toContain('Reaction Test: Skipped');
    expect(summaryEn).toContain('Reading Test: Skipped');

    const summaryEs = buildParentShareSummary(
      { ...skippedAssessment, athlete: sampleAthlete },
      'es'
    );
    expect(summaryEs).toContain('Prueba de equilibrio: Omitida');
    expect(summaryEs).toContain('Prueba de reacción: Omitida');
    expect(summaryEs).toContain('Prueba de lectura: Omitida');
  });

  it('correctly maps CLEAR_OBSERVED and EVALUATION_RECOMMENDED verdicts', () => {
    const clearAssessment: AssessmentSession = {
      ...sampleAssessment,
      triage: {
        ...sampleAssessment.triage,
        verdict: 'CLEAR_OBSERVED',
        primaryTriggers: []
      }
    };

    const enClear = buildParentShareSummary({ ...clearAssessment, athlete: sampleAthlete }, 'en');
    expect(enClear).toContain('SCORES LOOK NORMAL');

    const esClear = buildParentShareSummary({ ...clearAssessment, athlete: sampleAthlete }, 'es');
    expect(esClear).toContain('PUNTAJES DENTRO DE LO NORMAL');
    expect(esClear).not.toContain('SCORES LOOK NORMAL');

    const evalAssessment: AssessmentSession = {
      ...sampleAssessment,
      triage: {
        ...sampleAssessment.triage,
        verdict: 'EVALUATION_RECOMMENDED'
      }
    };

    const enEval = buildParentShareSummary({ ...evalAssessment, athlete: sampleAthlete }, 'en');
    expect(enEval).toContain('NEEDS FURTHER CHECKUP');

    const esEval = buildParentShareSummary({ ...evalAssessment, athlete: sampleAthlete }, 'es');
    expect(esEval).toContain('REQUIERE REVISIÓN MÉDICA');
    expect(esEval).not.toContain('NEEDS FURTHER CHECKUP');
  });
});

describe('share.ts - shareParentSummary', () => {
  const originalNavigator = typeof navigator !== 'undefined' ? navigator : undefined;
  const originalWindow = typeof window !== 'undefined' ? window : undefined;

  beforeEach(() => {
    if (typeof globalThis.window === 'undefined') {
      (globalThis as unknown as { window: unknown }).window = {};
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalNavigator !== undefined) {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true
      });
    }
    if (originalWindow === undefined) {
      delete (globalThis as unknown as { window?: unknown }).window;
    } else {
      (globalThis as unknown as { window: unknown }).window = originalWindow;
    }
  });

  it('returns "shared" when navigator.share succeeds', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, 'navigator', {
      value: { share: mockShare },
      writable: true,
      configurable: true
    });

    const result = await shareParentSummary('Marcus Vance summary', 'Summary Title');
    expect(result).toBe('shared');
    expect(mockShare).toHaveBeenCalledWith({
      title: 'Summary Title',
      text: 'Marcus Vance summary'
    });
  });

  it('returns "cancelled" cleanly without fallback when share throws AbortError', async () => {
    const abortError = new Error('User cancelled share');
    abortError.name = 'AbortError';
    const mockShare = vi.fn().mockRejectedValue(abortError);
    const clipboardSpy = vi.spyOn(clipboardModule, 'copyToClipboard');

    Object.defineProperty(globalThis, 'navigator', {
      value: { share: mockShare },
      writable: true,
      configurable: true
    });

    const result = await shareParentSummary('Marcus Vance summary', 'Summary Title');
    expect(result).toBe('cancelled');
    expect(clipboardSpy).not.toHaveBeenCalled();
  });

  it('falls back to clipboard and returns "copied" when navigator.share is missing and clipboard succeeds', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      writable: true,
      configurable: true
    });
    vi.spyOn(clipboardModule, 'copyToClipboard').mockResolvedValue(true);

    const result = await shareParentSummary('Marcus Vance summary', 'Summary Title');
    expect(result).toBe('copied');
  });

  it('returns "manual" when both navigator.share and clipboard fail', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      writable: true,
      configurable: true
    });
    vi.spyOn(clipboardModule, 'copyToClipboard').mockResolvedValue(false);

    const result = await shareParentSummary('Marcus Vance summary', 'Summary Title');
    expect(result).toBe('manual');
  });
});

describe('theme.ts - Sunlight Mode', () => {
  let store: Record<string, string> = {};
  let classes = new Set<string>();

  const mockStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (idx: number) => Object.keys(store)[idx] ?? null,
    length: 0
  };

  const mockDocument = {
    documentElement: {
      classList: {
        add: (cls: string) => classes.add(cls),
        remove: (cls: string) => classes.delete(cls),
        contains: (cls: string) => classes.has(cls)
      },
      className: ''
    }
  };

  const originalWindow = typeof window !== 'undefined' ? window : undefined;
  const originalDocument = typeof document !== 'undefined' ? document : undefined;
  const originalLocalStorage = typeof localStorage !== 'undefined' ? localStorage : undefined;

  beforeEach(() => {
    store = {};
    classes = new Set<string>();

    (globalThis as unknown as { localStorage: typeof mockStorage }).localStorage = mockStorage;
    (globalThis as unknown as { window: { localStorage: typeof mockStorage } }).window = {
      localStorage: mockStorage
    };
    (globalThis as unknown as { document: typeof mockDocument }).document = mockDocument;
  });

  afterEach(() => {
    if (originalLocalStorage === undefined) {
      delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as unknown as { localStorage: unknown }).localStorage = originalLocalStorage;
    }

    if (originalWindow === undefined) {
      delete (globalThis as unknown as { window?: unknown }).window;
    } else {
      (globalThis as unknown as { window: unknown }).window = originalWindow;
    }

    if (originalDocument === undefined) {
      delete (globalThis as unknown as { document?: unknown }).document;
    } else {
      (globalThis as unknown as { document: unknown }).document = originalDocument;
    }
  });

  it('persists "sunlight" in localStorage and adds "sunlight" class to documentElement', () => {
    setSunlightMode(true);
    expect(mockStorage.getItem(THEME_STORAGE_KEY)).toBe('sunlight');
    expect(mockDocument.documentElement.classList.contains('sunlight')).toBe(true);
    expect(getSunlightMode()).toBe(true);

    setSunlightMode(false);
    expect(mockStorage.getItem(THEME_STORAGE_KEY)).toBe('standard');
    expect(mockDocument.documentElement.classList.contains('sunlight')).toBe(false);
    expect(getSunlightMode()).toBe(false);
  });

  it('flips state cleanly with toggleSunlightMode', () => {
    expect(getSunlightMode()).toBe(false);

    const state1 = toggleSunlightMode();
    expect(state1).toBe(true);
    expect(mockStorage.getItem(THEME_STORAGE_KEY)).toBe('sunlight');
    expect(mockDocument.documentElement.classList.contains('sunlight')).toBe(true);

    const state2 = toggleSunlightMode();
    expect(state2).toBe(false);
    expect(mockStorage.getItem(THEME_STORAGE_KEY)).toBe('standard');
    expect(mockDocument.documentElement.classList.contains('sunlight')).toBe(false);
  });

  it('initializes sunlight mode from existing localStorage preference', () => {
    mockStorage.setItem(THEME_STORAGE_KEY, 'sunlight');
    const initialized = initSunlightMode();
    expect(initialized).toBe(true);
    expect(mockDocument.documentElement.classList.contains('sunlight')).toBe(true);
  });
});
