# Phase 23: FahrtenListe Polish - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Die FahrtenListe wird visuell auf Dashboard-Niveau gebracht — mit Section-Headers (Icon + Titel), strukturiertem Card-Layout und aufgewertetem Export-Bereich.

</domain>

<decisions>
## Implementation Decisions

### Section-Header Icons
- Abrechnungs-Bereich (Cards Grid): CreditCard Icon
- Export-Bereich: FileDown Icon
- Zeitraum-Filter: CalendarRange Icon
- Fahrten-Liste: bereits auf .section-header umgestellt (Clock Icon, Phase 22)

### Export-Bereich Aufwertung
- Export-Bereich als card-container mit Section-Header (.section-header + FileDown Icon)
- Export-Buttons mit Icons: FileSpreadsheet für Excel, FileText für PDF
- "Beide als ZIP" Button als btn-secondary (differenziert von Einzel-Export btn-primary)

### CSS-Patterns (aus Phase 22)
- Alle Section-Headers nutzen .section-header CSS-Klasse
- h2-Level, mb-3, Icons 18px — wie in Phase 22 definiert

### Claude's Discretion
- Genaue Positionierung der Section-Headers innerhalb der bestehenden Komponenten-Struktur
- Ob Von/Bis-Dropdowns in eine eigene Card kommen oder Teil des Headers bleiben

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- .section-header CSS-Klasse (Phase 22)
- .section-count für optionale Zähler
- card-container Klasse für Sektions-Cards
- Lucide Icons bereits importiert (Clock ist schon in FahrtenListe)

### Established Patterns
- Dashboard nutzt section-header mit Icon + h2 (4 Instanzen)
- Export-Buttons in FahrtenListe.js Zeile 571-594 — dynamisch aus Kategorien generiert
- Cards Grid (Zeile 476-546) für Abrechnungs-Status

### Integration Points
- FahrtenListe.js (818 Zeilen): Hauptdatei
- Section-Boundaries: Header (386), Von/Bis (406-469), Cards Grid (476-546), Gesamt (548-569), Export (571-594), Fahrtenliste (692-797)
- Lucide Imports erweitern: CreditCard, FileDown, CalendarRange, FileSpreadsheet, FileText hinzufügen

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches using Phase 22 patterns

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
