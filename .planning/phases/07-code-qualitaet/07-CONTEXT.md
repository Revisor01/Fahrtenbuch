# Phase 7: Code-Qualität - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Input-Validierung mit Zod für alle Backend-Controller, Debug-Logs entfernen, Dependabot-Alerts fixen.

</domain>

<decisions>
## Implementation Decisions

### Input-Validierung (QUAL-01)
- Zod als Validierungs-Library (leichtgewichtig, TypeScript-kompatibel, kein Overhead)
- Validierungs-Middleware die Zod-Schemas vor Controller-Logik prüft
- Alle Endpoints: Fahrten, Orte, User, Abrechnungsträger, Distanzen, Auth
- Bei Validierungsfehler: 400 mit konkreter Fehlerbeschreibung (welches Feld, was erwartet)

### Debug-Logs (QUAL-02)
- Alle console.log Statements entfernen die keine Error-Logs sind
- console.error für echte Fehler behalten
- DEBUGGING-Prefix Logs sind in Phase 5 bereits entfernt worden — restliche console.log prüfen

### Dependency-Updates (QUAL-03)
- npm audit fix für bekannte Vulnerabilities
- Veraltete Packages aktualisieren
- CRA → Vite Migration ist OUT OF SCOPE für diesen Milestone (zu groß)

### Claude's Discretion
- Zod-Schema-Design (strikt vs. passthrough für unbekannte Felder)
- Welche console.log behalten (nur console.error für echte Fehler)
- npm audit --fix Strategie (nur non-breaking, oder auch major)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — standard code quality improvements.

</specifics>

<canonical_refs>
## Canonical References

- `backend/controllers/` — alle Controller-Dateien brauchen Zod-Schemas
- `backend/routes/` — Validierungs-Middleware hier einbauen
- `backend/package.json` — Dependencies
- `frontend/package.json` — Dependencies

</canonical_refs>

<code_context>
## Existing Code Insights

### Integration Points
- Controller haben bereits try/catch — Zod-Validierung kommt davor als Middleware
- 30 offene Dependabot-Alerts (20 high, 6 medium, 4 low)
- Hauptursache: react-scripts zieht viele transitive Dependencies

</code_context>

<deferred>
## Deferred Ideas

- CRA → Vite Migration — zu groß für diesen Milestone, eigene Phase in v1.2

</deferred>

---

*Phase: 07-code-qualitaet*
*Context gathered: 2026-03-22*
