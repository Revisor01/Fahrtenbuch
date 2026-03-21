# Requirements: Fahrtenbuch v2

**Defined:** 2026-03-21
**Core Value:** Excel-Export bildet das offizielle Abrechnungsformular korrekt ab — ohne manuelle Nacharbeit

## v1 Requirements

### Excel-Export

- [ ] **EXCEL-01**: Datum wird im Format TT.MM.JJJJ als echtes Excel-Datum exportiert (nicht als Text)
- [ ] **EXCEL-02**: Unterschriftszeile unten im Export: "Unterschrift: ___" mit Datumsfeld
- [ ] **EXCEL-03**: Genehmigungszeile unten im Export: "Angeordnet/genehmigt Unterschrift: ___"
- [ ] **EXCEL-04**: Kostenstelle (Kst.) wird neben dem Kostenträger im Excel-Header angezeigt

### Mehrmonats-Export

- [ ] **MULTI-01**: Nutzer kann Von-Monat und Bis-Monat für Export wählen (UI-Dialog)
- [ ] **MULTI-02**: Excel-Header zeigt gewählten Zeitraum (z.B. "Monat: April bis Juni")
- [ ] **MULTI-03**: "Eingereicht"-Status funktioniert korrekt über Mehrmonats-Zeiträume

### Datenintegrität

- [x] **DATA-01**: Änderung einer gespeicherten Distanz aktualisiert automatisch alle bestehenden Fahrten mit dieser Strecke (in einer Transaktion)

### Abrechnungsträger

- [ ] **ABRTR-01**: Abrechnungsträger hat optionales Freitextfeld "Kostenstelle" (DB, API, UI)

## v2 Requirements

(Keine — alle Feedback-Items sind im aktuellen Scope)

## Out of Scope

| Feature | Reason |
|---------|--------|
| VPN-Erreichbarkeit | Netzwerk-Problem auf Nutzerseite, kein App-Issue |
| Mobile App | Web-first reicht, responsive UI deckt mobile Nutzung ab |
| Kostenstelle nachträglich in Excel editieren | Nutzer kann in App oder Excel selbst anpassen |
| Refactoring App.js (2949 Zeilen) | Nicht Teil dieses Feedbacks, separates Tech-Debt-Projekt |

## Constraints

- **Responsive**: Alle UI-Änderungen (Export-Dialog, Kostenstelle-Feld) müssen auf Desktop und Mobile funktionieren
- **Tech Stack**: Bestehend beibehalten (React, Express, MySQL, exceljs)
- **Abwärtskompatibilität**: Einzelmonats-Export muss weiterhin funktionieren

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| EXCEL-01 | Phase 2 | Pending |
| EXCEL-02 | Phase 2 | Pending |
| EXCEL-03 | Phase 2 | Pending |
| EXCEL-04 | Phase 2 | Pending |
| MULTI-01 | Phase 3 | Pending |
| MULTI-02 | Phase 3 | Pending |
| MULTI-03 | Phase 3 | Pending |
| DATA-01 | Phase 1 | Complete |
| ABRTR-01 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after roadmap creation*
