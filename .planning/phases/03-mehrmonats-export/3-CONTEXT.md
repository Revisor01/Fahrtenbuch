# Phase 3: Mehrmonats-Export - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Nutzer können einen Zeitraum über mehrere Monate exportieren. Neue Von/Bis-Dropdowns, angepasster Excel-Header, korrekte "eingereicht"-Markierung über alle Monate. Der bestehende Einzelmonats-Export bleibt als separater Button erhalten.

</domain>

<decisions>
## Implementation Decisions

### Zeitraum-Auswahl (UI)
- **D-01:** Zwei separate Dropdowns: Von-Monat und Bis-Monat
- **D-02:** Default: Von=aktueller Monat, Bis=aktueller Monat (wie bisheriger Einzelmonats-Default)
- **D-03:** Responsive: auf Mobile untereinander, auf Desktop nebeneinander

### Eingereicht-Status
- **D-04:** Bei Mehrmonats-Export wird jeder einzelne Monat im Zeitraum als "eingereicht" markiert
- **D-05:** Nutzt die bestehende DB-Struktur (abrechnungen: user_id, jahr, monat, typ) — ein INSERT/UPDATE pro Monat
- **D-06:** Bestehende Status-Logik (eingereicht_am, erhalten_am, reset) bleibt unverändert

### Excel-Header Zeitraum
- **D-07:** Kompaktes Format: "Monat: 04/2025 - 06/2025"
- **D-08:** Bei Einzelmonat (Von=Bis): weiterhin "Monat: März 2026" (deutscher Monatsname, wie bisher)
- **D-09:** Bei jahresübergreifend (z.B. Nov 2025 - Feb 2026): "Monat: 11/2025 - 02/2026"

### Abwärtskompatibilität
- **D-10:** Bestehender Export-Button bleibt unverändert (Einzelmonats-Export pro Abrechnungsträger)
- **D-11:** Zusätzlicher "Zeitraum exportieren"-Button/Bereich mit Von/Bis-Dropdowns
- **D-12:** Bestehende API-Route `/api/fahrten/export/:type/:year/:month` bleibt erhalten
- **D-13:** Neue API-Route für Mehrmonats-Export (z.B. `/api/fahrten/export/:type/:startYear/:startMonth/:endYear/:endMonth`)

### Claude's Discretion
- Platzierung des "Zeitraum exportieren"-Bereichs im Frontend
- Ob Von/Bis-Dropdowns im gleichen Summary-View oder als Modal/Dialog
- Validierung: Bis-Monat >= Von-Monat
- Dateiname bei Mehrmonats-Export

</decisions>

<specifics>
## Specific Ideas

- Benjamins Wunsch: "Ist es möglich es so zu gestalten, dass statt der monatlichen Auszüge mehrere Monate in eine Exceltabelle exportiert werden"
- Frau Reuschs PDF zeigt "Monat: April bis Juni" — wir nutzen stattdessen kompaktes Format "04/2025 - 06/2025"
- Bei >22 Fahrten pro Monat gibt es bereits Pagination in mehrere Sheets — bei Mehrmonats-Export mit vielen Fahrten analog handhaben

</specifics>

<canonical_refs>
## Canonical References

### Code
- `backend/utils/excelExport.js` — Export-Logik, Template-Loading, Pagination bei >22 Fahrten
- `backend/models/Fahrt.js:getMonthlyReport()` — Aktuelle Monats-Query, muss auf Datumsbereich erweitert werden
- `backend/models/Abrechnung.js` — Status-Verwaltung (eingereicht_am, erhalten_am) pro Monat+Typ
- `backend/routes/fahrten.js` — Export-Route (Zeile 11)
- `frontend/src/App.js` — Export-Handler (Zeile 620), Monatswahl (Zeile 40, 513-514), Export-Buttons (Zeile 1010-1020)

### Referenz
- `Dienstfahrtenabrechnung - Excel - Alt.pdf` — Zeigt Mehrmonats-Header "Monat: April bis Juni"

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Fahrt.getMonthlyReport(year, month, userId)` — Basis für Datumsbereich-Query, muss erweitert werden
- `Abrechnung.updateStatus(userId, jahr, monat, typ, aktion, datum)` — kann in Schleife für jeden Monat aufgerufen werden
- `excelExport.js` Pagination-Logik (22er-Chunks) — wiederverwendbar für größere Datenmengen
- `getMonthName()` — deutsche Monatsnamen für Einzelmonats-Header
- `handleExportToExcel(type, year, month)` — bestehender Handler, bleibt für Einzelmonat

### Established Patterns
- Route: `GET /api/fahrten/export/:type/:year/:month`
- Frontend: `axios.get(..., { responseType: 'blob' })` für Download
- Dateiname: `fahrtenabrechnung_{type}_{year}_{month}.xlsx`
- Status: UNIQUE(user_id, jahr, monat, typ) in abrechnungen-Tabelle

### Integration Points
- Neue Route neben bestehender Export-Route registrieren
- Neuer Frontend-Handler `handleExportToExcelRange(type, startYear, startMonth, endYear, endMonth)`
- DB-Query erweitern: `WHERE f.datum BETWEEN ? AND ?` statt `YEAR/MONTH`-Filter
- Status-Update in Schleife: für jeden Monat im Zeitraum `Abrechnung.updateStatus()` aufrufen

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-mehrmonats-export*
*Context gathered: 2026-03-22*
