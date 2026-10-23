import React, { useState } from 'react';
import { AthleteProfile, AssessmentRecord } from '../types/clinical';
import { AlertTriangle, CheckCircle2, FileText, ShieldAlert, RotateCcw, AlertOctagon } from 'lucide-react';
import { TRANSLATIONS, SupportedLocale } from '../i18n/translations';

interface TriageVerdictProps {
  athlete: AthleteProfile;
  assessment: AssessmentRecord;
  onOpenReport: () => void;
  onRetest: () => void;
  onBackToRoster: () => void;
  onSaveAsBaseline?: () => void;
  lang?: SupportedLocale;
}

const translateTrigger = (trig: string, locale: SupportedLocale): string => {
  if (locale !== 'es') return trig;
  if (trig.startsWith('EMERGENCY PROTOCOL:')) {
    return trig.replace('EMERGENCY PROTOCOL:', 'PROTOCOLO DE EMERGENCIA:');
  }
  if (trig.includes('Standard School Safety Margin Applied')) {
    return 'Margen de seguridad escolar aplicado (evaluación de base +15% más estricta)';
  }
  if (trig.includes('Corrupted Sensor / Timing Telemetry')) {
    return 'Telemetría de sensor o tiempo dañada: Métrica no válida detectada. Repetir prueba requerido.';
  }
  if (trig.includes('Eye Tracking Incomplete')) {
    return 'Rastreo ocular incompleto: La prueba se cerró antes de completar las 3 tarjetas. Repetir prueba requerido.';
  }
  if (trig.includes('Noticeable Balance Loss')) {
    return trig.replace('Noticeable Balance Loss', 'Pérdida notable de equilibrio').replace('above baseline', 'sobre línea base');
  }
  if (trig.includes('Mild Balance Decrease')) {
    return trig.replace('Mild Balance Decrease', 'Disminución leve de equilibrio').replace('above baseline', 'sobre línea base');
  }
  if (trig.includes('Severe Balance Loss')) {
    return trig.replace('Severe Balance Loss (Sway', 'Pérdida grave de equilibrio (Oscilación');
  }
  if (trig.includes('Significant Reaction Delay')) {
    return trig.replace('Significant Reaction Delay', 'Retraso significativo de reacción').replace('slower than baseline', 'más lento que la base');
  }
  if (trig.includes('Mild Reaction Slowing')) {
    return trig.replace('Mild Reaction Slowing', 'Demora leve de reacción');
  }
  if (trig.includes('Eye Tracking Delay')) {
    return trig.replace('Eye Tracking Delay', 'Retraso de rastreo ocular').replace('delay', 'retraso').replace('mistakes', 'errores').replace('mistake', 'error');
  }
  if (trig.includes('Mild Eye Tracking Delay')) {
    return trig.replace('Mild Eye Tracking Delay', 'Retraso leve de rastreo ocular').replace('delay', 'retraso');
  }
  if (trig.includes('Balance Validity Warning:')) {
    return trig.replace('Balance Validity Warning:', 'Aviso de validez de equilibrio:');
  }
  if (trig.includes('Reaction Validity Warning:')) {
    return trig.replace('Reaction Validity Warning:', 'Aviso de validez de reacción:');
  }
  if (trig.includes('Eye Tracking Validity Warning: Reading completed unnaturally fast')) {
    return 'Aviso de validez de rastreo ocular: Lectura completada de forma anormalmente rápida (<12.0s). Repetir prueba requerido.';
  }
  if (trig.includes('Eye Tracking Validity Warning:')) {
    return trig.replace('Eye Tracking Validity Warning:', 'Aviso de validez de rastreo ocular:');
  }
  return trig;
};

