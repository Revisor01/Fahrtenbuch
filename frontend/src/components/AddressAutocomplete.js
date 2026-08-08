import React, { useState, useRef, useEffect } from 'react';

// Kartenmittelpunkt Dithmarschen: gewichtet die Treffer, schliesst aber
// nichts aus - Adressen ausserhalb werden weiterhin gefunden, nur spaeter.
const BIAS_LAT = 54.15;
const BIAS_LON = 9.10;

// Photon liefert kein display_name, sondern Einzelfelder. Der Anzeigetext
// wird daraus zusammengesetzt: Gebaeudetreffer haben kein name, dafuer aber
// street/housenumber - Strassentreffer umgekehrt.
function formatAdresse(props) {
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

function AddressAutocomplete({ value, onChange, placeholder = 'Adresse eingeben', className = '', required = false, name }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const debounceTimer = useRef(null);
  const containerRef = useRef(null);
  // Zaehlt die Anfragen mit, damit eine langsame aeltere Antwort nicht die
  // Vorschlaege einer neueren Eingabe ueberschreibt.
  const requestId = useRef(0);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const fetchSuggestions = (query) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!query || query.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const aktuelleAnfrage = ++requestId.current;

    debounceTimer.current = setTimeout(async () => {
      try {
        // limit bewusst hoeher als die 5 angezeigten Eintraege: Strassen kommen
        // haeufig als mehrere Segmente zurueck und fallen im Filter unten raus.
        const url = `https://photon.komoot.io/api/?limit=15&lang=de`
          + `&lat=${BIAS_LAT}&lon=${BIAS_LON}`
          + `&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        const data = await res.json();

        // Antwort verwerfen, wenn inzwischen weitergetippt wurde
        if (aktuelleAnfrage !== requestId.current) return;

        const gesehen = new Set();
        const treffer = (data.features || [])
          .filter((f) => f.properties?.countrycode === 'DE')
          .map((f) => ({ id: `${f.properties.osm_type}${f.properties.osm_id}`, text: formatAdresse(f.properties) }))
          .filter((t) => {
            if (!t.text || gesehen.has(t.text)) return false;
            gesehen.add(t.text);
            return true;
          })
          .slice(0, 5);

        setSuggestions(treffer);
        setIsOpen(treffer.length > 0);
      } catch (err) {
        if (aktuelleAnfrage !== requestId.current) return;
        console.error('Photon fetch error:', err);
        setSuggestions([]);
        setIsOpen(false);
      }
    }, 300);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    onChange(val);
    fetchSuggestions(val);
  };

  const handleSelect = (suggestion) => {
    // Neuere Antworten sollen die Auswahl nicht wieder aufklappen
    requestId.current++;
    onChange(suggestion.text);
    setSuggestions([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className={`form-input ${className}`}
        placeholder={placeholder}
        required={required}
        name={name}
        autoComplete="off"
      />
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 rounded-lg shadow-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={s.id || i}
              onClick={() => handleSelect(s)}
              className="px-3 py-2 cursor-pointer text-sm text-value hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {s.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AddressAutocomplete;
