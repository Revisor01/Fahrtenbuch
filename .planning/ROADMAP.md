# Roadmap: Fahrtenbuch

## Milestones

- ✅ **v1.0 Nutzerfeedback** - Phases 1-4 (shipped 2026-03-22)
- 🚧 **v1.1 Stabilität & Security** - Phases 5-7 (in progress)

## Phases

<details>
<summary>✅ v1.0 Nutzerfeedback (Phases 1-4) - SHIPPED 2026-03-22</summary>

### Phase 1: Datenmodell & Logik
**Goal**: Nutzer koennen Kostenstellen pflegen und Distanzen aendern, ohne bestehende Fahrten manuell korrigieren zu muessen
**Requirements**: ABRTR-01, DATA-01
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Kostenstelle-Feld am Abrechnungstraeger (DB, API, UI)
- [x] 01-02-PLAN.md — Rueckwirkende Distanz-Aktualisierung mit Transaktion

### Phase 2: Excel-Export Formular
**Goal**: Der Excel-Export entspricht dem offiziellen Dienstfahrten-Abrechnungsformular
**Requirements**: EXCEL-01, EXCEL-02, EXCEL-03, EXCEL-04
**Plans**: 1 plan

Plans:
- [x] 02-01-PLAN.md — Datum-Format, Kostenstelle im Header, Unterschriftsbereich komplett

### Phase 3: Mehrmonats-Export
**Goal**: Nutzer koennen einen Zeitraum ueber mehrere Monate exportieren
**Requirements**: MULTI-01, MULTI-02, MULTI-03
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Backend: Neue Route, Model-Methode und Export-Funktion
- [x] 03-02-PLAN.md — Frontend: Von/Bis-Dropdowns und Zeitraum-Export-Handler

### Phase 4: Von/Bis-Zeitraum in Monatsübersicht
**Goal**: Monatsauswahl wird zu Von/Bis erweitert, separater Zeitraum-Export entfaellt
**Requirements**: D-01 bis D-19
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — Backend: Report-Range-Route fuer aggregierte Zeitraum-Daten
- [x] 04-02-PLAN.md — Frontend: Von/Bis-UI, adaptiver Export, Phase-3-Cleanup

</details>

### 🚧 v1.1 Stabilität & Security

**Milestone Goal:** App robuster, sicherer und wartbarer machen — keine neuen Features, aber solide Grundlage.

- [x] **Phase 5: Bugfixes** - Bekannte Fehler bei Mitfahrer-Erstattung, Rückfahrt-Matching und Token-Refresh beheben
- [ ] **Phase 6: Security Hardening** - HTTP-Header, Rate-Limiting, Error-Sanitizing und Body-Size-Limits einführen
- [ ] **Phase 7: Code-Qualität** - Input-Validierung mit Zod, Debug-Logs entfernen, Dependency-Updates

## Phase Details

### Phase 5: Bugfixes
**Goal**: Alle bekannten Bugs sind behoben — Nutzer erleben korrektes Verhalten bei Erstattungen, Rückfahrten und Token-Refresh
**Depends on**: Phase 4 (v1.0 abgeschlossen)
**Requirements**: BUG-01, BUG-02, BUG-03
**Success Criteria** (what must be TRUE):
  1. Mitfahrer-Erstattung wird mit dem in der DB hinterlegten Satz berechnet, nicht mit 0,05 EUR/km
  2. Rückfahrt-Matching funktioniert unabhängig von Gross-/Kleinschreibung und leichten ID-Abweichungen
  3. Parallele 401-Responses führen nicht mehr zu mehrfachen Token-Refresh-Requests oder unerwartetem Logout
**Plans**: 1 plan

Plans:
- [x] 05-01-PLAN.md — Mitfahrer-Erstattung DB-Lookup, Rueckfahrt-Matching Fallback, Axios Race-Condition-Guard

### Phase 6: Security Hardening
**Goal**: App ist gegen gängige Angriffsvektoren abgesichert — sichere Headers, Brute-Force-Schutz, keine DB-Details im Client
**Depends on**: Phase 5
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04
**Success Criteria** (what must be TRUE):
  1. HTTP-Response-Headers enthalten Security-Headers (X-Content-Type-Options, X-Frame-Options, etc.) via helmet
  2. Login-Endpoint blockt nach N fehlgeschlagenen Versuchen temporär weitere Requests
  3. Fehlermeldungen an den Client enthalten keine internen Details (DB-Fehlercodes, Stack-Traces, Tabellennamen)
  4. Requests mit überdimensioniertem JSON-Body werden abgelehnt bevor sie den Controller erreichen
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md — helmet, express-rate-limit und Body-Size-Limit einbauen
- [x] 06-02-PLAN.md — Error-Messages in allen Controllern sanitizen

### Phase 7: Code-Qualität
**Goal**: Backend validiert alle Eingaben sauber, Production-Code ist frei von Debug-Output, Dependencies sind aktuell
**Depends on**: Phase 6
**Requirements**: QUAL-01, QUAL-02, QUAL-03
**Success Criteria** (what must be TRUE):
  1. Alle Backend-Endpoints validieren Eingaben mit Zod-Schemas und geben verständliche Validierungsfehler zurück
  2. Production-Logs enthalten keine console.log-Statements mit DEBUGGING-Prefix oder Test-Output
  3. Dependabot-Alerts sind auf 0 reduziert, alle Dependencies auf aktuellem Stand
**Plans**: TBD

Plans:
- [ ] 07-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 5 → 6 → 7

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Datenmodell & Logik | v1.0 | 2/2 | Complete | 2026-03-22 |
| 2. Excel-Export Formular | v1.0 | 1/1 | Complete | 2026-03-22 |
| 3. Mehrmonats-Export | v1.0 | 2/2 | Complete | 2026-03-22 |
| 4. Von/Bis-Zeitraum | v1.0 | 2/2 | Complete | 2026-03-22 |
| 5. Bugfixes | v1.1 | 1/1 | Complete | 2026-03-22 |
| 6. Security Hardening | v1.1 | 0/2 | Not started | - |
| 7. Code-Qualität | v1.1 | 0/? | Not started | - |
