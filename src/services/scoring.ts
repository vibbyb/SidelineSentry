// Evaluates test scores against baselines and generates sideline recommendations

import { AthleteProfile, AssessmentRecord } from '../types/clinical';

export const CDC_DISCLAIMER =
  'SAFETY NOTICE: SidelineSentry is a sideline screening tool aligned with CDC HEADS UP guidelines. It does not diagnose concussions. When in doubt, sit the athlete out and have a doctor evaluate them.';

export interface ValidityResult {
  valid: boolean;
  reason?: string;
  metric: string;
  value: number;
  threshold: number;
  code?: string;
}

// Validates reaction trials for anticipation (<150ms) or high variance
export function auditReactionTrials(trials: number[], falseStarts: number = 0): ValidityResult {
  if (falseStarts >= 3) {
    return {
      valid: false,
      reason: `Excessive false starts (${falseStarts} >= 3). Athlete jumped before the green light. Retest required.`,
      metric: 'false_starts',
      value: falseStarts,
      threshold: 3
    };
  }

  if (!trials || trials.length === 0) {
    return {
      valid: false,
      reason: 'No reaction trials recorded. Retest required.',
      metric: 'trials_count',
      value: 0,
      threshold: 1
    };
  }

  const nonFiniteTrial = trials.find(t => !Number.isFinite(t) || t <= 0);
  if (nonFiniteTrial !== undefined) {
    return {
      valid: false,
      reason: 'Corrupted or non-finite reaction timing telemetry stream. Retest required.',
      metric: 'reaction_trial_ms',
      value: nonFiniteTrial,
      threshold: 150,
      code: 'TIMING_TELEMETRY_CORRUPTED'
    };
  }

  // Taps under 150ms indicate guessing before the screen turned green
  const anticipatory = trials.find(t => t < 150);
  if (anticipatory !== undefined) {
    return {
      valid: false,
      reason: `Anticipatory reaction detected (${anticipatory}ms < 150ms physiological limit). Athlete tapped too early before seeing green. Retest required.`,
      metric: 'anticipation_ms',
      value: anticipatory,
      threshold: 150
    };
  }

  // Check trial consistency if 3 trials recorded
  if (trials.length >= 3) {
    const mean = trials.reduce((sum, v) => sum + v, 0) / trials.length;
    const variance = trials.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (trials.length - 1);
    const stdDev = Math.sqrt(Math.max(0, variance));
    const cv = mean > 0 ? stdDev / mean : 0;

    if (cv > 0.35) {
      return {
        valid: false,
        reason: `Excessive trial variance detected (CV ${(cv * 100).toFixed(1)}% > 35%). Reaction times were too inconsistent. Retest required.`,
        metric: 'coefficient_of_variation',
        value: cv,
        threshold: 0.35
      };
    }
  }

  return {
    valid: true,
    metric: 'validity_check',
    value: 1,
    threshold: 1
  };
}

