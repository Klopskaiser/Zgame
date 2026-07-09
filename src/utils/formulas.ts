/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Buildings, Research, Ships, Defense, Resources, Planet } from '../types';

export const BUILDING_NAMES: Record<keyof Buildings, string> = {
  metalMine: 'Metallmine',
  crystalMine: 'Kristallmine',
  deuteriumSynthesizer: 'Deuteriumsynthetisierer',
  solarPowerPlant: 'Solarkraftwerk',
  fusionPowerPlant: 'Fusionskraftwerk',
  roboticsFactory: 'Roboterfabrik',
  naniteFactory: 'Nanitenfabrik',
  shipyard: 'Raumschiffswerft',
  researchLab: 'Forschungslabor',
  terraformer: 'Terraformer',
  missileSilo: 'Raketensilo',
  metalStorage: 'Metallspeicher',
  crystalStorage: 'Kristallspeicher',
  deuteriumStorage: 'Deuteriumtank',
  moonCannon: 'Mondkanone',
  mondbasis: 'Mondbasis',
  matterConverter: 'Materieumwandler',
  jumpGate: 'Sprungtor',
};

export const RESEARCH_NAMES: Record<keyof Research, string> = {
  espionage: 'Spionagetechnik',
  computer: 'Computertechnik',
  weapons: 'Waffentechnik',
  shielding: 'Schildtechnik',
  armour: 'Raumschiffpanzerung',
  energy: 'Energietechnik',
  combustionDrive: 'Verbrennungstriebwerk',
  impulseDrive: 'Impulstriebwerk',
  hyperspaceDrive: 'Hyperraumtriebwerk',
  astrophysics: 'Astrophysik',
  laserTech: 'Lasertechnik',
  ionTech: 'Ionentechnik',
  plasmaTech: 'Plasmatechnik',
  intergalacticResearchNetwork: 'Intergalaktisches Forschungsnetzwerk',
  materialScience: 'Materialforschung',
  moonExpedition: 'Mondexpedition',
};

export const SHIP_NAMES: Record<keyof Ships, string> = {
  smallCargo: 'Kleiner Transporter',
  largeCargo: 'Großer Transporter',
  lightFighter: 'Leichter Jäger',
  heavyFighter: 'Schwerer Jäger',
  cruiser: 'Kreuzer',
  battleship: 'Schlachtschiff',
  battlecruiser: 'Schlachtkreuzer',
  colonyShip: 'Kolonieschiff',
  recycler: 'Recycler',
  espionageProbe: 'Spionagesonde',
  bomber: 'Bomber',
  destroyer: 'Zerstörer',
  deathStar: 'Todesstern',
  solarSatellite: 'Solarsatellit',
};

export const DEFENSE_NAMES: Record<keyof Defense, string> = {
  rocketLauncher: 'Raketenwerfer',
  lightLaser: 'Leichtes Lasergeschütz',
  heavyLaser: 'Schweres Lasergeschütz',
  gaussCannon: 'Gaußkanone',
  ionCannon: 'Ionengeschütz',
  plasmaTurret: 'Plasmawerfer',
  smallShieldDome: 'Kleine Schildkuppel',
  largeShieldDome: 'Große Schildkuppel',
};

// Base costs and factor to multiply cost by per level (cost = base * factor^(level-1))
export const BUILDING_BASE_COSTS: Record<keyof Buildings, { metal: number; crystal: number; deuterium: number; factor: number }> = {
  metalMine: { metal: 60, crystal: 15, deuterium: 0, factor: 1.5 },
  crystalMine: { metal: 48, crystal: 24, deuterium: 0, factor: 1.6 },
  deuteriumSynthesizer: { metal: 225, crystal: 75, deuterium: 0, factor: 1.5 },
  solarPowerPlant: { metal: 75, crystal: 30, deuterium: 0, factor: 1.5 },
  fusionPowerPlant: { metal: 900, crystal: 360, deuterium: 180, factor: 1.8 },
  roboticsFactory: { metal: 400, crystal: 120, deuterium: 200, factor: 2.0 },
  naniteFactory: { metal: 1000000, crystal: 500000, deuterium: 100000, factor: 2.0 },
  shipyard: { metal: 400, crystal: 200, deuterium: 100, factor: 2.0 },
  researchLab: { metal: 200, crystal: 400, deuterium: 200, factor: 2.0 },
  terraformer: { metal: 0, crystal: 50000, deuterium: 100000, factor: 2.0 },
  missileSilo: { metal: 20000, crystal: 20000, deuterium: 1000, factor: 2.0 },
  metalStorage: { metal: 1000, crystal: 0, deuterium: 0, factor: 2.0 },
  crystalStorage: { metal: 1000, crystal: 500, deuterium: 0, factor: 2.0 },
  deuteriumStorage: { metal: 1000, crystal: 1000, deuterium: 0, factor: 2.0 },
  // Mondkanone: nur Planet, max Stufe 1 (factor irrelevant bei einer Stufe)
  moonCannon: { metal: 700000, crystal: 500000, deuterium: 1000000, factor: 1.0 },
  // Mondbasis: nur Mond, Kosten verdoppeln sich pro Stufe (OGame)
  mondbasis: { metal: 20000, crystal: 40000, deuterium: 20000, factor: 2.0 },
  // Materieumwandler: nur Mond, factor 1.4
  matterConverter: { metal: 14000, crystal: 8000, deuterium: 44000, factor: 1.4 },
  // Sprungtor: nur Mond, max Stufe 1
  jumpGate: { metal: 2000000, crystal: 4000000, deuterium: 2000000, factor: 1.0 },
};

