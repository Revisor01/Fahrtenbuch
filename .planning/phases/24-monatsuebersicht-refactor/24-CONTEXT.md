# Phase 24: Monatsuebersicht Refactor - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Die Monatsübersicht wird zu "Abrechnungen" umbenannt, Desktop/Mobile-Doppelrendering zusammengeführt und globale Section-Header-Patterns angewendet.

</domain>

<decisions>
## Implementation Decisions

### Naming (MU-01)
- Tab-Name: "Abrechnungen" (statt "Monatsübersicht")
- Route-ID: "abrechnungen" (statt "monatsuebersicht")
- Seitentitel: "Abrechnungen" (gleich wie Tab-Name)
- Entscheidung dokumentiert: "Abrechnungen" beschreibt den Inhalt besser — es geht um Erstattungs-Status pro Träger, nicht um eine kalendarische Monatsübersicht

### Desktop/Mobile-Vereinheitlichung (MU-02)
- Doppel-Rendering entfernen (hidden sm:block / sm:hidden Pattern)
- Desktop-Layout als Basis, responsive machen mit Breakpoints
- Eine einzige Komponenten-Struktur statt zwei getrennte Render-Pfade
- Ziel: Kein hidden/sm:hidden für separate Layout-Versionen mehr

### Section-Headers (MU-03)
- Jahresübersicht: BarChart3 Icon (wie Dashboard Statistik-Sektion)
- Monats-Cards: bleiben Card-interne Überschriften (NICHT auf section-header umstellen — Phase 22 Entscheidung)

### Card-Konsistenz (MU-04)
- Cards nutzen die globalen Patterns aus Phase 22 (.kpi-card bereits umgestellt)
- Keine Sonder-Styles — alles über Design-Tokens

### Claude's Discretion
- Wie genau die Desktop/Mobile-Merge technisch umgesetzt wird (welche responsive Breakpoints, Grid-Layout)
- Ob der Jahresübersicht-Header oben oder innerhalb einer Card-Sektion platziert wird

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- .section-header CSS-Klasse (Phase 22)
- .kpi-card Klassen (Phase 22, bereits in MonthlyOverview umgestellt)
- AppContent.js: Tab-Konfiguration (Zeile 59, Route "monatsuebersicht")

### Problembereiche
- Desktop: hidden sm:block (Zeile 473) — Card-Grid
- Mobile: sm:hidden (Zeile 550) — vereinfachtes Stack-Layout
- Header-Controls: hidden sm:flex / flex sm:hidden (Zeilen 353, 386) — separate Steuerung
- Doppelter Code für Desktop und Mobile Monatsansichten

### Integration Points
- MonthlyOverview.js (635 Zeilen): Hauptdatei
- AppContent.js: Tab-Name und Route-ID ändern
- Alle Stellen wo "Monatsübersicht" oder "monatsuebersicht" referenziert wird

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches using Phase 22 patterns

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
