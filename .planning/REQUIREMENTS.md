# Requirements: Fahrtenbuch v2.1 — UI-Konsistenz & View-Architektur

**Defined:** 2026-04-04
**Core Value:** Alle Views auf Dashboard-Niveau — einheitliche Patterns, saubere Struktur, sinnvolle Navigation

## v2.1 Requirements

### Globale Patterns

- [ ] **GP-01**: btn-primary und btn-secondary haben identische Hoehe (h-10)
- [ ] **GP-02**: Card-Backgrounds nutzen neutrale Design-Tokens statt hardcoded Farben (kein bg-emerald-50, bg-blue-50 etc. direkt in Komponenten)
- [ ] **GP-03**: KPI-Card-Pattern als wiederverwendbare CSS-Klasse definiert (kpi-card mit Farbvarianten)
- [ ] **GP-04**: Section-Header-Pattern einheitlich (Icon + Titel + optionale Anzahl) als wiederverwendbares Pattern

### FahrtenListe

- [ ] **FL-01**: FahrtenListe hat Section-Headers mit Lucide-Icons (wie Dashboard-Sektionen)
- [ ] **FL-02**: FahrtenListe Card-Layout ist visuell strukturiert wie Dashboard (klare Sektionen, Whitespace)
- [ ] **FL-03**: Export-Bereich visuell aufgewertet mit Icons und klarer Struktur

### Monatsuebersicht

- [ ] **MU-01**: Tab-Name und Seitentitel ueberpruefen — passt "Monatsuebersicht" oder besser "Abrechnungen"?
- [ ] **MU-02**: Desktop und Mobile rendern aus einer einzigen Komponenten-Struktur (kein hidden/sm:hidden Doppel-Rendering)
- [ ] **MU-03**: Section-Headers mit Icons (wie Dashboard)
- [ ] **MU-04**: Cards visuell konsistent mit dem Rest der App (keine Sonder-Styles)

### Einstellungen

- [ ] **ES-01**: Jede Form-Section in den Sub-Tabs hat ein Icon und klaren Header
- [ ] **ES-02**: Alle 8 Sub-Tabs visuell konsistent (gleiche Card-Struktur, gleiche Spacing)
- [ ] **ES-03**: Formular-Inputs haben konsistentes Styling ueber alle Tabs

### Navigation

- [ ] **NV-01**: Tab-Namen und -Icons sind klar und selbsterklaerend
- [ ] **NV-02**: Navigation funktioniert konsistent auf Desktop und Mobile

## Out of Scope

| Feature | Reason |
|---------|--------|
| Neue Features | Nur Konsistenz und Polish bestehender Views |
| Backend-Aenderungen | Rein visueller Milestone |
| Dashboard-Redesign | Dashboard ist bereits der Goldstandard — bleibt wie es ist |
| Neue Seitenstruktur | Keine neuen Tabs — nur bestehende aufwerten |

## Traceability

| REQ-ID | Phase | Plan | Status |
|--------|-------|------|--------|
| GP-01 | - | - | Open |
| GP-02 | - | - | Open |
| GP-03 | - | - | Open |
| GP-04 | - | - | Open |
| FL-01 | - | - | Open |
| FL-02 | - | - | Open |
| FL-03 | - | - | Open |
| MU-01 | - | - | Open |
| MU-02 | - | - | Open |
| MU-03 | - | - | Open |
| MU-04 | - | - | Open |
| ES-01 | - | - | Open |
| ES-02 | - | - | Open |
| ES-03 | - | - | Open |
| NV-01 | - | - | Open |
| NV-02 | - | - | Open |

**Coverage:**
- v2.1 requirements: 16 total
- Mapped to phases: 0
- Unmapped: 16

---
*Requirements defined: 2026-04-04*
