# Phase 27: Backend-API & UI-Konsistenz - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning
**Mode:** Auto-generated (decisions from user conversation)

<domain>
## Phase Boundary

Backend liefert pro-Monat-Status bei Zeitraum-Anfragen. FahrtenListe Erstattungs-Cards visuell konsistent mit v2.1 Patterns.

</domain>

<decisions>
## Implementation Decisions

### Backend API (ZS-01)
- report-range Endpoint liefert abrechnungsStatus als verschachteltes Objekt: `{ [traegerId]: { [yearMonth]: { eingereicht_am, erhalten_am } } }`
- Einzelmonat-Report (report/:year/:month) bleibt unverändert (flache Struktur)
- Frontend muss die neue Struktur verarbeiten können

### UI-Konsistenz (UI-01 bis UI-04)
- Erstattungs-Cards: kpi-card + getCardBg(farbe) wie MonthlyOverview (bereits teilweise im letzten Fix)
- Status-Chips: status-badge-primary (erhalten), status-badge-warning (eingereicht), status-badge-secondary (nicht eingereicht) — klar unterscheidbar
- card-container-highlight → card-container (bereits im letzten Fix)
- section-header Pattern für Erstattungs-Bereich

### Claude's Discretion
- Exaktes JSON-Format der pro-Monat-API-Antwort
- Wie die Status-Badges visuell gestaltet werden (Farben, Icons)

</decisions>

<code_context>
## Existing Code Insights

### Betroffene Dateien
- backend/controllers/fahrtController.js: getReportRange (Zeile 274+) — API umbauen
- frontend/src/components/FahrtenListe.js: Erstattungs-Cards (Zeile 496+) — UI anpassen
- frontend/src/index.css: status-badge-* Klassen (Zeile 193+) — prüfen

### Bereits Vorhandenes
- getCardBg() und Farb-Konstanten bereits in FahrtenListe.js (aus letztem Fix)
- kpi-card CSS-Klassen aus Phase 22
- section-header CSS-Klasse aus Phase 22
- status-badge-primary/warning/secondary Klassen in index.css

### Backend-Kontext
- Abrechnung.getStatus(userId, year, month) gibt flache Status pro Monat zurück
- handleAbrechnungsStatus in AppContext setzt bei Zeitraum für alle Monate (gewollt, ZS-03)

</code_context>

<specifics>
## Specific Ideas

- Status-Badge "eingereicht" soll status-badge-warning nutzen (gelb/amber) statt status-badge-secondary (grau) — besser unterscheidbar von "nicht eingereicht"

</specifics>

<deferred>
## Deferred Ideas

None

</deferred>
