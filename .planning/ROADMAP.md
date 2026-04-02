# Roadmap: Fahrtenbuch

## Milestones

- ✅ **v1.0 Nutzerfeedback** - Phases 1-4 (shipped 2026-03-22)
- ✅ **v1.1 Stabilitat & Security** - Phases 5-7 (shipped 2026-03-22)
- ✅ **v1.2 Features & Refactoring** - Phases 8-9 (shipped 2026-03-22)
- ✅ **v1.3 Dashboard & UX** - Phases 10-12 (shipped 2026-03-28)
- ✅ **v1.4 UX Polish & Navigation** - Phases 13-14 (shipped 2026-03-28)
- 🚧 **v2.0 Design Makeover** - Phases 15-18 (in progress)

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

### 🚧 v2.0 Design Makeover (In Progress)

**Milestone Goal:** Komplettes visuelles Redesign der gesamten App — modern, mobil-optimiert, attraktiv. Alle bestehenden Funktionen bleiben, aber jede Ansicht bekommt ein zeitgemaesses UI mit einheitlichem Designsystem.

- [x] **Phase 15: Designsystem** - Einheitliche Variablen, Card-Komponente und Dark Mode als Grundlage fuer alle Views (completed 2026-03-28)
- [x] **Phase 16: Dashboard Makeover** - Dashboard komplett neu gestaltet mit Formular-Exklusivitaet, modernem Layout und Mobile-Optimierung (completed 2026-03-28)
- [x] **Phase 17: Listen & Uebersichten** - Fahrtenliste, Export-Bereich und Monatsuebersicht visuell modernisiert (completed 2026-03-28)
- [x] **Phase 18: Einstellungen, Login & Polish** - Einstellungen, Login/Landing aufgewertet und Animationen fuer den letzten Schliff (completed 2026-03-28)
- [x] **Phase 19: Dashboard & Listen Feinschliff** - Inline-Bearbeitung auf Dashboard, Fahrtenliste als Card-Layout, Verwaltung-Tab redesignen, UI-Polish (completed 2026-04-02)

## Phase Details

### Phase 15: Designsystem
**Goal**: Die App hat ein einheitliches visuelles Fundament — Farben, Typografie, Spacing und Card-Komponente — das alle nachfolgenden View-Redesigns konsistent macht
**Depends on**: Phase 14 (v1.4 abgeschlossen)
**Requirements**: DS-01, DS-02, DS-03
**Success Criteria** (what must be TRUE):
  1. Alle Farb-, Spacing- und Typografie-Werte kommen aus CSS-Variablen (keine hardcodierten Werte in Komponenten)
  2. Jede Sektion in jeder View ist in eine Card-Komponente mit einheitlichem Schatten, Radius und Padding eingebettet
  3. Der Dark Mode zeigt korrekte Kontraste und abgestimmte Farben in allen bestehenden Views
  4. Die Design-Tokens (Variablen) werden in einer zentralen Datei definiert und von allen Komponenten genutzt
**Plans**: 2 plans

Plans:
- [x] 15-01-PLAN.md — Design-Tokens erweitern, Card-Klassen und Dark-Mode modernisieren
- [x] 15-02-PLAN.md — Alle Views konsistent auf card-container umstellen

**UI hint**: yes

### Phase 16: Dashboard Makeover
**Goal**: Das Dashboard ist die zentrale Anlaufstelle mit exklusivem Fahrten-Formular, modernem Card-Layout, touch-freundlicher Mobile-Darstellung und Export-Schnellzugriff
**Depends on**: Phase 15
**Requirements**: DASH-08, DASH-09, DASH-10, DASH-11
**Success Criteria** (what must be TRUE):
  1. Das Formular "Neue Fahrt erfassen" existiert nur auf dem Dashboard — in der Fahrtenliste gibt es kein Eingabeformular mehr
  2. Das Formular hat ein visuell ansprechendes, modernes Layout (kein Standard-Formular-Look)
  3. Auf einem Smartphone sind alle Dashboard-Elemente (KPIs, Formular, Favoriten, Statistik) touch-freundlich und ohne horizontales Scrollen nutzbar
  4. Ein Export-Schnellzugriff ist direkt vom Dashboard erreichbar
**Plans**: 2 plans

Plans:
- [ ] 16-01-PLAN.md — Dashboard UI Makeover: KPI-Grid, Touch-Targets, Export-Schnellzugriff
- [x] 16-02-PLAN.md — FahrtForm aus Fahrten-Tab entfernen (Dashboard-Exklusivitaet)

**UI hint**: yes

