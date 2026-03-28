# Phase 10: Favoriten & Quick-Copy - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Favoriten-System für wiederkehrende Fahrten + "Nochmal für heute" bei letzten Fahrten. Backend: neue DB-Tabelle + CRUD-API. Frontend: Favoriten-Verwaltung + Schnelleingabe-Buttons. Wird in Phase 11 ins Dashboard integriert — hier nur die Datenschicht und grundlegende UI.

</domain>

<decisions>
## Implementation Decisions

### Datenmodell
- **D-01:** Neue Tabelle `favoriten_fahrten` mit: id, user_id, von_ort_id, nach_ort_id, anlass, abrechnungstraeger_id, sort_order
- **D-02:** Favorit speichert Route + Anlass + Träger — NICHT Datum oder Kilometer (werden bei Nutzung berechnet)
- **D-03:** User-scoped wie alle anderen Tabellen (user_id FK)

### API
- **D-04:** CRUD-Endpoints: GET/POST/PUT/DELETE /api/favoriten
- **D-05:** POST /api/favoriten/:id/execute — erstellt neue Fahrt mit heutigem Datum aus Favorit
- **D-06:** Zod-Validierung wie bei allen anderen Endpoints (Schema in backend/schemas/)

### Quick-Copy ("Nochmal für heute")
- **D-07:** Letzte 3 Fahrten des Nutzers anzeigen (aus bestehender Fahrten-API, kein neuer Endpoint)
- **D-08:** "Nochmal"-Button kopiert Von, Nach, Anlass, Träger und erstellt neue Fahrt mit heutigem Datum
- **D-09:** Kilometer werden automatisch berechnet (wie bei normaler Fahrteingabe)

### Frontend (grundlegend)
- **D-10:** Favoriten-Verwaltung im Einstellungen-Profil-Modal (neuer Tab "Favoriten")
- **D-11:** Schnelleingabe-Buttons werden erst in Phase 11 (Dashboard) prominent platziert
- **D-12:** Favoriten im AppContext verfügbar machen (fetchFavoriten, addFavorit, deleteFavorit, executeFavorit)

### Claude's Discretion
- Migration-Nummer und SQL-Details
- Ob Favorit aus bestehender Fahrt erstellt werden kann ("Als Favorit speichern"-Button)
- UI-Design des Favoriten-Tabs im Profil-Modal

</decisions>

<canonical_refs>
## Canonical References

- `backend/models/` — Bestehende Model-Klassen als Pattern
- `backend/routes/` — Bestehende Route-Definitionen
- `backend/schemas/` — Zod-Schemas aus Phase 7
- `frontend/src/contexts/AppContext.js` — State-Management
- `frontend/src/ProfileModal.js` — Bestehende Tabs
- `backend/migrations/` — Letzte Migration ist 0006

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Fahrt.create() — kann von executeFavorit aufgerufen werden
- getDistance() — automatische Kilometer-Berechnung
- AbrechnungsTraeger-Pattern — gleiches CRUD-Muster für Favoriten

### Integration Points
- AppContext: fetchFavoriten in refreshAllData einbauen
- ProfileModal: neuen Tab hinzufügen
- FahrtForm: optional "Als Favorit speichern"-Checkbox

</code_context>

<deferred>
## Deferred Ideas

- "Als Favorit speichern"-Button direkt an Fahrten in der Liste — Nice-to-have, nicht in v1.3 Scope

</deferred>

---

*Phase: 10-favoriten-quick-copy*
*Context gathered: 2026-03-22*
