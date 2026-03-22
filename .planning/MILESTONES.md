# Milestones

## v1.0 Nutzerfeedback (Shipped: 2026-03-22)

**Phases completed:** 4 phases, 7 plans, 11 tasks

**Key accomplishments:**

- Optionales Kostenstelle-Freitextfeld am Abrechnungstraeger -- DB-Migration, Model/Controller CRUD, Frontend-Formular und Listenanzeige mit 'Kst.:'-Prefix
- Transaktionsbasierte Distanz-Updates mit automatischer bidirektionaler Fahrten-Aktualisierung via connection.beginTransaction()
- Excel-Export mit echtem Datumsformat DD.MM.YYYY, Kostenstelle im Header und vollstaendigem Unterschriftsbereich gemaess offiziellem Abrechnungsformular
- Neue API-Route und Excel-Export-Funktion fuer Mehrmonats-Zeitraeume mit kompaktem Header-Format und pro-Monat Eingereicht-Status
- Von/Bis-Dropdowns mit Zeitraum-Validierung und responsivem Export-UI fuer Mehrmonats-Excel-Download
- REST endpoint for date-range reports with aggregated erstattungen and merged abrechnungsStatus across months
- Von/Bis-Dropdowns ersetzen die Monatsauswahl mit adaptivem Datenloading und integriertem Export, Phase-3-Zeitraum-UI entfernt

---
