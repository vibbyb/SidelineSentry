import React, { useState, useEffect } from 'react';
import { AthleteProfile } from '../types/clinical';
import { Plus, Search, ChevronRight, History } from 'lucide-react';
import { getAthleteHistory } from '../services/storage';
import { TRANSLATIONS, SupportedLocale } from '../i18n/translations';

interface RosterDashboardProps {
  athletes: AthleteProfile[];
  onSelectAthlete: (athlete: AthleteProfile) => void;
  onAddAthlete: (athlete: AthleteProfile) => void;
  onOpenHistory?: (athlete: AthleteProfile) => void;
  lang?: SupportedLocale;
}

export const RosterDashboard: React.FC<RosterDashboardProps> = ({
  athletes,
  onSelectAthlete,
  onAddAthlete,
  onOpenHistory,
  lang = 'en'
}) => {
  const t = TRANSLATIONS[lang];
  const [search, setSearch] = useState<string>('');
  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New Athlete Form State
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

  useEffect(() => {
    if (!showAddModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal]);

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
    setShowAddModal(false);
    setNewName('');
    setNewJersey('');
    setHasBaseline(true);
  };

  return (
    <div className="space-y-3.5">
      {/* iOS Search Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition shrink-0 active:scale-95"
            title={t.addAthlete}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'es' ? 'Agregar' : 'Add'}</span>
          </button>
        </div>

        {/* Sport Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
          {sports.map(s => (
            <button
              key={s}
              onClick={() => setSelectedSport(s)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition shrink-0 ${
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
        {filteredAthletes.map(athlete => {
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
                      {sportLabels[athlete.sport]?.[lang] || athlete.sport} • {athlete.position}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenHistory?.(athlete)}
                  className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                  title={lang === 'es' ? 'Ver historial de chequeos' : 'View checkup history'}
                >
                  <History className="w-3.5 h-3.5 text-slate-600" />
                  {historyCount > 0 && (
                    <span className="font-mono font-bold text-[10px] text-blue-600">
                      {historyCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Baseline Summary Line & Action */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="text-[10px] text-slate-500 font-medium">
                  {athlete.hasRecordedBaseline === false ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300">
                      {lang === 'es' ? 'Sin Línea Base (+15% Margen de Seguridad)' : 'No Baseline (+15% Safety Margin)'}
                    </span>
                  ) : (
                    <>
                      {lang === 'es' ? 'Línea Base:' : 'Baseline:'}{' '}
                      <span className="font-mono text-slate-700 font-bold">
                        {(athlete.baselineStabilityIndex || 0.085).toFixed(3)}
                      </span>{' '}
                      •{' '}
                      <span className="font-mono text-slate-700 font-bold">
                        {athlete.baselineReactionTimeMs || 230}ms
                      </span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onSelectAthlete(athlete)}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition active:scale-[0.98]"
                >
                  <span>{t.initiateTriage}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

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
              {lang === 'es' ? 'Registrar Línea Base de Atleta' : 'Enroll Athlete Preseason Baseline'}
            </h3>
            <form onSubmit={handleCreateAthlete} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {lang === 'es' ? 'Nombre Completo del Atleta' : 'Athlete Full Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'es' ? 'ej. Jaxson Reed' : 'e.g. Jaxson Reed'}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-600 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {lang === 'es' ? 'Número de Camiseta' : 'Jersey Number'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={lang === 'es' ? 'ej. 24' : 'e.g. 24'}
                    value={newJersey}
                    onChange={e => setNewJersey(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {lang === 'es' ? 'Deporte' : 'Sport'}
                  </label>
                  <select
                    value={newSport}
                    onChange={e => setNewSport(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-600 text-sm"
                  >
                    <option value="Football">{lang === 'es' ? 'Fútbol Americano' : 'Football'}</option>
                    <option value="Soccer">{lang === 'es' ? 'Fútbol' : 'Soccer'}</option>
                    <option value="Ice Hockey">{lang === 'es' ? 'Hockey sobre Hielo' : 'Ice Hockey'}</option>
                    <option value="Lacrosse">{lang === 'es' ? 'Lacrosse' : 'Lacrosse'}</option>
                    <option value="Basketball">{lang === 'es' ? 'Baloncesto' : 'Basketball'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {lang === 'es' ? 'Posición' : 'Position'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'es' ? 'ej. Receptor' : 'e.g. Wide Receiver'}
                  value={newPosition}
                  onChange={e => setNewPosition(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-600 text-sm"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {lang === 'es' ? '¿Línea Base de Pretemporada Registrada?' : 'Preseason Baseline Recorded?'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {lang === 'es' ? 'Desmarque si el atleta no está calibrado / es novato' : 'Uncheck if athlete is uncalibrated / walk-on'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={hasBaseline}
                  onChange={e => setHasBaseline(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
              </div>

              {hasBaseline ? (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-1">
                      {lang === 'es' ? 'Oscilación Base (RMS)' : 'Baseline Sway (RMS)'}
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={newSway}
                      onChange={e => setNewSway(e.target.value)}
                      className="w-full p-2 rounded-lg bg-slate-50 border border-slate-300 text-emerald-700 font-mono font-bold focus:outline-none focus:border-blue-600 text-xs tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-1">
                      {lang === 'es' ? 'Reacción (ms)' : 'Reaction (ms)'}
                    </label>
                    <input
                      type="number"
                      value={newReaction}
                      onChange={e => setNewReaction(e.target.value)}
                      className="w-full p-2 rounded-lg bg-slate-50 border border-slate-300 text-blue-700 font-mono font-bold focus:outline-none focus:border-blue-600 text-xs tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-1">
                      {lang === 'es' ? 'Rastreo Ocular (s)' : 'Eye Tracking (s)'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={newKD}
                      onChange={e => setNewKD(e.target.value)}
                      className="w-full p-2 rounded-lg bg-slate-50 border border-slate-300 text-indigo-700 font-mono font-bold focus:outline-none focus:border-blue-600 text-xs tabular-nums"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                  <strong>
                    {lang === 'es' ? 'Margen de Seguridad Escolar Activo:' : 'Standard School Safety Margin Active:'}
                  </strong>{' '}
                  {lang === 'es'
                    ? 'Los umbrales de evaluación se ajustarán en un +15% usando líneas base de población (0.085 m/s² oscilación, 230ms reacción, 42.0s rastreo ocular).'
                    : 'Triage evaluation thresholds will be tightened by +15% using population baselines (0.085 m/s² sway, 230ms reaction, 42.0s eye tracking).'}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs transition"
                >
                  {lang === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs border border-blue-700 shadow-sm transition"
                >
                  {lang === 'es' ? 'Guardar Atleta' : 'Save Athlete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
