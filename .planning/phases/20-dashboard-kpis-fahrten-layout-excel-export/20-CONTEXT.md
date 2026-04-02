# Phase 20: Dashboard KPIs, Fahrten-Layout & Excel-Export - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Dashboard-KPIs von Monatsfilter entkoppeln (offene Erstattungen global, letzte Fahrten global), Fahrten-Cards auf Fahrten&Export identisch zum Dashboard machen, Monatsübersicht als KPI-Cards statt Tabellen, Excel-Export korrekt mit 2026-Quartals-Vorlage.

</domain>

<decisions>
## Implementation Decisions

### Dashboard KPIs
- **D-01:** "Offene Erstattungen" KPI zeigt ALLE offenen Erstattungen unabhängig vom Monatsfilter, plus eingereichte Beträge in Klammern
- **D-02:** "Letzte Fahrten" zeigt immer die letzten 3 Fahrten global (nicht monatsabhängig) — aktuell filtert `letzteTrips` bereits global aus `fahrten`, aber bei leerem Monat zeigt es nichts → sicherstellen dass immer Daten da sind
- **D-03:** Button "Alle Fahrten anzeigen →" unter den letzten Fahrten (existiert bereits im Code Zeile 378-384 Dashboard.js, aber User sagt er fehlt → prüfen ob er korrekt gerendert wird)

### Fahrten-Cards (Fahrten&Export)
- **D-04:** Card-Layout auf Fahrten&Export identisch zum Dashboard "Letzte Fahrten" — gleiche Struktur, gleicher orangener Clock-Icon-Header
- **D-05:** Kein Trennstrich/Separator zwischen einzelnen Fahrten-Cards
- **D-06:** Fahrten-Anzahl muss korrekt angezeigt werden (bekanntes wiederholtes Feedback)

### Monatsübersicht
- **D-07:** Erstattungs-Zusammenfassung als KPI-Cards im Dashboard-Stil (farbig, mit Icons) statt der aktuellen Tabellen-Darstellung
- **D-08:** Bestehende Funktionalität (Abrechnungsstatus, Jahresfilter, Hide-Completed) bleibt erhalten

### Excel-Export
- **D-09:** 2026-Vorlage: Spaltenbreiten, Borders, Fonts, Merges der Vorlage vollständig bewahren
- **D-10:** Korrektes Quartals-Sheet automatisch basierend auf dem Export-Zeitraum wählen (QUARTAL_SHEETS Array bereits vorhanden in excelExport.js)

### Claude's Discretion
- Konkrete Farben und Icons für die Monatsübersicht-KPI-Cards
- Wie genau "eingereichte Beträge in Klammern" im KPI dargestellt wird (z.B. "245,00 € (120,00 € eingereicht)")
- Ob die Fahrten-Anzahl als Badge oder Text dargestellt wird
- Details der Excel-Format-Korrekturen

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Dashboard & Layout
- `frontend/src/components/Dashboard.js` — Aktuelles Dashboard mit KPI-Cards (Zeile 192-239) und Letzte Fahrten (Zeile 287-387)
- `frontend/src/components/FahrtenListe.js` — Fahrtenliste mit Card-Layout, anzupassen auf Dashboard-identisches Design
- `frontend/src/components/MonthlyOverview.js` — Monatsübersicht mit Tabellen-Layout, umzubauen auf KPI-Cards

### Design System
- `frontend/src/index.css` — Design-Tokens (card-container, shadow-card, rounded-card, border-card, bg-emerald-50 etc.)

### Excel-Export
- `backend/utils/excelExport.js` — Excel-Export mit QUARTAL_SHEETS und Template-basiertem Ansatz
- `Fahrtenbuch Stand 2026.xlsx` — Die neue 2026-Vorlage als Referenz (im Projekt-Root)

### Backend API
- `backend/controllers/fahrtController.js` — Export-Endpoints und Daten-Aggregation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Dashboard.js KPI-Cards (Zeile 192-239): Farbige Cards mit Icons — Template für Monatsübersicht
- Dashboard.js letzteTrips (Zeile 53-61): Sortiert bereits global, aber UI könnte bei leerem fahrten-Array nichts zeigen
- Dashboard.js "Alle Fahrten anzeigen"-Button (Zeile 378-384): Existiert bereits, muss geprüft werden
- FahrtenListe.js: Hat bereits Card-Layout aus Phase 19, muss auf Dashboard-Stil angeglichen werden
- excelExport.js QUARTAL_SHEETS Array (Zeile 37): Quartals-Mapping bereits definiert

### Established Patterns
- KPI-Cards: grid grid-cols-2 lg:grid-cols-4, farbige Backgrounds (emerald, blue, purple, primary)
- Fahrten-Card: flex items-center justify-between, rounded-card border border-card
- Lucide Icons für Sektions-Header (Clock, Star, Plus, BarChart3)

### Integration Points
- Dashboard.js offeneErstattungen (Zeile 36-39): Berechnet aus summary.erstattungen — muss auf ALLE Monate erweitert werden
- Dashboard.js letzteTrips: Basiert auf `fahrten` Array aus AppContext — prüfen was geladen wird
- MonthlyOverview.js getKategorienMitErstattung(): Bereits KPI-artige Daten — nur UI-Darstellung ändern
- excelExport.js: Template-Datei laden und Formatierung bewahren statt neu aufbauen

</code_context>

<specifics>
## Specific Ideas

- User hat explizit gesagt: "Letzte Fahrten zeigt nichts bei falschem Monat" → muss monatsunabhängig sein
- User will letzte 3 Fahrten IMMER sehen, egal welcher Monat
- "Alle Fahrten anzeigen"-Button muss sichtbar und funktional sein
- Fahrten-Anzahl ist ein wiederholt bemängeltes Thema — MUSS korrekt sein

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-dashboard-kpis-fahrten-layout-excel-export*
*Context gathered: 2026-04-02*