export const RESEARCH_BASE_COSTS: Record<keyof Research, { metal: number; crystal: number; deuterium: number; factor: number }> = {
  espionage: { metal: 200, crystal: 1000, deuterium: 200, factor: 2.0 },
  computer: { metal: 0, crystal: 400, deuterium: 600, factor: 2.0 },
  weapons: { metal: 800, crystal: 200, deuterium: 0, factor: 2.0 },
  shielding: { metal: 200, crystal: 600, deuterium: 0, factor: 2.0 },
  armour: { metal: 1000, crystal: 0, deuterium: 0, factor: 2.0 },
  energy: { metal: 0, crystal: 800, deuterium: 400, factor: 2.0 },
  combustionDrive: { metal: 400, crystal: 0, deuterium: 600, factor: 2.0 },
  impulseDrive: { metal: 2000, crystal: 4000, deuterium: 600, factor: 2.0 },
  hyperspaceDrive: { metal: 10000, crystal: 20000, deuterium: 6000, factor: 2.0 },
  astrophysics: { metal: 4000, crystal: 8000, deuterium: 4000, factor: 1.75 },
  laserTech: { metal: 200, crystal: 100, deuterium: 0, factor: 2.0 },
  ionTech: { metal: 1000, crystal: 300, deuterium: 100, factor: 2.0 },
  plasmaTech: { metal: 2000, crystal: 4000, deuterium: 1000, factor: 2.0 },
  intergalacticResearchNetwork: { metal: 240000, crystal: 400000, deuterium: 160000, factor: 2.0 },
  materialScience: { metal: 1000000, crystal: 250000, deuterium: 0, factor: 2.0 },
  moonExpedition: { metal: 60000, crystal: 75000, deuterium: 75000, factor: 2.0 },
};

export const SHIP_COSTS: Record<keyof Ships, Resources> = {
  smallCargo: { metal: 2000, crystal: 2000, deuterium: 0 },
  largeCargo: { metal: 6000, crystal: 6000, deuterium: 0 },
  lightFighter: { metal: 3000, crystal: 1000, deuterium: 0 },
  heavyFighter: { metal: 6000, crystal: 2000, deuterium: 0 },
  cruiser: { metal: 20000, crystal: 7000, deuterium: 2000 },
  battleship: { metal: 45000, crystal: 15000, deuterium: 0 },
  battlecruiser: { metal: 30000, crystal: 40000, deuterium: 15000 },
  colonyShip: { metal: 10000, crystal: 20000, deuterium: 10000 },
  recycler: { metal: 10000, crystal: 6000, deuterium: 2000 },
  espionageProbe: { metal: 0, crystal: 1000, deuterium: 0 },
  bomber: { metal: 50000, crystal: 25000, deuterium: 15000 },
  destroyer: { metal: 60000, crystal: 50000, deuterium: 15000 },
  deathStar: { metal: 5000000, crystal: 4000000, deuterium: 1000000 },
  solarSatellite: { metal: 0, crystal: 2000, deuterium: 500 },
};

export const DEFENSE_COSTS: Record<keyof Defense, Resources> = {
  rocketLauncher: { metal: 2000, crystal: 0, deuterium: 0 },
  lightLaser: { metal: 1500, crystal: 500, deuterium: 0 },
  heavyLaser: { metal: 6000, crystal: 2000, deuterium: 0 },
  gaussCannon: { metal: 20000, crystal: 15000, deuterium: 2000 },
  ionCannon: { metal: 5000, crystal: 15000, deuterium: 0 },
  plasmaTurret: { metal: 50000, crystal: 50000, deuterium: 30000 },
  smallShieldDome: { metal: 10000, crystal: 10000, deuterium: 0 },
  largeShieldDome: { metal: 50000, crystal: 50000, deuterium: 0 },
};

// Unit Stats for Combat Engine
export interface UnitStats {
  structural: number;
  shield: number;
  attack: number;
}

export const SHIP_STATS: Record<keyof Ships, UnitStats> = {
  smallCargo: { structural: 4000, shield: 10, attack: 5 },
  largeCargo: { structural: 12000, shield: 25, attack: 5 },
  lightFighter: { structural: 4000, shield: 10, attack: 50 },
  heavyFighter: { structural: 10000, shield: 25, attack: 150 },
  cruiser: { structural: 27000, shield: 50, attack: 400 },
  battleship: { structural: 60000, shield: 200, attack: 1000 },
  battlecruiser: { structural: 70000, shield: 400, attack: 700 },
  colonyShip: { structural: 30000, shield: 100, attack: 50 },
  recycler: { structural: 16000, shield: 10, attack: 1 },
  espionageProbe: { structural: 1000, shield: 1, attack: 0.01 },
  bomber: { structural: 75000, shield: 500, attack: 1000 },
  destroyer: { structural: 110000, shield: 500, attack: 2000 },
  deathStar: { structural: 9000000, shield: 50000, attack: 200000 },
  solarSatellite: { structural: 2000, shield: 1, attack: 1 },
};

export const DEFENSE_STATS: Record<keyof Defense, UnitStats> = {
  rocketLauncher: { structural: 2000, shield: 10, attack: 80 },
  lightLaser: { structural: 2000, shield: 25, attack: 100 },
  heavyLaser: { structural: 8000, shield: 100, attack: 250 },
  gaussCannon: { structural: 35000, shield: 200, attack: 1100 },
  ionCannon: { structural: 20000, shield: 500, attack: 150 },
  plasmaTurret: { structural: 100000, shield: 300, attack: 3000 },
  smallShieldDome: { structural: 20000, shield: 2000, attack: 1 },
  largeShieldDome: { structural: 100000, shield: 10000, attack: 1 },
};

