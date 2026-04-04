---
plan: 22-02
phase: 22-globale-patterns
status: complete
started: 2026-04-04T14:30:00Z
completed: 2026-04-04T14:45:00Z
---

# Plan 22-02: Komponenten auf CSS-Patterns umstellen

## What was built

Alle 4 Komponenten (Dashboard, MonthlyOverview, FahrtenListe, LoginPage) auf die zentralen CSS-Patterns aus Plan 22-01 umgestellt.

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | Dashboard KPI-Cards + Section-Headers | ✓ Complete |
| 2 | MonthlyOverview, FahrtenListe, LoginPage | ✓ Complete |

## Key Changes

- **Dashboard.js**: 4 KPI-Cards nutzen .kpi-card + Farbvarianten, 4 Section-Headers nutzen .section-header, font-semibold → font-medium
- **MonthlyOverview.js**: Hex-Opacity-Hack (`hexColor + "14"`) durch rgba()-Berechnung ersetzt, `rounded-card p-4...` → `kpi-card`
- **FahrtenListe.js**: Section-Header auf .section-header + .section-count umgestellt
- **LoginPage.js**: Redundanten h-10 Override entfernt (h-10 ist jetzt in btn-primary)
- **index.css**: kpi-card-primary dark-mode Fix mit color-mix() statt @apply (CSS-Variable Opacity-Kompatibilität)

## Deviations

- index.css: `dark:bg-primary-900/30` funktioniert nicht mit @apply für CSS-Variable-basierte Farben → gelöst mit `:is(.dark .kpi-card-primary)` und `color-mix(in srgb, ...)` 
- MonthlyOverview Section-Headers (Monats-Überschriften) bewusst NICHT auf .section-header umgestellt — sind semantisch Card-interne Überschriften, kein Section-Pattern

## Self-Check

- [x] 0 hardcoded bg-emerald-50/bg-blue-50/bg-purple-50 in Dashboard.js
- [x] 4 kpi-card Klassen in Dashboard.js
- [x] 4 section-header Nutzungen in Dashboard.js
- [x] 0 Hex-Hack ("14") in MonthlyOverview.js
- [x] 1 rgba() in MonthlyOverview.js
- [x] 1 section-header in FahrtenListe.js
- [x] 0 btn-primary h-10 Override in LoginPage.js
- [x] Frontend Build erfolgreich (compiled with warnings — pre-existing)

## Self-Check: PASSED

## key-files

### created
(none)

### modified
- frontend/src/components/Dashboard.js
- frontend/src/components/MonthlyOverview.js
- frontend/src/components/FahrtenListe.js
- frontend/src/components/LoginPage.js
- frontend/src/index.css