const translateSkippedReason = (reason: string | undefined, locale: SupportedLocale): string => {
  if (!reason || locale !== 'es') return reason || '';
  if (reason.toLowerCase().includes('emergency lockdown active')) {
    return 'Protocolo de emergencia activo (banderas rojas reportadas)';
  }
  if (reason.toLowerCase().includes('pre-test red flag')) {
    return 'Señal de alarma previa al chequeo';
  }
  return reason;
};

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
  const [baselineSaved, setBaselineSaved] = useState<boolean>(false);
  const { triage, balanceScore, reactionScore, kingDevickScore } = assessment;

  const isRemoval = triage.verdict === 'IMMEDIATE_REMOVAL';
  const isCaution = triage.verdict === 'EVALUATION_RECOMMENDED';
  const isInvalid = triage.verdict === 'INVALID_ASSESSMENT_RETEST_REQUIRED';

  return (
    <div className="space-y-6">
      {/* Triage Header Banner */}
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
                {lang === 'es' ? 'Recomendación de Campo' : 'Sideline Recommendation'}
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
            <span className="text-slate-500 font-medium">{lang === 'es' ? 'Atleta:' : 'Athlete:'}</span>
            <span className="font-bold text-slate-900">{athlete.name} (#{athlete.jerseyNumber} • {athlete.sport})</span>
          </div>
        </div>
      </div>

      {/* Emergency Lockdown Notice Banner */}
      {assessment.isEmergencyLockdown && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-950 flex items-start space-x-3 shadow-sm">
          <AlertOctagon className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-red-700">
              {lang === 'es' ? 'Parada de Emergencia Activada' : 'Emergency Stop Triggered'}
            </div>
            <p className="text-xs text-red-900 mt-1 leading-relaxed font-medium">
              {lang === 'es'
                ? 'Las pruebas físicas se omitieron debido a señales de alarma graves. El atleta debe ser evaluado por un médico o entrenador atlético de inmediato.'
                : 'Physical tests were skipped because of serious warning signs. The athlete should be seen by a doctor or athletic trainer immediately.'}
            </p>
          </div>
        </div>
      )}

      {/* Baseline Safety Margin Banner */}
      {triage.hasIndividualBaseline === false && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start space-x-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-800">
              {t.normativePriorApplied}
            </div>
            <p className="text-xs text-amber-900 mt-1 leading-relaxed font-medium">
              {lang === 'es'
                ? 'Este atleta no tiene una línea base de pretemporada registrada. Se aplicó un margen de seguridad más estricto del 15% para proteger al atleta.'
                : 'This athlete does not have a preseason baseline on file. A stricter 15% safety margin was applied to ensure the athlete is protected.'}
            </p>
          </div>
        </div>
      )}

      {/* Triggers Breakdown */}
      {triage.primaryTriggers.length > 0 && (
        <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center space-x-2 text-xs uppercase font-bold text-red-700 mb-3">
            <AlertOctagon className="w-4 h-4" />
            <span>
              {lang === 'es'
                ? `Señales de Alerta y Cambios de Puntaje (${triage.primaryTriggers.length})`
                : `Warning Signs & Score Changes (${triage.primaryTriggers.length})`}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {triage.primaryTriggers.map((trig, idx) => (
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
      )}

      {/* Test Metrics Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Balance Check */}
        <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="text-xs text-slate-600 uppercase tracking-wider font-bold mb-1">
            {lang === 'es' ? 'Prueba 2: Chequeo de Equilibrio' : 'Test 2: Balance Check'}
          </div>
          {balanceScore.skippedReason ? (
            <div className="py-2">
              <span className="text-xs font-bold text-amber-800 px-2 py-0.5 rounded bg-amber-100 border border-amber-300">
                {lang === 'es' ? 'OMITIDO POR SEGURIDAD' : 'SKIPPED FOR SAFETY'}
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
                  <span>{lang === 'es' ? 'Línea Base Pretemporada:' : 'Preseason Baseline:'}</span>
                  <span className="text-slate-900 font-mono font-bold">
                    {(athlete.baselineStabilityIndex || 0.085).toFixed(3)} m/s²
                  </span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-700">{lang === 'es' ? 'Cambio desde Línea Base:' : 'Change from Baseline:'}</span>
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
            {lang === 'es' ? 'Prueba 3: Velocidad de Reacción' : 'Test 3: Reaction Speed'}
          </div>
          {reactionScore.skippedReason ? (
            <div className="py-2">
              <span className="text-xs font-bold text-amber-800 px-2 py-0.5 rounded bg-amber-100 border border-amber-300">
                {lang === 'es' ? 'OMITIDO POR SEGURIDAD' : 'SKIPPED FOR SAFETY'}
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
                  <span>{lang === 'es' ? 'Línea Base Pretemporada:' : 'Preseason Baseline:'}</span>
                  <span className="text-slate-900 font-mono font-bold">
                    {athlete.baselineReactionTimeMs || 230} ms
                  </span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-700">{lang === 'es' ? 'Diferencia de Tiempo:' : 'Time Difference:'}</span>
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

        {/* Metric 3: Vision & Eye Tracking */}
        <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="text-xs text-slate-600 uppercase tracking-wider font-bold mb-1">
            {lang === 'es' ? 'Prueba 4: Prueba de Vista y Lectura' : 'Test 4: Eye & Reading Test'}
          </div>
          {kingDevickScore.skippedReason ? (
            <div className="py-2">
              <span className="text-xs font-bold text-amber-800 px-2 py-0.5 rounded bg-amber-100 border border-amber-300">
                {lang === 'es' ? 'OMITIDO POR SEGURIDAD' : 'SKIPPED FOR SAFETY'}
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
                  <span>{lang === 'es' ? 'Línea Base Pretemporada:' : 'Preseason Baseline:'}</span>
                  <span className="text-slate-900 font-mono font-bold">
                    {(athlete.baselineKingDevickSeconds || 42.0).toFixed(1)} s
                  </span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-700">{lang === 'es' ? 'Diferencia / Errores:' : 'Difference / Errors:'}</span>
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
                          {lang === 'es' ? `Tarjeta ${i + 1}` : `Card ${i + 1}`}
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

      {/* CDC Disclaimer */}
      <div className="p-4 rounded-xl bg-white border border-slate-300 text-xs text-slate-600 leading-relaxed font-medium shadow-sm">
        <strong className="text-slate-900 font-bold">
          {lang === 'es' ? 'Aviso de CDC HEADS UP:' : 'CDC HEADS UP Disclaimer:'}
        </strong>{' '}
        {lang === 'es'
          ? 'SidelineSentry es una herramienta de detección observacional de campo basada en las pautas de CDC HEADS UP, no un dispositivo de diagnóstico médico. Cualquier atleta con sospecha de lesión en la cabeza debe ser evaluado por un médico.'
          : triage.nonDiagnosticDisclaimer}
      </div>

      {/* Action Footer */}
      <div className="flex flex-col gap-2 pt-2">
        {/* Save as Preseason Baseline Option (Healthy Screening Mode) */}
        {onSaveAsBaseline && !isRemoval && !isInvalid && (
          <div>
            {baselineSaved ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold shadow-xs">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {lang === 'es' ? 'Línea Base de Pretemporada Guardada en la Lista' : 'Preseason Baseline Saved to Roster'}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-emerald-700 font-black">
                  {balanceScore.stabilityIndex.toFixed(3)} m/s² • {reactionScore.averageMs}ms
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setBaselineSaved(true);
                  onSaveAsBaseline();
                }}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs transition active:scale-[0.98]"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>
                  {lang === 'es' ? 'Guardar Puntajes como Línea Base de Pretemporada' : "Save Scores as Athlete's Preseason Baseline"}
                </span>
              </button>
            )}
          </div>
        )}

        <button
          onClick={onOpenReport}
          className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition active:scale-[0.98]"
        >
          <FileText className="w-4 h-4" />
          <span>{t.generatePacket}</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onRetest}
            className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.retestBtn}</span>
          </button>
          <button
            onClick={onBackToRoster}
            className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition"
          >
            <span>{t.returnRoster}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
