/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameState, Player, Planet, Fleet, BuildJob, ShipyardJob, ResearchJob, Resources, CombatLog, Ships, Defense, Research, Buildings, MissionType, DebugLogEntry, GAME_VERSION } from '../types';
import {
  getPlanetProductionPerHour,
  getBuildingUpgradeCost,
  getResearchUpgradeCost,
  hasEnoughResources,
  getBuildingBuildDuration,
  getResearchDuration,
  getEffectiveResearchLabLevel,
  getShipyardBuildDuration,
  getEnergyStatus,
  SHIP_COSTS,
  DEFENSE_COSTS,
  SHIP_STATS,
  DEFENSE_STATS,
  getDistance,
  getPlanetStorageCapacities,
  getFlightDuration,
  getShipCargoCapacity,
  getFleetCargoCapacity,
  getFlightFuelConsumption,
  BUILDING_NAMES,
  RESEARCH_NAMES,
  SHIP_NAMES,
  DEFENSE_NAMES,
  getShipSpeed,
  getFleetSpeed,
  isRequirementMet,
  BUILDING_REQUIREMENTS,
  RESEARCH_REQUIREMENTS,
  SHIP_REQUIREMENTS,
  DEFENSE_REQUIREMENTS,
  getMoonMaxFields,
  getEffectiveMaxFields,
  getMoonDiameter,
  getMatterConverterMetalInput,
  getMatterConverterEnergyConsumption,
  getMatterConverterOutput,
  canBuildOnBody,
  getMaxBuildingLevel,
  getRapidFire,
  UnitKey,
} from './formulas';

// --- FACTORY HELPERS ---

export function emptyBuildings(): Buildings {
  return {
    metalMine: 0, crystalMine: 0, deuteriumSynthesizer: 0, solarPowerPlant: 0, fusionPowerPlant: 0,
    roboticsFactory: 0, naniteFactory: 0, shipyard: 0, researchLab: 0, terraformer: 0, missileSilo: 0,
    metalStorage: 0, crystalStorage: 0, deuteriumStorage: 0,
    moonCannon: 0, mondbasis: 0, matterConverter: 0, jumpGate: 0,
  };
}

export function emptyShips(): Ships {
  return {
    smallCargo: 0, largeCargo: 0, lightFighter: 0, heavyFighter: 0, cruiser: 0, battleship: 0,
    battlecruiser: 0, colonyShip: 0, recycler: 0, espionageProbe: 0, bomber: 0, destroyer: 0, deathStar: 0, solarSatellite: 0,
  };
}

export function emptyDefense(): Defense {
  return {
    rocketLauncher: 0, lightLaser: 0, heavyLaser: 0, gaussCannon: 0, ionCannon: 0, plasmaTurret: 0,
    smallShieldDome: 0, largeShieldDome: 0,
  };
}

export function emptyResearch(): Research {
  return {
    espionage: 0, computer: 0, weapons: 0, shielding: 0, armour: 0, energy: 0, combustionDrive: 0,
    impulseDrive: 0, hyperspaceDrive: 0, astrophysics: 0, laserTech: 0, ionTech: 0, plasmaTech: 0,
    intergalacticResearchNetwork: 0, materialScience: 0, moonExpedition: 0,
  };
}

// Migriert einen (ggf. alten) Spielstand: füllt neue Building-/Research-Keys mit Defaults auf,
// normalisiert Mond-Felder und setzt die Version. Defensiv – verändert bestehende Werte nicht.
export function migrateState(state: GameState): GameState {
  // Zähl-Objekte defensiv mergen: fehlende Keys (z.B. das neue Schiff battlecruiser in alten Ständen)
  // mit Default 0 auffüllen UND ungültige Werte (undefined/NaN) auf 0 normalisieren. Letzteres heilt
  // auch bereits beschädigte Stände, bei denen ein `undefined++` zuvor NaN erzeugt hat.
  const sanitize = <T extends object>(empty: T, obj: unknown): T => {
    const src = (obj as Record<string, unknown>) || {};
    const def = empty as Record<string, number>;
    const out: Record<string, number> = {};
    for (const k of Object.keys(def)) {
      const v = src[k];
      out[k] = typeof v === 'number' && Number.isFinite(v) ? v : def[k];
    }
    return out as T;
  };
  const players = state.players.map(p => ({
    ...p,
    research: sanitize(emptyResearch(), p.research),
  }));
  const planets = state.planets.map(p => ({
    ...p,
    buildings: sanitize(emptyBuildings(), p.buildings),
    ships: sanitize(emptyShips(), p.ships),
    defense: sanitize(emptyDefense(), p.defense),
    moonId: p.moonId ?? null,
  }));
  return { ...state, players, planets, version: GAME_VERSION };
}

// Erstellt ein neues Mond-Objekt für einen Planeten (OGame-nah). Der Aufrufer muss den Mond in
// state.planets einfügen und planet.moonId setzen.
export function createMoon(planet: Planet, moonExpeditionLevel: number, now: number): Planet {
  const diameter = getMoonDiameter(20);
  return {
    id: `moon_${planet.system}_${planet.slot}_${Math.floor(Math.random() * 1000000)}`,
    name: `Mond ${planet.system}:${planet.slot}`,
    system: planet.system,
    slot: planet.slot,
    ownerId: planet.ownerId,
    isMoon: true,
    parentPlanetId: planet.id,
    moonId: null,
    temperatureMin: planet.temperatureMin,
    temperatureMax: planet.temperatureMax,
    diameter,
    maxFields: getMoonMaxFields(0, moonExpeditionLevel),
    fieldsUsed: 0,
    resources: { metal: 0, crystal: 0, deuterium: 0 },
    lastResourceUpdate: now,
    buildings: emptyBuildings(),
    ships: emptyShips(),
    defense: emptyDefense(),
    activeBuildJob: null,
    activeBuildQueue: [],
    activeShipyardQueue: [],
  };
}

// Fügt einen generischen Ereignis-Eintrag (kein Kampf/Spionage) in das Log ein.
export function pushMoonAttemptLog(
  logArray: CombatLog[],
  planet: Planet,
  ownerName: string,
  text: string,
  now: number
): void {
  logArray.push({
    id: `event_${now}_${Math.floor(Math.random() * 1000000)}`,
    timestamp: now,
    system: planet.system,
    slot: planet.slot,
    attackerName: ownerName,
    defenderName: planet.name,
    mission: 'transport',
    rounds: [],
    winner: 'draw',
    loot: { metal: 0, crystal: 0, deuterium: 0 },
    attackerLosses: { metal: 0, crystal: 0, deuterium: 0 },
    defenderLosses: { metal: 0, crystal: 0, deuterium: 0 },
    planetDestroyed: false,
    deathStarsLost: 0,
    eventType: 'moonAttempt',
    eventText: text,
  });
}

// Kosten eines Mondversuchs (fix). 20% Chance auf Mondentstehung.
export const MOON_ATTEMPT_COST: Resources = { metal: 1000000, crystal: 1000000, deuterium: 1000000 };
export const MOON_ATTEMPT_CHANCE = 0.2;

// --- INITIAL STATE CREATOR ---

export function generateUniverse(speedMultiplier: number, isDebugMode: boolean = false): GameState {
  const makeResearch = (lvl: number): Research => ({
    espionage: lvl,
    computer: lvl,
    weapons: lvl,
    shielding: lvl,
    armour: lvl,
    energy: lvl,
    combustionDrive: lvl,
    impulseDrive: lvl,
    hyperspaceDrive: lvl,
    astrophysics: lvl,
    laserTech: lvl,
    ionTech: lvl,
    plasmaTech: lvl,
    intergalacticResearchNetwork: lvl,
    materialScience: lvl,
    moonExpedition: lvl,
  });
  const initialResearch = (): Research => makeResearch(isDebugMode ? 15 : 0);

  const playerDefs: { id: string; name: string; isAI: boolean; color: string }[] = [
    { id: 'player', name: 'Imperator', isAI: false, color: 'blue' },
    { id: 'ai1', name: 'Xenon Prime', isAI: true, color: 'red' },
    { id: 'ai2', name: 'Kryon Core', isAI: true, color: 'green' },
    { id: 'ai3', name: 'Orion Overlord', isAI: true, color: 'purple' },
    { id: 'ai4', name: 'Void Syndicate', isAI: true, color: 'amber' },
    { id: 'ai5', name: 'Solar Hegemony', isAI: true, color: 'pink' },
  ];

  const players: Player[] = playerDefs.map(def => ({
    id: def.id,
    name: def.name,
    isAI: def.isAI,
    color: def.color,
    research: initialResearch(),
    activeResearchJob: null,
    activeResearchQueue: [],
    points: { total: 0, buildings: 0, research: 0, fleet: 0, defense: 0 },
  }));

  const planets: Planet[] = [];
  const now = Date.now();

  // Deterministic system home positions for players to disperse them beautifully
  const homeCoords: Record<string, { system: number; slot: number }> = {
    player: { system: 1, slot: 4 },
    ai1: { system: 2, slot: 5 },
    ai2: { system: 4, slot: 4 },
    ai3: { system: 6, slot: 5 },
    ai4: { system: 8, slot: 4 },
    ai5: { system: 10, slot: 5 },
  };

  // Generate 10 solar systems with 6 to 9 slots each
  for (let system = 1; system <= 10; system++) {
    // Determine number of slots in this system (randomly 6 to 9)
    const slotCount = 6 + (Math.abs(Math.sin(system)) * 4 | 0); // stable pseudorandom slot count: 6 to 9

    for (let slot = 1; slot <= slotCount; slot++) {
      let ownerId: string | null = null;
      let name = `Planet ${system}:${slot}`;

      // Check if this coordinate is a player's home coordinate
      for (const [pId, coord] of Object.entries(homeCoords)) {
        if (coord.system === system && coord.slot === slot) {
          ownerId = pId;
          const p = players.find(x => x.id === pId);
          name = pId === 'player' ? 'Heimatwelt' : `Kolonie (${p?.name})`;
          break;
        }
      }

      // Planet sizing and temp based on slot
      let tempMin = 0;
      let tempMax = 0;
      let diameter = 0;
      let maxFields = 0;

      if (slot <= 3) {
        // Hot inner planets
        tempMin = 50 + (slot * 15) - Math.floor(Math.sin(system) * 20);
        tempMax = tempMin + 30;
        diameter = 4000 + Math.floor(Math.cos(system * slot) * 2000) + slot * 1000;
        maxFields = Math.round(diameter / 120);
      } else if (slot <= 6) {
        // Temperate middle planets (largest)
        tempMin = -10 + (slot * 5) - Math.floor(Math.sin(system) * 15);
        tempMax = tempMin + 25;
        diameter = 12000 + Math.floor(Math.cos(system * slot) * 4000);
        maxFields = Math.round(diameter / 75);
      } else {
        // Cold outer planets
        tempMin = -120 + (slot * 8) - Math.floor(Math.sin(system) * 10);
        tempMax = tempMin + 20;
        diameter = 7000 + Math.floor(Math.cos(system * slot) * 3000);
        maxFields = Math.round(diameter / 90);
      }

      // Im Debug-Modus bekommen auch die KI-Planeten einen starken Start (etwas unter dem Spieler),
      // damit die KI sofort forscht, Schiffe/Verteidigung baut und als echter Gegner testbar ist.
      const isDebugAI = isDebugMode && !!ownerId && ownerId !== 'player';
      const resources: Resources = isDebugMode && ownerId === 'player'
        ? { metal: 100000000, crystal: 100000000, deuterium: 50000000 } // starting resources for occupied planets
        : isDebugAI
          ? { metal: 5000000, crystal: 5000000, deuterium: 2000000 }
          : ownerId
            ? { metal: 1000, crystal: 800, deuterium: 200 }
            : { metal: 0, crystal: 0, deuterium: 0 };

      planets.push({
        id: `planet_${system}_${slot}`,
        name,
        system,
        slot,
        ownerId,
        isMoon: false,
        temperatureMin: tempMin,
        temperatureMax: tempMax,
        diameter,
        maxFields: (isDebugMode && ownerId === 'player') || isDebugAI ? 999 : maxFields,
        fieldsUsed: isDebugMode && ownerId === 'player' ? 320 : (isDebugAI ? 236 : (ownerId ? 1 : 0)),
        resources,
        lastResourceUpdate: now,
        buildings: isDebugMode && ownerId === 'player' ? {
          metalMine: 50,
          crystalMine: 50,
          deuteriumSynthesizer: 50,
          solarPowerPlant: 50,
          fusionPowerPlant: 0,
          roboticsFactory: 10,
          naniteFactory: 4,
          shipyard: 12,
          researchLab: 10,
          terraformer: 0,
          missileSilo: 0,
          metalStorage: 50,
          crystalStorage: 50,
          deuteriumStorage: 50,
          moonCannon: 1, // Debug: Mondkanone bereits gebaut → Mondversuch/Pool testbar
          mondbasis: 0,
          matterConverter: 0,
          jumpGate: 0,
        } : isDebugAI ? {
          // KI-Debug-Start: solide Wirtschaft/Energie/Infra, aber unter dem Spieler-Level.
          metalMine: 30,
          crystalMine: 28,
          deuteriumSynthesizer: 24,
          solarPowerPlant: 32,
          fusionPowerPlant: 8,
          roboticsFactory: 8,
          naniteFactory: 3,
          shipyard: 10,
          researchLab: 8,
          terraformer: 0,
          missileSilo: 2,
          metalStorage: 28,
          crystalStorage: 28,
          deuteriumStorage: 26,
          moonCannon: 1,
          mondbasis: 0,
          matterConverter: 0,
          jumpGate: 0,
        } : {
          metalMine: ownerId ? 1 : 0,
          crystalMine: ownerId ? 1 : 0,
          deuteriumSynthesizer: 0,
          solarPowerPlant: ownerId ? 1 : 0,
          fusionPowerPlant: 0,
          roboticsFactory: 0,
          naniteFactory: 0,
          shipyard: 0,
          researchLab: 0,
          terraformer: 0,
          missileSilo: 0,
          metalStorage: 0,
          crystalStorage: 0,
          deuteriumStorage: 0,
          moonCannon: 0,
          mondbasis: 0,
          matterConverter: 0,
          jumpGate: 0,
        },
        ships: {
          smallCargo: 0,
          largeCargo: 0,
          lightFighter: isDebugAI ? 30 : (ownerId ? 2 : 0), // Give some starting light fighters
          heavyFighter: isDebugAI ? 15 : 0,
          cruiser: isDebugAI ? 10 : 0,
          battleship: isDebugAI ? 6 : 0,
          battlecruiser: isDebugAI ? 4 : 0,
          colonyShip: 0,
          recycler: 0,
          espionageProbe: ownerId ? 1 : 0,
          bomber: 0,
          destroyer: 0,
          deathStar: 0,
          solarSatellite: 0,
        },
        defense: {
          rocketLauncher: isDebugAI ? 30 : 0,
          lightLaser: isDebugAI ? 20 : 0,
          heavyLaser: isDebugAI ? 8 : 0,
          gaussCannon: 0,
          ionCannon: 0,
          plasmaTurret: 0,
          smallShieldDome: 0,
          largeShieldDome: 0,
        },
        moonId: null,
        activeBuildJob: null,
        activeBuildQueue: [],
        activeShipyardQueue: [],
      });
    }
  }

  // Find player home planet ID for initial state selection
  const playerHome = planets.find(p => p.ownerId === 'player')!;

  return {
    version: GAME_VERSION,
    speedMultiplier,
    lastTickTimestamp: now,
    players,
    planets,
    fleets: [],
    combatLog: [],
    selectedPlanetId: playerHome.id,
    debugMode: isDebugMode,
  };
}

