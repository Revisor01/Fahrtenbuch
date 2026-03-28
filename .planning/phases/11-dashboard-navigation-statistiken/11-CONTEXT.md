# Phase 11: Dashboard, Navigation & Statistiken - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Neue Dashboard-Komponente als Startseite. Tab-Navigation (Dashboard, Fahrten & Export, Monatsübersicht, Einstellungen). KPI-Cards, aufklappbares Fahrt-Formular, Favoriten-Schnelleingabe, letzte 3 Fahrten, Jahres-Statistik-Chart. Bestehende Views bleiben unverändert — Dashboard ist additiv.

</domain>

<decisions>
## Implementation Decisions

### Dashboard-Layout (aus User-Mockup)
- **D-01:** KPI-Cards oben: offene Erstattungen (€), km diesen Monat, Fahrten diesen Monat
- **D-02:** Aufklappbares Fahrt-Formular (bestehendes FahrtForm, prominent platziert)
- **D-03:** Favoriten-Schnelleingabe: Klick → Fahrt mit heutigem Datum (aus Phase 10)
- **D-04:** Letzte 3 Fahrten mit "Nochmal"-Button (aus Phase 10, hier im Dashboard prominent)
- **D-05:** Jahres-Balkendiagramm: km pro Monat
- **D-06:** Erstattungs-Übersicht pro Abrechnungsträger über das Jahr

### Navigation
- **D-07:** Vier Tabs: Dashboard, Fahrten & Export, Monatsübersicht, Einstellungen
- **D-08:** Dashboard ist Default-Tab (Startseite)
- **D-09:** Bestehende Views (FahrtenListe, MonthlyOverview) bleiben unverändert als eigene Tabs
- **D-10:** Einstellungen öffnet weiterhin das Profil-Modal (kein eigener Tab-Inhalt)
- **D-11:** Mobile: Tab-Bar unten oder Hamburger-Menu — Claude entscheidet pragmatisch

### Statistik-Chart
- **D-12:** Einfaches Balkendiagramm ohne externe Chart-Library (CSS/SVG reicht)
- **D-13:** Daten kommen aus der bestehenden monthlyData (fetchMonthlyData im AppContext)
- **D-14:** Aktuelles Jahr als Default, Jahrwechsel möglich

### Claude's Discretion
- Chart-Implementierung (CSS bars vs SVG vs canvas)
- KPI-Card-Design (Farben, Icons, Hover-States)
- Tab-Indikator-Style (Unterstrich, Hintergrund, Pill)
- Mobile Navigation (Bottom-Tabs vs Hamburger)
- Ob "Aktueller Monat" Button im Dashboard auch die KPIs beeinflusst

</decisions>

<specifics>
## Specific Ideas

- User wünscht sich das bestehende Farbschema und Layout beizubehalten
- Dashboard soll nicht überladen wirken — pragmatisch, nicht fancy
- KPIs nutzen bestehende Daten (summary, monthlyData) — keine neuen API-Calls nötig
- FahrtForm existiert als Komponente — muss nur eingebettet werden

</specifics>

<canonical_refs>
## Canonical References

- `frontend/src/components/AppContent.js` — Aktueller Layout-Wrapper, hier kommt die Tab-Navigation rein
- `frontend/src/components/FahrtenListe.js` — Bestehende Fahrten-Ansicht
- `frontend/src/components/MonthlyOverview.js` — Bestehende Monatsübersicht
- `frontend/src/FahrtForm.js` — Bestehendes Formular zum Einbetten
- `frontend/src/contexts/AppContext.js` — State (summary, monthlyData, favoriten, fahrten)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `summary` State: enthält Erstattungen, Abrechnungsstatus, Gesamt — perfekt für KPIs
- `monthlyData` State: enthält km pro Monat, Erstattungen — perfekt für Chart
- `favoriten` State: aus Phase 10, für Schnelleingabe
- `fahrten` State: letzte 3 für Quick-Copy
- `FahrtForm` Komponente: fertig, muss nur eingebettet werden
- `fetchMonthlyData()`: holt 24 Monate + 3 Zukunft — genug für Jahreschart

### Integration Points
- AppContent.js: Tab-Navigation hier einbauen (ersetzt aktuelle View-Logik)
- Neue Dashboard.js Komponente erstellen
- FahrtForm muss im Dashboard eingebettet werden können (aktuell in FahrtenListe)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-dashboard-navigation-statistiken*
*Context gathered: 2026-03-28*
