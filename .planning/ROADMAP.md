# Roadmap: Fahrtenbuch

## Milestones

- ✅ **v1.0 Nutzerfeedback** - Phases 1-4 (shipped 2026-03-22)
- ✅ **v1.1 Stabilitat & Security** - Phases 5-7 (shipped 2026-03-22)
- ✅ **v1.2 Features & Refactoring** - Phases 8-9 (shipped 2026-03-22)
- ✅ **v1.3 Dashboard & UX** - Phases 10-12 (shipped 2026-03-28)
- ✅ **v1.4 UX Polish & Navigation** - Phases 13-14 (shipped 2026-03-28)
- ✅ **v2.0 Design Makeover** - Phases 15-21 (shipped 2026-04-03)
- 🚧 **v2.1 UI-Konsistenz & View-Architektur** - Phases 22-26 (in progress)

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

<details>
<summary>v1.4 UX Polish & Navigation (Phases 13-14) - SHIPPED 2026-03-28</summary>

### Phase 13: Dashboard-Polish & Kleinigkeiten
**Goal**: Dashboard ist visuell aufgeraumt mit klaren Card-Grenzen, erweiterten Statistiken und Favoriten mit Rueckfahrt-Option — alle Texte nutzen korrekte Umlaute
**Depends on**: Phase 12 (v1.3 abgeschlossen)
**Requirements**: DASH-04, DASH-05, DASH-06, DASH-07, FAV-04, TEXT-01
**Plans**: 3 plans

Plans:
- [x] 13-01-PLAN.md — Dashboard Cards, Statistik-Integration und Formular-Redesign
- [x] 13-02-PLAN.md — Favoriten-Rueckfahrt-Dialog und Nochmal-Buttons mit Richtungswahl
- [x] 13-03-PLAN.md — Umlaut-Korrektur in allen Frontend- und Backend-Dateien

### Phase 14: Navigation-Umbau
**Goal**: Einstellungen und Benutzerverwaltung sind direkt in der Tab-Navigation erreichbar statt hinter Modals und Buttons versteckt
**Depends on**: Phase 13
**Requirements**: NAV-01, NAV-02
**Plans**: 2 plans

Plans:
- [x] 14-01-PLAN.md — Settings.js erstellen und Einstellungen als inline Tab
- [x] 14-02-PLAN.md — Verwaltung-Tab fuer Admins und Modal-Cleanup

</details>

<details>
<summary>v2.0 Design Makeover (Phases 15-21) - SHIPPED 2026-04-03</summary>

### Phase 15: Designsystem
**Goal**: Die App hat ein einheitliches visuelles Fundament — Farben, Typografie, Spacing und Card-Komponente — das alle nachfolgenden View-Redesigns konsistent macht
**Depends on**: Phase 14 (v1.4 abgeschlossen)
**Requirements**: DS-01, DS-02, DS-03
**Plans**: 2 plans

Plans:
- [x] 15-01-PLAN.md — Design-Tokens erweitern, Card-Klassen und Dark-Mode modernisieren
- [x] 15-02-PLAN.md — Alle Views konsistent auf card-container umstellen

### Phase 16: Dashboard Makeover
**Goal**: Das Dashboard ist die zentrale Anlaufstelle mit exklusivem Fahrten-Formular, modernem Card-Layout, touch-freundlicher Mobile-Darstellung und Export-Schnellzugriff
**Depends on**: Phase 15
**Requirements**: DASH-08, DASH-09, DASH-10, DASH-11
**Plans**: 2 plans

Plans:
- [x] 16-01-PLAN.md — Dashboard UI Makeover: KPI-Grid, Touch-Targets, Export-Schnellzugriff
- [x] 16-02-PLAN.md — FahrtForm aus Fahrten-Tab entfernen (Dashboard-Exklusivitaet)

