/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CombatLog } from '../types';
import { SHIP_NAMES, DEFENSE_NAMES } from '../utils/formulas';
import { Flame, ShieldAlert, Award, FileText, ChevronDown, ChevronUp } from 'lucide-react';

interface CombatLogsViewProps {
  logs: CombatLog[];
  onClearLogs: () => void;
}

export default function CombatLogsView({ logs, onClearLogs }: CombatLogsViewProps) {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  // Rendert je Einheitstyp eine Zeile "Name: vorher → übrig" (nur Typen mit Ausgangsbestand > 0).
  const renderUnitRows = (
    names: Record<string, string>,
    initial?: Record<string, number>,
    remaining?: Record<string, number>,
  ) => {
    if (!initial) return null;
    const keys = Object.keys(names).filter((k) => (initial[k] || 0) > 0);
    if (keys.length === 0) return <div className="text-slate-600">—</div>;
    return keys.map((k) => {
      const before = initial[k] || 0;
      const after = remaining ? remaining[k] || 0 : before;
      return (
        <div key={k} className="flex justify-between gap-2">
          <span className="text-slate-400">{names[k]}</span>
          <span className="font-mono">
            {before.toLocaleString()} → <span className={after < before ? 'text-rose-400' : 'text-emerald-400'}>{after.toLocaleString()}</span>
          </span>
        </div>
      );
    });
  };

  return (
    <div id="combat-logs-view" className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-500 animate-pulse" /> Gefechtsberichte ({logs.length})
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Archivierte Kampfdaten über Überfälle, Spionage und Planetvernichtungsversuche im Orion-Sektor.
          </p>
        </div>

        {logs.length > 0 && (
          <button
            onClick={onClearLogs}
            className="px-3 py-1.5 bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 text-xs rounded-lg border border-rose-900/40 transition-all font-semibold font-mono cursor-pointer"
          >
            Verlauf löschen
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="bg-slate-900/20 border border-slate-800/80 p-12 text-center rounded-2xl">
          <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-mono">Keine Gefechte aufgezeichnet.</p>
          <p className="text-xs text-slate-600 mt-1">Sende Kampfschiffe auf Angriffsmissionen, um Berichte zu generieren.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...logs].reverse().map((log) => {
            const isWinner = log.winner === 'attacker';
            const isLoser = log.winner === 'defender';
            const isDraw = log.winner === 'draw';
            const isExpanded = expandedLogId === log.id;

            // Generische Ereignis-Einträge (z.B. Mondversuch) kompakt darstellen
            if (log.eventType === 'moonAttempt') {
              return (
                <div key={log.id} className="bg-slate-900/40 border border-indigo-500/30 rounded-2xl p-4 flex items-center gap-3">
                  <span className="text-xl">🌑</span>
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span className="text-blue-400">System {log.system}:{log.slot}</span>
                      <span className="text-slate-600 font-bold">•</span>
                      <span className="text-indigo-300 font-bold uppercase tracking-wider text-[10px]">Mondversuch</span>
                    </div>
                    <div className="text-sm text-slate-200 mt-0.5">{log.eventText}</div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={log.id}
                className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden transition-all hover:border-slate-700"
              >
                {/* Header summary */}
                <div
                  onClick={() => toggleExpand(log.id)}
                  className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer select-none"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span className="text-blue-400">System {log.system}:{log.slot}</span>
                      <span className="text-slate-600 font-bold">•</span>
                      <span className="text-amber-500 font-bold uppercase tracking-wider text-[10px]">
                        {log.mission === 'destroy' ? 'Planetenzerstörung' : log.mission === 'spy' ? 'Spionage' : 'Angriff'}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-slate-200">
                      {log.mission === 'spy' ? (
                        <span>Spionagebericht von [{log.system}:{log.slot}]</span>
                      ) : (
                        <span>{log.attackerName} <span className="text-slate-500 italic font-normal text-xs">greift an</span> {log.defenderName}</span>
                      )}
                    </div>
                  </div>

                  {/* Winner Badge & Expand Control */}
                  <div className="flex items-center gap-3">
                    {log.mission === 'spy' ? (
                      <span className="px-3 py-1 text-xs rounded-full font-mono font-bold border bg-indigo-950/40 border-indigo-500/50 text-indigo-300">
                        Datenübertragung
                      </span>
                    ) : (
                      <span
                        className={`px-3 py-1 text-xs rounded-full font-mono font-bold border ${
                          log.winner === 'attacker'
                            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                            : log.winner === 'defender'
                            ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        {log.winner === 'attacker' && 'Sieg Angreifer'}
                        {log.winner === 'defender' && 'Sieg Verteidiger'}
                        {log.winner === 'draw' && 'Unentschieden'}
                      </span>
                    )}

                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-800/80 bg-slate-950/40 space-y-5 text-xs text-slate-300">
                    {log.mission === 'spy' ? (
                      <div className="bg-slate-950 border border-indigo-900/40 p-4 rounded-xl whitespace-pre-line text-xs font-mono text-indigo-200 leading-relaxed max-h-[400px] overflow-y-auto">
                        {log.espionageReport || 'Keine Daten empfangen.'}
                      </div>
                    ) : (
                      <>
                        {/* Planet Destroyed announcement */}
                        {log.planetDestroyed && (
                          <div className="bg-red-950/40 border border-red-500 p-4 rounded-xl flex items-center gap-3 text-red-200 font-mono">
                            <ShieldAlert className="w-6 h-6 text-red-500 animate-ping" />
                            <div>
                              <h4 className="font-bold text-sm">PLANET ZERSTÖRT!</h4>
                              <p className="text-[11px] text-red-400 mt-0.5">
                                Der Todesstern-Angriff war erfolgreich! Der Planet {log.system}:{log.slot} wurde in ein Trümmerfeld verwandelt!
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Deathstar Failure announcement */}
                        {log.deathStarsLost > 0 && (
                          <div className="bg-amber-950/40 border border-amber-500/50 p-4 rounded-xl flex items-center gap-3 text-amber-200 font-mono">
                            <ShieldAlert className="w-5 h-5 text-amber-500" />
                            <div>
                              <h4 className="font-bold text-sm">TODESSTERN-SCHUSS FEHLGESCHLAGEN!</h4>
                              <p className="text-[11px] text-amber-400 mt-0.5">
                                Der Versuch, den Planeten zu zerbröseln, schlug fehl (80% Fehlschlagswahrscheinlichkeit). Dabei wurden genau 10 Todessterne der Flotte im Orbit zerschmettert.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Loot section */}
                        {log.winner === 'attacker' && (
                          <div className="bg-blue-950/10 border border-blue-900/30 p-3 rounded-xl space-y-2">
                            <h4 className="font-semibold text-blue-400 font-mono text-[10px] uppercase tracking-wider flex items-center gap-1">
                              <Award className="w-3.5 h-3.5" /> Erbeutete Rohstoffe:
                            </h4>
                            <div className="grid grid-cols-3 gap-2 font-mono text-slate-200 text-sm">
                              <div>Metall: <span className="text-slate-400">{log.loot.metal.toLocaleString()}</span></div>
                              <div>Kristall: <span className="text-slate-400">{log.loot.crystal.toLocaleString()}</span></div>
                              <div>Deuterium: <span className="text-amber-500">{log.loot.deuterium.toLocaleString()}</span></div>
                            </div>
                          </div>
                        )}

                        {/* Erzeugtes Trümmerfeld */}
                        {log.debrisCreated && log.debrisCreated.metal + log.debrisCreated.crystal > 0 && (
                          <div className="bg-amber-950/10 border border-amber-900/30 p-3 rounded-xl space-y-2">
                            <h4 className="font-semibold text-amber-400 font-mono text-[10px] uppercase tracking-wider flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5" /> Erzeugtes Trümmerfeld:
                            </h4>
                            <div className="grid grid-cols-2 gap-2 font-mono text-slate-200 text-sm">
                              <div>Metall: <span className="text-slate-400">{log.debrisCreated.metal.toLocaleString()}</span></div>
                              <div>Kristall: <span className="text-slate-400">{log.debrisCreated.crystal.toLocaleString()}</span></div>
                            </div>
                          </div>
                        )}

                        {/* Beteiligte Einheiten je Seite (Bestand vorher → übrig) */}
                        {(log.attackerShipsInitial || log.defenderShipsInitial) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                              <h4 className="font-semibold text-blue-400 font-mono text-[10px] uppercase tracking-wider mb-2">
                                Angreifer: {log.attackerName} — Flotte
                              </h4>
                              <div className="space-y-1 font-mono text-[11px]">
                                {renderUnitRows(SHIP_NAMES as Record<string, string>, log.attackerShipsInitial as unknown as Record<string, number> | undefined, log.attackerShipsRemaining as unknown as Record<string, number> | undefined)}
                              </div>
                            </div>
                            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                              <h4 className="font-semibold text-amber-400 font-mono text-[10px] uppercase tracking-wider mb-2">
                                Verteidiger: {log.defenderName} — Flotte & Verteidigung
                              </h4>
                              <div className="space-y-1 font-mono text-[11px]">
                                {renderUnitRows(SHIP_NAMES as Record<string, string>, log.defenderShipsInitial as unknown as Record<string, number> | undefined, log.defenderShipsRemaining as unknown as Record<string, number> | undefined)}
                                {log.defenderDefenseInitial && Object.keys(DEFENSE_NAMES).some((k) => (log.defenderDefenseInitial![k as keyof typeof log.defenderDefenseInitial] || 0) > 0) && (
                                  <div className="mt-1 pt-1 border-t border-slate-800/60">
                                    {renderUnitRows(DEFENSE_NAMES as Record<string, string>, log.defenderDefenseInitial as unknown as Record<string, number> | undefined, log.defenderDefenseRemaining as unknown as Record<string, number> | undefined)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Losses comparison */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                            <h4 className="font-semibold text-rose-400 font-mono text-[10px] uppercase tracking-wider mb-2">Verluste Angreifer:</h4>
                            <div className="space-y-1 font-mono text-slate-400">
                              <div>Metall: {log.attackerLosses.metal.toLocaleString()}</div>
                              <div>Kristall: {log.attackerLosses.crystal.toLocaleString()}</div>
                              <div>Deuterium: {log.attackerLosses.deuterium.toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                            <h4 className="font-semibold text-rose-400 font-mono text-[10px] uppercase tracking-wider mb-2">Verluste Verteidiger:</h4>
                            <div className="space-y-1 font-mono text-slate-400">
                              <div>Metall: {log.defenderLosses.metal.toLocaleString()}</div>
                              <div>Kristall: {log.defenderLosses.crystal.toLocaleString()}</div>
                              <div>Deuterium: {log.defenderLosses.deuterium.toLocaleString()}</div>
                            </div>
                          </div>
                        </div>

                        {/* Rounds detailing */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-slate-400 font-mono text-[10px] uppercase tracking-wider">Kampfrunden-Protokoll:</h4>
                          <div className="space-y-2 font-mono text-[11px]">
                            {log.rounds.map((round: any, rIdx: number) => (
                              <div key={rIdx} className="bg-slate-900/20 p-2.5 rounded border border-slate-800/50 space-y-1">
                                <div className="text-blue-400 font-bold">Runde {round.round}</div>
                                <div className="text-slate-500">
                                  Angreifer fügt <span className="text-slate-300">{round.attackerDamage.toLocaleString()}</span> Schaden zu.
                                </div>
                                <div className="text-slate-500">
                                  Verteidiger schießt zurück mit <span className="text-slate-300">{round.defenderDamage.toLocaleString()}</span> Schaden.
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
