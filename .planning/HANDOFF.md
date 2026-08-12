# Handoff — Stand 13.08.2026, 02:00

Für die nächste Sitzung. Laufendes Vorhaben: **Mitfahrer:innen und die
Erstattungsformeln geradeziehen** — auf der Testumgebung, mit einem Dump der
echten Produktionsdaten.

---

## Erledigt in der Sitzung vom 13.08. (6 Commits, alle NICHT gepusht)

Auf ausdrücklichen Wunsch bleibt alles lokal — ein Push auf `master` würde
automatisch auf Produktion deployen.

| Commit | Inhalt |
|---|---|
| `fceac98` | **Erstattungsformeln vereinheitlicht** — alle vier Stellen nutzen jetzt `utils/erstattung.js` |
| `50a7be9` | `richtung` als Enum validiert (vorher beliebiger String → 500er) |
| `7fdf833` | Wohnort bleibt pro Nutzer eindeutig (API konnte zwei setzen) |
| `612d886` | Registrierung legt bei Mailfehler kein halbes Konto mehr an |
| `650794f` | Ungenutzte `Modal.js` entfernt |
| `5537c9b` | **Migration 0009** — Spalte `partner_fahrt_id` + Bestandspaare |

### Die Erstattungsformeln — gemessen, nicht geschätzt

An den echten Daten vorher/nachher verglichen (Monatsübersicht gesamt):

```
Nutzer   alt        neu       Jahr 2025
9        843,35 €   33,00 €    4,90 €
16       125,10 €   13,65 €   13,65 €
17        52,80 €    3,10 €    3,10 €
18       208,40 €    6,45 €    6,45 €
30        46,80 €    1,20 €    0,60 €
```

Bei 16/17/18 stimmen Monats- und Jahresübersicht jetzt **exakt überein** —
vorher wichen die zwei Endpunkte um das 9- bis 32-fache voneinander ab. Das
ist der eigentliche Beleg: zwei getrennt implementierte Wege, dasselbe
Ergebnis. Die Restdifferenz bei 9 und 30 ist erklärt (siehe Datum-Tippfehler).

### Beinahe-Fehler, der auffiel

`backend/utils/erstattung.js` **existierte bereits** mit vier Funktionen, die
der Excel-Export nutzt. Ein Überschreiben hätte den Export zum Absturz
gebracht. Die neuen Funktionen liegen jetzt *neben* den alten. Wer dort
weiterarbeitet: erst lesen, dann schreiben.

### Migration 0009 — geschrieben und geprüft, aber noch NICHT angewendet

Gegen eine Kopie der Produktionsdaten getestet, Testdatenbank danach entfernt:

- **769 Paare verknüpft**, alle wechselseitig, 0 Fehler in fünf Prüfungen
- **924 unverknüpft**: 504 Freitext-Orte, 253 echte Einzelfahrten,
  **167 mehrdeutig** — bewusst offen gelassen
- Zweiter Durchlauf ändert nichts (wiederholbar)

Der Anlass löst die Mehrdeutigkeit: „Beerdigung Thode" ↔ „Rückfahrt:
Beerdigung Thode". Am Testtag 2024-08-14 mit zwei gleichen Strecken wurde
korrekt 63↔64 und 65↔66 verknüpft, ohne Kreuzverbindung.

Vier Fallstricke, die dabei wirklich zuschlugen (Details in der
Commit-Message von `5537c9b`): DDL committet implizit; MySQL 8.4 kennt kein
`ADD COLUMN IF NOT EXISTS`; der Migrator schickt Statements einzeln, weshalb
auch spätere Statements `PREPARE` brauchen; eine `TEMPORARY TABLE` lässt sich
nicht zweimal im selben Query öffnen.

### Neuer Befund: Datum-Tippfehler in den Produktionsdaten

Vier Fahrten haben ein vertipptes Jahr — sie fallen dadurch vor den ersten
Erstattungssatz und laufen in den Fallback:

| Fahrt | Datum | richtig wohl |
|---|---|---|
| 139, 140 (Nutzer 9) | `0024-09-18` | 2024-09-18 |
| 984, 985 (Nutzer 30) | `0525-05-11` | 2025-05-11 |

