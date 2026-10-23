/**
 * SidelineSentry Scoring & Safety Service
 * Compares post-impact test scores against the athlete's preseason baseline,
 * checks for sudden movement slips or anticipation cheating,
 * and generates clear sideline recommendations (Sit Them Out, Needs Checkup, Scores Look Normal).
 */

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

/**
 * Checks reaction test trials for cheating (<150ms anticipation) or inconsistent effort (CV > 0.35)
 */
export function auditReactionTrials(trials: number[], falseStarts: number = 0): ValidityResult {
  if (falseStarts >= 3) {
    return {
      valid: false,
      reason: `Excessive false starts (${falseStarts} >= 3). Athlete repeatedly anticipated before green stimulus.`,
      metric: 'false_starts',
      value: falseStarts,
      threshold: 3
    };
  }

  if (!trials || trials.length === 0) {
    return {
      valid: false,
      reason: 'No reaction trials recorded.',
      metric: 'trials_count',
      value: 0,
      threshold: 1
    };
  }

  const nonFiniteTrial = trials.find(t => !Number.isFinite(t));
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
      reason: `Anticipatory reaction detected (${anticipatory}ms < 150ms physiological limit). Athlete guessed stimulus onset.`,
      metric: 'anticipation_ms',
      value: anticipatory,
      threshold: 150
    };
  }

  // Check trial consistency if 3 trials recorded
  if (trials.length >= 3) {
    const mean = trials.reduce((sum, v) => sum + v, 0) / trials.length;
    const variance = trials.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (trials.length - 1);
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0;

    if (cv > 0.35) {
      return {
        valid: false,
        reason: `Excessive trial variance detected (CV ${(cv * 100).toFixed(1)}% > 35%). Indicates deliberate sandbagging or inconsistent effort.`,
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

/**
 * Checks balance stance stability index:
 * - Flags corrupted/non-finite telemetry
 * - Flags phone drops or slips (> 2.5 m/s²)
 * - Flags resting flat on a bench (< 0.005 m/s²)
 */
export function auditPosturalSway(
  stabilityIndex: number,
  isBaselineOrSampleCount: boolean | number = false,
  peakSway?: number,
  sampleCountParam: number = 120
): ValidityResult {
  const sampleCount = typeof isBaselineOrSampleCount === 'number' ? isBaselineOrSampleCount : sampleCountParam;
  const isBaseline = typeof isBaselineOrSampleCount === 'boolean' ? isBaselineOrSampleCount : false;

  if (!Number.isFinite(stabilityIndex) || !Number.isFinite(sampleCount) || stabilityIndex < 0) {
    return {
      valid: false,
      reason: 'Corrupted or non-finite accelerometer telemetry stream. Retest required.',
      metric: 'postural_sway',
      value: stabilityIndex,
      threshold: 0.005,
      code: 'SENSOR_FROZEN_OR_SATURATED'
    };
  }

  if (typeof peakSway === 'number' && peakSway > 2.5) {
    return {
      valid: false,
      reason: `Motion artifact / grip slip detected (Peak ${peakSway.toFixed(2)} m/s² > 2.5 m/s²). Excessive sudden movement during stance. Retest required.`,
      metric: 'peak_motion_artifact',
      value: peakSway,
      threshold: 2.5
    };
  }

  if (stabilityIndex < 0.005) {
    return {
      valid: false,
      reason: 'Zero physiological tremor detected (<0.005 m/s^2). Device was likely resting on an inanimate surface rather than athlete chest.',
      metric: 'stability_index_floor',
      value: stabilityIndex,
      threshold: 0.005
    };
  }

  if (isBaseline && stabilityIndex > 1.2) {
    return {
      valid: false,
      reason: `Abnormally high baseline sway (${stabilityIndex.toFixed(3)} m/s^2 > 1.2 m/s^2). Indicates deliberate baseline distortion.`,
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

/**
 * Evaluates all 4 test scores against preseason baselines and returns recommendations
 */
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

  if (activeRedFlags.length > 0) {
    primaryTriggers.push(`EMERGENCY PROTOCOL: ${activeRedFlags.join(', ')}`);
  }

  // 2. Baseline Check & School Safety Margin
  const missingBaseline =
    athlete.hasRecordedBaseline === false ||
    athlete.baselineStabilityIndex === undefined ||
    athlete.baselineReactionTimeMs === undefined ||
    athlete.baselineKingDevickSeconds === undefined;

  // Apply +15% tighter threshold (0.85 multiplier) if athlete has no preseason baseline
  const safetyMarginMultiplier = missingBaseline ? 0.85 : 1.0;

  const SWAY_REMOVAL_THRESHOLD = 25.0 * safetyMarginMultiplier;
  const SWAY_EVALUATION_THRESHOLD = 15.0 * safetyMarginMultiplier;

  const REACTION_REMOVAL_THRESHOLD = 40.0 * safetyMarginMultiplier;
  const REACTION_EVALUATION_THRESHOLD = 20.0 * safetyMarginMultiplier;

  const KD_REMOVAL_THRESHOLD = 5.0 * safetyMarginMultiplier;
  const KD_EVALUATION_THRESHOLD = 3.0 * safetyMarginMultiplier;

  if (missingBaseline) {
    primaryTriggers.push('Standard School Safety Margin Applied (+15% tighter baseline check)');
  }

  let hasInvalidTrial = false;

  const balancePeakExcursion = (balance as { peakExcursion?: number }).peakExcursion ?? balance.peakSway;
  const reactionMeanLatency = (reaction as { meanLatencyMs?: number }).meanLatencyMs ?? reaction.averageMs;

  const isBalanceNonFinite =
    !balance.skippedReason &&
    (!Number.isFinite(balance.stabilityIndex) || (balancePeakExcursion !== undefined && !Number.isFinite(balancePeakExcursion)));
  const isReactionNonFinite = !reaction.skippedReason && !Number.isFinite(reactionMeanLatency);
  const isKDNonFinite =
    !kingDevick.skippedReason && (!Number.isFinite(kingDevick.durationSeconds) || !Number.isFinite(kingDevick.errorsCount));

  if (isBalanceNonFinite || isReactionNonFinite || isKDNonFinite) {
    hasInvalidTrial = true;
    primaryTriggers.push('Corrupted Sensor / Timing Telemetry: Non-finite metric detected. Retest required.');
  }

  if (!kingDevick.skippedReason && !kingDevick.completed) {
    hasInvalidTrial = true;
    primaryTriggers.push('Eye Tracking Incomplete: Assessment exited before all 3 test cards were completed. Retest required.');
  }

  // 3. Balance Sway Delta
  let swayDegradationPercent = 0;
  const baselineSway = athlete.baselineStabilityIndex || 0.085;
  if (baselineSway > 0 && Number.isFinite(balance.stabilityIndex)) {
    swayDegradationPercent = ((balance.stabilityIndex - baselineSway) / baselineSway) * 100;
  }

  if (Number.isFinite(swayDegradationPercent) && swayDegradationPercent >= SWAY_REMOVAL_THRESHOLD) {
    primaryTriggers.push(`Noticeable Balance Loss (+${swayDegradationPercent.toFixed(1)}% above baseline)`);
  } else if (Number.isFinite(swayDegradationPercent) && swayDegradationPercent >= SWAY_EVALUATION_THRESHOLD) {
    primaryTriggers.push(`Mild Balance Decrease (+${swayDegradationPercent.toFixed(1)}% above baseline)`);
  }

  if (Number.isFinite(balance.stabilityIndex) && balance.stabilityIndex >= 0.22) {
    primaryTriggers.push(`Severe Balance Loss (Sway ${balance.stabilityIndex.toFixed(3)} m/s²)`);
  }

  // 4. Reaction Time Delta
  let reactionDelayDeltaMs = 0;
  const baselineReaction = athlete.baselineReactionTimeMs || 230;
  const currentReactionMs = reactionMeanLatency;
  if (Number.isFinite(currentReactionMs)) {
    reactionDelayDeltaMs = currentReactionMs - baselineReaction;
  }

  if (Number.isFinite(reactionDelayDeltaMs) && reactionDelayDeltaMs >= REACTION_REMOVAL_THRESHOLD) {
    primaryTriggers.push(`Significant Reaction Delay (+${reactionDelayDeltaMs.toFixed(0)}ms slower than baseline)`);
  } else if (Number.isFinite(reactionDelayDeltaMs) && reactionDelayDeltaMs >= REACTION_EVALUATION_THRESHOLD) {
    primaryTriggers.push(`Mild Reaction Slowing (+${reactionDelayDeltaMs.toFixed(0)}ms)`);
  }

  // 5. Eye & Reading Test Delta
  let kingDevickDeltaSeconds = 0;
  const baselineKD = athlete.baselineKingDevickSeconds || 42.0;
  if (Number.isFinite(kingDevick.durationSeconds)) {
    kingDevickDeltaSeconds = kingDevick.durationSeconds - baselineKD;
  }

  if (
    Number.isFinite(kingDevickDeltaSeconds) &&
    Number.isFinite(kingDevick.errorsCount) &&
    (kingDevickDeltaSeconds >= KD_REMOVAL_THRESHOLD || kingDevick.errorsCount >= 2)
  ) {
    primaryTriggers.push(`Eye Tracking Delay (+${kingDevickDeltaSeconds.toFixed(1)}s delay, ${kingDevick.errorsCount} mistakes)`);
  } else if (Number.isFinite(kingDevickDeltaSeconds) && kingDevickDeltaSeconds >= KD_EVALUATION_THRESHOLD) {
    primaryTriggers.push(`Mild Eye Tracking Delay (+${kingDevickDeltaSeconds.toFixed(1)}s delay)`);
  }

  // 6. Synthesis: Classify Triage Verdict
  let verdict: AssessmentRecord['triage']['verdict'] = 'CLEAR_OBSERVED';

  if (activeRedFlags.length > 0) {
    verdict = 'IMMEDIATE_REMOVAL';
  } else if (
    hasInvalidTrial ||
    balance.valid === false ||
    reaction.valid === false ||
    kingDevick.valid === false ||
    (kingDevick.completed && !kingDevick.skippedReason && kingDevick.durationSeconds < 12.0)
  ) {
    verdict = 'INVALID_ASSESSMENT_RETEST_REQUIRED';
    if (balance.valid === false && balance.validityReason) {
      primaryTriggers.push(`Balance Validity Warning: ${balance.validityReason}`);
    }
    if (reaction.valid === false && reaction.validityReason) {
      primaryTriggers.push(`Reaction Validity Warning: ${reaction.validityReason}`);
    }
    if (kingDevick.valid === false && kingDevick.validityReason) {
      primaryTriggers.push(`Eye Tracking Validity Warning: ${kingDevick.validityReason}`);
    } else if (kingDevick.completed && !kingDevick.skippedReason && kingDevick.durationSeconds < 12.0) {
      primaryTriggers.push('Eye Tracking Validity Warning: Reading completed unnaturally fast (<12.0s). Retest required.');
    }
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
