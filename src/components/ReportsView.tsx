import React from 'react';
import { AthleteProfile, AssessmentRecord, TriageVerdict } from '../types/clinical';
import { SupportedLocale } from '../i18n/translations';
import { FileText, Share2, Printer, PlusCircle, AlertOctagon, Clock, Play } from 'lucide-react';

interface ReportsViewProps {
  assessments: AssessmentRecord[];
  athletes: AthleteProfile[];
  latestAssessment: AssessmentRecord | null;
  activeAthlete: AthleteProfile | null;
  lang: SupportedLocale;
  onOpenReport: (assessment: AssessmentRecord, athlete: AthleteProfile) => void;
  onShareReport: (assessment: AssessmentRecord, athlete: AthleteProfile) => void;
  onPrintReport: (assessment: AssessmentRecord, athlete: AthleteProfile) => void;
  onStartCheck: () => void;
  onStartDemo: () => void;
}

const TEXT = {
  en: {
    pageTitle: 'Saved Reports',
    pageSubtitle: 'All sideline concussion safety assessments recorded on this device',
    latestCheckTitle: 'Most Recent Assessment',
    allReportsTitle: 'All Saved Reports',
    emptyTitle: 'No sideline reports saved yet',
    emptyDesc: 'Complete a sideline checkup or run a simulated test to generate clinician-ready safety reports and parent summaries.',
    startCheck: 'Start a Check',
    tryDemo: 'Try a Demo',
    viewFullReport: 'View Full Report',
    shareWithParent: 'Share with Parent',
    print: 'Print',
    startNewCheck: 'New Sideline Check',
    emergencyStop: 'Emergency Stop',
    immediateRemoval: 'Immediate Removal',
    suspectedConcussion: 'Suspected Concussion',
    benchAndMonitor: 'Bench & Monitor',
    clearedForPlay: 'Cleared for Play',
    swayDegradation: 'Sway',
    reactionDelay: 'Reaction',
    kdDelta: 'Reading Test',
    evaluator: 'Evaluator',
    signed: 'Signed',
    totalReports: '{count} total reports',
    activeSessionBadge: 'Latest Check',
    noBaselineMargin: 'Normative baseline used (+15% safety margin)',
    warningSignsFound: '{count} warning sign(s) observed',
    athleteFallback: 'Athlete'
  },
  es: {
    pageTitle: 'Reportes Guardados',
    pageSubtitle: 'Todas las evaluaciones de conmoción en banda registradas en este dispositivo',
    latestCheckTitle: 'Evaluación Más Reciente',
    allReportsTitle: 'Todos los Reportes Guardados',
    emptyTitle: 'Aún no hay reportes guardados',
    emptyDesc: 'Complete un chequeo en la banda o realice una prueba simulada para generar reportes médicos y resúmenes para padres.',
    startCheck: 'Iniciar una Evaluación',
    tryDemo: 'Probar una Demo',
    viewFullReport: 'Ver Informe Completo',
    shareWithParent: 'Compartir con Padres',
    print: 'Imprimir',
    startNewCheck: 'Nueva Evaluación',
    emergencyStop: 'Parada de Emergencia',
    immediateRemoval: 'Retiro Inmediato',
    suspectedConcussion: 'Conmoción Sospechada',
    benchAndMonitor: 'Banca y Monitoreo',
    clearedForPlay: 'Autorizado para Jugar',
    swayDegradation: 'Balance',
    reactionDelay: 'Reacción',
    kdDelta: 'Lectura',
    evaluator: 'Evaluador',
    signed: 'Firmado',
    totalReports: '{count} reportes en total',
    activeSessionBadge: 'Último Chequeo',
    noBaselineMargin: 'Línea de base normativa (+15% margen de seguridad)',
    warningSignsFound: '{count} señal(es) de alarma observadas',
    athleteFallback: 'Atleta'
  }
};

