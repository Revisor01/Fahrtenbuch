# Phase 5: Bugfixes - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Drei bekannte Bugs fixen: Mitfahrer-Erstattung hardcoded, Rückfahrt-Matching fragil, Axios-Interceptor Race Condition.

</domain>

<decisions>
## Implementation Decisions

### Mitfahrer-Erstattung (BUG-01)
- Hardcoded 0,05 €/km in fahrtController.js ersetzen durch DB-Lookup
- Tabelle `mitfahrer_erstattung_saetze` nach Reisedatum abfragen (wie bei Haupt-Erstattungssätzen)

### Rückfahrt-Matching (BUG-02)
- Case-insensitive Vergleich für "Rückfahrt"/"rückfahrt"
- Fallback auf Orts-Namen-Matching wenn IDs nicht exakt passen

### Axios-Interceptor (BUG-03)
- Flag setzen um mehrfache parallele Token-Refresh/Logout zu verhindern
- Erste 401-Response löst Logout aus, weitere werden ignoriert

### Claude's Discretion
- Alle Implementierungsdetails — reine Bugfixes, keine UX-Entscheidungen nötig

</decisions>

<specifics>
## Specific Ideas

No specific requirements — standard bug fix approaches.

</specifics>

<canonical_refs>
## Canonical References

- `backend/controllers/fahrtController.js` (Zeile 341-342) — hardcoded Mitfahrer-Satz
- `frontend/src/App.js` (Zeilen 713-741) — Rückfahrt-Matching
- `frontend/src/App.js` (Zeilen 117-126) — Axios-Interceptor

</canonical_refs>

<code_context>
## Existing Code Insights

### Integration Points
- `mitfahrer_erstattung_saetze` Tabelle existiert bereits in DB
- Haupt-Erstattungssätze nutzen bereits datumsbasierte DB-Lookups — gleiches Pattern für Mitfahrer

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-bugfixes*
*Context gathered: 2026-03-22*
