# Phase 18: Einstellungen, Login & Polish - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning
**Mode:** Auto-generated (smart discuss)

<domain>
## Phase Boundary

Einstellungen-Sub-Tabs mit Card-Layout aufwerten, Login/Landing-Seite modernisieren, sanfte CSS-Transitions bei Tab-Wechsel und Card-Interaktionen. Letzter Feinschliff fuer v2.0.

</domain>

<decisions>
## Implementation Decisions

### Einstellungen
- Sub-Tab-Navigation visuell aufwerten (aktiver Tab deutlicher hervorgehoben)
- Alle Formulare in Cards einbetten mit einheitlichem Design
- Phase-15 Design-Tokens nutzen (card-container, shadow-card, rounded-card)

### Login & Landing
- Login-Seite modern und einladend gestalten
- Landing-Page responsive und visuell attraktiv
- Bestehende LandingPage.js und LoginPage.js modernisieren

### Transitions & Animationen
- Sanfte CSS-Transitions bei Tab-Wechsel (opacity/transform)
- Card-Hover-Effekte verstaerken
- Keine JavaScript-Animationen — rein CSS

### Claude's Discretion
- Konkretes Login-Design nach Ermessen
- Landing-Page Layout und Inhalte
- Transition-Timing und -Art

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Settings.js: 660+ Zeilen mit 8 Sub-Tabs, card-container-highlight genutzt
- LoginPage.js: In frontend/src/components/
- LandingPage.js: In frontend/src/
- index.css: card-interactive Klasse mit hover-Effekten vorhanden
- transition-colors duration-200 als Standard-Pattern

### Integration Points
- Settings.js: Sub-Tab-Buttons und Formular-Sektionen aufwerten
- LoginPage.js: Komplett-Redesign des Layouts
- LandingPage.js: Visuell aufwerten

</code_context>

<specifics>
## Specific Ideas

None — standard design polish

</specifics>

<deferred>
## Deferred Ideas

None

</deferred>