// --- Rapidfire (Schnelles Feuer) ---

export type UnitKey = keyof Ships | keyof Defense;

// Angreifer-Key -> { Ziel-Key: Rapidfire-Wert }. Einzige Quelle der Wahrheit: hier stehen nur die
// offensiven Einträge (wer feuert wiederholt worauf). Verteidigungsanlagen, Spionagesonde und
// Solarsatellit tauchen hier NICHT als Angreifer auf, da sie kein offensives Rapidfire haben.
// Die Gegenrichtung ("von") wird per getRapidFireFrom abgeleitet, nicht separat gepflegt.
export const RAPID_FIRE: Partial<Record<UnitKey, Partial<Record<UnitKey, number>>>> = {
  smallCargo:   { espionageProbe: 5, solarSatellite: 5 },
  largeCargo:   { espionageProbe: 5, solarSatellite: 5 },
  lightFighter: { espionageProbe: 5, solarSatellite: 5 },
  heavyFighter: { smallCargo: 3, espionageProbe: 5, solarSatellite: 5 },
  cruiser:      { lightFighter: 6, rocketLauncher: 10, espionageProbe: 5, solarSatellite: 5 },
  battleship:   { espionageProbe: 5, solarSatellite: 5 },
  battlecruiser: { smallCargo: 3, largeCargo: 3, heavyFighter: 4, cruiser: 4, battleship: 7, espionageProbe: 5, solarSatellite: 5 },
  colonyShip:   { espionageProbe: 5, solarSatellite: 5 },
  recycler:     { espionageProbe: 5, solarSatellite: 5 },
  bomber:       { rocketLauncher: 20, lightLaser: 20, heavyLaser: 10, ionCannon: 10, espionageProbe: 5, solarSatellite: 5 },
  destroyer:    { battleship: 2, lightLaser: 10, plasmaTurret: 2, espionageProbe: 5, solarSatellite: 5 },
  deathStar:    { smallCargo: 250, largeCargo: 250, lightFighter: 200, heavyFighter: 100, cruiser: 33,
                  battleship: 30, battlecruiser: 15, recycler: 250, bomber: 25, destroyer: 5, rocketLauncher: 200,
                  lightLaser: 200, heavyLaser: 100, gaussCannon: 50, ionCannon: 100,
                  espionageProbe: 1250, solarSatellite: 1250 },
};

// Anzeigename einer Einheit (Schiff oder Verteidigung) aus den kanonischen Namensmaps.
export function getUnitName(key: UnitKey): string {
  return (SHIP_NAMES as Record<string, string>)[key]
    ?? (DEFENSE_NAMES as Record<string, string>)[key]
    ?? key;
}

// Rapidfire-Wert des Angreifers gegen ein Ziel (0 = kein Rapidfire).
export function getRapidFire(attacker: UnitKey, target: UnitKey): number {
  return RAPID_FIRE[attacker]?.[target] ?? 0;
}

// "gegen"-Liste: worauf diese Einheit Rapidfire hat.
export function getRapidFireAgainst(unit: UnitKey): string[] {
  const targets = RAPID_FIRE[unit];
  if (!targets) return [];
  return Object.entries(targets).map(([target, value]) => `${value}× gegen ${getUnitName(target as UnitKey)}`);
}

// "von"-Liste: welche Einheiten Rapidfire gegen diese Einheit haben (abgeleitet).
export function getRapidFireFrom(unit: UnitKey): string[] {
  const result: string[] = [];
  for (const attacker of Object.keys(RAPID_FIRE) as UnitKey[]) {
    const value = RAPID_FIRE[attacker]?.[unit];
    if (value) result.push(`${value}× von ${getUnitName(attacker)}`);
  }
  return result;
}

// Einheitliche Anzeigeliste (gegen + von) für Schiffe und Verteidigung.
export function getRapidFireList(unit: UnitKey): string[] {
  const list = [...getRapidFireAgainst(unit), ...getRapidFireFrom(unit)];
  return list.length > 0 ? list : ['Kein Rapidfire'];
}

// --- Formeln ---

// Base hourly production (unupgraded)
export const BASE_PRODUCTION = {
  metal: 30,
  crystal: 15,
  deuterium: 0,
};

// Calculate mine production per hour (NOT scaled by multiplier yet)
export function getMetalMineProduction(level: number, temperatureMax: number): number {
  if (level === 0) return 0;
  return Math.round(30 * level * Math.pow(1.1, level));
}

export function getCrystalMineProduction(level: number, temperatureMax: number): number {
  if (level === 0) return 0;
  return Math.round(20 * level * Math.pow(1.1, level));
}

export function getDeuteriumSynthesizerProduction(level: number, temperatureMax: number): number {
  if (level === 0) return 0;
  // Deuterium Synthesizer is more efficient on colder planets
  const tempCorrection = 1.05 - 0.01 * temperatureMax;
  return Math.round(10 * level * Math.pow(1.1, level) * Math.max(0.5, tempCorrection));
}

// Calculate Energy Production & Consumption
export function getSolarPowerPlantProduction(level: number): number {
  return Math.round(20 * level * Math.pow(1.1, level));
}

export function getMetalMineEnergyConsumption(level: number): number {
  return Math.round(10 * level * Math.pow(1.1, level));
}

export function getCrystalMineEnergyConsumption(level: number): number {
  return Math.round(10 * level * Math.pow(1.1, level));
}

