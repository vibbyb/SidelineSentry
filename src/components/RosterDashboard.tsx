import React, { useState, useEffect } from 'react';
import { AthleteProfile } from '../types/clinical';
import { Plus, Search, ChevronRight, History, Trash2, RotateCcw } from 'lucide-react';
import { getAthleteHistory } from '../services/storage';
import { TRANSLATIONS, SupportedLocale } from '../i18n/translations';
import { ROSTER_TEXT } from '../i18n/roster';

interface RosterDashboardProps {
  athletes: AthleteProfile[];
  onSelectAthlete: (athlete: AthleteProfile) => void;
  onAddAthlete: (athlete: AthleteProfile) => void;
  onDeleteAthlete?: (athleteId: string) => void;
  onRestoreDefaults?: () => void;
  onOpenHistory?: (athlete: AthleteProfile) => void;
  lang?: SupportedLocale;
  autoOpenAddModal?: boolean;
  onCloseAddModal?: () => void;
}

export const RosterDashboard: React.FC<RosterDashboardProps> = ({
  athletes,
  onSelectAthlete,
  onAddAthlete,
  onDeleteAthlete,
  onRestoreDefaults,
  onOpenHistory,
  lang = 'en',
  autoOpenAddModal,
  onCloseAddModal
}) => {
  const t = TRANSLATIONS[lang];
  const rText = ROSTER_TEXT[lang];

  const [search, setSearch] = useState<string>('');
  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState<boolean>(Boolean(autoOpenAddModal));

  useEffect(() => {
    if (autoOpenAddModal) {
      setShowAddModal(true);
    }
  }, [autoOpenAddModal]);
  const [athleteToDelete, setAthleteToDelete] = useState<AthleteProfile | null>(null);

  // Form State
  const [newName, setNewName] = useState<string>('');
  const [newJersey, setNewJersey] = useState<string>('');
  const [newSport, setNewSport] = useState<string>('Football');
  const [newPosition, setNewPosition] = useState<string>('Quarterback');
  const [newSway, setNewSway] = useState<string>('0.078');
  const [newReaction, setNewReaction] = useState<string>('225');
  const [newKD, setNewKD] = useState<string>('40.5');
  const [hasBaseline, setHasBaseline] = useState<boolean>(true);

  const sports = ['ALL', 'Football', 'Soccer', 'Ice Hockey', 'Lacrosse', 'Basketball'];
  const sportLabels: Record<string, { en: string; es: string }> = {
    ALL: { en: 'All Sports', es: 'Todos los Deportes' },
    Football: { en: 'Football', es: 'Fútbol Americano' },
    Soccer: { en: 'Soccer', es: 'Fútbol' },
    'Ice Hockey': { en: 'Ice Hockey', es: 'Hockey sobre Hielo' },
    Lacrosse: { en: 'Lacrosse', es: 'Lacrosse' },
    Basketball: { en: 'Basketball', es: 'Baloncesto' },
  };

  const handleDismissAddModal = () => {
    setShowAddModal(false);
    onCloseAddModal?.();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (athleteToDelete) setAthleteToDelete(null);
        else if (showAddModal) handleDismissAddModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [athleteToDelete, showAddModal]);

  const filteredAthletes = athletes.filter(a => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.jerseyNumber.includes(search) ||
      a.position.toLowerCase().includes(search.toLowerCase());
    const matchesSport = selectedSport === 'ALL' || a.sport === selectedSport;
    return matchesSearch && matchesSport;
  });

  const handleCreateAthlete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newJersey.trim()) return;

    const newAthlete: AthleteProfile = {
      id: `ath-${Date.now()}`,
      name: newName.trim(),
      jerseyNumber: newJersey.trim(),
      sport: newSport,
      position: newPosition.trim(),
      hasRecordedBaseline: hasBaseline,
      baselineDate: hasBaseline ? new Date().toISOString().split('T')[0] : undefined,
      baselineStabilityIndex: hasBaseline ? (parseFloat(newSway) || 0.085) : undefined,
      baselineReactionTimeMs: hasBaseline ? (parseInt(newReaction, 10) || 230) : undefined,
      baselineKingDevickSeconds: hasBaseline ? (parseFloat(newKD) || 42.0) : undefined
    };

    onAddAthlete(newAthlete);
    handleDismissAddModal();
    setNewName('');
    setNewJersey('');
    setHasBaseline(true);
  };

  return (
    <div className="space-y-3.5">
      {/* Search and Sport Filter */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-600 transition min-h-[44px]"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition shrink-0 active:scale-95 min-h-[44px]"
            title={t.addAthlete}
            aria-label={t.addAthlete}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.addBtn}</span>
          </button>
        </div>

        {/* Sport Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {sports.map(s => (
            <button
              key={s}
              onClick={() => setSelectedSport(s)}
              className={`px-3 py-2 rounded-full text-xs font-bold transition shrink-0 min-h-[44px] flex items-center ${
                selectedSport === s
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {sportLabels[s]?.[lang] || s}
            </button>
          ))}
        </div>
      </div>

      {/* Roster Cards List */}
      <div className="space-y-2.5">
        {athletes.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-slate-200 text-slate-600 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">{rText.emptyRosterTitle}</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">{rText.emptyRosterDesc}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition min-h-[44px] flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{rText.addAthleteBtn}</span>
              </button>
              {onRestoreDefaults && (
                <button
                  type="button"
                  onClick={onRestoreDefaults}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs transition min-h-[44px] flex items-center justify-center space-x-1.5"
                >
                  <RotateCcw className="w-4 h-4 text-slate-600" />
                  <span>{rText.restoreDefaultsBtn}</span>
                </button>
              )}
            </div>
          </div>
        ) : filteredAthletes.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-slate-200 text-slate-500 text-xs shadow-xs">
            {t.noMatchingAthletes}
          </div>
        ) : (
          filteredAthletes.map(athlete => {
            const historyCount = getAthleteHistory(athlete.id).length;
            return (
              <div
                key={athlete.id}
                className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs hover:border-blue-400 transition-all flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                      #{athlete.jerseyNumber}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {athlete.name}
                      </h3>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {sportLabels[athlete.sport]?.[lang] || athlete.sport} | {athlete.position}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenHistory?.(athlete)}
                      className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition min-h-[44px] min-w-[44px] justify-center"
                      title={t.viewHistoryTooltip}
                      aria-label={t.viewHistoryTooltip}
                    >
                      <History className="w-4 h-4 text-slate-600" />
                      {historyCount > 0 && (
                        <span className="font-mono font-bold text-[10px] text-blue-600">
                          {historyCount}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAthleteToDelete(athlete)}
                      className="flex items-center justify-center p-2 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-transparent hover:border-red-200 transition min-h-[44px] min-w-[44px]"
                      title={rText.deleteAthleteTooltip}
                      aria-label={`${rText.deleteAthleteTooltip}: ${athlete.name}`}
                    >
                      <Trash2 className="w-4 h-4 stroke-[2]" />
                    </button>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                  <div className="text-[10px] text-slate-500 font-medium truncate">
                    {athlete.hasRecordedBaseline === false ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-300">
                        {lang === 'es' ? 'Sin línea base' : 'No baseline yet'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                        {lang === 'es' ? 'Línea base guardada' : 'Baseline saved'}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectAthlete(athlete)}
                    className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition active:scale-[0.98] shrink-0 min-h-[44px]"
                  >
                    <span>{t.initiateTriage}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Athlete Confirmation Modal */}
      {athleteToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-athlete-modal-title"
        >
          <div className="bg-white border border-slate-300 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 id="delete-athlete-modal-title" className="text-base font-bold text-slate-900">
                  {rText.deleteAthleteTitle}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {athleteToDelete.name} (#{athleteToDelete.jerseyNumber})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-red-50/70 border border-red-100 rounded-xl p-3">
              {rText.deleteAthleteWarning}
            </p>

            <div className="flex items-center justify-end space-x-2.5 pt-1">
              <button
                type="button"
                onClick={() => setAthleteToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition min-h-[44px]"
              >
                {rText.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteAthlete) {
                    onDeleteAthlete(athleteToDelete.id);
                  }
                  setAthleteToDelete(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition min-h-[44px]"
              >
                {rText.deleteAthleteConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Athlete Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-athlete-modal-title"
        >
          <div className="bg-white border border-slate-300 w-full max-w-md rounded-xl p-6 shadow-2xl relative overflow-hidden">
            <h3 id="add-athlete-modal-title" className="text-base font-bold text-slate-900 mb-4">
              {t.enrollBaselineTitle}
            </h3>
            <form onSubmit={handleCreateAthlete} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {t.fullNameLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.fullNamePlaceholder}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 focus:outline-hidden focus:border-blue-600 text-sm min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {t.jerseyLabel}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t.jerseyPlaceholder}
                    value={newJersey}
                    onChange={e => setNewJersey(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 focus:outline-hidden focus:border-blue-600 text-sm min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {t.sportSelectLabel}
                  </label>
                  <select
                    value={newSport}
                    onChange={e => setNewSport(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 focus:outline-hidden focus:border-blue-600 text-sm min-h-[44px]"
                  >
                    <option value="Football">{sportLabels['Football']?.[lang] || 'Football'}</option>
                    <option value="Soccer">{sportLabels['Soccer']?.[lang] || 'Soccer'}</option>
                    <option value="Ice Hockey">{sportLabels['Ice Hockey']?.[lang] || 'Ice Hockey'}</option>
                    <option value="Lacrosse">{sportLabels['Lacrosse']?.[lang] || 'Lacrosse'}</option>
                    <option value="Basketball">{sportLabels['Basketball']?.[lang] || 'Basketball'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {t.positionLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.positionPlaceholder}
                  value={newPosition}
                  onChange={e => setNewPosition(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 focus:outline-hidden focus:border-blue-600 text-sm min-h-[44px]"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {t.preseasonBaselineCheckbox}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {t.preseasonBaselineCheckboxDesc}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={hasBaseline}
                  onChange={e => setHasBaseline(e.target.checked)}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
              </div>

              {hasBaseline ? (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-1">
                      {t.baselineSwayField}
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={newSway}
                      onChange={e => setNewSway(e.target.value)}
                      className="w-full p-2 rounded-lg bg-slate-50 border border-slate-300 text-emerald-700 font-mono font-bold focus:outline-hidden focus:border-blue-600 text-xs tabular-nums min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-1">
                      {t.baselineReactionFieldShort}
                    </label>
                    <input
                      type="number"
                      value={newReaction}
                      onChange={e => setNewReaction(e.target.value)}
                      className="w-full p-2 rounded-lg bg-slate-50 border border-slate-300 text-blue-700 font-mono font-bold focus:outline-hidden focus:border-blue-600 text-xs tabular-nums min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-1">
                      {t.baselineEyeFieldShort}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={newKD}
                      onChange={e => setNewKD(e.target.value)}
                      className="w-full p-2 rounded-lg bg-slate-50 border border-slate-300 text-indigo-700 font-mono font-bold focus:outline-hidden focus:border-blue-600 text-xs tabular-nums min-h-[44px]"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium">
                  {lang === 'es'
                    ? 'Se usarán valores típicos de referencia para este atleta.'
                    : 'Typical reference values will be used for this athlete.'}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleDismissAddModal}
                  className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs transition min-h-[44px]"
                >
                  {t.cancelModalBtn}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs border border-blue-700 shadow-sm transition min-h-[44px]"
                >
                  {t.saveAthleteModalBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