Nicht korrigiert — Bestandsdaten anzufassen ist deine Entscheidung.

---

## Wo wir stehen

`master`, 7 Commits über dem letzten Handoff, **alles auf Produktion
(kkd-fahrtenbuch.de) ausgeliefert und im Browser geprüft**.

| | vorher | jetzt |
|---|---|---|
| Dependabot | 149 (5 kritisch, 74 hoch) | **1** |
| npm audit Frontend | 25 | **0** |
| Build | ~40 s | 1,8 s |

### Was heute live ging

- **Vite statt react-scripts** — Build-Werkzeug gewechselt, damit sind die 25
  Frontend-Meldungen weg
- **Ein Muster für alle Listen** — Tipp auf die Zeile öffnet ein Sheet mit
  Details und Aktionen. Fahrten, Startseite, Träger, Orte, Distanzen,
  Favoriten, Erstattungssätze, API-Zugriff. Swipe-Geste und Icon-Buttons in
  den Zeilen sind weg
- **Wohnort im Profil** — sichtbar, mit Warnung wenn keiner gesetzt ist,
  direkt dort auswählbar. Er liefert die Anschrift im Abrechnungsformular
- **„Rückfahrt hinzufügen"** — legt die Gegenrichtung am selben Tag an
- **Mitfahrer:innen im Formular** — eigenes Feld statt Chips unter dem
  Speichern-Button; alle Dialoge laufen jetzt über dieselbe Sheet-Komponente
- **Neuigkeiten** — sieben Highlight-Karten mit den Wünschen aus dem
  Kollegium, plus Sicherheitshinweis
- **Sicherheits-Header in Caddy** — HSTS, CSP, X-Frame-Options,
  Referrer-Policy, Permissions-Policy
- **Fahrten- und Dashboard-Tabelle sehen gleich aus** — Träger bricht um
  statt abzuschneiden, Mitfahrer-Hinweis gedeckt statt in Petrol, gleiche
  Spaltenbreiten (nur die Datumsspalte bleibt breiter, dort steht das Jahr)

### Zwei Fallen, die dabei zweimal zugeschlagen haben

Beim Umbau der Listenzeilen auf `<button>`:
1. `<div>` → `<span>` nimmt Blockelementen den Zeilenumbruch — die
   Mitfahrer-Erstattung stand plötzlich neben statt unter dem Betrag
2. `border: none` löscht auch die Trennlinie zwischen den Zeilen — auf dem
   Dashboard verschwand sie unbemerkt

Beides ist behoben; wer weitere Listen umbaut, sollte darauf achten.

---

## Nächstes Vorhaben: Mitfahrer:innen und Erstattung

### Das Kernproblem

Ein Mitfahrer hängt über `mitfahrer.fahrt_id` an **genau einer** Fahrt. Die
Auswahl „Hin- und Rückfahrt" ist deshalb heute nur ein Etikett:

- **Unsichtbar bei der Gegenfahrt.** Wer bei der Hinfahrt mit „beide"
  eingetragen ist, taucht beim Öffnen der Rückfahrt nicht auf
- **Kein Zusammenhang beim Löschen.** Wird die Rückfahrt gelöscht, ändert sich
  am Mitfahrer nichts — er hing nie daran
- **Die Erstattung ignoriert die Richtung.** `mitfahrer.length × Satz × km`
  zählt „beide" genauso wie eine einfache Strecke
- **Der Export widerspricht dem.** `excelExport.js:203-206` füllt bei
  „hin_rueck" *beide* Spalten des Mitnahmeblatts, rechnet die Kilometer aber
  nur einmal

**Beschlossene Lösung:** Zusammengehörige Hin-/Rückfahrten über eine neue
Spalte verknüpfen. Dann ist „beide" als zwei echte Einträge speicherbar,
überall sichtbar, einzeln löschbar — und die Erstattung stimmt von selbst.
Zusammengehörige Fahrten sollen in der Liste auch kenntlich sein.