// Validates balance test stability index and movement artifacts
export function auditPosturalSway(
  stabilityIndex: number,
  isBaselineOrSampleCount: boolean | number = false,
  peakSway?: number,
  sampleCountParam: number = 120
): ValidityResult {
  const sampleCount = typeof isBaselineOrSampleCount === 'number' ? isBaselineOrSampleCount : sampleCountParam;
  const isBaseline = typeof isBaselineOrSampleCount === 'boolean' ? isBaselineOrSampleCount : false;

  if (!Number.isFinite(stabilityIndex) || !Number.isFinite(sampleCount) || stabilityIndex < 0 || sampleCount <= 0) {
    return {
      valid: false,
      reason: 'Corrupted or non-finite accelerometer telemetry stream. Retest required.',
      metric: 'postural_sway',
      value: stabilityIndex,
      threshold: 0.005,
      code: 'SENSOR_FROZEN_OR_SATURATED'
    };
  }

  if (typeof peakSway === 'number') {
    if (!Number.isFinite(peakSway) || peakSway < 0) {
      return {
        valid: false,
        reason: 'Corrupted or non-finite peak motion telemetry. Retest required.',
        metric: 'peak_motion_artifact',
        value: peakSway,
        threshold: 2.5,
        code: 'SENSOR_FROZEN_OR_SATURATED'
      };
    }
    if (peakSway > 2.5) {
      return {
        valid: false,
        reason: `Motion artifact / grip slip detected (Peak ${peakSway.toFixed(2)} m/s² > 2.5 m/s²). Phone moved suddenly or slipped during stance. Retest required.`,
        metric: 'peak_motion_artifact',
        value: peakSway,
        threshold: 2.5
      };
    }
  }

  if (stabilityIndex < 0.005) {
    return {
      valid: false,
      reason: 'Zero physiological tremor detected (<0.005 m/s^2). Phone was not moving at all. It may have been set down instead of held on the chest. Redo the balance test.',
      metric: 'stability_index_floor',
      value: stabilityIndex,
      threshold: 0.005
    };
  }

  if (isBaseline && stabilityIndex > 1.2) {
    return {
      valid: false,
      reason: `Abnormally high baseline sway (${stabilityIndex.toFixed(3)} m/s^2 > 1.2 m/s^2). Athlete was moving excessively during baseline test. Retest required.`,
      metric: 'baseline_sway_ceiling',
      value: stabilityIndex,
      threshold: 1.2
    };
  }

  return {
    valid: true,
    metric: 'postural_sway',
    value: stabilityIndex,
    threshold: 0
  };
}

export function auditPeakMotionArtifact(peakSway: number): ValidityResult {
  if (!Number.isFinite(peakSway)) {
    return {
      valid: false,
      reason: 'Corrupted or non-finite peak motion telemetry. Retest required.',
      metric: 'peak_motion_artifact',
      value: peakSway,
      threshold: 2.5,
      code: 'SENSOR_FROZEN_OR_SATURATED'
    };
  }
  if (peakSway > 2.5) {
    return {
      valid: false,
      reason: `Motion artifact or grip slip detected (${peakSway.toFixed(2)} m/s² > 2.5 m/s²). Retest required.`,
      metric: 'peak_motion_artifact',
      value: peakSway,
      threshold: 2.5
    };
  }
  return {
    valid: true,
    metric: 'peak_motion_artifact',
    value: peakSway,
    threshold: 2.5
  };
}

