# Handoff — Stand 24.09.2026

Ausgeliefert: **2.3.2 / iOS Build 31** (in TestFlight, `IN_BETA_TESTING`).
Letzter Commit: `7d08404 release: 2.3.2`. Alles gepusht.

Diese Datei löst den Stand vom 21.08. ab (der sagte noch „Android: nie
gestartet" — Android läuft inzwischen).

---

## Woher die Liste kommt

Am 23./24.09. haben fünf Prüf-Agenten Backend, Datenbank, Web-Frontend,
Mobile und einen Widget-Plan durchgesehen. Etwa ein Drittel der Befunde ist
behoben — die, die einen Launch blockiert hätten. Der Rest steht hier.

**Wichtig für den, der weitermacht:** Jeder Befund unten ist eine
*Behauptung eines Agenten*, soweit nicht ausdrücklich als „gemessen"
gekennzeichnet. Vor dem Beheben gegen den Code prüfen. In dieser Sitzung
haben sich zwei Agenten-Befunde als falsch erwiesen (siehe „Korrigierte
Befunde" unten).

---

## Erledigt in dieser Runde (11 Commits)

| Commit | Inhalt |
|---|---|
| `5c4d983` | Kontoübernahme über ID-Schreibweise (`2e1` → Nutzer 20), Token nach Passwort-Reset |
| `24316bb` | Passwort im Gerätelog, axios-Timeout (20 s), Kontrast 3,88 → 5,15:1 |
| `ec10edf` | PDF-Export: max. 2 gleichzeitig (gemessen 209 MB/Lauf) |
| `8c8b03b` | Konto-Selbstlöschung, Datumsprüfung |
| `e1c0f07` | Impressum/Datenschutz ohne Anmeldung |
| `3991da1` | Anmeldung an Kirchenkreis gebunden, logout leert alle Daten |
| `e09ebe9` | Antworten aus beendeter Sitzung verwerfen |
| `0405a77` | Datenschutzerklärung beschreibt die App |
| `03abc10` | Android: Standort-Berechtigung, kein Cloud-Backup, Signing in .gitignore |
| `be8cab9` | Android: Kurzbefehle beim langen Tippen |
| `7d08404` | Release 2.3.2 |

Tests: 10 Suiten im Backend (`npm test`), alle grün. Jeder Sicherheitsfix
hat einen Test, der gegen den ungepatchten Stand fehlschlug.

---

## OFFEN — nach Dringlichkeit

### 1. Erfassungsflow verwirft Eingaben bei Fehler (KRITISCH, trifft täglich)

`frontend/src/components/erfassung/ErfassungsFlow.js:617` ruft `onClose()`
**vor** den POSTs. `ErfassungContext.js:19` zählt `instanz` hoch → der `key`
wechselt, der Zustand ist weg. Scheitert der POST (`:726-735`), bleibt nur
ein Toast — Ziel, Anlass, km, Mitfahrer sind verloren, kein Retry.

Bei Funkloch der häufigste reale Fehlerfall. **Das ist der wichtigste
verbleibende Punkt**, weil er Nutzer trifft, während die anderen
Angriffsszenarien oder Wachstumsprobleme sind.

Fix: POST-Block in eine Funktion `sende(trips)` auslagern, im `catch`
`toast.error(…, { actionLabel: 'Erneut versuchen', onAction: () => sende(trips) })`.
Die Closure hält `trips` über den Unmount hinweg.

Verwandt: `ErfassungsFlow.js:726-731` löscht bei Teilfehler die bereits
gespeicherte Hinfahrt per `axios.delete(...).catch(() => {})`. Bei Timeout,
den der Server doch verarbeitet hat, scheitert auch das Delete stumm →
Waise auf dem Server, Nutzer legt neu an → Duplikat.

### 2. Unbegrenzte Zeiträume (HOCH, DoS durch jeden Angemeldeten)

`backend/utils/excelExport.js:621-629` und
`backend/controllers/fahrtController.js:313-327`: Schleife über alle Monate
ohne Bereichsgrenze. `GET /api/fahrten/report-range/1/1/9999/12` = 120.000
Monatsabfragen sequentiell, bei 10 Pool-Verbindungen. Der Export-Weg legt
zusätzlich 120.000 Zeilen in `abrechnungen` an.

Keine Validierung in `backend/schemas/fahrtSchemas.js`; die Routen
`routes/fahrten.js:14,16,20` haben kein `validate`.

Fix: Zod-Params-Schema (`year` 2000–2100, `month` 1–12, `type`
`/^\d+$|^mitfahrer$/`) plus Bereichsgrenze max. 24 Monate, `start <= end`.
Für `/report-range`, `/export-range`, `/export-pdf-range`, `/export`,
`/export-pdf`, `/report`.

### 3. Range-Export setzt Status, bevor die Datei existiert (HOCH)

`excelExport.js:561, 609`: `setzeZeitraumStatus` läuft in
`baueZeitraumWorkbooks`, also **vor** dem Senden; beim PDF folgt danach noch
LibreOffice (60 s Timeout). Bricht es bei Monat 3 von 6 ab, sind zwei Monate
„eingereicht", vier nicht, und es gibt keine Datei. Jedes `updateStatus` ist
ein eigenes Autocommit, keine Transaktion.

Fix: Status erst nach erfolgreichem Senden, alle Monate in einer
Transaktion. Oder ganz herausnehmen — das Frontend hat den Toast „Als
eingereicht markieren" bereits.

### 4. Backend-Container läuft als root (HOCH)

`backend/Dockerfile` ohne `USER`. LibreOffice rendert darin Nutzertexte.
Fix: `USER node` nach dem `COPY`, `npm ci --omit=dev`.

### 5. Netzfehler sieht aus wie „keine Fahrten" (HOCH, Gefahr doppelter Erfassung)

`AppContext.js:443-446`: bei Fehler `setFahrten([])`, nur `console.error`.
`FahrtenListe.js:272-283` zeigt dann „Noch keine Fahrten im September". Der
Nutzer legt sie erneut an → doppelte Abrechnung.

Der axios-Interceptor (`:302-310`) behandelt nur 401; 403/500/Netz lösen
keinen Toast aus. `fehlerText.js` existiert, wird aber nur an zwei Stellen
genutzt.

Fix: `fahrtenFehler`-State, `toast.error(fehlerText(error))` im catch,
EmptyState nur bei `!fahrtenFehler`.

### 6. Sheets schließen ohne Nachfrage (HOCH)

`Sheet.js:350` Backdrop, `:47-53` Esc, `:333` Swipe,
`useZurueckButton.js:34` Android-Zurück — alle rufen direkt `onClose()`.
Kein `dirty`-Konzept, kein `beforeunload`. Im Erfassungsflow Schritt 2 mit
Mitfahrern genügt ein Daumen aufs Overlay.

Fix: Prop `schutz` am `Sheet`, in `schliessen()` (`Sheet.js:89`) abfragen.
`ErfassungsFlow` gibt `schutz={step === 2 || !!zielOrtId || !!zielAdresse}`.

### 7. Keine Security-Header für die SPA (HOCH)

`frontend/nginx.conf` setzt nur Cache-Header. Kein CSP, kein
`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`. `helmet()`
schützt nur die API-Antworten, nicht das HTML. Token liegt im Web in
`localStorage` → jede XSS-Lücke exfiltriert es.

**Vorher prüfen, was Caddy auf dem KKD-Server schon setzt** — die
Caddy-Konfiguration liegt nicht im Repo.

Vorschlag: `Content-Security-Policy "default-src 'self'; connect-src 'self'
https://photon.komoot.io; img-src 'self' data:; style-src 'self'
'unsafe-inline'; font-src 'self'; frame-ancestors 'none'"` (inline `<style>`
in `index.html:19` erzwingt `'unsafe-inline'` oder einen Hash).

### 8. Sitzungsablauf: stiller Logout mitten im Formular (HOCH)

`AppContext.js:303-307` `logout()` ohne Toast; `AppContent.js:147-167`
prüft alle 60 s `exp` und meldet still ab. Beim Logout unmountet
`AppContent` mit allen Sheets samt Eingaben. Der `isLoggingOut`-Guard wird
in `logout()` selbst sofort zurückgesetzt → 35 parallele 401 = 35×
`logout()`. `ErfassungsFlow` liegt außerhalb von `AppContent` → das Sheet
steht nach Zwangs-Logout über der Anmeldemaske.

Fix: Toast „Sitzung abgelaufen", `isLoggingOut.current = false` in `login()`
statt `logout()`, im `ErfassungProvider`
`useEffect(() => { if (!isLoggedIn) close(); }, [isLoggedIn])`.

### 9. Fehlergrenze umschließt nur AppContent (HOCH)

`App.js:37`. Außerhalb: `ErfassungsFlow`, `StatusDatumSheet`, `PwaUpdater`,
die Routen `/help`, `/verify-email`, `/reset-password`, `/set-password`,
`/rechtliches`. Ein Render-Fehler dort = weiße Seite. `Fehlergrenze.js:26-38`
bietet keinen Knopf; „App schließen und neu öffnen" hilft in der PWA nicht.

Fix: Fehlergrenze um `<Routes>` innerhalb der Provider, zweite um
`<ErfassungsFlow>`, Knopf „Neu laden" mit `window.location.reload()`.

### 10. manualChunks macht Lazy-Imports wirkungslos (HOCH)

`vite.config.js:120-127`: `if (!id.includes('node_modules')) return; …
return 'vendor'`. Jedes node_modules-Modul landet in `vendor`, auch
dynamisch importierte. Belegt per String-Zählung im Bundle: JSZip 7×, pako
18×, SecureStorage 7×, NativeNavigation 5×. Der Web-Nutzer lädt beim Start
jszip+pako (~90 kB roh) und alle nativen Plugins.

Fix, eine Zeile vor `return 'vendor'`:
`if (/node_modules\/(jszip|pako|@capacitor|@capgo|@aparajita)\//.test(id)) return;`

### 11. Weitere Backend-Punkte (MITTEL)

- **E-Mail-Kollision**: `userController.js:223-243` prüft nicht, ob die neue
  Adresse einem anderen Konto gehört. `user_profiles.email` ohne UNIQUE.
  In `profileController.js:64-71` ist es gefixt, hier nicht.
- **Mailversand ohne eigenes Limit**: `POST /api/users/resend-verification`
  (nur `schreibLimiter` 200/5 min), Empfänger ist Nutzer-Input → 200 Mails
  in 5 Minuten an eine fremde Adresse vom Kirchen-Mailserver.
- **`error.message` an den Client**: `excelExport.js:669, 687`,
  `pdfExport.js:118, 138` — enthält MySQL-Texte, LibreOffice-stderr und
  Temp-Pfade.
- **Nutzer-Enumeration**: `authController.js:37-43` (bcrypt nur bei
  existierendem Nutzer, ≈100 ms Unterschied), `userController.js:306-318`.
  Fix: Dummy-Hash vergleichen, Reset-Mail asynchron.
- **API-Keys im Klartext**: `models/ApiKey.js:6-9, 27`. Ein DB-Backup
  enthält nutzbare Dauer-Zugänge. Fix: SHA-256 speichern.
- **`jwt.verify` ohne `algorithms`**: `authMiddleware.js:40`. Geprüft: bei
  String-Secret nicht ausnutzbar, trotzdem `{ algorithms: ['HS256'] }`.
- **JWT_SECRET ohne Mindestlänge**: `app.js:29-35` prüft nur Existenz.
- **Passwort-Mindestlänge 6** (`profileSchemas.js:14`) — bei IBAN und
  Bewegungsprofilen zu kurz, ≥10.
- **`express.json({ limit: '10mb' })`** (`app.js:120`) — 1 MB reicht.
- **`npm audit fix`** im Backend: nodemailer ≥9.1.1, qs ≥6.16, beide ohne
  Major. Von den 22 GitHub-Meldungen sind nur diese zwei zur Laufzeit
  erreichbar; der Rest ist Build-Werkzeug.

### 12. Datenbank und Last (wird bei Wachstum gefährlich)

Alles gemessen auf Produktion, 24.09.:

- **N+1 bei Mitfahrern**: `fahrtController.js:240-242` lädt sie pro Fahrt
  nach, obwohl `Fahrt.js:281` sie schon per JOIN holt und `:237` wegwirft.
  App-Start ≈ 1.100 Abfragen bei 30 Fahrten/Monat.
- **`YEAR()/MONTH()` statt Datumsbereich**: `Fahrt.js:282`,
  `fahrtController.js:565`. Gemessen: 7,3 ms gegen **0,79 ms** mit
  `datum >= ? AND datum < ?` — Faktor 9. Index `(user_id, datum)` fehlt; der
  vorhandene `idx_fahrten_datum_user` hat die falsche Reihenfolge.
- **`GET /api/fahrten` ungepaginiert**: 1.043 Zeilen = 52,7 ms, **341,6 KB
  JSON**, bei jedem App-Start und nach jedem Speichern.
- **Frontend-Request-Sturm**: App-Start ≈ 40 Requests (28 Monatsreports
  parallel, `AppContext.js:543-576`), jedes Speichern ≈ 36, Zeitraum-Status
  bis 389. Rate-Limit ist 600/5 min — wer eine Woche nachträgt, läuft hinein.
  Schnellfix: `refresh=false` an `AppContext.js:522` und
  `useFahrtenExport.js:241/244`, doppelte `fetchFahrten()` streichen.
- **Fahrt ändern: zwei Transaktionen**: `fahrtController.js:163` (Autocommit)
  danach `Mitfahrer.updateMitfahrerForFahrt` (:170, eigene Transaktion).
  Fehler dort → km geändert, Mitfahrer alt, Client bekommt 500.
- **`favoritController.js:103-124`**: Rückfahrt scheitert, `catch` loggt nur,
  Antwort trotzdem 201 „Hin- und Rückfahrt erstellt".
- **Healthcheck ohne Passwort**: `mysqladmin ping` → Access denied, Exit 0,
  Status „healthy". Nebenwirkung: Aborted_connects 88.046 von 88.352.
- **`mysql:8` nicht gepinnt** — läuft schon auf 8.4.11, nächster Major kommt
  ungefragt. Auf `mysql:8.4` festlegen.
- **`/var/lib/docker` 46 von 47 GB belegt** — `docker system df` ansehen.
- **`user_profiles.email` ohne Index**, `fahrten.abrechnung` VARCHAR ohne FK
  (6 Fahrten zeigen auf gelöschten Träger 19).

### 13. Mobile und Store

- **Android-Zurücktaste verwirft den Erfassungsflow**
  (`useZurueckButton.js:33-34` → Sheet `onClose` → in Schritt 2 der ganze
  Flow). Fix: in Schritt 2 → `setStep(1)`.
- **Kurzbefehl-Kaltstart-Timing auf iOS ungeprüft**: `Kurzbefehle.swift:53-56`
  löscht `offenerTyp`, sobald `evaluateJavaScript` zurückkehrt; der in
  `:57-58` versprochene Neuversuch beim Vordergrund-Wechsel fehlt. Auf
  langsamem Netz per Kaltstart prüfen.
- **Play Console**: App `de.godsapp.fahrtenbuch` **nicht angelegt** (404 bei
  intaktem Service-Konto, gegengeprüft mit zwei anderen Paketen). Nötig:
  Konto-Typ klären (Personal = 12 Tester × 14 Tage Closed Testing vor
  Production; Organisationskonten befreit), AAB, Play App Signing,
  Data-Safety, Content Rating, Datenschutz-URL. Kein Android-Workflow in
  `.github/workflows/` — `android-release.yml` analog zu `ios-release.yml`
  wäre ~½ Tag.
- **Exportkonformität** muss derzeit pro Build von Hand gesetzt werden
  (`usesNonExemptEncryption: false` per ASC-API). Könnte in
  `ios-release.yml` wandern.
- **Ungenutzte Plugins**: `@capacitor/network`, `@capacitor/preferences` —
  nirgends importiert, bringen aber `ACCESS_NETWORK_STATE` mit.
- **Git-Tag `v2.3.1` und `v2.3.2` fehlen** (letzter Tag: `v2.3.0`).

### 14. Zugänglichkeit (wichtig bei dieser Zielgruppe)

- **Eingabefelder ohne Beschriftung**: `MitfahrerModal.js:38-48, 52-62`,
  `FahrtForm.js:967-973, 976-983, 992-996` — `<label>` ohne `htmlFor`,
  `<input>` ohne `id`. Screenreader liest „Eingabefeld".
- **Trefferflächen unter 44 px**: `.dash-uw-btn` 34×34 (`index.css:2189`),
  `.set-action` 36×36 (`:4700`), `.set-grip` 32×36 (`:5197`). Der Token
  `--tap-min` existiert (`tokens.css:53`), wird dort aber nicht genutzt.
- **11-px-Inhaltswerte**: `.fl-mf-betrag` (`:5074`), `.dash-chart-monat`
  (`:2719`), `.fl-zeile-mf` (`:3329`).

### 15. Kleinkram

- **Token in ~60 `console.error(…, error)`**: Jeder AxiosError trägt
  `config.headers.Authorization` und `config.data`. In Capacitor landet das
  im Gerätelog. Fix: Helfer `logFehler(kontext, error)`, der nur
  `{status, url, message}` ausgibt.
- **`.map`/`.find` auf ungeprüften Antworten**: `UserManagement.js:144`,
  `ApiBereich.js:93` (die Context-Stellen sind seit `e09ebe9` gefixt).
- **Fehlende Doppelklick-Sperren**: `FahrtForm.js:951`,
  `SatzBausteine.js:18-23/55`, `FavoritenBereich.js:98-114`,
  `UserManagement.js:42-45`.
- **Veraltete Daten**: `ProfilBereich.js:83-86` ruft nicht
  `fetchCurrentUser` → Dashboard-Begrüßung bleibt alt. Sechs
  `fetchOrte()`/`fetchDistanzen()` ohne `await`.
- **Race beim Monatswechsel**: `fetchFahrten` ohne Request-Nummer,
  `ZeitraumSegmente.js:188-189` setzt Von und Bis in zwei `setState`s.
- **Tote Dateien**: `src/utils.js` (41 Z.), `fahrten/StatusUebersicht.js`
  (170 Z.), `@heroicons/react` in `package.json` (0 Imports).
- **`offline.html`** wird precacht, aber nirgends referenziert.
- **`navigateFallbackDenylist`** (`vite.config.js:52`) kennt `/api-docs`
  nicht.
- **CSV-Injection**: praktisch nicht ausnutzbar (ExcelJS schreibt Strings
  als Text, gemessen), aber `anlass` hat kein `.max()` in
  `fahrtSchemas.js:65/84`.
- **Deploy-Skripte**: DB-Passwort per `-p"$kennwort"` auf der Kommandozeile
  (`deploy/deploy.sh:94-96`), `StrictHostKeyChecking=no` (`:44`).

---

## Korrigierte Befunde — nicht nochmal jagen

Zwei Agenten-Behauptungen haben sich beim Nachprüfen als **falsch** erwiesen:

1. **„iOS-Navigationsleiste ist eine Eigenbau-View."** Falsch. Die Weiche
   `ensureTabBar()` (`NativeNavigationPlugin.swift:673`) hängt an
   `usesSystemLiquidGlass`, und das ist `#available(iOS 26.0)`. Auf iOS 26+
   läuft Apples echte `UITabBarController`. Die Eigenbau-View ist der
   Fallback für iOS 15–25.

2. **„`sort -V` wählt die falsche Xcode-Version."** Bei den konkreten
   Ständen (26.4.1 / 26.6 / 16.2) wählt es korrekt 26.6. Die robustere
   Variante ist trotzdem im Workflow, weil sie bei anderen Ständen kippen
   kann.

Ebenfalls geprüft und **nicht** gefährlich:
- **Formel-Injection im Excel-Export**: ExcelJS schreibt `=…` als
  Shared-String, nicht als Formel — gemessen.
- **Mandantentrennung**: Jede UPDATE/DELETE trägt `AND user_id = ?`. Keine
  Route gefunden, über die man fremde Daten erreicht.
- **15 Fahrten mit kaputtem Datum**: Es sind **sechs** (der Agent hat Hin-
  und Rückfahrten doppelt gezählt), zusammen ~8 €. Entscheidung Simon:
  Daten bleiben, nur die Ursache ist geschlossen.

---

## Widget und Sprachsteuerung

**Recherchiert am 24.09., mit Quellen und Datum.**

- **iOS/Siri: geht.** App Intents (iOS 16+) mit gesprochenen Rückfragen.
  Einschränkung: Eine Aufruf-Phrase darf **höchstens einen Parameter**
  enthalten — „Hey Siri, Fahrt anlegen nach Büsum", der Rest per Rückfrage.
  Braucht eine eigene Swift-Schicht für HTTP und Keychain (die WebView läuft
  beim Hintergrundstart nicht), plus zweites Signing-Ziel in der CI.
  Voraussetzung: Keychain-Zugriffsklasse auf
  `afterFirstUnlockThisDeviceOnly` umstellen, sonst `errSecInteractionNotAllowed`.
  Geprüft: **`cap sync ios` zerstört ein zusätzliches Target nicht** — nur
  `cap add ios` würde es.

- **Android/„Hey Google": geht nicht.** App Actions löst Gemini seit dem
  04.09.2026 nicht mehr aus (Entwicklerberichte in Googles Forum, keine
  Antwort von Google). Der Nachfolger AppFunctions ist Alpha, Kotlin-only,
  Android 16+, und die Gemini-Anbindung ist seit Mai 2026 geschlossene
  Vorschau. Auf Android bleibt „Hey Google, öffne Fahrtenbuch".

- **Widget**: Kann auf **keiner** Plattform ein Formular zeigen. Nur
  Anzeige plus Ein-Tipp-Buchung vordefinierter Fahrten. Simon hat entschieden:
  kein Widget, kein Favoriten-Ausbau, Long-Press reicht.

---

## Betrieb

- **Backup**: `/opt/backups/backup.sh`, Cron 3:00, Hetzner Storage Box.
  Seit 24.09. wird `stack.env` AES-256-verschlüsselt mitgesichert;
  Passphrase in `/root/.backup-passphrase` (0400) **und**
  `KKD_BACKUP_PASSPHRASE` in `~/.claude/secrets.env`. Rückholung getestet.
  Rotation: lokal 14 Tage, auswärts keine (Box zu 80 % voll).
- **Rückspielung des DB-Dumps ungeprüft** — zuletzt 17.08., seither drei
  Migrationen. Simon: erstmal ignorieren.
- **iOS-Build**: `.github/workflows/ios-release.yml`, nur
  `workflow_dispatch`. Version vorher in der pbxproj setzen und committen,
  dann Lauf starten (~3–5 min). Grund für die CI: Simons Mac läuft auf
  macOS-Beta, Apple lehnt solche Builds mit `ITMS-90111` ab.

## Arbeitsregeln

- **Emulator/Simulator nur auf ausdrückliche Ansage** — eine Freigabe gilt
  für den Anlass, nicht für die Sitzung. Ohne Emulator prüfbar:
  `./gradlew assembleDebug`, `aapt2 dump xmltree` aufs APK, `npm test`,
  `vite preview` im Browser.
- Testserver ist `server.godsapp.de`, **nicht** KKD.
- CHANGELOG bei jedem Nutzer-sichtbaren Commit mitschreiben, OpenAPI bei
  jeder Routenänderung.
