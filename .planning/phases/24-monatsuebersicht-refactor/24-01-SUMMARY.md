---
plan: 24-01
phase: 24-monatsuebersicht-refactor
status: complete
---

# Plan 24-01: Tab-Umbenennung zu Abrechnungen

## What was built
Tab "Monatsübersicht" → "Abrechnungen" in Navigation und alle Referenzen.

## Tasks
| # | Task | Status |
|---|------|--------|
| 1 | Tab-Umbenennung | ✓ Complete |

## Key Changes
- AppContent.js: id 'monatsuebersicht' → 'abrechnungen', label → 'Abrechnungen'
- Dashboard.js: deeplink 'monatsuebersicht' → 'abrechnungen'

## Self-Check: PASSED

## key-files
### modified
- frontend/src/components/AppContent.js
- frontend/src/components/Dashboard.js
