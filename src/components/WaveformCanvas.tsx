import React, { useEffect, useRef } from 'react';
import { RingBuffer } from '../services/motion/RingBuffer';
import { SupportedLocale } from '../i18n/translations';

interface WaveformCanvasProps {
  ringBuffer: RingBuffer;
  currentRms: number;
  currentX: number;
  currentY: number;
  isSimulated?: boolean;
  isActive?: boolean;
  lang?: SupportedLocale;
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  ringBuffer,
  currentRms,
  currentX,
  currentY,
  isSimulated,
  isActive = true,
  lang = 'en'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetBufferRef = useRef<Float32Array>(new Float32Array(256));
  const metricsRef = useRef({ currentRms, currentX, currentY });
  metricsRef.current = { currentRms, currentX, currentY };

  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const logicalWidth = 600;
      const logicalHeight = 180;

      if (canvas.width !== Math.round(logicalWidth * dpr) || canvas.height !== Math.round(logicalHeight * dpr)) {
        canvas.width = Math.round(logicalWidth * dpr);
        canvas.height = Math.round(logicalHeight * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const { currentRms: rms, currentX: cX, currentY: cY } = metricsRef.current;

      const width = logicalWidth;
      const height = logicalHeight;
      const baselineY = height - 24;

      // 1. Daylight clinical paper background with subtle grid
      ctx.fillStyle = '#f8fafc'; // Clean slate-50 background
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = '#e2e8f0'; // Subtle slate-200 grid
      ctx.lineWidth = 1;

      // Horizontal baseline (zero planar sway)
      ctx.beginPath();
      ctx.moveTo(0, baselineY);
      ctx.lineTo(width, baselineY);
      ctx.stroke();

      // Clinical elevated sway threshold (0.22 m/s² removal / 0.12 m/s² evaluation)
      const scaleY = (height - 48) / 1.5; // Scale 0 to 1.5 m/s² across canvas height
      const thresholdY = baselineY - 0.22 * scaleY;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, thresholdY);
      ctx.lineTo(width, thresholdY);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Copy circular history without allocations
      const history = targetBufferRef.current;
      const count = ringBuffer.copyOrdered(history);

      if (count > 1) {
        // High-contrast daylight trace colors
        let strokeColor = '#059669'; // Saturated emerald green (normal)
        if (rms > 0.25) {
          strokeColor = '#dc2626'; // High-visibility red (severe sway / ataxia)
        } else if (rms > 0.12) {
          strokeColor = '#d97706'; // Athletic amber (elevated sway)
        }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.beginPath();

        const stepX = width / ringBuffer.getCapacity();

        for (let i = 0; i < count; i++) {
          const val = history[i];
          const x = i * stepX;
          // Invert y so higher sway rises up from baselineY
          const clampedVal = Math.min(Math.max(0, val), 1.5);
          const y = baselineY - clampedVal * scaleY;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 3. Mini 2D Sway Reticle (Center of Gravity target in top-left)
      const reticleX = 45;
      const reticleY = 45;
      const reticleRadius = 28;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.arc(reticleX, reticleY, reticleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Crosshairs
      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(reticleX - reticleRadius, reticleY);
      ctx.lineTo(reticleX + reticleRadius, reticleY);
      ctx.moveTo(reticleX, reticleY - reticleRadius);
      ctx.lineTo(reticleX, reticleY + reticleRadius);
      ctx.stroke();

      // Center of gravity dot
      const dotX = Math.min(reticleX + reticleRadius - 4, Math.max(reticleX - reticleRadius + 4, reticleX + cX * 25));
      const dotY = Math.min(reticleY + reticleRadius - 4, Math.max(reticleY - reticleRadius + 4, reticleY - cY * 25));

      ctx.fillStyle = rms > 0.25 ? '#dc2626' : '#059669';
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fill();

      if (isActive) {
        animId = requestAnimationFrame(render);
      }
    };

    if (isActive) {
      animId = requestAnimationFrame(render);
    } else {
      render();
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [ringBuffer, isActive]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-300 bg-slate-50 shadow-sm">
      <canvas
        ref={canvasRef}
        width={600}
        height={180}
        className="w-full h-44 block"
      />
      <div className="absolute top-2.5 right-3 flex items-center space-x-2">
        {isSimulated && (
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
            {lang === 'es' ? 'Reproducción Simulada 60Hz' : 'Simulated 60Hz Replay'}
          </span>
        )}
        <div className="px-2.5 py-1 rounded-lg bg-white/95 border border-slate-300 text-right shadow-sm backdrop-blur-sm">
          <div className="text-[10px] text-slate-600 uppercase font-bold tracking-wider">
            {lang === 'es' ? 'Índice de Estabilidad (RMS)' : 'Stability Index (RMS)'}
          </div>
          <div
            className={`font-mono text-sm font-bold tabular-nums ${
              currentRms > 0.25
                ? 'text-red-700'
                : currentRms > 0.12
                ? 'text-amber-700'
                : 'text-emerald-700'
            }`}
          >
            {currentRms.toFixed(3)} <span className="text-[10px] text-slate-600 font-normal">m/s²</span>
          </div>
        </div>
      </div>
      <div className="absolute bottom-2.5 left-3 text-[11px] text-slate-600 font-mono tracking-wide font-medium">
        {lang === 'es'
          ? 'Gráfico de Equilibrio en Vivo • Sensor de Movimiento 60Hz (256 muestras)'
          : 'Live Balance Sway Graph • 60Hz Motion Sensor (256 samples)'}
      </div>
    </div>
  );
};
