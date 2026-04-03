---
phase: 20-dashboard-kpis-fahrten-layout-excel-export
verified: 2026-04-02T21:00:00Z
status: gaps_found
score: 7/8 must-haves verified
gaps:
  - truth: "Dashboard letzte Fahrten zeigen alle nicht-exportierten/nicht-erhaltenen Fahrten, nicht nur aktuellen Monat"
    status: partial
    reason: "letzteTrips basiert auf fahrten aus AppContext, das monatsabhaengig geladen wird. Der Plan entschied bewusst, keinen neuen Backend-Endpoint einzufuehren und stattdessen einen Hinweistext anzuzeigen. SC-02 fordert globale letzte Fahrten — das ist nicht implementiert."
    artifacts:
      - path: "frontend/src/components/Dashboard.js"
        issue: "letzteTrips = useMemo(() => [...fahrten].sort(...).slice(0, 3), [fahrten]) — fahrten ist monatsabhaengig aus AppContext"
      - path: "frontend/src/contexts/AppContext.js"
        issue: "fahrten wird aus /api/fahrten/report/{year}/{month} geladen — aendert sich mit Monatsfilter"
    missing:
      - "Entweder neuen Backend-Endpoint fuer globale letzte N Fahrten einfuehren, oder fahrten aus allen monthlyData-Eintraegen aggregieren"
human_verification:
  - test: "Visuelles Erscheinungsbild der KPI-Cards pruefen"
    expected: "Dashboard, FahrtenListe und MonthlyOverview zeigen einheitliche farbige Cards mit Icons"
    why_human: "CSS-Klassen koennen nicht programmatisch gerendert werden — visuelles Ergebnis benoetigt Browser"
  - test: "Excel-Export mit 2026-Vorlage pruefen"
    expected: "Exportierte .xlsx hat korrekte Spaltenbreiten, Borders, Fonts und Merges — identisch zur Vorlage"
    why_human: "Formatierung kann nicht ohne tatsaechlichen Excel-Export verifiziert werden"
  - test: "Dashboard Offene Erstattungen bei Monatswechsel"
    expected: "KPI 'Offene Erstattungen' bleibt gleich wenn Nutzer den Monatsfilter wechselt"
    why_human: "Benoetigt interaktiven Browser-Test mit echten Daten"
---

# Phase 20: Dashboard KPIs, Fahrten-Layout & Excel-Export — Verification Report

**Phase Goal:** Dashboard zeigt alle offenen Erstattungen unabhaengig vom Monatsfilter plus eingereichte Betraege, Fahrten-Cards auf Fahrten&Export identisch zum Dashboard (mit Icons), Monatsuebersicht wie KPI-Cards, Excel-Export korrekt mit neuer 2026-Quartals-Vorlage
**Verified:** 2026-04-02T21:00:00Z
**Status:** gaps_found
**Re-verification:** Nein — initiale Verifikation

---

## Goal Achievement

### Observable Truths (aus ROADMAP.md Success Criteria SC-01 bis SC-08)