### Phase 17: Listen & Uebersichten
**Goal**: Fahrtenliste, Export-Bereich und Monatsuebersicht sind visuell modernisiert mit Card-Layout, klarer Abgrenzung und kompakter Mobile-Darstellung
**Depends on**: Phase 16
**Requirements**: FE-01, FE-02, FE-03, MO-01, MO-02
**Plans**: 2 plans

Plans:
- [x] 17-01-PLAN.md — FahrtenListe modernisieren: Card-Layout, Export-Card, Touch-Targets
- [x] 17-02-PLAN.md — MonthlyOverview modernisieren: Card-Layout, Touch-Targets, Empty States

### Phase 18: Einstellungen, Login & Polish
**Goal**: Einstellungen und Login/Landing haben ein aufgewertetes, modernes Design und Tab-Wechsel sowie Card-Interaktionen sind mit sanften Animationen versehen
**Depends on**: Phase 17
**Requirements**: SET-01, SET-02, LOG-01, LOG-02, ANI-01
**Plans**: 3 plans

Plans:
- [x] 18-01-PLAN.md — Settings Sub-Tabs aufwerten und Formulare in Cards einbetten
- [x] 18-02-PLAN.md — Login-Seite und Landing-Page modernisieren
- [x] 18-03-PLAN.md — CSS-Transitions fuer Tab-Wechsel und Card-Interaktionen

### Phase 19: Dashboard & Listen Feinschliff
**Goal**: Inline-Bearbeitung und Loeschen direkt auf dem Dashboard, Fahrtenliste als Card-Layout statt Tabelle, Verwaltung-Tab redesignen, offene UI-Polish-Issues (Statistik-Rendering, Button-Konsistenz)
**Depends on**: Phase 18
**Requirements**: P19-01, P19-02, P19-03, P19-04, P19-05
**Plans**: 3 plans

Plans:
- [x] 19-01-PLAN.md — CSS-Grundlagen, FahrtForm Edit-Modus, Dashboard Inline-Bearbeitung und Chart-Animation
- [x] 19-02-PLAN.md — Verwaltung-Tab Card-Redesign
- [x] 19-03-PLAN.md — Fahrtenliste Card-Layout mit Inline-Edit

### Phase 20: Dashboard KPIs, Fahrten-Layout & Excel-Export
**Goal**: Dashboard zeigt alle offenen Erstattungen unabhaengig vom Monatsfilter plus eingereichte Betraege, Fahrten-Cards auf Fahrten&Export identisch zum Dashboard, Monatsuebersicht wie KPI-Cards, Excel-Export korrekt mit neuer 2026-Vorlage
**Depends on**: Phase 19
**Requirements**: SC-01, SC-02, SC-03, SC-04, SC-05, SC-06, SC-07, SC-08
**Plans**: 2 plans

Plans:
- [x] 20-01-PLAN.md — Dashboard KPIs global, Fahrten-Cards auf Fahrten&Export angleichen
- [x] 20-02-PLAN.md — Monatsuebersicht KPI-Cards, Excel-Export Template-Formatierung

### Phase 21: Monatsuebersicht Polish
**Goal**: Monatsuebersicht visuell aufraeumen — Icons entfernen, Farben pro Abrechnungstraeger konfigurierbar, Buttons redesign, Layout-Fixes
**Depends on**: Phase 20
**Requirements**: D-01 bis D-16
**Plans**: 3 plans

Plans:
- [x] 21-01-PLAN.md — Backend Farbe-Feld: DB-Migration, Model, Controller, AbrechnungstraegerForm Farbwahl
- [x] 21-02-PLAN.md — MonthlyOverview: Icons entfernen, Farben dynamisch, Layout-Fixes
- [x] 21-03-PLAN.md — Status-Buttons redesign: CSS-Klassen ueberarbeiten, renderStatusCell aktualisieren

</details>

### v2.1 UI-Konsistenz & View-Architektur (In Progress)

**Milestone Goal:** Alle Views auf Dashboard-Niveau — einheitliche Patterns, saubere Struktur, sinnvolle Navigation. Das Vorhandene konsequent zu Ende bringen.

