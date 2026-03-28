# Phase 12: Adress-Autocomplete - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Bei der Ort-Eingabe (neue Orte in Einstellungen, einmalige Orte im Fahrt-Formular) sollen Adress-Vorschläge via OpenStreetMap/Nominatim erscheinen. Rein frontend-seitig — kein Backend-Proxy nötig (Nominatim ist frei nutzbar mit Rate-Limiting).

</domain>

<decisions>
## Implementation Decisions

### API
- **D-01:** Nominatim API (https://nominatim.openstreetmap.org/search) — kostenlos, kein API-Key
- **D-02:** Rate-Limiting beachten: max 1 Request/Sekunde, Debounce 300-500ms
- **D-03:** Suche auf Deutschland beschränken (countrycodes=de)
- **D-04:** Direkt vom Frontend aufrufen (kein Backend-Proxy nötig)

### UI
- **D-05:** Dropdown-Liste unter dem Adress-Eingabefeld mit Vorschlägen
- **D-06:** Vorschlag auswählen → Adresse wird ins Feld übernommen
- **D-07:** Funktioniert bei: Ort-Adresse in Einstellungen (OrtForm), einmalige Orte im FahrtForm
- **D-08:** Mindestens 3 Zeichen bevor Suche startet

### Claude's Discretion
- Ob als wiederverwendbare Komponente (AddressAutocomplete) oder als Hook (useAddressAutocomplete)
- Styling des Dropdown (absolute positioniert, z-index, Dark-Mode kompatibel)
- Ob Name oder nur Adresse autocompleted wird
- Escape/Click-outside schließt Dropdown

</decisions>

<canonical_refs>
## Canonical References

- `frontend/src/components/OrtForm.js` — Ort-Formular (Name + Adresse Felder)
- `frontend/src/FahrtForm.js` — Fahrt-Formular (einmalige Orte: einmaliger_von_ort, einmaliger_nach_ort)

</canonical_refs>

<code_context>
## Existing Code Insights

### Integration Points
- OrtForm.js: Adresse-Input-Feld — Autocomplete hier einbauen
- FahrtForm.js: einmaliger_von_ort / einmaliger_nach_ort Felder — Autocomplete hier einbauen
- Keine Backend-Änderung nötig

</code_context>

<deferred>
## Deferred Ideas

None.

</deferred>

---

*Phase: 12-adress-autocomplete*
*Context gathered: 2026-03-28*
