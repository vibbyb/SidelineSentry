import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, ChevronRight, Plus, Minus } from 'lucide-react';
import { playTestStart, playTestComplete, warmAudioContext } from '../services/audio';
import { TRANSLATIONS, SupportedLocale } from '../i18n/translations';

interface KingDevickTestProps {
  baselineSeconds?: number;
  onComplete: (score: {
    durationSeconds: number;
    errorsCount: number;
    completed: boolean;
    cardSplits?: number[];
    valid?: boolean;
    validityReason?: string;
  }) => void;
  onCancel: () => void;
  lang?: SupportedLocale;
}

// Standardized 5x5 Number Cards
const PLATES = [
  {
    id: 1,
    title: 'Card 1: Guided Lines',
    titleEs: 'Tarjeta 1: Líneas Guía',
    hasLines: true,
    rows: [
      ['2', '5', '8', '0', '7'],
      ['3', '7', '9', '4', '2'],
      ['5', '3', '8', '1', '6'],
      ['1', '9', '2', '8', '5'],
      ['4', '6', '3', '7', '9']
    ]
  },
  {
    id: 2,
    title: 'Card 2: Number Grid',
    titleEs: 'Tarjeta 2: Cuadrícula Numérica',
    hasLines: false,
    rows: [
      ['3', '8', '1', '7', '4'],
      ['7', '9', '3', '0', '2'],
      ['6', '4', '8', '5', '1'],
      ['5', '2', '7', '4', '8'],
      ['1', '6', '2', '9', '3']
    ]
  },
  {
    id: 3,
    title: 'Card 3: Compact Grid',
    titleEs: 'Tarjeta 3: Cuadrícula Compacta',
    hasLines: false,
    rows: [
      ['5', '4', '1', '8', '0'],
      ['4', '6', '3', '5', '9'],
      ['7', '5', '4', '2', '7'],
      ['3', '2', '6', '9', '4'],
      ['1', '4', '7', '5', '3']
    ]
  }
];

