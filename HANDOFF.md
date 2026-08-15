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

**Von Simon noch nicht bewertet.** Ungeprüft blieb: die Liste mit echten
Daten in der angemeldeten App, und der Ablauf Tap auf „+" bis zum offenen
Erfassungs-Dialog (der Plugin-Teil ist am Simulator verifiziert, die
Verdrahtung nur im Code).

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
- **Wischgeste an Dialogen** ist gebaut, aber nie erprobt: Im Simulator lässt
  sich nicht wischen. Schwellwerte 96px bzw. 0,5px/ms in `ui/Sheet.js`.

## Das Wichtigste für die Arbeitsweise

**Es läuft ein iOS-Simulator** (UDID `E0A15BE2-C275-4A68-9E45-E67419D5749C`).
Das ist der entscheidende Punkt dieser Sitzung: Drei Runden lang wurden Fehler
auf Verdacht korrigiert, und Simon musste jeden davon selbst finden — einer der
Builds war sogar ein Rückschritt. Erst als die App im Simulator lief und die
Farben pixelgenau nachgemessen wurden, war die echte Ursache da (sie lag
außerhalb der WebView, in der Capacitor-Konfiguration).

Also: **bauen, installieren, ansehen, nachmessen** — nicht raten.

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

Danach `xcrun altool --upload-app`, Verschlüsselungserklärung per API setzen
(`usesNonExemptEncryption: false`), fertig. App-ID `6801855861`, Testgruppe
`f3fa14fa-3c5c-4537-8044-bf130ce59957`.

## Fallen, die schon zugeschnappt sind

- **Die weißen Ränder lagen NICHT im CSS.** `contentInset: "always"` hielt die
  WebView aus den Systemrändern; dort war die native Fläche weiß. Jetzt
  `"never"` plus `backgroundColor`. Kein Stylesheet erreicht diesen Bereich.
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
