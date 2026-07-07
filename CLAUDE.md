# Projekt: Orionkriege (Browsergame)

> ⚠️ **Sonderfall – kein proALPHA/ABL.** Dieses Projekt ist eine **Ausnahme** vom üblichen
> proALPHA-Q0/LIT-Arbeitsablauf. Es handelt sich um eine **reine Web-App** (React/TypeScript),
> nicht um ABL-/OOABL-Code. Deshalb gilt hier **NICHT**:
> - kein Progress/ABL, keine `.cls`/`.p`/`.w`/`.i`-Quellen, keine ABL-Coderichtlinien;
> - kein PROPATH / keine `propath.txt` bzw. `.propath`, keine „Kundenanpassung-vor-Standard"-Logik;
> - **keine MCP-Server** – `ProalphaGate` und `lit-dev` sind hier nicht anwendbar und dürfen nicht
>   aufgerufen werden (kein Compile/Check/Format über MCP).
>
> Die allgemeinen/globalen Regeln aus der Benutzer-`CLAUDE.md` bleiben unverändert; dieser
> Sonderfall wird ausschließlich hier lokal dokumentiert. Gearbeitet wird rein dateibasiert;
> Verifikation über `npm`/TypeScript und den Browser (siehe unten).

---

## 1. Projektüberblick

**Orionkriege** ist ein webbasierter **OGame-Klon** im Sci-Fi-Weltraumsetting (Singleplayer).
Kernmerkmale:
- 10 Sonnensysteme, 1 menschlicher Spieler + 5 KI-Gegner.
- Ressourcen (Metall, Kristall, Deuterium), Gebäudeausbau, Forschung, Schiffswerft,
  Verteidigung, Flottenmissionen (Transport, Angriff, Spionage, Kolonisieren, Planet vernichten).
- Echtzeit-Simulation mit Geschwindigkeits-Multiplikator (1×/10×/100×/1000×) und
  **Offline-Simulation** beim Laden eines Spielstands.
- KI-Gegner mit eigener Bau-/Forschungs-/Angriffslogik.
- Siegbedingung: Vernichtung aller KI-Planeten (Todesstern-Angriff).

Ursprung: Google-AI-Studio-Template (`metadata.json`, `README.md`). Es gibt **kein Backend** –
der komplette Zustand lebt im Browser (`localStorage`). Die Template-Abhängigkeiten
`@google/genai`, `express`, `dotenv` sind aktuell **nicht** im Spielcode verwendet.

## 2. Setup & Befehle

```bash
npm install          # Abhängigkeiten installieren
npm run dev          # Dev-Server (Vite) auf Port 3000, Host 0.0.0.0
npm run build        # Produktions-Build (dist/)
npm run preview      # Build lokal ausliefern
npm run lint         # Typecheck: tsc --noEmit  (es gibt KEINEN ESLint)
```

- **Verifikation ohne MCP:** Nach Code-Änderungen `npm run lint` laufen lassen (reiner
  TypeScript-Check). Funktionaler Test über `npm run dev` bzw. die Browser-Preview.
- HMR kann via `DISABLE_HMR=true` deaktiviert werden (siehe `vite.config.ts`); Alias `@` → Projektwurzel.

## 3. Architektur & Datenfluss

- **Einstieg:** `src/main.tsx` → `src/App.tsx` (`<App/>` in React StrictMode).
- **Zentraler Zustand:** ein einziges `GameState`-Objekt im `useState` von `App.tsx`
  (`state`). Alle Mutationen laufen über `setState` mit neu erzeugten (immutablen) Objekten.
- **Tick-Loop** (`App.tsx`, `useEffect`, `setInterval` alle **1 s**):
  1. `simulateTimePassed(prev, now)` – rechnet die vergangene Zeit analytisch hoch
     (Produktion, Bau-/Werft-/Forschungs-Queues, Flottenankünfte, Kampf, Punkte).
  2. `runAILogic(state)` – KI-Entscheidungen (Bauen, Forschen, Kolonisieren, Angreifen).
