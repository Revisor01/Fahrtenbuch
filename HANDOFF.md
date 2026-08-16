# Übergabe — Mobile Apps (Stand 16.08.2026)

> Diese Datei ist eine Arbeitsübergabe, kein Projektdokument. Nach dem
> Weiterarbeiten löschen.

## Wo wir stehen

Die iOS-App läuft auf dem Gerät und in TestFlight (**Build 12**). Sie hat echte
native Navigationsleisten, Kirchenkreis-Auswahl, Registrierung, Export über das
Teilen-Fenster und Anmeldung im Systemspeicher.

Die Web-App unter kkd-fahrtenbuch.de ist **produktiv und unverändert**
(~2470 echte Fahrten). Das Backend ist ausgerollt und nachgeprüft.

Branch `master`, 26 Commits. Die Begründungen stehen in den Commit-Nachrichten.

## Erledigt seit dem Schreiben dieser Übergabe

Build 13 enthält zusätzlich (Commit `f69ae96`):
- Fahrtenliste im Zeilenmuster der Startseite statt Einzelkarten
- Auswahlfelder schneiden den Text nicht mehr ab (Pfeil-Platz gefehlt)
- „Fahrt hinzufügen" ist ein hervorgehobener Eintrag der nativen Leiste
  statt eines frei schwebenden Knopfs. Im Web unverändert.

**Alle drei ungeprüften Punkte sind inzwischen im Simulator verifiziert**
(angemeldet gegen die echte Instanz):
- Fahrtenliste mit echten Daten läuft, die Anzahl stimmt mit der DB überein
- Tap auf „+" öffnet den Erfassungs-Dialog samt Vorschlägen
- Die Wischgeste an Dialogen **funktioniert** — im Simulator lässt sich
  entgegen der bisherigen Annahme sehr wohl wischen (`idb ui swipe`)

Dabei fielen drei Mängel auf, behoben in Commit `2ef0806`: abgeschnittene
Orte, abgeschnittener Träger, halb verdeckte letzte Zeile. Dazu auf Simons
Ansage der Pfeil aus allen Listen.

**Build 16 ist in TestFlight** (16.08., Status `IN_BETA_TESTING`). Enthält:
- Fahrten-Tab: Übersichtskarte mit „KILOMETER" und „ERSTATTUNG" in zwei
  beschrifteten Spalten, jede Fahrt als eigene Karte
- Startseite: Kilometer-Balkendiagramm ganz unten
- Abrechnung: Fortschrittsleiste immer sichtbar, „Nur als eingereicht
  markieren" ohne Export
- Start 5 s → 2 s, kein weisser Blitz, keine aufblitzende Anmeldemaske
- Toasts wieder unten, Plausible entfernt