function getVerdictInfo(rec: AssessmentRecord, lang: SupportedLocale) {
  const t = TEXT[lang];
  if (rec.isEmergencyLockdown) {
    return {
      label: t.emergencyStop,
      bg: 'bg-red-50',
      border: 'border-red-300',
      text: 'text-red-800',
      badgeBg: 'bg-red-600 text-white'
    };
  }

  const verdictValue: TriageVerdict = rec.triage?.verdict || 'IMMEDIATE_REMOVAL';
  switch (verdictValue) {
    case 'IMMEDIATE_REMOVAL':
      return {
        label: t.immediateRemoval,
        bg: 'bg-red-50',
        border: 'border-red-300',
        text: 'text-red-800',
        badgeBg: 'bg-red-600 text-white'
      };
    case 'EVALUATION_RECOMMENDED':
      return {
        label: t.suspectedConcussion,
        bg: 'bg-amber-50',
        border: 'border-amber-300',
        text: 'text-amber-900',
        badgeBg: 'bg-amber-500 text-white'
      };
    case 'CLEAR_OBSERVED':
      return {
        label: t.clearedForPlay,
        bg: 'bg-emerald-50',
        border: 'border-emerald-300',
        text: 'text-emerald-900',
        badgeBg: 'bg-emerald-600 text-white'
      };
    case 'INVALID_ASSESSMENT_RETEST_REQUIRED':
      return {
        label: t.benchAndMonitor,
        bg: 'bg-slate-50',
        border: 'border-slate-300',
        text: 'text-slate-800',
        badgeBg: 'bg-slate-700 text-white'
      };
    default:
      return {
        label: String(verdictValue),
        bg: 'bg-slate-50',
        border: 'border-slate-300',
        text: 'text-slate-800',
        badgeBg: 'bg-slate-700 text-white'
      };
  }
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  assessments,
  athletes,
  latestAssessment,
  activeAthlete,
  lang,
  onOpenReport,
  onShareReport,
  onPrintReport,
  onStartCheck,
  onStartDemo
}) => {
  const t = TEXT[lang];

  // Helper to find matching athlete or build a safe fallback
  const resolveAthlete = (athleteId: string): AthleteProfile => {
    const found = athletes.find(a => a.id === athleteId);
    if (found) return found;
    if (activeAthlete && activeAthlete.id === athleteId) return activeAthlete;
    return {
      id: athleteId,
      name: `${t.athleteFallback} (${athleteId})`,
      jerseyNumber: '#',
      sport: 'Athletics',
      position: 'General'
    };
  };

  // Combine assessments ensuring unique by id, newest first
  const allReports = React.useMemo(() => {
    const map = new Map<string, AssessmentRecord>();
    if (latestAssessment) {
      map.set(latestAssessment.id, latestAssessment);
    }
    for (const rec of assessments) {
      if (!map.has(rec.id)) {
        map.set(rec.id, rec);
      }
    }
    return Array.from(map.values());
  }, [assessments, latestAssessment]);

  // Empty state if no reports recorded yet
  if (allReports.length === 0) {
    return (
      <div className="space-y-6 py-8 px-2 animate-fade-in text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
          <FileText className="w-8 h-8 stroke-[2]" />
        </div>

        <div className="max-w-xs mx-auto space-y-2">
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            {t.emptyTitle}
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            {t.emptyDesc}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-xs mx-auto">
          <button
            type="button"
            onClick={onStartCheck}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition active:scale-[0.98] min-h-[44px]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.startCheck}</span>
          </button>
          <button
            type="button"
            onClick={onStartDemo}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition active:scale-[0.98] min-h-[44px]"
          >
            <Play className="w-4 h-4 text-slate-600" />
            <span>{t.tryDemo}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top action header */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
            {t.pageTitle}
          </h2>
          <span className="text-[11px] text-slate-500 font-medium block">
            {t.totalReports.replace('{count}', String(allReports.length))}
          </span>
        </div>

        <button
          type="button"
          onClick={onStartCheck}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition active:scale-95 min-h-[44px]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t.startNewCheck}</span>
        </button>
      </div>

      {/* Report Cards List */}
      <div className="space-y-3">
        {allReports.map((rec, idx) => {
          const athlete = resolveAthlete(rec.athleteId);
          const verdict = getVerdictInfo(rec, lang);
          const isLatest = latestAssessment && latestAssessment.id === rec.id;

          return (
            <div
              key={rec.id || idx}
              className={`rounded-2xl border bg-white shadow-xs p-4 space-y-3 transition ${
                isLatest ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'
              }`}
            >
              {/* Card Header: Athlete & Verdict */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">
                      {athlete.name}
                    </span>
                    {athlete.jerseyNumber && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono font-bold">
                        #{athlete.jerseyNumber}
                      </span>
                    )}
                    {isLatest && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold uppercase tracking-wider">
                        {t.activeSessionBadge}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {athlete.sport} {athlete.position ? `• ${athlete.position}` : ''}
                  </div>
                </div>

                <span
                  className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider whitespace-nowrap ${verdict.badgeBg}`}
                >
                  {verdict.label}
                </span>
              </div>

              {/* Timestamp & Warning info */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 font-mono">
                <span className="flex items-center gap-1 font-sans">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{rec.timestamp || 'Recorded session'}</span>
                </span>
                {rec.triage?.primaryTriggers && rec.triage.primaryTriggers.length > 0 && (
                  <span className="text-red-700 font-sans font-bold flex items-center gap-1">
                    <AlertOctagon className="w-3.5 h-3.5" />
                    <span>{t.warningSignsFound.replace('{count}', String(rec.triage.primaryTriggers.length))}</span>
                  </span>
                )}
              </div>

              {/* Score snapshot grid */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <div className="bg-slate-50 rounded-lg p-2 border border-slate-200 text-center">
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    {t.swayDegradation}
                  </div>
                  <div className="text-xs font-mono font-extrabold text-slate-900 mt-0.5">
                    {rec.balanceScore?.skippedReason
                      ? 'N/A'
                      : `${(rec.triage?.swayDegradationPercent ?? 0) > 0 ? '+' : ''}${(rec.triage?.swayDegradationPercent ?? 0).toFixed(0)}%`}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-2 border border-slate-200 text-center">
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    {t.reactionDelay}
                  </div>
                  <div className="text-xs font-mono font-extrabold text-slate-900 mt-0.5">
                    {rec.reactionScore?.skippedReason
                      ? 'N/A'
                      : `${(rec.triage?.reactionDelayDeltaMs ?? 0) > 0 ? '+' : ''}${rec.triage?.reactionDelayDeltaMs ?? 0}ms`}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-2 border border-slate-200 text-center">
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    {t.kdDelta}
                  </div>
                  <div className="text-xs font-mono font-extrabold text-slate-900 mt-0.5">
                    {rec.kingDevickScore?.skippedReason
                      ? 'N/A'
                      : `${(rec.triage?.kingDevickDeltaSeconds ?? 0) > 0 ? '+' : ''}${(rec.triage?.kingDevickDeltaSeconds ?? 0).toFixed(1)}s`}
                  </div>
                </div>
              </div>

              {/* Evaluator attestation status if present */}
              {rec.certification && (
                <div className="text-[10px] text-slate-600 flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 font-medium">
                  <span>
                    {t.evaluator}: <strong className="text-slate-900 font-bold">{rec.certification.evaluatorName}</strong> ({rec.certification.credential})
                  </span>
                  {rec.certification.signatureDataUrl && (
                    <span className="text-emerald-700 font-mono text-[9px] font-bold">&bull; {t.signed}</span>
                  )}
                </div>
              )}

              {/* Action Buttons: View Full Report, Share, Print */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onOpenReport(rec, athlete)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition active:scale-95 min-h-[44px]"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{t.viewFullReport}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onShareReport(rec, athlete)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition active:scale-95 min-h-[44px]"
                  title={t.shareWithParent}
                  aria-label={t.shareWithParent}
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">{t.shareWithParent}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onPrintReport(rec, athlete)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition active:scale-95 min-h-[44px]"
                  title={t.print}
                  aria-label={t.print}
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">{t.print}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