export function getDeuteriumSynthesizerEnergyConsumption(level: number): number {
  return Math.round(20 * level * Math.pow(1.1, level));
}

// Fusion Power Plant Production (Fusionskraftwerk)
export function getFusionPowerPlantProduction(level: number, energyTechLevel: number): number {
  if (!level || level === 0) return 0;
  return Math.round(30 * level * Math.pow(1.05 + energyTechLevel * 0.01, level));
}

// Fusion Power Plant Deuterium Consumption per hour
export function getFusionPowerPlantDeuteriumConsumption(level: number): number {
  if (!level || level === 0) return 0;
  return Math.round(10 * level * Math.pow(1.1, level));
}

// Standard storage capacity calculation (redesign: 5000 * Math.floor(2.5 * Math.exp((20 * level) / 33)))
// User wants storage buildings to have twice the effect as original!
export function getMaxStorage(level: number): number {
  if (!level || level === 0) return 10000; // Base storage capacity: 10,000
  const originalCapacity = 5000 * Math.floor(2.5 * Math.exp((20 * level) / 33));
  return originalCapacity * 2; // Twice the effect
}

export function getPlanetStorageCapacities(buildings: Buildings): Resources {
  return {
    metal: getMaxStorage(buildings.metalStorage || 0),
    crystal: getMaxStorage(buildings.crystalStorage || 0),
    deuterium: getMaxStorage(buildings.deuteriumStorage || 0),
  };
}

export function getEnergyStatus(
  buildings: Buildings,
  solarSatellitesCount: number = 0,
  temperatureMax: number = 0,
  energyTechLevel: number = 0,
  fusionActive: boolean = true,
  speedMultiplier: number = 1,
  extraConsumption: number = 0 // zusätzlicher Verbrauch, z.B. Materieumwandler eines Mondes
): { produced: number; consumed: number; ratio: number; satelliteProductionPerUnit: number } {
  const basePower = getSolarPowerPlantProduction(buildings.solarPowerPlant || 0);
  // Energie ist eine reine Bilanz/Ratio und speed-unabhängig: KEIN speedMultiplier (der Parameter
  // bleibt aus Kompatibilitätsgründen erhalten, wird hier aber bewusst nicht mehr angewandt).
  const fusionPower = fusionActive ? getFusionPowerPlantProduction(buildings.fusionPowerPlant || 0, energyTechLevel) : 0;

  // OGame redesign formula: energy per satellite = Math.floor((maxTemp + 140) / 6), min 1.
  const satPowerPerUnit = Math.max(1, Math.floor((temperatureMax + 140) / 6));
  const satPowerTotal = solarSatellitesCount * satPowerPerUnit;
  const produced = basePower + satPowerTotal + fusionPower;

  const consumed =
    getMetalMineEnergyConsumption(buildings.metalMine || 0) +
    getCrystalMineEnergyConsumption(buildings.crystalMine || 0) +
    getDeuteriumSynthesizerEnergyConsumption(buildings.deuteriumSynthesizer || 0) +
    Math.max(0, extraConsumption);

  const ratio = consumed === 0 ? 1.0 : Math.min(1.0, produced / consumed);
  return { produced, consumed, ratio, satelliteProductionPerUnit: satPowerPerUnit };
}

// Resource production per hour taking energy efficiency and game speed multiplier into account
export function getPlanetProductionPerHour(
  buildings: Buildings,
  tempMax: number,
  speedMultiplier: number,
  solarSatellitesCount: number = 0,
  energyTechLevel: number = 0,
  fusionActive: boolean = true,
  plasmaTechLevel: number = 0,
  extraConsumption: number = 0 // zusätzlicher Energieverbrauch (z.B. Materieumwandler eines Mondes)
): Resources {
  const { ratio } = getEnergyStatus(buildings, solarSatellitesCount, tempMax, energyTechLevel, fusionActive, speedMultiplier, extraConsumption);

  // Base resources are always produced and do not require energy
  let metalBase = BASE_PRODUCTION.metal + getMetalMineProduction(buildings.metalMine || 0, tempMax) * ratio;
  let crystalBase = BASE_PRODUCTION.crystal + getCrystalMineProduction(buildings.crystalMine || 0, tempMax) * ratio;
  
  // Deuterium synthesis produces deuterium (which requires energy), but we subtract the fusion power plant consumption
  let synthProductionBase = BASE_PRODUCTION.deuterium + getDeuteriumSynthesizerProduction(buildings.deuteriumSynthesizer || 0, tempMax) * ratio;

  // Apply Plasmatechnik bonuses:
  // Metal: +1.0% per level
  // Crystal: +0.66% per level
  // Deuterium: +0.33% per level
  metalBase *= (1 + plasmaTechLevel * 0.01);
  crystalBase *= (1 + plasmaTechLevel * 0.0066);
  synthProductionBase *= (1 + plasmaTechLevel * 0.0033);

  const metal = Math.round(metalBase * speedMultiplier);
  const crystal = Math.round(crystalBase * speedMultiplier);
  const synthProduction = Math.round(synthProductionBase * speedMultiplier);
  const fusionConsumption = fusionActive ? Math.round(getFusionPowerPlantDeuteriumConsumption(buildings.fusionPowerPlant || 0) * speedMultiplier) : 0;
  const deuterium = Math.max(0, synthProduction - fusionConsumption);

  return { metal, crystal, deuterium };
}

