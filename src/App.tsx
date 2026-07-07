/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Rocket,
  Flame,
  Wrench,
  Cpu,
  Database,
  Compass,
  Eye,
  Send,
  Award,
  LogOut,
  TrendingUp,
  ShieldAlert,
  Clock,
  Coins,
  ChevronRight,
  Info,
  Calendar,
  Layers,
  ChevronDown,
  Edit2,
  X,
  Terminal
} from 'lucide-react';

import { GameState, Planet, Player, MissionType, Ships, Resources, Buildings, Research, Defense, DebugLogEntry } from './types';
import {
  generateUniverse,
  simulateTimePassed,
  runAILogic,
  createMoon,
  pushMoonAttemptLog,
  migrateState,
  MOON_ATTEMPT_COST,
  MOON_ATTEMPT_CHANCE
} from './utils/gameEngine';
import {
  BUILDING_NAMES,
  RESEARCH_NAMES,
  SHIP_NAMES,
  DEFENSE_NAMES,
  getBuildingUpgradeCost,
  getResearchUpgradeCost,
  SHIP_COSTS,
  SHIP_STATS,
  DEFENSE_STATS,
  DEFENSE_COSTS,
  getRapidFireList,
  hasEnoughResources,
  getBuildingBuildDuration,
  getResearchDuration,
  getEffectiveResearchLabLevel,
  getShipyardBuildDuration,
  getEnergyStatus,
  getPlanetProductionPerHour,
  getMetalMineProduction,
  getCrystalMineProduction,
  getDeuteriumSynthesizerProduction,
  getSolarPowerPlantProduction,
  getMetalMineEnergyConsumption,
  getCrystalMineEnergyConsumption,
  getDeuteriumSynthesizerEnergyConsumption,
  getFusionPowerPlantProduction,
  getFusionPowerPlantDeuteriumConsumption,
  getPlanetStorageCapacities,
  getDistance,
  getFlightDuration,
  getShipSpeed,
  getShipCargoCapacity,
  getFleetCargoCapacity,
  getFlightFuelConsumption,
  BUILDING_REQUIREMENTS,
  RESEARCH_REQUIREMENTS,
  SHIP_REQUIREMENTS,
  DEFENSE_REQUIREMENTS,
  isRequirementMet,
  canBuildOnBody,
  getMaxBuildingLevel,
  getBuildableBuildingsForBody,
  getMoonMaxFields,
  getMatterConverterMetalInput,
  getMatterConverterFactor,
  getMatterConverterEnergyConsumption,
  getMatterConverterOutput
} from './utils/formulas';

import MainMenu from './components/MainMenu';
import GalaxyView from './components/GalaxyView';
import CombatLogsView from './components/CombatLogsView';
import DebugConsoleView from './components/DebugConsoleView';
import { AssetThumb, AssetBackground } from './components/GameImage';
import {
  buildingImage,
  researchImage,
  shipImage,
  defenseImage,
  planetImage,
  backgroundImage,
  getPlanetImageCategory,
  getPlanetImageVariant,
  setAssetDebug,
} from './utils/images';

const STORAGE_KEY = 'orionkriege_savestate_v1';

const MISSION_LABELS: Record<MissionType, string> = {
  transport: 'Transport', attack: 'Angriff', spy: 'Spionage', colonize: 'Kolonisierung', destroy: 'Planet vernichten', recycle: 'Recyceln',
};

