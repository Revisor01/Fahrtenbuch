---
quick_id: 260807-dq7
slug: security-fixes
date: 2026-08-07
branch: feature/v1.3-dashboard
status: complete
commits:
  - 30e7d91: "chore(deps): mysql2 auf v3 gehoben, ungenutztes xlsx entfernt, npm audit fix"
  - 274f2d6: "security: IDOR bei Erstattungssätzen geschlossen — Ownership-Check auf abrechnungstraeger"
  - d988476: "security: IDOR bei Mitfahrer-Endpunkten geschlossen — Fahrt-Ownership + fahrt_id-Scoping"
  - bbce9aa: "security: Cross-User-Kilometer-Update verhindert + Ort-Ownership bei Fahrten und Favoriten"
  - d2e98f5: "security: Registrierung serverseitig abgesichert (Whitelist, Code, Abschaltung) + Rate-Limits"
  - d277d9c: "security: Admin-Passwort wird nur noch beim Erstlauf gesetzt statt bei jedem Start"
  - f1c0eb9: "fix: Doppelzählung von Fahrten mit mehreren Mitfahrern in Reports und Exporten behoben"
  - 673b2ac: "fix: Export-Erstattung nutzt zeitabhängige DB-Erstattungssätze statt hartkodiert 0,30 €/km"
---

# Quick Task 260807-dq7: Security-Fixes — Summary

**One-liner:** Acht Backend-Audit-Findings behoben — 4 IDOR-/Cross-User-Lücken, unsichere Registrierung, Admin-Passwort-Reset, Export-Doppelzählung und hartkodierter 0,30-€-Satz; dazu mysql2 v3 und xlsx-Entfernung.

## Tasks (Finding → Fix → Commit)

| # | Finding | Fix | Commit |
|---|---------|-----|--------|
| 1 | mysql2 <3.9.x RCE-Advisories, ungenutztes xlsx | mysql2 3.23.2, xlsx entfernt, npm audit fix (backend+frontend, ohne --force) | 30e7d91 |
| 2 | IDOR Erstattungssätze (update/delete/add/historie ohne Ownership) | Ownership-Vorab-Check auf abrechnungstraeger (404), Historie via gescopte Model-Methode, Rollback bei Early-Returns in Transaktion | 274f2d6 |
| 3 | IDOR Mitfahrer-Endpunkte | Fahrt.findById(fahrtId, userId) vorab (404), Mitfahrer.update/delete per fahrt_id gescopt, updateMitfahrerForFahrt ignoriert fremde IDs | d988476 |
| 4 | Cross-User-Kilometer-Update + fehlende Ort-Ownership | Alle 3 UPDATE-fahrten-Statements auf user_id gescopt (Distanz.createOrUpdate/update, Fahrt.updateFahrtenByDistanz); Ort-/Träger-Ownership-Checks in createFahrt/updateFahrt/createFavorit (400) | bbce9aa |
| 5 | Registrierung nur clientseitig geprüft | Serverseitige Gates ALLOW_REGISTRATION / ALLOWED_EMAIL_DOMAINS / REGISTRATION_CODE (403, abwärtskompatibel bei unset/leer), registerSchema um registrationCode erweitert, registerLimiter + resetLimiter (je 5/h) | d2e98f5 |
| 6 | Admin-Passwort-Reset bei jedem Start | UPDATE nur noch, wenn DB-Passwort das Migrations-Literal PLACEHOLDER_PASSWORD_HASH ist (Erstlauf-Erkennung) | d277d9c |
| 7 | Export-Doppelzählung bei 2+ Mitfahrern (JOIN ohne GROUP BY) | dedupeByFahrtId() in Excel-/PDF-Normalpfaden und Report-API (getMonthlyReport/getReportRange); Mitfahrer-Pfade unverändert | f1c0eb9 |
| 8 | Hartkodiert 0,30 €/km in Exporten | backend/utils/erstattung.js (zeitabhängige Satz-Ermittlung, Stichtag = letzter Tag des Export-/Endmonats); Excel J40 + I40-Label, PDF-Fußzeile dynamisch | 673b2ac |

## Abweichungen vom Plan

- **Task 1:** npm audit fix im Backend oszillierte zwischen zwei Lockfile-Zuständen (nodemon-Teilbaum wurde abwechselnd entfernt/hinzugefügt). Mit npm install auf konsistenten Stand gebracht (10 Findings verbleibend, alle nur mit Breaking Change behebbar, s. Offene Punkte).
- **Task 5:** Der geplante Check `ALLOW_REGISTRATION !== undefined` wurde auf Truthy-Check geändert: Docker-Compose liefert für unset `${VAR}` Leerstrings — der Plan-Wortlaut hätte bestehende Deployments mit dem neuen compose.example (ohne gesetzte Variable) gebrochen. Leerstring wird jetzt wie unset behandelt (Registrierung offen).
- **Task 8:** Template-Inspektion bestätigte statisches Label "km x 0,30 € =" in I40 und Formel SUM(H40*0.3) in J40 — I40 wird nun zusätzlich mit dem echten Satz überschrieben (im Plan als "ggf. prüfen" markiert).
- **Zeilennummern** wichen teils leicht ab; Struktur entsprach überall dem Plan.

