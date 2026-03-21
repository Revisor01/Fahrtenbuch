# Fahrtenbuch — Verbesserungen v2

## What This Is

Eine browserbasierte Fahrtenbuch-App für kirchliche Mitarbeitende zur Erfassung und Abrechnung von Dienstfahrten mit Privatfahrzeug. React-Frontend + Express-Backend + MySQL, deployed auf kkd-fahrtenbuch.de. Die App wird aktiv genutzt und funktioniert grundsätzlich — dieses Projekt adressiert konkretes Nutzerfeedback.

## Core Value

Der Excel-Export muss das offizielle Abrechnungsformular korrekt abbilden — mit vollständigem Datum, Unterschriftsfeldern und flexiblem Zeitraum — damit Nutzer die Abrechnung direkt einreichen können ohne manuelle Nacharbeit.

## Requirements

### Validated

- ✓ Fahrtenerfassung mit Start/Ziel, Datum, Reisezweck, Kilometer — existing
- ✓ Automatische Distanzberechnung zwischen gespeicherten Orten — existing
- ✓ Monatlicher Excel-Export als Abrechnungsformular — existing
- ✓ Nutzerverwaltung mit JWT-Auth und Profilpflege (Name, Anschrift, IBAN) — existing
- ✓ Abrechnungsträger (Kostenträger) Verwaltung — existing
- ✓ Mitfahrer-Erfassung mit Erstattungsberechnung — existing
- ✓ E-Mail-Verifizierung und Passwort-Reset — existing

### Active

- ✓ Excel-Export: Datum im Format TT.MM.JJJJ statt TT.MM. — Phase 2
- ✓ Excel-Export: Unterschriftsfelder gemäß offiziellem Formular (eigene Unterschrift + Angeordnet/genehmigt) — Phase 2
- ✓ Excel-Export: Kostenstelle (Kst.) als Zusatzfeld beim Abrechnungsträger — Phase 1
- [ ] Mehrmonats-Export: Zeitraum Von-Bis wählbar statt nur Einzelmonat
- [ ] Mehrmonats-Export: Header zeigt gewählten Zeitraum ("Monat: April bis Juni")
- [ ] Mehrmonats-Export: Logik für "eingereicht"-Status korrekt über Zeiträume
- ✓ Distanz-Aktualisierung: Änderung einer gespeicherten Distanz aktualisiert automatisch alle bestehenden Fahrten mit dieser Strecke — Phase 1

### Out of Scope

- VPN-Erreichbarkeit — Netzwerk-Problem auf Nutzerseite, kein App-Issue
- Mobile App — Web-first reicht für den Anwendungsfall
- Kostenstelle nachträglich in Excel editieren — Nutzer kann das bereits in der App oder Excel selbst

## Context

- App wird von kirchlichen Mitarbeitenden im Kirchenkreis Dithmarschen genutzt
- Nutzerfeedback kam von Joerg (Datumsformat, Distanz-Update), Benjamin (Mehrmonats-Export), Jasmin Reusch (Unterschriftsfeld, Kostenstelle)
- Referenz-PDF von Frau Reusch zeigt das offizielle Abrechnungsformular mit allen Pflichtfeldern
- Die Excel-Export-Logik liegt in `backend/utils/excelExport.js`, Controller in `backend/controllers/fahrtController.js`
- Abrechnungsträger-Model: `backend/models/AbrechnungsTraeger.js`
- Distanzen-Model: `backend/models/Distanz.js`
- Frontend ist ein monolithisches `frontend/src/App.js` (2949 Zeilen) — Änderungen hier vorsichtig

## Constraints

- **Responsive**: Alle UI-Änderungen müssen auf Desktop und Mobile funktionieren
- **Tech Stack**: Bestehender Stack (React, Express, MySQL, exceljs) beibehalten — kein Rewrite
- **Deployment**: Docker Compose auf KKD-Server (185.248.143.234), Caddy Reverse Proxy
- **Datenintegrität**: Distanz-Updates müssen alle betroffenen Fahrten atomar aktualisieren (Transaktion)
- **Abwärtskompatibilität**: Bestehende Einzelmonats-Exports müssen weiterhin funktionieren
- **Excel-Format**: Muss dem offiziellen Dienstfahrten-Abrechnungsformular entsprechen (PDF-Referenz vorhanden)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Distanz-Update wirkt rückwirkend auf alle Fahrten | Nutzerwunsch — falsche Distanzen sollen nicht manuell korrigiert werden müssen | — Pending |
| Kostenstelle als Feld am Abrechnungsträger | Gehört logisch zum Kostenträger, nicht zur einzelnen Fahrt | — Pending |

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
*Last updated: 2026-03-22 after Phase 2 completion*
