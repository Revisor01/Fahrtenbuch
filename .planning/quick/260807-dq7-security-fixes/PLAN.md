---
quick_id: 260807-dq7
slug: security-fixes
date: 2026-08-07
branch: feature/v1.3-dashboard
type: execute
autonomous: true
files_modified:
  - backend/package.json
  - backend/package-lock.json
  - frontend/package-lock.json
  - backend/controllers/abrechnungstraegerController.js
  - backend/controllers/fahrtController.js
  - backend/controllers/favoritController.js
  - backend/controllers/authController.js
  - backend/models/Mitfahrer.js
  - backend/models/Distanz.js
  - backend/models/Fahrt.js
  - backend/schemas/authSchemas.js
  - backend/routes/auth.js
  - backend/routes/users.js
  - backend/initDb.js
  - backend/utils/excelExport.js
  - backend/utils/pdfExport.js
  - backend/utils/erstattung.js
  - docker-compose.example.yml
must_haves:
  truths:
    - "Kein User kann Erstattungssätze, Mitfahrer, Distanzen oder Fahrten fremder User lesen/ändern/löschen"
    - "Registrierung wird serverseitig durch ALLOW_REGISTRATION, ALLOWED_EMAIL_DOMAINS und REGISTRATION_CODE durchgesetzt"
    - "Admin-Passwort wird beim Neustart NICHT mehr auf INITIAL_ADMIN_PASSWORD zurückgesetzt"
    - "Fahrten mit 2+ Mitfahrern erscheinen im Excel/PDF-Export und in den Reports genau einmal"
    - "Exporte rechnen mit dem DB-Erstattungssatz des Trägers statt hartkodiert 0,30 €"
    - "mysql2 ist auf v3.x, xlsx ist entfernt, npm audit ohne kritische Findings"
  artifacts:
    - path: "backend/utils/erstattung.js"
      provides: "Wiederverwendbare zeitabhängige Erstattungssatz-Ermittlung für Exporte"
  key_links:
    - from: "backend/utils/excelExport.js"
      to: "backend/utils/erstattung.js"
      via: "require + getErstattungssatzFuerTraeger"
      pattern: "getErstattungssatzFuerTraeger"
    - from: "backend/controllers/authController.js"
      to: "process.env.ALLOWED_EMAIL_DOMAINS"
      via: "serverseitige Registrierungs-Checks"
      pattern: "ALLOWED_EMAIL_DOMAINS"
---

<objective>
Acht Findings aus dem Backend-Security-Audit beheben: 4 IDOR-/Cross-User-Lücken, unsichere Registrierung, Admin-Passwort-Reset bei jedem Start, Export-Doppelzählung bei Mitfahrern und hartkodierter 0,30-€-Satz in Excel/PDF-Exporten. Dazu mysql2 auf v3 heben und das ungenutzte xlsx-Paket entfernen.

Purpose: Cross-User-Datenzugriffe schließen und die Abrechnungs-Exporte fachlich korrekt machen (Core Value: Export muss stimmen).
Output: 9 atomare Commits auf `feature/v1.3-dashboard`. NICHT mergen, NICHT deployen (weder KKD noch Testserver).
</objective>

<context>
@backend/controllers/abrechnungstraegerController.js
@backend/controllers/fahrtController.js
@backend/controllers/favoritController.js
@backend/controllers/authController.js
@backend/models/Mitfahrer.js
@backend/models/Distanz.js
@backend/models/Fahrt.js
@backend/models/AbrechnungsTraeger.js
@backend/utils/excelExport.js
@backend/utils/pdfExport.js
@backend/initDb.js

**WICHTIG — Verifizierte Abweichungen vom Audit-Text:**
1. Der Passwort-Reset-Request liegt in `backend/routes/users.js` Z.15 (`POST /reset-password/verify` Z.16), NICHT in `routes/auth.js`. Der Register-Limiter kommt in auth.js, der Reset-Limiter in users.js.
2. Das Frontend sendet `registrationCode` BEREITS mit (`frontend/src/components/LoginPage.js` Z.81 im State, Z.112 `axios.post('/api/auth/register', registrationData)`). ABER: `registerSchema` in `backend/schemas/authSchemas.js` kennt nur `username` + `email`, und die validate-Middleware (`backend/middleware/validate.js`) ersetzt `req.body = schema.parse(req.body)` — zod strippt unbekannte Keys. Das Schema MUSS um `registrationCode: z.string().optional()` erweitert werden, sonst kommt der Code nie im Controller an. Frontend NICHT ändern.
3. `xlsx` wird nirgends importiert (grep über backend/ und frontend/src/ bestätigt: kein `require('xlsx')`). Sicher entfernbar.
4. Der Admin-User wird per Migration `backend/migrations/0002_admin_user.sql` mit Passwort-Literal `'PLACEHOLDER_PASSWORD_HASH'` angelegt. `initDb.js` überschreibt dann bei JEDEM Start das Passwort. Der Fix nutzt den Platzhalter als Erstlauf-Erkennung.
5. Die Export-Doppelzählung betrifft nicht nur die Exporte, sondern auch `fahrtController.getMonthlyReport` (Z.174–182, 230) und `getReportRange` (Z.305–307, 357): Beide iterieren über die durch den mitfahrer-JOIN duplizierten Rows → doppelte Fahrten im UI-Report und doppelt summierte Erstattungen. Fix an allen Konsumenten (Memory-Feedback: "Fahrten-Anzahl muss IMMER stimmen").

