import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IMotionProvider, MotionFrame } from '../types/clinical';
import { RingBuffer } from '../services/motion/RingBuffer';
import { WaveformCanvas } from './WaveformCanvas';
import { playCountdownPip, playTestStart, playTestComplete, warmAudioContext } from '../services/audio';
import { auditPosturalSway } from '../services/scoring';
import { SimulatedMotionProvider, round3 } from '../services/motion';
import { Volume2, VolumeX, Play, CheckCircle2, AlertTriangle, RotateCcw, ShieldAlert, ArrowLeft } from 'lucide-react';
import { TRANSLATIONS, SupportedLocale } from '../i18n/translations';
import { TEST_ASSIST_TEXT } from '../i18n/testAssist';
import { isVoiceSupported, getVoiceEnabled, setVoiceEnabled, cancelVoice, speakInstruction } from '../services/speech';

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
  onCancel,
  lang = 'en'
}) => {
  const t = TRANSLATIONS[lang];
  const testAssist = TEST_ASSIST_TEXT[lang];
  const [phase, setPhase] = useState<'idle' | 'countdown' | 'recording' | 'artifact_halted' | 'permission_denied' | 'complete'>('idle');
  const [voiceSupported] = useState<boolean>(() => isVoiceSupported());
  const [voiceEnabled, setVoiceEnabledState] = useState<boolean>(() => getVoiceEnabled());
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
  const [activeProvider, setActiveProvider] = useState<IMotionProvider>(motionProvider);
  const ringBufferRef = useRef<RingBuffer>(new RingBuffer(256));
  const swayHistoryRef = useRef<number[]>([]);
  const peakSwayRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const completedRef = useRef<boolean>(false);

  const isSimulated = activeProvider.getMode() === 'simulated';

  const hasSpokenSetupRef = useRef<boolean>(false);
  const hasSpokenRecordingRef = useRef<boolean>(false);
  const hasSpokenCompleteRef = useRef<boolean>(false);

  // Setup instructions speech
  useEffect(() => {
    if (phase === 'idle' && voiceEnabled && !hasSpokenSetupRef.current) {
      hasSpokenSetupRef.current = true;
      speakInstruction(testAssist.balanceInstructionVoice, lang);
    }
  }, [phase, voiceEnabled, lang, testAssist.balanceInstructionVoice]);

  // Recording start cue speech
  useEffect(() => {
    if (phase === 'recording' && voiceEnabled && !hasSpokenRecordingRef.current) {
      hasSpokenRecordingRef.current = true;
      speakInstruction(testAssist.balanceHoldStill, lang);
    }
  }, [phase, voiceEnabled, lang, testAssist.balanceHoldStill]);

  // Completion cue speech
  useEffect(() => {
    if (phase === 'complete' && voiceEnabled && !hasSpokenCompleteRef.current) {
      hasSpokenCompleteRef.current = true;
      speakInstruction(testAssist.balanceTestComplete, lang);
    }
  }, [phase, voiceEnabled, lang, testAssist.balanceTestComplete]);

  const handleToggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    setVoiceEnabledState(next);
    if (next && phase === 'idle') {
      hasSpokenSetupRef.current = true;
      speakInstruction(testAssist.balanceInstructionVoice, lang);
    }
  };

  useEffect(() => {
    if (isSimulated && activeProvider.setSimulationProfile) {
      activeProvider.setSimulationProfile(simProfile);
    }
  }, [isSimulated, activeProvider, simProfile]);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const recordingStartTimeRef = useRef<number>(0);
  const lastUiUpdateRef = useRef<number>(0);
  const halftimeFiredRef = useRef<boolean>(false);

  const handleFrame = useCallback((frame: MotionFrame) => {
    // Throttle UI re-renders to ~10Hz while buffering samples at 60Hz
    const now = Date.now();
    if (now - lastUiUpdateRef.current >= 100) {
      lastUiUpdateRef.current = now;
      setCurrentFrame(frame);
    }

    const elapsedSinceStart = recordingStartTimeRef.current > 0 ? Date.now() - recordingStartTimeRef.current : 0;
    const magnitude = Math.sqrt(frame.x * frame.x + frame.z * frame.z);

    if (elapsedSinceStart > 500 || frame.isSimulated) {
      ringBufferRef.current.push(magnitude);
      if (magnitude > peakSwayRef.current) {
        peakSwayRef.current = magnitude;
      }
    }

    // Sudden movement trip threshold (> 2.5 m/s² phone slip or grip shift)
    if (phaseRef.current === 'recording' && elapsedSinceStart > 500 && magnitude > 2.5) {
      cancelVoice();
      phaseRef.current = 'artifact_halted';
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      activeProvider.stop();
      playCountdownPip();
      setPhase('artifact_halted');
      return;
    }

    // Downsample recording history for the summary report
    if (Math.random() < 0.2) {
      swayHistoryRef.current.push(round3(frame.rms));
    }
  }, [activeProvider]);

  // Handle countdown
  useEffect(() => {
    if (phase !== 'countdown') return;

    if (countdown > 0) {
      playCountdownPip();
      countdownTimerRef.current = window.setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => {
        if (countdownTimerRef.current !== null) {
          clearTimeout(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
      };
    } else {
      // Start recording
      playTestStart();
      setPhase('recording');
      setTimeLeft(15);
      halftimeFiredRef.current = false;
      recordingStartTimeRef.current = Date.now();
      ringBufferRef.current.reset();
      swayHistoryRef.current = [];
      peakSwayRef.current = 0;
      activeProvider.start(handleFrame);
    }
  }, [phase, countdown, activeProvider, handleFrame]);

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
          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [phase]);

  // Handle completion when countdown reaches zero
  useEffect(() => {
    if (phase === 'recording' && timeLeft === 0) {
      if (completedRef.current) return;
      completedRef.current = true;

      activeProvider.stop();
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
  }, [phase, timeLeft, activeProvider, onComplete]);

  // Cleanup timers and sensor callbacks on unmount
  useEffect(() => {
    return () => {
      cancelVoice();
      activeProvider.stop();
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (countdownTimerRef.current !== null) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [activeProvider]);

  const handleStartCountdown = async () => {
    cancelVoice();
    completedRef.current = false;
    warmAudioContext();

    if (activeProvider.requestPermission) {
      try {
        const granted = await activeProvider.requestPermission();
        if (!granted) {
          setPhase('permission_denied');
          return;
        }
      } catch (err) {
        console.warn('Motion permission request error:', err);
        setPhase('permission_denied');
        return;
      }
    }
    setCountdown(3);
    setPhase('countdown');
  };

  const handleRetestStance = () => {
    cancelVoice();
    completedRef.current = false;
    hasSpokenSetupRef.current = false;
    hasSpokenRecordingRef.current = false;
    hasSpokenCompleteRef.current = false;
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    activeProvider.stop();
    recordingStartTimeRef.current = 0;
    halftimeFiredRef.current = false;
    ringBufferRef.current.reset();
    swayHistoryRef.current = [];
    peakSwayRef.current = 0;
    setTimeLeft(15);
    setCountdown(3);
    setPhase('countdown');
  };

  const handleSwitchToSimulated = () => {
    cancelVoice();
    const sim = new SimulatedMotionProvider(simProfile);
    setActiveProvider(sim);
    completedRef.current = false;
    hasSpokenSetupRef.current = false;
    setPhase('idle');
  };

  const handleCancel = () => {
    cancelVoice();
    activeProvider.stop();
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (countdownTimerRef.current !== null) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    onCancel();
  };

  return (
    <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-2.5 rounded-xl mb-4 shadow-xs">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
            {t.balanceSubtitle}
          </span>
          <h2 className="text-sm font-extrabold tracking-tight">{t.balanceTitle}</h2>
        </div>
        <div className="flex items-center space-x-3">
          {voiceSupported && (
            <button
              type="button"
              onClick={handleToggleVoice}
              aria-label={voiceEnabled ? testAssist.voiceGuidanceDisable : testAssist.voiceGuidanceEnable}
              aria-pressed={voiceEnabled}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border transition ${
                voiceEnabled
                  ? 'bg-blue-600 border-blue-400 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          )}
          {baselineSway > 0 && (
            <div className="text-right">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                {t.preseasonTarget}
              </span>
              <span className="font-mono text-xs font-black text-emerald-400 tabular-nums">
                {baselineSway.toFixed(3)} m/s²
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-5 p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 flex items-start space-x-3 shadow-sm">
        <div className="mt-0.5 text-blue-700 font-black">1.</div>
        <p className="leading-relaxed font-medium">
          {t.balanceInstruction}
        </p>
      </div>

      {isSimulated && (
        <div className="mb-5 p-3.5 rounded-xl bg-slate-50 border border-slate-300 shadow-xs">
          <label className="text-xs font-bold text-slate-800 block mb-2">
            {testAssist.simulationModeLabel}
          </label>
          <div className="inline-flex rounded-lg border border-slate-300 p-1 bg-white shadow-xs">
            <button
              type="button"
              disabled={phase === 'countdown' || phase === 'recording'}
              aria-pressed={simProfile === 'healthy'}
              onClick={() => {
                setSimProfile('healthy');
                activeProvider.setSimulationProfile?.('healthy');
              }}
              className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-md transition flex items-center justify-center ${
                simProfile === 'healthy'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              } ${phase === 'countdown' || phase === 'recording' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {testAssist.healthyAthlete}
            </button>
            <button
              type="button"
              disabled={phase === 'countdown' || phase === 'recording'}
              aria-pressed={simProfile === 'concussed'}
              onClick={() => {
                setSimProfile('concussed');
                activeProvider.setSimulationProfile?.('concussed');
              }}
              className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-md transition flex items-center justify-center ${
                simProfile === 'concussed'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              } ${phase === 'countdown' || phase === 'recording' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {testAssist.concussedAthlete}
            </button>
          </div>
        </div>
      )}

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
            {t.balanceAudioNotice}
          </p>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
          <div className="text-xs uppercase tracking-widest text-slate-600 font-bold mb-2">
            {t.getReadyChest}
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
        </div>
      )}

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
            {t.motionPermissionTitle}
          </h3>
          <p className="text-xs text-slate-600 max-w-md mb-4 leading-relaxed font-medium">
            {t.motionPermissionDesc}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleStartCountdown}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-sm transition min-h-[44px]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t.grantPermissionRetry}</span>
            </button>
            <button
              type="button"
              onClick={handleSwitchToSimulated}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold text-xs transition min-h-[44px]"
            >
              <span>{t.useSimulatedFallback}</span>
            </button>
          </div>
        </div>
      )}

      {phase === 'complete' && (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mb-2" />
          <h3 className="text-base font-bold text-slate-900">
            {t.balanceTestCompleteTitle}
          </h3>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            {t.processingStability}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={handleCancel}
          className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition min-h-[44px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t.cancelScreening}</span>
        </button>
      </div>
    </div>
  );
};
