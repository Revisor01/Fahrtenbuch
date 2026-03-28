# Phase 17: Listen & Uebersichten - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning
**Mode:** Auto-generated (smart discuss — infrastructure-like phase)

<domain>
## Phase Boundary

Fahrtenliste, Export-Bereich und Monatsuebersicht visuell modernisieren mit Phase-15 Design-Tokens. Card-Layout fuer alle Sektionen, klare Abgrenzung, kompakte Mobile-Darstellung. Das Formular wurde bereits in Phase 16 aus der Fahrtenliste entfernt.

</domain>

<decisions>
## Implementation Decisions

### Fahrtenliste
- Fahrtenliste zeigt nur noch Liste (Formular wurde in Phase 16 entfernt — DASH-08 erledigt)
- Tabelle/Liste in card-container einbetten
- Filter-Bereich als eigene Card abgrenzen
- Export-Bereich als eigene Card abgrenzen
- Mobile: kompakte Darstellung, touch-freundliche Buttons (44px min)

### Monatsuebersicht
- Zusammenfassungen und Tabellen in Cards einbetten
- Uebersichtliches Layout mit klarer visueller Hierarchie
- Desktop und Mobile gleichwertig (wie Phase 16 Entscheidung)

### Claude's Discretion
- Konkrete Anordnung und Gruppierung der Filter/Export-Elemente
- Ob Tabelle auf Mobile zu Cards wird oder kompakt bleibt
- Detailliertes Styling nach Ermessen — Hauptsache modern und konsistent mit Phase 15/16

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 15 Design-Tokens: card-container, shadow-card, rounded-card, border-card
- FahrtenListe.js: Eigenstaendige Komponente mit Tabelle, Filter, Export
- MonthlyOverview.js: Monatsdaten mit Zusammenfassung und Tabellen
- index.css: table-container, table-header, table-cell, mobile-card Klassen

### Integration Points
- FahrtenListe.js: card-container auf Sektionen anwenden
- MonthlyOverview.js: card-container auf Sektionen anwenden

</code_context>

<specifics>
## Specific Ideas

- Desktop und Mobile gleichwertig wichtig (iPhone = Dienstgeraet)
- Bestehende Tailwind-Klassen und Design-Tokens nutzen

</specifics>

<deferred>
## Deferred Ideas

None

</deferred>
