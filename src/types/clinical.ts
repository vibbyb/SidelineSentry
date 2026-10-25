export interface MotionFrame {
  timestamp: number;
  x: number; // Side-to-side sway (m/s^2)
  y: number; // Vertical spine axis (m/s^2)
  z: number; // Chest front-to-back sway (m/s^2)
  rms: number; // Live sway stability index
  isSimulated?: boolean;
}

export type MotionCallback = (frame: MotionFrame) => void;

export interface IMotionProvider {
  start(callback: MotionCallback): Promise<boolean>;
  stop(): void;
  isAvailable(): boolean;
  getMode(): 'hardware' | 'simulated';
  setSimulationProfile?(profile: 'healthy' | 'concussed'): void;
  requestPermission?(): Promise<boolean>;
}

export type ClinicianCredential = 'ATC' | 'LAT' | 'MD' | 'DO' | 'PA-C' | 'PT' | 'OTHER';

export interface ClinicianCertification {
  evaluatorName: string;
  credential: ClinicianCredential;
  licenseNumber: string;
  organization?: string;
  signatureDataUrl?: string; // HTML5 Canvas export (PNG data URL)
  signedAt?: string;
  sessionHash?: string; // 64-character SHA-256 tamper-evident hex digest
}

export interface AthleteProfile {
  id: string;
  name: string;
  jerseyNumber: string;
  sport: string;
  position: string;
  baselineDate?: string;
  hasRecordedBaseline?: boolean;
  baselineStabilityIndex?: number; // Lower is better (m/s^2 sway RMS)
  baselineReactionTimeMs?: number; // Milliseconds
  baselineKingDevickSeconds?: number; // Seconds to complete reading
}

export type TriageVerdict =
  | 'IMMEDIATE_REMOVAL'
  | 'EVALUATION_RECOMMENDED'
  | 'CLEAR_OBSERVED'
  | 'INVALID_ASSESSMENT_RETEST_REQUIRED';

export interface AssessmentRecord {
  id: string;
  athleteId: string;
  timestamp: string;
  isPostImpact: boolean;
  isDemo?: boolean;
  impactContext?: string;
  isEmergencyLockdown?: boolean;
  certification?: ClinicianCertification;
  sessionHash?: string;
  
  // Balance Assessment (Test 2)
  balanceScore: {
    durationSeconds: number;
    stabilityIndex: number; // Balance sway RMS
    peakSway: number;
    swayHistory: number[]; // Downsampled for report rendering
    valid: boolean;
    validityReason?: string;
    skippedReason?: string; // e.g. 'CONTRAINDICATED_EMERGENCY_LOCKDOWN'
  };

  // Reaction Assessment (Test 3)
  reactionScore: {
    averageMs: number;
    fastestMs: number;
    slowestMs: number;
    trials: number[];
    falseStarts: number;
    valid: boolean;
    validityReason?: string;
    skippedReason?: string;
  };

  // King-Devick Reading Assessment (Test 4)
  kingDevickScore: {
    durationSeconds: number;
    errorsCount: number;
    completed: boolean;
    cardSplits?: number[];
    valid?: boolean;
    validityReason?: string;
    skippedReason?: string;
  };

  // Emergency Red Flags Checklist (Test 1)
  redFlags: {
    neckPain: boolean;
    doubleVision: boolean;
    weaknessOrTingling: boolean;
    severeOrIncreasingHeadache: boolean;
    seizureOrConvulsion: boolean;
    lossOfConsciousness: boolean;
    deterioratingConsciousState: boolean;
    vomitingRepeated: boolean;
    increasingConfusion: boolean;
    hasRedFlags?: boolean;
    // Sideline Memory & Orientation Questions
    maddocksVenueFailed?: boolean;
    maddocksPeriodFailed?: boolean;
    maddocksScoreFailed?: boolean;
  };

  // Triage Synthesis
  triage: {
    verdict: TriageVerdict;
    primaryTriggers: string[];
    swayDegradationPercent: number;
    reactionDelayDeltaMs: number;
    kingDevickDeltaSeconds: number;
    nonDiagnosticDisclaimer: string;
    hasIndividualBaseline?: boolean;
  };
}

// Alias for assessment record sessions
export type AssessmentSession = AssessmentRecord;
