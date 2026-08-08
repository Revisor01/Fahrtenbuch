# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionierung folgt [SemVer](https://semver.org/lang/de/).

## [Unreleased]

### Added
- Hilfeseite (/help) komplett neu: Inhaltsverzeichnis mit Sprungmarken und aufklappbare FAQ zu jedem Bereich der App (Start, Fahrt erfassen, Fahrten, Abrechnung, Statussystem, Mitfahrer:innen, Einstellungen, Verwaltung, Export & Formular, Installation auf dem Homescreen) — im Design des Redesigns 2026, hell wie dunkel
- „+ Neue Fahrt" in der Fahrtenliste (Desktop) und FAB auf Mobilgeräten — gleicher Erfassungsflow wie auf dem Dashboard
- Einreichen fragt nach dem Exportformat (Excel / PDF / Beides als ZIP), statt stillschweigend Excel zu laden

### Removed
- Video-Anleitungen auf der Hilfeseite entfernt (die Aufnahmen zeigten die alte Oberfläche) — neue Videos folgen

### Fixed
- Fortschrittsleiste (mobil): „Erstattet" als Endstation zeigt jetzt den Haken statt eines leeren Kreises
- Dashboard-Kacheln der unteren Zeile sind gleich hoch; die „Unterwegs"-Liste scrollt innerhalb ihrer Kachel

### Fixed
- Statuswechsel scheiterte, sobald irgendwo eine Mitfahrer-Erstattung existierte: die Spalte `abrechnungen.typ` enthält Träger-IDs und den Text „mitfahrer" gemischt, wodurch MySQL beim numerischen Vergleich die ganze Spalte casten wollte und abbrach — betraf Einreichen, Erstattet-Markieren und Zurücksetzen (fiel im Zeitraum-Modus auf, weil dort ein Monat mit Mitfahrern enthalten war)
- Info-Dialog zeigte die Version des letzten GitHub-Releases (v1.2.0 von Mai 2025) und bei fehlender Netzverbindung „v1.0.0" — jetzt kommt sie aus dem eigenen Build

### Changed
- Statusmeldungen benennen die Aktion („Als erstattet markiert.", „Status zurückgesetzt — wieder ‚Erfasst'.") statt „wurde aktualisiert"; Backend-Fehlermeldungen erscheinen im Toast
- Frontend-Version auf 2.2.0 gesetzt (war 1.6.0 und damit weit hinter dem Stand)

### Fixed
- Statusänderungen und alle anderen validierten Endpunkte antworteten bei Eingabefehlern mit einem Absturz (500) statt einer Meldung — Ursache: Zod 4 nennt die Fehlerliste `issues`, nicht `errors`
- „Als erstattet markieren" ohne vorheriges Einreichen meldet jetzt verständlich „muss erst eingereicht werden" (409) statt eines Serverfehlers; die Backend-Meldung erscheint im Toast
- Zeitraum-Übersicht: Monate ohne Vorgang zeigen einen neutralen Strich statt „Erfasst" (Backend liefert dazu die Beträge je Träger und Monat)

### Added
- Mitfahrer-Hinweis auch in der Startseiten-Tabelle (gedeckt), in der Fahrtenliste farblich abgesetzt mit Punkt

### Changed
- Favoriten-Tipp fragt jetzt kurz nach: „Hin- und Rückfahrt" oder „Nur Hinfahrt" (statt stillschweigend nur die Hinfahrt anzulegen)
- Fahrt löschen fragt vor dem Löschen nach (Datum, Ziel, Anlass, km werden gezeigt); der Rückgängig-Toast bleibt als zweites Netz

