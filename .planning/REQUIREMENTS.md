# Requirements: Fahrtenbuch v1.2 — Features & Refactoring

**Defined:** 2026-03-22
**Core Value:** Modulare Codebasis + PDF-Export als neues Feature

## v1.2 Requirements

### Refactoring

- [ ] **REF-01**: App.js in modulare Komponenten aufteilen (AppProvider, Dashboard, Monatsübersicht, Settings etc.)
- [ ] **REF-02**: Shared State über Custom Hooks statt inline-Logik in App.js
- [ ] **REF-03**: Export-Logik in eigene Komponente extrahieren

### PDF-Export

- [ ] **PDF-01**: PDF-Export als Alternative zu Excel mit gleichem Layout (Unterschriftsfelder, Kostenstelle, Datum)
- [ ] **PDF-02**: Export-Dialog mit Format-Auswahl (Excel oder PDF)
- [ ] **PDF-03**: PDF unterstützt Einzel- und Mehrmonats-Export (wie Excel)

## Out of Scope

| Feature | Reason |
|---------|--------|
| CRA → Vite Migration | Zu groß, eigener Milestone wenn nötig |
| Vollständiges UI-Redesign | Refactoring = Struktur, nicht Aussehen |
| Weitere Export-Formate (CSV) | Kein Bedarf |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REF-01 | Phase 8 | Pending |
| REF-02 | Phase 8 | Pending |
| REF-03 | Phase 8 | Pending |
| PDF-01 | Phase 9 | Pending |
| PDF-02 | Phase 9 | Pending |
| PDF-03 | Phase 9 | Pending |

**Coverage:**
- v1.2 requirements: 6 total
- Mapped to phases: 6
- Unmapped: 0

---
*Requirements defined: 2026-03-22*
