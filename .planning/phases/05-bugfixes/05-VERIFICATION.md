---
phase: 05-bugfixes
verified: 2026-03-22T11:15:00Z
status: passed
score: 3/3 must-haves verified
re_verification: false
---

# Phase 05: Bugfixes — Verification Report

**Phase Goal:** Korrektes Verhalten bei Erstattungen, Rueckfahrten und Token-Refresh
**Verified:** 2026-03-22T11:15:00Z
**Status:** passed
**Re-verification:** Nein — initiale Verifikation

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                               | Status     | Evidence                                                                 |
|----|-----------------------------------------------------------------------------------------------------|------------|--------------------------------------------------------------------------|
| 1  | Mitfahrer-Erstattung in der Monatsuebersicht wird mit dem DB-Satz berechnet, nicht mit 0,05        | VERIFIED | `getMitfahrerSatz` in `getMonthlyOverview`, DB-Query Zeile 450-459, Nutzung Zeile 477 |
| 2  | Rueckfahrt-Matching findet die passende Hinfahrt auch wenn Ort-IDs nicht exakt uebereinstimmen     | VERIFIED | Orts-Namen-Fallback in `findErgaenzendeFahrt`, Zeilen 788-794 und 805-811 |
| 3  | Parallele 401-Responses fuehren nur zu einem einzigen Logout, nicht zu Race Conditions             | VERIFIED | `isLoggingOut = useRef(false)` Zeile 48, Guard Zeilen 128-131, Reset Zeile 167 |

**Score:** 3/3 Truths verified

---

### Required Artifacts

| Artifact                                      | Erwartete Funktion                                  | Status     | Details                                                          |
|-----------------------------------------------|-----------------------------------------------------|------------|------------------------------------------------------------------|
| `backend/controllers/fahrtController.js`      | Mitfahrer-Erstattung per DB-Lookup statt hardcoded  | VERIFIED | `getMitfahrerSatz` Helper vorhanden, nutzt `mitfahrer_erstattung` Tabelle per datumbasiertem Lookup |
| `frontend/src/App.js`                         | Robustes Rueckfahrt-Matching und sicherer Interceptor | VERIFIED | Orts-Namen-Fallback implementiert, `isLoggingOut` useRef Guard aktiv |

---

### Key Link Verification

| Von                                      | Zu                           | Via                                        | Status     | Details                                                                    |
|------------------------------------------|------------------------------|--------------------------------------------|------------|----------------------------------------------------------------------------|
| `fahrtController.js`                     | `mitfahrer_erstattung` Tabelle | `getMitfahrerSatz(datum)` Helper           | WIRED    | DB-Query Zeile 450-453, Helper Zeile 455-459, Aufruf Zeile 477             |
| `frontend/src/App.js`                    | `axios.interceptors`         | Flag-basierter `isLoggingOut` Logout-Guard | WIRED    | useRef Zeile 48, Interceptor Zeilen 123-136, Reset in `logout()` Zeile 167 |

---

### Requirements Coverage

| Requirement | Quell-Plan | Beschreibung                                       | Status     | Evidenz                                                       |
|-------------|------------|----------------------------------------------------|------------|---------------------------------------------------------------|
| BUG-01      | 05-01      | Hardcoded 0,05 €/km Mitfahrer-Erstattung entfernen | SATISFIED | Kein `0.05` mehr im Controller; `getMitfahrerSatz` ersetzt es vollstaendig |
| BUG-02      | 05-01      | Fragiles Rueckfahrt-Matching robuster machen        | SATISFIED | Orts-Namen-Fallback implementiert nach ID-Matching-Versuch    |
| BUG-03      | 05-01      | Axios-Interceptor Race Condition bei 401 beheben   | SATISFIED | `isLoggingOut` useRef Guard verhindert mehrfachen Logout-Aufruf |

---

### Anti-Patterns Found

| Datei | Zeile | Muster | Schwere | Auswirkung |
|-------|-------|--------|---------|------------|
| —     | —     | Keine gefunden | — | — |

Spezifisch geprueft:
- `grep "0\.05"` in `fahrtController.js`: kein Treffer — hardcoded Wert vollstaendig entfernt
- `grep "DEBUGGING"` in `App.js`: kein Treffer — alle Debug-Logs entfernt
- `grep "Unauthorized"` (console.log) in `App.js`: kein Treffer — entfernt

---

### Human Verification Required

Keine — alle drei Bugfixes sind rein logischer Natur und koennen vollstaendig per Code-Analyse verifiziert werden.

---

### Gaps Summary

Keine Gaps. Alle drei Must-Haves sind vollstaendig implementiert und korrekt verdrahtet:

1. **BUG-01 (Mitfahrer-Erstattung):** `getMitfahrerSatz` ist eine saubere, datumbasierte Helper-Funktion analog zum bestehenden `getErstattungssatz`-Muster. Die DB-Query laesst alle Saetze absteigend sortiert laden, der Helper findet den zum Fahrtdatum passenden Satz. Kein hardcoded Wert mehr vorhanden.

2. **BUG-02 (Rueckfahrt-Matching):** Der Fallback greift nach einem fehlgeschlagenen ID-Matching auf Orts-Namen zurueck. Beide Richtungen (Hinfahrt-Suche und Rueckfahrt-Suche) haben den Fallback implementiert. Case-insensitive Vergleich via `toLowerCase()`.

3. **BUG-03 (Axios Race Condition):** `isLoggingOut` als `useRef` verhindert, dass parallele 401-Antworten mehrere Logout-Aufrufe ausloesen. Das Flag wird in `logout()` zurueckgesetzt, sodass nach erneutem Login das Verhalten korrekt ist. Commit `c9adeb1` bestaetigt Entfernung des `console.log('Unauthorized...')`.

---

_Verified: 2026-03-22T11:15:00Z_
_Verifier: Claude (gsd-verifier)_