// --- RESOURCE & TIMING TICK SIMULATION (ANALYTICAL & REALTIME) ---

export function simulateTimePassed(state: GameState, currentTimestamp: number): GameState {
  const deltaMs = currentTimestamp - state.lastTickTimestamp;
  if (deltaMs <= 0) return state;

  const deltaSeconds = deltaMs / 1000;
  const speedMult = state.speedMultiplier;

  // Clone players & planets to compute changes
  const players = state.players.map(p => {
    const activeResearchQueue = p.activeResearchQueue ? p.activeResearchQueue.map(q => ({ ...q })) : [];
    if (p.activeResearchJob && activeResearchQueue.length === 0) {
      activeResearchQueue.push({ ...p.activeResearchJob });
    }
    return {
      ...p,
      research: { ...p.research },
      activeResearchJob: p.activeResearchJob ? { ...p.activeResearchJob } : null,
      activeResearchQueue,
    };
  });
  const planets: Planet[] = state.planets.map((p): Planet => {
    const activeBuildQueue = p.activeBuildQueue ? p.activeBuildQueue.map(q => ({ ...q })) : [];
    if (p.activeBuildJob && activeBuildQueue.length === 0) {
      activeBuildQueue.push({ ...p.activeBuildJob });
    }
    return {
      ...p,
      resources: { ...p.resources },
      buildings: { ...p.buildings },
      ships: { ...p.ships },
      defense: { ...p.defense },
      activeBuildJob: p.activeBuildJob ? { ...p.activeBuildJob } : null,
      activeBuildQueue,
      activeShipyardQueue: p.activeShipyardQueue.map(q => ({ ...q })),
      debris: p.debris ? { ...p.debris } : undefined,
    };
  });

  // Create lookup for ease of updates
  const playerMap = new Map<string, typeof players[0]>();
  players.forEach(p => playerMap.set(p.id, p));

  const planetMap = new Map<string, typeof planets[0]>();
  planets.forEach(p => planetMap.set(p.id, p));

  // Energieverbrauch aktiver Mond-Materieumwandler je Elternplanet (fließt in dessen Energiebilanz ein).
  const converterConsumptionByPlanet = new Map<string, number>();
  for (const moon of planets) {
    if (!moon.isMoon || !moon.parentPlanetId) continue;
    const lvl = moon.buildings.matterConverter || 0;
    if (lvl <= 0 || moon.converterActive === false) continue;
    const prev = converterConsumptionByPlanet.get(moon.parentPlanetId) || 0;
    converterConsumptionByPlanet.set(moon.parentPlanetId, prev + getMatterConverterEnergyConsumption(lvl, speedMult));
  }

  // 1. SIMULATE BUILDING CONSTRUCTION AND RESOURCES FOR PLANETS
  for (const planet of planets) {
    let secondsToSimulate = deltaSeconds;
    // Bestand zu Tick-Beginn: dient als weiche Obergrenze. Lieferungen (Transport etc.) dürfen die
    // Lager überfüllen; die Produktion füllt nur bis zur Lagerkapazität und stoppt dann (kein hartes Cap).
    const startRes = { metal: planet.resources.metal, crystal: planet.resources.crystal, deuterium: planet.resources.deuterium };
    const owner = planet.ownerId ? playerMap.get(planet.ownerId) : null;
    const energyTechLevel = owner?.research.energy || 0;
    const converterExtra = converterConsumptionByPlanet.get(planet.id) || 0;

    while (planet.activeBuildQueue && planet.activeBuildQueue.length > 0 && secondsToSimulate > 0) {
      const job = planet.activeBuildQueue[0];
      if (secondsToSimulate >= job.durationRemaining) {
        // Build job finishes!
        const timeSpent = job.durationRemaining;
        secondsToSimulate -= timeSpent;

        // Simulate resources up to completion time using old building levels
        const hourlyProdOld = getPlanetProductionPerHour(
          planet.buildings,
          planet.temperatureMax,
          speedMult,
          planet.ships.solarSatellite || 0,
          energyTechLevel,
          planet.fusionActive !== false,
          owner?.research.plasmaTech || 0,
          converterExtra
        );
        planet.resources.metal += (hourlyProdOld.metal / 3600) * timeSpent;
        planet.resources.crystal += (hourlyProdOld.crystal / 3600) * timeSpent;
        planet.resources.deuterium += (hourlyProdOld.deuterium / 3600) * timeSpent;

        // Apply completion
        planet.buildings[job.target]++;
        planet.fieldsUsed++;
        planet.activeBuildQueue.shift();
      } else {
        // Job does not finish. Just subtract remaining time and simulate full resource generation for this step
        job.durationRemaining -= secondsToSimulate;
        const hourlyProd = getPlanetProductionPerHour(
          planet.buildings,
          planet.temperatureMax,
          speedMult,
          planet.ships.solarSatellite || 0,
          energyTechLevel,
          planet.fusionActive !== false,
          owner?.research.plasmaTech || 0,
          converterExtra
        );
        planet.resources.metal += (hourlyProd.metal / 3600) * secondsToSimulate;
        planet.resources.crystal += (hourlyProd.crystal / 3600) * secondsToSimulate;
        planet.resources.deuterium += (hourlyProd.deuterium / 3600) * secondsToSimulate;
        secondsToSimulate = 0;
      }
    }

    // Keep activeBuildJob in sync for legacy compatibility
    planet.activeBuildJob = planet.activeBuildQueue && planet.activeBuildQueue.length > 0 ? planet.activeBuildQueue[0] : null;

    if (secondsToSimulate > 0) {
      // No active build job for the remaining duration, simply add resources
      const hourlyProd = getPlanetProductionPerHour(
        planet.buildings,
        planet.temperatureMax,
        speedMult,
        planet.ships.solarSatellite || 0,
        energyTechLevel,
        planet.fusionActive !== false,
        owner?.research.plasmaTech || 0,
        converterExtra
      );
      planet.resources.metal += (hourlyProd.metal / 3600) * secondsToSimulate;
      planet.resources.crystal += (hourlyProd.crystal / 3600) * secondsToSimulate;
      planet.resources.deuterium += (hourlyProd.deuterium / 3600) * secondsToSimulate;
    }

    // Rundung auf 1 Nachkommastelle + WEICHER Lager-Cap: die effektive Obergrenze ist das Maximum aus
    // Lagerkapazität und dem Bestand zu Tick-Beginn. So stoppt die Minenproduktion bei voller Lagerung,
    // eine bereits vorhandene Überfüllung (z.B. durch Lieferungen) wird aber nicht abgeschnitten.
    const caps = getPlanetStorageCapacities(planet.buildings);
    const softCapM = Math.max(caps.metal, startRes.metal);
    const softCapC = Math.max(caps.crystal, startRes.crystal);
    const softCapD = Math.max(caps.deuterium, startRes.deuterium);
    planet.resources.metal = Math.min(softCapM, Math.max(0, parseFloat(planet.resources.metal.toFixed(1))));
    planet.resources.crystal = Math.min(softCapC, Math.max(0, parseFloat(planet.resources.crystal.toFixed(1))));
    planet.resources.deuterium = Math.min(softCapD, Math.max(0, parseFloat(planet.resources.deuterium.toFixed(1))));
    planet.lastResourceUpdate = currentTimestamp;

    // 2. SIMULATE SHIPYARD (SHIPS & DEFENSES) FOR PLANETS
    let yardSeconds = deltaSeconds;
    while (planet.activeShipyardQueue.length > 0 && yardSeconds > 0) {
      const currentJob = planet.activeShipyardQueue[0];

      if (yardSeconds >= currentJob.durationRemainingInCurrent) {
        // At least one item in the job is finished!
        yardSeconds -= currentJob.durationRemainingInCurrent;

        // Add 1 to ships or defenses (defensiv: fehlender/NaN-Bestand zählt als 0, nie undefined++ -> NaN)
        if (currentJob.type === 'ship') {
          const t = currentJob.target as keyof Ships;
          planet.ships[t] = (planet.ships[t] || 0) + 1;
        } else {
          const t = currentJob.target as keyof Defense;
          planet.defense[t] = (planet.defense[t] || 0) + 1;
        }

        currentJob.count--;

        if (currentJob.count > 0) {
          // Restart timer for next item in the same job
          currentJob.durationRemainingInCurrent = currentJob.durationPerItem;
        } else {
          // Job complete! Remove from queue, and initialize next job if exists
          planet.activeShipyardQueue.shift();
          if (planet.activeShipyardQueue.length > 0) {
            planet.activeShipyardQueue[0].durationRemainingInCurrent = planet.activeShipyardQueue[0].durationPerItem;
          }
        }
      } else {
        // Current item does not finish. Just subtract time
        currentJob.durationRemainingInCurrent -= yardSeconds;
        yardSeconds = 0;
      }
    }
  }

  // 3. SIMULATE PLAYER RESEARCH QUEUES
  for (const player of players) {
    let researchSeconds = deltaSeconds;
    while (player.activeResearchQueue && player.activeResearchQueue.length > 0 && researchSeconds > 0) {
      const job = player.activeResearchQueue[0];
      if (researchSeconds >= job.durationRemaining) {
        researchSeconds -= job.durationRemaining;
        player.research[job.target]++;
        player.activeResearchQueue.shift();
      } else {
        job.durationRemaining -= researchSeconds;
        researchSeconds = 0;
      }
    }
    // Keep activeResearchJob in sync for legacy compatibility
    player.activeResearchJob = player.activeResearchQueue && player.activeResearchQueue.length > 0 ? player.activeResearchQueue[0] : null;
  }

  // 3b. MONDE: dynamische Feldzahl, Ressourcen-Pool (Mondkanone) und Materieumwandler-Produktion
  for (const moon of planets) {
    if (!moon.isMoon || !moon.ownerId) continue;
    const owner = playerMap.get(moon.ownerId);
    const parent = moon.parentPlanetId ? planetMap.get(moon.parentPlanetId) : null;

    // Baufelder des Mondes hängen von Mondbasis + Mondexpedition-Forschung ab (dynamisch)
    moon.maxFields = getMoonMaxFields(moon.buildings.mondbasis || 0, owner?.research.moonExpedition || 0);

    // Bei aktiver Mondkanone teilen Mond + Planet einen Ressourcen-Pool auf dem Planeten
    const poolActive = !!parent && (parent.buildings.moonCannon || 0) >= 1;
    const holder = poolActive && parent ? parent : moon;

    // Mondkanone gebaut → bereits auf dem Mond liegende Ressourcen zum Planeten transferieren
    if (poolActive && parent && (moon.resources.metal > 0 || moon.resources.crystal > 0 || moon.resources.deuterium > 0)) {
      parent.resources.metal += moon.resources.metal;
      parent.resources.crystal += moon.resources.crystal;
      parent.resources.deuterium += moon.resources.deuterium;
      moon.resources = { metal: 0, crystal: 0, deuterium: 0 };
    }

    // Halter-Bestand vor Umwandler-Produktion: dient als weiche Obergrenze (analog zu den Planetenminen).
    const holderStart = { metal: holder.resources.metal, crystal: holder.resources.crystal, deuterium: holder.resources.deuterium };

    // Materieumwandler: wandelt Metall des Halters in Kristall/Deuterium um.
    // Der Energieverbrauch fließt in die Energiebilanz des Elternplaneten ein: der resultierende
    // gemeinsame ratio drosselt sowohl die Planetenminen (in Schritt 1) als auch diesen Durchsatz.
    const convLevel = moon.buildings.matterConverter || 0;
    const convActive = moon.converterActive !== false;
    if (convLevel > 0 && convActive && parent) {
      const sats = parent.ships.solarSatellite || 0;
      const energyTech = owner?.research.energy || 0;
      const convConsumption = getMatterConverterEnergyConsumption(convLevel, speedMult);
      const { ratio: convRatio } = getEnergyStatus(
        parent.buildings, sats, parent.temperatureMax, energyTech, parent.fusionActive !== false, speedMult, convConsumption
      );

      const metalPerHour = getMatterConverterMetalInput(convLevel) * convRatio * speedMult;
      let metalToProcess = (metalPerHour / 3600) * deltaSeconds;
      metalToProcess = Math.min(metalToProcess, Math.max(0, holder.resources.metal));
      if (metalToProcess > 0) {
        const out = getMatterConverterOutput(
          convLevel, owner?.research.laserTech || 0, owner?.research.espionage || 0, metalToProcess
        );
        holder.resources.metal -= metalToProcess;
        holder.resources.crystal += out.crystal;
        holder.resources.deuterium += out.deuterium;
      }
    }

    // Weicher Lager-Cap für den Halter (bei Pool der Planet, sonst der Mond): Obergrenze = max(Lager,
    // Bestand vor Umwandler). Umwandler-Produktion stoppt bei vollem Lager, Überfüllung bleibt erhalten.
    const holderCaps = getPlanetStorageCapacities(holder.buildings);
    const hSoftM = Math.max(holderCaps.metal, holderStart.metal);
    const hSoftC = Math.max(holderCaps.crystal, holderStart.crystal);
    const hSoftD = Math.max(holderCaps.deuterium, holderStart.deuterium);
    holder.resources.metal = Math.min(hSoftM, Math.max(0, parseFloat(holder.resources.metal.toFixed(1))));
    holder.resources.crystal = Math.min(hSoftC, Math.max(0, parseFloat(holder.resources.crystal.toFixed(1))));
    holder.resources.deuterium = Math.min(hSoftD, Math.max(0, parseFloat(holder.resources.deuterium.toFixed(1))));
  }

  // 4. SIMULATE FLEETS IN FLIGHT & RE-CALCULATE ARRIVALS
  const activeFleets: Fleet[] = [];
  const combatLog = [...state.combatLog];

  // Debug-Log-Ziel für KI-vs-KI-Kämpfe & KI-Spionage (nur im Debug-Modus; hält Spielerberichte sauber).
  const debugLog: DebugLogEntry[] | undefined = state.debugMode ? [...(state.debugLog ?? [])] : state.debugLog;
  let dbgSeq = 0;
  const pushFleetDebugLog = (playerId: string, playerName: string, category: DebugLogEntry['category'], message: string) => {
    if (!state.debugMode || !debugLog) return;
    debugLog.push({ id: `dbg_a_${Date.now()}_${dbgSeq++}_${Math.random().toString(36).slice(2)}`, timestamp: Date.now(), playerId, playerName, category, message });
    if (debugLog.length > DEBUG_LOG_CAP) debugLog.splice(0, debugLog.length - DEBUG_LOG_CAP);
  };

  for (const fleet of state.fleets) {
    let fleetClone = { ...fleet, ships: { ...fleet.ships }, resources: { ...fleet.resources } };

    if (!fleetClone.isReturning) {
      if (currentTimestamp >= fleetClone.arrivalTime) {
        // Fleet arrived at target!
        const targetPlanet = planetMap.get(fleetClone.targetPlanetId);
        const originPlanet = planetMap.get(fleetClone.originPlanetId);
        const fleetOwner = playerMap.get(fleetClone.ownerId)!;

        if (targetPlanet) {
          if (fleetClone.mission === 'transport') {
            // Deliver resources
            targetPlanet.resources.metal += fleetClone.resources.metal;
            targetPlanet.resources.crystal += fleetClone.resources.crystal;
            targetPlanet.resources.deuterium += fleetClone.resources.deuterium;

            // Log event if player is involved
            if (fleetClone.ownerId === 'player' || targetPlanet.ownerId === 'player') {
              // Add a simple log (could be shown in messages)
            }

            // Return to origin
            fleetClone.resources = { metal: 0, crystal: 0, deuterium: 0 };
            fleetClone.isReturning = true;
            // Flight duration back
            const duration = Math.round((fleetClone.arrivalTime - fleetClone.departureTime) / 1000);
            fleetClone.departureTime = fleetClone.arrivalTime;
            fleetClone.returnTime = fleetClone.arrivalTime + duration * 1000;
            activeFleets.push(fleetClone);
          } else if (fleetClone.mission === 'colonize') {
            // Colonize planet
            if (targetPlanet.ownerId === null) {
              // Check Astrophysics requirements for colonization:
              // Max colonies = astrophysics level. Let's count current colonies of the player
              // Monde zählen NICHT zum Planetenlimit
              const playerColonies = planets.filter(p => p.ownerId === fleetClone.ownerId && !p.isMoon).length;
              const astrophysicsLvl = fleetOwner.research.astrophysics;
              const maxColonies = 1 + Math.floor(astrophysicsLvl / 2); // OGame formula approximation

              if (playerColonies < maxColonies) {
                targetPlanet.ownerId = fleetClone.ownerId;
                targetPlanet.name = fleetClone.ownerId === 'player' ? 'Kolonie' : `Kolonie (${fleetOwner.name})`;
                targetPlanet.resources = { metal: 500, crystal: 300, deuterium: 0 };
                targetPlanet.fieldsUsed = 1;
                targetPlanet.buildings = {
                  metalMine: 1,
                  crystalMine: 1,
                  deuteriumSynthesizer: 0,
                  solarPowerPlant: 1,
                  fusionPowerPlant: 0,
                  roboticsFactory: 0,
                  naniteFactory: 0,
                  shipyard: 0,
                  researchLab: 0,
                  terraformer: 0,
                  missileSilo: 0,
                  metalStorage: 0,
                  crystalStorage: 0,
                  deuteriumStorage: 0,
                  moonCannon: 0,
                  mondbasis: 0,
                  matterConverter: 0,
                  jumpGate: 0,
                };
                // Kleine Grundverteidigung, damit die junge Kolonie nicht völlig wehrlos ist,
                // bis sie eine eigene Werft (shipyard ≥ 1) und darüber Verteidigung/Schiffe aufbaut.
                targetPlanet.defense = { ...targetPlanet.defense, rocketLauncher: (targetPlanet.defense.rocketLauncher || 0) + 8 };

                // Consume colony ship
                fleetClone.ships.colonyShip--;

                // If other ships exist in the fleet, return them
                const totalReturningShips = Object.values(fleetClone.ships).reduce((a, b) => a + b, 0);
                if (totalReturningShips > 0) {
                  fleetClone.isReturning = true;
                  const duration = Math.round((fleetClone.arrivalTime - fleetClone.departureTime) / 1000);
                  fleetClone.departureTime = fleetClone.arrivalTime;
                  fleetClone.returnTime = fleetClone.arrivalTime + duration * 1000;
                  activeFleets.push(fleetClone);
                }
              } else {
                // Return fleet - no colonization slots available
                fleetClone.isReturning = true;
                const duration = Math.round((fleetClone.arrivalTime - fleetClone.departureTime) / 1000);
                fleetClone.departureTime = fleetClone.arrivalTime;
                fleetClone.returnTime = fleetClone.arrivalTime + duration * 1000;
                activeFleets.push(fleetClone);
              }
            } else {
              // Target is occupied! Fleet returns
              fleetClone.isReturning = true;
              const duration = Math.round((fleetClone.arrivalTime - fleetClone.departureTime) / 1000);
              fleetClone.departureTime = fleetClone.arrivalTime;
              fleetClone.returnTime = fleetClone.arrivalTime + duration * 1000;
              activeFleets.push(fleetClone);
            }
          } else if (fleetClone.mission === 'spy') {
            // Espionage
            const targetOwner = playerMap.get(targetPlanet.ownerId || '');
            let report = `Spionagebericht für Planet ${targetPlanet.system}:${targetPlanet.slot}:\n`;
            if (targetPlanet.ownerId) {
              report += `Besitzer: ${targetOwner?.name || 'Unbekannt'}\n`;
              report += `Ressourcen - Metall: ${Math.floor(targetPlanet.resources.metal).toLocaleString()}, Kristall: ${Math.floor(targetPlanet.resources.crystal).toLocaleString()}, Deuterium: ${Math.floor(targetPlanet.resources.deuterium).toLocaleString()}\n`;
              
              // Depending on espionage technology difference, show more details
              const spyDiff = fleetOwner.research.espionage - (targetOwner?.research.espionage || 0);
              if (spyDiff >= 0) {
                report += `Gebäude - Metallmine: Lvl ${targetPlanet.buildings.metalMine}, Kristallmine: Lvl ${targetPlanet.buildings.crystalMine}, Deuteriumsynthetisierer: Lvl ${targetPlanet.buildings.deuteriumSynthesizer}, Solarkraftwerk: Lvl ${targetPlanet.buildings.solarPowerPlant}, Fusionskraftwerk: Lvl ${targetPlanet.buildings.fusionPowerPlant}, Metallspeicher: Lvl ${targetPlanet.buildings.metalStorage}, Kristallspeicher: Lvl ${targetPlanet.buildings.crystalStorage}, Deuteriumtank: Lvl ${targetPlanet.buildings.deuteriumStorage}\n`;
              }
              if (spyDiff >= 2) {
                report += `Flotte - Kleiner Transporter: ${targetPlanet.ships.smallCargo}, Großer Transporter: ${targetPlanet.ships.largeCargo}, Leichter Jäger: ${targetPlanet.ships.lightFighter}, Schwerer Jäger: ${targetPlanet.ships.heavyFighter}, Kreuzer: ${targetPlanet.ships.cruiser}, Schlachtschiff: ${targetPlanet.ships.battleship}, Kolonieschiff: ${targetPlanet.ships.colonyShip}, Recycler: ${targetPlanet.ships.recycler}, Spionagesonde: ${targetPlanet.ships.espionageProbe}, Bomber: ${targetPlanet.ships.bomber}, Zerstörer: ${targetPlanet.ships.destroyer}, Todesstern: ${targetPlanet.ships.deathStar}, Solarsatellit: ${targetPlanet.ships.solarSatellite}\n`;
              }
              if (spyDiff >= 4) {
                report += `Verteidigung - Raketenwerfer: ${targetPlanet.defense.rocketLauncher}, Leichtes Lasergeschütz: ${targetPlanet.defense.lightLaser}, Schweres Lasergeschütz: ${targetPlanet.defense.heavyLaser}, Gaußkanone: ${targetPlanet.defense.gaussCannon}, Ionengeschütz: ${targetPlanet.defense.ionCannon}, Plasmawerfer: ${targetPlanet.defense.plasmaTurret}, Kleine Schildkuppel: ${targetPlanet.defense.smallShieldDome}, Große Schildkuppel: ${targetPlanet.defense.largeShieldDome}\n`;
              }
            } else {
              report += `Unbewohnt.\n`;
            }

            // Create combat log for spying
            const logId = `spy_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const log: CombatLog = {
              id: logId,
              timestamp: currentTimestamp,
              system: targetPlanet.system,
              slot: targetPlanet.slot,
              attackerName: fleetOwner.name,
              defenderName: targetOwner?.name || 'Unbewohnt',
              mission: 'spy',
              rounds: [],
              winner: 'attacker',
              loot: { metal: 0, crystal: 0, deuterium: 0 },
              attackerLosses: { metal: 0, crystal: 0, deuterium: 0 },
              defenderLosses: { metal: 0, crystal: 0, deuterium: 0 },
              planetDestroyed: false,
              deathStarsLost: 0,
              espionageReport: report,
            };
            // Ein Spionagebericht nützt dem Späher: nur wenn der SPIELER spioniert, kommt er in die
            // Gefechtsberichte. KI-Spionage (auch gegen den Spieler) läuft in die Debug-Konsole.
            if (fleetClone.ownerId === 'player') {
              combatLog.push(log);
            } else {
              pushFleetDebugLog(fleetClone.ownerId, fleetOwner.name, 'fleet', `spioniert ${targetPlanet.system}:${targetPlanet.slot} (${targetOwner?.name || 'Unbewohnt'}) aus`);
            }

            // In Orionkriege, let's keep spying simple and just generate a text entry or let probe return.
            // Spionage probe always returns immediately or is consumed. Let's make it return.
            fleetClone.isReturning = true;
            const duration = Math.round((fleetClone.arrivalTime - fleetClone.departureTime) / 1000);
            fleetClone.departureTime = fleetClone.arrivalTime;
            fleetClone.returnTime = fleetClone.arrivalTime + duration * 1000;
            activeFleets.push(fleetClone);
          } else if (fleetClone.mission === 'recycle') {
            // Trümmerfeld bergen: nur Recycler tragen Trümmer ab; geladen wird min(Kapazität, Feld).
            const recyclerCargo = (fleetClone.ships.recycler || 0) * getShipCargoCapacity('recycler');
            const field = targetPlanet.debris ?? { metal: 0, crystal: 0 };
            const available = field.metal + field.crystal;
            const harvested = Math.min(recyclerCargo, available);
            let takeMetal = 0, takeCrystal = 0;
            if (harvested > 0 && available > 0) {
              // Proportional zum Feldbestand aufteilen.
              takeMetal = Math.floor(harvested * (field.metal / available));
              takeCrystal = Math.min(field.crystal, harvested - takeMetal);
              targetPlanet.debris = { metal: field.metal - takeMetal, crystal: field.crystal - takeCrystal };
            }
            fleetClone.resources = { metal: takeMetal, crystal: takeCrystal, deuterium: 0 };

            if (fleetClone.ownerId === 'player') {
              // Kurzer Ereignishinweis im Bericht.
              pushMoonAttemptLog(combatLog, targetPlanet, fleetOwner.name, `Recycling bei ${targetPlanet.system}:${targetPlanet.slot}: ${takeMetal.toLocaleString()} Metall und ${takeCrystal.toLocaleString()} Kristall geborgen.`, currentTimestamp);
            } else {
              pushFleetDebugLog(fleetClone.ownerId, fleetOwner.name, 'fleet', `recycelt ${targetPlanet.system}:${targetPlanet.slot} (${(takeMetal + takeCrystal).toLocaleString()} Trümmer geborgen)`);
            }

            // Zurück zum Ursprung – der Rückkehr-Pfad bucht die Ressourcen dort ein.
            fleetClone.isReturning = true;
            const duration = Math.round((fleetClone.arrivalTime - fleetClone.departureTime) / 1000);
            fleetClone.departureTime = fleetClone.arrivalTime;
            fleetClone.returnTime = fleetClone.arrivalTime + duration * 1000;
            activeFleets.push(fleetClone);
          } else if (fleetClone.mission === 'station') {
            // Stationieren: Schiffe (und ggf. mitgeführte Fracht) bleiben DAUERHAFT auf dem Zielplaneten;
            // kein Rückflug. Nur auf einem eigenen Planeten sinnvoll – sonst kehrt die Flotte samt Ladung zurück.
            if (targetPlanet.ownerId === fleetClone.ownerId) {
              for (const [shipType, count] of Object.entries(fleetClone.ships)) {
                targetPlanet.ships[shipType as keyof Ships] = (targetPlanet.ships[shipType as keyof Ships] || 0) + count;
              }
              targetPlanet.resources.metal += fleetClone.resources.metal;
              targetPlanet.resources.crystal += fleetClone.resources.crystal;
              targetPlanet.resources.deuterium += fleetClone.resources.deuterium;
              if (fleetClone.ownerId === 'player') {
                pushMoonAttemptLog(combatLog, targetPlanet, fleetOwner.name, `Flotte bei ${targetPlanet.system}:${targetPlanet.slot} stationiert.`, currentTimestamp);
              }
              // KEIN activeFleets.push → Flotte verschwindet dauerhaft (bleibt als Bestand auf dem Zielplaneten).
            } else {
              // Zielplanet gehört (nicht mehr) dem Flottenbesitzer → Rückflug mit Ladung.
              fleetClone.isReturning = true;
              const duration = Math.round((fleetClone.arrivalTime - fleetClone.departureTime) / 1000);
              fleetClone.departureTime = fleetClone.arrivalTime;
              fleetClone.returnTime = fleetClone.arrivalTime + duration * 1000;
              activeFleets.push(fleetClone);
            }
          } else if (fleetClone.mission === 'attack' || fleetClone.mission === 'destroy') {
            // RUN COMBAT ENGINE!
            const defenderOwnerName = targetPlanet.ownerId ? (playerMap.get(targetPlanet.ownerId)?.name || 'KI') : 'Unbewohnt';
            const combatResult = runCombat(
              fleetClone.ships,
              targetPlanet.ships,
              targetPlanet.defense,
              fleetOwner,
              targetPlanet.ownerId ? playerMap.get(targetPlanet.ownerId) : null,
              fleetClone.mission,
              targetPlanet
            );

            // Create combat log (beteiligte Einheiten je Seite: Bestand vorher → übrig).
            // WICHTIG: Initialbestände hier erfassen, BEVOR targetPlanet.ships/defense unten überschrieben werden.
            const logId = `combat_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const log: CombatLog = {
              id: logId,
              timestamp: currentTimestamp,
              system: targetPlanet.system,
              slot: targetPlanet.slot,
              attackerName: fleetOwner.name,
              defenderName: defenderOwnerName,
              mission: fleetClone.mission,
              rounds: combatResult.rounds,
              winner: combatResult.winner,
              loot: combatResult.loot,
              attackerLosses: combatResult.attackerLosses,
              defenderLosses: combatResult.defenderLosses,
              planetDestroyed: combatResult.planetDestroyed,
              deathStarsLost: combatResult.deathStarsLost,
              attackerShipsInitial: { ...fleetClone.ships },
              attackerShipsRemaining: combatResult.attackerShipsRemaining,
              defenderShipsInitial: { ...targetPlanet.ships },
              defenderShipsRemaining: combatResult.defenderShipsRemaining,
              defenderDefenseInitial: { ...targetPlanet.defense },
              defenderDefenseRemaining: combatResult.defenderDefenseRemaining,
              debrisCreated: combatResult.debris,
            };

            // Nur spielerrelevante Kämpfe in die Gefechtsberichte; KI-gegen-KI in die Debug-Konsole.
            const playerReport = fleetClone.ownerId === 'player' || targetPlanet.ownerId === 'player';
            if (playerReport) {
              combatLog.push(log);
            } else {
              const verb = fleetClone.mission === 'destroy' ? 'will vernichten' : 'greift an';
              const winnerTxt = combatResult.winner === 'attacker' ? 'Sieg Angreifer' : combatResult.winner === 'defender' ? 'Sieg Verteidiger' : 'Unentschieden';
              pushFleetDebugLog(fleetClone.ownerId, fleetOwner.name, 'combat', `${verb} ${defenderOwnerName} (${targetPlanet.system}:${targetPlanet.slot}) → ${winnerTxt}${combatResult.planetDestroyed ? ', Planet zerstört' : ''}`);
            }

            // Update defender planet ships & defenses
            targetPlanet.ships = combatResult.defenderShipsRemaining;
            targetPlanet.defense = combatResult.defenderDefenseRemaining;

            // Deduct loot from defender resources
            targetPlanet.resources.metal = Math.max(0, targetPlanet.resources.metal - combatResult.loot.metal);
            targetPlanet.resources.crystal = Math.max(0, targetPlanet.resources.crystal - combatResult.loot.crystal);
            targetPlanet.resources.deuterium = Math.max(0, targetPlanet.resources.deuterium - combatResult.loot.deuterium);

            // Handle Planet Destruction
            if (combatResult.planetDestroyed) {
              // Destroy planet!
              targetPlanet.ownerId = null;
              targetPlanet.name = `Trümmerfeld ${targetPlanet.system}:${targetPlanet.slot}`;
              targetPlanet.buildings = {
                metalMine: 0,
                crystalMine: 0,
                deuteriumSynthesizer: 0,
                solarPowerPlant: 0,
                fusionPowerPlant: 0,
                roboticsFactory: 0,
                naniteFactory: 0,
                shipyard: 0,
                researchLab: 0,
                terraformer: 0,
                missileSilo: 0,
                metalStorage: 0,
                crystalStorage: 0,
                deuteriumStorage: 0,
                moonCannon: 0,
                mondbasis: 0,
                matterConverter: 0,
                jumpGate: 0,
              };
              targetPlanet.ships = { smallCargo: 0, largeCargo: 0, lightFighter: 0, heavyFighter: 0, cruiser: 0, battleship: 0, battlecruiser: 0, colonyShip: 0, recycler: 0, espionageProbe: 0, bomber: 0, destroyer: 0, deathStar: 0, solarSatellite: 0 };
              targetPlanet.defense = { rocketLauncher: 0, lightLaser: 0, heavyLaser: 0, gaussCannon: 0, ionCannon: 0, plasmaTurret: 0, smallShieldDome: 0, largeShieldDome: 0 };
              targetPlanet.resources = { metal: 50000, crystal: 35000, deuterium: 10000 }; // Convert into rich debris field/resources
              targetPlanet.fieldsUsed = 0;
            }

            // Trümmerfeld im Orbit anlegen/erhöhen (eigenes Feld → überlebt auch die Planetenzerstörung).
            if (combatResult.debris.metal > 0 || combatResult.debris.crystal > 0) {
              targetPlanet.debris = {
                metal: (targetPlanet.debris?.metal ?? 0) + combatResult.debris.metal,
                crystal: (targetPlanet.debris?.crystal ?? 0) + combatResult.debris.crystal,
              };
            }

            // Mond aus Kampf: debris-abhängige Chance (1% je 100k Trümmer, max 20%), nur wenn der Planet
            // intakt und noch mondlos ist. Ergänzt die Mondkanone, ersetzt sie nicht.
            if (!combatResult.planetDestroyed && !targetPlanet.isMoon && !targetPlanet.moonId && targetPlanet.ownerId !== null) {
              const debrisTotal = combatResult.debris.metal + combatResult.debris.crystal;
              const moonChance = Math.min(0.20, debrisTotal / 100000);
              if (moonChance > 0 && Math.random() < moonChance) {
                const defenderResearch = playerMap.get(targetPlanet.ownerId)?.research;
                const moon = createMoon(targetPlanet, defenderResearch?.moonExpedition || 0, currentTimestamp);
                targetPlanet.moonId = moon.id;
                planets.push(moon);
                if (targetPlanet.ownerId === 'player' || fleetClone.ownerId === 'player') {
                  pushMoonAttemptLog(combatLog, targetPlanet, defenderOwnerName, `Nach dem Kampf bei ${targetPlanet.name} hat sich ein Mond (Ø ${moon.diameter.toLocaleString()} km) gebildet.`, currentTimestamp);
                } else {
                  pushFleetDebugLog(targetPlanet.ownerId, playerMap.get(targetPlanet.ownerId)?.name || 'KI', 'info', `${targetPlanet.name}: Mond aus Kampf entstanden (Ø ${moon.diameter} km)`);
                }
              }
            }

            // Return fleet with survivors and loot
            fleetClone.ships = combatResult.attackerShipsRemaining;
            fleetClone.resources = combatResult.loot;

            const totalAttackerShipsRemaining = Object.values(fleetClone.ships).reduce((a, b) => a + b, 0);
            if (totalAttackerShipsRemaining > 0 && !combatResult.planetDestroyed) {
              fleetClone.isReturning = true;
              const duration = Math.round((fleetClone.arrivalTime - fleetClone.departureTime) / 1000);
              fleetClone.departureTime = fleetClone.arrivalTime;
              fleetClone.returnTime = fleetClone.arrivalTime + duration * 1000;
              activeFleets.push(fleetClone);
            }
          }
        } else {
          // Target planet deleted/corrupt? Fleet returns.
          fleetClone.isReturning = true;
          const duration = Math.round((fleetClone.arrivalTime - fleetClone.departureTime) / 1000);
          fleetClone.departureTime = fleetClone.arrivalTime;
          fleetClone.returnTime = fleetClone.arrivalTime + duration * 1000;
          activeFleets.push(fleetClone);
        }
      } else {
        // Still flying to target
        activeFleets.push(fleetClone);
      }
    } else {
      // Returning to origin
      if (currentTimestamp >= fleetClone.returnTime) {
        // Arrived back at origin!
        const originPlanet = planetMap.get(fleetClone.originPlanetId);
        if (originPlanet) {
          // Add ships back
          for (const [shipType, count] of Object.entries(fleetClone.ships)) {
            originPlanet.ships[shipType as keyof Ships] = (originPlanet.ships[shipType as keyof Ships] || 0) + count;
          }
          // Add loot back
          originPlanet.resources.metal += fleetClone.resources.metal;
          originPlanet.resources.crystal += fleetClone.resources.crystal;
          originPlanet.resources.deuterium += fleetClone.resources.deuterium;
        }
        // Fleet is deleted, so do not push to activeFleets
      } else {
        // Still returning
        activeFleets.push(fleetClone);
      }
    }
  }

  // 5. CALCULATE SCORES / POINTS FOR EACH PLAYER
  for (const player of players) {
    let buildingsPt = 0;
    let researchPt = 0;
    let fleetPt = 0;
    let defensePt = 0;

    // Sum from planets
    const playerPlanets = planets.filter(p => p.ownerId === player.id);
    playerPlanets.forEach(p => {
      // Buildings points (1 point per 1000 resources spent)
      for (const [bType, level] of Object.entries(p.buildings)) {
        for (let l = 1; l <= level; l++) {
          const cost = getBuildingUpgradeCost(bType as keyof Buildings, l - 1);
          buildingsPt += (cost.metal + cost.crystal + cost.deuterium) / 1000;
        }
      }
      // Fleet points (1 point per 1000 resources) – defensiv gegen fehlende Cost/NaN-Bestände.
      for (const [sType, count] of Object.entries(p.ships)) {
        const cost = SHIP_COSTS[sType as keyof Ships];
        if (cost) fleetPt += ((count || 0) * (cost.metal + cost.crystal + cost.deuterium)) / 1000;
      }
      // Defense points (1 point per 1000 resources)
      for (const [dType, count] of Object.entries(p.defense)) {
        const cost = DEFENSE_COSTS[dType as keyof Defense];
        if (cost) defensePt += ((count || 0) * (cost.metal + cost.crystal + cost.deuterium)) / 1000;
      }
    });

    // Add active fleets owned by player to fleet points
    const playerFleets = activeFleets.filter(f => f.ownerId === player.id);
    playerFleets.forEach(f => {
      for (const [sType, count] of Object.entries(f.ships)) {
        const cost = SHIP_COSTS[sType as keyof Ships];
        if (cost) fleetPt += ((count || 0) * (cost.metal + cost.crystal + cost.deuterium)) / 1000;
      }
    });

    // Research points
    for (const [rType, level] of Object.entries(player.research)) {
      for (let l = 1; l <= level; l++) {
        const cost = getResearchUpgradeCost(rType as keyof Research, l - 1);
        researchPt += (cost.metal + cost.crystal + cost.deuterium) / 1000;
      }
    }

    player.points = {
      buildings: Math.round(buildingsPt),
      research: Math.round(researchPt),
      fleet: Math.round(fleetPt),
      defense: Math.round(defensePt),
      total: Math.round(buildingsPt + researchPt + fleetPt + defensePt),
    };
  }

  return {
    ...state,
    lastTickTimestamp: currentTimestamp,
    players,
    planets,
    fleets: activeFleets,
    // Gefechtsberichte auf die letzten COMBAT_LOG_CAP begrenzen, damit sie nicht unbegrenzt wachsen.
    combatLog: combatLog.length > COMBAT_LOG_CAP ? combatLog.slice(-COMBAT_LOG_CAP) : combatLog,
    debugLog,
  };
}