## Verifikationsergebnisse

- node --check auf allen 14 geänderten JS-Dateien: OK
- `node -e "require('./app')"`: lädt fehlerfrei, scheitert nur an DB-Verbindung (ECONNREFUSED) — kein Import-/Syntaxfehler
- `npm ls mysql2` → 3.23.2 (genau eine Version); kein xlsx mehr in package.json
- Alle `UPDATE fahrten`-Statements in backend/models/ enthalten `AND user_id = ?`
- `0.30` in backend/utils/ nur noch als Fallback + Kommentare in erstattung.js
- **Mock-Test Dedup:** 1 Fahrt (10 km) mit 2 Mitfahrern + 1 Fahrt (5 km) → 3 JOIN-Rows → 2 Fahrten, 15 km (statt 25); Mitfahrer-Export weiterhin 2 Zeilen
- **Mock-Test Satz-Ermittlung:** Sätze 0,35 (ab 01.07.2026) und 0,30 (ab 2020): Stichtag 31.07.2026 → 0,35; Stichtag 30.06.2026 → 0,30 (kein rückwirkender Satzwechsel); Stichtag vor allen Sätzen → ältester; keine Sätze → Fallback 0,30
- **Funktionstest Registrierungs-Gates** (Mock req/res): ALLOW_REGISTRATION=false → 403; fremde Domain → 403; falscher Code → 403; korrekte Werte → Durchlass bis DB (Case-Insensitivität der Domain bestätigt)

## Manuelle Smoke-Tests (lokal mit 2 Test-Usern A/B)

- **Task 2:** User B: `PUT /api/abrechnungstraeger/{traegerId_A}/erstattung/{satzId_A}` mit `{"betrag":99}` → 404. Ebenso DELETE, POST /erstattung, GET /erstattung/historie → 404 bzw. leer. Eigene Träger → 200/201 wie bisher.
- **Task 3:** User B: `POST /api/fahrten/{fahrtId_A}/mitfahrer` → 404. `PUT /api/fahrten/{eigene_fahrtId_B}/mitfahrer/{mitfahrerId_A}` → 404. UI: FahrtForm Mitfahrer hinzufügen/ändern/entfernen funktioniert unverändert.
- **Task 4:** A und B legen Orte mit identischer Kombination + Distanz an; B ändert seine Distanz via `POST /api/distanzen` → Fahrten-Kilometer von A unverändert (SELECT vorher/nachher). B erstellt Fahrt mit vonOrtId von A → 400.
- **Task 5:** Backend mit `REGISTRATION_CODE=test123`: register ohne/mit falschem Code → 403; korrekter Code + erlaubte Domain → 201; 6x hintereinander → 429. Ohne Env-Variablen: 201 wie bisher.
- **Task 6:** Admin-Passwort über UI ändern, Backend neu starten → Login mit NEUEM Passwort funktioniert, INITIAL_ADMIN_PASSWORD greift nicht mehr. Frische DB: Erstlauf setzt Initial-Passwort.
- **Task 7:** Fahrt mit 2 Mitfahrern (10 km) anlegen. `GET /api/fahrten/report/{jahr}/{monat}` → Fahrt 1x, Erstattung = 10 km × Satz (nicht 20). Excel-/PDF-Export → 1 Zeile, Gesamt-km korrekt. Mitfahrer-Export → weiterhin 2 Zeilen.
- **Task 8:** Träger-Satz 0,35 (gueltig_ab vor Testmonat): Excel J40 = gesamtKm × 0,35, I40 = "km x 0,35 € ="; PDF-Fußzeile "x 0,35 €". Satz mit gueltig_ab NACH Exportmonat darf nicht greifen.

## Offene Punkte

- **npm audit backend (10 Findings, alle nur via Breaking Change / dev-/install-only):**
  - nodemailer ≤9.0.0 (high): Fix wäre v9 (Breaking) — Upgrade separat planen und Mail-Versand testen
  - tar via bcrypt→@mapbox/node-pre-gyp (critical, nur Install-Zeit): Fix bräuchte bcrypt-Major-Update
  - got/update-notifier via nodemon 2.x (moderate, devDependency): Fix wäre nodemon@3
  - uuid via exceljs (moderate): "Fix" wäre exceljs-DOWNGRADE auf 3.4.0 — nicht sinnvoll
- **npm audit frontend (27 Findings):** alle in der react-scripts-Buildkette (Build-Time, nicht Runtime), Fix nur via Breaking Change — belassen
- **Range-Exporte über Satzwechsel hinweg** nutzen weiterhin einen Einheitssatz (Satz zum letzten Tag des Endmonats) — das offizielle Formular hat nur eine "km × Satz"-Zeile; bei Satzwechsel im Zeitraum ggf. Einzelmonats-Exporte nutzen
- **Kein Merge, kein Deployment** — Branch feature/v1.3-dashboard bleibt Feature-Branch (weder KKD noch Testserver angefasst)
