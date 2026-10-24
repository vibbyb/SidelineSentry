// Formats sideline summary reports for clipboard, printing, and JSON export

import { AthleteProfile, AssessmentRecord, ClinicianCredential } from '../types/clinical';
import { TRANSLATIONS, SupportedLocale } from '../i18n/translations';

export interface EvaluatorReportInfo {
  evaluatorName: string;
  evaluatorRole: ClinicianCredential;
  licenseNumber: string;
  signatureUrl: string | null;
}

export const CREDENTIAL_OPTIONS: { value: ClinicianCredential; key: 'optATC' | 'optOTHER' | 'optLAT' | 'optMD' | 'optDO' | 'optPAC' | 'optPT' }[] = [
  { value: 'ATC', key: 'optATC' },
  { value: 'OTHER', key: 'optOTHER' },
  { value: 'LAT', key: 'optLAT' },
  { value: 'MD', key: 'optMD' },
  { value: 'DO', key: 'optDO' },
  { value: 'PA-C', key: 'optPAC' },
  { value: 'PT', key: 'optPT' }
];

export const SPORT_BIOMECHANICS_NOTES = {
  en: {
    helmet: 'Hard helmet-to-helmet or turf contact during play.',
    nonHelmet: (sport: string) => `Direct collision during ${sport.toLowerCase()} play.`,
    evaluatedSuffix: 'Athlete evaluated on the sideline within 5 minutes of impact.'
  },
  es: {
    helmet: 'Contacto fuerte casco a casco o con el césped durante el juego.',
    nonHelmet: (sport: string) => `Colisión directa durante el juego de ${sport.toLowerCase()}.`,
    evaluatedSuffix: 'Atleta evaluado en la banda dentro de los 5 minutos posteriores al impacto.'
  }
} as const;

export function getSportBiomechanicsNote(sport: string, lang: SupportedLocale = 'en'): string {
  const isHelmetSport = ['Football', 'Ice Hockey', 'Lacrosse'].includes(sport);
  const notes = SPORT_BIOMECHANICS_NOTES[lang] || SPORT_BIOMECHANICS_NOTES.en;
  const impactDesc = isHelmetSport ? notes.helmet : notes.nonHelmet(sport);
  return `${impactDesc} ${notes.evaluatedSuffix}`;
}

