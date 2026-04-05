# Requirements: Fahrtenbuch v2.2 — Erstattungs-Zeitraum & Konsistenz

**Defined:** 2026-04-05
**Core Value:** Der Excel-Export muss das offizielle Abrechnungsformular korrekt abbilden

## v2.2 Requirements

### Zeitraum-Status

- [ ] **ZS-01**: Backend liefert pro-Monat-Status bei Zeitraum-Anfragen (statt aggregiertem Objekt)
- [ ] **ZS-02**: Zeitraum-Ansicht zeigt Status pro Monat aufgeschluesselt (Chips: "Jan: eingereicht", "Feb: offen")
- [ ] **ZS-03**: Status-Setzen im Zeitraum gilt weiterhin fuer alle Monate (gewollt)

### Export-Filter

- [ ] **EX-01**: Export im Zeitraum-Modus filtert eingereichte/erhaltene Monate raus (nur offene Monate exportieren)
- [ ] **EX-02**: Export-Button zeigt nur an wenn offene Monate im Zeitraum vorhanden sind

### UI-Konsistenz

- [ ] **UI-01**: FahrtenListe Erstattungs-Cards nutzen Traeger-Farben (kpi-card + getCardBg)
- [ ] **UI-02**: Status-Chips (eingereicht/nicht eingereicht) visuell als klar erkennbare Badges
- [ ] **UI-03**: card-container-highlight durch card-container ersetzen (kein hellblauer Hintergrund)
- [ ] **UI-04**: Erstattungs-Bereich Layout konsistent mit v2.1 Patterns (section-header, spacing)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Neue Features (Dashboard, Navigation) | Nur Erstattungs-Logik und UI-Polish |
| Backend-Refactoring | Nur Zeitraum-Status-API aendern |
| Monatsansicht-Redesign | Bereits in v2.1 erledigt |

## Traceability

| REQ-ID | Phase | Plan | Status |
|--------|-------|------|--------|
| ZS-01 | - | - | Open |
| ZS-02 | - | - | Open |
| ZS-03 | - | - | Open |
| EX-01 | - | - | Open |
| EX-02 | - | - | Open |
| UI-01 | - | - | Open |
| UI-02 | - | - | Open |
| UI-03 | - | - | Open |
| UI-04 | - | - | Open |

**Coverage:**
- v2.2 requirements: 9 total
- Mapped to phases: 0
- Unmapped: 9

---
*Requirements defined: 2026-04-05*
