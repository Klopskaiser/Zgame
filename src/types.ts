/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Resources {
  metal: number;
  crystal: number;
  deuterium: number;
}

export type ResourceType = 'metal' | 'crystal' | 'deuterium';

export interface Buildings {
  metalMine: number;
  crystalMine: number;
  deuteriumSynthesizer: number;
  solarPowerPlant: number;
  fusionPowerPlant: number;
  roboticsFactory: number;
  naniteFactory: number;
  shipyard: number;
  researchLab: number;
  terraformer: number;
  missileSilo: number;
  metalStorage: number;
  crystalStorage: number;
  deuteriumStorage: number;
  // --- Mond-/Sondergebäude ---
  moonCannon: number; // Mondkanone (nur Planet, max Stufe 1): Ressourcen-Pool + Mondversuch
  mondbasis: number; // Mondbasis (nur Mond): gibt Bau-Felder frei
  matterConverter: number; // Materieumwandler (nur Mond): wandelt Metall in Kristall/Deuterium
  jumpGate: number; // Sprungtor (nur Mond, max Stufe 1): Flottensprung zwischen eigenen Monden
}

export interface Research {
  espionage: number;
  computer: number;
  weapons: number;
  shielding: number;
  armour: number;
  energy: number;
  combustionDrive: number;
  impulseDrive: number;
  hyperspaceDrive: number;
  astrophysics: number;
  laserTech: number;
  ionTech: number;
  plasmaTech: number;
  intergalacticResearchNetwork: number;
  materialScience: number; // Materialforschung: senkt Anstieg der Gebäudebaukosten um 1%/Stufe
  moonExpedition: number; // Mondexpedition: +1 Baufeld je Stufe auf jedem Mond
}

export interface Ships {
  smallCargo: number;
  largeCargo: number;
  lightFighter: number;
  heavyFighter: number;
  cruiser: number;
  battleship: number;
  battlecruiser: number;
  colonyShip: number;
  recycler: number;
  espionageProbe: number;
  bomber: number;
  destroyer: number;
  deathStar: number;
  solarSatellite: number;
}

export interface Defense {
  rocketLauncher: number;
  lightLaser: number;
  heavyLaser: number;
  gaussCannon: number;
  ionCannon: number;
  plasmaTurret: number;
  smallShieldDome: number;
  largeShieldDome: number;
}

export interface BuildJob {
  id: string;
  type: 'building';
  target: keyof Buildings;
  level: number;
  durationTotal: number; // in seconds
  durationRemaining: number; // in seconds
}

export interface ShipyardJob {
  id: string;
  type: 'ship' | 'defense';
  target: keyof Ships | keyof Defense;
  count: number;
  durationPerItem: number; // in seconds
  durationRemainingInCurrent: number; // in seconds
}

export interface ResearchJob {
  id: string;
  type: 'research';
  target: keyof Research;
  level: number;
  durationTotal: number; // in seconds
  durationRemaining: number; // in seconds
}

export interface Planet {
  id: string;
  name: string;
  system: number; // 1-10
  slot: number; // 1-9
  ownerId: string | null; // null = unoccupied, 'player' = human, 'ai1'..'ai5' = AI
  isMoon: boolean;
  parentPlanetId?: string; // nur bei Monden: id des zugehörigen Planeten
  moonId?: string | null; // nur bei Planeten: id des zugehörigen Mondes (falls vorhanden)
  lastJumpTime?: number; // nur bei Monden: Zeitstempel des letzten Sprungtor-Sprungs (ms)
  temperatureMin: number;
  temperatureMax: number;
  diameter: number; // km
  maxFields: number;
  fieldsUsed: number;
  resources: Resources;
  lastResourceUpdate: number; // timestamp in ms
  buildings: Buildings;
  ships: Ships;
  defense: Defense;
  activeBuildJob: BuildJob | null;
  activeBuildQueue: BuildJob[];
  activeShipyardQueue: ShipyardJob[];
  fusionActive?: boolean;
  converterActive?: boolean; // nur bei Monden: Materieumwandler an/aus (Default an)
  debris?: { metal: number; crystal: number }; // Trümmerfeld im Orbit (aus Kämpfen); von Recyclern bergbar
}