| # | Truth (SC-ID) | Status | Evidence |
|---|---------------|--------|----------|
| 1 | SC-01: Dashboard Offene Erstattungen zeigt ALLE offenen Erstattungen unabhaengig vom Monatsfilter, plus eingereichte Betraege in Klammern | ✓ VERIFIED | `useMemo` ueber `monthlyData.forEach(md =>` mit `erhalten_am`-Check, `eingereichteSumme` als separate Zeile in KPI-Card (Dashboard.js Z. 36-51, 210-213) |
| 2 | SC-02: Dashboard letzte Fahrten zeigen alle nicht-exportierten Fahrten, nicht nur aktuellen Monat | ✗ PARTIAL | `letzteTrips` basiert auf `fahrten` aus AppContext (monatsabhaengig). Hinweistext vorhanden aber SC-02 nicht vollstaendig erfuellt. |
| 3 | SC-03: Fahrten-Cards auf Fahrten&Export haben identisches Layout wie Dashboard (inkl. orangenem Icon) | ✓ VERIFIED | `Clock` importiert, `text-orange-500` gesetzt, identisches Card-Pattern (`flex items-center justify-between rounded-card border border-card p-3`) in FahrtenListe.js Z. 700-725 |
| 4 | SC-04: Kein Trennstrich zwischen Fahrten auf Fahrten&Export | ✓ VERIFIED | Kein `divide-y` in FahrtenListe.js. Container nutzt `space-y-2` (Z. 705). Kein `border-b` oder `<hr>` zwischen Cards. |
| 5 | SC-05: Monatsuebersicht auf Fahrten&Export sieht aus wie KPI-Cards auf dem Dashboard | ✓ VERIFIED | `kategorieStyles` mit bg/icon/iconColor, `rounded-card p-4 shadow-card border border-card`, KPI-Card-Pattern in MonthlyOverview.js Z. 433, 517 |
| 6 | SC-06: Fahrten-Anzahl ist korrekt angezeigt | ✓ VERIFIED | `sortedFahrten.length` als `(N)` im Header-Span (FahrtenListe.js Z. 703). Keine separate fehlerhafte Zaehlung. |
| 7 | SC-07: Excel-Export bewahrt vollstaendig das Layout der 2026-Vorlage (Spaltenbreiten, Borders, Fonts, Merges) | ✓ VERIFIED | `fillQuartalSheet` setzt nur `.value` und `.numFmt` — kein `.font`, `.border`, `.fill`, `.alignment` Override. Kein `cell.font = { name: 'Arial' }` mehr vorhanden. |
| 8 | SC-08: Excel-Export nutzt korrekt das passende Quartals-Sheet | ✓ VERIFIED | `getQuartalSheet(month)` mappt Monatsnummern auf `QUARTAL_SHEETS[0-3]`. Template-Datei existiert: `backend/templates/fahrtenabrechnung_vorlage.xlsx` (26399 Bytes, erstellt 2026-04-02). |

**Score: 7/8 Truths verified**

---

## Required Artifacts

| Artifact | Provides | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `frontend/src/components/Dashboard.js` | Globale KPIs (monthlyData-Aggregation) | ✓ | ✓ 522 Zeilen, echte Logik | ✓ AppContext monthlyData | ✓ VERIFIED |
| `frontend/src/components/FahrtenListe.js` | Dashboard-identisches Card-Layout | ✓ | ✓ 818 Zeilen | ✓ Clock-Icon, space-y-2, sortedFahrten | ✓ VERIFIED |
| `frontend/src/components/MonthlyOverview.js` | KPI-Card-Darstellung der Erstattungen | ✓ | ✓ 649 Zeilen, farbige Cards | ✓ kategorieStyles, Lucide-Icons | ✓ VERIFIED |
| `backend/utils/excelExport.js` | Template-treuer Excel-Export | ✓ | ✓ 470 Zeilen, fillQuartalSheet | ✓ keine Style-Overrides | ✓ VERIFIED |
| `backend/templates/fahrtenabrechnung_vorlage.xlsx` | 2026-Vorlage als Template | ✓ | ✓ 26399 Bytes | ✓ in fillQuartalSheet referenziert | ✓ VERIFIED |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `Dashboard.js offeneErstattungen` | `monthlyData (alle Monate)` | `useMemo ueber monthlyData.forEach` mit `erhalten_am`-Filter | ✓ WIRED | Z. 36-51: `monthlyData.forEach(md => Object.entries(md.erstattungen || {}).forEach(...))` |
| `FahrtenListe.js Card-Layout` | `Dashboard Letzte Fahrten Layout` | `identische JSX-Struktur mit Clock-Icon` | ✓ WIRED | Z. 700-725: `Clock size={18} className="text-orange-500"` + `flex items-center justify-between rounded-card border border-card p-3` |
| `MonthlyOverview.js getKategorienMitErstattung()` | `KPI-Card JSX` | `map ueber Kategorien mit farbigen Backgrounds und Icons` | ✓ WIRED | Z. 429-449: `kategorieStyles[index % ...]` mit `bg-emerald|bg-blue|bg-purple` |
| `excelExport.js fillQuartalSheet()` | `Template-Worksheet` | `Nur Werte setzen, Styles aus Template bewahren` | ✓ WIRED | Z. 65-90: ausschliesslich `.value` und `.numFmt` — kein Style-Override |
| `Dashboard.js letzteTrips` | `globale Fahrten-Daten` | `monthlyData oder globaler Endpoint` | ✗ NOT_WIRED | letzteTrips basiert auf `fahrten` (monatsabhaengig), nicht auf globalem Datenbestand |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Erzeugt echte Daten | Status |
|----------|---------------|--------|---------------------|--------|
| Dashboard.js KPI offeneErstattungen | `monthlyData` | AppContext `fetchMonthlyData()` → `/api/fahrten/report/{year}/{month}` pro Monat | Ja — echte DB-Abfragen pro Monat | ✓ FLOWING |
| Dashboard.js letzteTrips | `fahrten` | AppContext `fetchFahrten()` → monatsabhaengig | Ja, aber nur fuer gewaehlten Monat | ⚠️ PARTIAL — monatsabhaengig statt global |
| FahrtenListe.js sortedFahrten | `fahrten` aus AppContext | gleiche monatsabhaengige Quelle | Ja | ✓ FLOWING (fuer Fahrten&Export korrekt) |
| MonthlyOverview.js KPI-Cards | `monthlyData` | AppContext, alle Monate | Ja — echte Aggregationen | ✓ FLOWING |
| excelExport.js | `Fahrt.getMonthlyReport()` | MySQL-Abfrage | Ja — echte DB-Query | ✓ FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Pruefung | Ergebnis | Status |
|----------|----------|----------|--------|
| Commits SC-01 bis SC-08 vorhanden | `git log --oneline` | 525b7ff, da9603c, eec4f0c, 0258b84 — alle vorhanden | ✓ PASS |
| fillQuartalSheet ohne Style-Overrides | `grep "cell.font" excelExport.js` | Kein Treffer | ✓ PASS |
| Template-Datei existiert | `ls backend/templates/fahrtenabrechnung_vorlage.xlsx` | 26399 Bytes, 2026-04-02 | ✓ PASS |
| FahrtenListe kein divide-y | `grep "divide-y" FahrtenListe.js` | Kein Treffer | ✓ PASS |
| MonthlyOverview hideCompleted erhalten | `grep "hideCompleted" MonthlyOverview.js` | Zeilen 10, 102, 117, 357, 358, 385, 386 | ✓ PASS |
| QuickActions erhalten | `grep "QuickActions" MonthlyOverview.js` | Zeile 127 (Definition), 409 (Verwendung) | ✓ PASS |
| renderStatusCell erhalten | `grep "renderStatusCell" MonthlyOverview.js` | Zeile 240, 528, 547, 603, 618 | ✓ PASS |