export const KingDevickTest: React.FC<KingDevickTestProps> = ({
  baselineSeconds = 42.0,
  onComplete,
  lang = 'en'
}) => {
  const t = TRANSLATIONS[lang];
  const [phase, setPhase] = useState<'intro' | 'testing' | 'complete'>('intro');
  const [plateIndex, setPlateIndex] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [errorsCount, setErrorsCount] = useState<number>(0);
  const [cardSplits, setCardSplits] = useState<number[]>([]);

  const startTimeRef = useRef<number>(0);
  const cardStartTimeRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  const startTest = () => {
    warmAudioContext();
    setPhase('testing');
    setPlateIndex(0);
    setErrorsCount(0);
    setElapsedSeconds(0);
    setCardSplits([]);
    const now = performance.now();
    startTimeRef.current = now;
    cardStartTimeRef.current = now;
    lastTapTimeRef.current = now;
    playTestStart();

    timerRef.current = window.setInterval(() => {
      const currentNow = performance.now();
      setElapsedSeconds(Number(((currentNow - startTimeRef.current) / 1000).toFixed(1)));
    }, 100);
  };

  const handleNextPlate = () => {
    const now = performance.now();
    // 400ms transition debounce to prevent accidental double-tap card skipping
    if (now - lastTapTimeRef.current < 400) return;
    lastTapTimeRef.current = now;

    const splitDuration = Number(((now - cardStartTimeRef.current) / 1000).toFixed(1));
    const updatedSplits = [...cardSplits, splitDuration];
    setCardSplits(updatedSplits);
    cardStartTimeRef.current = now;

    if (plateIndex < PLATES.length - 1) {
      setPlateIndex(prev => prev + 1);
    } else {
      // Completed all 3 plates
      if (timerRef.current !== null) clearInterval(timerRef.current);
      const totalSeconds = Number(((now - startTimeRef.current) / 1000).toFixed(1));
      setElapsedSeconds(totalSeconds);
      setPhase('complete');
      playTestComplete();

      onComplete({
        durationSeconds: totalSeconds,
        errorsCount,
        completed: true,
        cardSplits: updatedSplits,
        valid: totalSeconds >= 12.0,
        validityReason:
          totalSeconds < 12.0
            ? (lang === 'es'
                ? 'Lectura completada anormalmente rápido (<12.0s). El atleta debe leer todos los dígitos en voz alta.'
                : 'Reading completed unnaturally fast (<12.0s). Athlete must read all digits aloud.')
            : undefined
      });
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, []);

  const currentPlate = PLATES[plateIndex];

  return (
    <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-sm relative overflow-hidden">
      {/* Clean Athletic Target Strip (Replaces AI-template icon box header) */}
      <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-2.5 rounded-xl mb-4 shadow-xs">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
            {t.kdSubtitle}
          </span>
          <h2 className="text-sm font-extrabold tracking-tight">{t.kdTitle}</h2>
        </div>
        {baselineSeconds > 0 && (
          <div className="text-right">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
              {t.preseasonTarget || (lang === 'es' ? 'Meta de Pretemporada' : 'Preseason Target')}
            </span>
            <span className="font-mono text-xs font-black text-indigo-400 tabular-nums">
              {baselineSeconds.toFixed(1)} s
            </span>
          </div>
        )}
      </div>

      {phase === 'intro' && (
        <div className="space-y-4 py-4">
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 leading-relaxed font-medium shadow-sm">
            <strong className="text-blue-950 font-bold">{lang === 'es' ? 'Instrucciones:' : 'Instructions:'}</strong>{' '}
            {lang === 'es'
              ? 'Indique al atleta que lea los números de izquierda a derecha, línea por línea, tan rápido como pueda sin cometer errores. Toque "Siguiente Tarjeta" tan pronto termine cada tarjeta.'
              : 'Tell the athlete to read the numbers from left-to-right, line-by-line as fast as they can without mistakes. Tap "Next Card" as soon as they finish each card.'}
          </div>

          <div className="flex justify-center pt-4">
            <button
              onClick={startTest}
              className="px-8 py-3.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-sm transition min-h-[48px]"
            >
              {t.startKdClock}
            </button>
          </div>
        </div>
      )}

      {phase === 'testing' && (
        <div>
          {/* Status Bar */}
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-indigo-700">
                {lang === 'es' ? `Tarjeta ${plateIndex + 1} de 3` : `Card ${plateIndex + 1} of 3`}
              </span>
              <span className="text-xs text-slate-600 font-medium">
                ({lang === 'es' ? currentPlate.titleEs : currentPlate.title})
              </span>
            </div>

            <div className="flex items-center space-x-3">
              {errorsCount > 0 && (
                <div className="flex items-center space-x-1.5 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg">
                  <span className="text-[10px] text-red-700 uppercase font-bold">{t.errorsLabel}:</span>
                  <span className="font-mono text-xs font-black text-red-800 tabular-nums">{errorsCount}</span>
                  <button
                    type="button"
                    onClick={() => setErrorsCount(prev => Math.max(0, prev - 1))}
                    className="min-h-[44px] min-w-[44px] rounded-lg bg-white hover:bg-red-100 border border-red-300 flex items-center justify-center p-2.5 text-red-700 transition ml-1"
                    title={lang === 'es' ? 'Deshacer error' : 'Undo mistake'}
                    aria-label={lang === 'es' ? 'Deshacer error' : 'Undo mistake'}
                  >
                    <Minus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              )}
              <div className="font-mono text-xl font-black text-indigo-700 tabular-nums">
                {elapsedSeconds.toFixed(1)}s
              </div>
            </div>
          </div>

          {/* Number Card: High-Contrast Athletic Paper Plate */}
          <div className="bg-white border-2 border-slate-900 rounded-xl p-4 sm:p-6 mb-4 shadow-sm relative overflow-hidden">
            <div className="space-y-3 sm:space-y-4">
              {currentPlate.rows.map((row, rowIdx) => (
                <div key={rowIdx} className="relative flex justify-between items-center py-2 px-2 sm:px-6">
                  {currentPlate.hasLines && (
                    <div className="absolute inset-x-2 sm:inset-x-6 top-1/2 -translate-y-1/2 h-[1.5px] bg-slate-300 z-0" />
                  )}
                  {row.map((num, colIdx) => (
                    <span
                      key={colIdx}
                      className="relative z-10 text-2xl sm:text-3xl md:text-4xl font-mono font-black text-slate-900 cursor-default select-none tabular-nums"
                    >
                      {num}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Dual Thumb Action Bar */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setErrorsCount(prev => prev + 1)}
              className="flex items-center justify-center space-x-2 py-3.5 px-2 rounded-xl bg-red-50 hover:bg-red-100 border-2 border-red-300 text-red-800 font-bold text-xs transition active:scale-95 min-h-[48px]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{lang === 'es' ? 'Registrar Error' : 'Log Reading Mistake'} ({errorsCount})</span>
            </button>
            <button
              type="button"
              onClick={handleNextPlate}
              className="flex items-center justify-center space-x-2 py-3.5 px-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-sm transition active:scale-95 min-h-[48px]"
            >
              <span>{plateIndex === PLATES.length - 1 ? t.finishTest : t.nextPlate}</span>
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {phase === 'complete' && (
        <div className="py-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-indigo-700 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-900">
            {lang === 'es' ? 'Prueba de Rastreo Ocular Completa' : 'Eye Tracking Test Complete'}
          </h3>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            {lang === 'es'
              ? `Tiempo Total de Lectura: ${elapsedSeconds.toFixed(1)}s • Errores: ${errorsCount}`
              : `Total Reading Time: ${elapsedSeconds.toFixed(1)}s • Errors: ${errorsCount}`}
          </p>
          {cardSplits.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2 max-w-xs mx-auto">
              {cardSplits.map((split, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center shadow-xs">
                  <div className="text-[9px] uppercase font-bold text-slate-500">
                    {lang === 'es' ? `Tarjeta ${i + 1}` : `Card ${i + 1}`}
                  </div>
                  <div className="font-mono text-sm font-black text-indigo-900 tabular-nums mt-0.5">{split.toFixed(1)}s</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
