import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, PenTool } from 'lucide-react';
import { SupportedLocale } from '../i18n/translations';

interface SignatureCanvasProps {
  onChange: (signatureDataUrl: string | null) => void;
  label?: string;
  clearLabel?: string;
  lang?: SupportedLocale;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onChange,
  label,
  clearLabel,
  lang = 'en'
}) => {
  const isEs = lang === 'es' || clearLabel?.toLowerCase().includes('borrar') || label?.toLowerCase().includes('firmar') || label?.toLowerCase().includes('firma');
  const displayLabel = label ?? (isEs ? 'Firma Digital del Evaluador' : 'Clinician Digital Signature');
  const displayClearLabel = clearLabel ?? (isEs ? 'Borrar Firma' : 'Clear Signature');
  const ariaLabel = isEs ? 'Lienzo para firma digital' : 'Digital signature canvas';
  const helperText = isEs
    ? 'Firme aquí con el ratón, lápiz óptico o dedo'
    : 'Sign here with mouse, stylus, or fingertip';

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasDrawn, setHasDrawn] = useState<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastWidthRef = useRef<number>(0);
  const hasDrawnRef = useRef<boolean>(false);
  hasDrawnRef.current = hasDrawn;

  const initCanvas = useCallback((force: boolean = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!force && lastWidthRef.current > 0 && Math.abs(rect.width - lastWidthRef.current) < 5) {
      // Ignore vertical-only height changes triggered by mobile virtual keyboard appearance
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    let savedData: string | null = null;
    if (canvas.width > 0 && canvas.height > 0 && hasDrawnRef.current) {
      savedData = canvas.toDataURL('image/png');
    }

    lastWidthRef.current = rect.width;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Subtle signature baseline guide
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
  }, []);

  useEffect(() => {
    initCanvas(true);
    const handleResize = () => initCanvas(false);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initCanvas]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.x,
      y: e.clientY - rect.y
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
      // Ignore simulated pointer environment exceptions
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
        // Ignore synthetic release errors
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
            className="flex items-center space-x-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded hover:bg-slate-100 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{displayClearLabel}</span>
          </button>
        )}
      </div>

      <div className="relative w-full h-28 rounded-lg overflow-hidden border border-slate-300 bg-white focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition shadow-sm">
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