export function formatPlainTextReport(
  athlete: AthleteProfile,
  assessment: AssessmentRecord,
  sessionHash: string,
  evaluatorInfo: EvaluatorReportInfo,
  notes: string,
  lang: SupportedLocale = 'en'
): string {
  const t = TRANSLATIONS[lang];

  const redFlagsList = Object.entries(assessment.redFlags)
    .filter(([, v]) => v)
    .map(([k]) => `- ${k}`)
    .join('\n');

  const triggersList = assessment.triage.primaryTriggers.join('; ') || t.summaryNone;

  const bStability = (athlete.baselineStabilityIndex && athlete.baselineStabilityIndex > 0 ? athlete.baselineStabilityIndex : 0.085).toFixed(3);
  const isBalanceSkipped = Boolean(assessment.balanceScore?.skippedReason);
  const cStability = isBalanceSkipped
    ? (assessment.balanceScore?.skippedReason || t.summaryNone)
    : Number.isFinite(assessment.balanceScore?.stabilityIndex)
      ? `${assessment.balanceScore.stabilityIndex.toFixed(3)} m/s²`
      : 'N/A';
  const swayPctStr = isBalanceSkipped || !Number.isFinite(assessment.balanceScore?.stabilityIndex)
    ? ''
    : ` (${assessment.triage.swayDegradationPercent > 0 ? '+' : ''}${assessment.triage.swayDegradationPercent.toFixed(1)}%)`;

  const bReaction = athlete.baselineReactionTimeMs && athlete.baselineReactionTimeMs > 0 ? athlete.baselineReactionTimeMs : 230;
  const isReactionSkipped = Boolean(assessment.reactionScore?.skippedReason);
  const cReaction = isReactionSkipped
    ? (assessment.reactionScore?.skippedReason || t.summaryNone)
    : Number.isFinite(assessment.reactionScore?.averageMs)
      ? `${assessment.reactionScore.averageMs}ms`
      : 'N/A';
  const rxDeltaStr = isReactionSkipped || !Number.isFinite(assessment.reactionScore?.averageMs)
    ? ''
    : ` (${assessment.triage.reactionDelayDeltaMs > 0 ? '+' : ''}${assessment.triage.reactionDelayDeltaMs}ms)`;

  const bKd = (athlete.baselineKingDevickSeconds && athlete.baselineKingDevickSeconds > 0 ? athlete.baselineKingDevickSeconds : 42.0).toFixed(1);
  const isKdSkipped = Boolean(assessment.kingDevickScore?.skippedReason);
  const cKd = isKdSkipped
    ? (assessment.kingDevickScore?.skippedReason || t.summaryNone)
    : Number.isFinite(assessment.kingDevickScore?.durationSeconds)
      ? `${assessment.kingDevickScore.durationSeconds.toFixed(1)}s`
      : 'N/A';
  const kdErrStr = isKdSkipped
    ? ''
    : ` (${t.summaryErrors} ${assessment.kingDevickScore?.errorsCount ?? 0})`;

  const evalName = evaluatorInfo.evaluatorName || t.summaryStaffFallback;
  const evalRole = evaluatorInfo.evaluatorRole;
  const licNum = evaluatorInfo.licenseNumber || 'N/A';
  const signedStr = evaluatorInfo.signatureUrl ? t.summaryYes : t.summaryNo;

  return `
${t.summaryTitle}
${t.summaryDate}: ${assessment.timestamp}
${t.summaryAthlete}: ${athlete.name} (#${athlete.jerseyNumber}, ${athlete.sport} - ${athlete.position})
${t.summaryVerificationCode}: ${sessionHash}

${t.summaryRecommendation}
${assessment.triage.verdict}
${t.summaryTriggers} ${triggersList}

${t.summaryScoresHeader}
- ${t.summaryTest2} ${bStability} m/s² -> ${cStability}${swayPctStr}
- ${t.summaryTest3} ${bReaction}ms -> ${cReaction}${rxDeltaStr}
- ${t.summaryTest4} ${bKd}s -> ${cKd}${kdErrStr}

${t.summaryRedFlags}
${redFlagsList || t.summaryNoneReported}

${t.summaryAttestationHeader}
${t.summaryEvaluator} ${evalName} (${evalRole})
${t.summaryIdLicense} ${licNum}
${t.summarySignedScreen} ${signedStr}

${t.summaryNotesHeader}
${notes}

${t.summarySafetyNotice}
${assessment.triage.nonDiagnosticDisclaimer}
`.trim();
}

export function exportReportJsonFile(
  athlete: AthleteProfile,
  assessment: AssessmentRecord,
  sessionHash: string,
  evaluatorInfo: EvaluatorReportInfo,
  notes: string
): void {
  const reportData = {
    app: 'SidelineSentry',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    athlete: {
      id: athlete.id,
      name: athlete.name,
      jerseyNumber: athlete.jerseyNumber,
      sport: athlete.sport,
      position: athlete.position,
      baselineStabilityIndex: athlete.baselineStabilityIndex,
      baselineReactionTimeMs: athlete.baselineReactionTimeMs,
      baselineKingDevickSeconds: athlete.baselineKingDevickSeconds
    },
    assessment: {
      ...assessment,
      sessionHash,
      evaluatorNotes: notes,
      certification: {
        evaluatorName: evaluatorInfo.evaluatorName,
        credential: evaluatorInfo.evaluatorRole,
        licenseNumber: evaluatorInfo.licenseNumber,
        signedAt: new Date().toISOString(),
        signatureDataUrl: evaluatorInfo.signatureUrl || undefined,
        sessionHash
      }
    }
  };

  const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (athlete.name || 'athlete').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  a.download = `sideline-report-${safeName}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
