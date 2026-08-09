---
task: erfassung-ux
date: 2026-08-09
status: complete
commits: 0e1080b, 8083e2e
---

# Zusammenfassung

Sechs Punkte Nutzerfeedback zum Erfassungsflow und zu den Fahrtenlisten,
plus ein beim Testen gefundener Datumsfehler.

## Umgesetzt

**1. Adressvorschläge gestylt.** Die Liste nutzte noch Tailwind-Utilities
(`bg-white`, `border-gray-200`) statt der Design-Tokens — dadurch wirkte sie
fremd und wie „hinter" der Oberfläche. Jetzt eigene `.adr-*`-Klassen mit
`--surface`/`--line`/`--shadow`, Pin-Icon und Hover-Zustand, Dark Mode inklusive.

**2. Zielsuche und Adresssuche zusammengelegt.** Wer eine unbekannte Adresse
tippte, bekam nichts und musste erst den Chip „Anderes Ziel eingeben" finden —
laut Nutzer „für die Leute völlig unsinnig". Jetzt sucht ein Feld beides:
eigene Orte zuerst, darunter unter „Adressen aus der Karte" die Live-Treffer.
Der Chip ist weg.

**3. „Ort dauerhaft speichern".** Erscheint, sobald eine Live-Adresse gewählt
ist. Legt den Ort vor der Fahrt an, sodass er beim nächsten Mal in der eigenen
Liste steht. Schlägt das Anlegen fehl, wird die Fahrt trotzdem mit freiem Ziel
gespeichert.

**4. Ab-Ort dauerhaft sichtbar** als eigenes „VON"-Feld statt als kleiner
Button in der Unterzeile. Daneben ein Standort-Button: Reverse-Geocoding über
Photon liefert die **exakte** Adresse mit Hausnummer. Ein gespeicherter Ort
wird nur bei identischer Adresse übernommen — kein vages „du bist in der Nähe".
Der Startort lässt sich zusätzlich per Adresssuche setzen.

**5. Träger-Überlauf behoben.** `.erf-traeger-btn` hatte `white-space: nowrap`
ohne `min-width: 0` und konnte nicht schrumpfen. Jetzt wird der Name gekürzt
(voller Name im `title`), der Chevron bleibt sichtbar, Breite auf 52% begrenzt,
damit das Label daneben lesbar bleibt.

**6. Fahrtenlisten umsortiert:** Anlass fett, darunter die Route „von → nach",
darunter der Träger. Mobil war es vorher genau umgekehrt (Ziel fett, Anlass
klein hinter dem Datum) — das war die Stelle, die der Nutzer als „sehr falsch"
bezeichnet hatte. Desktop-Tabellen hatten die Reihenfolge schon, dort war der
Anlass nur nicht fett (500 → 600).

## Zusätzlich gefunden und behoben

`new Date().toISOString().slice(0,10)` rechnet nach UTC. Zwischen Mitternacht
und 2 Uhr deutscher Sommerzeit lieferte das den **Vortag** — eine spätabends
erfasste Fahrt hätte das falsche Datum bekommen. Beim Testen um 01:57 Uhr
sichtbar geworden („heute, Sa., 08.08." statt So., 09.08.). Betraf
Erfassungsflow und Dashboard.

## Architektur

Die Photon-Suchlogik liegt jetzt in `useAdressSuche.js`, damit Erfassungsflow
und `AddressAutocomplete` dieselben Treffer nutzen statt zweier
Implementierungen. Dort auch `adresseZuKoordinaten()` für Reverse-Geocoding.

## Verifikation

Auf der Testumgebung deployed und im Browser durchgeklickt (Desktop 1512px und
mobil 390px):

- Unbekannte Adresse „Süderstraße 15 Heide" direkt in der Zielsuche → erscheint
  unter „Adressen aus der Karte", Auswahl setzt das Ziel, Merken-Schalter da
- Standort-Button mit Testkoordinate Meldorf → „Schleswig-Holsteinisches
  Landwirtschaftsmuseum, Jungfernstieg 4, 25704 Meldorf" (hausnummergenau)
- Träger „Kirchengemeinde Tellingstedt" bleibt mobil im Sheet (37px Abstand),
  wird mit Ellipse gekürzt, kein horizontales Scrollen der Seite
- Fahrtenlisten mobil auf Dashboard und in der Fahrten-Übersicht: Anlass,
  Route, Träger in der gewünschten Reihenfolge
- Datum nach dem Fix: „heute, So., 09.08."

Lint sauber (keine neuen Warnungen; die vorhandenen sind vorbestehend, per
`git stash` gegengeprüft). Keine Testdaten angelegt.

## Offen

- Produktion (kkd-fahrtenbuch.de) bewusst nicht angefasst
- Der `.dash-fab` (Plus-Button) schwebt mobil über dem Wiederholen-Button der
  ersten Listenzeile — vorbestehend, nicht Teil dieser sechs Punkte
- Frontend-Container läuft per `docker run`, weil docker-compose v1 auf dem
  Testserver mit `KeyError: 'ContainerConfig'` abbricht
