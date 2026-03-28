# Roadmap: Fahrtenbuch

## Milestones

- ✅ **v1.0 Nutzerfeedback** - Phases 1-4 (shipped 2026-03-22)
- ✅ **v1.1 Stabilitat & Security** - Phases 5-7 (shipped 2026-03-22)
- ✅ **v1.2 Features & Refactoring** - Phases 8-9 (shipped 2026-03-22)
- 🚧 **v1.3 Dashboard & UX** - Phases 10-12 (in progress)

## Phases

<details>
<summary>v1.0 Nutzerfeedback (Phases 1-4) - SHIPPED 2026-03-22</summary>

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

### Phase 4: Von/Bis-Zeitraum in Monatsuebersicht
**Goal**: Monatsauswahl wird zu Von/Bis erweitert, separater Zeitraum-Export entfaellt
**Requirements**: D-01 bis D-19
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — Backend: Report-Range-Route fuer aggregierte Zeitraum-Daten
- [x] 04-02-PLAN.md — Frontend: Von/Bis-UI, adaptiver Export, Phase-3-Cleanup

</details>

<details>
<summary>v1.1 Stabilitat & Security (Phases 5-7) - SHIPPED 2026-03-22</summary>

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

### Phase 7: Code-Qualitaet
**Goal**: Backend validiert alle Eingaben sauber, Production-Code ist frei von Debug-Output
**Requirements**: QUAL-01, QUAL-02, QUAL-03
**Plans**: 2 plans

Plans:
- [x] 07-01-PLAN.md — Zod-Validierung fuer alle Backend-Endpoints
- [x] 07-02-PLAN.md — Debug-Logs entfernen und Dependency-Updates

</details>

<details>
<summary>v1.2 Features & Refactoring (Phases 8-9) - SHIPPED 2026-03-22</summary>

### Phase 8: Frontend-Refactoring
**Goal**: App.js ist in ueberschaubare, eigenstaendige Komponenten aufgeteilt
**Requirements**: REF-01, REF-02, REF-03
**Plans**: 2 plans

Plans:
- [x] 08-01-PLAN.md — AppProvider und FahrtenListe aus App.js extrahieren
- [x] 08-02-PLAN.md — MonthlyOverview, LoginPage und AppContent extrahieren

### Phase 9: PDF-Export
**Goal**: Nutzer koennen ihre Fahrtenbuch-Abrechnung als PDF exportieren
**Requirements**: PDF-01, PDF-02, PDF-03
**Plans**: 2 plans

Plans:
- [x] 09-01-PLAN.md — Backend: pdfkit installieren, pdfExport.js erstellen, PDF-Routen anlegen
- [x] 09-02-PLAN.md — Frontend: Excel/PDF Format-Auswahl im Export-Bereich

</details>

### 🚧 v1.3 Dashboard & UX (In Progress)

**Milestone Goal:** Dashboard als Startseite, Favoriten-Fahrten fuer Schnelleingabe, Statistiken mit Jahresuebersicht, Adress-Autocomplete.

- [x] **Phase 10: Favoriten & Quick-Copy** - Favoriten-System und "Nochmal fuer heute" fuer schnelle Fahrteingabe (completed 2026-03-28)
- [ ] **Phase 11: Dashboard, Navigation & Statistiken** - Dashboard-Startseite mit KPIs, Formular, Statistiken und neue Tab-Navigation
- [ ] **Phase 12: Adress-Autocomplete** - Ort-Eingabe mit Nominatim-Vorschlaegen

## Phase Details

