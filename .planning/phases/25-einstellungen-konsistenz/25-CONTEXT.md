# Phase 25: Einstellungen Konsistenz - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure-like phase — applying Phase 22 patterns)

<domain>
## Phase Boundary

Alle 8 Einstellungen-Sub-Tabs bekommen Icons in den Form-Sections, identische Card-Struktur und konsistentes Input-Styling.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
Alle Implementierungsentscheidungen liegen im Ermessen des Planers — Phase 25 wendet die etablierten Patterns aus Phase 22 (section-header, card-container) auf die Settings-Komponente an. Die Sub-Tab-Icons (User, MapPin, Route, Building2, Star, Coins, Lock, Key) sind bereits importiert und können für die Section-Headers wiederverwendet werden.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- .section-header CSS-Klasse (Phase 22)
- Sub-Tab Icons bereits importiert (User, MapPin, Route, Building2, Star, Coins, Lock, Key)
- card-container und card-container-highlight Klassen

### Established Patterns
- Section-Headers aktuell: h3 ohne Icons ("text-lg font-medium text-value mb-4")
- Cards: card-container-highlight für Formulare, card-container für Listen
- Form-Inputs: form-label, form-input, form-select

### Integration Points
- Settings.js: Hauptdatei mit allen 8 Sub-Tabs
- 8 Sub-Tabs: profile, orte, distanzen, abrechnungen, favoriten, erstattungssaetze, security, api

</code_context>

<specifics>
## Specific Ideas

No specific requirements — applying Phase 22 patterns consistently

</specifics>

<deferred>
## Deferred Ideas

None

</deferred>
