# Phase 19: Dashboard & Listen Feinschliff - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Letzte UI-Phase des v2.0 Milestones. Inline-Bearbeitung und Löschen direkt auf dem Dashboard, Fahrtenliste von Tabelle zu Card-Layout umbauen, Verwaltung-Tab mit Card-Design wie Einstellungen, Statistik-Animation wiederherstellen, Button-Farbschema vereinheitlichen.

</domain>

<decisions>
## Implementation Decisions

### Inline-Bearbeitung (Dashboard)
- **D-01:** Klick auf Bearbeiten blendet FahrtForm direkt im Dashboard ein, vorausgefüllt mit den Fahrtdaten
- **D-02:** Die Fahrt-Card wird durch das Formular ersetzt (nicht darunter/darüber eingeblendet)
- **D-03:** Löschen funktioniert bereits mit Confirm-Dialog — beibehalten wie ist

### Fahrtenliste Card-Layout
- **D-04:** Tabelle (table-row/table-cell) wird durch Card-Layout ersetzt, identisch zum "Letzte Fahrten"-Design auf dem Dashboard
- **D-05:** Jede Card zeigt Datum, Route, km, Anlass, und Aktions-Buttons (Edit, Delete, Copy)
- **D-06:** Inline-Bearbeitung auch in der Fahrtenliste — gleiche Mechanik wie Dashboard (Card wird zum Formular)

### Verwaltung-Tab Redesign
- **D-07:** Jeder User als eigene Card mit Name, E-Mail, Rolle, Status
- **D-08:** Aktionen (Rolle ändern, Löschen) direkt auf der Card
- **D-09:** Keine Bulk-Aktionen — bei wenigen kirchlichen Mitarbeitenden nicht nötig
- **D-10:** Card-Design konsistent mit Settings Sub-Tabs

### Polish-Issues
- **D-11:** Statistik-Bug ist bereits gefixt (falscher API-Aufruf). Nur die Chart-Animation soll wiederhergestellt werden
- **D-12:** Button-Farbschema vereinheitlichen: Primär-Aktionen dunkelblau, Sekundär hellblau, Destruktiv rot

### Claude's Discretion
- Konkrete Card-Anordnung und Spacing
- Ob Filter/Sort in der Fahrtenliste als eigene Card oder im Header-Bereich
- Details der Chart-Animation (Dauer, Easing)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above. Refer to prior phase implementations:

### Design System
- `frontend/src/index.css` — Design-Tokens (card-container, shadow-card, rounded-card, border-card, btn-primary, btn-secondary)

### Bestehende Komponenten
- `frontend/src/components/Dashboard.js` — Aktuelles Dashboard mit "Letzte Fahrten" Cards als Referenz-Layout
- `frontend/src/components/FahrtenListe.js` — Aktuelle Tabellen-Darstellung, umzubauen zu Cards
- `frontend/src/components/UserManagement.js` — Verwaltung-Tab, umzubauen zu Card-Layout
- `frontend/src/FahrtForm.js` — Formular-Komponente für Inline-Bearbeitung
- `frontend/src/components/Settings.js` — Referenz für Card-Design im Verwaltung-Tab

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- FahrtForm.js: Eigenständige Formular-Komponente, muss für Edit-Modus vorausfüllbar gemacht werden
- Dashboard.js letzteTrips: Bestehende Card-Darstellung als Template für Fahrtenliste
- Design-Tokens: card-container, shadow-card, rounded-card, border-card aus Phase 15
- Settings.js: Card-Layout mit Sub-Tabs als Referenz für Verwaltung-Redesign
- deleteFahrt: Bereits in AppContext vorhanden und auf Dashboard genutzt

### Established Patterns
- Dashboard.js Zeile 335: Bearbeiten-Button navigiert aktuell nur mit onNavigate('fahrten') — muss durch Inline-Edit ersetzt werden
- FahrtenListe.js nutzt bereits card-container Klassen für Sektionen, aber Einzelfahrten sind table-row/table-cell
- Dashboard.js Zeile 154: handleDeleteFahrt mit showNotification Confirm-Dialog — bewährt

### Integration Points
- FahrtForm.js: Edit-Modus hinzufügen (Props für vorausgefüllte Daten, onUpdate Callback)
- Dashboard.js: editingFahrtId State, FahrtForm mit Edit-Props rendern statt Card
- FahrtenListe.js: Tabelle durch Card-Grid ersetzen, gleiche Edit/Delete-Mechanik
- UserManagement.js: Tabelle/Liste durch User-Cards ersetzen

</code_context>

<specifics>
## Specific Ideas

- Card-Layout für Fahrten soll identisch sein auf Dashboard UND Fahrtenliste — ein Design, überall
- Verwaltung-Tab soll sich anfühlen wie Settings-Tab — gleiche Card-Sprache
- iPhone/Desktop gleichwertig wichtig (aus Phase 16 übernommen)
- Statistik-Animation wiederherstellen nachdem API-Bug gefixt wurde

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-dashboard-listen-feinschliff*
*Context gathered: 2026-04-02*