// Building Upgrade Cost calculation.
// Materialforschung (materialScienceLevel) senkt den Kosten-*Anstieg* aller Gebäude um 1%/Stufe
// (rückwirkend, keine Erstattung). Wirkt auf den effektiven Faktor:
//   effFactor = 1 + (factor - 1) * max(0, 1 - 0.01 * level)
export function getBuildingUpgradeCost(
  type: keyof Buildings,
  currentLevel: number,
  materialScienceLevel: number = 0
): Resources {
  const config = BUILDING_BASE_COSTS[type];
  const nextLevel = currentLevel + 1;
  const reduction = Math.max(0, 1 - 0.01 * (materialScienceLevel || 0));
  const effFactor = 1 + (config.factor - 1) * reduction;
  const multiplier = Math.pow(effFactor, nextLevel - 1);

  return {
    metal: Math.floor(config.metal * multiplier),
    crystal: Math.floor(config.crystal * multiplier),
    deuterium: Math.floor(config.deuterium * multiplier),
  };
}

// Research Upgrade Cost calculation
export function getResearchUpgradeCost(type: keyof Research, currentLevel: number): Resources {
  const config = RESEARCH_BASE_COSTS[type];
  const nextLevel = currentLevel + 1;
  const multiplier = Math.pow(config.factor, nextLevel - 1);

  return {
    metal: Math.floor(config.metal * multiplier),
    crystal: Math.floor(config.crystal * multiplier),
    deuterium: Math.floor(config.deuterium * multiplier),
  };
}

// Check if player has enough resources
export function hasEnoughResources(available: Resources, cost: Resources): boolean {
  return (
    available.metal >= cost.metal &&
    available.crystal >= cost.crystal &&
    available.deuterium >= cost.deuterium
  );
}

// Calculate Building duration in seconds
const ECONOMIC_BUILDINGS = new Set<string>([
  'metalMine',
  'crystalMine',
  'deuteriumSynthesizer',
  'solarPowerPlant',
  'fusionPowerPlant',
  'metalStorage',
  'crystalStorage',
  'deuteriumStorage'
]);

export function getBuildingBuildDuration(
  type: keyof Buildings,
  level: number,
  roboticsFactoryLevel: number,
  speedMultiplier: number,
  naniteFactoryLevel: number = 0
): number {
  const cost = getBuildingUpgradeCost(type, level - 1);
  const totalCost = cost.metal + cost.crystal;
  const divisor = 2500 * (1 + roboticsFactoryLevel) * Math.pow(2, naniteFactoryLevel);
  const timeInHours = totalCost / divisor;
  let seconds = (timeInHours * 3600) / speedMultiplier;
  if (ECONOMIC_BUILDINGS.has(type)) {
    seconds *= 0.5; // Halve economic building build times
  }
  return Math.max(1, Math.round(seconds));
}

// Calculate Research duration in seconds
export function getResearchDuration(
  type: keyof Research,
  level: number,
  researchLabLevel: number,
  speedMultiplier: number
): number {
  const cost = getResearchUpgradeCost(type, level - 1);
  const totalCost = cost.metal + cost.crystal;
  const divisor = 1000 * (1 + researchLabLevel);
  const timeInHours = totalCost / divisor;
  const seconds = ((timeInHours * 3600) / speedMultiplier) * 0.5; // Halve research times
  return Math.max(1, Math.round(seconds));
}

// Helper to calculate effective research lab level for a player using Intergalactic Research Network
export function getEffectiveResearchLabLevel(
  currentPlanetId: string,
  allPlayerPlanets: { id: string; ownerId: string | null; buildings: Buildings }[],
  irnLevel: number
): number {
  const currentPlanet = allPlayerPlanets.find(p => p.id === currentPlanetId);
  if (!currentPlanet) return 0;
  
  const baseLabLevel = currentPlanet.buildings.researchLab || 0;
  if (!irnLevel || irnLevel <= 0) return baseLabLevel;

  // Filter other planets owned by the same player
  const otherPlanets = allPlayerPlanets.filter(
    p => p.id !== currentPlanetId && p.ownerId === currentPlanet.ownerId
  );

  // Sort other labs by descending level
  const otherLabs = otherPlanets
    .map(p => p.buildings.researchLab || 0)
    .sort((a, b) => b - a);

  // Sum up to irnLevel highest labs
  const linkedLabsSum = otherLabs
    .slice(0, irnLevel)
    .reduce((sum, lvl) => sum + lvl, 0);

  return baseLabLevel + linkedLabsSum;
}

// Calculate Ship/Defense build duration in seconds
export function getShipyardBuildDuration(
  cost: Resources,
  shipyardLevel: number,
  roboticsFactoryLevel: number,
  speedMultiplier: number,
  naniteFactoryLevel: number = 0
): number {
  const totalCost = cost.metal + cost.crystal;
  const divisor = 2500 * (1 + shipyardLevel) * Math.pow(2, naniteFactoryLevel); // OGame formula scales building time with Nanite Factory level
  const timeInHours = totalCost / divisor;
  const seconds = (timeInHours * 3600) / speedMultiplier;
  return Math.max(1, Math.round(seconds));
}

// Distance between systems / coordinates
export function getDistance(sys1: number, slot1: number, sys2: number, slot2: number): number {
  if (sys1 !== sys2) {
    return 20000 * Math.abs(sys1 - sys2);
  }
  if (slot1 !== slot2) {
    return 2700 + 95 * Math.abs(slot1 - slot2);
  }
  return 5; // same planet (e.g. moon to planet)
}

