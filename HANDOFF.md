# Übergabe — Mobile Apps (Stand 16.08.2026, abends)

> Arbeitsübergabe, kein Projektdokument. Nach dem Weiterarbeiten löschen.

## Wo wir stehen

**iOS: Build 18 in TestFlight** (`IN_BETA_TESTING`, App-ID `6801855861`,
Version 2.3.0, hochgeladen 21.08.2026). Enthält den Umbau des
Erfassungs-Modals: Startort, Datum und Abrechnungsträger ohne
Zwischenschritt, Trägername vollständig lesbar. Dazu die Fixes aus dem
Usability-Audit — Esc schließt nur noch das oberste Fenster, und das
Bearbeiten-Formular überschreibt manuell gesetzte Kilometer nicht mehr.

Davor: Build 16 mit nativen Navigationsleisten, Kirchenkreis-Auswahl,
Registrierung, Export über das Teilen-Fenster, Anmeldung im Systemspeicher.

**Web/Produktion wurde heute deployt** — siehe eigener Abschnitt unten.
2.470 Fahrten, 31 Nutzer, nach dem Deploy nachgeprüft und unverändert.

Branch `master`, alles gepusht.

## Das Nächste

1. **Quick Actions** — von Simon als wichtig benannt, gibt es noch nicht.
   Weder `UIApplicationShortcutItem` in der Info.plist noch etwas im
   Frontend. Naheliegend: „Fahrt erfassen" und „Letzte Fahrt wiederholen".
2. **Android**: nie gestartet. Keystore
   (`~/.claude/secrets/keystores/fahrtenbuch-keystore.env`), Signierung in
   `android/app/build.gradle` und ein gebautes Bundle liegen vor. Es fehlt
   der erste Durchlauf auf Gerät/Emulator. Braucht **JDK 21**, nicht 17/25.
3. **Offline-Erfassung**: Konzept unter
   `/private/tmp/claude-501/.../scratchpad/offline-konzept.md` (falls weg:
   neu erstellen lassen). Kern: nur Neuanlage offline, IndexedDB, Idempotenz
   über `client_uuid` (neue Migration), `POST /api/fahrten/sync` mit
   gruppenweiser Transaktion. Geschätzt 16–18 halbe Tage.

Kleinere offene Punkte:
- **Symbol „Abrechnung"** in der Tab-Leiste ist ein Dokument (`doc.text`) —
  für „Beleg" gibt es kein verlässliches Systemsymbol. Unbewertet.
- **`StatusUebersicht.js`** liegt unbenutzt im Repo. Sie war die
  Erstattungs-Karte im Fahrten-Tab; falls die Aufteilung doch nicht
  gefällt, ist der Weg zurück kurz.
- Zwei Fähigkeiten dieser Karte fehlen seitdem: Status über einen **freien
  Zeitraum** in einem Rutsch setzen (Abrechnung kann nur monatsweise), und
  die Monats-Chips je Träger.

## PRODUKTIONS-DEPLOY vom 16.08.

Die Regel „nie auf Produktion" gilt weiter — dieser Deploy lief auf Simons
ausdrückliche Ansage. Grund: `/api/konfig` fehlte auf dem Server, deshalb
erschien in der App kein „Registrieren".

- Images **auf dem Server gebaut** (lokal läuft kein Docker): Repo nach
  `/opt/fahrtenbuch/build-src` geklont, `docker build`, danach gelöscht.
- Alte Images als `:vorher` getaggt. **Rückweg:**
  ```bash
  docker tag revisoren/fahrtenbuch-server:vorher revisoren/fahrtenbuch-server:latest
  docker tag revisoren/fahrtenbuch-app:vorher    revisoren/fahrtenbuch-app:latest
  cd /opt/fahrtenbuch && docker compose up -d
  ```
- `TOKEN_LAUFZEIT=14d` in `stack.env` ergänzt (Simons Entscheidung): Die
  Anmeldung hält zwei Wochen und verlängert sich bei Nutzung, statt täglich
  abzulaufen. In geteilten Büros bleibt jemand damit länger angemeldet.
- Migrationen waren auf beiden Seiten identisch (0009 zuletzt) — **keine
  Schema-Änderung**.