- [x] **Phase 22: Globale Patterns** - CSS-Fundament bereinigen: btn-Hoehen, Card-Backgrounds, KPI-Card-Pattern, Section-Header-Pattern (completed 2026-04-04)
- [x] **Phase 23: FahrtenListe Polish** - FahrtenListe auf Dashboard-Niveau mit Section-Headers, Card-Struktur und Export-Aufwertung (completed 2026-04-04)
- [ ] **Phase 24: Monatsuebersicht Refactor** - Naming-Entscheidung, Desktop/Mobile-Vereinheitlichung, Section-Icons und Card-Konsistenz
- [ ] **Phase 25: Einstellungen Konsistenz** - Form-Sections mit Icons, konsistente Card-Struktur und Input-Styling ueber alle Sub-Tabs
- [ ] **Phase 26: Navigation Check** - Tab-Namen und -Icons pruefen, konsistente Navigation auf Desktop und Mobile

## Phase Details

### Phase 22: Globale Patterns
**Goal**: Die App hat bereinigte, wiederverwendbare CSS-Patterns — alle Buttons gleich hoch, Card-Backgrounds aus Design-Tokens, KPI-Card und Section-Header als zentrale Bausteine
**Depends on**: Phase 21 (v2.0 abgeschlossen)
**Requirements**: GP-01, GP-02, GP-03, GP-04
**Success Criteria** (what must be TRUE):
  1. btn-primary und btn-secondary rendern mit identischer Hoehe (h-10) auf allen Views
  2. Kein hardcodierter Farb-Background (bg-emerald-50, bg-blue-50 etc.) direkt in Komponenten — nur Design-Tokens
  3. KPI-Cards auf Dashboard und Monatsuebersicht nutzen dieselbe kpi-card CSS-Klasse mit Farbvarianten
  4. Section-Headers (Icon + Titel + optionale Anzahl) sind ein wiederverwendbares Pattern, das in allen Views gleich aussieht
**Plans**: 2 plans

Plans:
- [x] 22-01-PLAN.md — CSS-Fundament: Button-Hoehen, KPI-Card-Klassen, Section-Header-Klassen
- [x] 22-02-PLAN.md — Komponenten umstellen: Dashboard, MonthlyOverview, FahrtenListe, LoginPage
**UI hint**: yes

### Phase 23: FahrtenListe Polish
**Goal**: Die FahrtenListe sieht aus wie eine Dashboard-Sektion — mit klaren Section-Headers, strukturiertem Card-Layout und aufgewertetem Export-Bereich
**Depends on**: Phase 22
**Requirements**: FL-01, FL-02, FL-03
**Success Criteria** (what must be TRUE):
  1. FahrtenListe hat Section-Headers mit Lucide-Icons (identisches Pattern wie Dashboard-Sektionen)
  2. Card-Layout hat klare Sektionen mit konsistentem Whitespace (visuell auf Dashboard-Niveau)
  3. Export-Bereich hat Icons und eine klare visuelle Struktur (nicht nur nackte Buttons)
**Plans**: 1 plan

Plans:
- [x] 23-01-PLAN.md — Section-Headers, Card-Struktur und Export-Aufwertung
**UI hint**: yes

### Phase 24: Monatsuebersicht Refactor
**Goal**: Die Monatsuebersicht hat einen passenden Namen, rendert Desktop und Mobile aus einer Komponenten-Struktur und nutzt die globalen Patterns fuer Section-Headers und Cards
**Depends on**: Phase 22
**Requirements**: MU-01, MU-02, MU-03, MU-04
**Success Criteria** (what must be TRUE):
  1. Tab-Name und Seitentitel sind bewusst gewaehlt (ob "Monatsuebersicht", "Abrechnungen" oder anderes — Entscheidung dokumentiert)
  2. Desktop und Mobile rendern aus einer einzigen Komponenten-Struktur (kein hidden/sm:hidden Doppel-Rendering)
  3. Section-Headers nutzen das globale Pattern aus Phase 22 mit passenden Icons
  4. Cards sind visuell identisch mit dem Rest der App (keine Sonder-Styles)
