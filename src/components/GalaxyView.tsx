/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Planet, GameState, Ships, MissionType, Resources } from '../types';
import { SHIP_NAMES, getDistance, getFlightDuration, getShipSpeed, getFlightFuelConsumption, getFleetCargoCapacity } from '../utils/formulas';
import { Star, ShieldAlert, Compass, Eye, Send, ArrowRightLeft, User, HelpCircle } from 'lucide-react';

interface GalaxyViewProps {
  state: GameState;
  selectedPlanet: Planet;
  onLaunchFleet: (
    targetSystem: number,
    targetSlot: number,
    mission: MissionType,
    ships: Ships,
    resources: Resources
  ) => { success: boolean; error?: string };
}

export default function GalaxyView({ state, selectedPlanet, onLaunchFleet }: GalaxyViewProps) {
  const [currentSystem, setCurrentSystem] = useState<number>(selectedPlanet.system);
  const [expandedSlot, setExpandedSlot] = useState<number | null>(null);
  const [selectedMission, setSelectedMission] = useState<MissionType>('spy');
  const [shipsToSend, setShipsToSend] = useState<Ships>({
    smallCargo: 0,
    largeCargo: 0,
    lightFighter: 0,
    heavyFighter: 0,
    cruiser: 0,
    battleship: 0,
    colonyShip: 0,
    recycler: 0,
    espionageProbe: 0,
    bomber: 0,
    destroyer: 0,
    deathStar: 0,
    solarSatellite: 0,
  });

  const [cargo, setCargo] = useState<Resources>({ metal: 0, crystal: 0, deuterium: 0 });
  const [feedback, setFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  const systemPlanets = state.planets.filter((p) => p.system === currentSystem);

  const getOwnerDetails = (ownerId: string | null) => {
    if (!ownerId) return null;
    const player = state.players.find((p) => p.id === ownerId);
    return player || null;
  };

  const handleOpenLaunch = (slot: number, defaultMission: MissionType) => {
    setExpandedSlot(slot === expandedSlot ? null : slot);
    setSelectedMission(defaultMission);
    setFeedback(null);
    setCargo({ metal: 0, crystal: 0, deuterium: 0 });

    // Reset ships to send
    const defaultShips: Ships = {
      smallCargo: 0,
      largeCargo: 0,
      lightFighter: 0,
      heavyFighter: 0,
      cruiser: 0,
      battleship: 0,
      colonyShip: 0,
      recycler: 0,
      espionageProbe: 0,
      bomber: 0,
      destroyer: 0,
      deathStar: 0,
      solarSatellite: 0,
    };

    // Auto-fill spy probes if mission is espionage
    if (defaultMission === 'spy' && selectedPlanet.ships.espionageProbe > 0) {
      defaultShips.espionageProbe = 1;
    } else if (defaultMission === 'colonize' && selectedPlanet.ships.colonyShip > 0) {
      defaultShips.colonyShip = 1;
    } else if (defaultMission === 'recycle' && selectedPlanet.ships.recycler > 0) {
      defaultShips.recycler = selectedPlanet.ships.recycler;
    }

    setShipsToSend(defaultShips);
  };

  const handleLaunch = (slot: number) => {
    const res = onLaunchFleet(currentSystem, slot, selectedMission, shipsToSend, cargo);
    if (res.success) {
      setFeedback({ success: true, msg: 'Flotte erfolgreich entsendet!' });
      setExpandedSlot(null);
    } else {
      setFeedback({ success: false, msg: res.error || 'Fehler beim Entsenden.' });
    }
  };

  const handleSetMaxShips = (shipType: keyof Ships) => {
    setShipsToSend({
      ...shipsToSend,
      [shipType]: selectedPlanet.ships[shipType] || 0,
    });
  };

  // Helper to verify flight requirements
  const distance = getDistance(selectedPlanet.system, selectedPlanet.slot, currentSystem, expandedSlot || 1);
  const playerResearch = state.players.find((p) => p.id === 'player')!.research;

  let minSpeed = Infinity;
  let activeShips = 0;
  for (const [shipType, countVal] of Object.entries(shipsToSend)) {
    const count = countVal as number;
    if (count > 0) {
      activeShips += count;
      const speed = getShipSpeed(shipType as keyof Ships, playerResearch);
      if (speed < minSpeed) minSpeed = speed;
    }
  }

  const durationSeconds = activeShips > 0 ? getFlightDuration(distance, minSpeed, 100, state.speedMultiplier) : 0;
  const fuelCost = activeShips > 0 ? getFlightFuelConsumption(shipsToSend, distance, 100) : 0;

  return (
    <div id="galaxy-view" className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-400" /> Galaxie-Browser
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Scanne die 10 Sonnensysteme des Orion-Sektors nach Planeten, Ressourcen und Zielen.
          </p>
        </div>

        {/* System Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentSystem(Math.max(1, currentSystem - 1))}
            disabled={currentSystem === 1}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs rounded-lg font-bold border border-slate-700 transition-all select-none"
          >
            ◄ Vorherige
          </button>
          <div className="px-5 py-1.5 bg-slate-950 rounded-lg text-center border border-slate-800 font-mono text-sm font-bold text-blue-400 min-w-[100px]">
            System {currentSystem}
          </div>
          <button
            onClick={() => setCurrentSystem(Math.min(10, currentSystem + 1))}
            disabled={currentSystem === 10}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs rounded-lg font-bold border border-slate-700 transition-all select-none"
          >
            Nächste ►
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm border font-mono ${
            feedback.success
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Galaxy Slots List */}
      <div className="bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 p-3 bg-slate-900/90 border-b border-slate-800 text-xs font-semibold text-slate-400 font-mono">
          <div className="col-span-1 text-center">Pos</div>
          <div className="col-span-3">Planet</div>
          <div className="col-span-3">Allianz / Herrscher</div>
          <div className="col-span-2 text-right">Punkte</div>
          <div className="col-span-3 text-right">Aktionen</div>
        </div>

        <div className="divide-y divide-slate-800/60">
          {Array.from({ length: 9 }).map((_, idx) => {
            const slot = idx + 1;
            const planet = systemPlanets.find((p) => p.slot === slot);
            const owner = planet ? getOwnerDetails(planet.ownerId) : null;
            const isSelf = planet?.ownerId === 'player';

            return (
              <div key={slot} className="flex flex-col">
                <div
                  className={`grid grid-cols-12 gap-2 px-3 py-4 items-center text-sm ${
                    isSelf ? 'bg-blue-950/10' : planet?.ownerId ? 'bg-slate-900/10' : ''
                  }`}
                >
                  {/* Position */}
                  <div className="col-span-1 text-center font-mono font-bold text-slate-500">
                    {slot}
                  </div>

                  {/* Planet Information */}
                  <div className="col-span-3 flex items-center gap-2">
                    {planet ? (
                      <div>
                        <div className="font-semibold text-slate-200">{planet.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Temp: {planet.temperatureMin}°C bis {planet.temperatureMax}°C
                        </div>
                        {planet.debris && planet.debris.metal + planet.debris.crystal > 0 && (
                          <div className="text-[10px] text-amber-400/90 font-mono mt-0.5">
                            Trümmer: {Math.floor(planet.debris.metal).toLocaleString()} M / {Math.floor(planet.debris.crystal).toLocaleString()} K
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-600 font-mono italic text-xs">Leerer Weltraum</span>
                    )}
                  </div>

                  {/* Owner */}
                  <div className="col-span-3">
                    {planet && owner ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            owner.id === 'player'
                              ? 'bg-blue-500'
                              : owner.id === 'ai1'
                              ? 'bg-red-500'
                              : owner.id === 'ai2'
                              ? 'bg-emerald-500'
                              : owner.id === 'ai3'
                              ? 'bg-purple-500'
                              : owner.id === 'ai4'
                              ? 'bg-amber-500'
                              : 'bg-pink-500'
                          }`}
                        />
                        <span className="font-medium text-slate-300">
                          {owner.name} {isSelf && '(Du)'}
                        </span>
                      </div>
                    ) : planet ? (
                      <span className="text-xs text-amber-500 font-semibold font-mono">Trümmerfeld / Wüst</span>
                    ) : (
                      '-'
                    )}
                  </div>

                  {/* Points */}
                  <div className="col-span-2 text-right font-mono text-slate-400">
                    {owner ? owner.points.total.toLocaleString() : '-'}
                  </div>

                  {/* Rapid Action Buttons */}
                  <div className="col-span-3 flex justify-end gap-1">
                    {planet ? (
                      <>
                        {isSelf ? (
                          <div className="flex items-center gap-1.5">
                            {planet.debris && planet.debris.metal + planet.debris.crystal > 0 && selectedPlanet.ships.recycler > 0 && (
                              <button
                                onClick={() => handleOpenLaunch(slot, 'recycle')}
                                className="px-2 py-1 bg-amber-950/30 hover:bg-amber-900/40 text-amber-400 border border-amber-900/40 hover:border-amber-500/50 text-[11px] rounded-lg font-bold font-mono transition-all cursor-pointer"
                                title="Trümmer recyceln"
                              >
                                Recyceln
                              </button>
                            )}
                            <span className="text-xs text-blue-400/80 font-mono italic pr-2">Dein Planet</span>
                          </div>
                        ) : (
                          <div className="flex gap-1.5">
                            {/* Spy probe quick dispatch */}
                            {selectedPlanet.ships.espionageProbe > 0 && (
                              <button
                                onClick={() => handleOpenLaunch(slot, 'spy')}
                                className="p-1.5 hover:bg-slate-800 text-blue-400 rounded-lg border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                                title="Spionagesonde entsenden"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}

                            {/* Attack quick dispatch */}
                            <button
                              onClick={() => handleOpenLaunch(slot, 'attack')}
                              className="px-2 py-1 bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-900/40 hover:border-red-500/50 text-[11px] rounded-lg font-bold font-mono transition-all cursor-pointer"
                            >
                              Angriff
                            </button>

                            {/* Transport quick dispatch */}
                            <button
                              onClick={() => handleOpenLaunch(slot, 'transport')}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] rounded-lg font-bold font-mono transition-all cursor-pointer"
                            >
                              Transp.
                            </button>

                            {/* Recycle quick dispatch (nur bei Trümmerfeld & vorhandenen Recyclern) */}
                            {planet.debris && planet.debris.metal + planet.debris.crystal > 0 && selectedPlanet.ships.recycler > 0 && (
                              <button
                                onClick={() => handleOpenLaunch(slot, 'recycle')}
                                className="px-2 py-1 bg-amber-950/30 hover:bg-amber-900/40 text-amber-400 border border-amber-900/40 hover:border-amber-500/50 text-[11px] rounded-lg font-bold font-mono transition-all cursor-pointer"
                                title="Trümmer recyceln"
                              >
                                Recyceln
                              </button>
                            )}

                            {/* Planet Destruction Quick Dispatch */}
                            {selectedPlanet.ships.deathStar >= 10 && (
                              <button
                                onClick={() => handleOpenLaunch(slot, 'destroy')}
                                className="p-1.5 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-900/40 text-amber-400 rounded-lg transition-all cursor-pointer"
                                title="Planet vernichten"
                              >
                                <ShieldAlert className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      /* Colonize option */
                      selectedPlanet.ships.colonyShip > 0 && (
                        <button
                          onClick={() => handleOpenLaunch(slot, 'colonize')}
                          className="px-3 py-1 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-900/40 hover:border-emerald-500/50 text-xs rounded-lg font-bold transition-all cursor-pointer"
                        >
                          Kolonisieren
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Expanded Fleet Dispatch Panel */}
                {expandedSlot === slot && (
                  <div className="bg-slate-950 p-5 border-t border-b border-slate-800 text-left space-y-4">
                    <h4 className="text-xs font-bold text-blue-400 font-mono uppercase tracking-widest flex items-center gap-2">
                      <Send className="w-3.5 h-3.5 animate-pulse" /> Flotten-Konfiguration zu [{currentSystem}:{slot}]
                    </h4>

                    {/* Mission Selector */}
                    <div className="flex gap-2">
                      {(['spy', 'attack', 'transport', 'colonize', 'destroy', 'recycle'] as MissionType[]).map((m) => {
                        // Check if mission makes sense
                        if (m === 'colonize' && planet) return null;
                        if (m === 'destroy' && (!planet || selectedPlanet.ships.deathStar < 10)) return null;
                        if (m === 'recycle' && ((planet?.debris?.metal || 0) + (planet?.debris?.crystal || 0) <= 0)) return null;

                        const labels: Record<MissionType, string> = {
                          spy: 'Spionage',
                          attack: 'Angriff',
                          transport: 'Transport',
                          colonize: 'Kolonisieren',
                          destroy: 'Planet vernichten',
                          recycle: 'Recyceln',
                        };

                        return (
                          <button
                            key={m}
                            onClick={() => setSelectedMission(m)}
                            className={`px-3 py-1.5 text-xs rounded-lg font-semibold border ${
                              selectedMission === m
                                ? 'bg-blue-950/30 border-blue-500 text-blue-300'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                            }`}
                          >
                            {labels[m]}
                          </button>
                        );
                      })}
                    </div>

                    {/* Ship Select Matrix */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Object.keys(selectedPlanet.ships).map((shipKey) => {
                        if (shipKey === 'solarSatellite') return null;
                        const available = selectedPlanet.ships[shipKey as keyof Ships] || 0;
                        if (available === 0) return null;

                        return (
                          <div
                            key={shipKey}
                            className="bg-slate-900 p-2.5 rounded-xl border border-slate-800/80 flex flex-col justify-between"
                          >
                            <span className="text-[11px] font-semibold text-slate-300">
                              {SHIP_NAMES[shipKey as keyof Ships]}
                            </span>
                            <div className="flex items-center gap-1.5 mt-2">
                              <input
                                type="number"
                                min="0"
                                max={available}
                                value={shipsToSend[shipKey as keyof Ships] || ''}
                                onChange={(e) => {
                                  const val = Math.min(available, Math.max(0, parseInt(e.target.value) || 0));
                                  setShipsToSend({ ...shipsToSend, [shipKey]: val });
                                }}
                                className="w-full bg-slate-950 text-slate-200 border border-slate-800 focus:border-blue-500 focus:outline-none rounded px-1.5 py-1 text-xs font-mono"
                              />
                              <button
                                onClick={() => handleSetMaxShips(shipKey as keyof Ships)}
                                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 px-1.5 py-1 rounded"
                              >
                                Max
                              </button>
                            </div>
                            <span className="text-[9px] text-slate-500 mt-1">Verfügbar: {available}</span>
                          </div>
                        );
                      })}
                      {Object.values(selectedPlanet.ships).reduce((a, b) => a + b, 0) === 0 && (
                        <div className="col-span-full text-xs text-rose-400 italic">
                          Keine Schiffe auf diesem Planeten stationiert! Baue zuerst Schiffe in der Werft.
                        </div>
                      )}
                    </div>

                    {/* Cargo Loadout (for transport or loot) */}
                    {selectedMission === 'transport' && activeShips > 0 && (
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-3">
                        <div className="text-[11px] font-bold text-slate-300 font-mono">
                          Fracht verladen: (Maximaler Laderaum:{' '}
                          {getFleetCargoCapacity(shipsToSend).toLocaleString()})
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {['metal', 'crystal', 'deuterium'].map((resType) => {
                            const maxAvail = Math.floor(selectedPlanet.resources[resType as keyof Resources]);
                            return (
                              <div key={resType}>
                                <label className="block text-[10px] text-slate-500 capitalize mb-1">
                                  {resType} (max {maxAvail.toLocaleString()})
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max={maxAvail}
                                  value={cargo[resType as keyof Resources] || ''}
                                  onChange={(e) => {
                                    const val = Math.min(maxAvail, Math.max(0, parseInt(e.target.value) || 0));
                                    setCargo({ ...cargo, [resType]: val });
                                  }}
                                  className="w-full bg-slate-950 border border-slate-800 text-xs px-2 py-1 rounded font-mono text-slate-200"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Flight Stats */}
                    {activeShips > 0 && (
                      <div className="text-xs font-mono text-slate-500 bg-slate-900/30 p-3 rounded-xl border border-slate-800 flex flex-wrap justify-between gap-4">
                        <div>Distanz: <span className="text-slate-300">{distance.toLocaleString()} km</span></div>
                        <div>Flugzeit: <span className="text-blue-400">{durationSeconds}s</span> (Rückflug: {durationSeconds}s)</div>
                        <div>Deuterium-Verbrauch: <span className="text-amber-500">{fuelCost}</span></div>
                      </div>
                    )}

                    {/* Action */}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setExpandedSlot(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-bold transition-all cursor-pointer"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={() => handleLaunch(slot)}
                        disabled={activeShips === 0 || selectedPlanet.resources.deuterium < fuelCost}
                        className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs rounded-xl font-bold shadow-lg transition-all cursor-pointer"
                      >
                        Starten
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
