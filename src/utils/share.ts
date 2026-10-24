// Share utilities for parent sideline summaries.
// Builds clean text summaries and uses Web Share API with clipboard fallback.

import { AssessmentSession, AthleteProfile } from '../types/clinical';
import { SupportedLocale } from '../i18n/translations';
import { translateTrigger } from '../i18n/triggerTranslator';
import { SHARE_THEME_TEXT } from '../i18n/shareTheme';
import * as clipboard from './clipboard';
import { loadAthletes } from '../services/storage';

export const copyTextToClipboard = clipboard.copyToClipboard;

export type AssessmentWithAthlete = AssessmentSession & {
  athlete?: AthleteProfile;
  athleteName?: string;
  athleteSport?: string;
  sport?: string;
};

// Builds a plain-text parent summary for texting or emailing after a sideline check
export function buildParentShareSummary(
  assessment: AssessmentSession | AssessmentWithAthlete,
  lang: SupportedLocale = 'en'
): string {
  const text = SHARE_THEME_TEXT[lang];
  const detailed = assessment as AssessmentWithAthlete;

  // Resolve athlete name and sport
  let athleteName = detailed.athlete?.name || detailed.athleteName;
  let athleteSport = detailed.athlete?.sport || detailed.athleteSport || detailed.sport;

  if (!athleteName || !athleteSport) {
    try {
      const roster = loadAthletes([]);
      const found = roster.find(a => a.id === assessment.athleteId);
      if (found) {
        if (!athleteName) athleteName = found.name;
        if (!athleteSport) athleteSport = found.sport;
      }
    } catch {
      // Storage access fallback
    }
  }

  if (!athleteName) {
    athleteName = assessment.athleteId || (lang === 'es' ? 'Atleta' : 'Athlete');
  }
  if (!athleteSport) {
    athleteSport = lang === 'es' ? 'Deportes' : 'Athletics';
  }

  // Format date and time cleanly
  let formattedDate = assessment.timestamp;
  if (assessment.timestamp) {
    try {
      const d = new Date(assessment.timestamp);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleString(lang === 'es' ? 'es-US' : 'en-US', {
          dateStyle: 'medium',
          timeStyle: 'short'
        });
      }
    } catch {
      formattedDate = assessment.timestamp;
    }
  }
  if (!formattedDate) {
    formattedDate = new Date().toISOString();
  }

  // Map recommendation verdict to coach and parent friendly guidance
  let recommendation = text.recCheckup;
  const verdict = assessment.triage?.verdict;
  if (verdict === 'IMMEDIATE_REMOVAL') {
    recommendation = text.recSitOut;
  } else if (verdict === 'CLEAR_OBSERVED') {
    recommendation = text.recNormal;
  } else {
    recommendation = text.recCheckup;
  }

  // Translated primary warning signs
  let triggersSection = '';
  const primaryTriggers = assessment.triage?.primaryTriggers || [];
  if (primaryTriggers.length > 0) {
    const lines = primaryTriggers.map(trig => `- ${translateTrigger(trig, lang)}`);
    triggersSection = `${text.warningSignsLabel}:\n${lines.join('\n')}`;
  } else {
    triggersSection = `${text.warningSignsLabel}: ${text.noWarningSigns}`;
  }

  // Baselines for comparison
  const baselineBal = detailed.athlete?.baselineStabilityIndex ?? 0.085;
  const baselineRx = detailed.athlete?.baselineReactionTimeMs ?? 230;
  const baselineKD = detailed.athlete?.baselineKingDevickSeconds ?? 42.0;

  // Balance test
  let balanceLine = '';
  if (assessment.balanceScore?.skippedReason) {
    balanceLine = `${text.balanceLabel}: ${text.skipped}`;
  } else if (assessment.balanceScore) {
    balanceLine = `${text.balanceLabel}: ${assessment.balanceScore.stabilityIndex.toFixed(3)} m/s² (${text.baselineLabel}: ${baselineBal.toFixed(3)} m/s²)`;
  } else {
    balanceLine = `${text.balanceLabel}: ${text.skipped}`;
  }

  // Reaction test
  let reactionLine = '';
  if (assessment.reactionScore?.skippedReason) {
    reactionLine = `${text.reactionLabel}: ${text.skipped}`;
  } else if (assessment.reactionScore) {
    reactionLine = `${text.reactionLabel}: ${assessment.reactionScore.averageMs} ms (${text.baselineLabel}: ${baselineRx} ms)`;
  } else {
    reactionLine = `${text.reactionLabel}: ${text.skipped}`;
  }

  // Reading test (King-Devick)
  let readingLine = '';
  if (assessment.kingDevickScore?.skippedReason) {
    readingLine = `${text.readingLabel}: ${text.skipped}`;
  } else if (assessment.kingDevickScore) {
    readingLine = `${text.readingLabel}: ${assessment.kingDevickScore.durationSeconds.toFixed(1)} s (${text.baselineLabel}: ${baselineKD.toFixed(1)} s)`;
  } else {
    readingLine = `${text.readingLabel}: ${text.skipped}`;
  }

  // Assemble full summary (must stay concise and under 1100 characters)
  const fullSummary = [
    text.parentSummaryHeader,
    `${text.athleteLabel}: ${athleteName} (${athleteSport})`,
    `${text.dateLabel}: ${formattedDate}`,
    `${text.recommendationLabel}: ${recommendation}`,
    '',
    triggersSection,
    '',
    `${text.scoresVsBaselineLabel}:`,
    `- ${balanceLine}`,
    `- ${reactionLine}`,
    `- ${readingLine}`,
    '',
    text.cdcReminder,
    '',
    text.medicalDisclaimer
  ].join('\n');

  return fullSummary;
}

// Attempts native mobile sharing with clipboard and manual fallbacks
export async function shareParentSummary(
  summaryText: string,
  title: string
): Promise<'shared' | 'copied' | 'cancelled' | 'manual'> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text: summaryText });
      return 'shared';
    } catch (err: unknown) {
      if (err && typeof err === 'object' && (err as { name?: string }).name === 'AbortError') {
        return 'cancelled';
      }
      // If user share failed with any other error, continue to clipboard
    }
  }

  try {
    const copied = await clipboard.copyToClipboard(summaryText);
    if (copied) {
      return 'copied';
    }
  } catch {
    // Clipboard failed or was blocked by permissions
  }

  return 'manual';
}