**Frontend-Kompatibilität (nicht brechen):**
- Registrierung: Frontend prüft Domain/Code clientseitig weiter — Backend-Checks sind additiv. Feldname `registrationCode` exakt so lesen, wie das Frontend ihn sendet.
- Neue Backend-Env-Variablen müssen bei Nicht-Setzen abwärtskompatibel sein (Registrierung erlaubt, keine Domain-/Code-Pflicht), sonst bricht die bestehende Testumgebung.
- Mitfahrer-Update via `updateFahrt` (Frontend sendet `mitfahrer[]` mit optionaler `id`) muss weiter funktionieren — nur fremde IDs abweisen/ignorieren.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Dependencies — mysql2 v3, xlsx entfernen, npm audit fix</name>
  <files>backend/package.json, backend/package-lock.json, frontend/package-lock.json</files>
  <action>
  In `backend/`: (1) `npm install mysql2@^3` (hebt ^2.3.0 auf aktuelles 3.x — kritische RCE-Advisories GHSA-Reihe zu mysql2 &lt;3.9.x). (2) `npm uninstall xlsx` (ungenutzt, verifiziert). (3) `npm audit fix` OHNE `--force`; verbleibende Findings, die `--force` erfordern würden, nur dokumentieren, nicht erzwingen. In `frontend/`: nur `npm audit fix` ohne `--force` (react-scripts-Findings sind Build-Time, bei Breaking-Change-Gefahr belassen und notieren).

  API-Kompatibilität mysql2 v3: `backend/config/database.js` nutzt ausschließlich `createPool({host, user, password, database, waitForConnections, connectionLimit, queueLimit})` + `pool.promise()` — alles in v3 unverändert gültig. Kein Codeänderungsbedarf erwartet. Bekannte v3-Verhaltensänderung: strengere Typprüfung bei Prepared-Statement-Parametern (undefined-Parameter werfen Fehler statt still zu NULL zu werden) — das Projekt normalisiert bereits überall mit `|| null`, daher unkritisch. Nach Install prüfen, ob `npm ls mysql2` genau eine 3.x-Version zeigt.
  </action>
  <verify>
    <automated>cd backend && npm ls mysql2 | grep -q "mysql2@3" && node --check config/database.js && node -e "require('./config/database')" 2>&1 | grep -v "ER_\|ECONNREFUSED" ; ! grep -q '"xlsx"' package.json</automated>
  </verify>
  <done>backend/package.json enthält mysql2 ^3.x und kein xlsx mehr; `node -e "require('./app')"` schlägt höchstens an DB-Verbindung fehl, nicht an Modul-Auflösung; npm audit zeigt keine kritischen mysql2-Advisories mehr.</done>
  <commit>chore(deps): mysql2 auf v3 gehoben, ungenutztes xlsx entfernt, npm audit fix</commit>
</task>

