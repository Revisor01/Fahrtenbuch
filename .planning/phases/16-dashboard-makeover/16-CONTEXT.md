# Phase 16: Dashboard Makeover - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Das Dashboard wird zur zentralen Anlaufstelle mit exklusivem Fahrten-Formular. Modernes Card-Layout mit den neuen Design-Tokens aus Phase 15. Gleichwertige Optimierung fuer Desktop, iPad und iPhone (Dienstgeraete). Export-Schnellzugriff direkt erreichbar.

</domain>

<decisions>
## Implementation Decisions

### Formular-Layout
- Modernes Card-Formular mit Gradient-Header beibehalten (aus Phase 13)
- Formular existiert NUR auf dem Dashboard — aus FahrtenListe entfernen
- Export-Schnellzugriff als Button im Dashboard-Header-Bereich

### Responsive Strategie
- Desktop UND Mobile gleichwertig wichtig — KEIN Mobile-First-Fokus
- iPhone als Dienstgeraet der Kollegen — muss exzellent funktionieren
- iPad als mittlere Groesse ebenfalls optimieren
- Es gibt einen iOS-Shortcut der ueber die API Fahrten anlegt — Formular-UX auf iPhone kritisch
- Alle Dashboard-Elemente (KPIs, Formular, Favoriten, Statistik) auf allen Geraeten nutzbar
- Min Touch-Targets: 44px (iOS Human Interface Guidelines)
- KPI-Cards: 2x2 Grid auf Desktop/iPad, Stack auf iPhone

### Export-Schnellzugriff
- Neuer Export-Button/Link direkt vom Dashboard erreichbar
- Soll zur Fahrten & Export Ansicht navigieren oder direkt exportieren

### Claude's Discretion
- Konkretes Layout/Anordnung der Dashboard-Sektionen nach Ermessen
- Ob Export als Button in Header oder als eigene kleine Card

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 15 Design-Tokens: card-container, shadow-card, rounded-card, border-card
- Dashboard.js: Bereits 5 Sektionen (KPIs, Favoriten, Formular, Letzte Fahrten, Statistik)
- FahrtForm.js: Eigenstaendige Formular-Komponente (in FahrtenListe.js eingebunden)
- AppContent.js: Tab-Navigation mit activeTab State

### Established Patterns
- Dashboard importiert FahrtForm nicht direkt — hat eigenes inline Formular
- FahrtenListe.js importiert FahrtForm als Eingabe-Komponente
- Export-Logik liegt in FahrtenListe.js / MonthlyOverview.js

### Integration Points
- FahrtenListe.js: FahrtForm-Import und -Rendering entfernen
- Dashboard.js: Formular ggf. als eigene Section-Card aufwerten
- AppContent.js: Export-Navigation/Link

</code_context>

<specifics>
## Specific Ideas

- Kollegen nutzen iPhones als Dienstgeraete — iPhone-UX ist geschaeftskritisch
- iOS Shortcut existiert fuer Fahrten-API — Formular-UX muss auf iPhone exzellent sein
- Desktop-Nutzung ebenfalls haeufig — nicht vernachlaessigen

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
