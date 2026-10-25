import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, PenTool } from 'lucide-react';
import { TRANSLATIONS, SupportedLocale } from '../i18n/translations';

interface SignatureCanvasProps {
  onChange?: (signatureDataUrl: string | null) => void;
  onSignatureChange?: (signatureDataUrl: string) => void;
  label?: string;
  clearLabel?: string;
  initialSignature?: string | null;
  lang?: SupportedLocale;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onChange,
  onSignatureChange,
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
  const isDrawingRef = useRef<boolean>(false);
  const [hasDrawn, setHasDrawn] = useState<boolean>(Boolean(initialSignature));
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastWidthRef = useRef<number>(0);
  const hasDrawnRef = useRef<boolean>(Boolean(initialSignature));
  hasDrawnRef.current = hasDrawn;
  const isClearedRef = useRef<boolean>(false);

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
    if (!isClearedRef.current) {
      if (canvas.width > 0 && canvas.height > 0 && hasDrawnRef.current) {
        savedData = canvas.toDataURL('image/png');
      } else if (initialSignature && !hasDrawnRef.current) {
        savedData = initialSignature;
      }
    }

    lastWidthRef.current = rect.width;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.scale(dpr, dpr);

    if (savedData && !isClearedRef.current) {
      const img = new Image();
      img.onload = () => {
        if (!isClearedRef.current && canvasRef.current) {
          const currentCtx = canvasRef.current.getContext('2d');
          if (currentCtx) {
            currentCtx.drawImage(img, 0, 0, rect.width, rect.height);
          }
        }
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
      if (typeof canvas.setPointerCapture === 'function' && e.pointerId !== undefined) {
        canvas.setPointerCapture(e.pointerId);
      }
    } catch {
      // Safe fallback for pointer emulation
    }

    isClearedRef.current = false;
    const pt = getCanvasPoint(e);
    lastPointRef.current = pt;
    isDrawingRef.current = true;
    setHasDrawn(true);
    hasDrawnRef.current = true;

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

    const data = canvas.toDataURL('image/png');
    onChange?.(data);
    onSignatureChange?.(data);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
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
    hasDrawnRef.current = true;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
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
    isDrawingRef.current = false;
    lastPointRef.current = null;

    if (canvas) {
      const data = canvas.toDataURL('image/png');
      onChange?.(data);
      onSignatureChange?.(data);
    }
  };

  const handleClear = () => {
    isDrawingRef.current = false;
    isClearedRef.current = true;
    setHasDrawn(false);
    hasDrawnRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.scale(dpr, dpr);
      }
    }
    onChange?.(null);
    onSignatureChange?.('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <label className="font-bold text-slate-800 flex items-center space-x-1.5">
          <PenTool className="w-3.5 h-3.5 text-blue-700" />
          <span>{displayLabel}</span>
        </label>
        <button
          type="button"
          onClick={handleClear}
          aria-label={displayClearLabel}
          className={`flex items-center space-x-1 text-[11px] font-bold px-2.5 py-1.5 rounded transition min-h-[44px] ${
            hasDrawn
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 cursor-pointer'
          }`}
        >
          <RotateCcw className="w-3 h-3" />
          <span>{displayClearLabel}</span>
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative w-full h-28 rounded-lg overflow-hidden border border-slate-300 bg-white focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition shadow-sm"
      >
        {/* Baseline guide for signing rendered via CSS behind canvas */}
        <div
          className="absolute left-5 right-5 bottom-6 border-b border-dashed border-slate-300 pointer-events-none z-0"
          aria-hidden="true"
        />
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={ariaLabel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-full block cursor-crosshair touch-none relative z-10"
          style={{ touchAction: 'none' }}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-sans select-none z-0">
            {helperText}
          </div>
        )}
      </div>
    </div>
  );
};