// Restzeit bis zu einem Zeitpunkt (ms) als kompakter String + absolute Uhrzeit.
function formatArrival(targetTime: number, now: number): { remaining: string; clock: string } {
  const totalSeconds = Math.max(0, Math.round((targetTime - now) / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const remaining = h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  return { remaining, clock: new Date(targetTime).toLocaleTimeString() };
}

const DEBUG_LOG_CAP = 400;

// Sprungtor-Cooldown (Basis 1h, durch Geschwindigkeits-Multiplikator verkürzt)
const JUMP_GATE_COOLDOWN_MS = 3600000;

// Append a human-player action to the debug log (only when debugMode is on).
// Returns the new debugLog array to spread into setState; a no-op array otherwise.
function appendPlayerDebugLog(
  state: GameState,
  category: DebugLogEntry['category'],
  message: string
): DebugLogEntry[] | undefined {
  if (!state.debugMode) return state.debugLog;
  const human = state.players.find((p) => p.id === 'player');
  const entry: DebugLogEntry = {
    id: `dbg_player_${Date.now()}_${Math.random()}`,
    timestamp: Date.now(),
    playerId: 'player',
    playerName: human?.name ?? 'Imperator',
    category,
    message,
  };
  const next = [...(state.debugLog ?? []), entry];
  return next.length > DEBUG_LOG_CAP ? next.slice(-DEBUG_LOG_CAP) : next;
}

const RESEARCH_DETAILS: Record<string, { description: string; getCumulativeEffect: (lvl: number) => string }> = {
  espionage: {
    description: 'Ermöglicht das Ausspionieren fremder Planeten durch Spionagesonden. Je höher die Stufe, desto mehr Details zeigt ein Bericht.',
    getCumulativeEffect: (lvl) => `Stufe ${lvl}: Erhöht die Informationsdichte von Spionageberichten.`
  },
  computer: {
    description: 'Ermöglicht die Koordination und Steuerung von mehr Flotten gleichzeitig.',
    getCumulativeEffect: (lvl) => `Maximal ${lvl + 1} aktive Flottenslots gleichzeitig.`
  },
  weapons: {
    description: 'Erhöht die Waffenleistung und Schadenseffizienz aller Schiffe und Verteidigungsanlagen um 10% pro Stufe.',
    getCumulativeEffect: (lvl) => `+${lvl * 10}% Angriffsstärke.`
  },
  shielding: {
    description: 'Erhöht die Kapazität der Schutzschilde aller Schiffe und Verteidigungsanlagen um 10% pro Stufe.',
    getCumulativeEffect: (lvl) => `+${lvl * 10}% Schildstärke.`
  },
  armour: {
    description: 'Verstärkt die Legierungen der Schiffshüllen und Panzerungen um 10% pro Stufe, wodurch die Strukturpunkte steigen.',
    getCumulativeEffect: (lvl) => `+${lvl * 10}% Strukturpunkte (LP).`
  },
  energy: {
    description: 'Grundlagenforschung zur Energieversorgung. Erhöht die Energieerzeugung des Fusionskraftwerks.',
    getCumulativeEffect: (lvl) => `Fusionskraftwerksleistung skaliert mit Energietechnik Stufe ${lvl}.`
  },
  combustionDrive: {
    description: 'Klassischer Rückstoßantrieb. Erhöht die Geschwindigkeit von Kleinen/Großen Transportern, Leichten Jägern, Recyclern und Spionagesonden um 10% pro Stufe.',
    getCumulativeEffect: (lvl) => `+${lvl * 10}% Geschwindigkeit für betroffene Schiffstypen.`
  },
  impulseDrive: {
    description: 'Teilchenbeschleunigungsantrieb. Erhöht die Geschwindigkeit von Schweren Jägern, Kreuzern und Kolonieschiffen um 20% pro Stufe. Ab Stufe 5 fliegt der Kleine Transporter mit Impulsantrieb.',
    getCumulativeEffect: (lvl) => `+${lvl * 20}% Geschwindigkeit für betroffene Schiffstypen. ${lvl >= 5 ? '(Kleine Transporter nutzen Impulsantrieb)' : ''}`
  },
  hyperspaceDrive: {
    description: 'Krümmt den Raum für interstellare Reisen. Erhöht die Geschwindigkeit von Schlachtschiffen, Bombern, Zerstörern und Todessternen um 30% pro Stufe.',
    getCumulativeEffect: (lvl) => `+${lvl * 30}% Geschwindigkeit für betroffene Schiffstypen.`
  },
  astrophysics: {
    description: 'Erlaubt das Entsenden von Expeditionen und die Besiedlung neuer Welten (Kolonisierung).',
    getCumulativeEffect: (lvl) => `Max. ${1 + Math.floor(lvl / 2)} Planeten (Hauptplanet + ${Math.floor(lvl / 2)} Kolonien) besiedelbar.`
  },
  laserTech: {
    description: 'Forschung an hochenergetischen Lichtbündeln. Voraussetzung für fortschrittliche Kampfsysteme und Forschung.',
    getCumulativeEffect: (lvl) => `Ermöglicht Lasergeschütze, Schwere Laser, Kreuzer und Bomber.`
  },
  ionTech: {
    description: 'Bündelung von Ionenstrahlen. Voraussetzung für Ionengeschütze und fortschrittliche Waffen.',
    getCumulativeEffect: (lvl) => `Ermöglicht Ionengeschütze und Plasma-Forschung.`
  },
  plasmaTech: {
    description: 'Erzeugung extrem heißer Materie. Erhöht die Produktion von Metallminen um +1%, Kristallminen um +0.66% und Deuterium-Synthesizern um +0.33% pro Stufe.',
    getCumulativeEffect: (lvl) => `Mine-Produktion: +${(lvl * 1.0).toFixed(1)}% Metall, +${(lvl * 0.66).toFixed(2)}% Kristall, +${(lvl * 0.33).toFixed(2)}% Deuterium.`
  },
  intergalacticResearchNetwork: {
    description: 'Ermöglicht den Zusammenschluss von Forschungslaboren auf verschiedenen Planeten, um die Forschungsdauer zu senken.',
    getCumulativeEffect: (lvl) => lvl > 0 ? `Verbindet die ${lvl} am höchsten ausgebauten Forschungslabore zur Forschungsbeschleunigung.` : 'Noch nicht aktiv (Verbindet Labore ab Stufe 1).'
  },
  materialScience: {
    description: 'Effizientere Bauverfahren senken den Kostenanstieg aller Gebäude um 1% pro Stufe. Wirkt rückwirkend auf alle Ausbaustufen (keine Rückerstattung bereits ausgegebener Ressourcen).',
    getCumulativeEffect: (lvl) => `Kostenanstieg aller Gebäude um ${lvl}% reduziert.`
  },
  moonExpedition: {
    description: 'Erschließt zusätzlichen Bauplatz auf Monden. Jede Stufe gibt auf jedem deiner Monde ein weiteres Baufeld frei.',
    getCumulativeEffect: (lvl) => `+${lvl} Baufeld(er) auf jedem Mond.`
  }
};

export default function App() {
  // Game screens: 'menu' | 'overview' | 'buildings' | 'facilities' | 'research' | 'shipyard' | 'defense' | 'fleet' | 'galaxy' | 'empire' | 'combat'
  const [view, setView] = useState<string>('menu');
  const [state, setState] = useState<GameState | null>(null);
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [renameValue, setRenameValue] = useState<string>('');
  const [hasSave, setHasSave] = useState<boolean>(false);
  const [showOfflineModal, setShowOfflineModal] = useState<boolean>(false);
  const [offlineDetails, setOfflineDetails] = useState<{ hours: number; mins: number; secs: number } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('buildings'); // sub-tab for resources/facilities

  // Quantities for shipyard/defense order
  const [shipyardOrderQty, setShipyardOrderQty] = useState<Record<string, number>>({});
  const [defenseOrderQty, setDefenseOrderQty] = useState<Record<string, number>>({});

  // Manual fleet dispatch view state
  const [manualTargetSystem, setManualTargetSystem] = useState<number>(1);
  const [manualTargetSlot, setManualTargetSlot] = useState<number>(1);
  const [manualMission, setManualMission] = useState<MissionType>('transport');
  const [manualShips, setManualShips] = useState<Ships>({
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
  const [manualCargo, setManualCargo] = useState<Resources>({ metal: 0, crystal: 0, deuterium: 0 });
  const [fleetFeedback, setFleetFeedback] = useState<string | null>(null);

  const renderRequirementsList = (req: any) => {
    if (!req || (!req.buildings && !req.research)) return null;
    
    const items: { label: string; met: boolean }[] = [];
    
    if (req.buildings) {
      for (const [bKey, lvl] of Object.entries(req.buildings)) {
        const currentLvl = selectedPlanet?.buildings[bKey as keyof Buildings] || 0;
        const met = currentLvl >= (lvl as number);
        items.push({
          label: `${BUILDING_NAMES[bKey as keyof Buildings]} (Stufe ${lvl})`,
          met
        });
      }
    }
    
    if (req.research) {
      for (const [rKey, lvl] of Object.entries(req.research)) {
        const currentLvl = player?.research[rKey as keyof Research] || 0;
        const met = currentLvl >= (lvl as number);
        items.push({
          label: `${RESEARCH_NAMES[rKey as keyof Research]} (Stufe ${lvl})`,
          met
        });
      }
    }
    
    if (items.length === 0) return null;
    
    return (
      <div className="mt-1.5 text-[10px] space-y-0.5 font-mono">
        <span className="text-slate-500 font-bold uppercase tracking-wider">Benötigt:</span>
        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
          {items.map((item, idx) => (
            <span
              key={idx}
              className={`inline-flex items-center gap-1 ${
                item.met ? 'text-emerald-500/80' : 'text-rose-400 font-semibold'
              }`}
            >
              {item.met ? '✓' : '✗'} {item.label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Shipyard build queue + live progress (shared by shipyard & defense views)
  const renderShipyardQueue = () => {
    if (!selectedPlanet || selectedPlanet.buildings.shipyard === 0) return null;
    const queue = selectedPlanet.activeShipyardQueue;

    return (
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold font-mono tracking-wide text-slate-400 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" /> Werft-Warteschlange
          {queue.length > 0 && <span className="text-slate-600">({queue.length})</span>}
        </h3>

        {queue.length === 0 ? (
          <div className="text-xs text-slate-600 font-mono italic">
            Werft ist unbeschäftigt. Aufträge werden hier der Reihe nach abgearbeitet.
          </div>
        ) : (
          <div className="space-y-2">
            {queue.map((job, idx) => {
              const name = job.type === 'ship'
                ? SHIP_NAMES[job.target as keyof Ships]
                : DEFENSE_NAMES[job.target as keyof Defense];
              const isActive = idx === 0;
              const pct = isActive && job.durationPerItem > 0
                ? Math.min(100, Math.max(0, ((job.durationPerItem - job.durationRemainingInCurrent) / job.durationPerItem) * 100))
                : 0;

              return (
                <div key={job.id} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono gap-2">
                    <span className="text-slate-200 font-semibold">
                      {job.count}x {name}
                    </span>
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <span className="text-amber-500 font-bold">
                          Aktiv · {Math.round(job.durationRemainingInCurrent)}s / Einheit
                        </span>
                      ) : (
                        <span className="text-slate-600">Wartend</span>
                      )}
                      <button
                        onClick={() => handleCancelShipyardJob(job.id)}
                        title="Auftrag abbrechen (Ressourcen werden erstattet)"
                        className="p-1 rounded-md text-rose-400/80 hover:text-rose-300 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/40 transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {isActive && (
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Check save game availability
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setHasSave(true);
    }
  }, []);

  // REALTIME TICK LOOP
  useEffect(() => {
    if (!state) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setState((prev) => {
        if (!prev) return null;
        // 1. Tick simulated time and production
        let updated = simulateTimePassed(prev, now);
        // 2. Tick AI opponent decisions
        updated = runAILogic(updated);
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state !== null]);

  // Keep a ref to the latest state so the autosave interval below can read it
  // without being torn down and recreated on every 1s tick (which previously
  // reset the 12s timer before it could ever fire -> autosave never ran).
  const stateRef = useRef<GameState | null>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // AUTOSAVE TRIGGER (Every 12 seconds) — set up once per game via a stable dependency.
  useEffect(() => {
    if (!state) return;
    const interval = setInterval(() => {
      const current = stateRef.current;
      if (!current) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      setHasSave(true);
    }, 12000);
    return () => clearInterval(interval);
  }, [state !== null]);

  // Enable soft asset-resolution warnings only in debug mode
  useEffect(() => {
    setAssetDebug(!!state?.debugMode);
  }, [state?.debugMode]);

  // HANDLERS
  const handleNewGame = (speed: number, isDebugMode: boolean = false) => {
    const freshState = generateUniverse(speed, isDebugMode);
    setState(freshState);
    setView('overview');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(freshState));
    setHasSave(true);
  };

  const handleLoadGame = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const loaded: GameState = migrateState(JSON.parse(saved));
      const now = Date.now();
      const deltaMs = now - loaded.lastTickTimestamp;

      if (deltaMs > 5000) {
        // Compute offline time details
        const totalSeconds = Math.floor(deltaMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;

        setOfflineDetails({ hours, mins, secs });
        setShowOfflineModal(true);

        // Simulate offline time up to current timestamp
        const simulated = simulateTimePassed(loaded, now);
        setState(simulated);
      } else {
        setState(loaded);
      }
      setView('overview');
    } catch (e) {
      console.error('Failed to load save state:', e);
      alert('Spielstand beschädigt! Starten Sie ein neues Spiel.');
    }
  };

  const handleReturnToMenu = () => {
    if (state) {
      // Manual save before exiting
      const saveState = { ...state, lastTickTimestamp: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveState));
      setHasSave(true);
    }
    setView('menu');
  };

  // Get active items
  const player = state?.players.find((p) => p.id === 'player') || null;
  const planets = state?.planets.filter((p) => p.ownerId === 'player') || [];
  const selectedPlanet = planets.find((p) => p.id === state?.selectedPlanetId) || planets[0] || null;

  // --- Mond-/Ressourcen-Pool-Hilfen ---
  const findPlanetById = (id: string | null | undefined): Planet | null =>
    id ? (state?.planets.find((p) => p.id === id) || null) : null;
  const getParentPlanet = (body: Planet | null): Planet | null =>
    body && body.isMoon ? findPlanetById(body.parentPlanetId) : null;
  const getMoonOfPlanet = (planet: Planet | null): Planet | null =>
    planet && !planet.isMoon ? findPlanetById(planet.moonId) : null;
  // Ist der Ressourcen-Pool (Mondkanone) für diesen Körper aktiv?
  const isPoolActive = (body: Planet | null): boolean => {
    if (!body) return false;
    if (body.isMoon) {
      const parent = getParentPlanet(body);
      return !!parent && (parent.buildings.moonCannon || 0) >= 1;
    }
    return (body.buildings.moonCannon || 0) >= 1 && !!getMoonOfPlanet(body);
  };
  // Der Körper, der bei Ausgaben/Anzeige die Ressourcen hält (bei aktivem Pool der Planet).
  const getResourceHolder = (body: Planet | null): Planet | null => {
    if (!body) return null;
    if (body.isMoon) {
      const parent = getParentPlanet(body);
      return parent && (parent.buildings.moonCannon || 0) >= 1 ? parent : body;
    }
    return body;
  };
  // Materieumwandler-Durchsatz eines Mondes pro Stunde (Metall negativ = Verbrauch). Der
  // Energieverbrauch (speed-skaliert) fließt in die Energiebilanz des Elternplaneten ein; der
  // resultierende ratio drosselt den Durchsatz. Abgeschaltet (converterActive === false) → 0.
  const computeConverterPerHour = (moon: Planet | null, parent: Planet | null): Resources => {
    const level = moon?.buildings.matterConverter || 0;
    if (!moon || level <= 0 || !parent || !state || moon.converterActive === false) return { metal: 0, crystal: 0, deuterium: 0 };
    const energyTech = player?.research.energy || 0;
    const convConsumption = getMatterConverterEnergyConsumption(level, state.speedMultiplier);
    const { ratio } = getEnergyStatus(
      parent.buildings, parent.ships.solarSatellite || 0, parent.temperatureMax, energyTech,
      parent.fusionActive !== false, state.speedMultiplier, convConsumption
    );
    const metalPerHour = getMatterConverterMetalInput(level) * ratio * state.speedMultiplier;
    const out = getMatterConverterOutput(level, player?.research.laserTech || 0, player?.research.espionage || 0, metalPerHour);
    return { metal: -metalPerHour, crystal: out.crystal, deuterium: out.deuterium };
  };

  const handleSelectPlanet = (planetId: string) => {
    if (!state) return;
    setState({
      ...state,
      selectedPlanetId: planetId,
    });
  };

  // Dispatch manual fleet from form
  const handleManualFleetLaunch = () => {
    if (!state || !selectedPlanet) return;
    const res = handleLaunchFleet(
      manualTargetSystem,
      manualTargetSlot,
      manualMission,
      manualShips,
      manualCargo
    );
    if (res.success) {
      setFleetFeedback('Flotte erfolgreich gestartet!');
      // Reset form
      setManualShips({
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
      setManualCargo({ metal: 0, crystal: 0, deuterium: 0 });
      setTimeout(() => setFleetFeedback(null), 3000);
    } else {
      setFleetFeedback(`Fehler: ${res.error}`);
    }
  };

  // Launch fleet mechanics (shared)
  const handleLaunchFleet = (
    targetSystem: number,
    targetSlot: number,
    mission: MissionType,
    ships: Ships,
    resources: Resources
  ): { success: boolean; error?: string } => {
    if (!state || !selectedPlanet || !player) return { success: false, error: 'Kein Spiel geladen' };

    // Check if any ships are selected
    const totalShips = Object.values(ships).reduce((a, b) => a + b, 0);
    if (totalShips === 0) {
      return { success: false, error: 'Keine Schiffe ausgewählt.' };
    }

    // Verify player has selected ships available
    for (const [shipType, count] of Object.entries(ships)) {
      if (count > (selectedPlanet.ships[shipType as keyof Ships] || 0)) {
        return { success: false, error: `Nicht genügend ${SHIP_NAMES[shipType as keyof Ships]} vorhanden.` };
      }
    }

    // Identify target planet if exists
    const targetPlanet = state.planets.find((p) => p.system === targetSystem && p.slot === targetSlot);
    if (!targetPlanet) {
      return { success: false, error: 'Ungültige Koordinaten.' };
    }

    // Recycle-Mission: nur Recycler können Trümmer bergen, und es muss ein Trümmerfeld geben.
    if (mission === 'recycle') {
      if ((ships.recycler || 0) < 1) {
        return { success: false, error: 'Nur Recycler können Trümmer bergen.' };
      }
      const fieldTotal = (targetPlanet.debris?.metal || 0) + (targetPlanet.debris?.crystal || 0);
      if (fieldTotal <= 0) {
        return { success: false, error: 'Kein Trümmerfeld an diesem Ort.' };
      }
    }

    // Calculate flight stats
    const dist = getDistance(selectedPlanet.system, selectedPlanet.slot, targetSystem, targetSlot);
    let minSpeed = Infinity;
    for (const [shipType, count] of Object.entries(ships)) {
      if (count > 0) {
        const speed = getShipSpeed(shipType as keyof Ships, player.research);
        if (speed < minSpeed) minSpeed = speed;
      }
    }

    const durationSeconds = getFlightDuration(dist, minSpeed, 100, state.speedMultiplier);
    const fuelCost = getFlightFuelConsumption(ships, dist, 100);

    // Verify deuterium fuel cost
    if (selectedPlanet.resources.deuterium < fuelCost) {
      return { success: false, error: `Nicht genügend Deuterium als Treibstoff vorhanden (Benötigt: ${fuelCost}).` };
    }

    // Cargo constraints
    const maxCargo = getFleetCargoCapacity(ships);
    const totalCargoRequested = resources.metal + resources.crystal + resources.deuterium;
    if (totalCargoRequested > maxCargo) {
      return { success: false, error: 'Die Fracht überschreitet den maximalen Laderaum der Flotte.' };
    }

    // Verify planet has requested resources to load
    if (
      selectedPlanet.resources.metal < resources.metal ||
      selectedPlanet.resources.crystal < resources.crystal ||
      selectedPlanet.resources.deuterium < resources.deuterium + fuelCost
    ) {
      return { success: false, error: 'Nicht genügend Ressourcen auf dem Planeten vorhanden.' };
    }

    // Deduct ships & cargo from planet
    const updatedPlanets = state.planets.map((p) => {
      if (p.id === selectedPlanet.id) {
        const pShips = { ...p.ships };
        for (const [shipType, count] of Object.entries(ships)) {
          pShips[shipType as keyof Ships] -= count;
        }

        return {
          ...p,
          ships: pShips,
          resources: {
            metal: p.resources.metal - resources.metal,
            crystal: p.resources.crystal - resources.crystal,
            deuterium: p.resources.deuterium - (resources.deuterium + fuelCost),
          },
        };
      }
      return p;
    });

    // Create fleet in flight
    const now = Date.now();
    const arrivalTime = now + durationSeconds * 1000;
    const returnTime = arrivalTime + durationSeconds * 1000;

    const newFleet = {
      id: `fleet_${Date.now()}_${Math.random()}`,
      ownerId: 'player',
      originPlanetId: selectedPlanet.id,
      targetPlanetId: targetPlanet.id,
      targetSystem,
      targetSlot,
      mission,
      ships,
      resources,
      departureTime: now,
      arrivalTime,
      returnTime,
      isReturning: false,
      speedMultiplier: state.speedMultiplier,
    };

    setState({
      ...state,
      planets: updatedPlanets,
      fleets: [...state.fleets, newFleet],
      debugLog: appendPlayerDebugLog(state, 'fleet', `${MISSION_LABELS[mission]} → ${targetSystem}:${targetSlot} mit ${totalShips} Schiffen`),
    });

    return { success: true };
  };

  // Upgrade building handler
  const handleUpgradeBuilding = (buildingType: keyof Buildings) => {
    if (!state || !selectedPlanet || !player) return;

    const parent = getParentPlanet(selectedPlanet);

    // Grundsätzliche Baubarkeit: Körper-Whitelist + Voraussetzungen + Sonderfall Mondkanone/Materieumwandler.
    if (!canBuildOnBody(selectedPlanet, buildingType, parent, player.research)) {
      alert('Dieses Gebäude kann hier nicht (mehr) gebaut werden – Voraussetzungen oder Bauplatz fehlen.');
      return;
    }

    const currentLvl = selectedPlanet.buildings[buildingType];
    const activeQueue = selectedPlanet.activeBuildQueue || [];
    const queuedUpgradesCount = activeQueue.filter(j => j.target === buildingType).length;
    const upgradeLevel = currentLvl + queuedUpgradesCount + 1;

    // Maximalstufe (inkl. Warteschlange) beachten – Mondkanone/Sprungtor haben nur Stufe 1.
    if (upgradeLevel > getMaxBuildingLevel(buildingType)) {
      alert('Maximale Ausbaustufe bereits erreicht oder eingeplant.');
      return;
    }

    const cost = getBuildingUpgradeCost(buildingType, upgradeLevel - 1, player.research.materialScience || 0);

    // Bei aktivem Mondkanonen-Pool zahlt der Elternplanet; sonst der Körper selbst.
    const holder = getResourceHolder(selectedPlanet) || selectedPlanet;
    if (!hasEnoughResources(holder.resources, cost)) {
      alert('Nicht genügend Ressourcen!');
      return;
    }

    // Fields used limit (taking into account already queued buildings!)
    const totalFieldsUsedWithQueue = selectedPlanet.fieldsUsed + activeQueue.length;
    if (totalFieldsUsedWithQueue >= selectedPlanet.maxFields) {
      alert(selectedPlanet.isMoon
        ? 'Mond ist voll bebaut! Baue die Mondbasis aus oder erforsche die Mondexpedition für mehr Felder.'
        : 'Planet ist voll bebaut! Keine freien Felder verfügbar (Warteschlange berücksichtigt).');
      return;
    }

    const duration = getBuildingBuildDuration(
      buildingType,
      upgradeLevel,
      selectedPlanet.buildings.roboticsFactory,
      state.speedMultiplier,
      selectedPlanet.buildings.naniteFactory || 0
    );

    const newJob = {
      id: `build_${Date.now()}_${Math.random()}`,
      type: 'building' as const,
      target: buildingType,
      level: upgradeLevel,
      durationTotal: duration,
      durationRemaining: duration,
    };

    const updatedPlanets = state.planets.map((p) => {
      let np = p;
      if (p.id === selectedPlanet.id) {
        const queue = np.activeBuildQueue ? [...np.activeBuildQueue] : [];
        queue.push(newJob);
        np = { ...np, activeBuildQueue: queue, activeBuildJob: queue[0] };
      }
      if (p.id === holder.id) {
        np = {
          ...np,
          resources: {
            metal: np.resources.metal - cost.metal,
            crystal: np.resources.crystal - cost.crystal,
            deuterium: np.resources.deuterium - cost.deuterium,
          },
        };
      }
      return np;
    });

    setState({
      ...state,
      planets: updatedPlanets,
      debugLog: appendPlayerDebugLog(state, 'build', `${selectedPlanet.name}: baut ${BUILDING_NAMES[buildingType]} → Stufe ${upgradeLevel}`),
    });
  };

  // Demolish building handler
  const handleDemolishBuilding = (bKey: keyof Buildings) => {
    if (!state || !selectedPlanet) return;
    const currentLvl = selectedPlanet.buildings[bKey];
    if (currentLvl <= 0) return;

    const confirmMessage = `Möchtest du ${BUILDING_NAMES[bKey]} wirklich um eine Stufe abreißen? Dadurch sinkt die Stufe von ${currentLvl} auf ${currentLvl - 1}, und es wird 1 Feld freigegeben. Kosten: 25% der Baukosten.`;
    if (!window.confirm(confirmMessage)) return;

    const fullCost = getBuildingUpgradeCost(bKey, currentLvl - 1, player?.research.materialScience || 0);
    const demolishCost = {
      metal: Math.floor(fullCost.metal * 0.25),
      crystal: Math.floor(fullCost.crystal * 0.25),
      deuterium: Math.floor(fullCost.deuterium * 0.25)
    };

    const holder = getResourceHolder(selectedPlanet) || selectedPlanet;
    if (!hasEnoughResources(holder.resources, demolishCost)) {
      alert('Nicht genügend Ressourcen für den Abriss!');
      return;
    }

    const updatedPlanets = state.planets.map(p => {
      let np = p;
      if (p.id === selectedPlanet.id) {
        const newBuildings = { ...np.buildings };
        newBuildings[bKey] = Math.max(0, currentLvl - 1);
        np = { ...np, buildings: newBuildings, fieldsUsed: Math.max(0, np.fieldsUsed - 1) };
      }
      if (p.id === holder.id) {
        np = {
          ...np,
          resources: {
            metal: np.resources.metal - demolishCost.metal,
            crystal: np.resources.crystal - demolishCost.crystal,
            deuterium: np.resources.deuterium - demolishCost.deuterium
          }
        };
      }
      return np;
    });

    setState({
      ...state,
      planets: updatedPlanets,
    });
  };

  // Toggle fusion power plant handler
  const handleToggleFusion = () => {
    if (!state || !selectedPlanet) return;
    const currentActive = selectedPlanet.fusionActive !== false; // Default to true
    const updatedPlanets = state.planets.map(p => {
      if (p.id === selectedPlanet.id) {
        return {
          ...p,
          fusionActive: !currentActive
        };
      }
      return p;
    });
    setState({
      ...state,
      planets: updatedPlanets,
    });
  };

  // Mondversuch: Planet mit Mondkanone versucht (20% Chance) einen Mond zu erschaffen
  const handleMoonAttempt = () => {
    if (!state || !selectedPlanet || !player) return;
    if (selectedPlanet.isMoon) return;
    if ((selectedPlanet.buildings.moonCannon || 0) < 1) {
      alert('Für einen Mondversuch wird die Mondkanone benötigt.');
      return;
    }
    if (getMoonOfPlanet(selectedPlanet)) {
      alert('Dieser Planet besitzt bereits einen Mond.');
      return;
    }
    if (!hasEnoughResources(selectedPlanet.resources, MOON_ATTEMPT_COST)) {
      alert('Nicht genügend Ressourcen für den Mondversuch (je 1.000.000 Metall, Kristall, Deuterium).');
      return;
    }

    const now = Date.now();
    const success = Math.random() < MOON_ATTEMPT_CHANCE;
    const combatLog = [...state.combatLog];

    let planets = state.planets.map((p) => p.id === selectedPlanet.id ? {
      ...p,
      resources: {
        metal: p.resources.metal - MOON_ATTEMPT_COST.metal,
        crystal: p.resources.crystal - MOON_ATTEMPT_COST.crystal,
        deuterium: p.resources.deuterium - MOON_ATTEMPT_COST.deuterium,
      },
    } : p);

    if (success) {
      const parentAfter = planets.find((p) => p.id === selectedPlanet.id)!;
      const moon = createMoon(parentAfter, player.research.moonExpedition || 0, now);
      planets = planets.map((p) => p.id === parentAfter.id ? { ...p, moonId: moon.id } : p);
      planets = [...planets, moon];
      pushMoonAttemptLog(combatLog, parentAfter, player.name, `Mondversuch erfolgreich! Bei ${parentAfter.name} ist ein Mond (Ø ${moon.diameter.toLocaleString()} km) entstanden.`, now);
    } else {
      pushMoonAttemptLog(combatLog, selectedPlanet, player.name, `Mondversuch bei ${selectedPlanet.name} fehlgeschlagen – kein Mond entstanden.`, now);
    }

    setState({
      ...state,
      planets,
      combatLog,
      debugLog: appendPlayerDebugLog(state, 'info', success ? `Mondversuch erfolgreich bei ${selectedPlanet.name}` : `Mondversuch fehlgeschlagen bei ${selectedPlanet.name}`),
    });
  };

  // Sprungtor: alle Schiffe des aktuellen Mondes sofort zu einem anderen eigenen Mond mit Sprungtor springen
  const handleJumpFleet = (targetMoonId: string) => {
    if (!state || !selectedPlanet || !selectedPlanet.isMoon) return;
    if ((selectedPlanet.buildings.jumpGate || 0) < 1) {
      alert('Sprungtor erforderlich.');
      return;
    }
    const target = findPlanetById(targetMoonId);
    if (!target || !target.isMoon || target.ownerId !== 'player' || (target.buildings.jumpGate || 0) < 1) {
      alert('Das Ziel benötigt ebenfalls ein Sprungtor.');
      return;
    }
    const now = Date.now();
    const cooldown = JUMP_GATE_COOLDOWN_MS / (state.speedMultiplier || 1);
    if (selectedPlanet.lastJumpTime && now - selectedPlanet.lastJumpTime < cooldown) {
      const remaining = Math.ceil((cooldown - (now - selectedPlanet.lastJumpTime)) / 1000);
      alert(`Sprungtor lädt noch auf (${remaining}s verbleibend).`);
      return;
    }
    const moved = { ...selectedPlanet.ships };
    const total = (Object.values(moved) as number[]).reduce((a, b) => a + b, 0);
    if (total <= 0) {
      alert('Keine Schiffe zum Springen vorhanden.');
      return;
    }

    const planets = state.planets.map((p) => {
      if (p.id === selectedPlanet.id) {
        const zero = { ...p.ships };
        (Object.keys(zero) as (keyof Ships)[]).forEach((k) => { zero[k] = 0; });
        return { ...p, ships: zero, lastJumpTime: now };
      }
      if (p.id === target.id) {
        const s = { ...p.ships };
        (Object.keys(moved) as (keyof Ships)[]).forEach((k) => { s[k] += moved[k]; });
        return { ...p, ships: s };
      }
      return p;
    });

    setState({ ...state, planets });
  };

  // Toggle Materieumwandler (Mond) an/aus – wie das Fusionskraftwerk
  const handleToggleConverter = () => {
    if (!state || !selectedPlanet) return;
    const currentActive = selectedPlanet.converterActive !== false; // Default an
    const updatedPlanets = state.planets.map(p =>
      p.id === selectedPlanet.id ? { ...p, converterActive: !currentActive } : p
    );
    setState({ ...state, planets: updatedPlanets });
  };

  // Save planet/moon name handler
  const handleSavePlanetName = () => {
    if (!state || !selectedPlanet || !renameValue.trim()) return;
    const updatedPlanets = state.planets.map(p => {
      if (p.id === selectedPlanet.id) {
        return {
          ...p,
          name: renameValue.trim()
        };
      }
      return p;
    });
    setState({
      ...state,
      planets: updatedPlanets
    });
    setIsRenaming(false);
  };

  // Cancel building in queue handler
  const handleCancelBuilding = (jobId: string) => {
    if (!state || !selectedPlanet) return;

    const updatedPlanets = state.planets.map((p) => {
      if (p.id === selectedPlanet.id) {
        const queue = p.activeBuildQueue ? [...p.activeBuildQueue] : [];
        const jobIndex = queue.findIndex(j => j.id === jobId);
        if (jobIndex === -1) return p;

        const job = queue[jobIndex];
        const refundCost = getBuildingUpgradeCost(job.target, job.level - 1, player?.research.materialScience || 0);

        queue.splice(jobIndex, 1);

        return {
          ...p,
          resources: {
            metal: p.resources.metal + refundCost.metal,
            crystal: p.resources.crystal + refundCost.crystal,
            deuterium: p.resources.deuterium + refundCost.deuterium,
          },
          activeBuildQueue: queue,
          activeBuildJob: queue[0] || null,
        };
      }
      return p;
    });

    setState({
      ...state,
      planets: updatedPlanets,
    });
  };

  // Start research handler
  const handleStartResearch = (researchType: keyof Research) => {
    if (!state || !player || !selectedPlanet) return;

    const currentLvl = player.research[researchType];
    const activeQueue = player.activeResearchQueue || [];
    const queuedUpgradesCount = activeQueue.filter(j => j.target === researchType).length;
    const upgradeLevel = currentLvl + queuedUpgradesCount + 1;
    const cost = getResearchUpgradeCost(researchType, upgradeLevel - 1);

    if (!hasEnoughResources(selectedPlanet.resources, cost)) {
      alert('Nicht genügend Ressourcen!');
      return;
    }

    const duration = getResearchDuration(
      researchType,
      upgradeLevel,
      getEffectiveResearchLabLevel(selectedPlanet.id, state.planets, player.research.intergalacticResearchNetwork || 0),
      state.speedMultiplier
    );

    // Deduct resources from selected planet and start research job
    const updatedPlanets = state.planets.map((p) => {
      if (p.id === selectedPlanet.id) {
        return {
          ...p,
          resources: {
            metal: p.resources.metal - cost.metal,
            crystal: p.resources.crystal - cost.crystal,
            deuterium: p.resources.deuterium - cost.deuterium,
          },
        };
      }
      return p;
    });

    const updatedPlayers = state.players.map((p) => {
      if (p.id === 'player') {
        const queue = p.activeResearchQueue ? [...p.activeResearchQueue] : [];
        const newJob = {
          id: `research_${Date.now()}_${Math.random()}`,
          type: 'research' as const,
          target: researchType,
          level: upgradeLevel,
          durationTotal: duration,
          durationRemaining: duration,
        };
        queue.push(newJob);
        return {
          ...p,
          activeResearchQueue: queue,
          activeResearchJob: queue[0],
        };
      }
      return p;
    });

    setState({
      ...state,
      planets: updatedPlanets,
      players: updatedPlayers,
      debugLog: appendPlayerDebugLog(state, 'research', `Erforscht ${RESEARCH_NAMES[researchType]} → Stufe ${upgradeLevel}`),
    });
  };

  // Cancel research in queue handler
  const handleCancelResearch = (jobId: string) => {
    if (!state || !selectedPlanet || !player) return;

    const queue = player.activeResearchQueue ? [...player.activeResearchQueue] : [];
    const jobIndex = queue.findIndex(j => j.id === jobId);
    if (jobIndex === -1) return;

    const job = queue[jobIndex];
    const refundCost = getResearchUpgradeCost(job.target, job.level - 1);

    const updatedPlanets = state.planets.map((p) => {
      if (p.id === selectedPlanet.id) {
        return {
          ...p,
          resources: {
            metal: p.resources.metal + refundCost.metal,
            crystal: p.resources.crystal + refundCost.crystal,
            deuterium: p.resources.deuterium + refundCost.deuterium,
          },
        };
      }
      return p;
    });

    const updatedPlayers = state.players.map((p) => {
      if (p.id === 'player') {
        const pQueue = p.activeResearchQueue ? [...p.activeResearchQueue] : [];
        const index = pQueue.findIndex(j => j.id === jobId);
        if (index !== -1) {
          pQueue.splice(index, 1);
        }
        return {
          ...p,
          activeResearchQueue: pQueue,
          activeResearchJob: pQueue[0] || null,
        };
      }
      return p;
    });

    setState({
      ...state,
      planets: updatedPlanets,
      players: updatedPlayers,
    });
  };

  // Shipyard/Defense construction queue handler
  const handleOrderShipyard = (type: 'ship' | 'defense', itemKey: keyof Ships | keyof Defense) => {
    if (!state || !selectedPlanet) return;

    const qty = type === 'ship' ? shipyardOrderQty[itemKey as string] || 0 : defenseOrderQty[itemKey as string] || 0;
    if (qty <= 0) return;

    const singleCost = type === 'ship' ? SHIP_COSTS[itemKey as keyof Ships] : DEFENSE_COSTS[itemKey as keyof Defense];
    const totalCost = {
      metal: singleCost.metal * qty,
      crystal: singleCost.crystal * qty,
      deuterium: singleCost.deuterium * qty,
    };

    const holder = getResourceHolder(selectedPlanet) || selectedPlanet;
    if (!hasEnoughResources(holder.resources, totalCost)) {
      alert('Nicht genügend Ressourcen für diese Menge!');
      return;
    }

    const durationPer = getShipyardBuildDuration(
      singleCost,
      selectedPlanet.buildings.shipyard,
      selectedPlanet.buildings.roboticsFactory,
      state.speedMultiplier
    );

    const newYardJob = {
      id: `yard_${Date.now()}_${Math.random()}`,
      type,
      target: itemKey,
      count: qty,
      durationPerItem: durationPer,
      durationRemainingInCurrent: durationPer,
    };

    const updatedPlanets = state.planets.map((p) => {
      let np = p;
      if (p.id === selectedPlanet.id) {
        // Clone and add job to queue. A new job always starts its first item at the
        // full per-item duration; when it is not the head, simulateTimePassed resets
        // this value once the job reaches the front of the queue.
        np = { ...np, activeShipyardQueue: [...np.activeShipyardQueue, newYardJob] };
      }
      if (p.id === holder.id) {
        np = {
          ...np,
          resources: {
            metal: np.resources.metal - totalCost.metal,
            crystal: np.resources.crystal - totalCost.crystal,
            deuterium: np.resources.deuterium - totalCost.deuterium,
          },
        };
      }
      return np;
    });

    const itemName = type === 'ship' ? SHIP_NAMES[itemKey as keyof Ships] : DEFENSE_NAMES[itemKey as keyof Defense];
    setState({
      ...state,
      planets: updatedPlanets,
      debugLog: appendPlayerDebugLog(state, 'shipyard', `${selectedPlanet.name}: baut ${qty}× ${itemName}`),
    });

    // Reset qty inputs
    if (type === 'ship') {
      setShipyardOrderQty({ ...shipyardOrderQty, [itemKey]: 0 });
    } else {
      setDefenseOrderQty({ ...defenseOrderQty, [itemKey]: 0 });
    }
  };

  // Cancel a shipyard job (ship or defense) and refund the remaining units' cost
  const handleCancelShipyardJob = (jobId: string) => {
    if (!state || !selectedPlanet) return;

    const updatedPlanets = state.planets.map((p) => {
      if (p.id === selectedPlanet.id) {
        const queue = [...p.activeShipyardQueue];
        const idx = queue.findIndex((j) => j.id === jobId);
        if (idx === -1) return p;

        const job = queue[idx];
        const unitCost = job.type === 'ship'
          ? SHIP_COSTS[job.target as keyof Ships]
          : DEFENSE_COSTS[job.target as keyof Defense];
        const refund = {
          metal: unitCost.metal * job.count,
          crystal: unitCost.crystal * job.count,
          deuterium: unitCost.deuterium * job.count,
        };

        queue.splice(idx, 1);
        // If the active (head) job was removed, the new head restarts at full duration
        if (idx === 0 && queue.length > 0) {
          queue[0] = { ...queue[0], durationRemainingInCurrent: queue[0].durationPerItem };
        }

        return {
          ...p,
          activeShipyardQueue: queue,
          resources: {
            metal: p.resources.metal + refund.metal,
            crystal: p.resources.crystal + refund.crystal,
            deuterium: p.resources.deuterium + refund.deuterium,
          },
        };
      }
      return p;
    });

    setState({
      ...state,
      planets: updatedPlanets,
    });
  };

  const handleClearCombatLogs = () => {
    if (!state) return;
    setState({
      ...state,
      combatLog: [],
    });
  };

  const handleClearDebugLog = () => {
    if (!state) return;
    setState({
      ...state,
      debugLog: [],
    });
  };

  // Render main menu
  if (view === 'menu' || !state) {
    return (
      <MainMenu
        onNewGame={handleNewGame}
        onLoadGame={handleLoadGame}
        hasSave={hasSave}
      />
    );
  }

  // Active fleets involving the player
  const playerFleets = state.fleets.filter((f) => f.ownerId === 'player');
  const incomingHostileFleets = state.fleets.filter((f) => f.ownerId !== 'player' && f.targetPlanetId && state.planets.find(p => p.id === f.targetPlanetId)?.ownerId === 'player');

  return (
    <div id="game-dashboard-container" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* 1. TOP STATS BAR */}
      <header className="theme-header p-4 shrink-0 relative z-20 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Planet Selector */}
          <div className="flex items-center gap-3">
            <Rocket className="w-6 h-6 text-blue-400 animate-pulse" />
            <div className="relative">
              <select
                value={selectedPlanet.id}
                onChange={(e) => handleSelectPlanet(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 font-bold px-4 py-1.5 rounded-lg text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {planets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.isMoon ? '🌑 ' : ''}{p.name} [{p.system}:{p.slot}]{p.isMoon ? ' (Mond)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-xs text-slate-500 font-mono hidden sm:inline">
              Felder: {selectedPlanet.fieldsUsed} / {selectedPlanet.maxFields}
            </span>
          </div>

          {/* Resources Status Display */}
          {(() => {
            const energyTechLevel = player?.research.energy || 0;
            // Bei aktivem Mondkanonen-Pool hält der Elternplanet die Ressourcen (gemeinsamer Pool).
            const holder = getResourceHolder(selectedPlanet) || selectedPlanet;
            const caps = getPlanetStorageCapacities(holder.buildings);

            // Planet + Mond des betrachteten Paares für die (kombinierte) Produktionsanzeige bestimmen.
            const planetBody = selectedPlanet.isMoon ? getParentPlanet(selectedPlanet) : selectedPlanet;
            const moonBody = selectedPlanet.isMoon ? selectedPlanet : getMoonOfPlanet(selectedPlanet);
            const pool = isPoolActive(selectedPlanet);

            // Energieverbrauch des (aktiven) Mond-Materieumwandlers, der die Planetenbilanz belastet.
            const converterConsumption = (moonBody && moonBody.converterActive !== false)
              ? getMatterConverterEnergyConsumption(moonBody.buildings.matterConverter || 0, state.speedMultiplier)
              : 0;

            // Führende Produktion (Planet) und – bei aktivem Pool – Mondanteil in Klammern.
            let lead: Resources = { metal: 0, crystal: 0, deuterium: 0 };
            let moonDelta: Resources | null = null;
            if (pool && planetBody && moonBody) {
              lead = getPlanetProductionPerHour(planetBody.buildings, planetBody.temperatureMax, state.speedMultiplier, planetBody.ships.solarSatellite || 0, energyTechLevel, planetBody.fusionActive !== false, player?.research.plasmaTech || 0, converterConsumption);
              moonDelta = computeConverterPerHour(moonBody, planetBody);
            } else if (selectedPlanet.isMoon) {
              // Mond ohne Pool: eigener Materieumwandler produziert in die Mond-Ressourcen.
              lead = computeConverterPerHour(selectedPlanet, getParentPlanet(selectedPlanet));
            } else {
              lead = getPlanetProductionPerHour(selectedPlanet.buildings, selectedPlanet.temperatureMax, state.speedMultiplier, selectedPlanet.ships.solarSatellite || 0, energyTechLevel, selectedPlanet.fusionActive !== false, player?.research.plasmaTech || 0, converterConsumption);
            }

            const fmtRate = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v)}`;
            const fmtMoon = (v: number) => ` (${v >= 0 ? '+' : ''}${Math.round(v)})`;

            const isMetalFull = holder.resources.metal >= caps.metal * 0.9;
            const isCrystalFull = holder.resources.crystal >= caps.crystal * 0.9;
            const isDeuteriumFull = holder.resources.deuterium >= caps.deuterium * 0.9;

            return (
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm font-mono">
                {/* Metall */}
                <div className="flex items-center gap-2 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-500 font-bold uppercase">Met</span>
                  <div className="text-right">
                    <div>
                      <span className={isMetalFull ? 'text-amber-500 font-bold' : 'text-slate-200 font-bold'}>
                        {Math.floor(holder.resources.metal).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-500"> / {caps.metal.toLocaleString()}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold block leading-tight">
                      {fmtRate(lead.metal)}/h{moonDelta ? <span className="text-sky-400">{fmtMoon(moonDelta.metal)}</span> : ''}
                    </span>
                  </div>
                </div>

                {/* Kristall */}
                <div className="flex items-center gap-2 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-500 font-bold uppercase">Kris</span>
                  <div className="text-right">
                    <div>
                      <span className={isCrystalFull ? 'text-amber-500 font-bold' : 'text-slate-200 font-bold'}>
                        {Math.floor(holder.resources.crystal).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-500"> / {caps.crystal.toLocaleString()}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold block leading-tight">
                      {fmtRate(lead.crystal)}/h{moonDelta ? <span className="text-sky-400">{fmtMoon(moonDelta.crystal)}</span> : ''}
                    </span>
                  </div>
                </div>

                {/* Deuterium */}
                <div className="flex items-center gap-2 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-amber-500 font-bold uppercase font-mono">Deut</span>
                  <div className="text-right">
                    <div>
                      <span className={isDeuteriumFull ? 'text-amber-500 font-bold animate-pulse' : 'text-amber-400 font-bold'}>
                        {Math.floor(holder.resources.deuterium).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-500"> / {caps.deuterium.toLocaleString()}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold block leading-tight">
                      {fmtRate(lead.deuterium)}/h{moonDelta ? <span className="text-sky-400">{fmtMoon(moonDelta.deuterium)}</span> : ''}
                    </span>
                  </div>
                </div>

                {/* Energie (bei Monden die Bilanz des Elternplaneten) */}
                {(() => {
                  const energyBody = planetBody || selectedPlanet;
                  const { produced, consumed, ratio } = getEnergyStatus(
                    energyBody.buildings,
                    energyBody.ships.solarSatellite || 0,
                    energyBody.temperatureMax,
                    energyTechLevel,
                    energyBody.fusionActive !== false,
                    state.speedMultiplier,
                    converterConsumption
                  );
                  const color = ratio < 1.0 ? 'text-rose-500' : 'text-emerald-400';
                  return (
                    <div className="flex items-center gap-2 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800" title="Energieproduktion und Verbrauch">
                      <span className="text-[11px] text-slate-500 font-bold uppercase">Ener</span>
                      <div className="text-right text-xs">
                        <span className={`font-bold ${color}`}>
                          {produced} / {consumed} kW
                        </span>
                        {ratio < 1.0 && (
                          <span className="text-[9px] text-rose-400 block font-semibold leading-none mt-0.5">
                            Mine reduziert auf {Math.round(ratio * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </div>
      </header>

      {/* 2. BODY CONTENT (SIDEBAR + MAIN CONTENT AREA) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* SIDEBAR NAVIGATION */}
        <nav className="w-64 bg-slate-900 border-r border-slate-800 shrink-0 flex flex-col justify-between hidden md:flex">
          <div className="p-4 space-y-1 overflow-y-auto">
            <h3 className="text-[10px] font-bold text-slate-500 font-mono tracking-widest uppercase mb-3 px-2">Kommandozentrale</h3>

            {[
              { id: 'overview', label: 'Übersicht', icon: Rocket },
              { id: 'buildings', label: 'Versorgung', icon: Coins },
              { id: 'facilities', label: 'Anlagen', icon: Wrench },
              { id: 'research', label: 'Forschung', icon: Cpu },
              { id: 'shipyard', label: 'Schiffswerft', icon: Layers },
              { id: 'defense', label: 'Verteidigung', icon: ShieldAlert },
              { id: 'fleet', label: 'Flotten', icon: Send },
              { id: 'galaxy', label: 'Galaxie', icon: Compass },
              { id: 'empire', label: 'KI-Rankings', icon: Award },
              { id: 'combat', label: 'Berichte', icon: Flame, badge: state.combatLog.length },
              ...(state.debugMode ? [{ id: 'debug', label: 'Debug-Konsole', icon: Terminal }] : []),
            ].map((item) => {
              const IconComp = item.icon;
              const isActive = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all select-none cursor-pointer ${
                    isActive
                      ? 'bg-blue-950/40 border border-blue-500/30 text-blue-300'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComp className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                    {item.label}
                  </div>
                  {item.badge && item.badge > 0 && (
                    <span className="bg-red-500 text-slate-100 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Info & Save */}
          <div className="p-4 border-t border-slate-800 space-y-3">
            {incomingHostileFleets.length > 0 && (
              <div className="bg-red-950/40 border border-red-500/50 p-2.5 rounded-lg text-xs text-red-200 animate-pulse font-mono flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>ACHTUNG: {incomingHostileFleets.length} Angriffe unterwegs!</span>
              </div>
            )}

            <div className="text-[10px] text-slate-500 font-mono leading-relaxed bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
              Geschwindigkeit: <span className="text-blue-400">{state.speedMultiplier}x</span><br />
              Automatische Sicherung aktiv
            </div>

            <button
              onClick={handleReturnToMenu}
              className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg text-xs font-bold text-slate-300 transition-all border border-slate-700 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Hauptmenü
            </button>
          </div>
        </nav>

        {/* MOBILE BOTTOM NAVIGATION PANEL */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-2 grid grid-cols-5 gap-1 z-30">
          {[
            { id: 'overview', label: 'Übersicht', icon: Rocket },
            { id: 'buildings', label: 'Bauen', icon: Coins },
            { id: 'fleet', label: 'Flotte', icon: Send },
            { id: 'galaxy', label: 'Galaxie', icon: Compass },
            { id: 'combat', label: 'Berichte', icon: Flame },
          ].map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 rounded-lg ${
                  active ? 'text-blue-400 bg-blue-950/20' : 'text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] mt-1">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* MAIN GAME CONTENT AREA */}
        <main className="flex-1 relative min-h-0 overflow-hidden">
          <AssetBackground src={backgroundImage(view)} overlayClassName="bg-slate-950/85" />
          <div className="relative z-10 h-full overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* 2a. VIEW: OVERVIEW */}
            {view === 'overview' && (
              <div className="space-y-6">
                {/* Planet Bio Header */}
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-6 relative overflow-hidden isolate">
                  <AssetBackground
                    src={planetImage(getPlanetImageCategory(selectedPlanet.temperatureMax), getPlanetImageVariant(selectedPlanet.id))}
                    className="-z-10"
                    overlayClassName="bg-slate-900/70"
                  />
                  <div className="space-y-2">
                    {isRenaming ? (
                      <div className="flex flex-col gap-1.5">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="bg-slate-950/80 text-slate-100 border border-slate-700 px-2 py-1 rounded-lg text-sm font-mono focus:outline-none focus:border-blue-500 max-w-[180px]"
                          maxLength={20}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSavePlanetName();
                            if (e.key === 'Escape') setIsRenaming(false);
                          }}
                        />
                        <div className="flex gap-1.5">
                          <button
                            onClick={handleSavePlanetName}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/60 border border-blue-500/50 text-blue-300 hover:bg-blue-900/50 transition-all cursor-pointer"
                          >
                            OK
                          </button>
                          <button
                            onClick={() => setIsRenaming(false)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 transition-all cursor-pointer"
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <h2 className="text-2xl font-bold text-slate-100 font-mono tracking-wide">
                          {selectedPlanet.name}
                        </h2>
                        <button
                          onClick={() => {
                            setIsRenaming(true);
                            setRenameValue(selectedPlanet.name);
                          }}
                          title="Name ändern"
                          className="p-1 rounded-md hover:bg-slate-800/80 text-slate-500 hover:text-slate-300 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-blue-400 font-bold font-mono">
                      Position: Sektor [{selectedPlanet.system}:{selectedPlanet.slot}]
                    </p>
                  </div>

                  <div className="space-y-1 font-mono text-xs text-slate-400">
                    <div>Planetendurchmesser: <span className="text-slate-200 font-semibold">{selectedPlanet.diameter.toLocaleString()} km</span></div>
                    <div>Temperaturbereich: <span className="text-slate-200 font-semibold">{selectedPlanet.temperatureMin}°C bis {selectedPlanet.temperatureMax}°C</span></div>
                    <div>Deuterium-Effektivität: <span className="text-emerald-400 font-bold">{Math.max(50, Math.round((1.05 - 0.01 * selectedPlanet.temperatureMax) * 100))}%</span></div>
                    <div>Solarsatellit-Effektivität: <span className="text-amber-400 font-bold">{Math.round((Math.max(1, Math.floor((selectedPlanet.temperatureMax + 140) / 6)) / 30) * 100)}%</span> <span className="text-slate-500 font-normal">({Math.max(1, Math.floor((selectedPlanet.temperatureMax + 140) / 6))} kW/Sat)</span></div>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Bebaute Felder:</span>
                      <span className="text-slate-200 font-bold">{selectedPlanet.fieldsUsed} / {selectedPlanet.maxFields}</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all"
                        style={{ width: `${(selectedPlanet.fieldsUsed / selectedPlanet.maxFields) * 100}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-slate-400 pt-1.5 border-t border-slate-800/40 mt-1">
                      <span>Besiedelte Planeten:</span>
                      <span className="text-blue-400 font-bold">
                        {planets.length} / {1 + Math.floor((player?.research.astrophysics || 0) / 2)}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 leading-snug">
                      (Nächster Planet ab <span className="text-slate-400 font-medium">Astrophysik Lvl {((Math.floor((player?.research.astrophysics || 0) / 2) + 1) * 2)}</span>)
                    </div>

                    {/* Mond & Trümmerfeld */}
                    <div className="flex justify-between text-slate-400 pt-1.5 border-t border-slate-800/40 mt-1">
                      <span>Mond:</span>
                      {selectedPlanet.isMoon ? (
                        <span className="text-slate-300 font-semibold">Dieser Körper ist ein Mond</span>
                      ) : getMoonOfPlanet(selectedPlanet) ? (
                        <span className="text-slate-200 font-bold">Vorhanden (Ø {getMoonOfPlanet(selectedPlanet)!.diameter.toLocaleString()} km)</span>
                      ) : (
                        <span className="text-slate-500">Keiner</span>
                      )}
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Trümmerfeld:</span>
                      {selectedPlanet.debris && selectedPlanet.debris.metal + selectedPlanet.debris.crystal > 0 ? (
                        <span className="text-amber-400 font-bold">{Math.floor(selectedPlanet.debris.metal).toLocaleString()} M / {Math.floor(selectedPlanet.debris.crystal).toLocaleString()} K</span>
                      ) : (
                        <span className="text-slate-500">Keins</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Queue status & Fleets */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Planetary Queues */}
                  <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 space-y-4">
                    <h3 className="text-sm font-bold font-mono tracking-wide text-slate-400 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" /> Bauvorhaben
                    </h3>

                    {/* Active Building Upgrade */}
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="text-xs font-semibold text-slate-400 flex justify-between items-center">
                        <span>Gebäude-Konstruktion</span>
                        {selectedPlanet.activeBuildQueue && selectedPlanet.activeBuildQueue.length > 0 && (
                          <span className="text-[10px] text-slate-500 font-mono">Warteschlange: {selectedPlanet.activeBuildQueue.length}</span>
                        )}
                      </div>
                      {selectedPlanet.activeBuildQueue && selectedPlanet.activeBuildQueue.length > 0 ? (
                        <div className="space-y-3">
                          {selectedPlanet.activeBuildQueue.map((job, idx) => (
                            <div key={job.id} className={`p-2 rounded-lg border ${idx === 0 ? 'bg-blue-950/20 border-blue-900/50' : 'bg-slate-900/30 border-slate-800/60'} space-y-1.5`}>
                              <div className="flex justify-between text-xs font-bold text-slate-200 items-center">
                                <span className="flex items-center gap-1.5">
                                  {idx === 0 ? (
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                  ) : (
                                    <span className="text-[10px] px-1 bg-slate-800 text-slate-400 rounded">#{idx+1}</span>
                                  )}
                                  {BUILDING_NAMES[job.target]} (Lvl {job.level})
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className={idx === 0 ? "text-blue-400 font-mono" : "text-slate-500 font-mono text-[11px]"}>
                                    {idx === 0 ? `${Math.round(job.durationRemaining)}s` : `${Math.round(job.durationTotal)}s`}
                                  </span>
                                  <button
                                    onClick={() => handleCancelBuilding(job.id)}
                                    className="p-1 hover:bg-red-950 hover:text-red-400 text-slate-500 rounded transition-colors cursor-pointer"
                                    title="Abbrechen (Rückerstattung)"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              {idx === 0 && (
                                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-blue-500 h-full rounded-full transition-all"
                                    style={{
                                      width: `${
                                        ((job.durationTotal - job.durationRemaining) /
                                          job.durationTotal) *
                                        100
                                      }%`,
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-600 font-mono italic">Kein aktiver Bauauftrag</div>
                      )}
                    </div>

                    {/* Active Research Job */}
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="text-xs font-semibold text-slate-400 flex justify-between items-center">
                        <span>Forschungsauftrag (Global)</span>
                        {player?.activeResearchQueue && player.activeResearchQueue.length > 0 && (
                          <span className="text-[10px] text-slate-500 font-mono">Warteschlange: {player.activeResearchQueue.length}</span>
                        )}
                      </div>
                      {player?.activeResearchQueue && player.activeResearchQueue.length > 0 ? (
                        <div className="space-y-3">
                          {player.activeResearchQueue.map((job, idx) => (
                            <div key={job.id} className={`p-2 rounded-lg border ${idx === 0 ? 'bg-indigo-950/20 border-indigo-900/50' : 'bg-slate-900/30 border-slate-800/60'} space-y-1.5`}>
                              <div className="flex justify-between text-xs font-bold text-slate-200 items-center">
                                <span className="flex items-center gap-1.5">
                                  {idx === 0 ? (
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                  ) : (
                                    <span className="text-[10px] px-1 bg-slate-800 text-slate-400 rounded">#{idx+1}</span>
                                  )}
                                  {RESEARCH_NAMES[job.target]} (Lvl {job.level})
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className={idx === 0 ? "text-indigo-400 font-mono" : "text-slate-500 font-mono text-[11px]"}>
                                    {idx === 0 ? `${Math.round(job.durationRemaining)}s` : `${Math.round(job.durationTotal)}s`}
                                  </span>
                                  <button
                                    onClick={() => handleCancelResearch(job.id)}
                                    className="p-1 hover:bg-red-950 hover:text-red-400 text-slate-500 rounded transition-colors cursor-pointer"
                                    title="Abbrechen (Rückerstattung)"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              {idx === 0 && (
                                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-indigo-500 h-full rounded-full transition-all"
                                    style={{
                                      width: `${
                                        ((job.durationTotal - job.durationRemaining) /
                                          job.durationTotal) *
                                        100
                                      }%`,
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-600 font-mono italic">Keine aktive Forschung</div>
                      )}
                    </div>

                    {/* Active Shipyard Queue */}
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="text-xs font-semibold text-slate-400">Schiffswerft-Warteschlange</div>
                      {selectedPlanet.activeShipyardQueue.length > 0 ? (
                        <div className="space-y-2">
                          {selectedPlanet.activeShipyardQueue.map((job, jIdx) => (
                            <div key={job.id} className="flex justify-between text-xs font-mono">
                              <span className="text-slate-300">
                                {job.count}x {job.type === 'ship' ? SHIP_NAMES[job.target as keyof Ships] : DEFENSE_NAMES[job.target as keyof Defense]}
                              </span>
                              {jIdx === 0 ? (
                                <span className="text-amber-500 font-bold">Aktiv ({Math.round(job.durationRemainingInCurrent)}s)</span>
                              ) : (
                                <span className="text-slate-600">Wartend</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-600 font-mono italic">Werft ist unbeschäftigt</div>
                      )}
                    </div>
                  </div>

                  {/* Fleets Status list */}
                  <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 space-y-4">
                    <h3 className="text-sm font-bold font-mono tracking-wide text-slate-400 flex items-center gap-2">
                      <Send className="w-4 h-4 text-blue-400 animate-pulse" /> Deine Flottenaktivitäten
                    </h3>

                    {playerFleets.length === 0 ? (
                      <div className="text-xs text-slate-600 font-mono italic bg-slate-950/30 p-4 rounded-xl border border-slate-900">
                        Keine deiner Flotten befindet sich derzeit im Flug.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto">
                        {playerFleets.map((f) => {
                          const now = Date.now();
                          const isReturning = f.isReturning;
                          const targetTime = isReturning ? f.returnTime : f.arrivalTime;
                          const remaining = Math.max(0, Math.round((targetTime - now) / 1000));

                          return (
                            <div key={f.id} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs font-mono flex flex-col justify-between gap-1.5">
                              <div className="flex justify-between font-semibold">
                                <span className={isReturning ? 'text-amber-400' : 'text-blue-400'}>
                                  {isReturning ? 'Rückflug' : f.mission.toUpperCase()} ➔ [{f.targetSystem}:{f.targetSlot}]
                                </span>
                                <span className="text-slate-300 font-bold">{remaining}s</span>
                              </div>
                              <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-2">
                                {Object.entries(f.ships).map(([sKey, count]) => {
                                  if (count === 0) return null;
                                  return (
                                    <span key={sKey}>
                                      {count}x {SHIP_NAMES[sKey as keyof Ships]}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Star system garrison */}
                <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 space-y-4">
                  <h3 className="text-sm font-bold font-mono tracking-wide text-slate-400">Stationierte Einheiten auf dem Planeten</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    {/* Garrison of ships */}
                    {Object.entries(selectedPlanet.ships).map(([sKey, count]) => {
                      if (count === 0) return null;
                      return (
                        <div key={sKey} className="bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800 flex justify-between items-center">
                          <span className="text-slate-400">{SHIP_NAMES[sKey as keyof Ships]}</span>
                          <span className="text-blue-400 font-bold">{count}</span>
                        </div>
                      );
                    })}
                    {/* Garrison of defenses */}
                    {Object.entries(selectedPlanet.defense).map(([dKey, count]) => {
                      if (count === 0) return null;
                      return (
                        <div key={dKey} className="bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800 flex justify-between items-center">
                          <span className="text-slate-400">{DEFENSE_NAMES[dKey as keyof Defense]}</span>
                          <span className="text-emerald-400 font-bold">{count}</span>
                        </div>
                      );
                    })}
                    {(Object.values(selectedPlanet.ships) as number[]).reduce((a, b) => a + b, 0) === 0 &&
                      (Object.values(selectedPlanet.defense) as number[]).reduce((a, b) => a + b, 0) === 0 && (
                        <div className="col-span-full text-slate-600 italic">Dieser Planet ist schutzlos. Keine Schiffe oder Verteidigungen stationiert.</div>
                      )}
                  </div>
                </div>
              </div>
            )}

            {/* 2b. VIEW: BUILDINGS (Versorgung) */}
            {view === 'buildings' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-blue-400" /> Ressourcen & Versorgung
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Errichte und dehne Minen und Kraftwerke aus, um die Ressourcenproduktion zu beschleunigen.
                  </p>
                </div>

                {/* Active Building Queue Panel */}
                {selectedPlanet.activeBuildJob && (
                  <div className="bg-slate-900/80 p-5 rounded-2xl border border-blue-500/30 space-y-3 shadow-lg shadow-blue-950/20">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                        <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase">Aktuelles Bauvorhaben</h3>
                      </div>
                      <span className="text-xs font-mono text-blue-400 font-bold">{Math.round(selectedPlanet.activeBuildJob.durationRemaining)}s verbleibend</span>
                    </div>
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div>
                        <span className="font-bold text-slate-200 text-sm">{BUILDING_NAMES[selectedPlanet.activeBuildJob.target]}</span>
                        <span className="text-xs text-slate-400 ml-2 font-mono">auf Stufe {selectedPlanet.activeBuildJob.level}</span>
                      </div>
                      <div className="flex-1 max-w-md w-full">
                        <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-850">
                          <div
                            className="bg-blue-500 h-full rounded-full transition-all"
                            style={{
                              width: `${
                                ((selectedPlanet.activeBuildJob.durationTotal - selectedPlanet.activeBuildJob.durationRemaining) /
                                  selectedPlanet.activeBuildJob.durationTotal) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(selectedPlanet.isMoon
                    ? getBuildableBuildingsForBody(true)
                    : (['metalMine', 'crystalMine', 'deuteriumSynthesizer', 'solarPowerPlant', 'fusionPowerPlant', 'metalStorage', 'crystalStorage', 'deuteriumStorage'] as (keyof Buildings)[])
                  ).map((bKey) => {
                    const currentLvl = selectedPlanet.buildings[bKey];
                    const activeQueue = selectedPlanet.activeBuildQueue || [];
                    const queuedUpgradesCount = activeQueue.filter(j => j.target === bKey).length;
                    const upgradeLevel = currentLvl + queuedUpgradesCount + 1;
                    const cost = getBuildingUpgradeCost(bKey, upgradeLevel - 1, player?.research.materialScience || 0);
                    const req = BUILDING_REQUIREMENTS[bKey];
                    const parentP = getParentPlanet(selectedPlanet);
                    const holder = getResourceHolder(selectedPlanet) || selectedPlanet;
                    let reqMet = req ? isRequirementMet(req, selectedPlanet.buildings, player?.research || {} as any) : true;
                    // Körperübergreifend: Materieumwandler braucht Mondkanone auf dem Elternplaneten
                    if (bKey === 'matterConverter' && (!parentP || (parentP.buildings.moonCannon || 0) < 1)) reqMet = false;

                    const maxLvl = getMaxBuildingLevel(bKey);
                    const atMax = currentLvl + queuedUpgradesCount >= maxLvl;
                    const totalFieldsUsedWithQueue = selectedPlanet.fieldsUsed + activeQueue.length;
                    const canAfford = hasEnoughResources(holder.resources, cost) && reqMet && !atMax && (totalFieldsUsedWithQueue < selectedPlanet.maxFields);
                    const duration = getBuildingBuildDuration(bKey, upgradeLevel, selectedPlanet.buildings.roboticsFactory, state.speedMultiplier, selectedPlanet.buildings.naniteFactory || 0);

                    const isMineOrPowerPlant = ['metalMine', 'crystalMine', 'deuteriumSynthesizer', 'solarPowerPlant', 'fusionPowerPlant'].includes(bKey);
                    
                    const energyTech = player?.research.energy || 0;
                    const plasmaTech = player?.research.plasmaTech || 0;
                    const isFusionActive = selectedPlanet.fusionActive !== false;
                    const { ratio } = getEnergyStatus(
                      selectedPlanet.buildings,
                      selectedPlanet.ships.solarSatellite || 0,
                      selectedPlanet.temperatureMax,
                      energyTech,
                      isFusionActive,
                      state.speedMultiplier
                    );

                    let productionText = '';
                    let energyText = '';

                    if (bKey === 'metalMine') {
                      const prod = Math.round(getMetalMineProduction(currentLvl, selectedPlanet.temperatureMax) * ratio * (1 + plasmaTech * 0.01) * state.speedMultiplier);
                      const cons = getMetalMineEnergyConsumption(currentLvl);
                      productionText = `Produktion: +${prod.toLocaleString()}/h Metall`;
                      if (currentLvl > 0) energyText = `Energiebedarf: -${cons} Energie`;
                    } else if (bKey === 'crystalMine') {
                      const prod = Math.round(getCrystalMineProduction(currentLvl, selectedPlanet.temperatureMax) * ratio * (1 + plasmaTech * 0.0066) * state.speedMultiplier);
                      const cons = getCrystalMineEnergyConsumption(currentLvl);
                      productionText = `Produktion: +${prod.toLocaleString()}/h Kristall`;
                      if (currentLvl > 0) energyText = `Energiebedarf: -${cons} Energie`;
                    } else if (bKey === 'deuteriumSynthesizer') {
                      const prod = Math.round(getDeuteriumSynthesizerProduction(currentLvl, selectedPlanet.temperatureMax) * ratio * (1 + plasmaTech * 0.0033) * state.speedMultiplier);
                      const cons = getDeuteriumSynthesizerEnergyConsumption(currentLvl);
                      productionText = `Produktion: +${prod.toLocaleString()}/h Deuterium`;
                      if (currentLvl > 0) energyText = `Energiebedarf: -${cons} Energie`;
                    } else if (bKey === 'solarPowerPlant') {
                      const prod = getSolarPowerPlantProduction(currentLvl);
                      productionText = `Energieerzeugung: +${prod.toLocaleString()} Energie`;
                    } else if (bKey === 'fusionPowerPlant') {
                      const prod = isFusionActive ? getFusionPowerPlantProduction(currentLvl, energyTech) * state.speedMultiplier : 0;
                      const cons = isFusionActive ? Math.round(getFusionPowerPlantDeuteriumConsumption(currentLvl) * state.speedMultiplier) : 0;
                      productionText = `Energieerzeugung: +${prod.toLocaleString()} Energie`;
                      if (currentLvl > 0) energyText = `Deuterium-Bedarf: -${cons.toLocaleString()}/h`;
                    }

                    return (
                      <div
                        key={bKey}
                        className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                          !reqMet
                            ? 'bg-slate-950/40 border-slate-900 opacity-60'
                            : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <AssetThumb src={buildingImage(bKey)} className="w-12 h-12 rounded-lg object-cover border border-slate-800 shrink-0" />
                              <div>
                                <h4 className="font-bold text-slate-200">{BUILDING_NAMES[bKey]}</h4>
                                <p className="text-xs text-slate-500 font-mono">Stufe {currentLvl}</p>
                              </div>
                            </div>
                            <div className="text-right text-[11px] text-slate-500 font-mono">
                              Bauzeit: <span className="text-slate-300 font-semibold">{Math.round(duration)}s</span>
                            </div>
                          </div>

                          {/* Requirements list */}
                          {renderRequirementsList(req)}

                          {/* Materieumwandler: Voraussetzung Mondkanone + Umwandlungsinfo */}
                          {bKey === 'matterConverter' && (
                            <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-900/60 text-[11px] font-mono space-y-1">
                              <div className={parentP && (parentP.buildings.moonCannon || 0) >= 1 ? 'text-emerald-500/80' : 'text-rose-400 font-semibold'}>
                                {parentP && (parentP.buildings.moonCannon || 0) >= 1 ? '✓' : '✗'} Mondkanone auf {parentP?.name ?? 'Planet'}
                              </div>
                              {currentLvl > 0 ? (() => {
                                const active = selectedPlanet.converterActive !== false;
                                const perHour = computeConverterPerHour(selectedPlanet, parentP);
                                return (
                                  <>
                                    <div className="flex justify-between items-center">
                                      <span className="text-slate-400 font-semibold">Status:</span>
                                      <button
                                        onClick={handleToggleConverter}
                                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all border ${
                                          active
                                            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400 hover:bg-emerald-900/30'
                                            : 'bg-rose-950/40 border-rose-500/50 text-rose-400 hover:bg-rose-900/30'
                                        }`}
                                      >
                                        {active ? 'AN (ONLINE)' : 'AUS (OFFLINE)'}
                                      </button>
                                    </div>
                                    {active ? (
                                      <>
                                        <div className="text-emerald-400 flex justify-between"><span>Verarbeitet:</span><span>{Math.round(-perHour.metal).toLocaleString()}/h Metall</span></div>
                                        <div className="text-emerald-400 flex justify-between"><span>Erzeugt:</span><span>+{Math.round(perHour.crystal).toLocaleString()} Kris / +{Math.round(perHour.deuterium).toLocaleString()} Deut</span></div>
                                      </>
                                    ) : (
                                      <div className="text-slate-500">Umwandler ausgeschaltet – keine Produktion, kein Energieverbrauch.</div>
                                    )}
                                    <div className="text-amber-500/95 flex justify-between"><span>Energiebedarf (Planet):</span><span>-{getMatterConverterEnergyConsumption(currentLvl, state.speedMultiplier).toLocaleString()}</span></div>
                                  </>
                                );
                              })() : (
                                <div className="text-slate-500">Wandelt Metall in 70% Kristall / 30% Deuterium um (Energie vom Planeten).</div>
                              )}
                            </div>
                          )}

                          {/* Mondbasis: Feld-Info */}
                          {bKey === 'mondbasis' && (
                            <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-900/60 text-[11px] font-mono text-slate-400">
                              Gibt +3 Baufelder je Stufe frei. Mondfelder: {selectedPlanet.fieldsUsed} / {selectedPlanet.maxFields}
                            </div>
                          )}

                          {/* Current Hourly Production/Consumption Info */}
                          {isMineOrPowerPlant && currentLvl > 0 && (
                            <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-900/60 text-[11px] font-mono space-y-1">
                              {productionText && (
                                <div className="text-emerald-400 font-semibold flex justify-between">
                                  <span>Aktuelle Leistung:</span>
                                  <span>{productionText.split(': ')[1]}</span>
                                </div>
                              )}
                              {energyText && (
                                <div className="text-amber-500/95 flex justify-between">
                                  <span>Bedarf/Verbrauch:</span>
                                  <span>{energyText.split(': ')[1] || energyText}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Fusion Power Plant Switch */}
                          {bKey === 'fusionPowerPlant' && currentLvl > 0 && (
                            <div className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-xl border border-slate-900/60 font-mono text-[11px]">
                              <span className="text-slate-400 font-semibold">Reaktor-Status:</span>
                              <button
                                onClick={handleToggleFusion}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all border ${
                                  isFusionActive
                                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400 hover:bg-emerald-900/30'
                                    : 'bg-rose-950/40 border-rose-500/50 text-rose-400 hover:bg-rose-900/30'
                                }`}
                              >
                                {isFusionActive ? 'AN (ONLINE)' : 'AUS (OFFLINE)'}
                              </button>
                            </div>
                          )}

                          {/* Upgrade Cost */}
                          {!atMax && (
                          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-900 text-[11px] font-mono grid grid-cols-3 gap-1">
                            <div className={holder.resources.metal >= cost.metal ? 'text-slate-400' : 'text-rose-400 font-semibold'}>
                              Met: {cost.metal.toLocaleString()}
                            </div>
                            <div className={holder.resources.crystal >= cost.crystal ? 'text-slate-400' : 'text-rose-400 font-semibold'}>
                              Kris: {cost.crystal.toLocaleString()}
                            </div>
                            <div className={holder.resources.deuterium >= cost.deuterium ? 'text-slate-400' : 'text-rose-400 font-semibold'}>
                              Deut: {cost.deuterium.toLocaleString()}
                            </div>
                          </div>
                          )}

                          {/* Baufortschritt im Baufenster */}
                          {selectedPlanet.activeBuildJob?.target === bKey && (
                            <div className="bg-blue-950/20 p-2.5 rounded-xl border border-blue-900/40 space-y-1.5 mt-2 animate-pulse">
                              <div className="flex justify-between text-[11px] font-bold text-blue-400 font-mono">
                                <span>Baufortschritt...</span>
                                <span>{Math.round(selectedPlanet.activeBuildJob.durationRemaining)}s</span>
                              </div>
                              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                                <div
                                  className="bg-blue-500 h-full rounded-full transition-all"
                                  style={{
                                    width: `${
                                      ((selectedPlanet.activeBuildJob.durationTotal - selectedPlanet.activeBuildJob.durationRemaining) /
                                        selectedPlanet.activeBuildJob.durationTotal) *
                                      100
                                    }%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {queuedUpgradesCount > 0 && (
                          <div className="bg-blue-950/20 px-2 py-1 rounded text-[10px] text-blue-400 font-mono border border-blue-900/40 flex justify-between items-center my-1.5">
                            <span>In Warteschlange</span>
                            <span className="font-bold">+{queuedUpgradesCount} Upgrades (bis Lvl {upgradeLevel - 1})</span>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            disabled={!canAfford || !reqMet}
                            onClick={() => handleUpgradeBuilding(bKey)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer ${
                              !reqMet
                                ? 'bg-rose-950/20 border-rose-900/30 text-rose-400/60 cursor-not-allowed'
                                : canAfford
                                ? 'bg-blue-950/40 hover:bg-blue-900/50 text-blue-300 border-blue-500/40 hover:border-blue-400'
                                : 'bg-slate-900/20 border-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {!reqMet
                              ? 'Gesperrt'
                              : atMax
                              ? 'Maximal ausgebaut'
                              : queuedUpgradesCount > 0
                              ? `Warteschlange (Stufe ${upgradeLevel})`
                              : activeQueue.length > 0
                              ? `Warteschlange (Stufe ${upgradeLevel})`
                              : `Ausbauen auf Lvl ${upgradeLevel}`}
                          </button>

                          {currentLvl > 0 && (
                            <button
                              onClick={() => handleDemolishBuilding(bKey)}
                              title={`${BUILDING_NAMES[bKey]} abreißen`}
                              className="px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 border border-rose-950 hover:border-rose-500/50 bg-rose-950/10 hover:bg-rose-950/30 transition-all text-xs font-bold font-mono cursor-pointer"
                            >
                              Abriss
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Solar Satellite Supply Integration Card (nicht auf Monden) */}
                  {!selectedPlanet.isMoon && (() => {
                    const sKey = 'solarSatellite';
                    const cost = SHIP_COSTS[sKey];
                    const countOnPlanet = selectedPlanet.ships[sKey] || 0;
                    const orderQty = shipyardOrderQty[sKey] || 0;
                    const req = SHIP_REQUIREMENTS[sKey];
                    const reqMet = req ? isRequirementMet(req, selectedPlanet.buildings, player?.research || {} as any) : true;
                    const totalCost = {
                      metal: cost.metal * (orderQty || 1),
                      crystal: cost.crystal * (orderQty || 1),
                      deuterium: cost.deuterium * (orderQty || 1),
                    };
                    const duration = getShipyardBuildDuration(
                      cost,
                      selectedPlanet.buildings.shipyard,
                      selectedPlanet.buildings.roboticsFactory,
                      state.speedMultiplier,
                      selectedPlanet.buildings.naniteFactory
                    );
                    const canAfford = hasEnoughResources(selectedPlanet.resources, totalCost) && orderQty > 0 && reqMet;

                    return (
                      <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                        !reqMet
                          ? 'bg-slate-950/40 border-slate-900 opacity-60'
                          : 'bg-slate-900/40 border-amber-500/20 hover:border-amber-500/40 bg-gradient-to-br from-slate-900/40 to-amber-950/5'
                      }`}>
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                                <h4 className="font-bold text-amber-400">Solarsatellit</h4>
                              </div>
                              <p className="text-xs text-slate-500 font-mono">Stationiert: {countOnPlanet}</p>
                            </div>
                            <div className="text-right text-[11px] text-slate-500 font-mono">
                              Bauzeit: <span className="text-slate-300 font-semibold">{Math.round(duration)}s</span>
                            </div>
                          </div>
                          
                          {renderRequirementsList(req)}

                          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-900 text-[11px] font-mono grid grid-cols-3 gap-1">
                            <div className="text-slate-500">M: {cost.metal.toLocaleString()}</div>
                            <div className="text-slate-500">K: {cost.crystal.toLocaleString()}</div>
                            <div className="text-slate-500 font-semibold text-amber-500/80">Ener: +{Math.max(1, Math.floor((selectedPlanet.temperatureMax + 140) / 6))} kW</div>
                          </div>

                          {reqMet && (
                            <div className="flex items-center gap-2 mt-2">
                              <label className="text-[11px] text-slate-400 font-mono">Anzahl:</label>
                              <input
                                type="number"
                                min="0"
                                value={orderQty || ''}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  setShipyardOrderQty({ ...shipyardOrderQty, [sKey]: val });
                                }}
                                className="w-20 bg-slate-950 border border-slate-800 text-slate-200 text-xs px-2 py-1 rounded font-mono text-center focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          )}
                        </div>

                        <button
                          disabled={!canAfford || !reqMet}
                          onClick={() => handleOrderShipyard('ship', sKey)}
                          className={`w-full py-2 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer ${
                            !reqMet
                              ? 'bg-rose-950/20 border-rose-900/30 text-rose-400/60 cursor-not-allowed'
                              : canAfford
                              ? 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-400 border-amber-500/40 hover:border-amber-400'
                              : 'bg-slate-900/20 border-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {!reqMet ? 'Satellit gesperrt' : 'In Auftrag geben'}
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Sprungtor: Schiffssprung zwischen eigenen Monden (nur auf Monden mit Sprungtor) */}
                {selectedPlanet.isMoon && (selectedPlanet.buildings.jumpGate || 0) >= 1 && (() => {
                  const now = Date.now();
                  const cooldown = JUMP_GATE_COOLDOWN_MS / (state.speedMultiplier || 1);
                  const ready = !selectedPlanet.lastJumpTime || (now - selectedPlanet.lastJumpTime) >= cooldown;
                  const remaining = ready ? 0 : Math.ceil((cooldown - (now - selectedPlanet.lastJumpTime!)) / 1000);
                  const targets = planets.filter(p => p.isMoon && p.id !== selectedPlanet.id && (p.buildings.jumpGate || 0) >= 1);
                  const shipCount = (Object.values(selectedPlanet.ships) as number[]).reduce((a, b) => a + b, 0);
                  return (
                    <div className="bg-slate-900/60 p-5 rounded-2xl border border-cyan-500/30 space-y-3">
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4 text-cyan-300" />
                        <h3 className="font-bold text-cyan-300">Sprungtor</h3>
                      </div>
                      <p className="text-xs text-slate-400">
                        Springe sofort alle stationierten Schiffe ({shipCount.toLocaleString()}) zu einem anderen eigenen Mond mit Sprungtor.
                        {ready ? ' Bereit.' : ` Lädt noch ${remaining}s auf.`}
                      </p>
                      {targets.length === 0 ? (
                        <div className="text-sm text-slate-500 italic">Kein weiterer Mond mit Sprungtor verfügbar.</div>
                      ) : (
                        <div className="space-y-2">
                          {targets.map(t => (
                            <button
                              key={t.id}
                              disabled={!ready || shipCount <= 0}
                              onClick={() => handleJumpFleet(t.id)}
                              className={`w-full py-2 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer ${
                                ready && shipCount > 0
                                  ? 'bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 border-cyan-500/40 hover:border-cyan-400'
                                  : 'bg-slate-900/20 border-slate-800 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              Schiffe springen → {t.name} [{t.system}:{t.slot}]
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 2c. VIEW: FACILITIES (Anlagen) */}
            {view === 'facilities' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-blue-400" /> Produktionsanlagen
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Baue Labore, Werften und Fabriken auf, um fortschrittliche Einheiten herzustellen und Konstruktionszeiten zu verkürzen.
                  </p>
                </div>

                {/* Active Building Queue Panel */}
                {selectedPlanet.activeBuildJob && (
                  <div className="bg-slate-900/80 p-5 rounded-2xl border border-blue-500/30 space-y-3 shadow-lg shadow-blue-950/20">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                        <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase">Aktuelles Bauvorhaben</h3>
                      </div>
                      <span className="text-xs font-mono text-blue-400 font-bold">{Math.round(selectedPlanet.activeBuildJob.durationRemaining)}s verbleibend</span>
                    </div>
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div>
                        <span className="font-bold text-slate-200 text-sm">{BUILDING_NAMES[selectedPlanet.activeBuildJob.target]}</span>
                        <span className="text-xs text-slate-400 ml-2 font-mono">auf Stufe {selectedPlanet.activeBuildJob.level}</span>
                      </div>
                      <div className="flex-1 max-w-md w-full">
                        <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-850">
                          <div
                            className="bg-blue-500 h-full rounded-full transition-all"
                            style={{
                              width: `${
                                ((selectedPlanet.activeBuildJob.durationTotal - selectedPlanet.activeBuildJob.durationRemaining) /
                                  selectedPlanet.activeBuildJob.durationTotal) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedPlanet.isMoon && (
                  <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 text-sm text-slate-400">
                    Auf Monden werden Gebäude (Mondbasis, Materieumwandler, Sprungtor, Roboterfabrik, Werft) unter <span className="text-slate-200 font-semibold">Versorgung</span> gebaut.
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(selectedPlanet.isMoon
                    ? ([] as (keyof Buildings)[])
                    : (['roboticsFactory', 'naniteFactory', 'shipyard', 'researchLab', 'terraformer', 'missileSilo', 'moonCannon'] as (keyof Buildings)[])
                  ).map((bKey) => {
                    const currentLvl = selectedPlanet.buildings[bKey];
                    const activeQueue = selectedPlanet.activeBuildQueue || [];
                    const queuedUpgradesCount = activeQueue.filter(j => j.target === bKey).length;
                    const upgradeLevel = currentLvl + queuedUpgradesCount + 1;
                    const cost = getBuildingUpgradeCost(bKey, upgradeLevel - 1, player?.research.materialScience || 0);
                    const req = BUILDING_REQUIREMENTS[bKey];
                    const holder = selectedPlanet;
                    const reqMet = req ? isRequirementMet(req, selectedPlanet.buildings, player?.research || {} as any) : true;

                    const maxLvl = getMaxBuildingLevel(bKey);
                    const atMax = currentLvl + queuedUpgradesCount >= maxLvl;
                    const totalFieldsUsedWithQueue = selectedPlanet.fieldsUsed + activeQueue.length;
                    const canAfford = hasEnoughResources(holder.resources, cost) && reqMet && !atMax && (totalFieldsUsedWithQueue < selectedPlanet.maxFields);
                    const duration = getBuildingBuildDuration(bKey, upgradeLevel, selectedPlanet.buildings.roboticsFactory, state.speedMultiplier, selectedPlanet.buildings.naniteFactory || 0);

                    return (
                      <div
                        key={bKey}
                        className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                          !reqMet
                            ? 'bg-slate-950/40 border-slate-900 opacity-60'
                            : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <AssetThumb src={buildingImage(bKey)} className="w-12 h-12 rounded-lg object-cover border border-slate-800 shrink-0" />
                              <div>
                                <h4 className="font-bold text-slate-200">{BUILDING_NAMES[bKey]}</h4>
                                <p className="text-xs text-slate-500 font-mono">Stufe {currentLvl}</p>
                              </div>
                            </div>
                            <div className="text-right text-[11px] text-slate-500 font-mono">
                              Bauzeit: <span className="text-slate-300 font-semibold">{Math.round(duration)}s</span>
                            </div>
                          </div>

                          {/* Requirements list */}
                          {renderRequirementsList(req)}

                          {/* Upgrade Cost */}
                          {!atMax && (
                          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-900 text-[11px] font-mono grid grid-cols-3 gap-1">
                            <div className={holder.resources.metal >= cost.metal ? 'text-slate-400' : 'text-rose-400 font-semibold'}>
                              Met: {cost.metal.toLocaleString()}
                            </div>
                            <div className={holder.resources.crystal >= cost.crystal ? 'text-slate-400' : 'text-rose-400 font-semibold'}>
                              Kris: {cost.crystal.toLocaleString()}
                            </div>
                            <div className={holder.resources.deuterium >= cost.deuterium ? 'text-slate-400' : 'text-rose-400 font-semibold'}>
                              Deut: {cost.deuterium.toLocaleString()}
                            </div>
                          </div>
                          )}

                          {/* Baufortschritt im Baufenster */}
                          {selectedPlanet.activeBuildJob?.target === bKey && (
                            <div className="bg-blue-950/20 p-2.5 rounded-xl border border-blue-900/40 space-y-1.5 mt-2 animate-pulse">
                              <div className="flex justify-between text-[11px] font-bold text-blue-400 font-mono">
                                <span>Baufortschritt...</span>
                                <span>{Math.round(selectedPlanet.activeBuildJob.durationRemaining)}s</span>
                              </div>
                              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                                <div
                                  className="bg-blue-500 h-full rounded-full transition-all"
                                  style={{
                                    width: `${
                                      ((selectedPlanet.activeBuildJob.durationTotal - selectedPlanet.activeBuildJob.durationRemaining) /
                                        selectedPlanet.activeBuildJob.durationTotal) *
                                      100
                                    }%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {queuedUpgradesCount > 0 && (
                          <div className="bg-blue-950/20 px-2 py-1 rounded text-[10px] text-blue-400 font-mono border border-blue-900/40 flex justify-between items-center my-1.5">
                            <span>In Warteschlange</span>
                            <span className="font-bold">+{queuedUpgradesCount} Upgrades (bis Lvl {upgradeLevel - 1})</span>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            disabled={!canAfford || !reqMet}
                            onClick={() => handleUpgradeBuilding(bKey)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer ${
                              !reqMet
                                ? 'bg-rose-950/20 border-rose-900/30 text-rose-400/60 cursor-not-allowed'
                                : canAfford
                                ? 'bg-blue-950/40 hover:bg-blue-900/50 text-blue-300 border-blue-500/40 hover:border-blue-400'
                                : 'bg-slate-900/20 border-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {!reqMet
                              ? 'Gesperrt'
                              : atMax
                              ? 'Maximal ausgebaut'
                              : queuedUpgradesCount > 0
                              ? `In Warteschlange (Stufe ${upgradeLevel})`
                              : activeQueue.length > 0
                              ? `In Warteschlange (Stufe ${upgradeLevel})`
                              : `Ausbauen auf Lvl ${upgradeLevel}`}
                          </button>

                          {currentLvl > 0 && (
                            <button
                              onClick={() => handleDemolishBuilding(bKey)}
                              title={`${BUILDING_NAMES[bKey]} abreißen`}
                              className="px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 border border-rose-950 hover:border-rose-500/50 bg-rose-950/10 hover:bg-rose-950/30 transition-all text-xs font-bold font-mono cursor-pointer"
                            >
                              Abriss
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mondkanone: Mondversuch-Aktion (nur Planeten mit Mondkanone) */}
                {!selectedPlanet.isMoon && (selectedPlanet.buildings.moonCannon || 0) >= 1 && (() => {
                  const hasMoon = !!getMoonOfPlanet(selectedPlanet);
                  const affordable = hasEnoughResources(selectedPlanet.resources, MOON_ATTEMPT_COST);
                  return (
                    <div className="bg-slate-900/60 p-5 rounded-2xl border border-indigo-500/30 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🌑</span>
                        <h3 className="font-bold text-indigo-300">Mondkanone – Mondversuch</h3>
                      </div>
                      <p className="text-xs text-slate-400">
                        Startet einen Beschuss mit {Math.round(MOON_ATTEMPT_CHANCE * 100)}% Chance, einen Mond an diesem Planeten zu erschaffen.
                        Die Ressourcen werden auch bei Misserfolg verbraucht. Zusätzlich teilt die Mondkanone die Ressourcen von Planet und Mond in einem gemeinsamen Pool.
                      </p>
                      <div className="text-[11px] font-mono grid grid-cols-3 gap-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-900">
                        <div className={selectedPlanet.resources.metal >= MOON_ATTEMPT_COST.metal ? 'text-slate-400' : 'text-rose-400 font-semibold'}>Met: {MOON_ATTEMPT_COST.metal.toLocaleString()}</div>
                        <div className={selectedPlanet.resources.crystal >= MOON_ATTEMPT_COST.crystal ? 'text-slate-400' : 'text-rose-400 font-semibold'}>Kris: {MOON_ATTEMPT_COST.crystal.toLocaleString()}</div>
                        <div className={selectedPlanet.resources.deuterium >= MOON_ATTEMPT_COST.deuterium ? 'text-slate-400' : 'text-rose-400 font-semibold'}>Deut: {MOON_ATTEMPT_COST.deuterium.toLocaleString()}</div>
                      </div>
                      {hasMoon ? (
                        <div className="text-sm text-emerald-400 font-semibold">✓ Dieser Planet besitzt bereits einen Mond.</div>
                      ) : (
                        <button
                          disabled={!affordable}
                          onClick={handleMoonAttempt}
                          className={`w-full py-2 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer ${
                            affordable
                              ? 'bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 border-indigo-500/40 hover:border-indigo-400'
                              : 'bg-slate-900/20 border-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          Mondversuch starten ({Math.round(MOON_ATTEMPT_CHANCE * 100)}% Chance)
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 2d. VIEW: RESEARCH (Forschung) */}
            {view === 'research' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-blue-400" /> Galaktisches Forschungslabor
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Erforsche Kerntechnologien, um schwere Schiffstypen, verbesserte Schilde, Antriebssysteme und Astrophysik freizuschalten.
                  </p>
                </div>

                {selectedPlanet.buildings.researchLab === 0 ? (
                  <div className="bg-rose-950/20 border border-rose-900/40 p-6 rounded-xl text-sm font-semibold text-rose-300 font-mono">
                    Forschungslabor erforderlich! Erbaue zuerst ein Forschungslabor unter dem Reiter &quot;Anlagen&quot;, um forschen zu können.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(player?.research || {}).map((rKey) => {
                      const currentLvl = player?.research[rKey as keyof Research] || 0;
                      const activeQueue = player?.activeResearchQueue || [];
                      const queuedUpgradesCount = activeQueue.filter(j => j.target === rKey).length;
                      const upgradeLevel = currentLvl + queuedUpgradesCount + 1;
                      const cost = getResearchUpgradeCost(rKey as keyof Research, upgradeLevel - 1);
                      const req = RESEARCH_REQUIREMENTS[rKey as keyof Research];
                      const reqMet = req ? isRequirementMet(req, selectedPlanet.buildings, player?.research || {} as any) : true;
                      const canAfford = hasEnoughResources(selectedPlanet.resources, cost) && reqMet;
                      const duration = getResearchDuration(
                        rKey as keyof Research,
                        upgradeLevel,
                        getEffectiveResearchLabLevel(selectedPlanet.id, state.planets, player?.research.intergalacticResearchNetwork || 0),
                        state.speedMultiplier
                      );

                      return (
                        <div
                          key={rKey}
                          className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                            !reqMet
                              ? 'bg-slate-950/40 border-slate-900 opacity-60'
                              : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <AssetThumb src={researchImage(rKey as keyof Research)} className="w-12 h-12 rounded-lg object-cover border border-slate-800 shrink-0" />
                                <div>
                                  <h4 className="font-bold text-slate-200">{RESEARCH_NAMES[rKey as keyof Research]}</h4>
                                  <p className="text-xs text-slate-500 font-mono">Stufe {currentLvl}</p>
                                </div>
                              </div>
                              <div className="text-right text-[11px] text-slate-500 font-mono">
                                Zeit: <span className="text-slate-300 font-semibold">{Math.round(duration)}s</span>
                              </div>
                            </div>

                            {/* Research Description & Cumulative Effect */}
                            {RESEARCH_DETAILS[rKey] && (
                              <div className="space-y-1.5 bg-slate-950/30 p-2.5 rounded-xl border border-slate-900/40 text-xs leading-relaxed">
                                <p className="text-slate-400 text-[11px]">{RESEARCH_DETAILS[rKey].description}</p>
                                <p className="text-blue-400/90 font-semibold text-[10px] font-mono border-t border-slate-900/60 pt-1 mt-1">
                                  Aktueller Effekt: {RESEARCH_DETAILS[rKey].getCumulativeEffect(currentLvl)}
                                </p>
                              </div>
                            )}

                            {/* Requirements List */}
                            {renderRequirementsList(req)}

                            {/* Cost Matrix */}
                            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-900 text-[11px] font-mono grid grid-cols-3 gap-1">
                              <div className={selectedPlanet.resources.metal >= cost.metal ? 'text-slate-400' : 'text-rose-400 font-semibold'}>
                                Met: {cost.metal.toLocaleString()}
                              </div>
                              <div className={selectedPlanet.resources.crystal >= cost.crystal ? 'text-slate-400' : 'text-rose-400 font-semibold'}>
                                Kris: {cost.crystal.toLocaleString()}
                              </div>
                              <div className={selectedPlanet.resources.deuterium >= cost.deuterium ? 'text-slate-400' : 'text-rose-400 font-semibold'}>
                                Deut: {cost.deuterium.toLocaleString()}
                              </div>
                            </div>

                            {/* Queue Indicators */}
                            {queuedUpgradesCount > 0 && (
                              <div className="bg-indigo-950/20 px-2 py-1 rounded text-[10px] text-indigo-400 font-mono border border-indigo-900/40 flex justify-between items-center mt-1.5">
                                <span>In Warteschlange</span>
                                <span className="font-bold">+{queuedUpgradesCount} Forschungen (bis Lvl {upgradeLevel - 1})</span>
                              </div>
                            )}

                            {/* Forschungsfortschritt im Fenster */}
                            {player?.activeResearchJob?.target === rKey && (
                              <div className="bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-900/40 space-y-1.5 mt-2 animate-pulse">
                                <div className="flex justify-between text-[11px] font-bold text-indigo-400 font-mono">
                                  <span>Forschungsfortschritt...</span>
                                  <span>{Math.round(player.activeResearchJob.durationRemaining)}s</span>
                                </div>
                                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                                  <div
                                    className="bg-indigo-500 h-full rounded-full transition-all"
                                    style={{
                                      width: `${
                                        ((player.activeResearchJob.durationTotal - player.activeResearchJob.durationRemaining) /
                                          player.activeResearchJob.durationTotal) *
                                        100
                                      }%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <button
                            disabled={!canAfford || !reqMet}
                            onClick={() => handleStartResearch(rKey as keyof Research)}
                            className={`w-full py-2 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer ${
                              !reqMet
                                ? 'bg-rose-950/20 border-rose-900/30 text-rose-400/60 cursor-not-allowed'
                                : canAfford
                                ? 'bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 border-indigo-500/40 hover:border-indigo-400'
                                : 'bg-slate-900/20 border-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {!reqMet
                              ? 'Forschung gesperrt'
                              : queuedUpgradesCount > 0
                              ? `In Warteschlange einreihen (Stufe ${upgradeLevel})`
                              : activeQueue.length > 0
                              ? `In Warteschlange einreihen (Stufe ${upgradeLevel})`
                              : `Forschen auf Stufe ${upgradeLevel}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2e. VIEW: SHIPYARD (Schiffswerft) */}
            {view === 'shipyard' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-400" /> Raumschiffswerft
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Konstruiere zivile Frachter sowie mörderische Jagdgeschwader und Todessterne.
                  </p>
                </div>

                {renderShipyardQueue()}

                {selectedPlanet.buildings.shipyard === 0 ? (
                  <div className="bg-rose-950/20 border border-rose-900/40 p-6 rounded-xl text-sm font-semibold text-rose-300 font-mono">
                    Schiffswerft erforderlich! Erbaue zuerst eine Raumschiffswerft unter &quot;Anlagen&quot;, um Schiffe bauen zu können.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(SHIP_COSTS).map((sKey) => {
                      const cost = SHIP_COSTS[sKey as keyof Ships];
                      const countOnPlanet = selectedPlanet.ships[sKey as keyof Ships] || 0;
                      const orderQty = shipyardOrderQty[sKey] || 0;
                      const req = SHIP_REQUIREMENTS[sKey as keyof Ships];
                      const reqMet = req ? isRequirementMet(req, selectedPlanet.buildings, player?.research || {} as any) : true;

                      // Calculate cost for ordered quantity
                      const totalCost = {
                        metal: cost.metal * (orderQty || 1),
                        crystal: cost.crystal * (orderQty || 1),
                        deuterium: cost.deuterium * (orderQty || 1),
                      };

                      const duration = getShipyardBuildDuration(
                        cost,
                        selectedPlanet.buildings.shipyard,
                        selectedPlanet.buildings.roboticsFactory,
                        state.speedMultiplier
                      );

                      const canAfford = hasEnoughResources(selectedPlanet.resources, totalCost) && orderQty > 0 && reqMet;

                      const stats = SHIP_STATS[sKey as keyof Ships];
                      const armorTech = player?.research.armour || 0;
                      const shieldTech = player?.research.shielding || 0;
                      const weaponTech = player?.research.weapons || 0;

                      const finalHP = stats.structural * (1 + armorTech * 0.1);
                      const finalShield = stats.shield * (1 + shieldTech * 0.1);
                      const finalDamage = stats.attack * (1 + weaponTech * 0.1);
                      
                      const finalSpeed = getShipSpeed(sKey as keyof Ships, player?.research || {} as any);
                      const finalCargo = getShipCargoCapacity(sKey as keyof Ships);
                      const rapidFireList = getRapidFireList(sKey as keyof Ships);

                      return (
                        <div
                          key={sKey}
                          className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                            !reqMet
                              ? 'bg-slate-950/40 border-slate-900 opacity-60'
                              : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <AssetThumb src={shipImage(sKey as keyof Ships)} className="w-12 h-12 rounded-lg object-cover border border-slate-800 shrink-0" />
                                <div>
                                  <h4 className="font-bold text-slate-200">{SHIP_NAMES[sKey as keyof Ships]}</h4>
                                  <p className="text-xs text-slate-500 font-mono">Stationiert: {countOnPlanet}</p>
                                </div>
                              </div>
                              <div className="text-right text-[11px] text-slate-500 font-mono">
                                Bauzeit: <span className="text-slate-300 font-semibold">{Math.round(duration)}s</span>
                              </div>
                            </div>

                            {/* Requirements Tree */}
                            {renderRequirementsList(req)}

                            {/* Tactical Specs Grid */}
                            <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-900/60 text-[10px] font-mono grid grid-cols-2 gap-x-3 gap-y-1">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Struktur (LP):</span>
                                <span className="text-slate-300 font-semibold">{Math.round(finalHP).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Schildstärke:</span>
                                <span className="text-slate-300 font-semibold">{Math.round(finalShield).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Angriffsstärke:</span>
                                <span className="text-slate-300 font-semibold">{Math.round(finalDamage).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Laderaum:</span>
                                <span className="text-slate-300 font-semibold">{finalCargo.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between col-span-2 border-t border-slate-900/60 pt-1 mt-0.5">
                                <span className="text-slate-500">Geschwindigkeit:</span>
                                <span className="text-slate-300 font-semibold">
                                  {finalSpeed > 0 ? `${finalSpeed.toLocaleString()} km/s` : 'Stationär'}
                                </span>
                              </div>
                            </div>

                            {/* Rapid Fire (Schnelles Feuer) */}
                            <div className="bg-slate-950/40 px-2.5 py-1.5 rounded-xl border border-slate-900/60 text-[9px] font-mono">
                              <div className="text-[10px] text-slate-500 font-semibold mb-1">Schnelles Feuer (Rapidfire):</div>
                              <div className="text-blue-400/90 space-y-0.5">
                                {rapidFireList.map((rf, i) => (
                                  <div key={i}>• {rf}</div>
                                ))}
                              </div>
                            </div>

                            {/* Cost Matrix (individual) */}
                            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-900 text-[11px] font-mono grid grid-cols-3 gap-1">
                              <div className="text-slate-500">Met: {cost.metal.toLocaleString()}</div>
                              <div className="text-slate-500">Kris: {cost.crystal.toLocaleString()}</div>
                              <div className="text-slate-500">Deut: {cost.deuterium.toLocaleString()}</div>
                            </div>

                            {/* Quantity Input */}
                            {reqMet && (
                              <div className="flex items-center gap-2 mt-2">
                                <label className="text-[11px] text-slate-400 font-mono">Anzahl:</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={orderQty || ''}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    setShipyardOrderQty({ ...shipyardOrderQty, [sKey]: val });
                                  }}
                                  className="w-20 bg-slate-950 border border-slate-850 text-slate-200 text-xs px-2 py-1 rounded font-mono text-center focus:outline-none focus:border-blue-500"
                                />
                              </div>
                            )}
                          </div>

                          <button
                            disabled={!canAfford || !reqMet}
                            onClick={() => handleOrderShipyard('ship', sKey as keyof Ships)}
                            className={`w-full py-2 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer ${
                              !reqMet
                                ? 'bg-rose-950/20 border-rose-900/30 text-rose-400/60 cursor-not-allowed'
                                : canAfford
                                ? 'bg-blue-950/40 hover:bg-blue-900/50 text-blue-300 border-blue-500/40 hover:border-blue-400'
                                : 'bg-slate-900/20 border-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {!reqMet ? 'Schiffstyp gesperrt' : 'In Auftrag geben'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2f. VIEW: DEFENSE (Verteidigung) */}
            {view === 'defense' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-blue-400" /> Planeten-Verteidigung
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Erbaue feste Geschütze und Schutzkuppeln, um Plünderer abzuwehren und deine Mine zu befestigen.
                  </p>
                </div>

                {renderShipyardQueue()}

                {selectedPlanet.buildings.shipyard === 0 ? (
                  <div className="bg-rose-950/20 border border-rose-900/40 p-6 rounded-xl text-sm font-semibold text-rose-300 font-mono">
                    Schiffswerft erforderlich! Erbaue zuerst eine Raumschiffswerft unter &quot;Anlagen&quot;, um Verteidigungsanlagen errichten zu können.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(DEFENSE_COSTS).map((dKey) => {
                      const cost = DEFENSE_COSTS[dKey as keyof Defense];
                      const countOnPlanet = selectedPlanet.defense[dKey as keyof Defense] || 0;
                      const orderQty = defenseOrderQty[dKey] || 0;
                      const req = DEFENSE_REQUIREMENTS[dKey as keyof Defense];
                      const reqMet = req ? isRequirementMet(req, selectedPlanet.buildings, player?.research || {} as any) : true;

                      // Double check domes can only build 1 max
                      const isDome = dKey === 'smallShieldDome' || dKey === 'largeShieldDome';
                      const isMaxDome = isDome && countOnPlanet >= 1;

                      // Calculate cost for ordered quantity
                      const totalCost = {
                        metal: cost.metal * (orderQty || 1),
                        crystal: cost.crystal * (orderQty || 1),
                        deuterium: cost.deuterium * (orderQty || 1),
                      };

                      const duration = getShipyardBuildDuration(
                        cost,
                        selectedPlanet.buildings.shipyard,
                        selectedPlanet.buildings.roboticsFactory,
                        state.speedMultiplier
                      );

                      const canAfford = hasEnoughResources(selectedPlanet.resources, totalCost) && orderQty > 0 && !isMaxDome && reqMet;

                      // Tech-modifizierte Kampfwerte (analog zur Schiffs-Card)
                      const stats = DEFENSE_STATS[dKey as keyof Defense];
                      const finalHP = stats.structural * (1 + (player?.research.armour || 0) * 0.1);
                      const finalShield = stats.shield * (1 + (player?.research.shielding || 0) * 0.1);
                      const finalDamage = stats.attack * (1 + (player?.research.weapons || 0) * 0.1);
                      const rapidFireList = getRapidFireList(dKey as keyof Defense);

                      return (
                        <div
                          key={dKey}
                          className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                            !reqMet
                              ? 'bg-slate-950/40 border-slate-900 opacity-60'
                              : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <AssetThumb src={defenseImage(dKey as keyof Defense)} className="w-12 h-12 rounded-lg object-cover border border-slate-800 shrink-0" />
                                <div>
                                  <h4 className="font-bold text-slate-200">{DEFENSE_NAMES[dKey as keyof Defense]}</h4>
                                  <p className="text-xs text-slate-500 font-mono">Errichtet: {countOnPlanet} {isDome && '/ 1'}</p>
                                </div>
                              </div>
                              <div className="text-right text-[11px] text-slate-500 font-mono">
                                Bauzeit: <span className="text-slate-300 font-semibold">{Math.round(duration)}s</span>
                              </div>
                            </div>

                            {/* Requirements Tree */}
                            {renderRequirementsList(req)}

                            {/* Tactical Specs Grid */}
                            <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-900/60 text-[10px] font-mono grid grid-cols-2 gap-x-3 gap-y-1">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Struktur (LP):</span>
                                <span className="text-slate-300 font-semibold">{Math.round(finalHP).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Schildstärke:</span>
                                <span className="text-slate-300 font-semibold">{Math.round(finalShield).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between col-span-2 border-t border-slate-900/60 pt-1 mt-0.5">
                                <span className="text-slate-500">Angriffsstärke:</span>
                                <span className="text-slate-300 font-semibold">{Math.round(finalDamage).toLocaleString()}</span>
                              </div>
                            </div>

                            {/* Rapid Fire (Schnelles Feuer) */}
                            <div className="bg-slate-950/40 px-2.5 py-1.5 rounded-xl border border-slate-900/60 text-[9px] font-mono">
                              <div className="text-[10px] text-slate-500 font-semibold mb-1">Schnelles Feuer (Rapidfire):</div>
                              <div className="text-blue-400/90 space-y-0.5">
                                {rapidFireList.map((rf, i) => (
                                  <div key={i}>• {rf}</div>
                                ))}
                              </div>
                            </div>

                            {/* Cost Matrix */}
                            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-900 text-[11px] font-mono grid grid-cols-3 gap-1">
                              <div className="text-slate-500">M: {cost.metal.toLocaleString()}</div>
                              <div className="text-slate-500">K: {cost.crystal.toLocaleString()}</div>
                              <div className="text-slate-500">D: {cost.deuterium.toLocaleString()}</div>
                            </div>

                            {/* Quantity Input */}
                            {!isMaxDome && reqMet && (
                              <div className="flex items-center gap-2 mt-2">
                                <label className="text-[11px] text-slate-400 font-mono">Anzahl:</label>
                                <input
                                  type="number"
                                  min="0"
                                  max={isDome ? 1 : undefined}
                                  value={orderQty || ''}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    const finalVal = isDome ? Math.min(1, val) : val;
                                    setDefenseOrderQty({ ...defenseOrderQty, [dKey]: finalVal });
                                  }}
                                  className="w-20 bg-slate-950 border border-slate-800 text-slate-200 text-xs px-2 py-1 rounded font-mono text-center focus:outline-none focus:border-blue-500"
                                />
                              </div>
                            )}
                            {isMaxDome && (
                              <span className="text-emerald-400 text-xs font-mono block mt-2">Kuppel bereits errichtet</span>
                            )}
                          </div>

                          <button
                            disabled={!canAfford || isMaxDome || !reqMet}
                            onClick={() => handleOrderShipyard('defense', dKey as keyof Defense)}
                            className={`w-full py-2 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer ${
                              !reqMet
                                ? 'bg-rose-950/20 border-rose-900/30 text-rose-400/60 cursor-not-allowed'
                                : isMaxDome
                                ? 'bg-slate-900/10 border-slate-900 text-slate-600 cursor-not-allowed'
                                : canAfford
                                ? 'bg-blue-950/40 hover:bg-blue-900/50 text-blue-300 border-blue-500/40 hover:border-blue-400'
                                : 'bg-slate-900/20 border-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {!reqMet ? 'Abwehrgeschütz gesperrt' : isMaxDome ? 'Kuppel errichtet' : 'In Auftrag geben'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2g. VIEW: FLEET DISPATCH MANUAL */}
            {view === 'fleet' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <Send className="w-5 h-5 text-blue-400" /> Flotten-Kommando
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Sende Schiffe manuell auf Missionen oder lasse sie Rohstoffe transportieren.
                  </p>
                </div>

                {fleetFeedback && (
                  <div className="p-4 bg-blue-950/40 border border-blue-500/50 text-blue-200 rounded-xl text-xs font-mono">
                    {fleetFeedback}
                  </div>
                )}

                {/* Flottenbewegungen (eigene + eingehende) */}
                <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 space-y-5">
                  <h3 className="text-sm font-bold font-mono tracking-wide text-slate-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" /> Flottenbewegungen
                  </h3>

                  {/* Eingehende Flotten auf eigene Planeten */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-rose-300/90 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" /> Eingehende Flotten ({incomingHostileFleets.length})
                    </div>
                    {incomingHostileFleets.length === 0 ? (
                      <div className="text-xs text-slate-600 font-mono italic bg-slate-950/30 p-3 rounded-xl border border-slate-900">
                        Keine eingehenden Flotten.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {incomingHostileFleets.map((f) => {
                          const now = Date.now();
                          const { remaining, clock } = formatArrival(f.arrivalTime, now);
                          const origin = findPlanetById(f.originPlanetId);
                          const target = findPlanetById(f.targetPlanetId);
                          const attacker = state.players.find((p) => p.id === f.ownerId);
                          const isHostile = f.mission === 'attack' || f.mission === 'destroy';
                          return (
                            <div
                              key={f.id}
                              className={`p-3 rounded-xl border text-xs font-mono flex flex-col gap-1.5 ${
                                isHostile ? 'bg-rose-950/30 border-rose-900/50' : 'bg-slate-950/60 border-slate-800/80'
                              }`}
                            >
                              <div className="flex justify-between font-semibold gap-2">
                                <span className={isHostile ? 'text-rose-300' : 'text-blue-300'}>
                                  {MISSION_LABELS[f.mission]} · {attacker?.name ?? 'Unbekannt'}
                                </span>
                                <span className="text-slate-200 font-bold whitespace-nowrap">{remaining}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 flex justify-between gap-2">
                                <span>
                                  von {origin ? `${origin.name} [${origin.system}:${origin.slot}]` : `[${f.targetSystem}:${f.targetSlot}]`}
                                  {' ➔ '}
                                  nach {target ? `${target.name} [${target.system}:${target.slot}]` : '—'}
                                </span>
                                <span className="text-slate-500 whitespace-nowrap">Ankunft {clock}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Eigene Flotten */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-blue-300/90 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" /> Eigene Flotten ({playerFleets.length})
                    </div>
                    {playerFleets.length === 0 ? (
                      <div className="text-xs text-slate-600 font-mono italic bg-slate-950/30 p-3 rounded-xl border border-slate-900">
                        Keine eigenen Flotten unterwegs.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[240px] overflow-y-auto">
                        {playerFleets.map((f) => {
                          const now = Date.now();
                          const isReturning = f.isReturning;
                          const targetTime = isReturning ? f.returnTime : f.arrivalTime;
                          const { remaining, clock } = formatArrival(targetTime, now);
                          const origin = findPlanetById(f.originPlanetId);
                          const target = findPlanetById(f.targetPlanetId);
                          return (
                            <div key={f.id} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs font-mono flex flex-col gap-1.5">
                              <div className="flex justify-between font-semibold gap-2">
                                <span className={isReturning ? 'text-amber-400' : 'text-blue-400'}>
                                  {isReturning ? 'Rückflug' : MISSION_LABELS[f.mission]}
                                </span>
                                <span className="text-slate-200 font-bold whitespace-nowrap">{remaining}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 flex justify-between gap-2">
                                <span>
                                  von {origin ? `${origin.name} [${origin.system}:${origin.slot}]` : '—'}
                                  {' ➔ '}
                                  nach {target ? `${target.name} [${target.system}:${target.slot}]` : `[${f.targetSystem}:${f.targetSlot}]`}
                                </span>
                                <span className="text-slate-500 whitespace-nowrap">{isReturning ? 'Rückkehr' : 'Ankunft'} {clock}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-2">
                                {Object.entries(f.ships).map(([sKey, count]) => {
                                  if (count === 0) return null;
                                  return (
                                    <span key={sKey}>
                                      {count}x {SHIP_NAMES[sKey as keyof Ships]}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
                  {/* Target Coordinates & Mission */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 font-mono mb-1">Ziel-System (1-10):</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={manualTargetSystem}
                        onChange={(e) => setManualTargetSystem(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 font-mono mb-1">Ziel-Slot (1-9):</label>
                      <input
                        type="number"
                        min="1"
                        max="9"
                        value={manualTargetSlot}
                        onChange={(e) => setManualTargetSlot(Math.min(9, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 font-mono mb-1">Missionstyp:</label>
                      <select
                        value={manualMission}
                        onChange={(e) => setManualMission(e.target.value as MissionType)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="transport">Transport</option>
                        <option value="attack">Angriff</option>
                        <option value="spy">Spionage</option>
                        <option value="colonize">Kolonisieren</option>
                        <option value="recycle">Recyceln</option>
                        {selectedPlanet.ships.deathStar >= 10 && <option value="destroy">Planet vernichten</option>}
                      </select>
                    </div>
                  </div>

                  {/* Ship quantities */}
                  <div className="space-y-2">
                    <label className="block text-xs text-slate-300 font-bold font-mono">Schiffe auswählen:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Object.keys(selectedPlanet.ships).map((shipKey) => {
                        if (shipKey === 'solarSatellite') return null;
                        const available = selectedPlanet.ships[shipKey as keyof Ships] || 0;
                        if (available === 0) return null;

                        return (
                          <div key={shipKey} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
                            <span className="text-[11px] font-semibold text-slate-300">{SHIP_NAMES[shipKey as keyof Ships]}</span>
                            <div className="flex items-center gap-1.5 mt-2">
                              <input
                                type="number"
                                min="0"
                                max={available}
                                value={manualShips[shipKey as keyof Ships] || ''}
                                onChange={(e) => {
                                  const val = Math.min(available, Math.max(0, parseInt(e.target.value) || 0));
                                  setManualShips({ ...manualShips, [shipKey]: val });
                                }}
                                className="w-full bg-slate-900 text-slate-200 border border-slate-800 focus:border-blue-500 focus:outline-none rounded px-1.5 py-1 text-xs font-mono"
                              />
                              <button
                                onClick={() => setManualShips({ ...manualShips, [shipKey]: available })}
                                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 px-1.5 py-1 rounded cursor-pointer"
                              >
                                Max
                              </button>
                            </div>
                            <span className="text-[9px] text-slate-500 mt-1">Verfügbar: {available}</span>
                          </div>
                        );
                      })}
                      {(Object.values(selectedPlanet.ships) as number[]).reduce((a, b) => a + b, 0) === 0 && (
                        <div className="col-span-full text-xs text-slate-600 italic">Keine Schiffe verfügbar. Baue Schiffe in der Werft.</div>
                      )}
                    </div>
                  </div>

                  {/* Cargo for Transport */}
                  {manualMission === 'transport' && (
                    <div className="space-y-2">
                      <label className="block text-xs text-slate-300 font-bold font-mono">Ressourcen verladen:</label>
                      <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                        {['metal', 'crystal', 'deuterium'].map((resType) => {
                          const maxAvail = Math.floor(selectedPlanet.resources[resType as keyof Resources]);
                          return (
                            <div key={resType}>
                              <label className="block text-[10px] text-slate-500 capitalize mb-1">{resType} (max {maxAvail.toLocaleString()})</label>
                              <input
                                type="number"
                                min="0"
                                max={maxAvail}
                                value={manualCargo[resType as keyof Resources] || ''}
                                onChange={(e) => {
                                  const val = Math.min(maxAvail, Math.max(0, parseInt(e.target.value) || 0));
                                  setManualCargo({ ...manualCargo, [resType]: val });
                                }}
                                className="w-full bg-slate-900 border border-slate-800 text-xs px-2 py-1 rounded font-mono text-slate-200"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Launch trigger button */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleManualFleetLaunch}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg transform hover:-translate-y-0.5 transition-all cursor-pointer"
                    >
                      Flotte absenden
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2h. VIEW: GALAXY */}
            {view === 'galaxy' && (
              <GalaxyView
                state={state}
                selectedPlanet={selectedPlanet}
                onLaunchFleet={handleLaunchFleet}
              />
            )}

            {/* 2i. VIEW: EMPIRE & KI RANKINGS */}
            {view === 'empire' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-400" /> Galaktisches Imperium & Rangliste
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Aktueller Punktestand aller Herrscher im Orion-Sektor. Verhindere, dass feindliche KIs dich überholen!
                  </p>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 p-3 bg-slate-900/90 border-b border-slate-800 text-xs font-semibold text-slate-400 font-mono">
                    <div className="col-span-1 text-center">Platz</div>
                    <div className="col-span-4">Herrscher</div>
                    <div className="col-span-2 text-right">Gebäude</div>
                    <div className="col-span-2 text-right">Forschung</div>
                    <div className="col-span-2 text-right">Militär</div>
                    <div className="col-span-1 text-right">Gesamt</div>
                  </div>

                  <div className="divide-y divide-slate-800/60 font-mono text-xs">
                    {[...state.players]
                      .sort((a, b) => b.points.total - a.points.total)
                      .map((p, idx) => {
                        const isSelf = p.id === 'player';
                        const planetCount = state.planets.filter((pl) => pl.ownerId === p.id).length;
                        const isEliminated = planetCount === 0;

                        return (
                          <div
                            key={p.id}
                            className={`grid grid-cols-12 gap-2 px-3 py-4 items-center ${
                              isSelf ? 'bg-blue-950/15' : ''
                            }`}
                          >
                            <div className="col-span-1 text-center font-bold text-slate-500">
                              {idx + 1}
                            </div>
                            <div className="col-span-4 flex items-center gap-2">
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${
                                  p.id === 'player'
                                    ? 'bg-blue-500'
                                    : p.id === 'ai1'
                                    ? 'bg-red-500'
                                    : p.id === 'ai2'
                                    ? 'bg-emerald-500'
                                    : p.id === 'ai3'
                                    ? 'bg-purple-500'
                                    : p.id === 'ai4'
                                    ? 'bg-amber-500'
                                    : 'bg-pink-500'
                                }`}
                              />
                              <div>
                                <span className={`font-semibold ${isSelf ? 'text-blue-300' : 'text-slate-300'}`}>
                                  {p.name} {isSelf && '(Du)'}
                                </span>
                                {isEliminated ? (
                                  <span className="text-[10px] text-rose-500 block font-bold leading-none mt-1">ELIMINIERT (0 Planeten)</span>
                                ) : (
                                  <span className="text-[10px] text-slate-500 block leading-none mt-1">{planetCount} Kolonie(n)</span>
                                )}
                              </div>
                            </div>
                            <div className="col-span-2 text-right text-slate-400">
                              {p.points.buildings.toLocaleString()}
                            </div>
                            <div className="col-span-2 text-right text-slate-400">
                              {p.points.research.toLocaleString()}
                            </div>
                            <div className="col-span-2 text-right text-slate-400">
                              {(p.points.fleet + p.points.defense).toLocaleString()}
                            </div>
                            <div className="col-span-1 text-right font-bold text-slate-200">
                              {p.points.total.toLocaleString()}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* 2j. VIEW: COMBAT LOGS */}
            {view === 'combat' && (
              <CombatLogsView
                logs={state.combatLog}
                onClearLogs={handleClearCombatLogs}
              />
            )}

            {/* 2k. VIEW: DEBUG CONSOLE (only in debug mode) */}
            {view === 'debug' && state.debugMode && (
              <DebugConsoleView
                logs={state.debugLog ?? []}
                players={state.players}
                onClear={handleClearDebugLog}
              />
            )}

          </div>
          </div>
        </main>
      </div>

      {/* 3. OFFLINE SIMULATION MODAL */}
      <AnimatePresence>
        {showOfflineModal && offlineDetails && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-[0_10px_50px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-center gap-3">
                <Database className="w-8 h-8 text-blue-400 animate-pulse" />
                <div>
                  <h3 className="font-bold text-slate-100 font-mono">Offline-Bericht</h3>
                  <p className="text-xs text-slate-500">Das Universum wurde im Hintergrund simuliert.</p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-2 text-slate-300">
                <p>
                  Du warst offline für:{' '}
                  <span className="text-blue-400 font-bold">
                    {offlineDetails.hours} Std, {offlineDetails.mins} Min, {offlineDetails.secs} Sek
                  </span>
                </p>
                <div className="h-px bg-slate-800 my-2" />
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  • Ressourcen wurden aufaddiert.<br />
                  • Gebäudebauten, Labore und Werftaufträge wurden sequenziell fertiggestellt.<br />
                  • Flottenbewegungen wurden fortgeführt und abgewickelt.<br />
                  • KI-Opponenten haben Rohstoffe gesammelt.
                </p>
              </div>

              <button
                onClick={() => setShowOfflineModal(false)}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-lg shadow-lg hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all cursor-pointer"
              >
                Sektor-Zustand bestätigen
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