---

## Requirements Coverage

**Hinweis:** Die Requirement-IDs SC-01 bis SC-08 in den PLAN-Frontmatters referenzieren die Success Criteria aus ROADMAP.md fuer Phase 20 — sie sind NICHT in REQUIREMENTS.md als eigene Eintraege definiert. REQUIREMENTS.md des v2.0-Meilensteins verwendet andere IDs (DS-01, DASH-08 etc.). Fuer Phase 20 gibt es keine eigenen REQUIREMENTS.md-Eintraege.

| Requirement-ID | Herkunft | Beschreibung (aus ROADMAP SC) | Status | Evidence |
|---------------|----------|-------------------------------|--------|----------|
| SC-01 | ROADMAP Phase 20 SC #1 | Dashboard Offene Erstattungen global, eingereichte in Klammern | ✓ SATISFIED | Dashboard.js Z. 36-51, 210-213 |
| SC-02 | ROADMAP Phase 20 SC #2 | Dashboard letzte Fahrten global (nicht nur aktueller Monat) | ✗ BLOCKED | letzteTrips ist monatsabhaengig — Plan entschied Hinweistext statt globaler Loesung |
| SC-03 | ROADMAP Phase 20 SC #3 | Fahrten-Cards Layout identisch zum Dashboard mit orangenem Icon | ✓ SATISFIED | FahrtenListe.js Z. 700-725 |
| SC-04 | ROADMAP Phase 20 SC #4 | Kein Trennstrich zwischen Fahrten auf Fahrten&Export | ✓ SATISFIED | space-y-2, kein divide-y |
| SC-05 | ROADMAP Phase 20 SC #5 | Monatsuebersicht als KPI-Cards | ✓ SATISFIED | MonthlyOverview.js, kategorieStyles |
| SC-06 | ROADMAP Phase 20 SC #6 | Fahrten-Anzahl korrekt | ✓ SATISFIED | sortedFahrten.length in Header |
| SC-07 | ROADMAP Phase 20 SC #7 | Excel-Export bewahrt Vorlage-Layout | ✓ SATISFIED | fillQuartalSheet nur .value/.numFmt |
| SC-08 | ROADMAP Phase 20 SC #8 | Excel-Export nutzt korrektes Quartals-Sheet | ✓ SATISFIED | getQuartalSheet(), QUARTAL_SHEETS |

