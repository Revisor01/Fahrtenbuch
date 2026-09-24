# Handoff — Stand 24.09.2026, abends

**Produktion läuft auf dem neuen Stand.** 28 Commits seit dem letzten
Handoff, alle gepusht, Arbeitsbaum sauber. HEAD: `8aef819`.

- **Web**: kkd-fahrtenbuch.de, deployt und geprüft
- **iOS**: Build 32 (2.3.2) in TestFlight, **VALID und freigegeben** — der
  erste mit korrekter Distribution-Signatur
- **Android**: kein Release (Play Console nicht angelegt)
- **Tests**: 516 Prüfungen in 30 Dateien (`cd backend && npm test`), grün

Version im Repo: **2.3.3 unreleased**. Nicht getaggt — alles läuft in 2.3.x,
so gewollt. `v2.3.0` ist der letzte Tag und bleibt es.

---

## Das Wichtigste zuerst

### Niemand hat die Anwendung angemeldet benutzt

Geprüft wurde: Backend-Logik (516 Tests), Migrationen gegen echte MySQL,
Oberfläche im Browser **ohne Anmeldung** (Playwright, echtes nginx-Image,
null Konsolenfehler).

**Nicht geprüft:** Anmelden, Fahrt erfassen, Export ziehen, Monatsübersicht
mit echten Daten. Der Passwort-Fehler von heute Mittag hat gezeigt, dass
genau dort die Fehler sitzen, die kein Test findet — er kam durch, obwohl
alle Prüfungen grün waren.

**Nächster sinnvoller Schritt:** einmal anmelden und durchklicken.

### Terminsache: Zertifikat läuft am 28.11.2026 ab

Seit dem 24.09. signieren **Fahrtenbuch, Konfi Quest und Moin Kark alle mit
demselben** Distribution-Zertifikat `D22NVZMW4W`. Läuft es ab, baut **keines
der drei Projekte** mehr — auch nicht am Mac. Nötig: neues erzeugen, als
`.p12` exportieren, in `IOS_DIST_P12_BASE64` hinterlegen, in allen drei Repos.
Das Limit liegt bei 3, Platz zum Vorbereiten ist da.

### Exportkonformität: am 24.09. abends nachgesetzt

Build 32 hing in TestFlight fest, weil `usesNonExemptEncryption` nicht
gesetzt war — `VALID`, aber für Tester nicht freigegeben. Per ASC-API auf
`false` gesetzt, Build ist jetzt verfügbar.

**Das passiert bei JEDEM Build erneut.** Gehört in `ios-release.yml`
automatisiert; steht unten unter „Offen". Prüfen lässt es sich so:

```
cd ~/.claude/secrets
./asc-jwt.sh get "/v1/builds?filter[app]=6801855861&limit=1&fields[builds]=version,processingState,usesNonExemptEncryption"
```

Steht dort `null`, ist der Build blockiert. Setzen per `PATCH` auf
`/v1/builds/<id>` mit `{"usesNonExemptEncryption": false}`.

### Alle Nutzer müssen sich neu anmelden

Das `JWT_SECRET` wurde von 29 auf 64 Zeichen getauscht. Bestehende
Anmeldungen sind ungültig; beim nächsten Öffnen erscheint „Die Sitzung ist
abgelaufen." Das ist kein Fehler, sondern die Folge des Wechsels.

---

## Was in dieser Sitzung passiert ist

**Die Pre-Launch-Liste (15 Punkte) ist abgearbeitet.** Jeder Befund vor dem
Beheben gegen den Code geprüft — sechs von rund dreißig lagen anders als
beschrieben, zwei davon so, dass die wörtliche Umsetzung etwas gebrochen
hätte.

| Bereich | Wichtigstes |
|---|---|
| Erfassung | Eingaben bleiben bei Fehlschlag erhalten, „Erneut versuchen" |
| Abrechnungsdaten | Monatswechsel-Race (Fahrten unter falschem Monat), doppelte Mitfahrer-Sätze |
| API | Zeitraum-Grenzen, Status erst nach Auslieferung, in einer Transaktion |
| Sicherheit | API-Schlüssel gehasht, E-Mail-Kollision, Nutzer-Enumeration, Mail-Limit, Container ohne root, CSP |
| Leistung | Startlast 203 → 164 kB, App-Start 35 → 8 Anfragen, Monatsbericht 1.250 → 28 geprüfte Zeilen |
| Bedienbarkeit | Sheets fragen vor dem Verwerfen, Fehlergrenze um alles, Trefferflächen, Feldbeschriftungen |

