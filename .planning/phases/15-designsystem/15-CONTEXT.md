# Phase 15: Designsystem - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Ein einheitliches visuelles Fundament fuer alle nachfolgenden View-Redesigns. Die bestehenden CSS-Variablen und Utility-Klassen werden modernisiert und erweitert. Cards bekommen mehr Tiefe und Ausdruck. Dark Mode Kontraste werden verbessert. Spacing-Variablen werden ergaenzt.

</domain>

<decisions>
## Implementation Decisions

### Farbpalette
- Bestehende primary/secondary CSS-Variablen beibehalten (25-950 Skala)
- Kontraste im Dark Mode verbessern
- Keine neue Farbwelt — bestehende Palette beibehalten

### Card-Design
- Cards modernisieren: shadow-md bis shadow-lg statt shadow-sm fuer deutlichere Abgrenzung
- Groessere Rundungen erwaegen (rounded-xl statt rounded-lg) fuer modernen Look
- Mehr Tiefe und Ausdruck — der User moechte dass die Cards "mehr hergeben"
- Bestehende card-container Klassen als Basis erweitern, nicht ersetzen
- Hover-Effekte und Transitions beibehalten/verstaerken

### Typografie
- Inter-Font beibehalten
- Bestehende text-label/text-value/text-muted Klassen beibehalten

### Dark Mode
- Bestehende dark:-Varianten-Strategie beibehalten
- Kontraste pruefen und verbessern wo noetig
- bg-gray-900 als Basis-Hintergrund beibehalten

### Claude's Discretion
- Spacing-Variablen (gap, padding) nach eigenem Ermessen ergaenzen
- Transition-Staerken und -Dauern nach Ermessen anpassen
- Entscheidung ob Spacing als CSS-Variablen oder Tailwind extend

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `index.css`: 430+ Zeilen mit @layer components Definitionen
- `tailwind.config.js`: primary/secondary Farbskalen via CSS-Variablen
- Card-Klassen: `card-container`, `card-container-flush`, `card-container-highlight`
- Mobile-Klassen: `mobile-card`, `mobile-card-header`, etc.
- Formulare: `form-input`, `form-select`, `form-label`, `form-group`
- Buttons: `btn-primary`, `btn-secondary`
- Tabellen: `table-container`, `table-header`, `table-cell`, `table-row`
- Status: `status-badge-primary`, `status-badge-secondary`

### Established Patterns
- Alle Farben via CSS Custom Properties (`--primary-500` etc.)
- Tailwind config mappt auf `var(--primary-500)`
- `dark:` Varianten fuer jeden visuellen Zustand
- `transition-colors duration-200` als Standard-Transition
- `@apply` Direktiven in `@layer components` Blocks

### Integration Points
- `index.css` ist die zentrale Design-Token-Datei
- `tailwind.config.js` definiert die Tailwind-Farbpalette
- Alle Komponenten nutzen die utility-Klassen und card-container
- Dark Mode via `class` auf html/body Element

</code_context>

<specifics>
## Specific Ideas

- User will "modernere Cards mit shadows, mehr Ausdruck"
- Bestehende card-container Klassen sollen aufgewertet werden
- Jede Sektion in jeder View soll in eine Card eingebettet sein

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