- **Autosave:** `useEffect` mit `setInterval` alle **12 s** → `localStorage`
  (Key `orionkriege_savestate_v1`, Konstante `STORAGE_KEY` in `App.tsx`).
- **Offline-Simulation:** `handleLoadGame` misst `now - lastTickTimestamp`; bei > 5 s wird
  `simulateTimePassed` einmal über die gesamte Abwesenheit gerechnet und ein Offline-Modal gezeigt.
- Weil die Simulation zeitbasiert und analytisch ist, hängt fast alle Balance an den **Formeln**
  in `formulas.ts` und der Logik in `gameEngine.ts`.

## 4. Dateikarte

| Datei | Inhalt (mit Zeilenankern, Stand jetzt) |
|---|---|
| `src/main.tsx` | Bootstrap (React StrictMode). |
| `src/App.tsx` (~2633 Z.) | Zentrale Komponente: alle Views, Spielzustand, Tick-Loop, Autosave, sämtliche Handler. Siehe §5. |
| `src/types.ts` (~200 Z.) | Datenmodell (alle Interfaces). **Ankerpunkt für Erweiterungen.** |
| `src/utils/formulas.ts` (~647 Z.) | Reine Daten & Formeln: Namen, Kosten, Kampfwerte, Voraussetzungen, Produktion/Energie, Dauern, Flug/Distanz/Fracht. |
| `src/utils/gameEngine.ts` (~1663 Z.) | Spiellogik: `generateUniverse` (41), `simulateTimePassed` (304), `runCombat` (818), `runAILogic` (1207). |
| `src/components/MainMenu.tsx` | Startmenü (Speed-Auswahl, Neues Spiel, Debug-Modus, Laden). |
| `src/components/GalaxyView.tsx` | Galaxie-Browser + Flottenversand-Panel pro Slot. |
| `src/components/CombatLogsView.tsx` | Gefechts-/Spionageberichte (aufklappbar). |
| `src/index.css` | Tailwind v4 `@theme` + `theme-*`-Klassen (Dark-Design), Fonts. |
| `index.html` / `vite.config.ts` / `tsconfig.json` | Vite-/TS-Konfiguration, `@`-Alias. |

### `App.tsx` – Wichtige Fundstellen
- **Views (State `view`):** `menu`, `overview` (1123), `buildings` (1434), `facilities` (1758),
  `research` (1921), `shipyard` (2059), `defense` (2218), `fleet` (2339), `galaxy` (2480),
  `empire` (2489), `combat` (2576). Sidebar-Navigation ab Z. 1030, mobile Navi ab 1093.
- **Handler:** `handleNewGame` (299), `handleLoadGame` (307, inkl. Offline-Sim + Modal),
  `handleReturnToMenu` (339), `handleSelectPlanet` (354), `handleManualFleetLaunch` (363),
  `handleLaunchFleet` (398, geteilt mit `GalaxyView`), `handleUpgradeBuilding` (513),
  `handleDemolishBuilding` (575), `handleToggleFusion` (620), `handleSavePlanetName` (639),
  `handleCancelBuilding` (658), `handleStartResearch` (693), `handleCancelResearch` (758),
  `handleOrderShipyard` (806), `handleClearCombatLogs` (872).
- **Lokale UI-Daten:** `SHIP_RAPID_FIRE` (84, reine Anzeigetexte), `RESEARCH_DETAILS`
  (117, Beschreibung + kumulativer Effekt pro Forschung), `renderRequirementsList` (213).

## 5. Datenmodell (`types.ts`)

- `Resources` – `metal`, `crystal`, `deuterium`.
- `Buildings` / `Research` / `Ships` / `Defense` – jeweils ein flaches Objekt aus
  `Schlüssel → Stufe bzw. Anzahl`. Diese Keys sind die **kanonische Liste** aller Objekttypen;
  fast alle Maps in `formulas.ts` sind `Record<keyof X, …>` und müssen jeden Key abdecken.
