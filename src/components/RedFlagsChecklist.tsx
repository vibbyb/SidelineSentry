import React from 'react';
import { AssessmentRecord } from '../types/clinical';
import { AlertOctagon, CheckSquare, Square, PhoneCall, ShieldAlert, HelpCircle } from 'lucide-react';
import { TRANSLATIONS, SupportedLocale } from '../i18n/translations';

interface RedFlagsChecklistProps {
  flags: AssessmentRecord['redFlags'];
  onChange: (flags: AssessmentRecord['redFlags']) => void;
  onEmergencyLockdown?: () => void;
  lang?: SupportedLocale;
}

export const RedFlagsChecklist: React.FC<RedFlagsChecklistProps> = ({
  flags,
  onChange,
  lang = 'en'
}) => {
  const t = TRANSLATIONS[lang];

  const MADDOCKS_ITEMS: {
    key: 'maddocksVenueFailed' | 'maddocksPeriodFailed' | 'maddocksScoreFailed';
    question: string;
    desc: string;
  }[] = [
    { key: 'maddocksVenueFailed', question: t.maddocksVenue, desc: t.maddocksVenueDesc },
    { key: 'maddocksPeriodFailed', question: t.maddocksPeriod, desc: t.maddocksPeriodDesc },
    { key: 'maddocksScoreFailed', question: t.maddocksScore, desc: t.maddocksScoreDesc },
  ];

  const RED_FLAG_ITEMS: { key: keyof AssessmentRecord['redFlags']; label: string; desc: string }[] = [
    { key: 'lossOfConsciousness', label: t.flag_lossOfConsciousness, desc: t.flag_lossOfConsciousness_desc },
    { key: 'neckPain', label: t.flag_neckPain, desc: t.flag_neckPain_desc },
    { key: 'deterioratingConsciousState', label: t.flag_deterioratingConsciousState, desc: t.flag_deterioratingConsciousState_desc },
    { key: 'vomitingRepeated', label: t.flag_vomitingRepeated, desc: t.flag_vomitingRepeated_desc },
    { key: 'severeOrIncreasingHeadache', label: t.flag_severeOrIncreasingHeadache, desc: t.flag_severeOrIncreasingHeadache_desc },
    { key: 'seizureOrConvulsion', label: t.flag_seizureOrConvulsion, desc: t.flag_seizureOrConvulsion_desc },
    { key: 'doubleVision', label: t.flag_doubleVision, desc: t.flag_doubleVision_desc },
    { key: 'weaknessOrTingling', label: t.flag_weaknessOrTingling, desc: t.flag_weaknessOrTingling_desc },
    { key: 'increasingConfusion', label: t.flag_increasingConfusion, desc: t.flag_increasingConfusion_desc },
  ];

  const toggle = (key: keyof AssessmentRecord['redFlags']) => {
    onChange({
      ...flags,
      [key]: !flags[key]
    });
  };

  const setMaddocksFailure = (
    key: 'maddocksVenueFailed' | 'maddocksPeriodFailed' | 'maddocksScoreFailed',
    isFailed: boolean
  ) => {
    onChange({
      ...flags,
      [key]: isFailed
    });
  };

  const hasAnyFlag = Object.values(flags).some(Boolean);

  return (
    <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm relative overflow-hidden">
      <div className="flex items-center space-x-3 mb-4 border-b border-slate-200 pb-3">
        <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-700">
          <AlertOctagon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <span>{t.redFlagsTitle}</span>
            {hasAnyFlag && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-red-700 text-white shadow-sm">
                {t.emergencyTriggered}
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            {t.redFlagsDesc}
          </p>
        </div>
      </div>

      {/* Emergency Alert Card */}
      {hasAnyFlag && (
        <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-300 text-slate-900 shadow-sm animate-fade-in">
          <div className="flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-700">
                {t.emergencyTriggered} | {t.doNotRunPhysicalTests}
              </h4>
              <p className="text-xs text-red-950 mt-1 leading-relaxed font-medium">
                {t.emergencyLockdownWarning}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <a
                  href="tel:911"
                  className="flex items-center space-x-1.5 px-4 py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-bold shadow-sm transition min-h-[44px]"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>{t.call911}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Maddock's Sideline Memory Section */}
      <div className="mb-5 bg-slate-50 border border-slate-300 rounded-xl p-4 shadow-sm">
        <div className="flex items-center space-x-2 mb-1.5">
          <HelpCircle className="w-4 h-4 text-blue-700" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            {t.maddocksTitle}
          </h4>
        </div>
        <p className="text-xs text-slate-600 mb-3 leading-relaxed font-medium">
          {t.maddocksDesc}
        </p>

        <div className="space-y-2">
          {MADDOCKS_ITEMS.map(item => {
            const val = flags[item.key];
            const isPassed = val === false;
            const isFailed = val === true;
            return (
              <div
                key={item.key}
                className={`flex flex-col gap-2.5 p-3.5 rounded-lg border transition ${
                  isFailed
                    ? 'bg-red-50 border-red-300'
                    : isPassed
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">{item.question}</div>
                  <div className="text-[11px] text-slate-600 font-medium mt-0.5">{item.desc}</div>
                </div>
                <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setMaddocksFailure(item.key, false)}
                    className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg border transition min-h-[44px] ${
                      isPassed
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-400 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t.maddocksPass}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaddocksFailure(item.key, true)}
                    className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg border transition min-h-[44px] ${
                      isFailed
                        ? 'bg-red-700 text-white border-red-700 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t.maddocksFail}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Red Flags Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {RED_FLAG_ITEMS.map(item => {
          const checked = Boolean(flags[item.key]);
          return (
            <div
              key={item.key}
              role="checkbox"
              aria-checked={checked}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  toggle(item.key);
                }
              }}
              onClick={() => toggle(item.key)}
              className={`p-3 rounded-lg border cursor-pointer select-none transition flex items-start space-x-3 shadow-sm focus:outline-hidden focus:ring-2 focus:ring-red-500 ${
                checked
                  ? 'bg-red-50 border-red-400 text-red-950'
                  : 'bg-white border-slate-300 hover:border-slate-400 text-slate-800'
              }`}
            >
              <div className="mt-0.5">
                {checked ? (
                  <CheckSquare className="w-4 h-4 text-red-700" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div>
                <div className={`text-xs font-bold leading-tight ${checked ? 'text-red-950' : 'text-slate-900'}`}>{item.label}</div>
                <div className={`text-[11px] mt-0.5 font-medium ${checked ? 'text-red-800' : 'text-slate-600'}`}>{item.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
