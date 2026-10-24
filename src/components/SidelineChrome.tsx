import React, { useState, useEffect } from 'react';
import { AthleteProfile } from '../types/clinical';
import { TRANSLATIONS, SupportedLocale } from '../i18n/translations';
import { Shield, Globe, ChevronLeft, Users, Activity, FileText, Sun } from 'lucide-react';
import { initSunlightMode, toggleSunlightMode } from '../utils/theme';
import { SHARE_THEME_TEXT } from '../i18n/shareTheme';

export type AssessmentStep = 'red_flags' | 'balance' | 'reaction' | 'king_devick';
export type AppView = 'roster' | 'screening' | 'verdict' | 'reports';

interface AssessmentProgressBarProps {
  step: AssessmentStep;
  lang: SupportedLocale;
}

export const AssessmentProgressBar: React.FC<AssessmentProgressBarProps> = ({ step, lang }) => {
  const t = TRANSLATIONS[lang];
  const stepOrder: AssessmentStep[] = ['red_flags', 'balance', 'reaction', 'king_devick'];
  const currentIdx = stepOrder.indexOf(step);
  const stepNumber = currentIdx + 1;

  const stepLabels: Record<AssessmentStep, string> = {
    red_flags: t.step1Short,
    balance: t.step2Short,
    reaction: t.step3Short,
    king_devick: t.step4Short
  };

  return (
    <div
      role="progressbar"
      aria-label={t.testProgressLabel}
      aria-valuenow={stepNumber}
      aria-valuemin={1}
      aria-valuemax={4}
      aria-valuetext={`${t.testProgressLabel}: ${stepLabels[step]}`}
      className="grid grid-cols-4 gap-1.5 pt-2"
    >
      {stepOrder.map((s, idx) => {
        const isDone = currentIdx > idx;
        const isCurrent = currentIdx === idx;
        return (
          <div
            key={s}
            className={`h-1 rounded-full transition-all duration-300 ${
              isCurrent ? 'bg-blue-600' : isDone ? 'bg-emerald-500' : 'bg-slate-200'
            }`}
          />
        );
      })}
    </div>
  );
};

interface SidelineHeaderProps {
  view: AppView;
  step: AssessmentStep;
  activeAthlete: AthleteProfile | null;
  lang: SupportedLocale;
  onToggleLang: () => void;
  onBack: () => void;
  isEmergencyLockdown?: boolean;
}

