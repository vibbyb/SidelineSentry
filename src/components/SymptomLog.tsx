import React, { useState, useEffect, useMemo } from 'react';
import { AthleteProfile } from '../types/clinical';
import { AthleteRecoveryRecord, SymptomKey, SymptomRatings } from '../types/recovery';
import {
  loadAthleteRecovery,
  saveSymptomEntry,
  deleteSymptomEntry,
  calculateTotalSymptomScore
} from '../services/recovery';
import { RECOVERY_TEXT } from '../i18n/recovery';
import { SupportedLocale } from '../i18n/translations';
import {
  Calendar,
  Trash2,
  CheckCircle2,
  Activity
} from 'lucide-react';

interface SymptomLogProps {
  athlete: AthleteProfile;
  lang?: SupportedLocale;
}

export const SymptomLog: React.FC<SymptomLogProps> = ({ athlete, lang = 'en' }) => {
  const t = RECOVERY_TEXT[lang] || RECOVERY_TEXT.en;

  const [record, setRecord] = useState<AthleteRecoveryRecord>(() =>
    loadAthleteRecovery(athlete.id)
  );

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const initialSymptoms: SymptomRatings = {
    headache: 0,
    dizziness: 0,
    nausea: 0,
    lightNoiseSensitivity: 0,
    fogginess: 0,
    concentration: 0,
    sleep: 0
  };

  const [symptoms, setSymptoms] = useState<SymptomRatings>(initialSymptoms);
  const [notes, setNotes] = useState<string>('');
  const [saveFeedback, setSaveFeedback] = useState<boolean>(false);
  const [deleteConfirmDate, setDeleteConfirmDate] = useState<string | null>(null);

  // Reload recovery data if athlete changes
  useEffect(() => {
    const updated = loadAthleteRecovery(athlete.id);
    setRecord(updated);
    setSelectedDate(todayStr);
  }, [athlete.id, todayStr]);

  // When selectedDate changes, pre-fill form if an entry exists for that date
  useEffect(() => {
    const existing = record.symptomLog.find(e => e.date === selectedDate);
    if (existing) {
      setSymptoms({ ...existing.symptoms });
      setNotes(existing.notes || '');
    } else {
      setSymptoms(initialSymptoms);
      setNotes('');
    }
    setSaveFeedback(false);
  }, [selectedDate, record.symptomLog]);

  const currentTotalScore = useMemo(
    () => calculateTotalSymptomScore(symptoms),
    [symptoms]
  );

  const symptomList: { key: SymptomKey; label: string }[] = [
    { key: 'headache', label: t.symptomHeadache },
    { key: 'dizziness', label: t.symptomDizziness },
    { key: 'nausea', label: t.symptomNausea },
    { key: 'lightNoiseSensitivity', label: t.symptomLightNoise },
    { key: 'fogginess', label: t.symptomFogginess },
    { key: 'concentration', label: t.symptomConcentration },
    { key: 'sleep', label: t.symptomSleep }
  ];

  const handleScoreSelect = (key: SymptomKey, score: number) => {
    setSymptoms(prev => ({
      ...prev,
      [key]: score
    }));
    setSaveFeedback(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveSymptomEntry(athlete.id, {
      date: selectedDate,
      symptoms,
      notes: notes.trim() ? notes.trim() : undefined
    });
    setRecord(updated);
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 3000);
  };

  const handleDelete = (dateToDelete: string) => {
    const updated = deleteSymptomEntry(athlete.id, dateToDelete);
    setRecord(updated);
    setDeleteConfirmDate(null);
    if (dateToDelete === selectedDate) {
      setSymptoms(initialSymptoms);
      setNotes('');
    }
  };

  // Severity color helper
  const getSeverityStyle = (score: number) => {
    if (score === 0) return 'text-slate-500 bg-slate-50 border-slate-200';
    if (score <= 2) return 'text-amber-800 bg-amber-50 border-amber-300';
    if (score <= 4) return 'text-orange-800 bg-orange-50 border-orange-300';
    return 'text-red-800 bg-red-50 border-red-300';
  };

  // Chronological logs for chart
  const chronologicalEntries = useMemo(() => {
    return [...record.symptomLog].sort((a, b) => a.date.localeCompare(b.date));
  }, [record.symptomLog]);

  // Reverse logs for history listing (newest first)
  const historyEntries = useMemo(() => {
    return [...record.symptomLog].sort((a, b) => b.date.localeCompare(a.date));
  }, [record.symptomLog]);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="space-y-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          {t.symptomLogTitle}
        </h3>
        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
          {t.symptomLogSubtitle}
        </p>
      </div>

      {/* Inline SVG Trend Chart */}
      {chronologicalEntries.length > 0 && (
        <div className="p-4 rounded-xl bg-white border border-slate-300 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-900 flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-700" />
              <span>{t.symptomTrendTitle}</span>
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              {t.symptomTrendSubtitle}
            </span>
          </div>

          <div className="h-24 w-full relative bg-slate-50 rounded-lg border border-slate-200 p-2 flex items-end">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 300 70"
              preserveAspectRatio="none"
              aria-label="Symptom Score Trend Chart"
            >
              {/* Baseline reference line at bottom (score = 0) */}
              <line
                x1="0"
                y1="60"
                x2="300"
                y2="60"
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />

              {(() => {
                const count = chronologicalEntries.length;
                const coords = chronologicalEntries.map((e, idx) => {
                  const x = count === 1 ? 150 : (idx / (count - 1)) * 280 + 10;
                  const score = e.totalScore ?? calculateTotalSymptomScore(e.symptoms);
                  // Max score is 42. Map score 0 -> y=60, score 42 -> y=8
                  const y = 60 - (score / 42) * 52;
                  return { x, y, score, date: e.date };
                });

                const pointsStr = coords.map(c => `${c.x},${c.y}`).join(' ');

                return (
                  <>
                    {/* Area fill under curve */}
                    {coords.length > 1 && (
                      <polygon
                        fill="rgba(37, 99, 235, 0.08)"
                        points={`10,60 ${pointsStr} ${coords[coords.length - 1].x},60`}
                      />
                    )}
                    {/* Trend line */}
                    {coords.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={pointsStr}
                      />
                    )}
                    {/* Data dots */}
                    {coords.map((c, i) => (
                      <g key={i}>
                        <circle
                          cx={c.x}
                          cy={c.y}
                          r={4}
                          fill={c.score === 0 ? '#10b981' : c.score > 20 ? '#ef4444' : '#2563eb'}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        <text
                          x={c.x}
                          y={c.y - 7}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#334155"
                          fontWeight="bold"
                          className="font-mono"
                        >
                          {c.score}
                        </text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 font-mono font-medium">
            <span>{chronologicalEntries[0].date}</span>
            <span>
              {chronologicalEntries[chronologicalEntries.length - 1].date}
            </span>
          </div>
        </div>
      )}

      {/* Daily Entry Form */}
      <form onSubmit={handleSave} className="p-4 rounded-xl bg-white border border-slate-300 shadow-sm space-y-5">
        {/* Date Selector & Live Score Summary */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              {t.symptomDateLabel}
            </label>
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono font-bold min-h-[44px]"
              />
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              {t.symptomTotalScore}
            </span>
            <div className="flex items-baseline justify-end space-x-1 mt-0.5">
              <span
                className={`text-2xl font-bold font-mono tabular-nums ${
                  currentTotalScore === 0
                    ? 'text-emerald-600'
                    : currentTotalScore > 20
                    ? 'text-red-600'
                    : 'text-blue-700'
                }`}
              >
                {currentTotalScore}
              </span>
              <span className="text-xs text-slate-400 font-medium">/ 42</span>
            </div>
          </div>
        </div>

        {/* 7 Symptom Items */}
        <div className="space-y-4">
          {symptomList.map(({ key, label }) => {
            const val = symptoms[key];
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{label}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getSeverityStyle(
                      val
                    )}`}
                  >
                    {val === 0
                      ? t.severityNone
                      : val <= 2
                      ? `${t.severityMild} (${val})`
                      : val <= 4
                      ? `${t.severityModerate} (${val})`
                      : `${t.severitySevere} (${val})`}
                  </span>
                </div>

                {/* 0 to 6 Touch Buttons with >=44px touch targets */}
                <div className="grid grid-cols-7 gap-1">
                  {[0, 1, 2, 3, 4, 5, 6].map(score => {
                    const isSelected = val === score;
                    return (
                      <button
                        key={score}
                        type="button"
                        onClick={() => handleScoreSelect(key, score)}
                        aria-label={`${label} rating ${score}`}
                        className={`min-h-[44px] flex items-center justify-center rounded-lg text-xs font-bold font-mono transition border ${
                          isSelected
                            ? score === 0
                              ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm'
                              : score <= 2
                              ? 'bg-amber-500 border-amber-600 text-white shadow-sm'
                              : score <= 4
                              ? 'bg-orange-500 border-orange-600 text-white shadow-sm'
                              : 'bg-red-600 border-red-700 text-white shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {score}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Optional Notes */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
            {t.symptomNotesLabel}
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder={t.symptomNotesPlaceholder}
            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
          />
        </div>

        {/* Save Button */}
        <div className="pt-1 space-y-2">
          <button
            type="submit"
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm min-h-[44px]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{t.symptomSaveButton}</span>
          </button>

          {saveFeedback && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-medium text-center flex items-center justify-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t.symptomSavedNotice}</span>
            </div>
          )}
        </div>
      </form>

      {/* Logged Daily Entries History List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
          <span>
            {t.symptomHistoryTitle} ({historyEntries.length})
          </span>
        </h4>

        {historyEntries.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-white border border-slate-300 text-slate-500 text-xs shadow-sm">
            {t.symptomNoEntries}
          </div>
        ) : (
          <div className="space-y-2.5">
            {historyEntries.map(entry => {
              const score = entry.totalScore ?? calculateTotalSymptomScore(entry.symptoms);
              const isDeleting = deleteConfirmDate === entry.date;

              return (
                <div
                  key={entry.id || entry.date}
                  className="p-3.5 rounded-xl bg-white border border-slate-300 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs text-slate-700 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-mono font-bold">{entry.date}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                          score === 0
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : score > 20
                            ? 'bg-red-50 border-red-300 text-red-700'
                            : 'bg-blue-50 border-blue-300 text-blue-700'
                        }`}
                      >
                        {score} / 42
                      </span>

                      {!isDeleting && (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmDate(entry.date)}
                          aria-label={`Delete entry for ${entry.date}`}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary of active symptoms */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {symptomList.map(({ key, label }) => {
                      const val = entry.symptoms[key];
                      if (!val) return null;
                      return (
                        <span
                          key={key}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-medium"
                        >
                          {label}: <strong className="font-mono">{val}</strong>
                        </span>
                      );
                    })}
                    {score === 0 && (
                      <span className="text-[10px] text-emerald-700 font-medium">
                        No symptoms reported
                      </span>
                    )}
                  </div>

                  {/* Notes if present */}
                  {entry.notes && (
                    <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-200 mt-1">
                      {entry.notes}
                    </p>
                  )}

                  {/* Delete Confirmation prompt */}
                  {isDeleting && (
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-red-700 font-medium">
                        {t.symptomDeleteConfirm}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmDate(null)}
                          className="px-2.5 py-1.5 text-xs text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 min-h-[44px]"
                        >
                          {t.rtpResetCancel}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(entry.date)}
                          className="px-2.5 py-1.5 text-xs bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 min-h-[44px]"
                        >
                          {t.symptomDeleteButton}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