### Fixed
- Mitfahrer-Erstattung sauber getrennt: kein gemischter €/km-Satz mehr auf dem Dashboard („0,33 €/km"), stattdessen „davon x € Mitfahrer"; Fahrt-Betrag und Mitfahrer-Betrag werden getrennt berechnet (0,30 €/km Fahrt + 0,05 €/km je Mitfahrer)

### Added
- Fahrten mit Mitfahrern zeigen die Mitfahrer-Erstattung als kleine Zweitzahl unter dem Betrag (Fahrtenliste mobil + desktop, Dashboard „Letzte Fahrten"); Backend liefert `mitfahrerErstattung` jetzt pro Fahrt
- Kilometer-Chart: Hover/Fokus öffnet eine Monats-Aufschlüsselung (km, Fahrten, Erstattung, Mitfahrer-Anteil, Status)
- Dashboard „Unterwegs": zeigt das Einreich-Datum („am 05.04. · seit 124 Tagen", heute = „heute")

### Changed
- Info- und Neuigkeiten-Dialog ins neue Design umgezogen (Sheet statt Alt-Modal); Impressum und Datenschutzerklärung als Unteransichten mit Zurück-Navigation statt gestapelter Modals
- Verwaltung (Admin): Benutzer-Übersicht als Tabelle (desktop) bzw. gestapelte Zeilenliste (mobil) statt Kacheln — Spalten Benutzer, E-Mail (+ Verifiziert-Status), Rolle, Aktionen; Anlegen/Bearbeiten als Sheet, Löschen weiter mit Inline-Zweischritt
- Dashboard desktop neu komponiert: Vierer-Kachel-Grid oben (Noch nicht eingereicht · Monat bisher · Unterwegs · Kilometer-Chart), darunter Favoriten, unten „Letzte Fahrten" in voller Breite mit ↻-Schnellbutton pro Zeile (Fahrt für heute wiederholen)

### Added
- Dashboard desktop: Favoriten-Kachelreihe „Ein Tipp genügt" (fehlte am Desktop komplett — Favoriten waren nur mobil sichtbar)
- Dashboard „Unterwegs": listet jetzt ALLE eingereichten Monate einzeln, jeder mit ✓-Schnellaktion „als erstattet markieren" (mit Rückgängig)

### Changed
- Dashboard „Letzte Fahrten": Spalte zeigt nur noch den Anlass (Ziel entfällt, Route im Tooltip); Träger-Spalte schmaler mit Zeilenumbruch, Datum ohne Jahr
- Sidebar-Werkzeugknöpfe dezenter: rahmenlos, Teal-Hover statt grauer Kacheln
- Einstellungen: „Mitfahrer" (Mitfahrer-Erstattungssatz) ist jetzt Unterabschnitt von „Erstattungssätze" statt eigener Bereich

### Fixed
- Dashboard-Erfolgszustand meldet jetzt „Alles eingereicht — n Monate warten noch auf die Erstattung" statt pauschal „Alles abgerechnet"
- Einstellungen: der Abmelden-Bereich wurde am Desktop abgeschnitten — Sekundäraktionen erscheinen dort jetzt nur noch mobil

### Changed
- Sidebar unten: Werkzeugleiste mit Dark-Mode-Schalter, Neuigkeiten, Info und Hilfe über der Nutzerzeile; Abmelden sitzt als Icon direkt an der Nutzerzeile
- Dashboard „Letzte Fahrten": schlankere Zeilen — nur noch der Anlass (Route als Tooltip)
- Fahrtenseite: Monats-Status-Chips der Erstattungsübersicht tragen jetzt Statusfarben (Sand für Eingereicht, Grün für Erstattet, gestrichelt für Erfasst)

### Fixed
- Abrechnungs-Matrix: aufgeklappte Trägerdetails nutzen jetzt die volle Zeilenbreite (vorher auf 720 px begrenzt)
- Abrechnung: fällige Monate außerhalb des vorgewählten Jahres (z. B. Dezember des Vorjahres) waren in der Liste unsichtbar — die Ansicht weitet sich jetzt automatisch auf „Alle Jahre"
- Abrechnung: Untertitel meldete „nichts wartet auf dich", obwohl eingereichte Monate noch auf die Erstattung warten — zeigt jetzt „{n} Monate warten auf die Erstattung"
- Toasts mit „Rückgängig"-Aktion blieben dauerhaft stehen und stapelten sich — blenden jetzt nach 8 s aus (Abweichung von der Design-Spec, User-Feedback)
- Login zeigte den Platzhalter `DEFAULT_TITLE` statt des App-Titels (unersetzte `config.js`-Platzhalter zählen jetzt als „nicht gesetzt")
- Dashboard-Tabelle: Routen-Text lief ohne Abstand in die Träger-Spalte

### Changed
- Navigation: „Mehr" heißt jetzt „Einstellungen" (mit Zahnrad-Icon)

### Added
- Redesign 2026, Fundament: Design-Token-Set (`tokens.css`) mit zwei eigenständig abgestimmten Modi (hell/dunkel), Statusklassen Erfasst/Eingereicht/Erstattet, Toast- und Empty-State-Bausteine, `.num`-Utility für Zahlen in JetBrains Mono
- PWA-Grundlagen: Manifest mit Icons und Shortcuts, self-hosted Fonts (Instrument Sans, JetBrains Mono), neues App-Icon inkl. Favicon
- Toast-System (`ToastProvider`/`useToast`): Erfolg/Fehler mit Statuskreis, „Rückgängig"-Aktion, aria-live; mobil über der Bottom-Nav, Desktop unten rechts
- StatusBadge-Komponente mit drei Darstellungsformen (Badge, Punkt+Wort, Fortschrittsleiste) und zentralem Wording-Mapping (`utils/statusLabels.js`)
- Sheet-Komponente: mobil Bottom-Sheet mit Griff und Fokusfalle, ab 768 px zentriertes Modal-Panel
- EmptyState-Komponente (gestrichelter Rahmen, Icon-Fläche, Primäraktion)
- Zweistufiger Erfassungsflow als Sheet: „Wohin?" (Ortsliste nach Häufigkeit mit Distanz vom Startort, Startort/Datum antippbar, freie Zieleingabe) und „Bestätigen" (km · € live aus dem Erstattungssatz, Anlass-Chips aus dem Verlauf des Ziels, Rückfahrt-Switch mit Verlaufs-Heuristik, Trägerauswahl); Speichern optimistisch mit Toast + „Rückgängig", Rückfahrt legt eine zweite Fahrt an
- `useErfassung().open(prefill?)` als zentraler Einstieg für alle „Neue Fahrt"-Aktionen (Prefill-Signatur für „Wiederholen"/FAB bereits enthalten)
- Dashboard komplett neu (mobil + Desktop): Hero-Karte mit dem ältesten nicht eingereichten Monat („Alles abgerechnet" als Erfolgszustand), „Ein Tipp genügt"-Favoriten-Kacheln (legen die Fahrt sofort an, Toast mit „Rückgängig"), „Zuletzt" mit Wiederholen-Button, FAB über der Bottom-Nav; Desktop mit tageszeitabhängiger Begrüßung, Trägerkacheln im Hero, Karten „{Monat} bisher"/„Unterwegs", Tabelle „Letzte Fahrten" und Kilometer-Chart (Balkenfarbe = Monatsstatus)
- Fahrtenliste komplett neu: Segmented Control (aktueller Monat / Vormonat / Zeitraum mit ausklappbarer Von-/Bis-Wahl und „Offene anzeigen"), Summenzeile „km · €" mit Export-Sheet (Excel/PDF/ZIP je Träger); mobil Karten mit Wischen-nach-links für Bearbeiten/Löschen (auch per Tipp/Tastatur erreichbar), ab 768 px Tabelle mit Inline-Aktionen inkl. „Wiederholen" über den Erfassungsflow; Bearbeiten öffnet das Formular im Sheet, leerer Monat mit konkretem Empty-State
- Abrechnung komplett neu: mobil Monatskarten (fällige Monate aufgeklappt mit Fortschrittsleiste, Trägerzeilen und Einreichen-Button; übrige eingeklappt mit Statuspunkt + Datum, erstattete gedimmt), ab 768 px die Matrix Monat × Träger mit klebender Monatsspalte, „Details"-Aufklappzeile, Kopf-Aktionen „Zeitraum-Export" und „{ältester fälliger Monat} einreichen"; „Einreichen" stößt den Excel-Export je offenem Träger an und setzt die Status direkt mit Toast + „Rückgängig" — Download-Button exportiert ohne Statuswechsel
- Einstellungen komplett neu: statt acht Tabs eine Bereichsliste (desktop links 212 px, Inhalt in einer Karte; mobil Vollbild-Liste mit Drilldown) — Orte & Distanzen · Abrechnungsträger · Erstattungssätze · Favoriten · Mitfahrer · Profil & Passwort · Darstellung · API-Zugriff, Verwaltung (Admin) mobil in der Liste; kleine Formulare öffnen als Sheet, Tabellen mit 36×36-px-Aktionen, Löschen direkt mit Undo-Toast wo möglich
- Bereich „Darstellung": genau drei Optionen Hell / Dunkel / System mit Radio-Semantik; der provisorische Umschalter aus der Kopfzeile entfällt
- Anmeldung nach Redesign-Spec: zentrierte Formularkarte auf Markenfläche, Logo-Kachel 52 px, Felder/Primärbutton 52 px; Registrierung und Passwort-vergessen im selben Layout statt als Modals, Passwort-Reset-/Setzen-Seiten und E-Mail-Verifizierung nachgezogen

### Changed
- Tailwind auf semantische Farbnamen umgestellt (brand/accent/ok/danger/surface/line/bg/text); alte primary-/secondary-Klassen laufen übergangsweise über Aliasse weiter
- Komponentenklassen nach Design-Spec: Eingabefelder 52 px/16 px (kein iOS-Zoom mehr), Buttons 48 px, Icon-Buttons 48×48 px, einheitlicher Fokusring ohne Layout-Sprung
- Theme-Auswahl auf Hell/Dunkel/System reduziert (Default: Systemeinstellung); gespeicherte alte Theme-Werte werden migriert
- index.html: deutsche Sprache/Beschreibung, Titel „Fahrtenbuch", dynamische theme-color
- App-Shell umgebaut: Bottom-Nav mit vier Zielen (Start/Fahrten/Abrechnung/Mehr) auf Mobilgeräten, Sidebar 232 px mit Nutzerzeile ab 768 px; Fälligkeits-Punkt bzw. Zähler-Badge auf „Abrechnung"
- Bestätigungen laufen ohne Modal: Löschen (Fahrten, Orte, Distanzen, Mitfahrer, Favoriten) direkt mit Toast + „Rückgängig"; Favoriten-Tipp legt die Fahrt sofort an; Export-Formatwahl als direkte Buttons; Statusanzeige heißt jetzt Erfasst/Eingereicht/Erstattet
- Neue Fahrten laufen nur noch über den Erfassungsflow; `FahrtForm` dient ausschließlich dem Bearbeiten bestehender Fahrten (Create-Code entfernt)
- Status in der Fahrtenliste einheitlich über StatusBadge (Punkt+Wort; Zeitraum als Monats-Chips); Status-Reset bei „Erstattet" funktioniert wieder (Klick lief zuvor ins nie öffnende Modal); Erstattungen je Träger als neutrale Karte statt farbiger KPI-Kacheln
- Statusaktionen der Abrechnung laufen direkt mit Undo-Toast statt über das Bestätigungs-Modal; der Datums-Dialog (Nachfolger des AbrechnungsStatusModal) ist ein kompaktes Sheet und existiert nur noch einmal global — der Doppel-Mount, bei dem die Abrechnungs-Instanz `singleMonth` nicht übergab, ist behoben

### Removed
- Die neun wählbaren Farbthemes (`themes.css`) und die globale Transition auf allen Elementen (`darkMode.css`)
- CRA-Reste (logo192/logo512, Google-Fonts-Link, Standard-Manifest)
- `NotificationModal` (Bestätigungs-/Hinweis-Modal) — vollständig durch Toasts ersetzt; alter Header- und Tab-Streifen zugunsten von Bottom-Nav/Sidebar
- Alte Dashboard-Bausteine (KPI-Cards, Jahres-Statistik-Chart, Erstattungstabelle, Inline-Bearbeiten) sowie ungenutzte `ProfileModal.js`/`HilfeModal.js`
- Alte Abrechnungs-Bausteine: Schnellaktionen-Dropdown (arbeitete auf dem Zeitraum-Filter des Fahrten-Tabs), dreifache Statuszellen-Logik, farbige Träger-KPI-Karten samt Jahres-Summenkacheln und „Abgeschlossene ausblenden"-Filter (erstattete Monate bleiben sichtbar, gedimmt)

### Security
- IDOR behoben: Erstattungssätze fremder Nutzer waren les-, änder- und löschbar (Ownership-Check auf Abrechnungsträger)
- IDOR behoben: Mitfahrer fremder Fahrten waren änder- und löschbar (Fahrt-Ownership-Prüfung)
- Cross-User-Schreibzugriff behoben: Distanz-Updates konnten Kilometer fremder Fahrten überschreiben (user_id-Scoping aller `UPDATE fahrten`, Ort-/Träger-Ownership-Validierung)
- Registrierung serverseitig abgesichert: `ALLOW_REGISTRATION`, `ALLOWED_EMAIL_DOMAINS`, `REGISTRATION_CODE` (timing-safe) + Rate-Limits auf Registrierung und Passwort-Reset (5/h)
- mysql2 2.x → 3.23 (kritische RCE-Advisory), ungenutztes verwundbares `xlsx`-Paket entfernt, `npm audit fix` in Backend und Frontend
- Admin-Passwort wird nicht mehr bei jedem Container-Start auf `INITIAL_ADMIN_PASSWORD` zurückgesetzt (nur noch beim Erstlauf)

### Fixed
- Dashboard hing am Monatsfilter des Fahrten-Tabs (KPIs/„Letzte Fahrten" zeigten je nach gewähltem Monat falsche Werte) — alle Dashboard-Daten werden jetzt eigenständig und ungefiltert abgeleitet
- „Wiederholen" (früher „Nochmal") verlor die Mitfahrer der Vorlage-Fahrt — die neue Fahrt übernimmt sie jetzt vollständig
- Bearbeiten einer Fahrt setzte den Abrechnungsträger asynchron auf den Default zurück und überschrieb den gespeicherten Wert (Mount-Effect in `FahrtForm` entfernt)
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
