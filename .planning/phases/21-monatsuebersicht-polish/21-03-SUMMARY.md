---
phase: 21-monatsuebersicht-polish
plan: 03
subsystem: frontend
tags: [css, status-badges, buttons, ux]
dependency_graph:
  requires: [21-01]
  provides: [status-badge-styling, btn-secondary-upgrade]
  affects: [MonthlyOverview, AbrechnungsStatusModal]
tech_stack:
  added: []
  patterns: [semantic-color-coding, button-like-badges]
key_files:
  created: []
  modified:
    - frontend/src/index.css
    - frontend/src/components/MonthlyOverview.js
decisions:
  - "Emerald/Blue/Amber Farbschema fuer Status-Badges (Erfolg/Info/Warnung)"
  - "btn-secondary von bg-secondary zu bg-white mit Border umgestaltet"
metrics:
  duration: "89s"
  completed: "2026-04-03"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 21 Plan 03: Status-Buttons & Abbrechen-Button Styling Summary

Status-Badges in Monatsuebersicht zu echten Buttons mit Border, Hover-State und semantischer Farbcodierung (Erfolg=gruen, Info=blau, Warnung=amber) umgestaltet; btn-secondary als vollwertiger Button mit Border und bg-white.

## Tasks Completed

### Task 1: Status-Badge CSS zu echten Buttons umgestalten
- **Commit:** f14dbc3
- **Files:** frontend/src/index.css
- **Changes:**
  - Base .status-badge: px-3 py-1.5, rounded-card, border, transition-all
  - status-badge-primary: emerald (gruen) fuer "Erhalten"
  - status-badge-info: blue (blau) fuer "Eingereicht" (neu)
  - status-badge-warning: amber (gelb) fuer "Nicht eingereicht" (neu)
  - status-badge-secondary: gray (neutral) fuer "Keine Abrechnung"
  - btn-secondary: bg-white, border border-primary-200, h-10, font-medium

### Task 2: renderStatusCell auf neue Badge-Klassen umgestellt
- **Commit:** a2b7b72
- **Files:** frontend/src/components/MonthlyOverview.js
- **Changes:**
  - "Eingereicht am" verwendet jetzt status-badge-info (blau)
  - "Nicht eingereicht" verwendet jetzt status-badge-warning (amber)
  - Alle klickbaren Badges mit min-h-[44px] fuer Touch-Target

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED
