import React, { useState, useEffect } from 'react';
import { AthleteProfile } from '../types/clinical';
import { AthleteRecoveryRecord } from '../types/recovery';
import {
  loadAthleteRecovery,
  toggleReturnToPlayStep,
  setMedicalClearance,
  resetReturnToPlay
} from '../services/recovery';
import { RECOVERY_TEXT } from '../i18n/recovery';
import { SupportedLocale } from '../i18n/translations';
import {
  AlertTriangle,
  Check,
  Lock,
  RotateCcw,
  Stethoscope,
  ShieldAlert,
  Info
} from 'lucide-react';

interface ReturnToPlayTrackerProps {
  athlete: AthleteProfile;
  lang?: SupportedLocale;
}

export const ReturnToPlayTracker: React.FC<ReturnToPlayTrackerProps> = ({
  athlete,
  lang = 'en'
}) => {
  const t = RECOVERY_TEXT[lang] || RECOVERY_TEXT.en;

  const [record, setRecord] = useState<AthleteRecoveryRecord>(() =>
    loadAthleteRecovery(athlete.id)
  );

  const [providerName, setProviderName] = useState(
    record.returnToPlay.medicalClearance.providerName || ''
  );
  const [clearanceDate, setClearanceDate] = useState(
    record.returnToPlay.medicalClearance.clearanceDate ||
      new Date().toISOString().split('T')[0]
  );
  const [isCleared, setIsCleared] = useState(
    record.returnToPlay.medicalClearance.clearedByProvider
  );
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  // Reload recovery data if athlete id changes
  useEffect(() => {
    const updated = loadAthleteRecovery(athlete.id);
    setRecord(updated);
    setProviderName(updated.returnToPlay.medicalClearance.providerName || '');
    setIsCleared(updated.returnToPlay.medicalClearance.clearedByProvider);
    setClearanceDate(
      updated.returnToPlay.medicalClearance.clearanceDate ||
        new Date().toISOString().split('T')[0]
    );
    setShowResetConfirm(false);
    setValidationMessage(null);
  }, [athlete.id]);

  const stepDetails: Record<number, { title: string; desc: string }> = {
    1: { title: t.rtpStep1Title, desc: t.rtpStep1Desc },
    2: { title: t.rtpStep2Title, desc: t.rtpStep2Desc },
    3: { title: t.rtpStep3Title, desc: t.rtpStep3Desc },
    4: { title: t.rtpStep4Title, desc: t.rtpStep4Desc },
    5: { title: t.rtpStep5Title, desc: t.rtpStep5Desc },
    6: { title: t.rtpStep6Title, desc: t.rtpStep6Desc }
  };

  const steps = record.returnToPlay.steps;
  const clearance = record.returnToPlay.medicalClearance;
  const hasMedicalClearance =
    clearance.clearedByProvider && clearance.providerName.trim().length > 0;

  // Toggle step handler
  const handleToggleStep = (stepNumber: number, currentCompleted: boolean) => {
    setValidationMessage(null);

    // If currently not completed, we want to complete it
    if (!currentCompleted) {
      if (stepNumber > 1) {
        const prevStep = steps.find(s => s.stepNumber === stepNumber - 1);
        if (!prevStep || !prevStep.completed) {
          setValidationMessage(t.rtpStepLocked);
          return;
        }
      }

      if ((stepNumber === 5 || stepNumber === 6) && !hasMedicalClearance) {
        setValidationMessage(t.rtpClearanceWarning);
        return;
      }
    }

    const defaultDate = new Date().toISOString().split('T')[0];
    const targetDate = steps[stepNumber - 1]?.completedDate || defaultDate;
    const result = toggleReturnToPlayStep(
      athlete.id,
      stepNumber,
      !currentCompleted,
      !currentCompleted ? targetDate : undefined
    );

    if (!result.success && result.error) {
      setValidationMessage(result.error);
    }
    setRecord(result);
  };

  // Change date of step
  const handleDateChange = (stepNumber: number, newDate: string) => {
    const step = steps[stepNumber - 1];
    if (!step || !step.completed) return;
    const result = toggleReturnToPlayStep(athlete.id, stepNumber, true, newDate);
    setRecord(result);
  };

  // Update medical clearance
  const handleClearanceToggle = (checked: boolean) => {
    setIsCleared(checked);
    const updated = setMedicalClearance(athlete.id, checked, providerName, clearanceDate);
    setRecord(updated);
  };

  const handleProviderNameBlur = () => {
    const updated = setMedicalClearance(athlete.id, isCleared, providerName, clearanceDate);
    setRecord(updated);
  };

  const handleClearanceDateChange = (newDate: string) => {
    setClearanceDate(newDate);
    const updated = setMedicalClearance(athlete.id, isCleared, providerName, newDate);
    setRecord(updated);
  };

  // Reset plan
  const handleResetPlan = () => {
    const updated = resetReturnToPlay(athlete.id);
    setRecord(updated);
    setIsCleared(false);
    setProviderName('');
    setShowResetConfirm(false);
    setValidationMessage(null);
  };

  return (
    <div className="space-y-5">
      {/* CDC Notice banner */}
      <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start space-x-2.5 shadow-sm">
        <Info className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
        <div className="font-medium leading-relaxed">{t.rtpCdcNotice}</div>
      </div>

      {/* 24-Hour Spacing Warning Banner */}
      {record.returnToPlay.lessThan24hWarning && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start space-x-2.5 shadow-sm">
          <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-900">24-Hour Spacing Notice</div>
            <div className="mt-0.5 font-medium leading-relaxed">{t.rtpWarning24h}</div>
          </div>
        </div>
      )}

      {/* Inline validation message */}
      {validationMessage && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-300 text-red-800 text-xs flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span className="font-medium">{validationMessage}</span>
        </div>
      )}

      {/* Return to Play 6 Steps */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {t.rtpTitle}
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">
            {steps.filter(s => s.completed).length} / 6
          </span>
        </div>

        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
          {t.rtpSubtitle}
        </p>

        <div className="space-y-2.5">
          {steps.map(step => {
            const stepNum = step.stepNumber;
            const details = stepDetails[stepNum] || {
              title: step.name,
              desc: step.description
            };

            const isPreviousComplete =
              stepNum === 1 || Boolean(steps[stepNum - 2]?.completed);
            const needsClearance = stepNum === 5 || stepNum === 6;
            const isBlockedByClearance = needsClearance && !hasMedicalClearance;
            const isLocked = !step.completed && !isPreviousComplete;

            return (
              <div
                key={stepNum}
                className={`p-3.5 rounded-xl border transition-all ${
                  step.completed
                    ? 'bg-emerald-50/70 border-emerald-300 shadow-sm'
                    : isLocked
                    ? 'bg-slate-50 border-slate-200 opacity-60'
                    : 'bg-white border-slate-300 shadow-sm'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Step checkbox with >= 44px touch target */}
                  <button
                    type="button"
                    onClick={() => handleToggleStep(stepNum, step.completed)}
                    disabled={isLocked}
                    aria-label={`${details.title} - ${
                      step.completed ? 'completed' : 'not completed'
                    }`}
                    className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border transition ${
                      step.completed
                        ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm'
                        : isLocked
                        ? 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed'
                        : 'bg-white border-slate-300 hover:border-slate-400 text-transparent'
                    }`}
                  >
                    {step.completed ? (
                      <Check className="w-5 h-5 text-white stroke-[3]" />
                    ) : isLocked ? (
                      <Lock className="w-4 h-4 text-slate-400" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded border border-slate-400" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between flex-wrap gap-1">
                      <span
                        className={`text-xs font-bold ${
                          step.completed
                            ? 'text-emerald-950'
                            : isLocked
                            ? 'text-slate-500'
                            : 'text-slate-900'
                        }`}
                      >
                        {details.title}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      {details.desc}
                    </p>

                    {/* Step date or lock status indicator */}
                    <div className="mt-2.5 flex items-center flex-wrap gap-2">
                      {step.completed ? (
                        <div className="flex items-center space-x-1.5 text-xs text-slate-700">
                          <span className="text-[11px] font-medium text-slate-500">
                            {t.rtpCompletedOn}:
                          </span>
                          <input
                            type="date"
                            value={
                              step.completedDate ||
                              new Date().toISOString().split('T')[0]
                            }
                            onChange={e => handleDateChange(stepNum, e.target.value)}
                            aria-label={`Date completed for ${details.title}`}
                            className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono min-h-[44px]"
                          />
                        </div>
                      ) : isLocked ? (
                        <span className="text-[10px] text-slate-400 font-medium flex items-center space-x-1">
                          <Lock className="w-3 h-3" />
                          <span>{t.rtpStepLocked}</span>
                        </span>
                      ) : isBlockedByClearance ? (
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 font-medium flex items-center space-x-1">
                          <Stethoscope className="w-3 h-3 text-amber-600" />
                          <span>{t.rtpClearanceWarning}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-blue-700 font-medium">
                          Ready to attempt (at least 24h symptom-free)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Healthcare Provider Clearance Box */}
      <div className="p-4 rounded-xl bg-white border border-slate-300 shadow-sm space-y-3">
        <div className="flex items-center space-x-2">
          <Stethoscope className="w-4 h-4 text-blue-700" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            {t.rtpClearanceTitle}
          </h3>
        </div>

        <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
          {t.rtpClearanceSubtitle}
        </p>

        {/* Clearance checkbox with >=44px touch target */}
        <label className="flex items-center space-x-3 cursor-pointer min-h-[44px] p-2 -ml-2 rounded-lg hover:bg-slate-50 transition">
          <input
            type="checkbox"
            checked={isCleared}
            onChange={e => handleClearanceToggle(e.target.checked)}
            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
          />
          <span className="text-xs text-slate-800 font-medium leading-snug">
            {t.rtpClearanceCheckbox}
          </span>
        </label>

        {/* Provider inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              {t.rtpProviderNameLabel}
            </label>
            <input
              type="text"
              value={providerName}
              onChange={e => setProviderName(e.target.value)}
              onBlur={handleProviderNameBlur}
              placeholder={t.rtpProviderNamePlaceholder}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              {t.rtpClearanceDateLabel}
            </label>
            <input
              type="date"
              value={clearanceDate}
              onChange={e => handleClearanceDateChange(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 min-h-[44px]"
            />
          </div>
        </div>
      </div>

      {/* Reset Plan Button & Confirmation */}
      <div className="pt-2">
        {showResetConfirm ? (
          <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-slate-900 space-y-3">
            <p className="text-xs font-medium text-red-900 leading-relaxed">
              {t.rtpResetConfirm}
            </p>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition min-h-[44px]"
              >
                {t.rtpResetCancel}
              </button>
              <button
                type="button"
                onClick={handleResetPlan}
                className="flex-1 py-2.5 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition min-h-[44px]"
              >
                {t.rtpResetProceed}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="w-full flex items-center justify-center space-x-1.5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition min-h-[44px]"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>{t.rtpResetButton}</span>
          </button>
        )}
      </div>
    </div>
  );
};