<task type="auto">
  <name>Task 2: IDOR Erstattungssätze — Ownership via abrechnungstraeger erzwingen</name>
  <files>backend/controllers/abrechnungstraegerController.js</files>
  <action>
  In `backend/controllers/abrechnungstraegerController.js` vier Handler absichern (alle bekommen `req.user.id`, geroutet hinter authMiddleware in `backend/routes/abrechnungstraeger.js`):

  1. `updateErstattungssatz` (Z.30–84): Vor dem UPDATE Ownership prüfen: `SELECT id FROM abrechnungstraeger WHERE id = ? AND user_id = ?` mit `[id, req.user.id]`; bei 0 Rows → 404 "Abrechnungsträger nicht gefunden". (Der Duplikat-Check Z.42–45 und das UPDATE Z.68–73 bleiben, sind dann durch den Vorab-Check abgesichert.)
  2. `deleteErstattungssatz` (Z.86–117): Gleicher Ownership-Vorab-Check innerhalb der Transaktion (auf `connection.execute`), VOR dem COUNT-Check Z.94–97. Achtung: Bei Early-Return 400/404 innerhalb der Transaktion vorher `connection.rollback()` aufrufen (der bestehende 400-Return Z.99–101 released ohne Rollback — beim Umbau mit absichern).
  3. `addErstattungssatz` (Z.235–255): Gleicher Ownership-Vorab-Check vor dem INSERT Z.245–248; bei 0 Rows → 404.
  4. `getErstattungshistorie` (Z.119–142): Controller-SQL (Z.121–127) ersetzen durch die bereits gescopte Model-Methode `AbrechnungsTraeger.getErstattungshistorie(req.params.id, req.user.id)` (Model Z.157–168, JOIN auf user_id vorhanden). Die bestehende Duplikat-Filterung nach `gueltig_ab` (Z.128–136) auf das Model-Ergebnis anwenden, damit die Response identisch bleibt.
  </action>
  <verify>
    <automated>node --check backend/controllers/abrechnungstraegerController.js && grep -c "user_id = ?" backend/controllers/abrechnungstraegerController.js && grep -q "AbrechnungsTraeger.getErstattungshistorie" backend/controllers/abrechnungstraegerController.js</automated>
    <human-check>Curl-Testplan (dokumentieren, lokal mit 2 Test-Usern ausführbar): User B holt Token, dann `PUT /api/abrechnungstraeger/{traegerId_von_A}/erstattung/{satzId}` mit Body `{"betrag": 99}` → muss 404 liefern (vorher 200). Ebenso DELETE, POST /erstattung und GET /historie → 404 bzw. leeres Verhalten statt Fremddaten.</human-check>
  </verify>
  <done>Alle vier Handler liefern 404 bei fremder Träger-ID; eigene Träger funktionieren unverändert (200/201).</done>
  <commit>security: IDOR bei Erstattungssätzen geschlossen — Ownership-Check auf abrechnungstraeger</commit>
</task>

<task type="auto">
  <name>Task 3: IDOR Mitfahrer — Fahrt-Ownership + fahrt_id-Scoping</name>
  <files>backend/controllers/fahrtController.js, backend/models/Mitfahrer.js</files>
  <action>
  1. `backend/controllers/fahrtController.js`, `addMitfahrer` (Z.509–519), `updateMitfahrer` (Z.521–535), `deleteMitfahrer` (Z.537–550): Jeweils zuerst `const fahrt = await Fahrt.findById(fahrtId, req.user.id)` (Model ist user-gescopt, Fahrt.js Z.61–77); wenn nicht gefunden → 404 "Fahrt nicht gefunden". Erst danach die Mitfahrer-Operation.
  2. `backend/models/Mitfahrer.js`: `update` (Z.20–26) und `delete` (Z.28–31) um `fahrtId`-Parameter erweitern und SQL auf `WHERE id = ? AND fahrt_id = ?` scopen — verhindert, dass eine fremde mitfahrerId unter eigener fahrtId manipuliert wird. Aufrufer in fahrtController entsprechend anpassen (`Mitfahrer.update(mitfahrerId, fahrtId, name, ...)` bzw. Signaturreihenfolge konsistent wählen).
  3. `backend/models/Mitfahrer.js`, `updateMitfahrerForFahrt` (Z.40–91) — Durchreiche von `mitfahrer[].id` aus `updateFahrt` (fahrtController Z.112–114): (a) `zuAktualisieren` (Z.62) zusätzlich filtern auf IDs, die in `aktuelle` (also in dieser Fahrt) existieren: `neueMitfahrer.filter(neu => neu.id && aktuelle.some(alt => alt.id === neu.id))`. Fremde/unbekannte IDs stillschweigend ignorieren (kein Fehler — Frontend-Kompatibilität). (b) Die UPDATE-Query (Z.72–75) defensiv auf `WHERE id = ? AND fahrt_id = ?` erweitern. Die DELETE-Zweige (Z.67–69) arbeiten nur auf `aktuelle` und sind bereits implizit gescopt — unverändert lassen. `updateFahrt` selbst ist über `Fahrt.update(id, ..., userId)` (Z.109) bereits ownership-gesichert; `updateMitfahrerForFahrt` wird nur im `if (updated)`-Zweig aufgerufen — Verhalten so belassen.
  </action>
  <verify>
    <automated>node --check backend/controllers/fahrtController.js && node --check backend/models/Mitfahrer.js && grep -c "AND fahrt_id = ?" backend/models/Mitfahrer.js</automated>
    <human-check>Curl-Testplan: User B ruft `POST /api/fahrten/{fahrtId_von_A}/mitfahrer` → 404. User B ruft `PUT /api/fahrten/{eigene_fahrtId}/mitfahrer/{mitfahrerId_von_A}` → 404. Normales Anlegen/Editieren von Mitfahrern über die UI (FahrtForm mit Mitfahrer hinzufügen/ändern/entfernen) funktioniert unverändert.</human-check>
  </verify>
  <done>Mitfahrer-Endpunkte verweigern fremde fahrtId (404); update/delete sind zusätzlich per fahrt_id gescopt; updateFahrt mit mitfahrer[] funktioniert unverändert für eigene Daten.</done>
  <commit>security: IDOR bei Mitfahrer-Endpunkten geschlossen — Fahrt-Ownership + fahrt_id-Scoping</commit>
