# Handoff — Stand 11.08.2026

Für die nächste Sitzung. Nächstes Vorhaben: **Wechsel von react-scripts auf Vite**.

---

## Wo wir stehen

Branch `feature/v1.3-dashboard`, 8 Commits über dem letzten Stand.
Alles auf der Testumgebung deployed und verifiziert.
**Produktion (kkd-fahrtenbuch.de) ist unangetastet** — dort läuft weiterhin der
alte Stand von `master`.

### Was zuletzt passiert ist

Ein Vollaudit (8 parallele Prüfläufe) fand zwei kritische Lücken, beide behoben
und am laufenden System nachgewiesen:

- **Kontoübernahme**: `/api/users/set-password` prüfte kein Ablaufdatum. Ein
  30 Tage alter Token wurde akzeptiert, danach war der Login möglich. Jetzt
  HTTP 400.
- **Falsche Abrechnungsbeträge**: Der Excel-Export rechnete den ganzen Zeitraum
  mit einem Stichtagssatz. An echten Daten geprüft: 40,42 € statt fälschlich
  45,22 €.

Dazu ~30 weitere Befunde (Details in `.planning/audits/20260810-vollaudit/BEFUNDE.md`).

### Zahlen

| | vorher | jetzt |
|---|---|---|
| CodeQL | 71 (50 hoch) | **0** |
| Dependabot Backend | 5 (1 kritisch, 2 hoch) | 2 moderate, nicht ausnutzbar |
| Dependabot Frontend | 25 | 25 — **das ist das nächste Thema** |
| CI-Build | schlug fehl | warnungsfrei |

---

## Nächstes Vorhaben: Vite statt react-scripts

### Warum

Alle 25 Frontend-Meldungen hängen an `react-scripts 5.0.1` (letzte Version von
2022, wird nicht mehr gepflegt): webpack, svgo, postcss, workbox, nth-check.
**Nichts davon landet im ausgelieferten Bundle** — die tatsächlich
ausgelieferten Bibliotheken (react, axios, react-router-dom, jszip) haben keine
offenen Advisories. Es ist also kein akutes Risiko, aber die Meldungen
verschwinden nur durch einen Wechsel des Build-Werkzeugs.

`npm audit fix --force` ist **keine** Option: Es setzt react-scripts auf die
Platzhalterversion 0.0.0 und zerstört den Build (geprüft).

Nebeneffekt: Der Build dauert derzeit ~40 s, mit Vite wären es wenige Sekunden.

### Ausgangslage (geprüft, Stand 11.08.)

- 59 Dateien, 10.733 Zeilen unter `frontend/src`
- **57 Dateien enthalten JSX, alle mit Endung `.js`** — Vite braucht dafür
  entweder Umbenennung auf `.jsx` oder eine esbuild-Konfiguration, die JSX in
  `.js` erlaubt. Umbenennen ist sauberer, erzeugt aber einen großen Diff;
  die Konfigurationsvariante ist in `vite.config.js` drei Zeilen.
- **Nur 7 `process.env`-Stellen** in 4 Dateien (`LoginPage.js` 4x,
  `LandingPage.js`, `SetPassword.js`, `InfoModal.js`). Vite nutzt
  `import.meta.env` mit `VITE_`-Präfix statt `REACT_APP_`.
- Keine absoluten Imports, kein `jsconfig.json` — nur relative Pfade, also
  keine Alias-Konfiguration nötig.
- Keine SVG-als-Komponente-Imports — das übliche Vite-Stolperfeld entfällt.
- `public/index.html` nutzt `%PUBLIC_URL%` (3 Stellen) → wird bei Vite zu
  relativen Pfaden, und die Datei wandert von `public/` nach `frontend/`.
- `"proxy": "http://localhost:5000"` in `package.json` → wird
  `server.proxy` in `vite.config.js`.
- Ein Test: `src/App.test.js`. `react-scripts test` fällt weg; entweder auf
  Vitest umstellen oder den Test streichen (er prüft nur, ob die App rendert).

### Was dabei nicht kaputtgehen darf

1. **Die Laufzeit-Konfiguration.** `frontend/public/config.js` wird beim
   Containerstart von `docker-entrypoint.sh` überschrieben — so lassen sich
   Titel und Registrierungsregeln pro Instanz setzen, ohne neu zu bauen. Diese
   Datei darf Vite **nicht** bundeln, sie muss als statische Datei erhalten
   bleiben und weiter über `window.appConfig` gelesen werden.
   Wichtig: Der Registrierungscode steht dort bewusst **nicht** mehr drin, nur
   `registrationCodeRequired: true|false`.
