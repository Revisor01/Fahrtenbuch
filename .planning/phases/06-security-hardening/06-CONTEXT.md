# Phase 6: Security Hardening - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Security-Basics einbauen: helmet für HTTP-Headers, express-rate-limit auf Login, Error-Messages sanitizen, Body-Size-Limit.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
Alle Implementierungsdetails — standard Security-Packages, klar definierte Aufgaben:
- helmet: Standard-Konfiguration, ggf. contentSecurityPolicy anpassen für React-Frontend
- express-rate-limit: 5-10 Versuche pro 15 Minuten auf /api/auth/login
- Error-Messages: try/catch in allen Controllern, generische Messages an Client, Details nur server-side loggen
- Body-Size-Limit: express.json({ limit: '10mb' })

</decisions>

<specifics>
## Specific Ideas

No specific requirements — standard security hardening approaches.

</specifics>

<canonical_refs>
## Canonical References

- `backend/app.js` — Express-App Setup, Middleware-Chain, CORS
- `backend/controllers/fahrtController.js` — Error-Messages die DB-Details leaken
- `backend/routes/auth.js` — Login-Endpoint ohne Rate-Limiting

</canonical_refs>

<code_context>
## Existing Code Insights

### Integration Points
- `app.js` Zeile 22: CORS bereits konfiguriert — helmet und rate-limit daneben einbauen
- Alle Controller haben try/catch, aber geben teilweise `error.message` direkt zurück

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-security-hardening*
*Context gathered: 2026-03-22*