</task>

<task type="auto">
  <name>Task 4: Cross-User-Kilometer-Update + Ort-Ownership bei Fahrt/Favorit</name>
  <files>backend/models/Distanz.js, backend/models/Fahrt.js, backend/controllers/fahrtController.js, backend/controllers/favoritController.js</files>
  <action>
  1. `backend/models/Distanz.js`, `createOrUpdate`: Existenz-SELECT (Z.17–20) um `AND user_id = ?` erweitern (Parameter `userId` anhängen) — sonst wird eine fremde Distanz "gefunden" und der eigene INSERT verhindert. Das `UPDATE fahrten` (Z.29–32) um `AND user_id = ?` erweitern — DAS ist die kritische Lücke: aktuell werden Kilometer in Fahrten ALLER User mit gleicher Orte-Kombination überschrieben.
  2. `backend/models/Distanz.js`, `update`: Das `UPDATE fahrten` (Z.75–78) ebenfalls um `AND user_id = ?` erweitern (`userId` ist als Parameter bereits vorhanden).
  3. `backend/models/Fahrt.js`, `updateFahrtenByDistanz` (Z.118–126): Signatur um `userId` erweitern und `AND user_id = ?` ins WHERE — der Aufrufer `backend/utils/distanceCalculator.js` Z.61 übergibt `userId` bereits als 4. Argument (wird derzeit still verworfen!).
  4. Ort-Ownership `createFahrt` (fahrtController Z.17–70) und `updateFahrt` (Z.72–123): Nach dem bestehenden Abrechnungsträger-Check (Z.33–37 bzw. 89–96) für gesetzte `vonOrtId`/`nachOrtId` prüfen: `SELECT id FROM orte WHERE id = ? AND user_id = ?`; bei Fremd-ID → 400 "Ort nicht gefunden". Nur prüfen, wenn die ID nicht null/undefined ist (einmalige Orte als Freitext bleiben unberührt).
  5. Ort-/Träger-Ownership `createFavorit` (`backend/controllers/favoritController.js` Z.16–35): Vor `FavoritFahrt.create` dieselben Checks für `data.vonOrtId`, `data.nachOrtId` (orte) und `data.abrechnungstraegerId` (abrechnungstraeger, `WHERE id = ? AND user_id = ?`); bei Fremd-ID → 400. Dafür `db = require('../config/database')` importieren oder eine kleine Helper-Funktion im Controller anlegen.
  </action>
  <verify>
    <automated>node --check backend/models/Distanz.js && node --check backend/models/Fahrt.js && node --check backend/controllers/favoritController.js && node --check backend/controllers/fahrtController.js && test "$(grep -c 'UPDATE fahrten SET kilometer = ? WHERE ((von_ort_id' backend/models/Distanz.js)" -eq 0 || grep -c "user_id" backend/models/Distanz.js</automated>
    <human-check>Curl-Testplan: User A und B legen Orte mit identischer Kombination + Distanz an; B ändert seine Distanz via `POST /api/distanzen` → Fahrten von A dürfen unverändert bleiben (SELECT kilometer vorher/nachher vergleichen). B erstellt Fahrt mit vonOrtId von A → 400.</human-check>
  </verify>
  <done>Alle drei `UPDATE fahrten`-Statements (Distanz.createOrUpdate, Distanz.update, Fahrt.updateFahrtenByDistanz) filtern auf user_id; createFahrt/updateFahrt/createFavorit weisen fremde Ort-/Träger-IDs mit 400 ab; eigene Abläufe (Distanz-Pflege, Favorit anlegen/ausführen) unverändert.</done>
  <commit>security: Cross-User-Kilometer-Update verhindert + Ort-Ownership bei Fahrten und Favoriten</commit>