2. **Der Dockerfile** (`frontend/Dockerfile`) baut selbst (`RUN npm run build`)
   und kopiert `/app/build` nach nginx. Vite schreibt standardmäßig nach
   `dist/` — entweder `build.outDir: 'build'` setzen oder den Dockerfile
   anpassen.
3. **`REACT_APP_VERSION`** wird im Build-Skript aus `$npm_package_version`
   gesetzt und im Info-Dialog angezeigt. Vite-Äquivalent nötig
   (z. B. `define` in der Config).
4. **Der CI-Workflow** `.github/workflows/docker-publish.yml` — prüfen, ob er
   Build-Argumente übergibt, die sich ändern.

### Vorgehensvorschlag

1. Vite + `@vitejs/plugin-react` installieren, `vite.config.js` anlegen
   (`outDir: 'build'`, Proxy auf :5000, JSX-in-.js erlauben)
2. `index.html` von `public/` nach `frontend/` verschieben, `%PUBLIC_URL%`
   entfernen, Skript-Tag auf `/src/index.js` setzen
3. Die 7 `process.env.REACT_APP_*` auf `import.meta.env.VITE_*` umstellen;
   `.env`-Beispiele und `docker-entrypoint.sh` mitziehen
4. `react-scripts` entfernen, Skripte auf `vite` / `vite build` umstellen
5. Bauen, im Browser durchklicken (Login, Dashboard, Erfassungsflow,
   Excel-Export), dann auf die Testumgebung
6. `npm audit` gegenprüfen — Erwartung: deutlich weniger Meldungen

Realistischer Aufwand: eine Sitzung, wenn nichts Unerwartetes auftaucht.

---

## Umgebung

**Testumgebung** — hier wird deployed:
- `https://fahrtenbuch.godsapp.de`, Server `server.godsapp.de`
- Stack `/opt/stacks/fahrtenbuch/`, Repo-Checkout in `repo/`
- Deployment: `git pull` im Checkout, dann
  `docker-compose -f docker-compose.test.yml build backend frontend`
- **Achtung:** `docker-compose` v1 bricht dort beim Neuerstellen mit
  `KeyError: 'ContainerConfig'` ab. Workaround: Container per `docker rm -f`
  entfernen und mit `docker run` neu starten (Netzwerk `fahrtenbuch_default`,
  Alias `frontend`/`backend`, `--env-file .env`, Frontend zusätzlich
  `-p 9642:80` und die `nginx-proxy.conf` als Volume).
- **Die Testumgebung enthält eine Kopie der Produktionsdaten** — 29 echte
  Konten mit Namen und IBANs. Für Tests eigene Wegwerf-Konten anlegen und
  hinterher entfernen; Bestandsdaten nicht anfassen.

**Produktion** — nicht anfassen ohne ausdrückliche Ansage:
- `https://kkd-fahrtenbuch.de`, Server 185.248.143.234
- Stack `/opt/fahrtenbuch/`, DB als Bind-Mount unter `/opt/fahrtenbuch/db/mysql`

**Benachrichtigung:** ntfy-Topic `claude` auf `push.godsapp.de`. Anonym schlägt
fehl (403); Token temporär per SSH erzeugen, siehe
`~/.claude/projects/…/memory/reference_ntfy_push.md`.

---

## Was offen bleibt

- **Vite-Wechsel** (siehe oben) — das nächste Vorhaben
- **Merge nach `master` und Release** — der Feature-Branch trägt inzwischen
  erhebliche Änderungen
- **Produktions-Update** samt Auto-Deploy
- Sechs Fahrten von `Brinkmann` (Jan 2025, 42 km) verweisen auf einen
  gelöschten Abrechnungsträger und werden mit 0,00 € geführt. Der Fehler ist
  behoben, die Altdaten wurden auf Wunsch nicht korrigiert.
- Zwei Dependabot-Meldungen im Backend (uuid via exceljs) — nicht ausnutzbar,
  die Lücke betrifft `v3/v5/v6` mit `buf`-Parameter, exceljs nutzt `v4` ohne
  Puffer. Ein Fix ginge nur per Downgrade auf exceljs 3.4.0.
- Testdaten auf der Testumgebung aufräumen

---

## Arbeitsweise, die sich bewährt hat

- Vor dem Ändern am laufenden System prüfen, nicht nur im Code lesen — mehrere
  Agenten-Befunde entpuppten sich als Fehlalarm (offener MySQL-Port, der real
  dicht war), andere waren schlimmer als gemeldet.
- Nach jedem Block: bauen, deployen, im Browser gegenprüfen.
- Commit-Messages erklären das *Warum* und nennen die gemessenen Zahlen —
  das hat beim Wiedereinstieg mehrfach geholfen.
