# Requirements: Fahrtenbuch v1.3 — Dashboard & UX

**Defined:** 2026-03-22
**Core Value:** Schnellere Fahrteingabe durch Favoriten und bessere Uebersicht durch Dashboard

## v1.3 Requirements

### Dashboard

- [ ] **DASH-01**: Dashboard als neue Startseite mit KPI-Cards (offene Erstattungen, km diesen Monat, Fahrten diesen Monat)
- [ ] **DASH-02**: Aufklappbares Fahrt-Formular direkt im Dashboard (wie bisheriges Formular)
- [ ] **DASH-03**: Navigation mit Tabs: Dashboard, Fahrten & Export, Monatsuebersicht, Einstellungen

### Favoriten

- [x] **FAV-01**: Nutzer kann Fahrten als Favorit speichern (Von, Nach, Anlass, Abrechnungstraeger)
- [x] **FAV-02**: Favoriten im Dashboard als Schnelleingabe — ein Klick traegt Fahrt mit heutigem Datum ein
- [ ] **FAV-03**: Letzte 3 Fahrten im Dashboard mit "Nochmal fuer heute"-Button

### Statistiken

- [ ] **STAT-01**: Jahres-Balkendiagramm im Dashboard (km pro Monat)
- [ ] **STAT-02**: Erstattungs-Uebersicht pro Abrechnungstraeger ueber das Jahr

### Adress-Autocomplete

- [ ] **ADDR-01**: Bei Ort-Eingabe Adress-Vorschlaege via OpenStreetMap/Nominatim API

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-User-Admin-Uebersicht | Zu komplex, eigener Milestone |
| PWA / Service Worker | Eigener Milestone |
| CRA → Vite Migration | Eigener Milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FAV-01 | Phase 10 | Complete |
| FAV-02 | Phase 10 | Complete |
| FAV-03 | Phase 10 | Pending |
| DASH-01 | Phase 11 | Pending |
| DASH-02 | Phase 11 | Pending |
| DASH-03 | Phase 11 | Pending |
| STAT-01 | Phase 11 | Pending |
| STAT-02 | Phase 11 | Pending |
| ADDR-01 | Phase 12 | Pending |

**Coverage:**
- v1.3 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0

---
*Requirements defined: 2026-03-22*