- `Planet` – Position (`system` 1–10, `slot`), `ownerId` (`null` | `'player'` | `'ai1'..'ai5'`),
  Temperatur/Größe/Felder, `resources`, `buildings`, `ships`, `defense`, Bau-Queues
  (`activeBuildJob`/`activeBuildQueue`, `activeShipyardQueue`), `fusionActive?`.
- `Player` – `id`, `name`, `isAI`, `research`, Forschungs-Queue, `points`.
- `Fleet` – Herkunft/Ziel, `mission` (`MissionType`), geladene Schiffe/Ressourcen, Zeitstempel
  (`departureTime`/`arrivalTime`/`returnTime`), `isReturning`.
- `CombatLog` – Kampf-/Spionagebericht (Runden, Sieger, Loot, Verluste, Planetenzerstörung).
- `GameState` – `version`, `speedMultiplier`, `lastTickTimestamp`, `players`, `planets`,
  `fleets`, `combatLog`, `selectedPlanetId`, `debugMode?`. **Das ist das serialisierte Savegame.**

## 6. Spielmechanik – wo liegt was? (`formulas.ts`)

- **Anzeigenamen (DE):** `BUILDING_NAMES`, `RESEARCH_NAMES`, `SHIP_NAMES`, `DEFENSE_NAMES`.
- **Kosten:** `BUILDING_BASE_COSTS` / `RESEARCH_BASE_COSTS` (Basis + `factor`, Kosten =
  `base * factor^(level-1)`), `SHIP_COSTS`, `DEFENSE_COSTS` (fix pro Einheit).
- **Kampfwerte:** `SHIP_STATS` / `DEFENSE_STATS` (`structural`, `shield`, `attack`).
- **Voraussetzungen:** `BUILDING_/RESEARCH_/SHIP_/DEFENSE_REQUIREMENTS` + `isRequirementMet`.
- **Produktion/Energie:** `getMetalMineProduction` u. a., `getEnergyStatus`,
  `getPlanetProductionPerHour` (inkl. Plasmatechnik-Boni, Fusion-Verbrauch, Speed-Multiplikator).
- **Dauern:** `getBuildingBuildDuration`, `getResearchDuration`, `getShipyardBuildDuration`
  (Roboter-/Nanitenfabrik-, Werft-, Labor-Skalierung; Wirtschaftsgebäude & Forschung halbiert).
- **Lager:** `getMaxStorage` / `getPlanetStorageCapacities` (Kapazität = 2× Original).
- **Flug/Logistik:** `getDistance`, `getShipSpeed`/`getFleetSpeed`, `getFlightDuration`,
  `getShipCargoCapacity`/`getFleetCargoCapacity`, `getFlightFuelConsumption`.

Die eigentliche Anwendung dieser Formeln (Kampfablauf, KI, Zeit-Simulation) steht in
`gameEngine.ts` – siehe §4-Tabelle.

## 7. Änderungs-Rezepte

### Neues Gebäude / Schiff / Verteidigung / Forschung hinzufügen
Reihenfolge einhalten, sonst brechen die `Record<keyof X, …>`-Maps den Typecheck:
1. **`types.ts`** – neuen Key im passenden Interface (`Buildings`/`Ships`/`Defense`/`Research`)
   ergänzen.
2. **`formulas.ts`** – den Key in **allen** zugehörigen Maps nachziehen: Name(n), Kosten,
   ggf. `*_STATS`, `*_REQUIREMENTS`; für Schiffe zusätzlich `getShipSpeed` (baseSpeeds),
   `getShipCargoCapacity` und `getFlightFuelConsumption` (baseConsumptions).