</task>

<task type="auto">
  <name>Task 5: Registrierung serverseitig absichern + Rate-Limits</name>
  <files>backend/controllers/authController.js, backend/schemas/authSchemas.js, backend/routes/auth.js, backend/routes/users.js, docker-compose.example.yml</files>
  <action>
  1. `backend/schemas/authSchemas.js`: `registerSchema` um `registrationCode: z.string().optional()` erweitern — PFLICHT, da die validate-Middleware `req.body` durch das geparste (gestrippte) Objekt ersetzt und das Frontend das Feld bereits sendet (LoginPage.js Z.112).
  2. `backend/controllers/authController.js`, `register` (Z.45–98), VOR dem Existenz-Check drei serverseitige Gates einbauen (abwärtskompatibel — Checks greifen nur, wenn die Env-Variable gesetzt ist):
     - `ALLOW_REGISTRATION`: Wenn gesetzt und `!== 'true'` → 403 "Registrierung ist deaktiviert". (Unset = erlaubt, damit bestehende Deployments ohne neue Env weiterlaufen.)
     - `ALLOWED_EMAIL_DOMAINS`: Wenn gesetzt (kommagetrennt, wie im Frontend LoginPage.js Z.94–100): Domain aus `email.split('@')[1]` extrahieren, case-insensitive gegen die getrimmte Liste prüfen → sonst 403 "Diese E-Mail-Domain ist nicht für die Registrierung zugelassen".
     - `REGISTRATION_CODE`: Wenn gesetzt: `req.body.registrationCode` muss exakt übereinstimmen (timing-safe nicht nötig, aber `crypto.timingSafeEqual` bei gleicher Länge ist ein sauberer Bonus) → sonst 403 "Ungültiger Registrierungscode".
  3. `backend/routes/auth.js`: Nach dem Muster des vorhandenen `loginLimiter` (Z.8–14) einen `registerLimiter` anlegen (z.B. windowMs 60 Min, max 5, deutsche message) und in Z.17 vor `validate(registerSchema)` einhängen.
  4. `backend/routes/users.js`: `express-rate-limit` importieren, `resetLimiter` (z.B. windowMs 60 Min, max 5) definieren und auf `POST /reset-password/request` (Z.15) anwenden.
  5. `docker-compose.example.yml`: Im backend-environment-Block `ALLOW_REGISTRATION=${ALLOW_REGISTRATION}`, `ALLOWED_EMAIL_DOMAINS=${ALLOWED_EMAIL_DOMAINS}`, `REGISTRATION_CODE=${REGISTRATION_CODE}` ergänzen, mit Kommentar, dass diese die serverseitigen Pendants zu den REACT_APP_-Frontend-Variablen sind (Frontend-ARGs steuern nur die UI-Anzeige).
  </action>
  <verify>
    <automated>node --check backend/controllers/authController.js && node --check backend/routes/auth.js && node --check backend/routes/users.js && grep -q "registrationCode" backend/schemas/authSchemas.js && grep -q "ALLOW_REGISTRATION" docker-compose.example.yml && grep -q "registerLimiter" backend/routes/auth.js && grep -q "rateLimit" backend/routes/users.js</automated>
    <human-check>Curl-Testplan: Mit `REGISTRATION_CODE=test123` gestartetes Backend: `POST /api/auth/register` ohne/mit falschem Code → 403; mit korrektem Code + erlaubter Domain → 201. 6× hintereinander registrieren → 429. Ohne gesetzte Env-Variablen: Verhalten wie bisher (201).</human-check>
  </verify>
  <done>Backend erzwingt Abschaltbarkeit, Domain-Whitelist und Registrierungscode serverseitig; Register- und Reset-Request-Endpunkte sind rate-limitiert; ohne neue Env-Variablen ändert sich nichts am Verhalten; Frontend unverändert kompatibel.</done>
  <commit>security: Registrierung serverseitig abgesichert (Whitelist, Code, Abschaltung) + Rate-Limits</commit>
</task>

