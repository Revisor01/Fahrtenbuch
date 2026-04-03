# Phase 21: Monatsübersicht Polish - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Monatsübersicht visuell aufräumen — Icons entfernen, Farben pro Abrechnungsträger konfigurierbar machen, Status-Buttons und Abbrechen-Button stilistisch anpassen, Layout-Fixes (Leerzeichen, Hintergrundfarben dynamisch, Trennstriche durch Kalender-Icons ersetzen).

</domain>

<decisions>
## Implementation Decisions

### Icons entfernen
- **D-01:** Alle Icons (Building2, Wallet, Banknote, Users) aus den Erstattungs-KPI-Cards in der Monatsübersicht entfernen — sowohl Jahresübersicht als auch Monats-Cards
- **D-02:** Die `kategorieStyles` und `mitfahrerStyle` Arrays vereinfachen — nur noch Farben, keine Icons mehr
- **D-03:** Lucide-Icon-Imports (Building2, Wallet, Banknote) entfernen wenn sie nicht mehr gebraucht werden

### Farben konfigurierbar
- **D-04:** Farbe pro Abrechnungsträger soll in den Einstellungen definierbar sein (nicht hardcoded im Code)
- **D-05:** Backend: `abrechnungstraeger` Tabelle um `farbe` Feld erweitern (z.B. als CSS-Klasse oder Hex-Wert)
- **D-06:** Frontend: Farbwert aus dem Abrechnungsträger-Objekt lesen statt aus dem `kategorieStyles`-Array
- **D-07:** Fallback-Farbe wenn keine Farbe gesetzt (z.B. neutral grau oder primärfarbe)

### Status-Buttons redesign
- **D-08:** Die `status-badge-*` Buttons (Nicht eingereicht, Eingereicht am, Erhalten am) stilistisch an das Card-Design anpassen
- **D-09:** Status-Buttons sollen wie echte Buttons aussehen (mit klarem Hover-State, Padding, Border)
- **D-10:** Farbliche Unterscheidung beibehalten: Nicht-eingereicht=Warnung, Eingereicht=Info, Erhalten=Erfolg

### Abbrechen-Button im AbrechnungsStatusModal
- **D-11:** Der Abbrechen-Button im Modal (`AbrechnungsStatusModal.js`) muss ein richtiger, gestylter Button sein — nicht nur roter Text
- **D-12:** Er nutzt bereits `btn-secondary w-full` — das CSS für `btn-secondary` muss geprüft und ggf. aufgewertet werden damit er als vollwertiger Button erscheint (Background, Border, Hover)

### Layout-Fixes
- **D-13:** "Jahresübersicht" und Jahr (z.B. "2026") brauchen ein Leerzeichen dazwischen — aktuell fehlt es (Zeile 338-339: separates `<h2>` und `<p>` Element)
- **D-14:** Der hellblaue Hintergrund der Monatsübersicht-Cards muss dynamisch an die konfigurierte Farbe des Abrechnungsträgers angepasst werden
- **D-15:** Die langen Trennstriche nach Monatsnamen (border-b border-primary-100, Zeile 489) entfernen und durch Kalender-Icons ersetzen
- **D-16:** Monats-Header soll ein Kalender-Icon (Calendar oder CalendarDays aus Lucide) statt eines Trennstrichs haben

### Claude's Discretion
- Welches Kalender-Icon genau (Calendar vs CalendarDays vs CalendarRange)
- Wie der Farbpicker in den Einstellungen aussieht (vordefinierte Palette vs freier Hex-Input)
- Ob die Farbe als Tailwind-Klasse oder als inline style angewendet wird
- Genauer Hover-State der redesignten Status-Buttons

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Monatsübersicht
- `frontend/src/components/MonthlyOverview.js` — Hauptkomponente mit kategorieStyles, renderStatusCell, Jahresübersicht und Monats-Cards
- `frontend/src/AbrechnungsStatusModal.js` — Modal für "als eingereicht/erhalten markieren" mit Abbrechen-Button

### Design System
- `frontend/src/index.css` — Design-Tokens, btn-secondary, btn-primary, status-badge-* Klassen, card-container

### Backend
- `backend/models/AbrechnungsTraeger.js` — Model für Abrechnungsträger (braucht Farbe-Feld)
- `backend/controllers/abrechnungstraegerController.js` — API für Abrechnungsträger CRUD

### Einstellungen
- `frontend/src/components/Settings.js` — Einstellungen-Seite (Abrechnungsträger-Verwaltung)
- `frontend/src/components/AbrechnungstraegerForm.js` — Formular für Abrechnungsträger (Farbe hinzufügen)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `btn-secondary` CSS-Klasse in index.css — bereits vorhanden, aber visuell möglicherweise zu schwach
- `status-badge-primary`, `status-badge-secondary` — bestehende Badge-Klassen
- `card-container`, `card-container-highlight` — Card-Pattern
- Lucide Icons bereits im Projekt (Calendar, CalendarDays verfügbar)

### Established Patterns
- Abrechnungsträger werden über AppContext geladen und sind in allen Komponenten verfügbar
- KPI-Cards nutzen `rounded-card p-4 shadow-card border border-card` Pattern
- Farben aktuell hardcoded in `kategorieStyles` Array (emerald, blue, purple, amber)

### Integration Points
- `AbrechnungsTraeger` DB-Tabelle: neues `farbe` Feld (Migration nötig)
- `AbrechnungstraegerForm.js`: Farbwahl-Widget hinzufügen
- `MonthlyOverview.js kategorieStyles`: von hardcoded auf dynamisch aus Abrechnungsträger-Daten umstellen
- `renderStatusCell()`: Button-Styling überarbeiten

</code_context>

<specifics>
## Specific Ideas

- User: "Die Icons kommen da bitte wieder raus" — eindeutig, alle Icons aus KPI-Cards entfernen
- User: "Die Farben müssten wir in den Einstellungen definierbar machen" — pro Abrechnungsträger
- User: "Buttons für Eingereicht/Nicht-Eingereicht stilistisch auch an unser Layout angepasst werden"
- User: "Der Abbrechen-Button ist nur ein Abbrechen in Rot. Das muss ein wirklicher Button sein"
- User: "Jahresübersicht und dann kein Leerzeichen zu 2026"
- User: "Der Hintergrund dieses hellblau muss auch dynamisch angepasst werden"
- User: "Nach März und nach Februar steht immer ein langer Strich. Da kommen überall Kalendereignisse hin" — Trennstriche durch Kalender-Icons ersetzen

</specifics>

<deferred>
## Deferred Ideas

None — alle genannten Punkte liegen im Phase-Scope

</deferred>

---

*Phase: 21-monatsuebersicht-polish*
*Context gathered: 2026-04-03*
