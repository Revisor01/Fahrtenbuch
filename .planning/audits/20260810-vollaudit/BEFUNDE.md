# Vollaudit Fahrtenbuch — 10.08.2026

Acht parallele Prüfläufe über ~16.000 Zeilen (Frontend, Backend, DB, Export,
Layout, Deployment) plus eigene Live-Tests gegen die Testumgebung.

**Wichtig:** Die Testumgebung enthält eine Kopie der Produktionsdaten (29 echte
Nutzerkonten). Alle Live-Tests liefen über eigens angelegte Wegwerf-Konten,
die anschließend entfernt wurden. Bestandsdaten wurden nicht verändert.

---

## KRITISCH — sofort beheben

### 1. Kontoübernahme über abgelaufene Tokens (live verifiziert)

`backend/controllers/userController.js:343-346`

`/api/users/set-password` sucht den Nutzer über
`verification_token OR password_reset_token` **ohne jede Ablaufprüfung**.
`verification_token` bekommt zudem nie ein Ablaufdatum.

**Live nachgewiesen** an einem eigens angelegten Testkonto:
- Token 30 Tage abgelaufen
- regulärer Endpunkt `/reset-password/verify` → korrekt `400 Ungültiger oder abgelaufener Token`
- `/set-password` mit demselben Token → `200 Passwort erfolgreich gesetzt`
- anschließender Login mit dem neuen Passwort → **erfolgreich**

Der Endpunkt ist ohne Authentifizierung erreichbar. In der Datenbank lag zum
Prüfzeitpunkt ein bereits abgelaufener Reset-Token eines echten Kontos.
Wer je einen alten Einladungs- oder Reset-Link besitzt (altes Postfach,
weitergeleitete Mail), kann das Konto zeitlich unbegrenzt übernehmen.

**Fix:** Ablaufprüfung wie in `User.resetPassword` (`User.js:159-160`)
ergänzen und `verification_token` mit Ablaufdatum versehen.

### 2. Falsche Beträge im offiziellen Abrechnungsformular

`backend/utils/excelExport.js:406-408` (Zeitraum), `:333-335` (Monat)

Der Export ermittelt **einen** Erstattungssatz zum Stichtag (letzter Tag des
Endmonats) und multipliziert damit alle Kilometer des Zeitraums. Die
App-Anzeige rechnet dagegen korrekt pro Fahrtdatum
(`fahrtController.js:270-271`).

Bei einer Satzänderung im Exportzeitraum (z. B. 0,30 → 0,35 zum 1.1.) werden
alle früheren Fahrten mit dem neuen Satz abgerechnet — überhöhte Forderung im
eingereichten Formular, bei Satzsenkung Geldverlust. Zusätzlich weicht das
Formular von der App-Anzeige ab.

