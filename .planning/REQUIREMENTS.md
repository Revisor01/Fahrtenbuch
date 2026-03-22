# Requirements: Fahrtenbuch v1.1 — Stabilität & Security

**Defined:** 2026-03-22
**Core Value:** App robuster, sicherer und wartbarer machen

## v1.1 Requirements

### Bugfixes

- [x] **BUG-01**: Mitfahrer-Erstattungssatz wird aus der DB gelesen statt hardcoded 0,05 €/km
- [x] **BUG-02**: Rückfahrt-Matching case-insensitive und robuster bei ID-Abweichungen
- [x] **BUG-03**: Axios-Interceptor Race Condition bei parallelen 401-Responses fixen

### Security

- [x] **SEC-01**: helmet-Middleware für sichere HTTP-Headers
- [x] **SEC-02**: express-rate-limit auf Login-Endpoint (Brute-Force-Schutz)
- [x] **SEC-03**: Error-Messages sanitizen — keine DB-Details an Client leaken
- [x] **SEC-04**: Body-Size-Limit auf express.json() setzen

### Code-Qualität

- [x] **QUAL-01**: Input-Validierung mit Zod für alle Backend-Controller
- [ ] **QUAL-02**: Debug-Logs entfernen (168+ console.log, DEBUGGING-Prefix)
- [ ] **QUAL-03**: Dependency-Updates — Dependabot-Alerts fixen (30 offene Alerts)

## v1.2 Requirements (geplant, nicht in diesem Milestone)

- App.js aufteilen in kleinere Komponenten
- PDF-Export als Alternative zu Excel
- Export-Dialog mit Format-Auswahl (Excel/PDF)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Audit-Log | Jeder macht das für sich, nicht nötig |
| CSV-Export für Steuer | Kein Bedarf bei den Nutzern |
| 2FA | Niedrige Adoption, unverhältnismäßiger Aufwand |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUG-01 | Phase 5 | Complete |
| BUG-02 | Phase 5 | Complete |
| BUG-03 | Phase 5 | Complete |
| SEC-01 | Phase 6 | Complete |
| SEC-02 | Phase 6 | Complete |
| SEC-03 | Phase 6 | Complete |
| SEC-04 | Phase 6 | Complete |
| QUAL-01 | Phase 7 | Complete |
| QUAL-02 | Phase 7 | Pending |
| QUAL-03 | Phase 7 | Pending |

**Coverage:**
- v1.1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-22*