### Die vier Erstattungsformeln (müssen angeglichen werden)

Alle in `backend/controllers/fahrtController.js`:

| Zeile | Funktion | Formel | Bewertung |
|---|---|---|---|
| 281 | `getMonthlyReport` | `mitfahrer.length × Satz × km` | korrekt je Fahrt |
| 422 | `getReportRange` | `mitfahrer.length × Satz × km` | korrekt je Fahrt |
| 544 | `getMonthlySummary` | `COUNT(DISTINCT m.id) × Satz × SUM(km)` | **grob falsch** |
| 700 | `getYearSummary` | `COUNT(m.id) × Satz × km` | falsch, ohne DISTINCT |

**Zeile 544 multipliziert die Mitfahrer-Anzahl eines ganzen Monats mit der
Kilometersumme dieses Monats.** An echten Produktionsdaten nachgerechnet:

```
Monat     km-Summe  Mitfahrer   laut Formel   korrekt
2024-09     130,00      6          39,00 €     3,10 €   (12-fach)
2024-11     338,00      4          67,60 €    14,10 €   ( 5-fach)
2025-07      72,00      6          21,60 €     1,80 €   (12-fach)
```

**Entwarnung:** Die Endpunkte `/monthly-summary` und `/year-summary` werden
vom Frontend **nirgends aufgerufen**, und der Excel-Export nutzt
`getMonthlyReport` — also die korrekte Formel. Es wurde nie zu viel
ausgezahlt. Aber der Fehler ist eine Zeitbombe: Wer die Endpunkte anschließt,
bekommt falsche Beträge.

Ziel: **eine** gemeinsame Funktion für alle vier Stellen.

### Was dabei nicht kaputtgehen darf

1. **Der Excel-Export darf sich nicht verdoppeln.** Heute erzeugt ein
   „hin_rueck"-Mitfahrer *eine* Zeile im Mitnahmeblatt mit *einfachen*
   Kilometern (`excelExport.js:285-309`, Summe in `G39`, Betrag in `G42`).
   Werden daraus zwei Einträge, sind es zwei Zeilen mit je vollen Kilometern —
   und der Kirchenkreis zahlt doppelt. Die Logik in `:203-206` muss von „ein
   Eintrag füllt zwei Spalten" auf „ein Eintrag füllt eine Spalte" umgestellt
   werden.
2. **`Mitfahrer.updateMitfahrerForFahrt`** (`backend/models/Mitfahrer.js:43-104`)
   ist strikt auf **eine** `fahrt_id` gescoped. Die Hälfte an der Partnerfahrt
   ist für den Diff unsichtbar; ein PUT auf die Hinfahrt kann sie nie pflegen.
3. **Beim Löschen einer Fahrt** verschwinden ihre Mitfahrer per DB-CASCADE.
   Die Hälfte an der Partnerfahrt bliebe zurück und würde weiter erstattet —
   dafür gibt es heute keinerlei Aufräumcode.
4. **Bestandsdaten bleiben unangetastet** (so entschieden): 52 der 64
   Mitfahrer stehen auf `hin_rueck`, teils in eingereichten Monaten. Ein
   Umschreiben würde 52 Abrechnungen rückwirkend verändern. Die neue Regel
   gilt nur für neu angelegte und bearbeitete Einträge.
5. **`richtung` ist in keinem Zod-Schema als Enum validiert**
   (`backend/schemas/fahrtSchemas.js:15,32,39,45`) — ein ungültiger Wert
   schlägt erst als DB-Fehler durch.

### Ausgangslage (geprüft an Produktionsdaten, 12.08.)

- **969 Fahrtpaare** bei 2.462 Fahrten — knapp 80 % sind Hin-und-Rück
- **64 Mitfahrer** gesamt: 52 `hin_rueck`, 9 `hin`, 3 `rueck`
- `fahrten` hat **keine** Verknüpfungsspalte (`0001_initial_schema.sql:112-133`,
  seither unverändert)
- `mitfahrer.richtung` ist `ENUM('hin','rueck','hin_rueck') NOT NULL`,
  FK auf `fahrten(id) ON DELETE CASCADE`
