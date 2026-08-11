import { useState, useRef, useEffect, useCallback } from 'react';

// Live-Adresssuche über Photon (photon.komoot.io) — auf Autocomplete ausgelegt,
// tippfehlertolerant, OpenStreetMap-basiert.
//
// Kartenmittelpunkt Dithmarschen: gewichtet die Treffer, schliesst aber nichts
// aus - Adressen ausserhalb werden weiterhin gefunden, nur spaeter.
export const BIAS_LAT = 54.15;
export const BIAS_LON = 9.10;

// Photon liefert kein display_name, sondern Einzelfelder. Der Anzeigetext wird
// daraus zusammengesetzt: Gebaeudetreffer haben kein name, dafuer aber
// street/housenumber - Strassentreffer umgekehrt.
export function formatAdresse(props) {
  const strasse = [props.street, props.housenumber].filter(Boolean).join(' ');
  const ort = [props.postcode, props.city].filter(Boolean).join(' ');

  const teile = [];
  // name nur voranstellen, wenn es nicht schon der Strassenname ist
  if (props.name && props.name !== props.street) teile.push(props.name);
  if (strasse) teile.push(strasse);
  else if (props.name === props.street && props.street) teile.push(props.street);
  if (ort) teile.push(ort);

  return teile.join(', ');
}

// Photon-Feature -> Vorschlag mit Anzeigetext und Koordinaten
function zuVorschlag(f) {
  const p = f.properties || {};
  const [lon, lat] = f.geometry?.coordinates || [];
  return {
    id: `${p.osm_type}${p.osm_id}`,
    text: formatAdresse(p),
    lat,
    lon,
  };
}

// Hausnummer aus der Eingabe ziehen: "Süderstraße 18, 25779 Hennstedt" -> "18".
// Nur eine Zahl, die direkt auf Buchstaben folgt (optional mit Buchstabenzusatz
// wie "3A"); Postleitzahlen (fuenfstellig) bleiben aussen vor.
function hausnummerAusEingabe(eingabe) {
  const treffer = eingabe.match(/[a-zäöüß.]\s+(\d{1,4}[a-z]?)(?![\d])/i);
  if (!treffer) return null;
  const nummer = treffer[1];
  return /^\d{5}$/.test(nummer) ? null : nummer;
}

// Vergleichsform fuer Strassennamen: Gross/Klein, Abkuerzungen und Bindestriche
// vereinheitlichen, damit "Süderstr." und "Süderstraße" als gleich gelten.
function strasseNormal(wert) {
  return (wert || '')
    .toLowerCase()
    .replace(/str\.?\b/g, 'strasse')
    .replace(/ß/g, 'ss')
    .replace(/[\s-]/g, '');
}

// OpenStreetMap kennt nicht ueberall Hausnummern (z. B. Süderstraße in
// Hennstedt). Photon liefert dann nur den Strassentreffer. Wenn die Eingabe
// eine Hausnummer enthaelt und der Treffer dieselbe Strasse ohne Nummer ist,
// wird sie uebernommen - die Koordinaten bleiben die der Strasse.
function mitHausnummerAusEingabe(vorschlag, props, hausnummer) {
  if (!hausnummer || props.housenumber) return vorschlag;

  const strasseImTreffer = props.street || props.name;
  if (!strasseImTreffer) return vorschlag;

  // Nur ergaenzen, wenn die Strasse wirklich die getippte ist.
  if (!strasseNormal(vorschlag.eingabeStrasse).includes(strasseNormal(strasseImTreffer))) {
    return vorschlag;
  }

  const ort = [props.postcode, props.city].filter(Boolean).join(' ');
  const text = [`${strasseImTreffer} ${hausnummer}`, ort].filter(Boolean).join(', ');
  return { ...vorschlag, text, hausnummerErgaenzt: true };
}

// Reverse-Geocoding: Koordinaten -> exakte Adresse (fuer den Standort-Button)
export async function adresseZuKoordinaten(lat, lon) {
  const url = `https://photon.komoot.io/reverse?lang=de&limit=1&lat=${lat}&lon=${lon}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await res.json();
  const f = (data.features || [])[0];
  return f ? zuVorschlag(f) : null;
}

// Liefert Adressvorschlaege zu `query` (debounced). Nutzt einen Anfragezaehler,
// damit eine langsame aeltere Antwort keine neueren Vorschlaege ueberschreibt.
export function useAdressSuche(query, { minLaenge = 3, aktiv = true } = {}) {
  const [vorschlaege, setVorschlaege] = useState([]);
  const [laedt, setLaedt] = useState(false);
  const debounceTimer = useRef(null);
  const requestId = useRef(0);

  // Verwirft laufende Antworten (z. B. nach einer Auswahl)
  const zuruecksetzen = useCallback(() => {
    requestId.current++;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setVorschlaege([]);
    setLaedt(false);
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const q = (query || '').trim();
    if (!aktiv || q.length < minLaenge) {
      // Zaehler mit hochziehen: sonst besteht eine noch laufende aeltere
      // Anfrage den Guard unten und schreibt ihre Treffer zurueck, obwohl das
      // Feld inzwischen geleert wurde.
      requestId.current++;
      setVorschlaege([]);
      setLaedt(false);
      return undefined;
    }

    const aktuelleAnfrage = ++requestId.current;
    setLaedt(true);

    debounceTimer.current = setTimeout(async () => {
      try {
        // limit bewusst hoeher als die angezeigten Eintraege: Strassen kommen
        // haeufig als mehrere Segmente zurueck und fallen im Filter unten raus.
        const url =
          `https://photon.komoot.io/api/?limit=15&lang=de` +
          `&lat=${BIAS_LAT}&lon=${BIAS_LON}` +
          `&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        const data = await res.json();

        if (aktuelleAnfrage !== requestId.current) return;

        const hausnummer = hausnummerAusEingabe(q);

        const gesehen = new Set();
        const treffer = (data.features || [])
          .filter((f) => f.properties?.countrycode === 'DE')
          .map((f) => {
            const vorschlag = zuVorschlag(f);
            // eingabeStrasse nur zum Abgleich in mitHausnummerAusEingabe
            return mitHausnummerAusEingabe(
              { ...vorschlag, eingabeStrasse: q },
              f.properties || {},
              hausnummer
            );
          })
          .map(({ eingabeStrasse, ...rest }) => rest)
          .filter((t) => {
            if (!t.text || gesehen.has(t.text)) return false;
            gesehen.add(t.text);
            return true;
          })
          .slice(0, 5);

        setVorschlaege(treffer);
        setLaedt(false);
      } catch (err) {
        if (aktuelleAnfrage !== requestId.current) return;
        console.error('Photon fetch error:', err);
        setVorschlaege([]);
        setLaedt(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, minLaenge, aktiv]);

  return { vorschlaege, laedt, zuruecksetzen };
}
