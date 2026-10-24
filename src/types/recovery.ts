// Types for SidelineSentry concussion recovery tracking
// Follows CDC HEADS UP return to play progression guidelines

export interface SymptomRatings {
  headache: number;
  dizziness: number;
  nausea: number;
  lightNoiseSensitivity: number;
  fogginess: number;
  concentration: number;
  sleep: number;
}

export type SymptomKey = keyof SymptomRatings;

export interface SymptomEntry {
  id: string;
  date: string; // Format: YYYY-MM-DD
  symptoms: SymptomRatings;
  notes?: string;
  totalScore?: number; // Sum of 7 symptoms (0 to 42)
}

export interface ReturnToPlayStep {
  stepNumber: number; // 1 to 6
  name: string;
  description: string;
  completed: boolean;
  completedDate?: string; // Format: YYYY-MM-DD or ISO timestamp
}

export interface MedicalClearance {
  clearedByProvider: boolean;
  providerName: string;
  clearanceDate?: string;
}

export interface ReturnToPlayPlan {
  steps: ReturnToPlayStep[];
  medicalClearance: MedicalClearance;
  lessThan24hWarning: boolean;
}

export interface AthleteRecoveryRecord {
  athleteId: string;
  returnToPlay: ReturnToPlayPlan;
  symptomLog: SymptomEntry[];
  lastUpdated?: string;
  lessThan24hWarning?: boolean; // Convenience flag mirroring returnToPlay.lessThan24hWarning
}

export type RecoveryStore = Record<string, AthleteRecoveryRecord>;
