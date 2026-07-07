# Bild-Assets (Orionkriege)

Alle Spielgrafiken liegen hier unter `public/images/` und werden zur Laufzeit über die URL
`/images/<ordner>/<name>.png` geladen. Jede Datei ist zunächst ein **schwarzer Platzhalter**.

## Auto-Fallback (wichtig)
Die Engine prüft beim Laden, ob eine Bilddatei **einfarbig** ist (wie das schwarze Startbild) oder
fehlt. In dem Fall wird das Bild **weggelassen** und die Oberfläche sieht aus wie ohne Bilder.
Sobald hier eine **echte, nicht-einfarbige** PNG mit demselben Namen abgelegt wird, erscheint sie
automatisch – ohne Codeänderung. (Logik: `src/utils/images.ts`.)

## Dateinamen = interne Keys
Die Namen entsprechen exakt den Keys aus `src/types.ts` (englisch). Nicht umbenennen.

| Ordner | Inhalt | Dateien |
|---|---|---|
| `buildings/` | Gebäude | `<key>.png` (metalMine, crystalMine, deuteriumSynthesizer, solarPowerPlant, fusionPowerPlant, roboticsFactory, naniteFactory, shipyard, researchLab, terraformer, missileSilo, metalStorage, crystalStorage, deuteriumStorage) |
| `research/` | Forschung | `<key>.png` (espionage, computer, weapons, shielding, armour, energy, combustionDrive, impulseDrive, hyperspaceDrive, astrophysics, laserTech, ionTech, plasmaTech, intergalacticResearchNetwork) |
| `ships/` | Schiffe | `<key>.png` (smallCargo, largeCargo, lightFighter, heavyFighter, cruiser, battleship, colonyShip, recycler, espionageProbe, bomber, destroyer, deathStar, solarSatellite) |
| `defense/` | Verteidigung | `<key>.png` (rocketLauncher, lightLaser, heavyLaser, gaussCannon, ionCannon, plasmaTurret, smallShieldDome, largeShieldDome) |
| `planets/` | Planeten-Hintergrund (Übersicht) | `hot-1..3.png`, `temperate-1..3.png`, `cold-1..3.png` |
| `backgrounds/` | Menü-Hintergründe je View | `overview, buildings, facilities, research, shipyard, defense, fleet, galaxy, empire, combat, debug` `.png` |

### Planeten
Die Kategorie richtet sich nach der Maximaltemperatur des Planeten
(`hot` ≥ 60 °C, `cold` ≤ 0 °C, sonst `temperate`). Aus den 3 Varianten wird pro Planet
**deterministisch** eine ausgewählt (stabil über die Planet-ID) – ein Planet zeigt also immer
dasselbe Bild.

## Zulässige / empfohlene Auflösungen
| Kategorie | Form | Empfohlen | Zulässig | Format |
|---|---|---|---|---|
| buildings/research/ships/defense (Thumbnails) | quadratisch | **256×256** | 128×128 – 512×512 | PNG (Transparenz ok) |
| planets/ (Header-Hintergrund) | frei | **1024×1024** | 256 – 2048 px | PNG/JPG |
| backgrounds/ (Menü-Hintergrund) | 16:9 | **1920×1080** | 1280×720 – 2560×1440 | PNG/JPG |

Im **Debug-Modus** warnt die Konsole (`[Asset] …`), wenn ein geladenes Bild außerhalb dieser
Grenzen liegt. Das Rendering wird dadurch nie blockiert.

> `_placeholder.png` ist die kanonische schwarze Vorlage (zum erneuten Zurücksetzen einzelner
> Slots). Sie wird vom Spiel nicht direkt referenziert.
