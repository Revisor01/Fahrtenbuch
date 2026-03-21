# Phase 1: Datenmodell & Logik - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Kostenstelle als optionales Freitextfeld am Abrechnungsträger hinzufügen (DB, API, UI). Distanzänderungen sollen automatisch alle bestehenden Fahrten mit dieser Strecke rückwirkend aktualisieren. Keine neuen Features — nur Datenmodell-Erweiterung und Logik-Integration.

</domain>

<decisions>
## Implementation Decisions

### Kostenstelle-Feld
- **D-01:** Freitextfeld, optional (kann leer bleiben)
- **D-02:** Keine Validierung — Nutzer wissen was sie eintragen
- **D-03:** DB-Typ: VARCHAR ohne strikte Längenbeschränkung (VARCHAR(255) reicht)

### Kostenstelle-Anzeige
- **D-04:** In der Abrechnungsträger-Übersicht neben dem Namen anzeigen: "Rentamt — Kst.: 760130"
- **D-05:** Wenn Kostenstelle leer: nur den Namen anzeigen (kein "Kst.:"-Prefix)
- **D-06:** Responsive: auf Mobile darf die Zeile umbrechen

### Distanz-Update-Verhalten
- **D-07:** Stille Aktualisierung — kein Bestätigungsdialog, kein Feedback-Toast
- **D-08:** Bidirektional — Update erfasst beide Richtungen (A→B und B→A)
- **D-09:** Atomar in einer Transaktion (keine Teilupdates bei Fehler)

### Claude's Discretion
- Kostenstelle-Feld-Platzierung im Bearbeitungsdialog (unter oder neben dem Namen-Feld)
- Migration-Nummer und exakter SQL-Typ
- Error-Handling bei fehlgeschlagenem Distanz-Update

</decisions>

<specifics>
## Specific Ideas

- Joergs konkretes Beispiel: Distanz Tellingstedt-Albersdorf wurde falsch hinterlegt, nach Korrektur musste er alle Fahrten manuell updaten
- Jasmin Reuschs Abrechnungsformular zeigt "Kostenträger: Rentamt - Kst.: 760130" — das ist das Zielformat für Phase 2 (Excel-Export)

</specifics>

<canonical_refs>
## Canonical References

No external specs — requirements are fully captured in decisions above and in the Referenz-PDF (`Dienstfahrtenabrechnung - Excel - Alt.pdf` im Projekt-Root).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Fahrt.updateFahrtenByDistanz(vonOrtId, nachOrtId, distanz)` existiert bereits in `backend/models/Fahrt.js:118-126` — UPDATE-Query für beide Richtungen vorhanden, wird nur nicht aufgerufen
- `Distanz.update()` in `backend/models/Distanz.js:48` — existierende Update-Methode
- `AbrechnungstraegerForm.js` — bestehendes Formular mit Name-Feld, muss nur um Kostenstelle erweitert werden

### Established Patterns
- Model-Klassen mit statischen Methoden für CRUD (z.B. `AbrechnungsTraeger.findAllForUser()`)
- Controller validiert, ruft Model auf, gibt JSON zurück
- Frontend: Axios-Calls in `App.js`, Formulare als separate Komponenten
- DB-Transaktionen: `connection.beginTransaction()` / `commit()` / `rollback()` Pattern in Models

### Integration Points
- `backend/controllers/distanzController.js:75` (updateDistanz) — hier muss `Fahrt.updateFahrtenByDistanz()` nach dem Distanz-Update aufgerufen werden
- `backend/models/AbrechnungsTraeger.js` — alle Queries müssen um `kostenstelle` erweitert werden
- `backend/controllers/abrechnungstraegerController.js` — create/update müssen `kostenstelle` akzeptieren
- `frontend/src/components/AbrechnungstraegerForm.js` — Formular um Kostenstelle-Input erweitern
- `backend/migrations/` — nächste Migration ist `0006_*.sql`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-datenmodell-logik*
*Context gathered: 2026-03-21*