**Das ist der Core Value der App** („Excel-Export muss das offizielle Formular
korrekt abbilden").

---

## HOCH

### 3. Mitfahrer mit Richtung „Rück" gehen beim Bearbeiten verloren

`frontend/src/FahrtForm.js:122`

```js
mitfahrer.filter(m => m.richtung === 'hin' || m.richtung === 'hin_rueck')
```

`'rueck'` ist ein gültiger Wert (`MitfahrerModal.js:77`) und wird verworfen.
Das Backend löscht anschließend alle nicht übermittelten Mitfahrer
(`Mitfahrer.js:43-59`).

**In den echten Daten betroffen:** 3 Mitfahrer-Einträge mit `richtung='rueck'`
(geprüft per DB-Abfrage). Wer eine solche Fahrt bearbeitet, verliert sie
dauerhaft — inklusive Erstattungsanspruch.

### 4. Alle Mitfahrer entfernen ist wirkungslos

`backend/controllers/fahrtController.js:147` — `if (mitfahrer?.length > 0)`
überspringt das leere Array. Wer im Bearbeiten-Dialog alle Mitfahrer entfernt
und speichert, bekommt eine Erfolgsmeldung; nach dem Neuladen sind sie zurück.

### 5. Fremde Orte sind über die API abrufbar (live verifiziert)

`backend/models/Ort.js:37-48`

`findById` filtert nicht nach `user_id`. Der Controller
(`ortController.js:61`) übergibt zwar eine `userId`, das Model ignoriert sie.

**Live nachgewiesen:** `GET /api/orte/6` als fremder Nutzer → `200` mit Name
und vollständiger Adresse eines Kollegen. Alle anderen geprüften Endpunkte
(Fahrten, Träger, Distanzen) antworten korrekt mit 404.

### 6. Kilometersummen werden zu Zeichenketten verkettet

`backend/controllers/fahrtController.js:553, 688, 703`

mysql2 liefert DECIMAL als String (`decimalNumbers` ist in
`config/database.js:4-12` nicht gesetzt). `acc.kilometer += fahrt.kilometer`
ergibt damit Zeichenketten-Verkettung.

Empirisch belegt: `12.50 + 23.00 + 8.25` ergibt im Code `"012.5023.008.25"`
statt `43.75`. Betrifft Jahresstatistik und Mitfahrer-Kilometer der
Monatsübersicht.

### 7. Mitnahmeentschädigung verliert stillschweigend Zeilen

`backend/utils/excelExport.js:197-199` (Dedupe nach Datum+Name verwirft eine
zweite Fahrt derselben Person am selben Tag — der Normalfall Hin- und
Rückfahrt) und `:240-256` (ab Zeile 30 wird ohne Warnung abgeschnitten,
während normale Abrechnungen korrekt auf mehrere Dateien verteilt werden).

Folge in beiden Fällen: zu niedrige Erstattung, ohne jeden Hinweis.

### 8. Abrechnungsträger mit Fahrten ist löschbar — **bereits eingetreten**

`backend/controllers/abrechnungstraegerController.js:299-311`

Der vorhandene Schutz `checkForFahrten` (`AbrechnungsTraeger.js:141-147`) wird
nirgends aufgerufen (per Suche verifiziert); der `catch` prüft auf eine
Fehlermeldung, die kein Code je erzeugt. `fahrten.abrechnung` ist VARCHAR ohne
Fremdschlüssel, also bremst auch die Datenbank nicht.

**Der Schaden ist in den echten Daten bereits vorhanden:** Sechs Fahrten des
Nutzers `Brinkmann` (IDs 107, 108, 111, 112, 117, 118, Januar 2025, zusammen
42 km) verweisen auf den gelöschten Träger 19. Diese Fahrten erscheinen in
Auswertungen und im Export mit **0,00 €** — die Erstattung ist stillschweigend
entfallen.

Neben dem Fix sollte geklärt werden, ob für diese sechs Fahrten noch eine
Nachzahlung fällig ist.

### 9. Fehler werden verschluckt, Erfolg wird trotzdem gemeldet

`frontend/src/contexts/AppContext.js` — sechs Funktionen (`addOrt:266`,
`updateOrt:428`, `addDistanz:315`, `updateDistanz:437`, `deleteFahrt:450`,
`deleteDistanz:470`) fangen Fehler nur mit `console.error` ohne `throw`.

Folge u. a. in `FahrtenListe.js:86-88`: Bei Serverfehler erscheint „Fahrt
gelöscht." samt Rückgängig-Button — die Fahrt ist nach dem Neuladen wieder da.

### 10. Registrierungscode steht im Klartext im Browser

Die Testumgebung liefert unter `/config.js` öffentlich
`registrationCode: 'kkdith2026'` aus. Die serverseitige Prüfung ist damit
wirkungslos.

**Produktion ist nicht betroffen** (dort sind alle Werte leer, Registrierung
geschlossen) — geprüft.

### 11. „Rückgängig"-Knopf im Toast ist unlesbar (objektiv gemessen)

`frontend/src/index.css:766` — `.toast-action` nutzt `--brand-strong` auf der
invertierten Toast-Fläche (`--text` als Hintergrund).

Im Browser gemessen: **Kontrast 1,38:1** (gefordert sind 4,5:1). Betrifft beide
Modi. Das ist ausgerechnet der Knopf, mit dem man eine versehentlich
gespeicherte Fahrt zurücknimmt — der Kernflow der optimistischen Erfassung.

### 12. Modale Dialoge öffnen ohne abdunkelnden Hintergrund

`frontend/src/Modal.js:39, 57`, `FahrtForm.js:397`

Die Overlay-Klassen (`bg-primary-950/30` usw.) werden von Tailwind **gar nicht
erzeugt**, weil die Farben in `tailwind.config.js` als `var(--…)` ohne
`<alpha-value>` definiert sind. Im ausgelieferten Build verifiziert:
`bg-primary-950`, `from-primary-100`, `dark:bg-primary-900` — jeweils **0
Treffer**.

Folge: Mitfahrer- und Ort-Dialog erscheinen ohne Abdunklung, nur mit
Weichzeichner; die Trennlinie im Kopf fehlt.

---

## MITTEL (Auswahl)

- **Doppel-Klick erzeugt Duplikate**: Speichern-Button im Erfassungsflow bleibt
  während des laufenden POST aktiv, wenn „Ort dauerhaft speichern" aktiv ist
  (`ErfassungsFlow.js:323-362`). Ebenso in Träger-, Orts-, Distanz- und
  Benutzer-Dialogen (kein `disabled` während des Requests).
- **Adressvorschläge öffnen sich nach der Auswahl erneut**
  (`AddressAutocomplete.js:22-24`) — der neue Feldwert löst sofort eine neue
  Suche aus. Betrifft von mir zuletzt geänderten Code.
- **Verwaister Ort bei Fehlschlag/Undo**: „Ort dauerhaft speichern" legt den Ort
  vor der Fahrt an; scheitert die Fahrt oder drückt der Nutzer „Rückgängig",
  bleibt der Ort zurück (`ErfassungsFlow.js:322-334, 387-399`).
- **Manuelle Kilometer überleben den Zielwechsel** (`ErfassungsFlow.js:252`) —
  42 km von Ziel A werden stillschweigend für Ziel B übernommen.
- **Fahrt + Mitfahrer ohne gemeinsame Transaktion**
  (`fahrtController.js:86-91`) — bei Fehler bleiben halbe Datensätze zurück.
- **Rate Limiting ohne `trust proxy`** (`backend/app.js`) — hinter Caddy sehen
  alle Nutzer dieselbe IP, also ein gemeinsamer Zähler: 20 Fehlversuche sperren
  den Login für alle 29 Nutzenden.
- **SMTP-Debug-Logging aktiv** (`mailService.js:13-14`) — schreibt bei jedem
  Mailversand Reset-Links in die Container-Logs. In den letzten 300 Zeilen der
  Produktion aktuell keine Tokens gefunden, das Risiko besteht aber.
- **NODE_ENV nie gesetzt** — Express liefert im Fehlerfall Stacktraces an den
  Client aus.
- **Migrator verschluckt Statements** (`utils/Migrator.js:44-61`) — nach einem
  Trigger ohne `BEGIN…END` wird der Rest der Datei verworfen, die Migration
  aber als erfolgreich vermerkt.
- **Ort löschen bei vorhandener Distanz** → generischer 500 statt Erklärung
  (`ortController.js:27-45`).
- **Favoriten-Undo löscht nur die Hinfahrt** (`Dashboard.js:343-353`) — die
  Rückfahrt bleibt gespeichert.
- **Weiße Seite bei defektem localStorage** (`AppContent.js:78`,
  `AppContext.js:13-16`) — ungeschütztes `JSON.parse`/`atob`; der Nutzer bleibt
  dauerhaft ausgesperrt, da der defekte Wert nie gelöscht wird.
- **Sackgasse ohne Abrechnungsträger** (`ErfassungsFlow.js:238`) — Speichern
  stumm deaktiviert, Träger-Sheet leer, kein Hinweis.
- **Modal-Kopf im Dunkelmodus in Fremdfarbe** (`Modal.js:45`) — `dark:bg-gray-800`
  statt Token; sichtbarer blaugrauer Streifen beim Scrollen.
- **Adressvorschläge im Ort-Dialog können unter den Panelrand rutschen**
  (`OrteDistanzenBereich.js:59`) — dort fehlt die Inline-Variante der Liste,
  die im Erfassungsflow genau dafür gebaut wurde.
- **Touch-Ziele unter 44px**: Bearbeiten/Löschen in allen Einstellungslisten
  (`.set-action`, 36px), Modal-Schließkreuz (~24px), „Alle"-Link im Dashboard.
- **Toast überdeckt mobil den Plus-Knopf** (Überlappung 112–142px) — genau nach
  dem Speichern, wenn beide sichtbar sind.
- **~250 Zeilen verwaistes CSS** aus früheren Umbauten (u. a. `.erf-subline`,
  altes Desktop-Dashboard, altes Tabellen-/Card-System).
- **Fahrtenliste hat mobil 4px weniger Seitenrand** als Dashboard und
  Abrechnung — der Inhalt springt beim Tabwechsel.

---

## Korrigierte Fehlalarme

Zwei gemeldete HOCH-Befunde haben sich am realen System **nicht** bestätigt:

- **MySQL öffentlich erreichbar**: Das Compose-Template enthält
  `ports: "3306:3306"`, das reale Deployment aber nicht. Port 3306 ist auf
  beiden Servern von außen dicht (geprüft), ebenso Backend-Port 5000.
- **147 npm-Schwachstellen**: Betreffen fast ausschließlich die Build-Werkzeuge
  (react-scripts und Abhängigkeiten), nicht die ausgelieferte App. Real
  relevant ist allein **nodemailer** (Header-Injection, Update auf ≥ 8.0.9).

---

## Ausdrücklich in Ordnung

- Nutzer-Isolation greift bei Fahrten, Distanzen, Trägern und Favoriten —
  live gegen fremde IDs geprüft (404 statt Daten). Einzige Ausnahme ist Ort
  (Befund 5).
- Alle Datenrouten verlangen einen Token (live geprüft: durchgehend 401).
- Keine SQL-Injection: durchgehend parametrisierte Queries.
- Keine Passwort-Hashes in API-Antworten.
- Tokens werden mit `crypto.randomBytes` erzeugt, nicht mit `Math.random`.
- **Keine Secrets in der Git-Historie** (1.249 Commits vollständig gescannt).
- Leerzustände sind durchweg sauber gebaut — ein frischer Nutzer bekommt
  überall sinnvolle Hinweise statt Abstürzen.
- PDF-Konvertierung (`xlsxToPdf.js`) ist robust: Timeout, klare Fehlermeldung
  bei fehlendem LibreOffice, Aufräumen im `finally`.
- **Kein weiterer Überlauf wie beim Abrechnungsträger.** Alle 36
  `nowrap`-Stellen wurden einzeln bewertet; lange Ortsnamen wie „Tellingstedt
  Kirche/Gemeindehaus/Büro" werden überall gekürzt oder umbrochen. Im Browser
  gegengeprüft: bei 320px und bei Desktop-Breite kein einziges Element außerhalb
  des Viewports, kein horizontales Scrollen.
- z-index-Ebenen sind konfliktfrei gestaffelt (Toast 80 > Sheet 70 >
  Vorschlagsliste 60 > Modal 50 > Plus-Knopf 40).
- Verbindungspool: alle Transaktionspfade rufen `rollback()` und `release()` —
  kein Verbindungsleck gefunden.

---

## Ein zusätzlicher Live-Befund

`GET /api/fahrten/monthly-summary` antwortet mit **HTTP 500**. Ursache ist ein
SQL-Fehler in `fahrtController.js:471`: Die Abfrage selektiert `at.id`, aber
der Alias `at` existiert nur innerhalb der Unterabfrage — außen heißt die
Ableitung `eb`. Korrekt wäre `eb.id`.

**Entwarnung zur Tragweite:** Der Endpunkt wird vom Frontend nirgends
aufgerufen (geprüft), und die Produktion verzeichnet in sieben Tagen null
solcher Fehler. Die vier Vorkommen auf der Testumgebung stammen aus meinen
eigenen Prüfaufrufen. Es ist also ein toter, defekter Endpunkt — zu reparieren
oder zu entfernen, aber kein aktuelles Nutzerproblem.

Gleiches Muster bei ungenutztem Modell-Code, der bei künftiger Verwendung
sofort zuschlägt: `Fahrt.getMonthlySummary` (`models/Fahrt.js:136-154`, **ohne**
`user_id`-Filter — würde Daten aller Nutzer liefern), `Fahrt.getYearSummary`
(`:236-267`, gruppiert nach einer nicht selektierten Spalte) und zwei
User-Methoden, die auf nicht existierende Spalten zugreifen
(`models/User.js:77-84, 167-172`).

---

# NACHTRAG: Behebung (11.08.2026)

Alle Befunde abgearbeitet, vier Commits, auf der Testumgebung deployed und
verifiziert.

## Kritisch — beide behoben und live nachgeprüft

**Kontoübernahme.** `/api/users/set-password` prüft jetzt für beide Token-Arten
das Ablaufdatum; `verification_token` bekam eins (7 Tage, Migration 0008),
Bestandstokens wurden entwertet. Derselbe Angriff, der beim Audit erfolgreich
war, liefert gegen die Testumgebung jetzt HTTP 400.

**Falsche Beträge im Formular.** Jede Fahrt wird mit dem an ihrem Datum
gültigen Satz gerechnet. An echten Daten geprüft (Satzwechsel im August):
**40,42 € statt fälschlich 45,22 €** — 4,80 € Differenz in einem Monat.
Bei gemischten Sätzen weist die Formularzeile den Mischsatz aus.

## Weitere behobene Befunde

- Fremde Orte per API abrufbar → jetzt 404 statt Adresse (live geprüft)
- Mitfahrer mit Richtung „rueck" gingen beim Bearbeiten verloren; leeres
  Mitfahrer-Array wurde ignoriert; beides jetzt transaktional
- Mitnahmeentschädigung verlor Zeilen (Dedupe über Datum+Name, Abschneiden ab
  Zeile 30). Test: 36 km statt 13 km. Satz kommt aus der DB statt hartkodiert
- Kilometersummen waren Zeichenketten (`"012.5023.008.25"` statt `43.75`) —
  `decimalNumbers` im Pool
- Träger mit gebuchten Fahrten sind nicht mehr löschbar
- Jahresübersicht wies Mitfahrer-Erstattung dauerhaft mit 0 € aus
- `monthly-summary` lieferte HTTP 500 (SQL-Aliasfehler)
- Sechs AppContext-Funktionen meldeten Erfolg trotz Fehlschlag
- Doppel-Tap legte Datensätze doppelt an (vier Dialoge plus Erfassungsflow)
- Undo-Knopf im Toast: Kontrast **1,38:1 → 15,19:1** (im Browser gemessen)
- Modale Dialoge öffneten ohne Abdunklung (Tailwind erzeugte die Klassen nie)
- Elf Stellen berechneten Datum/Monat nach UTC
- Weiße Seite bei korruptem localStorage, Interceptor-Stapelung
- Touch-Ziele mobil 36 → 44px, Toast überdeckte den Plus-Knopf
- 72 verwaiste CSS-Blöcke entfernt (396 Zeilen)

## Migrator — Folgefund

Der Parser verwarf nach einem Single-Statement-Trigger den Rest der Datei und
vermerkte die Migration trotzdem als erfolgreich. Migration 0002 lief dadurch
**nie vollständig**; ihre beiden Trigger fehlten. Nach dem Fix trat der bis
dahin verdeckte Fehler zutage (`Duplicate column name 'admin'`) — ebenfalls
behoben, Migration jetzt idempotent.

## Abhängigkeiten

Backend von 5 auf 2 Meldungen: nodemailer 6.9 → 9.0.5, bcrypt 5.1 → 6.0
(damit entfallen tar und node-pre-gyp). **Geprüft: mit bcrypt 5 erzeugte
Hashes werden von 6 korrekt verifiziert** — die Passwörter der 29 Nutzenden
funktionieren weiter.

Verbleiben zwei moderate (uuid via exceljs) — nicht ausnutzbar, die Lücke
betrifft `v3/v5/v6` mit `buf`-Parameter, exceljs nutzt `v4` ohne Puffer.

Frontend bleibt bei 25 Meldungen, ausnahmslos Build-Kette von react-scripts
5.0.1. Nichts davon landet im Bundle; react, axios, react-router-dom und jszip
haben keine offenen Advisories. `npm audit fix --force` würde react-scripts auf
0.0.0 setzen und den Build zerstören. Sauberer Weg wäre ein Wechsel auf Vite —
eigenes Vorhaben.

## CodeQL

War nie eingerichtet, läuft jetzt (201 Regeln, 71 Befunde). Behoben: der
Migrator loggte bei Fehlern das komplette SQL inklusive eingesetzter
Umgebungsvariablen im Klartext. 49 der Befunde sind „missing rate limiting" auf
Routen hinter `authMiddleware` — konservativ, nicht kritisch.

## Offen

- Produktion (kkd-fahrtenbuch.de) unverändert — alles liegt auf dem
  Feature-Branch und der Testumgebung
- Frontend-Build-Kette: Wechsel auf Vite als eigenes Vorhaben
- Die sechs Fahrten mit gelöschtem Träger wurden auf Wunsch nicht angefasst