export interface Player {
  id: string; // 'player' or 'ai1'..'ai5'
  name: string;
  isAI: boolean;
  color: string; // Tailind color class or hex
  research: Research;
  activeResearchJob: ResearchJob | null;
  activeResearchQueue: ResearchJob[];
  points: {
    total: number;
    buildings: number;
    research: number;
    fleet: number;
    defense: number;
  };
  // Echtzeit-Cooldown der KI: Ziel-ownerId → letzter Angriffszeitpunkt (ms). Optional → savegame-safe.
  lastAttackTimes?: Record<string, number>;
  // Echtzeit-Drossel: frühester Zeitpunkt (ms) für die nächste KI-Aktion. Optional → savegame-safe.
  nextActionTime?: number;
  // Eigener Takt für Forschung – entkoppelt vom Bau-/Werft-Token, damit die KI zuverlässig forscht.
  nextResearchTime?: number;
}

export type MissionType = 'transport' | 'attack' | 'spy' | 'colonize' | 'destroy' | 'recycle' | 'station';

export interface Fleet {
  id: string;
  ownerId: string;
  originPlanetId: string;
  targetPlanetId: string;
  targetSystem: number;
  targetSlot: number;
  mission: MissionType;
  ships: Ships;
  resources: Resources;
  departureTime: number; // timestamp ms
  arrivalTime: number; // timestamp ms
  returnTime: number; // timestamp ms
  isReturning: boolean;
  speedMultiplier: number;
}

export interface CombatRound {
  attackerShipsBefore: Ships;
  defenderShipsBefore: Ships;
  defenderDefenseBefore: Defense;
  attackerDamage: number;
  defenderDamage: number;
  attackerShipsAfter: Ships;
  defenderShipsAfter: Ships;
  defenderDefenseAfter: Defense;
}

export interface CombatLog {
  id: string;
  timestamp: number;
  system: number;
  slot: number;
  attackerName: string;
  defenderName: string;
  mission: MissionType;
  rounds: CombatRound[];
  winner: 'attacker' | 'defender' | 'draw';
  loot: Resources;
  attackerLosses: Resources;
  defenderLosses: Resources;
  planetDestroyed: boolean;
  deathStarsLost: number;
  debrisCreated?: Resources; // im Kampf erzeugtes Trümmerfeld (Metall/Kristall); Deuterium immer 0
  espionageReport?: string;
  eventType?: 'moonAttempt'; // markiert generische Ereignis-Einträge (kein Kampf/Spionage)
  eventText?: string; // freier Ereignistext (z.B. Mondversuch-Ergebnis)
  // Beteiligte Einheiten je Seite (Bestand vorher → übrig). Optional → alte Savegames bleiben kompatibel.
  attackerShipsInitial?: Ships;
  attackerShipsRemaining?: Ships;
  defenderShipsInitial?: Ships;
  defenderShipsRemaining?: Ships;
  defenderDefenseInitial?: Defense;
  defenderDefenseRemaining?: Defense;
}

export interface DebugLogEntry {
  id: string;
  timestamp: number;
  playerId: string; // 'player' | 'ai1'..'ai5'
  playerName: string;
  category: 'build' | 'research' | 'shipyard' | 'fleet' | 'combat' | 'info';
  message: string; // German plain text, e.g. "Baut Schiffswerft → Stufe 4"
}

export const GAME_VERSION = '1.1';

export interface GameState {
  version: string;
  speedMultiplier: number;
  lastTickTimestamp: number;
  players: Player[];
  planets: Planet[];
  fleets: Fleet[];
  combatLog: CombatLog[];
  selectedPlanetId: string; // Current planet the player is looking at
  debugMode?: boolean;
  debugLog?: DebugLogEntry[]; // Only populated when debugMode is true; capped to last 400
}
