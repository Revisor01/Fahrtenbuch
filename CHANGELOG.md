# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionierung folgt [SemVer](https://semver.org/lang/de/).

## [Unreleased]

### Added
- Redesign 2026, Fundament: Design-Token-Set (`tokens.css`) mit zwei eigenständig abgestimmten Modi (hell/dunkel), Statusklassen Erfasst/Eingereicht/Erstattet, Toast- und Empty-State-Bausteine, `.num`-Utility für Zahlen in JetBrains Mono
- PWA-Grundlagen: Manifest mit Icons und Shortcuts, self-hosted Fonts (Instrument Sans, JetBrains Mono), neues App-Icon inkl. Favicon

### Changed
- Tailwind auf semantische Farbnamen umgestellt (brand/accent/ok/danger/surface/line/bg/text); alte primary-/secondary-Klassen laufen übergangsweise über Aliasse weiter
- Komponentenklassen nach Design-Spec: Eingabefelder 52 px/16 px (kein iOS-Zoom mehr), Buttons 48 px, Icon-Buttons 48×48 px, einheitlicher Fokusring ohne Layout-Sprung
- Theme-Auswahl auf Hell/Dunkel/System reduziert (Default: Systemeinstellung); gespeicherte alte Theme-Werte werden migriert
- index.html: deutsche Sprache/Beschreibung, Titel „Fahrtenbuch", dynamische theme-color

### Removed
- Die neun wählbaren Farbthemes (`themes.css`) und die globale Transition auf allen Elementen (`darkMode.css`)
- CRA-Reste (logo192/logo512, Google-Fonts-Link, Standard-Manifest)

### Security
- IDOR behoben: Erstattungssätze fremder Nutzer waren les-, änder- und löschbar (Ownership-Check auf Abrechnungsträger)
- IDOR behoben: Mitfahrer fremder Fahrten waren änder- und löschbar (Fahrt-Ownership-Prüfung)
- Cross-User-Schreibzugriff behoben: Distanz-Updates konnten Kilometer fremder Fahrten überschreiben (user_id-Scoping aller `UPDATE fahrten`, Ort-/Träger-Ownership-Validierung)
- Registrierung serverseitig abgesichert: `ALLOW_REGISTRATION`, `ALLOWED_EMAIL_DOMAINS`, `REGISTRATION_CODE` (timing-safe) + Rate-Limits auf Registrierung und Passwort-Reset (5/h)
- mysql2 2.x → 3.23 (kritische RCE-Advisory), ungenutztes verwundbares `xlsx`-Paket entfernt, `npm audit fix` in Backend und Frontend
- Admin-Passwort wird nicht mehr bei jedem Container-Start auf `INITIAL_ADMIN_PASSWORD` zurückgesetzt (nur noch beim Erstlauf)

### Fixed
- Excel-/PDF-Export und Monatsreport zählten Fahrten mit mehreren Mitfahrern mehrfach (Dedup nach Fahrt-ID)
- Export rechnete hartcodiert mit 0,30 €/km statt mit den gepflegten, zeitabhängigen Erstattungssätzen des Trägers

## [2.1.0] - 2026-04-04

### Changed
- UI-Konsistenz & View-Architektur: globale CSS-Patterns, View-Polish, Navigation überarbeitet (5 Phasen)

## [2.0.0] - 2026-04-03

### Changed
- Design Makeover: Designsystem eingeführt, alle Views modernisiert (7 Phasen)

## [1.6.0] - 2026-03-22

### Added
- PDF-Export, ZIP-Export für Mehrfach-Exporte

### Changed
- App.js von 3056 auf 36 Zeilen refaktoriert (Komponenten-Aufteilung)

## [1.5.0] - 2026-03-22

### Added
- Dashboard, Favoriten, Statistiken, Adress-Autocomplete (Milestone „v1.3 Dashboard & UX")

### Changed
- UX-Polish und Navigations-Umbau (Milestone „v1.4")

## [1.4.0] - 2026-03-22

### Added
- Zeitraum-Auswahl für Exporte, Kostenstellen

## [1.3.0] - 2026-03-22

### Fixed
- Stabilität & Security: Bugfixes, helmet, Zod-Validierung, npm audit (Milestone „v1.1")

## [1.2.0] - 2025-05-15

### Added
- Benutzerfreundliche Verbesserungen (Excel-Export, Distanz-Updates)

## [1.1.0] - 2025-03-20

### Added
- Hilfeseite und Verbesserungen

## [1.0.1] - 2025-02-13

### Added
- Rechtliche Informationen (Impressum/Datenschutz)

## [1.0.0] - 2025-02-13

### Added
- Initial Release: Digitales Fahrtenbuch mit Fahrten-Erfassung, Orten, Distanzen, Abrechnungsträgern und Excel-Export

[Unreleased]: https://github.com/Revisor01/Fahrtenbuch/compare/v2.1...HEAD