- Nach dem Deploy geprüft: 2.470 Fahrten, 31 Nutzer, `/api/konfig` liefert
  `allowRegistration: true`, Registrieren-Knopf in der App sichtbar, keine
  Fehler in den Logs.

## Arbeitsweise — das Wichtigste

**Bauen, installieren, ansehen, nachmessen — nicht raten.** Mehrfach wurden
Fehler auf Verdacht korrigiert, und Simon musste jeden selbst finden. Die
echten Ursachen lagen fast nie dort, wo sie vermutet wurden.

**Der Simulator lässt sich fernsteuern** (`idb`, in `~/.local/bin`). Damit
kommt man bis in die angemeldete App und durch jeden Ablauf.

```bash
export PATH="$HOME/.local/bin:$PATH"
idb ui tap   --udid <UDID> <x> <y>          # Punkte, nicht Pixel: px/3
idb ui swipe --udid <UDID> <x1> <y1> <x2> <y2> --duration 0.3
idb ui text  --udid <UDID> "text"
idb ui key   --udid <UDID> 42               # 42 = Backspace
```

Zwei Fallen: Die Tastatur liegt auf **deutschem Layout** — `@` und `-`
kommen als `"` und `ß` an; für Anmeldungen den Benutzernamen (`simon`)
statt der E-Mail nehmen. Und nach `launch` **8–10 Sekunden warten**, sonst
landet der erste Tap im Startbildschirm.

Bauen und installieren:

```bash
cd frontend && npm run build && npx cap sync ios
cd ios/App && xcodebuild -project App.xcodeproj -scheme App -sdk iphonesimulator \
  -configuration Release -destination 'id=<UDID>' \
  -derivedDataPath /tmp/simrel build CODE_SIGNING_ALLOWED=NO
xcrun simctl install <UDID> /tmp/simrel/Build/Products/Release-iphonesimulator/App.app
xcrun simctl launch <UDID> de.godsapp.fahrtenbuch
xcrun simctl io <UDID> screenshot bild.png
magick bild.png -format "%[pixel:p{600,2600}]" info:   # Farbe nachmessen
```

**Release, nicht Debug** — nur der zählt für TestFlight, und der Debug-Build
startet spürbar langsamer.

Für Abläufe über die Zeit (Start, Übergänge) **filmen statt Einzelbilder**:

```bash
xcrun simctl io <UDID> recordVideo --codec h264 -f start.mp4 &
# ... starten ...
kill -INT <pid>
ffmpeg -i start.mp4 -vf "fps=10,scale=200:-1" frames/f%03d.png
magick montage frames/f0[2-6]?.png -tile 10x -geometry +2+2 kontakt.png
```

## TestFlight-Build erzeugen

Vier Fallstricke, die je einen Fehlversuch gekostet haben:

1. **Build-Nummer erhöhen**, sonst weist Apple ab:
   `perl -pi -e 's/CURRENT_PROJECT_VERSION = N;/CURRENT_PROJECT_VERSION = N+1;/' App.xcodeproj/project.pbxproj`
2. **Manuelle Signierung**: `CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM=J459G9CJT5
   PROVISIONING_PROFILE_SPECIFIER="Fahrtenbuch AppStore"
   CODE_SIGN_IDENTITY="Apple Distribution: Simon Luthe (J459G9CJT5)"`
3. **Beim Export `PATH` auf Apples Werkzeuge setzen** —
   `PATH="/usr/bin:/bin:/usr/sbin:/sbin:/Applications/Xcode.app/Contents/Developer/usr/bin"`.
   Homebrew hat ein neueres `rsync`, das ein Apple-Flag nicht kennt.
