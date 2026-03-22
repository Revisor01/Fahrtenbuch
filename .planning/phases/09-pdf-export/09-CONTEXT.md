# Phase 9: PDF-Export - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

PDF-Export als Alternative zu Excel einbauen. Gleiches Layout wie Excel (Datum TT.MM.JJJJ, Unterschriftsfelder, Kostenstelle). Export-Buttons bieten Format-Auswahl. Unterstützt Einzel- und Mehrmonats-Export.

</domain>

<decisions>
## Implementation Decisions

### PDF-Bibliothek
- **D-01:** pdfkit oder pdfmake als Server-Side PDF-Generierung (Claude wählt die passendste)
- **D-02:** PDF wird serverseitig generiert (wie Excel) — kein Client-Side-Rendering

### Layout
- **D-03:** Gleiches Layout wie Excel-Export: Header (Jahr, Monat, Name, Anschrift, IBAN, Kostenträger+Kst.)
- **D-04:** Tabelle mit Datum, Anschrift Reiseantritt, Anschrift Reiseziel, Reisezweck, km
- **D-05:** Fußbereich: Gesamt-km, Erstattungsberechnung, Unterschriftsfelder wie im Excel
- **D-06:** Referenz-PDF: `Dienstfahrtenabrechnung - Excel - Alt.pdf` im Projekt-Root

### API
- **D-07:** Neue Route `/api/fahrten/export-pdf/:type/:year/:month` für Einzelmonat
- **D-08:** Neue Route `/api/fahrten/export-pdf-range/:type/:startYear/:startMonth/:endYear/:endMonth` für Zeitraum
- **D-09:** Bestehende Excel-Routen bleiben unverändert

### Frontend
- **D-10:** Export-Buttons zeigen Dropdown oder zwei Buttons (Excel/PDF) — Claude entscheidet pragmatisch
- **D-11:** Format-Auswahl im bestehenden Export-Bereich in FahrtenListe.js (nach Refactoring)

### Claude's Discretion
- PDF-Bibliothek-Wahl (pdfkit vs pdfmake vs jspdf)
- Exaktes Layout-Design (Spaltenbreiten, Schriftgrößen, Margins)
- Ob Dropdown, Toggle oder zwei separate Buttons für Format-Auswahl
- Pagination bei vielen Fahrten (Seitenumbruch)

</decisions>

<specifics>
## Specific Ideas

- Frau Reuschs PDF zeigt das gewünschte Layout — druckfertig, direkt einreichbar
- PDF soll auf A4 Querformat passen (wie das Referenz-PDF)
- Hinweistexte (Tagegelder, Ausschlussfrist) sollen auch im PDF stehen

</specifics>

<canonical_refs>
## Canonical References

- `Dienstfahrtenabrechnung - Excel - Alt.pdf` — Referenz-Layout
- `backend/utils/excelExport.js` — Bestehende Export-Logik als Vorlage für Datenaufbereitung
- `frontend/src/components/FahrtenListe.js` — Export-Handler (handleExportToExcel)
- `backend/routes/fahrten.js` — Bestehende Export-Routen

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Fahrt.getMonthlyReport()` und `Fahrt.getDateRangeReport()` — Datenabfrage wiederverwendbar
- `excelExport.js` Datenaufbereitung (Erstattungsberechnung, Header-Daten) — Logik kann geteilt werden
- Bestehende Export-Handler im Frontend — Pattern für Download-Logik

### Integration Points
- Neue Routen in `backend/routes/fahrten.js`
- Neuer Controller/Utility für PDF-Generierung
- FahrtenListe.js: handleExportToExcel erweitern oder neuen handleExportToPdf daneben

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 09-pdf-export*
*Context gathered: 2026-03-22*
