import React, { useState, useEffect, useRef } from 'react';
import { AthleteProfile, AssessmentRecord, IMotionProvider } from './types/clinical';
import { createMotionProvider } from './services/motion';
import { calculateTriage } from './services/scoring';
import { BalanceTest } from './components/BalanceTest';
import { ReactionTest } from './components/ReactionTest';
import { KingDevickTest } from './components/KingDevickTest';
import { RedFlagsChecklist } from './components/RedFlagsChecklist';
import { TriageVerdict } from './components/TriageVerdict';
import { ClinicianReportModal } from './components/ClinicianReportModal';
import { RosterDashboard } from './components/RosterDashboard';
import { AthleteHistoryDrawer } from './components/AthleteHistoryDrawer';
import { SidelineHeader, SidelineBottomNav, AppView, AssessmentStep } from './components/SidelineChrome';
import { loadAthletes, saveAthletes, saveAssessment } from './services/storage';
import { TRANSLATIONS, SupportedLocale } from './i18n/translations';
import { ChevronRight } from 'lucide-react';

const INITIAL_ATHLETES: AthleteProfile[] = [
  { id: 'ath-1', name: 'Marcus Vance', jerseyNumber: '12', sport: 'Football', position: 'Quarterback', baselineDate: '2026-08-15', baselineStabilityIndex: 0.078, baselineReactionTimeMs: 220, baselineKingDevickSeconds: 39.5 },
  { id: 'ath-2', name: 'Jordan Hayes', jerseyNumber: '7', sport: 'Soccer', position: 'Midfielder', baselineDate: '2026-08-18', baselineStabilityIndex: 0.082, baselineReactionTimeMs: 235, baselineKingDevickSeconds: 41.2 },
  { id: 'ath-3', name: 'Colton Brooks', jerseyNumber: '44', sport: 'Ice Hockey', position: 'Defenseman', baselineDate: '2026-09-02', baselineStabilityIndex: 0.089, baselineReactionTimeMs: 228, baselineKingDevickSeconds: 42.0 },
  { id: 'ath-4', name: 'Tyler Harris', jerseyNumber: '18', sport: 'Lacrosse', position: 'Attack', baselineDate: '2026-08-22', baselineStabilityIndex: 0.085, baselineReactionTimeMs: 240, baselineKingDevickSeconds: 43.1 },
  { id: 'ath-5', name: 'Maya Lin', jerseyNumber: '3', sport: 'Basketball', position: 'Point Guard', baselineDate: '2026-09-10', baselineStabilityIndex: 0.075, baselineReactionTimeMs: 215, baselineKingDevickSeconds: 38.0 },
  { id: 'ath-6', name: 'Devon Miller', jerseyNumber: '55', sport: 'Football', position: 'Linebacker', hasRecordedBaseline: false }
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

  const [athletes, setAthletes] = useState<AthleteProfile[]>(() => loadAthletes(INITIAL_ATHLETES));
  const [activeAthlete, setActiveAthlete] = useState<AthleteProfile | null>(null);
  const [historyAthlete, setHistoryAthlete] = useState<AthleteProfile | null>(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);

  const [view, setView] = useState<AppView>('roster');
  const [step, setStep] = useState<AssessmentStep>('red_flags');
  const [motionProvider] = useState<IMotionProvider>(() => createMotionProvider());

  // Active Assessment State
  const [redFlags, setRedFlags] = useState<AssessmentRecord['redFlags']>(INITIAL_FLAGS);
  const [balanceScore, setBalanceScore] = useState<AssessmentRecord['balanceScore']>(DEFAULT_BALANCE);
  const [reactionScore, setReactionScore] = useState<AssessmentRecord['reactionScore']>(DEFAULT_REACTION);
  const [kingDevickScore, setKingDevickScore] = useState<AssessmentRecord['kingDevickScore']>(DEFAULT_KD);

  const [latestAssessment, setLatestAssessment] = useState<AssessmentRecord | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveAthletes(athletes);
  }, [athletes]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  }, [view, step]);

  const handleStartTriage = (athlete: AthleteProfile) => {
    setActiveAthlete(athlete);
    setRedFlags({ ...INITIAL_FLAGS });
    setBalanceScore({ ...DEFAULT_BALANCE });
    setReactionScore({ ...DEFAULT_REACTION });
    setKingDevickScore({ ...DEFAULT_KD });
    setStep('red_flags');
    setView('screening');
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
      balanceScore: upBalance,
      reactionScore: upReaction,
      kingDevickScore: upKD,
      redFlags: upFlags,
      triage
    };
    saveAssessment(record);
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
      isEmergencyLockdown: true,
      balanceScore: skippedBalance,
      reactionScore: skippedReaction,
      kingDevickScore: skippedKD,
      redFlags,
      triage
    };
    saveAssessment(record);
    setLatestAssessment(record);
    setView('verdict');
  };

  const handleHeaderBack = () => {
    if (view === 'screening') {
      if (step === 'red_flags') setView('roster');
      else if (step === 'balance') setStep('red_flags');
      else if (step === 'reaction') setStep('balance');
      else if (step === 'king_devick') setStep('reaction');
    } else if (view === 'verdict') {
      setView('roster');
    }
  };

  const handleSelectTab = (tab: 'roster' | 'screening' | 'reports') => {
    if (tab === 'roster') setView('roster');
    else if (tab === 'screening') {
      if (activeAthlete) setView('screening');
      else if (athletes.length > 0) handleStartTriage(athletes[0]);
    } else if (tab === 'reports') {
      setHistoryAthlete(activeAthlete || athletes[0]);
      setShowHistoryDrawer(true);
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
              onSelectAthlete={handleStartTriage}
              onAddAthlete={newAth => {
                const updated = [newAth, ...athletes];
                setAthletes(updated);
                saveAthletes(updated);
              }}
              onOpenHistory={ath => {
                setHistoryAthlete(ath);
                setShowHistoryDrawer(true);
              }}
              lang={lang}
            />
          )}

          {view === 'screening' && activeAthlete && (
            <div className="space-y-4">
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
                      className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
                    >
                      {t.cancelScreening}
                    </button>
                    {Object.values(redFlags).some(Boolean) ? (
                      <button
                        onClick={handleEmergencyLockdown}
                        className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs tracking-wide transition shadow-xs"
                      >
                        <span>{t.lockdownProceed}</span>
                        <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setStep('balance')}
                        className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs tracking-wide transition shadow-xs"
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
            <TriageVerdict
              athlete={activeAthlete}
              assessment={latestAssessment}
              onOpenReport={() => setShowReportModal(true)}
              onRetest={() => handleStartTriage(activeAthlete)}
              onBackToRoster={() => setView('roster')}
              onSaveAsBaseline={() => {
                if (!activeAthlete || !latestAssessment) return;
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
          )}
        </main>

        <SidelineBottomNav
          view={view}
          showHistoryDrawer={showHistoryDrawer}
          lang={lang}
          onSelectTab={handleSelectTab}
        />

        {showReportModal && activeAthlete && latestAssessment && (
          <ClinicianReportModal
            athlete={activeAthlete}
            assessment={latestAssessment}
            onClose={() => setShowReportModal(false)}
            lang={lang}
            onUpdateAssessment={updatedRec => {
              setLatestAssessment(updatedRec);
              saveAssessment(updatedRec);
            }}
          />
        )}

        <AthleteHistoryDrawer
          athlete={historyAthlete}
          isOpen={showHistoryDrawer}
          onClose={() => setShowHistoryDrawer(false)}
          onSelectAssessment={rec => {
            setShowHistoryDrawer(false);
            setLatestAssessment(rec);
            setShowReportModal(true);
          }}
          lang={lang}
        />
      </div>
    </div>
  );
};

export default App;
