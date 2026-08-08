---
task: photon-adresssuche
date: 2026-08-08
status: in-progress
---

# AddressAutocomplete: Nominatim → Photon

## Problem

`AddressAutocomplete.js` nutzt Nominatim. Zwei Probleme:

1. **Nutzungsbedingungen**: Nominatim untersagt Autocomplete-Nutzung und erlaubt
   max. 1 Anfrage/Sekunde. Bei 29 aktiven Nutzenden droht eine Sperre.
2. **Keine Tippfehlertoleranz**: "Kirchplatz Tellingsted" (ein fehlendes t)
   liefert bei Nominatim null Treffer, bei Photon den korrekten Kirchplatz.

Nicht das Problem: "Kirchstraße Tellingstedt" — diese Straße existiert in
Tellingstedt schlicht nicht (verifiziert via Overpass, 68 Straßen, darunter
"Kirchplatz" und "Kirchenkoppel"). Beide Dienste verhalten sich hier korrekt.

## Lösung

Umstieg auf Photon (photon.komoot.io) — explizit für Autocomplete gebaut,
OpenStreetMap-basiert, kostenlos, tippfehlertolerant.

### Verifizierte API-Unterschiede

- Photon hat **kein `display_name`** — Anzeigetext muss aus `name`, `street`,
  `housenumber`, `postcode`, `city` selbst gebaut werden.
- Bei reinen Gebäudetreffern ist `name` `null`, `street`/`housenumber` sind
  aber gesetzt → Formatter muss beide Fälle abdecken.
- Geo-Gewichtung via `lat`/`lon` (Dithmarschen: 54.15/9.10) sortiert lokale
  Treffer nach oben, ohne andere auszuschließen.
- `osm_key=highway`-Treffer kommen oft mehrfach (Straße in mehreren Segmenten)
  → Duplikate über den formatierten Text filtern.

## Tasks

1. `fetchSuggestions` auf Photon-Endpunkt umstellen (lat/lon-Bias, lang=de,
   limit erhöht wegen Duplikat-Filter)
2. `formatAdresse()` — Anzeigetext aus den Einzelfeldern bauen
3. Duplikat-Filter über den formatierten Text
4. Deutschland-Filter beibehalten (Photon kennt kein countrycodes → clientseitig
   über `properties.countrycode`)
5. Veraltetes Race-Condition-Verhalten absichern (späte Antwort überschreibt
   neuere Eingabe)
6. Build prüfen

## Nicht im Scope

- Distanzberechnung (ausdrücklich nicht gewünscht)
- Änderungen an den drei Einsatzstellen — die Schnittstelle
  (`value`/`onChange` mit String) bleibt identisch
