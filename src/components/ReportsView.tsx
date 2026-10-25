import React, { useState, useMemo } from 'react';
import { AthleteProfile, AssessmentRecord, TriageVerdict } from '../types/clinical';
import { SupportedLocale } from '../i18n/translations';
import {
  FileText,
  Printer,
  PlusCircle,
  AlertOctagon,
  Clock,
  User,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface ReportsViewProps {
  assessments: AssessmentRecord[];
  athletes: AthleteProfile[];
  latestAssessment: AssessmentRecord | null;
  activeAthlete: AthleteProfile | null;
  lang: SupportedLocale;
  onOpenReport: (assessment: AssessmentRecord, athlete: AthleteProfile) => void;
  onShareReport?: (assessment: AssessmentRecord, athlete: AthleteProfile) => void;
  onPrintReport: (assessment: AssessmentRecord, athlete: AthleteProfile) => void;
  onStartCheck: (athlete?: AthleteProfile) => void;
  onStartDemo?: () => void;
}

const TEXT = {
  en: {
    pageTitle: 'Saved Reports',
    pageSubtitle: 'All sideline concussion safety assessments recorded on this device',
    latestCheckTitle: 'Most Recent Assessment',
    allReportsTitle: 'All Saved Reports',
    emptyTitle: 'No sideline reports saved yet',
    emptyDesc: 'Complete a sideline checkup to generate safety reports and summaries.',
    startCheck: 'Start a Check',
    viewFullReport: 'View Report',
    print: 'Print',
    startNewCheck: 'New Sideline Check',
    emergencyStop: 'Emergency Stop',
    immediateRemoval: 'Immediate Removal',
    suspectedConcussion: 'Suspected Concussion',
    benchAndMonitor: 'Bench & Monitor',
    clearedForPlay: 'Cleared for Play',
    swayDegradation: 'Balance',
    reactionDelay: 'Reaction Time',
    kdDelta: 'Number Reading',
    evaluator: 'Evaluator',
    signed: 'Signed',
    totalReports: '{count} total reports',
    activeSessionBadge: 'Latest Check',
    warningSignsFound: '{count} warning sign(s) observed',
    athleteFallback: 'Athlete',
    allSports: 'All Sports',
    reportCountSingular: '1 report',
    reportCountPlural: '{count} reports',
    noReportsForAthlete: 'No reports saved for this athlete yet.',
    startCheckupBtn: 'Start Checkup'
  },
  es: {
    pageTitle: 'Reportes Guardados',
    pageSubtitle: 'Todas las evaluaciones de conmoción en banda registradas en este dispositivo',
    latestCheckTitle: 'Evaluación Más Reciente',
    allReportsTitle: 'Todos los Reportes Guardados',
    emptyTitle: 'Aún no hay reportes guardados',
    emptyDesc: 'Complete un chequeo en la banda para generar reportes médicos y resúmenes.',
    startCheck: 'Iniciar una Evaluación',
    viewFullReport: 'Ver Reporte',
    print: 'Imprimir',
    startNewCheck: 'Nueva Evaluación',
    emergencyStop: 'Parada de Emergencia',
    immediateRemoval: 'Retiro Inmediato',
    suspectedConcussion: 'Conmoción Sospechada',
    benchAndMonitor: 'Banca y Monitoreo',
    clearedForPlay: 'Autorizado para Jugar',
    swayDegradation: 'Balance',
    reactionDelay: 'Tiempo de Reacción',
    kdDelta: 'Lectura de Números',
    evaluator: 'Evaluador',
    signed: 'Firmado',
    totalReports: '{count} reportes en total',
    activeSessionBadge: 'Último Chequeo',
    warningSignsFound: '{count} señal(es) de alarma observadas',
    athleteFallback: 'Atleta',
    allSports: 'Todos los Deportes',
    reportCountSingular: '1 reporte',
    reportCountPlural: '{count} reportes',
    noReportsForAthlete: 'Aún no hay reportes guardados para este atleta.',
    startCheckupBtn: 'Iniciar revisión'
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
  onPrintReport,
  onStartCheck
}) => {
  const t = TEXT[lang];
  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  // Initially collapsed so coach sees Sport categories and Player names clearly
  const [expandedPlayerIds, setExpandedPlayerIds] = useState<Set<string>>(() => new Set());

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
  const allReports = useMemo(() => {
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

  // Group reports hierarchically: Sport -> Player -> Reports
  // Includes all athletes on the roster (plus any with reports)
  const { sportsList, groupedBySport } = useMemo(() => {
    const sportMap = new Map<string, Map<string, { athlete: AthleteProfile; reports: AssessmentRecord[] }>>();

    // 1. Seed with all athletes on the roster
    for (const ath of athletes) {
      const sportName = ath.sport ? ath.sport.trim() : 'Athletics';
      const playerId = ath.id;

      if (!sportMap.has(sportName)) {
        sportMap.set(sportName, new Map());
      }
      const playerMap = sportMap.get(sportName)!;

      if (!playerMap.has(playerId)) {
        playerMap.set(playerId, { athlete: ath, reports: [] });
      }
    }

    // 2. Add saved reports
    for (const rec of allReports) {
      const athlete = resolveAthlete(rec.athleteId);
      const sportName = athlete.sport ? athlete.sport.trim() : 'Athletics';
      const playerId = athlete.id || athlete.name;

      if (!sportMap.has(sportName)) {
        sportMap.set(sportName, new Map());
      }
      const playerMap = sportMap.get(sportName)!;

      if (!playerMap.has(playerId)) {
        playerMap.set(playerId, { athlete, reports: [] });
      }
      playerMap.get(playerId)!.reports.push(rec);
    }

    const sports = Array.from(sportMap.keys()).sort((a, b) => a.localeCompare(b));
    return { sportsList: sports, groupedBySport: sportMap };
  }, [allReports, athletes, activeAthlete]);

  // Filter sports based on pill selection
  const displayedSports = useMemo(() => {
    if (selectedSport === 'ALL') return sportsList;
    return sportsList.filter(s => s === selectedSport);
  }, [sportsList, selectedSport]);

  const formatReportCount = (count: number) => {
    if (count === 1) return t.reportCountSingular;
    return t.reportCountPlural.replace('{count}', String(count));
  };

  const togglePlayer = (playerId: string) => {
    setExpandedPlayerIds(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  // If no athletes and no reports at all, show empty screen
  if (athletes.length === 0 && allReports.length === 0) {
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

        <div className="flex items-center justify-center pt-2 max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => onStartCheck()}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition active:scale-[0.98] min-h-[44px]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.startCheck}</span>
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
          onClick={() => onStartCheck()}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition active:scale-95 min-h-[44px]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t.startNewCheck}</span>
        </button>
      </div>

      {/* Sport Filter Pill Bar */}
      {sportsList.length > 0 && (
        <div
          role="toolbar"
          aria-label="Sport filter"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar"
        >
          <button
            type="button"
            onClick={() => setSelectedSport('ALL')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0 min-h-[38px] ${
              selectedSport === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.allSports} ({allReports.length})
          </button>
          {sportsList.map(sportName => {
            const playerMap = groupedBySport.get(sportName);
            let count = 0;
            if (playerMap) {
              for (const entry of playerMap.values()) {
                count += entry.reports.length;
              }
            }
            const isSelected = selectedSport === sportName;
            return (
              <button
                key={sportName}
                type="button"
                onClick={() => setSelectedSport(sportName)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0 min-h-[38px] ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {sportName} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Hierarchical Grouping: Level 1 (Sport) -> Level 2 (Player) -> Level 3 (Reports) */}
      <div className="space-y-6">
        {displayedSports.map(sportName => {
          const playerMap = groupedBySport.get(sportName);
          if (!playerMap || playerMap.size === 0) return null;

          const playerEntries = Array.from(playerMap.values());
          const totalSportReports = playerEntries.reduce((sum, p) => sum + p.reports.length, 0);

          return (
            <section
              key={sportName}
              data-testid={`sport-section-${sportName.toLowerCase().replace(/\s+/g, '-')}`}
              className="space-y-3"
            >
              {/* Level 1: Sport Category Header */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 border border-slate-200">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    {sportName}
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-slate-500 font-mono">
                  {formatReportCount(totalSportReports)}
                </span>
              </div>

              {/* Level 2: Inside Sport Section, Group by Athlete */}
              <div className="space-y-3 pl-1 sm:pl-2">
                {playerEntries.map(({ athlete, reports }) => {
                  const isExpanded = expandedPlayerIds.has(athlete.id);

                  return (
                    <div
                      key={athlete.id}
                      data-testid={`player-card-${athlete.id}`}
                      className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all"
                    >
                      {/* Player Clickable Header Row/Button */}
                      <button
                        type="button"
                        onClick={() => togglePlayer(athlete.id)}
                        aria-expanded={isExpanded}
                        className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left hover:bg-slate-50 transition min-h-[52px]"
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                            {athlete.jerseyNumber ? `#${athlete.jerseyNumber}` : <User className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-extrabold text-sm text-slate-900">
                                {athlete.name}
                              </span>
                              {athlete.position && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                                  {athlete.position}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium">
                              #{athlete.jerseyNumber || 'N/A'} · {athlete.position || athlete.sport}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2.5">
                          <span
                            className={`text-[11px] font-bold font-mono px-2.5 py-1 rounded-full border ${
                              reports.length > 0
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}
                          >
                            {formatReportCount(reports.length)}
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-500 stroke-[2.5]" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400 stroke-[2.5]" />
                          )}
                        </div>
                      </button>

                      {/* Level 3: Player's Reports (Accordion Content) */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 p-3 sm:p-4 bg-slate-50/50 space-y-3">
                          {reports.length === 0 ? (
                            <div className="p-5 rounded-xl bg-white border border-slate-200 text-center space-y-2.5">
                              <p className="text-xs text-slate-600 font-medium">
                                {t.noReportsForAthlete}
                              </p>
                              <button
                                type="button"
                                onClick={() => onStartCheck(athlete)}
                                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition active:scale-95 min-h-[44px]"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>{t.startCheckupBtn}</span>
                              </button>
                            </div>
                          ) : (
                            reports.map((rec, rIdx) => {
                              const verdict = getVerdictInfo(rec, lang);
                              const isLatest = latestAssessment && latestAssessment.id === rec.id;

                              return (
                                <div
                                  key={rec.id || rIdx}
                                  data-testid="report-card"
                                  className={`rounded-xl border bg-white shadow-xs p-3.5 space-y-2.5 transition ${
                                    isLatest ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'
                                  }`}
                                >
                                  {/* Report Header: Recommendation badge & status */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span
                                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider whitespace-nowrap ${verdict.badgeBg}`}
                                      >
                                        {verdict.label}
                                      </span>
                                      {isLatest && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold uppercase tracking-wider">
                                          {t.activeSessionBadge}
                                        </span>
                                      )}
                                    </div>

                                    <span className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                                      <span>{rec.timestamp || 'Recorded session'}</span>
                                    </span>
                                  </div>

                                  {/* Warning count info excluding skipped tests */}
                                  {(() => {
                                    const actualTriggers = (rec.triage?.primaryTriggers || []).filter(
                                      trig => !/skipped|omitid/i.test(trig)
                                    );
                                    if (actualTriggers.length === 0) return null;
                                    const warningText =
                                      lang === 'es'
                                        ? actualTriggers.length === 1
                                          ? '1 señal de alarma'
                                          : `${actualTriggers.length} señales de alarma`
                                        : actualTriggers.length === 1
                                        ? '1 warning'
                                        : `${actualTriggers.length} warnings`;
                                    return (
                                      <div className="text-red-700 font-sans text-xs font-bold flex items-center gap-1 pt-0.5">
                                        <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                                        <span>{warningText}</span>
                                      </div>
                                    );
                                  })()}

                                  {/* Score snapshot grid */}
                                  <div className="grid grid-cols-3 gap-1.5 pt-0.5">
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
                                    </div>
                                  )}

                                  {/* Action Buttons: View Report & Print */}
                                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
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
                                      onClick={() => onPrintReport(rec, athlete)}
                                      className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition active:scale-95 min-h-[44px]"
                                      title={t.print}
                                      aria-label={t.print}
                                    >
                                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                                      <span className="hidden sm:inline">{t.print}</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
