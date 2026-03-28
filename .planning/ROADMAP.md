# Roadmap: Fahrtenbuch

## Milestones

- ✅ **v1.0 Nutzerfeedback** - Phases 1-4 (shipped 2026-03-22)
- ✅ **v1.1 Stabilitat & Security** - Phases 5-7 (shipped 2026-03-22)
- ✅ **v1.2 Features & Refactoring** - Phases 8-9 (shipped 2026-03-22)
- ✅ **v1.3 Dashboard & UX** - Phases 10-12 (shipped 2026-03-28)
- 🚧 **v1.4 UX Polish & Navigation** - Phases 13-14 (in progress)

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

<details>
<summary>v1.3 Dashboard & UX (Phases 10-12) - SHIPPED 2026-03-28</summary>

### Phase 10: Favoriten & Quick-Copy
**Goal**: Nutzer koennen wiederkehrende Fahrten als Favoriten speichern und mit einem Klick wiederholen
**Depends on**: Phase 9 (v1.2 abgeschlossen)
**Requirements**: FAV-01, FAV-02, FAV-03
**Plans**: 2 plans

Plans:
- [x] 10-01-PLAN.md — Backend: Migration, Model, Schema, Controller und Routes fuer Favoriten-API
- [x] 10-02-PLAN.md — Frontend: AppContext-Integration, Favoriten-Tab im Profil-Modal, Quick-Copy-Buttons

### Phase 11: Dashboard, Navigation & Statistiken
**Goal**: Dashboard als neue Startseite mit KPIs, Schnelleingabe-Formular, Statistiken und ueberarbeiteter Navigation
**Depends on**: Phase 10
**Requirements**: DASH-01, DASH-02, DASH-03, STAT-01, STAT-02
**Plans**: 2 plans

Plans:
- [x] 11-01-PLAN.md — Tab-Navigation und Dashboard mit KPIs, Formular, Favoriten, Quick-Copy
- [x] 11-02-PLAN.md — Statistiken: Jahres-Balkendiagramm und Erstattungs-Uebersicht

### Phase 12: Adress-Autocomplete
**Goal**: Nutzer erhalten bei der Ort-Eingabe Adress-Vorschlaege fuer schnellere und genauere Eingabe
**Depends on**: Phase 10 (unabhaengig von Phase 11, kann parallel)
**Requirements**: ADDR-01
**Plans**: 1 plan

Plans:
- [x] 12-01-PLAN.md — AddressAutocomplete Komponente mit Nominatim-Integration, OrtForm und FahrtForm Einbindung

</details>

### 🚧 v1.4 UX Polish & Navigation (In Progress)

**Milestone Goal:** Dashboard-Polish (Cards, Statistiken, Favoriten mit Rueckfahrt), Umlaute korrigieren, Einstellungen und Benutzerverwaltung als inline Tabs statt Modal/Button.

- [ ] **Phase 13: Dashboard-Polish & Kleinigkeiten** - Dashboard Cards, Statistik-Details, Favoriten-Rueckfahrt und Umlaut-Korrektur
- [ ] **Phase 14: Navigation-Umbau** - Einstellungen und Benutzerverwaltung inline als Tabs statt Modal/Button

## Phase Details

### Phase 13: Dashboard-Polish & Kleinigkeiten
**Goal**: Dashboard ist visuell aufgeraumt mit klaren Card-Grenzen, erweiterten Statistiken und Favoriten mit Rueckfahrt-Option — alle Texte nutzen korrekte Umlaute
**Depends on**: Phase 12 (v1.3 abgeschlossen)
**Requirements**: DASH-04, DASH-05, DASH-06, DASH-07, FAV-04, TEXT-01
**Success Criteria** (what must be TRUE):
  1. Im Statistik-Bereich sieht der Nutzer Erstattungen aufgeschluesselt nach Abrechnungstraeger
  2. Mouseover auf einen km-Balken im Jahreschart zeigt die Anzahl der Fahrten in diesem Monat
  3. Jede Dashboard-Rubrik (KPIs, Formular, Favoriten, letzte Fahrten, Statistik) hat einen eigenen Card-Hintergrund mit klarer Abgrenzung
  4. Der Bereich "Neue Fahrt erfassen" hat ein ueberarbeitetes Layout (nicht mehr Standard-Formular-Look)
  5. Beim Ausfuehren eines Favoriten fragt ein Dialog "Mit Rueckfahrt?" — bei Ja werden Hin- und Rueckfahrt angelegt
**Plans**: 3 plans

Plans:
- [ ] 13-01-PLAN.md — Dashboard Cards, Statistik-Integration und Formular-Redesign
- [ ] 13-02-PLAN.md — Favoriten-Rueckfahrt-Dialog und Nochmal-Buttons mit Richtungswahl
- [ ] 13-03-PLAN.md — Umlaut-Korrektur in allen Frontend- und Backend-Dateien

**UI hint**: yes

### Phase 14: Navigation-Umbau
**Goal**: Einstellungen und Benutzerverwaltung sind direkt in der Tab-Navigation erreichbar statt hinter Modals und Buttons versteckt
**Depends on**: Phase 13
**Requirements**: NAV-01, NAV-02
**Success Criteria** (what must be TRUE):
  1. Nutzer klickt auf den Einstellungen-Tab und sieht alle Einstellungen (Profil, Orte, Distanzen, Traeger, Erstattungen, Passwort, API, Favoriten) inline als Abschnitte oder Sub-Tabs — kein Modal oeffnet sich
  2. Admin-Nutzer sehen "Benutzerverwaltung" als eigenen Tab in der Hauptnavigation und koennen Nutzer direkt dort verwalten
  3. Die Navigation zeigt maximal 4-5 Tabs: Dashboard, Fahrten & Export, Monatsuebersicht, Einstellungen (+ Benutzerverwaltung fuer Admins)
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 13 → 14

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
| 10. Favoriten & Quick-Copy | v1.3 | 2/2 | Complete | 2026-03-28 |
| 11. Dashboard, Navigation & Statistiken | v1.3 | 2/2 | Complete | 2026-03-28 |
| 12. Adress-Autocomplete | v1.3 | 1/1 | Complete | 2026-03-28 |
| 13. Dashboard-Polish & Kleinigkeiten | v1.4 | 0/3 | In progress | - |
| 14. Navigation-Umbau | v1.4 | 0/0 | Not started | - |
