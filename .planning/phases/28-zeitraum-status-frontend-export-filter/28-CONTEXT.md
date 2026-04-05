# Phase 28: Zeitraum-Status Frontend & Export-Filter - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Frontend zeigt im Zeitraum-Modus Status pro Monat aufgeschlüsselt an. Export filtert eingereichte Monate raus.

</domain>

<decisions>
## Implementation Decisions

### Zeitraum-Status Anzeige (ZS-02)
- Im Einzelmonat-Modus: Status bleibt wie bisher (flach: eingereicht/erhalten/offen)
- Im Zeitraum-Modus: Status pro Monat als Chips anzeigen (z.B. "Jan: eingereicht", "Feb: offen", "Mär: offen")
- Backend liefert jetzt verschachtelte Struktur: { traegerId: { "2026-01": { eingereicht_am, erhalten_am } } }
- Frontend muss erkennen ob Einzelmonat oder Zeitraum und entsprechend rendern

### Status-Setzen (ZS-03)
- Im Zeitraum-Modus: Status für alle Monate gleichzeitig setzen (bereits implementiert in AppContext, bleibt so)

### Export-Filter (EX-01, EX-02)
- Export im Zeitraum filtert Monate raus die bereits eingereicht/erhalten sind
- Nur Fahrten aus offenen Monaten werden exportiert
- Export-Button wird ausgeblendet wenn alle Monate im Zeitraum bereits eingereicht/erhalten

### Claude's Discretion
- Exaktes Chip-Layout (inline, vertikal, Grid)
- Wie der Export-Filter technisch umgesetzt wird (Backend-Filter oder Frontend-Filter)

</decisions>

<code_context>
## Existing Code Insights

### Backend API (Phase 27)
- report-range gibt jetzt: { abrechnungsStatus: { [traegerId]: { [yearMonth]: { eingereicht_am, erhalten_am } } } }
- Einzelmonat-Report (report/:year/:month) gibt weiterhin: { abrechnungsStatus: { [traegerId]: { eingereicht_am, erhalten_am } } }

### Frontend
- FahrtenListe.js Zeile 500+: Status-Badges nutzen summary.abrechnungsStatus[key]
- Diese Logik muss für Zeitraum-Modus angepasst werden (verschachtelt vs flach)
- selectedVonMonth !== selectedMonth → Zeitraum-Modus aktiv
- Export-Funktionen: handleExportToExcel, handleExportToPdf, handleExportBoth

### Integration Points
- FahrtenListe.js: Erstattungs-Cards Status-Anzeige + Export
- AppContext.js: fetchFahrten() setzt summary aus API-Response

</code_context>

<specifics>
## Specific Ideas

- Chips für pro-Monat-Status: Monatskürzel + Badge (z.B. "Jan" mit grünem/amber/grauem Punkt)
- Kompakt halten — nicht jeder Monat als eigene Zeile

</specifics>

<deferred>
## Deferred Ideas

None

</deferred>
