# Phase 13: Dashboard-Polish & Kleinigkeiten - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Dashboard visuell aufräumen (Cards, Statistiken erweitern), Favoriten mit Rückfahrt-Dialog, Nochmal-Buttons mit Richtungs-Optionen, alle Umlaute korrigieren. Keine Navigation-Änderungen (das ist Phase 14).

</domain>

<decisions>
## Implementation Decisions

### Dashboard Card-Layout (DASH-06)
- **D-01:** Jede Rubrik (KPIs, Neue Fahrt, Favoriten, Letzte Fahrten, Statistik) bekommt einen card-container Hintergrund
- **D-02:** Klare Überschriften pro Rubrik für bessere Orientierung

### Statistiken (DASH-04, DASH-05)
- **D-03:** Erstattungen pro Abrechnungsträger als Tabelle unterhalb des km-Charts im Statistik-Card
- **D-04:** Mouseover auf km-Balken zeigt Tooltip mit "X Fahrten" zusätzlich zu den km

### Neue Fahrt Layout (DASH-07)
- **D-05:** Aufklappbarer Bereich mit modernererem Look — Claude entscheidet das Design
- **D-06:** Muss responsive funktionieren (Desktop + Mobile)

### Favoriten Rückfahrt (FAV-04)
- **D-07:** Bei Klick auf Favorit: Dialog "Mit Rückfahrt?" → Ja: beide Fahrten anlegen, Nein: nur Hinfahrt
- **D-08:** Execute-Endpoint im Backend muss optionalen `mitRueckfahrt`-Parameter akzeptieren

### Nochmal-Buttons (User-Ergänzung)
- **D-09:** Statt nur "Nochmal" zwei Optionen anbieten: "Nochmal" (gleiche Richtung) + "Andere Richtung" (Von/Nach vertauscht)
- **D-10:** Pragmatische Umsetzung: zwei kleine Buttons oder ein Button mit Dialog — Claude entscheidet

### Umlaute (TEXT-01)
- **D-11:** Alle Texte in Frontend und Backend durchgehen: äöüß korrekt schreiben
- **D-12:** Betrifft: Benachrichtigungen, Fehlermeldungen, Labels, Platzhalter, Tooltips
- **D-13:** Auch in PLAN.md und CONTEXT.md Dateien die in der UI landen (NewFeaturesModal etc.)

### Claude's Discretion
- Exaktes Card-Design und Spacing
- Chart-Tooltip-Style
- "Neue Fahrt erfassen"-Design
- Ob Nochmal als 2 Buttons oder als Button mit Dialog

</decisions>

<canonical_refs>
## Canonical References

- `frontend/src/components/Dashboard.js` — Dashboard-Komponente (Phase 11)
- `frontend/src/components/FahrtenListe.js` — Nochmal-Buttons
- `frontend/src/contexts/AppContext.js` — executeFavorit Funktion
- `backend/controllers/favoritController.js` — Execute-Endpoint
- `backend/models/FavoritFahrt.js` — Favoriten-Model

</canonical_refs>

<code_context>
## Existing Code Insights

### Integration Points
- Dashboard.js: Cards hinzufügen, Statistik-Bereich erweitern
- executeFavorit in AppContext: mitRueckfahrt-Parameter durchreichen
- favoritController.js: Execute-Endpoint um Rückfahrt erweitern
- FahrtenListe.js: Nochmal-Buttons um "Andere Richtung" erweitern
- Globale Text-Suche nach fehlerhaften Umlauten (ue, ae, oe, ss statt üäöß)

</code_context>

<deferred>
## Deferred Ideas

None.

</deferred>

---

*Phase: 13-dashboard-polish*
*Context gathered: 2026-03-28*
