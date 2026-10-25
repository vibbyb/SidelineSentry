import React, { useState, useMemo } from 'react';
import { AthleteProfile } from '../types/clinical';
import { SupportedLocale } from '../i18n/translations';
import { ReturnToPlayTracker } from './ReturnToPlayTracker';
import { SymptomLog } from './SymptomLog';
import {
  HeartPulse,
  Activity,
  ClipboardList,
  User,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

export interface RecoveryViewProps {
  athletes: AthleteProfile[];
  lang: SupportedLocale;
}

const TEXT = {
  en: {
    pageTitle: 'Athlete Recovery',
    pageSubtitle: 'CDC 6-step return to play protocol & daily symptom monitoring',
    allSports: 'All Sports',
    totalAthletes: '{count} athletes',
    emptyTitle: 'No athletes on roster',
    emptyDesc: 'Add athletes to the roster to monitor return to play progress and symptoms.',
    tabRtp: 'Return to Play (CDC 6 Steps)',
    tabSymptoms: 'Daily Symptoms Log'
  },
  es: {
    pageTitle: 'Recuperación de Atletas',
    pageSubtitle: 'Protocolo de retorno al juego de 6 pasos de los CDC y registro diario de síntomas',
    allSports: 'Todos los Deportes',
    totalAthletes: '{count} atletas',
    emptyTitle: 'No hay atletas en el plantel',
    emptyDesc: 'Agregue atletas al plantel para monitorear el progreso de retorno al juego y síntomas.',
    tabRtp: 'Retorno al juego (CDC 6 pasos)',
    tabSymptoms: 'Registro diario de síntomas'
  }
};

export const RecoveryView: React.FC<RecoveryViewProps> = ({ athletes, lang }) => {
  const t = TEXT[lang];
  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  // Initially collapsed accordion state
  const [expandedPlayerIds, setExpandedPlayerIds] = useState<Set<string>>(() => new Set());
  // Per-player active sub-tab ('rtp' or 'symptoms')
  const [playerTabs, setPlayerTabs] = useState<Record<string, 'rtp' | 'symptoms'>>({});

  // Group athletes by sport
  const { sportsList, groupedBySport } = useMemo(() => {
    const sportMap = new Map<string, AthleteProfile[]>();
    for (const ath of athletes) {
      const sport = ath.sport ? ath.sport.trim() : 'Athletics';
      if (!sportMap.has(sport)) {
        sportMap.set(sport, []);
      }
      sportMap.get(sport)!.push(ath);
    }
    const sports = Array.from(sportMap.keys()).sort((a, b) => a.localeCompare(b));
    return { sportsList: sports, groupedBySport: sportMap };
  }, [athletes]);

  const displayedSports = useMemo(() => {
    if (selectedSport === 'ALL') return sportsList;
    return sportsList.filter(s => s === selectedSport);
  }, [sportsList, selectedSport]);

  const togglePlayer = (athleteId: string) => {
    setExpandedPlayerIds(prev => {
      const next = new Set(prev);
      if (next.has(athleteId)) next.delete(athleteId);
      else next.add(athleteId);
      return next;
    });
  };

  const setPlayerSubTab = (athleteId: string, tab: 'rtp' | 'symptoms') => {
    setPlayerTabs(prev => ({ ...prev, [athleteId]: tab }));
  };

  if (athletes.length === 0) {
    return (
      <div className="space-y-6 py-8 px-2 animate-fade-in text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
          <HeartPulse className="w-8 h-8 stroke-[2]" />
        </div>
        <div className="max-w-xs mx-auto space-y-2">
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            {t.emptyTitle}
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            {t.emptyDesc}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Action Header */}
      <div className="pb-1">
        <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
          {t.pageTitle}
        </h2>
        <span className="text-[11px] text-slate-500 font-medium block">
          {t.pageSubtitle}
        </span>
      </div>

      {/* Sport Filter Pill Bar */}
      {sportsList.length > 0 && (
        <div
          role="toolbar"
          aria-label="Sport filter"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar"
        >
          <button
            type="button"
            onClick={() => setSelectedSport('ALL')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0 min-h-[38px] ${
              selectedSport === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.allSports} ({athletes.length})
          </button>
          {sportsList.map(sportName => {
            const list = groupedBySport.get(sportName) || [];
            const isSelected = selectedSport === sportName;
            return (
              <button
                key={sportName}
                type="button"
                onClick={() => setSelectedSport(sportName)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0 min-h-[38px] ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {sportName} ({list.length})
              </button>
            );
          })}
        </div>
      )}

      {/* Hierarchical Grouping: Sport -> Player (Accordion) -> RTP / Symptoms */}
      <div className="space-y-6">
        {displayedSports.map(sportName => {
          const sportAthletes = groupedBySport.get(sportName) || [];
          if (sportAthletes.length === 0) return null;

          return (
            <section
              key={sportName}
              data-testid={`recovery-sport-${sportName.toLowerCase().replace(/\s+/g, '-')}`}
              className="space-y-3"
            >
              {/* Sport Category Header */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 border border-slate-200">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    {sportName}
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-slate-500 font-mono">
                  {sportAthletes.length} {sportAthletes.length === 1 ? 'athlete' : 'athletes'}
                </span>
              </div>

              {/* Player Accordion Cards */}
              <div className="space-y-3 pl-1 sm:pl-2">
                {sportAthletes.map(athlete => {
                  const isExpanded = expandedPlayerIds.has(athlete.id);
                  const activeSubTab = playerTabs[athlete.id] || 'rtp';

                  return (
                    <div
                      key={athlete.id}
                      data-testid={`recovery-player-${athlete.id}`}
                      className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all"
                    >
                      {/* Clickable Player Header Row */}
                      <button
                        type="button"
                        onClick={() => togglePlayer(athlete.id)}
                        aria-expanded={isExpanded}
                        className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left hover:bg-slate-50 transition min-h-[52px]"
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                            {athlete.jerseyNumber ? `#${athlete.jerseyNumber}` : <User className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-extrabold text-sm text-slate-900">
                                {athlete.name}
                              </span>
                              {athlete.position && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                                  {athlete.position}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium">
                              #{athlete.jerseyNumber || 'N/A'} · {athlete.position || athlete.sport}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] font-bold text-blue-600 font-mono px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                            CDC RTP
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-500 stroke-[2.5]" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400 stroke-[2.5]" />
                          )}
                        </div>
                      </button>

                      {/* Accordion Body: Two-Tab Sub-View for Return to Play & Daily Symptoms */}
                      {isExpanded && (
                        <div className="border-t border-slate-200 bg-slate-50/40 p-3 sm:p-4 space-y-4">
                          {/* Sub-tab navigation */}
                          <div className="flex rounded-xl bg-slate-200/80 p-1 border border-slate-200" role="tablist">
                            <button
                              type="button"
                              role="tab"
                              aria-selected={activeSubTab === 'rtp'}
                              onClick={() => setPlayerSubTab(athlete.id, 'rtp')}
                              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[40px] ${
                                activeSubTab === 'rtp'
                                  ? 'bg-white text-blue-700 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <Activity className="w-3.5 h-3.5 stroke-[2.2]" />
                              <span>{t.tabRtp}</span>
                            </button>
                            <button
                              type="button"
                              role="tab"
                              aria-selected={activeSubTab === 'symptoms'}
                              onClick={() => setPlayerSubTab(athlete.id, 'symptoms')}
                              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[40px] ${
                                activeSubTab === 'symptoms'
                                  ? 'bg-white text-blue-700 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <ClipboardList className="w-3.5 h-3.5 stroke-[2.2]" />
                              <span>{t.tabSymptoms}</span>
                            </button>
                          </div>

                          {/* Sub-tab Contents */}
                          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-xs">
                            {activeSubTab === 'rtp' ? (
                              <ReturnToPlayTracker athlete={athlete} lang={lang} />
                            ) : (
                              <SymptomLog athlete={athlete} lang={lang} />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
