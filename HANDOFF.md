# Handoff — Stand 24.09.2026, nachts

Ausgeliefert: **2.3.2 / iOS Build 32** (24.09., Lauf 35961508946 — der erste
mit korrekter Distribution-Signatur).
Im Arbeitsbaum steht **2.3.3 unreleased** — 17 Commits, noch **nicht
getaggt und nicht deployt**.

Tests: 502 Prüfungen in 29 Dateien (`cd backend && npm test`), alle grün.
Frontend-Build läuft.

---

## Was in dieser Nacht passiert ist

Die Liste der Pre-Launch-Prüfung vom 23./24.09. ist abgearbeitet. Jeder
Befund wurde **vor** dem Beheben gegen den Code geprüft; mehrere haben sich
dabei als anders herausgestellt als beschrieben (siehe „Korrekturen an der
alten Liste").

| Commit | Punkt | Inhalt |
|---|---|---|
| `a11dabe` | 1 | Erfassungsflow: „Erneut versuchen" statt Datenverlust |
| `f197018` | 2 | Zeitraum-Parameter geprüft (DoS-Pfad zu) |
| `76f0ad2` | 3 | Zeitraum-Status erst nach dem Ausliefern, in einer Transaktion |
| `58c755e` | 9 | Fehlergrenze um den ganzen Baum, Knopf „Neu laden" |
| `19057f5` | 5, 8 | Ladefehler sichtbar, Sitzungsablauf gemeldet |
| `e3fec81` | 4, 7 | Backend ohne root, Sicherheits-Kopfzeilen |
| `153a8f9` | 10 | Lazy-Imports wirken: Startlast 203 → 164 kB gzip |
| `ba41daa` | 6, 13 | Sheets fragen vor dem Verwerfen, Zurück-Taste eine Ebene hoch |
| `00add4e` | 15, 12 | Monatswechsel-Race, doppelte Sätze, Migration 0013 |
| `78cb9ea` | 11 | E-Mail-Kollision, Enumeration, Limits, npm audit 11 → 5 |
| `415b4b1` | 12 | N+1 weg, Datumsbereich statt YEAR/MONTH, Migration 0014 |
| `aaa55cc` | 12 | Kein Nachladen je Monat beim Einreichen |
| `342e93c` | 14, 12 | Beschriftungen, Trefferflächen, Healthcheck, Favorit |
| `5c40be6` | 15 | Zugangsdaten aus dem Protokoll, toter Code raus |
| `9bfd1f7` | 11, 15 | API-Schlüssel gehasht (Migration 0015), Profilname |
| `3e3021e` | 12 | Monatsübersicht in einem Abruf: App-Start 35 → 8 Anfragen |

Dazu: Git-Tags `v2.3.1` und `v2.3.2` nachgetragen (annotiert, auf ihren
Release-Commits; das Repo nutzt entgegen der globalen Notiz ein
`v`-Präfix).

### Gemessen, nicht geschätzt

- **Startlast**: 672.526 → 542.929 B roh, 203.187 → 163.707 B gzip (−19 %).
- **Monatsbericht** (50.000 Zeilen, MySQL 8.4 im Container): 1.250 → 28
  geprüfte Zeilen, 0,56 → 0,06 ms. An der echten Modellabfrage derselbe
  Sprung.
- **Nutzer-Enumeration**: Zeitunterschied 53,7 → 0,2 ms.
- **npm audit** (Backend): 11 → 5 Befunde.
- **App-Start**: 35 → 8 Anfragen (die Monatsübersicht allein 28 → 1).
- **Sicherheits-Kopfzeilen**: an allen sieben Pfaden gegen ein echtes
  nginx-Image geprüft, bei 200 wie bei 404, Cache-Header unverändert.
- **Healthcheck**: „Access denied" bei Exit-Code 0 nachgestellt — bestätigt.

---

## VOR DEM DEPLOY LESEN

**Drei Migrationen laufen beim ersten Start:**

- `0013` — UNIQUE auf `mitfahrer_erstattung (user_id, gueltig_ab)`.
  **Löscht Duplikate**, behält je Stichtag den zuletzt angelegten Satz.
  Gegen echte MySQL getestet; ob in der Produktion überhaupt Duplikate
  liegen, ist offen (nicht nachgesehen).
- `0014` — Index `fahrten (user_id, datum)`. Rein additiv.
- `0015` — API-Schlüssel werden gehasht, Klartext geleert. **Bestehende
  Kurzbefehle laufen weiter** (nachgewiesen), die Spalte bleibt als leere
  Hülle stehen.

Alle drei sind wiederholbar (Prüfung über `information_schema`) und gegen
MySQL 8.4 durchgespielt, auch der zweite Lauf.

**Zwei Dinge in der Produktion ansehen:**

1. `JWT_SECRET` in `stack.env`. Kürzer als 32 Zeichen ergibt beim Start
   eine **Warnung** im Log — bewusst kein Abbruch, damit der Server
   hochkommt. Ein Wechsel meldet alle Geräte einmal ab.
2. Der Backend-Container läuft jetzt als `node`. Die Produktions-Compose
   hat keinen Bind-Mount auf `/app`, das sollte passen — beim ersten
   Deploy trotzdem ins Log sehen.

**Caddy**: Die neuen Sicherheits-Kopfzeilen kommen aus dem
Frontend-Container. Setzt Caddy dieselben, stehen sie doppelt. Die
Caddy-Konfiguration liegt nicht im Repo — vor dem Deploy nachsehen.

---

## Korrekturen an der alten Liste

Beim Nachprüfen hat sich einiges anders dargestellt:

- **Punkt 1**: Die Eingaben waren *nicht* verloren — die POST-Schleife lief
  in einer Closure weiter. Es fehlte nur der Weg zurück.
- **Punkt 2**: Die vorgeschlagene Grenze von 24 Monaten hätte Nutzer
  getroffen: Die Jahresauswahl lässt 72 Monate zu. Jetzt 120. Außerdem
  hätten `z.coerce.number()`-Params den Einzelmonats-Export mit einem 500er
  gebrochen (`month.split` auf einer Zahl).
- **Punkt 5**: `useToast` war im AppContext längst verfügbar — ein
  Einzeiler, kein Umbau. `fehlerText` wird an 9 Stellen genutzt, nicht 2.
- **Punkt 8**: Der `isLoggingOut`-Guard war anders kaputt als beschrieben
  und bis dahin folgenlos — er wurde erst *durch* den neuen Toast zum
  Problem (35 Toasts). Deshalb zuerst der Guard, dann die Meldung.
- **Punkt 15**: Die genannten `.map`-Zeilen enthielten gar kein `.map`; die
  echte Stelle war `ErstattungBereich.js:23`. Es sind 111
  `console.error`-Stellen, nicht ~60. Der „Duplicate entry"-Handler im
  Frontend war toter Code: Die Erstattungs-Controller senden gar kein
  `error`-Feld — jetzt antworten sie mit 409.
- **Punkt 13**: `@capacitor/network` und `@capacitor/preferences` sind
  wirklich ungenutzt, bringen aber **kein** `ACCESS_NETWORK_STATE` mit —
  im Manifest steht es nicht.

---

## OFFEN

### Terminsache: Zertifikat läuft am 28.11.2026 ab

Seit dem 24.09. signieren **Fahrtenbuch, Konfi Quest und Moin Kark alle mit
demselben** Distribution-Zertifikat `D22NVZMW4W`. Es läuft in 66 Tagen ab.
Danach baut **keines der drei Projekte** mehr, bis ein neues erzeugt, als
`.p12` exportiert und in `IOS_DIST_P12_BASE64` hinterlegt ist — in allen drei
Repos. Das Distribution-Limit liegt bei 3, Platz zum Vorbereiten ist also da.

Hintergrund: Der iOS-Build signierte bis dahin mit Development-Zertifikaten,
die Xcode sich über `-allowProvisioningUpdates` selbst anlegte — pro Lauf
eines, bis das kontoweite Limit (2 für Development) mit 5 überzogen war.
Behoben an allen drei Projekten und je einmal per Lauf belegt; bei
Fahrtenbuch Lauf `35961508946`, Build 32. Die vier überzähligen Zertifikate
sind gelöscht, das Konto steht bei 2.

Was dabei leicht übersehen wird und im Kopf von `ios-release.yml` steht: Es
müssen **beide** Stellen manuell signieren — die Release-Konfiguration in
`project.pbxproj` **und** die ExportOptions. Laut `xcodebuild -help` legt
Xcode auch bei manuell signiertem Archiv noch Anmeldedaten an, wenn der
Export auf `automatic` steht.

### Braucht einen Build oder ein Gerät (deshalb heute Nacht nicht gemacht)

- **Ungenutzte Plugins entfernen** (`@capacitor/network`,
  `@capacitor/preferences`): braucht `cap sync` und einen Android-Build.
  Gewinn: etwas kleinere App, sonst nichts.
- **Kurzbefehl-Kaltstart auf iOS** (`Kurzbefehle.swift:53-58`): Der in `:57`
  versprochene Neuversuch beim Vordergrund-Wechsel fehlt. Auf langsamem Netz
  per Kaltstart prüfen.
- **Play Console**: App `de.godsapp.fahrtenbuch` ist **nicht angelegt**.
  Nötig: Konto-Typ klären (Personal = 12 Tester × 14 Tage Closed Testing),
  AAB, Play App Signing, Data-Safety, Content Rating, Datenschutz-URL.
  Ein `android-release.yml` analog zu `ios-release.yml` wäre ~½ Tag.
  **Achtung Actions-Kontingent**: Am 24.09. waren 1.849 von 2.000 Minuten
  verbraucht, Reset am 01.10. macOS-Runner zählen 10-fach, ein iOS-Build
  kostet real ~30–50 Minuten. In dieser Nacht wurde deshalb kein CI-Lauf
  gestartet.
- **Exportkonformität** pro Build von Hand (`usesNonExemptEncryption`).
  Könnte in `ios-release.yml` wandern.

### Bewusst verschoben

- **`fahrten.abrechnung` VARCHAR ohne Fremdschlüssel** (6 Fahrten zeigen auf
  den gelöschten Träger 19). Simons Entscheidung vom 24.09.: Daten bleiben.
- **`/var/lib/docker` 46 von 47 GB** — `docker system df` ansehen. Nicht
  angefasst, weil das den laufenden Betrieb berührt.
- **Rückspielung des DB-Dumps ungeprüft** — zuletzt 17.08., seither fünf
  Migrationen. Simon: erstmal ignorieren.
- **`user_profiles.email` ohne UNIQUE.** Die Kollisionsprüfung greift jetzt
  an allen drei Schreibwegen; ein Index dazu würde an vorhandenen Dubletten
  scheitern, ohne sie vorher zu prüfen. Dafür braucht es einen Blick in die
  Produktionsdaten.
- **Deploy-Skripte**: DB-Passwort per `-p"$kennwort"` auf der Kommandozeile
  (`deploy/deploy.sh:94-96`), `StrictHostKeyChecking=no` (`:44`).

### Bleibt bestehen

- **npm audit, 5 Befunde**: nodemon/semver sind Entwicklungswerkzeug und
  kommen wegen `--omit=dev` nicht ins Image. uuid/exceljs böte nur einen
  Major-Rückschritt; exceljs ruft nachweislich nur `uuidv4`, die Meldung
  betrifft v3/v5/v6 mit eigenem `buf`-Argument.
- **Drei der fünf gemeldeten Doppelklick-Stellen** sind harmlos: FahrtForm
  sendet ein idempotentes PUT, der Träger-Satz hängt an `idx_traeger_datum`,
  Benutzernamen sind UNIQUE.

---

## Weiterhin gültig aus dem alten Handoff

**Korrigierte Befunde — nicht nochmal jagen:**
Die iOS-Navigationsleiste **ist** auf iOS 26+ Apples echte
`UITabBarController` (die Eigenbau-View ist der Fallback für 15–25).
`sort -V` wählt bei den konkreten Xcode-Ständen richtig. Formel-Injection
im Excel-Export: ExcelJS schreibt `=…` als Shared-String, nicht als Formel.
Mandantentrennung: Jede UPDATE/DELETE trägt `AND user_id = ?`.

**Widget und Sprachsteuerung:** iOS/Siri ginge über App Intents (eine
Aufruf-Phrase, höchstens ein Parameter). Android/„Hey Google" geht nicht —
App Actions löst Gemini seit 04.09.2026 nicht mehr aus. Widget kann auf
keiner Plattform ein Formular zeigen. Simon hat entschieden: kein Widget,
kein Favoriten-Ausbau.

**Betrieb:** Backup `/opt/backups/backup.sh`, Cron 3:00, Hetzner Storage
Box, `stack.env` AES-256-verschlüsselt mit, Passphrase in
`/root/.backup-passphrase` und `KKD_BACKUP_PASSPHRASE`. Rotation lokal
14 Tage, auswärts keine (Box zu 80 % voll).

**iOS-Build:** `.github/workflows/ios-release.yml`, nur
`workflow_dispatch`. Version vorher in der pbxproj setzen und committen.
Grund für die CI: Simons Mac läuft auf macOS-Beta, Apple lehnt solche
Builds mit `ITMS-90111` ab.

## Arbeitsregeln

- **Emulator/Simulator nur auf ausdrückliche Ansage** — eine Freigabe gilt
  für den Anlass, nicht für die Sitzung. Ohne Emulator prüfbar:
  `./gradlew assembleDebug`, `aapt2 dump xmltree` aufs APK, `npm test`,
  `vite preview` im Browser.
- Testserver ist `server.godsapp.de`, **nicht** KKD.
- CHANGELOG bei jedem nutzersichtbaren Commit mitschreiben, OpenAPI bei
  jeder Routenänderung.
- Jeder Befund aus einem Audit ist eine **Behauptung**. Vor dem Beheben
  gegen den Code prüfen — in dieser Nacht lagen sechs von rund dreißig
  anders, als sie beschrieben waren.