// Fleet flight duration in seconds
export function getFlightDuration(
  distance: number,
  maxSpeed: number,
  speedPercent: number = 100, // 10 to 100 %
  speedMultiplier: number
): number {
  // OGame Formula: duration = 10 + (3500 * sqrt( (10 * distance) / maxSpeed ) / speedPercent)
  // Let's divide by speedMultiplier to allow real-time speeds!
  const duration = Math.round(10 + (3500 / speedPercent) * Math.sqrt((10 * distance) / maxSpeed));
  return Math.max(5, Math.round(duration / speedMultiplier));
}

// Maximum speed of fleet based on drive levels
export function getShipSpeed(shipType: keyof Ships, research: Research): number {
  // Let's approximate OGame's base speeds and drive scaling:
  // Combustion Drive adds 10% speed per level
  // Impulse Drive adds 20% speed per level
  // Hyperspace Drive adds 30% speed per level
  const baseSpeeds: Record<keyof Ships, { base: number; drive: 'combustion' | 'impulse' | 'hyperspace' }> = {
    smallCargo: { base: 5000, drive: 'combustion' }, // increases with impulse lvl 5 later but let's keep it simple
    largeCargo: { base: 7500, drive: 'combustion' },
    lightFighter: { base: 12500, drive: 'combustion' },
    heavyFighter: { base: 10000, drive: 'impulse' },
    cruiser: { base: 15000, drive: 'impulse' },
    battleship: { base: 10000, drive: 'hyperspace' },
    battlecruiser: { base: 10000, drive: 'hyperspace' },
    colonyShip: { base: 2500, drive: 'impulse' },
    recycler: { base: 2000, drive: 'combustion' },
    espionageProbe: { base: 100000000, drive: 'combustion' },
    bomber: { base: 4000, drive: 'impulse' }, // can upgrade with hyperspace lvl 8
    destroyer: { base: 5000, drive: 'hyperspace' },
    deathStar: { base: 100, drive: 'hyperspace' },
    solarSatellite: { base: 0, drive: 'combustion' },
  };

  const shipInfo = baseSpeeds[shipType];
  let multiplier = 1;
  if (shipInfo.drive === 'combustion') {
    multiplier = 1 + research.combustionDrive * 0.1;
  } else if (shipInfo.drive === 'impulse') {
    multiplier = 1 + research.impulseDrive * 0.2;
  } else if (shipInfo.drive === 'hyperspace') {
    multiplier = 1 + research.hyperspaceDrive * 0.3;
  }

  return shipInfo.base * multiplier;
}

// Get maximum speed of a mixed fleet
export function getFleetSpeed(ships: Ships, research: Research): number {
  let minSpeed = Infinity;
  for (const [shipType, count] of Object.entries(ships)) {
    if (count > 0) {
      const speed = getShipSpeed(shipType as keyof Ships, research);
      if (speed < minSpeed) {
        minSpeed = speed;
      }
    }
  }
  return minSpeed === Infinity ? 0 : minSpeed;
}

// Get cargo capacity of ships
export function getShipCargoCapacity(shipType: keyof Ships): number {
  const capacities: Record<keyof Ships, number> = {
    smallCargo: 5000,
    largeCargo: 25000,
    lightFighter: 50,
    heavyFighter: 100,
    cruiser: 800,
    battleship: 1500,
    battlecruiser: 750,
    colonyShip: 7500,
    recycler: 20000,
    espionageProbe: 5,
    bomber: 500,
    destroyer: 2000,
    deathStar: 1000000,
    solarSatellite: 0,
  };
  return capacities[shipType];
}

export function getFleetCargoCapacity(ships: Ships): number {
  let total = 0;
  for (const [shipType, count] of Object.entries(ships)) {
    total += count * getShipCargoCapacity(shipType as keyof Ships);
  }
  return total;
}

// Deuterium fuel consumption for flight
export function getFlightFuelConsumption(
  ships: Ships,
  distance: number,
  speedPercent: number = 100
): number {
  // Approximate consumption
  // OGame: fuel = 1 + round(sum(shipConsumption * shipCount) * (distance / 35000) * (speedPercent/100 + 1)^2)
  const baseConsumptions: Record<keyof Ships, number> = {
    smallCargo: 10,
    largeCargo: 50,
    lightFighter: 20,
    heavyFighter: 75,
    cruiser: 300,
    battleship: 500,
    battlecruiser: 250,
    colonyShip: 1000,
    recycler: 300,
    espionageProbe: 1,
    bomber: 1000,
    destroyer: 1000,
    deathStar: 1,
    solarSatellite: 0,
  };

  let shipSum = 0;
  for (const [shipType, count] of Object.entries(ships)) {
    if (shipType === 'solarSatellite') continue;
    shipSum += count * (baseConsumptions[shipType as keyof Ships] || 0);
  }

  const speedFactor = Math.pow(speedPercent / 100 + 1, 2);
  const consumption = 1 + Math.round(shipSum * (distance / 35000) * speedFactor * 0.5);
  return consumption;
}

// --- REQUIREMENT CHECKS & TECH TREE (OGAME REDESIGN STYLE) ---

export interface Requirement {
  buildings?: Partial<Record<keyof Buildings, number>>;
  research?: Partial<Record<keyof Research, number>>;
}

