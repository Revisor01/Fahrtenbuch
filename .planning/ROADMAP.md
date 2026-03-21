# Roadmap: Fahrtenbuch v2

## Overview

Drei Phasen, die aufeinander aufbauen: Zuerst das Datenmodell erweitern (Kostenstelle, Distanz-Update), dann den Excel-Export korrekt an das offizielle Formular anpassen, und schliesslich den Mehrmonats-Export als neues Feature aufsetzen. Jede Phase liefert einen eigenstaendigen, verifizierbaren Mehrwert.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Datenmodell & Logik** - Kostenstelle am Abrechnungstraeger und rueckwirkende Distanz-Aktualisierung
- [ ] **Phase 2: Excel-Export Formular** - Export bildet das offizielle Abrechnungsformular korrekt ab
- [ ] **Phase 3: Mehrmonats-Export** - Flexibler Zeitraum statt Einzelmonat

## Phase Details

### Phase 1: Datenmodell & Logik
**Goal**: Nutzer koennen Kostenstellen pflegen und Distanzen aendern, ohne bestehende Fahrten manuell korrigieren zu muessen
**Depends on**: Nothing (first phase)
**Requirements**: ABRTR-01, DATA-01
**Success Criteria** (what must be TRUE):
  1. Nutzer kann beim Abrechnungstraeger ein optionales Kostenstelle-Feld ausfuellen und speichern
  2. Kostenstelle erscheint in der Abrechnungstraeger-Uebersicht und im Bearbeitungsdialog
  3. Wenn ein Nutzer eine gespeicherte Distanz aendert, werden alle bestehenden Fahrten mit dieser Strecke automatisch auf den neuen Kilometerwert aktualisiert
  4. Die Distanz-Aktualisierung laeuft atomar in einer Transaktion (keine Teilupdates bei Fehler)
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Kostenstelle-Feld am Abrechnungstraeger (DB, API, UI)
- [x] 01-02-PLAN.md — Rueckwirkende Distanz-Aktualisierung mit Transaktion

### Phase 2: Excel-Export Formular
**Goal**: Der Excel-Export entspricht dem offiziellen Dienstfahrten-Abrechnungsformular und kann ohne manuelle Nacharbeit eingereicht werden
**Depends on**: Phase 1
**Requirements**: EXCEL-01, EXCEL-02, EXCEL-03, EXCEL-04
**Success Criteria** (what must be TRUE):
  1. Das Datum jeder Fahrt erscheint im Export im Format TT.MM.JJJJ (z.B. 15.03.2026)
  2. Am Ende des Exports steht eine Unterschriftszeile mit Datumsfeld
  3. Am Ende des Exports steht eine Genehmigungszeile "Angeordnet/genehmigt Unterschrift: ___"
  4. Im Excel-Header wird neben dem Kostentraeger die Kostenstelle (Kst.) angezeigt, sofern hinterlegt
**Plans**: 1 plan

Plans:
- [x] 02-01-PLAN.md — Datum-Format, Kostenstelle im Header, Unterschriftsbereich komplett

### Phase 3: Mehrmonats-Export
**Goal**: Nutzer koennen einen Zeitraum ueber mehrere Monate exportieren statt nur einen Einzelmonat
**Depends on**: Phase 2
**Requirements**: MULTI-01, MULTI-02, MULTI-03
**Success Criteria** (what must be TRUE):
  1. Im Export-Dialog kann der Nutzer Von-Monat und Bis-Monat auswaehlen
  2. Der Excel-Header zeigt den gewaehlten Zeitraum korrekt an (z.B. "Monat: April bis Juni")
  3. Der bestehende Einzelmonats-Export funktioniert weiterhin unveraendert
  4. Der "Eingereicht"-Status wird korrekt auf den gesamten gewaehlten Zeitraum angewendet
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Datenmodell & Logik | 0/2 | Planned | - |
| 2. Excel-Export Formular | 0/1 | Planned | - |
| 3. Mehrmonats-Export | 0/? | Not started | - |