**Plans**: 2 plans

Plans:
- [x] 24-01-PLAN.md — Tab-Umbenennung von "Monatsuebersicht" zu "Abrechnungen"
- [x] 24-02-PLAN.md — Desktop/Mobile-Merge, Section-Header und Card-Konsistenz
**UI hint**: yes


### Phase 25: Einstellungen Konsistenz
**Goal**: Alle 8 Einstellungen-Sub-Tabs haben Icons in den Form-Sections, identische Card-Struktur und konsistentes Input-Styling
**Depends on**: Phase 22
**Requirements**: ES-01, ES-02, ES-03
**Success Criteria** (what must be TRUE):
  1. Jede Form-Section in jedem Sub-Tab hat ein Lucide-Icon und einen klaren Header-Text
  2. Alle 8 Sub-Tabs haben identische Card-Struktur (gleiche Padding, Spacing, Border-Radius)
  3. Formular-Inputs (Text, Select, Toggle) sehen in allen Tabs gleich aus
**Plans**: 2 plans

Plans:
- [ ] 22-01-PLAN.md — CSS-Fundament: Button-Hoehen, KPI-Card-Klassen, Section-Header-Klassen
- [ ] 22-02-PLAN.md — Komponenten umstellen: Dashboard, MonthlyOverview, FahrtenListe, LoginPage
**UI hint**: yes

### Phase 26: Navigation Check
**Goal**: Navigation ist klar benannt, mit passenden Icons versehen und funktioniert konsistent auf Desktop und Mobile
**Depends on**: Phase 23, Phase 24, Phase 25
**Requirements**: NV-01, NV-02
**Success Criteria** (what must be TRUE):
  1. Alle Tab-Namen sind selbsterklaerend und die Icons passen zum Inhalt
  2. Navigation funktioniert identisch auf Desktop (Tab-Leiste) und Mobile (Hamburger/Bottom-Nav) — kein Tab fehlt oder ist abgeschnitten
**Plans**: 2 plans

Plans:
- [ ] 22-01-PLAN.md — CSS-Fundament: Button-Hoehen, KPI-Card-Klassen, Section-Header-Klassen
- [ ] 22-02-PLAN.md — Komponenten umstellen: Dashboard, MonthlyOverview, FahrtenListe, LoginPage
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 22 → 23 → 24 → 25 → 26
(Phase 23, 24, 25 koennen nach Phase 22 parallel laufen — alle haengen nur von Phase 22 ab)

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
| 13. Dashboard-Polish & Kleinigkeiten | v1.4 | 3/3 | Complete | 2026-03-28 |
| 14. Navigation-Umbau | v1.4 | 2/2 | Complete | 2026-04-01 |
| 15. Designsystem | v2.0 | 2/2 | Complete | 2026-03-28 |
| 16. Dashboard Makeover | v2.0 | 2/2 | Complete | 2026-03-28 |
| 17. Listen & Uebersichten | v2.0 | 2/2 | Complete | 2026-03-28 |
| 18. Einstellungen, Login & Polish | v2.0 | 3/3 | Complete | 2026-03-28 |
| 19. Dashboard & Listen Feinschliff | v2.0 | 3/3 | Complete | 2026-04-02 |
| 20. Dashboard KPIs, Fahrten-Layout & Excel-Export | v2.0 | 2/2 | Complete | 2026-04-03 |
| 21. Monatsuebersicht Polish | v2.0 | 3/3 | Complete | 2026-04-03 |
| 22. Globale Patterns | v2.1 | 1/2 | Complete    | 2026-04-04 |
| 23. FahrtenListe Polish | v2.1 | 0/1 | Complete    | 2026-04-04 |
| 24. Monatsuebersicht Refactor | v2.1 | 0/? | Not started | - |
| 25. Einstellungen Konsistenz | v2.1 | 0/? | Not started | - |
| 26. Navigation Check | v2.1 | 0/? | Not started | - |