// --- COMBAT SIMULATION ENGINE ---

interface SimulatedUnit {
  type: string;
  name: string;
  maxArmor: number;
  armor: number;
  maxShield: number;
  shield: number;
  attack: number;
  isDefense: boolean;
}

export function runCombat(
  attackerShips: Ships,
  defenderShips: Ships,
  defenderDefense: Defense,
  attackerOwner: Player,
  defenderOwner: Player | null,
  mission: MissionType,
  targetPlanet: Planet
): {
  rounds: any[];
  winner: 'attacker' | 'defender' | 'draw';
  loot: Resources;
  attackerLosses: Resources;
  defenderLosses: Resources;
  attackerShipsRemaining: Ships;
  defenderShipsRemaining: Ships;
  defenderDefenseRemaining: Defense;
  planetDestroyed: boolean;
  deathStarsLost: number;
  debris: { metal: number; crystal: number; deuterium: number };
} {
  // Convert attacker fleets & defender fleets/defenses to Unit lists
  const attackerUnits: SimulatedUnit[] = [];
  const defenderUnits: SimulatedUnit[] = [];

  const attTech = attackerOwner.research;
  const defTech = defenderOwner ? defenderOwner.research : { weapons: 0, shielding: 0, armour: 0 };

  // Helper to compile attacker units
  for (const [shipType, count] of Object.entries(attackerShips)) {
    const stats = SHIP_STATS[shipType as keyof Ships];
    const cost = SHIP_COSTS[shipType as keyof Ships];
    const name = SHIP_NAMES[shipType as keyof Ships];

    for (let i = 0; i < count; i++) {
      // Tech modifiers: Armour (+10% base per level), Shielding (+10% base per level), Weapons (+10% base per level)
      const baseArmor = cost.metal + cost.crystal;
      const modifiedArmor = Math.floor((baseArmor / 10) * (1 + attTech.armour * 0.1));
      const modifiedShield = Math.floor(stats.shield * (1 + attTech.shielding * 0.1));
      const modifiedAttack = Math.floor(stats.attack * (1 + attTech.weapons * 0.1));

      attackerUnits.push({
        type: shipType,
        name,
        maxArmor: modifiedArmor,
        armor: modifiedArmor,
        maxShield: modifiedShield,
        shield: modifiedShield,
        attack: modifiedAttack,
        isDefense: false,
      });
    }
  }

  // Helper to compile defender ships
  for (const [shipType, count] of Object.entries(defenderShips)) {
    const stats = SHIP_STATS[shipType as keyof Ships];
    const cost = SHIP_COSTS[shipType as keyof Ships];
    const name = SHIP_NAMES[shipType as keyof Ships];

    for (let i = 0; i < count; i++) {
      const baseArmor = cost.metal + cost.crystal;
      const modifiedArmor = Math.floor((baseArmor / 10) * (1 + defTech.armour * 0.1));
      const modifiedShield = Math.floor(stats.shield * (1 + defTech.shielding * 0.1));
      const modifiedAttack = Math.floor(stats.attack * (1 + defTech.weapons * 0.1));

      defenderUnits.push({
        type: shipType,
        name,
        maxArmor: modifiedArmor,
        armor: modifiedArmor,
        maxShield: modifiedShield,
        shield: modifiedShield,
        attack: modifiedAttack,
        isDefense: false,
      });
    }
  }

  // Helper to compile defender defenses
  for (const [defType, count] of Object.entries(defenderDefense)) {
    const stats = DEFENSE_STATS[defType as keyof Defense];
    const cost = DEFENSE_COSTS[defType as keyof Defense];
    const name = DEFENSE_NAMES[defType as keyof Defense];

    for (let i = 0; i < count; i++) {
      const baseArmor = cost.metal + cost.crystal;
      const modifiedArmor = Math.floor((baseArmor / 10) * (1 + defTech.armour * 0.1));
      const modifiedShield = Math.floor(stats.shield * (1 + defTech.shielding * 0.1));
      const modifiedAttack = Math.floor(stats.attack * (1 + defTech.weapons * 0.1));

      defenderUnits.push({
        type: defType,
        name,
        maxArmor: modifiedArmor,
        armor: modifiedArmor,
        maxShield: modifiedShield,
        shield: modifiedShield,
        attack: modifiedAttack,
        isDefense: true,
      });
    }
  }

  const rounds: any[] = [];
  let combatWinner: 'attacker' | 'defender' | 'draw' = 'draw';

  // OGame runs up to 6 rounds
  for (let round = 1; round <= 6; round++) {
    if (attackerUnits.length === 0 || defenderUnits.length === 0) break;

    // Track total damage in round
    let attackerDamage = 0;
    let defenderDamage = 0;

    // Attacker ships shoot at random defender units (mit Rapidfire-Mehrfachschüssen)
    for (const att of attackerUnits) {
      if (defenderUnits.length === 0) break;
      let fireAgain = true;
      while (fireAgain) {
        const targetIndex = Math.floor(Math.random() * defenderUnits.length);
        const def = defenderUnits[targetIndex];

        const damage = att.attack;
        attackerDamage += damage;

        // Shield absorb
        if (def.shield > 0) {
          // If shot is too weak (< 1% of max shield), it bounces off
          if (damage < def.maxShield * 0.01) {
            // bounces
          } else if (damage >= def.shield) {
            const excess = damage - def.shield;
            def.shield = 0;
            def.armor -= excess;
          } else {
            def.shield -= damage;
          }
        } else {
          def.armor -= damage;
        }

        // Rapidfire: Chance (rf-1)/rf auf einen weiteren Schuss dieser Einheit
        const rf = getRapidFire(att.type as UnitKey, def.type as UnitKey);
        fireAgain = rf > 1 && Math.random() < (rf - 1) / rf;
        if (defenderUnits.length === 0) break;
      }
    }

    // Defender ships/defense shoot at random attacker units (mit Rapidfire-Mehrfachschüssen)
    for (const def of defenderUnits) {
      if (attackerUnits.length === 0) break;
      let fireAgain = true;
      while (fireAgain) {
        const targetIndex = Math.floor(Math.random() * attackerUnits.length);
        const att = attackerUnits[targetIndex];

        const damage = def.attack;
        defenderDamage += damage;

        // Shield absorb
        if (att.shield > 0) {
          if (damage < att.maxShield * 0.01) {
            // bounces
          } else if (damage >= att.shield) {
            const excess = damage - att.shield;
            att.shield = 0;
            att.armor -= excess;
          } else {
            att.shield -= damage;
          }
        } else {
          att.armor -= damage;
        }

        // Rapidfire: Verteidigungsanlagen haben keins (getRapidFire = 0 → genau ein Schuss)
        const rf = getRapidFire(def.type as UnitKey, att.type as UnitKey);
        fireAgain = rf > 1 && Math.random() < (rf - 1) / rf;
        if (attackerUnits.length === 0) break;
      }
    }

    // Record state of ships before weeding out dead ones
    const roundAttackerBefore = countTypes(attackerUnits);
    const roundDefenderBefore = countTypes(defenderUnits);

    // Apply explosions and casualties
    // We check if remaining armor is <= 0 (dead), or below 70% max armor (chance to explode)
    const survivorsAtt: SimulatedUnit[] = [];
    for (const att of attackerUnits) {
      if (att.armor <= 0) continue;
      const armorRatio = att.armor / att.maxArmor;
      if (armorRatio < 0.7) {
        // OGame explosion roll
        const explodeChance = 1 - armorRatio;
        if (Math.random() < explodeChance) {
          // Explodes!
          continue;
        }
      }
      // Re-charge shield for next round
      att.shield = att.maxShield;
      survivorsAtt.push(att);
    }

    const survivorsDef: SimulatedUnit[] = [];
    for (const def of defenderUnits) {
      if (def.armor <= 0) continue;
      const armorRatio = def.armor / def.maxArmor;
      if (armorRatio < 0.7) {
        const explodeChance = 1 - armorRatio;
        if (Math.random() < explodeChance) {
          continue;
        }
      }
      def.shield = def.maxShield;
      survivorsDef.push(def);
    }

    // Replace lists with survivors
    attackerUnits.length = 0;
    attackerUnits.push(...survivorsAtt);

    defenderUnits.length = 0;
    defenderUnits.push(...survivorsDef);

    rounds.push({
      round,
      attackerDamage,
      defenderDamage,
      attackerShipsRemaining: countShips(attackerUnits),
      defenderShipsRemaining: countShips(defenderUnits),
      defenderDefenseRemaining: countDefense(defenderUnits),
    });
  }

  // Determine winner
  if (attackerUnits.length > 0 && defenderUnits.length === 0) {
    combatWinner = 'attacker';
  } else if (defenderUnits.length > 0 && attackerUnits.length === 0) {
    combatWinner = 'defender';
  } else {
    combatWinner = 'draw';
  }

  // Calculate losses in resources
  const attackerLosses = calculateResourcesFromUnits(
    Object.keys(SHIP_COSTS).reduce((acc, key) => {
      const spent = (attackerShips[key as keyof Ships] || 0) - (countShips(attackerUnits)[key as keyof Ships] || 0);
      if (spent > 0) acc[key as keyof Ships] = spent;
      return acc;
    }, {} as Partial<Ships>),
    {}
  );

  const defenderLosses = calculateResourcesFromUnits(
    Object.keys(SHIP_COSTS).reduce((acc, key) => {
      const spent = (defenderShips[key as keyof Ships] || 0) - (countShips(defenderUnits)[key as keyof Ships] || 0);
      if (spent > 0) acc[key as keyof Ships] = spent;
      return acc;
    }, {} as Partial<Ships>),
    Object.keys(DEFENSE_COSTS).reduce((acc, key) => {
      const spent = (defenderDefense[key as keyof Defense] || 0) - (countDefense(defenderUnits)[key as keyof Defense] || 0);
      if (spent > 0) acc[key as keyof Defense] = spent;
      return acc;
    }, {} as Partial<Defense>)
  );

  // Trümmerfeld: 30% des Metall-/Kristallwerts ZERSTÖRTER SCHIFFE beider Seiten (Verteidigung & Deuterium
  // zählen nicht). attackerLosses ist bereits rein schiffsbasiert; für den Verteidiger nur die Schiffe.
  const DEBRIS_FACTOR = 0.3;
  const defenderShipLosses = calculateResourcesFromUnits(
    Object.keys(SHIP_COSTS).reduce((acc, key) => {
      const spent = (defenderShips[key as keyof Ships] || 0) - (countShips(defenderUnits)[key as keyof Ships] || 0);
      if (spent > 0) acc[key as keyof Ships] = spent;
      return acc;
    }, {} as Partial<Ships>),
    {}
  );
  const debris = {
    metal: Math.floor(DEBRIS_FACTOR * (attackerLosses.metal + defenderShipLosses.metal)),
    crystal: Math.floor(DEBRIS_FACTOR * (attackerLosses.crystal + defenderShipLosses.crystal)),
    deuterium: 0,
  };

  // Calculate Loot (Attacker wins => steals up to 50% of metal, crystal, deuterium, bounded by cargo capacity)
  const loot: Resources = { metal: 0, crystal: 0, deuterium: 0 };
  const attackerShipsRemaining = countShips(attackerUnits);

  if (combatWinner === 'attacker') {
    const totalCargoCap = getFleetCargoCapacity(attackerShipsRemaining);
    const metalLoot = Math.floor(targetPlanet.resources.metal * 0.5);
    const crystalLoot = Math.floor(targetPlanet.resources.crystal * 0.5);
    const deuteriumLoot = Math.floor(targetPlanet.resources.deuterium * 0.5);

    const totalDesiredLoot = metalLoot + crystalLoot + deuteriumLoot;
    if (totalDesiredLoot <= totalCargoCap) {
      loot.metal = metalLoot;
      loot.crystal = crystalLoot;
      loot.deuterium = deuteriumLoot;
    } else {
      // Allocate proportionally
      const ratio = totalCargoCap / totalDesiredLoot;
      loot.metal = Math.floor(metalLoot * ratio);
      loot.crystal = Math.floor(crystalLoot * ratio);
      loot.deuterium = Math.floor(deuteriumLoot * ratio);
    }
  }

  // Special Planet Destruction (Todesstern) Logic!
  let planetDestroyed = false;
  let deathStarsLost = 0;

  if (mission === 'destroy' && combatWinner === 'attacker') {
    const dsCount = attackerShipsRemaining.deathStar || 0;
    // Condition 1: At least 10 Deathstars in the attacking fleet
    if (dsCount >= 10) {
      // Condition 2: Defender defense & ships is reduced to 1% or less of attacker remaining fleet value
      const remainingAttVal = calculateFleetResourceValue(attackerShipsRemaining);
      const remainingDefVal = calculateFleetResourceValue(countShips(defenderUnits)) + calculateDefenseResourceValue(countDefense(defenderUnits));

      if (remainingDefVal <= remainingAttVal * 0.01) {
        // Run planet destruction trial!
        const roll = Math.random();
        if (roll < 0.20) {
          // Success (20% chance)
          planetDestroyed = true;
        } else {
          // Failure (80% chance): exactly 10 death stars are destroyed
          deathStarsLost = 10;
          attackerShipsRemaining.deathStar = Math.max(0, dsCount - 10);
        }
      }
    }
  }

  return {
    rounds,
    winner: combatWinner,
    loot,
    attackerLosses,
    defenderLosses,
    attackerShipsRemaining,
    defenderShipsRemaining: countShips(defenderUnits),
    defenderDefenseRemaining: countDefense(defenderUnits),
    planetDestroyed,
    deathStarsLost,
    debris,
  };
}