3. **`gameEngine.ts`** – Initialbestände in `generateUniverse` (die vollständigen
   `ships`/`defense`/`buildings`-Literale, auch das Debug- und das Kolonie-Literal!), sowie
   `countShips`/`countDefense` und weitere vollständig aufgezählte Objektliterale
   (z. B. beim Zurücksetzen zerstörter Planeten, `shipsToSend`-Literale). **Alle** dieser
   Literale müssen den neuen Key enthalten. KI-Prioritätslisten (`shipTypesByPriority`,
   `defenseTypes`, `rOrder`) bei Bedarf erweitern.
4. **`App.tsx`** – im passenden View-Block wird meist über `Object.keys(...)` iteriert, sodass
   der Eintrag automatisch erscheint. Für Forschung zusätzlich `RESEARCH_DETAILS` ergänzen,
   für Schiffe optional `SHIP_RAPID_FIRE`. `GalaxyView` iteriert ebenfalls über `Ships`.

### Balancing anpassen (Kosten, Produktion, Dauer, Kampfwerte, Reichweite)
Nur **`formulas.ts`** anfassen (Maps/Formeln). Kein Modell- oder View-Eingriff nötig.

### Neue View / neuen Menüpunkt ergänzen
1. Nav-Item in der Liste ab `App.tsx:1030` (und optional mobile Navi ab 1093).
2. Neuen `{view === 'meineView' && ( … )}`-Block im Main-Content (`App.tsx` ab ~1123) ergänzen.
   Kommentar zur Screen-Liste steht bei `App.tsx:177`.

### Kampf / KI / Offline-Simulation ändern
Jeweils die entsprechende Funktion in `gameEngine.ts`: `runCombat` (Rundenlogik, Loot,
Todesstern), `runAILogic` (KI-Verhalten/Wahrscheinlichkeiten), `simulateTimePassed`
(Ressourcenfluss, Queue-Abarbeitung, Flottenankunft).

### Savegame-Kompatibilität beachten
Der komplette `GameState` wird als JSON in `localStorage` (`STORAGE_KEY` in `App.tsx`)
gespeichert. Bei Modelländerungen alte Stände berücksichtigen: neue Felder defensiv lesen
(`?? default`, `|| 0`) oder `GameState.version` erhöhen und Migration/Reset vorsehen. Ein
laufender Autosave überschreibt den Stand alle 12 s.

## 8. Konventionen

- **UI-Sprache: durchgängig Deutsch.** Interne Keys, Typnamen und Identifier bleiben Englisch.
- **Styling:** Tailwind CSS v4 (Utility-Klassen inline) + eigene `theme-*`-Klassen und
  CSS-Variablen aus `src/index.css`. Farbschema Dark/Slate; Icons via `lucide-react`,
  Animationen via `motion`.
- **State immutable** halten (neue Objekte/Arrays in Handlern, kein direktes Mutieren des
  React-States außerhalb der klonenden Engine-Funktionen).
- **`Record<keyof X, …>`-Muster:** Jede solche Map muss **alle** Keys des Interfaces abdecken –
  fehlt einer, schlägt `npm run lint` fehl. Das ist der beste Frühwarn-Check nach Erweiterungen.
- Bestehende Muster/Hilfsfunktionen bevorzugen; kleine, gezielte Änderungen; keine unnötigen
  Refactorings.

## 9. Verifikation

- **Immer nach Änderungen:** `npm run lint` (`tsc --noEmit`).
- **Funktional:** `npm run dev` starten und im Browser prüfen (Menü → Neues Spiel/Debug-Modus →
  betroffener View). Der **Debug-Modus** (Button im Hauptmenü, 100×, volle Ressourcen/Ausbau)
  eignet sich gut zum schnellen Testen von Bau-, Werft-, Kampf- und Flottenlogik.
- **Kein MCP-Compile/-Check** vorhanden (siehe Sonderfall-Hinweis oben). Wenn ein Check nicht
  ausführbar ist, den Grund nennen – keine erfolgreiche Prüfung behaupten, die nicht lief.
