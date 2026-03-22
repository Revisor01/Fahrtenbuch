# Roadmap: Fahrtenbuch

## Milestones

- ✅ **v1.0 Nutzerfeedback** - Phases 1-4 (shipped 2026-03-22)
- ✅ **v1.1 Stabilität & Security** - Phases 5-7 (shipped 2026-03-22)
- 🚧 **v1.2 Features & Refactoring** - Phases 8-9 (in progress)

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

<details>
<summary>✅ v1.1 Stabilität & Security (Phases 5-7) - SHIPPED 2026-03-22</summary>

### Phase 5: Bugfixes
**Goal**: Alle bekannten Bugs sind behoben
**Requirements**: BUG-01, BUG-02, BUG-03
**Plans**: 1 plan

Plans:
- [x] 05-01-PLAN.md — Mitfahrer-Erstattung DB-Lookup, Rueckfahrt-Matching Fallback, Axios Race-Condition-Guard

### Phase 6: Security Hardening
**Goal**: App ist gegen gaengige Angriffsvektoren abgesichert
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md — helmet, express-rate-limit und Body-Size-Limit einbauen
- [x] 06-02-PLAN.md — Error-Messages in allen Controllern sanitizen

### Phase 7: Code-Qualität
**Goal**: Backend validiert alle Eingaben sauber, Production-Code ist frei von Debug-Output
**Requirements**: QUAL-01, QUAL-02, QUAL-03
**Plans**: 2 plans

Plans:
- [x] 07-01-PLAN.md — Zod-Validierung fuer alle Backend-Endpoints
- [x] 07-02-PLAN.md — Debug-Logs entfernen und Dependency-Updates

</details>

### 🚧 v1.2 Features & Refactoring

**Milestone Goal:** Monolithisches Frontend aufteilen und PDF-Export als neues Feature einbauen.

- [x] **Phase 8: Frontend-Refactoring** - App.js in modulare Komponenten und Custom Hooks aufteilen
- [ ] **Phase 9: PDF-Export** - PDF als Export-Format neben Excel mit Format-Auswahl im UI

## Phase Details

### Phase 8: Frontend-Refactoring
**Goal**: App.js ist in ueberschaubare, eigenstaendige Komponenten aufgeteilt — Code ist modular und erweiterbar
**Depends on**: Phase 7 (v1.1 abgeschlossen)
**Requirements**: REF-01, REF-02, REF-03
**Success Criteria** (what must be TRUE):
  1. App.js enthaelt keine UI-Rendering-Logik mehr — sie delegiert an eigenstaendige Komponenten (Dashboard, Monatsuebersicht, Settings etc.)
  2. Shared State (Fahrten, Orte, Abrechnungstraeger etc.) wird ueber Custom Hooks bereitgestellt, nicht ueber inline useState/useEffect in App.js
  3. Export-Logik (Zeitraum-Auswahl, Download-Trigger, Eingereicht-Status) lebt in einer eigenen Komponente, nicht verstreut in App.js
  4. Die App verhält sich nach dem Refactoring identisch zum Ist-Zustand — kein sichtbarer Unterschied fuer Nutzer
**Plans**: 2 plans

Plans:
- [x] 08-01-PLAN.md — AppProvider und FahrtenListe aus App.js extrahieren
- [x] 08-02-PLAN.md — MonthlyOverview, LoginPage und AppContent extrahieren — App.js wird minimal

### Phase 9: PDF-Export
**Goal**: Nutzer koennen ihre Fahrtenbuch-Abrechnung als PDF exportieren — druckfertig mit Unterschriftsfeldern und Kostenstelle
**Depends on**: Phase 8
**Requirements**: PDF-01, PDF-02, PDF-03
**Success Criteria** (what must be TRUE):
  1. Nutzer kann eine Abrechnung als PDF herunterladen, die dasselbe Layout wie der Excel-Export hat (Datum, Kostenstelle, Unterschriftsfelder)
  2. Im Export-Dialog kann der Nutzer zwischen Excel und PDF waehlen
  3. PDF-Export funktioniert sowohl fuer Einzelmonat als auch fuer Mehrmonats-Zeitraeume
  4. Das PDF ist direkt druckbar und einreichbar ohne manuelle Nacharbeit
**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 8 → 9

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Datenmodell & Logik | v1.0 | 2/2 | Complete | 2026-03-22 |
| 2. Excel-Export Formular | v1.0 | 1/1 | Complete | 2026-03-22 |
| 3. Mehrmonats-Export | v1.0 | 2/2 | Complete | 2026-03-22 |
| 4. Von/Bis-Zeitraum | v1.0 | 2/2 | Complete | 2026-03-22 |
| 5. Bugfixes | v1.1 | 1/1 | Complete | 2026-03-22 |
| 6. Security Hardening | v1.1 | 2/2 | Complete | 2026-03-22 |
| 7. Code-Qualität | v1.1 | 2/2 | Complete | 2026-03-22 |
| 8. Frontend-Refactoring | v1.2 | 2/2 | Complete | 2026-03-22 |
| 9. PDF-Export | v1.2 | 0/? | Not started | - |
