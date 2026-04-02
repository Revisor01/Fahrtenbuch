# Phase 19: Dashboard & Listen Feinschliff - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 19-dashboard-listen-feinschliff
**Areas discussed:** Inline-Bearbeitung, Fahrtenliste Cards, Verwaltung-Tab Design, Polish-Issues

---

## Inline-Bearbeitung

| Option | Description | Selected |
|--------|-------------|----------|
| Formular einblenden | Klick auf Bearbeiten blendet FahrtForm direkt im Dashboard ein, vorausgefüllt | ✓ |
| Modal/Overlay | FahrtForm als Modal über dem Dashboard | |
| Inline-Felder direkt | Felder der Fahrt-Card werden direkt editierbar | |

**User's choice:** Formular einblenden
**Notes:** Konsistent mit bestehendem Dashboard-Formular

### Position des Formulars

| Option | Description | Selected |
|--------|-------------|----------|
| Card ersetzen | Die Fahrt-Card wird zum Formular — spart Platz | ✓ |
| Darunter einblenden | Formular erscheint unter der angeklickten Card | |
| Oben im Formular-Bereich | Bestehendes Dashboard-Formular wechselt in Edit-Modus | |

**User's choice:** Card ersetzen

---

## Fahrtenliste Cards

| Option | Description | Selected |
|--------|-------------|----------|
| Cards wie Dashboard | Gleiches Card-Layout wie 'Letzte Fahrten' auf dem Dashboard | ✓ |
| Kompakte Liste | Einzeilige Einträge mit wichtigsten Infos | |
| Tabelle behalten | Bestehende Tabelle visuell aufwerten | |

**User's choice:** Cards wie Dashboard

### Inline-Edit in Fahrtenliste

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, gleich wie Dashboard | Card wird zum Formular beim Bearbeiten | ✓ |
| Nein, nur auf Dashboard | Weiterhin per Navigation/Modal bearbeiten | |
| Du entscheidest | Claude wählt basierend auf technischer Machbarkeit | |

**User's choice:** Ja, gleich wie Dashboard

---

## Verwaltung-Tab Design

| Option | Description | Selected |
|--------|-------------|----------|
| Card pro User | Jeder User als eigene Card mit Name, E-Mail, Rolle, Status | ✓ |
| Tabelle mit Card-Wrapper | User-Tabelle in card-container eingebettet | |
| Du entscheidest | Claude wählt basierend auf Settings-Design | |

**User's choice:** Card pro User

### Bulk-Aktionen

| Option | Description | Selected |
|--------|-------------|----------|
| Nein, einzeln reicht | Bei wenigen Usern sind Bulk-Aktionen überflüssig | ✓ |
| Ja, mit Checkboxen | Checkboxen pro User, Sammelaktionen in Toolbar | |

**User's choice:** Nein, einzeln reicht

---

## Polish-Issues

### Statistik-Diagramm

| Option | Description | Selected |
|--------|-------------|----------|
| Du entscheidest | Claude debuggt das Rendering-Problem | |
| Lazy-Render mit Observer | IntersectionObserver — Chart erst rendern wenn sichtbar | |
| Loading-Skeleton | Skeleton-Platzhalter zeigen bis Daten geladen | |

**User's choice:** (Other) Bug ist bereits gefixt. Nur Animation wiederherstellen.
**Notes:** Falscher API-Aufruf war die Ursache. Animation kann wieder reingeschrieben werden.

### Button-Farbschema

| Option | Description | Selected |
|--------|-------------|----------|
| Dunkelblau/Hellblau/Rot | Primär dunkelblau, Sekundär hellblau, Destruktiv rot | ✓ |
| Du entscheidest | Claude prüft und vereinheitlicht | |

**User's choice:** Dunkelblau/Hellblau/Rot

---

## Claude's Discretion

- Konkrete Card-Anordnung und Spacing
- Filter/Sort-Positionierung in der Fahrtenliste
- Chart-Animationsdetails (Dauer, Easing)

## Deferred Ideas

None