export const SidelineHeader: React.FC<SidelineHeaderProps> = ({
  view,
  step,
  activeAthlete,
  lang,
  onToggleLang,
  onBack
}) => {
  const t = TRANSLATIONS[lang];
  const shareText = SHARE_THEME_TEXT[lang];
  const [isSunlight, setIsSunlight] = useState<boolean>(() => initSunlightMode());

  useEffect(() => {
    setIsSunlight(initSunlightMode());
  }, []);

  const handleToggleSunlight = () => {
    const updated = toggleSunlightMode();
    setIsSunlight(updated);
  };

  const sunlightToggleBtn = (
    <button
      type="button"
      onClick={handleToggleSunlight}
      aria-pressed={isSunlight}
      aria-label={shareText.sunlightAria}
      title={shareText.sunlightTitle}
      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition flex items-center gap-1 active:scale-95 min-h-[44px] min-w-[44px] justify-center ${
        isSunlight
          ? 'bg-amber-400 text-slate-950 border-amber-500 font-extrabold shadow-xs'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
      }`}
    >
      <Sun className="w-3.5 h-3.5 text-amber-600" />
      <span>{shareText.sunlightToggle}</span>
    </button>
  );

  return (
    <>
      {view === 'roster' && (
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Shield className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 block leading-tight">
                {t.appTitle}
              </span>
              <span className="text-[10px] text-slate-500 font-medium block leading-none mt-0.5">
                {t.appSubtitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {sunlightToggleBtn}
            <button
              onClick={onToggleLang}
              className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition flex items-center gap-1 active:scale-95 min-h-[44px] min-w-[44px] justify-center"
              title={lang === 'en' ? 'Cambiar a Español' : 'Switch to English'}
              aria-label={lang === 'en' ? 'Cambiar a Español' : 'Switch to English'}
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>{lang === 'en' ? 'ES' : 'EN'}</span>
            </button>
          </div>
        </header>
      )}

      {view === 'screening' && activeAthlete && (
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-2.5 shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 transition active:scale-95 py-1 pr-2 min-h-[44px]"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5] -ml-1 mr-0.5" />
              <span>{step === 'red_flags' ? t.backToRoster : t.backBtn}</span>
            </button>

            <div className="text-center">
              <div className="text-xs font-bold text-slate-900 flex items-center justify-center gap-1.5">
                <span>{activeAthlete.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-white font-mono font-bold">
                  #{activeAthlete.jerseyNumber}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                {step === 'red_flags' && t.step1Of4}
                {step === 'balance' && t.step2Of4}
                {step === 'reaction' && t.step3Of4}
                {step === 'king_devick' && t.step4Of4}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {sunlightToggleBtn}
              <button
                onClick={onToggleLang}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                title={lang === 'en' ? 'Cambiar a Español' : 'Switch to English'}
                aria-label={lang === 'en' ? 'Cambiar a Español' : 'Switch to English'}
              >
                {lang === 'en' ? 'ES' : 'EN'}
              </button>
            </div>
          </div>

          <AssessmentProgressBar step={step} lang={lang} />
        </header>
      )}

      {view === 'verdict' && activeAthlete && (
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between shrink-0">
          <button
            onClick={onBack}
            className="flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 transition active:scale-95 py-1 pr-2 min-h-[44px]"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5] -ml-1 mr-0.5" />
            <span>{t.backToRoster}</span>
          </button>

          <span className="font-extrabold text-sm tracking-tight text-slate-900">
            {t.sidelineResultTitle}
          </span>

          <div className="flex items-center gap-1.5">
            {sunlightToggleBtn}
            <button
              onClick={onToggleLang}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
              title={lang === 'en' ? 'Cambiar a Español' : 'Switch to English'}
              aria-label={lang === 'en' ? 'Cambiar a Español' : 'Switch to English'}
            >
              {lang === 'en' ? 'ES' : 'EN'}
            </button>
          </div>
        </header>
      )}

      {view === 'reports' && (
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between shrink-0">
          <button
            onClick={onBack}
            className="flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 transition active:scale-95 py-1 pr-2 min-h-[44px]"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5] -ml-1 mr-0.5" />
            <span>{t.backToRoster}</span>
          </button>

          <span className="font-extrabold text-sm tracking-tight text-slate-900">
            {lang === 'en' ? 'Sideline Reports' : 'Reportes de Banda'}
          </span>

          <div className="flex items-center gap-1.5">
            {sunlightToggleBtn}
            <button
              onClick={onToggleLang}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
              title={lang === 'en' ? 'Cambiar a Español' : 'Switch to English'}
              aria-label={lang === 'en' ? 'Cambiar a Español' : 'Switch to English'}
            >
              {lang === 'en' ? 'ES' : 'EN'}
            </button>
          </div>
        </header>
      )}
    </>
  );
};

interface SidelineBottomNavProps {
  view: AppView;
  showHistoryDrawer: boolean;
  lang: SupportedLocale;
  onSelectTab: (tab: 'roster' | 'screening' | 'reports') => void;
}

export const SidelineBottomNav: React.FC<SidelineBottomNavProps> = ({
  view,
  showHistoryDrawer,
  lang,
  onSelectTab
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <nav
      aria-label="Sideline navigation"
      className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-6 py-2 flex items-center justify-around shrink-0"
    >
      <button
        onClick={() => onSelectTab('roster')}
        aria-current={view === 'roster' ? 'page' : undefined}
        className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg transition active:scale-95 min-h-[44px] ${
          view === 'roster' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
        }`}
      >
        <Users className="w-5 h-5 stroke-[2.2]" />
        <span className="text-[10px]">{t.tabAthletes}</span>
      </button>

      <button
        onClick={() => onSelectTab('screening')}
        aria-current={view === 'screening' ? 'page' : undefined}
        className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg transition active:scale-95 min-h-[44px] ${
          view === 'screening' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
        }`}
      >
        <Activity className="w-5 h-5 stroke-[2.2]" />
        <span className="text-[10px]">{t.tabQuickTest}</span>
      </button>

      <button
        onClick={() => onSelectTab('reports')}
        aria-current={view === 'reports' || showHistoryDrawer ? 'page' : undefined}
        className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg transition active:scale-95 min-h-[44px] ${
          view === 'reports' || showHistoryDrawer ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
        }`}
      >
        <FileText className="w-5 h-5 stroke-[2.2]" />
        <span className="text-[10px]">{t.tabReports}</span>
      </button>
    </nav>
  );
};