4. **Profil per UUID, nicht per Name.** Xcodes Apple-ID-Sitzung läuft ab
   („Your session has expired"); dann findet der Export das Profil über den
   Namen nicht und bricht mit „requires a provisioning profile" ab. UUID für
   „Fahrtenbuch AppStore": `3a6d3cd4-3301-4640-baca-360e58acdab9`.
   Export-Plist unter `/tmp/ExportOptions<Build>.plist` — **`/tmp` wird
   geleert**, die Datei ist beim nächsten Mal weg und muss neu geschrieben
   werden (`method: app-store-connect`, `signingStyle: manual`, Profil per
   UUID unter `provisioningProfiles` → `de.godsapp.fahrtenbuch`).
   Die abgelaufene Sitzung meldet sich beim Export weiterhin als
   „Your session has expired" — mit der UUID läuft er trotzdem durch,
   maßgeblich ist `** EXPORT SUCCEEDED **`.

Danach `xcrun altool --upload-app`, Verschlüsselungserklärung per API setzen
(`usesNonExemptEncryption: false`). Testgruppe ist intern — Builds landen
automatisch dort, `betaGroups`-Zuordnung per API schlägt fehl (422) und ist
nicht nötig. Status prüfen über `buildBetaDetail` → `internalBuildState`.

ASC-API: `~/.claude/secrets/asc-jwt.sh`, Zugangsdaten in `~/.claude/secrets.env`.
Eckige Klammern in Query-Parametern **URL-kodieren** (`filter%5Bapp%5D=...`),
sonst bricht curl ab.

## Fallen, die schon zugeschnappt sind

- **Die weißen Ränder lagen NICHT im CSS.** `contentInset: "always"` hielt die
  WebView aus den Systemrändern; dort war die native Fläche weiß. Jetzt
  `"never"` plus `backgroundColor`.
- **Dieselbe Falle beim Start:** Der weiße Bildschirm in Sekunde 2–3 kam aus
  `LaunchScreen.storyboard` — die imageView trug `systemBackgroundColor`, im
  hellen Design reines Weiß. Weder CSS noch `capacitor.config.json`
  erreichen das. Beim Prüfen **vorher deinstallieren**: iOS hält den
  Launch-Screen im Cache.
- **Tailwind wirft dynamisch gebaute Klassen aus dem Build.** Die
  Fortschrittsleiste (`status-progress-${state}`) zeigte monatelang nur ihre
  Beschriftung — Kreise und Linien fehlten, weil der Scanner die Namen nie
  vollständig im Quelltext sieht. Jetzt in `tailwind.config.js` unter
  `safelist`. **Bei jeder neuen `${}`-Klasse daran denken** und im Build
  nachsehen: `grep <klasse> build/assets/*.css`.
- **Der Startbildschirm blitzte auf, obwohl angemeldet:** Die Notbremse stand
  auf 2500 ms, der Keychain-Zugriff hat aber drei Etappen à 800 ms. Jetzt
  4000 ms plus ein Merker, der die Notbremse entschärft, sobald der Speicher
  geantwortet hat.
- **Fehler ohne Fehlermeldung:** Fehlte die Keychain-Berechtigung, kehrte der
  Aufruf nie zurück — kein `catch` griff. Alle Speicherzugriffe haben jetzt
  eine Zeitgrenze.
- **`--brand` und `--on-brand` kippen im dunklen Design.** Auf dem
  Startbildschirm sind die Farben deshalb fest verdrahtet (`#0F5257`,
  `#FFFFFF`, `#E8B461`) — die native Fläche darunter bleibt immer Petrol.
- **ImageMagick zeichnet keine SVG-Konturen.** Icons mit `rsvg-convert`
  rendern, sonst fehlt der Ring im Logo.
- **Die Sandbox kann aussetzen** (`EPERM: uv_cwd` bei Node und git, obwohl
  Dateien lesbar sind). Kein Projektfehler — Sitzung neu starten, dann läuft
  es wieder.

## Simons Vorgaben

- **Nativ ist gesetzt**, Aufwand ist kein Gegenargument (Notiz
  `feedback_native_ui_gesetzt.md`). Nicht abwägend zurückfragen.
- **Web bleibt** wie es ist — außer er verlangt ausdrücklich eine Änderung.
- **Aus einem Guss**: bestehendes Designsystem, Petrol `#0F5257`. Kein
  Material You, das würde die Markenfarbe überschreiben.
- **Beide Listen gleich**: Dashboard „Zuletzt" und Fahrtenliste tragen
  dieselbe Struktur. Darauf legt er Wert.
- **Zahlen brauchen eine Fläche.** Frei stehende Werte zwischen Abschnitten
  wirken verloren — Karten mit Beschriftung, keine nackten Zahlen.
- **Vor größeren Umbauten committen**, damit ein Rückweg bleibt.
