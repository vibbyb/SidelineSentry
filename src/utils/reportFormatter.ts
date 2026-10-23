/**
 * SidelineSentry Clinician & Parent Report Formatter
 * Deterministic text generation, JSON serialization, and sport biomechanics notes.
 */

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

  const bStability = (athlete.baselineStabilityIndex || 0.085).toFixed(3);
  const cStability = assessment.balanceScore.stabilityIndex.toFixed(3);
  const swayPct = `${assessment.triage.swayDegradationPercent > 0 ? '+' : ''}${assessment.triage.swayDegradationPercent.toFixed(1)}%`;

  const bReaction = athlete.baselineReactionTimeMs || 230;
  const cReaction = assessment.reactionScore.averageMs;
  const rxDelta = `${assessment.triage.reactionDelayDeltaMs > 0 ? '+' : ''}${assessment.triage.reactionDelayDeltaMs}ms`;

  const bKd = (athlete.baselineKingDevickSeconds || 42.0).toFixed(1);
  const cKd = assessment.kingDevickScore.durationSeconds.toFixed(1);
  const kdErr = assessment.kingDevickScore.errorsCount;

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
- ${t.summaryTest2} ${bStability} m/s² -> ${cStability} m/s² (${swayPct})
- ${t.summaryTest3} ${bReaction}ms -> ${cReaction}ms (${rxDelta})
- ${t.summaryTest4} ${bKd}s -> ${cKd}s (${t.summaryErrors} ${kdErr})

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
============================================
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
  a.download = `sideline-report-${athlete.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
