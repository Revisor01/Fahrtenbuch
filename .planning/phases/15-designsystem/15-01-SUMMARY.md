---
phase: 15-designsystem
plan: 01
subsystem: ui
tags: [css, tailwind, design-tokens, dark-mode, themes]

requires: []
provides:
  - "CSS custom properties fuer Card-Hintergruende, Borders und Surfaces"
  - "Tailwind spacing/borderRadius/boxShadow/backgroundColor Extensions"
  - "Modernisierte Card-Klassen mit Design-Token-Variablen"
  - "Dark-Mode-Overrides fuer alle 9 Themes"
  - "card-interactive Utility-Klasse"
affects: [15-02, dashboard, fahrten, settings, monatsansicht]

tech-stack:
  added: []
  patterns: ["CSS custom properties als Design-Tokens", "Tailwind extend fuer semantische Card-Werte"]

key-files:
  created: []
  modified:
    - frontend/src/themes.css
    - frontend/tailwind.config.js
    - frontend/src/index.css

key-decisions:
  - "Dark-Mode-Overrides als globaler html.dark Block statt pro Theme"
  - "bg-card/border-card als CSS-Variablen via Tailwind backgroundColor/borderColor extend"

patterns-established:
  - "Card-Klassen nutzen semantische Tokens (bg-card, shadow-card, rounded-card) statt hardcodierter Werte"
  - "Themes definieren Light-Mode-Variablen, html.dark ueberschreibt fuer alle"

requirements-completed: [DS-01, DS-03]

duration: 3min
completed: 2026-03-28
---

# Phase 15 Plan 01: Designsystem Tokens und Card-Modernisierung Summary

**CSS Design-Tokens (bg-card, shadow-card, border-card) in 9 Themes + Tailwind Config, modernisierte Card/Button/Input-Klassen mit verbessertem Dark-Mode-Kontrast**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T20:35:37Z
- **Completed:** 2026-03-28T20:38:15Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- 4 neue CSS-Variablen (--bg-surface, --bg-card, --bg-card-highlight, --border-card) in allen 9 Theme-Bloecken
- Globaler html.dark Block fuer Dark-Mode-Overrides aller Card-Variablen
- Tailwind Config erweitert um spacing, borderRadius, boxShadow, backgroundColor, borderColor
- base-container, mobile-card, card-container-highlight nutzen Design-Tokens statt hardcodierter Werte
- Dark-Mode text-label Kontrast verbessert (primary-300 statt primary-100)
- Buttons und Inputs auf rounded-lg modernisiert
- Neue card-interactive Klasse mit hover-shadow und scale-Effekt

## Task Commits

Each task was committed atomically:

1. **Task 1: Design-Tokens erweitern und Tailwind-Config modernisieren** - `4e4fe5e` (feat)
2. **Task 2: Card-Klassen und Dark-Mode-Kontraste in index.css modernisieren** - `6bde9fc` (feat)

## Files Created/Modified
- `frontend/src/themes.css` - 4 neue CSS-Variablen pro Theme + html.dark Block
- `frontend/tailwind.config.js` - spacing, borderRadius, boxShadow, backgroundColor, borderColor Erweiterungen
- `frontend/src/index.css` - Card-Klassen auf Design-Tokens umgestellt, Kontraste verbessert, card-interactive

## Decisions Made
- Dark-Mode-Overrides als einzelner html.dark Block statt pro-Theme dark-Varianten -- einfacher wartbar
- bg-card/border-card ueber Tailwind backgroundColor/borderColor extend eingebunden -- ermoeglicht @apply Nutzung

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - alle Design-Tokens sind vollstaendig verdrahtet.

## Next Phase Readiness
- Design-Token-Fundament steht fuer alle nachfolgenden View-Redesigns
- Phase 15-02 kann auf bg-card, shadow-card, rounded-card, card-interactive aufbauen
- Alle 9 Themes haben konsistente Card-Variablen fuer Light und Dark Mode

---
*Phase: 15-designsystem*
*Completed: 2026-03-28*
