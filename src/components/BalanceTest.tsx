import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IMotionProvider, MotionFrame } from '../types/clinical';
import { RingBuffer } from '../services/motion/RingBuffer';
import { WaveformCanvas } from './WaveformCanvas';
import { playCountdownPip, playTestStart, playTestComplete, warmAudioContext } from '../services/audio';
import { auditPosturalSway } from '../services/scoring';
import { SimulatedMotionProvider, round3 } from '../services/motion';
import { Play, Zap, CheckCircle2, AlertTriangle, RotateCcw, ShieldAlert } from 'lucide-react';
import { TRANSLATIONS, SupportedLocale } from '../i18n/translations';

interface BalanceTestProps {
  motionProvider: IMotionProvider;
  baselineSway?: number;
  onComplete: (score: {
    durationSeconds: number;
    stabilityIndex: number;
    peakSway: number;
    swayHistory: number[];
    valid: boolean;
    validityReason?: string;
  }) => void;
  onCancel: () => void;
  lang?: SupportedLocale;
}

export const BalanceTest: React.FC<BalanceTestProps> = ({
  motionProvider,
  baselineSway = 0.085,
  onComplete,
  lang = 'en'
}) => {
  const t = TRANSLATIONS[lang];
  const [phase, setPhase] = useState<'idle' | 'countdown' | 'recording' | 'artifact_halted' | 'permission_denied' | 'complete'>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [currentFrame, setCurrentFrame] = useState<MotionFrame>({
    timestamp: 0,
    x: 0,
    y: 0,
    z: 0,
    rms: 0,
    isSimulated: motionProvider.getMode() === 'simulated'
  });

  const [simProfile, setSimProfile] = useState<'healthy' | 'concussed'>('healthy');
  const ringBufferRef = useRef<RingBuffer>(new RingBuffer(256));
  const swayHistoryRef = useRef<number[]>([]);
  const peakSwayRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);

  const isSimulated = motionProvider.getMode() === 'simulated';

  // Synchronize simulation profile with motion provider on mount and state changes
  useEffect(() => {
    if (isSimulated && motionProvider.setSimulationProfile) {
      motionProvider.setSimulationProfile(simProfile);
    }
  }, [isSimulated, motionProvider, simProfile]);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const recordingStartTimeRef = useRef<number>(0);
  const lastUiUpdateRef = useRef<number>(0);
  const halftimeFiredRef = useRef<boolean>(false);

  const handleFrame = useCallback((frame: MotionFrame) => {
    // Throttle UI updates to ~10Hz while buffering at full rate
    const now = Date.now();
    if (now - lastUiUpdateRef.current >= 100) {
      lastUiUpdateRef.current = now;
      setCurrentFrame(frame);
    }

    const elapsedSinceStart = recordingStartTimeRef.current > 0 ? Date.now() - recordingStartTimeRef.current : 0;
    const magnitude = Math.sqrt(frame.x * frame.x + frame.z * frame.z);

    // Wait 500ms for initial sensor reading to stabilize before recording
    if (elapsedSinceStart > 500 || frame.isSimulated) {
      ringBufferRef.current.push(magnitude);
      if (magnitude > peakSwayRef.current) {
        peakSwayRef.current = magnitude;
      }
    }

    // Stop test if phone slips or sudden movement occurs (> 2.5 m/s²)
    if (phaseRef.current === 'recording' && elapsedSinceStart > 500 && magnitude > 2.5) {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      motionProvider.stop();
      playCountdownPip();
      setPhase('artifact_halted');
      return;
    }

    // Downsample recording for summary display
    if (Math.random() < 0.2) {
      swayHistoryRef.current.push(round3(frame.rms));
    }
  }, [motionProvider]);

  // Handle countdown
  useEffect(() => {
    if (phase !== 'countdown') return;

    if (countdown > 0) {
      playCountdownPip();
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Begin recording
      playTestStart();
      setPhase('recording');
      setTimeLeft(15);
      halftimeFiredRef.current = false;
      recordingStartTimeRef.current = Date.now();
      ringBufferRef.current.reset();
      swayHistoryRef.current = [];
      peakSwayRef.current = 0;
      motionProvider.start(handleFrame);
    }
  }, [phase, countdown, motionProvider, handleFrame]);

  // Handle recording timer
  useEffect(() => {
    if (phase !== 'recording') return;

    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev === 8 && !halftimeFiredRef.current) {
          halftimeFiredRef.current = true;
          playCountdownPip();
        }
        if (prev <= 1) {
          if (intervalRef.current !== null) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, [phase]);

  // Handle completion when timer hits 0
  useEffect(() => {
    if (phase === 'recording' && timeLeft === 0) {
      motionProvider.stop();
      playTestComplete();
      setPhase('complete');

      const sessionRms = ringBufferRef.current.getSessionRMS();
      const finalRms = sessionRms > 0 ? sessionRms : ringBufferRef.current.getRMS();
      const validity = auditPosturalSway(finalRms, false, peakSwayRef.current);

      onComplete({
        durationSeconds: 15,
        stabilityIndex: Number(finalRms.toFixed(3)),
        peakSway: Number(peakSwayRef.current.toFixed(3)),
        swayHistory: swayHistoryRef.current.slice(-30),
        valid: validity.valid,
        validityReason: validity.reason
      });
    }
  }, [phase, timeLeft, motionProvider, onComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      motionProvider.stop();
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, [motionProvider]);

  const handleStartCountdown = async () => {
    warmAudioContext();
    // Synchronous user-gesture activation for iOS Safari WebKit permissions
    if (motionProvider.requestPermission) {
      try {
        const granted = await motionProvider.requestPermission();
        if (!granted) {
          setPhase('permission_denied');
          return;
        }
      } catch (err) {
        console.warn('Motion permission request error or prompt dismissed:', err);
        setPhase('permission_denied');
        return;
      }
    }
    setCountdown(3);
    setPhase('countdown');
  };

  const handleRetestStance = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    motionProvider.stop();
    recordingStartTimeRef.current = 0;
    halftimeFiredRef.current = false;
    ringBufferRef.current.reset();
    swayHistoryRef.current = [];
    peakSwayRef.current = 0;
    setTimeLeft(15);
    setCountdown(3);
    setPhase('countdown');
  };

  const handleTriggerLossOfBalance = () => {
    if (motionProvider instanceof SimulatedMotionProvider) {
      motionProvider.triggerPerturbation(1.6); // Concussive ataxia sway spike
    }
  };

  const handleTriggerGripSlip = () => {
    if (motionProvider instanceof SimulatedMotionProvider) {
      motionProvider.triggerPerturbation(3.8); // Phone drop / grip slip (> 2.5 m/s^2)
    }
  };

  return (
    <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-sm relative overflow-hidden">
      {/* Header Strip */}
      <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-2.5 rounded-xl mb-4 shadow-xs">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
            {t.balanceSubtitle}
          </span>
          <h2 className="text-sm font-extrabold tracking-tight">{t.balanceTitle}</h2>
        </div>
        {baselineSway > 0 && (
          <div className="text-right">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
              {t.preseasonTarget || (lang === 'es' ? 'Meta de Pretemporada' : 'Preseason Target')}
            </span>
            <span className="font-mono text-xs font-black text-emerald-400 tabular-nums">
              {baselineSway.toFixed(3)} m/s²
            </span>
          </div>
        )}
      </div>

      {/* Protocol Instructions Box */}
      <div className="mb-5 p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 flex items-start space-x-3 shadow-sm">
        <div className="mt-0.5 text-blue-700 font-black">1.</div>
        <p className="leading-relaxed font-medium">
          {t.balanceInstruction}
        </p>
      </div>

      {/* Live Balance Sway Graph */}
      <div className="mb-6">
        <WaveformCanvas
          ringBuffer={ringBufferRef.current}
          currentRms={currentFrame.rms}
          currentX={currentFrame.x}
          currentY={currentFrame.z}
          isSimulated={isSimulated}
          isActive={phase === 'recording'}
          lang={lang}
        />
      </div>

      {/* Primary Interaction Area */}
      {phase === 'idle' && (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <button
            onClick={handleStartCountdown}
            className="flex items-center space-x-3 px-8 py-3.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-sm transition min-h-[48px]"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>{t.startBalanceTest}</span>
          </button>
          <p className="text-xs text-slate-500 font-medium mt-3">
            {lang === 'es'
              ? 'Requiere audio activado para señales de cuenta regresiva y finalización'
              : 'Requires audio enabled for countdown & completion cues'}
          </p>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
          <div className="text-xs uppercase tracking-widest text-slate-600 font-bold mb-2">
            {lang === 'es' ? 'Prepárese - Coloque Contra el Pecho' : 'Get Ready - Position Against Chest'}
          </div>
          <div className="text-7xl font-black font-mono text-emerald-600 tabular-nums">
            {countdown}
          </div>
        </div>
      )}

      {phase === 'recording' && (
        <div className="flex flex-col items-center justify-center py-4">
          <div className="flex items-center space-x-6 mb-4">
            <div className="text-center">
              <div className="text-[11px] text-slate-600 uppercase font-bold tracking-wider">{t.timeRemaining}</div>
              <div className="text-4xl font-mono font-black text-slate-900 tabular-nums">{timeLeft}s</div>
            </div>
            <div className="h-10 w-[1px] bg-slate-300" />
            <div className="text-center">
              <div className="text-[11px] text-slate-600 uppercase font-bold tracking-wider">{t.liveStability}</div>
              <div
                className={`text-4xl font-mono font-black tabular-nums ${
                  currentFrame.rms > 0.25
                    ? 'text-red-700'
                    : currentFrame.rms > 0.12
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }`}
              >
                {currentFrame.rms.toFixed(3)}
              </div>
            </div>
          </div>

          <div className="w-full max-w-md bg-slate-200 rounded-full h-2.5 overflow-hidden border border-slate-300 mb-4">
            <div
              className="bg-emerald-600 h-2.5 transition-all duration-1000 ease-linear"
              style={{ width: `${((15 - timeLeft) / 15) * 100}%` }}
            />
          </div>

          {/* Interactive Simulation Loss-of-Balance and Grip-Slip Buttons */}
          {isSimulated && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-300">
                <button
                  type="button"
                  onClick={() => {
                    setSimProfile('healthy');
                    motionProvider.setSimulationProfile?.('healthy');
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                    simProfile === 'healthy'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'es' ? 'Saludable (0.08 m/s²)' : 'Healthy (0.08 m/s²)'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimProfile('concussed');
                    motionProvider.setSimulationProfile?.('concussed');
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                    simProfile === 'concussed'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'es' ? 'Conmocionado (0.35 m/s²)' : 'Concussed (0.35 m/s²)'}
                </button>
              </div>
              <button
                type="button"
                onClick={handleTriggerLossOfBalance}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold text-xs transition shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>{lang === 'es' ? 'Simular Inestabilidad (1.6 m/s²)' : 'Simulate Unsteady Balance (1.6 m/s²)'}</span>
              </button>
              <button
                type="button"
                onClick={handleTriggerGripSlip}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-300 hover:bg-red-100 text-red-900 font-bold text-xs transition shadow-sm"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>{lang === 'es' ? 'Simular Deslizamiento (>2.5 m/s²)' : 'Simulate Phone Slip (>2.5 m/s²)'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Real-time Grip-Slip / Motion Artifact Trip Card */}
      {phase === 'artifact_halted' && (
        <div className="flex flex-col items-center justify-center py-6 text-center animate-fade-in bg-red-50 border border-red-300 rounded-xl p-5 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-red-100 border border-red-300 flex items-center justify-center text-red-700 mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            {t.motionSpikeDetected}
          </h3>
          <p className="text-xs text-slate-600 max-w-md mb-4 leading-relaxed font-medium">
            {t.motionSpikeDesc}
          </p>
          <button
            type="button"
            onClick={handleRetestStance}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-sm transition min-h-[44px]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.retestStance}</span>
          </button>
        </div>
      )}

      {phase === 'permission_denied' && (
        <div className="flex flex-col items-center justify-center py-6 text-center animate-fade-in bg-amber-50 border border-amber-300 rounded-xl p-5 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            {lang === 'es' ? 'Permiso de Sensor de Movimiento Requerido' : 'Motion Sensor Permission Required'}
          </h3>
          <p className="text-xs text-slate-600 max-w-md mb-4 leading-relaxed font-medium">
            {lang === 'es'
              ? 'iOS Safari requiere acceso al acelerómetro para medir la oscilación del equilibrio. Por favor conceda permisos de movimiento o recargue el navegador.'
              : 'iOS Safari requires accelerometer access to measure balance sway. Please grant motion permissions or reload the browser.'}
          </p>
          <button
            type="button"
            onClick={handleStartCountdown}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-sm transition min-h-[44px]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{lang === 'es' ? 'Conceder Permiso e Intentar de Nuevo' : 'Grant Permission & Try Again'}</span>
          </button>
        </div>
      )}

      {phase === 'complete' && (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mb-2" />
          <h3 className="text-base font-bold text-slate-900">
            {lang === 'es' ? 'Prueba de Equilibrio Completa' : 'Balance Test Complete'}
          </h3>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            {lang === 'es' ? 'Procesando puntaje de estabilidad...' : 'Processing stability score...'}
          </p>
        </div>
      )}
    </div>
  );
};
