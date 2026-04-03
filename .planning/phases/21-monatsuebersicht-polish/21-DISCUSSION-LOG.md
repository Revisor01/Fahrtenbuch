# Phase 21: Monatsübersicht Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 21-monatsuebersicht-polish
**Areas discussed:** Icons entfernen, Farben konfigurierbar, Status-Buttons redesign, Abbrechen-Button, Layout-Fixes
**Mode:** --auto (all decisions from direct user feedback after Phase 20 deployment)

---

## Icons entfernen

| Option | Description | Selected |
|--------|-------------|----------|
| Icons entfernen | Alle Icons aus KPI-Cards raus | ✓ |
| Icons behalten | Icons wie in Phase 20 implementiert | |

**User's choice:** Icons entfernen
**Notes:** User sagte wörtlich: "Die Icons kommen da bitte wieder raus"

---

## Farben konfigurierbar

| Option | Description | Selected |
|--------|-------------|----------|
| In Einstellungen definierbar | Farbe pro Abrechnungsträger konfigurierbar | ✓ |
| Hardcoded bleiben | Farben fest im Code | |

**User's choice:** In Einstellungen definierbar
**Notes:** "Die Farben müssten wir in den Einstellungen definierbar machen"

---

## Status-Buttons redesign

| Option | Description | Selected |
|--------|-------------|----------|
| An Card-Layout anpassen | Echte Buttons mit Hover, Border, Padding | ✓ |
| Status quo | Bestehende status-badge-* Optik | |

**User's choice:** An Card-Layout anpassen
**Notes:** "Die Buttons für Eingereicht/Nicht-Eingereicht müssen stilistisch auch an unser Layout angepasst werden"

---

## Abbrechen-Button

| Option | Description | Selected |
|--------|-------------|----------|
| Richtiger Button | Vollwertiger gestylter Button | ✓ |
| Text-Link | Nur roter Text "Abbrechen" | |

**User's choice:** Richtiger Button
**Notes:** "Das ist hier nur ein Abbrechen in Rot. Das muss ein wirklicher Button sein"

---

## Layout-Fixes

| Option | Description | Selected |
|--------|-------------|----------|
| Alle Fixes umsetzen | Leerzeichen, dynamischer Hintergrund, Kalender-Icons | ✓ |

**User's choice:** Alle Fixes
**Notes:** Leerzeichen zwischen "Jahresübersicht" und "2026", hellblauer Hintergrund dynamisch, Trennstriche nach Monatsnamen durch Kalender-Icons ersetzen

## Claude's Discretion

- Kalender-Icon Variante (Calendar vs CalendarDays)
- Farbpicker-Design in Einstellungen
- Tailwind-Klasse vs inline style für dynamische Farben
- Hover-State der Status-Buttons

## Deferred Ideas

Keine