export const BUILDING_REQUIREMENTS: Record<keyof Buildings, Requirement> = {
  metalMine: {},
  crystalMine: {},
  deuteriumSynthesizer: {},
  solarPowerPlant: {},
  fusionPowerPlant: { buildings: { deuteriumSynthesizer: 5 }, research: { energy: 3 } },
  roboticsFactory: {},
  naniteFactory: { buildings: { roboticsFactory: 10 }, research: { computer: 10 } },
  shipyard: { buildings: { roboticsFactory: 2 } },
  researchLab: {},
  terraformer: { buildings: { roboticsFactory: 10 }, research: { energy: 12 } },
  missileSilo: { buildings: { shipyard: 1 } },
  metalStorage: {},
  crystalStorage: {},
  deuteriumStorage: {},
  moonCannon: { buildings: { roboticsFactory: 4 } },
  // mondbasis benötigt nur das (immer vorhandene) Basis-Mondfeld
  mondbasis: {},
  // matterConverter: mondbasis auf dem Mond; die Mondkanone auf dem Elternplaneten
  // wird als körperübergreifender Sonderfall in canBuildOnBody geprüft.
  matterConverter: { buildings: { mondbasis: 1 } },
  jumpGate: { buildings: { mondbasis: 1 }, research: { hyperspaceDrive: 7 } },
};

export const RESEARCH_REQUIREMENTS: Record<keyof Research, Requirement> = {
  espionage: { buildings: { researchLab: 3 } },
  computer: { buildings: { researchLab: 1 } },
  weapons: { buildings: { researchLab: 4 } },
  shielding: { buildings: { researchLab: 6 }, research: { energy: 3 } },
  armour: { buildings: { researchLab: 2 } },
  energy: { buildings: { researchLab: 1 } },
  combustionDrive: { buildings: { researchLab: 1 }, research: { energy: 1 } },
  impulseDrive: { buildings: { researchLab: 2 }, research: { energy: 1 } },
  hyperspaceDrive: { buildings: { researchLab: 7 }, research: { energy: 5 } },
  astrophysics: { buildings: { researchLab: 3 }, research: { espionage: 4, impulseDrive: 3 } },
  laserTech: { buildings: { researchLab: 1 }, research: { energy: 2 } },
  ionTech: { buildings: { researchLab: 4 }, research: { energy: 4, laserTech: 5 } },
  plasmaTech: { buildings: { researchLab: 4 }, research: { energy: 8, laserTech: 10, ionTech: 5 } },
  intergalacticResearchNetwork: { buildings: { researchLab: 10 }, research: { computer: 8, hyperspaceDrive: 8 } },
  materialScience: { buildings: { researchLab: 2 } },
  moonExpedition: { buildings: { researchLab: 3 } },
};

export const SHIP_REQUIREMENTS: Record<keyof Ships, Requirement> = {
  smallCargo: { buildings: { shipyard: 2 }, research: { combustionDrive: 2 } },
  largeCargo: { buildings: { shipyard: 4 }, research: { combustionDrive: 6 } },
  lightFighter: { buildings: { shipyard: 1 }, research: { combustionDrive: 1 } },
  heavyFighter: { buildings: { shipyard: 3 }, research: { armour: 2, impulseDrive: 2 } },
  cruiser: { buildings: { shipyard: 5 }, research: { impulseDrive: 4, laserTech: 3 } },
  battleship: { buildings: { shipyard: 7 }, research: { hyperspaceDrive: 4 } },
  battlecruiser: { buildings: { shipyard: 8 }, research: { laserTech: 12, hyperspaceDrive: 5 } },
  colonyShip: { buildings: { shipyard: 4 }, research: { impulseDrive: 3 } },
  recycler: { buildings: { shipyard: 4 }, research: { combustionDrive: 6, shielding: 2 } },
  espionageProbe: { buildings: { shipyard: 3 }, research: { combustionDrive: 3, espionage: 2 } },
  bomber: { buildings: { shipyard: 8 }, research: { impulseDrive: 6, shielding: 5 } },
  destroyer: { buildings: { shipyard: 9 }, research: { hyperspaceDrive: 5 } },
  deathStar: { buildings: { shipyard: 12 }, research: { hyperspaceDrive: 7, shielding: 10, energy: 10 } },
  solarSatellite: { buildings: { shipyard: 1 } },
};

export const DEFENSE_REQUIREMENTS: Record<keyof Defense, Requirement> = {
  rocketLauncher: { buildings: { shipyard: 1 } },
  lightLaser: { buildings: { shipyard: 2 }, research: { laserTech: 3 } },
  heavyLaser: { buildings: { shipyard: 4 }, research: { laserTech: 6 } },
  gaussCannon: { buildings: { shipyard: 6 }, research: { energy: 6, weapons: 3 } },
  ionCannon: { buildings: { shipyard: 4 }, research: { ionTech: 4 } },
  plasmaTurret: { buildings: { shipyard: 8 }, research: { plasmaTech: 5 } },
  smallShieldDome: { buildings: { shipyard: 1 }, research: { shielding: 2 } },
  largeShieldDome: { buildings: { shipyard: 6 }, research: { shielding: 6 } },
};

export function isRequirementMet(
  req: Requirement,
  currentBuildings: Buildings,
  currentResearch: Research
): boolean {
  if (req.buildings) {
    for (const [bKey, minLvl] of Object.entries(req.buildings)) {
      if ((currentBuildings[bKey as keyof Buildings] || 0) < (minLvl || 0)) {
        return false;
      }
    }
  }
  if (req.research) {
    for (const [rKey, minLvl] of Object.entries(req.research)) {
      if ((currentResearch[rKey as keyof Research] || 0) < (minLvl || 0)) {
        return false;
      }
    }
  }
  return true;
}

// --- MOND-MECHANIK ---

// Gebäude, die nur auf Monden gebaut werden können.
export const MOON_BUILDINGS: (keyof Buildings)[] = [
  'mondbasis',
  'roboticsFactory',
  'shipyard',
  'matterConverter',
  'jumpGate',
];

