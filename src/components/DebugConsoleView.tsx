/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DebugLogEntry, Player } from '../types';
import { Terminal, Filter, Trash2 } from 'lucide-react';

interface DebugConsoleViewProps {
  logs: DebugLogEntry[];
  players: Player[];
  onClear: () => void;
}

// Dot color per player id (matches empire/galaxy views)
const playerDotClass = (id: string): string => {
  switch (id) {
    case 'player': return 'bg-blue-500';
    case 'ai1': return 'bg-red-500';
    case 'ai2': return 'bg-emerald-500';
    case 'ai3': return 'bg-purple-500';
    case 'ai4': return 'bg-amber-500';
    default: return 'bg-pink-500';
  }
};

const categoryBadge: Record<DebugLogEntry['category'], { label: string; cls: string }> = {
  build:    { label: 'BAU',    cls: 'bg-amber-950/40 border-amber-500/40 text-amber-300' },
  research: { label: 'FORSCH', cls: 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300' },
  shipyard: { label: 'WERFT',  cls: 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300' },
  fleet:    { label: 'FLOTTE', cls: 'bg-rose-950/40 border-rose-500/40 text-rose-300' },
  combat:   { label: 'KAMPF',  cls: 'bg-red-950/40 border-red-500/40 text-red-300' },
  info:     { label: 'INFO',   cls: 'bg-slate-800 border-slate-700 text-slate-300' },
};

export default function DebugConsoleView({ logs, players, onClear }: DebugConsoleViewProps) {
  const [filterPlayerId, setFilterPlayerId] = useState<string>('all');

  const filtered = filterPlayerId === 'all'
    ? logs
    : logs.filter((l) => l.playerId === filterPlayerId);

  return (
    <div id="debug-console-view" className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400 animate-pulse" /> Debug-Konsole ({filtered.length})
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Live-Protokoll der Aktionen aller Spieler (nur im Debug-Modus). Filterbar nach Spieler.
          </p>
        </div>

        {logs.length > 0 && (
          <button
            onClick={onClear}
            className="px-3 py-1.5 bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 text-xs rounded-lg border border-rose-900/40 transition-all font-semibold font-mono cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Verlauf löschen
          </button>
        )}
      </div>

      {/* Player filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest flex items-center gap-1 mr-1">
          <Filter className="w-3.5 h-3.5" /> Filter:
        </span>
        <button
          onClick={() => setFilterPlayerId('all')}
          className={`px-3 py-1.5 text-xs rounded-lg font-semibold border font-mono transition-all ${
            filterPlayerId === 'all'
              ? 'bg-blue-950/30 border-blue-500 text-blue-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Alle
        </button>
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => setFilterPlayerId(p.id)}
            className={`px-3 py-1.5 text-xs rounded-lg font-semibold border font-mono transition-all flex items-center gap-1.5 ${
              filterPlayerId === p.id
                ? 'bg-blue-950/30 border-blue-500 text-blue-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${playerDotClass(p.id)}`} />
            {p.name}
          </button>
        ))}
      </div>

      {/* Log list */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900/20 border border-slate-800/80 p-12 text-center rounded-2xl">
          <Terminal className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-mono">Noch keine Aktionen protokolliert.</p>
          <p className="text-xs text-slate-600 mt-1">Lass das Spiel einige Sekunden laufen – KI-Entscheidungen erscheinen automatisch.</p>
        </div>
      ) : (
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="max-h-[65vh] overflow-y-auto divide-y divide-slate-800/50 font-mono text-xs">
            {[...filtered].reverse().map((entry) => {
              const badge = categoryBadge[entry.category] ?? categoryBadge.info;
              return (
                <div key={entry.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-900/40">
                  <span className="text-slate-600 shrink-0">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`shrink-0 px-1.5 py-0.5 rounded border text-[9px] font-bold tracking-wider ${badge.cls}`}>
                    {badge.label}
                  </span>
                  <span className="shrink-0 flex items-center gap-1.5 min-w-[130px]">
                    <span className={`w-2 h-2 rounded-full ${playerDotClass(entry.playerId)}`} />
                    <span className="text-slate-300 font-semibold">{entry.playerName}</span>
                  </span>
                  <span className="text-slate-400 flex-1">{entry.message}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
