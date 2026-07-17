<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/3958c5ae-1ba8-456f-b292-a33a6bf5210d

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Spielstände zwischen Browsern übertragen

Der Spielstand wird **nicht** im Repository gespeichert, sondern im `localStorage` des
jeweiligen Browsers unter dem Schlüssel `orionkriege_savestate_v1`. Das bedeutet:

- Ein Stand auf Rechner/Browser A liegt **nicht** automatisch auf Rechner/Browser B —
  jeder Browser hat seinen eigenen `localStorage`.
- **Origin-gebunden:** Der Stand hängt an der Adresse (z. B. `http://localhost:3000`).
  Ein anderer Port oder eine andere Adresse = anderer Speicher.

### Stand manuell übertragen
1. Auf dem **Quell**-Browser die Entwicklerkonsole öffnen (F12) und ausführen — kopiert
   den Stand in die Zwischenablage:
   ```js
   copy(localStorage.getItem('orionkriege_savestate_v1'))
   ```
2. Auf dem **Ziel**-Browser das Spiel öffnen, dann in der Konsole (JSON-Text aus der
   Zwischenablage einfügen):
   ```js
   localStorage.setItem('orionkriege_savestate_v1', `<hier den kopierten JSON-Text einfügen>`)
   ```
3. Seite neu laden und im Hauptmenü **„Spielstand laden"** wählen.