// Evaluates test scores against preseason baselines and returns recommendations
export function calculateTriage(
  athlete: AthleteProfile,
  balance: AssessmentRecord['balanceScore'],
  reaction: AssessmentRecord['reactionScore'],
  kingDevick: AssessmentRecord['kingDevickScore'],
  redFlags: AssessmentRecord['redFlags']
): AssessmentRecord['triage'] {
  const primaryTriggers: string[] = [];

  // 1. Audit Emergency Red Flags & On-Field Memory Questions
  const activeRedFlags: string[] = [];
  if (redFlags.neckPain) activeRedFlags.push('Neck pain or tenderness');
  if (redFlags.doubleVision) activeRedFlags.push('Double vision');
  if (redFlags.weaknessOrTingling) activeRedFlags.push('Weakness or tingling in arms/legs');
  if (redFlags.severeOrIncreasingHeadache) activeRedFlags.push('Severe or escalating headache');
  if (redFlags.seizureOrConvulsion) activeRedFlags.push('Seizure or convulsion');
  if (redFlags.lossOfConsciousness) activeRedFlags.push('Loss of consciousness');
  if (redFlags.deterioratingConsciousState) activeRedFlags.push('Deteriorating conscious state');
  if (redFlags.vomitingRepeated) activeRedFlags.push('Repeated vomiting');
  if (redFlags.increasingConfusion) activeRedFlags.push('Increasing confusion or agitation');

  if (redFlags.maddocksVenueFailed) {
    activeRedFlags.push("Sideline Memory Failure: Disoriented to venue/field");
  }
  if (redFlags.maddocksPeriodFailed) {
    activeRedFlags.push("Sideline Memory Failure: Disoriented to current period/quarter");
  }
  if (redFlags.maddocksScoreFailed) {
    activeRedFlags.push("Sideline Memory Failure: Disoriented to last score/opponent");
  }

  const hasEmergencyRedFlags =
    Boolean(redFlags.hasRedFlags) ||
    activeRedFlags.length > 0;

  if (activeRedFlags.length > 0) {
    primaryTriggers.push(`EMERGENCY PROTOCOL: ${activeRedFlags.join(', ')}`);
  }

  // 2. Baseline Check (Uses standard reference baseline if individual baseline is missing)
  const hasValidIndividualBaseline =
    (athlete.hasRecordedBaseline === true ||
      (athlete.hasRecordedBaseline !== false &&
        athlete.baselineStabilityIndex !== undefined &&
        athlete.baselineStabilityIndex > 0)) &&
    Number.isFinite(athlete.baselineStabilityIndex) &&
    (athlete.baselineStabilityIndex ?? 0) > 0 &&
    Number.isFinite(athlete.baselineReactionTimeMs) &&
    (athlete.baselineReactionTimeMs ?? 0) > 0 &&
    Number.isFinite(athlete.baselineKingDevickSeconds) &&
    (athlete.baselineKingDevickSeconds ?? 0) > 0;

  const missingBaseline = !hasValidIndividualBaseline;

  const SWAY_REMOVAL_THRESHOLD = 25.0;
  const SWAY_EVALUATION_THRESHOLD = 15.0;

  const REACTION_REMOVAL_THRESHOLD = 40.0;
  const REACTION_EVALUATION_THRESHOLD = 20.0;

  const KD_REMOVAL_THRESHOLD = 5.0;
  const KD_EVALUATION_THRESHOLD = 3.0;

  let hasInvalidTrial = false;

  const balancePeakExcursion = (balance as { peakExcursion?: number }).peakExcursion ?? balance.peakSway;
  const reactionMeanLatency = (reaction as { meanLatencyMs?: number }).meanLatencyMs ?? reaction.averageMs;

  // Check skipped tests
  const balanceSkipped = Boolean(balance.skippedReason);
  const reactionSkipped = Boolean(reaction.skippedReason);
  const kdSkipped = Boolean(kingDevick.skippedReason);
  const hasSkippedTest = balanceSkipped || reactionSkipped || kdSkipped;

  // Only push skipped test warnings if not in emergency stop
  if (!hasEmergencyRedFlags) {
    if (balance.skippedReason) {
      primaryTriggers.push(`Balance Test Skipped: ${balance.skippedReason}`);
    }
    if (reaction.skippedReason) {
      primaryTriggers.push(`Reaction Test Skipped: ${reaction.skippedReason}`);
    }
    if (kingDevick.skippedReason) {
      primaryTriggers.push(`Reading Test Skipped: ${kingDevick.skippedReason}`);
    }
  }

  // Telemetry integrity checks for non-skipped tests
  const isBalanceCorrupted =
    !balanceSkipped &&
    (!Number.isFinite(balance.stabilityIndex) ||
      balance.stabilityIndex < 0 ||
      (balancePeakExcursion !== undefined && (!Number.isFinite(balancePeakExcursion) || balancePeakExcursion < 0)));

  const isReactionCorrupted =
    !reactionSkipped &&
    (!Number.isFinite(reactionMeanLatency) ||
      reactionMeanLatency < 0 ||
      (reaction.falseStarts !== undefined && reaction.falseStarts < 0));

  const isKDCorrupted =
    !kdSkipped &&
    (!Number.isFinite(kingDevick.durationSeconds) ||
      kingDevick.durationSeconds < 0 ||
      !Number.isFinite(kingDevick.errorsCount) ||
      kingDevick.errorsCount < 0);

  if (isBalanceCorrupted || isReactionCorrupted || isKDCorrupted) {
    hasInvalidTrial = true;
    primaryTriggers.push('Corrupted Sensor / Timing Telemetry: Non-finite metric detected. Retest required.');
  }

  // Check physiological validity on completed balance test
  if (!balanceSkipped && !isBalanceCorrupted) {
    if (balance.stabilityIndex < 0.005) {
      hasInvalidTrial = true;
      primaryTriggers.push('Zero physiological tremor detected (<0.005 m/s²): Phone was not moving at all. It may have been set down instead of held on the chest. Redo the balance test.');
    }
    if (balancePeakExcursion !== undefined && balancePeakExcursion > 2.5) {
      hasInvalidTrial = true;
      primaryTriggers.push(`Motion artifact / grip slip detected (Peak ${balancePeakExcursion.toFixed(2)} m/s² > 2.5 m/s²): Phone moved suddenly or slipped during stance. Retest required.`);
    }
  }

  // Check reaction test validity
  if (!reactionSkipped && !isReactionCorrupted) {
    if (reaction.falseStarts >= 3) {
      hasInvalidTrial = true;
      primaryTriggers.push(`Excessive false starts (${reaction.falseStarts} >= 3): Athlete jumped before the green light. Retest required.`);
    }
    if (reaction.trials && reaction.trials.length > 0) {
      if (reaction.trials.some(t => t < 150)) {
        hasInvalidTrial = true;
        primaryTriggers.push('Anticipatory reaction detected (<150ms): Athlete tapped before seeing green. Retest required.');
      }
    } else if (reactionMeanLatency === 0) {
      hasInvalidTrial = true;
      primaryTriggers.push('No reaction trials recorded. Retest required.');
    }
  }

  // Check King-Devick completion
  if (!kdSkipped && !kingDevick.completed) {
    hasInvalidTrial = true;
    primaryTriggers.push('Eye Tracking Incomplete: Assessment exited before all 3 test cards were completed. Retest required.');
  }

  // 3. Balance Sway Delta
  let swayDegradationPercent = 0;
  const baselineSway = (athlete.baselineStabilityIndex && athlete.baselineStabilityIndex > 0) ? athlete.baselineStabilityIndex : 0.085;
  if (!balanceSkipped && baselineSway > 0 && Number.isFinite(balance.stabilityIndex) && balance.stabilityIndex > 0) {
    swayDegradationPercent = ((balance.stabilityIndex - baselineSway) / baselineSway) * 100;
  }

  if (!balanceSkipped && Number.isFinite(swayDegradationPercent) && swayDegradationPercent >= SWAY_REMOVAL_THRESHOLD) {
    primaryTriggers.push(`Noticeable Balance Loss (+${swayDegradationPercent.toFixed(1)}% above baseline)`);
  } else if (!balanceSkipped && Number.isFinite(swayDegradationPercent) && swayDegradationPercent >= SWAY_EVALUATION_THRESHOLD) {
    primaryTriggers.push(`Mild Balance Decrease (+${swayDegradationPercent.toFixed(1)}% above baseline)`);
  }

  if (!balanceSkipped && Number.isFinite(balance.stabilityIndex) && balance.stabilityIndex >= 0.22) {
    primaryTriggers.push(`Severe Balance Loss (Sway ${balance.stabilityIndex.toFixed(3)} m/s²)`);
  }

  // 4. Reaction Time Delta
  let reactionDelayDeltaMs = 0;
  const baselineReaction = (athlete.baselineReactionTimeMs && athlete.baselineReactionTimeMs > 0) ? athlete.baselineReactionTimeMs : 230;
  const currentReactionMs = reactionMeanLatency;
  if (!reactionSkipped && Number.isFinite(currentReactionMs) && currentReactionMs > 0) {
    reactionDelayDeltaMs = currentReactionMs - baselineReaction;
  }

  if (!reactionSkipped && Number.isFinite(reactionDelayDeltaMs) && reactionDelayDeltaMs >= REACTION_REMOVAL_THRESHOLD) {
    primaryTriggers.push(`Significant Reaction Delay (+${reactionDelayDeltaMs.toFixed(0)}ms slower than baseline)`);
  } else if (!reactionSkipped && Number.isFinite(reactionDelayDeltaMs) && reactionDelayDeltaMs >= REACTION_EVALUATION_THRESHOLD) {
    primaryTriggers.push(`Mild Reaction Slowing (+${reactionDelayDeltaMs.toFixed(0)}ms)`);
  }

  // 5. Reading Test Delta
  let kingDevickDeltaSeconds = 0;
  const baselineKD = (athlete.baselineKingDevickSeconds && athlete.baselineKingDevickSeconds > 0) ? athlete.baselineKingDevickSeconds : 42.0;
  if (!kdSkipped && Number.isFinite(kingDevick.durationSeconds) && kingDevick.durationSeconds > 0) {
    kingDevickDeltaSeconds = kingDevick.durationSeconds - baselineKD;
  }

  if (
    !kdSkipped &&
    Number.isFinite(kingDevickDeltaSeconds) &&
    Number.isFinite(kingDevick.errorsCount) &&
    (kingDevickDeltaSeconds >= KD_REMOVAL_THRESHOLD || kingDevick.errorsCount >= 2)
  ) {
    primaryTriggers.push(`Eye Tracking Delay (+${kingDevickDeltaSeconds.toFixed(1)}s delay, ${kingDevick.errorsCount} mistakes)`);
  } else if (!kdSkipped && Number.isFinite(kingDevickDeltaSeconds) && kingDevickDeltaSeconds >= KD_EVALUATION_THRESHOLD) {
    primaryTriggers.push(`Mild Eye Tracking Delay (+${kingDevickDeltaSeconds.toFixed(1)}s delay)`);
  }

  // Record explicit validity warnings if test objects were flagged invalid
  if (balance.valid === false && balance.validityReason) {
    primaryTriggers.push(`Balance Validity Warning: ${balance.validityReason}`);
  }
  if (reaction.valid === false && reaction.validityReason) {
    primaryTriggers.push(`Reaction Validity Warning: ${reaction.validityReason}`);
  }
  if (kingDevick.valid === false && kingDevick.validityReason) {
    primaryTriggers.push(`Eye Tracking Validity Warning: ${kingDevick.validityReason}`);
  } else if (kingDevick.completed && !kdSkipped && kingDevick.durationSeconds < 12.0) {
    primaryTriggers.push('Eye Tracking Validity Warning: Reading completed unnaturally fast (<12.0s). Retest required.');
  }

  // 6. Synthesis: Classify Triage Verdict
  let verdict: AssessmentRecord['triage']['verdict'] = 'CLEAR_OBSERVED';

  if (activeRedFlags.length > 0) {
    verdict = 'IMMEDIATE_REMOVAL';
  } else if (
    hasSkippedTest ||
    hasInvalidTrial ||
    balance.valid === false ||
    reaction.valid === false ||
    kingDevick.valid === false ||
    (kingDevick.completed && !kdSkipped && kingDevick.durationSeconds < 12.0)
  ) {
    verdict = 'INVALID_ASSESSMENT_RETEST_REQUIRED';
  } else if (
    swayDegradationPercent >= SWAY_REMOVAL_THRESHOLD ||
    balance.stabilityIndex >= 0.22 ||
    reactionDelayDeltaMs >= REACTION_REMOVAL_THRESHOLD ||
    kingDevickDeltaSeconds >= KD_REMOVAL_THRESHOLD ||
    kingDevick.errorsCount >= 2
  ) {
    verdict = 'IMMEDIATE_REMOVAL';
  } else if (
    swayDegradationPercent >= SWAY_EVALUATION_THRESHOLD ||
    reactionDelayDeltaMs >= REACTION_EVALUATION_THRESHOLD ||
    kingDevickDeltaSeconds >= KD_EVALUATION_THRESHOLD
  ) {
    verdict = 'EVALUATION_RECOMMENDED';
  } else {
    verdict = 'CLEAR_OBSERVED';
  }

  return {
    verdict,
    primaryTriggers,
    swayDegradationPercent,
    reactionDelayDeltaMs,
    kingDevickDeltaSeconds,
    nonDiagnosticDisclaimer: CDC_DISCLAIMER,
    hasIndividualBaseline: !missingBaseline
  };
}

// Backward-compatible student aliases
export const DeltaEngine = {
  CDC_DISCLAIMER,
  computeTriage: calculateTriage
};

export const ClinicalValidityAuditor = {
  auditReactionTrials,
  auditPosturalSway,
  auditPeakMotionArtifact
};
