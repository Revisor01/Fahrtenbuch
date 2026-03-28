# Phase 14: Navigation-Umbau - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Einstellungen (bisher Modal) und Benutzerverwaltung (bisher Button/Modal) werden als eigene Tab-Inhalte in die Haupt-Navigation integriert. Das Profil-Modal wird aufgelöst — die Tabs daraus werden zu Abschnitten/Sub-Tabs innerhalb des Einstellungen-Tabs.

</domain>

<decisions>
## Implementation Decisions

### Einstellungen als Tab (NAV-01)
- **D-01:** Neuer Tab "Einstellungen" in der Hauptnavigation (statt Modal öffnen)
- **D-02:** Die bisherigen Modal-Tabs (Profil, Orte, Distanzen, Träger, Erstattungen, Passwort, API, Favoriten) werden zu Sub-Tabs/Abschnitten innerhalb des Einstellungen-Tabs
- **D-03:** Neue Komponente `Settings.js` in components/ — übernimmt den Inhalt aus ProfileModal.js
- **D-04:** ProfileModal.js wird nicht mehr genutzt (kann gelöscht oder als Wrapper beibehalten werden)

### Benutzerverwaltung als Tab (NAV-02)
- **D-05:** Für Admin-User erscheint ein zusätzlicher Tab "Verwaltung" in der Navigation
- **D-06:** UserManagement.js wird als Tab-Inhalt eingebunden (statt als Button in AppContent)
- **D-07:** Nicht-Admin-User sehen den Tab nicht

### Navigation
- **D-08:** Tabs: Dashboard | Fahrten & Export | Monatsübersicht | Einstellungen | [Verwaltung]
- **D-09:** Verwaltung nur sichtbar wenn user.role === 'admin'
- **D-10:** Mobile: Tab-Bar muss mit 4-5 Tabs funktionieren

### Claude's Discretion
- Ob Sub-Tabs horizontal oder vertikal im Einstellungen-Tab
- Mobile-Layout für Einstellungen Sub-Tabs
- Ob ProfileModal.js gelöscht oder als Legacy beibehalten wird
- Übergangsstrategie (ProfileModal → Settings)

</decisions>

<canonical_refs>
## Canonical References

- `frontend/src/components/AppContent.js` — Tab-Navigation (Phase 11)
- `frontend/src/ProfileModal.js` — Bestehende Einstellungen (8 Tabs)
- `frontend/src/UserManagement.js` — Admin-Benutzerverwaltung
- `frontend/src/contexts/AppContext.js` — user.role für Admin-Check

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- ProfileModal.js Inhalte: alle Tab-Panels können 1:1 in Settings.js übernommen werden
- UserManagement.js: eigenständige Komponente, kann direkt eingebettet werden
- AppContent.js: Tab-Navigation aus Phase 11, muss nur erweitert werden

### Integration Points
- AppContent.js: Tab-Array erweitern um "Einstellungen" + "Verwaltung" (Admin)
- Settings.js: Neues File das ProfileModal-Inhalt übernimmt
- Icons in AppContent.js für neue Tabs

</code_context>

<deferred>
## Deferred Ideas

None.

</deferred>

---

*Phase: 14-navigation-umbau*
*Context gathered: 2026-03-28*
