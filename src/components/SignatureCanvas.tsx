import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, PenTool } from 'lucide-react';
import { TRANSLATIONS, SupportedLocale } from '../i18n/translations';

interface SignatureCanvasProps {
  onChange: (signatureDataUrl: string | null) => void;
  label?: string;
  clearLabel?: string;
  initialSignature?: string | null;
  lang?: SupportedLocale;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onChange,
  label,
  clearLabel,
  initialSignature,
  lang = 'en'
}) => {
  const t = TRANSLATIONS[lang];
  const displayLabel = label ?? t.signatureCanvasLabel;
  const displayClearLabel = clearLabel ?? t.clearSignatureLabel;
  const ariaLabel = t.signatureAriaLabel;
  const helperText = t.signatureHelper;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasDrawn, setHasDrawn] = useState<boolean>(Boolean(initialSignature));
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastWidthRef = useRef<number>(0);
  const hasDrawnRef = useRef<boolean>(Boolean(initialSignature));
  hasDrawnRef.current = hasDrawn;

  const initCanvas = useCallback((force: boolean = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    if (!force && lastWidthRef.current > 0 && Math.abs(rect.width - lastWidthRef.current) < 5) {
      return;
    }

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    let savedData: string | null = null;
    if (canvas.width > 0 && canvas.height > 0 && hasDrawnRef.current) {
      savedData = canvas.toDataURL('image/png');
    } else if (initialSignature && !hasDrawnRef.current) {
      savedData = initialSignature;
    }

    lastWidthRef.current = rect.width;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Baseline guide for signing
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, rect.height - 24);
    ctx.lineTo(rect.width - 20, rect.height - 24);
    ctx.stroke();
    ctx.setLineDash([]);

    if (savedData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = savedData;
    }
  }, [initialSignature]);

  useEffect(() => {
    initCanvas(true);
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') {
      const handleResize = () => initCanvas(false);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }

    const observer = new ResizeObserver(() => {
      initCanvas(false);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [initCanvas]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      if (typeof canvas.setPointerCapture === 'function') {
        canvas.setPointerCapture(e.pointerId);
      }
    } catch {
      // Safe fallback for pointer emulation
    }

    const pt = getCanvasPoint(e);
    lastPointRef.current = pt;
    setIsDrawing(true);
    setHasDrawn(true);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(pt.x + 0.1, pt.y + 0.1);
    ctx.stroke();

    onChange(canvas.toDataURL('image/png'));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPointRef.current) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentPt = getCanvasPoint(e);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentPt.x, currentPt.y);
    ctx.stroke();

    lastPointRef.current = currentPt;
    setHasDrawn(true);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        if (typeof canvas.releasePointerCapture === 'function' && canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Safe fallback
      }
    }
    setIsDrawing(false);
    lastPointRef.current = null;

    if (canvas) {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const handleClear = () => {
    setHasDrawn(false);
    hasDrawnRef.current = false;
    initCanvas(true);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <label className="font-bold text-slate-800 flex items-center space-x-1.5">
          <PenTool className="w-3.5 h-3.5 text-blue-700" />
          <span>{displayLabel}</span>
        </label>
        {hasDrawn && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center space-x-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded hover:bg-slate-100 transition min-h-[44px]"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{displayClearLabel}</span>
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative w-full h-28 rounded-lg overflow-hidden border border-slate-300 bg-white focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition shadow-sm"
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={ariaLabel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-full block cursor-crosshair touch-none"
          style={{ touchAction: 'none' }}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-sans select-none">
            {helperText}
          </div>
        )}
      </div>
    </div>
  );
};
