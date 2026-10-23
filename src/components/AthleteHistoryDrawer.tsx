import React, { useEffect, useMemo } from 'react';
import { AthleteProfile, AssessmentRecord } from '../types/clinical';
import { getAthleteHistory } from '../services/storage';
import { X, Calendar, FileText, CheckCircle2, Activity } from 'lucide-react';
import { TRANSLATIONS, SupportedLocale } from '../i18n/translations';

interface AthleteHistoryDrawerProps {
  athlete: AthleteProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectAssessment: (record: AssessmentRecord) => void;
  lang?: SupportedLocale;
}

export const AthleteHistoryDrawer: React.FC<AthleteHistoryDrawerProps> = ({
  athlete,
  isOpen,
  onClose,
  onSelectAssessment,
  lang = 'en'
}) => {
  const t = TRANSLATIONS[lang];

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const history = useMemo(() => {
    if (!athlete || !isOpen) return [];
    return getAthleteHistory(athlete.id);
  }, [athlete, isOpen]);

  if (!isOpen || !athlete) return null;

  const baselineSway = athlete.baselineStabilityIndex || 0.085;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-300 shadow-2xl flex flex-col text-slate-900 relative">
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider block">
                Athlete Safety History
              </span>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center space-x-2 mt-0.5">
                <span>{athlete.name}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold border border-slate-800">
                  #{athlete.jerseyNumber}
                </span>
              </h2>
              <div className="text-xs text-slate-600 mt-0.5 font-medium">
                {athlete.sport} &bull; {athlete.position}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-100">
            {/* Preseason Baseline Reference Card */}
            <div className="p-4 rounded-xl bg-white border border-slate-300 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Preseason Certified Baseline
                </span>
                <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 font-bold">
                  {athlete.baselineDate || '2026-08-15'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-center">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div className="text-[9px] text-slate-600 uppercase font-sans font-bold">{t.swayRms}</div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5 tabular-nums">{baselineSway.toFixed(3)}</div>
                  <div className="text-[9px] text-slate-500 font-sans">m/s²</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div className="text-[9px] text-slate-600 uppercase font-sans font-bold">{t.reaction}</div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5 tabular-nums">{athlete.baselineReactionTimeMs || 230}</div>
                  <div className="text-[9px] text-slate-500 font-sans">ms</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div className="text-[9px] text-slate-600 uppercase font-sans font-bold">{t.kdClock}</div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5 tabular-nums">{(athlete.baselineKingDevickSeconds || 42.0).toFixed(1)}</div>
                  <div className="text-[9px] text-slate-500 font-sans">sec</div>
                </div>
              </div>
            </div>

            {/* Trend Sparkline */}
            {history.length > 0 && (
              <div className="p-4 rounded-xl bg-white border border-slate-300 space-y-3 shadow-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-700" />
                    <span>Stability Index Recovery Trend</span>
                  </span>
                  <span className="text-[10px] text-slate-600 font-mono font-semibold">
                    Baseline: {baselineSway.toFixed(3)} m/s²
                  </span>
                </div>

                {/* SVG Trendline */}
                <div className="h-20 w-full relative bg-slate-50 rounded-lg border border-slate-200 p-2 flex items-end">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 300 60" preserveAspectRatio="none">
                    {/* Baseline reference horizontal line */}
                    <line
                      x1="0"
                      y1="45"
                      x2="300"
                      y2="45"
                      stroke="#059669"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    {/* Trend points polyline */}
                    {(() => {
                      const points = [
                        { val: baselineSway },
                        ...history.slice().reverse().map(h => ({ val: h.balanceScore.stabilityIndex }))
                      ];
                      const maxVal = Math.max(...points.map(p => p.val), 0.15);
                      const minVal = Math.min(...points.map(p => p.val), 0.05);
                      const range = maxVal - minVal || 1;

                      const coords = points.map((p, idx) => {
                        const x = (idx / (points.length - 1 || 1)) * 300;
                        const y = 55 - ((p.val - minVal) / range) * 45;
                        return { x, y, val: p.val };
                      });

                      const pointsStr = coords.map(c => `${c.x},${c.y}`).join(' ');

                      return (
                        <>
                          <polyline
                            fill="none"
                            stroke="#1d4ed8"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={pointsStr}
                          />
                          {coords.map((c, i) => (
                            <circle
                              key={i}
                              cx={c.x}
                              cy={c.y}
                              r={i === 0 ? 3 : 4}
                              fill={i === 0 ? '#059669' : c.val > baselineSway * 1.25 ? '#dc2626' : '#1d4ed8'}
                              stroke="#ffffff"
                              strokeWidth="1.5"
                            />
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono font-medium">
                  <span>Preseason Baseline</span>
                  <span>Latest Screening</span>
                </div>
              </div>
            )}

            {/* Assessment Timeline */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                <span>Screening History ({history.length})</span>
              </div>

              {history.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-white border border-slate-300 text-slate-600 text-xs space-y-2 shadow-sm">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <div className="font-bold text-slate-900">No Sideline Incidents Recorded</div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Preseason baseline on file. Any sideline safety checkups will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map(record => {
                    const isRemoval = record.triage.verdict === 'IMMEDIATE_REMOVAL';
                    const isCaution = record.triage.verdict === 'EVALUATION_RECOMMENDED';
                    const isInvalid = record.triage.verdict === 'INVALID_ASSESSMENT_RETEST_REQUIRED';

                    return (
                      <div
                        key={record.id}
                        className="p-4 rounded-xl bg-white border border-slate-300 hover:border-slate-400 transition space-y-3 shadow-sm relative overflow-hidden"
                      >
                        {/* Top Meta */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>{record.timestamp}</span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                              isRemoval
                                ? 'bg-red-50 border-red-300 text-red-700'
                                : isInvalid
                                ? 'bg-amber-50 border-amber-300 text-amber-800'
                                : isCaution
                                ? 'bg-amber-50 border-amber-300 text-amber-800'
                                : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            }`}
                          >
                            {isRemoval
                              ? 'Immediate Removal'
                              : isInvalid
                              ? 'Invalid Retest'
                              : isCaution
                              ? 'Caution'
                              : 'Clear'}
                          </span>
                        </div>

                        {/* Metrics Delta Summary */}
                        <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                          <div className="bg-slate-50 p-2 rounded border border-slate-200">
                            <div className="text-[9px] text-slate-600 font-sans uppercase font-bold">Sway (RMS)</div>
                            <div className="font-bold text-slate-900 mt-0.5 tabular-nums">
                              {record.balanceScore.stabilityIndex.toFixed(3)}
                            </div>
                            <div
                              className={`text-[10px] ${
                                record.triage.swayDegradationPercent >= 25
                                  ? 'text-red-700 font-bold'
                                  : 'text-emerald-700 font-semibold'
                              }`}
                            >
                              {record.triage.swayDegradationPercent > 0 ? '+' : ''}
                              {record.triage.swayDegradationPercent.toFixed(0)}%
                            </div>
                          </div>

                          <div className="bg-slate-50 p-2 rounded border border-slate-200">
                            <div className="text-[9px] text-slate-600 font-sans uppercase font-bold">Reaction</div>
                            <div className="font-bold text-slate-900 mt-0.5 tabular-nums">
                              {record.reactionScore.averageMs}ms
                            </div>
                            <div
                              className={`text-[10px] ${
                                record.triage.reactionDelayDeltaMs >= 40
                                  ? 'text-red-700 font-bold'
                                  : 'text-emerald-700 font-semibold'
                              }`}
                            >
                              {record.triage.reactionDelayDeltaMs > 0 ? '+' : ''}
                              {record.triage.reactionDelayDeltaMs}ms
                            </div>
                          </div>

                          <div className="bg-slate-50 p-2 rounded border border-slate-200">
                            <div className="text-[9px] text-slate-600 font-sans uppercase font-bold">Eye Tracking</div>
                            <div className="font-bold text-slate-900 mt-0.5 tabular-nums">
                              {record.kingDevickScore.durationSeconds.toFixed(1)}s
                            </div>
                            <div
                              className={`text-[10px] ${
                                record.triage.kingDevickDeltaSeconds >= 5
                                  ? 'text-red-700 font-bold'
                                  : 'text-emerald-700 font-semibold'
                              }`}
                            >
                              {record.triage.kingDevickDeltaSeconds > 0 ? '+' : ''}
                              {record.triage.kingDevickDeltaSeconds.toFixed(1)}s
                            </div>
                          </div>
                        </div>

                        {/* Clinician Certification Footnote */}
                        {record.certification && (
                          <div className="text-[10px] text-slate-600 flex items-center justify-between border-t border-slate-200 pt-2 font-medium">
                            <span>
                              Attested by: <strong className="text-slate-900 font-bold">{record.certification.evaluatorName}</strong> ({record.certification.credential})
                            </span>
                            {record.certification.signatureDataUrl && (
                              <span className="text-emerald-700 font-mono text-[9px] font-bold">&bull; Signed</span>
                            )}
                          </div>
                        )}

                        {/* View Packet Button */}
                        <button
                          type="button"
                          onClick={() => {
                            onSelectAssessment(record);
                          }}
                          className="w-full flex items-center justify-center space-x-1.5 py-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition min-h-[44px]"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Full Clinician Packet</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
