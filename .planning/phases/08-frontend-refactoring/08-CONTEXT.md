# Phase 8: Frontend-Refactoring - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

App.js (3057 Zeilen) in modulare Komponenten aufteilen. Keine Funktionsänderungen — rein strukturelles Refactoring. App muss sich nach dem Refactoring identisch verhalten.

</domain>

<decisions>
## Implementation Decisions

### Komponentenstruktur
- **D-01:** AppProvider (Zeilen 28-536) → `frontend/src/contexts/AppContext.js` — Context, State, Auth, Datenfetching, CRUD
- **D-02:** FahrtenListe (Zeilen 538-2040) → `frontend/src/components/FahrtenListe.js` — bleibt wie sie ist, nur auslagern
- **D-03:** MonthlyOverview (Zeilen 2042-2648) → `frontend/src/components/MonthlyOverview.js` — inkl. QuickActions
- **D-04:** LoginPage (Zeilen 2650-2901) → `frontend/src/components/LoginPage.js` — inkl. ForgotPasswordForm
- **D-05:** AppContent (Zeilen 2925-3055) → `frontend/src/components/AppContent.js` — Layout-Wrapper
- **D-06:** App (Zeilen 2903-2922) bleibt in App.js — nur Root-Router, importiert alles

### Export-Logik
- **D-07:** handleExportToExcel (Zeilen 654-815 in FahrtenListe) → eigener Custom Hook `useExport` oder bleibt in FahrtenListe
- **D-08:** REF-03 erfüllt wenn Export-Logik in einer klar benannten Funktion/Hook lebt, nicht verstreut

### Vorgehen
- **D-09:** Schrittweise extrahieren — erst auslagern, dann imports anpassen, dann alte Zeilen löschen
- **D-10:** Nach jedem Extraktionsschritt: App muss funktionieren (kein Big-Bang-Refactoring)

### Claude's Discretion
- Ob QuickActions aus MonthlyOverview als eigene Datei oder inline bleibt
- Ob renderMitfahrer/renderFahrtRow in FahrtenListe bleiben oder Sub-Komponenten werden
- Import-Pfade und Dateinamen-Konventionen
- Ob useExport als Custom Hook oder als Methode in FahrtenListe

</decisions>

<specifics>
## Specific Ideas

- App.js hat aktuell 3057 Zeilen — Ziel ist dass App.js selbst < 50 Zeilen wird (nur Router + Imports)
- Alle Komponenten nutzen AppContext via useContext — das Pattern bleibt
- Die CSS-Imports (index.css, themes.css, darkMode.css) bleiben in App.js oder index.js

</specifics>

<canonical_refs>
## Canonical References

- `frontend/src/App.js` — Die 3057-Zeilen-Datei die aufgeteilt wird
- `frontend/src/components/` — Bestehende Komponentenstruktur (AbrechnungstraegerForm, DistanzenListe, etc.)
- `frontend/src/ThemeContext.js` — Bestehendes Context-Pattern als Referenz

</canonical_refs>

<code_context>
## Existing Code Insights

### File Structure Map
- Lines 28-536: AppProvider (Context, State, Auth, CRUD) → contexts/AppContext.js
- Lines 538-2040: FahrtenListe (1500 Zeilen) → components/FahrtenListe.js
- Lines 2042-2648: MonthlyOverview (600 Zeilen) → components/MonthlyOverview.js
- Lines 2650-2901: LoginPage + ForgotPasswordForm → components/LoginPage.js
- Lines 2903-2922: App (Root Router) → bleibt in App.js
- Lines 2925-3055: AppContent (Layout) → components/AppContent.js

### Established Patterns
- AppContext exportiert via useContext — Kindkomponenten importieren was sie brauchen
- Komponenten in frontend/src/components/ — flache Struktur, keine tiefen Ordner

### Integration Points
- FahrtenListe wird in AppContent gerendert (Route "/")
- MonthlyOverview wird in AppContent gerendert (Tab/View)
- LoginPage wird in App Router gerendert (unauthenticated)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-frontend-refactoring*
*Context gathered: 2026-03-22*
