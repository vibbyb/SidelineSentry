import React, { useState, useEffect, useRef } from 'react';
import { AthleteProfile, AssessmentRecord, IMotionProvider } from './types/clinical';
import { createMotionProvider, SimulatedMotionProvider } from './services/motion';
import { calculateTriage } from './services/scoring';
import { BalanceTest } from './components/BalanceTest';
import { ReactionTest } from './components/ReactionTest';
import { KingDevickTest } from './components/KingDevickTest';
import { RedFlagsChecklist } from './components/RedFlagsChecklist';
import { TriageVerdict } from './components/TriageVerdict';
import { ClinicianReportModal } from './components/ClinicianReportModal';
import { RosterDashboard } from './components/RosterDashboard';
import { AthleteHistoryDrawer } from './components/AthleteHistoryDrawer';
import { ReportsView } from './components/ReportsView';
import { SidelineHeader, SidelineBottomNav, AppView, AssessmentStep } from './components/SidelineChrome';
import { loadAthletes, saveAthletes, loadAssessments, saveAssessment, deleteAthlete } from './services/storage';
import { TRANSLATIONS, SupportedLocale } from './i18n/translations';
import { ROSTER_TEXT } from './i18n/roster';
import { SHARE_THEME_TEXT } from './i18n/shareTheme';
import { buildParentShareSummary, shareParentSummary } from './utils/share';
import { ChevronRight, CheckCircle2, X } from 'lucide-react';

export const INITIAL_ATHLETES: AthleteProfile[] = [
  { id: 'ath-1', name: 'Test Athlete 1', jerseyNumber: '12', sport: 'Football', position: 'Quarterback', baselineDate: '2026-08-15', baselineStabilityIndex: 0.078, baselineReactionTimeMs: 220, baselineKingDevickSeconds: 39.5 },
  { id: 'ath-2', name: 'Test Athlete 2', jerseyNumber: '7', sport: 'Soccer', position: 'Midfielder', baselineDate: '2026-08-18', baselineStabilityIndex: 0.082, baselineReactionTimeMs: 235, baselineKingDevickSeconds: 41.2 },
  { id: 'ath-3', name: 'Test Athlete 3', jerseyNumber: '44', sport: 'Ice Hockey', position: 'Defenseman', baselineDate: '2026-09-02', baselineStabilityIndex: 0.089, baselineReactionTimeMs: 228, baselineKingDevickSeconds: 42.0 },
  { id: 'ath-4', name: 'Test Athlete 4', jerseyNumber: '18', sport: 'Lacrosse', position: 'Attack', baselineDate: '2026-08-22', baselineStabilityIndex: 0.085, baselineReactionTimeMs: 240, baselineKingDevickSeconds: 43.1 },
  { id: 'ath-5', name: 'Test Athlete 5', jerseyNumber: '3', sport: 'Basketball', position: 'Point Guard', baselineDate: '2026-09-10', baselineStabilityIndex: 0.075, baselineReactionTimeMs: 215, baselineKingDevickSeconds: 38.0 },
  { id: 'ath-6', name: 'Test Athlete 6', jerseyNumber: '55', sport: 'Football', position: 'Linebacker', hasRecordedBaseline: false }
];

const INITIAL_FLAGS: AssessmentRecord['redFlags'] = {
  neckPain: false, doubleVision: false, weaknessOrTingling: false, severeOrIncreasingHeadache: false,
  seizureOrConvulsion: false, lossOfConsciousness: false, deterioratingConsciousState: false, vomitingRepeated: false,
  increasingConfusion: false, maddocksVenueFailed: false, maddocksPeriodFailed: false, maddocksScoreFailed: false
};

const DEFAULT_BALANCE: AssessmentRecord['balanceScore'] = {
  durationSeconds: 15, stabilityIndex: 0.08, peakSway: 0.12, swayHistory: [], valid: true
};

const DEFAULT_REACTION: AssessmentRecord['reactionScore'] = {
  averageMs: 230, fastestMs: 220, slowestMs: 245, trials: [225, 230, 235], falseStarts: 0, valid: true
};

const DEFAULT_KD: AssessmentRecord['kingDevickScore'] = {
  durationSeconds: 42.0, errorsCount: 0, completed: true
};

