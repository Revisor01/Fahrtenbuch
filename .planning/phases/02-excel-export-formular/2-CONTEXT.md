# Phase 2: Excel-Export Formular - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Der Excel-Export soll dem offiziellen Dienstfahrten-Abrechnungsformular entsprechen. Vier Anpassungen: (1) Datum als echtes Excel-Datum im Format TT.MM.JJJJ, (2) Unterschriftsbereich exakt wie im Referenz-PDF, (3) Kostenstelle im Header neben dem Kostenträger, (4) Template-Datei anpassen. Kein neuer Export-Dialog — das kommt in Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Datumsformat
- **D-01:** Datum als echtes Excel-Datum speichern (nicht als Text-String)
- **D-02:** Excel-Zahlenformat `DD.MM.YYYY` setzen, sodass TT.MM.JJJJ angezeigt wird (z.B. 22.05.2025)
- **D-03:** Nutzer können das Format in Excel nachträglich ändern, weil es ein echtes Datum ist

### Unterschriftsbereich
- **D-04:** Layout exakt wie im Referenz-PDF von Frau Reusch nachbauen
- **D-05:** Feste Position am Seitenende, nach "Gesamt gefahrene km"
- **D-06:** Zeile 1: "Datum: ___" links + "Abrechnung der oben aufgeführten gefahrenen km: X km x 0,30 € = Y €" rechts
- **D-07:** Zeile 2: "Unterschrift: ___" links + "Datum: ___" Mitte + "Angeordnet/genehmigt Unterschrift: ___" rechts
- **D-08:** Hinweistexte aus PDF: "Für die Abrechnung von Tagegeldern nutzen Sie bitte die Einzel-Dienstreiseanträge" + "Bitte beachten Sie die Ausschlussfrist von 6 Monaten (§3 Abs. 1 BRKG)"

### Kostenstelle im Header
- **D-09:** Format wie im PDF: "Kostenträger: Rentamt - Kst.: 760130" in einer Zelle
- **D-10:** Wenn Kostenstelle leer: nur "Kostenträger: Rentamt" (kein "- Kst.:" Suffix)
- **D-11:** Nutzt das `kostenstelle`-Feld aus Phase 1 am Abrechnungsträger

### Template-Strategie
- **D-12:** Die Template-Datei (`backend/templates/fahrtenabrechnung_vorlage.xlsx`) anpassen
- **D-13:** Unterschriftsbereich, Hinweistexte und Formatierungen im Template vorhalten
- **D-14:** Code füllt nur dynamische Daten (Datum, km-Summe, Erstattungsbetrag, Kostenträger+Kst.)

### Claude's Discretion
- Exakte Zellpositionen für Unterschriftsbereich im Template
- Styling (Schriftgröße, Unterstreichungen) des Unterschriftsbereichs
- Handling bei Pagination (>22 Fahrten auf mehreren Sheets) — Unterschrift auf jedem oder nur letztem Sheet

</decisions>

<specifics>
## Specific Ideas

- Referenz-PDF: `Dienstfahrtenabrechnung - Excel - Alt.pdf` im Projekt-Root zeigt exakt das gewünschte Layout
- Frau Reuschs PDF hat "Fahrtenbuch Stand 2025" als Footer rechts unten
- Im PDF steht "Monat: April bis Juni" — das ist Phase 3 (Mehrmonats-Export), hier nur Einzelmonat-Header anpassen
- Erstattungssatz im PDF: "18 km x 0,30 € = 5,40 €" — der Satz kommt aus der `erstattungsbetraege`-Tabelle
- Joergs Kernproblem war, dass das Datum ohne Jahr exportiert wurde und er es nicht über Excel-Formatierung korrigieren konnte → echtes Datum-Objekt löst das

</specifics>

<canonical_refs>
## Canonical References

### Excel-Referenz
- `Dienstfahrtenabrechnung - Excel - Alt.pdf` — Offizielles Formular-Layout, Pflichtfelder, Unterschriftsbereich, Header-Format

### Code
- `backend/utils/excelExport.js` — Aktuelle Export-Logik, Template-Loading, Zell-Mapping
- `backend/templates/fahrtenabrechnung_vorlage.xlsx` — Template-Datei die angepasst werden muss
- `backend/controllers/fahrtController.js` — Export-Endpoint, Datenabfrage
- `backend/models/AbrechnungsTraeger.js` — Kostenstelle-Feld (Phase 1)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `excelExport.js:formatDate()` (Zeile 28-34) — muss von "DD. Mmm" auf echtes Date-Objekt umgestellt werden
- `excelExport.js:getMonthName()` — deutsche Monatsnamen, wiederverwendbar für Header
- Template-Datei hat bereits vordefinierte Styles (Fonts, Borders, Alignment)
- `erstattungsbetraege`-Tabelle hat den km-Satz je Abrechnungsträger

### Established Patterns
- Template wird per `ExcelJS.Workbook.xlsx.readFile()` geladen
- Daten werden in vordefinierte Zellen geschrieben (z.B. `worksheet.getCell('A8').value = ...`)
- Bei >22 Einträgen: mehrere Worksheets, am Ende als ZIP
- User-Profil-Daten (Name, Adresse, IBAN) werden im Header eingesetzt

### Integration Points
- `excelExport.js:exportToExcel()` — Hauptfunktion, hier wird Datum-Formatierung und Unterschriftsbereich eingefügt
- Template-Datei — muss Unterschriftsbereich und korrekte Spalten-Header enthalten
- Zelle C7 im "Vorlage"-Sheet — hier wird Kostenträger + Kostenstelle eingesetzt

</code_context>

<deferred>
## Deferred Ideas

- Mehrmonats-Header ("Monat: April bis Juni") — Phase 3
- Von/Bis-Export-Dialog — Phase 3
- "Eingereicht"-Status über Zeiträume — Phase 3

</deferred>

---

*Phase: 02-excel-export-formular*
*Context gathered: 2026-03-21*