**PRODUKTION WURDE DEPLOYT** (16.08., auf Simons ausdrückliche Ansage —
die Regel „nie auf Produktion" gilt sonst weiter). Grund: `/api/konfig`
fehlte dort, deshalb erschien in der App kein „Registrieren".
- Images auf dem Server gebaut (kein Docker lokal), alte als `:vorher`
  getaggt — Rückweg per `docker tag revisoren/fahrtenbuch-server:vorher
  revisoren/fahrtenbuch-server:latest` + `docker compose up -d`
- `TOKEN_LAUFZEIT=14d` in `stack.env` ergänzt; die Anmeldung hält damit
  zwei Wochen statt einem Tag (Simons Entscheidung)
- Geprüft nach dem Deploy: 2.470 Fahrten und 31 Nutzer unverändert,
  `/api/konfig` liefert `allowRegistration: true`, Registrieren-Knopf in
  der App sichtbar, keine Fehler in den Logs

**Quick Actions gibt es noch nicht** — Simon hat sie als wichtig benannt.
Weder `UIApplicationShortcutItem` in der Info.plist noch etwas im
Frontend. Das ist der nächste Punkt.

**Von Simon noch nicht bewertet.**

## Was noch offen ist

- **Android**: nie gestartet. Keystore (`~/.claude/secrets/keystores/
  fahrtenbuch-keystore.env`), Signierung in `android/app/build.gradle` und ein
  gebautes Bundle liegen vor. Es fehlt der erste Durchlauf auf Gerät/Emulator.
- **Offline-Erfassung**: fertiges Konzept unter
  `/private/tmp/claude-501/.../scratchpad/offline-konzept.md` (falls weg: neu
  erstellen lassen). Kern: nur Neuanlage offline, IndexedDB, Idempotenz über
  `client_uuid` (neue Migration), Endpunkt `POST /api/fahrten/sync` mit
  gruppenweiser Transaktion. Geschätzt 16–18 halbe Tage.
- **Symbol „Abrechnung"** in der Tab-Leiste ist ein Dokument (`doc.text`) —
  für „Beleg" gibt es kein verlässliches Systemsymbol. Simon hat es noch nicht
  bewertet.

## Das Wichtigste für die Arbeitsweise

**Es läuft ein iOS-Simulator** (UDID `E0A15BE2-C275-4A68-9E45-E67419D5749C`).
Das ist der entscheidende Punkt dieser Sitzung: Drei Runden lang wurden Fehler
auf Verdacht korrigiert, und Simon musste jeden davon selbst finden — einer der
Builds war sogar ein Rückschritt. Erst als die App im Simulator lief und die
Farben pixelgenau nachgemessen wurden, war die echte Ursache da (sie lag
außerhalb der WebView, in der Capacitor-Konfiguration).

Also: **bauen, installieren, ansehen, nachmessen** — nicht raten.

**Die App lässt sich im Simulator fernsteuern** (`idb`, liegt in
`~/.local/bin`). Damit kommt man bis in die angemeldete App und durch jeden
Ablauf — Anmelden, Tabs, Dialoge, Wischen. Das war die Lücke: vorher wurden
Abläufe „nur im Code verdrahtet" abgehakt.

```bash
export PATH="$HOME/.local/bin:$PATH"
idb ui tap   --udid <UDID> <x> <y>          # Punkte, nicht Pixel: px/3
idb ui swipe --udid <UDID> <x1> <y1> <x2> <y2> --duration 0.3
idb ui text  --udid <UDID> "text"
idb ui key   --udid <UDID> 42               # 42 = Backspace
```

Zwei Fallen dabei: Die Tastatur des Simulators liegt auf **deutschem
Layout** — `@` und `-` kommen als `"` und `ß` an; für Anmeldungen den
Benutzernamen statt der E-Mail nehmen. Und nach `launch` **mindestens 8–10
Sekunden warten**, bevor der erste Tap kommt, sonst landet er im
Startbildschirm und läuft ins Leere.

```bash
cd frontend && npm run build && npx cap sync ios
cd ios/App && xcodebuild -project App.xcodeproj -scheme App -sdk iphonesimulator \
  -configuration Debug -destination 'id=E0A15BE2-C275-4A68-9E45-E67419D5749C' \
  -derivedDataPath /tmp/simbuild build CODE_SIGNING_ALLOWED=NO
xcrun simctl install <UDID> /tmp/simbuild/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch <UDID> de.godsapp.fahrtenbuch
xcrun simctl io <UDID> screenshot bild.png
magick bild.png -format "%[pixel:p{600,2600}]" info:   # Farbe nachmessen
```

## TestFlight-Build erzeugen

Drei Fallstricke, die je einen Fehlversuch gekostet haben:

1. **Build-Nummer erhöhen**, sonst weist Apple ab:
   `perl -pi -e 's/CURRENT_PROJECT_VERSION = N;/CURRENT_PROJECT_VERSION = N+1;/' App.xcodeproj/project.pbxproj`
2. **Manuelle Signierung**: `CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM=J459G9CJT5
   PROVISIONING_PROFILE_SPECIFIER="Fahrtenbuch AppStore"
   CODE_SIGN_IDENTITY="Apple Distribution: Simon Luthe (J459G9CJT5)"`
3. **Beim Export `PATH` auf Apples Werkzeuge setzen** —
   `PATH="/usr/bin:/bin:/usr/sbin:/sbin:/Applications/Xcode.app/Contents/Developer/usr/bin"`.
   Homebrew hat ein neueres `rsync`, das ein Apple-Flag nicht kennt; der Export
   bricht sonst mit „Copy failed" ab.
4. **Profil per UUID angeben, nicht per Name.** Xcodes Apple-ID-Sitzung läuft
   ab („Your session has expired"); dann findet der Export das Profil über
   seinen Namen nicht mehr und bricht ab mit „requires a provisioning
   profile". Die UUID des lokal vorliegenden Profils funktioniert ohne
   Anmeldung — `3a6d3cd4-3301-4640-baca-360e58acdab9` für „Fahrtenbuch
   AppStore", zu finden mit:
   ```bash
   for f in ~/Library/MobileDevice/Provisioning\ Profiles/*.mobileprovision; do
     security cms -D -i "$f" | plutil -extract Name raw -
   done
   ```

Danach `xcrun altool --upload-app`, Verschlüsselungserklärung per API setzen
(`usesNonExemptEncryption: false`), fertig. App-ID `6801855861`, Testgruppe
`f3fa14fa-3c5c-4537-8044-bf130ce59957`.

## Fallen, die schon zugeschnappt sind

- **Die weißen Ränder lagen NICHT im CSS.** `contentInset: "always"` hielt die
  WebView aus den Systemrändern; dort war die native Fläche weiß. Jetzt
  `"never"` plus `backgroundColor`. Kein Stylesheet erreicht diesen Bereich.
- **Dieselbe Falle beim Start:** Der weiße Bildschirm in Sekunde 2–3 kam aus
  `LaunchScreen.storyboard` — die imageView trug `systemBackgroundColor`, im
  hellen Design reines Weiß, und lag unter der Splash-Grafik. Weder CSS noch
  `capacitor.config.json` erreichen das. Jetzt Petrol als fester Farbwert.
  Beim Prüfen **vorher deinstallieren**: iOS hält den Launch-Screen im Cache,
  sonst misst man den alten Stand.
- **Fehler ohne Fehlermeldung:** Fehlte die Keychain-Berechtigung, kehrte der
  Aufruf einfach nie zurück — kein `catch` griff. Deshalb haben alle
  Speicherzugriffe jetzt eine Zeitgrenze.
- **Doppelte Startbildschirme** entstehen, wenn nativer und eigener
  Unterschiedliches zeigen. Beide tragen jetzt denselben Text.
- **Ladezustände nicht zurücksetzen**, wenn ein Effekt beim Start erneut läuft
  — sonst erscheint der Startbildschirm ein zweites Mal.
- **ImageMagick zeichnet keine SVG-Konturen.** Icons mit `rsvg-convert`
  rendern, sonst fehlt der Ring im Logo.
- **Android braucht JDK 21** (installiert), nicht 17 oder 25.

## Simons Vorgaben

- **Nativ ist gesetzt**, Aufwand ist kein Gegenargument (siehe Notiz
  `feedback_native_ui_gesetzt.md`). Nicht abwägend zurückfragen.
- **Web bleibt** wie es ist — außer er verlangt ausdrücklich eine Änderung
  (wie beim Fahrten-Layout und beim Logo-Punkt).
- **Aus einem Guss**: bestehendes Designsystem, Petrol `#0F5257`. Kein
  Material You, das würde die Markenfarbe überschreiben.