export const App: React.FC = () => {
  const [lang, setLang] = useState<SupportedLocale>('en');
  const t = TRANSLATIONS[lang];
  const rosterText = ROSTER_TEXT[lang];

  const [athletes, setAthletes] = useState<AthleteProfile[]>(() => loadAthletes(INITIAL_ATHLETES));
  const [activeAthlete, setActiveAthlete] = useState<AthleteProfile | null>(null);
  const [historyAthlete, setHistoryAthlete] = useState<AthleteProfile | null>(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);

  const [view, setView] = useState<AppView>('roster');
  const [step, setStep] = useState<AssessmentStep>('red_flags');
  const [motionProvider, setMotionProvider] = useState<IMotionProvider>(() => createMotionProvider());
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  // Active Assessment State
  const [redFlags, setRedFlags] = useState<AssessmentRecord['redFlags']>(INITIAL_FLAGS);
  const [balanceScore, setBalanceScore] = useState<AssessmentRecord['balanceScore']>(DEFAULT_BALANCE);
  const [reactionScore, setReactionScore] = useState<AssessmentRecord['reactionScore']>(DEFAULT_REACTION);
  const [kingDevickScore, setKingDevickScore] = useState<AssessmentRecord['kingDevickScore']>(DEFAULT_KD);

  const [latestAssessment, setLatestAssessment] = useState<AssessmentRecord | null>(null);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>(() => loadAssessments());
  const [modalReportData, setModalReportData] = useState<{ athlete: AthleteProfile; assessment: AssessmentRecord } | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [manualShareSummary, setManualShareSummary] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveAthletes(athletes);
  }, [athletes]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  }, [view, step]);

  const handleStartTriage = (athlete: AthleteProfile, asDemo = false) => {
    setActiveAthlete(athlete);
    setIsDemoMode(asDemo);
    if (!asDemo) {
      setMotionProvider(createMotionProvider());
    }
    setDemoNotice(null);
    setRedFlags({ ...INITIAL_FLAGS });
    setBalanceScore({ ...DEFAULT_BALANCE });
    setReactionScore({ ...DEFAULT_REACTION });
    setKingDevickScore({ ...DEFAULT_KD });
    setStep('red_flags');
    setView('screening');
  };

  const handleStartDemo = () => {
    // Pick Test Athlete 1 if present, otherwise first roster athlete or fallback
    const demoAthlete =
      athletes.find(a => a.id === 'ath-1') ||
      athletes[0] ||
      INITIAL_ATHLETES[0];

    setIsDemoMode(true);
    setMotionProvider(new SimulatedMotionProvider('healthy'));
    setDemoNotice(null);
    handleStartTriage(demoAthlete, true);
  };

  const handleDeleteAthlete = (athleteId: string) => {
    const updated = deleteAthlete(athleteId);
    setAthletes(updated);
    setAssessments(loadAssessments());
    if (activeAthlete?.id === athleteId) setActiveAthlete(null);
    if (historyAthlete?.id === athleteId) setHistoryAthlete(null);
  };

  const handleRestoreDefaults = () => {
    setAthletes(INITIAL_ATHLETES);
    saveAthletes(INITIAL_ATHLETES);
  };

  const handleImportRoster = (importedAthletes: AthleteProfile[]) => {
    setAthletes(importedAthletes);
    setAssessments(loadAssessments());
    if (activeAthlete && !importedAthletes.some(a => a.id === activeAthlete.id)) {
      setActiveAthlete(null);
    }
  };

  const handleOpenReportModal = (rec: AssessmentRecord, ath?: AthleteProfile) => {
    const targetAthlete =
      ath ||
      athletes.find(a => a.id === rec.athleteId) ||
      (activeAthlete?.id === rec.athleteId ? activeAthlete : null) || {
        id: rec.athleteId,
        name: 'Athlete',
        jerseyNumber: '#',
        sport: 'Athletics',
        position: 'General'
      };
    setModalReportData({ athlete: targetAthlete, assessment: rec });
    setShowReportModal(true);
  };

  const handleShareReport = async (rec: AssessmentRecord, ath: AthleteProfile) => {
    const summaryText = buildParentShareSummary({ ...rec, athlete: ath }, lang);
    const shareTitle = `${ath.name} - ${SHARE_THEME_TEXT[lang].shareTitle}`;
    const outcome = await shareParentSummary(summaryText, shareTitle);
    if (outcome === 'shared' || outcome === 'copied') {
      setShareToast(SHARE_THEME_TEXT[lang].shareSuccessToast);
      setTimeout(() => setShareToast(null), 3500);
    } else if (outcome === 'manual') {
      setManualShareSummary(summaryText);
    }
  };

  const handleSynthesizeVerdict = (
    upBalance = balanceScore,
    upReaction = reactionScore,
    upKD = kingDevickScore,
    upFlags = redFlags
  ) => {
    if (!activeAthlete) return;
    const triage = calculateTriage(activeAthlete, upBalance, upReaction, upKD, upFlags);
    const record: AssessmentRecord = {
      id: `session-${Date.now()}`,
      athleteId: activeAthlete.id,
      timestamp: new Date().toLocaleString(),
      isPostImpact: true,
      isDemo: isDemoMode,
      balanceScore: upBalance,
      reactionScore: upReaction,
      kingDevickScore: upKD,
      redFlags: upFlags,
      triage
    };
    saveAssessment(record);
    setAssessments(loadAssessments());
    setLatestAssessment(record);
    setView('verdict');
  };

  const handleEmergencyLockdown = () => {
    if (!activeAthlete) return;
    const skippedReason = 'Skipped for safety: Athlete showed an emergency warning sign.';
    const skippedBalance: AssessmentRecord['balanceScore'] = { durationSeconds: 0, stabilityIndex: 0, peakSway: 0, swayHistory: [], valid: false, skippedReason };
    const skippedReaction: AssessmentRecord['reactionScore'] = { averageMs: 0, fastestMs: 0, slowestMs: 0, trials: [], falseStarts: 0, valid: false, skippedReason };
    const skippedKD: AssessmentRecord['kingDevickScore'] = { durationSeconds: 0, errorsCount: 0, completed: false, skippedReason };

    setBalanceScore(skippedBalance);
    setReactionScore(skippedReaction);
    setKingDevickScore(skippedKD);

    const triage = calculateTriage(activeAthlete, skippedBalance, skippedReaction, skippedKD, redFlags);
    const record: AssessmentRecord = {
      id: `emergency-session-${Date.now()}`,
      athleteId: activeAthlete.id,
      timestamp: new Date().toLocaleString(),
      isPostImpact: true,
      isDemo: isDemoMode,
      isEmergencyLockdown: true,
      balanceScore: skippedBalance,
      reactionScore: skippedReaction,
      kingDevickScore: skippedKD,
      redFlags,
      triage
    };
    saveAssessment(record);
    setAssessments(loadAssessments());
    setLatestAssessment(record);
    setView('verdict');
  };

  const handleHeaderBack = () => {
    if (view === 'screening') {
      if (step === 'red_flags') setView('roster');
      else if (step === 'balance') setStep('red_flags');
      else if (step === 'reaction') setStep('balance');
      else if (step === 'king_devick') setStep('reaction');
    } else if (view === 'verdict' || view === 'reports') {
      setView('roster');
    }
  };

  const handleSelectTab = (tab: 'roster' | 'screening' | 'reports') => {
    if (tab === 'roster') setView('roster');
    else if (tab === 'screening') {
      if (activeAthlete) setView('screening');
      else if (athletes.length > 0) handleStartTriage(athletes[0]);
    } else if (tab === 'reports') {
      setView('reports');
    }
  };

  const isEmergency = Boolean(
    latestAssessment?.isEmergencyLockdown ||
    (view === 'screening' && Object.values(redFlags).some(Boolean))
  );

  return (
    <div className="min-h-screen bg-slate-100/80 flex flex-col items-center justify-start sm:py-6 sm:px-4 font-sans selection:bg-blue-600 selection:text-white">
      <div className="phone-frame print-shell w-full sm:max-w-[430px] min-h-screen sm:min-h-[844px] sm:h-[92vh] sm:rounded-[36px] sm:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.18)] sm:border sm:border-slate-200/90 bg-white flex flex-col overflow-hidden relative">
        <SidelineHeader
          view={view}
          step={step}
          activeAthlete={activeAthlete}
          lang={lang}
          onToggleLang={() => setLang(prev => (prev === 'en' ? 'es' : 'en'))}
          onBack={handleHeaderBack}
          isEmergencyLockdown={isEmergency}
        />

        <main ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-slate-50/70 p-4 space-y-4">
          {view === 'roster' && (
            <RosterDashboard
              athletes={athletes}
              onSelectAthlete={ath => handleStartTriage(ath, false)}
              onAddAthlete={newAth => {
                const updated = [newAth, ...athletes];
                setAthletes(updated);
                saveAthletes(updated);
              }}
              onDeleteAthlete={handleDeleteAthlete}
              onRestoreDefaults={handleRestoreDefaults}
              onImportRoster={handleImportRoster}
              onStartDemo={handleStartDemo}
              onOpenHistory={ath => {
                setHistoryAthlete(ath);
                setShowHistoryDrawer(true);
              }}
              lang={lang}
            />
          )}

          {view === 'screening' && activeAthlete && (
            <div className="space-y-4">
              {isDemoMode && (
                <div className="flex items-center justify-between px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs shadow-xs">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 font-bold text-[11px] uppercase tracking-wide">
                      {rosterText.demoModeBadge}
                    </span>
                    <span className="text-[11px] font-medium text-amber-800">
                      {rosterText.demoBannerDesc}
                    </span>
                  </div>
                </div>
              )}
              {step === 'red_flags' && (
                <div className="space-y-4">
                  <RedFlagsChecklist
                    flags={redFlags}
                    onChange={setRedFlags}
                    onEmergencyLockdown={handleEmergencyLockdown}
                    lang={lang}
                  />
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setView('roster')}
                      className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition min-h-[44px] flex items-center"
                    >
                      {t.cancelScreening}
                    </button>
                    {Object.values(redFlags).some(Boolean) ? (
                      <button
                        onClick={handleEmergencyLockdown}
                        className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs tracking-wide transition shadow-xs min-h-[44px]"
                      >
                        <span>{t.lockdownProceed}</span>
                        <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setStep('balance')}
                        className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs tracking-wide transition shadow-xs min-h-[44px]"
                      >
                        <span>{t.proceedToBalance}</span>
                        <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {step === 'balance' && (
                <BalanceTest
                  motionProvider={motionProvider}
                  baselineSway={activeAthlete.baselineStabilityIndex}
                  onComplete={score => {
                    setBalanceScore(score);
                    setStep('reaction');
                  }}
                  onCancel={() => setStep('red_flags')}
                  lang={lang}
                />
              )}

              {step === 'reaction' && (
                <ReactionTest
                  baselineMs={activeAthlete.baselineReactionTimeMs}
                  onComplete={score => {
                    setReactionScore(score);
                    setStep('king_devick');
                  }}
                  onCancel={() => setStep('balance')}
                  lang={lang}
                />
              )}

              {step === 'king_devick' && (
                <KingDevickTest
                  baselineSeconds={activeAthlete.baselineKingDevickSeconds}
                  onComplete={score => {
                    setKingDevickScore(score);
                    handleSynthesizeVerdict(balanceScore, reactionScore, score, redFlags);
                  }}
                  onCancel={() => setStep('reaction')}
                  lang={lang}
                />
              )}
            </div>
          )}

          {view === 'verdict' && activeAthlete && latestAssessment && (
            <div className="space-y-4">
              {(isDemoMode || latestAssessment.isDemo) && (
                <div className="flex items-center justify-between px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs shadow-xs">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 font-bold text-[11px] uppercase tracking-wide">
                      {rosterText.demoModeBadge}
                    </span>
                    <span className="text-[11px] font-medium text-amber-800">
                      {rosterText.demoBannerDesc}
                    </span>
                  </div>
                </div>
              )}
              {demoNotice && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs font-semibold">
                  {demoNotice}
                </div>
              )}
              <TriageVerdict
                athlete={activeAthlete}
                assessment={latestAssessment}
                onOpenReport={() => {
                  if (activeAthlete && latestAssessment) {
                    handleOpenReportModal(latestAssessment, activeAthlete);
                  }
                }}
                onRetest={() => handleStartTriage(activeAthlete, isDemoMode)}
                onBackToRoster={() => setView('roster')}
                onSaveAsBaseline={() => {
                  if (!activeAthlete || !latestAssessment) return;
                  if (latestAssessment.isDemo || isDemoMode) {
                    setDemoNotice(rosterText.demoBaselineBlocked);
                    return;
                  }
                  const updatedAthlete: AthleteProfile = {
                    ...activeAthlete,
                    hasRecordedBaseline: true,
                    baselineDate: new Date().toISOString().split('T')[0],
                    baselineStabilityIndex: latestAssessment.balanceScore.stabilityIndex,
                    baselineReactionTimeMs: latestAssessment.reactionScore.averageMs,
                    baselineKingDevickSeconds: latestAssessment.kingDevickScore.durationSeconds
                  };
                  setActiveAthlete(updatedAthlete);
                  setAthletes(prev => {
                    const updatedList = prev.map(a => (a.id === updatedAthlete.id ? updatedAthlete : a));
                    saveAthletes(updatedList);
                    return updatedList;
                  });
                }}
                lang={lang}
              />
            </div>
          )}

          {view === 'reports' && (
            <ReportsView
              assessments={assessments}
              athletes={athletes}
              latestAssessment={latestAssessment}
              activeAthlete={activeAthlete}
              lang={lang}
              onOpenReport={(rec, ath) => handleOpenReportModal(rec, ath)}
              onShareReport={handleShareReport}
              onPrintReport={(rec, ath) => handleOpenReportModal(rec, ath)}
              onStartCheck={() => setView('roster')}
              onStartDemo={handleStartDemo}
            />
          )}
        </main>

        <SidelineBottomNav
          view={view}
          showHistoryDrawer={showHistoryDrawer}
          lang={lang}
          onSelectTab={handleSelectTab}
        />

        {showReportModal && modalReportData && (
          <ClinicianReportModal
            athlete={modalReportData.athlete}
            assessment={modalReportData.assessment}
            onClose={() => {
              setShowReportModal(false);
              setModalReportData(null);
            }}
            lang={lang}
            onUpdateAssessment={updatedRec => {
              setModalReportData(prev => (prev ? { ...prev, assessment: updatedRec } : null));
              if (latestAssessment?.id === updatedRec.id) {
                setLatestAssessment(updatedRec);
              }
              saveAssessment(updatedRec);
              setAssessments(loadAssessments());
            }}
          />
        )}

        <AthleteHistoryDrawer
          athlete={historyAthlete}
          isOpen={showHistoryDrawer}
          onClose={() => setShowHistoryDrawer(false)}
          onSelectAssessment={rec => {
            setShowHistoryDrawer(false);
            handleOpenReportModal(rec, historyAthlete || undefined);
          }}
          lang={lang}
        />

        {shareToast && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 p-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center space-x-2 shadow-lg max-w-xs"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{shareToast}</span>
          </div>
        )}

        {manualShareSummary && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-share-dialog-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          >
            <div className="bg-white border-2 border-slate-900 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-3 text-slate-900">
              <div className="flex items-center justify-between">
                <h3 id="manual-share-dialog-title" className="text-sm font-bold uppercase tracking-wide">
                  {SHARE_THEME_TEXT[lang].manualShareTitle}
                </h3>
                <button
                  type="button"
                  onClick={() => setManualShareSummary(null)}
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={SHARE_THEME_TEXT[lang].closeManualShare}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-600">
                {SHARE_THEME_TEXT[lang].manualShareHelp}
              </p>
              <textarea
                readOnly
                value={manualShareSummary}
                onClick={e => (e.target as HTMLTextAreaElement).select()}
                rows={10}
                className="w-full p-3 rounded-xl border-2 border-slate-300 font-mono text-xs bg-slate-50 text-slate-900 focus:outline-none focus:border-slate-900 select-all"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setManualShareSummary(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold min-h-[44px]"
                >
                  {SHARE_THEME_TEXT[lang].closeManualShare}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