- Nächste freie Migrationsnummer ist **0009** (0007 ist doppelt vergeben)
- **Keinerlei Tests im Projekt** — weder Backend noch Frontend. Die
  Abrechnungslogik ist vollständig ungetestet

### Fallstricke beim Migrieren

- **DDL committet in MySQL implizit.** Die Transaktion des Migrators schützt
  ein `ALTER TABLE` nicht: Schlägt ein nachfolgendes `UPDATE` fehl, bleibt die
  Spalte bestehen, der `migrations`-Eintrag fehlt — beim nächsten Start
  scheitert die Datei mit „Duplicate column name". Migration so schreiben,
  dass sie das übersteht.
- Der Migrator trennt Statements **zeilenweise am Semikolon**
  (`Migrator.js:48-85`). Kein `;` in Strings oder am Ende mehrzeiliger
  Kommentare; `/* */` wird nicht verstanden, nur `--`.
- Für das einmalige Verknüpfen: gleicher `user_id`, gleiches `datum`,
  `a.von_ort_id = b.nach_ort_id AND a.nach_ort_id = b.von_ort_id`. Achtung auf
  `NULL`-Orte (einmalige Adressen) und auf Tage mit mehreren gleichen
  Strecken — sonst entstehen n:m-Verknüpfungen.

### Vorgehensvorschlag

1. ~~Testumgebung mit frischem Produktions-Dump aufsetzen~~ **erledigt**
2. ~~Migration `0009` schreiben und gegen den Dump testen~~ **erledigt**
   (769 Paare, geprüft; noch nicht angewendet)
3. ~~Eine gemeinsame Erstattungsfunktion, alle vier Stellen darauf umstellen~~
   **erledigt** (Beträge an echten Daten verglichen)
4. **Als Nächstes:** Backend — Verknüpfung beim Anlegen setzen, beim Löschen
   auflösen, Mitfahrer-Spiegelung bei „beide"
5. Export: Mitnahmeblatt auf „ein Eintrag = eine Zeile" umstellen und
   gegenrechnen, dass die Summen gleich bleiben — **der riskante Schritt**
6. Frontend: Rückfragen beim Ändern/Löschen, Kennzeichnung der Paare
7. Erst nach Vergleich der Beträge auf Produktion

### Konkret für Schritt 4

- `Fahrt.create` setzt `partner_fahrt_id` wechselseitig, wenn die Rückfahrt
  über „Rückfahrt hinzufügen" entsteht
- `Fahrt.delete`: Der FK steht auf `ON DELETE SET NULL`, die Partnerfahrt
  verliert also nur den Verweis. Die **Mitfahrer-Hälfte** an der Partnerfahrt
  muss aber aktiv aufgeräumt werden — dafür gibt es weiter keinen Code
- `Mitfahrer.updateMitfahrerForFahrt` ist weiterhin auf **eine** `fahrt_id`
  gescoped (`models/Mitfahrer.js:43-104`) — für die Spiegelung muss die
  Partnerfahrt einbezogen werden

---

## Umgebung

**Produktion** — hier läuft der aktuelle Stand:
- `https://kkd-fahrtenbuch.de`, Server 185.248.143.234
- Stack `/opt/fahrtenbuch/`, Images von Docker Hub (`revisoren/fahrtenbuch-*`)
- **Auto-Deploy: jeder Push auf `master` baut und deployt.** Der
  Portainer-Webhook ist unzuverlässig — nach dem CI-Build zur Sicherheit
  `docker compose pull frontend && docker compose up -d frontend`
- Backups: täglich 3:00 Uhr nach Hetzner. Manuelle vor Eingriffen unter
  `/opt/backups/vor-*.sql.gz`
- Reverse Proxy: **Caddy**, `/etc/caddy/Caddyfile` (Sicherheits-Header als
  Snippet `sicherheits_header`)