### Phase 10: Favoriten & Quick-Copy
**Goal**: Nutzer koennen wiederkehrende Fahrten als Favoriten speichern und mit einem Klick wiederholen
**Depends on**: Phase 9 (v1.2 abgeschlossen)
**Requirements**: FAV-01, FAV-02, FAV-03
**Success Criteria** (what must be TRUE):
  1. Nutzer kann eine Fahrt als Favorit markieren und der Favorit wird mit Von, Nach, Anlass und Abrechnungstraeger gespeichert
  2. Nutzer kann einen Favoriten anklicken und eine neue Fahrt mit heutigem Datum wird automatisch eingetragen
  3. Nutzer sieht die letzten 3 Fahrten mit einem "Nochmal fuer heute"-Button und kann damit die Fahrt fuer heute duplizieren
  4. Favoriten und Quick-Copy-Daten sind ueber die API persistent (DB-Tabelle, CRUD-Endpoints)
**Plans**: 2 plans

Plans:
- [x] 10-01-PLAN.md — Backend: Migration, Model, Schema, Controller und Routes fuer Favoriten-API
- [x] 10-02-PLAN.md — Frontend: AppContext-Integration, Favoriten-Tab im Profil-Modal, Quick-Copy-Buttons

### Phase 11: Dashboard, Navigation & Statistiken
**Goal**: Dashboard als neue Startseite mit KPIs, Schnelleingabe-Formular, Statistiken und ueberarbeiteter Navigation
**Depends on**: Phase 10
**Requirements**: DASH-01, DASH-02, DASH-03, STAT-01, STAT-02
**Success Criteria** (what must be TRUE):
  1. Dashboard zeigt KPI-Cards: offene Erstattungen, gefahrene km diesen Monat, Anzahl Fahrten diesen Monat
  2. Nutzer kann direkt im Dashboard eine Fahrt erfassen ueber ein aufklappbares Formular
  3. Navigation hat vier Tabs: Dashboard, Fahrten & Export, Monatsuebersicht, Einstellungen
  4. Jahres-Balkendiagramm zeigt km pro Monat fuer das aktuelle Jahr
  5. Erstattungs-Uebersicht pro Abrechnungstraeger ueber das Jahr ist im Dashboard sichtbar
**Plans**: TBD

Plans:
- [ ] 11-01: TBD
- [ ] 11-02: TBD

### Phase 12: Adress-Autocomplete
**Goal**: Nutzer erhalten bei der Ort-Eingabe Adress-Vorschlaege fuer schnellere und genauere Eingabe
**Depends on**: Phase 10 (unabhaengig von Phase 11, kann parallel)
**Requirements**: ADDR-01
**Success Criteria** (what must be TRUE):
  1. Bei Eingabe in ein Ort-Feld erscheinen Vorschlaege aus OpenStreetMap/Nominatim
  2. Nutzer kann einen Vorschlag auswaehlen und der Ort wird uebernommen
  3. Autocomplete funktioniert sowohl bei neuen Orten als auch im Fahrten-Formular
**Plans**: TBD

Plans:
- [ ] 12-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 10 → 11 → 12

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Datenmodell & Logik | v1.0 | 2/2 | Complete | 2026-03-22 |
| 2. Excel-Export Formular | v1.0 | 1/1 | Complete | 2026-03-22 |
| 3. Mehrmonats-Export | v1.0 | 2/2 | Complete | 2026-03-22 |
| 4. Von/Bis-Zeitraum | v1.0 | 2/2 | Complete | 2026-03-22 |
| 5. Bugfixes | v1.1 | 1/1 | Complete | 2026-03-22 |
| 6. Security Hardening | v1.1 | 2/2 | Complete | 2026-03-22 |
| 7. Code-Qualitaet | v1.1 | 2/2 | Complete | 2026-03-22 |
| 8. Frontend-Refactoring | v1.2 | 2/2 | Complete | 2026-03-22 |
| 9. PDF-Export | v1.2 | 2/2 | Complete | 2026-03-22 |
| 10. Favoriten & Quick-Copy | v1.3 | 2/2 | Complete    | 2026-03-28 |
| 11. Dashboard, Navigation & Statistiken | v1.3 | 0/? | Not started | - |
| 12. Adress-Autocomplete | v1.3 | 0/? | Not started | - |