<task type="auto">
  <name>Task 6: initDb.js — Admin-Passwort nur beim Erstlauf setzen</name>
  <files>backend/initDb.js</files>
  <action>
  `backend/initDb.js` Z.18–32: Das bedingungslose Passwort-UPDATE ersetzen. Kontext: Migration `0002_admin_user.sql` legt den Admin mit dem Literal-Passwort `'PLACEHOLDER_PASSWORD_HASH'` an; initDb überschreibt danach bei JEDEM Start. Fix: SELECT um `password` erweitern (`SELECT id, password FROM users WHERE username = ?`) und das UPDATE nur ausführen, wenn `password === 'PLACEHOLDER_PASSWORD_HASH'` (alternativ direkt `UPDATE users SET password = ? WHERE username = ? AND password = 'PLACEHOLDER_PASSWORD_HASH'`). Bcrypt-Hashing (Z.19–20) nur noch in diesem Zweig ausführen (spart Startzeit). Bei bereits gesetztem Passwort: `console.info('Admin-Passwort bereits gesetzt — kein Reset.')`. Fehlender Admin-User: bestehende Warnung (Z.31) beibehalten.
  </action>
  <verify>
    <automated>node --check backend/initDb.js && grep -q "PLACEHOLDER_PASSWORD_HASH" backend/initDb.js</automated>
    <human-check>Smoke-Test: Admin-Passwort über die UI ändern, Backend-Container neu starten → Login mit dem NEUEN Passwort muss funktionieren, INITIAL_ADMIN_PASSWORD darf nicht mehr greifen. Frische DB: Erstlauf setzt INITIAL_ADMIN_PASSWORD korrekt.</human-check>
  </verify>
  <done>Neustart des Backends setzt ein manuell geändertes Admin-Passwort nicht mehr zurück; Erstinstallation setzt das Initial-Passwort weiterhin.</done>
  <commit>security: Admin-Passwort wird nur noch beim Erstlauf gesetzt statt bei jedem Start</commit>
</task>

<task type="auto">
  <name>Task 7: Export-Doppelzählung bei 2+ Mitfahrern fixen (Dedup nach fahrt.id)</name>
  <files>backend/utils/excelExport.js, backend/utils/pdfExport.js, backend/controllers/fahrtController.js</files>
  <action>
  VERIFIZIERT: `Fahrt.getMonthlyReport` (Fahrt.js Z.157–183) und `getDateRangeReport` (Z.186–219) machen `LEFT JOIN mitfahrer m ON m.fahrt_id = f.id` OHNE GROUP BY → eine Fahrt mit N Mitfahrern liefert N Rows. Der Mitfahrer-Export braucht diese Rows (nutzt m.id/m.name/richtung) — die Model-Queries daher NICHT ändern, sondern an den Konsumenten des "normalen" Pfads deduplizieren:

  1. Kleine Helper-Funktion (in beiden Utils lokal oder als Export aus excelExport wiederverwenden — einfacher: je Datei lokal): `function dedupeByFahrtId(rows) { const seen = new Set(); return rows.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; }); }`
  2. `backend/utils/excelExport.js`: Im "Normaler Export"-Pfad von `exportToExcel` (vor dem flatMap Z.181) und `exportToExcelRange` (vor Z.368) `fahrten` durch `dedupeByFahrtId(fahrten)` ersetzen. Die Mitfahrer-Pfade (Z.113ff, Z.292ff) UNVERÄNDERT lassen (deduplizieren bereits selbst nach datum+name).
  3. `backend/utils/pdfExport.js`: In `prepareFormattedData` (Z.309–334) eingangs deduplizieren — wird von beiden PDF-Handlern nur im Normalpfad genutzt; `prepareMitfahrerData` (Z.336) unverändert.
  4. `backend/controllers/fahrtController.js`: `getMonthlyReport` — nach dem Model-Call (Z.174–177) deduplizieren, BEVOR die Mitfahrer-Schleife (Z.180–182) und das Mapping (Z.230) laufen (sonst doppelte Fahrten + doppelte Erstattungssummen im UI-Report). Ebenso `getReportRange` nach Z.283. Die Mitfahrer werden dort ohnehin separat per `Mitfahrer.findByFahrtId` geladen — keine Informationsverluste.
  </action>
  <verify>
    <automated>node --check backend/utils/excelExport.js && node --check backend/utils/pdfExport.js && node --check backend/controllers/fahrtController.js && test "$(grep -c "dedupeByFahrtId" backend/utils/excelExport.js backend/utils/pdfExport.js backend/controllers/fahrtController.js | awk -F: '{s+=$2} END {print (s>=4)}')" = "1"</automated>
    <human-check>Smoke-Test: Fahrt mit 2 Mitfahrern anlegen (z.B. 10 km). `GET /api/fahrten/report/{jahr}/{monat}` → Fahrt erscheint 1× und Erstattung = 10 km × Satz (nicht 20). Excel- und PDF-Export desselben Monats → Fahrt 1 Zeile, Gesamt-km korrekt. Mitfahrer-Export → weiterhin 2 Zeilen (je Mitfahrer 1).</human-check>
  </verify>
  <done>Fahrten mit 2+ Mitfahrern erscheinen in Report-API, Excel- und PDF-Export genau einmal; Gesamt-km und Erstattungssummen zählen nicht mehr doppelt; Mitfahrer-Exporte unverändert vollständig.</done>
  <commit>fix: Doppelzählung von Fahrten mit mehreren Mitfahrern in Reports und Exporten behoben</commit>
