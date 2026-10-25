import React, { useState } from 'react';
import { AthleteProfile, AssessmentRecord } from '../types/clinical';
import { AlertTriangle, CheckCircle2, FileText, ShieldAlert, RotateCcw, AlertOctagon, Share2, X } from 'lucide-react';
import { TRANSLATIONS, SupportedLocale } from '../i18n/translations';
import { translateTrigger, translateSkippedReason } from '../i18n/triggerTranslator';
import { buildParentShareSummary, shareParentSummary } from '../utils/share';
import { SHARE_THEME_TEXT } from '../i18n/shareTheme';

interface TriageVerdictProps {
  athlete: AthleteProfile;
  assessment: AssessmentRecord;
  onOpenReport: () => void;
  onRetest: () => void;
  onBackToRoster: () => void;
  onSaveAsBaseline?: () => void;
  lang?: SupportedLocale;
}

export const TriageVerdict: React.FC<TriageVerdictProps> = ({
  athlete,
  assessment,
  onOpenReport,
  onRetest,
  onBackToRoster,
  onSaveAsBaseline,
  lang = 'en'
}) => {
  const t = TRANSLATIONS[lang];
  const shareText = SHARE_THEME_TEXT[lang];
  const [baselineSaved, setBaselineSaved] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [manualShareSummary, setManualShareSummary] = useState<string | null>(null);
  const { triage, balanceScore, reactionScore, kingDevickScore } = assessment;

  const isRemoval = triage.verdict === 'IMMEDIATE_REMOVAL';
  const isCaution = triage.verdict === 'EVALUATION_RECOMMENDED';
  const isInvalid = triage.verdict === 'INVALID_ASSESSMENT_RETEST_REQUIRED';
  const isDemo = Boolean((assessment as { isDemo?: boolean }).isDemo);

  const handleShareWithParent = async () => {
    const summaryText = buildParentShareSummary({ ...assessment, athlete }, lang);
    const shareTitle = `${athlete.name} - ${shareText.shareTitle}`;
    const outcome = await shareParentSummary(summaryText, shareTitle);
    if (outcome === 'shared' || outcome === 'copied') {
      setShareToast(shareText.shareSuccessToast);
      setTimeout(() => setShareToast(null), 3500);
    } else if (outcome === 'manual') {
      setManualShareSummary(summaryText);
    }
  };

  return (
    <div className="space-y-6">
      <div
        className={`rounded-xl p-6 border-2 shadow-sm transition-all relative overflow-hidden ${
          isRemoval
            ? 'bg-red-50 border-red-600 text-red-950'
            : isInvalid
            ? 'bg-amber-50 border-amber-500 text-amber-950'
            : isCaution
            ? 'bg-amber-50 border-amber-500 text-amber-950'
            : 'bg-emerald-50 border-emerald-600 text-emerald-950'
        }`}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-start space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-xs ${
                isRemoval
                  ? 'bg-red-100 text-red-700 border-red-300'
                  : isInvalid || isCaution
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-emerald-100 text-emerald-700 border-emerald-300'
              }`}
            >
              {isRemoval ? (
                <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
              ) : isInvalid ? (
                <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
              ) : isCaution ? (
                <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
              )}
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold opacity-80">
                {t.sidelineRecommendationTag}
              </div>
              <h1 className="text-base sm:text-lg font-black tracking-tight uppercase leading-tight mt-0.5">
                {isRemoval && t.verdictRemoval}
                {isInvalid && t.verdictInvalid}
                {isCaution && !isInvalid && t.verdictCaution}
                {!isRemoval && !isCaution && !isInvalid && t.verdictClear}
              </h1>
            </div>
          </div>

          <p className="text-xs font-medium leading-relaxed opacity-90">
            {isRemoval
              ? t.verdictRemovalDesc
              : isInvalid
              ? t.verdictInvalidDesc
              : isCaution
              ? t.verdictCautionDesc
              : t.verdictClearDesc}
          </p>

          <div className="bg-white/80 px-3 py-2 rounded-xl border border-slate-200/80 text-xs flex items-center justify-between">
            <span className="text-slate-500 font-medium">{t.athleteLabel}</span>
            <span className="font-bold text-slate-900">{athlete.name} (#{athlete.jerseyNumber} • {athlete.sport})</span>
          </div>
        </div>
      </div>

      {assessment.isEmergencyLockdown && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-950 flex items-start space-x-3 shadow-sm">
          <AlertOctagon className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-red-700">
              {t.emergencyStopNoticeTitle}
            </div>
            <p className="text-xs text-red-900 mt-1 leading-relaxed font-medium">
              {t.emergencyStopNoticeDesc}
            </p>
          </div>
        </div>
      )}

      {triage.hasIndividualBaseline === false && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start space-x-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-800">
              {t.normativePriorApplied}
            </div>
            <p className="text-xs text-amber-900 mt-1 leading-relaxed font-medium">
              {t.noBaselineMarginNotice}
            </p>
          </div>
        </div>
      )}

      {(() => {
        const actualTriggers = (triage.primaryTriggers || []).filter(
          trig => !/skipped|omitid/i.test(trig)
        );
        if (actualTriggers.length === 0) return null;
        return (
          <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center space-x-2 text-xs uppercase font-bold text-red-700 mb-3">
              <AlertOctagon className="w-4 h-4" />
              <span>
                {actualTriggers.length === 1
                  ? (lang === 'es' ? '1 Señal de Advertencia Observada' : '1 Warning Observed')
                  : t.warningSignsCount.replace('{count}', String(actualTriggers.length))}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {actualTriggers.map((trig, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-950 font-bold flex items-center space-x-2"
                >
                  <div className="w-2 h-2 rounded-full bg-red-700 shrink-0" />
                  <span>{translateTrigger(trig, lang)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Balance Check */}
        <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="text-xs text-slate-600 uppercase tracking-wider font-bold mb-1">
            {lang === 'es' ? 'Prueba 2: Balance' : 'Test 2: Balance'}
          </div>
          {balanceScore.skippedReason ? (
            <div className="py-2">
              <span className="text-xs font-bold text-amber-800 px-2 py-0.5 rounded bg-amber-100 border border-amber-300">
                {t.skippedForSafety}
              </span>
              <p className="text-[11px] text-slate-600 mt-1.5 leading-snug font-medium">
                {translateSkippedReason(balanceScore.skippedReason, lang)}
              </p>
            </div>
          ) : (
            <>
              <div className="text-3xl font-black font-mono text-slate-900 tabular-nums">
                {balanceScore.stabilityIndex.toFixed(3)}{' '}
                <span className="text-sm text-slate-500 font-normal">m/s²</span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>{t.preseasonBaselineRow}</span>
                  <span className="text-slate-900 font-mono font-bold">
                    {(athlete.baselineStabilityIndex || 0.085).toFixed(3)} m/s²
                  </span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-700">{t.changeFromBaselineRow}</span>
                  <span
                    className={`font-mono tabular-nums ${
                      triage.swayDegradationPercent >= 25
                        ? 'text-red-700'
                        : triage.swayDegradationPercent >= 15
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {triage.swayDegradationPercent > 0 ? '+' : ''}
                    {triage.swayDegradationPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Metric 2: Reaction Time */}
        <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="text-xs text-slate-600 uppercase tracking-wider font-bold mb-1">
            {lang === 'es' ? 'Prueba 3: Tiempo de Reacción' : 'Test 3: Reaction Time'}
          </div>
          {reactionScore.skippedReason ? (
            <div className="py-2">
              <span className="text-xs font-bold text-amber-800 px-2 py-0.5 rounded bg-amber-100 border border-amber-300">
                {t.skippedForSafety}
              </span>
              <p className="text-[11px] text-slate-600 mt-1.5 leading-snug font-medium">
                {translateSkippedReason(reactionScore.skippedReason, lang)}
              </p>
            </div>
          ) : (
            <>
              <div className="text-3xl font-black font-mono text-slate-900 tabular-nums">
                {reactionScore.averageMs}{' '}
                <span className="text-sm text-slate-500 font-normal">ms</span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>{t.preseasonBaselineRow}</span>
                  <span className="text-slate-900 font-mono font-bold">
                    {athlete.baselineReactionTimeMs || 230} ms
                  </span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-700">{t.timeDiffRow}</span>
                  <span
                    className={`font-mono tabular-nums ${
                      triage.reactionDelayDeltaMs >= 40
                        ? 'text-red-700'
                        : triage.reactionDelayDeltaMs >= 20
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {triage.reactionDelayDeltaMs > 0 ? '+' : ''}
                    {triage.reactionDelayDeltaMs} ms
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Metric 3: Reading Test */}
        <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="text-xs text-slate-600 uppercase tracking-wider font-bold mb-1">
            {lang === 'es' ? 'Prueba 4: Lectura de Números' : 'Test 4: Number Reading'}
          </div>
          {kingDevickScore.skippedReason ? (
            <div className="py-2">
              <span className="text-xs font-bold text-amber-800 px-2 py-0.5 rounded bg-amber-100 border border-amber-300">
                {t.skippedForSafety}
              </span>
              <p className="text-[11px] text-slate-600 mt-1.5 leading-snug font-medium">
                {translateSkippedReason(kingDevickScore.skippedReason, lang)}
              </p>
            </div>
          ) : (
            <>
              <div className="text-3xl font-black font-mono text-slate-900 tabular-nums">
                {kingDevickScore.durationSeconds.toFixed(1)}{' '}
                <span className="text-sm text-slate-500 font-normal">s</span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>{t.preseasonBaselineRow}</span>
                  <span className="text-slate-900 font-mono font-bold">
                    {(athlete.baselineKingDevickSeconds || 42.0).toFixed(1)} s
                  </span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-700">{t.diffErrorsRow}</span>
                  <span
                    className={`font-mono tabular-nums ${
                      triage.kingDevickDeltaSeconds >= 5 || kingDevickScore.errorsCount >= 2
                        ? 'text-red-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {triage.kingDevickDeltaSeconds > 0 ? '+' : ''}
                    {triage.kingDevickDeltaSeconds.toFixed(1)}s ({kingDevickScore.errorsCount} err)
                  </span>
                </div>
                {kingDevickScore.cardSplits && kingDevickScore.cardSplits.length > 0 && (
                  <div className="pt-2.5 mt-2 border-t border-slate-100 grid grid-cols-3 gap-1.5 text-center">
                    {kingDevickScore.cardSplits.map((split, i) => (
                      <div key={i} className="bg-slate-50 border border-slate-200/80 rounded py-1 px-1">
                        <div className="text-[9px] text-slate-500 uppercase font-bold tracking-tight">
                          {t.cardOf.replace('{current}', String(i + 1)).split(' ')[0]} {i + 1}
                        </div>
                        <div className="text-[11px] font-mono font-black text-slate-800 tabular-nums">{split.toFixed(1)}s</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-white border border-slate-300 text-xs text-slate-600 leading-relaxed font-medium shadow-sm">
        <strong className="text-slate-900 font-bold">
          {t.cdcDisclaimerTitle}
        </strong>{' '}
        {lang === 'es' ? t.cdcDisclaimerEs : triage.nonDiagnosticDisclaimer}
      </div>

      <div className="flex flex-col gap-2 pt-2">
        {onSaveAsBaseline && (isDemo || (!isRemoval && !isInvalid)) && (
          <div>
            {baselineSaved ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold shadow-xs">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {t.baselineSavedToRoster}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-emerald-700 font-black">
                  {balanceScore.stabilityIndex.toFixed(3)} m/s² • {reactionScore.averageMs}ms
                </span>
              </div>
            ) : isDemo ? (
              <div>
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="w-full flex items-center justify-center space-x-2 py-3 px-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 font-bold text-xs cursor-not-allowed min-h-[44px]"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-400" />
                  <span>
                    {t.saveAsPreseasonBtn}
                  </span>
                </button>
                <p className="text-[11px] text-amber-800 mt-1.5 font-medium">
                  {shareText.demoBaselineDisabled}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setBaselineSaved(true);
                  onSaveAsBaseline();
                }}
                className="w-full flex items-center justify-center space-x-2 py-3 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs transition active:scale-[0.98] min-h-[44px]"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>
                  {t.saveAsPreseasonBtn}
                </span>
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleShareWithParent}
          className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition active:scale-[0.98] min-h-[44px]"
        >
          <Share2 className="w-4 h-4 text-emerald-400" />
          <span>{shareText.shareWithParentBtn}</span>
        </button>

        {shareToast && (
          <div
            role="status"
            aria-live="polite"
            className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center space-x-2 shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{shareToast}</span>
          </div>
        )}

        <button
          onClick={onOpenReport}
          className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition active:scale-[0.98] min-h-[44px]"
        >
          <FileText className="w-4 h-4" />
          <span>{t.generatePacket}</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onRetest}
            className="flex items-center justify-center space-x-1.5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition min-h-[44px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.retestBtn}</span>
          </button>
          <button
            onClick={onBackToRoster}
            className="flex items-center justify-center space-x-1.5 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition min-h-[44px]"
          >
            <span>{t.returnRoster}</span>
          </button>
        </div>
      </div>

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
                {shareText.manualShareTitle}
              </h3>
              <button
                type="button"
                onClick={() => setManualShareSummary(null)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={shareText.closeManualShare}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              {shareText.manualShareHelp}
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
                {shareText.closeManualShare}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