**Testumgebung** — **steht bereit für den Mitfahrer-Umbau**:
- `https://fahrtenbuch.godsapp.de`, Server `server.godsapp.de`
- Stack `/opt/stacks/fahrtenbuch/`, Repo-Checkout in `repo/`, lokaler Build
- **Enthält seit 12.08. 01:03 einen frischen Produktions-Dump**: 29 Nutzer,
  2.462 Fahrten, 64 Mitfahrer (52 `hin_rueck`, 9 `hin`, 3 `rueck`), 159 Orte.
  Damit lassen sich Migration und Erstattungsformeln an echten Daten prüfen
- Der Stand davor liegt auf dem Server unter `/tmp/test-vorher.sql.gz`
- **Achtung: echte Personendaten** (Namen, IBANs). Für Tests eigene
  Wegwerf-Konten anlegen und hinterher entfernen; Bestandsdaten nicht anfassen
- `docker-compose` v1 bricht beim Neuerstellen mit `KeyError: 'ContainerConfig'`
  ab. Workaround: Container per `docker rm -f` entfernen, dann `docker run`
  (Netz `fahrtenbuch_default`, Alias `frontend`, `--env-file .env`,
  `-p 9642:80`, `nginx-proxy.conf` als Volume)
- SMTP dort ist ungültig (`535 authentication failed`) — die Registrierung
  legt den Nutzer an und scheitert danach am Mailversand mit HTTP 500

---

## Was offen bleibt

- **Mitfahrer-Umbau + Erstattungsformeln** (siehe oben) — das nächste Vorhaben
- **Fahrtenliste sortierbar machen** (Nutzerwunsch): Klick auf eine
  Spaltenüberschrift sortiert danach — Datum, Anlass, Träger, km, Betrag,
  Status. Zweiter Klick dreht die Richtung um. Betrifft
  `frontend/src/components/fahrten/FahrtenTabelle.js` (Desktop-Kopfzeile) und
  `frontend/src/components/FahrtenListe.js` (`sortierteFahrten` ist dort ein
  `useMemo`, aktuell fest nach Datum absteigend). Auf dem Handy gibt es keine
  Kopfzeile — dort bräuchte es einen eigenen Auslöser, etwa ein
  Sortier-Sheet. Vorher klären, ob die Sortierung nur die Anzeige betrifft
  oder auch den Export.
- **Datum-Tippfehler in vier Fahrten** (siehe oben) — Bestandsdaten, deine
  Entscheidung
- **167 mehrdeutige Fahrten** bleiben nach Migration 0009 unverknüpft. Falls
  gewünscht, ließen sie sich in der Oberfläche von Hand verbinden
- **Plausible liefert ein ungültiges Zertifikat**
  (`ERR_CERT_COMMON_NAME_INVALID` für `plausible.godsapp.de`) — die Statistik
  zählt nichts. Liegt auf dem godsapp-Server, nicht hier
- ~~Wohnort-Eindeutigkeit im Backend absichern~~ **erledigt** (`7fdf833`)
- **Langer Anlass wird in der Fahrten-Karte abgeschnitten**, weil die
  km-Angabe daneben sitzt
- ~~Registrierung antwortet mit 500 bei SMTP-Fehler~~ **erledigt** (`612d886`)
- ~~`Modal.js` ist ungenutzt~~ **erledigt** (`650794f`)
- Sechs Fahrten von `Brinkmann` (Jan 2025) mit gelöschtem Träger, 0,00 € —
  bewusst nicht korrigiert
- Zwei Dependabot-Meldungen im Backend (uuid via exceljs), nicht ausnutzbar

---

## Arbeitsweise, die sich bewährt hat

- Vor dem Ändern am laufenden System messen, nicht schätzen. Die
  Formel-Abweichung oben ist erst durch Nachrechnen an echten Daten sichtbar
  geworden
- Nach jedem Block: bauen, deployen, im Browser gegenprüfen — Screenshots
  zeigen Layoutfehler, die im Accessibility-Baum unsichtbar sind
- Commit-Messages erklären das *Warum* und nennen die gemessenen Zahlen
- Bei Umbauten an Listen: `<div>` → `<span>` in einem `<button>` nimmt
  Blockelementen den Zeilenumbruch. Zweimal übersehen, zweimal nachgebessert
