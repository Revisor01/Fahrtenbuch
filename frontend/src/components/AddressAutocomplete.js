import React, { useState, useRef, useEffect, useId } from 'react';
import { MapPin } from 'lucide-react';
import { useAdressSuche } from './useAdressSuche';

// Adressfeld mit Live-Vorschlaegen (Photon). Die Suchlogik liegt in
// useAdressSuche, damit der Erfassungsflow dieselben Treffer direkt in seine
// Ortsliste mischen kann.
function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Adresse eingeben',
  className = '',
  required = false,
  name,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const listenId = useId();
  // Nach einer Auswahl steht die gewaehlte Adresse im Feld und loest prompt
  // eine neue Suche aus. Ohne diese Sperre klappte die Liste dadurch sofort
  // wieder auf.
  const gewaehlt = useRef(null);
  const { vorschlaege, zuruecksetzen } = useAdressSuche(value, {
    aktiv: value !== gewaehlt.current,
  });

  // Vorschlaege oeffnen, sobald welche eintreffen
  useEffect(() => {
    if (vorschlaege.length > 0) setIsOpen(true);
  }, [vorschlaege]);

  // Klick ausserhalb schliesst die Liste
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (vorschlag) => {
    zuruecksetzen();
    gewaehlt.current = vorschlag.text;
    onChange(vorschlag.text);
    setIsOpen(false);
  };

  const offen = isOpen && vorschlaege.length > 0;

  return (
    <div ref={containerRef} className="adr-wrap">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setIsOpen(false)}
        className={`form-input ${className}`}
        placeholder={placeholder}
        required={required}
        name={name}
        autoComplete="off"
        role="combobox"
        aria-expanded={offen}
        aria-controls={listenId}
        aria-autocomplete="list"
      />
      {offen && (
        <ul id={listenId} className="adr-liste" role="listbox">
          {vorschlaege.map((v) => (
            <li key={v.id} role="option" aria-selected="false">
              <button type="button" className="adr-option" onClick={() => handleSelect(v)}>
                <MapPin size={15} aria-hidden="true" />
                <span>{v.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AddressAutocomplete;