</task>

<task type="auto">
  <name>Task 8: Hartkodierte 0,30 €/km in Exporten durch DB-Erstattungssätze ersetzen</name>
  <files>backend/utils/erstattung.js, backend/utils/excelExport.js, backend/utils/pdfExport.js</files>
  <action>
  1. Neue Datei `backend/utils/erstattung.js` mit `async function getErstattungssatzFuerTraeger(traegerId, userId, stichtag)`: Query nach dem Muster aus `fahrtController.getMonthlyReport` (Z.184–225): `SELECT eb.betrag, eb.gueltig_ab FROM erstattungsbetraege eb JOIN abrechnungstraeger at ON eb.abrechnungstraeger_id = at.id WHERE at.id = ? AND at.user_id = ? ORDER BY eb.gueltig_ab DESC` — dann in JS den ersten Satz mit `gueltig_ab <= stichtag` nehmen; wenn keiner passt, den ältesten (identische Fallback-Logik wie Controller Z.216–225); wenn gar kein Satz existiert → Fallback `0.30` (bisheriges Verhalten, kein Formular mit 0 € produzieren). Rückgabe als `Number` (DB liefert DECIMAL ggf. als String — `parseFloat` absichern). Export via `module.exports`.
  2. Stichtag: letzter Tag des Exportzeitraums — Einzelmonat: `new Date(year, month, 0)` bzw. String `${year}-${MM}-<letzter Tag>`; Range: letzter Tag von endYear/endMonth. Sätze sind zeitabhängig (gueltig_ab); ein Satz pro Export genügt, da das offizielle Formular eine einzige "km × Satz"-Zeile hat.
  3. `backend/utils/excelExport.js`: In `fillQuartalSheet` (Z.65–90) den Satz als Parameter durchreichen: Signatur `fillQuartalSheet(worksheet, data, year, satz)`; Z.89 `J40 = Math.round(gesamtKm * satz * 100) / 100`. In `exportToExcel` (vor der workbooks-Schleife Z.226) und `exportToExcelRange` (vor Z.413) den Satz via Helper laden (`type` ist die traegerId; userId vorhanden) und an `fillQuartalSheet` übergeben. Hinweis: Falls das Template in H40/I40 einen statischen "0,30 €"-Text enthält, zusätzlich prüfen, ob eine Zelle den Satz anzeigt — wenn ja, Zelle mit `satz` befüllen (Template `backend/templates/fahrtenabrechnung_vorlage.xlsx` beim Umsetzen inspizieren, z.B. per kleinem ExcelJS-Read-Skript der Zeile 40).
  4. `backend/utils/pdfExport.js`: `renderFooter` (Z.203–246) bekommt `satz` als Parameter; Z.231 Label dynamisch: `` `${gesamtKm} km x ${satz.toFixed(2).replace('.', ',')} € =` ``. `renderPage` (Z.248) reicht `satz` durch. In `exportToPdf` (Z.443) und `exportToPdfRange` (Z.524) `const satz = await getErstattungssatzFuerTraeger(type, userId, stichtag); const erstattung = gesamtKm * satz;`.
  </action>
  <verify>
    <automated>node --check backend/utils/erstattung.js && node --check backend/utils/excelExport.js && node --check backend/utils/pdfExport.js && test "$(grep -v '^\s*//' backend/utils/excelExport.js backend/utils/pdfExport.js | grep -c '0\.30')" -le 2 && grep -q "getErstattungssatzFuerTraeger" backend/utils/excelExport.js && grep -q "getErstattungssatzFuerTraeger" backend/utils/pdfExport.js</automated>
    <human-check>Smoke-Test: Für einen Träger Satz auf 0,35 € (gueltig_ab vor Testmonat) setzen. Excel-Export → J40 = gesamtKm × 0,35. PDF-Export → Fußzeile zeigt "x 0,35 €" und korrekten Betrag. Träger mit Standardsatz 0,30 → Ergebnis wie bisher. Zweiter Satz mit gueltig_ab NACH dem Exportmonat darf nicht greifen.</human-check>
  </verify>
  <done>Excel- und PDF-Exporte berechnen die Erstattung mit dem zum Abrechnungszeitraum gültigen DB-Satz des Trägers; 0,30 € existiert nur noch als dokumentierter Fallback in erstattung.js; PDF-Label zeigt den echten Satz.</done>
  <commit>fix: Export-Erstattung nutzt zeitabhängige DB-Erstattungssätze statt hartkodiert 0,30 €/km</commit>
