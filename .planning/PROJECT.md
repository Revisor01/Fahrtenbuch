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
- ✓ Einstellungen als Tab in der Hauptnavigation (statt Modal) — Phase 14
- ✓ Benutzerverwaltung als Admin-Tab in der Hauptnavigation — Phase 14

- ✓ Mitfahrer-Erstattungssatz aus DB statt hardcoded — v1.1
- ✓ Debug-Logs entfernt — v1.1
- ✓ Security: helmet, rate-limiting, Error-Sanitization, Body-Size-Limit — v1.1
- ✓ Input-Validierung mit Zod für alle Backend-Controller — v1.1
- ✓ Dependency-Updates (npm audit fix) — v1.1
- ✓ Rückfahrt-Matching robuster — v1.1
- ✓ Axios-Interceptor Race Condition gefixt — v1.1

- ✓ App.js aufgeteilt: 3056 → 36 Zeilen (5 modulare Komponenten) — v1.2
- ✓ PDF-Export als Alternative zu Excel (A4 Querformat, druckfertig) — v1.2
- ✓ Export-Dialog mit Format-Auswahl (Excel/PDF/Beide als ZIP) — v1.2

- ✓ Dashboard als neue Startseite (KPIs, Schnelleingabe, Favoriten, letzte Fahrten) — v1.3
- ✓ Favoriten-Fahrten speichern und mit einem Klick wiederholen — v1.3
- ✓ "Nochmal für heute" bei letzten Fahrten — v1.3
- ✓ Jahres-Statistik mit Balkendiagramm (km pro Monat, Erstattungen) — v1.3
- ✓ Adress-Autocomplete bei Ort-Eingabe (OpenStreetMap/Nominatim) — v1.3

- ✓ Einstellungen als eigener Tab statt Modal — v1.4
- ✓ Benutzerverwaltung (Admin) als Tab statt Button — v1.4
- ✓ Dashboard-Polish (Cards, Statistik-Integration, Formular-Redesign) — v1.4
- ✓ Favoriten mit Rückfahrt-Dialog — v1.4
- ✓ Umlaute korrigiert in allen Texten — v1.4

- ✓ Inline-Bearbeitung und Löschen direkt auf dem Dashboard — v2.0 Phase 19
- ✓ Fahrtenliste als Card-Layout statt Tabelle — v2.0 Phase 19
- ✓ Verwaltung-Tab mit Card-Design wie Einstellungen — v2.0 Phase 19
- ✓ Statistik-Chart-Animation wiederhergestellt — v2.0 Phase 19
- ✓ Button-Farbschema konsistent (dunkelblau/hellblau/rot) — v2.0 Phase 19

### Active

- [ ] Globale Pattern-Bereinigung: btn-Hoehen, Card-Backgrounds, Design-Tokens
- [ ] FahrtenListe auf Dashboard-Niveau bringen
- [ ] Monatsuebersicht ueberdenken (Naming, Desktop/Mobile zusammenfuehren)
- [ ] Einstellungen: Form-Sections mit Icons, visuelle Konsistenz
- [ ] Navigation pruefen: Tab-Namen, Aufteilung

## Current Milestone: v2.1 UI-Konsistenz & View-Architektur

**Goal:** Alle Views auf Dashboard-Niveau — einheitliche Patterns, saubere Struktur, sinnvolle Navigation. Das Vorhandene konsequent zu Ende bringen.

**Target features:**
- Globale Pattern-Bereinigung (btn-Hoehen, Card-Backgrounds, Design-Tokens statt hardcoded Farben)
- FahrtenListe auf Dashboard-Niveau (Section-Headers mit Icons, saubere Card-Struktur)
- Monatsuebersicht ueberdenken (Naming, Desktop/Mobile-Doppelrendering zusammenfuehren, Section-Icons)
- Einstellungen aufraeumen (Form-Sections mit Icons, visuelle Konsistenz in allen 8 Sub-Tabs)
- Navigation pruefen (Tab-Namen, Aufteilung sinnvoll?)

### Out of Scope

- VPN-Erreichbarkeit — Netzwerk-Problem auf Nutzerseite, kein App-Issue
- Mobile App — Web-first reicht, responsive UI deckt mobile Nutzung ab
- Refactoring App.js (2900+ Zeilen) — separates Tech-Debt-Projekt

## Context

- App wird von kirchlichen Mitarbeitenden im Kirchenkreis Dithmarschen genutzt
- v2.0 shipped: 7 Phasen, 17 Plans — komplettes visuelles Redesign mit Design-Tokens, Card-System, Dark Mode
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
*Last updated: 2026-04-04 after v2.0 — starting v2.1 UI-Konsistenz & View-Architektur*
