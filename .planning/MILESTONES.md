# Milestones

## v2.0 Design Makeover (Shipped: 2026-04-03)

**Phases completed:** 7 phases, 17 plans, 29 tasks

**Key accomplishments:**

- CSS Design-Tokens (bg-card, shadow-card, border-card) in 9 Themes + Tailwind Config, modernisierte Card/Button/Input-Klassen mit verbessertem Dark-Mode-Kontrast
- Dashboard-Sektionen (KPIs, Favoriten, Formular, Statistik, Letzte Fahrten) von undefinierter 'card'-Klasse auf zentrale card-container Tokens migriert
- FahrtForm aus Fahrten-Tab entfernt — Dashboard ist jetzt einziger Ort fuer neue Fahrten
- Card-Layout fuer Filter/Export/Tabelle mit 44px Touch-Targets und Empty-State in Desktop und Mobile
- Monatsauebersicht visuell modernisiert mit Card-Layout, 44px Touch-Targets, Design-Token-Dropdown und Empty State
- Modernisierte Settings-Navigation mit Lucide-Icons, gefuelltem aktiven Tab-Zustand und einheitlichem Card-Layout fuer alle 8 Sub-Tabs
- Login-Seite mit Gradient-Hintergrund, Car-Branding-Icon und Text-Links; Landing-Page mit Card-Sections, Header-Shadow und konsistentem Branding
- CSS Fade-In-Animation (200ms ease-out) fuer alle Tab-Wechsel in AppContent und Settings, plus Card-Hover-Shadow auf card-container
- User-Tabelle durch responsive Card-Grid mit Avatar-Initialen, Rolle/Status-Badges und Lucide-Icons ersetzt
- FahrtenListe von 1654-Zeilen Tabelle+Mobile-Doppelview zu 680-Zeilen einheitlichem Card-Layout mit FahrtForm-basiertem Inline-Edit umgebaut
- Konfigurierbares Farbe-Feld pro Abrechnungstraeger mit DB-Migration, erweiterter API und Farbwahl-Widget in den Einstellungen
- KPI-Cards ohne Icons, Hintergrundfarben dynamisch aus Abrechnungstraeger.farbe, Jahresuebersicht-Header und Monats-Trenner visuell aufgeraeumt

---

## v1.4 UX Polish & Navigation (Shipped: 2026-03-28)

**Phases completed:** 2 phases, 5 plans, 8 tasks

**Key accomplishments:**

- Dashboard-Polish: Statistik-Cards zusammengeführt, Fahrten-Tooltip auf km-Balken, Formular-Redesign mit Gradient-Header
- Favoriten mit Rückfahrt-Dialog: "Mit Rückfahrt?" fragt bei Ausführung, legt Hin- und Rückfahrt an
- Umlaut-Korrektur in allen Frontend- und Backend-Texten
- Einstellungen als inline Tab statt Modal (Settings.js mit 8 Sub-Tabs)
- Benutzerverwaltung als Admin-only Tab in der Hauptnavigation
- Navigation: Dashboard | Fahrten & Export | Monatsübersicht | Einstellungen (+ Verwaltung für Admins)

---

## v1.3 Dashboard & UX (Shipped: 2026-03-28)

**Phases completed:** 3 phases, 5 plans, 8 tasks

**Key accomplishments:**

- Dashboard als neue Startseite mit KPIs, Schnelleingabe, Favoriten, letzte Fahrten
- Favoriten-System mit Backend-CRUD und Frontend-UI
- Jahres-Statistik mit Balkendiagramm (km pro Monat, Erstattungen)
- Adress-Autocomplete bei Ort-Eingabe (OpenStreetMap/Nominatim)
- Tab-Navigation: Dashboard, Fahrten & Export, Monatsübersicht

---

## v1.2 Features & Refactoring (Shipped: 2026-03-22)

**Phases completed:** 2 phases, 4 plans, 7 tasks

**Key accomplishments:**

- AppProvider (521 Zeilen) und FahrtenListe (1515 Zeilen) aus monolithischer App.js (3056 Zeilen) in eigene Dateien extrahiert, App.js auf 1040 Zeilen reduziert
- App.js von 1040 auf 36 Zeilen reduziert — reiner Router ohne UI-Logik, alle Komponenten in eigenen Dateien
- Server-seitige PDF-Generierung mit pdfkit: A4-Querformat mit Titel, Header, Fahrten-Tabelle, Hinweistexten und Unterschriftsbereich
- Format-Auswahl im Export-Bereich: Excel/PDF-Buttons pro Abrechnungstraeger mit handleExportToPdf fuer PDF-Download via Backend-API

---

## v1.1 Stabilität & Security (Shipped: 2026-03-22)

**Phases completed:** 3 phases, 5 plans, 9 tasks

**Key accomplishments:**

- Mitfahrer-Erstattung aus DB statt hardcoded, Rueckfahrt-Matching mit Orts-Namen-Fallback, Axios 401 Race Condition Guard
- helmet fuer HTTP Security Headers, express-rate-limit fuer Login-Brute-Force-Schutz (10/15min), Body-Size-Limit 10mb
- Error.message, stack traces und DB-Details aus allen Controller-Responses entfernt - nur generische deutsche Fehlermeldungen an Client
- Zod-basierte Input-Validierung mit validate(schema) Middleware fuer alle 30+ POST/PUT-Endpoints
- Removed all debug console.log from auth controller and frontend, ran npm audit fix reducing backend vulns from 17 to 8 and frontend from 52 to 26

---

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