// Utility Combat Functions
function countTypes(units: SimulatedUnit[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const u of units) {
    counts[u.type] = (counts[u.type] || 0) + 1;
  }
  return counts;
}

function countShips(units: SimulatedUnit[]): Ships {
  const s: Ships = { smallCargo: 0, largeCargo: 0, lightFighter: 0, heavyFighter: 0, cruiser: 0, battleship: 0, battlecruiser: 0, colonyShip: 0, recycler: 0, espionageProbe: 0, bomber: 0, destroyer: 0, deathStar: 0, solarSatellite: 0 };
  for (const u of units) {
    if (!u.isDefense && u.type in s) {
      s[u.type as keyof Ships]++;
    }
  }
  return s;
}

function countDefense(units: SimulatedUnit[]): Defense {
  const d: Defense = { rocketLauncher: 0, lightLaser: 0, heavyLaser: 0, gaussCannon: 0, ionCannon: 0, plasmaTurret: 0, smallShieldDome: 0, largeShieldDome: 0 };
  for (const u of units) {
    if (u.isDefense && u.type in d) {
      d[u.type as keyof Defense]++;
    }
  }
  return d;
}

function calculateResourcesFromUnits(ships: Partial<Ships>, defense: Partial<Defense>): Resources {
  const res: Resources = { metal: 0, crystal: 0, deuterium: 0 };

  for (const [sType, count] of Object.entries(ships)) {
    const cost = SHIP_COSTS[sType as keyof Ships];
    if (cost && count) {
      res.metal += cost.metal * count;
      res.crystal += cost.crystal * count;
      res.deuterium += cost.deuterium * count;
    }
  }

  for (const [dType, count] of Object.entries(defense)) {
    const cost = DEFENSE_COSTS[dType as keyof Defense];
    if (cost && count) {
      res.metal += cost.metal * count;
      res.crystal += cost.crystal * count;
      res.deuterium += cost.deuterium * count;
    }
  }

  return res;
}