// Gebäude, die ausschließlich auf einem Mond existieren dürfen (nicht auf Planeten).
const MOON_ONLY_BUILDINGS = new Set<keyof Buildings>(['mondbasis', 'matterConverter', 'jumpGate']);

// Gebäude, die ausschließlich auf Planeten existieren dürfen (nicht auf Monden).
const PLANET_ONLY_BUILDINGS = new Set<keyof Buildings>(['moonCannon']);

// Maximale Ausbaustufe eines Gebäudes (Infinity = unbegrenzt).
export function getMaxBuildingLevel(type: keyof Buildings): number {
  if (type === 'moonCannon' || type === 'jumpGate') return 1;
  return Infinity;
}

// Liefert die auf einem Körper (Planet/Mond) grundsätzlich baubaren Gebäude.
export function getBuildableBuildingsForBody(isMoon: boolean): (keyof Buildings)[] {
  if (isMoon) return [...MOON_BUILDINGS];
  return (Object.keys(BUILDING_NAMES) as (keyof Buildings)[]).filter(b => !MOON_ONLY_BUILDINGS.has(b));
}

export function isBuildingAllowedOnBody(type: keyof Buildings, isMoon: boolean): boolean {
  if (isMoon) return MOON_BUILDINGS.includes(type);
  return !MOON_ONLY_BUILDINGS.has(type);
}

// Zentrale Bau-Prüfung: Körper-Whitelist + Standard-Voraussetzungen + Sonderfälle
// (Materieumwandler benötigt eine Mondkanone auf dem Elternplaneten) + Maximalstufe.
export function canBuildOnBody(
  body: Planet,
  type: keyof Buildings,
  parentPlanet: Planet | null | undefined,
  research: Research
): boolean {
  if (!isBuildingAllowedOnBody(type, body.isMoon)) return false;
  if ((body.buildings[type] || 0) >= getMaxBuildingLevel(type)) return false;
  if (!isRequirementMet(BUILDING_REQUIREMENTS[type], body.buildings, research)) return false;
  // Körperübergreifender Sonderfall: Materieumwandler setzt Mondkanone auf dem Planeten voraus.
  if (type === 'matterConverter') {
    if (!parentPlanet || (parentPlanet.buildings.moonCannon || 0) < 1) return false;
  }
  return true;
}

// Maximale Baufelder eines Mondes: 1 Basisfeld + Mondexpedition-Forschung (+1/Stufe)
// + Mondbasis-Gebäude (+3 Felder/Stufe).
export function getMoonMaxFields(mondbasisLevel: number, moonExpeditionLevel: number): number {
  return 1 + (moonExpeditionLevel || 0) + 3 * (mondbasisLevel || 0);
}

// Effektive maximale Baufelder inkl. Terraformer-Bonus (+5 je Stufe, nur Planeten).
// Monde nutzen ihre dynamisch gesetzte maxFields (getMoonMaxFields) unverändert weiter.
export function getEffectiveMaxFields(planet: Planet): number {
  return planet.maxFields + (planet.isMoon ? 0 : 5 * (planet.buildings.terraformer || 0));
}

// Monddurchmesser bei Erschaffung (OGame-Formel, hier fix mit 20% Entstehungswahrscheinlichkeit):
//   floor((x + 3 * chance)^0.5 * 1000), x = Zufallszahl 10..20
export function getMoonDiameter(chancePercent: number = 20): number {
  const x = 10 + Math.random() * 10; // 10..20
  return Math.floor(Math.sqrt(x + 3 * chancePercent) * 1000);
}

// --- MATERIEUMWANDLER (Mond) ---

// Pro Stunde verarbeitetes Metall (nicht mit speedMultiplier skaliert):
//   input(1) = 800; input(L) = input(L-1) + 150 * L * 1.1^L
export function getMatterConverterMetalInput(level: number): number {
  if (!level || level <= 0) return 0;
  let total = 800;
  for (let s = 2; s <= level; s++) {
    total += 150 * s * Math.pow(1.1, s);
  }
  return total;
}

// Umwandlungsfaktor: (1.02 + 0.98 * 0.85^(ST-1)) * 1.02^((laserTech + espionage) * 0.75)
// ST = Stufe des Gebäudes (level)
export function getMatterConverterFactor(level: number, laserTechLevel: number, espionageLevel: number): number {
  if (!level || level <= 0) return 0;
  const base = 1.02 + 0.98 * Math.pow(0.85, level - 1);
  const techBonus = Math.pow(1.02, ((laserTechLevel || 0) + (espionageLevel || 0)) * 0.75);
  return base * techBonus;
}

// Energieverbrauch des Materieumwandlers: 1600 * L * 1.1^L.
// Energie ist eine speed-unabhängige Bilanz → KEIN speedMultiplier (Parameter bleibt aus
// Kompatibilitätsgründen erhalten, wird aber nicht mehr angewandt).
export function getMatterConverterEnergyConsumption(level: number, _speedMultiplier: number = 1): number {
  if (!level || level <= 0) return 0;
  return Math.round(1600 * level * Math.pow(1.1, level));
}

// Materieumwandler-Ausstoß pro Stunde bei gegebenem Metall-Input (bereits energie-/verfügbarkeitsgedrosselt).
// 70% des umgewandelten Werts als Kristall, 30% als Deuterium.
export function getMatterConverterOutput(
  level: number,
  laserTechLevel: number,
  espionageLevel: number,
  metalInput: number
): { crystal: number; deuterium: number } {
  const factor = getMatterConverterFactor(level, laserTechLevel, espionageLevel);
  const converted = metalInput * factor;
  return {
    crystal: converted * 0.7,
    deuterium: converted * 0.3,
  };
}
