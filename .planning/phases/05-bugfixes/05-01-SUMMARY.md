---
phase: 05-bugfixes
plan: 01
subsystem: api, ui
tags: [mysql, react, axios, bugfix]

requires: []
provides:
  - "Mitfahrer-Erstattung per DB-Lookup statt hardcoded 0.05"
  - "Rueckfahrt-Matching mit Orts-Namen-Fallback"
  - "Race-Condition-freier Axios 401-Interceptor"
affects: []

tech-stack:
  added: []
  patterns:
    - "getMitfahrerSatz Helper analog zu getErstattungssatz"
    - "useRef-basierter Guard gegen parallele Side-Effects"

key-files:
  created: []
  modified:
    - "backend/controllers/fahrtController.js"
    - "frontend/src/App.js"

key-decisions:
  - "Separate DB-Query fuer Mitfahrer-Saetze statt bestehende UNION-Query erweitern"
  - "useRef statt useState fuer isLoggingOut da kein Re-Render noetig"

patterns-established:
  - "getMitfahrerSatz: Datum-basierter Lookup analog zu getErstattungssatz"
  - "isLoggingOut useRef Guard fuer einmalige Side-Effects bei parallelen Error-Responses"

requirements-completed: [BUG-01, BUG-02, BUG-03]

duration: 2min
completed: 2026-03-22
---

# Phase 05 Plan 01: Bugfixes Summary

**Mitfahrer-Erstattung aus DB statt hardcoded, Rueckfahrt-Matching mit Orts-Namen-Fallback, Axios 401 Race Condition Guard**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-22T10:00:10Z
- **Completed:** 2026-03-22T10:02:01Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Mitfahrer-Erstattungssatz wird per DB-Lookup aus mitfahrer_erstattung Tabelle geholt, nicht mehr hardcoded 0.05
- Rueckfahrt-Matching hat Orts-Namen-Fallback wenn ID-Matching fehlschlaegt
- Axios-Interceptor nutzt isLoggingOut useRef gegen parallele 401-Logouts
- Alle DEBUGGING console.log Statements aus findErgaenzendeFahrt entfernt

## Task Commits

Each task was committed atomically:

1. **Task 1: BUG-01 -- Hardcoded Mitfahrer-Erstattungssatz durch DB-Lookup ersetzen** - `3cf7495` (fix)
2. **Task 2: BUG-02 + BUG-03 -- Rueckfahrt-Matching und Axios Race Condition** - `c9adeb1` (fix)

## Files Created/Modified
- `backend/controllers/fahrtController.js` - getMitfahrerSatz Helper, hardcoded 0.05 ersetzt, TODO entfernt
- `frontend/src/App.js` - Orts-Namen-Fallback in findErgaenzendeFahrt, isLoggingOut Guard, DEBUGGING-Logs entfernt

## Decisions Made
- Separate DB-Query fuer Mitfahrer-Saetze gewaehlt statt die komplexe UNION-Query zu erweitern, da getMonthlySummary bereits gruppierte Daten liefert und der Mitfahrer-Satz pro Einzeldatum gebraucht wird
- useRef statt useState fuer isLoggingOut, da kein Re-Render ausgeloest werden soll

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Alle drei bekannten Bugs behoben
- Bereit fuer Phase 06 (Security) oder Phase 07 (Cleanup)

---
*Phase: 05-bugfixes*
*Completed: 2026-03-22*