### Phase 17: Listen & Uebersichten
**Goal**: Fahrtenliste, Export-Bereich und Monatsuebersicht sind visuell modernisiert mit Card-Layout, klarer Abgrenzung und kompakter Mobile-Darstellung
**Depends on**: Phase 16
**Requirements**: FE-01, FE-02, FE-03, MO-01, MO-02
**Success Criteria** (what must be TRUE):
  1. Die Fahrtenliste zeigt ausschliesslich die Liste der Fahrten (kein Eingabeformular) in modernem Card-Layout
  2. Filter- und Export-Bereich sind visuell als eigene Cards abgegrenzt und modernisiert
  3. Auf Mobile ist die Fahrtenliste kompakt dargestellt und per Touch bedienbar (kein Overflow, keine zu kleinen Buttons)
  4. Die Monatsuebersicht nutzt Cards fuer Zusammenfassungen und Tabellen mit uebersichtlichem Layout
**Plans**: 2 plans

Plans:
- [x] 17-01-PLAN.md — FahrtenListe modernisieren: Card-Layout, Export-Card, Touch-Targets
- [x] 17-02-PLAN.md — MonthlyOverview modernisieren: Card-Layout, Touch-Targets, Empty States

**UI hint**: yes

### Phase 18: Einstellungen, Login & Polish
**Goal**: Einstellungen und Login/Landing haben ein aufgewertetes, modernes Design und Tab-Wechsel sowie Card-Interaktionen sind mit sanften Animationen versehen
**Depends on**: Phase 17
**Requirements**: SET-01, SET-02, LOG-01, LOG-02, ANI-01
**Success Criteria** (what must be TRUE):
  1. Einstellungen-Sub-Tabs haben eine aufgewertete Navigation mit Card-Layout und klarer visueller Hierarchie
  2. Alle Formulare in den Einstellungen folgen dem einheitlichen Design aus Phase 15
  3. Die Login-Seite hat ein modernes, einladendes Design mit responsivem Layout
  4. Die Landing-Page ist visuell attraktiv und passt sich an verschiedene Bildschirmgroessen an
  5. Tab-Wechsel und Card-Interaktionen haben sanfte CSS-Transitions (kein abruptes Umschalten)
**Plans**: 3 plans

Plans:
- [x] 18-01-PLAN.md — Settings Sub-Tabs aufwerten und Formulare in Cards einbetten
- [x] 18-02-PLAN.md — Login-Seite und Landing-Page modernisieren
- [x] 18-03-PLAN.md — CSS-Transitions fuer Tab-Wechsel und Card-Interaktionen

**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 15 → 16 → 17 → 18 → 19

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
| 14. Navigation-Umbau | v1.4 | 2/2 | Complete    | 2026-04-01 |
| 15. Designsystem | v2.0 | 2/2 | Complete    | 2026-03-28 |
| 16. Dashboard Makeover | v2.0 | 1/2 | Complete    | 2026-03-28 |
| 17. Listen & Uebersichten | v2.0 | 2/2 | Complete    | 2026-03-28 |
| 18. Einstellungen, Login & Polish | v2.0 | 3/3 | Complete    | 2026-03-28 |
| 19. Dashboard & Listen Feinschliff | v2.0 | 1/3 | Complete    | 2026-04-02 |

### Phase 19: Dashboard & Listen Feinschliff
**Goal**: Inline-Bearbeitung und Loeschen direkt auf dem Dashboard, Fahrtenliste als Card-Layout statt Tabelle, Verwaltung-Tab redesignen, offene UI-Polish-Issues (Statistik-Rendering, Button-Konsistenz)
**Depends on**: Phase 18
**Requirements**: P19-01, P19-02, P19-03, P19-04, P19-05
**Success Criteria** (what must be TRUE):
  1. Letzte Fahrten auf dem Dashboard koennen inline bearbeitet und geloescht werden
  2. Fahrtenliste zeigt Fahrten als Cards statt Tabellenzeilen (wie Letzte Fahrten auf Dashboard)
  3. Verwaltung-Tab hat das gleiche Card-Design wie Einstellungen
  4. Statistik-Diagramm wird zuverlaessig beim ersten Load gerendert
  5. Button-Farbschema ist konsistent (dunkelblau/hellblau/rot)
**Plans**: 3 plans

Plans:
- [x] 19-01-PLAN.md — CSS-Grundlagen, FahrtForm Edit-Modus, Dashboard Inline-Bearbeitung und Chart-Animation
- [ ] 19-02-PLAN.md — Verwaltung-Tab Card-Redesign
- [ ] 19-03-PLAN.md — Fahrtenliste Card-Layout mit Inline-Edit

**UI hint**: yes
