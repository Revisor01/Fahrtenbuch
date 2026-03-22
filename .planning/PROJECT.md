# Fahrtenbuch

## What This Is

Eine browserbasierte Fahrtenbuch-App für kirchliche Mitarbeitende zur Erfassung und Abrechnung von Dienstfahrten mit Privatfahrzeug. React-Frontend + Express-Backend + MySQL, deployed auf kkd-fahrtenbuch.de. Unterstützt Einzel- und Mehrmonats-Exporte mit offiziellem Abrechnungsformular, Kostenstellen, Unterschriftsfeldern und flexibler Zeitraum-Auswahl.

## Core Value

Der Excel-Export muss das offizielle Abrechnungsformular korrekt abbilden — mit vollständigem Datum, Unterschriftsfeldern und flexiblem Zeitraum — damit Nutzer die Abrechnung direkt einreichen können ohne manuelle Nacharbeit.

## Requirements

### Validated

- ✓ Fahrtenerfassung mit Start/Ziel, Datum, Reisezweck, Kilometer — existing
- ✓ Automatische Distanzberechnung zwischen gespeicherten Orten — existing
- ✓ Nutzerverwaltung mit JWT-Auth und Profilpflege (Name, Anschrift, IBAN) — existing
- ✓ Abrechnungsträger (Kostenträger) Verwaltung — existing
- ✓ Mitfahrer-Erfassung mit Erstattungsberechnung — existing
- ✓ E-Mail-Verifizierung und Passwort-Reset — existing
- ✓ Kostenstelle als optionales Feld am Abrechnungsträger — v1.0
- ✓ Rückwirkende Distanz-Aktualisierung (atomar, bidirektional) — v1.0
- ✓ Excel-Export mit echtem Datum (TT.MM.JJJJ) — v1.0
- ✓ Excel-Export mit Unterschriftsbereich und Genehmigungszeile — v1.0
- ✓ Excel-Export mit Kostenstelle im Header — v1.0
- ✓ Mehrmonats-Export mit Von/Bis-Zeitraum — v1.0
- ✓ Von/Bis-Zeitraum in Monatsübersicht (gesamte Ansicht adaptiert) — v1.0
- ✓ Eingereicht-Status über Zeiträume korrekt — v1.0

- ✓ Mitfahrer-Erstattungssatz aus DB statt hardcoded — v1.1
- ✓ Debug-Logs entfernt — v1.1
- ✓ Security: helmet, rate-limiting, Error-Sanitization, Body-Size-Limit — v1.1
- ✓ Input-Validierung mit Zod für alle Backend-Controller — v1.1
- ✓ Dependency-Updates (npm audit fix) — v1.1
- ✓ Rückfahrt-Matching robuster — v1.1
- ✓ Axios-Interceptor Race Condition gefixt — v1.1

### Active

(Keine — nächster Milestone definiert neue Ziele)
- Debug-Log-Cleanup

### Out of Scope

- VPN-Erreichbarkeit — Netzwerk-Problem auf Nutzerseite, kein App-Issue
- Mobile App — Web-first reicht, responsive UI deckt mobile Nutzung ab
- Refactoring App.js (2900+ Zeilen) — separates Tech-Debt-Projekt

## Context

- App wird von kirchlichen Mitarbeitenden im Kirchenkreis Dithmarschen genutzt
- v1.0 shipped: 4 Phasen, 7 Plans, 11 Tasks — alle aus konkretem Nutzerfeedback
- Nutzerfeedback von Joerg, Benjamin und Jasmin Reusch vollständig umgesetzt
- Tech Stack: React 18, Express 4, MySQL 8, ExcelJS, Docker Compose
- Deployment: KKD-Server (185.248.143.234), Caddy Reverse Proxy
- CI/CD: GitHub Actions → Docker Hub → `docker-compose pull && up -d`

## Constraints

- **Responsive**: Alle UI-Änderungen müssen auf Desktop und Mobile funktionieren
- **Tech Stack**: React, Express, MySQL, ExcelJS — kein Rewrite
- **Deployment**: Docker Compose auf KKD-Server, Caddy Reverse Proxy
- **Excel-Format**: Offizielles Dienstfahrten-Abrechnungsformular (PDF-Referenz vorhanden)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Distanz-Update wirkt rückwirkend auf alle Fahrten | Nutzerwunsch — falsche Distanzen nicht manuell korrigieren | ✓ Good |
| Kostenstelle als Feld am Abrechnungsträger | Gehört logisch zum Kostenträger, nicht zur Fahrt | ✓ Good |
| Template-basierte Excel-Anpassung statt Code-only | Sauberere Trennung Layout/Daten, einfacher zu pflegen | ✓ Good |
| Von/Bis-Zeitraum direkt in Monatsübersicht | Statt separatem Export-Dialog — eine Stelle steuert alles | ✓ Good |
| Eingereicht-Dialog nach Export | Nutzer entscheidet aktiv, kein automatisches Markieren | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-22 after v1.1 milestone completion*