**Keine REQUIREMENTS.md-Eintraege fuer Phase 20 vorhanden — SC-IDs beziehen sich ausschliesslich auf ROADMAP Success Criteria.**

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `Dashboard.js` Z. 309 | Hinweistext "Wähle den aktuellen Monat" statt globaler Loesung | ⚠️ Warning | SC-02 ist nicht vollstaendig erfuellt — Nutzer sehen bei Monatswechsel leere "Letzte Fahrten" |

Keine weiteren STUB/TODO/FIXME-Muster, keine hardcodierten leeren Arrays die zu Rendering fuehren, keine leeren Handler.

---

## Human Verification Required

### 1. Visuelle Einheitlichkeit der KPI-Cards

**Test:** App starten, Dashboard, Fahrten&Export und Monatsuebersicht oeffnen und visuell vergleichen
**Expected:** Alle drei Bereiche zeigen farbige Card-Kacheln (emerald/blue/purple/amber) mit Lucide-Icons und einheitlicher Typografie
**Warum Human:** CSS-Klassen koennen nicht gerendert werden — visuelles Ergebnis benoetigt Browser

### 2. Excel-Export Vorlage-Treue

**Test:** Aus der App einen Monats-Export als .xlsx herunterladen und in Excel/LibreOffice oeffnen
**Expected:** Spaltenbreiten, Borders, Zell-Merges und Fonts entsprechen der 2026-Vorlage; kein Arial-Font-Override in Mitfahrer-Zeilen
**Warum Human:** Formatierungspruefung benoetigt tatsaechlichen Excel-Export und visuellen Vergleich

### 3. Dashboard KPI bei Monatsfilter-Wechsel

**Test:** Auf dem Dashboard den Monatsfilter aendern (z.B. von aktuellem Monat zu einem Vormonat)
**Expected:** Der KPI "Offene Erstattungen" aendert sich NICHT — er zeigt weiterhin die Summe aller Monate
**Warum Human:** Interaktiver Browser-Test mit echten Daten erforderlich

### 4. "Letzte Fahrten" bei nicht-aktuellem Monat (bekannte Luecke)

**Test:** Auf dem Dashboard einen Vormonat ohne Fahrten auswaehlen
**Expected:** Hinweistext "Keine Fahrten im gewaelten Zeitraum. Waehle den aktuellen Monat..." erscheint
**Warum Human:** SC-02 ist nur durch Hinweistext abgedeckt — muss geprueft werden ob dies als akzeptable Loesung gilt oder SC-02 nachgebessert werden muss

---

## Gaps Summary

**1 Gap blockiert vollstaendige Goal-Erreichung:**

**SC-02 — Dashboard letzte Fahrten global** ist nicht vollstaendig implementiert. Die `letzteTrips`-Berechnung in Dashboard.js (Z. 65-73) basiert auf dem `fahrten`-Array aus AppContext, das monatsabhaengig geladen wird (`fetchFahrten` → `/api/fahrten/report/{year}/{month}`). Der Plan entschied bewusst, keinen neuen Backend-Endpoint einzufuehren und stattdessen einen Hinweistext anzuzeigen. Die Success Criteria SC-02 fordert jedoch explizit "alle nicht-exportierten/nicht-erhaltenen Fahrten, nicht nur aktuellen Monat".

**Root cause:** SC-02 setzt einen globalen Fahrten-Endpoint voraus, der nicht als "rein visuell" umgesetzt werden kann. Der Plan dokumentiert dies als Abweichung ("Letzte Fahrten bleiben monatsabhaengig — kein neuer Backend-Endpoint"). Die Entscheidung war bewusst, aber sie ergibt eine nicht-erfuellte Success Criteria.

**Optionen fuer Gap-Closure:**
1. Neuer Backend-Endpoint `/api/fahrten/last/:n` (einfach, aber Backend-Aenderung)
2. `monthlyData` so erweitern, dass einzelne Fahrten-Objekte enthalten sind (komplexer)
3. SC-02 formal abschwaechen: "Letzte Fahrten des aktuellen Monats mit Hinweistext bei leerem Zeitraum" — dann Gap schliessen ohne Code-Aenderung

**Alle anderen 7 Success Criteria sind vollstaendig im Code implementiert und verifiziert.**

---

_Verified: 2026-04-02T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