function calculateFleetResourceValue(ships: Ships): number {
  let total = 0;
  for (const [sType, count] of Object.entries(ships)) {
    const cost = SHIP_COSTS[sType as keyof Ships];
    total += count * (cost.metal + cost.crystal + cost.deuterium);
  }
  return total;
}

function calculateDefenseResourceValue(defense: Defense): number {
  let total = 0;
  for (const [dType, count] of Object.entries(defense)) {
    const cost = DEFENSE_COSTS[dType as keyof Defense];
    total += count * (cost.metal + cost.crystal + cost.deuterium);
  }
  return total;
}

// --- DEBUG ACTION LOG ---

const DEBUG_LOG_CAP = 400;
const COMBAT_LOG_CAP = 100; // max. gespeicherte Spieler-Gefechtsberichte (verhindert unbegrenztes Wachstum)

// Append a debug log entry (in place) to a state that carries its own debugLog array.
// No-op unless debugMode is active, so normal games never grow their savegame.
// The caller is responsible for having created a fresh debugLog array (immutability).
function pushDebugLog(
  state: GameState,
  playerId: string,
  playerName: string,
  category: DebugLogEntry['category'],
  message: string,
  seq: { n: number }
): void {
  if (!state.debugMode) return;
  if (!state.debugLog) state.debugLog = [];
  state.debugLog.push({
    id: `dbg_b_${Date.now()}_${seq.n++}_${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    playerId,
    playerName,
    category,
    message,
  });
  if (state.debugLog.length > DEBUG_LOG_CAP) {
    state.debugLog = state.debugLog.slice(-DEBUG_LOG_CAP);
  }
}

// --- AI DECISION ENGINE ---

export function runAILogic(state: GameState): GameState {
  // AI actions occur in real-time when the loop runs.
  // We evaluate each AI's assets and make simple OGame-like build decisions.
  const now = Date.now();
  const speedMult = state.speedMultiplier;

  const newState: GameState = {
    ...state,
    planets: state.planets.map(p => ({
      ...p,
      resources: { ...p.resources },
      buildings: { ...p.buildings },
      ships: { ...p.ships },
      defense: { ...p.defense },
      activeBuildJob: p.activeBuildJob ? { ...p.activeBuildJob } : null,
      activeBuildQueue: p.activeBuildQueue ? p.activeBuildQueue.map(q => ({ ...q })) : [],
      activeShipyardQueue: p.activeShipyardQueue.map(q => ({ ...q })),
      debris: p.debris ? { ...p.debris } : undefined,
    })),
    players: state.players.map(pl => ({
      ...pl,
      research: { ...pl.research },
      activeResearchJob: pl.activeResearchJob ? { ...pl.activeResearchJob } : null,
    })),
    fleets: [...state.fleets],
    debugLog: state.debugLog ? [...state.debugLog] : [],
  };

  // Sequence counter for collision-free debug log ids (Date.now() repeats within a tick).
  const seq = { n: 0 };

  const aiPlayers = newState.players.filter(p => p.isAI);

  for (const ai of aiPlayers) {
    const aiPlanets = newState.planets.filter(p => p.ownerId === ai.id);

    // Echtzeit-Aktionsdrossel: jede KI darf nur eine Aktion pro zufällig 3–10 s ausführen
    // (Bauauftrag, Werftauftrag, Forschung, Flottenstart) – unabhängig vom Speed-Multiplikator.
    // Notverteidigung bei Angriff ist ausgenommen (siehe unten).
    const canAct = now >= (ai.nextActionTime ?? 0);
    let actionTaken = false;
    const markActed = () => {
      actionTaken = true;
      ai.nextActionTime = now + 3000 + Math.random() * 7000;
    };

    for (const planet of aiPlanets) {
      // Endgame-Status dieses Körpers vorab bestimmen (steuert Bau- UND Werft-Priorität).
      // Todesstern-fähig = Werft 12 + hyperspaceDrive 7 + shielding 10 + energy 10.
      const deathStarReady = !planet.isMoon && isRequirementMet(SHIP_REQUIREMENTS.deathStar, planet.buildings, ai.research);
      // Solange die Todesstern-Flotte klein ist, wird gezielt dafür gespart: der Gebäudebau beschränkt
      // sich dann auf das Nötigste, damit die teuren Todesstern-Ressourcen nicht in Rand-Upgrades versickern.
      const savingForDeathStar = deathStarReady && (planet.ships.deathStar || 0) < 30;

      // 1. Build checking
      // Strategie: Eine nach Priorität geordnete Kandidatenliste aufbauen und die ERSTE Option
      // wählen, die (a) auf diesem Körper baubar ist (canBuildOnBody), (b) noch unter ihrem
      // Ziellevel liegt und (c) bezahlbar ist. Dadurch stallt die KI nie mehr auf einem einzelnen
      // zu teuren Ziel, sondern macht immer den höchstpriorisierten bezahlbaren Fortschritt.
      if (canAct && !actionTaken && !planet.activeBuildJob && planet.fieldsUsed < getEffectiveMaxFields(planet)) {
        const { ratio } = getEnergyStatus(
          planet.buildings,
          planet.ships.solarSatellite || 0,
          planet.temperatureMax,
          ai.research.energy || 0,
          planet.fusionActive !== false,
          newState.speedMultiplier
        );
        const caps = getPlanetStorageCapacities(planet.buildings);
        const b = planet.buildings;
        const parentP = planet.parentPlanetId ? newState.planets.find(p => p.id === planet.parentPlanetId) : null;
        const fieldsTight = planet.fieldsUsed >= getEffectiveMaxFields(planet) - 2;

        const candidates: { key: keyof Buildings; targetLevel: number }[] = [];

        if (planet.isMoon) {
          // Monde: Mondbasis schaltet Felder frei, dann Materieumwandler/Sprungtor;
          // Robotik + Werft (nur wenn Felder reichen) erlauben später Mondverteidigung.
          candidates.push({ key: 'mondbasis', targetLevel: 6 });
          candidates.push({ key: 'matterConverter', targetLevel: 10 });
          candidates.push({ key: 'jumpGate', targetLevel: 1 });
          candidates.push({ key: 'roboticsFactory', targetLevel: 3 });
          candidates.push({ key: 'shipyard', targetLevel: 3 });
        } else {
          const metalLvl = b.metalMine;
          const crystalLvl = b.crystalMine;
          const deutLvl = b.deuteriumSynthesizer;

          // Felder werden knapp → Terraformer hoch priorisieren, damit die Progression nicht hart stoppt.
          if (fieldsTight) candidates.push({ key: 'terraformer', targetLevel: 15 });

          // A. Speicher, wenn eine Ressource die Kapazität zu füllen droht (verhindert Produktionsverlust).
          //    Schwelle gesenkt (0.70) für früheres Reagieren, damit Kolonien nicht chronisch überlaufen.
          if (planet.resources.metal > caps.metal * 0.70) candidates.push({ key: 'metalStorage', targetLevel: 40 });
          if (planet.resources.crystal > caps.crystal * 0.70) candidates.push({ key: 'crystalStorage', targetLevel: 40 });
          if (planet.resources.deuterium > caps.deuterium * 0.70) candidates.push({ key: 'deuteriumStorage', targetLevel: 40 });

          // A2. Speicher proaktiv an das Minen-Niveau koppeln (unabhängig vom aktuellen Füllstand):
          //     lässt Speicher mit der Produktion mitwachsen, statt erst bei drohendem Überlauf zu reagieren.
          if (b.metalStorage < Math.min(40, metalLvl - 3)) candidates.push({ key: 'metalStorage', targetLevel: 40 });
          if (b.crystalStorage < Math.min(40, crystalLvl - 3)) candidates.push({ key: 'crystalStorage', targetLevel: 40 });
          if (b.deuteriumStorage < Math.min(40, deutLvl - 3)) candidates.push({ key: 'deuteriumStorage', targetLevel: 40 });

          // B. Energie: nur wenn tatsächlich Energiemangel besteht (ratio < 0.98).
          if (ratio < 0.98) {
            candidates.push({ key: 'solarPowerPlant', targetLevel: 40 });
            candidates.push({ key: 'fusionPowerPlant', targetLevel: 20 });
          }

          // C. Wirtschaft: Minen ausgewogen wachsen lassen (Metall ≳ Kristall ≳ Deuterium),
          //    Deuterium früh mitziehen (sonst Deuterium-Null-Stall).
          if (metalLvl <= crystalLvl + 2) candidates.push({ key: 'metalMine', targetLevel: 32 });
          if (crystalLvl <= deutLvl + 2) candidates.push({ key: 'crystalMine', targetLevel: 30 });
          candidates.push({ key: 'deuteriumSynthesizer', targetLevel: 28 });

          // D. Kern-Infrastruktur (schaltet Forschung, Werft, Todesstern & schnellere Bauten frei).
          //    VOR den "Extra"-Minen, damit die KI zielstrebig Richtung shipyard 12 / Nanit fortschreitet.
          candidates.push({ key: 'roboticsFactory', targetLevel: 10 });
          candidates.push({ key: 'researchLab', targetLevel: 12 });
          candidates.push({ key: 'shipyard', targetLevel: 12 });
          candidates.push({ key: 'naniteFactory', targetLevel: 6 });

          // Fallback: weitere Minen, wenn Balance & Infra-Ziele (vorerst) abgedeckt sind.
          candidates.push({ key: 'metalMine', targetLevel: 32 });
          candidates.push({ key: 'crystalMine', targetLevel: 30 });

          // E. Endgame-Gebäude.
          candidates.push({ key: 'missileSilo', targetLevel: 6 });
          if (!planet.moonId) candidates.push({ key: 'moonCannon', targetLevel: 1 });
        }

        let targetBuilding: keyof Buildings | null = null;
        // Beim Sparen für Todessterne den Gebäudebau auf das Nötigste beschränken (Energie/Speicher/
        // Robotik/Nanit) – Rand-Upgrades (Minen-Feintuning, Silo, Mondkanone) warten bis danach.
        const essentialWhenSaving = new Set<keyof Buildings>([
          'solarPowerPlant', 'fusionPowerPlant', 'metalStorage', 'crystalStorage', 'deuteriumStorage', 'roboticsFactory',
        ]);
        const effectiveCandidates = savingForDeathStar ? candidates.filter(c => essentialWhenSaving.has(c.key)) : candidates;

        for (const cand of effectiveCandidates) {
          if (b[cand.key] >= cand.targetLevel) continue;
          if (!canBuildOnBody(planet, cand.key, parentP, ai.research)) continue;
          const cost = getBuildingUpgradeCost(cand.key, b[cand.key], ai.research.materialScience || 0);
          if (!hasEnoughResources(planet.resources, cost)) continue;
          targetBuilding = cand.key;
          break;
        }

        if (targetBuilding) {
          const cost = getBuildingUpgradeCost(targetBuilding, b[targetBuilding], ai.research.materialScience || 0);
          // Deduct cost and start build job!
          planet.resources.metal -= cost.metal;
          planet.resources.crystal -= cost.crystal;
          planet.resources.deuterium -= cost.deuterium;

          const nextLevel = b[targetBuilding] + 1;
          const duration = getBuildingBuildDuration(
            targetBuilding,
            nextLevel,
            b.roboticsFactory,
            speedMult,
            b.naniteFactory || 0
          );

          const buildJob: BuildJob = {
            id: `ai_build_${Date.now()}_${seq.n}_${Math.random().toString(36).slice(2)}`,
            type: 'building',
            target: targetBuilding,
            level: nextLevel,
            durationTotal: duration,
            durationRemaining: duration,
          };
          planet.activeBuildJob = buildJob;
          planet.activeBuildQueue = [buildJob];

          pushDebugLog(newState, ai.id, ai.name, 'build', `${planet.name}: baut ${BUILDING_NAMES[targetBuilding]} → Stufe ${nextLevel}`, seq);
          markActed();
        }
      }

      // 1a. Materieumwandler-Steuerung (nur Monde): Den Umwandler nur aktiv lassen, wenn er die
      // Energiebilanz des Elternplaneten nicht zu stark drückt (sonst drosselt er dessen Minen).
      if (planet.isMoon && (planet.buildings.matterConverter || 0) > 0) {
        const parentP = planet.parentPlanetId ? newState.planets.find(p => p.id === planet.parentPlanetId) : null;
        if (parentP) {
          const convConsumption = getMatterConverterEnergyConsumption(planet.buildings.matterConverter || 0, speedMult);
          const { ratio: ratioWithConv } = getEnergyStatus(
            parentP.buildings, parentP.ships.solarSatellite || 0, parentP.temperatureMax,
            ai.research.energy || 0, parentP.fusionActive !== false, speedMult, convConsumption
          );
          // Aktiv lassen, solange der Elternplanet ≥ 85 % Energie behält; sonst abschalten.
          planet.converterActive = ratioWithConv >= 0.85;
        }
      }

      // 1b. Mondversuch: Planeten mit Mondkanone und ohne Mond versuchen gelegentlich, einen Mond zu erschaffen
      if (!planet.isMoon && (planet.buildings.moonCannon || 0) >= 1 && !planet.moonId
        && hasEnoughResources(planet.resources, MOON_ATTEMPT_COST) && Math.random() < 0.1) {
        planet.resources.metal -= MOON_ATTEMPT_COST.metal;
        planet.resources.crystal -= MOON_ATTEMPT_COST.crystal;
        planet.resources.deuterium -= MOON_ATTEMPT_COST.deuterium;
        if (Math.random() < MOON_ATTEMPT_CHANCE) {
          const moon = createMoon(planet, ai.research.moonExpedition || 0, Date.now());
          newState.planets.push(moon);
          planet.moonId = moon.id;
          pushDebugLog(newState, ai.id, ai.name, 'info', `${planet.name}: Mondversuch erfolgreich – Mond (Ø ${moon.diameter} km) entstanden`, seq);
        } else {
          pushDebugLog(newState, ai.id, ai.name, 'info', `${planet.name}: Mondversuch fehlgeschlagen`, seq);
        }
      }

      // 2. Shipyard checking (Ships & Defenses)
      if (planet.activeShipyardQueue.length === 0 && planet.buildings.shipyard > 0) {
        // A. Is this planet under attack?
        const isUnderAttack = newState.fleets.some(f => f.targetPlanetId === planet.id && f.mission === 'attack' && !f.isReturning);

        // Reserve für das nächste strategische Infrastruktur-Ziel (shipyard 12 → Todesstern-fähig, dann Nanit).
        // Militär- und Normal-Verteidigungsbau darf nur Ressourcen OBERHALB dieser Reserve ausgeben,
        // sonst räumt der Schiffs-/Verteidigungsbau die Ersparnisse leer und die KI erreicht nie das Endgame.
        // (Unter Beschuss wird die Reserve ignoriert – Überleben zuerst.)
        // Nur bis zur todesstern-fähigen Werft (Stufe 12) wird reserviert; die (viel teurere) Nanitenfabrik
        // darf das Endgame NICHT blockieren. Ab Werft 12 ist die Reserve 0 → Mittel fließen in Todessterne.
        let reserve: Resources = { metal: 0, crystal: 0, deuterium: 0 };
        if (!planet.isMoon && !isUnderAttack && planet.buildings.shipyard < 12
            && canBuildOnBody(planet, 'shipyard', null, ai.research)) {
          reserve = getBuildingUpgradeCost('shipyard', planet.buildings.shipyard, ai.research.materialScience || 0);
        }
        const spendable = (r: Resources): Resources => ({
          metal: Math.max(0, r.metal - reserve.metal),
          crystal: Math.max(0, r.crystal - reserve.crystal),
          deuterium: Math.max(0, r.deuterium - reserve.deuterium),
        });

        if (isUnderAttack) {
          // Under attack: Prioritize defense! Try to build defenses we meet requirements for
          const defenseTypes: (keyof Defense)[] = [
            'plasmaTurret', 'largeShieldDome', 'gaussCannon', 'smallShieldDome', 'ionCannon', 'heavyLaser', 'lightLaser', 'rocketLauncher'
          ];
          let defenseQueued = false;
          for (const defType of defenseTypes) {
            const cost = DEFENSE_COSTS[defType];
            const req = DEFENSE_REQUIREMENTS[defType];

            // Schildkuppeln: max. 1 pro Planet – vorhandene UND bereits eingereihte Kuppeln mitzählen.
            const isDome = defType === 'smallShieldDome' || defType === 'largeShieldDome';
            if (isDome) {
              const queuedDome = planet.activeShipyardQueue
                .filter(j => j.type === 'defense' && j.target === defType)
                .reduce((a, j) => a + j.count, 0);
              if ((planet.defense[defType] || 0) + queuedDome >= 1) continue;
            }

            if (isRequirementMet(req, planet.buildings, ai.research) && hasEnoughResources(planet.resources, cost)) {
              // Build as many as we can afford, up to 10 (Kuppeln jedoch nur 1).
              const maxAffordable = Math.min(
                10,
                cost.metal ? Math.floor(planet.resources.metal / cost.metal) : Infinity,
                cost.crystal ? Math.floor(planet.resources.crystal / cost.crystal) : Infinity,
                cost.deuterium ? Math.floor(planet.resources.deuterium / cost.deuterium) : Infinity
              );
              const qty = isDome ? 1 : Math.max(1, maxAffordable);

              const totalCost = {
                metal: cost.metal * qty,
                crystal: cost.crystal * qty,
                deuterium: cost.deuterium * qty
              };

              if (hasEnoughResources(planet.resources, totalCost)) {
                planet.resources.metal -= totalCost.metal;
                planet.resources.crystal -= totalCost.crystal;
                planet.resources.deuterium -= totalCost.deuterium;
                const duration = getShipyardBuildDuration(cost, planet.buildings.shipyard, planet.buildings.roboticsFactory, speedMult, planet.buildings.naniteFactory || 0);
                planet.activeShipyardQueue.push({
                  id: `ai_def_${Date.now()}_${seq.n}_${Math.random().toString(36).slice(2)}`,
                  type: 'defense',
                  target: defType,
                  count: qty,
                  durationPerItem: duration,
                  durationRemainingInCurrent: duration,
                });
                pushDebugLog(newState, ai.id, ai.name, 'shipyard', `${planet.name}: baut unter Beschuss ${qty}× ${DEFENSE_NAMES[defType]} (Verteidigung)`, seq);
                defenseQueued = true;
                break;
              }
            }
          }
          if (defenseQueued) continue;
        }

        // B. Colony Ship Check
        const colCount = planet.ships.colonyShip;
        const astrophysicsLvl = ai.research.astrophysics;
        const maxColonies = 1 + Math.floor(astrophysicsLvl / 2);
        const playerColonies = aiPlanets.filter(p => !p.isMoon).length; // Monde zählen nicht zum Limit

        if (canAct && !actionTaken && colCount === 0 && playerColonies < maxColonies && planet.buildings.shipyard >= 4) {
          const cost = SHIP_COSTS.colonyShip;
          const req = SHIP_REQUIREMENTS.colonyShip;
          if (isRequirementMet(req, planet.buildings, ai.research) && hasEnoughResources(planet.resources, cost)) {
            planet.resources.metal -= cost.metal;
            planet.resources.crystal -= cost.crystal;
            planet.resources.deuterium -= cost.deuterium;
            const duration = getShipyardBuildDuration(cost, planet.buildings.shipyard, planet.buildings.roboticsFactory, speedMult, planet.buildings.naniteFactory || 0);
            planet.activeShipyardQueue.push({
              id: `ai_ship_${Date.now()}_${seq.n}`,
              type: 'ship',
              target: 'colonyShip',
              count: 1,
              durationPerItem: duration,
              durationRemainingInCurrent: duration,
            });
            pushDebugLog(newState, ai.id, ai.name, 'shipyard', `${planet.name}: baut ${SHIP_NAMES.colonyShip} (Expansion)`, seq);
            markActed();
            continue;
          }
        }

        // B2. Kleiner Spionagesonden-Vorrat für Aufklärung (billig; nicht während der Todesstern-Sparphase).
        if (canAct && !actionTaken && !savingForDeathStar && (planet.ships.espionageProbe || 0) < 3
            && isRequirementMet(SHIP_REQUIREMENTS.espionageProbe, planet.buildings, ai.research)) {
          const cost = SHIP_COSTS.espionageProbe;
          const spend = spendable(planet.resources);
          if (hasEnoughResources(spend, cost)) {
            planet.resources.metal -= cost.metal;
            planet.resources.crystal -= cost.crystal;
            planet.resources.deuterium -= cost.deuterium;
            const duration = getShipyardBuildDuration(cost, planet.buildings.shipyard, planet.buildings.roboticsFactory, speedMult, planet.buildings.naniteFactory || 0);
            planet.activeShipyardQueue.push({
              id: `ai_probe_${Date.now()}_${seq.n}`,
              type: 'ship',
              target: 'espionageProbe',
              count: 2,
              durationPerItem: duration,
              durationRemainingInCurrent: duration,
            });
            pushDebugLog(newState, ai.id, ai.name, 'shipyard', `${planet.name}: baut 2× ${SHIP_NAMES.espionageProbe} (Aufklärung)`, seq);
            markActed();
            continue;
          }
        }

        // B3. Recycler-Vorrat, wenn es irgendwo ein Trümmerfeld zu bergen gibt (max. 5 je KI).
        if (canAct && !actionTaken && !savingForDeathStar) {
          const debrisExists = newState.planets.some(p => (p.debris?.metal || 0) + (p.debris?.crystal || 0) > 0);
          const aiRecyclers = aiPlanets.reduce((sum, p) => sum + (p.ships.recycler || 0), 0)
            + newState.fleets.filter(f => f.ownerId === ai.id).reduce((sum, f) => sum + (f.ships.recycler || 0), 0);
          if (debrisExists && aiRecyclers < 5 && isRequirementMet(SHIP_REQUIREMENTS.recycler, planet.buildings, ai.research)) {
            const cost = SHIP_COSTS.recycler;
            const spend = spendable(planet.resources);
            if (hasEnoughResources(spend, cost)) {
              planet.resources.metal -= cost.metal;
              planet.resources.crystal -= cost.crystal;
              planet.resources.deuterium -= cost.deuterium;
              const duration = getShipyardBuildDuration(cost, planet.buildings.shipyard, planet.buildings.roboticsFactory, speedMult, planet.buildings.naniteFactory || 0);
              planet.activeShipyardQueue.push({
                id: `ai_recycler_${Date.now()}_${seq.n}`,
                type: 'ship',
                target: 'recycler',
                count: 2,
                durationPerItem: duration,
                durationRemainingInCurrent: duration,
              });
              pushDebugLog(newState, ai.id, ai.name, 'shipyard', `${planet.name}: baut 2× ${SHIP_NAMES.recycler} (Recycling)`, seq);
              markActed();
              continue;
            }
          }
        }

        // C0. Endgame: Sobald der Todesstern freigeschaltet ist, gezielt dafür sparen bzw. bauen –
        // sonst zersplittern die Ressourcen in kleinere Schiffe und die KI erreicht nie die 10+
        // Todessterne, die eine 'destroy'-Mission (Planet vernichten) braucht.
        if (deathStarReady) {
          const dsCost = SHIP_COSTS.deathStar;
          const spend = spendable(planet.resources);
          if (canAct && !actionTaken && hasEnoughResources(spend, dsCost)) {
            const qty = Math.max(1, Math.min(3,
              dsCost.metal ? Math.floor(spend.metal / dsCost.metal) : Infinity,
              dsCost.crystal ? Math.floor(spend.crystal / dsCost.crystal) : Infinity,
              dsCost.deuterium ? Math.floor(spend.deuterium / dsCost.deuterium) : Infinity
            ));
            const totalCost = { metal: dsCost.metal * qty, crystal: dsCost.crystal * qty, deuterium: dsCost.deuterium * qty };
            planet.resources.metal -= totalCost.metal;
            planet.resources.crystal -= totalCost.crystal;
            planet.resources.deuterium -= totalCost.deuterium;
            const duration = getShipyardBuildDuration(dsCost, planet.buildings.shipyard, planet.buildings.roboticsFactory, speedMult, planet.buildings.naniteFactory || 0);
            planet.activeShipyardQueue.push({
              id: `ai_ship_${Date.now()}_${seq.n}`,
              type: 'ship',
              target: 'deathStar',
              count: qty,
              durationPerItem: duration,
              durationRemainingInCurrent: duration,
            });
            pushDebugLog(newState, ai.id, ai.name, 'shipyard', `${planet.name}: baut ${qty}× ${SHIP_NAMES.deathStar} (Endgame)`, seq);
            markActed();
            continue;
          } else if (canAct && !actionTaken && (planet.ships.deathStar || 0) < 30) {
            // Für den nächsten Todesstern sparen: diesen Tick nichts Kleineres bauen.
            continue;
          }
        }

        // C. Build Military Ships (dynamic list)
        // WIRTSCHAFT ZUERST: reine Kampfschiffe erst bauen, wenn der Planet ein wirtschaftliches
        // Grundgerüst hat. Andernfalls versickert das Budget in vielen billigen Jägern, während
        // Minen/Labor/Werft zurückbleiben. Ausnahmen: Endgame (todesstern-fähig) und akuter Angriff.
        const economyBackbone = !planet.isMoon
          && planet.buildings.metalMine >= 20 && planet.buildings.crystalMine >= 18
          && planet.buildings.researchLab >= 10 && planet.buildings.shipyard >= 10
          && (planet.buildings.naniteFactory || 0) >= 3;
        const allowWarships = economyBackbone || deathStarReady || isUnderAttack;

        // Kleinstschiffe (lightFighter/smallCargo) werden bewusst NICHT mehr gespammt – die KI
        // konzentriert das Budget auf schlagkräftige Einheiten (+ Große Transporter für Loot).
        const shipTypesByPriority: (keyof Ships)[] = deathStarReady
          ? ['destroyer', 'battlecruiser', 'bomber', 'battleship', 'cruiser', 'largeCargo']
          : ['deathStar', 'destroyer', 'battlecruiser', 'bomber', 'battleship', 'cruiser', 'heavyFighter', 'largeCargo'];
        let shipQueued = false;

        for (const sType of (allowWarships ? shipTypesByPriority : [])) {
          if (sType === 'colonyShip' || sType === 'solarSatellite') continue;

          const cost = SHIP_COSTS[sType];
          const req = SHIP_REQUIREMENTS[sType];

          const spend = spendable(planet.resources);
          if (canAct && !actionTaken && isRequirementMet(req, planet.buildings, ai.research) && hasEnoughResources(spend, cost)) {
            // Build a batch of 1 to 5 ships (nur aus Ressourcen oberhalb der Infra-Reserve)
            const maxAffordable = Math.min(
              5,
              cost.metal ? Math.floor(spend.metal / cost.metal) : Infinity,
              cost.crystal ? Math.floor(spend.crystal / cost.crystal) : Infinity,
              cost.deuterium ? Math.floor(spend.deuterium / cost.deuterium) : Infinity
            );
            const qty = Math.max(1, maxAffordable);

            const totalCost = {
              metal: cost.metal * qty,
              crystal: cost.crystal * qty,
              deuterium: cost.deuterium * qty
            };

            if (hasEnoughResources(planet.resources, totalCost)) {
              planet.resources.metal -= totalCost.metal;
              planet.resources.crystal -= totalCost.crystal;
              planet.resources.deuterium -= totalCost.deuterium;
              const duration = getShipyardBuildDuration(cost, planet.buildings.shipyard, planet.buildings.roboticsFactory, speedMult, planet.buildings.naniteFactory || 0);
              planet.activeShipyardQueue.push({
                id: `ai_ship_${Date.now()}_${seq.n}_${Math.random().toString(36).slice(2)}`,
                type: 'ship',
                target: sType,
                count: qty,
                durationPerItem: duration,
                durationRemainingInCurrent: duration,
              });
              pushDebugLog(newState, ai.id, ai.name, 'shipyard', `${planet.name}: baut ${qty}× ${SHIP_NAMES[sType]} (Militär)`, seq);
              markActed();
              shipQueued = true;
              break;
            }
          }
        }

        if (shipQueued) continue;

        // D. Build some basic defenses under normal conditions
        const defenseTypes: (keyof Defense)[] = [
          'plasmaTurret', 'largeShieldDome', 'gaussCannon', 'smallShieldDome', 'ionCannon', 'heavyLaser', 'lightLaser', 'rocketLauncher'
        ];

        for (const defType of defenseTypes) {
          const cost = DEFENSE_COSTS[defType];
          const req = DEFENSE_REQUIREMENTS[defType];

          // Schildkuppeln: max. 1 pro Planet – vorhandene UND bereits in der Werft eingereihte mitzählen.
          if (defType === 'smallShieldDome' || defType === 'largeShieldDome') {
            const queuedDome = planet.activeShipyardQueue
              .filter(j => j.type === 'defense' && j.target === defType)
              .reduce((a, j) => a + j.count, 0);
            if ((planet.defense[defType] || 0) + queuedDome >= 1) continue;
          }

          // Don't overbuild under normal conditions (Domes bleiben auf 1 begrenzt, s. o.)
          const currentCount = planet.defense[defType] || 0;
          if (currentCount > 60) continue;

          if (canAct && !actionTaken && isRequirementMet(req, planet.buildings, ai.research) && hasEnoughResources(spendable(planet.resources), cost)) {
            planet.resources.metal -= cost.metal;
            planet.resources.crystal -= cost.crystal;
            planet.resources.deuterium -= cost.deuterium;
            const duration = getShipyardBuildDuration(cost, planet.buildings.shipyard, planet.buildings.roboticsFactory, speedMult, planet.buildings.naniteFactory || 0);
            planet.activeShipyardQueue.push({
              id: `ai_def_${Date.now()}_${seq.n}_${Math.random().toString(36).slice(2)}`,
              type: 'defense',
              target: defType,
              count: 1,
              durationPerItem: duration,
              durationRemainingInCurrent: duration,
            });
            pushDebugLog(newState, ai.id, ai.name, 'shipyard', `${planet.name}: baut ${DEFENSE_NAMES[defType]} (Verteidigung)`, seq);
            markActed();
            break;
          }
        }
      }
    }

    // 3. AI Research checking
    // Pick the planet with the HIGHEST research lab (no longer requires it to be build-idle,
    // which was the bug that prevented the AI from ever researching -> no drives -> no ships).
    // Forschung läuft auf EIGENEM Takt (nextResearchTime), unabhängig vom Bau-/Werft-Token.
    // So verhungert sie nicht mehr hinter dem Schiffsbau und die KI bleibt technologisch aktuell.
    if (now >= (ai.nextResearchTime ?? 0) && !ai.activeResearchJob) {
      const labPlanet = aiPlanets
        .filter(p => p.buildings.researchLab > 0)
        .sort((a, b) => b.buildings.researchLab - a.buildings.researchLab)[0];

      if (labPlanet) {
        let targetResearch: keyof Research | null = null;

        // Priority order that unlocks economy and, crucially, drives/weapons so ships become buildable.
        // Caps reichen bis ins Endgame: Todesstern braucht hyperspaceDrive 7 / shielding 10 / energy 10,
        // Plasmatürme/-tech brauchen laserTech 10 + ionTech 5 + energy 8. Kampfwerte (weapons/armour/
        // shielding) hoch, damit KI-Flotten stark sind; computer für Flottenslots, astrophysics für Kolonien.
        const researchPlan: { key: keyof Research; cap: number }[] = [
          { key: 'energy', cap: 12 },
          { key: 'computer', cap: 14 },
          { key: 'combustionDrive', cap: 12 },
          { key: 'laserTech', cap: 14 },
          { key: 'impulseDrive', cap: 12 },
          { key: 'espionage', cap: 8 },
          { key: 'ionTech', cap: 12 },
          { key: 'materialScience', cap: 12 },
          { key: 'armour', cap: 16 },
          { key: 'weapons', cap: 16 },
          { key: 'shielding', cap: 14 },
          { key: 'hyperspaceDrive', cap: 12 },
          { key: 'astrophysics', cap: 12 },
          { key: 'intergalacticResearchNetwork', cap: 8 },
          { key: 'moonExpedition', cap: 8 },
          { key: 'plasmaTech', cap: 12 },
        ];

        for (const { key, cap } of researchPlan) {
          const currentLvl = ai.research[key];
          if (currentLvl < cap && isRequirementMet(RESEARCH_REQUIREMENTS[key], labPlanet.buildings, ai.research)) {
            const cost = getResearchUpgradeCost(key, currentLvl);
            if (hasEnoughResources(labPlanet.resources, cost)) {
              targetResearch = key;
              break;
            }
          }
        }

        if (targetResearch) {
          const currentLvl = ai.research[targetResearch];
          const cost = getResearchUpgradeCost(targetResearch, currentLvl);

          labPlanet.resources.metal -= cost.metal;
          labPlanet.resources.crystal -= cost.crystal;
          labPlanet.resources.deuterium -= cost.deuterium;

          const duration = getResearchDuration(
            targetResearch,
            currentLvl + 1,
            labPlanet.buildings.researchLab,
            speedMult
          );

          ai.activeResearchJob = {
            id: `ai_research_${Date.now()}_${seq.n}_${Math.random().toString(36).slice(2)}`,
            type: 'research',
            target: targetResearch,
            level: currentLvl + 1,
            durationTotal: duration,
            durationRemaining: duration,
          };

          pushDebugLog(newState, ai.id, ai.name, 'research', `Erforscht ${RESEARCH_NAMES[targetResearch]} → Stufe ${currentLvl + 1}`, seq);
          // Eigener Forschungs-Takt (4–9 s); blockiert bewusst NICHT den Bau-/Werft-Token (kein markActed).
          ai.nextResearchTime = now + 4000 + Math.random() * 5000;
        }
      }
    }

    // 4. AI Colonization (if they have a colony ship, send it!)
    const colonyShipPlanet = aiPlanets.find(p => p.ships.colonyShip > 0);
    if (canAct && !actionTaken && colonyShipPlanet) {
      const emptyPlanets = newState.planets.filter(p => p.ownerId === null);
      if (emptyPlanets.length > 0) {
        const target = emptyPlanets[Math.floor(Math.random() * emptyPlanets.length)];
        colonyShipPlanet.ships.colonyShip--;

        const dist = getDistance(colonyShipPlanet.system, colonyShipPlanet.slot, target.system, target.slot);
        const maxSpeed = getShipSpeed('colonyShip', ai.research);
        const duration = getFlightDuration(dist, maxSpeed, 100, speedMult);

        const departure = now;
        const arrival = now + duration * 1000;

        newState.fleets.push({
          id: `ai_colonize_${Date.now()}_${Math.random()}`,
          ownerId: ai.id,
          originPlanetId: colonyShipPlanet.id,
          targetPlanetId: target.id,
          targetSystem: target.system,
          targetSlot: target.slot,
          mission: 'colonize',
          ships: { smallCargo: 0, largeCargo: 0, lightFighter: 0, heavyFighter: 0, cruiser: 0, battleship: 0, battlecruiser: 0, colonyShip: 1, recycler: 0, espionageProbe: 0, bomber: 0, destroyer: 0, deathStar: 0, solarSatellite: 0 },
          resources: { metal: 0, crystal: 0, deuterium: 0 },
          departureTime: departure,
          arrivalTime: arrival,
          returnTime: arrival + duration * 1000,
          isReturning: false,
          speedMultiplier: speedMult,
        });

        pushDebugLog(newState, ai.id, ai.name, 'fleet', `Kolonisierung: Kolonieschiff nach ${target.system}:${target.slot} entsandt`, seq);
        markActed();
      }
    }

    // 5. AI Launch Attack Decision — zielgerichtet & ratenbegrenzt.
    // Harte Obergrenze: max. 1 Angriff pro ECHTZEIT-Minute je (KI → Ziel-Spieler). Angriffe haben
    // immer einen Zweck (lohnende Beute ODER zerstörbare Flotte/Verteidigung ODER Planetenzerstörung).
    {
      const ATTACK_COOLDOWN_MS = 60000; // 1 Echtzeit-Minute je Ziel-Spieler
      const LOOT_MIN = 20000;           // Mindest-Beutewert (0,5 × Zielressourcen), damit sich ein Raubzug lohnt
      const MIL_MIN = 15000;            // Mindest-Militärwert (Flotte+Verteidigung), damit sich Zerstörung lohnt

      const combatValue = (p: Planet) =>
        (p.ships.lightFighter || 0) + (p.ships.heavyFighter || 0) * 2 + (p.ships.cruiser || 0) * 4 +
        (p.ships.battleship || 0) * 8 + (p.ships.bomber || 0) * 8 + (p.ships.destroyer || 0) * 12 +
        (p.ships.deathStar || 0) * 100;

      // Launch from the planet with the strongest fleet (needs a meaningful force)
      const sourcePlanet = aiPlanets
        .filter(p => combatValue(p) >= 5)
        .sort((a, b) => combatValue(b) - combatValue(a))[0];

      // Moderate Grundchance; der 60-s-Cooldown je Ziel-Spieler ist die eigentliche Obergrenze.
      if (canAct && !actionTaken && sourcePlanet && Math.random() < 0.5) {
        const canDestroy = (sourcePlanet.ships.deathStar || 0) >= 10;
        const myStrength = calculateFleetResourceValue(sourcePlanet.ships);
        const lootValue = (p: Planet) => 0.5 * (p.resources.metal + p.resources.crystal + p.resources.deuterium);
        const milValue = (p: Planet) => calculateFleetResourceValue(p.ships) + calculateDefenseResourceValue(p.defense);

        // Angreifbare Fremdkörper, die NICHT im Cooldown des Besitzers stehen UND ein lohnendes Ziel sind.
        const candidates = newState.planets.filter(p => {
          if (p.ownerId === ai.id || p.ownerId === null) return false;
          if (now - (ai.lastAttackTimes?.[p.ownerId] ?? 0) < ATTACK_COOLDOWN_MS) return false;
          const worthwhile = lootValue(p) >= LOOT_MIN || milValue(p) >= MIL_MIN || (canDestroy && p.ownerId === 'player');
          if (!worthwhile) return false;
          // Nur realistisch schlagbare Ziele (außer Planetenzerstörung mit Todessternen).
          if (!canDestroy && milValue(p) > myStrength * 1.2) return false;
          return true;
        });

        if (candidates.length > 0) {
          // Bestes Ziel: höchster Gesamtwert (Beute + zerstörbarer Militärwert); Spieler-Zerstörung bevorzugt.
          let target = [...candidates].sort((a, b) => (lootValue(b) + milValue(b)) - (lootValue(a) + milValue(a)))[0];
          if (canDestroy) {
            const playerTarget = candidates.find(p => p.ownerId === 'player');
            if (playerTarget) target = playerTarget;
          }

          const shipsToSend: Ships = { smallCargo: 0, largeCargo: 0, lightFighter: 0, heavyFighter: 0, cruiser: 0, battleship: 0, battlecruiser: 0, colonyShip: 0, recycler: 0, espionageProbe: 0, bomber: 0, destroyer: 0, deathStar: 0, solarSatellite: 0 };
          let combatShipsCount = 0;

          // Send 80% of combat ships (keep 20% for home defense)
          const combatKeys: (keyof Ships)[] = ['lightFighter', 'heavyFighter', 'cruiser', 'battleship', 'bomber', 'destroyer', 'deathStar'];
          for (const sKey of combatKeys) {
            const count = sourcePlanet.ships[sKey] || 0;
            const toSend = Math.floor(count * 0.8);
            if (toSend > 0) {
              shipsToSend[sKey] = toSend;
              sourcePlanet.ships[sKey] -= toSend;
              combatShipsCount += toSend;
            }
          }

          if (combatShipsCount > 0) {
            // Frachter mitschicken, um die Beute abzutransportieren: bei lohnender Beute möglichst viele,
            // sonst wie gehabt 80 % (Ressourcenklau!). So enden Angriffe nicht mit "2 Metall".
            const cargoFraction = lootValue(target) >= LOOT_MIN ? 1.0 : 0.8;
            const cargoKeys: (keyof Ships)[] = ['smallCargo', 'largeCargo'];
            for (const sKey of cargoKeys) {
              const count = sourcePlanet.ships[sKey] || 0;
              const toSend = Math.floor(count * cargoFraction);
              if (toSend > 0) {
                shipsToSend[sKey] = toSend;
                sourcePlanet.ships[sKey] -= toSend;
              }
            }

            // 'destroy'-Mission nur, wenn ≥10 Todessterne mitfliegen (sonst normaler Angriff).
            const mission: MissionType = (shipsToSend.deathStar || 0) >= 10 ? 'destroy' : 'attack';

            // Fleet flies at the speed of its slowest ship
            const dist = getDistance(sourcePlanet.system, sourcePlanet.slot, target.system, target.slot);
            const maxSpeed = getFleetSpeed(shipsToSend, ai.research) || getShipSpeed('lightFighter', ai.research);
            const duration = getFlightDuration(dist, maxSpeed, 100, speedMult);

            const departure = now;
            const arrival = now + duration * 1000;

            newState.fleets.push({
              id: `ai_fleet_${Date.now()}_${seq.n}_${Math.random().toString(36).slice(2)}`,
              ownerId: ai.id,
              originPlanetId: sourcePlanet.id,
              targetPlanetId: target.id,
              targetSystem: target.system,
              targetSlot: target.slot,
              mission,
              ships: shipsToSend,
              resources: { metal: 0, crystal: 0, deuterium: 0 },
              departureTime: departure,
              arrivalTime: arrival,
              returnTime: arrival + duration * 1000,
              isReturning: false,
              speedMultiplier: speedMult,
            });

            // Cooldown je Ziel-Spieler setzen (Echtzeit): dieser Ziel-Spieler ist 60 s tabu für DIESE KI.
            ai.lastAttackTimes = { ...(ai.lastAttackTimes || {}), [target.ownerId as string]: now };

            const targetOwner = newState.players.find(pl => pl.id === target.ownerId);
            const verb = mission === 'destroy' ? 'will vernichten' : 'greift an';
            pushDebugLog(newState, ai.id, ai.name, 'fleet', `${verb}: ${target.system}:${target.slot} (${targetOwner?.name ?? 'Unbekannt'}) mit ${combatShipsCount} Kampfschiffen`, seq);
            markActed();
          }
        }
      }
    }

    // 6. AI Espionage: gelegentlich einen Gegner ausspähen (Aufklärung statt sinnloser Angriffe).
    // Höchstens eine offene Sonde je KI; der Spionagebericht läuft in die Debug-Konsole (simulateTimePassed).
    {
      const spyInFlight = newState.fleets.filter(f => f.ownerId === ai.id && f.mission === 'spy' && !f.isReturning).length;
      const probePlanet = aiPlanets.find(p => (p.ships.espionageProbe || 0) > 0);
      if (canAct && !actionTaken && probePlanet && spyInFlight < 1 && Math.random() < 0.05) {
        const targets = newState.planets.filter(p => p.ownerId !== ai.id && p.ownerId !== null);
        if (targets.length > 0) {
          const target = targets[Math.floor(Math.random() * targets.length)];
          probePlanet.ships.espionageProbe -= 1;
          const probeShips: Ships = { smallCargo: 0, largeCargo: 0, lightFighter: 0, heavyFighter: 0, cruiser: 0, battleship: 0, battlecruiser: 0, colonyShip: 0, recycler: 0, espionageProbe: 1, bomber: 0, destroyer: 0, deathStar: 0, solarSatellite: 0 };
          const dist = getDistance(probePlanet.system, probePlanet.slot, target.system, target.slot);
          const maxSpeed = getShipSpeed('espionageProbe', ai.research);
          const duration = getFlightDuration(dist, maxSpeed, 100, speedMult);
          const departure = now;
          const arrival = now + duration * 1000;
          newState.fleets.push({
            id: `ai_spy_${Date.now()}_${seq.n}_${Math.random().toString(36).slice(2)}`,
            ownerId: ai.id,
            originPlanetId: probePlanet.id,
            targetPlanetId: target.id,
            targetSystem: target.system,
            targetSlot: target.slot,
            mission: 'spy',
            ships: probeShips,
            resources: { metal: 0, crystal: 0, deuterium: 0 },
            departureTime: departure,
            arrivalTime: arrival,
            returnTime: arrival + duration * 1000,
            isReturning: false,
            speedMultiplier: speedMult,
          });
          // Kein Start-Logeintrag – der aussagekräftige "spioniert … aus"-Eintrag entsteht beim
          // Ankommen der Sonde (simulateTimePassed) und hält die Debug-Konsole übersichtlich.
          markActed();
        }
      }
    }

    // 7. AI Recycling: eigene Recycler zu einem lohnenden Trümmerfeld schicken (gedrosselt).
    {
      const recyclerPlanet = aiPlanets.find(p => (p.ships.recycler || 0) > 0);
      const alreadyGoing = new Set(
        newState.fleets.filter(f => f.ownerId === ai.id && f.mission === 'recycle' && !f.isReturning).map(f => f.targetPlanetId)
      );
      const targetField = newState.planets.find(p =>
        (p.debris?.metal || 0) + (p.debris?.crystal || 0) > 0 && !alreadyGoing.has(p.id)
      );
      if (canAct && !actionTaken && recyclerPlanet && targetField) {
        const recyclerCount = recyclerPlanet.ships.recycler;
        const shipsToSend: Ships = { ...emptyShips(), recycler: recyclerCount };
        recyclerPlanet.ships.recycler = 0;
        const dist = getDistance(recyclerPlanet.system, recyclerPlanet.slot, targetField.system, targetField.slot);
        const maxSpeed = getShipSpeed('recycler', ai.research);
        const duration = getFlightDuration(dist, maxSpeed, 100, speedMult);
        const departure = now;
        const arrival = now + duration * 1000;
        newState.fleets.push({
          id: `ai_recycle_${Date.now()}_${seq.n}_${Math.random().toString(36).slice(2)}`,
          ownerId: ai.id,
          originPlanetId: recyclerPlanet.id,
          targetPlanetId: targetField.id,
          targetSystem: targetField.system,
          targetSlot: targetField.slot,
          mission: 'recycle',
          ships: shipsToSend,
          resources: { metal: 0, crystal: 0, deuterium: 0 },
          departureTime: departure,
          arrivalTime: arrival,
          returnTime: arrival + duration * 1000,
          isReturning: false,
          speedMultiplier: speedMult,
        });
        pushDebugLog(newState, ai.id, ai.name, 'fleet', `schickt ${recyclerCount}× ${SHIP_NAMES.recycler} zum Trümmerfeld ${targetField.system}:${targetField.slot}`, seq);
        markActed();
      }
    }
  }

  return newState;
}
