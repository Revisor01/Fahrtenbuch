# Phase 4: Von/Bis-Zeitraum in Monatsübersicht - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Die Monatsauswahl in der Monatsübersicht wird zu Von/Bis erweitert. Die gesamte Ansicht (Fahrten-Liste, Erstattungen, Summary, Export) zeigt den gewählten Zeitraum. Neue Backend-Route für Report-Range. Der separate Zeitraum-Export-Bereich (Phase 3) entfällt — die bestehenden Export-Buttons werden zu "Zeitraum exportieren".

</domain>

<decisions>
## Implementation Decisions

### Monatsauswahl-UI
- **D-01:** Oben in der Monatsübersicht: Von-Dropdown und Bis-Dropdown ersetzen den bisherigen einzelnen Monats-Dropdown
- **D-02:** Von Default: `---` (bedeutet: Einzelmonat-Modus, nur Bis zählt)
- **D-03:** Bis Default: aktueller Monat
- **D-04:** Gleiches CSS/Styling wie die bisherige Monatsauswahl (form-select Klasse, Dark-Mode kompatibel)
- **D-05:** Wenn Von = `---` → Einzelmonat (Bis-Wert), wie bisher
- **D-06:** Wenn Von = Bis (z.B. März bis März) → Einzelmonat-Route (alte API)
- **D-07:** Wenn Von ≠ Bis UND Von ≠ `---` → Zeitraum-Modus (neue Range-API)

### Daten-Loading
- **D-08:** Im Einzelmonat-Modus: bestehende Route `/api/fahrten/report/:year/:month` (unverändert)
- **D-09:** Im Zeitraum-Modus: neue Route `/api/fahrten/report-range/:startYear/:startMonth/:endYear/:endMonth`
- **D-10:** Die neue Report-Range-Route liefert aggregierte Fahrten + Summary über den gesamten Zeitraum
- **D-11:** Fahrten-Liste zeigt alle Fahrten des Zeitraums, sortiert nach Datum
- **D-12:** Summary-Cards zeigen aggregierte Erstattungen über den Zeitraum

### Export-Logik
- **D-13:** Bestehende Export-Buttons bleiben, Text wird "Zeitraum exportieren"
- **D-14:** Im Einzelmonat-Modus: Buttons nutzen bestehende Export-Route (alte API)
- **D-15:** Im Zeitraum-Modus: Buttons nutzen die Range-Export-Route aus Phase 3
- **D-16:** Separater Zeitraum-Export-Bereich (aus Phase 3) entfällt komplett — Von/Bis-State und Export-Buttons oben ersetzen ihn

### Aufräumen
- **D-17:** exportVonYear/Month und exportBisYear/Month State-Variablen entfallen (Phase 3)
- **D-18:** handleExportToExcelRange entfällt als separate Funktion — Logik wird in handleExportToExcel integriert
- **D-19:** Der "Zeitraum exportieren"-Div-Block aus Phase 3 wird entfernt

### Claude's Discretion
- Genauer Text des Von-Dropdown-Platzhalters ("---" vs "Von..." vs leer)
- Status-Anzeige bei Zeiträumen (pro Monat oder aggregiert)
- Responsive Layout der Von/Bis-Dropdowns auf Mobile

</decisions>

<specifics>
## Specific Ideas

- Benjamins Wunsch: Mehrere Monate in eine Tabelle — Von/Bis oben löst das elegant
- Die Überschrift "Monatsübersicht" passt auch für Zeiträume — ggf. dynamisch "Zeitraum-Übersicht" wenn Von gesetzt
- Die bisherige Logik mit selectedMonth steuert alles (Fahrten, Summary, Export) — muss auf selectedRange erweitert werden

</specifics>

<canonical_refs>
## Canonical References

### Code
- `frontend/src/App.js` — Monatsauswahl (Zeile 40, 513-514, 531, 541-549), fetchFahrten (Zeile 202-216), Export-Handler (Zeile 620-658, 672-710), Summary-Rendering (Zeile 925+), Export-Buttons (Zeile 1062-1140)
- `backend/controllers/fahrtController.js` — getMonthlyReport (Zeile 160-265), existierender report-Endpoint
- `backend/models/Fahrt.js` — getMonthlyReport (Zeile 157-183), getDateRangeReport (neu aus Phase 3)
- `backend/routes/fahrten.js` — Route-Definitionen
- `backend/utils/excelExport.js` — exportToExcelRange aus Phase 3

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Fahrt.getDateRangeReport()` aus Phase 3 — kann für Report-Range wiederverwendet werden
- `exportToExcelRange()` aus Phase 3 — Export-Route bereits vorhanden
- `Abrechnung.getStatus()` — Status pro Monat, kann in Schleife für Zeitraum aggregiert werden
- `getMonthlyReport()` im Controller — Referenz für was die Report-Antwort enthalten muss

### Established Patterns
- `selectedMonth` als "2026-03" steuert aktuell alles via AppContext
- `fetchFahrten()` ruft `/api/fahrten/report/:year/:month` auf und setzt fahrten + summary State
- Export-Buttons nutzen `handleExportToExcel(type, year, month)`
- Summary-Cards berechnen Erstattungen aus `summary.erstattungen`

### Integration Points
- `selectedMonth` State → muss zu Von/Bis-Logic erweitert werden
- `fetchFahrten()` → muss zwischen Einzel- und Range-Route unterscheiden
- `handleExportToExcel()` → muss im Range-Modus die Range-Export-Route nutzen
- AppContext → Von/Bis-State muss an Kindkomponenten durchgereicht werden
- Neuer Backend-Endpoint `/api/fahrten/report-range/...` analog zu existierendem `/report/:year/:month`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-von-bis-zeitraum-in-monats-bersicht*
*Context gathered: 2026-03-22*
