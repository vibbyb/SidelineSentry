import React, { useState, useEffect, useRef } from 'react';
import { playTestStart, playFalseStartBuzz, playTestComplete, warmAudioContext } from '../services/audio';
import { auditReactionTrials } from '../services/scoring';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { TRANSLATIONS, SupportedLocale } from '../i18n/translations';

interface ReactionTestProps {
  baselineMs?: number;
  onComplete: (score: {
    averageMs: number;
    fastestMs: number;
    slowestMs: number;
    trials: number[];
    falseStarts: number;
    valid: boolean;
    validityReason?: string;
  }) => void;
  onCancel: () => void;
  lang?: SupportedLocale;
}

export const ReactionTest: React.FC<ReactionTestProps> = ({
  baselineMs = 230,
  onComplete,
  lang = 'en'
}) => {
  const t = TRANSLATIONS[lang];
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'ready_to_tap' | 'trial_done' | 'complete'>('idle');
  const [currentTrial, setCurrentTrial] = useState<number>(1);
  const [trials, setTrials] = useState<number[]>([]);
  const [falseStarts, setFalseStarts] = useState<number>(0);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const trialsRef = useRef<number[]>(trials);
  trialsRef.current = trials;
  const falseStartsRef = useRef<number>(falseStarts);
  falseStartsRef.current = falseStarts;

  const startTimeRef = useRef<number>(0);
  const timerTimeoutRef = useRef<number | null>(null);
  const isProcessingTapRef = useRef<boolean>(false);

  const startTrial = () => {
    isProcessingTapRef.current = false;
    warmAudioContext();
    setPhase('waiting');
    setFeedbackMessage('');

    // Randomized delay 1500ms to 3500ms to eliminate rhythm anticipation
    const randomDelay = Math.floor(Math.random() * 2000) + 1500;

    timerTimeoutRef.current = window.setTimeout(() => {
      startTimeRef.current = performance.now();
      setPhase('ready_to_tap');
      playTestStart();
    }, randomDelay);
  };

  const handleTap = () => {
    if (isProcessingTapRef.current) return;
    isProcessingTapRef.current = true;

    if (phaseRef.current === 'waiting') {
      // False start / Anticipatory tap before green stimulus
      if (timerTimeoutRef.current !== null) {
        clearTimeout(timerTimeoutRef.current);
      }
      playFalseStartBuzz();
      setFalseStarts(prev => prev + 1);
      setFeedbackMessage(
        lang === 'es'
          ? '¡Demasiado pronto! Tocó antes de que la pantalla se pusiera verde. Reiniciando intento...'
          : 'Too early! You tapped before the screen turned green. Resetting trial...'
      );
      setPhase('idle');
      setTimeout(() => {
        isProcessingTapRef.current = false;
      }, 150);
      return;
    }

    if (phaseRef.current === 'ready_to_tap') {
      const rawElapsed = Math.round(performance.now() - startTimeRef.current);
      const mockElapsed =
        typeof window !== 'undefined'
          ? (window as unknown as { __MOCK_REACTION_MS?: number }).__MOCK_REACTION_MS
          : undefined;
      const elapsed = mockElapsed !== undefined ? mockElapsed : rawElapsed;
      setLastMs(elapsed);

      if (elapsed < 150) {
        playFalseStartBuzz();
        setFalseStarts(prev => prev + 1);
        setFeedbackMessage(
          lang === 'es'
            ? `¡Demasiado rápido! El toque fue de ${elapsed}ms (límite de reacción humana es 150ms). Reiniciando intento...`
            : `Too fast! Tap was ${elapsed}ms (human reaction limit is 150ms). Resetting trial...`
        );
        setPhase('idle');
        setTimeout(() => {
          isProcessingTapRef.current = false;
        }, 150);
        return;
      }

      const updatedTrials = [...trialsRef.current, elapsed];
      setTrials(updatedTrials);

      if (updatedTrials.length >= 3) {
        // Test complete
        setPhase('complete');
        playTestComplete();

        const avg = Math.round(updatedTrials.reduce((s, v) => s + v, 0) / updatedTrials.length);
        const fastest = Math.min(...updatedTrials);
        const slowest = Math.max(...updatedTrials);
        const audit = auditReactionTrials(updatedTrials, falseStartsRef.current);

        onComplete({
          averageMs: avg,
          fastestMs: fastest,
          slowestMs: slowest,
          trials: updatedTrials,
          falseStarts: falseStartsRef.current,
          valid: audit.valid,
          validityReason: audit.reason
        });
      } else {
        setPhase('trial_done');
        setCurrentTrial(prev => prev + 1);
      }

      setTimeout(() => {
        isProcessingTapRef.current = false;
      }, 150);
    } else {
      isProcessingTapRef.current = false;
    }
  };

  useEffect(() => {
    return () => {
      if (timerTimeoutRef.current !== null) clearTimeout(timerTimeoutRef.current);
    };
  }, []);

  // Developer / Automation test hook to trigger verified human reaction speed (~215ms) in headless browsers
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __triggerSidelineReactionTap?: (customMs?: number) => void }).__triggerSidelineReactionTap = (customMs?: number) => {
        if (phaseRef.current === 'ready_to_tap') {
          if (customMs !== undefined) {
            startTimeRef.current = performance.now() - customMs;
          }
          handleTap();
        }
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as unknown as { __triggerSidelineReactionTap?: unknown }).__triggerSidelineReactionTap;
      }
    };
  }, []);

  return (
    <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-sm relative overflow-hidden">
      {/* Clean Athletic Target Strip (Replaces AI-template icon box header) */}
      <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-2.5 rounded-xl mb-4 shadow-xs">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
            {t.reactionSubtitle}
          </span>
          <h2 className="text-sm font-extrabold tracking-tight">{t.reactionTitle}</h2>
        </div>
        {baselineMs > 0 && (
          <div className="text-right">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
              {t.preseasonTarget || (lang === 'es' ? 'Meta de Pretemporada' : 'Preseason Target')}
            </span>
            <span className="font-mono text-xs font-black text-blue-400 tabular-nums">
              {baselineMs} ms
            </span>
          </div>
        )}
      </div>

      {/* Trial Counter & Status */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center space-x-2">
          {[1, 2, 3].map(num => (
            <div
              key={num}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold border ${
                trials.length >= num
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                  : currentTrial === num
                  ? 'bg-blue-100 border-blue-400 text-blue-800'
                  : 'bg-slate-100 border-slate-300 text-slate-600'
              }`}
            >
              {num}
            </div>
          ))}
          <span className="text-xs text-slate-600 ml-2 font-medium">
            {lang === 'es' ? `Intento ${Math.min(currentTrial, 3)} de 3` : `Trial ${Math.min(currentTrial, 3)} of 3`}
          </span>
        </div>

        {falseStarts > 0 && (
          <div className="flex items-center space-x-1 text-xs text-amber-800 font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>{lang === 'es' ? 'Toques Anticipados' : 'False Starts'}: {falseStarts}</span>
          </div>
        )}
      </div>

      {feedbackMessage && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-300 text-xs text-red-700 font-bold shadow-sm">
          {feedbackMessage}
        </div>
      )}

      {/* Visually-hidden live region for screen-reader stimulus alert */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {phase === 'ready_to_tap'
          ? (lang === 'es' ? '¡Verde! Toque la pantalla ahora.' : 'Green! Tap screen now.')
          : ''}
      </div>

      {/* Tap Target Zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label={
          phase === 'ready_to_tap'
            ? (lang === 'es' ? '¡Verde! Toque ahora en la pantalla' : 'Green! Tap anywhere on screen')
            : phase === 'waiting'
            ? (lang === 'es' ? 'Esperando luz verde. No toque todavía.' : 'Waiting for green. Do not tap yet.')
            : (lang === 'es' ? 'Zona de prueba de tiempo de reacción' : 'Reaction test target zone')
        }
        onPointerDown={(e) => {
          if (phaseRef.current === 'waiting' || phaseRef.current === 'ready_to_tap') {
            e.preventDefault();
            handleTap();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (phaseRef.current === 'waiting' || phaseRef.current === 'ready_to_tap') {
              handleTap();
            }
          }
        }}
        className={`w-full h-64 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-100 select-none border shadow-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 ${
          phase === 'ready_to_tap'
            ? 'bg-emerald-500 border-emerald-700 text-white font-bold scale-[1.005]'
            : phase === 'waiting'
            ? 'bg-amber-50 border-amber-300 text-amber-950'
            : 'bg-slate-50 border-slate-300 hover:border-slate-400'
        }`}
      >
        {phase === 'idle' && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              startTrial();
            }}
            onPointerDown={e => e.stopPropagation()}
            className="px-6 py-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-sm transition min-h-[44px]"
          >
            {t.startTrial} {currentTrial}
          </button>
        )}

        {phase === 'waiting' && (
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest text-amber-800 font-bold mb-2">{t.waitForGreen}</div>
            <div className="text-sm font-bold text-slate-700">{lang === 'es' ? 'NO TOQUE TODAVÍA' : 'DO NOT TAP YET'}</div>
          </div>
        )}

        {phase === 'ready_to_tap' && (
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase drop-shadow">{t.tapNow}</div>
            <div className="text-xs font-bold text-emerald-100 mt-1">
              {lang === 'es' ? 'TOQUE EN CUALQUIER LUGAR' : 'TAP ANYWHERE ON SCREEN'}
            </div>
          </div>
        )}

        {phase === 'trial_done' && (
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-slate-600 mb-1 font-bold">
              {lang === 'es' ? `Tiempo del Intento ${currentTrial - 1}` : `Trial ${currentTrial - 1} Time`}
            </div>
            <div className="text-4xl font-black font-mono text-blue-700 mb-4 tabular-nums">{lastMs} ms</div>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                startTrial();
              }}
              onPointerDown={e => e.stopPropagation()}
              className="px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-sm transition min-h-[44px]"
            >
              {t.nextTrial} ({currentTrial}/3)
            </button>
          </div>
        )}

        {phase === 'complete' && (
          <div className="text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <div className="text-base font-bold text-slate-900">
              {lang === 'es' ? 'Intentos Completados' : 'Trials Complete'}
            </div>
            <div className="text-xs text-slate-600 mt-1 font-medium">
              {lang === 'es' ? 'Calculando estadísticas de reacción...' : 'Computing reaction statistics...'}
            </div>
          </div>
        )}
      </div>

      {/* Trial Results Strip with Live Baseline Delta Badges */}
      {trials.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {trials.map((ms, idx) => {
            const diff = baselineMs > 0 ? ms - baselineMs : 0;
            return (
              <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center shadow-sm">
                <div className="text-[10px] text-slate-600 uppercase font-bold">
                  {lang === 'es' ? `Intento ${idx + 1}` : `Trial ${idx + 1}`}
                </div>
                <div className="text-base font-bold font-mono text-slate-900 mt-0.5 tabular-nums">{ms} ms</div>
                {baselineMs > 0 && (
                  <div className={`text-[10px] font-mono font-bold mt-0.5 ${diff > 20 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {diff >= 0 ? `+${diff}ms` : `${diff}ms`} vs base
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
