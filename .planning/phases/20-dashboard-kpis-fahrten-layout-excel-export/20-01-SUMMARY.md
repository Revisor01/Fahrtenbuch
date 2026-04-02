---
phase: 20-dashboard-kpis-fahrten-layout-excel-export
plan: 01
subsystem: frontend
tags: [dashboard, kpis, fahrten-layout, ui]
dependency_graph:
  requires: []
  provides: [global-kpis, unified-card-layout]
  affects: [Dashboard.js, FahrtenListe.js]
tech_stack:
  added: []
  patterns: [monthlyData-aggregation, eingereichteSumme-display]
key_files:
  created: []
  modified:
    - frontend/src/components/Dashboard.js
    - frontend/src/components/FahrtenListe.js
decisions:
  - "Offene Erstattungen aus monthlyData statt summary berechnet (global ueber alle Monate)"
  - "Eingereichte Betraege als separate Zeile in Klammern im KPI-Card"
  - "Letzte Fahrten bleiben monatsabhaengig (kein neuer Backend-Endpoint), Hinweistext bei leerem Zeitraum"
  - "Fahrten-Header mit orangenem Clock-Icon statt border-b Trennlinie"
metrics:
  duration: 109s
  completed: "2026-04-02"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 20 Plan 01: Dashboard KPIs & Fahrten-Layout Summary

Dashboard KPIs zeigen globale offene Erstattungen (alle Monate via monthlyData, erhalten_am gefiltert) mit eingereichten Betraegen in Klammern. Fahrten-Cards auf Fahrten&Export haben identisches Layout wie Dashboard Letzte Fahrten.

## What Changed

### Task 1: Dashboard KPIs von Monatsfilter entkoppeln (525b7ff)
- `offeneErstattungen` berechnet jetzt aus `monthlyData` statt `summary.erstattungen` -- aggregiert ueber ALLE Monate
- Nur Erstattungen ohne `erhalten_am` werden gezaehlt (wirklich offen)
- Eingereichte Betraege (`eingereicht_am` vorhanden aber kein `erhalten_am`) werden als separate Zeile in Klammern angezeigt
- Hinweistext bei leerem Zeitraum verbessert: "Waehle den aktuellen Monat fuer die neuesten Fahrten"

### Task 2: Fahrten-Cards an Dashboard angleichen (da9603c)
- `Clock` Icon aus lucide-react importiert
- Fahrten-Header mit orangenem Clock-Icon (`text-orange-500`) statt border-b Trennlinie
- Fahrten-Anzahl als `(N)` im Header angezeigt mit `sortedFahrten.length`
- Card-Layout bereits identisch zum Dashboard Pattern (`rounded-card border border-card p-3`)
- Kein `divide-y` oder sonstige Separatoren zwischen Cards

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- alle Datenquellen sind korrekt verdrahtet.

## Checkpoint

Task 3 ist ein `checkpoint:human-verify` -- visuelle Pruefung erforderlich.
