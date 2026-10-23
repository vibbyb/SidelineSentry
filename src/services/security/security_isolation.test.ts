import { describe, it, expect } from 'vitest';
import { generateSessionHash, pureSha256Hex } from './sessionHash';
import { AssessmentStore } from '../storage';
import { RingBuffer } from '../motion/RingBuffer';
import { AssessmentRecord } from '../../types/clinical';

describe('sessionHash and storage', () => {
  it('matches standard UTF-8 SHA-256 on multibyte Unicode and Spanish strings', async () => {
    const testCases: [string, string][] = [
      [
        'Hello World',
        'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e'
      ],
      [
        '• 0.085 m/s² • Mediolateral Sway Protocol',
        'eecf83d2011254493157eaea942e2632ec81e3cf4dcfb358bb1e741da00a7e05'
      ],
      [
        'Protocolo de conmoción cerebral en Español: dolor de cuello, visión doble, náuseas.',
        '537961a8eba61f741de807245da0a2f9a44e6550b1bc13c474a8ac91b4975503'
      ],
      [
        'SidelineSentry • Sarah Jenkins ATC • High School Football Sideline',
        'f953a95061f18c0b21cea18a28beeb4a29ef99c57c5bf1fde3740fc1826c7b28'
      ]
    ];

    for (const [inputStr, expectedHash] of testCases) {
      const hash = await generateSessionHash(inputStr);
      expect(hash).toBe(expectedHash);
    }
  });

  it('matches crypto.subtle SHA-256 across test payloads', async () => {
    const payloads = [
      '',
      'a',
      'abc',
      'message digest',
      'secure-session-hash-12345',
      '• 0.085 m/s² • Mediolateral Sway Protocol',
      'Protocolo de conmoción cerebral en Español: dolor de cuello, visión doble, náuseas.',
      'A'.repeat(55),
      'B'.repeat(56),
      'C'.repeat(64),
      'D'.repeat(128),
      'SidelineSentry • Sarah Jenkins ATC • High School Football Sideline'
    ];

    const encoder = new TextEncoder();
    for (const payload of payloads) {
      const pureHex = pureSha256Hex(payload);
      expect(pureHex).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(pureHex)).toBe(true);

      const subtleBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(payload));
      const subtleHex = Array.from(new Uint8Array(subtleBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      expect(pureHex).toBe(subtleHex);
    }
  });

  it('captures full-session RMS without circular overwrite truncation', () => {
    const buffer = new RingBuffer(256);

    // Push initial 256 samples with large sway (simulating concussive ataxia at start of stance: RMS = 2.0)
    for (let i = 0; i < 256; i++) {
      buffer.push(2.0);
    }
    expect(buffer.getRMS()).toBeCloseTo(2.0, 4);
    expect(buffer.getSessionRMS()).toBeCloseTo(2.0, 4);

    // Push next 744 samples (total 1000 samples) of quiet stance (sway = 0.0)
    for (let i = 0; i < 744; i++) {
      buffer.push(0.0);
    }

    // 256-sample sliding buffer has completely overwritten with 0.0
    expect(buffer.getRMS()).toBeCloseTo(0.0, 4);

    // Full 1000-sample session RMS retains the 256 initial ataxia samples!
    // Total sumSq = 256 * (2.0^2) = 1024. MeanSq = 1024 / 1000 = 1.024. RMS = sqrt(1.024) ~ 1.0119
    expect(buffer.getSessionRMS()).toBeCloseTo(Math.sqrt(1024 / 1000), 3);
    expect(buffer.getSessionRMS()).toBeGreaterThan(1.0);
  });

  it('silently ignores NaN and Infinity inputs', () => {
    const buffer = new RingBuffer(10);
    buffer.push(1.0);
    buffer.push(NaN);
    buffer.push(Infinity);
    buffer.push(-Infinity);
    buffer.push(1.0);

    expect(buffer.getCount()).toBe(2);
    expect(buffer.getRMS()).toBeCloseTo(1.0, 4);
    expect(buffer.getSessionRMS()).toBeCloseTo(1.0, 4);
  });

  it('ignores demo assessment records in storage', () => {
    const storageMock: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => storageMock[key] || null,
      setItem: (key: string, value: string) => { storageMock[key] = value; },
      removeItem: (key: string) => { delete storageMock[key]; },
      clear: () => { Object.keys(storageMock).forEach(k => delete storageMock[k]); },
      key: (index: number) => Object.keys(storageMock)[index] || null,
      length: 0
    };

    (globalThis as unknown as { localStorage: typeof mockStorage }).localStorage = mockStorage;
    (globalThis as unknown as { window: { localStorage: typeof mockStorage } }).window = { localStorage: mockStorage };

    const dummyAssessment: AssessmentRecord = {
      id: 'demo-session-999',
      athleteId: 'ath-1',
      timestamp: '2026-10-19 12:00:00',
      isPostImpact: true,
      isDemo: true,
      balanceScore: { durationSeconds: 15, stabilityIndex: 0.12, peakSway: 0.25, swayHistory: [], valid: true },
      reactionScore: { averageMs: 250, fastestMs: 220, slowestMs: 280, trials: [250], falseStarts: 0, valid: true },
      kingDevickScore: { durationSeconds: 45, errorsCount: 0, completed: true },
      redFlags: {
        neckPain: false, doubleVision: false, weaknessOrTingling: false,
        severeOrIncreasingHeadache: false, seizureOrConvulsion: false,
        lossOfConsciousness: false, deterioratingConsciousState: false,
        vomitingRepeated: false, increasingConfusion: false,
        maddocksVenueFailed: false, maddocksPeriodFailed: false,
        maddocksScoreFailed: false
      },
      triage: {
        verdict: 'CLEAR_OBSERVED',
        primaryTriggers: [],
        swayDegradationPercent: 0,
        reactionDelayDeltaMs: 0,
        kingDevickDeltaSeconds: 0,
        nonDiagnosticDisclaimer: 'Screening only'
      }
    };

    // Save demo assessment: should be rejected
    AssessmentStore.saveAssessment(dummyAssessment);
    expect(AssessmentStore.loadAssessments()).toHaveLength(0);

    // Save real assessment (isDemo: false): should be saved
    const realAssessment: AssessmentRecord = { ...dummyAssessment, id: 'real-session-100', isDemo: false };
    AssessmentStore.saveAssessment(realAssessment);
    expect(AssessmentStore.loadAssessments()).toHaveLength(1);
    expect(AssessmentStore.loadAssessments()[0].id).toBe('real-session-100');
  });

  it('strips signatureDataUrl from older records when storage is full', () => {
    const storageStore: Record<string, string> = {};
    let quotaErrorTriggered = false;

    const mockStorage = {
      getItem: (key: string) => storageStore[key] || null,
      setItem: (key: string, value: string) => {
        // Throw QuotaExceededError on first attempt when storing with large signatures
        if (!quotaErrorTriggered && value.includes('LARGE_SIGNATURE')) {
          quotaErrorTriggered = true;
          const quotaErr = new Error('The quota has been exceeded.');
          quotaErr.name = 'QuotaExceededError';
          throw quotaErr;
        }
        storageStore[key] = value;
      },
      removeItem: (key: string) => { delete storageStore[key]; },
      clear: () => { Object.keys(storageStore).forEach(k => delete storageStore[k]); },
      key: (i: number) => Object.keys(storageStore)[i] || null,
      length: 0
    };

    (globalThis as unknown as { localStorage: typeof mockStorage }).localStorage = mockStorage;
    (globalThis as unknown as { window: { localStorage: typeof mockStorage } }).window = { localStorage: mockStorage };

    const oldRecord: AssessmentRecord = {
      id: 'old-record-1',
      athleteId: 'ath-1',
      timestamp: '2026-10-18 10:00:00',
      isPostImpact: false,
      certification: {
        evaluatorName: 'Jane Doe',
        credential: 'ATC',
        licenseNumber: 'ATC-1234',
        signatureDataUrl: 'data:image/png;base64,LARGE_SIGNATURE'
      },
      balanceScore: { durationSeconds: 15, stabilityIndex: 0.08, peakSway: 0.1, swayHistory: [], valid: true },
      reactionScore: { averageMs: 230, fastestMs: 220, slowestMs: 240, trials: [230], falseStarts: 0, valid: true },
      kingDevickScore: { durationSeconds: 40, errorsCount: 0, completed: true },
      redFlags: { neckPain: false, doubleVision: false, weaknessOrTingling: false, severeOrIncreasingHeadache: false, seizureOrConvulsion: false, lossOfConsciousness: false, deterioratingConsciousState: false, vomitingRepeated: false, increasingConfusion: false, maddocksVenueFailed: false, maddocksPeriodFailed: false, maddocksScoreFailed: false },
      triage: { verdict: 'CLEAR_OBSERVED', primaryTriggers: [], swayDegradationPercent: 0, reactionDelayDeltaMs: 0, kingDevickDeltaSeconds: 0, nonDiagnosticDisclaimer: 'Screening only' }
    };

    storageStore['sidelinesentry_assessments'] = JSON.stringify([oldRecord]);

    const newRecord: AssessmentRecord = {
      ...oldRecord,
      id: 'new-record-2',
      timestamp: '2026-10-19 11:00:00',
      certification: {
        evaluatorName: 'Jane Doe',
        credential: 'ATC',
        licenseNumber: 'ATC-1234',
        signatureDataUrl: 'data:image/png;base64,NEW_SIGNATURE'
      }
    };

    const saved = AssessmentStore.saveAssessment(newRecord);
    expect(saved).toBe(true);

    const savedRecords = AssessmentStore.loadAssessments();
    expect(savedRecords).toHaveLength(2);
    // New record preserves signature
    expect(savedRecords.find(r => r.id === 'new-record-2')?.certification?.signatureDataUrl).toBe('data:image/png;base64,NEW_SIGNATURE');
    // Old historical record had signature stripped to save quota
    expect(savedRecords.find(r => r.id === 'old-record-1')?.certification?.signatureDataUrl).toBeUndefined();
  });
});