</task>

<task type="auto">
  <name>Task 9: Gesamtverifikation + SUMMARY</name>
  <files>.planning/quick/260807-dq7-security-fixes/SUMMARY.md</files>
  <action>
  1. Syntaxcheck über alle geänderten JS-Dateien: `for f in backend/controllers/abrechnungstraegerController.js backend/controllers/fahrtController.js backend/controllers/favoritController.js backend/controllers/authController.js backend/models/Mitfahrer.js backend/models/Distanz.js backend/models/Fahrt.js backend/schemas/authSchemas.js backend/routes/auth.js backend/routes/users.js backend/initDb.js backend/utils/excelExport.js backend/utils/pdfExport.js backend/utils/erstattung.js; do node --check "$f" || exit 1; done`
  2. Modul-Auflösung: `cd backend && node -e "require('./app')"` — darf nur an DB-Verbindung scheitern (ECONNREFUSED/Zugriff), nicht an Syntax/Imports. Alternativ lokal `docker compose up -d db backend` und Log auf sauberen Start prüfen, danach wieder stoppen.
  3. npm test existiert nicht (backend "test" ist Platzhalter mit exit 1) — stattdessen die Smoke-Test-Anleitungen aus den human-checks der Tasks 2–8 gesammelt in SUMMARY.md dokumentieren (Curl-Befehle mit 2 Test-Usern, Export-Prüfschritte).
  4. `.planning/quick/260807-dq7-security-fixes/SUMMARY.md` schreiben: pro Task 1 Zeile (Finding → Fix → Commit-Hash), Abschnitt "Manuelle Smoke-Tests" mit der Anleitung, Abschnitt "Offene Punkte" (z.B. verbleibende npm-audit-Findings, die --force erfordert hätten; Hinweis dass Range-Exporte über Satzwechsel hinweg weiterhin einen Einheitssatz nutzen).
  5. NICHT mergen, NICHT deployen — Branch feature/v1.3-dashboard bleibt lokal/remote als Feature-Branch stehen.
  </action>
  <verify>
    <automated>git log --oneline -9 | grep -cE "security:|fix:|chore" && test -f .planning/quick/260807-dq7-security-fixes/SUMMARY.md</automated>
  </verify>
  <done>Alle geänderten Dateien bestehen node --check; app.js lädt ohne Import-Fehler; SUMMARY.md mit Commit-Liste und Smoke-Test-Anleitung existiert; 9 atomare Commits auf feature/v1.3-dashboard.</done>
  <commit>docs(quick): SUMMARY für Security-Fixes 260807-dq7</commit>
</task>

</tasks>

<verification>
- `grep -rn "0\.30" backend/utils/` → nur noch Fallback in erstattung.js (+ ggf. Kommentar)
- `grep -rn "UPDATE fahrten" backend/models/` → alle Statements enthalten `user_id`
- `grep -n "registrationCode" backend/schemas/authSchemas.js backend/controllers/authController.js` → Feld wird durchgereicht und geprüft
- `npm ls mysql2` in backend → 3.x; `grep xlsx backend/package.json` → leer
- Curl-Matrix (2 Test-User) aus den Task-human-checks: alle Fremdzugriffe → 404/400/403, alle Eigenzugriffe → wie bisher
</verification>

<success_criteria>
- Alle 8 Audit-Findings behoben, je Finding ein atomarer Commit (+ Deps + SUMMARY = 9 Commits)
- Keine Frontend-Änderung nötig; bestehende UI-Flows (Registrierung, Mitfahrer-Pflege, Distanz-Pflege, Exporte) funktionieren unverändert für eigene Daten
- Backend startet mit mysql2 v3 fehlerfrei; Exporte rechnen mit DB-Sätzen und zählen nicht mehr doppelt
- Branch feature/v1.3-dashboard, kein Merge, kein Deployment
</success_criteria>

<output>
Nach Abschluss: `.planning/quick/260807-dq7-security-fixes/SUMMARY.md`
</output>
