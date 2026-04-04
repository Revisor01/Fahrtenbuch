---
phase: 22-globale-patterns
plan: 01
subsystem: frontend-css
tags: [css, design-system, buttons, kpi-cards, section-headers]
dependency_graph:
  requires: []
  provides: [btn-destructive, kpi-card, kpi-card-emerald, kpi-card-blue, kpi-card-purple, kpi-card-primary, section-header]
  affects: [all views using btn-primary, btn-secondary]
tech_stack:
  added: []
  patterns: [kpi-card CSS pattern, section-header CSS pattern]
key_files:
  created: []
  modified:
    - frontend/src/index.css
decisions:
  - "btn-destructive als neue Klasse angelegt (red-500/600) — war im Design-System geplant aber noch nicht implementiert"
  - "rounded statt rounded-card wurde ebenfalls auf rounded-card vereinheitlicht fuer alle btn-* Klassen"
metrics:
  duration: 98s
  completed: 2026-04-04
  tasks_completed: 2
  tasks_total: 2
  files_modified: 1
---

# Phase 22 Plan 01: CSS-Fundament Summary

Button-Hoehen auf h-10 vereinheitlicht, btn-destructive als neue Klasse angelegt, KPI-Card-Pattern mit 4 Farbvarianten und Section-Header-Pattern als wiederverwendbare CSS-Klassen definiert.

## What Was Done

### Task 1: Button-Hoehen vereinheitlichen (GP-01)
- btn-primary: h-8 auf h-10 geaendert, rounded auf rounded-card
- btn-secondary: h-8 auf h-10 geaendert, rounded auf rounded-card
- btn-destructive: neue Klasse mit h-10, rounded-card, red-500/600 Farbschema
- **Commit:** a83feb4

### Task 2: KPI-Card und Section-Header CSS-Klassen (GP-03, GP-04)
- .kpi-card Basis-Klasse: rounded-card, p-4, shadow-card, border border-card
- .kpi-card-emerald: bg-emerald-50 / dark:bg-emerald-900/20
- .kpi-card-blue: bg-blue-50 / dark:bg-blue-900/20
- .kpi-card-purple: bg-purple-50 / dark:bg-purple-900/20
- .kpi-card-primary: bg-primary-50 / dark:bg-primary-900/30
- .section-header: flex items-center gap-2 mb-3
- .section-header h2: text-base font-medium text-value
- .section-header .section-count: text-sm text-muted
- **Commit:** c42dddb

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] btn-destructive Klasse fehlte komplett**
- **Found during:** Task 1
- **Issue:** Plan referenziert btn-destructive, aber die Klasse existierte nicht in index.css
- **Fix:** Neue btn-destructive Klasse mit red-500/600 Schema erstellt
- **Files modified:** frontend/src/index.css

**2. [Rule 1 - Bug] rounded statt rounded-card bei Button-Klassen**
- **Found during:** Task 1
- **Issue:** btn-primary und btn-secondary nutzten `rounded` statt des Design-System-Tokens `rounded-card`
- **Fix:** Alle btn-* Klassen auf rounded-card vereinheitlicht
- **Files modified:** frontend/src/index.css

## Known Stubs

None - alle CSS-Klassen sind vollstaendig definiert und einsatzbereit.

## Verification Results

- All btn-* classes use h-10: PASS
- .kpi-card base + 4 variants exist: PASS
- .section-header with flex items-center gap-2 mb-3: PASS

## Self-Check: PASSED

- frontend/src/index.css: FOUND
- 22-01-SUMMARY.md: FOUND
- Commit a83feb4: FOUND
- Commit c42dddb: FOUND