**Dazu ungeplant:** Der iOS-Build signierte seit Monaten mit selbst
angelegten Development-Zertifikaten (`-allowProvisioningUpdates` plus
`CODE_SIGN_STYLE = Automatic`). An drei Projekten behoben, Konto von 6 auf 2
aufgeräumt. Belegt an Lauf `35961508946`.

**Nach dem Deploy gefunden und behoben:**
- Symbol und Text klebten in allen Knöpfen (`btn-base` ohne `gap`)
- Doppelte CSP von Caddy und nginx, die noch ein längst entferntes
  Analysewerkzeug erlaubte
- **Passwort ließ sich nicht neu setzen** — siehe unten

### Zwei eigene Fehler, die aufgefallen sind

1. **Passwortlänge.** Im Backend von 6 auf 10 gesetzt, ohne die Oberfläche
   mitzuziehen — trotz ausdrücklicher Warnung im Prüfbericht. Die Prüfliste
   zeigte „Mindestens 8 Zeichen" grün, der Server wies mit
   „Validierungsfehler" ab. Jetzt 8 auf beiden Seiten, mit einem Test, der
   Abweichungen künftig meldet.
2. **iOS-Signierung.** Behauptet, der Workflow lege keine Zertifikate an.
   Das Build-Log sagte das Gegenteil.

---

## Zustand der Produktion

Geprüft nach dem letzten Deploy:

| | |
|---|---|
| Container | backend, db, frontend — laufen |
| Datenstand | 31 Nutzer / 2559 Fahrten |
| Migrationen | 0013, 0014, 0015 durch (13 → 16) |
| Mitfahrer-Sätze | 32 → 32, **nichts gelöscht** |
| API-Schlüssel | 4 von 4 gehasht, kein Klartext |
| CSP | genau eine Kopfzeile, ohne Plausible |
| JWT_SECRET | 64 Zeichen, keine Warnung mehr im Log |

**Sicherungen auf dem Server:**
```
/root/vor-2.3.3-20260924-0836.sql.gz      (Datenbank, geprüft lesbar)
/root/Caddyfile.vor-csp-20260924-1004
/root/stack.env.vor-jwt-*
```

Caddy setzt weiterhin HSTS, `X-Content-Type-Options` und `X-Frame-Options`
(TLS endet dort). Die CSP kommt aus `frontend/security-headers.conf`.

---

## OFFEN

### Testen

- **Angemeldet durchklicken** — der wichtigste offene Punkt, siehe oben.
- **Echtes Android-Gerät** wurde erwogen. Anforderungen aus dem Projekt:
  `minSdk 24`, aber `targetSdk 36` — ein altes Gerät zeigt die relevanten
  Probleme nicht. Sinnvoll: Android 14+, herstellerfremder Launcher
  (Kurzbefehle verhalten sich dort anders), eher kleiner Bildschirm
  (Trefferflächen). Offen blieb die Frage, welche Geräte die Nutzer
  tatsächlich haben.
- **Emulator**: nur auf ausdrückliche Ansage.

### Braucht einen Build oder ein Gerät

- **Ungenutzte Plugins** (`@capacitor/network`, `@capacitor/preferences`):
  wirklich ungenutzt, Entfernen braucht `cap sync` und einen Android-Build.
  Die Begründung der alten Liste trifft nicht zu — `ACCESS_NETWORK_STATE`
  steht nicht im Manifest.
- **Kurzbefehl-Kaltstart auf iOS** (`Kurzbefehle.swift:53-58`): Der in `:57`
  versprochene Neuversuch beim Vordergrund-Wechsel fehlt.
- **Play Console**: App `de.godsapp.fahrtenbuch` **nicht angelegt**. Nötig:
  Konto-Typ klären, AAB, Play App Signing, Data-Safety, Content Rating,
  Datenschutz-URL. Ein `android-release.yml` analog zu `ios-release.yml`
  wäre ~½ Tag. Actions-Minuten sind für dieses Repo kostenlos (öffentlich).
- **Exportkonformität automatisieren.** Muss derzeit nach jedem Build von
  Hand gesetzt werden, sonst bleibt er in TestFlight hängen (am 24.09. bei
  Build 32 passiert). Ein Schritt am Ende von `ios-release.yml`, der nach
  dem Upload auf die Build-ID wartet und `usesNonExemptEncryption: false`
  patcht, würde das erledigen — der ASC-Key liegt im Workflow ohnehin schon
  vor.

### Bewusst verschoben

- **`fahrten.abrechnung` ohne Fremdschlüssel** (6 Fahrten zeigen auf den
  gelöschten Träger 19). Entscheidung: Daten bleiben.
- **`/var/lib/docker` 46 von 47 GB** — `docker system df` ansehen.
- **Rückspielung des DB-Dumps ungeprüft** — zuletzt 17.08., seither fünf
  Migrationen.
- **`user_profiles.email` ohne UNIQUE.** Die Kollisionsprüfung greift an
  allen drei Schreibwegen; ein Index bräuchte vorher einen Blick auf
  vorhandene Dubletten in den Produktionsdaten.
- **Deploy-Skripte**: DB-Passwort per `-p"$kennwort"` auf der Kommandozeile
  (`deploy/deploy.sh:94-96`), `StrictHostKeyChecking=no` (`:44`).
- **Gemeinsame Ablage** für den Signierungs-Befund über alle drei Projekte:
  `~/Documents/claude-workspaces/patterns/store-release-toolkit/` wurde
  vorgeschlagen, aber bewusst nichts dort abgelegt.

### Bleibt bestehen

- **Dependabot, 2 Meldungen** (beide `uuid`, `GHSA-w5hq-g745-h8pq`):
  Betroffen sind `uuid.v3/v5/v6` mit eigenem `buf`-Argument; `exceljs` und
  `xcode` rufen nur `uuidv4`. Im Frontend reines Build-Werkzeug, null Treffer
  im Bundle. Der angebotene Fix wäre ein Major-Rückschritt.
  **Zum Schließen geeignet als „Vulnerable code is not actually used"** —
  nicht als „fixed", denn behoben ist nichts.
- **Preload-Warnungen im Browser**: Folge des Bundle-Splittings, harmlos.
- **Deploy-Skript meldet gelegentlich zu früh** „Container läuft mit älterem
  Image", während er noch startet. Einmal passiert, war ein Fehlalarm.

---

## Betrieb

- **Deploy**: `./deploy/deploy.sh dithmarschen` (braucht `KKD_SSH_PASS`).
  Sichert vorher die Datenbank, prüft danach Erreichbarkeit, Image-Stand und
  Datenstand. `test` zielt auf `server.godsapp.de`.
- **iOS-Build**: `.github/workflows/ios-release.yml`, nur
  `workflow_dispatch`. Version und Build-Nummer **vorher** in der pbxproj
  setzen und committen — der Workflow zählt nicht hoch, und App Store
  Connect lehnt eine schon hochgeladene Nummer ab.
- **Signierung**: Beide Stellen müssen manuell signieren — die
  Release-Konfiguration **und** die ExportOptions. Begründung im Kopf von
  `ios-release.yml`.
- **Backup**: `/opt/backups/backup.sh`, Cron 3:00, Hetzner Storage Box.

## Arbeitsregeln

- **Emulator/Simulator nur auf ausdrückliche Ansage** — eine Freigabe gilt
  für den Anlass, nicht für die Sitzung.
- Testserver ist `server.godsapp.de`. **Abweichung am 24.09.:** Auf
  ausdrückliche Ansage wurde direkt auf KKD deployt. Die Regel gilt weiter.
- CHANGELOG bei jedem nutzersichtbaren Commit, OpenAPI bei jeder
  Routenänderung.
- Jeder Befund aus einem Audit ist eine **Behauptung**. Vor dem Beheben
  gegen den Code prüfen.
