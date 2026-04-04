# Phase 22: Globale Patterns - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Die App bekommt bereinigte, wiederverwendbare CSS-Patterns — alle Buttons gleich hoch, Card-Backgrounds aus Design-Tokens, KPI-Card und Section-Header als zentrale Bausteine. Rein CSS-basiert, keine neuen React-Komponenten.

</domain>

<decisions>
## Implementation Decisions

### Button-Vereinheitlichung
- Alle btn-* Klassen (btn-primary, btn-secondary, btn-destructive) auf h-10 (40px) vereinheitlichen
- Alle Inline-Overrides (h-8, h-10 in Komponenten) entfernen — CSS-Klasse ist Single Source of Truth
- btn-destructive ebenfalls h-10 für visuelle Konsistenz

### KPI-Card-Pattern
- CSS-Klasse .kpi-card statt React-Komponente — leichtgewichtig, passt zum bestehenden Pattern
- Farbvarianten per CSS-Klassen (.kpi-card-emerald, .kpi-card-blue, .kpi-card-purple etc.)
- Dynamische Abrechnungsträger-Farben in MonthlyOverview behalten, aber Opacity-Hack (hex + "14") durch saubere CSS-Lösung ersetzen
- Icon-Position: rechts (wie aktuell Dashboard)

### Section-Header-Pattern
- CSS-Klasse .section-header statt React-Komponente
- Einheitliche Icon-Größe: 18px
- Heading-Level: h2 (Dashboard-Standard)
- Margin: mb-3 unter dem Header

### Claude's Discretion
- Exakte CSS Custom Properties für KPI-Card-Farbvarianten
- Wie der Opacity-Hack in MonthlyOverview technisch ersetzt wird (CSS opacity, rgba, oder color-mix)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- themes.css: Umfangreiches Design-Token-System mit Primary/Secondary-Paletten (25-950)
- index.css: Bestehende Component-Klassen (card-container, status-badge-*, form-input)
- tailwind.config.js: Erweitert mit CSS Custom Properties

### Established Patterns
- CSS-Klassen in index.css für wiederverwendbare Patterns (nicht React-Komponenten)
- Design-Tokens via CSS Custom Properties (--bg-card, --shadow-card, --border-card)
- Status-Badges als CSS-Klassen mit Farbvarianten (.status-badge-primary, -info, -warning)

### Problembereiche
- btn-primary: h-8 (32px), btn-secondary: h-10 (40px) — inkonsistent
- Dashboard KPI-Cards: hardcoded bg-emerald-50, bg-blue-50, bg-purple-50
- MonthlyOverview: Inline-Style mit Hex-Opacity-Hack für Träger-Farben
- Section-Headers: Ad-hoc in jeder Komponente, Icon-Größen 18/20/22px, mb-3/mb-4 gemischt

### Integration Points
- index.css (Zeile 271-299): Button-Klassen
- Dashboard.js (Zeile 206-254): KPI-Cards, (Zeile 259-410): Section-Headers
- MonthlyOverview.js (Zeile 430-446): KPI-Cards, (Zeile 485-489): Section-Headers
- FahrtenListe.js: Section-Headers
- LoginPage.js (Zeile 168): Button-Override h-10

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
