# Milestones

## v1.1 Stabilität & Security (Shipped: 2026-03-22)

**Phases completed:** 3 phases, 5 plans, 9 tasks

**Key accomplishments:**

- Mitfahrer-Erstattung aus DB statt hardcoded, Rueckfahrt-Matching mit Orts-Namen-Fallback, Axios 401 Race Condition Guard
- helmet fuer HTTP Security Headers, express-rate-limit fuer Login-Brute-Force-Schutz (10/15min), Body-Size-Limit 10mb
- Error.message, stack traces und DB-Details aus allen Controller-Responses entfernt - nur generische deutsche Fehlermeldungen an Client
- Zod-basierte Input-Validierung mit validate(schema) Middleware fuer alle 30+ POST/PUT-Endpoints
- Removed all debug console.log from auth controller and frontend, ran npm audit fix reducing backend vulns from 17 to 8 and frontend from 52 to 26

---

## v1.0 Nutzerfeedback (Shipped: 2026-03-22)

**Phases completed:** 4 phases, 7 plans, 11 tasks

**Key accomplishments:**

- Optionales Kostenstelle-Freitextfeld am Abrechnungstraeger -- DB-Migration, Model/Controller CRUD, Frontend-Formular und Listenanzeige mit 'Kst.:'-Prefix
- Transaktionsbasierte Distanz-Updates mit automatischer bidirektionaler Fahrten-Aktualisierung via connection.beginTransaction()
- Excel-Export mit echtem Datumsformat DD.MM.YYYY, Kostenstelle im Header und vollstaendigem Unterschriftsbereich gemaess offiziellem Abrechnungsformular
- Neue API-Route und Excel-Export-Funktion fuer Mehrmonats-Zeitraeume mit kompaktem Header-Format und pro-Monat Eingereicht-Status
- Von/Bis-Dropdowns mit Zeitraum-Validierung und responsivem Export-UI fuer Mehrmonats-Excel-Download
- REST endpoint for date-range reports with aggregated erstattungen and merged abrechnungsStatus across months
- Von/Bis-Dropdowns ersetzen die Monatsauswahl mit adaptivem Datenloading und integriertem Export, Phase-3-Zeitraum-UI entfernt

---
