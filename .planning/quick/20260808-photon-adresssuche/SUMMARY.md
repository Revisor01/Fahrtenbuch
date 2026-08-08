---
task: photon-adresssuche
date: 2026-08-08
status: complete
commit: 9100154
---

# Zusammenfassung

`AddressAutocomplete.js` nutzt jetzt Photon statt Nominatim. Eine Datei geändert,
57 Zeilen dazu, 13 entfernt. Die drei Einsatzstellen brauchten keine Anpassung.

## Warum

Nominatim untersagt Autocomplete-Nutzung in seinen Nutzungsbedingungen und
erlaubt nur eine Anfrage pro Sekunde — bei 29 Nutzenden ein Sperrrisiko. Photon
ist ausdrücklich für Autocomplete gebaut, ebenfalls kostenlos und OSM-basiert.

## Korrektur einer früheren Annahme

In der Vorsitzung war "Kirchstraße Tellingstedt findet nichts" als Nominatim-
Schwäche notiert. Per Overpass verifiziert: Tellingstedt hat 68 Straßen, aber
keine Kirchstraße — es gibt "Kirchplatz" und "Kirchenkoppel". Beide Dienste
verhielten sich korrekt. Der echte Unterschied ist Tippfehlertoleranz:
"Kirchplatz Tellingsted" liefert bei Nominatim null Treffer, bei Photon den
richtigen Kirchplatz.

## Umgesetzt

- Photon-Endpunkt mit Geo-Gewichtung auf Dithmarschen (54.15/9.10) — sortiert
  lokale Treffer nach oben, schließt nichts aus
- `formatAdresse()` baut den Anzeigetext aus Einzelfeldern, da Photon kein
  `display_name` liefert; Gebäudetreffer haben kein `name`, dafür
  `street`/`housenumber`
- Duplikat-Filter über den formatierten Text (Straßen kommen als mehrere
  Segmente zurück); `limit=15` abgefragt, 5 angezeigt
- Deutschland-Filter clientseitig über `properties.countrycode`
- Anfragezähler verhindert, dass eine langsame ältere Antwort neuere
  Vorschläge überschreibt

## Verifikation

- Formatter gegen 7 echte Photon-Antworten geprüft, alle Fälle sauber
- Lint sauber; Build-Warnungen mit `git stash` als vorbestehend nachgewiesen
- Auf Testumgebung deployed, Bundle enthält Photon, kein Nominatim mehr
- Im Browser auf fahrtenbuch.godsapp.de geprüft:
  - Ort anlegen: "Kirchplatz Tellingsted" → "Kirchplatz, 25782 Tellingstedt",
    Auswahl per Klick übernimmt den Text und schließt das Dropdown
  - Erfassungsflow: "Nordermarkt 8 Meldorf" →
    "Johann-Hinrich-Wichern-Haus, Nordermarkt 8, 25704 Meldorf"

Keine Testdaten angelegt (Dialoge über Abbrechen geschlossen).

## Offen

- Dritte Einsatzstelle (Bearbeiten-Formular in `FahrtForm.js`) nutzt dieselbe
  Komponente, wurde aber nicht einzeln durchgeklickt
- Deployment auf Produktion (kkd-fahrtenbuch.de) steht aus — bewusst nicht
  gemacht
- Der Frontend-Container auf dem Testserver wurde per `docker run` gestartet,
  weil docker-compose v1 dort mit `KeyError: 'ContainerConfig'` abbricht
